from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
import jwt

from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.api.interactive.case_manager.case_manager_helper import CaseHelperMethods
from orion.api.interactive.case_manager.models.case_models import CaseShareResponse
from orion.api.interactive.case_manager.models.case_models import CreateCaseShareRequest
from orion.constants.constant import CONSTANTS
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_case_model import CaseShare
from orion.services.mongo_manager.shared_model.db_case_model import db_case_model
from orion.services.mongo_manager.shared_model.db_case_model import utc_now


class CaseShareManager:
    __instance = None

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        if CaseShareManager.__instance is not None:
            raise Exception("Singleton!")
        CaseShareManager.__instance = self

    @staticmethod
    def get_instance():
        if CaseShareManager.__instance is None:
            CaseShareManager()
        return CaseShareManager.__instance

    async def create_case_share(self, case_id: str, data: CreateCaseShareRequest, current_user) -> CaseShareResponse:
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )
        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        if not CaseHelperMethods.can_share_case(record, current_user):
            raise HTTPException(status_code=403, detail="Only admins, maintainers, or the case creator can share cases")

        share_id = str(uuid4())
        token_id = str(uuid4())
        expires_at = utc_now() + timedelta(hours=data.expiresInHours)
        token = jwt.encode(
            {
                "typ": "case_share",
                "shareId": share_id,
                "jti": token_id,
                "caseId": record.caseId,
                "tenant_uuid": record.tenant_uuid,
                "exp": expires_at.timestamp(),
            },
            CONSTANTS.S_AUTH_SECRET_KEY,
            algorithm=CONSTANTS.S_AUTH_ALGORITHM,
        )
        record.shares = record.shares or []
        record.shares.append(CaseShare(
            shareId=share_id,
            tokenHash=CaseHelperMethods.hash_share_token(token),
            createdBy=CaseHelperMethods.actor_id(current_user),
            expiresAt=expires_at,
        ))
        await self._engine.save(record)
        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            f"Case share created: caseId={case_id}, shareId={share_id}",
        )
        return CaseShareResponse(
            shareId=share_id,
            token=token,
            path=f"/case-share/{share_id}?token={token}",
            expiresAt=expires_at,
        )

    async def revoke_case_shares(self, case_id: str, current_user) -> dict:
        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == case_id)
            & (db_case_model.tenant_uuid == str(current_user.tenant_uuid)),
        )
        if not record:
            raise HTTPException(status_code=404, detail="Case not found")
        if not CaseHelperMethods.can_share_case(record, current_user):
            raise HTTPException(status_code=403, detail="Only admins, maintainers, or the case creator can revoke case shares")

        revoked_at = utc_now()
        revoked_count = 0
        for share in record.shares or []:
            if share.revokedAt is None:
                share.revokedAt = revoked_at
                revoked_count += 1
        await self._engine.save(record)
        return {"success": True, "revokedCount": revoked_count}

    async def open_case_share(self, share_id: str, token: str) -> dict:
        if not token:
            raise HTTPException(status_code=401, detail="Missing share token")
        try:
            payload = jwt.decode(
                token,
                CONSTANTS.S_AUTH_SECRET_KEY,
                algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
                options={"verify_exp": True},
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Share link has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid share token")
        if payload.get("typ") != "case_share" or payload.get("shareId") != share_id:
            raise HTTPException(status_code=401, detail="Invalid share token")

        record = await self._engine.find_one(
            db_case_model,
            (db_case_model.caseId == payload.get("caseId"))
            & (db_case_model.tenant_uuid == payload.get("tenant_uuid")),
        )
        if not record:
            raise HTTPException(status_code=404, detail="Share link not found")
        share = next((item for item in (record.shares or []) if item.shareId == share_id), None)
        if share is None:
            raise HTTPException(status_code=404, detail="Share link not found")
        if share.tokenHash != CaseHelperMethods.hash_share_token(token):
            raise HTTPException(status_code=404, detail="Share link not found")
        if payload.get("caseId") != record.caseId or payload.get("tenant_uuid") != record.tenant_uuid:
            raise HTTPException(status_code=401, detail="Invalid share token")
        if share.revokedAt is not None:
            raise HTTPException(status_code=403, detail="Share link has been revoked")
        if CaseHelperMethods.as_aware_utc(share.expiresAt) < utc_now():
            raise HTTPException(status_code=401, detail="Share link has expired")

        enc = await CaseHelperMethods.get_case_cipher_by_tenant_id(record.tenant_uuid)
        CaseHelperMethods.apply_sensitive_case_values(record, lambda value: CaseHelperMethods.decrypt_value(enc, value))

        artifacts = record.artifacts or []
        return {
            "shareId": share.shareId,
            "caseId": record.caseId,
            "title": record.title,
            "description": record.description,
            "caseType": record.caseType,
            "status": record.status,
            "severity": record.severity,
            "priority": record.priority,
            "tags": record.tags,
            "createdAt": record.createdAt,
            "updatedAt": record.updatedAt,
            "expiresAt": share.expiresAt,
            "primaryEntityId": record.primaryEntityId,
            "entities": [entity.model_dump() for entity in (record.entities or [])],
            "closure": record.closure.model_dump() if record.closure else None,
            "closedAt": record.closedAt,
            "artifacts": [
                {
                    "artifactId": artifact.artifactId,
                    "type": artifact.type,
                    "title": artifact.title,
                    "description": artifact.description,
                    "source": artifact.source,
                    "url": artifact.url,
                    "fileName": artifact.fileName,
                    "fileType": artifact.fileType,
                    "linkedReportSource": artifact.linkedReportSource,
                    "linkedReportId": artifact.linkedReportId,
                    "linkedReportTitle": artifact.linkedReportTitle,
                    "capturedAt": artifact.capturedAt,
                    "createdAt": artifact.createdAt,
                    "tags": artifact.tags,
                }
                for artifact in artifacts
            ],
            "comments": [comment.model_dump() for comment in (record.comments or [])],
            "tasks": [task.model_dump() for task in (record.tasks or [])],
            "linkedCases": [linked_case.model_dump() for linked_case in (record.linkedCases or [])],
        }
