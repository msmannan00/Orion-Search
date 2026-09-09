import secrets

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from orion.helper_manager.env_handler import env_handler


class content_security_policy_middleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.DEBUG = env_handler.get_instance().env("PRODUCTION", "0") != "1"

    async def dispatch(self, request: Request, call_next):
        request.state.csp_nonce = secrets.token_urlsafe(16)
        response: Response = await call_next(request)

        if any(
                path in request.url.path for path in
                ["/docs", "/redoc", "/openapi.json", "/npm/swagger-ui-dist@5/swagger-ui.css",
                    "/npm/swagger-ui-dist@5/swagger-ui-bundle.js"]):
            return response

        if request.url.path.startswith("/admin"):
            response.headers["Content-Security-Policy"] = ("default-src 'self' data: blob:; "
                                                           "script-src 'self' 'unsafe-inline';"
                                                           "style-src 'self' 'unsafe-inline' *; "
                                                           "img-src 'self' data: *; "
                                                           "font-src 'self' *; "
                                                           "connect-src 'self' *; "
                                                           "media-src 'self' *; "
                                                           "frame-src *; "
                                                           "frame-ancestors *; "
                                                           "object-src *; "
                                                           "form-action *; "
                                                           "base-uri 'self'; "
                                                           f"{'upgrade-insecure-requests; ' if not self.DEBUG else ''}"
                                                           "report-to csp-endpoint;")
        elif self.DEBUG:
            response.headers["Content-Security-Policy"] = ("default-src 'self' data: blob:; "
                                                           "script-src 'self' 'unsafe-inline' https://js.arcgis.com; "
                                                           "script-src-elem 'self' 'unsafe-inline' https://js.arcgis.com; "
                                                           "script-src-attr 'none'; "
                                                           "style-src 'self' 'unsafe-inline' https://js.arcgis.com; "
                                                           "style-src-elem 'self' 'unsafe-inline' https://js.arcgis.com; "
                                                           "style-src-attr 'unsafe-inline'; "
                                                           "img-src 'self' data: blob: http: https:; "
                                                           "font-src 'self' data: https://js.arcgis.com; "
                                                           "connect-src 'self' http: https: ws: wss:; "
                                                           "media-src 'self' data: blob:; "
                                                           "worker-src 'self' blob:; "
                                                           "frame-ancestors 'self'; "
                                                           "object-src 'none'; "
                                                           "form-action 'self'; "
                                                           "base-uri 'self'; "
                                                           "report-to csp-endpoint;")
        elif request.url.path.startswith("/dashboard/social-mapper"):
            response.headers["Content-Security-Policy"] = ("default-src 'self'; "
                                                           "script-src 'self'; "
                                                           "script-src-elem 'self'; "
                                                           "script-src-attr 'none'; "
                                                           "style-src 'self'; "
                                                           "style-src-elem 'self'; "
                                                           "style-src-attr 'none'; "
                                                           "img-src 'self' data: https:; "
                                                           "font-src 'self'; "
                                                           "connect-src 'self'; "
                                                           "media-src 'self'; "
                                                           "frame-ancestors 'self'; "
                                                           "object-src 'none'; "
                                                           "form-action 'self'; "
                                                           "base-uri 'self'; "
                                                           "report-to csp-endpoint;")
        elif request.url.path.startswith("/dashboard/social-intel"):
            response.headers["Content-Security-Policy"] = ("default-src 'self'; "
                                                           "script-src 'self'; "
                                                           "script-src-elem 'self'; "
                                                           "script-src-attr 'none'; "
                                                           "style-src 'self' 'unsafe-inline'; "
                                                           "style-src-elem 'self' 'unsafe-inline'; "
                                                           "style-src-attr 'unsafe-inline'; "
                                                           "img-src 'self' data: blob: http: https:; "
                                                           "font-src 'self' data: http: https:; "
                                                           "connect-src 'self' http: https: ws: wss:; "
                                                           "media-src 'self' data: blob: http: https:; "
                                                           "frame-src http: https:; "
                                                           "worker-src 'self' blob:; "
                                                           "frame-ancestors 'self'; "
                                                           "object-src 'none'; "
                                                           "form-action 'self'; "
                                                           "base-uri 'self'; "
                                                           "report-to csp-endpoint;")
        else:
            response.headers["Content-Security-Policy"] = ("default-src 'self'; "
                                                           "script-src 'self' 'wasm-unsafe-eval' https://js.arcgis.com; "
                                                           "script-src-elem 'self' https://js.arcgis.com; "
                                                           "script-src-attr 'none'; "
                                                           "style-src 'self' 'unsafe-inline' https://js.arcgis.com; "
                                                           "style-src-elem 'self' 'unsafe-inline' https://js.arcgis.com; "
                                                           "style-src-attr 'unsafe-inline'; "
                                                           "img-src 'self' data: blob: https://try.orionintelligence.org https://tiles.openfreemap.org https://*.arcgis.com https://*.arcgisonline.com; "
                                                           "font-src 'self' data: https://js.arcgis.com; "
                                                           "connect-src 'self' https://tiles.openfreemap.org https://js.arcgis.com https://*.arcgis.com https://*.arcgisonline.com; "
                                                           "media-src 'self'; "
                                                           "worker-src 'self' blob:; "
                                                           "frame-ancestors 'self'; "
                                                           "object-src 'none'; "
                                                           "form-action 'self'; "
                                                           "base-uri 'self'; "
                                                           "report-to csp-endpoint;")

        response.headers["Report-To"] = ('{"group":"csp-endpoint",'
                                         '"max_age":10886400,'
                                         '"endpoints":[{"url":"https://try.orionintelligence.org/csp-report-endpoint/"}]}')

        if not self.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        response.headers["Permissions-Policy"] = ("accelerometer=(), "
                                                  "camera=(), "
                                                  "geolocation=(), "
                                                  "gyroscope=(), "
                                                  "magnetometer=(), "
                                                  "microphone=(), "
                                                  "payment=(), "
                                                  "usb=(), "
                                                  "fullscreen=(), "
                                                  "xr-spatial-tracking=()")

        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response
