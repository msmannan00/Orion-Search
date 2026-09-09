from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List

from odmantic import EmbeddedModel, Field, Model


def utc_now() -> datetime:
    return datetime.now(UTC)


class SocialPersonaAgeGroup(str, Enum):
    AGE_13_17 = "13-17"
    AGE_18_24 = "18-24"
    AGE_25_34 = "25-34"
    AGE_35_44 = "35-44"
    AGE_45_54 = "45-54"
    AGE_55_64 = "55-64"
    AGE_65_PLUS = "65+"


class SocialPersonaGender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    UNSPECIFIED = "unspecified"


class SocialProfileConnectionStatus(str, Enum):
    PENDING = "pending"
    CONNECTED = "connected"
    FAILED = "failed"
    DISCONNECTED = "disconnected"


class SocialProfileAssignmentStatus(str, Enum):
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"


class SocialProfilePurpose(str, Enum):
    POSTING = "posting"
    AD_MONITORING = "ad_monitoring"
    HATE_SPEECH_MONITORING = "hate_speech_monitoring"


class db_persona_post_item(EmbeddedModel):
    day: int
    interest: str
    image_url: str
    caption: str

class db_persona_posts(Model):
    gender: str
    age_group: str
    interests: List[str] = Field(default_factory=list)
    posts: List[db_persona_post_item] = Field(default_factory=list)

    model_config = {"collection": "persona_posts"}


class SocialPersona(EmbeddedModel):
    persona_id: str = Field(index=True)
    name: str
    age_group: SocialPersonaAgeGroup
    gender: SocialPersonaGender = SocialPersonaGender.UNSPECIFIED
    country: str | None = None
    city: str | None = None
    interests: List[str] = Field(default_factory=list)
    interest_weights: List[float] | None = None
    adult_status: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ManagedSocialProfile(EmbeddedModel):
    profile_id: str = Field(index=True)
    platform: str
    profile_name: str | None = None
    profile_username: str | None = None
    session_id: str | None = None
    purposes: List[SocialProfilePurpose] | None = None
    assigned_persona_id: str | None = None
    connection_status: SocialProfileConnectionStatus = SocialProfileConnectionStatus.PENDING
    assignment_status: SocialProfileAssignmentStatus = SocialProfileAssignmentStatus.UNASSIGNED
    last_session_check: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class db_social_profile_management_model(Model):
    user_id: str = Field(index=True)
    personas: List[SocialPersona] = Field(default_factory=list)
    profiles: List[ManagedSocialProfile] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    model_config = {"collection": "social_profile_management"}
