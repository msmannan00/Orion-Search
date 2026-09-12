import asyncio
import re
import requests
from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, UploadFile, File
from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from configs.app_dependency import (
    _enforce_demo_safe_search,
    _read_scan_upload,
    _scan_domain_with_type,
    _validate_public_scan_target,
    admin_or_enterprise_required,
    dismiss_result_required,
    license_required,
    role_required,
    status_required,
    get_current_role,
    get_current_user,
    get_is_free_token,
)
from configs.limiter_dependency import limiter_dependency
from orion.api.interactive.account_manager.account_manager import AccountManager
from orion.api.interactive.feedback_manager.feedback_manager import FeedbackManager
from orion.api.interactive.feedback_manager.models.feedback_param_model import feedback_comment_param_model
from orion.api.interactive.scan_job_manager.scan_job_manager import ScanJobManager
from orion.helper_manager.env_handler import env_handler
from orion.api.interactive.takedown_manager.takedown_manager import TakedownManager
from orion.api.interactive.directory_manager.directory_manager import directory_manager
from orion.api.interactive.directory_manager.directory_shared_model.directory_param_model import directory_param_model
from orion.api.interactive.hompage_manager.homepage_manager import homepage_manager
from orion.api.interactive.search_manager.search_data_model.consolidated.search_consolidated_param_model import search_consolidated_param_model
from orion.api.interactive.search_manager.search_data_model.dump.search_credential_param_model import search_credential_param_model
from orion.api.interactive.search_manager.search_data_model.dynamic.search_dynamic_param_model import search_dynamic_crack_model, search_dynamic_crypto_model, search_dynamic_onion_search, search_dynamic_param_model, search_dynamic_social_model
from orion.api.interactive.search_manager.internal.search_apt_controller import search_apt_controller
from orion.api.interactive.search_manager.internal.search_defacement_controller import search_defacement_controller
from orion.api.interactive.search_manager.internal.search_exploit_controller import search_exploit_controller
from orion.api.interactive.search_manager.internal.search_generic_controller import search_generic_controller
from orion.api.interactive.search_manager.search_manager import search_manager
from orion.api.interactive.siemlog_manager.siem_log_manager import SiemLogManager
from orion.api.server.crawl_manager.class_model.domain_scan_request_model import DomainScanRequest, UrlVulnerabilityScanRequest
from orion.api.server.crawl_manager.class_model.ip_scan_request_model import IPScanRequest, NetIntelDeepScanRequest, ResolveIPRequest
from orion.api.server.crawl_manager.class_model.log_model import SiemSearchRequestModel, SiemSearchResponseModel
from orion.api.server.crawl_manager.class_model.social_scrape_request_model import SocialScrapeRequest
from orion.services.mongo_manager.shared_model.db_scan_job_model import ScanJobCreateRequest, ScanJobDetailResponse, ScanJobListResponse, ScanJobSeenRequest
from orion.services.mongo_manager.shared_model.db_tenant_model import ResultDismissRequest, DismissedIocType
from orion.api.interactive.tenant_manager.tenant_manager import TenantManager
from orion.services.mongo_manager.shared_model.db_takedown_request_model import TakedownCreateRequest, TakedownDecisionRequest, TakedownListResponse
from orion.api.server.crawl_manager.crawl_manager import crawl_manager
from orion.api.server.entity_manager.entity_manager import entity_manager
from orion.api.server.entity_manager.modal.EntityQueryModel import EntityGraphBatchQueryModel, EntityQueryModel
from orion.api.server.config_manager.config_controller import config_controller
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, UserStatus, user_role
from orion.services.stix_manager.converters.stix_minimal import convert_to_stix
from orion.services.stix_manager.stix_manager import stix_manager
from routes.docs.docs import CRYPTO_DOCS, CROSS_SEARCH_DOCS, DYNAMIC_DOCS, REPORT_DOCS, SEARCH_DOCS, SUPPORT_METHOD_DOCS, SYSTEM_INFO_DOCS

api_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE]))])
SCAN_ROLE_DEPS = [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]
SCAN_WITH_LIMITER_DEPS = [Depends(role_required(SCAN_ROLE_DEPS)), Depends(limiter_dependency), Depends(license_required("scanning"))]
STEALER_LOG_DEPS = [Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("module:stealer_logs", bypass_roles=[], bypass_licenses=["maintainer"]))]
STIX_MEMBER_DEPS = [Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))]
GENERAL_MODULE_DEPS = [Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("module:general"))]
APT_INTEL_DEPS = [
    Depends(role_required(SCAN_ROLE_DEPS)),
    Depends(license_required(
        "apt_intel",
        bypass_licenses=[
            LicenseName.OSINT_BASIC.value,
            LicenseName.OSINT_ADVANCED.value,
            LicenseName.ENTERPRISE.value,
        ],
    )),
]
SCANNING_DEPS = [Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("scanning"))]
STIX_KIND_VALUES = {"general", "leak", "defacement", "exploit", "chat", "social"}


async def _tenant_export_name(request: Request) -> str:
    tenant = getattr(request.state, "tenant", None)
    tenant_id = str(getattr(tenant, "id", "")).strip()
    if not tenant_id:
        return "Tenant"
    app_name = await config_controller.getInstance().get_cached("app_name", "Tenant", tenant_id=tenant_id)
    return str(app_name).strip() or "Tenant"


@api_routes.post(
    "/api/profile/event-management/siem/search",
    status_code=200,
    include_in_schema=False,
    response_model=SiemSearchResponseModel,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER])), Depends(license_required("maintainer", bypass_roles=[user_role.ADMIN])), Depends(limiter_dependency)])
async def search_siem_logs(payload: SiemSearchRequestModel = Body(...), current_user=Depends(get_current_user)):
    try:
        return await SiemLogManager.get_instance().search_logs(payload, current_user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to search SIEM logs") from exc

@api_routes.get(
    "/api/insight/country",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.DEMO, user_role.ANALYST]))])
async def get_country_insight(category: str = Query(...), country: str = Query(...), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=200)):
    return await homepage_manager.getInstance().get_country_specific_insights_paginated(
        category=category,
        country=country,
        page=page,
        limit=limit
    )

