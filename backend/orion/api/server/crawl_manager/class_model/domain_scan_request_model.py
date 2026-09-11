from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, Optional

class DomainScanRequest(BaseModel):
    domain: str
    scanType: Optional[str]
    checkLive: Optional[bool] = False


    model_config = ConfigDict(
        json_schema_extra={"example": {"domain": "www.bbc.com", "scanType": "basic","checkLive": False}})


class UrlVulnerabilityScanRequest(BaseModel):
    domain: str
    depth: str
    options: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(
        json_schema_extra={"example": {"domain": "example.com", "depth": "low"}})
