import asyncio
import json
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId

from fastapi import UploadFile, HTTPException

from orion.api.server.config_manager.model.config_data import config_data
from orion.services.log_manager.log_controller import log
from orion.services.mail_manager.mail_manager import mail_manager
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName
from orion.services.mongo_manager.shared_model.db_system_settings import AllowedKeys, db_system_model
from orion.services.mongo_manager.shared_model.db_tenant_model import db_tenant_model
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS


class config_controller:
    __instance = None
    CONFIG_CACHE_KEY = "system_config"
    EMAIL_META_KEYS = {"ACCOUNTS_MAIL_PASSWORD", "ACCOUNTS_MAIL", "ACCOUNTS_SMTP_SERVER", "ACCOUNTS_SMTP_PORT"}
    TENANT_EDITABLE_SETTINGS = {AllowedKeys.APP_NAME.value}
    ADMIN_SETTING_KEYS = {
        AllowedKeys.VERSION.value,
        AllowedKeys.EXTENSION_VERSION.value,
        AllowedKeys.LANGUAGE_ALLOWED.value,
        AllowedKeys.ADMIN_ROOT_ALLOWED.value,
        AllowedKeys.S_ONION.value,
        AllowedKeys.BACKUP_SCHEDULE.value,
    }
    SYSTEM_RESOURCE_FILENAMES = {
        AllowedKeys.LOGO_URL: "logo_url_custom.png",
        AllowedKeys.LOGO_WIDE_LIGHT: "logo_wide_light_custom.png",
        AllowedKeys.LOGO_WIDE_DARK: "logo_wide_dark_custom.png",
        AllowedKeys.AUTH_DASHBOARD_ICON: "auth_dashboard_icon_custom.png",
    }
    LEGACY_ALERT_CONNECTOR_META_KEYS = {"ALERT_SLACK_WEBHOOK_URL", "ALERT_SLACK_CHANNEL", "ALERT_SLACK_CHANNEL_ID", "ALERT_SLACK_CONFIGURATION_URL", "ALERT_SLACK_TEAM_ID", "ALERT_SLACK_TEAM_NAME", "ALERT_JIRA_ACCESS_TOKEN", "ALERT_JIRA_REFRESH_TOKEN", "ALERT_JIRA_EXPIRES_AT", "ALERT_JIRA_CLOUD_ID", "ALERT_JIRA_SITE_URL", "ALERT_JIRA_SITE_NAME", "ALERT_JIRA_BASE_URL", "ALERT_JIRA_EMAIL", "ALERT_JIRA_API_TOKEN", "ALERT_JIRA_PROJECT_KEY", "ALERT_JIRA_ISSUE_TYPE"}

    @staticmethod
    def getInstance():
        if config_controller.__instance is None:
            config_controller()
        return config_controller.__instance

    def __init__(self):
        self.BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.SYSTEM_DIR = self.BASE_DIR / "workspace" / "resource" / "system"
        self.SYSTEM_DIR.mkdir(parents=True, exist_ok=True)

        if config_controller.__instance is not None:
            return

        config_controller.__instance = self
        self._config: dict[str, str] = {}
        self._configs: dict[str, dict[str, str]] = {}
        self._tenants: dict[str, db_tenant_model] = {}
        self._default_tenant_id: str | None = None
        self._engine = mongo_controller.get_instance().get_engine()
        asyncio.create_task(self.load_config())

    @classmethod
    def _is_admin(cls, current_user) -> bool:
        return getattr(current_user, "role", "") == "admin"

    @classmethod
    def _is_tenant_branding_editor(cls, current_user) -> bool:
        if cls._is_admin(current_user):
            return True
        licenses = getattr(current_user, "licenses", None) or []
        return LicenseName.MAINTAINER in licenses

    async def _get_tenant(self, tenant_id: str | None = None) -> db_tenant_model | None:
        if tenant_id is None:
            if self._default_tenant_id:
                cached_default = self._tenants.get(self._default_tenant_id)
                if cached_default is not None:
                    return cached_default
            tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.is_default == True)
        else:
            cached_tenant = self._tenants.get(tenant_id)
            if cached_tenant is not None:
                return cached_tenant

            try:
                tenant_object_id = ObjectId(tenant_id)
            except (InvalidId, TypeError):
                tenant_object_id = tenant_id

            tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.id == tenant_object_id)
            if tenant is None and tenant_object_id != tenant_id:
                tenant = await self._engine.find_one(db_tenant_model,db_tenant_model.id == tenant_id)

        if tenant is None:
            return None

        resolved_tenant_id = str(tenant.id)
        self._tenants[resolved_tenant_id] = tenant
        if tenant.is_default:
            self._default_tenant_id = resolved_tenant_id
        return tenant

    def _cache_key(self, tenant_id: str) -> str:
        return f"{self.CONFIG_CACHE_KEY}:{tenant_id}"

    async def _save_config_to_redis(self, tenant_id: str):
        try:
            await redis_controller.getInstance().invoke_trigger(
                REDIS_COMMANDS.S_SET_STRING,
                [self._cache_key(tenant_id), json.dumps(self._configs.get(tenant_id, {})), None],
            )
        except Exception as ex:
            log.g().w(f"Redis config cache save skipped: {str(ex)}")

    async def load_config(self, force_db: bool = False, tenant_id: str | None = None) -> str | None:
        try:
            tenant = await self._get_tenant(tenant_id)
            if tenant is None:
                return None
            resolved_tenant_id = str(tenant.id)
            config = None
            if not force_db:
                try:
                    cached = await redis_controller.getInstance().invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [self._cache_key(resolved_tenant_id), None, None])
                    if cached:
                        cached_config = json.loads(cached)
                        if isinstance(cached_config, dict):
                            config = cached_config
                except Exception as ex:
                    log.g().w(f"Redis config cache read skipped: {str(ex)}")

            if config is None:
                record = await self._engine.find_one(db_system_model, (db_system_model.tenant_id == resolved_tenant_id)& (db_system_model.key == AllowedKeys.SYSTEM_SETTINGS))
                if record and record.value:
                    config = json.loads(record.value)
                else:
                    records = await self._engine.find(db_system_model, db_system_model.tenant_id == resolved_tenant_id)
                    config = {
                        (record.key.value if isinstance(record.key, AllowedKeys) else str(record.key)): record.value
                        for record in records
                        if record.key != AllowedKeys.SYSTEM_SETTINGS
                    }

            if not tenant.is_default:
                default_tenant = await self._get_tenant()
                default_config = {}
                if default_tenant:
                    default_record = await self._engine.find_one(db_system_model, (db_system_model.tenant_id == str(default_tenant.id)) & (db_system_model.key == AllowedKeys.SYSTEM_SETTINGS))
                    if default_record and default_record.value:
                        default_config = json.loads(default_record.value)
                for key in self.ADMIN_SETTING_KEYS:
                    config[key] = default_config.get(key, "")
                config[AllowedKeys.AI_ENDPOINT_ENABLED.value] = "1" if (
                    config.get(AllowedKeys.AI_ENDPOINT_ENABLED.value) == "1"
                    and default_config.get(AllowedKeys.AI_ENDPOINT_ENABLED.value) == "1"
                ) else "0"
            self._configs[resolved_tenant_id] = config
            if tenant.is_default:
                self._config = config
            await self._save_config_to_redis(resolved_tenant_id)
            return resolved_tenant_id
        except Exception as ex:
            log.g().e(f"Error loading config: {ex}")
            return None

    def get(self, key: str, default=None, tenant_id: str | None = None):
        config = self._configs.get(tenant_id, {}) if tenant_id else self._config
        return config.get(key, default)

    async def get_cached(self, key: str, default=None, tenant_id: str | None = None):
        resolved_tenant_id = await self.load_config(tenant_id=tenant_id)
        config = self._configs.get(resolved_tenant_id, {}) if resolved_tenant_id else self._config
        return config.get(key, default)

    @staticmethod
    def _is_smtp_values_configured(meta_info: dict) -> bool:
        required = [
            meta_info.get("ACCOUNTS_MAIL"),
            meta_info.get("ACCOUNTS_MAIL_PASSWORD"),
            meta_info.get("ACCOUNTS_SMTP_SERVER"),
            meta_info.get("ACCOUNTS_SMTP_PORT")
        ]
        if any(not value for value in required):
            return False
        try:
            smtp_port = int(str(meta_info.get("ACCOUNTS_SMTP_PORT", "")))
        except ValueError:
            return False
        return 1 <= smtp_port <= 65535

    @classmethod
    def _is_smtp_configured(cls, meta_info_raw) -> bool:
        try:
            meta_info = json.loads(meta_info_raw) if isinstance(meta_info_raw, str) else {}
        except (TypeError, ValueError):
            return False
        return cls._is_smtp_values_configured(meta_info if isinstance(meta_info, dict) else {})

    @staticmethod
    async def _is_backup_schedule() -> bool:
        return await config_controller.getInstance().get_cached(AllowedKeys.BACKUP_SCHEDULE, "0")

    def _redact_sensitive_meta_info(self, meta_info_raw: str, include_email_config: bool = False) -> str:
        try:
            meta_info = json.loads(meta_info_raw) if isinstance(meta_info_raw, str) else {}
        except (TypeError, ValueError):
            return meta_info_raw
        if not isinstance(meta_info, dict):
            return meta_info_raw
        for key in self.LEGACY_ALERT_CONNECTOR_META_KEYS:
            meta_info.pop(key, None)
        if not include_email_config:
            for key in self.EMAIL_META_KEYS:
                meta_info.pop(key, None)
        return json.dumps(meta_info)

    def asset(self, base: str, tenant: db_tenant_model) -> str:
        from orion.api.interactive.resource_manager.resource_manager import ResourceManager

        file_name = f"{base}_custom.png"
        resource_path = ResourceManager.get_instance().system_resource_path(file_name, tenant)
        asset_url = f"/api/s/static/system/{resource_path.name}"
        if base != "auth_dashboard_icon":
            return asset_url
        try:
            return f"{asset_url}?v={resource_path.stat().st_mtime_ns}"
        except OSError:
            return asset_url

    def _build_system_info_from_cache(self, tenant_id: str, tenant: db_tenant_model, include_email_config: bool = False) -> config_data:
        fresh_config = dict(self._configs.get(tenant_id, {}))

        fresh_config[AllowedKeys.LOGO_URL.value] = self.asset("logo_url", tenant)
        fresh_config[AllowedKeys.LOGO_WIDE_LIGHT.value] = self.asset("logo_wide_light", tenant)
        fresh_config[AllowedKeys.LOGO_WIDE_DARK.value] = self.asset("logo_wide_dark", tenant)
        fresh_config[AllowedKeys.AUTH_DASHBOARD_ICON.value] = self.asset("auth_dashboard_icon", tenant)
        meta_info = fresh_config.get(AllowedKeys.META_INFO.value) or json.dumps({
            "S_HOME_HEADER_DATA_SOURCES": "https://www.orionintelligence.org/sources",
            "S_HOME_HEADER_ADVERSARIES": "https://www.orionintelligence.org/adversaries",
            "S_HOME_HEADER_PRICING": "https://www.orionintelligence.org/pricing",
            "S_HOME_HEADER_PRICING_ALLOWED": True,
        })
        fresh_config["meta_info"] = self._redact_sensitive_meta_info(meta_info, include_email_config=include_email_config)
        fresh_config["smtp_configured"] = "1" if self._is_smtp_configured(meta_info) else "0"
        return config_data(settings=fresh_config)

    async def get_system_info(self, include_email_config: bool = False, tenant_id: str | None = None) -> config_data:
        self.SYSTEM_DIR = self.BASE_DIR / "workspace" / "resource" / "system"
        tenant = await self._get_tenant(tenant_id)
        if tenant is None:
            raise RuntimeError("Tenant configuration is unavailable")
        resolved_tenant_id = await self.load_config(tenant_id=str(tenant.id))
        if not resolved_tenant_id:
            raise RuntimeError("Tenant configuration is unavailable")
        return self._build_system_info_from_cache(
            resolved_tenant_id,
            tenant=tenant,
            include_email_config=include_email_config,
        )


    def _assert_tenant_editor(self, current_user, tenant_id: str, settings: dict[str, str] | None = None):
        if current_user is None:
            return
        if not self._is_tenant_branding_editor(current_user):
            raise HTTPException(status_code=403, detail="Only tenant maintainers can update branding")
        if not self._is_admin(current_user) and str(getattr(current_user, "tenant_uuid", "")) != tenant_id:
            raise HTTPException(status_code=403, detail="Tenant settings cannot be updated across tenants")
        if settings is not None and not self._is_admin(current_user):
            disallowed = set(settings).difference(self.TENANT_EDITABLE_SETTINGS)
            if disallowed:
                raise HTTPException(status_code=403, detail="Only tenant branding settings can be updated")

    async def update_public_config(self, data: config_data, include_email_config: bool = False, tenant_id: str | None = None, current_user=None):
        tenant = await self._get_tenant(tenant_id)
        if tenant is None:
            raise HTTPException(status_code=404, detail="Tenant configuration is unavailable")
        resolved_tenant_id = str(tenant.id)
        await self.load_config(tenant_id=resolved_tenant_id)

        settings = dict(data.settings)
        self._assert_tenant_editor(current_user, resolved_tenant_id, settings)
        include_email_config = include_email_config and (
            current_user is None or self._is_admin(current_user)
        )

        meta_info_raw = settings.get(AllowedKeys.META_INFO.value)
        if meta_info_raw:
            submitted_meta_info = json.loads(meta_info_raw)
            if not isinstance(submitted_meta_info, dict):
                raise HTTPException(status_code=400, detail="meta_info must be a JSON object")
            for key in self.LEGACY_ALERT_CONNECTOR_META_KEYS:
                submitted_meta_info.pop(key, None)
            existing_meta_info = {}
            if self._configs.get(resolved_tenant_id, {}).get(AllowedKeys.META_INFO.value):
                existing_meta_info = json.loads(self._configs[resolved_tenant_id][AllowedKeys.META_INFO.value])
            meta_info = {**existing_meta_info, **submitted_meta_info}
            mail_config_submitted = any(key in submitted_meta_info for key in self.EMAIL_META_KEYS)
            if mail_config_submitted:
                await mail_manager.get_instance().send_test_mail(
                    tenant_id=resolved_tenant_id,
                    config={
                        "ACCOUNTS_MAIL_PASSWORD": meta_info.get("ACCOUNTS_MAIL_PASSWORD"),
                        "ACCOUNTS_MAIL": meta_info.get("ACCOUNTS_MAIL"),
                        "ACCOUNTS_SMTP_SERVER": meta_info.get("ACCOUNTS_SMTP_SERVER"),
                        "ACCOUNTS_SMTP_PORT": meta_info.get("ACCOUNTS_SMTP_PORT"),
                    },
                )
            settings[AllowedKeys.META_INFO.value] = json.dumps(meta_info)

        allowed_setting_keys = {
            "language": AllowedKeys.LANGUAGE_ALLOWED,
            AllowedKeys.APP_NAME.value: AllowedKeys.APP_NAME,
            AllowedKeys.META_INFO.value: AllowedKeys.META_INFO,
            AllowedKeys.AI_ENDPOINT_ENABLED.value: AllowedKeys.AI_ENDPOINT_ENABLED,
            AllowedKeys.BACKUP_SCHEDULE.value: AllowedKeys.BACKUP_SCHEDULE,
            AllowedKeys.ADMIN_ROOT_ALLOWED.value: AllowedKeys.ADMIN_ROOT_ALLOWED,
            AllowedKeys.S_ONION.value: AllowedKeys.S_ONION,
            AllowedKeys.EXTENSION_VERSION.value: AllowedKeys.EXTENSION_VERSION,
        }
        system_settings = dict(self._configs.get(resolved_tenant_id, {}))
        for key_str, value in settings.items():
            if key_str not in allowed_setting_keys:
                continue
            key = allowed_setting_keys[key_str].value
            if not tenant.is_default and key in self.ADMIN_SETTING_KEYS:
                continue
            system_settings[key] = value
        if not tenant.is_default:
            for key in self.ADMIN_SETTING_KEYS:
                system_settings.pop(key, None)

        record = await self._engine.find_one(
            db_system_model,
            (db_system_model.tenant_id == resolved_tenant_id)
            & (db_system_model.key == AllowedKeys.SYSTEM_SETTINGS),
        )
        if record:
            record.value = json.dumps(system_settings)
            await self._engine.save(record)
        else:
            await self._engine.save(db_system_model(
                tenant_id=resolved_tenant_id,
                key=AllowedKeys.SYSTEM_SETTINGS,
                value=json.dumps(system_settings)
            ))

        await self.load_config(force_db=True, tenant_id=resolved_tenant_id)
        return await self.get_system_info(
            include_email_config=include_email_config,
            tenant_id=resolved_tenant_id,
        )


    async def uploadSystemResource(self, file: UploadFile, current_user, key: str, tenant_id: str | None = None):
        from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
        from orion.api.interactive.resource_manager.resource_manager import ResourceManager

        try:
            allowed_key = AllowedKeys(key)
        except ValueError as ex:
            raise HTTPException(status_code=400, detail="Invalid system resource") from ex
        file_name = self.SYSTEM_RESOURCE_FILENAMES.get(allowed_key)
        if file_name is None:
            raise HTTPException(status_code=400, detail="Invalid system resource")

        requested_tenant_id = tenant_id or getattr(current_user, "tenant_uuid", None)
        tenant = await self._get_tenant(requested_tenant_id)
        if tenant is None:
            raise HTTPException(status_code=404, detail="Tenant configuration is unavailable")
        resolved_tenant_id = str(tenant.id)
        await self.load_config(tenant_id=resolved_tenant_id)
        self._assert_tenant_editor(current_user, resolved_tenant_id)

        contents = await file.read()
        max_file_size = 1024 * 1024
        if len(contents) > max_file_size:
            raise HTTPException(status_code=400, detail="File too large! Maximum allowed size is 1 MB.")
        if not (file.content_type or "").startswith("image/"):
            raise HTTPException(status_code=415, detail="Invalid file type. Only image files are allowed.")

        system_dir = ResourceManager.get_instance().get_tenant_system_dir(tenant)
        if system_dir is None:
            raise HTTPException(status_code=400, detail="Tenant resource directory is unavailable")
        system_dir.mkdir(parents=True, exist_ok=True)
        with open(system_dir / file_name, "wb") as output_file:
            output_file.write(contents)

        system_settings = dict(self._configs.get(resolved_tenant_id, {}))
        system_settings[allowed_key.value] = file_name
        if not tenant.is_default:
            for key in self.ADMIN_SETTING_KEYS:
                system_settings.pop(key, None)
        record = await self._engine.find_one(db_system_model, (db_system_model.tenant_id == resolved_tenant_id) & (db_system_model.key == AllowedKeys.SYSTEM_SETTINGS))
        if record:
            record.value = json.dumps(system_settings)
            await self._engine.save(record)
        else:
            record = db_system_model(tenant_id=resolved_tenant_id, key=AllowedKeys.SYSTEM_SETTINGS, value=json.dumps(system_settings))
            await self._engine.save(record)

        await self.load_config(force_db=True, tenant_id=resolved_tenant_id)
        await AuditLogManager.get_instance().register(
            resolved_tenant_id,
            str(current_user.id),
            "upload_image",
        )

        prefix = "/api/s/static/system/"
        return {
            AllowedKeys.LOGO_URL: prefix + file_name if allowed_key == AllowedKeys.LOGO_URL else None,
            AllowedKeys.LOGO_WIDE_LIGHT: prefix + file_name if allowed_key == AllowedKeys.LOGO_WIDE_LIGHT else None,
            AllowedKeys.LOGO_WIDE_DARK: prefix + file_name if allowed_key == AllowedKeys.LOGO_WIDE_DARK else None,
            AllowedKeys.AUTH_DASHBOARD_ICON: prefix + file_name if allowed_key == AllowedKeys.AUTH_DASHBOARD_ICON else None,
        }
