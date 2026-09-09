from fastapi import APIRouter, Request

from orion.api.server.sso_manager.model.sso_model import SSOCodeExchangeRequest, SSOSessionRequest
from orion.api.server.sso_manager.sso_manager import sso_manager


mail_sso_routes = APIRouter(prefix="/api/sso/mail", tags=["Orion Mail SSO"])


@mail_sso_routes.get("/authorize")
async def authorize_mail(request: Request, redirect_uri: str, state: str):
    return await sso_manager.get_instance().authorize(request, redirect_uri, state)


@mail_sso_routes.post("/exchange")
async def exchange_mail_code(request: Request, payload: SSOCodeExchangeRequest):
    return await sso_manager.get_instance().exchange(request, payload)


@mail_sso_routes.post("/session")
async def verify_mail_session(request: Request, payload: SSOSessionRequest):
    return await sso_manager.get_instance().verify(request, payload)


@mail_sso_routes.post("/revoke")
async def revoke_mail_session(request: Request, payload: SSOSessionRequest):
    return await sso_manager.get_instance().revoke(request, payload)
