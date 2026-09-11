from __future__ import annotations

from datetime import datetime, timezone, UTC
from enum import Enum
from typing import Optional
from odmantic import Model, Field


def utc_now() -> datetime:
    return datetime.now(UTC)


class CronjobName(str, Enum):
    ALERT_JOB = "alert_job"
    SOCIAL_JOB = "social_job"
    BACKUP_JOB = "backup_job"


class CronjobStatus(str, Enum):
    RUNNING = "running"
    NOT_RUNNING = "not_running"
    FAILED = "failed"


class db_cronjob_status_model(Model):
    job_name: CronjobName = Field(index=True)
    status: CronjobStatus
    message: Optional[str] = None
    last_run_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    model_config = {"collection": "cronjob_status"}
