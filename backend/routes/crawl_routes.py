from typing import List

from fastapi import APIRouter, Body, Depends, File, Form, Request, UploadFile

from configs.app_dependency import default_tenant_required, get_current_user, license_required, role_required, status_required
from configs.limiter_dependency import limiter_dependency
from orion.api.interactive.feeder_manager.feeder_manager import FeederManager
from orion.api.interactive.feeder_manager.models.feeder_models import FeederOwnerTransferRequest, FeederScriptStatusUpdateRequest, FeederValueDeleteRequest
from orion.api.interactive.siemlog_manager.siem_log_manager import SiemLogManager
from orion.api.server.crawl_manager.class_model.__init__ import *
from orion.api.server.crawl_manager.class_model.entity_model import entity_model
from orion.api.server.crawl_manager.crawl_manager import crawl_manager
from orion.api.server.entity_manager.entity_manager import entity_manager
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, user_role

crawl_routes = APIRouter()

_leak_deps = [
    Depends(role_required([user_role.ADMIN, user_role.CRAWLER])),
    Depends(limiter_dependency),
]


@crawl_routes.post(
    "/api/index/injection",
    status_code=200,
    response_model=InjectionBatchResponseModel,
    dependencies=[Depends(status_required([UserStatus.ACTIVE])), Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def index_injection(payload: InjectionBatchRequestModel = Body(...), current_user=Depends(get_current_user)):
    return await SiemLogManager.get_instance().inject_logs(payload, current_user)


@crawl_routes.get(
    "/api/feeder/{index_type}",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER]))])
async def feeder(index_type: str):
    return await crawl_manager.getInstance().invoke_fetch_feeder(index_type)


@crawl_routes.get(
    "/api/parser",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER]))])
async def parser():
    return await crawl_manager.getInstance().invoke_fetch_parser()


