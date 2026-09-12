from fastapi import APIRouter, Body, Depends, Request

from configs.app_dependency import get_current_user, license_required, role_required, status_required
from orion.api.interactive.social_manager.social_models.search_social_param_model import (
    SocialFollowersRequest,
    SocialForumRequest,
    SocialGraphDataRequest,
    SocialMetadataRequest,
    SocialPostsRequest,
    SocialOnlineImages,
    SocialProfileRequest,
    SocialReconRequest,
    SocialShortsRequest,
    SocialVideosRequest,
)
from orion.api.interactive.social_manager.social_manager import social_manager
from orion.api.interactive.social_manager.social_scanner import social_scanner
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, user_role

social_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE]))])


@social_routes.post(
    "/api/social/recon",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_email(request: Request, param: SocialReconRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_scanner.get_instance().start_recon(current_user, request, param.query)


@social_routes.post(
    "/api/social/recon/status",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def social_scan_status(request: Request, param: SocialReconRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_scanner.get_instance().status(current_user, request, param.query)


@social_routes.post(
    "/api/social/recon/cancel",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def cancel_social_scan(current_user=Depends(get_current_user)):
    return await social_scanner.get_instance().cancel(current_user)


@social_routes.post(
    "/api/social/forum",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_social_forum_profiles(param: SocialForumRequest = Body(...)):
    return await social_manager.getInstance().search_forum_profiles(param)


@social_routes.post(
    "/api/social/phone/recon",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_phone_recon(request: Request, param: SocialReconRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_phone_recon(param, current_user, request)


@social_routes.post(
    "/api/social/profile",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_profile(request: Request, param: SocialProfileRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_profile(param, current_user, request)


@social_routes.post(
    "/api/social/online/images",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_online_images(request: Request, param: SocialOnlineImages = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_online_images(param, current_user, request)


@social_routes.post(
    "/api/social/recon/image",
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("scanning")),
    ],
)
async def search_dynamic_image(request: Request, payload: dict = Body(...), current_user=Depends(get_current_user)):
    image_base64 = (payload or {}).get("image_base64")
    if not image_base64:
        return {"status": "error", "message": "image_base64_required"}
    return await social_scanner.get_instance().start_image_recon(current_user, request, image_base64, (payload or {}).get("profile_username"))


@social_routes.post(
    "/api/social/followers",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_followers(request: Request, param: SocialFollowersRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_followers(param, current_user, request)


@social_routes.post(
    "/api/social/posts",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_posts(request: Request, param: SocialPostsRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_posts(param, current_user, request)


@social_routes.post(
    "/api/social/videos",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_videos(request: Request, param: SocialVideosRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_videos(param, current_user, request)


@social_routes.post(
    "/api/social/shorts",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_shorts(request: Request, param: SocialShortsRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_shorts(param, current_user, request)


@social_routes.post(
    "/api/social/entity",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_dynamic_entity(request: Request, param: SocialProfileRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_entity(param, current_user, request)


@social_routes.post(
    "/api/social/metadata",
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning")), ], )
async def search_social_metadata(request: Request, param: SocialMetadataRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_metadata(param, current_user, request)


@social_routes.get(
    "/api/social/extensions/version",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))])
async def social_extension_version():
    return await social_manager.getInstance().extension_version()


@social_routes.post(
    "/api/social/connections",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced", "social_mapper"]))])
async def search_social_connections(data: dict = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().search_connections(
        str(current_user.id),
        (data or {}).get("profile_username") or (data or {}).get("username") or "",
        (data or {}).get("platform") or "",
        (data or {}).get("query") or "",
        (data or {}).get("limit") or 500,
        (data or {}).get("post_url") or "",
    )


@social_routes.post(
    "/api/social/data",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced"]))])
async def append_social_data(data: dict = Body(...), current_user=Depends(get_current_user)):
    profile_username = (data or {}).get("profile_username") or (data or {}).get("root_username") or (data or {}).get("username") or ""
    profiles = (data or {}).get("profiles") or []
    config = (data or {}).get("config")
    replace = bool((data or {}).get("replace"))
    return await social_manager.getInstance().append_social_profiles(str(current_user.id), profile_username, profiles, config=config, replace=replace)


@social_routes.get(
    "/api/social/data",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced", "social_mapper"]))])
async def get_social_data(current_user=Depends(get_current_user)):
    return await social_manager.getInstance().get_social_profiles(str(current_user.id))


@social_routes.post(
    "/api/social/graph/data",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced", "social_mapper"]))])
async def get_social_graph_data(param: SocialGraphDataRequest = Body(...), current_user=Depends(get_current_user)):
    return await social_manager.getInstance().get_graph_data(str(current_user.id), param.usernames, param.priority, param.limit)


@social_routes.get(
    "/api/social/data/{profile_username}",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced", "social_mapper"]))])
async def get_social_profiles(profile_username: str, current_user=Depends(get_current_user)):
    return await social_manager.getInstance().get_social_profiles(str(current_user.id), profile_username)


@social_routes.delete(
    "/api/social/data/{profile_username:path}",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced"]))])
async def delete_social_profiles(profile_username: str, current_user=Depends(get_current_user)):
    return await social_manager.getInstance().delete_social_profiles(str(current_user.id), profile_username)


@social_routes.post(
    "/api/social/graph/prune",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced"]))])
async def prune_social_graph(current_user=Depends(get_current_user)):
    return await social_manager.getInstance().prune_dangling_graph_roots(str(current_user.id))

