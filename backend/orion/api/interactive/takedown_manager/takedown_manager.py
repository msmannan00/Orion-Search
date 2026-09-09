from __future__ import annotations

import asyncio
from datetime import datetime, time, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx
from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from orion.helper_manager.env_handler import env_handler
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.log_manager.log_controller import log
from orion.services.mail_manager.mail_manager import mail_manager
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import user_role
from orion.services.mongo_manager.shared_model.db_takedown_request_model import (
    TakedownCreateRequest,
    TakedownDecisionRequest,
    TakedownListResponse,
    TakedownRequestStatus,
    db_takedown_request_model,
)
from orion.services.mongo_manager.shared_model.db_tenant_model import db_tenant_model


class TakedownManager:
    __instance = None
    _PENDING_EVIDENCE_STATUSES = {"pending", "processing", "running", "busy", "queued", "in_progress"}

    @staticmethod
    def get_instance():
        if TakedownManager.__instance is None:
            TakedownManager()
        return TakedownManager.__instance

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        self._collection = self._engine.get_collection(db_takedown_request_model)
        TakedownManager.__instance = self

    async def _root_tenant_uuid(self) -> str:
        tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.is_default == True)
        if not tenant:
            raise HTTPException(status_code=500, detail="Root tenant not found")
        return str(tenant.id)

    @staticmethod
    def _target_domain(target_url: str) -> str:
        parsed = urlparse(target_url if "://" in target_url else f"https://{target_url}")
        domain = parsed.hostname or parsed.netloc or parsed.path or target_url
        domain = domain.strip().split("/")[0]
        domain = domain.split(":")[0]
        return domain.lower()

    @staticmethod
    def _normalize_target_url(target_url: str) -> str:
        value = target_url.strip()
        return value if "://" in value else f"https://{value}"

    @staticmethod
    def _parse_date_filter(raw_value: str, end_of_day: bool = False) -> Optional[datetime]:
        value = (raw_value or "").strip()
        if not value:
            return None
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if len(value) == 10:
            parsed = datetime.combine(parsed.date(), time.max if end_of_day else time.min)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

    @staticmethod
    def _public_status(status_value: str | TakedownRequestStatus | None) -> Optional[str]:
        raw_status = status_value.value if isinstance(status_value, TakedownRequestStatus) else status_value
        status_text = str(raw_status or "").lower()
        if status_text == TakedownRequestStatus.PENDING.value:
            return "in_progress"
        if status_text == TakedownRequestStatus.DENIED.value:
            return "denied"
        if status_text == TakedownRequestStatus.ACCEPTED.value:
            return "accepted"
        if status_text == TakedownRequestStatus.FAILED.value:
            return "failed"
        return None

    @classmethod
    def _status_label(cls, status_value: str | TakedownRequestStatus | None) -> str:
        public_status = cls._public_status(status_value)
        labels = {
            "in_progress": "Takedown in progress",
            "denied": "Takedown denied",
            "accepted": "Takedown reported",
            "failed": "Takedown failed",
        }
        return labels.get(public_status or "", "")

    @classmethod
    def _serialize_record(cls, record: db_takedown_request_model | Dict[str, Any]) -> Dict[str, Any]:
        if isinstance(record, db_takedown_request_model):
            data: Dict[str, Any] = record.model_dump()
            data["id"] = str(record.id)
        else:
            data = dict(record)
            data["id"] = str(data.pop("_id", data.get("id", "")))

        if isinstance(data.get("status"), TakedownRequestStatus):
            data["status"] = data["status"].value
        data["public_status"] = cls._public_status(data.get("status"))
        data["status_label"] = cls._status_label(data.get("status"))

        for key in ("created_at", "updated_at", "decided_at", "dispatched_at"):
            value = data.get(key)
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        return data

    @classmethod
    def _existing_record_response(cls, record: db_takedown_request_model) -> Dict[str, Any]:
        data = cls._serialize_record(record)
        return {
            "id": data.get("id"),
            "target_domain": data.get("target_domain"),
            "abuse_email": data.get("abuse_email"),
            "status": data.get("status"),
            "public_status": data.get("public_status"),
            "status_label": data.get("status_label"),
        }

    @staticmethod
    def _extract_micro_evidence(response: Dict[str, Any]) -> Dict[str, Any]:
        if isinstance(response.get("result"), dict):
            return response["result"]
        if isinstance(response.get("response"), dict) and isinstance(response["response"].get("result"), dict):
            return response["response"]["result"]
        return response

    @classmethod
    def _extract_abuse_email(cls, evidence_payload: Dict[str, Any]) -> str:
        evidence = cls._extract_micro_evidence(evidence_payload or {})
        return str(evidence.get("abuse_email_found") or evidence.get("abuse_email") or "").strip()

    @classmethod
    def _is_pending_evidence_response(cls, response: Dict[str, Any]) -> bool:
        evidence = cls._extract_micro_evidence(response or {})
        status_values = (
            response.get("status"),
            response.get("step"),
            evidence.get("status"),
            evidence.get("step"),
        )
        return any(str(value or "").lower() in cls._PENDING_EVIDENCE_STATUSES for value in status_values)

    async def _capture_evidence(self, target_url: str, user_id: str) -> Dict[str, Any]:
        payload = {"target_url": target_url}
        base_urls = []
        configured_base_url = env_handler.get_instance().env("TRUSTED_MICROS_API_BASE")
        if configured_base_url:
            base_urls.append(str(configured_base_url).rstrip("/"))
        base_urls.extend(["http://trusted-micros-api:8010", "http://localhost:8010"])
        base_urls = list(dict.fromkeys(base_urls))

        last_error = ""
        async with httpx.AsyncClient(timeout=180) as client:
            for base_url in base_urls:
                for attempt in range(60):
                    try:
                        response = await client.post(f"{base_url}/evidence/capture/{user_id}", json=payload)
                        response_json = response.json()
                        if response.status_code >= 400:
                            last_error = response.text
                            break
                        if not isinstance(response_json, dict):
                            return {"result": response_json}
                        if not self._is_pending_evidence_response(response_json):
                            return response_json
                        last_error = "Evidence capture is still pending"
                        if attempt < 59:
                            await asyncio.sleep(2)
                    except Exception as exc:
                        last_error = str(exc)
                        break
        return {"status": "error", "error_message": last_error or "Unable to reach trusted evidence service"}

    async def _update_elastic_status(self, record: db_takedown_request_model) -> None:
        public_status = self._public_status(record.status)
        if not public_status or not record.report_id:
            return
        try:
            await elastic_controller.get_instance().get_connection().options(request_timeout=30).update(
                index=ELASTIC_INDEX.S_DEFACEMENT_INDEX,
                id=record.report_id,
                doc={"m_takedown_status": public_status},
                refresh=True,
            )
        except Exception as exc:
            log.g().w(f"Unable to update Elasticsearch takedown status for {record.report_id}: {str(exc)}")

    async def enrich_report(self, report: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not report:
            return report
        target_url = str(report.get("m_url") or "")
        if not target_url:
            return report

        record = await self._engine.find_one(
            db_takedown_request_model,
            db_takedown_request_model.target_domain == self._target_domain(target_url),
        )
        if not record or not record.abuse_email:
            for key in ("m_takedown_status", "m_takedown_label", "m_takedown_disabled"):
                report.pop(key, None)
            return report

        report["m_takedown_status"] = self._public_status(record.status)
        report["m_takedown_label"] = self._status_label(record.status)
        report["m_takedown_disabled"] = True
        return report

    async def create_request(self, request: TakedownCreateRequest, current_user) -> Dict[str, Any]:
        report_id = (request.report_id or "").strip()
        raw_target_url = request.target_url.strip()
        custom_msg = getattr(request, "custom_message", "").strip()

        if not raw_target_url:
            raise HTTPException(status_code=400, detail="Target URL is required")
        target_url = self._normalize_target_url(raw_target_url)

        root_tenant_uuid = await self._root_tenant_uuid()
        requester_tenant_uuid = str(getattr(current_user, "tenant_uuid", "") or "")
        user_uuid = str(getattr(current_user, "id", "") or "")
        target_domain = self._target_domain(target_url)
        existing = await self._engine.find_one(
            db_takedown_request_model,
            db_takedown_request_model.target_domain == target_domain,
        )
        if existing:
            existing_abuse_email = existing.abuse_email or self._extract_abuse_email(existing.evidence or {})
            if existing_abuse_email:
                if not existing.abuse_email:
                    existing.abuse_email = existing_abuse_email
                    existing.updated_at = datetime.now(timezone.utc)
                    await self._engine.save(existing)
                return self._existing_record_response(existing)

        now = datetime.now(timezone.utc)
        evidence_response = await self._capture_evidence(target_url, user_uuid)
        evidence_response["custom_message"] = custom_msg
        evidence = self._extract_micro_evidence(evidence_response)
        evidence_status = str(evidence.get("status") or evidence_response.get("status") or "").lower()
        if evidence_status in {"error", "failed", "failure"}:
            detail = str(evidence.get("error_message") or evidence_response.get("error_message") or "Unable to capture takedown evidence")
            raise HTTPException(status_code=424, detail=detail)
        abuse_email = self._extract_abuse_email(evidence_response)
        if not abuse_email:
            raise HTTPException(status_code=424, detail="No public abuse contact was found for this site.")

        if existing:
            existing.tenant_uuid = root_tenant_uuid
            existing.requester_tenant_uuid = requester_tenant_uuid
            existing.user_uuid = user_uuid
            existing.username = str(getattr(current_user, "username", "") or "")
            existing.report_id = report_id or existing.report_id
            existing.target_url = target_url
            existing.target_domain = target_domain
            existing.abuse_email = abuse_email
            existing.status = TakedownRequestStatus.PENDING
            existing.evidence = evidence_response
            existing.updated_at = now
            await self._engine.save(existing)
            await self._update_elastic_status(existing)
            return self._serialize_record(existing)

        record = db_takedown_request_model(
            tenant_uuid=root_tenant_uuid,
            requester_tenant_uuid=requester_tenant_uuid,
            user_uuid=user_uuid,
            username=str(getattr(current_user, "username", "") or ""),
            report_id=report_id,
            target_url=target_url,
            target_domain=target_domain,
            abuse_email=abuse_email,
            status=TakedownRequestStatus.PENDING,
            evidence=evidence_response,
            created_at=now,
            updated_at=now,
        )
        try:
            await self._engine.save(record)
        except DuplicateKeyError:
            existing = await self._engine.find_one(
                db_takedown_request_model,
                db_takedown_request_model.target_domain == target_domain,
            )
            if existing:
                existing.report_id = report_id or existing.report_id
                existing.target_url = target_url
                existing.abuse_email = existing.abuse_email or abuse_email
                existing.evidence = existing.evidence or evidence_response
                existing.updated_at = now
                await self._engine.save(existing)
                return self._serialize_record(existing)
            raise
        await self._update_elastic_status(record)
        return self._serialize_record(record)

    async def list_requests(self, current_user, status: Optional[str] = None, q: str = "", page: int = 1, limit: int = 20, daterange: str = "") -> TakedownListResponse:
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        root_tenant_uuid = await self._root_tenant_uuid()
        tenant_uuid = str(getattr(current_user, "tenant_uuid", "") or "")
        user_uuid = str(getattr(current_user, "id", "") or "")
        query: Dict[str, Any] = {"tenant_uuid": root_tenant_uuid, "abuse_email": {"$nin": ["", None]}}
        if tenant_uuid != root_tenant_uuid:
            query["requester_tenant_uuid"] = tenant_uuid
            if getattr(current_user, "role", None) == user_role.ANALYST:
                query["user_uuid"] = user_uuid
        status_text = (status or "").strip().lower()
        if status_text and status_text != "all":
            query["status"] = status_text
        date_parts = [part.strip() for part in (daterange or "").split(",") if part.strip()]
        if date_parts:
            date_query: Dict[str, datetime] = {}
            start_date = self._parse_date_filter(date_parts[0])
            if start_date:
                date_query["$gte"] = start_date
            if len(date_parts) > 1:
                end_date = self._parse_date_filter(date_parts[1], end_of_day=True)
                if end_date:
                    date_query["$lte"] = end_date
            if date_query:
                query["created_at"] = date_query
        search_text = q.strip()
        if search_text:
            query["$or"] = [
                {"target_url": {"$regex": search_text, "$options": "i"}},
                {"target_domain": {"$regex": search_text, "$options": "i"}},
                {"abuse_email": {"$regex": search_text, "$options": "i"}},
                {"username": {"$regex": search_text, "$options": "i"}},
                {"report_id": {"$regex": search_text, "$options": "i"}},
            ]
        total = await self._collection.count_documents(query)
        cursor = self._collection.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
        items = [self._serialize_record(item) async for item in cursor]
        return TakedownListResponse(items=items, page=page, limit=limit, total=total)

    async def _get_admin_record(self, request_id: str, current_user) -> db_takedown_request_model:
        root_tenant_uuid = await self._root_tenant_uuid()
        tenant_uuid = str(getattr(current_user, "tenant_uuid", "") or "")
        if getattr(current_user, "role", None) != user_role.ADMIN or tenant_uuid != root_tenant_uuid:
            raise HTTPException(status_code=403, detail="Root admin access is required")

        if not ObjectId.is_valid(str(request_id)):
            raise HTTPException(status_code=400, detail="Invalid takedown request ID")
        record = await self._engine.find_one(
            db_takedown_request_model,
            (db_takedown_request_model.id == ObjectId(str(request_id)))
            & (db_takedown_request_model.tenant_uuid == root_tenant_uuid),
        )
        if not record:
            raise HTTPException(status_code=404, detail="Takedown request not found")
        return record

    async def accept_request(self, request_id: str, current_user) -> Dict[str, Any]:
        record = await self._get_admin_record(request_id, current_user)
        if record.status == TakedownRequestStatus.DENIED:
            raise HTTPException(status_code=409, detail="Denied takedown requests cannot be accepted")
        if record.status == TakedownRequestStatus.ACCEPTED:
            return self._serialize_record(record)

        evidence = self._extract_micro_evidence(record.evidence or {})
        abuse_email = record.abuse_email or self._extract_abuse_email(record.evidence or {})
        if not abuse_email:
            raise HTTPException(status_code=400, detail="No abuse email found in captured evidence")

        await mail_manager.get_instance().send_takedown_mail(
            to_email=abuse_email,
            target_domain=record.target_domain,
            screenshot_filename=str(evidence.get("screenshot_path") or ""),
            html_filename=str(evidence.get("html_path") or ""),
            tenant_id=record.tenant_uuid,
            screenshot_base64=str(evidence.get("screenshot_base64") or ""),
            html_content=str(evidence.get("html_content") or ""),
            screenshot_mime_type=str(evidence.get("screenshot_mime_type") or "image/png"),
            custom_message=str((record.evidence or {}).get("custom_message") or ""),
        )

        now = datetime.now(timezone.utc)
        record.status = TakedownRequestStatus.ACCEPTED
        record.abuse_email = abuse_email
        record.updated_at = now
        record.decided_at = now
        record.dispatched_at = now
        record.dispatch_response = {"status": "done", "message": "Takedown email dispatched"}
        await self._engine.save(record)
        await self._update_elastic_status(record)
        return self._serialize_record(record)

    async def deny_request(self, request_id: str, decision: TakedownDecisionRequest, current_user) -> Dict[str, Any]:
        record = await self._get_admin_record(request_id, current_user)
        if record.status == TakedownRequestStatus.ACCEPTED:
            raise HTTPException(status_code=409, detail="Accepted takedown requests cannot be denied")
        now = datetime.now(timezone.utc)
        record.status = TakedownRequestStatus.DENIED
        record.denial_reason = (decision.reason or "").strip() or None
        record.updated_at = now
        record.decided_at = now
        await self._engine.save(record)
        await self._update_elastic_status(record)
        return self._serialize_record(record)
