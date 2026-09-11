from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from odmantic import Field, Model
from pydantic import BaseModel


class ScanJobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    PARTIAL = "partial"
    DONE = "done"
    ERROR = "error"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class db_scan_job_model(Model):
    user_uuid: str = ""
    api_reference: str = ""
    title: str = ""

    payload: Dict[str, Any] = Field(default_factory=dict)
    response: Dict[str, Any] = Field(default_factory=dict)

    seen: bool = False
    notify: bool = True

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

    model_config = {"collection": "scan_jobs"}


class ScanJobCreateRequest(BaseModel):
    api_reference: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    force_new: bool = False


class ScanJobSeenRequest(BaseModel):
    scan_id: Optional[str] = None
    seen_all: bool = False


class ScanJobNotificationResponse(BaseModel):
    scan_id: str
    title: str = ""
    target: str = ""
    api_reference: str = ""
    status: ScanJobStatus
    seen: bool = False
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class ScanJobDetailResponse(ScanJobNotificationResponse):
    api_reference: str = ""
    payload: Dict[str, Any] = Field(default_factory=dict)
    response: Dict[str, Any] = Field(default_factory=dict)


class ScanJobListResponse(BaseModel):
    items: list[ScanJobNotificationResponse]
    page: int
    limit: int
    total: int
    has_more: bool
