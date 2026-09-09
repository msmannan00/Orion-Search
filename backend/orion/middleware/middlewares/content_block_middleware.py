from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, RedirectResponse

from configs.auth_cookie import token_from_request
from orion.api.server.config_manager.config_controller import config_controller
from orion.services.mongo_manager.shared_model.db_auth_models import user_role
from orion.services.mongo_manager.shared_model.db_system_settings import AllowedKeys
from orion.services.session_manager.session_manager import session_manager


class content_block_middleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path == "/admin" or path.startswith("/admin/") or path == "/dashboard/admin" or path.startswith("/dashboard/admin/"):
            tenant: Any = getattr(request.state, "tenant", None)
            admin_root_allowed = await config_controller.getInstance().get_cached(
                AllowedKeys.ADMIN_ROOT_ALLOWED.value,
                "0",
                tenant_id=str(tenant.id) if tenant else None,
            )
            if str(admin_root_allowed).lower() not in ("1", "true"):
                return RedirectResponse(url="/", status_code=302)

        if path.startswith("/api/"):
            return await call_next(request)

        if path == "/admin" or path.startswith("/admin/"):
            token = token_from_request(request)
            if token:
                try:
                    session_mgr = session_manager.get_instance()
                    user = await session_mgr.get_current_user(token, getattr(request.state, "tenant", None))
                    if user and user.role == user_role.ADMIN.value:
                        return await call_next(request)
                except Exception:
                    return RedirectResponse(url="/login", status_code=302)
            return RedirectResponse(url="/login", status_code=302)

        if path == "/dashboard/admin" or path.startswith("/dashboard/admin/"):
            return await call_next(request)

        if not (path == "/dashboard" or path.startswith("/dashboard/")):
            return await call_next(request)

        token = token_from_request(request)

        user = None
        if token:
            try:
                user = await session_manager.get_instance().get_current_user(token, tenant_id=getattr(request.state, "tenant", None))
            except Exception:
                user = None

        if not user:
            return RedirectResponse(url="/login", status_code=302)

        response: Response = await call_next(request)
        return response
