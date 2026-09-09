import asyncio
import contextlib
import json
import threading
import uuid

from starlette.websockets import WebSocket, WebSocketState

from orion.api.interactive.extension_manager.constants.constant import (
    BUS_CHANNEL,
    EXTENSION_TIMEOUT_ERROR,
    RESPONSE_TIMEOUT_SECONDS,
)
from orion.api.interactive.extension_manager.extension_socket_store import ExtensionSocketStore


class extension_socket_manager:
    __instance = None
    __lock = threading.Lock()

    @staticmethod
    def get_instance():
        if extension_socket_manager.__instance is None:
            with extension_socket_manager.__lock:
                if extension_socket_manager.__instance is None:
                    extension_socket_manager.__instance = extension_socket_manager()
        return extension_socket_manager.__instance

    def __init__(self):
        if extension_socket_manager.__instance is not None:
            raise Exception("This class is a singleton!")
        extension_socket_manager.__instance = self
        self._sockets: dict[str, set[WebSocket]] = {}
        self._store = ExtensionSocketStore()
        self._watchers: set[asyncio.Task] = set()
        self._listener: asyncio.Task | None = None
        self._started = False
        self._start_lock = asyncio.Lock()

    async def ensure_started(self) -> None:
        if self._started:
            return
        async with self._start_lock:
            if self._started:
                return
            try:
                self._store.connect()
                self._listener = asyncio.create_task(self._listen())
                self._started = True
            except Exception as exc:
                print(f"[EXT-BUS] start failed: {exc}", flush=True)
                self._store.disable_redis()

    async def acknowledge(self, request_id: str) -> None:
        await self._store.acknowledge(request_id)

    async def touch_socket(self, user_key: str, socket_id: str) -> None:
        await self._store.touch_socket(user_key, socket_id)

    async def has_live_socket(self, user_key: str) -> bool:
        if self._live_sockets(user_key):
            return True
        return await self._store.has_socket(user_key)

    async def register(self, user_key: str, websocket: WebSocket) -> str:
        await self.ensure_started()
        had_live_socket = await self.has_live_socket(user_key)
        socket_id = uuid.uuid4().hex
        self._sockets.setdefault(user_key, set()).add(websocket)
        await self.touch_socket(user_key, socket_id)
        if not had_live_socket:
            # A socket (re)connected after the previous one dropped. Rather than discard the user's
            # in-flight crawl -- which is what left a running "Sync all" stuck whenever the popup or
            # background briefly recycled the socket -- re-deliver any outstanding requests to this
            # fresh socket so the scan resumes. Results are getdel-keyed, so a duplicate answer from a
            # late/other socket is harmless, and each re-delivery re-arms its own timeout watchdog.
            with contextlib.suppress(Exception):
                outstanding = await self._store.outstanding_requests_for_user(user_key)
                for request_id, payload in outstanding:
                    with contextlib.suppress(Exception):
                        await websocket.send_json({**payload, "request_id": request_id})
                    self._spawn_watch(request_id, user_key)
        return socket_id

    async def unregister(self, user_key: str, websocket: WebSocket, socket_id: str | None = None) -> None:
        if socket_id:
            await self._store.drop_socket(user_key, socket_id)
        sockets = self._sockets.get(user_key)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._sockets.pop(user_key, None)

    def _spawn_watch(self, request_id: str, user_key: str) -> None:
        try:
            task = asyncio.create_task(self._watch_request(request_id, user_key))
        except RuntimeError:
            return
        self._watchers.add(task)
        task.add_done_callback(self._watchers.discard)

    async def _watch_request(self, request_id: str, user_key: str) -> None:
        await asyncio.sleep(RESPONSE_TIMEOUT_SECONDS)
        if not await self._store.request_outstanding(request_id):
            return
        if await self._store.take_ack(request_id):
            self._spawn_watch(request_id, user_key)
            return
        result_key = await self._store.pop_request(request_id)
        if result_key is None:
            return
        await self._store.put_result(result_key, {"error": EXTENSION_TIMEOUT_ERROR, "implemented": False, "items": []})
        await self._store.release_inflight(result_key)

    async def reset_sockets(self, user_key: str) -> None:
        await self._close_local_sockets(user_key)
        await self._store.reset_sockets(user_key)

    async def _close_local_sockets(self, user_key: str) -> None:
        for websocket in self._sockets.pop(user_key, set()):
            with contextlib.suppress(Exception):
                await websocket.close()

    async def cancel(self, user_key: str, result_scope: str) -> None:
        result_key = f"{user_key}:{result_scope}"
        await self._store.invalidate_request_for_scope(result_key)
        await self._store.drop_result(result_key)
        await self._store.release_inflight(result_key)

    async def take_result(self, user_key: str, result_scope: str) -> dict | None:
        return await self._store.pop_result(f"{user_key}:{result_scope}")

    async def is_inflight(self, user_key: str, result_scope: str) -> bool:
        return await self._store.is_inflight(f"{user_key}:{result_scope}")

    async def fire(self, user_key: str, payload: dict, result_scope: str | None = None) -> None:
        await self.ensure_started()
        scope = result_scope or payload.get("type")
        if not isinstance(scope, str) or not scope:
            return
        result_key = f"{user_key}:{scope}"
        if not await self._store.claim_inflight(result_key):
            return

        sockets = self._live_sockets(user_key)
        if not sockets and not await self.has_live_socket(user_key):
            await self._store.release_inflight(result_key)
            return

        request_id = uuid.uuid4().hex
        await self._store.put_request(request_id, result_key, payload)
        if sockets:
            for websocket in sockets:
                with contextlib.suppress(Exception):
                    await websocket.send_json({**payload, "request_id": request_id})
            self._spawn_watch(request_id, user_key)
            return
        redis_client = self._store.redis
        if redis_client is not None:
            await redis_client.publish(BUS_CHANNEL, json.dumps(
                {"kind": "request", "user_key": user_key, "request_id": request_id, "payload": payload}))
            self._spawn_watch(request_id, user_key)
            return
        await self._store.pop_request(request_id)
        await self._store.release_inflight(result_key)

    async def resolve(self, request_id: str, payload: dict) -> None:
        result_key = await self._store.pop_request(request_id)
        if result_key is None:
            return
        await self._store.put_result(result_key, payload)
        await self._store.release_inflight(result_key)

    async def disconnect(self, user_key: str) -> None:
        for websocket in self._sockets.pop(user_key, set()):
            try:
                await websocket.close()
            except RuntimeError:
                continue

    def _live_sockets(self, user_key: str) -> list[WebSocket]:
        sockets = self._sockets.get(user_key)
        if not sockets:
            return []
        for websocket in list(sockets):
            if getattr(websocket, "application_state", None) != WebSocketState.CONNECTED:
                sockets.discard(websocket)
        if not sockets:
            self._sockets.pop(user_key, None)
            return []
        return list(sockets)

    async def _listen(self) -> None:
        try:
            redis_client = self._store.redis
            if redis_client is None:
                return
            pubsub = redis_client.pubsub()
            await pubsub.subscribe(BUS_CHANNEL)
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                try:
                    data = json.loads(message.get("data") or "{}")
                except (json.JSONDecodeError, TypeError):
                    continue
                try:
                    await self._on_bus(data)
                except Exception as exc:
                    print(f"[EXT-BUS] on_bus error: {exc}", flush=True)
        except Exception as exc:
            print(f"[EXT-BUS] listener stopped: {exc}", flush=True)
            self._started = False

    async def _on_bus(self, data: dict) -> None:
        kind = data.get("kind")
        user_key = data.get("user_key")
        if not isinstance(user_key, str):
            return
        if kind == "reset":
            await self._close_local_sockets(user_key)
            return
        if kind != "request":
            return
        sockets = self._live_sockets(user_key)
        if not sockets:
            return
        request_id = data.get("request_id")
        for websocket in sockets:
            with contextlib.suppress(Exception):
                await websocket.send_json({**(data.get("payload") or {}), "request_id": request_id})
