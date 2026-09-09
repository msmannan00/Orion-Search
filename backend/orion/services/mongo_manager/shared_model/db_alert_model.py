from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, List

from odmantic import Model, EmbeddedModel, Field
from pydantic import field_validator


class alert_status(str, Enum):
    IGNORE = "ignore"
    ACTIVE = "active"


class alert_all_ioc(EmbeddedModel):
    name: str = ''
    values: List[str] = Field(default_factory=list)


class AlertModel(EmbeddedModel):
    alert_id: str = ''
    report_seen: bool = False
    custom_alert: bool = False
    is_deleted: bool = False
    type: str = ''
    ioc_type: str = ''
    ioc_value: str = ''
    data_hash: str = ''
    title: str = ''
    description: str = ''
    source: str = ''
    url: str = ''
    risk: str = ''
    licenses: List[str] = Field(default_factory=list)
    all_ioc: List[alert_all_ioc] = Field(default_factory=list)
    content_types: List[str] = Field(default_factory=list)
    raw_findings: dict[str, Any] = Field(default_factory=dict)
    status: alert_status = Field(default=alert_status.ACTIVE)

    first_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("content_types", mode="before")
    @classmethod
    def normalize_content_types(cls, v):
        if v in (None, "", "-"):
            return []
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        if isinstance(v, (list, tuple, set)):
            return list(v)
        return v


class db_alert_model(Model):
    tenant_id: str = ''
    scan_running: bool = False
    alerts: List[AlertModel] = Field(default_factory=list)


def visible_alerts(alerts: List[AlertModel] | None) -> List[AlertModel]:
    return [alert for alert in (alerts or []) if not bool(getattr(alert, "is_deleted", False))]
