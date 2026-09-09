from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from bson import ObjectId

import orion.api.interactive.scheduler_manager.scheduler_manager as scheduler_module
from orion.api.interactive.scheduler_manager.scheduler_manager import DailySchedulerConfig, SchedulerManager
from orion.management.jobs.alert.alert_job import alert_job
from orion.services.mongo_manager.shared_model.db_scheduler_model import SchedulerMailStatus, SchedulerRunStatus


def make_alert_job(alert_manager, tenants):
    async def get_all_tenant():
        return tenants

    job = object.__new__(alert_job)
    job._tenant_manager = SimpleNamespace(get_all_tenant=get_all_tenant)
    job._alert_manager = alert_manager
    job._alert_buffer = _FakeAlertBuffer()
    job._cancellation_service = SimpleNamespace(clear=lambda tenant_id: None, ensure_tenant=lambda tenant_id: str(tenant_id),is_cancelled=lambda tenant_id: False)
    return job


class _FakeAlertBuffer:
    def __init__(self):
        self.clear_calls = []
        self.flush_calls = []

    def clear(self, tenant_id):
        self.clear_calls.append(tenant_id)

    async def flush(self, tenant_id):
        self.flush_calls.append(tenant_id)
        return {"total": 0}


class _FakeAlertManager:
    def __init__(self, running=False):
        self.running = running
        self.status_calls = []
        self.running_calls = []
        self.tenant_mail_calls = []
        self.admin_mail_calls = []

    def getInstance(self):
        return self

    async def get_scan_status_by_tenant_id(self, tenant_id):
        self.status_calls.append(tenant_id)
        return {"scan_running": self.running}

    async def set_scan_running(self, tenant_id, value):
        self.running_calls.append((tenant_id, value))
        self.running = value
        return {"tenant_id": tenant_id, "scan_running": value}

    async def send_scan_completed_mail(self, **kwargs):
        self.tenant_mail_calls.append(kwargs)
        return True

    async def send_admin_scan_summary_mail(self, compromised_tenants):
        self.admin_mail_calls.append(compromised_tenants)
        return True


class _UpdateResult:
    def __init__(self, modified_count=0):
        self.modified_count = modified_count


class _FakeSchedulerCollection:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query):
        for doc in self.docs:
            if self._matches(doc, query):
                return doc
        return None

    async def update_many(self, query, update):
        modified_count = 0
        for doc in self.docs:
            if self._matches(doc, query):
                doc.update(update["$set"])
                modified_count += 1
        return _UpdateResult(modified_count)

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if self._matches(doc, query):
                doc.update(update.get("$set", {}))
                return _UpdateResult(1)
        if upsert:
            doc = dict(query)
            doc.update(update.get("$setOnInsert", {}))
            doc["_id"] = ObjectId()
            self.docs.append(doc)
        return _UpdateResult(0)

    async def find_one_and_update(self, query, update, **_kwargs):
        for doc in self.docs:
            if self._matches(doc, query):
                doc.update(update["$set"])
                return doc
        return None

    def _matches(self, doc, query):
        for key, value in query.items():
            if isinstance(value, dict) and "$in" in value:
                if doc.get(key) not in value["$in"]:
                    return False
            elif isinstance(value, dict) and "$lte" in value:
                if doc.get(key) > value["$lte"]:
                    return False
            elif doc.get(key) != value:
                return False
        return True


