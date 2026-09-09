from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class SocialReconRequest(BaseModel):
    query: str = Field(..., min_length=1)


class SocialForumRequest(BaseModel):
    query: str = Field(..., min_length=1)
    max_results: int = Field(default=50, ge=1, le=100)


class SocialGraphDataRequest(BaseModel):
    usernames: List[str] = Field(default_factory=list)
    priority: List[str] = Field(default_factory=list)
    limit: int = Field(default=200, ge=1, le=500)


class PlatformUsernameRequest(BaseModel):
    platform: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)

    @model_validator(mode="before")
    @classmethod
    def lower_platform(cls, values):
        if isinstance(values, dict) and "platform" in values:
            values["platform"] = values["platform"].lower()
        return values


class SocialProfileRequest(PlatformUsernameRequest):
    platform: str = Field(..., min_length=1, examples=["tiktok"])
    username: str = Field(..., min_length=1, examples=["@msmannan00"])
    social_data_type: Optional[str] = None
    url: Optional[str] = None
    type: Optional[str] = None
    command: Optional[str] = None
    cursor: Optional[str] = None


class SocialPostsRequest(PlatformUsernameRequest):
    max_posts: int = Field(default=5, ge=1, le=100)
    max_comments: int = Field(default=10, ge=1, le=100)
    comment_offset: int = Field(default=0, ge=0, le=1000)
    social_data_type: Optional[str] = None
    hash_id: Optional[str] = None


class SocialVideosRequest(PlatformUsernameRequest):
    max_videos: int = Field(default=5, ge=1, le=100)
    max_comments: int = Field(default=10, ge=1, le=100)
    comment_offset: int = Field(default=0, ge=0, le=1000)
    social_data_type: Optional[str] = None
    hash_id: Optional[str] = None


class SocialShortsRequest(PlatformUsernameRequest):
    max_shorts: int = Field(default=5, ge=1, le=100)
    max_comments: int = Field(default=10, ge=1, le=100)
    comment_offset: int = Field(default=0, ge=0, le=1000)
    social_data_type: Optional[str] = None
    hash_id: Optional[str] = None


class SocialFollowersRequest(PlatformUsernameRequest):
    max_followers: int = Field(default=50, ge=1, le=5000)


class SocialOnlineImages(PlatformUsernameRequest):
    max_images: int = Field(default=10, ge=1, le=100)


class SocialMetadataRequest(BaseModel):
    tokens: List[str] = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    platform: Optional[str] = Field(default=None, min_length=1)

    @model_validator(mode="before")
    @classmethod
    def lower_platform(cls, values):
        if isinstance(values, dict) and "platform" in values and values["platform"]:
            values["platform"] = values["platform"].lower()
        return values
