import asyncio
import hashlib
import json
import re
import secrets
from typing import List
from urllib.parse import quote
from pathlib import Path
from types import SimpleNamespace

import httpx
from bson import ObjectId
from cryptography.fernet import Fernet
from fastapi import HTTPException
from fastapi.responses import Response

from orion.api.interactive.account_manager.models.node_callback_model import NodeCallbackModel
from orion.api.interactive.account_manager.models.user_meta_model import user_meta_model
from orion.api.interactive.account_manager.models.user_param_model import user_param_model
from orion.api.interactive.account_manager.models.user_model import user_model
from orion.api.interactive.alert_manager.alert_manager import AlertManager
from orion.api.interactive.tenant_manager.models.tenant_param_model import tenant_param_model
from orion.helper_manager.helper_controller import helper_controller
from orion.services.mongo_manager.shared_model.db_auth_models import db_user_account, UserStatus, LicenseName, user_role
from orion.api.server.sso_manager.constants.sso_constants import SSO_CONSTANTS
from orion.helper_manager.env_handler import env_handler
from orion.services.permission_manager.permission_models import UserPermission
from orion.services.encryption_manager.key_manager import KeyManager
from orion.constants.constant import CONSTANTS
from orion.services.mongo_manager.shared_model.db_keys import db_keys
from orion.services.mongo_manager.shared_model.db_system_settings import AllowedKeys, db_system_model
from orion.services.mongo_manager.shared_model.db_tenant_model import TenantStatus, db_tenant_model


