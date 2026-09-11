from fastapi import HTTPException
from fastapi import Body, Depends, APIRouter
from fastapi import File
from fastapi import UploadFile
from fastapi import Query
from typing import List
from configs.app_dependency import license_required, role_required, get_current_user, status_required, case_management_required
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, user_role
from orion.api.interactive.case_manager.case_communication_manager import CaseCommunicationManager
from orion.api.interactive.case_manager.case_manager import CaseManager
from orion.api.interactive.case_manager.case_share_manager import CaseShareManager
from orion.api.interactive.case_manager.models.case_models import AssignCaseAnalystRequest, CaseCommunicationModel, CreateCaseRequest, UpdateCaseStatusRequest
from orion.api.interactive.case_manager.models.case_models import CreateCaseShareRequest
from orion.api.interactive.case_manager.models.case_models import UpdateCaseRequest
from orion.api.interactive.case_manager.status_board_config import CaseStatusBoardConfig, StatusBoardConfigManager


case_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE])), Depends(case_management_required)])
@case_routes.get(
    "/api/profile/cases",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    ],
)
async def get_cases(archived: bool = Query(False), current_user=Depends(get_current_user)):
    if archived and getattr(current_user.role, "value", current_user.role) == user_role.ANALYST.value:
        raise HTTPException(status_code=403, detail="Analysts cannot view archived cases")

    return await CaseManager.get_instance().get_cases(current_user, archived)


@case_routes.get(
    "/api/profile/cases/status-board-config",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))]
)
async def get_status_board_config(current_user=Depends(get_current_user)):
    return await StatusBoardConfigManager.get_effective_config(current_user)


@case_routes.put(
    "/api/profile/cases/status-board-config/update",
    status_code=200,
    dependencies=[Depends(role_required([user_role.MEMBER, user_role.ADMIN])), Depends(license_required("maintainer"))]
)
async def update_tenant_status_board_config(payload: CaseStatusBoardConfig = Body(...), current_user=Depends(get_current_user)):
    return await StatusBoardConfigManager.save_tenant_config(str(current_user.tenant_uuid), payload)


