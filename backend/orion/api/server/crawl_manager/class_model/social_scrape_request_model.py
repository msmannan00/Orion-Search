from typing import List, Optional
from pydantic import BaseModel


class SocialTarget(BaseModel):
    usernames: List[str]
    platform: str
    max_followers: int


class SocialScrapeRequest(BaseModel):
    usernames: Optional[List[str]] = None
    platform: Optional[str] = None
    max_followers: Optional[int] = 50
    targets: Optional[List[SocialTarget]] = None

    # model_config = ConfigDict(
    #     json_schema_extra={
    #         "example": {
    #             "usernames": ["john_doe"],
    #             "platform": "instagram",
    #             "max_followers": 50,
    #
    #         }
    #     }
    # )
