from fastapi import APIRouter, Body, Depends

from configs.app_dependency import get_current_user, license_required, role_required, status_required
from orion.api.interactive.profile_manager.model.models import (
    SocialPersonaCreateRequest,
    SocialPersonaListResponse,
    SocialPersonaResponse,
    SocialPersonaUpdateRequest,
    SocialProfileAssignmentRequest,
    SocialProfileAssignmentResponse,
    SocialProfileCallbackRequest,
    SocialProfileCallbackResponse,
    SocialProfileConnectRequest,
    SocialProfileListResponse,
    SocialProfileResponse,
    SocialProfileResultsResponse,
    SocialProfileUpdateRequest,
)
from orion.api.interactive.profile_manager.profile_manager import ProfileManager
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, user_role

manage_profiles_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE]))])
route_permissions = [
    Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    Depends(license_required("module:social_mapper", bypass_licenses=["maintainer"], bypass_roles=[user_role.ADMIN])),
]


@manage_profiles_routes.post("/api/manage-profiles/platforms", include_in_schema=False)
async def manage_profiles_platforms(current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().list_platforms(current_user)


@manage_profiles_routes.post("/api/manage-profiles/session", include_in_schema=False)
async def manage_profiles_session(payload: dict = Body(default={}), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().capture_session(current_user, str(payload.get("platform") or ""), str(payload.get("url") or ""), str(payload.get("session_id") or ""))


@manage_profiles_routes.post("/api/manage-profiles/sessions", include_in_schema=False)
async def manage_profiles_sessions(current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().list_sessions(current_user)


@manage_profiles_routes.delete("/api/manage-profiles/session/{platform}/{session_id}", include_in_schema=False)
async def manage_profiles_session_delete(platform: str, session_id: str, current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().delete_session(current_user, platform, session_id)

@manage_profiles_routes.post("/api/manage-profiles/session/verify", include_in_schema=False)
async def manage_profiles_session_verify(payload: dict = Body(default={}), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().verify_session(current_user, str(payload.get("platform") or ""), str(payload.get("url") or ""), str(payload.get("session_id") or ""))



@manage_profiles_routes.get("/api/manage-profiles/personas", response_model=SocialPersonaListResponse, dependencies=route_permissions)
async def get_personas(current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().get_personas(current_user)


@manage_profiles_routes.post("/api/manage-profiles/personas", response_model=SocialPersonaResponse, dependencies=route_permissions)
async def create_persona(data: SocialPersonaCreateRequest = Body(...), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().create_persona(current_user, data)


@manage_profiles_routes.put("/api/manage-profiles/personas/{persona_id}", response_model=SocialPersonaResponse, dependencies=route_permissions)
async def update_persona(persona_id: str, data: SocialPersonaUpdateRequest = Body(...), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().update_persona(current_user, persona_id, data)


@manage_profiles_routes.delete("/api/manage-profiles/personas/{persona_id}", dependencies=route_permissions)
async def delete_persona(persona_id: str, current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().delete_persona(current_user, persona_id)


@manage_profiles_routes.get("/api/manage-profiles/profiles", response_model=SocialProfileListResponse, dependencies=route_permissions)
async def get_profiles(current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().get_profiles(current_user)


@manage_profiles_routes.post("/api/manage-profiles/profiles", response_model=SocialProfileResponse, dependencies=route_permissions)
async def connect_profile(data: SocialProfileConnectRequest = Body(...), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().connect_profile(current_user, data)


@manage_profiles_routes.put("/api/manage-profiles/profiles/{profile_id}", response_model=SocialProfileResponse, dependencies=route_permissions)
async def update_profile(profile_id: str, data: SocialProfileUpdateRequest = Body(...), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().update_profile(current_user, profile_id, data)


@manage_profiles_routes.delete("/api/manage-profiles/profiles/{profile_id}", dependencies=route_permissions)
async def delete_profile(profile_id: str, current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().delete_profile(current_user, profile_id)


@manage_profiles_routes.post("/api/manage-profiles/assignments", response_model=SocialProfileAssignmentResponse, dependencies=route_permissions)
async def assign_profile(data: SocialProfileAssignmentRequest = Body(...), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().assign_profile(current_user, data)


@manage_profiles_routes.delete("/api/manage-profiles/assignments/{profile_id}", response_model=SocialProfileAssignmentResponse, dependencies=route_permissions)
async def remove_assignment(profile_id: str, current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().remove_assignment(current_user, profile_id)


@manage_profiles_routes.post("/api/manage-profiles/callback", response_model=SocialProfileCallbackResponse, dependencies=route_permissions)
async def social_profile_callback(data: SocialProfileCallbackRequest = Body(...), current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().callback(current_user, data)


@manage_profiles_routes.get("/api/manage-profiles/results/{profile_id}", response_model=SocialProfileResultsResponse, dependencies=route_permissions)
async def get_profile_results(profile_id: str, current_user=Depends(get_current_user)):
    return await ProfileManager.get_instance().get_profile_results(current_user, profile_id)
