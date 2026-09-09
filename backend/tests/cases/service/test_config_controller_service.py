from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from orion.api.server.config_manager.config_controller import config_controller
from orion.services.mongo_manager.shared_model.db_system_settings import AllowedKeys


@pytest.mark.anyio
async def test_tenant_config_inherits_admin_settings_from_default_tenant(monkeypatch):
    child_tenant = SimpleNamespace(id="tenant-child", is_default=False)
    default_tenant = SimpleNamespace(id="tenant-default", is_default=True)
    child_settings = {
        AllowedKeys.APP_NAME.value: "Tenant App",
        AllowedKeys.META_INFO.value: json.dumps({"ACCOUNTS_MAIL": "tenant@example.com"}),
    }
    default_settings = {
        AllowedKeys.VERSION.value: "1_0_3_13",
        AllowedKeys.LANGUAGE_ALLOWED.value: "en",
        AllowedKeys.AI_ENDPOINT_ENABLED.value: "1",
        AllowedKeys.ADMIN_ROOT_ALLOWED.value: "0",
        AllowedKeys.S_ONION.value: "http://exampleonionaddress.onion",
    }

    class _FakeEngine:
        def __init__(self):
            self.results = [
                child_tenant,
                SimpleNamespace(value=json.dumps(child_settings)),
                default_tenant,
                SimpleNamespace(value=json.dumps(default_settings)),
            ]

        async def find_one(self, *_args, **_kwargs):
            return self.results.pop(0)

    class _FakeRedis:
        async def invoke_trigger(self, *_args, **_kwargs):
            return None

    monkeypatch.setattr(
        "orion.api.server.config_manager.config_controller.redis_controller.getInstance",
        staticmethod(lambda: _FakeRedis()),
    )

    manager = object.__new__(config_controller)
    manager._engine = _FakeEngine()
    manager._config = {}
    manager._configs = {}
    manager._tenants = {}
    manager._default_tenant_id = None

    resolved_tenant_id = await manager.load_config(force_db=True, tenant_id="tenant-child")

    assert resolved_tenant_id == "tenant-child"
    assert manager._configs["tenant-child"][AllowedKeys.APP_NAME.value] == "Tenant App"
    assert manager._configs["tenant-child"][AllowedKeys.META_INFO.value] == child_settings[AllowedKeys.META_INFO.value]
    assert manager._configs["tenant-child"][AllowedKeys.VERSION.value] == "1_0_3_13"
    assert manager._configs["tenant-child"][AllowedKeys.AI_ENDPOINT_ENABLED.value] == "0"
    assert manager._configs["tenant-child"][AllowedKeys.ADMIN_ROOT_ALLOWED.value] == "0"
    assert AllowedKeys.VERSION.value not in child_settings
