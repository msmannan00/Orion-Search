from typing import List, Optional
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_serializer


DATE_ONLY_FORMAT = "%Y-%m-%d"


class social_model(BaseModel):
    m_title: Optional[str] = None
    m_sender_name: Optional[str] = None
    m_message_sharable_link: Optional[str] = None
    m_weblink: List[str] = Field(default_factory=list)
    m_content: str
    m_content_type: List[str] = Field(default_factory=list)
    m_date: Optional[date] = None
    m_channel_url: Optional[str] = None
    m_message_id: Optional[str] = None
    m_platform: List[str] = Field(default_factory=list)
    m_network: str

    model_config = ConfigDict(extra="allow")

    @field_serializer("m_date")
    def serialize_message_date(self, value: Optional[date]):
        return value.strftime(DATE_ONLY_FORMAT) if value else None


class social_data_model(BaseModel):
    cards_data: List[social_model] = Field(default_factory=list)
    contact_link: str = ""
    base_url: str = ""
    seed_url: str = ""
    m_network: str = "clearnet"
