from __future__ import annotations

import json
from typing import Optional

from bson import ObjectId
from fastapi import HTTPException

from orion.api.interactive.case_manager.case_config import CASE_STATUS_FLOW
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.api.interactive.case_manager.models.case_models import CaseStatusBoardConfig, CaseStatusBoardItem
from orion.services.mongo_manager.shared_model.db_tenant_model import db_tenant_model

class StatusBoardConfigManager:

    @staticmethod
    def default_status_board_config() -> CaseStatusBoardConfig:
        statuses = [
            CaseStatusBoardItem(
                value=getattr(status, "value", str(status)),
                label=getattr(status, "value", str(status)).replace("_", " ").replace("-", " ").title(),
                enabled=True,
                skippable=False,
            )
            for status in CASE_STATUS_FLOW
        ]
        return CaseStatusBoardConfig(statuses=statuses)

    @staticmethod
    def normalize_status_board_config(raw_config: Optional[dict | str]) -> CaseStatusBoardConfig:
        if not raw_config:
            return StatusBoardConfigManager.default_status_board_config()

        if isinstance(raw_config, str):
            try:
                raw_config = json.loads(raw_config)
            except json.JSONDecodeError:
                return StatusBoardConfigManager.default_status_board_config()

        try:
            config = CaseStatusBoardConfig.model_validate(raw_config)
        except ValueError:
            return StatusBoardConfigManager.default_status_board_config()

        normalized = []
        for item in config.statuses:
            normalized.append(
                CaseStatusBoardItem(
                    value=item.value,
                    label=item.label or item.value.replace("_", " ").replace("-", " ").title(),
                    enabled=item.enabled,
                    skippable=item.skippable,
                )
            )

        return CaseStatusBoardConfig(
            statuses=normalized,
        )

    @staticmethod
    def _user_uses_tenant_config(current_user) -> bool:
        tenant_uuid = getattr(current_user, "tenant_uuid", "")
        return bool(tenant_uuid and str(tenant_uuid) not in {"", "-1", "None"})

    @classmethod
    async def get_effective_config(cls, current_user) -> CaseStatusBoardConfig:
        tenant = None
        if cls._user_uses_tenant_config(current_user):
            tenant = await mongo_controller.get_instance().get_engine().find_one(db_tenant_model,db_tenant_model.id == ObjectId(str(current_user.tenant_uuid)))
        return StatusBoardConfigManager.normalize_status_board_config(getattr(tenant, "case_status_tracking_board", None))

    @staticmethod
    async def save_tenant_config(tenant_id: str, config: CaseStatusBoardConfig) -> CaseStatusBoardConfig:
        normalized = StatusBoardConfigManager.normalize_status_board_config(config.model_dump())
        engine = mongo_controller.get_instance().get_engine()
        tenant = await engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(str(tenant_id)))
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        tenant.case_status_tracking_board = normalized.model_dump()
        await engine.save(tenant)
        return normalized

    @staticmethod
    def active_status_values(config: CaseStatusBoardConfig) -> list[str]:
        return [status.value for status in config.statuses if status.enabled]
