from __future__ import annotations

from datetime import UTC, datetime
from typing import List

from odmantic import EmbeddedModel, Field, Model


def utc_now() -> datetime:
    return datetime.now(UTC)


class SocialDetectedAd(EmbeddedModel):
    url: str
    author: str = ""
    content_text: str = ""
    metadata: str = ""
    likes: str = ""
    shares: str = ""
    views: str = ""
    detected_at: datetime = Field(default_factory=utc_now)


class SocialAdDetectionResult(EmbeddedModel):
    profile_id: str
    date_time: datetime = Field(default_factory=utc_now)
    total_detected_ads: int = 0
    ads: List[SocialDetectedAd] = Field(default_factory=list)
    error: bool = False
    error_reason: str = ""
    session_expired: bool = False


class SocialPostResult(EmbeddedModel):
    profile_id: str
    date_time: datetime = Field(default_factory=utc_now)
    post_url: str = ""
    error: bool = False
    error_reason: str = ""
    session_expired: bool = False


class db_social_automation_result_model(Model):
    user_id: str = Field(index=True)
    ad_detection_results: List[SocialAdDetectionResult] = Field(default_factory=list)
    post_results: List[SocialPostResult] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    model_config = {"collection": "social_automation_result"}
