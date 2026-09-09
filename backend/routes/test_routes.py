from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, Request, UploadFile
from configs.app_dependency import get_current_user, license_required, role_required
from configs.limiter_dependency import limiter_dependency
from orion.api.interactive.account_manager.account_manager import AccountManager
from orion.api.interactive.auth_manager.auth_manager import auth_manager
from orion.api.interactive.auth_manager.models.forgot_password_request import ForgotPasswordRequest
from orion.api.interactive.search_manager.search_data_model.dynamic.search_dynamic_param_model import search_dynamic_crack_model, search_dynamic_onion_search, search_dynamic_param_model, search_dynamic_social_model
from orion.api.server.crawl_manager.class_model.domain_scan_request_model import DomainScanRequest, UrlVulnerabilityScanRequest
from orion.api.server.crawl_manager.class_model.ip_scan_request_model import GeoCameraDetectRangesRequest, GeoCameraDetectRequest, NetIntelDeepScanRequest, ResolveIPRequest
from orion.management.managers.service_manager import service_manager
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import user_role
from orion.services.mongo_manager.shared_model.db_backup_model import BackupType, db_backup_model
from orion.services.mongo_manager.shared_model.db_takedown_request_model import TakedownCreateRequest
from routes.helper.route_test_helper import TestRouteHelper


SCAN_ROLES = [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]
SCAN_DEPS = [Depends(role_required(SCAN_ROLES)), Depends(license_required("scanning"))]
SCAN_LIMITED_DEPS = [
    Depends(role_required(SCAN_ROLES)),
    Depends(limiter_dependency),
    Depends(license_required("scanning")),
]
ANALYST_DEPS = [Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST]))]
ADMIN_DEPS = [Depends(role_required([user_role.ADMIN]))]
ANALYST_SCAN_DEPS = [
    Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
    Depends(license_required("scanning")),
]


test_routes = APIRouter(
    dependencies=[
        Depends(TestRouteHelper.require_testing_enabled),
    ]
)


@test_routes.get("/api/test/ready", include_in_schema=False)
async def test_ready():
    if not service_manager.get_instance().check_status():
        raise HTTPException(status_code=503, detail="Test services are not ready")
    return {"ready": True}


@test_routes.post(
    "/api/admin/backups/{backup_id}/restore",
    include_in_schema=False,
    dependencies=ADMIN_DEPS,
)
async def test_restore_backup(backup_id: str):
    return {"status": "restored", "filename": backup_id}


@test_routes.post(
    "/api/admin/backups/instant",
    include_in_schema=False,
    dependencies=ADMIN_DEPS,
)
async def test_create_instant_backup():
    created_at = datetime.now(timezone.utc)
    backup = db_backup_model(
        filename=created_at.strftime("%Y_%m_%d_%H_%M_%S_%f"),
        backup_type=BackupType.INSTANT,
        created_at=created_at,
    )
    await mongo_controller.get_instance().get_engine().save(backup)
    return {
        "id": str(backup.id),
        "filename": backup.filename,
        "backup_type": backup.backup_type.value,
        "created_at": backup.created_at,
    }


