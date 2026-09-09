from __future__ import annotations

import hashlib
import json
import secrets
from urllib.parse import urlencode, urlsplit

from bson import ObjectId
from fastapi import HTTPException, Request, status
from fastapi.responses import RedirectResponse

from configs.auth_cookie import token_from_request
from orion.api.server.sso_manager.constants.sso_constants import SSO_CONSTANTS
from orion.api.server.sso_manager.model.sso_model import SSOCodeExchangeRequest, SSOSessionRequest
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, db_user_account
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS
from orion.services.session_manager.session_manager import session_manager


class sso_manager:
    __instance = None

    @staticmethod
    def get_instance():
        if sso_manager.__instance is None:
            sso_manager()
        return sso_manager.__instance

    def __init__(self):
        if sso_manager.__instance is not None:
            raise Exception("This class is a singleton!")
        sso_manager.__instance = self
        self._engine = mongo_controller.get_instance().get_engine()
        self._redis = redis_controller.getInstance()

    @staticmethod
    def _require_client(request: Request) -> None:
        provided = request.headers.get(SSO_CONSTANTS.S_CLIENT_AUTH_HEADER, "")
        if len(SSO_CONSTANTS.S_CLIENT_CREDENTIAL) < 32:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Orion Mail SSO is not configured")
        if not provided or not secrets.compare_digest(SSO_CONSTANTS.S_CLIENT_CREDENTIAL, provided):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Orion Mail client")

    @staticmethod
    def _validate_redirect_uri(redirect_uri: str) -> str:
        candidate = redirect_uri.strip()
        parsed = urlsplit(candidate)
        if candidate not in SSO_CONSTANTS.S_ALLOWED_REDIRECT_URIS or parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.query or parsed.fragment:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Orion Mail redirect URI")
        return next(allowed for allowed in SSO_CONSTANTS.S_ALLOWED_REDIRECT_URIS if allowed == candidate)

    @staticmethod
    def _validate_state(state: str) -> str:
        if not SSO_CONSTANTS.S_STATE_PATTERN.fullmatch(state):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid SSO state")
        return state

    @staticmethod
    def _code_key(code: str) -> str:
        return f"orion_mail:sso_code:{hashlib.sha256(code.encode()).hexdigest()}"

    @staticmethod
    def _session_key(session_token: str) -> str:
        return f"orion_mail:session:{hashlib.sha256(session_token.encode()).hexdigest()}"

    @staticmethod
    def _identity_for_user(user: db_user_account) -> dict[str, str]:
        return {
            "user_id": str(user.id),
            "tenant_id": str(user.tenant_uuid),
            "username": str(user.username),
            "email": str(user.email or "").strip().lower(),
            "full_name": str(user.username),
        }

    async def _consume_code(self, code: str) -> dict | None:
        key = self._code_key(code)
        try:
            async with self._redis.lock(f"{key}:lock", timeout=5, blocking_timeout=2):
                raw = await self._redis.invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [key, None, None])
                if raw is None:
                    return None
                await self._redis.invoke_trigger(REDIS_COMMANDS.S_DELETE_KEY, [key])
        except TimeoutError:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return None

    async def _session_record(self, session_token: str) -> dict | None:
        raw = await self._redis.invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [self._session_key(session_token), None, None])
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            return None

    async def _active_user(self, record: dict) -> db_user_account | None:
        user_id = str(record.get("user_id") or "")
        session_id = str(record.get("session_id") or "")
        if not ObjectId.is_valid(user_id) or not session_id:
            return None
        user = await self._engine.find_one(db_user_account, db_user_account.id == ObjectId(user_id))
        if user is None or user.status != UserStatus.ACTIVE or user.password_reset_required or str(user.current_session_id or "") != session_id:
            return None
        active_session_id = await self._redis.invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [f"session:{user_id}", None, None])
        return user if active_session_id == session_id else None

    async def authorize(self, request: Request, redirect_uri: str, state: str):
        redirect_uri = self._validate_redirect_uri(redirect_uri)
        state = self._validate_state(state)
        try:
            user = await session_manager.get_instance().get_current_user(token_from_request(request), tenant_id=getattr(request.state, "tenant", None))
            if not isinstance(user, db_user_account):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        except HTTPException:
            authorize_path = request.url.path + "?" + urlencode({"redirect_uri": redirect_uri, "state": state})
            return RedirectResponse("/login?" + urlencode({"redirect": authorize_path}), status_code=status.HTTP_302_FOUND)
        if user.password_reset_required:
            return RedirectResponse("/login", status_code=status.HTTP_302_FOUND)
        session_id = str(user.current_session_id or "")
        if not session_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Orion Intelligence session is unavailable")
        code = secrets.token_urlsafe(48)
        record = {**self._identity_for_user(user), "session_id": session_id, "redirect_uri": redirect_uri}
        await self._redis.invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [self._code_key(code), json.dumps(record), SSO_CONSTANTS.S_CODE_TTL_SECONDS])
        return RedirectResponse(redirect_uri + "?" + urlencode({"code": code, "state": state}), status_code=status.HTTP_302_FOUND)

    async def exchange(self, request: Request, payload: SSOCodeExchangeRequest):
        self._require_client(request)
        redirect_uri = self._validate_redirect_uri(payload.redirect_uri)
        record = await self._consume_code(payload.code)
        if record is None or not secrets.compare_digest(str(record.get("redirect_uri") or ""), redirect_uri):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired Orion Mail authorization code")
        user = await self._active_user(record)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Orion Intelligence session has expired")
        session_token = secrets.token_urlsafe(64)
        session_record = {**self._identity_for_user(user), "session_id": str(user.current_session_id)}
        await self._redis.invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [self._session_key(session_token), json.dumps(session_record), SSO_CONSTANTS.S_SESSION_TTL_SECONDS])
        return {"session_token": session_token, "expires_in": SSO_CONSTANTS.S_SESSION_TTL_SECONDS, "identity": self._identity_for_user(user)}

    async def verify(self, request: Request, payload: SSOSessionRequest):
        self._require_client(request)
        user = await self._active_user(await self._session_record(payload.session_token) or {})
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired Orion Mail session")
        return self._identity_for_user(user)

    async def revoke(self, request: Request, payload: SSOSessionRequest):
        self._require_client(request)
        key = self._session_key(payload.session_token)
        if await self._session_record(payload.session_token) is None:
            return {"message": "Session already revoked"}
        await self._redis.invoke_trigger(REDIS_COMMANDS.S_DELETE_KEY, [key])
        return {"message": "Session revoked"}
