from typing import Any, Optional
from urllib.parse import quote

import httpx
from fastapi.responses import JSONResponse, Response

from orion.helper_manager.env_handler import env_handler

SHARED_SESSION_TITLE = "Orion Shared Session"
TEMPORARY_SESSION_PREFIX = "temp:"


class nexus_chat_gateway:
    __instance = None

    @staticmethod
    def getInstance():
        if nexus_chat_gateway.__instance is None:
            nexus_chat_gateway()
        return nexus_chat_gateway.__instance

    def __init__(self):
        if nexus_chat_gateway.__instance is not None:
            return

        self._shared_sessions: dict[str, str] = {}
        nexus_chat_gateway.__instance = self

    def _base_url(self) -> str:
        return (
            env_handler.get_instance().env("DARKNEXUS_API_BASE")
            or "http://trusted-nexus-api:8030"
        ).strip().rstrip("/")

    def _headers(self, current_user) -> dict[str, str]:
        return {
            "X-User-Id": str(current_user.id),
        }

    async def _request(self, method: str, path: str, current_user, json_body: Optional[dict[str, Any]] = None):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=method,
                    url=f"{self._base_url()}{path}",
                    headers=self._headers(current_user),
                    json=json_body,
                    timeout=120,
                )

            try:
                content = response.json()
            except Exception:
                content = {"detail": response.text or "Empty response from Nexus"}

            if response.status_code < 200 or response.status_code >= 300:
                return JSONResponse(
                    status_code=response.status_code,
                    content=content,
                )

            return JSONResponse(
                status_code=response.status_code,
                content=content,
            )

        except Exception:
            return JSONResponse(
                status_code=500,
                content={"detail": "Something happened while calling Nexus chat service"},
            )

    async def _raw_request(self, method: str, path: str, user_id: str, json_body: Optional[dict[str, Any]] = None) -> tuple[int, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.request(method=method, url=f"{self._base_url()}{path}", headers={"X-User-Id": str(user_id)}, json=json_body, timeout=120)
        try:
            return response.status_code, response.json()
        except Exception:
            return response.status_code, None

    @staticmethod
    def is_temporary_session(session_id: str) -> bool:
        session_id = str(session_id or "").strip()
        return not session_id or session_id.startswith(TEMPORARY_SESSION_PREFIX)

    async def ensure_shared_session(self, user_id: str) -> str:
        cached = self._shared_sessions.get(str(user_id))
        if cached:
            status_code, _ = await self._raw_request("GET", f"/v1/chats/{cached}", user_id)
            if 200 <= status_code < 300:
                return cached
            self._shared_sessions.pop(str(user_id), None)

        status_code, listing = await self._raw_request("GET", "/v1/chats", user_id)
        if 200 <= status_code < 300 and isinstance(listing, list):
            for chat in listing:
                if isinstance(chat, dict) and str(chat.get("title") or "") == SHARED_SESSION_TITLE:
                    session_id = str(chat.get("session_id") or chat.get("_id") or "")
                    if session_id:
                        self._shared_sessions[str(user_id)] = session_id
                        return session_id

        status_code, created = await self._raw_request("POST", "/v1/chats", user_id, {"title": SHARED_SESSION_TITLE})
        if 200 <= status_code < 300 and isinstance(created, dict):
            session_id = str(created.get("session_id") or created.get("_id") or "")
            if session_id:
                self._shared_sessions[str(user_id)] = session_id
                return session_id
        return ""

    async def create_chat(self, payload: dict[str, Any], current_user):
        return await self._request(
            method="POST",
            path="/v1/chats",
            current_user=current_user,
            json_body=payload,
        )

    async def list_chats(self, current_user):
        status_code, listing = await self._raw_request("GET", "/v1/chats", str(current_user.id))
        if 200 <= status_code < 300 and isinstance(listing, list):
            listing = [chat for chat in listing if not (isinstance(chat, dict) and str(chat.get("title") or "") == SHARED_SESSION_TITLE)]
        return JSONResponse(status_code=status_code, content=listing if listing is not None else {"detail": "Empty response from Nexus"})

    async def delete_all_chats(self, current_user):
        return await self._request(
            method="DELETE",
            path="/v1/chats",
            current_user=current_user,
        )

    async def get_chat(self, session_id: str, current_user):
        return await self._request(
            method="GET",
            path=f"/v1/chats/{session_id}",
            current_user=current_user,
        )

    async def get_chat_history(self, payload: dict[str, Any], current_user):
        return await self._request(method="POST", path="/v1/chats/history/get", current_user=current_user, json_body=payload)

    async def update_chat_history(self, payload: dict[str, Any], current_user):
        return await self._request(method="POST", path="/v1/chats/history/update", current_user=current_user, json_body=payload)

    async def send_message(self, session_id: str, payload: dict[str, Any], current_user):
        return await self._request(
            method="POST",
            path=f"/v1/chats/{session_id}/messages",
            current_user=current_user,
            json_body=payload,
        )

    async def rename_chat(self, session_id: str, payload: dict[str, Any], current_user):
        return await self._request(
            method="PUT",
            path=f"/v1/chats/{session_id}",
            current_user=current_user,
            json_body=payload,
        )

    async def delete_chat(self, session_id: str, current_user):
        return await self._request(
            method="DELETE",
            path=f"/v1/chats/{session_id}",
            current_user=current_user,
        )

    async def download_user_file(self, file_name: str, current_user, auth_token: str = ""):
        try:
            headers = self._headers(current_user)
            auth_token = str(auth_token or "").strip()
            if auth_token:
                headers["Authorization"] = auth_token if auth_token.casefold().startswith("bearer ") else f"Bearer {auth_token}"
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://host.docker.internal:8300/downloads/{quote(file_name, safe='')}",
                    headers=headers,
                    timeout=1500,
                )
            if response.status_code != 200:
                return JSONResponse(status_code=response.status_code, content={"detail": response.text or "File not found."})
            response_headers = {
                name: response.headers[name]
                for name in ("content-disposition", "cache-control", "x-content-type-options")
                if response.headers.get(name)
            }
            return Response(content=response.content, media_type=response.headers.get("content-type") or "application/octet-stream", headers=response_headers)
        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Something happened while downloading Nexus file"})

    async def import_github_repo(self, session_id: str, payload: dict[str, Any], current_user):
        return await self._request(
            method="POST",
            path=f"/v1/chats/{session_id}/workspace/github/import",
            current_user=current_user,
            json_body=payload,
        )

    async def get_workspace_status(self, session_id: str, current_user):
        return await self._request(
            method="GET",
            path=f"/v1/chats/{session_id}/workspace/status",
            current_user=current_user,
        )

    async def get_workspace_tree(self, session_id: str, current_user, folder_path: str = ""):
        encoded_path = quote(folder_path, safe="")

        return await self._request(
            method="GET",
            path=f"/v1/chats/{session_id}/workspace/tree?path={encoded_path}",
            current_user=current_user,
        )

    async def read_workspace_file(self, session_id: str, current_user, file_path: str, start_line: int = 1, line_count: int = 1000):
        encoded_path = quote(file_path, safe="")

        return await self._request(
            method="GET",
            path=(
                f"/v1/chats/{session_id}/workspace/file"
                f"?path={encoded_path}"
                f"&start_line={start_line}"
                f"&line_count={line_count}"
            ),
            current_user=current_user,
        )
