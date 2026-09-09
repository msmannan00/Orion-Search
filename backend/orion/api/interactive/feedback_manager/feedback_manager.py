from datetime import UTC, datetime, timedelta
from typing import Any

from bson import ObjectId
from fastapi import HTTPException
from cryptography.fernet import Fernet

from orion.api.interactive.search_manager.search_model import search_model
from orion.services.encryption_manager.key_manager import KeyManager
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_auth_models import db_user_account, user_role
from orion.services.mongo_manager.shared_model.db_document_feedback_model import (
    FeedbackTrustState,
    DocumentFeedbackComment,
    DocumentFeedbackReaction,
    db_document_feedback_model,
)
from orion.services.mongo_manager.shared_model.db_tenant_model import db_tenant_model


class FeedbackManager:
    __instance = None

    @staticmethod
    def get_instance():
        if FeedbackManager.__instance is None:
            FeedbackManager.__instance = FeedbackManager()
        return FeedbackManager.__instance

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        if FeedbackManager.__instance is not None:
            raise Exception("This class is a singleton!")
        FeedbackManager.__instance = self

    @staticmethod
    async def _get_tenant_id_for_user_id(user_id: str) -> str:
        if not user_id:
            return ""
        try:
            user = await mongo_controller.get_instance().get_engine().find_one(db_user_account, db_user_account.id == ObjectId(user_id))
        except Exception:
            return ""
        return str(getattr(user, "tenant_uuid", "") or "") if user else ""

    async def _get_public_profile(self, user_id: str, current_user) -> dict:
        user = await self._engine.find_one(db_user_account, db_user_account.id == ObjectId(user_id))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if current_user.role != user_role.ADMIN and str(user.tenant_uuid) != str(current_user.tenant_uuid):
            raise HTTPException(status_code=403, detail="You are not allowed to access this user")

        preferences = user.preferences if isinstance(user.preferences, dict) else {}
        if str(getattr(current_user, "id", "")) != user_id and preferences.get("profile_visible") is False:
            return {
                "hidden": True,
                "message": "Profile hidden by user",
            }

        tenant_name = ""
        tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(user.tenant_uuid))
        if tenant and str(getattr(current_user, "id", "")) != user_id and getattr(tenant, "profile_visibility_enabled", True) is False:
            return {
                "hidden": True,
                "message": "Profile hidden by tenant",
            }
        if tenant:
            dek = await KeyManager.get_instance().get_or_create_dek(str(tenant.id))
            enc = Fernet(dek)
            try:
                tenant_name = enc.decrypt(tenant.name.encode()).decode() if tenant.name else ""
            except Exception:
                tenant_name = ""

        return {
            "hidden": False,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "tenant_name": tenant_name,
            "licenses": [item.value if hasattr(item, "value") else str(item) for item in (user.licenses or [])],
        }

    @staticmethod
    async def _serialize_comment(comment: DocumentFeedbackComment) -> dict:
        decrypted_comment = ""
        is_deleted = bool(getattr(comment, "is_deleted", False))
        tenant_id = await FeedbackManager._get_tenant_id_for_user_id(str(getattr(comment, "user_id", "") or ""))
        if tenant_id and comment.comment and not is_deleted:
            try:
                dek = await KeyManager.get_instance().get_or_create_dek(tenant_id)
                decrypted_comment = Fernet(dek).decrypt(comment.comment.encode()).decode()
            except Exception:
                decrypted_comment = ""
        return {
            "user_id": comment.user_id,
            "username": comment.username,
            "comment": decrypted_comment,
            "is_deleted": is_deleted,
            "created_at": comment.created_at.isoformat(),
            "updated_at": comment.updated_at.isoformat(),
        }

    @staticmethod
    def _serialize_reaction(reaction: DocumentFeedbackReaction) -> dict:
        return {
            "user_id": reaction.user_id,
            "username": reaction.username,
            "recommended": reaction.recommended,
            "trust_state": reaction.trust_state.value if reaction.trust_state else None,
            "created_at": reaction.created_at.isoformat(),
            "updated_at": reaction.updated_at.isoformat(),
        }

    @staticmethod
    def _get_user_reaction(doc: db_document_feedback_model, current_user) -> DocumentFeedbackReaction | None:
        current_user_id = str(getattr(current_user, "id", ""))
        for reaction in doc.reactions:
            if reaction.user_id == current_user_id:
                return reaction
        return None

    @staticmethod
    def _truncate(value: str, limit: int = 180) -> str:
        value = (value or "").strip()
        if len(value) <= limit:
            return value
        return value[: limit - 3].rstrip() + "..."

    @staticmethod
    def _pick_title(data: dict[str, Any]) -> str:
        for key in ("m_title", "m_name", "m_channel_name", "m_sender_name", "m_message_id", "m_url", "m_weblink", "m_web_url", "m_base_url", "m_channel_url"):
            value = data.get(key, "")
            if value:
                return str(value)
        return ""

    @staticmethod
    def _pick_preview(data: dict[str, Any]) -> str:
        for key in ("m_content", "m_important_content", "m_meta_description"):
            value = data.get(key, "")
            if value:
                return FeedbackManager._truncate(str(value))
        return ""

    @staticmethod
    def _pick_date(data: dict[str, Any]) -> str:
        for key in ("m_date", "m_update_date", "m_creation_date"):
            value = data.get(key, "")
            if value:
                return str(value)
        return ""

    async def _resolve_doc_summary(self, doc_id: str) -> dict:
        candidates = [
            ("leak_model", "leak", lambda: search_model.getInstance().request_leak_doc(doc_id, None)),
            ("generic_model", "general", lambda: search_model.getInstance().request_general_doc(doc_id, None)),
            ("exploit_model", "exploit", lambda: search_model.getInstance().request_exploit_doc(doc_id, None)),
            ("apt_model", "apt", lambda: search_model.getInstance().request_apt_doc(doc_id, None)),
            ("malware_model", "malware", lambda: search_model.getInstance().request_malware_doc(doc_id, None)),
            ("chat_model", "chat", lambda: search_model.getInstance().request_chat_doc(doc_id, None)),
            ("social_model", "social", lambda: search_model.getInstance().request_social_doc(doc_id, None)),
            ("defacement_model", "defacement", lambda: search_model.getInstance().request_defacement_doc(doc_id)),
        ]

        for index_name, route_segment, loader in candidates:
            try:
                data = await loader()
            except HTTPException as exc:
                if exc.status_code == 404:
                    data = None
                else:
                    data = None
            except Exception:
                data = None

            if not isinstance(data, dict):
                continue

            return {
                "title": self._pick_title(data) or doc_id,
                "preview": self._pick_preview(data),
                "report_date": self._pick_date(data),
                "route_path": f"/dashboard/profile/consolidated/{route_segment}/{doc_id}",
                "route_query": {"ci": index_name},
                "index_name": index_name,
            }

        return {
            "title": doc_id,
            "preview": "",
            "report_date": "",
            "route_path": "",
            "route_query": {},
            "index_name": "",
        }

    @staticmethod
    async def _serialize(doc: db_document_feedback_model, current_user=None) -> dict:
        current_user_reaction = FeedbackManager._get_user_reaction(doc, current_user) if current_user else None
        return {
            "doc_id": doc.doc_id,
            "recommended_count": doc.recommended_count,
            "trust_count": doc.trust_count,
            "untrust_count": doc.untrust_count,
            "comments": [await FeedbackManager._serialize_comment(comment) for comment in doc.comments],
            "reactions": [FeedbackManager._serialize_reaction(reaction) for reaction in doc.reactions],
            "current_user_reaction": FeedbackManager._serialize_reaction(current_user_reaction) if current_user_reaction else None,
            "can_react": True,
            "created_at": doc.created_at.isoformat(),
            "updated_at": doc.updated_at.isoformat(),
        }

    async def _get_or_create(self, doc_id: str) -> db_document_feedback_model:
        doc = await self._engine.find_one(db_document_feedback_model, {"doc_id": doc_id})
        if doc is None:
            doc = db_document_feedback_model(doc_id=doc_id)
        return doc

    async def get_feedback(self, doc_id: str, current_user=None) -> dict:
        doc = await self._get_or_create(doc_id)
        if doc.id is None:
            doc = await self._engine.save(doc)
        return await self._serialize(doc, current_user)

    async def _save_reaction(self, doc_id: str, current_user, recommended=False, trust_state: FeedbackTrustState | None = None) -> dict:
        doc = await self._get_or_create(doc_id)
        if doc.id is None:
            doc = await self._engine.save(doc)

        now = datetime.now(UTC)
        existing_reaction = self._get_user_reaction(doc, current_user)
        if existing_reaction is None:
            existing_reaction = DocumentFeedbackReaction(
                user_id=str(current_user.id),
                username=getattr(current_user, "username", ""),
                recommended=False,
                trust_state=None,
                created_at=now,
                updated_at=now,
            )
            doc.reactions.append(existing_reaction)

        existing_reaction.username = getattr(current_user, "username", "")

        if recommended:
            if existing_reaction.recommended:
                existing_reaction.recommended = False
                doc.recommended_count = max(0, doc.recommended_count - 1)
            else:
                existing_reaction.recommended = True
                doc.recommended_count += 1

        if trust_state == FeedbackTrustState.TRUST:
            if existing_reaction.trust_state == FeedbackTrustState.TRUST:
                existing_reaction.trust_state = None
                doc.trust_count = max(0, doc.trust_count - 1)
            else:
                if existing_reaction.trust_state == FeedbackTrustState.UNTRUST:
                    doc.untrust_count = max(0, doc.untrust_count - 1)
                existing_reaction.trust_state = FeedbackTrustState.TRUST
                doc.trust_count += 1

        if trust_state == FeedbackTrustState.UNTRUST:
            if existing_reaction.trust_state == FeedbackTrustState.UNTRUST:
                existing_reaction.trust_state = None
                doc.untrust_count = max(0, doc.untrust_count - 1)
            else:
                if existing_reaction.trust_state == FeedbackTrustState.TRUST:
                    doc.trust_count = max(0, doc.trust_count - 1)
                existing_reaction.trust_state = FeedbackTrustState.UNTRUST
                doc.untrust_count += 1

        if not existing_reaction.recommended and existing_reaction.trust_state is None:
            doc.reactions = [reaction for reaction in doc.reactions if reaction.user_id != existing_reaction.user_id]
        else:
            existing_reaction.updated_at = now

        doc.updated_at = now
        saved = await self._engine.save(doc)
        return await self._serialize(saved, current_user)

    async def increment_recommended(self, doc_id: str, current_user) -> dict:
        return await self._save_reaction(doc_id, current_user, recommended=True)

    async def increment_trust(self, doc_id: str, current_user) -> dict:
        return await self._save_reaction(doc_id, current_user, trust_state=FeedbackTrustState.TRUST)

    async def increment_untrust(self, doc_id: str, current_user) -> dict:
        return await self._save_reaction(doc_id, current_user, trust_state=FeedbackTrustState.UNTRUST)

    async def add_comment(self, doc_id: str, comment: str, current_user) -> dict:
        doc = await self._get_or_create(doc_id)
        now = datetime.now(UTC)
        current_user_id = str(current_user.id)
        one_hour_ago = now - timedelta(hours=1)
        for existing_comment in doc.comments:
            if getattr(existing_comment, "is_deleted", False):
                continue
            created_at = existing_comment.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=UTC)
            if existing_comment.user_id == current_user_id and created_at >= one_hour_ago:
                raise HTTPException(status_code=429, detail="Only one comment per hour is allowed.")
        encrypted_comment = comment.strip()
        tenant_id = await self._get_tenant_id_for_user_id(current_user_id)
        if tenant_id and encrypted_comment:
            dek = await KeyManager.get_instance().get_or_create_dek(tenant_id)
            encrypted_comment = Fernet(dek).encrypt(encrypted_comment.encode()).decode()
        doc.comments.insert(0, DocumentFeedbackComment(
            user_id=current_user_id,
            username=getattr(current_user, "username", ""),
            comment=encrypted_comment,
            created_at=now,
            updated_at=now,
        ))
        doc.updated_at = now
        saved = await self._engine.save(doc)
        return await self._serialize(saved, current_user)

    async def delete_comment(self, doc_id: str, comment_created_at: str, current_user) -> dict:
        doc = await self._get_or_create(doc_id)
        current_user_id = str(current_user.id)
        now = datetime.now(UTC)
        target = None
        for comment in doc.comments:
            if comment.created_at.isoformat() == comment_created_at:
                target = comment
                break
        if target is None:
            raise HTTPException(status_code=404, detail="Comment not found")
        if target.user_id != current_user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own comments")
        target.is_deleted = True
        target.comment = ""
        target.updated_at = now
        doc.updated_at = now
        saved = await self._engine.save(doc)
        return await self._serialize(saved, current_user)

    async def get_user_activity(self, user_id: str) -> list[dict]:
        docs = await self._engine.find(
            db_document_feedback_model,
            {"$or": [{"comments.user_id": user_id}, {"reactions.user_id": user_id}]},
        )

        activity = []
        for doc in docs:
            user_reaction = next((reaction for reaction in doc.reactions if reaction.user_id == user_id), None)
            user_comments = [comment for comment in doc.comments if comment.user_id == user_id and not getattr(comment, "is_deleted", False)]
            summary = await self._resolve_doc_summary(doc.doc_id)

            latest_reaction_at = ""
            reaction_recommended = False
            reaction_trust_state = None
            if user_reaction is not None:
                latest_reaction_at = user_reaction.updated_at.isoformat()
                reaction_recommended = bool(user_reaction.recommended)
                reaction_trust_state = user_reaction.trust_state.value if user_reaction.trust_state else None
            latest_comment_at = user_comments[0].created_at.isoformat() if user_comments else ""
            latest_activity_at = max([value for value in (latest_reaction_at, latest_comment_at) if value], default="")

            activity.append({
                "doc_id": doc.doc_id,
                "recommended": reaction_recommended,
                "trust_state": reaction_trust_state,
                "comments_count": len(user_comments),
                "latest_reaction_at": latest_reaction_at,
                "latest_comment_at": latest_comment_at,
                "latest_activity_at": latest_activity_at,
                **summary,
            })

        activity.sort(key=lambda item: item.get("latest_activity_at") or "", reverse=True)
        return activity

    async def get_public_user_activity(self, user_id: str, current_user) -> dict:
        profile = await self._get_public_profile(user_id, current_user)
        if profile.get("hidden"):
            return {
                "profile": profile,
                "activity": [],
            }

        return {
            "profile": profile,
            "activity": await self.get_user_activity(user_id),
        }
