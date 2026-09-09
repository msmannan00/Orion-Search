from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, Optional

import httpx
from bson import ObjectId
from fastapi import HTTPException, status
from odmantic.query import desc

from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.api.interactive.scan_job_manager.scan_routes_enum import SCAN_ROUTES
from orion.helper_manager.env_handler import env_handler
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_scan_job_model import ScanJobDetailResponse, ScanJobListResponse, ScanJobNotificationResponse, ScanJobStatus, db_scan_job_model


class ScanJobManager:
    __instance = None

    @staticmethod
    def get_instance():
        if ScanJobManager.__instance is None:
            ScanJobManager()
        return ScanJobManager.__instance

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        ScanJobManager.__instance = self

    @classmethod
    def is_terminal_status(cls, scan_status: str | ScanJobStatus | None) -> bool:
        return str(scan_status or "").strip().lower() in {ScanJobStatus.PARTIAL.value, ScanJobStatus.DONE.value, ScanJobStatus.ERROR.value, ScanJobStatus.CANCELLED.value, ScanJobStatus.EXPIRED.value}

    @staticmethod
    def _normalize_api_reference(api_reference: str) -> str:
        return (api_reference or "").strip().lstrip("/").removeprefix("api/")

    def _route_config(self, api_reference: str) -> Dict[str, str]:
        config = SCAN_ROUTES.get(self._normalize_api_reference(api_reference))
        if not config:
            raise HTTPException(status_code=400, detail=f"Unsupported scan API reference: {api_reference}")
        return config

    @staticmethod
    def _get_target(payload: Dict[str, Any], target_key: str) -> str:
        value = payload.get(target_key)
        if isinstance(value, dict):
            for nested in value.values():
                if nested:
                    return str(nested)
            return ""
        if isinstance(value, list):
            return ", ".join(str(item) for item in value[:3])
        return str(value or "")

    @classmethod
    def _job_status_from_response(cls, response: Dict[str, Any]) -> ScanJobStatus:
        result = response.get("result")
        raw_status: Any = result.get("status") if isinstance(result, dict) else None
        if not raw_status:
            raw_status = response.get("status") or ""
        response_status = str(raw_status).strip().lower()

        if response_status in {"error", "failed", "failure"}:
            return ScanJobStatus.ERROR
        if response_status == "partial":
            return ScanJobStatus.PARTIAL
        if response_status in {"done", "success", "completed", "complete"}:
            return ScanJobStatus.DONE
        if response_status in {"pending", "busy", "queued", "running", "started"}:
            return ScanJobStatus.RUNNING
        if response.get("error") or response.get("detail"):
            return ScanJobStatus.ERROR
        return ScanJobStatus.DONE

    @staticmethod
    def _build_poll_response(job: db_scan_job_model, response: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return {
            "response": response if response is not None else job.response,
            "seen": job.seen,
            "updated_at": job.updated_at,
            "completed_at": job.completed_at,
        }

    @staticmethod
    def _as_response_dict(response: Any) -> Dict[str, Any]:
        if isinstance(response, dict):
            return response
        body: Any = getattr(response, "body", None)
        if body:
            try:
                return json.loads(body.decode("utf-8"))
            except Exception:
                return {"result": body.decode("utf-8", errors="replace")}
        return {"result": response}

    def _with_scan_metadata(self, response: Any, job: db_scan_job_model) -> Dict[str, Any]:
        response_dict = self._as_response_dict(response)
        notification = self._build_scan_notification(job)
        return {**response_dict, "scan_id": str(job.id), "scan_title": notification.title, "scan_target": notification.target, "scan_status": notification.status.value,
                "scan_seen": notification.seen, "scan_created_at": notification.created_at, "scan_updated_at": notification.updated_at, "scan_completed_at": notification.completed_at,
        }

    async def _save_job_response(self, job: db_scan_job_model, response: Any) -> None:
        now = datetime.now(timezone.utc)
        response_dict = self._as_response_dict(response)
        job.response = response_dict
        job.updated_at = now
        computed_status = self._job_status_from_response(response_dict)
        if computed_status in {ScanJobStatus.PARTIAL, ScanJobStatus.DONE, ScanJobStatus.ERROR}:
            job.completed_at = now
        await self._engine.save(job)

    def _scan_status_value(self, job: db_scan_job_model, status_value: Optional[str] = None) -> ScanJobStatus:
        if status_value:
            return ScanJobStatus(status_value)
        response = job.response or {}
        return self._job_status_from_response(response) if response else ScanJobStatus.QUEUED

    def _scan_target(self, job: db_scan_job_model, target: Optional[str] = None) -> str:
        if target is not None:
            return target
        config = SCAN_ROUTES.get(self._normalize_api_reference(job.api_reference), {})
        return self._get_target(job.payload, config.get("target_key", ""))

    def _build_scan_notification(self, job: db_scan_job_model, status_value: Optional[str] = None, target: Optional[str] = None) -> ScanJobNotificationResponse:
        return ScanJobNotificationResponse(
            scan_id=str(job.id),
            title=job.title,
            target=self._scan_target(job, target),
            api_reference=job.api_reference,
            status=self._scan_status_value(job, status_value),
            seen=job.seen,
            created_at=job.created_at,
            updated_at=job.updated_at,
            completed_at=job.completed_at,
        )

    def _build_scan_detail(self, job: db_scan_job_model, status_value: Optional[str] = None, target: Optional[str] = None) -> ScanJobDetailResponse:
        notification = self._build_scan_notification(job, status_value, target)
        return ScanJobDetailResponse(
            **notification.model_dump(),
            payload=job.payload,
            response=job.response,
        )

    def _scan_notification_priority(self, job: db_scan_job_model) -> tuple[int, float]:
        scan_status = self._scan_status_value(job)
        is_unseen_or_incomplete = not job.seen or not self.is_terminal_status(scan_status.value)
        latest_date = job.created_at or job.updated_at or datetime.min
        priority = 0 if is_unseen_or_incomplete else 1
        return priority, -latest_date.timestamp()

    async def create_job(self, current_user, api_reference: str, payload: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None, force_new: bool = False, confirm_duplicates: bool = True) -> Dict[str, Any]:
        config = self._route_config(api_reference)
        metadata = metadata or {}
        now = datetime.now(timezone.utc)
        target = str(metadata.get("target") or self._get_target(payload, config.get("target_key", "")))
        normalized_api_reference = f"/api/{self._normalize_api_reference(api_reference)}"

        existing_records = await self._engine.find(db_scan_job_model, (db_scan_job_model.user_uuid == str(current_user.id)) & (db_scan_job_model.api_reference == normalized_api_reference), sort=desc(db_scan_job_model.created_at))
        latest_done_scan = None
        for record in existing_records:
            if record.payload != payload:
                continue
            response = record.response or {}
            scan_status = self._job_status_from_response(response) if response else ScanJobStatus.QUEUED
            if not self.is_terminal_status(scan_status.value):
                return {**self._build_scan_detail(record, scan_status.value).model_dump(), "source": "existing_running"}
            if scan_status in {ScanJobStatus.DONE, ScanJobStatus.PARTIAL} and latest_done_scan is None:
                latest_done_scan = record

        if latest_done_scan and not force_new:
            if confirm_duplicates:
                previous_scan = self._build_scan_notification(latest_done_scan).model_dump()
                return {
                    "requires_confirmation": True,
                    "message": "You already scanned this before. Do you want to use the previous result or run a new scan?",
                    "source": "previous_completed",
                    "previous_scan": previous_scan,
                }

        job = db_scan_job_model(
            user_uuid=str(current_user.id),
            api_reference=normalized_api_reference,
            title=str(metadata.get("title") or api_reference),
            payload=payload,
            created_at=now,
            updated_at=now,
        )
        await self._engine.save(job)
        try:
            await AuditLogManager.get_instance().search_audit(current_user, api_reference.replace("/", "_"), target)
        except Exception as ex:
            log.g().w(f"Scan audit logging skipped: {str(ex)}")
        return {**self._build_scan_detail(job, ScanJobStatus.QUEUED.value, target).model_dump(), "source": "new"}

    async def run_tracked_scan(self, current_user, api_reference: str, payload: Dict[str, Any], metadata: Optional[Dict[str, Any]], runner: Callable[[], Awaitable[Any]], force_new: bool = False, confirm_duplicates: bool = True) -> Dict[str, Any]:
        created = await self.create_job(current_user, api_reference, payload, metadata, force_new, confirm_duplicates,)
        if created.get("requires_confirmation"):
            return created

        scan_id = created.get("scan_id")

        job = await self._engine.find_one(db_scan_job_model,(db_scan_job_model.id == ObjectId(scan_id)) & (db_scan_job_model.user_uuid == str(current_user.id)))
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")

        if created.get("source") in {"previous_completed", "existing_running"}:
            response = job.response or {"status": "pending", "progress": 5, "step": "queued"}
            return self._with_scan_metadata(response, job)

        try:
            response = await runner()
        except HTTPException as exc:
            await self._save_job_response(job, {"status": ScanJobStatus.ERROR.value, "detail": exc.detail, "step": "failed"})
            raise
        except Exception as exc:
            await self._save_job_response(job, {"status": ScanJobStatus.ERROR.value, "detail": "Scan failed", "step": "failed"})
            raise HTTPException(status_code=500, detail="Scan failed") from exc

        if not force_new and self._as_response_dict(response).get("cached") is True:
            await self._save_job_response(job, response)
            return {
                "requires_confirmation": True,
                "message": "A cached scan result is available. Do you want to use it or rescan?",
                "source": "previous_completed",
                "previous_scan": self._build_scan_notification(job, ScanJobStatus.DONE.value).model_dump(),
            }

        await self._save_job_response(job, response)
        return self._with_scan_metadata(response, job)

    async def list_scan_notifications(self, current_user, page: int = 1, limit: int = 8) -> ScanJobListResponse:
        safe_limit = max(1, min(int(limit or 8), 100))
        safe_page = max(1, int(page or 1))
        skip = (safe_page - 1) * safe_limit

        records = await self._engine.find(db_scan_job_model, db_scan_job_model.user_uuid == str(current_user.id), sort=desc(db_scan_job_model.created_at))
        ordered_records = sorted(records, key=self._scan_notification_priority)
        total = len(ordered_records)
        page_records = ordered_records[skip:skip + safe_limit]
        items = [self._build_scan_notification(record) for record in page_records]
        return ScanJobListResponse(items=items, page=safe_page, limit=safe_limit, total=total, has_more=skip + len(items) < total)

    async def list_incomplete_scans(self, current_user, limit: int = 1) -> Dict[str, Any]:
        safe_limit = max(1, min(int(limit or 1), 100))
        records = await self._engine.find(db_scan_job_model, db_scan_job_model.user_uuid == str(current_user.id), sort=desc(db_scan_job_model.created_at))
        incomplete_records = []
        for record in records:
            response = record.response or {}
            scan_status = self._job_status_from_response(response) if response else ScanJobStatus.QUEUED
            if not self.is_terminal_status(scan_status.value):
                incomplete_records.append(record)

        items = [{"scan_id": str(record.id), "payload": record.payload} for record in incomplete_records[:safe_limit]]
        return { "items": items, "page": 1, "limit": safe_limit, "total": len(incomplete_records), "has_more": 0 + len(items) < len(incomplete_records) }


    async def count_jobs(self, current_user) -> Dict[str, int]:
        query: Dict[str, Any] = {"user_uuid": str(current_user.id)}
        records = await self._engine.find(db_scan_job_model, query, sort=desc(db_scan_job_model.created_at))

        return { "total": len([record for record in records if not record.seen]) }

    async def get_job(self, scan_id: str, current_user) -> ScanJobDetailResponse:
        job = await self._engine.find_one(db_scan_job_model, (db_scan_job_model.id == ObjectId(scan_id)) & (db_scan_job_model.user_uuid == str(current_user.id)))
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")
        return self._build_scan_detail(job)

    async def poll_job(self, scan_id: str, current_user) -> Dict[str, Any]:
        job = await self._engine.find_one(db_scan_job_model, (db_scan_job_model.id == ObjectId(scan_id)) & (db_scan_job_model.user_uuid == str(current_user.id)))
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")

        response = job.response or {}
        scan_status = self._job_status_from_response(response) if response else ScanJobStatus.QUEUED
        if self.is_terminal_status(scan_status.value):
            return self._build_poll_response(job)

        config = self._route_config(job.api_reference)
        base_url = env_handler.get_instance().env("NETWORK_API_BASE")
        upstream_url = f"{base_url}/{config['path'].strip('/')}/{job.user_uuid}"

        now = datetime.now(timezone.utc)
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(upstream_url, json=job.payload)
        except Exception as exc:
            job.response = {"status": ScanJobStatus.ERROR.value, "detail": "Unable to reach trusted scan service", "step": "failed"}
            job.updated_at = now
            job.completed_at = now
            await self._engine.save(job)
            raise HTTPException(status_code=502, detail=job.response["detail"]) from exc

        try:
            response_json = response.json()
        except ValueError:
            response_json = {"detail": response.text}

        full_response = response_json if isinstance(response_json, dict) else {"result": response_json}
        job.response = full_response
        job.updated_at = now

        if response.status_code != status.HTTP_200_OK:
            job.response = {"status": ScanJobStatus.ERROR.value, "detail": response.text, "step": "failed", "response": full_response}
            job.completed_at = now
            await self._engine.save(job)
            raise HTTPException(status_code=response.status_code, detail=f"Error from trusted-micros-api: {response.text}")

        computed_status = self._job_status_from_response(full_response)
        if computed_status in {ScanJobStatus.PARTIAL, ScanJobStatus.DONE, ScanJobStatus.ERROR}:
            job.completed_at = now

        await self._engine.save(job)
        return self._build_poll_response(job, full_response)

    async def mark_seen(self, current_user, scan_id: Optional[str] = None, seen_all: bool = False) -> Dict[str, Any]:
        if seen_all:
            records = await self._engine.find(db_scan_job_model, db_scan_job_model.user_uuid == str(current_user.id))

            for record in records:
                scan_status = self._scan_status_value(record)
                if not self.is_terminal_status(scan_status.value):
                    continue
                if record.seen:
                    continue
                record.seen = True
                await self._engine.save(record)

            return {"message": "Scans marked as seen"}

        if not scan_id:
            raise HTTPException(status_code=400, detail="Scan ID is required")

        job = await self._engine.find_one(db_scan_job_model, (db_scan_job_model.id == ObjectId(scan_id)) & (db_scan_job_model.user_uuid == str(current_user.id)))
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")
        job.seen = True
        await self._engine.save(job)
        return {"message": "Scan marked as seen"}

    async def delete_job(self, scan_id: str, current_user) -> Dict[str, Any]:
        job = await self._engine.find_one(db_scan_job_model, (db_scan_job_model.id == ObjectId(scan_id)) & (db_scan_job_model.user_uuid == str(current_user.id)))
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")

        await self._engine.delete(job)
        return {"message": "Scan deleted"}

    async def delete_completed_jobs(self, current_user) -> Dict[str, Any]:
        records = await self._engine.find(db_scan_job_model, db_scan_job_model.user_uuid == str(current_user.id))
        deleted_count = 0
        skipped_count = 0

        for record in records:
            response = record.response or {}
            scan_status = self._job_status_from_response(response) if response else ScanJobStatus.QUEUED
            if not self.is_terminal_status(scan_status.value):
                skipped_count += 1
                continue
            await self._engine.delete(record)
            deleted_count += 1

        return {"message": "Scans deleted", "deleted": deleted_count, "skipped": skipped_count}
