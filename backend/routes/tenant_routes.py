import asyncio
from datetime import datetime

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi import Depends, UploadFile

from configs.app_dependency import license_required, role_required, status_required, get_current_user
from orion.api.interactive.account_manager.account_manager import AccountManager
from orion.api.interactive.account_manager.chat_share_manager import ChatShareManager
from orion.api.interactive.account_manager.models.chat_history_model import CreateChatShareRequest
from orion.api.interactive.account_manager.models.chat_history_model import chat_history_model
from orion.api.interactive.account_manager.models.user_meta_model import user_meta_model
from orion.api.interactive.account_manager.models.user_param_model import user_param_model
from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.api.interactive.auditlog_manager.models.audit_log_param_model import audit_log_param_model
from orion.api.interactive.resource_manager.resource_manager import ResourceManager
from orion.api.interactive.system_log_manager.system_log_manager import SystemLogManager
from orion.api.interactive.tenant_manager.models.tenant_param_model import tenant_param_model
from orion.services.mongo_manager.shared_model.db_auth_models import user_role, UserStatus
from orion.services.mongo_manager.shared_model.db_tenant_model import TenantRequest
from orion.api.interactive.tenant_manager.tenant_manager import TenantManager
from orion.services.mongo_manager.shared_model.db_alert_model import AlertModel
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS
from orion.api.interactive.alert_manager.alert_manager import AlertManager
from orion.management.jobs.alert.alert_job import alert_job
from orion.api.interactive.account_manager.models.user_model import user_model
from orion.api.server.nexus_manager.nexus_chat_gateway import nexus_chat_gateway

tenant_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE]))])
SYSTEM_LOG_FLUSHED_AT_KEY = "SYSTEM_LOG_FLUSHED_AT"


@tenant_routes.post(
    "/api/get/tenant",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.DEMO, user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))], )
async def get_tenant(current_user=Depends(get_current_user)):
    return await TenantManager.get_instance().get_tenant(current_user)


@tenant_routes.post(
    "/api/update/tenants",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER, user_role.ADMIN])),
        Depends(status_required([UserStatus.ACTIVE])), Depends(license_required("maintainer")), ], )
async def update_tenant(data: TenantRequest, current_user=Depends(get_current_user)):
    return await TenantManager.get_instance().update_tenant(data, current_user)


@tenant_routes.post(
    "/api/users",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER, user_role.ADMIN]))], )
async def get_tenant_users(current_user=Depends(get_current_user)):
    return await AccountManager.get_instance().get_all_users(current_user)


@tenant_routes.post(
    "/api/tenants/get",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def get_all_tenants():
    return await TenantManager.get_instance().get_all_tenant()


@tenant_routes.delete(
    "/api/tenants/{tenant_id}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def delete_tenant(tenant_id: str, current_user=Depends(get_current_user)):
    return await TenantManager.get_instance().delete_tenant(tenant_id, current_user)


@tenant_routes.get(
    "/api/tenants/alerts/summary",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.ANALYST]))], )
async def get_visible_tenant_alerts_summary(current_user=Depends(get_current_user)):
    return await TenantManager.get_instance().get_visible_tenant_alerts_summary(current_user)


@tenant_routes.get(
    "/api/tenants/alerts/allowed-options",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def get_alert_allowed_tenant_options():
    return await TenantManager.get_instance().get_alert_allowed_tenant_options()


@tenant_routes.get(
    "/api/tenants/{tenant_id}/alerts",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.ANALYST]))], )
async def get_visible_tenant_category_alerts(tenant_id: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=20), alert_type: str | None = Query(None), paginate: bool = Query(False), current_user=Depends(get_current_user)):
    return await TenantManager.get_instance().get_visible_tenant_alerts(
        tenant_id,
        current_user,
        page=page,
        limit=limit,
        alert_type=alert_type,
        paginate=paginate,
    )


@tenant_routes.get(
    "/api/tenants/{tenant_id}/alerts/filter-options",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.ANALYST]))], )
async def get_visible_tenant_alert_filter_options(tenant_id: str, field: str = Query(...), q: str = Query(""), limit: int = Query(25, ge=1, le=50), alert_type: str | None = Query(None), current_user=Depends(get_current_user)):
    return await TenantManager.get_instance().get_visible_tenant_alert_filter_options(
        tenant_id,
        current_user,
        field=field,
        query=q,
        limit=limit,
        alert_type=alert_type,
    )


