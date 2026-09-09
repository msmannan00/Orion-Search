import asyncio
import json
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator
from uuid import uuid4

import httpx

from orion.api.server.nexus_manager.model.nexus_chat_model import MAX_CHAT_MESSAGE_LENGTH
from orion.api.server.nexus_manager.model.rpc_payload_model import NexusRpcPayloadModel


@dataclass
class ActiveNexusStream:
    lines: list[str] = field(default_factory=list)
    done: bool = False
    task: asyncio.Task | None = None
    changed: asyncio.Condition = field(default_factory=asyncio.Condition)


class NexusStreamManager:
    MCP_ENDPOINT = "http://172.18.0.1:8300/mcp"
    NOT_FOUND_RESPONSE = "The data you are looking for was not found."
    STREAM_RETENTION_SECONDS = 300

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.active_chat_tasks: dict[str, asyncio.Task] = {}
        self.active_streams: dict[tuple[str, str], ActiveNexusStream] = {}

    @staticmethod
    def _parse_stream_line(line: str) -> dict[str, Any] | None:
        line = line.strip()
        if not line or line.startswith(":"):
            return None
        if line.startswith("data:"):
            line = line[5:].strip()
        if not line:
            return None
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            return None

    @staticmethod
    def _stream_output(parsed_line: dict[str, Any]) -> dict[str, Any]:
        output = parsed_line.get("output")
        if isinstance(output, dict):
            return output
        result = parsed_line.get("result")
        if isinstance(result, dict):
            structured_content = result.get("structuredContent")
            if isinstance(structured_content, dict):
                return structured_content
        return parsed_line

    async def _mcp_headers(self, client: httpx.AsyncClient) -> dict[str, str]:
        headers = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
        response = await client.post(self.MCP_ENDPOINT, headers=headers, json={"jsonrpc": "2.0", "id": "initialize", "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "orion-intelligence", "version": "1.0"}}})
        response.raise_for_status()
        session_id = response.headers["mcp-session-id"]
        headers["Mcp-Session-Id"] = session_id
        response = await client.post(self.MCP_ENDPOINT, headers=headers, json={"jsonrpc": "2.0", "method": "notifications/initialized"})
        response.raise_for_status()
        return headers

    async def _store_turn(self, client: httpx.AsyncClient, prompt: str, response: str, user_id: str, session_id: str, triggers: list[dict[str, Any]] | None = None) -> None:
        payload: dict[str, Any] = {
            "text": prompt.strip()[:MAX_CHAT_MESSAGE_LENGTH],
            "response": response.strip()[:MAX_CHAT_MESSAGE_LENGTH],
        }
        if triggers:
            payload["triggers"] = triggers
        result = await client.post(
            f"{self.base_url}/v1/chats/{session_id}/messages",
            headers={"X-User-Id": user_id},
            json=payload,
        )
        result.raise_for_status()

    async def _close_mcp_session(self, client: httpx.AsyncClient, headers: dict[str, str]) -> None:
        try:
            await client.delete(self.MCP_ENDPOINT, headers=headers)
        except httpx.HTTPError:
            pass

    async def _stream(self, client: httpx.AsyncClient, payload: NexusRpcPayloadModel, headers: dict[str, str]) -> AsyncGenerator[tuple[str, str, bool], None]:
        answer = ""
        request = client.build_request("POST", self.MCP_ENDPOINT, json=payload.model_dump(), headers=headers)
        response = await client.send(request, stream=True)
        closed = False
        try:
            if response.status_code != 200:
                yield json.dumps({"output": {"response": (await response.aread()).decode("utf-8", errors="ignore")}, "done": True, "error": True}, ensure_ascii=True) + "\n", "", True
                return

            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    parsed_line = self._parse_stream_line(line)
                    if parsed_line is None:
                        continue
                    error_payload = parsed_line.get("error") or {}
                    error_message = error_payload.get("message") if isinstance(error_payload, dict) else ""
                    if error_message:
                        yield json.dumps({"output": {"response": error_message}, "done": True, "error": True}, ensure_ascii=True) + "\n", "", True
                        return

                    result = parsed_line.get("result")
                    if isinstance(result, dict) and result.get("isError"):
                        content = result.get("content") or []
                        message = "\n".join(str(item.get("text") or "") for item in content if isinstance(item, dict)).strip() or "MCP request failed"
                        yield json.dumps({"output": {"response": message}, "done": True, "error": True}, ensure_ascii=True) + "\n", "", True
                        return

                    progress = parsed_line.get("params") if parsed_line.get("method") == "notifications/progress" else {}
                    status_value = parsed_line.get("status") or (progress.get("message") if isinstance(progress, dict) else "")
                    if status_value:
                        status = status_value if isinstance(status_value, dict) else {"message": str(status_value)}
                        yield json.dumps({"status": status, "done": False, "error": False}, ensure_ascii=True) + "\n", "", False

                    output = self._stream_output(parsed_line)
                    response_type = output.get("response_type") or parsed_line.get("response_type")
                    if response_type == "api_pipeline":
                        await response.aclose()
                        closed = True
                        yield "", self.NOT_FOUND_RESPONSE, False
                        return

                    if output.get("response") is not None:
                        response_value = output["response"]
                        triggers = output.get("triggers") or parsed_line.get("triggers")
                        if triggers:
                            response_text = str(response_value)
                            yield json.dumps({"output": {"response": response_text, "triggers": triggers}, "done": True, "error": False}, ensure_ascii=True) + "\n", "", False
                            return
                        if response_type == "finished":
                            yield "", str(response_value), False
                            return
                        answer = str(response_value)
                except Exception:
                    yield f"{line}\n", "", False
            yield "", answer, False
        finally:
            if not closed:
                await response.aclose()

    async def _emit(self, stream: ActiveNexusStream, line: str) -> None:
        if not line:
            return
        async with stream.changed:
            stream.lines.append(line)
            stream.changed.notify_all()

    async def _finish(self, stream: ActiveNexusStream) -> None:
        async with stream.changed:
            stream.done = True
            stream.changed.notify_all()

    async def _subscribe(self, stream: ActiveNexusStream) -> AsyncGenerator[str, None]:
        index = 0
        while True:
            async with stream.changed:
                await stream.changed.wait_for(
                    lambda: index < len(stream.lines) or stream.done
                )
                lines = stream.lines[index:]
                index = len(stream.lines)
                done = stream.done
            for line in lines:
                yield line
            if done and index >= len(stream.lines):
                return

    async def _forget_stream(self, key: tuple[str, str], stream: ActiveNexusStream) -> None:
        await asyncio.sleep(self.STREAM_RETENTION_SECONDS)
        if self.active_streams.get(key) is stream:
            self.active_streams.pop(key, None)

    async def _run_stream(self, key: tuple[str, str], stream: ActiveNexusStream, prompt: str, user_id: str, tool: str, type_name: str, auth_token: str, session_id: str, session_type: str) -> None:
        client = httpx.AsyncClient(timeout=30 * 60)
        current_task = asyncio.current_task()
        headers: dict[str, str] = {}
        stored = False
        if current_task is not None:
            self.active_chat_tasks[user_id] = current_task
        try:
            selected_tool = tool or "open_chat"
            if selected_tool in {"default", "summarizer"}:
                selected_tool = "open_chat"
            headers = await self._mcp_headers(client)
            headers["X-User-Id"] = user_id
            if auth_token:
                headers["Authorization"] = auth_token
            arguments = {"prompt": prompt, "session_id": session_id}
            if type_name and type_name != "default":
                arguments["request_type"] = type_name
            payload = NexusRpcPayloadModel.tool_call(request_id=key[1], name=selected_tool, arguments=arguments)
            async for line, answer, failed in self._stream(client, payload, headers):
                if line:
                    event = self._parse_stream_line(line)
                    output = self._stream_output(event) if event is not None else {}
                    final_response = str(output.get("response") or "").strip()
                    if session_type == "persistent" and session_id and final_response and event is not None and event.get("done") and not event.get("error"):
                        triggers = output.get("triggers")
                        await self._store_turn(client, prompt, final_response, user_id, session_id, triggers if isinstance(triggers, list) else None)
                        stored = True
                    await self._emit(stream, line)
                if failed:
                    return
                if answer:
                    if session_type == "persistent" and session_id and not stored:
                        await self._store_turn(client, prompt, answer, user_id, session_id)
                    await self._emit(stream, json.dumps({"output": {"response": answer.strip()}, "done": True, "error": False}, ensure_ascii=True) + "\n")
                    return
        except asyncio.CancelledError:
            raise
        except Exception:
            await self._emit(stream, json.dumps({"output": {"response": "Something happened while calling api/chat"}, "done": True, "error": True}, ensure_ascii=True) + "\n")
        finally:
            if self.active_chat_tasks.get(user_id) is current_task:
                self.active_chat_tasks.pop(user_id, None)
            if headers:
                await self._close_mcp_session(client, headers)
            await client.aclose()
            await self._finish(stream)
            asyncio.create_task(self._forget_stream(key, stream))

    async def stream_response(self, prompt: str, user_id: str, tool: str = "open_chat", type_name: str = "default", auth_token: str = "", session_id: str = "", session_type: str = "persistent", request_id: str = "") -> AsyncGenerator[str, None]:
        stream_id = request_id or str(uuid4())
        key = (user_id, stream_id)
        stream = self.active_streams.get(key)
        if stream is None:
            stream = ActiveNexusStream()
            self.active_streams[key] = stream
            stream.task = asyncio.create_task(self._run_stream(
                key, stream, prompt, user_id, tool, type_name, auth_token,
                session_id, session_type,
            ))

        async for line in self._subscribe(stream):
            yield line

    def has_stream(self, user_id: str, request_id: str) -> bool:
        return bool(request_id) and (user_id, request_id) in self.active_streams

    async def cancel_chat(self, user_id: str = "system") -> dict[str, bool]:
        task = self.active_chat_tasks.pop(user_id, None)
        if task is None or task.done():
            return {"cancelled": False}
        task.cancel()
        return {"cancelled": True}