@crawl_routes.get(
    "/api/profile/feeder/catalog",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def get_feeder_catalog(current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().get_catalog(current_user)


@crawl_routes.get(
    "/api/profile/feeder/scripts",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.MEMBER, user_role.ANALYST])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def get_feeder_scripts(rule_key: str | None = None, entry_type: str | None = None, page: int = 1, limit: int = 1000, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().list_scripts(current_user, rule_key=rule_key, page=page, limit=limit, entry_type=entry_type)


@crawl_routes.get(
    "/api/profile/feeder/users",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def get_feeder_owner_users(_current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().list_owner_users()


@crawl_routes.post(
    "/api/profile/feeder/scripts/clear-all",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def clear_feeder_scripts(rule_key: str, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().clear_scripts(rule_key, current_user)


@crawl_routes.post(
    "/api/profile/feeder/scripts/enable-all",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def enable_feeder_scripts(rule_key: str, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().set_rule_enabled(rule_key, True, current_user)


@crawl_routes.post(
    "/api/profile/feeder/scripts/disable-all",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def disable_feeder_scripts(rule_key: str, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().set_rule_enabled(rule_key, False, current_user)


@crawl_routes.post(
    "/api/profile/feeder/scripts/{script_id}/delete",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def delete_feeder_script(script_id: str, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().delete_script(script_id, current_user)


@crawl_routes.post(
    "/api/profile/feeder/scripts/{script_id}/delete-value",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def delete_feeder_value(script_id: str, data: FeederValueDeleteRequest, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().delete_value(script_id, data, current_user)


@crawl_routes.post(
    "/api/profile/feeder/scripts/{script_id}/delete-all-values",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def delete_all_feeder_values(script_id: str, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().delete_all_values(script_id, current_user)


@crawl_routes.post(
    "/api/profile/feeder/scripts/{script_id}/toggle",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def toggle_feeder_script(script_id: str, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().toggle_script_enabled(script_id, current_user)


@crawl_routes.post(
    "/api/profile/feeder/scripts/{script_id}/owner",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def transfer_feeder_script_owner(script_id: str, data: FeederOwnerTransferRequest, current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().transfer_script_owner(script_id, data, current_user)


@crawl_routes.post(
    "/api/profile/feeder/upload",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN])), Depends(default_tenant_required), Depends(license_required("module:feeder"))], )
async def upload_feeder_script(rule_key: str = Form(...), mode: str = Form(...), values_text: str | None = Form(None), file: UploadFile | None = File(None), session_file: UploadFile | None = File(None), current_user=Depends(get_current_user)):
    return await FeederManager.get_instance().upload_script(rule_key, mode, file, values_text, session_file, current_user)


@crawl_routes.post(
    "/api/feeder/status",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def update_feeder_script_status(data: FeederScriptStatusUpdateRequest):
    return await FeederManager.get_instance().update_script_status_by_name(data)


async def _index(request: Request, model_cls, invoke_fn):
    body = await request.json()
    return await invoke_fn(model_cls(**body))


@crawl_routes.post("/api/index/leak", dependencies=_leak_deps)
async def index_leak_data(request: Request):
    instance = crawl_manager.getInstance()
    return await _index(request, LeakDataModel, instance.invoke_leak_index)


@crawl_routes.post("/api/index/news", dependencies=_leak_deps)
async def index_news_data(request: Request):
    instance = crawl_manager.getInstance()
    return await _index(request, LeakDataModel, instance.invoke_news_index)


@crawl_routes.post("/api/index/tracking", dependencies=_leak_deps)
async def index_tracking_data(request: Request):
    instance = crawl_manager.getInstance()
    return await _index(request, LeakDataModel, instance.invoke_tracking_index)


@crawl_routes.post("/api/index/exploit", dependencies=_leak_deps)
async def index_exploit_data(request: Request):
    instance = crawl_manager.getInstance()
    return await _index(request, ExploitDataModel, instance.invoke_exploit_index)


@crawl_routes.post("/api/index/apt", dependencies=_leak_deps)
async def index_apt_data(request: Request):
    instance = crawl_manager.getInstance()
    return await _index(request, AptDataModel, instance.invoke_apt_index)


@crawl_routes.post("/api/index/malware", dependencies=_leak_deps)
async def index_malware_data(request: Request):
    instance = crawl_manager.getInstance()
    return await _index(request, MalwareDataModel, instance.invoke_malware_index)


@crawl_routes.post(
    "/api/index/defacement",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def index_defacement_data(request: Request):
    body = await request.json()
    return await crawl_manager.getInstance().invoke_defacement_index(DefacementDataModel(**body))


@crawl_routes.post(
    "/api/screenshot",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def screenshot(payload: ScreenshotPayload, _=Depends(role_required([user_role.ADMIN, user_role.CRAWLER]))):
    return await crawl_manager.getInstance().invoke_file_upload(payload)


@crawl_routes.post(
    "/api/index/generic",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def index_generic(request: Request):
    body = await request.json()
    return await crawl_manager.getInstance().invoke_generic_index(GeneralDataModel(**body))


@crawl_routes.post(
    "/api/nlp/parse",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def parse_text(payload: nlp_data_model):
    return await crawl_manager.getInstance().parse_chat(payload)


@crawl_routes.post(
    "/api/index/chat",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def index_chat_data(request: Request):
    body = await request.json()
    return await crawl_manager.getInstance().invoke_chat_index(chat_data_model(**body))


@crawl_routes.post("/api/index/social", dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER]))])
async def index_social_data(request: Request):
    body = await request.json()
    return await crawl_manager.getInstance().invoke_social_index(social_data_model(**body))


@crawl_routes.post("/api/index/swarm", dependencies=[Depends(limiter_dependency)])
async def index_swarm_data(request: Request):
    return await crawl_manager.getInstance().proxy_swarm_index(request)


@crawl_routes.post("/api/index/sanctions", dependencies=_leak_deps)
async def index_sanctions_data(request: Request):
    instance = crawl_manager.getInstance()
    body = await request.json()

    if isinstance(body, dict) and isinstance(body.get("m_data"), list):
        records = [
            open_sanctions_data_model(**item).model_dump(by_alias=True)
            for item in body["m_data"] if isinstance(item, dict)
        ]
        return await instance.invoke_sanctions_index(records)

    if isinstance(body, dict) and isinstance(body.get("m_chat_data"), list):
        records = [
            open_sanctions_data_model(**item).model_dump(by_alias=True)
            for item in body["m_chat_data"] if isinstance(item, dict)
        ]
        return await instance.invoke_sanctions_index(records)

    if isinstance(body, list):
        records = [
            open_sanctions_data_model(**item).model_dump(by_alias=True)
            for item in body if isinstance(item, dict)
        ]
        return await instance.invoke_sanctions_index(records)

    return await instance.invoke_sanctions_index(open_sanctions_data_model(**body))


@crawl_routes.post(
    "/api/index/entity",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def index_entities(_: Request, entities: List[entity_model] = Body(...)):
    results = []
    for entity in entities:
        result = await entity_manager.get_instance().create_or_update_entity_nodes(entity)
        results.append(result)
    return results


@crawl_routes.post(
    "/api/index/stealerlog",
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER])), Depends(limiter_dependency)])
async def index_stealerlog(model: LogBatchModel):
    return await crawl_manager.getInstance().invoke_stealerlog_index(model)
