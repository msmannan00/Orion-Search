from fastapi import APIRouter, Body, Depends, Query

from configs.app_dependency import get_current_user, license_required, role_required, status_required
from orion.api.interactive.graph_manager.graphs_model import graphs_model
from orion.services.mongo_manager.shared_model.db_auth_models import UserStatus, user_role

graph_routes = APIRouter(dependencies=[Depends(status_required([UserStatus.ACTIVE]))])


@graph_routes.post(
    "/api/graph/session/upsert",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced", "social_mapper"]))])
async def upsert_graph_session(data: dict = Body(...), graph_type: str = Query("graph"), current_user=Depends(get_current_user)):
    gt = (data or {}).get("graph_type") or graph_type or "graph"
    return await graphs_model.getInstance().upsert_data(str(current_user.id), gt, data)


@graph_routes.get(
    "/api/graph/session/tabs",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced", "social_mapper"]))])
async def get_graph_tabs(graph_type: str = Query("graph"), current_user=Depends(get_current_user)):
    return await graphs_model.getInstance().get_tabs_summary(str(current_user.id), graph_type)


@graph_routes.post(
    "/api/graph/session/tab/add",
    include_in_schema=False,
    dependencies=[Depends(role_required([user_role.ADMIN, user_role.DEMO, user_role.MEMBER, user_role.ANALYST])), Depends(license_required("scanning", bypass_licenses=["osint_advanced"]))])
async def add_graph_tab(tab: dict = Body(...), graph_type: str = Query("graph"), current_user=Depends(get_current_user)):
    gt = (tab or {}).get("graph_type") or graph_type or "graph"
    return await graphs_model.getInstance().add_tab(str(current_user.id), gt, tab)
