from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException

import orion.api.interactive.account_manager.account_manager as account_module
from orion.constants.constant import CONSTANTS
from orion.api.interactive.account_manager.account_manager import AccountManager
from orion.api.interactive.account_manager.models.user_meta_model import user_meta_model
from orion.api.interactive.account_manager.models.user_model import user_model
from orion.api.interactive.tenant_manager.models.tenant_param_model import tenant_param_model
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, UserStatus, user_role
from orion.services.mongo_manager.shared_model.db_tenant_model import TenantStatus
from tests.cases.fake_model.fakes import FakeAuditManager, FakeDoc, FakeMongoEngine


def _run(coro):
    return asyncio.run(coro)


def _make_manager(tmp_path: Path, engine: FakeMongoEngine) -> AccountManager:
    manager = object.__new__(AccountManager)
    manager._engine = engine
    manager.BASE_DIR = tmp_path
    manager.IMAGE_DIR = tmp_path / "profile"
    manager.TENANT_DIR = tmp_path / "tenant"
    manager.IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    manager.TENANT_DIR.mkdir(parents=True, exist_ok=True)
    return manager


def _make_user(**overrides):
    data = {
        "id": "507f1f77bcf86cd799439011",
        "username": "alice",
        "email": "alice@example.com",
        "password": "hashed-password",
        "role": user_role.ANALYST,
        "status": UserStatus.ACTIVE,
        "tenant_uuid": "507f1f77bcf86cd799439012",
        "subscription": True,
        "licenses": [LicenseName.FREE],
        "preferences": {"theme": "light-theme", "profile_visible": True},
        "twofa_enabled": True,
        "twofa_secret": "secret",
        "account_verify_at": None,
        "demo_tour": True,
    }
    data.update(overrides)
    return FakeDoc(**data)


