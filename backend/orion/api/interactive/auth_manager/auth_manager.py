import hashlib
import threading
import traceback
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Depends, Request
from bson import ObjectId
from odmantic import AIOEngine
import pyotp

from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.api.interactive.tenant_manager.tenant_manager import TenantManager
from orion.constants import constant
from orion.services.mail_manager.mail_enums import MailSubject, MailUrlHeading
from orion.constants.constant import CONSTANTS
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, db_user_account, user_role, UserStatus
from orion.services.mongo_manager.shared_model.db_tenant_model import db_tenant_model, TenantStatus
from orion.services.session_manager.session_manager import session_manager
from orion.services.mail_manager.mail_manager import mail_manager
from orion.helper_manager.env_handler import env_handler
from orion.services.log_manager.log_controller import log


class auth_manager:
    __instance = None
    __lock = threading.Lock()
    __cache = {}

    @staticmethod
    def get_instance():
        if auth_manager.__instance is None:
            with auth_manager.__lock:
                if auth_manager.__instance is None:
                    auth_manager.__instance = auth_manager()
        return auth_manager.__instance

    def __init__(self):
        if auth_manager.__instance is not None:
            raise Exception("This class is a singleton!")
        auth_manager.__instance = self
        self._engine = mongo_controller.get_instance().get_engine()

    async def authenticate_user(self, mail: str, password: str):
        user = await self._engine.find_one(db_user_account, db_user_account.email == mail)
        if not user:
            user = await self._engine.find_one(db_user_account, db_user_account.username == mail)
        if not user or not CONSTANTS.S_AUTH_PWD_CONTEXT.verify(password, user.password):
            return None
        return user

    @staticmethod
    async def login(mail: str, password: str, free=False, tenant_id=None, client: str = "web"):
        user = await auth_manager.get_instance().authenticate_user(mail, password)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid user or password")
        if user.status == UserStatus.DISABLE:
            raise HTTPException(status_code=401, detail="Account Blocked")
        
        if str(client or "").strip().lower() == session_manager.EXTENSION_SESSION_CLIENT:
            tenant_id = getattr(user, "tenant_uuid", None)
            
        session_manager.ensure_user_tenant_access(user, tenant_id)

        requested_tenant_id = session_manager.tenant_identifier(tenant_id)
        if user.twofa_enabled:
            if user.twofa_secret:
                user.twofa_secret = str()
                temp_token = await session_manager.get_instance().create_temp_token(user.username, extra={"tenant_id": requested_tenant_id} if requested_tenant_id else None)
                return {"twofa_required": True, "temp_token": temp_token, "username": mail}
            else:
                secret = pyotp.random_base32()
                from orion.api.server.config_manager.config_controller import config_controller
                issuer_name = await config_controller.getInstance().get_cached(
                    "app_name", "Authenticator", tenant_id=requested_tenant_id)
                provisioning_uri = pyotp.TOTP(secret).provisioning_uri(name=user.username, issuer_name=issuer_name)
                temp_token = await session_manager.get_instance().create_temp_token(
                    user.username,
                    extra={
                        "tfa_secret": secret,
                        **({"tenant_id": requested_tenant_id} if requested_tenant_id else {}),
                    },
                )
                return {"twofa_required": True, "temp_token": temp_token, "provisioning_uri": provisioning_uri, "twofa_secret": secret, "username": user.username}

        engine = mongo_controller.get_instance().get_engine()
        maintainer_user = await engine.find_one(db_user_account, (db_user_account.tenant_uuid == user.tenant_uuid) & (db_user_account.licenses == LicenseName.MAINTAINER))
        if not maintainer_user:
                raise HTTPException(status_code=401, detail="Maintainer user not found")
        role_name = (getattr(user.role, "value", str(user.role))).split(".")[-1].lower()
        acct_at = maintainer_user.account_verify_at
        if isinstance(acct_at, datetime):
            acct_at = acct_at if acct_at.tzinfo else acct_at.replace(tzinfo=timezone.utc)

        if not getattr(user, "tenant_uuid", None):
            raise HTTPException(status_code=401, detail="account not found")
        tenant = await engine.find_one(
            db_tenant_model, db_tenant_model.id == ObjectId(user.tenant_uuid))
        if tenant and not tenant.verified:
            raise HTTPException(status_code=401, detail="account approval pending")
        if tenant and tenant.status == TenantStatus.DISABLE:
            raise HTTPException(status_code=401, detail="account blocked")

        if (role_name == "member" and not bool(getattr(user, "subscription", False)) and acct_at is not None and (
                datetime.now(timezone.utc) - acct_at).days >= 30):
            raise HTTPException(status_code=402, detail="Trial expired. Please subscribe to continue")

        if role_name == "member" and user.status != UserStatus.ACTIVE:
            raise HTTPException(status_code=401, detail="user currently disabled")

        reset_token = None
        if getattr(user, "password_reset_required", False):
            reset_token = session_manager.issue_password_reset_token(user)
            await engine.save(user)

        if user.role == user_role.CRAWLER:
            access_token_expires = timedelta(weeks=92)
        else:
            access_token_expires = timedelta(minutes=30)

        token_data = {"sub": user.username}
        if str(client or "").strip().lower() == session_manager.EXTENSION_SESSION_CLIENT:
            token_data["client"] = session_manager.EXTENSION_SESSION_CLIENT
        access_token, role = await session_manager.get_instance().create_access_token(
            data=token_data, expires_delta=access_token_expires, free=free)

        await AuditLogManager.get_instance().register(
            str(user.tenant_uuid), str(user.id), "User login")

        onboarding_exists = await session_manager.get_instance().has_onboarding(str(user.tenant_uuid))

        session_data = {"role": role, "username": user.username, "status": user.status, "hasOnboarding": onboarding_exists, "subscription": user.subscription, "verificationDate": user.account_verify_at, "licenses": [
            user_license.value for user_license in user.licenses], "password_reset_required": getattr(user, "password_reset_required", False), "password_reset_token": reset_token, }


        return {"access_token": access_token, "token_type": "bearer", "session": session_data, }  # nosec B105

    @staticmethod
    async def verify_user(token: str):
        engine = mongo_controller.get_instance().get_engine()
        user = await engine.find_one(db_user_account, db_user_account.verification_token == token)
        if not user:
            raise HTTPException(status_code=404, detail="Invalid token")

        if not user.verification_expiry or datetime.now(timezone.utc) > user.verification_expiry.replace(
                tzinfo=timezone.utc):
            raise HTTPException(status_code=400, detail="Verification link expired")

        tenant = await engine.find_one(
            db_tenant_model, db_tenant_model.id == ObjectId(user.tenant_uuid))
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        app_url = env_handler.get_instance().env("APP_URL")
        access_url = TenantManager.build_tenant_url(app_url, tenant, "/login")

        user.status = UserStatus.ACTIVE
        user.account_verify_at = datetime.now(timezone.utc)
        user.verification_token = None
        user.verification_expiry = None
        await engine.save(user)

        await AuditLogManager.get_instance().register(
            str(user.tenant_uuid), str(user.id), "User verified")

        if constant.mail_template is not None:
            html_content = constant.mail_template.render(
                username=user.username,
                email=user.email,
                subject=MailSubject.TENANT_ACCESS.value,
                lurlHeading=MailUrlHeading.TENANT_ACCESS.value,
                url=access_url,
                tenant_access=True)
        else:
            html_content = (
                f"{MailSubject.TENANT_ACCESS.value}\n\n"
                f"Hi {user.username},\n\n"
                "Your email has been verified successfully. "
                f"Access your tenant workspace at: {access_url}"
            )
        await mail_manager.get_instance().send_verification_mail(
            to=user.email,
            subject=MailSubject.TENANT_ACCESS.value,
            body=html_content,
            tenant_id=str(user.tenant_uuid))

        return {
            "message": "Email verified successfully. You may continue onboarding.",
            "access_url": access_url,
        }

    @staticmethod
    async def update_password(token: str, password: str, tenant_id):
        engine = mongo_controller.get_instance().get_engine()
        token_hash = session_manager.hash_password_reset_token(token)
        user = await engine.find_one(db_user_account, db_user_account.password_reset_token == token_hash)
        if not user:
            raise HTTPException(status_code=404, detail="Invalid Link")
        if tenant_id is None:
            raise HTTPException(status_code=403, detail="Tenant access forbidden")
        session_manager.ensure_user_tenant_access(user, tenant_id)
        if user.status != UserStatus.ACTIVE:
            raise HTTPException(status_code=403, detail="Account is not active")
        if not user.password_reset_expiry or datetime.now(timezone.utc) > user.password_reset_expiry.replace(
                tzinfo=timezone.utc):
            raise HTTPException(status_code=400, detail="Password reset link expired")
        if CONSTANTS.S_AUTH_PWD_CONTEXT.verify(password, user.password):
            raise HTTPException(status_code=400, detail="New password must be different from the old one.")

        user.password = CONSTANTS.S_AUTH_PWD_CONTEXT.hash(password)
        if getattr(user, "reset_twofa_on_password_reset", False):
            user.twofa_enabled = False
            user.twofa_secret = None
        user.reset_twofa_on_password_reset = False
        user.password_reset_required = False
        user.password_reset_token = None
        user.password_reset_expiry = None
        await engine.save(user)

        await AuditLogManager.get_instance().register(
            str(user.tenant_uuid), str(user.id), "Password updated")

        return {"message": "Password reset successfully."}

    @staticmethod
    async def forgot_password(mail: str, tenant_id, reset_twofa: bool = False):
        engine = mongo_controller.get_instance().get_engine()
        user = await engine.find_one(db_user_account, db_user_account.email == mail)
        if user:
            try:
                if tenant_id is None:
                    raise HTTPException(status_code=403, detail="Tenant access forbidden")
                session_manager.ensure_user_tenant_access(user, tenant_id)
                if user.status != UserStatus.ACTIVE:
                    raise HTTPException(status_code=403, detail="Account is not active")

                tenant = await engine.find_one(
                    db_tenant_model, db_tenant_model.id == ObjectId(user.tenant_uuid))
                if not tenant:
                    raise HTTPException(status_code=404, detail="Tenant not found")

                reset_token = session_manager.issue_password_reset_token(
                    user, reset_twofa=reset_twofa)
                await engine.save(user)
                await AuditLogManager.get_instance().register(
                    str(user.tenant_uuid), str(user.id), "Password reset requested")

                app_url = env_handler.get_instance().env("APP_URL")
                forgot_url = TenantManager.build_tenant_url(
                    app_url, tenant, f"/reset/{reset_token}")
                html_content = constant.mail_template.render(
                    username=user.username,
                    email=user.email,
                    subject=MailSubject.ACCOUNT_RECOVERY.value,
                    lurlHeading=MailUrlHeading.ACCOUNT_RECOVERY.value,
                    url=forgot_url)
                await mail_manager.get_instance().send_verification_mail(
                    to=user.email, subject=MailSubject.ACCOUNT_RECOVERY.value,
                    body=html_content, tenant_id=str(user.tenant_uuid))
            except Exception:
                log.g().e("Password reset email could not be sent: " + traceback.format_exc().strip())

        return {"message": "If the email is registered, a password reset email has been sent."}

    @staticmethod
    async def recover_account(recovery_key: str, tenant_id):
        engine = mongo_controller.get_instance().get_engine()
        submitted_hash = hashlib.sha256(recovery_key.strip().encode()).hexdigest()
        user = await engine.find_one(
            db_user_account, db_user_account.recovery_key_hash == submitted_hash)
        if user:
            try:
                await auth_manager.forgot_password(user.email, tenant_id, reset_twofa=True)
            except Exception:
                log.g().e("Account recovery email could not be sent: " + traceback.format_exc().strip())
        return {"message": "If the recovery details are valid, a password reset email has been sent."}

    @staticmethod
    async def edit_userStatus_and_sendMail_from_admin(user_id: str, request: Request):
        form = await request.form()
        updates = dict(form)
        engine: AIOEngine = Depends(mongo_controller.get_instance().get_engine)
        user = await engine.find_one(db_user_account, db_user_account.id == ObjectId(user_id))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        old_status = getattr(user, "status", None)
        new_status = updates.get("status", old_status)

        for field, value in updates.items():
            if hasattr(user, field):
                setattr(user, field, value)

        await engine.save(user)

        await AuditLogManager.get_instance().register(
            str(user.tenant_uuid), str(user.id), "User status updated")

        if old_status != "onboarding" and new_status == "onboarding":
            await mail_manager.get_instance().send_verification_mail(
                to=user.email,
                subject="Your account has been approved",
                body=f"Hi {user.username},\n\nYour account is now approved. "
                     f"You can log in and start onboarding.\n\nBest regards,\nTeam",
                tenant_id=str(user.tenant_uuid))

        return user
