from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from orion.management.managers.service_manager import service_manager


class service_ready_middleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    @staticmethod
    def _can_serve_before_services(path: str) -> bool:
        frontend_files = (
            ".css", ".js", ".map", ".ico", ".png", ".jpg", ".jpeg", ".svg",
            ".webp", ".gif", ".woff", ".woff2", ".ttf", ".json", ".txt",
        )
        return (
            path == "/"
            or path == "/robots.txt"
            or path.startswith("/assets/")
            or path.startswith("/extensions/")
            or path.startswith("/api/s/static/")
            or path.endswith(frontend_files)
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if not service_manager.get_instance().check_status() and not self._can_serve_before_services(path):
            response = JSONResponse(status_code=503, content={"detail": "Service Not Ready"})
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