def test_alert_batch_reruns_tenant_and_sends_tenant_and_admin_mail(monkeypatch):
    tenant = SimpleNamespace(id="tenant-1", name="Tenant One", is_default=False, iocs=[])
    alert_manager = _FakeAlertManager(running=False)
    job = make_alert_job(alert_manager, [tenant])

    async def process_tenant_alerts(_tenant, category, _allowed_categories=None):
        return {"total": 1} if category == "scanning" else {"total": 0}

    monkeypatch.setattr(
        "orion.management.jobs.alert.alert_job.ALERT_CATEGORIES",
        ["scanning"],
    )
    monkeypatch.setattr(job, "_process_tenant_alerts", process_tenant_alerts)

    result = asyncio.run(job.run_default_scheduled_categories())

    assert result["status"] == "success"
    assert result["mail_status"] == "sent"
    assert result["processed_tenant_count"] == 1
    assert result["mail_sent_count"] == 1
    assert result["admin_mail_sent"] is True
    assert alert_manager.status_calls == ["tenant-1"]
    assert alert_manager.running_calls == [("tenant-1", True), ("tenant-1", False)]
    assert alert_manager.tenant_mail_calls[0]["tenant_id"] == "tenant-1"
    assert alert_manager.admin_mail_calls == [[{
        "tenant_id": "tenant-1",
        "tenant_name": "Tenant One",
        "alert_count": 1,
    }]]


def test_default_alert_batch_only_runs_tenants_without_custom_alert_time(monkeypatch):
    default_tenant = SimpleNamespace(id="tenant-default", name="Default Tenant", is_default=False, iocs=[], alert_run_time=None)
    custom_tenant_1 = SimpleNamespace(id="tenant-custom-1", name="Custom One", is_default=False, iocs=[], alert_run_time="13:00")
    custom_tenant_2 = SimpleNamespace(id="tenant-custom-2", name="Custom Two", is_default=False, iocs=[], alert_run_time="15:30")
    alert_manager = _FakeAlertManager(running=False)
    job = make_alert_job(alert_manager, [default_tenant, custom_tenant_1, custom_tenant_2])

    async def process_tenant_alerts(_tenant, _category, _allowed_categories=None):
        return {"total": 0}

    monkeypatch.setattr(
        "orion.management.jobs.alert.alert_job.ALERT_CATEGORIES",
        ["scanning"],
    )
    monkeypatch.setattr(job, "_process_tenant_alerts", process_tenant_alerts)

    result = asyncio.run(job.run_default_scheduled_categories())

    assert result["processed_tenant_count"] == 1
    assert result["skipped_tenant_count"] == 2
    assert alert_manager.status_calls == ["tenant-default"]
    assert alert_manager.running_calls == [("tenant-default", True), ("tenant-default", False)]
    assert alert_manager.tenant_mail_calls[0]["tenant_id"] == "tenant-default"


def test_custom_alert_batch_runs_selected_tenant_with_custom_alert_time(monkeypatch):
    custom_tenant = SimpleNamespace(id="tenant-custom", name="Custom Tenant", is_default=False, iocs=[], alert_run_time="13:00")
    alert_manager = _FakeAlertManager(running=False)
    job = make_alert_job(alert_manager, [])

    async def process_tenant_alerts(_tenant, _category, _allowed_categories=None):
        return {"total": 0}

    monkeypatch.setattr(
        "orion.management.jobs.alert.alert_job.ALERT_CATEGORIES",
        ["scanning"],
    )
    monkeypatch.setattr(job, "_process_tenant_alerts", process_tenant_alerts)

    result = asyncio.run(job.run_tenant_categories(custom_tenant))

    assert result["processed_tenant_count"] == 1
    assert result["skipped_tenant_count"] == 0
    assert alert_manager.status_calls == ["tenant-custom"]
    assert alert_manager.running_calls == [("tenant-custom", True), ("tenant-custom", False)]
    assert alert_manager.tenant_mail_calls[0]["tenant_id"] == "tenant-custom"


