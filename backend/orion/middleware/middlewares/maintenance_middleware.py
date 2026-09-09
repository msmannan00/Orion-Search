from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from orion.api.interactive.backup_manager.maintenance_state import maintenance_state


class maintenance_middleware:
    EXEMPT_PATHS = frozenset({
        "/api/public",
        "/api/test/ready",
        "/api/admin/backups/status",
        "/robots.txt",
    })

    EXEMPT_PREFIXES = (
        "/maintenance-assets/",
        "/static/maintenance",
        "/api/s/static/system/",
    )

    def __init__(self, app: ASGIApp):
        self.app = app

    @classmethod
    def _is_exempt(cls, path: str) -> bool:
        return path in cls.EXEMPT_PATHS or path.startswith(cls.EXEMPT_PREFIXES)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        scope_type = scope.get("type")
        if scope_type not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        if not maintenance_state.get_instance().is_active() or self._is_exempt(scope.get("path", "")):
            await self.app(scope, receive, send)
            return

        if scope_type == "websocket":
            await receive()
            await send({"type": "websocket.close", "code": 1013})
            return

        response = JSONResponse(status_code=503, content={"detail": "Service Unavailable For Maintenance"})
        await response(scope, receive, send)
