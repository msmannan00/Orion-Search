import threading
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from bson import ObjectId
from odmantic import AIOEngine
from odmantic.query import desc, in_

from orion.api.interactive.auditlog_manager.models.audit_log_param_model import audit_log_param_model
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_audit_log import db_audit_log
from orion.services.mongo_manager.shared_model.db_auth_models import user_role, LicenseName, db_user_account


class AuditLogManager:
    __instance = None
    __lock = threading.Lock()

    @staticmethod
    def get_instance():
        if AuditLogManager.__instance is None:
            with AuditLogManager.__lock:
                if AuditLogManager.__instance is None:
                    AuditLogManager.__instance = AuditLogManager()
        return AuditLogManager.__instance

    def __init__(self):
        self._engine: AIOEngine = mongo_controller.get_instance().get_engine()
        if AuditLogManager.__instance is not None:
            raise Exception("This class is a singleton!")
        AuditLogManager.__instance = self

    async def register(self, tenant_id, actor_id: str, event: str) -> str:
        log = db_audit_log(tenant_id=tenant_id, actor_id=actor_id, event=event)
        await self._engine.save(log)
        return str(log.id)

    async def search_audit(self, current_user, search_type: str, q: str) -> str:
        return await self.register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            json.dumps({"search_type": search_type, "q": q})
        )

    async def delete(self, log_id: str) -> bool:
        log = await self._engine.find_one(db_audit_log, db_audit_log.id == ObjectId(log_id))
        if not log:
            return False
        await self._engine.delete(log)
        return True

    @staticmethod
    def _parse_iso(s: Optional[str]) -> Optional[datetime]:
        if not s: return None
        v = s.strip()
        if v.endswith("Z"): v = v[:-1] + "+00:00"
        dt = datetime.fromisoformat(v)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    async def get(self, param: audit_log_param_model, current_user) -> Dict[str, Any]:
        page_size = 100
        page = max(1, param.page)
        skip = (page - 1) * page_size

        start = end = None
        daterange = getattr(param, "daterange", None)
        if daterange:
            parts = [p.strip() for p in daterange.split(",")]
            if len(parts) == 2:
                start, end = self._parse_iso(parts[0]), self._parse_iso(parts[1])
            elif len(parts) == 1:
                start = self._parse_iso(parts[0])

        filters: List[Any] = []
        if start and end:
            filters.append((db_audit_log.ts >= start) & (db_audit_log.ts <= end))
        elif start:
            filters.append(db_audit_log.ts >= start)
        elif end:
            filters.append(db_audit_log.ts <= end)

        if getattr(current_user, "role", None) == user_role.MEMBER:
            filters.append(db_audit_log.actor_id == str(current_user.id))
        elif LicenseName.MAINTAINER in (current_user.licenses or []):
            filters.append(db_audit_log.tenant_id == str(current_user.tenant_uuid))

        if getattr(param, "actor_id", None):
            actor = await self._engine.find_one(
                db_user_account,
                (db_user_account.tenant_uuid == str(current_user.tenant_uuid)) & (db_user_account.username == param.actor_id),
            )
            if not actor:
                return {"items": [], "page": page}
            filters.append(db_audit_log.actor_id == str(actor.id))

        query: Any = {}
        for item in filters:
            query = item if query == {} else (query & item)

        sort_by = desc(db_audit_log.ts)

        if not getattr(param, "daterange", None):
            items = await self._engine.find(db_audit_log, query, sort=sort_by, skip=0, limit=page_size)
        else:
            items = await self._engine.find(db_audit_log, query, sort=sort_by, skip=skip, limit=page_size)

        actor_ids = list({ObjectId(item.actor_id) for item in items})
        tenant_ids = list({item.tenant_id for item in items})

        users = await self._engine.find(db_user_account, in_(db_user_account.id, actor_ids))
        tenant_users = await self._engine.find(db_user_account, in_(db_user_account.tenant_uuid, tenant_ids))

        users_by_id = {str(user.id): user.username for user in users}
        tenants_by_id = {}
        for user in tenant_users:
            if LicenseName.MAINTAINER in (user.licenses or []):
                tenants_by_id[user.tenant_uuid] = (user.email or user.username or "").strip()

        resolved_items = []
        for item in items:
            actor_name = users_by_id.get(item.actor_id)
            tenant_name = tenants_by_id.get(item.tenant_id)
            if actor_name is None or tenant_name is None:
                continue
            resolved_items.append({
                **item.model_dump(),
                "id": str(item.id),
                "actor_id": actor_name,
                "tenant_id": tenant_name,
            })

        return {"items": resolved_items, "page": page}