@tenant_routes.get(
    "/api/tenants/admin/{tenant_id}/alerts",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def get_admin_tenant_category_alerts(tenant_id: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=20), alert_type: str | None = Query(None), paginate: bool = Query(False)):
    return await TenantManager.get_instance().get_admin_tenant_alerts(
        tenant_id,
        page=page,
        limit=limit,
        alert_type=alert_type,
        paginate=paginate,
    )


@tenant_routes.get(
    "/api/tenants/admin/{tenant_id}/alerts/filter-options",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def get_admin_tenant_alert_filter_options(tenant_id: str, field: str = Query(...), q: str = Query(""), limit: int = Query(25, ge=1, le=50), alert_type: str | None = Query(None)):
    return await TenantManager.get_instance().get_admin_tenant_alert_filter_options(
        tenant_id,
        field=field,
        query=q,
        limit=limit,
        alert_type=alert_type,
    )


@tenant_routes.post(
    "/api/update/user",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER]))], )
async def update_user(user: tenant_param_model, current_user=Depends(get_current_user)):
    return await AccountManager.get_instance().update_user(user, current_user)


@tenant_routes.post(
    "/api/update/current/user",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))], )
async def update_user(user: user_meta_model, current_user=Depends(get_current_user)):
    return await AccountManager.get_instance().update_current_user(user, current_user)


@tenant_routes.post(
    "/api/recovery-key",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))], )
async def generate_recovery_key(current_password: str = Body(..., embed=True), current_user=Depends(get_current_user)):
    return await AccountManager.get_instance().generate_recovery_key(current_user, current_password)


@tenant_routes.post(
    "/api/get/current/user/chat-history",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))], )
async def get_current_user_chat_history(data: dict | None = Body(default=None), current_user=Depends(get_current_user)):
    return await nexus_chat_gateway.getInstance().get_chat_history(data or {}, current_user)


@tenant_routes.post(
    "/api/update/current/user/chat-history",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))], )
async def update_current_user_chat_history(data: chat_history_model, current_user=Depends(get_current_user)):
    return await nexus_chat_gateway.getInstance().update_chat_history(data.model_dump(), current_user)


@tenant_routes.post(
    "/api/profile/chat-shares",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))], )
async def create_chat_share(data: CreateChatShareRequest, current_user=Depends(get_current_user)):
    return await ChatShareManager.get_instance().create_chat_share(data, current_user)


@tenant_routes.delete(
    "/api/tenant/image",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER]))], )
async def update_user(current_user=Depends(get_current_user)):
    return await ResourceManager.get_instance().deleteTenantImage(current_user)


@tenant_routes.put(
    "/api/tenant/image",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER]))], )
async def upload_profile_image(file: UploadFile, current_user=Depends(get_current_user)):
    return await ResourceManager.get_instance().uploadTenantImage(file, current_user)

@tenant_routes.delete(
    "/api/user/image",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))], )
async def update_user(current_user=Depends(get_current_user)):
    return await ResourceManager.get_instance().delete_user_image(current_user)


@tenant_routes.put(
    "/api/user/image",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))], )
async def upload_profile_image(file: UploadFile, current_user=Depends(get_current_user)):
    return await ResourceManager.get_instance().update_user_image(file, current_user)


@tenant_routes.post(
    "/api/delete/user",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER]))], )
async def delete_user(user: user_param_model, current_user=Depends(get_current_user)):
    return await AccountManager.get_instance().delete_user(user, current_user)


@tenant_routes.post(
    "/api/tenant/create/user",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER, user_role.ADMIN])),
        Depends(license_required("maintainer")), ], )
async def create_tenant_user(data: user_model, current_user=Depends(get_current_user)):
    return await TenantManager.get_instance().create_tenant_user(data, current_user)


@tenant_routes.post(
    "/api/audit/logs",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.DEMO])),
        Depends(license_required("maintainer"))], )
async def get_audit_logs(param: audit_log_param_model = Body(...), current_user=Depends(get_current_user)):
    return await AuditLogManager.get_instance().get(param, current_user)


