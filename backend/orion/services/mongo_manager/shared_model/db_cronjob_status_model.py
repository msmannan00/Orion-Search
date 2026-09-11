from __future__ import annotations

from datetime import datetime, timezone, UTC
from typing import Optional
from odmantic import Model, Field


def utc_now() -> datetime:
    return datetime.now(UTC)


class db_cronjob_status_model(Model):
    job_name: str = Field(index=True)
    status: str
    message: Optional[str] = None
    last_run_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    model_config = {"collection": "cronjob_status"}
