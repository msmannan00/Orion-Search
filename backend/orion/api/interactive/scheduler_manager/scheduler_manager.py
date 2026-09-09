from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from typing import Any, Awaitable, Callable
from zoneinfo import ZoneInfo

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_scheduler_model import (SchedulerMailStatus, SchedulerRunStatus, db_scheduler_model)


@dataclass(frozen=True)
class DailySchedulerConfig:
    job_key: str
    hour: int
    minute: int
    timezone_name: str
    handler: Callable[[], Awaitable[dict[str, Any] | None]]
    stale_after: timedelta = timedelta(minutes=15)
    heartbeat_interval: timedelta = timedelta(seconds=60)


class SchedulerManager:
    __instance = None

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        self._collection = self._engine.get_collection(db_scheduler_model)

    @staticmethod
    def get_instance():
        if SchedulerManager.__instance is None:
            SchedulerManager.__instance = SchedulerManager()
        return SchedulerManager.__instance

    @staticmethod
    def scheduled_for_today(config: DailySchedulerConfig, now_utc: datetime | None = None) -> datetime:
        tz = ZoneInfo(config.timezone_name)
        now_utc = now_utc or datetime.now(timezone.utc)
        now_local = now_utc.astimezone(tz)
        scheduled_local = datetime.combine(now_local.date(),time(config.hour, config.minute, tzinfo=tz))
        return scheduled_local.astimezone(timezone.utc)

    async def run_due_daily_job(self, config: DailySchedulerConfig, reason: str = "scheduled") -> bool:
        now_utc = datetime.now(timezone.utc)
        scheduled_for = self.scheduled_for_today(config, now_utc)
        if now_utc < scheduled_for:
            return False

        if await self._has_successful_run(config.job_key, scheduled_for):
            log.g().i(f"Scheduler job already completed: job_key={config.job_key}, "f"scheduled_for={scheduled_for.isoformat()}")
            return False

        run_doc = await self._acquire_run(config, scheduled_for)
        if not run_doc:
            log.g().i(f"Scheduler job lock not acquired: job_key={config.job_key}, "f"scheduled_for={scheduled_for.isoformat()}")
            return False

        run_id = run_doc["_id"]
        log.g().i(f"Scheduler job started: job_key={config.job_key}, reason={reason}, "f"scheduled_for={scheduled_for.isoformat()}, run_id={run_id}")

        heartbeat_task = asyncio.create_task(self._heartbeat(config.job_key, run_id, config.heartbeat_interval))
        try:
            result = await config.handler()
            await self._complete_run(config.job_key, run_id, result or {})
            return True
        except Exception as exc:
            log.g().e(f"Scheduler job failed: job_key={config.job_key}, error={exc}")
            await self._fail_run(config.job_key,run_id,SchedulerMailStatus.FAILED,str(exc))
            return True
        finally:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

    async def _has_successful_run(self, job_key: str, scheduled_for: datetime) -> bool:
        run = await self._collection.find_one({
            "job_key": job_key,
            "scheduled_for": scheduled_for,
            "status": SchedulerRunStatus.SUCCESS.value,
        })
        return run is not None

    async def _acquire_run(self, config: DailySchedulerConfig, scheduled_for: datetime) -> dict[str, Any] | None:
        now_utc = datetime.now(timezone.utc)
        stale_before = now_utc - config.stale_after

        stale_result = await self._collection.update_many(
            {
                "job_key": config.job_key,
                "scheduled_for": scheduled_for,
                "status": SchedulerRunStatus.RUNNING.value,
                "updated_at": {"$lte": stale_before},
            },
            {
                "$set": {
                    "status": SchedulerRunStatus.FAILED.value,
                    "completed_at": now_utc,
                    "updated_at": now_utc,
                    "error_message": "Scheduler run was marked failed because its heartbeat became stale.",
                }
            },
        )
        if stale_result.modified_count:
            log.g().e(f"Scheduler stale run recovered: job_key={config.job_key}, "f"scheduled_for={scheduled_for.isoformat()}, count={stale_result.modified_count}")

        try:
            await self._collection.update_one(
                {"job_key": config.job_key, "scheduled_for": scheduled_for},
                {
                    "$setOnInsert": {
                        "job_key": config.job_key,
                        "scheduled_for": scheduled_for,
                        "status": SchedulerRunStatus.PENDING.value,
                        "mail_status": SchedulerMailStatus.PENDING.value,
                        "created_at": now_utc,
                        "updated_at": now_utc,
                    }
                },
                upsert=True,
            )
        except DuplicateKeyError:
            pass

        return await self._collection.find_one_and_update(
            {
                "job_key": config.job_key,
                "scheduled_for": scheduled_for,
                "status": {"$in": [SchedulerRunStatus.PENDING.value, SchedulerRunStatus.FAILED.value]},
            },
            {
                "$set": {
                    "status": SchedulerRunStatus.RUNNING.value,
                    "mail_status": SchedulerMailStatus.PENDING.value,
                    "started_at": now_utc,
                    "completed_at": None,
                    "error_message": None,
                    "updated_at": now_utc,
                }
            },
            return_document=ReturnDocument.AFTER,
        )

    async def _heartbeat(self, job_key: str, run_id: ObjectId, interval: timedelta):
        seconds = max(5, int(interval.total_seconds()))
        while True:
            await asyncio.sleep(seconds)
            await self._collection.update_one(
                {
                    "_id": run_id,
                    "job_key": job_key,
                    "status": SchedulerRunStatus.RUNNING.value,
                },
                {"$set": {"updated_at": datetime.now(timezone.utc)}},
            )

    async def _complete_run(self, job_key: str, run_id: ObjectId, result: dict[str, Any]):
        mail_status = self._normalize_mail_status(result.get("mail_status"))
        scan_status = str(result.get("status") or "").strip().lower()
        succeeded = scan_status == "success" and mail_status == SchedulerMailStatus.SENT

        if succeeded:
            await self._finish_run(job_key, run_id, SchedulerRunStatus.SUCCESS, mail_status, None)
            log.g().i(f"Scheduler job completed successfully: job_key={job_key}, run_id={run_id}")
            return

        error_message = result.get("error_message") or result.get("message") or "Scheduled job did not complete successfully."
        await self._finish_run(job_key, run_id, SchedulerRunStatus.FAILED, mail_status, str(error_message))
        log.g().e(f"Scheduler job completed with failure status: job_key={job_key}, "f"run_id={run_id}, scan_status={scan_status}, mail_status={mail_status.value}")

    async def _fail_run(
            self,
            job_key: str,
            run_id: ObjectId,
            mail_status: SchedulerMailStatus,
            error_message: str):
        await self._finish_run(job_key, run_id, SchedulerRunStatus.FAILED, mail_status, error_message)

    async def _finish_run(self, job_key: str, run_id: ObjectId, status: SchedulerRunStatus, mail_status: SchedulerMailStatus, error_message: str | None):
        now_utc = datetime.now(timezone.utc)
        await self._collection.update_one(
            {
                "_id": run_id,
                "job_key": job_key,
                "status": SchedulerRunStatus.RUNNING.value,
            },
            {
                "$set": {
                    "status": status.value,
                    "mail_status": mail_status.value,
                    "completed_at": now_utc,
                    "updated_at": now_utc,
                    "error_message": error_message,
                }
            },
        )

    @staticmethod
    def _normalize_mail_status(value: Any) -> SchedulerMailStatus:
        if isinstance(value, SchedulerMailStatus):
            return value
        try:
            return SchedulerMailStatus(str(value or SchedulerMailStatus.PENDING.value))
        except ValueError:
            return SchedulerMailStatus.FAILED