@case_routes.post(
    "/api/profile/cases",
    status_code=201,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def create_case(payload: CreateCaseRequest = Body(...), current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().create_case(payload, current_user)


@case_routes.get(
    "/api/profile/cases/next-id",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def get_next_case_id(current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().get_next_case_id(current_user)


@case_routes.get(
    "/api/profile/cases/analysts",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def get_case_analysts(current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().get_case_analysts(current_user)

@case_routes.put(
    "/api/profile/cases/{case_id}/assign-analyst",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def assign_case_analyst(
    case_id: str,
    payload: AssignCaseAnalystRequest = Body(...),
    current_user=Depends(get_current_user),
):
    return await CaseManager.get_instance().assign_case_analyst(case_id, payload, current_user)


@case_routes.post(
    "/api/profile/cases/{case_id}/shares",
    status_code=201,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def create_case_share(case_id: str, payload: CreateCaseShareRequest = Body(...), current_user=Depends(get_current_user)):
    return await CaseShareManager.get_instance().create_case_share(case_id, payload, current_user)


@case_routes.post(
    "/api/profile/cases/{case_id}/artifacts/{artifact_id}/files/{file_id}/verify",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def verify_artifact_file(case_id: str, artifact_id: str, file_id: str, current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().verify_artifact_file(case_id, artifact_id, file_id, current_user)


@case_routes.post(
    "/api/profile/cases/{case_id}/communications",
    status_code=201,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def add_case_communication(case_id: str, payload: CaseCommunicationModel = Body(...), current_user=Depends(get_current_user)):
    return await CaseCommunicationManager.get_instance().add_communication(case_id, payload, current_user)


@case_routes.put(
    "/api/profile/cases/{case_id}/communications/{communication_id}",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def update_case_communication(case_id: str, communication_id: str, payload: CaseCommunicationModel = Body(...), current_user=Depends(get_current_user)):
    return await CaseCommunicationManager.get_instance().update_communication(case_id, communication_id, payload, current_user)


@case_routes.delete(
    "/api/profile/cases/{case_id}/communications/{communication_id}",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def delete_case_communication(case_id: str, communication_id: str, current_user=Depends(get_current_user)):
    return await CaseCommunicationManager.get_instance().delete_communication(case_id, communication_id, current_user)


@case_routes.post(
    "/api/profile/cases/{case_id}/communications/{communication_id}/open",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    ],
)
async def open_case_communication(case_id: str, communication_id: str, current_user=Depends(get_current_user)):
    return await CaseCommunicationManager.get_instance().open_communication(case_id, communication_id, current_user)


@case_routes.post(
    "/api/profile/cases/{case_id}/communications/{communication_id}/session",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    ],
)
async def save_case_communication_session(case_id: str, communication_id: str, current_user=Depends(get_current_user)):
    return await CaseCommunicationManager.get_instance().save_communication_session(case_id, communication_id, current_user)


@case_routes.delete(
    "/api/profile/cases/{case_id}/shares",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def revoke_case_shares(case_id: str, current_user=Depends(get_current_user)):
    return await CaseShareManager.get_instance().revoke_case_shares(case_id, current_user)


@case_routes.get(
    "/api/profile/cases/artifact-reports",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    ],
)
async def get_artifact_reports(source: str = Query(...), q: str = Query(""), limit: int = Query(10, ge=1, le=50), current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().get_artifact_reports(source, current_user, q=q, limit=limit)

@case_routes.put(
    "/api/profile/cases/{case_id}/archive",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def archive_case(case_id: str, current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().archive_case(case_id, current_user)

@case_routes.put(
    "/api/profile/cases/{case_id}/unarchive",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN])),
    ],
)
async def unarchive_case(case_id: str, current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().unarchive_case(case_id, current_user)

@case_routes.get(
    "/api/profile/cases/{case_id}",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    ],
)
async def get_case(case_id: str, current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().get_case_by_id(case_id, current_user)


@case_routes.put(
    "/api/profile/cases/{case_id}",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    ],
)
async def update_case(case_id: str, payload: UpdateCaseRequest = Body(...), current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().update_case(case_id, payload, current_user)


@case_routes.post(
    "/api/profile/cases/{case_id}/artifacts/{artifact_id}/files",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def upload_artifact_files(
    case_id: str,
    artifact_id: str,
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):
    return await CaseManager.get_instance().upload_artifact_files(
        case_id, artifact_id, files, current_user
    )


@case_routes.get(
    "/api/profile/cases/{case_id}/artifacts/{artifact_id}/files/{file_id}/download",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    ],
)
async def download_artifact_file(
    case_id: str,
    artifact_id: str,
    file_id: str,
    current_user=Depends(get_current_user),
):
    return await CaseManager.get_instance().get_artifact_file_response(
        case_id, artifact_id, file_id, current_user, download=True
    )


@case_routes.delete(
    "/api/profile/cases/{case_id}/artifacts/{artifact_id}/files/{file_id}",
    status_code=200,
    tags=["Case Management"],
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def delete_artifact_file(
    case_id: str,
    artifact_id: str,
    file_id: str,
    current_user=Depends(get_current_user),
):
    return await CaseManager.get_instance().delete_artifact_file_from_case(
        case_id, artifact_id, file_id, current_user
    )


@case_routes.delete(
    "/api/profile/cases/{case_id}",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def delete_case(case_id: str, current_user=Depends(get_current_user)):
    return await CaseManager.get_instance().delete_case(case_id, current_user)


@case_routes.put(
    "/api/profile/cases/{case_id}/status",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER])),
    ],
)
async def update_case_status(
    case_id: str,
    payload: UpdateCaseStatusRequest = Body(...),
    current_user=Depends(get_current_user),
):
    return await CaseManager.get_instance().update_case_status(case_id, payload, current_user)
