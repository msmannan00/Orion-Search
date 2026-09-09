from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from orion.services.mongo_manager.shared_model.db_social_automation_result_model import (
    SocialAdDetectionResult,
    SocialPostResult,
)
from orion.services.mongo_manager.shared_model.db_social_profile_management_model import (
    SocialPersonaAgeGroup,
    SocialPersonaGender,
    SocialProfileAssignmentStatus,
    SocialProfileConnectionStatus,
    SocialProfilePurpose,
)


class SocialPersonaCreateRequest(BaseModel):
    name: str
    age_group: SocialPersonaAgeGroup
    gender: SocialPersonaGender = SocialPersonaGender.UNSPECIFIED
    country: str | None = None
    city: str | None = None
    interests: List[str] = Field(default_factory=list)


class SocialPersonaUpdateRequest(BaseModel):
    name: str | None = None
    age_group: SocialPersonaAgeGroup | None = None
    gender: SocialPersonaGender | None = None
    country: str | None = None
    city: str | None = None
    interests: List[str] | None = None


class SocialPersonaResponse(BaseModel):
    persona_id: str
    name: str
    age_group: SocialPersonaAgeGroup
    gender: SocialPersonaGender
    country: str | None = None
    city: str | None = None
    interests: List[str] = Field(default_factory=list)
    adult_status: bool
    created_at: datetime
    updated_at: datetime


class SocialPersonaListResponse(BaseModel):
    personas: List[SocialPersonaResponse] = Field(default_factory=list)


class SocialProfileConnectRequest(BaseModel):
    platform: str
    session_id: str | None = None
    profile_name: str | None = None
    profile_username: str | None = None
    purposes: List[SocialProfilePurpose] = Field(default_factory=list)


class SocialProfileUpdateRequest(BaseModel):
    profile_name: str | None = None
    profile_username: str | None = None
    connection_status: SocialProfileConnectionStatus | None = None
    session_id: str | None = None
    purposes: List[SocialProfilePurpose] | None = None


class SocialProfileResponse(BaseModel):
    profile_id: str
    platform: str
    profile_name: str | None = None
    profile_username: str | None = None
    session_id: str | None = None
    purposes: List[SocialProfilePurpose] = Field(default_factory=list)
    assigned_persona_id: str | None = None
    connection_status: SocialProfileConnectionStatus
    assignment_status: SocialProfileAssignmentStatus
    last_session_check: datetime | None = None
    login_url: str | None = None
    created_at: datetime
    updated_at: datetime


class SocialProfileListResponse(BaseModel):
    profiles: List[SocialProfileResponse] = Field(default_factory=list)


class SocialProfileAssignmentRequest(BaseModel):
    persona_id: str
    profile_id: str


class SocialProfileAssignmentResponse(BaseModel):
    message: str
    profile: SocialProfileResponse


class SocialProfileCallbackRequest(BaseModel):
    profile_id: str
    platform: str
    payload: Dict[str, Any] | None = None


class SocialProfileCallbackResponse(BaseModel):
    message: str
    profile_id: str
    connection_status: SocialProfileConnectionStatus


class SocialAutomationDetectedAdModel(BaseModel):
    url: str
    author: str = ""
    content_text: str = ""
    metadata: str = ""
    likes: str = ""
    shares: str = ""
    views: str = ""
    detected_at: datetime | None = None


class SocialAutomationPostResultRequest(BaseModel):
    profile_id: str
    date_time: datetime | None = None
    post_url: str = ""
    error: bool = False
    error_reason: str = ""
    session_expired: bool = False


class SocialAutomationAdDetectionResultRequest(BaseModel):
    profile_id: str
    date_time: datetime | None = None
    total_detected_ads: int = 0
    ads: List[SocialAutomationDetectedAdModel] = Field(default_factory=list)
    error: bool = False
    error_reason: str = ""
    session_expired: bool = False


class SocialAutomationCallbackRequest(BaseModel):
    user_id: str
    profile_id: str
    result_type: str
    post_result: SocialAutomationPostResultRequest | None = None
    ad_detection_result: SocialAutomationAdDetectionResultRequest | None = None


class SocialProfileResultsResponse(BaseModel):
    profile_id: str
    ad_detection_results: List[SocialAdDetectionResult] = Field(default_factory=list)
    post_results: List[SocialPostResult] = Field(default_factory=list)
    hate_speech_results: List[Dict[str, Any]] = Field(default_factory=list)
