from datetime import timedelta

from fastapi import HTTPException, status, Form
from odmantic import AIOEngine
from starlette.requests import Request
from starlette.responses import Response, RedirectResponse
from starlette.status import HTTP_303_SEE_OTHER
from starlette_admin.auth import AdminConfig, AdminUser, AuthProvider
from starlette_admin.contrib.odmantic import Admin, ModelView

from configs.auth_cookie import ACCESS_COOKIE, clear_session_marker, set_access_cookie, token_from_request
from orion.api.interactive.auth_manager.auth_manager import auth_manager
from orion.services.mongo_manager import *
from orion.services.session_manager.session_manager import session_manager


class TokenAuthProvider(AuthProvider):
    async def render_login(self, request: Request, admin) -> Response:
        return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)

    async def login(self,
            username: str = Form(...),
            password: str = Form(...),
            remember_me: bool = Form(False),
            request: Request = None,
            response: Response = None, ) -> Response:
        try:
            user = await auth_manager.get_instance().authenticate_user(username, password)
            if not user or request is None:
                raise HTTPException(status_code=401, detail="Invalid username or password")
            session_manager.ensure_user_tenant_access(user, getattr(request.state, "tenant", None))
            if user.role != user_role.ADMIN:
                raise HTTPException(status_code=403, detail="Not authorized")

            access_token_expires = timedelta(minutes=30)
            access_token, role = await session_manager.get_instance().create_access_token(
                data={"sub": user.username}, expires_delta=access_token_expires)

            redirect = RedirectResponse(url="/admin/", status_code=HTTP_303_SEE_OTHER)
            set_access_cookie(redirect, access_token)
            return redirect
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    async def is_authenticated(self, request: Request) -> bool:
        if request.url.path == "/admin/login":
            return True

        token = token_from_request(request)
        if not token:
            return False

        try:
            session_mgr = session_manager.get_instance()
            user = await session_mgr.get_current_user(token)
            session_manager.ensure_user_tenant_access(user, getattr(request.state, "tenant", None))
            if not user:
                return False
            role = await session_mgr.get_current_role(token)
            if role != user_role.ADMIN.value:
                return False
            request.state.user = user
            return True
        except HTTPException:
            return False

    def get_admin_config(self, request: Request) -> AdminConfig:
        return AdminConfig(
            app_title="Admin Panel",
            logo_url="https://try.orionintelligence.org/assets/images/sidebar/search_nav_logo.png")

    def get_admin_user(self, request: Request) -> AdminUser:
        user = getattr(request.state, 'user', None)
        if not user:
            return AdminUser(username="anonymous", photo_url=None)
        return AdminUser(
            username=user.username,
            photo_url=user.profile_picture if hasattr(user, "profile_picture") else None)

    async def logout(self, request: Request, response: Response) -> Response:
        token = token_from_request(request)
        await session_manager.get_instance().invalidate_user_session(ptoken=token, tenant_id=getattr(request.state, "tenant", None))
        redirect = RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        redirect.delete_cookie(ACCESS_COOKIE, path="/")
        redirect.delete_cookie(ACCESS_COOKIE, path="/admin")
        clear_session_marker(redirect)
        return redirect


def setup_admin(engine: AIOEngine) -> Admin:
    admin = Admin(
        engine=engine, title="Admin Panel", auth_provider=TokenAuthProvider(), base_url="/admin/")

    admin.add_view(UserAdminView(db_user_account, engine=engine, icon="fa fa-user-circle"))
    admin.add_view(TenantAdminView(db_tenant_model, engine=engine, icon="fa fa-link"))
    admin.add_view(TenantKeyAdminView(db_keys, engine=engine, icon="fa fa-link"))
    admin.add_view(ModelView(db_system_model, icon="fa fa-cog", label="System Settings", name="system_settings"))
    admin.add_view(ModelView(db_url_data_model, icon="fa fa-link", label="URL Data", name="url_data"))
    admin.add_view(ModelView(db_alert_connector_model, icon="fa fa-plug", label="Alert Connectors", name="alert_connectors"))

    return admin