def test_scheduler_recovers_stale_running_alert_job_and_reruns_on_startup():
    now = datetime.now(timezone.utc)
    config = DailySchedulerConfig(
        job_key="auto_alert_scan",
        hour=0,
        minute=0,
        timezone_name="UTC",
        handler=lambda: handler(),
        stale_after=timedelta(minutes=15),
        heartbeat_interval=timedelta(seconds=60),
    )
    scheduled_for = SchedulerManager.scheduled_for_today(config, now)
    docs = [{
        "_id": ObjectId(),
        "job_key": "auto_alert_scan",
        "scheduled_for": scheduled_for,
        "status": SchedulerRunStatus.RUNNING.value,
        "mail_status": SchedulerMailStatus.PENDING.value,
        "updated_at": now - timedelta(minutes=30),
    }]
    manager = object.__new__(SchedulerManager)
    manager._collection = _FakeSchedulerCollection(docs)
    calls = []

    async def handler():
        calls.append("run")
        return {"status": "success", "mail_status": "sent"}

    result = asyncio.run(manager.run_due_daily_job(config, reason="startup_or_schedule_check"))

    assert result is True
    assert calls == ["run"]
    assert docs[0]["status"] == SchedulerRunStatus.SUCCESS.value
    assert docs[0]["mail_status"] == SchedulerMailStatus.SENT.value
    assert docs[0]["completed_at"] is not None


def test_scheduler_recovery_after_two_days_runs_only_current_day(monkeypatch):
    now = datetime(2026, 7, 10, 14, 0, tzinfo=timezone.utc)

    class FakeDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return now

    monkeypatch.setattr(scheduler_module, "datetime", FakeDateTime)
    config = DailySchedulerConfig(
        job_key="auto_alert_scan",
        hour=13,
        minute=0,
        timezone_name="UTC",
        handler=lambda: handler(),
        stale_after=timedelta(minutes=15),
        heartbeat_interval=timedelta(seconds=60),
    )
    docs = [{
        "_id": ObjectId(),
        "job_key": "auto_alert_scan",
        "scheduled_for": datetime(2026, 7, 8, 13, 0, tzinfo=timezone.utc),
        "status": SchedulerRunStatus.RUNNING.value,
        "mail_status": SchedulerMailStatus.PENDING.value,
        "updated_at": datetime(2026, 7, 8, 13, 5, tzinfo=timezone.utc),
    }]
    manager = object.__new__(SchedulerManager)
    manager._collection = _FakeSchedulerCollection(docs)
    calls = []

    async def handler():
        calls.append("run")
        return {"status": "success", "mail_status": "sent"}

    result = asyncio.run(manager.run_due_daily_job(config, reason="startup_or_schedule_check"))

    assert result is True
    assert calls == ["run"]
    assert len(docs) == 2
    assert docs[0]["scheduled_for"] == datetime(2026, 7, 8, 13, 0, tzinfo=timezone.utc)
    assert docs[0]["status"] == SchedulerRunStatus.RUNNING.value
    assert docs[1]["scheduled_for"] == datetime(2026, 7, 10, 13, 0, tzinfo=timezone.utc)
    assert docs[1]["status"] == SchedulerRunStatus.SUCCESS.value


def test_scheduler_runs_missed_alert_when_server_recovers_after_scheduled_time(monkeypatch):
    now = datetime(2026, 7, 10, 14, 0, tzinfo=timezone.utc)

    class FakeDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return now

    monkeypatch.setattr(scheduler_module, "datetime", FakeDateTime)
    config = DailySchedulerConfig(
        job_key="auto_alert_scan:tenant-1",
        hour=13,
        minute=0,
        timezone_name="UTC",
        handler=lambda: handler(),
        stale_after=timedelta(minutes=15),
        heartbeat_interval=timedelta(seconds=60),
    )
    docs = []
    manager = object.__new__(SchedulerManager)
    manager._collection = _FakeSchedulerCollection(docs)
    calls = []

    async def handler():
        calls.append("run")
        return {"status": "success", "mail_status": "sent"}

    result = asyncio.run(manager.run_due_daily_job(config, reason="startup_or_tenant_schedule_check"))

    assert result is True
    assert calls == ["run"]
    assert len(docs) == 1
    assert docs[0]["scheduled_for"] == datetime(2026, 7, 10, 13, 0, tzinfo=timezone.utc)
    assert docs[0]["status"] == SchedulerRunStatus.SUCCESS.value
