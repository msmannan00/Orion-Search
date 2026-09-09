from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse

from configs.auth_cookie import sync_session_marker

interface = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
ANGULAR_BUILD_DIR = (BASE_DIR / "workspace" / "build").resolve()
CSP_NONCE_PLACEHOLDER = "__CSP_NONCE__"


def _frontend_index_response(request: Request) -> HTMLResponse:
    index_path = ANGULAR_BUILD_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found")

    html = index_path.read_text(encoding="utf-8")
    nonce = getattr(request.state, "csp_nonce", "")
    html = html.replace(CSP_NONCE_PLACEHOLDER, nonce)
    if not nonce:
        html = html.replace(' ngCspNonce=""', "").replace(' ngcspnonce=""', "").replace(' nonce=""', "")
    response = HTMLResponse(html)
    sync_session_marker(request, response)
    return response


@interface.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(request: Request, full_path: str):
    user_path = Path(full_path)
    if user_path.is_absolute() or ".." in user_path.parts:
        raise HTTPException(status_code=404, detail="Frontend not found")

    safe_relative_path = Path(*[part for part in user_path.parts if part not in ("", ".")])
    requested_path = (ANGULAR_BUILD_DIR / safe_relative_path).resolve()
    if requested_path == ANGULAR_BUILD_DIR / "index.html":
        return _frontend_index_response(request)
    if requested_path.is_relative_to(ANGULAR_BUILD_DIR) and requested_path.exists() and requested_path.is_file():
        return FileResponse(requested_path)

    if full_path.startswith("api") or full_path.startswith("auth") or full_path.startswith("crawl"):
        raise HTTPException(status_code=404, detail="API route not found")

    return _frontend_index_response(request)
