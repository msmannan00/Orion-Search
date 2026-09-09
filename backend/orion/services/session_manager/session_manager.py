import hashlib
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone

import jwt
import pyotp
from bson import ObjectId
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, status
from starlette.responses import JSONResponse

from orion.constants.constant import CONSTANTS
from orion.services.encryption_manager.key_manager import KeyManager
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, user_role, db_user_account, UserStatus
from orion.services.mongo_manager.shared_model.db_tenant_model import db_tenant_model, TenantStatus
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS


class session_manager:
    __instance = None
    __lock = threading.Lock()
    WEB_SESSION_CLIENT = "web"
    EXTENSION_SESSION_CLIENT = "extension"
    EXTENSION_SESSION_TTL = 30 * 24 * 60 * 60

    @staticmethod
    def get_instance():
        if session_manager.__instance is None:
            with session_manager.__lock:
                if session_manager.__instance is None:
                    session_manager.__instance = session_manager()
        return session_manager.__instance

    def __init__(self):
        if session_manager.__instance is not None:
            raise Exception("This class is a singleton!")
        session_manager.__instance = self
        self._redis = redis_controller.getInstance()
        self._session_ttl = 30 * 60

    @property
    def _engine(self):
        from orion.services.mongo_manager.mongo_controller import mongo_controller
        return mongo_controller.get_instance().get_engine()

    @staticmethod
    def tenant_identifier(tenant_or_id) -> str | None:
        if tenant_or_id is None:
            return None
        tenant_id = getattr(tenant_or_id, "id", tenant_or_id)
        return str(tenant_id) if tenant_id is not None else None

    @staticmethod
    def hash_password_reset_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def issue_password_reset_token(user, reset_twofa: bool = False) -> str:
        token = session_manager.generate_verification_token()
        user.password_reset_token = session_manager.hash_password_reset_token(token)
        user.password_reset_expiry = datetime.now(timezone.utc) + timedelta(minutes=20)
        user.reset_twofa_on_password_reset = reset_twofa
        return token

    @staticmethod
    async def _tenant_fernet(user) -> Fernet:
        dek = await KeyManager.get_instance().get_or_create_dek(str(user.tenant_uuid))
        return Fernet(dek)

    @classmethod
    def ensure_user_tenant_access(cls, user, tenant_or_id) -> None:
        tenant_id = cls.tenant_identifier(tenant_or_id)
        if tenant_id is None:
            return
        if not user or str(getattr(user, "tenant_uuid", "") or "") != tenant_id:
            raise HTTPException(status_code=403, detail="Tenant access forbidden")

    async def get_current_user(self, token: str, tenant_id=None):
        if not token:
            raise HTTPException(status_code=401, detail="Missing or invalid token")

        token = token.strip()
        if token.startswith("Bearer "):
            token = token[len("Bearer "):].strip()

        try:
            payload = jwt.decode(
                token,
                CONSTANTS.S_AUTH_SECRET_KEY,
                algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
                options={"verify_exp": True}, )
            username: str = payload.get("sub")
            if not username:
                raise HTTPException(status_code=401, detail="Missing or invalid token")

            user = await self._engine.find_one(db_user_account, db_user_account.username == username)
            if payload.get("free") is True:
                return user

            self.ensure_user_tenant_access(user, tenant_id)
            if not user:
                raise HTTPException(status_code=401, detail="Missing or invalid token")

            session_id = payload.get("sid")
            if user.role == user_role.CRAWLER:
                return user

            if not session_id:
                raise HTTPException(status_code=401, detail="Missing or invalid token")

            await self._ensure_active_session(user, session_id, self._session_client(payload), "Logged out due to multiple active sessions")

            return user

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

    async def get_current_role(self, token: str, tenant_id=None) -> str:
        user = (
            await self.get_current_user(token)
            if tenant_id is None
            else await self.get_current_user(token, tenant_id=tenant_id)
        )
        if not user or isinstance(user, JSONResponse):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

        role = user.role
        try:
            _ = user_role(role)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role not found")
        return role

    async def get_current_status(self, token: str, tenant_id=None) -> str:
        user = (
            await self.get_current_user(token)
            if tenant_id is None
            else await self.get_current_user(token, tenant_id=tenant_id)
        )
        if not user or isinstance(user, JSONResponse):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

        user_status = user.status
        try:
            _ = UserStatus(user_status)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access not found")
        return user_status

    async def create_access_token(self, data: dict, expires_delta: timedelta | None = None, free=False):
        to_encode = data.copy()
        username = to_encode.get("sub")

        if not free:
            if expires_delta is None:
                expires_delta = timedelta(minutes=30)

        user: db_user_account | None = None
        if username:
            user = await self._engine.find_one(db_user_account, db_user_account.username == username)

        token_client = self._session_client(to_encode)
        if token_client == self.EXTENSION_SESSION_CLIENT and not free:
            expires_delta = timedelta(seconds=self.EXTENSION_SESSION_TTL)
        elif not free and user and user.role != user_role.CRAWLER and expires_delta > timedelta(minutes=30):
            expires_delta = timedelta(minutes=30)

        expire: datetime | None = datetime.now(timezone.utc) + expires_delta if not free else None

        session_id = None
        if user and user.role != user_role.CRAWLER and not free:
            session_client = token_client
            redis_key = self._session_redis_key(user, session_client)
            if session_client == self.EXTENSION_SESSION_CLIENT:
                existing_sid = await self._redis.invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [redis_key, None, None])
                session_id = existing_sid or secrets.token_urlsafe(32)
            else:
                session_id = secrets.token_urlsafe(32)
                user.current_session_id = session_id
                await self._engine.save(user)
            await self._redis.invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [redis_key, session_id, self._client_session_ttl(session_client)])

        if expire is not None:
            to_encode.update({"exp": expire.timestamp()})
        if session_id:
            to_encode.update({"sid": session_id})

        if free:
            to_encode.update({"free": True})

        token = jwt.encode(to_encode, CONSTANTS.S_AUTH_SECRET_KEY, algorithm=CONSTANTS.S_AUTH_ALGORITHM)
        role = await self.get_current_role(token)
        return token, role

    @staticmethod
    async def create_temp_token(username: str, ttl_minutes: int = 5, extra: dict | None = None) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
        payload = {"sub": username, "exp": expire.timestamp(), "twofa": True}
        if extra:
            payload.update(extra)
        return jwt.encode(payload, CONSTANTS.S_AUTH_SECRET_KEY, algorithm=CONSTANTS.S_AUTH_ALGORITHM)

    async def verify_2fa_and_issue(self, temp_token: str, code: str, tenant_id=None):
        try:
            payload = jwt.decode(
                temp_token,
                CONSTANTS.S_AUTH_SECRET_KEY,
                algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
                options={"verify_exp": True}, )
            if not payload.get("twofa"):
                raise HTTPException(status_code=401, detail="Invalid 2FA token")

            username = payload.get("sub")
            if not username:
                raise HTTPException(status_code=401, detail="Invalid 2FA token")

            requested_tenant_id = self.tenant_identifier(tenant_id)
            token_tenant_id = payload.get("tenant_id")
            if token_tenant_id and requested_tenant_id and str(token_tenant_id) != requested_tenant_id:
                raise HTTPException(status_code=403, detail="Tenant access forbidden")

            user = await self._engine.find_one(db_user_account, db_user_account.username == username)
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            self.ensure_user_tenant_access(user, tenant_id)

            stored_secret = user.twofa_secret
            secret = payload.get("tfa_secret")
            cipher = None
            encrypt_secret = not stored_secret
            if stored_secret:
                cipher = await self._tenant_fernet(user)
                try:
                    secret = cipher.decrypt(stored_secret.encode()).decode()
                except InvalidToken:
                    secret = stored_secret
                    encrypt_secret = True
            if not secret:
                raise HTTPException(status_code=401, detail="Missing 2FA secret")

            if not pyotp.TOTP(secret).verify(code, valid_window=1):
                raise HTTPException(status_code=401, detail="Invalid 2FA code")

            user_changed = False
            if encrypt_secret:
                cipher = cipher or await self._tenant_fernet(user)
                user.twofa_secret = cipher.encrypt(secret.encode()).decode()
                user.twofa_enabled = True
                user_changed = True

            reset_token = None
            if getattr(user, "password_reset_required", False):
                reset_token = self.issue_password_reset_token(user)
                user_changed = True

            if user_changed:
                await self._engine.save(user)

            access_ttl = timedelta(weeks=92) if user.role == user_role.CRAWLER else timedelta(minutes=30)
            if user.role != user_role.CRAWLER and access_ttl > timedelta(minutes=30):
                access_ttl = timedelta(minutes=30)

            access_token, _role = await self.create_access_token({"sub": username}, access_ttl)
            onboarding_exists = await self.get_instance().has_onboarding(str(user.tenant_uuid))

            session = await self._build_session(user, onboarding_exists, reset_token)
            return {"access_token": access_token, "token_type": "bearer", "session": session}  # nosec B105

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="2FA token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid 2FA token")

    async def _build_session(self, user, onboarding_exists: bool, password_reset_token: str | None = None):
        return {
            "username": user.username,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "status": user.status.value if hasattr(user.status, "value") else str(user.status),
            "hasOnboarding": onboarding_exists,
            "subscription": user.subscription,
            "verificationDate": user.account_verify_at.isoformat() if user.account_verify_at else None,
            "password_reset_required": getattr(user, "password_reset_required", False),
            "password_reset_token": password_reset_token,
            "licenses": [user_license.value for user_license in user.licenses],
        }

    async def refresh_token(self, token: str, tenant_id=None):
        try:
            payload = jwt.decode(
                token,
                CONSTANTS.S_AUTH_SECRET_KEY,
                algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
                options={"verify_exp": True}, )
            if payload.get("free") is True:
                return {"access_token": token, "token_type": "bearer"}  # nosec B105

            username = payload.get("sub")
            if not username:
                raise HTTPException(status_code=401, detail="Invalid token")

            user = await self._engine.find_one(db_user_account, db_user_account.username == username)
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            self.ensure_user_tenant_access(user, tenant_id)

            maintainer_user = await self._engine.find_one(db_user_account, (db_user_account.tenant_uuid == user.tenant_uuid) & (db_user_account.licenses == LicenseName.MAINTAINER))
            if not maintainer_user:
                raise HTTPException(status_code=401, detail="Maintainer user not found")
            session_id = payload.get("sid")
            if user.role != user_role.CRAWLER:
                if not session_id:
                    raise HTTPException(status_code=401, detail="Invalid token")

                await self._ensure_active_session(user, session_id, self._session_client(payload), "Invalid token")

            role_name = (getattr(user.role, "value", str(user.role))).split(".")[-1].lower()
            acct_at = maintainer_user.account_verify_at
            if isinstance(acct_at, datetime):
                acct_at = acct_at if acct_at.tzinfo else acct_at.replace(tzinfo=timezone.utc)
            if role_name == "member" and not bool(getattr(user, "subscription", False)) and acct_at is not None and (
                    datetime.now(timezone.utc) - acct_at).days >= 30:
                raise HTTPException(status_code=402, detail="Trial expired. Please subscribe to continue.")

            onboarding_exists = await self.has_onboarding(str(user.tenant_uuid))

            base_expiry = time.time() + CONSTANTS.S_AUTH_ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 60 * 24
            if user.role != user_role.CRAWLER:
                base_expiry = time.time() + 15 * 60
            if self._session_client(payload) == self.EXTENSION_SESSION_CLIENT:
                base_expiry = time.time() + self.EXTENSION_SESSION_TTL

            if user.role in user_role.CRAWLER:
                new_token_payload = {"sub": username, "exp": base_expiry}
            else:
                new_token_payload = {"sub": username, "exp": base_expiry, "sid": session_id}
                if self._session_client(payload) == self.EXTENSION_SESSION_CLIENT:
                    new_token_payload["client"] = self.EXTENSION_SESSION_CLIENT

            new_token = jwt.encode(new_token_payload, CONSTANTS.S_AUTH_SECRET_KEY, algorithm=CONSTANTS.S_AUTH_ALGORITHM)

            session = await self._build_session(user, onboarding_exists)
            return {"access_token": new_token, "token_type": "bearer", "session": session}  # nosec B105

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

    async def has_onboarding(self, company_id: str) -> bool:
        engine = self._engine
        if company_id == "":
            return False
        onboarding = await engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(company_id))
        if onboarding and onboarding.status == TenantStatus.ONBOARDING:
            return True
        else:
            return False

    @staticmethod
    def generate_verification_token():
        return secrets.token_urlsafe(32)

    @staticmethod
    def logout_user(ptoken: str):
        if not ptoken:
            return

    async def invalidate_user_session(self, ptoken: str, tenant_id=None):
        if not ptoken:
            return

        token = ptoken.strip()
        if token.startswith("Bearer "):
            token = token[len("Bearer "):].strip()

        try:
            payload = jwt.decode(
                token,
                CONSTANTS.S_AUTH_SECRET_KEY,
                algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
                options={"verify_exp": False}, )
        except jwt.InvalidTokenError:
            return

        username = payload.get("sub")
        session_id = payload.get("sid")
        if not username or not session_id:
            return

        user = await self._engine.find_one(db_user_account, db_user_account.username == username)
        session_client = self._session_client(payload)
        if not user:
            return

        if session_client == self.EXTENSION_SESSION_CLIENT:
            await self._redis.invoke_trigger(REDIS_COMMANDS.S_DELETE_KEY, [self._session_redis_key(user, session_client)])
            return

        if user.current_session_id != session_id:
            return

        self.ensure_user_tenant_access(user, tenant_id)

        user.current_session_id = None
        await self._engine.save(user)
        await self._redis.invoke_trigger(REDIS_COMMANDS.S_DELETE_KEY, [self._session_redis_key(user, session_client)])

    async def _ensure_active_session(self, user, session_id: str, session_client: str, invalid_detail: str) -> None:
        redis_key = self._session_redis_key(user, session_client)
        redis_sid = await self._redis.invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [redis_key, None, None])

        if redis_sid is None:
            if session_client == self.EXTENSION_SESSION_CLIENT:
                raise HTTPException(status_code=401, detail=invalid_detail)
            if session_client == self.WEB_SESSION_CLIENT and user.current_session_id != session_id:
                raise HTTPException(status_code=401, detail=invalid_detail)
            await self._redis.invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [redis_key, session_id, self._session_ttl])
            return

        if redis_sid != session_id:
            raise HTTPException(status_code=401, detail=invalid_detail)
        if session_client == self.WEB_SESSION_CLIENT and redis_sid != user.current_session_id:
            raise HTTPException(status_code=401, detail=invalid_detail)
        await self._redis.invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [redis_key, redis_sid, self._client_session_ttl(session_client)])

    def _client_session_ttl(self, session_client: str) -> int:
        if session_client == self.EXTENSION_SESSION_CLIENT:
            return self.EXTENSION_SESSION_TTL
        return self._session_ttl

    def _session_client(self, payload: dict) -> str:
        client = str((payload or {}).get("client") or "").strip().lower()
        if client == self.EXTENSION_SESSION_CLIENT:
            return self.EXTENSION_SESSION_CLIENT
        return self.WEB_SESSION_CLIENT

    def _session_redis_key(self, user, session_client: str) -> str:
        base_key = f"session:{str(user.id)}"
        if session_client == self.EXTENSION_SESSION_CLIENT:
            return f"{base_key}:extension"
        return base_key
