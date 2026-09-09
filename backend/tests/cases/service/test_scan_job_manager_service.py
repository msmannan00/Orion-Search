from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from orion.api.interactive.scan_job_manager.scan_job_manager import ScanJobManager
from orion.services.mongo_manager.shared_model.db_scan_job_model import ScanJobStatus, db_scan_job_model
from routes.helper.route_test_helper import TestRouteHelper
from tests.cases.fake_model.fakes import FakeAsyncClient, FakeMongoEngine, FakeResponse


def _run(coro):
    return asyncio.run(coro)


def _make_manager(engine: FakeMongoEngine) -> ScanJobManager:
    manager = object.__new__(ScanJobManager)
    manager._engine = engine
    return manager


def _make_user(**overrides):
    data = {
        "id": "507f1f77bcf86cd799439011",
        "tenant_uuid": "507f1f77bcf86cd799439012",
    }
    data.update(overrides)
    return SimpleNamespace(**data)


class _FakeAuditManager:
    def __init__(self):
        self.calls = []

    async def search_audit(self, current_user, action: str, target: str):
        self.calls.append((current_user.id, action, target))


def test_create_job_normalizes_api_reference_and_saves_new_scan(monkeypatch):
    engine = FakeMongoEngine()
    manager = _make_manager(engine)
    audit = _FakeAuditManager()
    current_user = _make_user()
    payload = {"text": {"email": "alice@example.com"}}

    monkeypatch.setattr(
        "orion.api.interactive.scan_job_manager.scan_job_manager.AuditLogManager.get_instance",
        staticmethod(lambda: audit),
    )

    result = _run(
        manager.create_job(
            current_user=current_user,
            api_reference="api/dynamic/user",
            payload=payload,
            metadata={"title": "Email Scan"},
        )
    )

    assert result["source"] == "new"
    assert result["api_reference"] == "/api/dynamic/user"
    assert result["status"] == ScanJobStatus.QUEUED
    assert result["title"] == "Email Scan"
    assert engine.saved[0].api_reference == "/api/dynamic/user"
    assert engine.saved[0].payload == payload
    assert audit.calls == [(current_user.id, "api_dynamic_user", "alice@example.com")]


def test_create_job_duplicate_matching_includes_vulnerability_depth(monkeypatch):
    current_user = _make_user()
    monkeypatch.setattr(
        "orion.api.interactive.scan_job_manager.scan_job_manager.AuditLogManager.get_instance",
        staticmethod(lambda: _FakeAuditManager()),
    )
    completed = db_scan_job_model(
        user_uuid=str(current_user.id),
        api_reference="/api/netintel/url_vulnerability_scan",
        title="URL Vulnerability Scan",
        payload={"domain": "example.com", "depth": "high"},
        response={"status": "done"},
    )
    manager = _make_manager(FakeMongoEngine(records=[completed]))

    duplicate = _run(manager.create_job(
        current_user=current_user,
        api_reference="netintel/url_vulnerability_scan",
        payload={"domain": "example.com", "depth": "high"},
    ))
    different_depth = _run(manager.create_job(
        current_user=current_user,
        api_reference="netintel/url_vulnerability_scan",
        payload={"domain": "example.com", "depth": "full"},
    ))

    assert duplicate["requires_confirmation"] is True
    assert different_depth["source"] == "new"


def test_create_job_prompts_for_matching_partial_vulnerability_result():
    current_user = _make_user()
    partial = db_scan_job_model(
        user_uuid=str(current_user.id),
        api_reference="/api/netintel/url_vulnerability_scan",
        title="URL Vulnerability Scan",
        payload={"domain": "example.com", "depth": "high"},
        response={"status": "partial"},
    )
    manager = _make_manager(FakeMongoEngine(records=[partial]))

    duplicate = _run(manager.create_job(
        current_user=current_user,
        api_reference="netintel/url_vulnerability_scan",
        payload={"domain": "example.com", "depth": "high"},
    ))

    assert duplicate["requires_confirmation"] is True
    assert duplicate["previous_scan"]["status"] == ScanJobStatus.PARTIAL


def test_run_tracked_scan_reuses_matching_running_job_without_restarting_runner():
    current_user = _make_user()
    running = db_scan_job_model(
        user_uuid=str(current_user.id),
        api_reference="/api/netintel/ipscanner",
        title="Deep IP Scan",
        payload={"ip": "8.8.8.8"},
        response={"status": "pending", "progress": 40},
    )
    manager = _make_manager(FakeMongoEngine(records=[running]))
    runner_calls = []

    async def runner():
        runner_calls.append(True)
        return {"status": "done"}

    result = _run(manager.run_tracked_scan(
        current_user=current_user,
        api_reference="netintel/ipscanner",
        payload={"ip": "8.8.8.8"},
        metadata={"title": "Deep IP Scan", "target": "8.8.8.8"},
        runner=runner,
    ))

    assert runner_calls == []
    assert result["scan_id"] == str(running.id)
    assert result["status"] == "pending"