@api_routes.post(
    "/api/search/strategic",
    summary="Search strategic reports",
    description=SEARCH_DOCS["strategic"]["description"],
    tags=["Search"],
    operation_id="searchStrategicReports",
    response_description=SEARCH_DOCS["strategic"]["response_description"],
    status_code=200,
    dependencies=GENERAL_MODULE_DEPS, )
async def search_general(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user), role: user_role = Depends(get_current_role), is_free: bool = Depends(get_is_free_token)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    _enforce_demo_safe_search(param, current_user, is_free)
    if role == user_role.DEMO or is_free:
        param.network = "onion"
    base_index = [ELASTIC_INDEX.S_GENERIC_INDEX]
    has_query = param.q != ""
    if current_user and getattr(current_user, "role", None) == user_role.DEMO and is_free and param.category == "all" and has_query:
        base_index = [
            ELASTIC_INDEX.S_LEAK_INDEX,
            ELASTIC_INDEX.S_GENERIC_INDEX,
            ELASTIC_INDEX.S_EXPLOIT_INDEX,
            ELASTIC_INDEX.S_APT_INDEX,
            ELASTIC_INDEX.S_MALWARE_INDEX,
            ELASTIC_INDEX.S_CHATS_INDEX,
            ELASTIC_INDEX.S_SOCIAL_INDEX,
        ]
    return await search_generic_controller.getInstance().search_ranked_result(param, base_index, [], [])


@api_routes.post(
    "/api/search/breach",
    summary="Search breach reports",
    description=SEARCH_DOCS["breach"]["description"],
    tags=["Search"],
    operation_id="searchBreachReports",
    response_description=SEARCH_DOCS["breach"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:breach"))])
async def search_leak(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    _enforce_demo_safe_search(param, current_user)
    category = (param.category or "all").strip().lower()
    base_index = [ELASTIC_INDEX.S_LEAK_INDEX]
    if category in {"all", "databases", "leak", "leaks"}:
        param.category = "leaks"
        return await search_manager.getInstance().search_consolidated_ranked_result(
            param, base_index, ["news", "tracking"], ["leaks"])

    return await search_manager.getInstance().search_consolidated_ranked_result(param, base_index, [], [category])


@api_routes.post(
    "/api/search/social",
    summary="Search social reports",
    description=SEARCH_DOCS["social"]["description"],
    tags=["Search"],
    operation_id="searchSocialReports",
    response_description=SEARCH_DOCS["social"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("module:social", bypass_licenses=["maintainer"]))], )
async def search_social(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    _enforce_demo_safe_search(param, current_user)
    category = (param.category or "all").strip().lower()
    if category == "all":
        base_index = [ELASTIC_INDEX.S_CHATS_INDEX, ELASTIC_INDEX.S_SOCIAL_INDEX]
        return await search_manager.getInstance().search_consolidated_ranked_result(param, base_index, [], [])
    else:
        if category == "telegram":
            param.category = "all"
            base_index = [ELASTIC_INDEX.S_CHATS_INDEX]
            return await search_manager.getInstance().search_consolidated_ranked_result(param, base_index, [], [])
        if category in ("forum", "forums"):
            param.category = "all"
            param.content = "all"
            param.m_content_type = "all"
            param.platform = "forum"
            base_index = [ELASTIC_INDEX.S_SOCIAL_INDEX]
            return await search_manager.getInstance().search_consolidated_ranked_result(param, base_index, [], [])
        else:
            param.platform = category
            param.category = "all"
            base_index = [ELASTIC_INDEX.S_SOCIAL_INDEX]
            return await search_manager.getInstance().search_consolidated_ranked_result(param, base_index, [], [])


@api_routes.post(
    "/api/search/exploit",
    summary="Search exploit reports",
    description=SEARCH_DOCS["exploit"]["description"],
    tags=["Search"],
    operation_id="searchExploitReports",
    response_description=SEARCH_DOCS["exploit"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("module:exploit", bypass_licenses=["maintainer"]))], )
async def search_exploit(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    _enforce_demo_safe_search(param, current_user)
    base_index = [ELASTIC_INDEX.S_EXPLOIT_INDEX]
    return await search_exploit_controller.getInstance().search_result(param, base_index)


@api_routes.get(
    "/api/search/exploit/suggestions",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("module:exploit", bypass_licenses=["maintainer"]))], )
async def get_exploit_filter_suggestions(field: str = Query(...), q: str = Query(""), limit: int = Query(25, ge=1, le=50)):
    values = await search_exploit_controller.getInstance().get_filter_suggestions(field, q, limit)
    return {"values": values}


@api_routes.post(
    "/api/search/apt-intel",
    summary="Search APT Intel reports",
    description=SEARCH_DOCS["apt_intel"]["description"],
    tags=["Search"],
    operation_id="searchAptIntelReports",
    response_description=SEARCH_DOCS["apt_intel"]["response_description"],
    status_code=200,
    dependencies=APT_INTEL_DEPS, )
async def search_apt_intel(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    _enforce_demo_safe_search(param, current_user)
    return await search_apt_controller.getInstance().search_result(param)


@api_routes.get("/api/search/apt/families", status_code=200, include_in_schema=False, dependencies=APT_INTEL_DEPS)
async def get_apt_families():
    return await search_manager.getInstance().get_apt_filter_options()


@api_routes.get("/api/search/malware/filter-options", status_code=200, include_in_schema=False, dependencies=APT_INTEL_DEPS)
async def get_malware_filter_options():
    return await search_manager.getInstance().get_malware_filter_options()


@api_routes.post(
    "/api/search/defacement",
    summary="Search defacement reports",
    description=SEARCH_DOCS["defacement"]["description"],
    tags=["Search"],
    operation_id="searchDefacementReports",
    response_description=SEARCH_DOCS["defacement"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required(SCAN_ROLE_DEPS)), Depends(license_required("module:defacement", bypass_licenses=["maintainer"]))], )
async def search_defacement(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    _enforce_demo_safe_search(param, current_user)
    base_index = [ELASTIC_INDEX.S_DEFACEMENT_INDEX]
    return await search_defacement_controller.getInstance().search_grouped_result(param, base_index)

@api_routes.post(
    "/api/feedback/comment/{doc_id}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def add_feedback_comment(doc_id: str, param: feedback_comment_param_model = Body(...), current_user=Depends(get_current_user)):
    return await FeedbackManager.get_instance().add_comment(doc_id, param.comment, current_user)


@api_routes.delete(
    "/api/feedback/comment/{doc_id}/{comment_created_at}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def delete_feedback_comment(doc_id: str, comment_created_at: str, current_user=Depends(get_current_user)):
    return await FeedbackManager.get_instance().delete_comment(doc_id, comment_created_at, current_user)


@api_routes.get(
    "/api/feedback/{doc_id}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def get_feedback(doc_id: str, current_user=Depends(get_current_user)):
    return await FeedbackManager.get_instance().get_feedback(doc_id, current_user)


@api_routes.post(
    "/api/feedback/recommended/{doc_id}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def increment_recommended_feedback(doc_id: str, current_user=Depends(get_current_user)):
    return await FeedbackManager.get_instance().increment_recommended(doc_id, current_user)


@api_routes.post(
    "/api/feedback/trust/{doc_id}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def increment_trust_feedback(doc_id: str, current_user=Depends(get_current_user)):
    return await FeedbackManager.get_instance().increment_trust(doc_id, current_user)


@api_routes.post(
    "/api/feedback/untrust/{doc_id}",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def increment_untrust_feedback(doc_id: str, current_user=Depends(get_current_user)):
    return await FeedbackManager.get_instance().increment_untrust(doc_id, current_user)


@api_routes.get(
    "/api/user/{user_id}/get",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def get_public_user(user_id: str, current_user=Depends(get_current_user)):
    return await AccountManager.get_instance().get_public_user(user_id, current_user)


@api_routes.get(
    "/api/user/{user_id}/activity",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))],
)
async def get_public_user_activity(user_id: str, current_user=Depends(get_current_user)):
    return await FeedbackManager.get_instance().get_public_user_activity(user_id, current_user)


@api_routes.get(
    "/api/directory",
    summary="Get monitored source directory",
    description=SYSTEM_INFO_DOCS["directory"]["description"],
    tags=["System Info"],
    operation_id="getSystemDirectory",
    response_description=SYSTEM_INFO_DOCS["directory"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST]))])
async def get_directory(param: directory_param_model = Depends()):
    return await directory_manager.getInstance().invoke_directory(param)


@api_routes.get(
    "/api/insight",
    summary="Get system insights",
    description=SYSTEM_INFO_DOCS["insight"]["description"],
    tags=["System Info"],
    operation_id="getSystemInsights",
    response_description=SYSTEM_INFO_DOCS["insight"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.DEMO, user_role.ANALYST]))])
