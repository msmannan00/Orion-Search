from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class social_scan_status(BaseModel):
    status: Optional[str] = None
    progress: int = 0
    step: Optional[str] = None
    cancel_requested: bool = False

    model_config = ConfigDict(extra="allow")


class social_meta(BaseModel):
    platform: Optional[str] = None
    username: Optional[str] = None
    url: Optional[str] = None
    target_type: Optional[str] = None
    entity_type: Optional[str] = None
    status: Optional[str] = None
    timestamp: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None

    model_config = ConfigDict(extra="allow")

class social_profile_details(BaseModel):
    real_name: Optional[str] = None
    bio: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    profile_url: Optional[str] = None
    total_posts: Optional[str] = None
    total_followers: Optional[str] = None
    total_likes: Optional[str] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None
    crawl_type: List[str] = Field(default_factory=list)
    is_parsed: bool = False

    model_config = ConfigDict(extra="allow")


class social_post_hate_speech(BaseModel):
    is_hate_speech: bool = False
    label: Optional[str] = None
    confidence: float = 0.0
    explanation: Optional[str] = None
    model: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class social_resource(BaseModel):
    type: Optional[str] = None
    resource_id: Optional[str] = None
    url: Optional[str] = None
    parent_url: Optional[str] = None
    parent_urls: Optional[List[str]] = None
    title: Optional[str] = None
    caption: Optional[str] = None
    author: Optional[str] = None
    datetime: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    likes: Optional[str] = None
    shares: Optional[str] = None
    views: Optional[str] = None
    hate_speech: Optional[social_post_hate_speech] = None

    model_config = ConfigDict(extra="allow")


class social_resource_collection(BaseModel):
    id: Optional[str] = None
    is_parsed: bool = False
    resources: List[social_resource] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class social_online_presence_hit(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    snippet: Optional[str] = None
    timestamp: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class social_stealer_log(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    user: Optional[str] = None
    login: Optional[str] = None
    credential: Optional[str] = None
    domain: Optional[str] = None
    source_domain: Optional[str] = None
    ip: Optional[str] = None
    host: Optional[str] = None
    url: Optional[str] = None
    date: Optional[str] = None
    timestamp: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    raw: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class social_wanted(BaseModel):
    name: Optional[str] = None
    caption: Optional[str] = None
    entity: Optional[str] = None
    id: Optional[str] = None
    schema: Optional[str] = None
    status: Optional[str] = None
    authority: Optional[str] = None
    program: Optional[str] = None
    topics: Optional[str] = None
    datasets: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None
    source_url: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class social_exposure_signals(BaseModel):
    query: str = ""
    records: List[social_stealer_log] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class social_phone_lookup(BaseModel):
    query: str = ""
    result: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="allow")


class social_profile_config(BaseModel):
    disallowed: List[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class social_profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    meta: social_meta = Field(default_factory=social_meta)
    profile_details: Optional[social_profile_details] = None
    section_status: dict[str, str] = Field(default_factory=dict)
    resources: List[social_resource_collection] = Field(default_factory=list)
    online_presence: List[social_online_presence_hit] = Field(default_factory=list)
    stealer_logs: List[social_stealer_log] = Field(default_factory=list)
    wanted: List[social_wanted] = Field(default_factory=list)
    wanted_query: Optional[str] = None
    exposure_signals: Optional[social_exposure_signals] = None
    phone_lookup: Optional[social_phone_lookup] = None

    model_config = ConfigDict(extra="allow")


class db_social_model(BaseModel):
    user_id: str
    profile_username: Optional[str] = None
    profiles: List[social_profile] = Field(default_factory=list)
    config: social_profile_config = Field(default_factory=social_profile_config)
    scan: social_scan_status = Field(default_factory=social_scan_status)
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(extra="allow")


SOCIAL_COLLECTION = "social"
