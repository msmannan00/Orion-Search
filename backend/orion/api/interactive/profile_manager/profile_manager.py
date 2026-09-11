import base64
import io
import json
import re
import zipfile
from datetime import UTC, datetime, timezone
from uuid import uuid4

from cryptography.fernet import Fernet

from fastapi import HTTPException
from fastapi.responses import Response
from bson import ObjectId
from pymongo.errors import DuplicateKeyError


from orion.api.interactive.extension_manager.extension_socket_manager import extension_socket_manager
from orion.api.interactive.profile_manager.constants.constant import MAX_SESSIONS_PER_PLATFORM, PLATFORMS_RESULT_KEY
from orion.api.interactive.profile_manager.model.models import SocialAutomationCallbackRequest, SocialPersonaCreateRequest, SocialPersonaListResponse, SocialPersonaResponse, SocialPersonaUpdateRequest, SocialProfileAssignmentRequest, SocialProfileAssignmentResponse, SocialProfileCallbackRequest, SocialProfileCallbackResponse, SocialProfileConnectRequest, SocialProfileListResponse, SocialProfileResponse, SocialProfileResultsResponse, SocialProfileUpdateRequest
from orion.constants.constant import CONSTANTS
from orion.services.encryption_manager.key_manager import KeyManager
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.shared_model.db_social_profile_management_model import ManagedSocialProfile, SocialPersona, SocialPersonaAgeGroup, SocialProfileAssignmentStatus, SocialProfileConnectionStatus, db_social_profile_management_model
from orion.services.mongo_manager.shared_model.db_social_session_model import db_social_session_model
from orion.services.mongo_manager.shared_model.db_social_automation_result_model import SocialAdDetectionResult, SocialDetectedAd, SocialPostResult, db_social_automation_result_model
from orion.services.mongo_manager.shared_model.db_auth_models import db_user_account