class AccountManager:
    __instance = None

    def __init__(self):
        from orion.services.mongo_manager.mongo_controller import mongo_controller
        self.BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.IMAGE_DIR = self.BASE_DIR / "workspace" / "resource" / "profile"
        self._engine = mongo_controller.get_instance().get_engine()

        self.BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.TENANT_DIR = self.BASE_DIR / "workspace" / "resource" / "tenant"
        self.TENANT_DIR.mkdir(parents=True, exist_ok=True)
        if AccountManager.__instance is not None:
            raise Exception("This class is a singleton!")
        AccountManager.__instance = self

    @staticmethod
    def get_instance():
        if AccountManager.__instance is None:
            if AccountManager.__instance is None:
                AccountManager.__instance = AccountManager()
        return AccountManager.__instance

    async def get_all_users(self, current_user) -> List[user_param_model]:
        if current_user.role == "admin" or LicenseName.MAINTAINER in (current_user.licenses or []):
            tenant_uuid = current_user.tenant_uuid
            users = await self._engine.find(
                db_user_account,
                (db_user_account.tenant_uuid == tenant_uuid) & (db_user_account.role != user_role.CRAWLER))
            return [user_param_model(**u.dict()) for u in users]
        return []

    async def create_tenant_user(self, existing_user, existing_mail, password):
        if existing_user or existing_mail:
            raise HTTPException(status_code=400, detail="Username or email already exists")

        if password.startswith("$2b$") and len(password) >= 60:
            hashed_password = password
        else:
            if len(password) > 256:
                raise HTTPException(status_code=400, detail="Password too long")
            try:
                hashed_password = CONSTANTS.S_AUTH_PWD_CONTEXT.hash(password)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid password")
        return hashed_password

    async def _assert_orion_mail_allowed(self, permissions, tenant_uuid, current_user):
        if UserPermission.ORION_MAIL not in (permissions or []):
            return
        if current_user.role != user_role.ADMIN:
            raise HTTPException(status_code=403, detail="Only a root tenant admin can assign the Orion Mail permission")
        tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(str(tenant_uuid)))
        if tenant is None or not tenant.is_default:
            raise HTTPException(status_code=403, detail="Orion Mail permission is limited to root tenant users")

    async def _delete_orion_mail_account(self, user):
        if UserPermission.ORION_MAIL not in (getattr(user, "permissions", None) or []):
            return

        base_url = str(env_handler.get_instance().env("ORION_MAIL_PUBLIC_URL", "") or "").strip().rstrip("/")
        if not base_url:
            raise HTTPException(status_code=500, detail="Orion Mail is not configured")

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.delete(
                    f"{base_url}/api/accounts/{quote(str(user.email or ''), safe='')}",
                    headers={SSO_CONSTANTS.S_CLIENT_AUTH_HEADER: SSO_CONSTANTS.S_CLIENT_CREDENTIAL},
                )
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Orion Mail is not reachable") from exc

        if response.status_code not in (200, 202, 204, 404):
            raise HTTPException(status_code=500, detail="Orion Mail account could not be removed")

    async def create_user(self, data: user_model, current_user):
        from orion.services.mongo_manager.mongo_controller import mongo_controller
        try:
            engine = mongo_controller.get_instance().get_engine()

            if LicenseName.MAINTAINER in (data.licenses or []):
                raise HTTPException(status_code=403, detail="Role denied")

            if current_user.role == user_role.ADMIN:
                if data.role != user_role.ANALYST:
                    raise HTTPException(status_code=403, detail="Not allowed")
            elif user_role.MEMBER == current_user.role and LicenseName.MAINTAINER in (current_user.licenses or []):
                if data.role not in [user_role.MEMBER, user_role.ANALYST]:
                    raise HTTPException(status_code=403, detail="Not allowed")
            else:
                raise HTTPException(status_code=403, detail="Not allowed")

            username, email, password = helper_controller.extract_user_mail_fields(data)

            username_pattern = r"^[A-Za-z0-9_-]{4,20}$"
            if not re.match(username_pattern, username):
                raise HTTPException(status_code=400, detail="Username already exist")

            email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
            if not re.match(email_pattern, email):
                raise HTTPException(status_code=400, detail="Invalid email format")

            existing_user = await engine.find_one(db_user_account, db_user_account.username == username)
            existing_mail = await engine.find_one(db_user_account, db_user_account.email == email)
            hashed_password = self.create_tenant_user(existing_user, existing_mail, password)

            await self._assert_orion_mail_allowed(data.permissions, current_user.tenant_uuid, current_user)

            user = db_user_account(
                username=username,
                email=email,
                password=hashed_password,
                tenant_uuid=current_user.tenant_uuid,
                role=data.role,
                status=data.status,
                subscription=data.subscription,
                licenses=data.licenses,
                permissions=data.permissions,
                alerts_allowed_all=False,
                alerts_allowed_tenant_ids=[],
                password_reset_required=True, )

            await engine.save(user)
            return {"message": "User created successfully", "username": username, "email": email}

        except Exception:
            raise HTTPException(status_code=400, detail="Error creating user")

    async def delete_user(self, user, current_user):
        from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager

        user = await self._engine.find_one(db_user_account, db_user_account.username == user.username)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        if user.role in ["admin"]:
            raise HTTPException(status_code=401, detail="This user type cannot be deleted")

        if current_user.licenses.__contains__(LicenseName.MAINTAINER):
            if user.tenant_uuid != current_user.tenant_uuid:
                raise HTTPException(
                    status_code=401, detail="Maintainer can only delete non-maintainer users from the same tenant")
        else:
            raise HTTPException(status_code=401, detail="You are not allowed to delete users")

        await self._delete_orion_mail_account(user)

        await self._engine.remove(db_keys, db_keys.auth_id == str(user.id))

        image_path = self.IMAGE_DIR / f"{user.id}.enc"
        if image_path.exists():
            image_path.unlink()

        await self._engine.delete(user)
        await AuditLogManager.get_instance().register(
            str(user.tenant_uuid), str(current_user.id), "User deleted")

        return {"message": "User deleted successfully"}

    async def update_user(self, request: tenant_param_model, current_user):
        from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
        user = await self._engine.find_one(db_user_account, db_user_account.username == request.username)
        if not user:
            await AuditLogManager.get_instance().register(
                str(current_user.tenant_uuid), str(current_user.id), "User update failed")
            raise HTTPException(status_code=401, detail="User not found")

        if current_user.licenses.__contains__(LicenseName.MAINTAINER) and str(user.tenant_uuid) == str(
                current_user.tenant_uuid):
            pass
        else:
            await AuditLogManager.get_instance().register(
                str(current_user.tenant_uuid), str(current_user.id), "User update denied")
            raise HTTPException(status_code=401, detail="You are not allowed to update this user")

        if user.role in ["demo"] and current_user.role not in ["admin"]:
            await AuditLogManager.get_instance().register(
                str(user.tenant_uuid), str(current_user.id), "User update denied")
            raise HTTPException(status_code=401, detail="You are not allowed to manage this user")

        if user.role in ["admin", "crawl"]:
            await AuditLogManager.get_instance().register(
                str(user.tenant_uuid), str(current_user.id), "User update denied")
            raise HTTPException(status_code=401, detail="This user type cannot be updated")

        tenant: db_tenant_model | None = None
        if request.licenses is not None or (user.status == UserStatus.DISABLE and request.status == UserStatus.ACTIVE):
            tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(user.tenant_uuid))

        if request.status == UserStatus.DISABLE:
            user.status = UserStatus.DISABLE
        elif user.status == UserStatus.DISABLE:
            active_count = await self._engine.count(
                db_user_account,
                (db_user_account.tenant_uuid == str(user.tenant_uuid)) & (
                            db_user_account.status == UserStatus.ACTIVE.value))

            if tenant is not None and not tenant.is_default and tenant.user_quota is not None and request.status == UserStatus.ACTIVE and user.status == UserStatus.DISABLE and active_count >= tenant.user_quota:
                raise HTTPException(status_code=400, detail="User quota exceeded1")
            if request.status == UserStatus.ACTIVE:
                user.status = UserStatus.ACTIVE

        if request.licenses is not None:
            if current_user.role != user_role.ADMIN:
                if tenant is None:
                    raise HTTPException(status_code=400, detail="Tenant not found")
                dek = await KeyManager.get_instance().get_profile_dek(str(tenant.id))
                enc = Fernet(dek)
                tenant_allowed = set(enc.decrypt(l.encode()).decode() for l in (tenant.licenses or []))
                requested = set(request.licenses or [])
                if LicenseName.MAINTAINER in requested:
                    raise HTTPException(status_code=403, detail="Only admin can assign maintainer license")
                if requested and not requested.issubset(tenant_allowed):
                    raise HTTPException(status_code=400, detail="User assigned license not allowed for this tenant")
            user.licenses = request.licenses
        if request.permissions is not None:
            await self._assert_orion_mail_allowed(request.permissions, user.tenant_uuid, current_user)
            user.permissions = request.permissions
            if UserPermission.CASE_MANAGEMENT not in (user.permissions or []):
                user.alerts_allowed_all = False
                user.alerts_allowed_tenant_ids = []

        alert_fields_requested = (
            "alerts_allowed_all" in request.model_fields_set
            or "alerts_allowed_tenant_ids" in request.model_fields_set
        )
        alert_access_requested = bool(request.alerts_allowed_all) or bool(request.alerts_allowed_tenant_ids or [])
        if alert_fields_requested and current_user.role != user_role.ADMIN:
            if alert_access_requested:
                raise HTTPException(status_code=403, detail="Only admin can assign alert access")
        elif alert_fields_requested and UserPermission.CASE_MANAGEMENT in (user.permissions or []):
            from orion.api.interactive.tenant_manager.tenant_manager import TenantManager
            alert_request = SimpleNamespace(
                permissions=user.permissions,
                alerts_allowed_all=bool(request.alerts_allowed_all),
                alerts_allowed_tenant_ids=list(request.alerts_allowed_tenant_ids or []),
            )
            user.alerts_allowed_all, user.alerts_allowed_tenant_ids = await TenantManager.get_instance().validate_alert_access_assignment(alert_request, current_user)
        elif alert_fields_requested:
            user.alerts_allowed_all = False
            user.alerts_allowed_tenant_ids = []

        if request.password_reset_required is not None:
            user.password_reset_required = request.password_reset_required
        await self._engine.save(user)

        await AuditLogManager.get_instance().register(
            str(user.tenant_uuid), str(current_user.id), "User updated")

        return {"message": "User updated successfully", "id": str(user.id)}

    async def update_current_user(self, request: user_meta_model, current_user):
        from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
        user = await self._engine.find_one(db_user_account, db_user_account.username == current_user.username)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        twofa_changed = request.twofa_enabled is not None and request.twofa_enabled != user.twofa_enabled
        if (request.password is not None or twofa_changed) and (
            not request.current_password or
            not CONSTANTS.S_AUTH_PWD_CONTEXT.verify(request.current_password, user.password)
        ):
            raise HTTPException(status_code=400, detail="Invalid password")

        if request.username is not None:
            user.username = request.username
        if request.email is not None:
            user.email = request.email
        if request.preferences is not None:
            user.preferences = request.preferences
        if request.twofa_enabled is not None:
            user.twofa_enabled = request.twofa_enabled
            if not request.twofa_enabled:
                user.twofa_secret = None
        if getattr(request, "demo_tour", None) is not None:
            user.demo_tour = request.demo_tour
        if request.password is not None:
            if CONSTANTS.S_AUTH_PWD_CONTEXT.verify(request.password, user.password):
                raise HTTPException(status_code=400, detail="New password must be different from the old one.")
            user.password = CONSTANTS.S_AUTH_PWD_CONTEXT.hash(request.password)

        await self._engine.save(user)
        await AuditLogManager.get_instance().register(
            str(user.tenant_uuid), str(user.id), "Password updated" if request.password is not None else "Self profile updated")

        return {"message": "User updated successfully"}

    async def generate_recovery_key(self, current_user, current_password: str):
        if not CONSTANTS.S_AUTH_PWD_CONTEXT.verify(current_password, current_user.password):
            raise HTTPException(status_code=400, detail="Invalid password")
        recovery_key = secrets.token_urlsafe(32)
        current_user.recovery_key_hash = hashlib.sha256(recovery_key.encode()).hexdigest()
        await self._engine.save(current_user)
        return {"recovery_key": recovery_key}

    async def getProfileImage(self, userId: str):
        file_path = Path(self.TENANT_DIR) / f"{userId}.png"
        default_path = Path(self.TENANT_DIR) / "logo_url_default.png"

        is_default = not file_path.is_file()
        target_path = default_path if is_default else file_path

        with open(target_path, "rb") as f:
            data = f.read()

        return Response(
            content=data,
            media_type="image/png",
            headers={"X-Default-Image": "true" if is_default else "false", "Access-Control-Expose-Headers": "X-Default-Image"})

    def safe_decrypt(self, enc: Fernet, value: str | None) -> str:
        if not value:
            return ""
        try:
            return enc.decrypt(value.encode()).decode()
        except Exception:
            return ""

    async def get_node(self, current_user) -> NodeCallbackModel:
        user = current_user
        tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(user.tenant_uuid))
        tenant_id = str(user.tenant_uuid)

        assigned_quota = tenant.user_quota
        should_count_users = bool(not tenant.is_default and assigned_quota is not None)
        dek_task = KeyManager.get_instance().get_or_create_dek(str(tenant.id))
        summary_task = AlertManager.getInstance().get_alert_summary(tenant_id)
        count_task = (
            self._engine.count(db_user_account, (db_user_account.tenant_uuid == tenant_id))
            if should_count_users else None
        )

        if count_task is not None:
            dek, alert_summary, total_user = await asyncio.gather(dek_task, summary_task, count_task)
        else:
            dek, alert_summary = await asyncio.gather(dek_task, summary_task)
            total_user = 0

        enc = Fernet(dek)

        quota_exceeded = bool(
            not tenant.is_default and assigned_quota is not None and assigned_quota < total_user
        )

        tenant_image_file = self.TENANT_DIR / f"{str(tenant.id)}.png"
        tenant_image_path = "/api/s/static/tenant/" + (str(tenant.id) if tenant_image_file.is_file() else "default")

        user_image_file = self.IMAGE_DIR / f"{str(user.id)}.png"
        user_image_path = "/api/s/static/user/" + (str(user.id) if user_image_file.is_file() else "default")

        theme = (user.preferences or {}).get("theme") if isinstance(user.preferences, dict) else None
        if theme not in ("dark-theme", "light-theme"):
            theme = "dark-theme"

        accounts_mail = ""
        accounts_smtp_server = ""
        accounts_smtp_port = ""
        settings_record = await self._engine.find_one(db_system_model, (db_system_model.tenant_id == str(tenant.id)) & (db_system_model.key == AllowedKeys.SYSTEM_SETTINGS))
        if settings_record and settings_record.value:
            system_settings = json.loads(settings_record.value)
            meta_info = json.loads(system_settings.get(AllowedKeys.META_INFO.value) or "{}")
            accounts_mail = meta_info.get("ACCOUNTS_MAIL") or ""
            accounts_smtp_server = meta_info.get("ACCOUNTS_SMTP_SERVER") or ""
            accounts_smtp_port = meta_info.get("ACCOUNTS_SMTP_PORT") or ""

        node = NodeCallbackModel.model_validate(
            {"user": {"email": user.email, "theme": theme, "twofa_enabled": user.twofa_enabled, "username": user.username, "role": user.role, "status": user.status, "subscription": user.subscription, "verificationDate": user.account_verify_at.isoformat() if user.account_verify_at else None, "password_reset_required": getattr(user, "password_reset_required", False), "license": [
                user_license.value for user_license in
                user.licenses], "permissions": [
                permission.value if hasattr(permission, "value") else permission for permission in (getattr(user, "permissions", None) or [])], "image": user_image_path, "preferences": user.preferences or {}, "demo_tour": getattr(user, "demo_tour", True) }, "tenant": {"hasOnboarding": tenant.status == TenantStatus.ONBOARDING, "id": str(
                tenant.id), "isDefault": str(tenant.is_default), "name": self.safe_decrypt(
                enc, tenant.name), "phone": self.safe_decrypt(enc, tenant.phone), "country": self.safe_decrypt(
                enc, tenant.country), "city": self.safe_decrypt(enc, tenant.city), "postalCode": self.safe_decrypt(
                enc, tenant.postal_code), "taxId": self.safe_decrypt(enc, tenant.id), "userId": "", "licenses": [
                self.safe_decrypt(enc, l) for l in (tenant.licenses or [])], "assignedQuota": str(
                assigned_quota), "quotaExceeded": quota_exceeded, "image": tenant_image_path,
                "profileVisibilityEnabled": getattr(tenant, "profile_visibility_enabled", True),
                "eventManagementEnabled": getattr(tenant, "event_management_enabled", False),
                "alertsVisibleToAdmin": getattr(tenant, "alerts_visible_to_admin", True),
                "privilegedIoc": getattr(tenant, "privileged_ioc", False),
                "alertRunTime": getattr(tenant, "alert_run_time", None),
                "allowedAlertCategories": getattr(tenant, "allowed_alert_categories", None),
                "accountsMailPassword": "",
                "accountsMail": accounts_mail,
                "accountsSmtpServer": accounts_smtp_server,
                "accountsSmtpPort": accounts_smtp_port, }, "alerts": [], "alert_summary": alert_summary, })

        return node

    async def get_public_user(self, user_id: str, current_user) -> dict:
        user = await self._engine.find_one(db_user_account, db_user_account.id == ObjectId(user_id))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if current_user.role != user_role.ADMIN and str(user.tenant_uuid) != str(current_user.tenant_uuid):
            raise HTTPException(status_code=403, detail="You are not allowed to access this user")

        preferences = user.preferences if isinstance(user.preferences, dict) else {}
        if str(getattr(current_user, "id", "")) != user_id and preferences.get("profile_visible") is False:
            return {
                "hidden": True,
                "message": "Profile hidden by user",
            }

        tenant_name = ""
        tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(user.tenant_uuid))
        if tenant and str(getattr(current_user, "id", "")) != user_id and getattr(tenant, "profile_visibility_enabled", True) is False:
            return {
                "hidden": True,
                "message": "Profile hidden by tenant",
            }
        if tenant:
            dek = await KeyManager.get_instance().get_or_create_dek(str(tenant.id))
            enc = Fernet(dek)
            tenant_name = self.safe_decrypt(enc, tenant.name)

        return {
            "hidden": False,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "tenant_name": tenant_name,
            "licenses": [user_license.value if hasattr(user_license, "value") else str(user_license) for user_license in (user.licenses or [])],
        }
