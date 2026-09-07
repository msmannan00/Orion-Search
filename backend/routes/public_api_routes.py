from fastapi import APIRouter, Body, Depends, Query
from fastapi import Request, HTTPException
from orion.api.interactive.account_manager.chat_share_manager import ChatShareManager
from orion.api.interactive.case_manager.case_share_manager import CaseShareManager
from orion.api.interactive.resource_manager.resource_manager import ResourceManager
from orion.api.interactive.search_manager.search_data_model.dump.search_credential_param_model import search_credential_param_model
from orion.api.interactive.search_manager.search_model import search_model
from orion.api.server.config_manager.config_controller import config_controller
from configs.app_dependency import _enum_value
from configs.auth_cookie import token_from_request
from orion.helper_manager.env_handler import env_handler
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, user_role
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS, REDIS_KEYS
from orion.services.session_manager.session_manager import session_manager

public_routes = APIRouter()
STEALERLOG_SEARCH_LIMIT = 5
STEALERLOG_SEARCH_TTL_SECONDS = 86400
AUTOMATION_TASK_SIGNAL_TTL_SECONDS = 900


def cookie_required(request: Request):
    if not request.cookies.get("access_token"):
        raise HTTPException(status_code=401, detail="Missing auth cookie")


def internal_token_required(request: Request):
    expected = env_handler.get_instance().env("ORION_SOCIAL_INTERNAL_TOKEN")
    provided = request.headers.get("x-orion-internal-token", "")
    if not expected or provided != expected:
        raise HTTPException(status_code=401, detail="Missing or invalid internal token")


async def _request_has_admin_account(request: Request) -> bool:
    token = token_from_request(request)
    if not token:
        return False
    try:
        user = await session_manager.get_instance().get_current_user(token)
    except HTTPException:
        return False
    return (
        _enum_value(getattr(user, "role", None)) == user_role.ADMIN.value
        and _enum_value(getattr(user, "status", None)) == UserStatus.ACTIVE.value
    )


@public_routes.get(
    "/api/public",
    dependencies=[],
)
async def get_public_config(request: Request):
    config = await config_controller.getInstance().get_system_info(
        include_email_config=await _request_has_admin_account(request),
        tenant_id=str(request.state.tenant.id),
    )
    config.settings["app_url"] = env_handler.get_instance().env("APP_URL", "")
    return config


@public_routes.get("/api/s/static/tenant/{id}", include_in_schema=False, dependencies=[Depends(cookie_required)])
async def get_tenant_resource(id: str):
    return await ResourceManager.get_instance().get_tenant_image(id)


@public_routes.get("/api/s/static/user/{id}", include_in_schema=False, dependencies=[Depends(cookie_required)])
async def get_user_resource(id: str):
    return await ResourceManager.get_instance().get_user_image(id)


@public_routes.get("/api/s/static/favicon", include_in_schema=False)
async def get_favicon_resource(request: Request):
    return await ResourceManager.get_instance().get_favicon(request.state.tenant)

@public_routes.get("/api/s/static/system/{id}", include_in_schema=False)
async def get_system_resource(request: Request, id: str):
    return await ResourceManager.get_instance().get_system_image(id, request.state.tenant)


@public_routes.get("/api/public/case-shares/{share_id}", include_in_schema=False)
async def open_case_share(share_id: str, token: str = Query(...)):
    return await CaseShareManager.get_instance().open_case_share(share_id, token)

@public_routes.get("/api/public/chat-shares/{share_id}", include_in_schema=False)
async def open_chat_share(share_id: str, token: str = Query(...)):
    return await ChatShareManager.get_instance().open_chat_share(share_id, token)

@public_routes.get("/robots.txt", include_in_schema=False)
async def robots_txt():
    return await ResourceManager.get_instance().get_robots_txt()


@public_routes.post(
    "/api/social/automation/callback",
    include_in_schema=False,
    dependencies=[Depends(internal_token_required)],
)
async def automation_callback(task_id: str = None, payload: dict = Body(...)):
    from orion.services.log_manager.log_controller import log
    log.g().i(f"Automation Callback Received: {payload.get('status')} for task {task_id}")
    log.g().i(f"Automation Output: {payload.get('output')}")
    if payload.get("error"):
        log.g().e(f"Automation Error: {payload.get('error')}")

    result = payload.get("result")
    if result:
        from orion.api.interactive.profile_manager.model.models import SocialAutomationCallbackRequest
        from orion.api.interactive.profile_manager.profile_manager import ProfileManager
        try:
            data = SocialAutomationCallbackRequest.model_validate(result)
            log.g().i(f"Automation Result: {data.result_type} for profile {data.profile_id}")
            await ProfileManager.get_instance().store_automation_result(data)
        except Exception as exc:
            log.g().e(f"Failed to store automation result for task {task_id}: {exc}")

    if task_id:
        await redis_controller.getInstance().invoke_trigger(REDIS_COMMANDS.S_SET_INT, [f"{REDIS_KEYS.SOCIAL_AUTOMATION_TASK}:{task_id}", 1, AUTOMATION_TASK_SIGNAL_TTL_SECONDS])

    return {"status": "success"}


def _request_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


@public_routes.get(
    "/api/search/stealerlogs",
    include_in_schema=False,
    status_code=200,
)
async def search_stealerlog(request: Request, q: str = Query(...)):
    redis_key = f"search:stealerlogs:ip:{_request_ip(request)}"
    redis_instance = redis_controller.getInstance()
    search_count = await redis_instance.invoke_trigger(
        REDIS_COMMANDS.S_GET_INT,
        [redis_key, 0, STEALERLOG_SEARCH_TTL_SECONDS]
    )
    if int(search_count or 0) >= STEALERLOG_SEARCH_LIMIT:
        raise HTTPException(status_code=429, detail="Search limit reached for this IP")
    await redis_instance.invoke_trigger(
        REDIS_COMMANDS.S_SET_INT,
        [redis_key, int(search_count or 0) + 1, STEALERLOG_SEARCH_TTL_SECONDS]
    )

    param = search_credential_param_model(q=q)
    try:
        return await search_model.getInstance().search_stealerlogs_persona_breach(param)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to search stealer logs") from exc