class ProfileManager:
    __instance = None

    def __init__(self):
        from orion.services.mongo_manager.mongo_controller import mongo_controller
        self._engine = mongo_controller.get_instance().get_engine()
        if ProfileManager.__instance is not None:
            raise Exception("This class is a singleton!")
        ProfileManager.__instance = self

    @staticmethod
    def get_instance():
        if ProfileManager.__instance is None:
            ProfileManager.__instance = ProfileManager()
        return ProfileManager.__instance

    @staticmethod
    def _user_key(current_user) -> str:
        return str(getattr(current_user, "id", "") or "")

    async def _tenant_cipher(self, current_user) -> Fernet:
        dek = await KeyManager.get_instance().get_or_create_dek(str(getattr(current_user, "tenant_uuid", "") or ""))
        return Fernet(dek)

    async def list_platforms(self, current_user):
        user_key = self._user_key(current_user)
        if not user_key:
            return {"status": "pending"}

        manager = extension_socket_manager.get_instance()
        reply = await manager.take_result(user_key, PLATFORMS_RESULT_KEY)
        if reply is None:
            await manager.fire(user_key, {"command": "platforms", "type": PLATFORMS_RESULT_KEY})
            return {"status": "pending"}

        if reply.get("error"):
            return {"error": reply.get("error")}
        items = (reply.get("items") if reply.get("implemented") else []) or []
        return {"result": {"items": items}}

    async def capture_session(self, current_user, platform: str, url: str, session_id: str = ""):
        user_key = self._user_key(current_user)
        if not user_key:
            return {"status": "pending"}

        safe_platform = re.sub(r"[^a-z0-9]", "", str(platform or "").lower())
        safe_session = re.sub(r"[^a-zA-Z0-9-]", "", str(session_id or ""))
        result_key = f"session:{platform}"

        manager = extension_socket_manager.get_instance()
        reply = await manager.take_result(user_key, result_key)
        if reply is None:
            edit_record = None
            command = {"command": "session", "type": result_key, "platform": platform, "url": url}
            if safe_session:
                edit_record = await self._engine.find_one(
                    db_social_session_model,
                    {"user_id": user_key, "platform": safe_platform, "session_id": safe_session},
                )
                if edit_record is not None:
                    state = await self._read_session_state(current_user, user_key, safe_platform, edit_record.file_name)
                    if state is not None:
                        command["url"] = str(state.get("url") or "") or url
                        command["payload"] = {"seed": self._seed_payload(state)}
            if edit_record is None:
                existing = await self._engine.count(db_social_session_model, {"user_id": user_key, "platform": safe_platform})
                if existing >= MAX_SESSIONS_PER_PLATFORM:
                    return {"error": "session_limit"}
            await manager.fire(user_key, command)
            return {"status": "pending"}

        if reply.get("error"):
            return {"error": reply.get("error")}
        items = (reply.get("items") if reply.get("implemented") else []) or []
        session_file = items[0] if items else None
        if not isinstance(session_file, dict) or not session_file.get("zip_base64"):
            return {"error": "no_session_data"}

        try:
            raw = base64.b64decode(session_file["zip_base64"])
            cipher = await self._tenant_cipher(current_user)
            session_id = uuid4().hex
            encrypted = cipher.encrypt(raw)
            existing_record: db_social_session_model | None = None
            if safe_session:
                existing_record = await self._engine.find_one(
                    db_social_session_model,
                    {"user_id": user_key, "platform": safe_platform, "session_id": safe_session},
                )
            target_session_id = existing_record.session_id if existing_record is not None else session_id
            path = CONSTANTS.S_SESSION_RESOURCE_DIR / user_key / safe_platform / f"{target_session_id}.enc"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(encrypted)
            if existing_record is not None:
                existing_record.file_name = path.name
                existing_record.byte_size = len(encrypted)
                existing_record.username = str(session_file.get("username") or existing_record.username or "")
                existing_record.verified = False
                existing_record.verify_error = ""
                existing_record.verified_at = None
                await self._engine.save(existing_record)
                session_id = target_session_id
            else:
                await self._engine.save(db_social_session_model(
                    user_id=user_key,
                    platform=safe_platform,
                    session_id=session_id,
                    file_name=path.name,
                    byte_size=len(encrypted),
                    username=str(session_file.get("username") or ""),
                ))
        except Exception:
            return {"error": "session_store_failed"}

        return {"result": {"platform": safe_platform, "session_id": session_id, "saved": True}}

    async def verify_session(self, current_user, platform: str, url: str, session_id: str):
        user_key = self._user_key(current_user)
        if not user_key:
            return {"error": "no_session_data"}

        safe_platform = re.sub(r"[^a-z0-9]", "", str(platform or "").lower())
        safe_session = re.sub(r"[^a-zA-Z0-9-]", "", str(session_id or ""))
        record = await self._engine.find_one(
            db_social_session_model,
            {"user_id": user_key, "platform": safe_platform, "session_id": safe_session},
        )
        if record is None:
            return {"error": "no_session_data"}

        manager = extension_socket_manager.get_instance()
        result_key = f"verify:{platform}"
        reply = await manager.take_result(user_key, result_key)
        if reply is None:
            if not await manager.has_live_socket(user_key):
                return await self._store_verification(record, False, "", "extension_required")
            state = await self._read_session_state(current_user, user_key, safe_platform, record.file_name)
            if state is None:
                return await self._store_verification(record, False, "", "session_unreadable")
            stored_url = str(state.get("url") or "") or url
            await manager.fire(user_key, {
                "command": "verify",
                "type": result_key,
                "platform": platform,
                "url": stored_url,
                "payload": {"url": stored_url, "session": self._seed_payload(state)},
            })
            return {"status": "pending"}

        items = (reply.get("items") if reply.get("implemented") else []) or []
        entry = items[0] if items and isinstance(items[0], dict) else {}
        verified = bool(reply.get("implemented")) and not reply.get("error")
        username = str(entry.get("username") or "")
        if verified and username:
            duplicate = await self._engine.find_one(
                db_social_session_model,
                (db_social_session_model.user_id == user_key)
                & (db_social_session_model.platform == safe_platform)
                & (db_social_session_model.username == username)
                & (db_social_session_model.session_id != record.session_id),
            )
            if duplicate is not None:
                return await self._store_verification(record, False, username, "user_already_exists")
        return await self._store_verification(record, verified, username, str(reply.get("error") or ""))

    async def _read_session_state(self, current_user, user_key: str, safe_platform: str, file_name: str) -> dict | None:
        path = CONSTANTS.S_SESSION_RESOURCE_DIR / user_key / safe_platform / file_name
        if not path.exists():
            return None
        try:
            cipher = await self._tenant_cipher(current_user)
            raw = cipher.decrypt(path.read_bytes())
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                state = json.loads(archive.read("session.json").decode("utf-8"))
        except Exception:
            return None
        state["cookies"] = [c for c in (state.get("cookies") or []) if isinstance(c, dict) and c.get("name")]
        return state

    async def get_all_social_profile_records(self) -> list[db_social_profile_management_model]:
        return await self._engine.find(db_social_profile_management_model)

    async def get_user_for_social_record(self, record: db_social_profile_management_model):
        try:
            return await self._engine.find_one(db_user_account, db_user_account.id == ObjectId(record.user_id))
        except Exception:
            return None

    async def read_profile_session_state(self, current_user, profile: ManagedSocialProfile):
        user_key = self._user_key(current_user)
        if not user_key or not profile.session_id:
            return None
        session = await self._engine.find_one(
            db_social_session_model,
            {"user_id": user_key, "platform": self._safe_platform(profile.platform), "session_id": profile.session_id},
        )
        if session is None:
            return None
        state = await self._read_session_state(current_user, user_key, session.platform, session.file_name)
        if state is None:
            log.g().w(f"Session file unreadable: {CONSTANTS.S_SESSION_RESOURCE_DIR / user_key / session.platform / session.file_name}")
        return state

    @staticmethod
    def _seed_payload(state: dict) -> dict:
        origin = (state.get("origins") or [{}])[0] if state.get("origins") else {}
        return {
            "cookies": state.get("cookies") or [],
            "localStorage": state.get("localStorage") or {},
            "sessionStorage": state.get("sessionStorage") or {},
            "indexedDB": (origin.get("indexedDB") if isinstance(origin, dict) else None) or state.get("indexedDB") or {},
            "userAgent": str(state.get("userAgent") or ""),
        }

    async def _store_verification(self, record, verified: bool, username: str, error: str):
        record.verified = verified
        record.verify_error = error
        record.verified_at = datetime.now(UTC)
        if username:
            record.username = username
        await self._engine.save(record)
        if error:
            return {"error": error}
        return {"result": {"verified": verified, "username": username or record.username}}

    async def list_sessions(self, current_user):
        user_key = self._user_key(current_user)
        records = await self._engine.find(db_social_session_model, {"user_id": user_key})

        platforms: dict[str, list] = {}
        for record in records:
            platforms.setdefault(record.platform, []).append({
                "id": record.session_id,
                "capturedAt": record.created_at.replace(tzinfo=timezone.utc).isoformat(),
                "username": record.username,
                "verified": record.verified,
                "verifyError": record.verify_error,
                "verifiedAt": record.verified_at.replace(tzinfo=timezone.utc).isoformat() if record.verified_at else None,
            })
        for sessions in platforms.values():
            sessions.sort(key=lambda item: item["capturedAt"], reverse=True)
        return {"result": {"platforms": platforms}}

    async def delete_session(self, current_user, platform: str, session_id: str):
        user_key = self._user_key(current_user)
        safe_platform = re.sub(r"[^a-z0-9]", "", str(platform or "").lower())
        safe_session = re.sub(r"[^a-zA-Z0-9-]", "", str(session_id or ""))

        record = await self._engine.find_one(
            db_social_session_model,
            {"user_id": user_key, "platform": safe_platform, "session_id": safe_session},
        )
        if record is not None:
            path = CONSTANTS.S_SESSION_RESOURCE_DIR / user_key / safe_platform / record.file_name
            if path.exists():
                path.unlink()
            await self._engine.delete(record)
            social_record = await self._engine.find_one(db_social_profile_management_model, db_social_profile_management_model.user_id == user_key)
            if social_record:
                now = datetime.now(UTC)
                changed = False
                for profile in social_record.profiles:
                    if profile.session_id == safe_session:
                        profile.session_id = None
                        profile.connection_status = SocialProfileConnectionStatus.DISCONNECTED
                        profile.updated_at = now
                        changed = True
                if changed:
                    social_record.updated_at = now
                    await self._engine.save(social_record)
        return {"result": {"deleted": True}}

    async def create_persona(self, current_user, data: SocialPersonaCreateRequest) -> SocialPersonaResponse:
        record = await self._get_or_create_social_record(current_user)
        now = datetime.now(UTC)
        persona = SocialPersona(
            persona_id=str(uuid4()),
            name=data.name.strip(),
            age_group=data.age_group,
            gender=data.gender,
            country=(data.country or "").strip() or None,
            city=(data.city or "").strip() or None,
            interests=data.interests,
            adult_status=self._adult_status(data.age_group),
            created_at=now,
            updated_at=now,
        )
        if not persona.name:
            raise HTTPException(status_code=400, detail="Persona name is required")
        self._validate_interests(persona.interests)
        record.personas.append(persona)
        record.updated_at = now
        await self._engine.save(record)
        return self._persona_response(persona)

    async def get_personas(self, current_user) -> SocialPersonaListResponse:
        user_id = str(current_user.id)
        record = await self._engine.find_one(db_social_profile_management_model, db_social_profile_management_model.user_id == user_id)
        if not record:
            return SocialPersonaListResponse()
        return SocialPersonaListResponse(personas=[self._persona_response(persona) for persona in record.personas])

    async def update_persona(self, current_user, persona_id: str, data: SocialPersonaUpdateRequest) -> SocialPersonaResponse:
        record = await self._get_or_create_social_record(current_user)
        persona = self._find_persona(record, persona_id)
        if data.name is not None:
            persona.name = data.name.strip()
            if not persona.name:
                raise HTTPException(status_code=400, detail="Persona name is required")
        if data.age_group is not None:
            persona.age_group = data.age_group
            persona.adult_status = self._adult_status(data.age_group)
        if data.gender is not None:
            persona.gender = data.gender
        if data.country is not None:
            persona.country = data.country.strip() or None
        if data.city is not None:
            persona.city = data.city.strip() or None
        if data.interests is not None:
            self._validate_interests(data.interests)
            persona.interests = data.interests
        persona.updated_at = datetime.now(UTC)
        record.updated_at = persona.updated_at
        await self._engine.save(record)
        return self._persona_response(persona)

    async def delete_persona(self, current_user, persona_id: str):
        record = await self._get_or_create_social_record(current_user)
        self._find_persona(record, persona_id)
        record.personas = [persona for persona in record.personas if persona.persona_id != persona_id]
        for profile in record.profiles:
            if profile.assigned_persona_id == persona_id:
                profile.assigned_persona_id = None
                profile.assignment_status = SocialProfileAssignmentStatus.UNASSIGNED
                profile.updated_at = datetime.now(UTC)
        record.updated_at = datetime.now(UTC)
        await self._engine.save(record)
        return {"message": "Persona deleted successfully"}

    async def connect_profile(self, current_user, data: SocialProfileConnectRequest) -> SocialProfileResponse:
        record = await self._get_or_create_social_record(current_user)
        await self._validate_profile_session(current_user, record, data.platform, data.session_id)
        now = datetime.now(UTC)
        profile = ManagedSocialProfile(
            profile_id=str(uuid4()),
            platform=self._safe_platform(data.platform),
            profile_name=(data.profile_name or "").strip() or None,
            profile_username=(data.profile_username or "").strip() or None,
            session_id=data.session_id,
            purposes=data.purposes,
            connection_status=SocialProfileConnectionStatus.CONNECTED,
            created_at=now,
            updated_at=now,
        )
        record.profiles.append(profile)
        record.updated_at = now
        await self._engine.save(record)
        return self._profile_response(profile)

    async def get_profiles(self, current_user) -> SocialProfileListResponse:
        user_id = str(current_user.id)
        record = await self._engine.find_one(db_social_profile_management_model, db_social_profile_management_model.user_id == user_id)
        if not record:
            return SocialProfileListResponse()
        return SocialProfileListResponse(profiles=[self._profile_response(profile) for profile in record.profiles])

    async def update_profile(self, current_user, profile_id: str, data: SocialProfileUpdateRequest) -> SocialProfileResponse:
        record = await self._get_or_create_social_record(current_user)
        profile = self._find_profile(record, profile_id)
        if data.profile_name is not None:
            profile.profile_name = data.profile_name.strip() or None
        if data.profile_username is not None:
            profile.profile_username = data.profile_username.strip() or None
        if data.connection_status is not None:
            profile.connection_status = data.connection_status
        if data.session_id is not None:
            await self._validate_profile_session(current_user, record, profile.platform, data.session_id, profile.profile_id)
            profile.session_id = data.session_id
            profile.connection_status = SocialProfileConnectionStatus.CONNECTED
        if data.purposes is not None:
            profile.purposes = data.purposes
        profile.updated_at = datetime.now(UTC)
        record.updated_at = profile.updated_at
        await self._engine.save(record)
        return self._profile_response(profile)

    async def delete_profile(self, current_user, profile_id: str):
        record = await self._get_or_create_social_record(current_user)
        self._find_profile(record, profile_id)
        record.profiles = [profile for profile in record.profiles if profile.profile_id != profile_id]
        record.updated_at = datetime.now(UTC)
        await self._engine.save(record)
        return {"message": "Social profile deleted successfully"}

    async def assign_profile(self, current_user, data: SocialProfileAssignmentRequest) -> SocialProfileAssignmentResponse:
        record = await self._get_or_create_social_record(current_user)
        self._find_persona(record, data.persona_id)
        profile = self._find_profile(record, data.profile_id)
        for existing_profile in record.profiles:
            if existing_profile.profile_id == profile.profile_id:
                continue
            if existing_profile.assigned_persona_id == data.persona_id and existing_profile.platform == profile.platform:
                raise HTTPException(status_code=400, detail="This persona is already assigned to a profile on the selected platform")
        profile.assigned_persona_id = data.persona_id
        profile.assignment_status = SocialProfileAssignmentStatus.ASSIGNED
        profile.updated_at = datetime.now(UTC)
        record.updated_at = profile.updated_at
        await self._engine.save(record)
        return SocialProfileAssignmentResponse(message="Persona assigned successfully", profile=self._profile_response(profile))

    async def remove_assignment(self, current_user, profile_id: str) -> SocialProfileAssignmentResponse:
        record = await self._get_or_create_social_record(current_user)
        profile = self._find_profile(record, profile_id)
        profile.assigned_persona_id = None
        profile.assignment_status = SocialProfileAssignmentStatus.UNASSIGNED
        profile.updated_at = datetime.now(UTC)
        record.updated_at = profile.updated_at
        await self._engine.save(record)
        return SocialProfileAssignmentResponse(message="Assignment removed successfully", profile=self._profile_response(profile))

    async def callback(self, current_user, data: SocialProfileCallbackRequest) -> SocialProfileCallbackResponse:
        record = await self._get_or_create_social_record(current_user)
        profile = self._find_profile(record, data.profile_id)
        if profile.platform != self._safe_platform(data.platform):
            raise HTTPException(status_code=400, detail="Profile platform mismatch")
        profile.connection_status = SocialProfileConnectionStatus.PENDING
        profile.updated_at = datetime.now(UTC)
        record.updated_at = profile.updated_at
        await self._engine.save(record)
        return SocialProfileCallbackResponse(message="Social profile callback received", profile_id=profile.profile_id, connection_status=profile.connection_status)

    async def store_automation_result(self, data: SocialAutomationCallbackRequest):
        record = await self._get_or_create_automation_result_record(data.user_id)
        now = datetime.now(UTC)

        if data.result_type == "post" and data.post_result is not None:
            result = data.post_result
            record.post_results.append(SocialPostResult(
                profile_id=result.profile_id,
                date_time=result.date_time or now,
                post_url=result.post_url,
                error=result.error,
                error_reason=result.error_reason,
                session_expired=result.session_expired,
            ))
            session_expired = result.session_expired
        elif data.result_type == "ad_detection" and data.ad_detection_result is not None:
            result = data.ad_detection_result
            record.ad_detection_results.append(SocialAdDetectionResult(
                profile_id=result.profile_id,
                date_time=result.date_time or now,
                total_detected_ads=result.total_detected_ads,
                ads=[SocialDetectedAd(
                    url=ad.url,
                    author=ad.author,
                    content_text=ad.content_text,
                    metadata=ad.metadata,
                    likes=ad.likes,
                    shares=ad.shares,
                    views=ad.views,
                    detected_at=ad.detected_at or now,
                ) for ad in result.ads],
                error=result.error,
                error_reason=result.error_reason,
                session_expired=result.session_expired,
            ))
            session_expired = result.session_expired
        else:
            log.g().e(f"Automation callback with unknown result_type: {data.result_type}")
            return {"status": "ignored"}

        record.updated_at = now
        await self._engine.save(record)

        if session_expired:
            await self._invalidate_profile_session(data.user_id, data.profile_id)

        return {"status": "success"}

    async def _get_or_create_automation_result_record(self, user_id: str) -> db_social_automation_result_model:
        record = await self._engine.find_one(db_social_automation_result_model, db_social_automation_result_model.user_id == user_id)
        if record:
            return record
        record = db_social_automation_result_model(user_id=user_id)
        try:
            await self._engine.save(record)
        except DuplicateKeyError:
            record = await self._engine.find_one(db_social_automation_result_model, db_social_automation_result_model.user_id == user_id)
            if record:
                return record
            raise
        return record

    async def _invalidate_profile_session(self, user_id: str, profile_id: str):
        record = await self._engine.find_one(db_social_profile_management_model, db_social_profile_management_model.user_id == user_id)
        if record is None:
            return
        profile = next((item for item in record.profiles if item.profile_id == profile_id), None)
        if profile is None or not profile.session_id:
            return
        session = await self._engine.find_one(
            db_social_session_model,
            {"user_id": user_id, "platform": self._safe_platform(profile.platform), "session_id": profile.session_id},
        )
        if session is None:
            return
        session.verified = False
        await self._engine.save(session)
        log.g().i(f"Social session {session.session_id} marked unverified after expired session on profile {profile_id}")

    async def get_profile_results(self, current_user, profile_id: str) -> SocialProfileResultsResponse:
        user_id = str(current_user.id)
        record = await self._engine.find_one(db_social_profile_management_model, db_social_profile_management_model.user_id == user_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Social profile not found")
        self._find_profile(record, profile_id)

        results = await self._engine.find_one(db_social_automation_result_model, db_social_automation_result_model.user_id == user_id)
        if results is None:
            return SocialProfileResultsResponse(profile_id=profile_id)

        return SocialProfileResultsResponse(
            profile_id=profile_id,
            ad_detection_results=sorted([item for item in results.ad_detection_results if item.profile_id == profile_id], key=lambda item: item.date_time, reverse=True),
            post_results=sorted([item for item in results.post_results if item.profile_id == profile_id], key=lambda item: item.date_time, reverse=True),
        )

    async def _get_or_create_social_record(self, current_user) -> db_social_profile_management_model:
        user_id = str(current_user.id)
        record = await self._engine.find_one(db_social_profile_management_model, db_social_profile_management_model.user_id == user_id)
        if record:
            return record
        record = db_social_profile_management_model(user_id=user_id)
        try:
            await self._engine.save(record)
        except DuplicateKeyError:
            record = await self._engine.find_one(db_social_profile_management_model, db_social_profile_management_model.user_id == user_id)
            if record:
                return record
            raise
        return record

    async def _validate_profile_session(self, current_user, record: db_social_profile_management_model, platform: str, session_id: str | None, ignored_profile_id: str = "") -> None:
        if not session_id:
            raise HTTPException(status_code=400, detail="Session is required")
        safe_platform = self._safe_platform(platform)
        for profile in record.profiles:
            if profile.profile_id != ignored_profile_id and profile.session_id == session_id:
                raise HTTPException(status_code=400, detail="This session is already assigned to another profile")
        session = await self._engine.find_one(db_social_session_model, {"user_id": str(current_user.id), "platform": safe_platform, "session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found for selected platform")

    def _safe_platform(self, platform: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(platform or "").lower())

    def _find_persona(self, record: db_social_profile_management_model, persona_id: str) -> SocialPersona:
        for persona in record.personas:
            if persona.persona_id == persona_id:
                return persona
        raise HTTPException(status_code=404, detail="Persona not found")

    def _find_profile(self, record: db_social_profile_management_model, profile_id: str) -> ManagedSocialProfile:
        for profile in record.profiles:
            if profile.profile_id == profile_id:
                return profile
        raise HTTPException(status_code=404, detail="Social profile not found")

    def _adult_status(self, age_group: SocialPersonaAgeGroup) -> bool:
        return age_group != SocialPersonaAgeGroup.AGE_13_17

    def _validate_interests(self, interests: list[str]) -> None:
        if len(interests or []) > 3:
            raise HTTPException(status_code=400, detail="A persona can have up to 3 interests")

    def _persona_response(self, persona: SocialPersona) -> SocialPersonaResponse:
        return SocialPersonaResponse(**persona.model_dump())

    def _profile_response(self, profile: ManagedSocialProfile) -> SocialProfileResponse:
        return SocialProfileResponse(**profile.model_dump())

    async def trigger_post_monitoring(self, current_user, persona_id: str):
        from orion.services.mongo_manager.shared_model.db_cronjob_status_model import db_cronjob_status_model
        cron_record = await self._engine.find_one(db_cronjob_status_model, db_cronjob_status_model.job_name == "social_loop")
        if cron_record and cron_record.status == "running":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Daily run scheduler is currently running. Please try again 5 minutes later.")

        record = await self._get_or_create_social_record(current_user)
        persona = self._find_persona(record, persona_id)
        
        now = datetime.now(UTC)
        if persona.last_manual_post_trigger:
            if persona.last_manual_post_trigger.date() == now.date():
                from fastapi import HTTPException
                raise HTTPException(status_code=400, detail="Manual post can only be triggered once a day for a persona.")
                
        persona.last_manual_post_trigger = now
        await self._engine.save(record)
        
        from orion.management.jobs.social_profile.social_profile_job import social_profile_job
        job = social_profile_job.get_instance()
        
        import uuid
        from orion.helper_manager.env_handler import env_handler
        
        for profile in record.profiles:
            if profile.assigned_persona_id == persona_id and profile.session_id:
                session_state = await self.read_profile_session_state(current_user, profile)
                if session_state:
                    task_id = str(uuid.uuid4())
                    if env_handler.get_instance().env("PRODUCTION", "0") == "1":
                        base_url = env_handler.get_instance().env("ORION_WEB_INTERNAL_URL")
                    else:
                        base_url = "http://trusted-web-main:8070"
                    cb_url = f"{base_url}/api/social/automation/callback?task_id={task_id}"
                    
                    import asyncio
                    asyncio.create_task(job.run_posting(profile, persona, session_state, cb_url, record.user_id))
                    
        return {"status": "success", "message": "Post monitoring triggered"}

    async def trigger_ad_monitoring(self, current_user, persona_id: str):
        from orion.services.mongo_manager.shared_model.db_cronjob_status_model import db_cronjob_status_model
        cron_record = await self._engine.find_one(db_cronjob_status_model, db_cronjob_status_model.job_name == "social_loop")
        if cron_record and cron_record.status == "running":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Daily run scheduler is currently running. Please try again 5 minutes later.")

        record = await self._get_or_create_social_record(current_user)
        persona = self._find_persona(record, persona_id)
        
        from orion.management.jobs.social_profile.social_profile_job import social_profile_job
        job = social_profile_job.get_instance()
        
        import uuid
        from orion.helper_manager.env_handler import env_handler
        
        for profile in record.profiles:
            if profile.assigned_persona_id == persona_id and profile.session_id:
                session_state = await self.read_profile_session_state(current_user, profile)
                if session_state:
                    task_id = str(uuid.uuid4())
                    if env_handler.get_instance().env("PRODUCTION", "0") == "1":
                        base_url = env_handler.get_instance().env("ORION_WEB_INTERNAL_URL")
                    else:
                        base_url = "http://trusted-web-main:8070"
                    cb_url = f"{base_url}/api/social/automation/callback?task_id={task_id}"
                    
                    import asyncio
                    asyncio.create_task(job.run_ad_monitoring(profile, persona, session_state, cb_url, record.user_id))
                    
        return {"status": "success", "message": "Ad monitoring triggered"}