def _make_tenant(**overrides):
    data = {
        "id": "507f1f77bcf86cd799439012",
        "status": TenantStatus.ONBOARDING,
        "is_default": False,
        "user_quota": 5,
        "profile_visibility_enabled": True,
        "alert_run_time": None,
        "name": "",
        "phone": "",
        "country": "",
        "city": "",
        "postal_code": "",
        "licenses": [],
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_get_all_users_returns_tenant_users_for_maintainer(tmp_path):
    users = [
        _make_user(username="alice"),
        _make_user(username="bob", email="bob@example.com"),
    ]
    manager = _make_manager(tmp_path, FakeMongoEngine(records=users))
    current_user = SimpleNamespace(role="member", licenses=[LicenseName.MAINTAINER], tenant_uuid="tenant-1")

    result = _run(manager.get_all_users(current_user))

    assert [item.username for item in result] == ["alice", "bob"]


def test_create_tenant_user_accepts_prehashed_bcrypt_password(tmp_path):
    manager = _make_manager(tmp_path, FakeMongoEngine())
    hashed = "$2b$12$abcdefghijklmnopqrstuuP0xP4KJv6pD7V9uN1M2Q3R4S5T6U7V8"

    result = _run(manager.create_tenant_user(None, None, hashed))

    assert result == hashed


def test_create_tenant_user_rejects_duplicate_username_or_email(tmp_path):
    manager = _make_manager(tmp_path, FakeMongoEngine())

    with pytest.raises(HTTPException) as exc:
        _run(manager.create_tenant_user(object(), None, "password123"))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Username or email already exists"


def test_create_tenant_user_rejects_overlong_password(tmp_path):
    manager = _make_manager(tmp_path, FakeMongoEngine())

    with pytest.raises(HTTPException) as exc:
        _run(manager.create_tenant_user(None, None, "x" * 257))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Password too long"


def test_create_user_saves_new_user_when_inputs_are_valid(tmp_path, monkeypatch):
    engine = FakeMongoEngine(find_one_results=[None, None])
    manager = _make_manager(tmp_path, engine)
    current_user = SimpleNamespace(role=user_role.ADMIN, tenant_uuid="tenant-1")
    data = user_model(
        username="valid_user",
        email="user@example.com",
        password="Password1!",
        role=user_role.ANALYST,
        status=UserStatus.ACTIVE,
        subscription=True,
        licenses=[LicenseName.FREE],
    )

    monkeypatch.setattr(account_module.helper_controller, "extract_user_mail_fields", lambda payload: (payload.username, payload.email, payload.password))
    monkeypatch.setattr(
        manager,
        "create_tenant_user",
        lambda *_args: "$2b$12$abcdefghijklmnopqrstuuP0xP4KJv6pD7V9uN1M2Q3R4S5T6U7V8",
    )
    monkeypatch.setattr(
        "orion.services.mongo_manager.mongo_controller.mongo_controller.get_instance",
        staticmethod(lambda: SimpleNamespace(get_engine=lambda: engine)),
    )

    result = _run(manager.create_user(data, current_user))

    assert result == {
        "message": "User created successfully",
        "username": "valid_user",
        "email": "user@example.com",
    }
    assert len(engine.saved) == 1
    assert engine.saved[0].username == "valid_user"
    assert engine.saved[0].password_reset_required is True


def test_create_user_rejects_invalid_username_before_save(tmp_path, monkeypatch):
    engine = FakeMongoEngine()
    manager = _make_manager(tmp_path, engine)
    current_user = SimpleNamespace(role=user_role.ADMIN, tenant_uuid="tenant-1")
    data = user_model(
        username="bad name",
        email="user@example.com",
        password="Password1!",
        role=user_role.ANALYST,
        status=UserStatus.ACTIVE,
        subscription=True,
        licenses=[LicenseName.FREE],
    )

    monkeypatch.setattr(account_module.helper_controller, "extract_user_mail_fields", lambda payload: (payload.username, payload.email, payload.password))
    monkeypatch.setattr(
        "orion.services.mongo_manager.mongo_controller.mongo_controller.get_instance",
        staticmethod(lambda: SimpleNamespace(get_engine=lambda: engine)),
    )

    with pytest.raises(HTTPException) as exc:
        _run(manager.create_user(data, current_user))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Error creating user"
    assert engine.saved == []


def test_delete_user_removes_db_records_image_and_registers_audit(tmp_path, monkeypatch):
    user = _make_user(id="delete-me", tenant_uuid="tenant-1")
    engine = FakeMongoEngine(find_one_results=[user])
    manager = _make_manager(tmp_path, engine)
    (manager.IMAGE_DIR / "delete-me.enc").write_text("encrypted", encoding="utf-8")
    audit = FakeAuditManager()
    current_user = SimpleNamespace(id="admin-1", tenant_uuid="tenant-1", licenses=[LicenseName.MAINTAINER])

    monkeypatch.setattr(
        "orion.api.interactive.auditlog_manager.audit_log_manager.AuditLogManager.get_instance",
        staticmethod(lambda: audit),
    )

    result = _run(manager.delete_user(SimpleNamespace(username="alice"), current_user))

    assert result == {"message": "User deleted successfully"}
    assert engine.removed
    assert engine.deleted == [user]
    assert not (manager.IMAGE_DIR / "delete-me.enc").exists()
    assert audit.calls == [("tenant-1", "admin-1", "User deleted")]


def test_delete_user_rejects_maintainer_from_other_tenant(tmp_path):
    user = _make_user(id="delete-me", tenant_uuid="tenant-1")
    engine = FakeMongoEngine(find_one_results=[user])
    manager = _make_manager(tmp_path, engine)
    current_user = SimpleNamespace(id="admin-1", tenant_uuid="tenant-2", licenses=[LicenseName.MAINTAINER])

    with pytest.raises(HTTPException) as exc:
        _run(manager.delete_user(SimpleNamespace(username="alice"), current_user))

    assert exc.value.status_code == 401
    assert "same tenant" in (exc.value.detail or "")


def test_update_user_reactivates_disabled_user_and_updates_licenses(tmp_path, monkeypatch):
    user = _make_user(status=UserStatus.DISABLE, tenant_uuid="507f1f77bcf86cd799439012")
    tenant_key = Fernet.generate_key()
    enc = Fernet(tenant_key)
    tenant = _make_tenant(
        id="507f1f77bcf86cd799439012",
        user_quota=3,
        is_default=False,
        licenses=[enc.encrypt(LicenseName.OSINT_BASIC.value.encode()).decode()],
    )
    engine = FakeMongoEngine(find_one_results=[user, tenant])
    engine.count_result = 1
    manager = _make_manager(tmp_path, engine)
    audit = FakeAuditManager()
    current_user = SimpleNamespace(id="maint-1", tenant_uuid="507f1f77bcf86cd799439012", licenses=[LicenseName.MAINTAINER], role=user_role.MEMBER)
    request = tenant_param_model(username="alice", status=UserStatus.ACTIVE, licenses=[LicenseName.OSINT_BASIC])

    monkeypatch.setattr(
        "orion.api.interactive.auditlog_manager.audit_log_manager.AuditLogManager.get_instance",
        staticmethod(lambda: audit),
    )
    monkeypatch.setattr(
        "orion.services.encryption_manager.key_manager.KeyManager.get_instance",
        staticmethod(lambda: SimpleNamespace(get_profile_dek=lambda _tenant_id: asyncio.sleep(0, result=tenant_key))),
    )

    result = _run(manager.update_user(request, current_user))

    assert result == {"message": "User updated successfully", "id": "507f1f77bcf86cd799439011"}
    assert user.status == UserStatus.ACTIVE
    assert user.licenses == [LicenseName.OSINT_BASIC]
    assert engine.saved == [user]
    assert audit.calls[-1] == ("507f1f77bcf86cd799439012", "maint-1", "User updated")


def test_update_user_rejects_when_quota_exceeded(tmp_path):
    user = _make_user(status=UserStatus.DISABLE, tenant_uuid="507f1f77bcf86cd799439012")
    tenant = _make_tenant(id="507f1f77bcf86cd799439012", user_quota=1, is_default=False)
    engine = FakeMongoEngine(find_one_results=[user, tenant])
    engine.count_result = 1
    manager = _make_manager(tmp_path, engine)
    current_user = SimpleNamespace(id="maint-1", tenant_uuid="507f1f77bcf86cd799439012", licenses=[LicenseName.MAINTAINER], role=user_role.MEMBER)
    request = tenant_param_model(username="alice", status=UserStatus.ACTIVE, licenses=[LicenseName.OSINT_BASIC])

    with pytest.raises(HTTPException) as exc:
        _run(manager.update_user(request, current_user))

    assert exc.value.status_code == 400
    assert exc.value.detail == "User quota exceeded1"


def test_update_current_user_updates_fields_and_clears_twofa_secret(tmp_path, monkeypatch):
    user = _make_user(password=CONSTANTS.S_AUTH_PWD_CONTEXT.hash("CurrentPassword1!"))
    engine = FakeMongoEngine(find_one_results=[user])
    manager = _make_manager(tmp_path, engine)
    audit = FakeAuditManager()
    request = user_meta_model(
        username="alice",
        email="new@example.com",
        preferences={"theme": "dark-theme"},
        twofa_enabled=False,
        current_password="CurrentPassword1!",
        demo_tour=False,
    )

    monkeypatch.setattr(
        "orion.api.interactive.auditlog_manager.audit_log_manager.AuditLogManager.get_instance",
        staticmethod(lambda: audit),
    )

    result = _run(manager.update_current_user(request, SimpleNamespace(username="alice")))

    assert result == {"message": "User updated successfully"}
    assert user.email == "new@example.com"
    assert user.preferences == {"theme": "dark-theme"}
    assert user.twofa_enabled is False
    assert user.twofa_secret is None
    assert user.demo_tour is False
    assert engine.saved == [user]
    assert audit.calls == [("507f1f77bcf86cd799439012", "507f1f77bcf86cd799439011", "Self profile updated")]


def test_get_profile_image_returns_user_image_when_present(tmp_path):
    manager = _make_manager(tmp_path, FakeMongoEngine())
    (manager.TENANT_DIR / "tenant-1.png").write_bytes(b"user-image")

    response = _run(manager.getProfileImage("tenant-1"))

    assert response.headers["X-Default-Image"] == "false"
    assert response.body == b"user-image"


def test_get_profile_image_returns_default_flag_for_missing_user_image(tmp_path):
    manager = _make_manager(tmp_path, FakeMongoEngine())
    default_logo = manager.TENANT_DIR / "logo_url_default.png"
    default_logo.write_bytes(b"png-data")

    response = _run(manager.getProfileImage("missing"))

    assert response.headers["X-Default-Image"] == "true"
    assert response.body == b"png-data"


def test_safe_decrypt_returns_empty_string_for_missing_value(tmp_path):
    manager = _make_manager(tmp_path, FakeMongoEngine())
    enc = Fernet(Fernet.generate_key())

    assert manager.safe_decrypt(enc, None) == ""


def test_safe_decrypt_returns_empty_string_for_invalid_ciphertext(tmp_path):
    manager = _make_manager(tmp_path, FakeMongoEngine())
    enc = Fernet(Fernet.generate_key())

    assert manager.safe_decrypt(enc, "not-valid-ciphertext") == ""


def test_get_node_builds_response_with_decrypted_tenant_data(tmp_path, monkeypatch):
    tenant_key = Fernet.generate_key()
    enc = Fernet(tenant_key)
    tenant = _make_tenant(
        name=enc.encrypt(b"Acme").decode(),
        phone=enc.encrypt(b"+1-555").decode(),
        country=enc.encrypt(b"US").decode(),
        city=enc.encrypt(b"NYC").decode(),
        postal_code=enc.encrypt(b"10001").decode(),
        licenses=[enc.encrypt(b"enterprise").decode()],
        alert_run_time="09:30",
    )
    user = _make_user(tenant_uuid=tenant.id)
    engine = FakeMongoEngine(find_one_results=[tenant])
    engine.count_result = 2
    manager = _make_manager(tmp_path, engine)
    audit_summary = {"unseen_total": 3, "counts_by_type": {"ioc": 2}, "counts_by_risk": {"critical": 1}}

    (manager.TENANT_DIR / f"{tenant.id}.png").write_bytes(b"tenant-image")
    (manager.IMAGE_DIR / f"{user.id}.png").write_bytes(b"user-image")

    monkeypatch.setattr(
        "orion.services.encryption_manager.key_manager.KeyManager.get_instance",
        staticmethod(lambda: SimpleNamespace(get_or_create_dek=lambda _tenant_id: asyncio.sleep(0, result=tenant_key))),
    )
    monkeypatch.setattr(
        "orion.api.interactive.alert_manager.alert_manager.AlertManager.getInstance",
        staticmethod(lambda: SimpleNamespace(get_alert_summary=lambda _tenant_id: asyncio.sleep(0, result=audit_summary))),
    )

    node = _run(manager.get_node(user))

    assert node.user.username == "alice"
    assert node.user.theme == "light-theme"
    assert node.tenant.name == "Acme"
    assert node.tenant.phone == "+1-555"
    assert node.tenant.licenses == ["enterprise"]
    assert node.tenant.quotaExceeded is False
    assert node.tenant.alertsVisibleToAdmin is True
    assert node.tenant.alertRunTime == "09:30"
    assert node.alert_summary["unseen_total"] == 3


def test_get_public_user_hides_profile_when_tenant_visibility_disabled(tmp_path):
    user = _make_user()
    tenant = _make_tenant(profile_visibility_enabled=False)
    engine = FakeMongoEngine(find_one_results=[user, tenant])
    manager = _make_manager(tmp_path, engine)
    current_user = SimpleNamespace(id="someone-else", role=user_role.MEMBER, tenant_uuid=user.tenant_uuid)

    result = _run(manager.get_public_user("507f1f77bcf86cd799439011", current_user))

    assert result == {"hidden": True, "message": "Profile hidden by tenant"}


def test_get_public_user_hides_profile_when_user_pref_disables_visibility(tmp_path):
    user = _make_user(preferences={"profile_visible": False})
    engine = FakeMongoEngine(find_one_results=[user])
    manager = _make_manager(tmp_path, engine)
    current_user = SimpleNamespace(id="someone-else", role=user_role.MEMBER, tenant_uuid=user.tenant_uuid)

    result = _run(manager.get_public_user("507f1f77bcf86cd799439011", current_user))

    assert result == {"hidden": True, "message": "Profile hidden by user"}


def test_get_public_user_returns_visible_profile_payload(tmp_path, monkeypatch):
    tenant_key = Fernet.generate_key()
    enc = Fernet(tenant_key)
    user = _make_user(preferences={"profile_visible": True})
    tenant = _make_tenant(name=enc.encrypt(b"Acme").decode(), profile_visibility_enabled=True)
    engine = FakeMongoEngine(find_one_results=[user, tenant])
    manager = _make_manager(tmp_path, engine)
    current_user = SimpleNamespace(id="admin-1", role=user_role.ADMIN, tenant_uuid=user.tenant_uuid)

    monkeypatch.setattr(
        "orion.services.encryption_manager.key_manager.KeyManager.get_instance",
        staticmethod(lambda: SimpleNamespace(get_or_create_dek=lambda _tenant_id: asyncio.sleep(0, result=tenant_key))),
    )

    result = _run(manager.get_public_user("507f1f77bcf86cd799439011", current_user))

    assert result["hidden"] is False
    assert result["tenant_name"] == "Acme"
    assert result["licenses"] == ["free"]
