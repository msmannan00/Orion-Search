import asyncio
import ipaddress
import socket
from typing import Any, Optional
from urllib.parse import urlparse

from fastapi import Depends, HTTPException, Request, UploadFile, status
from fastapi.security import OAuth2PasswordBearer
import jwt

from orion.constants.constant import CONSTANTS
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, user_role, UserStatus
from orion.services.permission_manager.permission_models import UserPermission
from orion.services.session_manager.session_manager import session_manager
from configs.auth_cookie import extension_token_from_request, token_from_request
from orion.constants import constant

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/token", auto_error=False)

PASSWORD_RESET_ALLOWED_PATHS = {"/api/get/tenant/node"}
SCAN_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
BLOCKED_SCAN_HOSTS = {"localhost", "localhost.localdomain"}


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def enforce_password_reset(user, request: Request):
    if getattr(user, "password_reset_required", False) and request.url.path not in PASSWORD_RESET_ALLOWED_PATHS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Password reset required")


def get_request_token(request: Request, token: str | None) -> str | None:
    return token_from_request(request) or token


def enforce_request_tenant_access(user, request: Request):
    session_manager.ensure_user_tenant_access(user, getattr(request.state, "tenant", None))
    return user


async def get_current_role(request: Request, token: str = Depends(oauth2_scheme)):
    token = get_request_token(request, token)
    user = await session_manager.get_instance().get_current_user(token)
    enforce_request_tenant_access(user, request)
    enforce_password_reset(user, request)
    role = user.role
    try:
        _ = user_role(role)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role not found")

    return role