def test_poll_job_calls_upstream_when_testing_disabled(monkeypatch):
    job = db_scan_job_model(
        user_uuid="user-1",
        api_reference="/api/dynamic/software",
        title="Software Scan",
        payload={"text": {"name": "gta"}},
    )
    engine = FakeMongoEngine(records=[job])
    manager = _make_manager(engine)
    calls = []

    monkeypatch.setattr(
        "orion.api.interactive.scan_job_manager.scan_job_manager.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda key, default=None: "http://scan.example" if key == "NETWORK_API_BASE" else default)),
    )
    monkeypatch.setattr(
        "orion.api.interactive.scan_job_manager.scan_job_manager.httpx.AsyncClient",
        lambda *args, **kwargs: FakeAsyncClient(response=FakeResponse(status_code=200, json_data={"status": "done", "result": {"ok": True}}), calls=calls),
    )

    result = _run(manager.poll_job(str(job.id), _make_user(id="user-1")))

    assert calls == [
        {
            "url": "http://scan.example/runtime/parse/software/user-1",
            "json": {"text": {"name": "gta"}},
            "timeout": None,
        }
    ]
    assert result["response"] == {"status": "done", "result": {"ok": True}}
    assert engine.saved[-1].completed_at is not None


def test_test_scan_job_routes_save_model_and_poll_mock_response(monkeypatch):
    engine = FakeMongoEngine()
    manager = _make_manager(engine)
    current_user = _make_user()

    monkeypatch.setattr(ScanJobManager, "get_instance", staticmethod(lambda: manager))
    monkeypatch.setattr(
        TestRouteHelper,
        "pending_or_api_mock",
        classmethod(lambda _cls, step_key, filename: {"status": "done", "step": "complete", "result": {"step_key": step_key, "filename": filename}}),
    )
    monkeypatch.setattr(
        "orion.api.interactive.scan_job_manager.scan_job_manager.AuditLogManager.get_instance",
        staticmethod(lambda: _FakeAuditManager()),
    )

    created = _run(
        ScanJobManager.get_instance().create_job(
            current_user=current_user,
            api_reference="dynamic/social",
            payload={"text": {"username": "alice"}},
            metadata={"title": "Social Scan", "target": "alice"},
        )
    )
    polled = _run(TestRouteHelper.test_poll_scan_job(created["scan_id"], current_user))
    engine.count_result = 1
    notifications = _run(ScanJobManager.get_instance().list_scan_notifications(current_user=current_user))

    assert len(engine.saved) >= 1
    assert engine.records[0].api_reference == "/api/dynamic/social"
    assert engine.records[0].response == {
        "status": "done",
        "step": "complete",
        "result": {
            "step_key": "dynamic_social",
            "filename": "dynamic_social.json",
        },
    }
    assert created["status"] == ScanJobStatus.QUEUED
    assert created["api_reference"] == "/api/dynamic/social"
    assert polled["response"] == {
        "status": "done",
        "step": "complete",
        "result": {
            "step_key": "dynamic_social",
            "filename": "dynamic_social.json",
        },
    }
    assert notifications.total == 1
    assert notifications.items[0].status == ScanJobStatus.DONE


def test_count_jobs_returns_only_unseen_scans():
    engine = FakeMongoEngine(records=[
        db_scan_job_model(user_uuid="user-1", seen=False),
        db_scan_job_model(user_uuid="user-1", seen=True),
        db_scan_job_model(user_uuid="user-1", seen=False),
    ])
    manager = _make_manager(engine)

    result = _run(manager.count_jobs(_make_user(id="user-1")))

    assert result == {"total": 2}


def test_list_scan_notifications_prioritizes_unseen_or_incomplete_scans():
    now = datetime.now(timezone.utc)
    seen_completed = db_scan_job_model(
        user_uuid="user-1",
        title="Seen completed",
        response={"status": "done"},
        seen=True,
        created_at=now,
        updated_at=now,
        completed_at=now,
    )
    unseen_completed = db_scan_job_model(
        user_uuid="user-1",
        title="Unseen completed",
        response={"status": "done"},
        seen=False,
        created_at=now - timedelta(minutes=10),
        updated_at=now - timedelta(minutes=10),
        completed_at=now - timedelta(minutes=10),
    )
    seen_running = db_scan_job_model(
        user_uuid="user-1",
        title="Seen running",
        response={"status": "running"},
        seen=True,
        created_at=now - timedelta(minutes=20),
        updated_at=now - timedelta(minutes=20),
    )
    engine = FakeMongoEngine(records=[seen_completed, unseen_completed, seen_running])
    manager = _make_manager(engine)

    result = _run(manager.list_scan_notifications(_make_user(id="user-1")))

    assert [item.title for item in result.items] == [
        "Unseen completed",
        "Seen running",
        "Seen completed",
    ]
    assert result.total == 3


def test_mark_seen_can_mark_all_completed_scans_without_marking_running_scans():
    completed = db_scan_job_model(
        user_uuid="user-1",
        response={"status": "done"},
        seen=False,
    )
    failed = db_scan_job_model(
        user_uuid="user-1",
        response={"status": "error"},
        seen=False,
    )
    running = db_scan_job_model(
        user_uuid="user-1",
        response={"status": "running"},
        seen=False,
    )
    engine = FakeMongoEngine(records=[completed, failed, running])
    manager = _make_manager(engine)

    result = _run(manager.mark_seen(current_user=_make_user(id="user-1"), seen_all=True))

    assert result == {"message": "Scans marked as seen"}
    assert completed.seen is True
    assert failed.seen is True
    assert running.seen is False


def test_mark_seen_can_mark_one_scan_by_id():
    job = db_scan_job_model(
        user_uuid="user-1",
        response={"status": "done"},
        seen=False,
    )
    engine = FakeMongoEngine(records=[job])
    manager = _make_manager(engine)

    result = _run(manager.mark_seen(current_user=_make_user(id="user-1"), scan_id=str(job.id)))

    assert result == {"message": "Scan marked as seen"}
    assert job.seen is True
    assert engine.saved[-1] == job
