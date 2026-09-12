from fastapi import APIRouter, Depends
from configs.app_dependency import role_required
from orion.api.server.crawl_manager.crawl_manager import crawl_manager
from orion.services.mongo_manager.shared_model.db_auth_models import user_role
from orion.api.server.crawl_manager.class_model.CTITextRequest import CTITextRequest

micro_routes = APIRouter()


@micro_routes.post(
    "/api/cti/fetch",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.CRAWLER]))])
async def fetch_cti_label(payload: CTITextRequest, _=Depends(role_required([user_role.ADMIN, user_role.CRAWLER]))):
    return await crawl_manager.fetch_cti_label(payload)
