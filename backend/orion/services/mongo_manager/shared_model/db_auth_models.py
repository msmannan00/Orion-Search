from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any

import pyotp
from odmantic import Model, Field
from passlib.context import CryptContext
from fastapi import HTTPException
from pydantic import field_validator, model_validator
from pydantic_core.core_schema import FieldValidationInfo
from orion.services.permission_manager.permission_models import UserPermission

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class user_role(str, Enum):
    ADMIN = "admin"
    CRAWLER = "crawler"
    MEMBER = "member"
    ANALYST = "analyst"
    DEMO = "demo"


class UserStatus(str, Enum):
    ACTIVE = "active"
    DISABLE = "disable"


class LicenseName(str, Enum):
    FREE = "free"
    FEEDER = "feeder"
    OSINT_BASIC = "osint_basic"
    OSINT_ADVANCED = "osint_advanced"
    SOCIAL_MAPPER = 'social_mapper'
    PENTESTER = "pentester"
    MAINTAINER = "maintainer"
    ENTERPRISE = "enterprise"


class db_user_account(Model):
    username: str = Field(unique=True)
    password: str
    email: str = Field(default="")
    role: user_role = Field(default=user_role.MEMBER)
    status: Optional[UserStatus] = Field(default=None)

    tenant_uuid: str = Field(default="")
    verification_token: Optional[str] = Field(default=None)
    verification_expiry: Optional[datetime] = Field(default=None)
    password_reset_token: Optional[str] = Field(default=None)
    password_reset_expiry: Optional[datetime] = Field(default=None)

    twofa_enabled: bool = Field(default=False)
    twofa_secret: Optional[str] = Field(default=None)
    recovery_key_hash: Optional[str] = Field(default=None)
    reset_twofa_on_password_reset: bool = Field(default=False)
    password_reset_required: bool = Field(default=False)

    account_verify_at: Optional[datetime] = Field(default=None)
    subscription: bool = Field(default=False)
    preferences: Optional[Dict[str, Any]] = {}
    current_session_id: Optional[str] = Field(default=None)
    licenses: List[LicenseName] = Field(default=[LicenseName.FREE])
    permissions: Optional[List[UserPermission]] = Field(default_factory=list)
    alerts_allowed_all: bool = False
    alerts_allowed_tenant_ids: List[str] = []
    demo_tour: bool = Field(default=False)

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(str(password))

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str, info: FieldValidationInfo) -> str:
        value = value.strip()
        role = info.data.get("role")
        if role == user_role.MEMBER:
            username_pattern = r"^[A-Za-z][A-Za-z0-9_-]{7,19}$"
            if not re.match(username_pattern, value):
                raise ValueError("Username already exist")
            if any(op in value for op in ["$", "{", "}"]):
                raise ValueError("Invalid characters in username")
        return value

    @field_validator("password", mode="before")
    @classmethod
    def validate_and_hash_password(cls, value: str) -> str:
        if value is None or not str(value).strip():
            raise ValueError("Password is required")

        password = str(value)

        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[a-z]", password):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[A-Z]", password):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", password):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise ValueError("Password must contain at least one special character")

        if password.startswith("$2b$"):
            return password

        return pwd_context.hash(password)

    @model_validator(mode="before")
    @classmethod
    def validate_licenses(cls, values):
        if values.get("permissions") is None:
            values["permissions"] = []

        licenses = values.get("licenses")

        if licenses is not None:
            if not licenses:
                raise HTTPException(status_code=400, detail="At least one license is required")

            if LicenseName.FREE in licenses and len(licenses) > 1:
                raise HTTPException(status_code=400, detail="Free license cannot be combined with other licenses")

            if LicenseName.OSINT_BASIC in licenses and LicenseName.OSINT_ADVANCED in licenses:
                raise HTTPException(status_code=400, detail="osint_basic and osint_advanced cannot both be assigned")

            if LicenseName.ENTERPRISE in licenses:
                allowed_combo = {LicenseName.ENTERPRISE, LicenseName.MAINTAINER}
                if not set(licenses).issubset(allowed_combo):
                    raise HTTPException(
                        status_code=400,
                        detail="Enterprise license can only be combined with Maintainer")

        return values

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def is_admin(self) -> bool:
        return self.role == user_role.ADMIN

    def is_crawler(self) -> bool:
        return self.role == user_role.CRAWLER

    def is_demo(self) -> bool:
        return self.role == user_role.MEMBER

    def verify_2fa(self, code: str) -> bool:
        if not self.twofa_enabled or not self.twofa_secret:
            return False
        return pyotp.TOTP(self.twofa_secret).verify(code, valid_window=1)

    def provisioning_uri(self, issuer: str = "Authenticator") -> Optional[str]:
        if not self.twofa_secret:
            return None
        return pyotp.totp.TOTP(self.twofa_secret).provisioning_uri(
            name=self.username, issuer_name=issuer, )