@test_routes.post(
    "/api/scan-jobs/{scan_id}/poll",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_poll_scan_job(scan_id: str, current_user=Depends(get_current_user)):
    return await TestRouteHelper.test_poll_scan_job(scan_id, current_user)


@test_routes.post(
    "/api/get/tenant/node",
    include_in_schema=False,
)
async def test_get_tenant_node(current_user=Depends(get_current_user)):
    response = await AccountManager.get_instance().get_node(current_user)

    if response.user.username == "enterprise_tour1":
        response.user.demo_tour = False
    else:
        response.user.demo_tour = True

    return response


@test_routes.post(
    "/api/test/takedown-visibility/setup",
    include_in_schema=False,
)
async def test_setup_takedown_visibility():
    return await TestRouteHelper.setup_takedown_visibility_fixture()


@test_routes.post(
    "/api/takedowns",
    include_in_schema=False,
)
async def test_create_takedown_request(request: TakedownCreateRequest = Body(...)):
    return await TestRouteHelper.create_test_takedown_request(request)


@test_routes.get(
    "/api/takedowns",
    include_in_schema=False,
)
async def test_list_takedown_requests(
    viewer: str = Query("initiator"),
    status: str | None = Query(None),
    q: str = Query(""),
    daterange: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return await TestRouteHelper.list_test_takedown_requests(
        viewer,
        status=status,
        q=q,
        page=page,
        limit=limit,
        daterange=daterange,
    )


@test_routes.post(
    "/api/dynamic/user",
    dependencies=SCAN_DEPS,
)
async def test_search_dynamic_email(_param: search_dynamic_param_model = Body(...)):
    return TestRouteHelper.pending_or_api_mock("dynamic_user", "dynamic_user_done.json")


@test_routes.post(
    "/api/dynamic/cracked",
    dependencies=SCAN_DEPS,
)
async def test_search_dynamic_cracked(_param: search_dynamic_crack_model = Body(...)):
    return TestRouteHelper.pending_or_api_mock("dynamic_cracked", "dynamic_cracked.json")


@test_routes.post("/api/forgot")
async def forgotPassword(data: ForgotPasswordRequest, request: Request):
    return await auth_manager.forgot_password(data.email, getattr(request.state, "tenant", None))


@test_routes.post(
    "/api/dynamic/software",
    dependencies=SCAN_DEPS,
)
async def test_search_dynamic_software(_param: search_dynamic_crack_model = Body(...)):
    return TestRouteHelper.pending_or_api_mock("dynamic_software", "dynamic_software.json")


@test_routes.post(
    "/api/urlscan/ip",
    dependencies=SCAN_DEPS,
)
@test_routes.post(
    "/api/urlscan/dns",
    dependencies=SCAN_DEPS,
)
async def test_search_dynamic_ip_scan(_param: DomainScanRequest = Body(...)):
    return TestRouteHelper.pending_or_api_mock("urlscan_ip", "urlscan_domain_iplookup.json")


@test_routes.post(
    "/api/dynamic/social",
    dependencies=SCAN_DEPS,
)
async def test_search_dynamic_social(_param: search_dynamic_social_model = Body(...)):
    return TestRouteHelper.pending_or_api_mock("dynamic_social", "dynamic_social.json")


@test_routes.post(
    "/api/dynamic/wanted",
    dependencies=SCAN_DEPS,
)
async def test_search_dynamic_wanted(_param: search_dynamic_social_model = Body(...)):
    return TestRouteHelper.load_api_mock("dynamic_wanted.json")


@test_routes.post(
    "/api/urlscan/domain",
    dependencies=SCAN_LIMITED_DEPS,
)
async def test_parse_domain(payload: DomainScanRequest):
    return TestRouteHelper.pending_or_dynamic_scan(payload.scanType)


@test_routes.post(
    "/api/urlscan/subdomains",
    dependencies=SCAN_LIMITED_DEPS,
)
async def test_parse_subdomains(payload: DomainScanRequest):
    return TestRouteHelper.pending_or_dynamic_scan(payload.scanType)


@test_routes.post(
    "/api/urlscan/wayback",
    dependencies=SCAN_LIMITED_DEPS,
)
async def test_parse_wayback(payload: DomainScanRequest):
    return TestRouteHelper.pending_or_dynamic_scan(payload.scanType)


@test_routes.post(
    "/api/ioc/extract",
    dependencies=ANALYST_DEPS,
)
async def extract_ioc(file: UploadFile = File(...)):
    return TestRouteHelper.pending_or_api_mock("ioc_file_extract", "ioc_file_extract.json")


@test_routes.post(
    "/file/scan/{user_id}",
    include_in_schema=False,
)
async def file_scan(user_id: str, file: UploadFile = File(...)):
    return TestRouteHelper.pending_or_api_mock("ioc_file_extract", "ioc_file_extract.json")


@test_routes.post(
    "/api/apk/scan",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def extract_apk_ioc(file: UploadFile = File(...)):
    return TestRouteHelper.pending_or_api_mock("ioc_apk_extract", "ioc_apk_extract.json")


@test_routes.post(
    "/api/crypto/scan",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def extract_crypto():
    return TestRouteHelper.pending_or_api_mock("dynamic_crypto_scan", "dynamic_crypto_scan.json")


@test_routes.post(
    "/api/nexus/analyze-text",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_nexus_analyze_text(_payload: dict = Body(...)):
    return TestRouteHelper.load_api_mock("nexus_analyze_text.json")


@test_routes.post(
    "/api/nlp/chat/report",
    include_in_schema=False,
    dependencies=ADMIN_DEPS,
)
async def test_nlp_chat_report(_payload: dict = Body(...)):
    return TestRouteHelper.static_test_chat_response()


@test_routes.post(
    "/api/nexus/chat",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_nexus_chat(_payload: dict = Body(...)):
    return TestRouteHelper.static_test_chat_streaming_response()


@test_routes.get(
    "/api/nexus/chats",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_list_nexus_chats() -> list[dict[str, Any]]:
    return []


@test_routes.post(
    "/api/nexus/chats",
    status_code=201,
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_create_nexus_chat(payload: dict = Body(default={"title": "New Chat"})) -> dict[str, Any]:
    return TestRouteHelper.static_test_chat_session(title=payload.get("title", "New Chat"))


@test_routes.delete(
    "/api/nexus/chats",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_delete_all_nexus_chats() -> dict[str, bool]:
    return {"success": True}


@test_routes.get(
    "/api/nexus/chats/{session_id}",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_get_nexus_chat(session_id: str) -> dict[str, Any]:
    return TestRouteHelper.static_test_chat_detail(session_id)


@test_routes.post(
    "/api/nexus/chats/{session_id}/messages",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_send_nexus_chat_message(session_id: str, payload: dict = Body(...)) -> dict[str, Any]:
    return TestRouteHelper.static_test_chat_message_response(
        session_id,
        str(payload.get("message", "")),
    )


@test_routes.put(
    "/api/nexus/chats/{session_id}",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_rename_nexus_chat(session_id: str, payload: dict = Body(...)) -> dict[str, Any]:
    return TestRouteHelper.static_test_chat_session(
        title=payload.get("title", "New Chat"),
        session_id=session_id,
        message_count=2,
    )


@test_routes.delete(
    "/api/nexus/chats/{session_id}",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_delete_nexus_chat(session_id: str) -> dict[str, Any]:
    return {"success": True, "session_id": session_id}


@test_routes.post(
    "/api/nexus/chat/workspace",
    include_in_schema=False,
    dependencies=SCAN_DEPS,
)
async def test_nexus_workspace_chat(_payload: dict | None = Body(default=None)):
    return TestRouteHelper.static_test_chat_streaming_response()


@test_routes.post(
    "/api/get/current/user/chat-history",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_get_current_user_chat_history():
    return {"history": [], "chat_history": []}


@test_routes.post(
    "/api/update/current/user/chat-history",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_update_current_user_chat_history(data: dict = Body(...)):
    history = data.get("chat_history", [])
    return {"history": history, "chat_history": history}


@test_routes.post(
    "/api/cross/search",
    include_in_schema=False,
    dependencies=ANALYST_SCAN_DEPS,
)
async def test_cross_search(_payload: search_dynamic_onion_search = Body(...)):
    return TestRouteHelper.pending_or_api_mock("dynamic_cross_search", "dynamic_cross_search.json")


@test_routes.post(
    "/api/netintel/resolve_ip",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_netintel_resolve_ip(_payload: ResolveIPRequest = Body(...)):
    return TestRouteHelper.pending_or_api_mock("netintel_resolve_ip", "netintel_resolve_ip.json")


@test_routes.post(
    "/api/netintel/ipscanner",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_netintel_ipscanner(_payload: NetIntelDeepScanRequest = Body(...)):
    return TestRouteHelper.pending_or_api_mock("netintel_ipscanner", "netintel_ipscanner.json")


@test_routes.post(
    "/api/netintel/url_vulnerability_scan",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_netintel_url_vulnerability_scan(_payload: UrlVulnerabilityScanRequest = Body(...)):
    return TestRouteHelper.pending_or_dynamic_scan("vulnerability")


@test_routes.post(
    "/api/netintel/iot_detect",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_netintel_camera_detect(_payload: GeoCameraDetectRequest = Body(...)):
    return TestRouteHelper.pending_or_api_mock("netintel_camera_detect", "netintel_camera_detect.json")


@test_routes.post(
    "/api/netintel/camera_detect_ranges",
    include_in_schema=False,
    dependencies=ANALYST_DEPS,
)
async def test_netintel_camera_detect_ranges(_payload: GeoCameraDetectRangesRequest = Body(...)):
    return TestRouteHelper.pending_or_api_mock("netintel_camera_detect_ranges", "netintel_camera_detect_ranges.json")


@test_routes.post(
    "/api/social/recon",
    dependencies=SCAN_DEPS,
)
async def test_social_recon(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_recon", "social_recon.json")


@test_routes.post(
    "/api/social/recon/image",
    dependencies=SCAN_DEPS,
)
async def test_social_recon_image(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_recon_image", "social_recon_image.json")


@test_routes.post(
    "/api/social/profile",
    dependencies=SCAN_DEPS,
)
async def test_social_profile(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_profile", "social_profile.json")


@test_routes.post(
    "/api/social/online/images",
    dependencies=SCAN_DEPS,
)
async def test_social_online_images(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_online_images", "social_online_images.json")


@test_routes.post(
    "/api/social/posts",
    dependencies=SCAN_DEPS,
)
async def test_social_posts(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_posts", "social_posts.json")


@test_routes.post(
    "/api/social/videos",
    dependencies=SCAN_DEPS,
)
async def test_social_videos(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_videos", "social_videos.json")


@test_routes.post(
    "/api/social/shorts",
    dependencies=SCAN_DEPS,
)
async def test_social_shorts(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_shorts", "social_shorts.json")


@test_routes.post(
    "/api/social/metadata",
    dependencies=SCAN_DEPS,
)
async def test_social_metadata(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_online_presence", "social_online_presence.json")


@test_routes.post(
    "/api/social/data",
    dependencies=SCAN_DEPS,
)
async def test_social_data_save(payload: dict = Body(...)):
    return {"status": "done", "result": payload}


@test_routes.get(
    "/api/social/data",
    dependencies=SCAN_DEPS,
)
async def test_social_data_list():
    return {"status": "done", "result": []}


@test_routes.get(
    "/api/social/data/{profile_username}",
    dependencies=SCAN_DEPS,
)
async def test_social_data_detail(profile_username: str):
    return {"profile_username": profile_username, "profiles": [], "count": 0}


@test_routes.delete(
    "/api/social/data/{profile_username:path}",
    dependencies=SCAN_DEPS,
)
async def test_social_data_delete(profile_username: str):
    return {"status": "done", "profile_username": profile_username}


@test_routes.post(
    "/api/social/followers",
    dependencies=SCAN_DEPS,
)
async def test_social_followers(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_followers", "social_followers.json")


@test_routes.post(
    "/api/social/entity",
    dependencies=SCAN_DEPS,
)
async def test_social_entity(_payload: dict = Body(...)):
    return TestRouteHelper.pending_or_elastic_mock("social_entity", "social_entity.json")


@test_routes.post(
    "/api/social/session/upsert",
    dependencies=SCAN_DEPS,
)
async def test_social_session_upsert(_data: dict = Body(...), graph_type: str = Query("social")):
    return TestRouteHelper.pending_or_elastic_mock(f"social_session_upsert_{graph_type}", "social_session_upsert.json")


@test_routes.get(
    "/api/social/session/tabs",
    dependencies=SCAN_DEPS,
)
async def test_social_session_tabs(graph_type: str = Query("social")):
    if graph_type == "graph":
        return TestRouteHelper.load_elastic_mock("social_session_tabs_graph.json")
    return TestRouteHelper.load_elastic_mock("social_session_tabs_social.json")


@test_routes.post(
    "/api/social/session/tab/add",
    dependencies=SCAN_DEPS,
)
async def test_social_session_tab_add(_tab: dict = Body(...), graph_type: str = Query("social")):
    return TestRouteHelper.pending_or_elastic_mock(f"social_session_tab_add_{graph_type}", "social_session_tab_add.json")

@test_routes.post("/api/manage-profiles/platforms", dependencies=SCAN_DEPS)
async def test_manage_profiles_platforms():
    return {"status": "done", "result": {"items": [{"platform": "twitter", "base": "https://twitter.com"}]}}

@test_routes.post("/api/manage-profiles/session", dependencies=SCAN_DEPS)
async def test_manage_profiles_session():
    return {"status": "done", "result": {"platform": "twitter", "saved": True}}

@test_routes.post("/api/manage-profiles/session/verify", dependencies=SCAN_DEPS)
async def test_manage_profiles_session_verify():
    return {"status": "done", "result": {"verified": True, "username": "testuser"}}

@test_routes.post("/api/manage-profiles/sessions", dependencies=SCAN_DEPS)
async def test_manage_profiles_sessions():
    return {"status": "done", "result": {"platforms": {"twitter": [{"id": "session123", "platform": "twitter", "capturedAt": "2026-09-04T12:00:00Z", "verified": True, "username": "testuser"}]}}}

@test_routes.delete("/api/manage-profiles/session/{platform}/{session_id}", dependencies=SCAN_DEPS)
async def test_manage_profiles_session_delete(platform: str, session_id: str):
    return {"status": "done"}

@test_routes.get("/api/manage-profiles/personas", dependencies=SCAN_DEPS)
async def test_manage_profiles_personas():
    return {"personas": [{"persona_id": "p1", "name": "Test Persona", "adult_status": True, "age_group": "25-34", "gender": "male", "city": "New York", "country": "USA", "interests": ["tech"]}]}

@test_routes.post("/api/manage-profiles/personas", dependencies=SCAN_DEPS)
async def test_manage_profiles_persona_create(payload: dict = Body(...)):
    payload["persona_id"] = "new_p"
    return payload

@test_routes.put("/api/manage-profiles/personas/{persona_id}", dependencies=SCAN_DEPS)
async def test_manage_profiles_persona_update(persona_id: str, payload: dict = Body(...)):
    payload["persona_id"] = persona_id
    return payload

@test_routes.delete("/api/manage-profiles/personas/{persona_id}", dependencies=SCAN_DEPS)
async def test_manage_profiles_persona_delete(persona_id: str):
    return {"message": "deleted"}

@test_routes.get("/api/manage-profiles/profiles", dependencies=SCAN_DEPS)
async def test_manage_profiles_profiles():
    return {"profiles": [{"profile_id": "prof1", "platform": "twitter", "profile_username": "testuser", "connection_status": "connected", "assigned_persona_id": "p1"}]}

@test_routes.post("/api/manage-profiles/profiles", dependencies=SCAN_DEPS)
async def test_manage_profiles_profile_create(payload: dict = Body(...)):
    payload["profile_id"] = "new_prof"
    return payload

@test_routes.put("/api/manage-profiles/profiles/{profile_id}", dependencies=SCAN_DEPS)
async def test_manage_profiles_profile_update(profile_id: str, payload: dict = Body(...)):
    payload["profile_id"] = profile_id
    return payload

@test_routes.delete("/api/manage-profiles/profiles/{profile_id}", dependencies=SCAN_DEPS)
async def test_manage_profiles_profile_delete(profile_id: str):
    return {"message": "deleted"}

@test_routes.post("/api/manage-profiles/assignments", dependencies=SCAN_DEPS)
async def test_manage_profiles_assign(payload: dict = Body(...)):
    return {"status": "assigned"}

@test_routes.delete("/api/manage-profiles/assignments/{profile_id}", dependencies=SCAN_DEPS)
async def test_manage_profiles_unassign(profile_id: str):
    return {"status": "unassigned"}

@test_routes.get("/api/manage-profiles/results/{profile_id}", dependencies=SCAN_DEPS)
async def test_manage_profiles_results(profile_id: str):
    return {"ad_detection_results": [{"date_time": "2026-09-04T12:00:00Z", "total_detected_ads": 2, "ads": [{"author": "AdAuthor1", "url": "https://twitter.com/ad1", "content_text": "Ad text 1", "likes": "10", "shares": "2", "views": "100", "detected_at": "2026-09-04T12:00:00Z"}]}], "post_results": [{"date_time": "2026-09-04T12:00:00Z", "post_url": "https://twitter.com/post1", "error": False}]}

@test_routes.get("/api/extension/session")
async def test_extension_session():
    return {"extension_connected": True}
