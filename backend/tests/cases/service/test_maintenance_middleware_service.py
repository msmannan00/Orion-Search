from __future__ import annotations

import asyncio

import pytest

from orion.api.interactive.backup_manager.maintenance_state import maintenance_state
from orion.constants.constant import CONSTANTS
from orion.middleware.middlewares.maintenance_middleware import maintenance_middleware


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def flag(tmp_path, monkeypatch):
    path = tmp_path / ".maintenance"
    monkeypatch.setattr(CONSTANTS, "MAINTENANCE_FLAG", path)
    maintenance_state.get_instance().invalidate()
    yield path
    maintenance_state.get_instance().invalidate()


class _Downstream:
    def __init__(self):
        self.calls = 0

    async def __call__(self, scope, receive, send):
        self.calls += 1
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})


def _drive(app, scope, incoming=None):
    sent = []

    async def receive():
        return (incoming or {"type": "http.request"})

    async def send(message):
        sent.append(message)

    _run(app(scope, receive, send))
    return sent


def _status_of(sent):
    for message in sent:
        if message.get("type") == "http.response.start":
            return message.get("status")
    return None


def test_requests_pass_through_when_maintenance_is_off(flag):
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    sent = _drive(app, {"type": "http", "path": "/api/search"})

    assert downstream.calls == 1
    assert _status_of(sent) == 200


def test_requests_are_rejected_with_503_during_maintenance(flag):
    flag.touch()
    maintenance_state.get_instance().invalidate()
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    sent = _drive(app, {"type": "http", "path": "/api/search"})

    assert downstream.calls == 0
    assert _status_of(sent) == 503


@pytest.mark.parametrize("path", [
    "/api/admin/backups/status",
    "/maintenance-assets/logo_url_default.png",
    "/static/maintenance.html",
    "/robots.txt",
])
def test_the_progress_and_maintenance_page_paths_stay_reachable(flag, path):
    flag.touch()
    maintenance_state.get_instance().invalidate()
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    sent = _drive(app, {"type": "http", "path": path})

    assert downstream.calls == 1
    assert _status_of(sent) == 200


@pytest.mark.parametrize("path", ["/api/public", "/api/test/ready"])
def test_readiness_probes_stay_green_during_maintenance(flag, path):
    flag.touch()
    maintenance_state.get_instance().invalidate()
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    sent = _drive(app, {"type": "http", "path": path})

    assert downstream.calls == 1
    assert _status_of(sent) == 200


def test_the_app_shell_is_blocked_so_the_maintenance_page_probe_stays_honest(flag):
    flag.touch()
    maintenance_state.get_instance().invalidate()
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    for path in ("/", "/dashboard/home"):
        sent = _drive(app, {"type": "http", "path": path})
        assert _status_of(sent) == 503, path
    assert downstream.calls == 0


def test_websocket_handshakes_are_closed_during_maintenance(flag):
    flag.touch()
    maintenance_state.get_instance().invalidate()
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    sent = _drive(app, {"type": "websocket", "path": "/api/extension/socket"}, incoming={"type": "websocket.connect"})

    assert downstream.calls == 0
    assert sent == [{"type": "websocket.close", "code": 1013}]


def test_websocket_handshakes_pass_through_when_maintenance_is_off(flag):
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    _drive(app, {"type": "websocket", "path": "/api/extension/socket"}, incoming={"type": "websocket.connect"})

    assert downstream.calls == 1


def test_lifespan_scopes_are_never_intercepted(flag):
    flag.touch()
    maintenance_state.get_instance().invalidate()
    downstream = _Downstream()
    app = maintenance_middleware(downstream)

    _drive(app, {"type": "lifespan"})

    assert downstream.calls == 1


def test_the_flag_check_is_cached_but_invalidatable(flag):
    assert maintenance_state.get_instance().is_active() is False
    flag.touch()
    assert maintenance_state.get_instance().is_active() is False
    maintenance_state.get_instance().invalidate()
    assert maintenance_state.get_instance().is_active() is True
