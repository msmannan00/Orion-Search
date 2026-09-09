import httpx
from fastapi.responses import StreamingResponse
from starlette.responses import JSONResponse

from orion.api.server.nexus_manager.model.nexus_chat_model import NexusTextAnalysisRequest, ReportChatRequest
from orion.api.server.nexus_manager.nexus_chat_gateway import nexus_chat_gateway
from orion.api.server.nexus_manager.stream_manager import NexusStreamManager
from orion.helper_manager.env_handler import env_handler


class nexus_manager:
    __instance = None

    @classmethod
    def getInstance(cls):
        if cls.__instance is None:
            cls()
        return cls.__instance

    def __init__(self):
        self.base_url = (env_handler.get_instance().env("DARKNEXUS_API_BASE") or "http://trusted-nexus-api:8030").strip().rstrip("/")
        self.stream_manager = NexusStreamManager(self.base_url)
        if type(self).__instance is None:
            type(self).__instance = self

    async def parse_chat(self, model: ReportChatRequest, user_id: str = "system", auth_token: str = ""):
        try:
            session_id = str(model.session_id or "").strip()
            session_type = str(model.session_type or "persistent").strip() or "persistent"
            gateway = nexus_chat_gateway.getInstance()
            request_id = str(model.request_id or "").strip()
            resuming = self.stream_manager.has_stream(user_id, request_id)
            if gateway.is_temporary_session(session_id):
                if not resuming:
                    await self.cancel_chat(user_id=user_id)
                session_id = await gateway.ensure_shared_session(user_id) or session_id
            stream = self.stream_manager.stream_response(
                model.message,
                user_id=user_id,
                tool=model.tool or "open_chat",
                type_name=model.type or "default",
                session_id=session_id,
                session_type=session_type,
                auth_token=auth_token,
                request_id=request_id,
            )
            return StreamingResponse(stream, media_type="application/x-ndjson", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Something happened while calling api/chat"})

    async def cancel_chat(self, user_id: str = "system"):
        return await self.stream_manager.cancel_chat(user_id=user_id)

    async def analyze_text(self, model: NexusTextAnalysisRequest, user_id: str = "system"):
        try:
            payload = model.model_dump()
            payload["job_id"] = payload.get("job_id") or user_id

            async with httpx.AsyncClient() as client:
                response = await client.post(f"{self.base_url}/ocr_classifier/analyze_text", json=payload, timeout=120)
                if response.status_code != 200:
                    return JSONResponse(status_code=response.status_code, content={"detail": "Something happened while calling ocr_classifier/analyze_text"})
                return response.json()
        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Something happened while calling ocr_classifier/analyze_text"})
