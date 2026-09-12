import base64
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import HTTPException

from orion.api.interactive.case_manager.case_manager import CaseManager
from orion.api.interactive.case_manager.case_manager_helper import CaseHelperMethods
from orion.api.interactive.case_manager.models.case_models import CaseCommunicationModel
from orion.api.interactive.extension_manager.extension_socket_manager import extension_socket_manager
from orion.api.interactive.profile_manager.profile_manager import ProfileManager
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_case_model import CaseCommunication
from orion.services.mongo_manager.shared_model.db_case_model import db_case_model
from orion.services.mongo_manager.shared_model.db_case_model import utc_now


class CaseCommunicationManager:
    __instance = None

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        if CaseCommunicationManager.__instance is not None:
            raise Exception("Singleton!")
        CaseCommunicationManager.__instance = self

    @staticmethod
    def get_instance():
        if CaseCommunicationManager.__instance is None:
            CaseCommunicationManager()
        return CaseCommunicationManager.__instance

    @staticmethod
    def derive_platform(url: str) -> str:
        return (urlparse(str(url or "").strip()).hostname or "").lower().removeprefix("www.")

    @staticmethod
    def _result_scope(communication_id: str) -> str:
        return f"case-communication:{communication_id}"

    @staticmethod
    def _resolve_communication(record: db_case_model, communication_id: str) -> CaseCommunication:
        communication = next(
            (item for item in (record.communications or []) if item.communicationId == communication_id),
            None,
        )
        if communication is None:
            raise HTTPException(status_code=404, detail="Communication not found")
        return communication

    async def _load_case(self, case_id: str, current_user) -> db_case_model:
        record = await CaseHelperMethods.find_case_or_404(self._engine, case_id, current_user)
        if not CaseHelperMethods.can_view_case(record, current_user):
            raise HTTPException(status_code=403, detail="Access forbidden")
        return record

    async def _load_editable_case(self, case_id: str, current_user) -> db_case_model:
        record = await self._load_case(case_id, current_user)
        if record.isArchived:
            raise HTTPException(status_code=403, detail="Archived cases cannot be edited")
        if record.closure is not None:
            raise HTTPException(status_code=403, detail="Closed cases cannot be edited")
        return record

    async def _save_and_respond(self, record: db_case_model, enc, current_user, audit_message: str):
        record.updatedAt = utc_now()
        case_manager = CaseManager.get_instance()
        await case_manager._persist_case(record, enc, current_user, audit_message)
        return await case_manager._to_response(record, current_user)

    async def _open_for_edit(self, case_id: str, current_user) -> tuple[db_case_model, object]:
        record = await self._load_editable_case(case_id, current_user)
        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(record, lambda value: CaseHelperMethods.decrypt_value(enc, value))
        return record, enc

    async def _open_and_resolve(self, case_id: str, communication_id: str, current_user):
        record = await self._load_case(case_id, current_user)
        enc = await CaseHelperMethods.get_case_cipher(current_user)
        CaseHelperMethods.apply_sensitive_case_values(record, lambda value: CaseHelperMethods.decrypt_value(enc, value))
        communication = self._resolve_communication(record, communication_id)
        return record, enc, communication, str(current_user.id), extension_socket_manager.get_instance()

    async def add_communication(self, case_id: str, data: CaseCommunicationModel, current_user):
        record, enc = await self._open_for_edit(case_id, current_user)

        record.communications.append(CaseCommunication(
            communicationId=str(uuid4()),
            name=data.name,
            url=data.url,
            platform=self.derive_platform(data.url),
        ))

        return await self._save_and_respond(
            record, enc, current_user,
            f"Case communication added: caseId={case_id}, name={data.name}",
        )

    async def update_communication(self, case_id: str, communication_id: str, data: CaseCommunicationModel, current_user):
        record, enc = await self._open_for_edit(case_id, current_user)

        communication = self._resolve_communication(record, communication_id)
        communication.name = data.name
        communication.url = data.url
        communication.platform = self.derive_platform(data.url)

        return await self._save_and_respond(
            record, enc, current_user,
            f"Case communication updated: caseId={case_id}, communicationId={communication_id}",
        )

    async def delete_communication(self, case_id: str, communication_id: str, current_user):
        record, enc = await self._open_for_edit(case_id, current_user)

        CaseHelperMethods.delete_communication_session(self._resolve_communication(record, communication_id))
        record.communications = [
            item for item in record.communications
            if item.communicationId != communication_id
        ]

        return await self._save_and_respond(
            record, enc, current_user,
            f"Case communication deleted: caseId={case_id}, communicationId={communication_id}",
        )

    async def open_communication(self, case_id: str, communication_id: str, current_user) -> dict:
        _, enc, communication, user_key, manager = await self._open_and_resolve(case_id, communication_id, current_user)
        if not await manager.has_live_socket(user_key):
            return {"error": "extension_required"}

        command = {
            "command": "session",
            "type": self._result_scope(communication_id),
            "platform": communication.platform,
            "url": communication.url,
        }

        if communication.sessionResourceId:
            state = ProfileManager.read_session_state_file(
                CaseHelperMethods.communication_session_path(communication.sessionResourceId),
                enc,
            )
            if state is not None:
                command["url"] = str(state.get("url") or "") or communication.url
                command["payload"] = {"seed": ProfileManager._seed_payload(state)}

        await manager.fire(user_key, command)
        return {"result": {"opened": True}}

    async def save_communication_session(self, case_id: str, communication_id: str, current_user):
        record, enc, communication, user_key, manager = await self._open_and_resolve(case_id, communication_id, current_user)
        result_scope = self._result_scope(communication_id)

        reply = await manager.take_result(user_key, result_scope)
        if reply is None:
            if not await manager.is_inflight(user_key, result_scope):
                return {"error": "communication_not_open"}
            return {"status": "pending"}

        session_file, error = ProfileManager.extract_session_file(reply)
        if error:
            return error

        resource_id = communication.sessionResourceId or str(uuid4())

        try:
            path = CaseHelperMethods.communication_session_path(resource_id)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(enc.encrypt(base64.b64decode(session_file["zip_base64"])))
        except Exception:
            return {"error": "session_store_failed"}

        communication.sessionResourceId = resource_id

        case = await self._save_and_respond(
            record, enc, current_user,
            f"Case communication session saved: caseId={case_id}, communicationId={communication_id}",
        )

        return {"result": {"saved": True, "case": case}}