async def get_insight():
    insights_task = homepage_manager.getInstance().invoke_analytics()
    latestDocument_task = homepage_manager.getInstance().insight_consolidated_result()
    countryInsightsTask = homepage_manager.getInstance().get_country_specific_insights()

    insights, latestDocument, country_insight = await asyncio.gather(insights_task, latestDocument_task, countryInsightsTask)
    return {"insights": insights, "latestDocument": latestDocument, "country_insight": country_insight}



@api_routes.post(
    "/api/search/stealer/ioc",
    summary="Search stealer log reports",
    description=SEARCH_DOCS["stealerlogs"]["description"],
    tags=["Search"],
    operation_id="searchStealerLogAndConsolidatedReports",
    response_description=SEARCH_DOCS["stealerlogs"]["response_description"],
    status_code=200,
    dependencies=STEALER_LOG_DEPS)
async def search_stealer_iocs(param: search_credential_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    return await search_manager.getInstance().search_stealer_iocs(param, current_user)


@api_routes.post(
    "/api/search/result/dismiss",
    include_in_schema=False,
    dependencies=[Depends(role_required(SCAN_ROLE_DEPS)), Depends(dismiss_result_required)])
async def dismiss_result(payload: ResultDismissRequest = Body(...), current_user=Depends(get_current_user)):
    try:
        dismissed_ioc_type = DismissedIocType(payload.type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dismiss type")
    return await TenantManager.get_instance().dismiss_stealer_log(str(current_user.tenant_uuid), payload.hash, str(current_user.id), dismissed_ioc_type, all_tenants=current_user.role == user_role.ADMIN)


@api_routes.post(
    "/api/search/result/restore",
    include_in_schema=False,
    dependencies=[Depends(role_required(SCAN_ROLE_DEPS)), Depends(dismiss_result_required)])
async def restore_result(payload: ResultDismissRequest = Body(...), current_user=Depends(get_current_user)):
    try:
        dismissed_ioc_type = DismissedIocType(payload.type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dismiss type")
    return await TenantManager.get_instance().restore_stealer_log(str(current_user.tenant_uuid), payload.hash, dismissed_ioc_type, all_tenants=current_user.role == user_role.ADMIN)


@api_routes.post(
    "/api/search/consolidated",
    summary="Search consolidated reports (grouped)",
    description=SEARCH_DOCS["consolidated"]["description"],
    tags=["Search"],
    operation_id="searchConsolidatedReports",
    response_description=SEARCH_DOCS["consolidated"]["response_description"],
    status_code=200,
    dependencies=[Depends(admin_or_enterprise_required)], )
async def search_consolidated(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    _enforce_demo_safe_search(param, current_user)
    return await search_manager.getInstance().search_consolidated_result(param)

@api_routes.post(
    "/api/search/consolidated/ioc",
    include_in_schema=False,
    status_code=200,
    dependencies=[Depends(admin_or_enterprise_required)],
)
async def search_consolidated_iocs(param: search_consolidated_param_model = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().register(str(current_user.tenant_uuid), str(current_user.id), param.model_dump_json())
    base_index = [
        ELASTIC_INDEX.S_LEAK_INDEX,
        ELASTIC_INDEX.S_GENERIC_INDEX,
        ELASTIC_INDEX.S_EXPLOIT_INDEX,
        ELASTIC_INDEX.S_APT_INDEX,
        ELASTIC_INDEX.S_MALWARE_INDEX,
        ELASTIC_INDEX.S_CHATS_INDEX,
        ELASTIC_INDEX.S_SOCIAL_INDEX,
        ELASTIC_INDEX.S_DEFACEMENT_INDEX,
    ]
    return await search_manager.getInstance().search_consolidated_iocs(param, base_index)

@api_routes.get(
    "/api/search/defacement/{doc_id}",
    summary="Get defacement report",
    description=REPORT_DOCS["defacement"]["description"],
    tags=["Reports"],
    operation_id="getDefacementReport",
    response_description=REPORT_DOCS["defacement"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:defacement", bypass_licenses=["maintainer"]))], )
async def get_defacement_document(doc_id: str):
    report = await search_manager.getInstance().request_defacement_doc(doc_id)
    takedown_manager = TakedownManager.get_instance()
    return await takedown_manager.enrich_report(report)


@api_routes.get(
    "/api/search/breach/{doc_id}",
    summary="Get breach monitoring report",
    description=REPORT_DOCS["breach"]["description"],
    tags=["Reports"],
    operation_id="getBreachReport",
    response_description=REPORT_DOCS["breach"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:breach", bypass_licenses=["maintainer"]))], )
async def get_leak_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_leak_doc(doc_id, lang)


@api_routes.get(
    "/api/search/news/{doc_id}",
    summary="Get breach-related news report",
    description=REPORT_DOCS["news"]["description"],
    tags=["Reports"],
    operation_id="getNewsReport",
    response_description=REPORT_DOCS["news"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:feed", bypass_licenses=["maintainer"]))], )
async def get_news_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_leak_doc(doc_id, lang)


@api_routes.get(
    "/api/search/exploit/{doc_id}",
    summary="Get exploit intelligence report",
    description=REPORT_DOCS["exploit"]["description"],
    tags=["Reports"],
    operation_id="getExploitReport",
    response_description=REPORT_DOCS["exploit"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:exploit", bypass_licenses=["maintainer"]))], )
async def get_exploit_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_exploit_doc(doc_id, lang)


@api_routes.get(
    "/api/search/apt/{doc_id}",
    summary="Get APT intelligence report",
    description="Retrieve an indexed APT actor intelligence report.",
    tags=["Reports"],
    operation_id="getAptReport",
    response_description="APT report document",
    status_code=200,
    dependencies=APT_INTEL_DEPS, )
async def get_apt_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_apt_doc(doc_id, lang)


@api_routes.get(
    "/api/search/malware/{doc_id}",
    summary="Get malware intelligence report",
    description="Retrieve an indexed malware intelligence report.",
    tags=["Reports"],
    operation_id="getMalwareReport",
    response_description="Malware report document",
    status_code=200,
    dependencies=APT_INTEL_DEPS, )
async def get_malware_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_malware_doc(doc_id, lang)


@api_routes.get(
    "/api/search/strategic/{doc_id}",
    summary="Get darkweb strategic report",
    description=REPORT_DOCS["strategic"]["description"],
    tags=["Reports"],
    operation_id="getStrategicReport",
    response_description=REPORT_DOCS["strategic"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:general", bypass_licenses=["maintainer"]))], )
async def get_general_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_general_doc(doc_id, lang)


@api_routes.get(
    "/api/search/chat/{doc_id}",
    summary="Get chat intelligence report",
    description=REPORT_DOCS["chat"]["description"],
    tags=["Reports"],
    operation_id="getChatReport",
    response_description=REPORT_DOCS["chat"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:chat", bypass_licenses=["maintainer"]))], )
async def get_chat_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_chat_doc(doc_id, lang)


@api_routes.get(
    "/api/search/social/{doc_id}",
    summary="Get social media intelligence report",
    description=REPORT_DOCS["social"]["description"],
    tags=["Reports"],
    operation_id="getSocialReport",
    response_description=REPORT_DOCS["social"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:social", bypass_licenses=["maintainer"]))], )
async def get_social_document(doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await search_manager.getInstance().request_social_doc(doc_id, lang)


@api_routes.get(
    "/api/search/breach/screenshot/{filename}",
    summary="Get breach report screenshot",
    description=REPORT_DOCS["breach_screenshot"]["description"],
    tags=["Reports"],
    operation_id="getBreachReportScreenshot",
    response_description=REPORT_DOCS["breach_screenshot"]["response_description"],
    status_code=200,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:breach", bypass_licenses=["maintainer"])), ], )
async def get_screenshot(filename: str):
    return await crawl_manager.getInstance().get_screenshot_file(f"{filename}.webp")


@api_routes.post(
    "/api/dynamic/user",
    summary="Dynamic user email exposure search",
    description=DYNAMIC_DOCS["dynamic_user_email"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicUserEmailExposureSearch",
    response_description=DYNAMIC_DOCS["dynamic_user_email"]["response_description"],
    status_code=200,
    dependencies=SCANNING_DEPS, )
async def search_dynamic_email(param: search_dynamic_param_model = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    target = next((str(v) for v in (param.text or {}).values() if v), "")
    await AuditLogManager.get_instance().search_audit(current_user, "dynamic_user", target)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="dynamic/user", payload=param.model_dump(), metadata={"title": "User Exposure Scan", "target": target}, runner=lambda: search_manager.getInstance().dynamic_search(param, "user", user_id=str(current_user.id)), force_new=force_new)


@api_routes.post(
    "/api/dynamic/cracked",
    summary="Dynamic cracked credential search",
    description=DYNAMIC_DOCS["dynamic_cracked"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicCrackedCredentialSearch",
    response_description=DYNAMIC_DOCS["dynamic_cracked"]["response_description"],
    status_code=200,
    dependencies=SCANNING_DEPS, )
async def search_dynamic_cracked(param: search_dynamic_crack_model = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    target = next((str(v) for v in (param.text or {}).values() if v), "")
    await AuditLogManager.get_instance().search_audit(current_user, "dynamic_cracked", target)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="dynamic/cracked", payload=param.model_dump(), metadata={"title": "Cracked Scan", "target": target}, runner=lambda: search_manager.getInstance().dynamic_search(param, "cracked", user_id=str(current_user.id)), force_new=force_new)


@api_routes.post(
    "/api/dynamic/software",
    summary="Dynamic software credential search",
    description=DYNAMIC_DOCS["dynamic_software"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicSoftwareCredentialSearch",
    response_description=DYNAMIC_DOCS["dynamic_software"]["response_description"],
    status_code=200,
    dependencies=SCANNING_DEPS, )
async def search_dynamic_software(param: search_dynamic_crack_model = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    target = next((str(v) for v in (param.text or {}).values() if v), "")
    await AuditLogManager.get_instance().search_audit(current_user, "dynamic_software", target)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="dynamic/software", payload=param.model_dump(), metadata={"title": "Software Scan", "target": target}, runner=lambda: search_manager.getInstance().dynamic_search(param, "software", user_id=str(current_user.id)), force_new=force_new)


@api_routes.post(
    "/api/urlscan/domain",
    summary="Domain, SEO, and repository scan",
    description=DYNAMIC_DOCS["domain_scan"]["description"],
    tags=["Entity Scans"],
    operation_id="scanDomainBasicSeoRepo",
    response_description=DYNAMIC_DOCS["domain_scan"]["response_description"],
    status_code=200,
    dependencies=SCAN_WITH_LIMITER_DEPS, )
async def parse_domain_scan(payload: DomainScanRequest, force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().search_audit(current_user, "domain_scan", payload.domain)
    title = f"{(payload.scanType or 'Domain').upper()} Scan"
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="urlscan/domain", payload=payload.model_dump(), metadata={"title": title, "target": payload.domain}, runner=lambda: _scan_domain_with_type(payload, user_id=str(current_user.id)), force_new=force_new)


@api_routes.post(
    "/api/urlscan/subdomains",
    summary="Returns the list of associated subdomains",
    description=SUPPORT_METHOD_DOCS["subdomain_scan"]["description"],
    tags=["Support Method"],
    operation_id="scanSubdomains",
    response_description=SUPPORT_METHOD_DOCS["subdomain_scan"]["response_description"],
    status_code=200,
    dependencies=SCAN_WITH_LIMITER_DEPS, )
async def parse_subdomain_scan(payload: DomainScanRequest, force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().search_audit(current_user, "subdomain_scan", payload.domain)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="urlscan/subdomains", payload=payload.model_dump(), metadata={"title": "Subdomain Scan", "target": payload.domain}, runner=lambda: _scan_domain_with_type(payload, user_id=str(current_user.id), scan_type='subdomains'), force_new=force_new)


@api_routes.post(
    "/api/urlscan/dns",
    summary="Reverse DNS and ping check",
    description=SUPPORT_METHOD_DOCS["dns_scan"]["description"],
    tags=["Support Method"],
    operation_id="scanDns",
    response_description=SUPPORT_METHOD_DOCS["dns_scan"]["response_description"],
    status_code=200,
    dependencies=SCAN_WITH_LIMITER_DEPS, )
async def parse_dns_scan(payload: DomainScanRequest, force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await _validate_public_scan_target(payload.domain)
    ip_payload = IPScanRequest(ip=payload.domain)
    await AuditLogManager.get_instance().search_audit(current_user, "dns_scan", payload.domain)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="urlscan/dns", payload=ip_payload.model_dump(), metadata={"title": "DNS Scan", "target": payload.domain}, runner=lambda: crawl_manager.getInstance().scan_ip(ip_payload, user_id=str(current_user.id)), force_new=force_new)


@api_routes.post(
    "/api/urlscan/wayback",
    summary="Fetches archived snapshots and timestamps",
    description=SUPPORT_METHOD_DOCS["wayback_scan"]["description"],
    tags=["Support Method"],
    operation_id="scanWaybackDomain",
    response_description=SUPPORT_METHOD_DOCS["wayback_scan"]["response_description"],
    status_code=200,
    dependencies=SCAN_WITH_LIMITER_DEPS, )
async def parse_wayback_scan(payload: DomainScanRequest, force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().search_audit(current_user, "wayback_scan", payload.domain)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="urlscan/wayback", payload=payload.model_dump(), metadata={"title": "Wayback Scan", "target": payload.domain}, runner=lambda: _scan_domain_with_type(payload, user_id=str(current_user.id), scan_type='wayback'), force_new=force_new)


@api_routes.post(
    "/api/urlscan/ip",
    include_in_schema=False,
    dependencies=SCAN_WITH_LIMITER_DEPS,
)
async def parse_ip(payload: IPScanRequest, current_user=Depends(get_current_user)):
    await _validate_public_scan_target(payload.ip)
    await AuditLogManager.get_instance().search_audit(current_user, "ip_scan", payload.ip)
    return await crawl_manager.getInstance().scan_ip(payload, user_id=str(current_user.id))


@api_routes.post(
    "/api/social/scrape",
    include_in_schema=False,
    dependencies=SCAN_WITH_LIMITER_DEPS, )
async def scrape_social(payload: SocialScrapeRequest, current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().search_audit(current_user, "social_scrape", ",".join(payload.usernames or []))
    return await crawl_manager.getInstance().scrape_social(payload, user_id=str(current_user.id))


@api_routes.post(
    "/api/dynamic/social",
    summary="Dynamic social identifier exposure search",
    description=DYNAMIC_DOCS["dynamic_social"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicSocialIdentifierExposureSearch",
    response_description=DYNAMIC_DOCS["dynamic_social"]["response_description"],
    status_code=200,
    dependencies=SCANNING_DEPS, )
async def search_dynamic_social(param: search_dynamic_social_model = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    target = next((str(v) for v in (param.text or {}).values() if v), "")
    await AuditLogManager.get_instance().search_audit(current_user, "dynamic_social", target)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="dynamic/social", payload=param.model_dump(), metadata={"title": "Social Exposure Scan", "target": target}, runner=lambda: search_manager.getInstance().dynamic_search(param, "social", user_id=str(current_user.id)), force_new=force_new)

@api_routes.post(
    "/api/dynamic/wanted",
    summary="Searches wanted people around the Globe",
    description=DYNAMIC_DOCS["wanted_scanner"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicWantedPeopleSearch",
    response_description=DYNAMIC_DOCS["wanted_scanner"]["response_description"],
    status_code=200,
    dependencies=SCANNING_DEPS, )
async def search_dynamic_wanted(param: search_dynamic_social_model = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    target = next((str(v) for v in (param.text or {}).values() if v), "")
    await AuditLogManager.get_instance().search_audit(current_user, "dynamic_wanted", target)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="dynamic/wanted", payload=param.model_dump(), metadata={"title": "Wanted People Scan", "target": target}, runner=lambda: search_manager.getInstance().search_wanted_list(param), force_new=True)

@api_routes.post(
    "/api/dynamic/national-identity",
    summary="Dynamic national identity search",
    description=DYNAMIC_DOCS["dynamin_national_identity"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicNationalIdentitySearch",
    response_description=DYNAMIC_DOCS["dynamin_national_identity"]["response_description"],
    status_code=200,
    dependencies=SCANNING_DEPS, )
async def search_dynamic_national_identity(param: search_dynamic_crack_model = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    target = next((str(v) for v in (param.text or {}).values() if v), "")
    await AuditLogManager.get_instance().search_audit(current_user, "dynamic_national_identity", target)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="dynamic/national-identity", payload=param.model_dump(), metadata={"title": "National Identity Scan", "target": target}, runner=lambda: search_manager.getInstance().dynamic_search(param, "pak_database", user_id=str(current_user.id)), force_new=force_new)

@api_routes.get(
    "/api/search/breach/stix/{doc_id}",
    summary="Get breach media intelligence report in stix format",
    description=REPORT_DOCS["stix"]["description"],
    tags=["Stix"],
    operation_id="getBreachStixReport",
    response_description=REPORT_DOCS["stix"]["response_description"],
    status_code=200,
    dependencies=[Depends(
        role_required(
            [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("module:breach", bypass_licenses=["maintainer"])), ], )
async def get_breach_stix_document(request: Request, doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await stix_manager.get_instance().get_leak_stix(doc_id, lang, await _tenant_export_name(request))


@api_routes.get(
    "/api/search/strategic/stix/{doc_id}",
    summary="Get strategic media intelligence report in stix format",
    description=REPORT_DOCS["stix"]["description"],
    tags=["Stix"],
    operation_id="getStrategicStixReport",
    response_description=REPORT_DOCS["stix"]["response_description"],
    status_code=200,
    dependencies=[Depends(
        role_required(
            [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("module:general", bypass_licenses=["maintainer"])), ], )
async def get_strategic_stix_document(request: Request, doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await stix_manager.get_instance().get_general_stix(doc_id, lang, await _tenant_export_name(request))


@api_routes.get(
    "/api/search/defacement/stix/{doc_id}",
    summary="Get defacement media intelligence report in stix format",
    description=REPORT_DOCS["stix"]["description"],
    tags=["Stix"],
    operation_id="getDefacementStixReport",
    response_description=REPORT_DOCS["stix"]["response_description"],
    status_code=200,
    dependencies=[Depends(
        role_required(
            [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("module:defacement", bypass_licenses=["maintainer"])), ], )
async def get_defacement_stix_document(request: Request, doc_id: str):
    return await stix_manager.get_instance().get_defacement_stix(doc_id, await _tenant_export_name(request))


@api_routes.get(
    "/api/search/exploit/stix/{doc_id}",
    summary="Get exploit media intelligence report in stix format",
    description=REPORT_DOCS["stix"]["description"],
    tags=["Stix"],
    operation_id="getExploitStixReport",
    response_description=REPORT_DOCS["stix"]["response_description"],
    status_code=200,
    dependencies=[Depends(
        role_required(
            [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("module:exploit", bypass_licenses=["maintainer"])), ], )
async def get_exploit_stix_document(request: Request, doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await stix_manager.get_instance().get_exploit_stix(doc_id, lang, await _tenant_export_name(request))


@api_routes.get(
    "/api/search/social/stix/{doc_id}",
    summary="Get social media intelligence report in stix format",
    description=REPORT_DOCS["stix"]["description"],
    tags=["Stix"],
    operation_id="getSocialStixReport",
    response_description=REPORT_DOCS["stix"]["response_description"],
    status_code=200,
    dependencies=[*STIX_MEMBER_DEPS, Depends(license_required("module:social", bypass_licenses=["maintainer"]))], )
async def get_social_stix_document(request: Request, doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await stix_manager.get_instance().get_social_stix(doc_id, lang, await _tenant_export_name(request))


@api_routes.get(
    "/api/search/chat/stix/{doc_id}",
    summary="Get chat intelligence report in stix format",
    description=REPORT_DOCS["stix"]["description"],
    tags=["Stix"],
    operation_id="getChatStixReport",
    response_description=REPORT_DOCS["stix"]["response_description"],
    status_code=200,
    dependencies=[*STIX_MEMBER_DEPS, Depends(license_required("module:chat", bypass_licenses=["maintainer"]))], )
async def get_chat_stix_document(request: Request, doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await stix_manager.get_instance().get_chat_stix(doc_id, lang, await _tenant_export_name(request))


@api_routes.get(
    "/api/graph",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(license_required("cti_graph", bypass_roles=[user_role.ADMIN], bypass_licenses=["maintainer"]))], )
async def get_entity_relations(query: EntityQueryModel = Depends()):
    manager = entity_manager.get_instance()
    return await manager.get_entity_relations(query)


@api_routes.post(
    "/api/graph",
    status_code=200,
    include_in_schema=False,
    dependencies=[Depends(license_required("cti_graph", bypass_roles=[user_role.ADMIN], bypass_licenses=["maintainer"]))], )
async def post_entity_relations(query: EntityGraphBatchQueryModel = Body(...)):
    manager = entity_manager.get_instance()
    return await manager.get_entity_relations_batch(query)


@api_routes.get(
    "/api/search/news/stix/{doc_id}",
    summary="Get news media intelligence report in stix format",
    description=REPORT_DOCS["stix"]["description"],
    tags=["Stix"],
    operation_id="getNewsStixReport",
    response_description=REPORT_DOCS["stix"]["response_description"],
    status_code=200,
    dependencies=[Depends(
        role_required(
            [user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("module:feed", bypass_licenses=["maintainer"])), ], )
async def get_news_stix_document(request: Request, doc_id: str, lang: Optional[str] = Query(None, alias="lang", description="Optional language code for localized report content.")):
    return await stix_manager.get_instance().get_leak_stix(doc_id, lang, await _tenant_export_name(request))


@api_routes.post(
    "/api/ioc/extract",
    summary="Extract IOCs from file(.pdf or .txt) or image(.png, .jpg or .jpeg)",
    description=DYNAMIC_DOCS["ioc_extract"]["description"],
    tags=["Entity Scans"],
    operation_id="iocExtractFromFile",
    response_description=DYNAMIC_DOCS["ioc_extract"]["response_description"],
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("scanning")),
    ],
)
async def extract_ioc(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    file_content = await _read_scan_upload(file)
    result = await search_manager.getInstance().extract_ioc_from_file(file_content, file.filename, user_id=str(current_user.id))
    return result


@api_routes.post(
    "/api/apk/scan",
    summary="Dynamic analysis scan to identify application metadata, cracking indicators, etc",
    description=DYNAMIC_DOCS["apk_scan"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicApkScan",
    response_description=DYNAMIC_DOCS["apk_scan"]["response_description"],
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning"))],
)
async def scan_apk(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    file_content = await _read_scan_upload(file)
    result = await search_manager.getInstance().scan_apk(file_content, file.filename, user_id=str(current_user.id))

    return result


@api_routes.post(
    "/api/crypto/scan",
    summary="Scan cryptocurrency wallet address or transaction hash",
    description=CRYPTO_DOCS["crypto_scan"]["description"],
    tags=["Entity Scans"],
    operation_id="dynamicCryptoScan",
    response_description=CRYPTO_DOCS["crypto_scan"]["response_description"],
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("scanning"))
    ],
)
async def crypto_scan(param: search_dynamic_crypto_model = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    target = next((str(v) for v in (param.text or {}).values() if v), "")
    await AuditLogManager.get_instance().search_audit(current_user, "crypto_scan", target)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="crypto/scan", payload=param.model_dump(), metadata={"title": "Crypto Scan", "target": target}, runner=lambda: search_manager.getInstance().dynamic_search(param, "crypto", user_id=str(current_user.id)), force_new=force_new)

@api_routes.post(
    "/api/cross/search",
    summary="Run Cross Search",
    description=CROSS_SEARCH_DOCS["cross_search"]["description"],
    tags=["Support Method"],
    operation_id="dynamicCrossSearch",
    response_description=CROSS_SEARCH_DOCS["cross_search"]["response_description"],
    status_code=200,
    dependencies=[
        Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])),
        Depends(license_required("scanning"))
    ],
)
async def cross_search(param: search_dynamic_onion_search = Body(...), current_user=Depends(get_current_user)):
    await AuditLogManager.get_instance().search_audit(current_user, "cross_search", next((str(v) for v in (param.text or {}).values() if v), ""))
    return await search_manager.getInstance().onion_search(param, user_id=str(current_user.id))

@api_routes.post(
    "/api/netintel/resolve_ip",
    summary="Resolve a domain to IP addresses",
    description=DYNAMIC_DOCS["ip_resolve"]["description"],
    tags=["Network Intelligence"],
    operation_id="resolveIp",
    response_description=DYNAMIC_DOCS["ip_resolve"]["description"],
    status_code=200,
    dependencies=SCANNING_DEPS,
)
async def resolve_ip(param: ResolveIPRequest = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await _validate_public_scan_target(param.domain)
    await AuditLogManager.get_instance().search_audit(current_user, "resolve_ip", param.domain)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="netintel/resolve_ip", payload=param.model_dump(), metadata={"title": "Host Recon", "target": param.domain}, runner=lambda: search_manager.getInstance().network_intel(param, "resolve_ip", user_id=str(current_user.id)), force_new=force_new)

@api_routes.post(
    "/api/netintel/ipscanner",
    summary="Scan an IP address for network intelligence",
    description=DYNAMIC_DOCS["deep_ip_scan"]["description"],
    tags=["Network Intelligence"],
    operation_id="ipScanner",
    response_description=DYNAMIC_DOCS["deep_ip_scan"]["description"],
    status_code=200,
    dependencies=SCANNING_DEPS,
)
async def ipscanner(param: NetIntelDeepScanRequest = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await _validate_public_scan_target(param.ip)
    await AuditLogManager.get_instance().search_audit(current_user, "ipscanner", param.ip)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="netintel/ipscanner", payload=param.model_dump(), metadata={"title": "Deep IP Scan", "target": param.ip}, runner=lambda: search_manager.getInstance().network_intel(param, "netintel_scanner", user_id=str(current_user.id)), force_new=force_new)

@api_routes.post(
    "/api/netintel/url_vulnerability_scan",
    summary="Scan a domain URL for web vulnerabilities",
    description=DYNAMIC_DOCS["domain_scan"]["description"],
    tags=["Network Intelligence"],
    operation_id="urlVulnerabilityScan",
    response_description=DYNAMIC_DOCS["domain_scan"]["response_description"],
    status_code=200,
    dependencies=SCAN_WITH_LIMITER_DEPS,
)
async def url_vulnerability_scan(request: Request, param: UrlVulnerabilityScanRequest = Body(...), force_new: bool = Query(False), current_user=Depends(get_current_user)):
    await _validate_public_scan_target(param.domain)
    if str(param.depth).lower() == "full":
        tenant = getattr(request.state, "tenant", None)
        if current_user.role != user_role.ADMIN or not getattr(tenant, "is_default", False):
            raise HTTPException(status_code=403, detail="Full scan is restricted to root tenant administrators")
    await AuditLogManager.get_instance().search_audit(current_user, "url_vulnerability_scan", param.domain+", depth: "+param.depth)
    return await ScanJobManager.get_instance().run_tracked_scan(current_user=current_user, api_reference="netintel/url_vulnerability_scan", payload=param.model_dump(), metadata={"title": "URL Vulnerability Scan", "target": param.domain}, runner=lambda: search_manager.getInstance().network_intel(param, "url_vulnerability_scan", user_id=str(current_user.id), force_new=True), force_new=force_new)

@api_routes.post(
    "/api/stix/convert/{kind}",
    status_code=200,
    include_in_schema=False,
    dependencies=STIX_MEMBER_DEPS,
)
async def convert_stix_single(request: Request, kind: str, payload: dict = Body(...)):
    kind_normalized = kind.strip().lower()
    if kind_normalized not in STIX_KIND_VALUES:
        return {"error": "Unsupported STIX kind", "supported_kinds": sorted(STIX_KIND_VALUES)}
    return convert_to_stix(kind_normalized, payload, await _tenant_export_name(request))


@api_routes.post(
    "/api/stix/convert/{kind}/batch",
    status_code=200,
    include_in_schema=False,
    dependencies=STIX_MEMBER_DEPS,
)
async def convert_stix_batch(request: Request, kind: str, payloads: list[dict] = Body(...)):
    kind_normalized = kind.strip().lower()
    if kind_normalized not in STIX_KIND_VALUES:
        return {"error": "Unsupported STIX kind", "supported_kinds": sorted(STIX_KIND_VALUES)}
    tenant_name = await _tenant_export_name(request)
    return {"tenant_name": tenant_name, "items": [convert_to_stix(kind_normalized, payload, tenant_name) for payload in payloads]}

@api_routes.post(
    "/api/takedowns",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:defacement", bypass_licenses=["maintainer"]))],
)
async def create_takedown_request(request: TakedownCreateRequest = Body(...), current_user=Depends(get_current_user)):
    takedown_manager = TakedownManager.get_instance()
    return await takedown_manager.create_request(request, current_user)


@api_routes.get(
    "/api/takedowns",
    response_model=TakedownListResponse,
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("module:defacement", bypass_licenses=["maintainer"]))],
)
async def list_takedown_requests(status: Optional[str] = Query(None), q: str = Query(""), daterange: str = Query(""), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), current_user=Depends(get_current_user)):
    takedown_manager = TakedownManager.get_instance()
    return await takedown_manager.list_requests(
        current_user,
        status=status,
        q=q,
        page=page,
        limit=limit,
        daterange=daterange,
    )


@api_routes.post(
    "/api/takedowns/{request_id}/accept",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def accept_takedown_request(request_id: str, current_user=Depends(get_current_user)):
    takedown_manager = TakedownManager.get_instance()
    return await takedown_manager.accept_request(request_id, current_user)


@api_routes.post(
    "/api/takedowns/{request_id}/reject",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN]))],
)
async def reject_takedown_request(request_id: str, decision: Optional[TakedownDecisionRequest] = Body(None), current_user=Depends(get_current_user)):
    takedown_manager = TakedownManager.get_instance()
    return await takedown_manager.deny_request(
        request_id,
        decision or TakedownDecisionRequest(),
        current_user,
    )

@api_routes.post(
    "/api/scan-jobs/create",
    include_in_schema=False,
    dependencies=SCANNING_DEPS,
)
async def create_scan_job(request: ScanJobCreateRequest = Body(...), current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().create_job(current_user=current_user, api_reference=request.api_reference, payload=request.payload, metadata=request.metadata, force_new=request.force_new)


@api_routes.get(
    "/api/scan-jobs/notifications",
    response_model=ScanJobListResponse,
    include_in_schema=False,
    dependencies=SCANNING_DEPS,
)
async def list_scan_job_notifications(page: int = Query(1, ge=1), limit: int = Query(8, ge=1, le=100), current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().list_scan_notifications(current_user, page=page, limit=limit)


@api_routes.get(
    "/api/scan-jobs/incomplete",
    include_in_schema=False,
)
async def list_incomplete_scan_jobs(limit: int = Query(1, ge=1, le=100), current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().list_incomplete_scans(current_user, limit=limit)


@api_routes.get(
    "/api/scan-jobs/count",
    include_in_schema=False,
)
async def count_scan_jobs(current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().count_jobs(current_user)


@api_routes.get(
    "/api/scan-jobs/{scan_id}",
    response_model=ScanJobDetailResponse,
    include_in_schema=False,
    dependencies=SCANNING_DEPS,
)
async def get_scan_job(scan_id: str, current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().get_job(scan_id, current_user)


@api_routes.post(
    "/api/scan-jobs/{scan_id}/poll",
    include_in_schema=False,
    dependencies=SCANNING_DEPS,
)
async def poll_scan_job(scan_id: str, current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().poll_job(scan_id, current_user)


@api_routes.post(
    "/api/scan-jobs/seen",
    include_in_schema=False,
    dependencies=SCANNING_DEPS,
)
async def mark_scan_jobs_seen(request: ScanJobSeenRequest = Body(...), current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().mark_seen(current_user=current_user, scan_id=request.scan_id, seen_all=request.seen_all)


@api_routes.delete(
    "/api/scan-jobs/clear-all",
    include_in_schema=False,
    dependencies=SCANNING_DEPS,
)
async def delete_completed_scan_jobs(current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().delete_completed_jobs(current_user)


@api_routes.delete(
    "/api/scan-jobs/delete/{scan_id}",
    include_in_schema=False,
    dependencies=SCANNING_DEPS,
)
async def delete_scan_job(scan_id: str, current_user=Depends(get_current_user)):
    return await ScanJobManager.get_instance().delete_job(scan_id, current_user)


@api_routes.post(
    "/api/phone/universal_search",
    summary="Phone and Domain OSINT Lookup",
    tags=["Entity Scans"],
    dependencies=SCANNING_DEPS,
)
async def phone_universal_search_proxy(payload: dict = Body(...), current_user=Depends(get_current_user)):
    base_url = str(env_handler.get_instance().env("TRUSTED_MICROS_API_BASE", "") or "").strip().rstrip("/")
    if not base_url:
        raise HTTPException(status_code=500, detail="Phone lookup service is not configured")

    user_id = str(current_user.id)
    if not re.fullmatch(r"[A-Fa-f0-9]{24}", user_id):
        raise HTTPException(status_code=400, detail="Invalid user")

    def forward_to_micros():
        url = f"{base_url}/api/phone/universal_search/{user_id}"
        response = requests.post(url, json=payload, timeout=30)

        if response.status_code != 200:
            raise Exception(f"Failed with status {response.status_code}: {response.text}")

        return response.json()

    try:
        return await asyncio.to_thread(forward_to_micros)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Microservice Connection Failed: {str(e)}")


@api_routes.post(
    "/api/dkim/check",
    summary="DKIM Selector Discovery and Record Validation",
    tags=["Entity Scans"],
    dependencies=SCANNING_DEPS,
)
async def dkim_check_proxy(payload: dict = Body(...), current_user=Depends(get_current_user)):
    base_url = str(env_handler.get_instance().env("TRUSTED_MICROS_API_BASE", "") or "").strip().rstrip("/")
    if not base_url:
        raise HTTPException(status_code=500, detail="DKIM lookup service is not configured")

    user_id = str(current_user.id)
    if not re.fullmatch(r"[A-Fa-f0-9]{24}", user_id):
        raise HTTPException(status_code=400, detail="Invalid user")

    def forward_to_micros():
        url = f"{base_url}/dkim/check/{user_id}"
        response = requests.post(url, json=payload, timeout=30)

        if response.status_code != 200:
            raise Exception(f"Failed with status {response.status_code}: {response.text}")

        return response.json()

    try:
        return await asyncio.to_thread(forward_to_micros)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Microservice Connection Failed: {str(e)}")
