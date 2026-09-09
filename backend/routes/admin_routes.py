from fastapi import APIRouter, HTTPException, Query, Request, Depends, UploadFile
from fastapi.responses import RedirectResponse

from configs.app_dependency import license_required, status_required, role_required, get_current_user
from orion.api.interactive.auth_manager.auth_manager import auth_manager
from orion.api.interactive.backup_manager.backup_manager import BackupManager
from orion.api.interactive.resource_manager.resource_manager import ResourceManager
from orion.api.server.config_manager.config_controller import config_controller
from orion.api.server.config_manager.model.config_data import config_data
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, UserStatus, user_role
from orion.services.mail_manager.mail_manager import mail_manager
from orion.services.mongo_manager.shared_model.db_backup_model import BackupType

admin_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE]))])

async def tenant_branding_editor(current_user=Depends(get_current_user)):
    if getattr(current_user, "role", "") == user_role.ADMIN.value:
        return current_user

    licenses = {
        license_name
        for license_name in (getattr(current_user, "licenses", None) or [])
    }
    if LicenseName.MAINTAINER.value in licenses:
        return current_user
    raise HTTPException(status_code=403, detail="Tenant branding permission required")


@admin_routes.get(
    "/admin/api/db_system_model/row-action",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def block_row_action(name: str = Query(...)):
    if name == "delete":
        raise HTTPException(status_code=403, detail="Deletion of system settings is not allowed")
    return {"message": f"Action '{name}' is not restricted"}


@admin_routes.post(
    "/admin/api/db_user_account/edit/{user_id}",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def custom_edit_api(user_id: str, request: Request):
    await auth_manager.edit_userStatus_and_sendMail_from_admin(user_id, request)
    return RedirectResponse(url="/admin/db_user_account/list", status_code=303)


@admin_routes.post(
    "/admin/api/db_user_account/edit/{user_id}/",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def custom_edit_api_trailing(user_id: str, request: Request):
    await auth_manager.edit_userStatus_and_sendMail_from_admin(user_id, request)
    return RedirectResponse(url="/admin/db_user_account/list", status_code=303)


@admin_routes.post(
    "/api/public/update",
)
async def update_public_config(request: Request, param: config_data, current_user=Depends(tenant_branding_editor)):
    is_admin = current_user.role == user_role.ADMIN.value
    return await config_controller.getInstance().update_public_config(param, is_admin, str(request.state.tenant.id), current_user)

@admin_routes.delete(
    "/api/system/image",
    include_in_schema=False,
)
async def delete_system_image(request: Request, key: str, current_user=Depends(tenant_branding_editor)):
    return await ResourceManager.get_instance().delete_system_image(current_user, key, tenant=request.state.tenant)

@admin_routes.put(
    "/api/system/image",
)
async def upload_system_image(request: Request, file: UploadFile, key: str = "logo_url", current_user=Depends(tenant_branding_editor)):
    return await config_controller.getInstance().uploadSystemResource(file, current_user, key, tenant_id=str(request.state.tenant.id))


@admin_routes.post(
    "/api/system/mail/verify",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
        Depends(license_required("maintainer", bypass_roles=[user_role.ADMIN]))],
)
async def verify_mail_configuration(current_user=Depends(get_current_user)):
    try:
        await mail_manager.get_instance().send_test_mail(tenant_id=str(current_user.tenant_uuid))
        return {"status": "working"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Mail configuration is not working") from exc


@admin_routes.get(
    "/api/admin/backups",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def list_backups():
    return await BackupManager.get_instance().list_backups()


@admin_routes.post(
    "/api/admin/backups/instant",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def create_instant_backup():
    return await BackupManager.get_instance().start_backup(BackupType.INSTANT)


@admin_routes.get(
    "/api/admin/backups/status",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def backup_job_status():
    return await BackupManager.get_instance().job_status()


@admin_routes.delete(
    "/api/admin/backups/{backup_id}",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def delete_backup(backup_id: str):
    return await BackupManager.get_instance().delete_backup(backup_id)


@admin_routes.post(
    "/api/admin/backups/{backup_id}/restore",
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def restore_backup(backup_id: str):
    return await BackupManager.get_instance().start_restore(backup_id)
