from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from odmantic import Model, Field


class BackupType(str, Enum):
    AUTO = "auto"
    INSTANT = "instant"


class db_backup_model(Model):
    filename: str
    backup_type: BackupType = Field(default=BackupType.INSTANT)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
