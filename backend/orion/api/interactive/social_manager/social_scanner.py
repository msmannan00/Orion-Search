import asyncio
import hashlib
import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from bson import ObjectId
from fastapi import HTTPException

from orion.api.interactive.social_manager.social_helper import social_helper
from orion.api.interactive.social_manager.social_manager import social_manager
from orion.api.interactive.social_manager.social_models.social_scan_model import SocialScan
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import db_user_account
from orion.services.mongo_manager.shared_model.db_social_model import SOCIAL_COLLECTION


class social_scanner:

    __instance = None
    POLL_INTERVAL_SECONDS = 2
    SCAN_TIMEOUT_SECONDS = 15 * 60
    MAX_CONSECUTIVE_FAILURES = 5
    HEARTBEAT_STALE_SECONDS = 30
    STATUS_FIELDS = {"scan_progress": 1, "scan_step": 1, "scan_heartbeat": 1, "status": 1, "profile_username": 1, "profiles": 1, "scan_kind": 1}

    @staticmethod
    def get_instance():
        if social_scanner.__instance is None:
            social_scanner.__instance = social_scanner()
        return social_scanner.__instance

    def __init__(self):
        self._worker_id = f"{os.getpid()}-{uuid.uuid4().hex[:8]}"
        self._scans: dict[str, SocialScan] = {}
        self._lock = asyncio.Lock()


    async def start_recon(self, current_user, request, query: str) -> dict[str, Any]:
        profile_username = social_helper.normalize_username(query)
        if not profile_username:
            raise HTTPException(status_code=400, detail="query is required")
        headers = social_manager._social_headers(current_user, request)
        return await self._start(str(current_user.id), headers, "recon", {"query": profile_username}, profile_username)

    async def start_image_recon(self, current_user, request, image_base64: Any, profile_username: str | None = None) -> dict[str, Any]:
        file_bytes = social_manager.getInstance().decode_image_payload(image_base64)
        headers = social_manager._social_headers(current_user, request)
        name = social_helper.normalize_username(profile_username or "") or f"image scan #{hashlib.sha256(file_bytes).hexdigest()[:8]}"
        return await self._start(str(current_user.id), headers, "recon/image", {"file_bytes": file_bytes, "filename": "upload.png"}, name)

    async def status(self, current_user, request, query: str) -> dict[str, Any]:
        profile_username = social_helper.normalize_username(query)
        user_id = str(current_user.id)
        row = await self._collection().find_one({"user_id": user_id, "profile_username": profile_username}, self.STATUS_FIELDS)
        if row and row.get("status") == "pending" and social_helper.is_stale(row, self.HEARTBEAT_STALE_SECONDS):
            if row.get("scan_kind", "recon") != "recon":
                await self._set_status(user_id, profile_username, "failed", "Scan interrupted")
                return social_helper.build_status_response(profile_username, {**row, "status": "failed", "scan_step": "Scan interrupted"})
            headers = social_manager._social_headers(current_user, request)
            return await self._start(user_id, headers, "recon", {"query": profile_username}, profile_username)
        return social_helper.build_status_response(profile_username, row)

    async def cancel(self, current_user) -> dict[str, Any]:
        async with self._lock:
            cancelled = await self._cancel_pending(str(current_user.id))
        return {"cancelled": bool(cancelled), "profile_username": cancelled[0] if cancelled else None}

    async def resume_pending(self) -> None:
        try:
            rows = [row async for row in self._collection().find({"status": "pending"}).sort("updated_at", -1)]
        except Exception as exc:
            log.g().ex(f"social scanner: could not load pending scans: {exc}")
            return
        for row in rows:
            user_id = str(row.get("user_id") or "")
            profile_username = str(row.get("profile_username") or "")
            if not user_id or not profile_username or not social_helper.is_stale(row, self.HEARTBEAT_STALE_SECONDS):
                continue
            if row.get("scan_kind", "recon") != "recon":
                await self._set_status(user_id, profile_username, "failed", "Scan interrupted")
                continue
            user = await self._load_user(user_id)
            if user is None:
                await self._set_status(user_id, profile_username, "failed", "Scan interrupted")
                continue
            headers = social_manager._social_headers(user, None)
            await self._start(user_id, headers, "recon", {"query": profile_username}, profile_username)


    async def _start(self, user_id: str, headers: dict[str, str], kind: str, payload: dict[str, Any], profile_username: str) -> dict[str, Any]:
        async with self._lock:
            row = await self._collection().find_one({"user_id": user_id, "profile_username": profile_username}, self.STATUS_FIELDS)
            if row and row.get("status") == "pending" and not social_helper.is_stale(row, self.HEARTBEAT_STALE_SECONDS):
                return social_helper.build_status_response(profile_username, row)

            await self._cancel_pending(user_id, keep=profile_username)
            if not await self._claim(user_id, profile_username, kind):
                row = await self._collection().find_one({"user_id": user_id, "profile_username": profile_username}, self.STATUS_FIELDS)
                return social_helper.build_status_response(profile_username, row)

            scan = SocialScan(user_id=user_id, kind=kind, payload=payload, headers=headers, profile_username=profile_username)
            self._scans[user_id] = scan
            scan.task = asyncio.create_task(self._run(scan))
            return {"profile_username": profile_username, "status": "pending", "progress": 5, "step": "queued"}

    async def _claim(self, user_id: str, profile_username: str, kind: str) -> bool:
        now = datetime.now(UTC)
        collection = self._collection()
        await collection.update_one(
            {"user_id": user_id, "profile_username": profile_username},
            {"$setOnInsert": {"user_id": user_id, "profile_username": profile_username, "profiles": [], "config": {"disallowed": []}, "created_at": now}},
            upsert=True,
        )
        stale_before = now - timedelta(seconds=self.HEARTBEAT_STALE_SECONDS)
        claimed = await collection.find_one_and_update(
            {
                "user_id": user_id,
                "profile_username": profile_username,
                "$or": [{"status": {"$ne": "pending"}}, {"scan_heartbeat": {"$lt": stale_before}}, {"scan_heartbeat": {"$exists": False}}],
            },
            {"$set": {
                "status": "pending",
                "scan_kind": kind,
                "scan_owner": self._worker_id,
                "scan_heartbeat": now,
                "scan_progress": 5,
                "scan_step": "queued",
                "scan_cancel_requested": False,
                "updated_at": now,
            }},
        )
        return claimed is not None

    async def _cancel_pending(self, user_id: str, keep: str | None = None) -> list[str]:
        query: dict[str, Any] = {"user_id": user_id, "status": "pending"}
        if keep:
            query["profile_username"] = {"$ne": keep}
        names = [str(row.get("profile_username") or "") async for row in self._collection().find(query, {"profile_username": 1})]
        if names:
            await self._collection().update_many(
                query,
                {"$set": {"status": "cancelled", "scan_step": "Scan cancelled", "scan_cancel_requested": True, "updated_at": datetime.now(UTC)}, "$unset": {"scan_owner": ""}},
            )
        local = self._scans.get(user_id)
        if local and local.profile_username in names:
            await self._stop_local(local)
        return names


    async def _run(self, scan: SocialScan) -> None:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self.SCAN_TIMEOUT_SECONDS
        failures = 0
        model = social_manager.getInstance()
        try:
            while True:
                if not await self._still_owned(scan):
                    return
                status_code, body = await model.social_request(scan.payload, scan.kind, scan.headers)
                if status_code == 200 and isinstance(body, dict):
                    failures = 0
                    if "result" in body:
                        await self._complete(scan, social_helper.normalize_profiles(body.get("result"), scan.profile_username))
                        return
                    if body.get("status") == "error":
                        await self._fail(scan, "Scan timed out" if body.get("message") == "timeout" else "Scan failed")
                        return
                    await self._heartbeat(scan, social_helper.as_progress(body.get("progress")), str(body.get("step") or ""))
                else:
                    failures += 1
                    if failures >= self.MAX_CONSECUTIVE_FAILURES:
                        await self._fail(scan, "Social service unreachable")
                        return
                if loop.time() >= deadline:
                    await self._fail(scan, "Scan timed out")
                    return
                await asyncio.sleep(self.POLL_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.g().ex(f"social scanner: scan for {scan.profile_username} crashed: {exc}")
            await self._fail(scan, "Scan failed")
        finally:
            if self._scans.get(scan.user_id) is scan:
                self._scans.pop(scan.user_id, None)

    async def _still_owned(self, scan: SocialScan) -> bool:
        row = await self._collection().find_one(self._owned_filter(scan), {"scan_cancel_requested": 1})
        return row is not None and not row.get("scan_cancel_requested")

    async def _heartbeat(self, scan: SocialScan, progress: int | None, step: str) -> None:
        update: dict[str, Any] = {"scan_heartbeat": datetime.now(UTC)}
        if progress is not None:
            update["scan_progress"] = progress
        if step:
            update["scan_step"] = step
        await self._collection().update_one(self._owned_filter(scan), {"$set": update})

    async def _complete(self, scan: SocialScan, profiles: list[dict]) -> None:
        config = social_manager.default_profile_config(profiles)
        await self._collection().update_one(
            self._owned_filter(scan),
            {"$set": {"profiles": social_manager._drop_unstorable_ints(profiles), "config.disallowed": config["disallowed"], "status": "complete", "scan_progress": 100, "scan_step": "Completed", "updated_at": datetime.now(UTC)},
             "$unset": {"config.allowed": "", "scan_owner": "", "scan_heartbeat": "", "scan_cancel_requested": ""}},
        )

    async def _fail(self, scan: SocialScan, message: str) -> None:
        await self._collection().update_one(
            self._owned_filter(scan),
            {"$set": {"status": "failed", "scan_step": message, "updated_at": datetime.now(UTC)},
             "$unset": {"scan_owner": "", "scan_heartbeat": "", "scan_cancel_requested": ""}},
        )

    async def _stop_local(self, scan: SocialScan) -> None:
        if scan.task and not scan.task.done():
            scan.task.cancel()
            try:
                await scan.task
            except (asyncio.CancelledError, Exception):
                pass
        if self._scans.get(scan.user_id) is scan:
            self._scans.pop(scan.user_id, None)


    def _owned_filter(self, scan: SocialScan) -> dict[str, Any]:
        return {"user_id": scan.user_id, "profile_username": scan.profile_username, "status": "pending", "scan_owner": self._worker_id}

    async def _set_status(self, user_id: str, profile_username: str, status: str, step: str) -> None:
        await self._collection().update_one(
            {"user_id": user_id, "profile_username": profile_username},
            {"$set": {"status": status, "scan_step": step, "updated_at": datetime.now(UTC)}, "$unset": {"scan_owner": "", "scan_heartbeat": "", "scan_cancel_requested": ""}},
        )

    def _collection(self):
        return mongo_controller.get_instance().get_engine().database[SOCIAL_COLLECTION]

    async def _load_user(self, user_id: str):
        try:
            return await mongo_controller.get_instance().get_engine().find_one(db_user_account, db_user_account.id == ObjectId(user_id))
        except Exception:
            return None
