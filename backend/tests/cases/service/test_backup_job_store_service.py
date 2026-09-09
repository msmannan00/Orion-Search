from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from orion.api.interactive.backup_manager.backup_job_store import BackupJobStore
from orion.constants.constant import CONSTANTS
from orion.services.mongo_manager.shared_model.db_backup_job_model import BackupJobStatus
from tests.cases.fake_model.fakes import FakeBackupJobCollection


def _run(coro):
    return asyncio.run(coro)


def _make_store(collection: FakeBackupJobCollection) -> BackupJobStore:
    store = object.__new__(BackupJobStore)
    store._collection = collection
    return store


def _running_document(age_seconds: int = 0) -> dict:
    updated_at = datetime.now(timezone.utc) - timedelta(seconds=age_seconds)
    return {
        "job_key": CONSTANTS.BACKUP_JOB_KEY,
        "operation": "backup",
        "status": BackupJobStatus.RUNNING.value,
        "progress": 20,
        "message": "Exporting MongoDB",
        "filename": "",
        "started_at": updated_at,
        "updated_at": updated_at,
    }


def test_read_returns_idle_when_no_job_document_exists():
    store = _make_store(FakeBackupJobCollection())

    assert _run(store.read()) == BackupJobStore.idle_job()


def test_begin_creates_running_job_document():
    collection = FakeBackupJobCollection()
    store = _make_store(collection)

    assert _run(store.begin("backup", "Starting backup")) is True
    assert collection.document["status"] == BackupJobStatus.RUNNING.value
    assert collection.document["operation"] == "backup"
    assert _run(store.read())["message"] == "Starting backup"


def test_begin_is_rejected_while_another_job_is_running():
    collection = FakeBackupJobCollection(_running_document())
    store = _make_store(collection)

    assert _run(store.begin("backup", "Starting backup")) is False
    assert collection.document["message"] == "Exporting MongoDB"


def test_begin_takes_over_a_job_whose_heartbeat_is_stale():
    collection = FakeBackupJobCollection(_running_document(age_seconds=int(BackupJobStore.STALE_AFTER.total_seconds()) + 60))
    store = _make_store(collection)

    assert _run(store.begin("backup", "Starting backup")) is True
    assert collection.document["message"] == "Starting backup"


def test_read_marks_a_stale_running_job_as_failed():
    collection = FakeBackupJobCollection(_running_document(age_seconds=int(BackupJobStore.STALE_AFTER.total_seconds()) + 60))
    store = _make_store(collection)

    job = _run(store.read())

    assert job["status"] == BackupJobStatus.FAILED.value
    assert job["message"] == CONSTANTS.BACKUP_JOB_STALE_MESSAGE


def test_read_keeps_a_running_job_with_a_fresh_heartbeat():
    collection = FakeBackupJobCollection(_running_document(age_seconds=5))
    store = _make_store(collection)

    job = _run(store.read())

    assert job["status"] == BackupJobStatus.RUNNING.value
    assert job["progress"] == 20


def test_progress_updates_only_a_running_job():
    collection = FakeBackupJobCollection(_running_document())
    store = _make_store(collection)

    _run(store.progress(55, "Exporting Elasticsearch"))
    assert _run(store.read())["progress"] == 55

    _run(store.finish(BackupJobStatus.DONE, "Backup completed successfully", "2026_01_01_00_00_00"))
    _run(store.progress(70, "Ignored"))

    job = _run(store.read())
    assert job["progress"] == 100
    assert job["message"] == "Backup completed successfully"


def test_finish_failed_keeps_last_progress():
    collection = FakeBackupJobCollection(_running_document())
    store = _make_store(collection)

    _run(store.finish(BackupJobStatus.FAILED, "Backup failed: disk full"))

    job = _run(store.read())
    assert job["status"] == BackupJobStatus.FAILED.value
    assert job["progress"] == 20
    assert job["message"] == "Backup failed: disk full"


def test_heartbeat_refreshes_the_running_job_timestamp():
    collection = FakeBackupJobCollection(_running_document(age_seconds=90))
    store = _make_store(collection)
    stale_at = collection.document["updated_at"]

    _run(store.heartbeat())

    assert collection.document["updated_at"] > stale_at
    assert _run(store.read())["status"] == BackupJobStatus.RUNNING.value
