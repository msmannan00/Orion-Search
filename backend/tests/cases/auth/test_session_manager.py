from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pyotp
import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException
from starlette.responses import JSONResponse

from orion.constants.constant import CONSTANTS
from orion.helper_manager.env_handler import env_handler
from orion.services.mongo_manager.shared_model.db_auth_models import (
    LicenseName,
    UserStatus,
    user_role,
)
from orion.services.mongo_manager.shared_model.db_tenant_model import TenantStatus
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS
from orion.services.session_manager.session_manager import session_manager
from orion.api.interactive.auth_manager.auth_manager import auth_manager
from orion.api.interactive.tenant_manager.tenant_manager import TenantManager
from tests.cases.fake_model.fakes import FakeEngine, FakeRedis


def _run(coro):
    return asyncio.run(coro)


def _make_user(**overrides):
    data = {
        "id": "507f1f77bcf86cd799439011",
        "username": "alice",
        "role": user_role.ADMIN,
        "status": UserStatus.ACTIVE,
        "current_session_id": "sid-123",
        "tenant_uuid": "507f1f77bcf86cd799439012",
        "subscription": True,
        "account_verify_at": datetime.now(timezone.utc),
        "licenses": [LicenseName.MAINTAINER],
        "twofa_secret": None,
        "twofa_enabled": False,
        "password_reset_required": False,
        "password_reset_token": None,
        "password_reset_expiry": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _make_manager(*, user=None, find_one_results=None):
    engine = FakeEngine(user, find_one_results=find_one_results)

    class session_manager_under_test(session_manager):
        _redis = FakeRedis()
        _session_ttl = 1800

        @property
        def _engine(self):
            return engine

    return object.__new__(session_manager_under_test)


def _token(payload):
    return jwt.encode(
        payload,
        CONSTANTS.S_AUTH_SECRET_KEY,
        algorithm=CONSTANTS.S_AUTH_ALGORITHM,
    )


def test_get_current_user_restores_missing_redis_session_from_token_sid():
    user = _make_user()
    manager = _make_manager(user=user)

    current_user = _run(manager.get_current_user(f"Bearer {_token({'sub': 'alice', 'sid': 'sid-123'})}"))

    assert current_user is user
    assert manager._redis.values["session:507f1f77bcf86cd799439011"] == "sid-123"
    assert manager._redis.calls == [
        (REDIS_COMMANDS.S_GET_STRING, ["session:507f1f77bcf86cd799439011", None, None]),
        (REDIS_COMMANDS.S_SET_STRING, ["session:507f1f77bcf86cd799439011", "sid-123", 1800]),
    ]


def test_get_current_user_rejects_invalid_token():
    manager = _make_manager()

    with pytest.raises(HTTPException) as exc:
        _run(manager.get_current_user("Bearer not-a-jwt"))

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid token"


def test_get_current_user_rejects_missing_token():
    manager = _make_manager()

    with pytest.raises(HTTPException) as exc:
        _run(manager.get_current_user(""))

    assert exc.value.status_code == 401
    assert exc.value.detail == "Missing or invalid token"


def test_get_current_user_allows_crawler_without_session_checks():
    user = _make_user(role=user_role.CRAWLER, current_session_id=None)
    manager = _make_manager(user=user)

    current_user = _run(manager.get_current_user(_token({"sub": "alice"})))

    assert current_user is user
    assert manager._redis.calls == []


def test_get_current_user_rejects_token_for_other_tenant():
    user = _make_user(tenant_uuid="tenant-a")
    manager = _make_manager(user=user)

    with pytest.raises(HTTPException) as exc:
        _run(manager.get_current_user(f"Bearer {_token({'sub': 'alice', 'sid': 'sid-123'})}", tenant_id="tenant-b"))

    assert exc.value.status_code == 403
    assert exc.value.detail == "Tenant access forbidden"


def test_auth_login_rejects_user_on_wrong_tenant_url(monkeypatch):
    user = _make_user(tenant_uuid="tenant-a")

    class _FakeAuthManager:
        async def authenticate_user(self, mail, password):
            assert mail == "alice"
            assert password == "secret"
            return user

    monkeypatch.setattr(auth_manager, "get_instance", staticmethod(lambda: _FakeAuthManager()))

    with pytest.raises(HTTPException) as exc:
        _run(auth_manager.login("alice", "secret", tenant_id=SimpleNamespace(id="tenant-b")))

    assert exc.value.status_code == 403
    assert exc.value.detail == "Tenant access forbidden"


def test_tenant_urls_use_the_tenant_subdomain(monkeypatch):
    monkeypatch.setitem(
        env_handler.get_instance()._env_vars,
        "TENANT_BASE_DOMAIN",
        "",
    )
    tenant = SimpleNamespace(slug="acme", is_default=False)

    assert TenantManager.build_tenant_url(
        "https://orion.example", tenant, "/login"
    ) == "https://acme.orion.example/login"
    assert TenantManager.build_tenant_url(
        "http://localhost:4200", tenant, "/reset/token"
    ) == "http://acme.localhost:4200/reset/token"


def test_delete_tenant_rejects_default_tenant():
    tenant = SimpleNamespace(id="507f1f77bcf86cd799439012", is_default=True)
    manager = object.__new__(TenantManager)
    manager._engine = FakeEngine(find_one_results=[tenant])

    with pytest.raises(HTTPException) as exc:
        _run(manager.delete_tenant(str(tenant.id), SimpleNamespace(role=user_role.ADMIN)))

    assert exc.value.status_code == 403
    assert exc.value.detail == "Default tenant cannot be deleted"


def test_delete_tenant_rejects_non_admin():
    manager = object.__new__(TenantManager)
    manager._engine = FakeEngine()

    with pytest.raises(HTTPException) as exc:
        _run(manager.delete_tenant("507f1f77bcf86cd799439012", SimpleNamespace(role=user_role.MEMBER)))

    assert exc.value.status_code == 403
    assert exc.value.detail == "Only admins can delete tenants"


def test_delete_tenant_removes_users_and_keys():
    tenant_id = "507f1f77bcf86cd799439012"
    tenant = SimpleNamespace(id=tenant_id, is_default=False)
    users = [
        SimpleNamespace(id="507f1f77bcf86cd799439013"),
        SimpleNamespace(id="507f1f77bcf86cd799439014"),
    ]
    manager = object.__new__(TenantManager)
    manager._engine = FakeEngine(records=users, find_one_results=[tenant])

    result = _run(manager.delete_tenant(tenant_id, SimpleNamespace(role=user_role.ADMIN)))

    assert result == {"message": "Tenant deleted successfully"}
    assert len(manager._engine.removed) == 4
    assert manager._engine.deleted == [tenant]


@pytest.mark.parametrize("action", ["forgot", "update"])
def test_password_recovery_handles_the_wrong_tenant(monkeypatch, action):
    user = _make_user(tenant_uuid="tenant-a", email="alice@example.com")
    engine = FakeEngine(user)
    monkeypatch.setattr(
        "orion.api.interactive.auth_manager.auth_manager.mongo_controller.get_instance",
        staticmethod(lambda: SimpleNamespace(get_engine=lambda: engine)),
    )

    if action == "forgot":
        result = _run(auth_manager.forgot_password("alice@example.com", SimpleNamespace(id="tenant-b")))
        assert result == {"message": "If the email is registered, a password reset email has been sent."}
    else:
        with pytest.raises(HTTPException) as exc:
            _run(auth_manager.update_password("token", "NewPassword1!", SimpleNamespace(id="tenant-b")))
        assert exc.value.status_code == 403
        assert exc.value.detail == "Tenant access forbidden"


def test_get_current_role_and_status_return_enum_values():
    user = _make_user()
    manager = _make_manager(user=user)
    token = _token({"sub": "alice", "sid": "sid-123"})

    assert _run(manager.get_current_role(token)) == user_role.ADMIN
    assert _run(manager.get_current_status(token)) == UserStatus.ACTIVE


def test_get_current_role_rejects_json_response_user(monkeypatch):
    manager = _make_manager()
    monkeypatch.setattr(manager, "get_current_user", lambda _token: asyncio.sleep(0, result=JSONResponse({})))

    with pytest.raises(HTTPException) as exc:
        _run(manager.get_current_role("token"))

    assert exc.value.status_code == 403
    assert exc.value.detail == "Access forbidden"


def test_get_current_status_rejects_invalid_status_value(monkeypatch):
    manager = _make_manager()
    monkeypatch.setattr(
        manager,
        "get_current_user",
        lambda _token: asyncio.sleep(0, result=SimpleNamespace(status="broken")),
    )

    with pytest.raises(HTTPException) as exc:
        _run(manager.get_current_status("token"))

    assert exc.value.status_code == 403
    assert exc.value.detail == "User access not found"


def test_create_access_token_sets_session_for_non_crawler(monkeypatch):
    user = _make_user()
    manager = _make_manager(user=user)
    monkeypatch.setattr("orion.services.session_manager.session_manager.secrets.token_urlsafe", lambda _n: "fresh-sid")

    token, role = _run(manager.create_access_token({"sub": "alice"}, timedelta(hours=4)))
    payload = jwt.decode(
        token,
        CONSTANTS.S_AUTH_SECRET_KEY,
        algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
    )

    assert role == user_role.ADMIN
    assert payload["sub"] == "alice"
    assert payload["sid"] == "fresh-sid"
    assert user.current_session_id == "fresh-sid"
    assert manager._engine.saved == [user]
    assert manager._redis.values["session:507f1f77bcf86cd799439011"] == "fresh-sid"


def test_create_access_token_marks_free_tokens_without_redis(monkeypatch):
    manager = _make_manager()
    monkeypatch.setattr(manager, "get_current_role", lambda _token: asyncio.sleep(0, result="guest"))

    token, role = _run(manager.create_access_token({"sub": "guest"}, free=True))
    payload = jwt.decode(
        token,
        CONSTANTS.S_AUTH_SECRET_KEY,
        algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
        options={"verify_exp": False},
    )

    assert payload["sub"] == "guest"
    assert payload["free"] is True
    assert "exp" not in payload
    assert role == "guest"
    assert manager._redis.calls == []


def test_create_access_token_for_crawler_skips_redis_and_extends_expiry():
    user = _make_user(role=user_role.CRAWLER)
    manager = _make_manager(user=user)

    token, role = _run(manager.create_access_token({"sub": "alice"}, timedelta(days=10)))
    payload = jwt.decode(
        token,
        CONSTANTS.S_AUTH_SECRET_KEY,
        algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
    )

    assert role == user_role.CRAWLER
    assert "sid" not in payload
    assert manager._redis.calls == []
    assert manager._engine.saved == []


def test_create_temp_token_embeds_twofa_and_extra_fields():
    token = _run(session_manager.create_temp_token("alice", ttl_minutes=10, extra={"tfa_secret": "secret"}))
    payload = jwt.decode(
        token,
        CONSTANTS.S_AUTH_SECRET_KEY,
        algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
    )

    assert payload["sub"] == "alice"
    assert payload["twofa"] is True
    assert payload["tfa_secret"] == "secret"


def test_verify_2fa_and_issue_enables_twofa_and_returns_session(monkeypatch):
    secret = pyotp.random_base32()
    cipher = Fernet(Fernet.generate_key())
    user = _make_user(twofa_secret=None, licenses=[LicenseName.MAINTAINER, LicenseName.FREE])
    manager = _make_manager(user=user)
    temp_token = _run(session_manager.create_temp_token("alice", extra={"tfa_secret": secret}))
    code = pyotp.TOTP(secret).now()

    monkeypatch.setattr(session_manager, "get_instance", staticmethod(lambda: manager))
    monkeypatch.setattr(
        manager,
        "create_access_token",
        lambda data, ttl: asyncio.sleep(0, result=("issued-access-token", user.role)),
    )
    monkeypatch.setattr(manager, "has_onboarding", lambda company_id: asyncio.sleep(0, result=True))
    monkeypatch.setattr(manager, "_tenant_fernet", lambda _user: asyncio.sleep(0, result=cipher))

    result = _run(manager.verify_2fa_and_issue(temp_token, code))

    assert result["access_token"] == "issued-access-token"
    assert result["token_type"] == "bearer"
    assert result["session"]["username"] == "alice"
    assert result["session"]["hasOnboarding"] is True
    assert user.twofa_secret != secret
    assert cipher.decrypt(user.twofa_secret.encode()).decode() == secret
    assert user.twofa_enabled is True
    assert manager._engine.saved == [user]


def test_verify_2fa_and_issue_rejects_invalid_code(monkeypatch):
    secret = pyotp.random_base32()
    cipher = Fernet(Fernet.generate_key())
    user = _make_user(twofa_secret=cipher.encrypt(secret.encode()).decode())
    manager = _make_manager(user=user)
    temp_token = _run(session_manager.create_temp_token("alice"))
    monkeypatch.setattr(manager, "_tenant_fernet", lambda _user: asyncio.sleep(0, result=cipher))

    with pytest.raises(HTTPException) as exc:
        _run(manager.verify_2fa_and_issue(temp_token, "000000"))

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid 2FA code"


def test_refresh_token_returns_existing_free_token():
    manager = _make_manager()
    token = _token({"sub": "guest", "free": True})

    result = _run(manager.refresh_token(token))

    assert result == {"access_token": token, "token_type": "bearer"}


def test_refresh_token_rejects_when_maintainer_missing():
    user = _make_user()
    manager = _make_manager(find_one_results=[user, None])
    token = _token({"sub": "alice", "sid": "sid-123"})

    with pytest.raises(HTTPException) as exc:
        _run(manager.refresh_token(token))

    assert exc.value.status_code == 401
    assert exc.value.detail == "Maintainer user not found"


def test_refresh_token_rejects_expired_member_trial():
    maintainer = _make_user(
        role=user_role.MEMBER,
        account_verify_at=datetime.now(timezone.utc) - timedelta(days=31),
    )
    user = _make_user(role=user_role.MEMBER, subscription=False)
    manager = _make_manager(find_one_results=[user, maintainer])
    manager._redis.values["session:507f1f77bcf86cd799439011"] = "sid-123"
    token = _token({"sub": "alice", "sid": "sid-123"})

    with pytest.raises(HTTPException) as exc:
        _run(manager.refresh_token(token))

    assert exc.value.status_code == 402
    assert "Trial expired" in (exc.value.detail or "")


def test_refresh_token_returns_new_session_payload_for_crawler(monkeypatch):
    user = _make_user(role=user_role.CRAWLER, current_session_id=None)
    maintainer = _make_user(account_verify_at=datetime.now(timezone.utc))
    manager = _make_manager(find_one_results=[user, maintainer])
    monkeypatch.setattr(manager, "has_onboarding", lambda _company_id: asyncio.sleep(0, result=False))
    token = _token({"sub": "alice"})

    result = _run(manager.refresh_token(token))

    payload = jwt.decode(
        result["access_token"],
        CONSTANTS.S_AUTH_SECRET_KEY,
        algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
        options={"verify_exp": False},
    )
    assert result["token_type"] == "bearer"
    assert payload["sub"] == "alice"
    assert "sid" not in payload
    assert result["session"]["hasOnboarding"] is False


def test_has_onboarding_true_when_tenant_status_matches():
    onboarding = SimpleNamespace(status=TenantStatus.ONBOARDING)
    manager = _make_manager(find_one_results=[onboarding])

    assert _run(manager.has_onboarding("507f1f77bcf86cd799439012")) is True


def test_has_onboarding_false_for_empty_company_id():
    manager = _make_manager()

    assert _run(manager.has_onboarding("")) is False


def test_generate_verification_token_returns_non_empty_string():
    token = session_manager.generate_verification_token()

    assert isinstance(token, str)
    assert token


def test_logout_user_with_empty_token_returns_none():
    assert session_manager.logout_user("") is None