@tenant_routes.delete(
    "/api/audit/{log_id}/delete",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def delete_audit_log(log_id: str, _current_user=Depends(get_current_user)):
    return {"success": await AuditLogManager.get_instance().delete(log_id)}


@tenant_routes.get(
    "/api/profile/system-logs",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def get_system_logs(log_type: str | None = Query(None), date: str | None = Query(None), date_range: str | None = Query(None), page: int = Query(1), limit: int = Query(200)):
    try:
        flushed_at = await redis_controller.getInstance().invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [SYSTEM_LOG_FLUSHED_AT_KEY, None, None])
        return SystemLogManager.get_instance().get(log_type=log_type, date=date, date_range=date_range, page=page, limit=limit, flushed_at=flushed_at)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@tenant_routes.delete(
    "/api/profile/system-logs",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def flush_system_logs():
    result = SystemLogManager.get_instance().flush()
    await redis_controller.getInstance().invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [SYSTEM_LOG_FLUSHED_AT_KEY, datetime.now().replace(microsecond=0).isoformat(), None])
    return result


@tenant_routes.delete(
    "/api/profile/system-logs/{log_date}/{file_name:path}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))], )
async def delete_system_log(log_date: str, file_name: str):
    if not SystemLogManager.get_instance().delete(log_date, file_name):
        raise HTTPException(status_code=404, detail="Log file not found")
    return {"success": True}


@tenant_routes.get(
    "/api/get/tenant/alert/summary",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(status_required([UserStatus.ACTIVE])), ], )
async def get_node(current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().get_alert_summary(str(current_user.tenant_uuid))

@tenant_routes.post(
    "/api/get/tenant/node",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(status_required([UserStatus.ACTIVE])), ], )
async def get_node(current_user=Depends(get_current_user)):
    return await AccountManager.get_instance().get_node(current_user)


@tenant_routes.post(
    "/api/alert/add",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), ], )
async def add_custom_alert(data: AlertModel, current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().add_custom_alert(data, current_user)


@tenant_routes.post(
    "/api/alert/seen",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), ], )
async def set_alerts_seen(data: list[AlertModel], current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().set_alert_seen(data, current_user)


@tenant_routes.post(
    "/api/alert/delete",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), ], )
async def delete_alert(alert_id: str = Body(..., description="Unique id identifier of the alert to delete."), current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().delete_alert(alert_id, current_user)


@tenant_routes.post(
    "/api/alert/update",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), ], )
async def update_alert(data: AlertModel, current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().update_alert(data, current_user)


@tenant_routes.get(
    "/api/profile/alerts",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), ], )
async def get_user_alerts(current_user=Depends(get_current_user), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=20), alert_type: str | None = Query(None), paginate: bool = Query(False), compact: bool = Query(False), unseen_only: bool = Query(False), include_counts: bool = Query(False)):
    return await AlertManager.getInstance().getAllAlerts(
        current_user,
        page=page,
        limit=limit,
        alert_type=alert_type,
        paginate=paginate,
        compact=compact,
        unseen_only=unseen_only,
        include_counts=include_counts,
    )


@tenant_routes.get(
    "/api/profile/alerts/filter-options",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), ], )
async def get_user_alert_filter_options(current_user=Depends(get_current_user), field: str = Query(...), q: str = Query(""), limit: int = Query(25, ge=1, le=50), alert_type: str | None = Query(None)):
    return await AlertManager.getInstance().get_alert_filter_options(
        current_user,
        field=field,
        query=q,
        limit=limit,
        alert_type=alert_type,
    )


@tenant_routes.post(
    "/api/profile/alert/scan",
    status_code=202,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])),
        Depends(license_required("maintainer")), ], )
async def run_user_ioc_alerts(current_user=Depends(get_current_user)):
    scan_status = await AlertManager.getInstance().get_scan_status(current_user)
    if scan_status.get("scan_running", False):
        raise HTTPException(
            status_code=202, detail="Scan is still processing")

    asyncio.create_task(
        alert_job.get_instance().run_all_categories_for_api(current_user))
    return {"started": True}


@tenant_routes.post(
    "/api/profile/alert/scan/cancel",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])),
        Depends(license_required("maintainer")), ], )
async def cancel_user_ioc_alerts(current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().set_scan_running(current_user.tenant_uuid, False,True)


@tenant_routes.post(
    "/api/profile/alerts/delete/all",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])),
        Depends(license_required("maintainer")), ], )
async def delete_all_alerts(current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().delete_all_alerts(current_user)


@tenant_routes.post(
    "/api/profile/alerts/delete/{_type}",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), Depends(license_required("maintainer")), ], )
async def delete_typed_alerts(_type: str, current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().delete_alerts_by_type(current_user, _type)


@tenant_routes.post(
    "/api/profile/alert/scan/status",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.MEMBER])), Depends(status_required([UserStatus.ACTIVE])), ], )
async def get_alert_scan_status(current_user=Depends(get_current_user)):
    return await AlertManager.getInstance().get_scan_status(current_user)
