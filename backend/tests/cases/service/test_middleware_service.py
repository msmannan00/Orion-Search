from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.types import Receive, Scope, Send

from configs import config
from orion.middleware.middleware_setup import EnforceHTTPSMiddleware, setup_middlewares
from orion.middleware.middlewares.cache_admin import cache_admin
from orion.middleware.middlewares.content_block_middleware import content_block_middleware
from orion.middleware.middlewares.content_security_policy_middleware import content_security_policy_middleware
from orion.middleware.middlewares.security_headers_middleware import security_headers_middleware
from orion.middleware.middlewares.service_ready_middleware import service_ready_middleware
from orion.middleware.middlewares.tenant_resolution_middleware import tenant_resolution_middleware
from orion.middleware.middlewares.maintenance_middleware import maintenance_middleware
from routes.auth_routes import COOKIE_CIPHER


async def _noop_app(_scope: Scope, _receive: Receive, _send: Send) -> None:
    return


@asynccontextmanager
async def _client_with_middleware(middleware_cls, *, endpoint="/"):
    app = FastAPI()
    app.add_middleware(middleware_cls)

    @app.get(endpoint)
    async def _handler():
        return PlainTextResponse("ok")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client


@pytest.mark.anyio
async def test_enforce_https_middleware_updates_request_scheme():
    middleware = EnforceHTTPSMiddleware(app=_noop_app)
    captured = {}

    async def _call_next(inner_request: Request):
        captured["scheme"] = inner_request.scope["scheme"]
        return PlainTextResponse("ok")

    request = Request({"type": "http", "scheme": "http", "method": "GET", "path": "/", "headers": []})

    response = await middleware.dispatch(request, _call_next)

    assert response.status_code == 200
    assert captured["scheme"] == "https"


def test_setup_middlewares_registers_expected_stack(monkeypatch):
    monkeypatch.setattr("orion.middleware.middleware_setup.config.DEBUG", False)
    monkeypatch.setattr(
        "orion.middleware.middleware_setup.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "example.com")),
    )

    class _FakeApp:
        def __init__(self):
            self.calls = []

        def add_middleware(self, middleware, *args, **kwargs):
            self.calls.append((middleware, args, kwargs))

    app = _FakeApp()

    setup_middlewares(app)

    middlewares = [call[0] for call in app.calls]
    assert middlewares == [
        __import__("uvicorn.middleware.proxy_headers", fromlist=["ProxyHeadersMiddleware"]).ProxyHeadersMiddleware,
        EnforceHTTPSMiddleware,
        content_security_policy_middleware,
        service_ready_middleware,
        __import__("starlette.middleware.cors", fromlist=["CORSMiddleware"]).CORSMiddleware,
        __import__("starlette.middleware.trustedhost", fromlist=["TrustedHostMiddleware"]).TrustedHostMiddleware,
        security_headers_middleware,
        content_block_middleware,
        cache_admin,
        tenant_resolution_middleware,
        maintenance_middleware,
    ]
    assert app.calls[4][2]["allow_origins"] == "example.com"
    assert app.calls[5][2]["allowed_hosts"] == ["example.com", "*.example.com"]


@pytest.mark.anyio
async def test_tenant_resolution_middleware_resolves_slug_from_localhost(monkeypatch):
    tenant = SimpleNamespace(id="tenant-1", slug="google", is_default=False)

    class _FakeEngine:
        async def find_one(self, *_args, **_kwargs):
            return tenant

    monkeypatch.setattr(
        "orion.middleware.middlewares.tenant_resolution_middleware.service_manager.get_instance",
        staticmethod(lambda: SimpleNamespace(check_status=lambda: True)),
    )
    monkeypatch.setattr(
        "orion.middleware.middlewares.tenant_resolution_middleware.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "orion.org")),
    )
    monkeypatch.setattr(
        "orion.middleware.middlewares.tenant_resolution_middleware.mongo_controller.get_instance",
        staticmethod(lambda: SimpleNamespace(get_engine=lambda: _FakeEngine())),
    )

    captured = {}
    middleware = tenant_resolution_middleware(app=_noop_app)
    request = Request({
        "type": "http",
        "scheme": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"host", b"google.localhost:4200")],
    })

    async def _call_next(inner_request: Request):
        captured["tenant"] = inner_request.state.tenant
        return PlainTextResponse("ok")

    response = await middleware.dispatch(request, _call_next)

    assert response.status_code == 200
    assert captured["tenant"] is tenant


@pytest.mark.anyio
async def test_tenant_resolution_middleware_rejects_unknown_subdomain(monkeypatch):
    class _FakeEngine:
        async def find_one(self, *_args, **_kwargs):
            return None

        async def find(self, *_args, **_kwargs):
            return []

    monkeypatch.setattr(
        "orion.middleware.middlewares.tenant_resolution_middleware.service_manager.get_instance",
        staticmethod(lambda: SimpleNamespace(check_status=lambda: True)),
    )
    monkeypatch.setattr(
        "orion.middleware.middlewares.tenant_resolution_middleware.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "orion.org")),
    )
    monkeypatch.setattr(
        "orion.middleware.middlewares.tenant_resolution_middleware.mongo_controller.get_instance",
        staticmethod(lambda: SimpleNamespace(get_engine=lambda: _FakeEngine())),
    )

    middleware = tenant_resolution_middleware(app=_noop_app)
    request = Request({
        "type": "http",
        "scheme": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"host", b"missing.localhost:4200")],
    })

    async def _call_next(_inner_request: Request):
        return PlainTextResponse("ok")

    response = await middleware.dispatch(request, _call_next)

    assert response.status_code == 404


