from __future__ import annotations

import json
import re
from enum import Enum
from typing import Any

from odmantic import Model, Field
from pydantic import field_validator

class AllowedKeys(str, Enum):
    SYSTEM_SETTINGS = "system_settings"
    VERSION = "version"
    EXTENSION_VERSION = "extension_version"
    APP_NAME = "app_name"
    META_INFO = "meta_info"
    LANGUAGE_ALLOWED = "language_allowed"
    AI_ENDPOINT_ENABLED = "ai_endpoint_enabled"
    BACKUP_SCHEDULE = "backup_schedule"
    ADMIN_ROOT_ALLOWED = "admin_root_allowed"
    S_ONION = "s_onion"
    LOGO_URL = "logo_url"
    LOGO_WIDE_LIGHT = "logo_wide_light"
    LOGO_WIDE_DARK = "logo_wide_dark"
    AUTH_DASHBOARD_ICON = "auth_dashboard_icon"

VALID_LANGUAGE_CODES = {"en", "fr", "es", "de", "it", "pt", "ru", "zh", "ja", "ko", "ar", "hi", "bn", "tr", "nl", "sv",
    "pl", "cs"}

ONION_ADDRESS_REGEX = re.compile(r"^(?:https?://)?[a-z2-7]{56}\.onion/?$", re.IGNORECASE)


class db_system_model(Model):
    tenant_id: str = Field(default="")
    key: AllowedKeys = Field(default=AllowedKeys.SYSTEM_SETTINGS)
    value: str = Field(default="")

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: str, info: Any):
        key = info.data.get("key")
        validators = {AllowedKeys.SYSTEM_SETTINGS: _is_valid_meta_info, AllowedKeys.VERSION: lambda v: bool(
            v.strip()), AllowedKeys.APP_NAME: lambda v: bool(
            v.strip()), AllowedKeys.META_INFO: lambda v: v == "" or _is_valid_meta_info(v), AllowedKeys.LANGUAGE_ALLOWED: lambda v: v in VALID_LANGUAGE_CODES, AllowedKeys.AI_ENDPOINT_ENABLED: lambda v: v in ("0", "1"), AllowedKeys.BACKUP_SCHEDULE: lambda v: v in ("0", "1"), AllowedKeys.ADMIN_ROOT_ALLOWED: lambda v: v.lower() in ("0", "1", "true", "false"), AllowedKeys.S_ONION: lambda v: v == "" or bool(
            ONION_ADDRESS_REGEX.match(v)), }
        error_messages = {AllowedKeys.SYSTEM_SETTINGS: "SYSTEM_SETTINGS must be a JSON object", AllowedKeys.VERSION: "VERSION must be a non-empty string", AllowedKeys.APP_NAME: "APP_NAME must be a non-empty string", AllowedKeys.META_INFO: "META_INFO must be a JSON object with string keys and JSON-compatible values or empty", AllowedKeys.LANGUAGE_ALLOWED: f"LANGUAGE_ALLOWED must be one of: {', '.join(sorted(VALID_LANGUAGE_CODES))}", AllowedKeys.AI_ENDPOINT_ENABLED: "AI_ENDPOINT_ENABLED must be '0' or '1'", AllowedKeys.BACKUP_SCHEDULE: "BACKUP_SCHEDULE must be '0' or '1'", AllowedKeys.ADMIN_ROOT_ALLOWED: "ADMIN_ROOT_ALLOWED must be '0', '1', 'true', or 'false'", AllowedKeys.S_ONION: "S_ONION must be a valid onion address or empty", }
        if key in validators and not validators[key](value):
            raise ValueError(error_messages[key])
        return value


def _is_valid_meta_info(value: str) -> bool:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return False

    if not isinstance(parsed, dict):
        return False

    return all(isinstance(k, str) for k in parsed.keys())
