from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from odmantic import Field, Model


class BackupJobStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class db_backup_job_model(Model):
    job_key: str
    operation: str = ""
    status: BackupJobStatus = BackupJobStatus.IDLE
    progress: int = 0
    message: str = ""
    filename: str = ""
    started_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"collection": "backup_jobs"}