async def get_current_status(request: Request, token: str = Depends(oauth2_scheme)):
    token = get_request_token(request, token)
    user = await session_manager.get_instance().get_current_user(token)
    enforce_request_tenant_access(user, request)
    enforce_password_reset(user, request)
    user_status = user.status
    try:
        _ = UserStatus(user_status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access not found")

    return user_status


def role_required(required_roles: list[user_role]):
    async def verify_role(role: user_role = Depends(get_current_role)):
        if role not in required_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")
        return role

    return verify_role


async def default_tenant_required(request: Request):
    if not getattr(getattr(request.state, "tenant", None), "is_default", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")
    return True


async def _authenticate_request(request: Request, token: str | None):
    user = await session_manager.get_instance().get_current_user(token)
    enforce_request_tenant_access(user, request)
    enforce_password_reset(user, request)
    return user


async def get_current_user(request: Request, token: str = Depends(oauth2_scheme)):
    return await _authenticate_request(request, get_request_token(request, token))


async def get_extension_user(request: Request, token: str = Depends(oauth2_scheme)):
    return await _authenticate_request(request, extension_token_from_request(request) or token)


async def get_is_free_token(request: Request, token: str = Depends(oauth2_scheme)) -> bool:
    token = get_request_token(request, token)
    if not token:
        return False

    token = token.strip()
    if token.startswith("Bearer "):
        token = token[len("Bearer ") :].strip()

    try:
        payload = jwt.decode(
            token,
            CONSTANTS.S_AUTH_SECRET_KEY,
            algorithms=[CONSTANTS.S_AUTH_ALGORITHM],
            options={"verify_exp": True},
        )
    except jwt.InvalidTokenError:
        return False

    return payload.get("free") is True


async def admin_or_enterprise_required(current_user=Depends(get_current_user)):
    role = _enum_value(getattr(current_user, "role", None))
    licenses = {_enum_value(license_name) for license_name in (getattr(current_user, "licenses", []) or [])}
    if role == user_role.ADMIN.value or LicenseName.ENTERPRISE.value in licenses:
        return current_user
    raise HTTPException(status_code=403, detail="Access forbidden")


async def case_management_required(current_user=Depends(get_current_user)):
    role = _enum_value(getattr(current_user, "role", None))
    licenses = {_enum_value(license_name) for license_name in (current_user.licenses or [])}
    if role == user_role.ADMIN.value or LicenseName.MAINTAINER.value in licenses:
        return True

    permissions = [_enum_value(permission) for permission in (current_user.permissions or [])]
    if role in (user_role.ANALYST.value, user_role.MEMBER.value) and UserPermission.CASE_MANAGEMENT.value in permissions:
        return True

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Case management permission required")


def _extract_scan_host(target: str) -> str:
    raw_target = (target or "").strip()
    if not raw_target:
        raise HTTPException(status_code=400, detail="Target is required")
    parsed = urlparse(raw_target if "://" in raw_target else f"//{raw_target}", allow_fragments=False)
    host = (parsed.hostname or raw_target).strip().strip("[]").rstrip(".").lower()
    if not host:
        raise HTTPException(status_code=400, detail="Invalid target")
    if host in BLOCKED_SCAN_HOSTS or host.endswith(".localhost"):
        raise HTTPException(status_code=400, detail="Private or internal targets are not allowed")
    return host


def _reject_internal_ip(address: str) -> None:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
        or not ip.is_global
    ):
        raise HTTPException(status_code=400, detail="Private or internal targets are not allowed")


async def _validate_public_scan_target(target: str) -> None:
    host = _extract_scan_host(target)
    _reject_internal_ip(host)
    try:
        resolved = await asyncio.to_thread(socket.getaddrinfo, host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail="Unable to resolve target host") from exc
    for item in resolved:
        _reject_internal_ip(item[4][0])


async def _scan_domain_with_type(payload, user_id: str, scan_type: Optional[str] = None):
    from orion.api.server.crawl_manager.crawl_model import crawl_model

    await _validate_public_scan_target(payload.domain)
    if scan_type:
        payload.scanType = scan_type
    return await crawl_model.getInstance().scan_domain(payload, user_id=user_id)


async def _read_scan_upload(file: UploadFile) -> bytes:
    if getattr(file, "size", None) is not None and file.size > SCAN_UPLOAD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large! Maximum allowed size is 10 MB.")
    content = await file.read()
    if len(content) > SCAN_UPLOAD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large! Maximum allowed size is 10 MB.")
    return content


def _enforce_demo_safe_search(param, current_user, is_free: bool = False) -> None:
    if current_user and getattr(current_user, "role", None) == user_role.DEMO and is_free:
        param.safe = True


def status_required(required_statuses: list[UserStatus], bypass_roles: Optional[list[user_role]] = None):
    async def verify_status(user_status: UserStatus = Depends(get_current_status),
            role: user_role = Depends(get_current_role), ):
        if bypass_roles and role in bypass_roles:
            return user_status

        if user_status not in required_statuses:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")
        return user_status

    return verify_status


def license_required(feature: str, bypass_roles: Optional[list[user_role]] = None, bypass_licenses: Optional[list[str]] = None,):
    async def checker(user=Depends(get_current_user), role: user_role = Depends(get_current_role)):
        if bypass_roles and role in bypass_roles:
            return True

        user_licenses = set(getattr(user, "licenses", []) or [])
        if bypass_licenses and user_licenses.intersection(bypass_licenses):
            return True

        permissions = get_user_permissions(user)
        if feature.startswith("module:"):
            module_name = feature.split(":", 1)[1]
            if permissions["modules"] == "all" or module_name in permissions["modules"]:
                return True
            raise HTTPException(
                403, f"No license for module: {module_name}")
        if not permissions.get(feature, False):
            raise HTTPException(
                403, f"License required: {feature}")
        return True

    return checker
def get_user_permissions(user):
    final: dict[str, Any] = {"modules": set(), "cti_graph": False, "mapping": False, "scanning": False, "maintainer": False, "geo_fencing": False}

    for lic in user.licenses:
        rules = constant.license_rules.get(lic, {})
        if rules.get("modules") == "all":
            final["modules"] = "all"
        elif final["modules"] != "all":
            final["modules"].update(rules.get("modules", []))

        final["cti_graph"] |= rules.get("cti_graph", False)
        final["mapping"] |= rules.get("mapping", False)
        final["scanning"] |= rules.get("scanning", False)
        final["maintainer"] |= rules.get("maintainer", False)
        final["geo_fencing"] |= rules.get("geo_fencing", False)
    return final
