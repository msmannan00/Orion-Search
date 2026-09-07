from typing import Optional, Annotated, Dict, List

from pydantic import BaseModel, StringConstraints, Field

class PasswordFilterModel(BaseModel):
    minLength: Optional[int] = None
    maxLength: Optional[int] = None
    hasAlphabets: Optional[bool] = None
    hasNumbers: Optional[bool] = None
    hasSpecialChars: Optional[bool] = None


class search_credential_param_model(BaseModel):
    daterange: Annotated[str, StringConstraints(pattern=r"^$|^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$")] = ""

    q: Optional[str] = ""
    url: Optional[str] = ""
    user: Optional[str] = ""
    ioc: Optional[str] = ""
    type: Optional[str] = "c"
    page: Optional[int] = 1
    category: Optional[str] = ""
    fullsearch: Optional[bool] = False

    entity_filter: Optional[Dict[str, List[str]]] = Field(default=None, examples=[{"m_country": ["pakistan"]}])
    password_schema: Optional[PasswordFilterModel] = None
    hide_dismissed: Optional[bool] = True
