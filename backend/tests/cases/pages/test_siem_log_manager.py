from __future__ import annotations

import asyncio
from types import SimpleNamespace

from orion.api.interactive.siemlog_manager.siem_log_manager import SiemLogManager
from orion.api.server.crawl_manager.class_model.log_model import (
    InjectionBatchRequestModel,
    InjectionLogModel,
    SiemSearchRequestModel,
)
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX
from tests.cases.fake_model.fakes import FakeElastic, FakeMongoEngine


def _run(coro):
    return asyncio.run(coro)


def test_siem_manager_can_inject_and_search_same_logs(monkeypatch):
    fake_elastic = FakeElastic()
    monkeypatch.setattr(
        "orion.api.interactive.siemlog_manager.siem_log_manager.elastic_controller.get_instance",
        staticmethod(lambda: fake_elastic),
    )
    monkeypatch.setattr(
        SiemLogManager,
        "_request_iocs",
        staticmethod(lambda _client, _raw_value: asyncio.sleep(0, result=[{"m_ip": "10.10.0.9"}])),
    )

    manager = SiemLogManager.get_instance()
    manager._engine = FakeMongoEngine(SimpleNamespace(event_management_enabled=True))
    current_user = SimpleNamespace(tenant_uuid="000000000000000000000001")

    inject_payload = InjectionBatchRequestModel(
        logs=[
            InjectionLogModel(
                raw="Dummy SIEM log record 0009: suspicious login attempt detected from 10.10.0.9 targeting login-0009.security.example for user0009@alerts.example",
                source="waf",
                event_type="auth_failure",
                severity="low",
                host="edge-gateway-0009",
                user="user0009",
                tags=["dummy", "batch", "auth"],
                timestamp="2026-04-24T10:08:00+00:00",
                ingested_at="2026-04-24T10:08:00+00:00",
            )
        ]
    )

    inject_result = _run(manager.inject_logs(inject_payload, current_user))

    assert inject_result["indexed"] == 1
    assert inject_result["index"] == ELASTIC_INDEX.S_SIEM_INDEX
    stored_doc = fake_elastic.docs[inject_result["ids"][0]]["_source"]
    assert stored_doc["raw"].startswith("Dummy SIEM log record 0009")
    assert stored_doc["m_ip"] == ["10.10.0.9"]
    assert stored_doc["tenant_id"] == "000000000000000000000001"

    search_payload = SiemSearchRequestModel(q="", **{"from": 0}, size=100, date_range=None)
    search_result = _run(manager.search_logs(search_payload, current_user))

    assert search_result["total_hits"] == 1
    assert search_result["batch_size"] == 100
    assert len(search_result["cards_data"]) == 1
    assert search_result["cards_data"][0]["raw"] == stored_doc["raw"]
    assert search_result["cards_data"][0]["m_ip"] == ["10.10.0.9"]
