from typing import List, Optional

from pydantic import BaseModel, ConfigDict

class IPScanRequest(BaseModel):
    ip: str

    model_config = ConfigDict(
        json_schema_extra={"example": {"ip": "8.8.8.8"}})


class NetIntelDeepScanRequest(BaseModel):
    ip: str
    depth: Optional[str] = "medium"

    model_config = ConfigDict(
        json_schema_extra={"example": {"ip": "8.8.8.8", "depth": "medium"}})


class ResolveIPRequest(BaseModel):
    domain: str

    model_config = ConfigDict(
        json_schema_extra={"example": {"domain": "example.com"}})


class GeoCameraDetectRequest(BaseModel):
    coordinates: str
    radius_km: int = 25
    max_ips: int = 200

    model_config = ConfigDict(
        json_schema_extra={"example": {"coordinates": "24.8607,67.0011", "radius_km": 25, "max_ips": 200}})


class GeoCameraDetectRangesRequest(BaseModel):
    ip_ranges: List[str]
    max_ips: int = 200

    model_config = ConfigDict(
        json_schema_extra={"example": {"ip_ranges": ["192.168.1.0/24"], "max_ips": 200}})
