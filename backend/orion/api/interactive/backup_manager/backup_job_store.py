from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from orion.constants.constant import CONSTANTS
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_backup_job_model import BackupJobStatus, db_backup_job_model


class BackupJobStore:
    __instance = None

    STALE_AFTER = timedelta(seconds=CONSTANTS.BACKUP_JOB_STALE_SECONDS)
    HEARTBEAT_INTERVAL = timedelta(seconds=CONSTANTS.BACKUP_JOB_HEARTBEAT_SECONDS)

    @staticmethod
    def get_instance():
        if BackupJobStore.__instance is None:
            BackupJobStore()
        return BackupJobStore.__instance

    def __init__(self):
        if BackupJobStore.__instance is not None:
            return
        BackupJobStore.__instance = self
        self._collection = None

    def _get_collection(self):
        if self._collection is None:
            engine = mongo_controller.get_instance().get_engine()
            if engine is None:
                return None
            self._collection = engine.get_collection(db_backup_job_model)
        return self._collection

    @staticmethod
    def idle_job() -> dict:
        return {"operation": "", "status": BackupJobStatus.IDLE.value, "progress": 0, "message": "", "filename": ""}

    @classmethod
    def _as_job(cls, document) -> dict:
        if not document:
            return cls.idle_job()
        return {
            "operation": document.get("operation", ""),
            "status": document.get("status", BackupJobStatus.IDLE.value),
            "progress": int(document.get("progress", 0)),
            "message": document.get("message", ""),
            "filename": document.get("filename", ""),
        }

    async def read(self) -> dict:
        collection = self._get_collection()
        if collection is None:
            return self.idle_job()
        await self._expire_stale(collection)
        return self._as_job(await collection.find_one({"job_key": CONSTANTS.BACKUP_JOB_KEY}))

    async def _expire_stale(self, collection) -> None:
        now = datetime.now(timezone.utc)
        result = await collection.update_one(
            {
                "job_key": CONSTANTS.BACKUP_JOB_KEY,
                "status": BackupJobStatus.RUNNING.value,
                "updated_at": {"$lte": now - self.STALE_AFTER},
            },
            {
                "$set": {
                    "status": BackupJobStatus.FAILED.value,
                    "message": CONSTANTS.BACKUP_JOB_STALE_MESSAGE,
                    "updated_at": now,
                }
            },
        )
        if result.modified_count:
            log.g().e(f"BACKUP JOB: heartbeat went stale, job marked failed after {int(self.STALE_AFTER.total_seconds())}s")

    async def begin(self, operation: str, message: str) -> bool:
        collection = self._get_collection()
        if collection is None:
            log.g().e("BACKUP JOB: cannot start, mongo engine is not available")
            return False
        await self._expire_stale(collection)
        now = datetime.now(timezone.utc)
        try:
            document = await collection.find_one_and_update(
                {"job_key": CONSTANTS.BACKUP_JOB_KEY, "status": {"$ne": BackupJobStatus.RUNNING.value}},
                {
                    "$set": {
                        "operation": operation,
                        "status": BackupJobStatus.RUNNING.value,
                        "progress": 0,
                        "message": message,
                        "filename": "",
                        "started_at": now,
                        "updated_at": now,
                    },
                    "$setOnInsert": {"job_key": CONSTANTS.BACKUP_JOB_KEY},
                },
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            return False
        return document is not None

    async def progress(self, progress: int, message: str) -> None:
        collection = self._get_collection()
        if collection is None:
            return
        await collection.update_one(
            {"job_key": CONSTANTS.BACKUP_JOB_KEY, "status": BackupJobStatus.RUNNING.value},
            {"$set": {"progress": int(progress), "message": message, "updated_at": datetime.now(timezone.utc)}},
        )

    async def heartbeat(self) -> None:
        collection = self._get_collection()
        if collection is None:
            return
        await collection.update_one(
            {"job_key": CONSTANTS.BACKUP_JOB_KEY, "status": BackupJobStatus.RUNNING.value},
            {"$set": {"updated_at": datetime.now(timezone.utc)}},
        )

    async def finish(self, status: BackupJobStatus, message: str, filename: str = "") -> None:
        collection = self._get_collection()
        if collection is None:
            return
        now = datetime.now(timezone.utc)
        update = {"status": status.value, "message": message, "filename": filename, "updated_at": now}
        if status == BackupJobStatus.DONE:
            update["progress"] = 100
        await collection.update_one({"job_key": CONSTANTS.BACKUP_JOB_KEY}, {"$set": update})

    async def keep_alive(self) -> None:
        seconds = max(5, int(self.HEARTBEAT_INTERVAL.total_seconds()))
        while True:
            await asyncio.sleep(seconds)
            try:
                await self.heartbeat()
            except Exception as exc:
                log.g().e(f"BACKUP JOB: heartbeat update failed: {exc}")
