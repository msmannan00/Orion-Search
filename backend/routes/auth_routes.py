from fastapi import APIRouter, Depends, Body, Response, Request, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from starlette.responses import JSONResponse

from configs.limiter_dependency import auth_rate_limit
from orion.services.redis_manager.redis_controller import redis_controller
from configs import auth_cookie as auth_cookie_config
from configs.auth_cookie import ACCESS_COOKIE, EXTENSION_COOKIE_PATH, clear_session_marker, set_access_cookie, token_from_request
from orion.api.interactive.auth_manager.auth_manager import auth_manager
from orion.api.interactive.extension_manager.extension_socket_manager import extension_socket_manager
from orion.api.interactive.payment_manager.model.payment_param_model import PaymentParamModel
from orion.api.interactive.payment_manager.payment_manager import PaymentManager
from orion.helper_manager.env_handler import env_handler
from orion.services.session_manager.session_manager import session_manager
from orion.api.interactive.signup_manager.model.signup_request_model import SignupRequest,SupportRequest
from orion.api.interactive.signup_manager.signup_manager import SignupManager
from orion.api.interactive.auth_manager.models.forgot_password_request import ForgotPasswordRequest, RecoveryRequest, ResetPassword

auth_router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
COOKIE_CIPHER = auth_cookie_config.COOKIE_CIPHER


def uses_cookie_auth(request: Request, cookie_only: bool) -> bool:
    if cookie_only:
        return True
    return (request.cookies.get(ACCESS_COOKIE) or "") != ""


def cookie_only_result(result: dict, cookie_auth: bool) -> dict:
    if not cookie_auth:
        return result
    return {key: value for key, value in result.items() if key not in {"access_token", "token_type"}}


@auth_router.post("/api/token")
async def token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), response: Response = None, cookie_only: bool = False, redis_store: redis_controller = Depends(redis_controller.getInstance)):
    client = "extension" if any(scope in {"extension", "orion_extension"} for scope in form_data.scopes) else "web"
    result = await auth_rate_limit(redis_store, form_data.username, lambda: auth_manager.login(form_data.username, form_data.password, client=client, tenant_id=getattr(request.state, "tenant", None)))

    access_token = result.get("access_token")
    twofa_required = result.get("twofa_required")
    cookie_auth = uses_cookie_auth(request, cookie_only)

    if access_token and not twofa_required and cookie_auth:
        set_access_cookie(response, access_token)

    return cookie_only_result(result, cookie_auth)


@auth_router.post("/api/token/demo")
async def token_demo(request: Request, response: Response = None, cookie_only: bool = False):
    DEMO_USERNAME = env_handler.get_instance().env("DEMO_USERNAME")
    DEMO_PASSWORD = env_handler.get_instance().env("DEMO_PASSWORD")

    result = await auth_manager.login(DEMO_USERNAME, DEMO_PASSWORD, True, tenant_id=getattr(request.state, "tenant", None))
    access_token = result.get("access_token")
    twofa_required = result.get("twofa_required")
    cookie_auth = uses_cookie_auth(request, cookie_only)

    if access_token and not twofa_required and cookie_auth:
        set_access_cookie(response, access_token)

    return cookie_only_result(result, cookie_auth)


@auth_router.post("/api/token/2fa/verify")
async def verify_2fa(request: Request, code: str = Body(..., embed=True), ptoken: str = Depends(oauth2_scheme), response: Response = None, cookie_only: bool = False):
    result = await session_manager.get_instance().verify_2fa_and_issue(ptoken, code, tenant_id=getattr(request.state, "tenant", None))
    access_token = result.get("access_token")
    cookie_auth = uses_cookie_auth(request, cookie_only)
    if access_token and cookie_auth:
        set_access_cookie(response, access_token)
    return cookie_only_result(result, cookie_auth)


@auth_router.post("/api/token/refresh")
async def refresh_token(request: Request, response: Response = None, cookie_only: bool = False):
    session_token = token_from_request(request)
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    result = await session_manager.get_instance().refresh_token(session_token,tenant_id=getattr(request.state, "tenant", None))
    access_token = result.get("access_token")
    cookie_auth = uses_cookie_auth(request, cookie_only)
    if access_token and cookie_auth:
        set_access_cookie(response, access_token)
    return cookie_only_result(result, cookie_auth)


@auth_router.post("/api/logout")
async def logout(request: Request):
    session_token = token_from_request(request)
    tenant_id = getattr(request.state, "tenant", None)
    session_mgr = session_manager.get_instance()
    try:
        current_user = await session_mgr.get_current_user(session_token, tenant_id=tenant_id)
    except HTTPException:
        current_user = None
    if current_user is not None:
        await extension_socket_manager.get_instance().disconnect(str(current_user.id))
    await session_mgr.invalidate_user_session(ptoken=session_token, tenant_id=tenant_id)
    resp = JSONResponse(content={"detail": "Logged out"})
    resp.delete_cookie(ACCESS_COOKIE, path="/")
    resp.delete_cookie(ACCESS_COOKIE, path="/admin")
    resp.delete_cookie(ACCESS_COOKIE, path=EXTENSION_COOKIE_PATH)
    clear_session_marker(resp)
    return resp


@auth_router.post("/api/signup")
async def signup(data: SignupRequest, request: Request):
    return await SignupManager.signup_user(data, tenant_id=request.state.tenant.id)


@auth_router.post("/api/signup/verificaion")
async def signup(data: SignupRequest):
    return await SignupManager.resend_verification_email(data)


@auth_router.post("/api/verify/{verification_token}")
async def verifyUser(verification_token: str):
    return await auth_manager.verify_user(verification_token)


@auth_router.post("/api/forgot")
async def forgotPassword(data: ForgotPasswordRequest, request: Request):
    return await auth_manager.forgot_password(data.email, getattr(request.state, "tenant", None))


@auth_router.post("/api/recover")
async def recover_account(data: RecoveryRequest, request: Request):
    return await auth_manager.recover_account(data.recovery_key, getattr(request.state, "tenant", None))


@auth_router.post("/api/subscription/request")
async def subscriptionRequest(request: PaymentParamModel):
    return await PaymentManager.get_instance().send_subscription_info(request)


@auth_router.post("/api/updatePassword")
async def updatePassword(data: ResetPassword, request: Request):
    return await auth_manager.update_password(data.token, data.password, getattr(request.state, "tenant", None))

@auth_router.post("/api/support")
async def support(data: SupportRequest):
    return await SignupManager.send_support_mail(data)