@pytest.mark.anyio
async def test_cache_admin_sets_no_cache_headers_for_admin_paths():
    async with _client_with_middleware(cache_admin, endpoint="/admin/panel") as client:
        response = await client.get("/admin/panel")

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store, must-revalidate"
    assert response.headers["Pragma"] == "no-cache"
    assert response.headers["Expires"] == "0"


@pytest.mark.anyio
async def test_content_block_middleware_redirects_dashboard_without_user(monkeypatch):
    class _FakeSessionManager:
        async def get_current_user(self, _token):
            return None

    monkeypatch.setattr(
        "orion.middleware.middlewares.content_block_middleware.session_manager.get_instance",
        staticmethod(lambda: _FakeSessionManager()),
    )

    async with _client_with_middleware(content_block_middleware, endpoint="/dashboard") as client:
        response = await client.get("/dashboard", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "/login"


@pytest.mark.anyio
async def test_content_block_middleware_allows_dashboard_with_cookie_session(monkeypatch):
    class _FakeSessionManager:
        async def get_current_user(self, token, tenant_id=None):
            assert token == "cookie-token"
            assert tenant_id is None
            return SimpleNamespace(id="user-1")

    monkeypatch.setattr(
        "orion.middleware.middlewares.content_block_middleware.session_manager.get_instance",
        staticmethod(lambda: _FakeSessionManager()),
    )

    async with _client_with_middleware(content_block_middleware, endpoint="/dashboard") as client:
        client.cookies.set("access_token", COOKIE_CIPHER.encrypt(b"cookie-token").decode())
        response = await client.get("/dashboard")

    assert response.status_code == 200
    assert response.text == "ok"


@pytest.mark.anyio
async def test_content_block_middleware_redirects_admin_to_home_when_system_flag_disabled(monkeypatch):
    class _FakeConfigController:
        async def get_cached(self, *_args, **_kwargs):
            return "0"

    monkeypatch.setattr(
        "orion.middleware.middlewares.content_block_middleware.config_controller.getInstance",
        staticmethod(lambda: _FakeConfigController()),
    )

    async with _client_with_middleware(content_block_middleware, endpoint="/admin/panel") as client:
        response = await client.get("/admin/panel", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "/"


@pytest.mark.anyio
async def test_content_block_middleware_keeps_admin_available_when_system_flag_enabled(monkeypatch):
    class _FakeConfigController:
        async def get_cached(self, *_args, **_kwargs):
            return "1"

    monkeypatch.setattr(
        "orion.middleware.middlewares.content_block_middleware.config_controller.getInstance",
        staticmethod(lambda: _FakeConfigController()),
    )

    async with _client_with_middleware(content_block_middleware, endpoint="/admin/panel") as client:
        response = await client.get("/admin/panel", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "/login"


@pytest.mark.anyio
async def test_content_security_policy_middleware_skips_docs_paths(monkeypatch):
    monkeypatch.setattr(
        "orion.middleware.middlewares.content_security_policy_middleware.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "0")),
    )

    async with _client_with_middleware(content_security_policy_middleware, endpoint="/docs") as client:
        response = await client.get("/docs")

    assert response.status_code == 200
    assert "Content-Security-Policy" not in response.headers


@pytest.mark.anyio
async def test_content_security_policy_middleware_sets_admin_headers(monkeypatch):
    monkeypatch.setattr(
        "orion.middleware.middlewares.content_security_policy_middleware.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "1")),
    )

    async with _client_with_middleware(content_security_policy_middleware, endpoint="/admin/panel") as client:
        response = await client.get("/admin/panel")

    assert response.status_code == 200
    assert "upgrade-insecure-requests" in response.headers["Content-Security-Policy"]
    assert "csp-endpoint" in response.headers["Report-To"]
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains; preload"
    assert response.headers["X-Frame-Options"] == "SAMEORIGIN"


@pytest.mark.anyio
async def test_content_security_policy_middleware_allows_openfreemap(monkeypatch):
    monkeypatch.setattr(
        "orion.middleware.middlewares.content_security_policy_middleware.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "1")),
    )

    async with _client_with_middleware(content_security_policy_middleware) as client:
        response = await client.get("/")

    policy = response.headers["Content-Security-Policy"]
    assert "img-src 'self' data: blob: https://try.orionintelligence.org https://tiles.openfreemap.org" in policy
    assert "connect-src 'self' https://tiles.openfreemap.org" in policy
    assert "basemaps.cartocdn.com" not in policy


@pytest.mark.anyio
async def test_security_headers_middleware_uses_debug_hsts_settings(monkeypatch):
    monkeypatch.setattr(
        "orion.middleware.middlewares.security_headers_middleware.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "0")),
    )
    monkeypatch.setattr(config, "SECURE_HSTS_SECONDS", 123)
    monkeypatch.setattr(config, "SECURE_CONTENT_TYPE_NOSNIFF", True)
    monkeypatch.setattr(config, "SECURE_BROWSER_XSS_FILTER", True)

    async with _client_with_middleware(security_headers_middleware) as client:
        response = await client.get("/")

    assert response.status_code == 200
    assert response.headers["Strict-Transport-Security"] == "max-age=123; includeSubDomains; preload"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"


@pytest.mark.anyio
async def test_service_ready_middleware_returns_503_when_services_not_ready(monkeypatch):
    monkeypatch.setattr(
        "orion.middleware.middlewares.service_ready_middleware.service_manager.get_instance",
        staticmethod(lambda: SimpleNamespace(check_status=lambda: False)),
    )

    app = FastAPI()
    app.add_middleware(service_ready_middleware)

    @app.get("/")
    async def _handler():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/api/public")

    assert response.status_code == 503
    assert response.json() == {"detail": "Service Not Ready"}
