from datetime import datetime
from datetime import timezone
import hashlib

from cryptography.fernet import Fernet

from orion.constants.constant import CONSTANTS
from orion.services.encryption_manager.key_manager import KeyManager
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName
from orion.services.mongo_manager.shared_model.db_auth_models import user_role
from orion.services.mongo_manager.shared_model.db_case_model import CaseCommunication
from orion.services.mongo_manager.shared_model.db_case_model import CaseEntity
from orion.services.mongo_manager.shared_model.db_case_model import db_case_model


class CaseHelperMethods:
    @staticmethod
    def actor_id(current_user) -> str:
        return str(current_user.id)

    @staticmethod
    def is_admin(current_user) -> bool:
        role = getattr(current_user.role, "value", str(current_user.role))
        return role == user_role.ADMIN.value

    @staticmethod
    def is_maintainer(current_user) -> bool:
        licenses = {
            getattr(license_value, "value", str(license_value))
            for license_value in (current_user.licenses or [])
        }
        return LicenseName.MAINTAINER.value in licenses

    @staticmethod
    def can_view_case(record: db_case_model, current_user) -> bool:
        current_actor_id = CaseHelperMethods.actor_id(current_user)
        return (
            CaseHelperMethods.is_maintainer(current_user)
            or record.createdBy == current_actor_id
            or current_actor_id in (record.assignedAnalystIds or [])
        )

    @staticmethod
    def can_manage_case_assignments(record: db_case_model, current_user) -> bool:
        return (
            CaseHelperMethods.is_maintainer(current_user)
            or CaseHelperMethods.is_admin(current_user)
            or record.createdBy == CaseHelperMethods.actor_id(current_user)
        )

    @staticmethod
    def can_comment(record: db_case_model, current_user) -> bool:
        current_actor_id = CaseHelperMethods.actor_id(current_user)
        return (
            CaseHelperMethods.is_maintainer(current_user)
            or CaseHelperMethods.is_admin(current_user)
            or record.createdBy == current_actor_id
            or current_actor_id in (record.assignedAnalystIds or [])
        )

    @staticmethod
    def can_close_case(record: db_case_model, current_user) -> bool:
        return (
            CaseHelperMethods.is_maintainer(current_user)
            or CaseHelperMethods.is_admin(current_user)
            or record.createdBy == CaseHelperMethods.actor_id(current_user)
        )

    @staticmethod
    def can_share_case(record: db_case_model, current_user) -> bool:
        return (
            CaseHelperMethods.is_maintainer(current_user)
            or CaseHelperMethods.is_admin(current_user)
            or record.createdBy == CaseHelperMethods.actor_id(current_user)
        )

    @staticmethod
    def hash_share_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def as_aware_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    async def get_case_cipher_by_tenant_id(tenant_id: str) -> Fernet:
        dek = await KeyManager.get_instance().get_or_create_dek(tenant_id)
        return Fernet(dek)

    @staticmethod
    async def get_case_cipher(current_user) -> Fernet:
        return await CaseHelperMethods.get_case_cipher_by_tenant_id(str(current_user.tenant_uuid))

    @staticmethod
    def encrypt_value(enc: Fernet, value: str) -> str:
        if not value:
            return value
        return enc.encrypt(value.encode()).decode()

    @staticmethod
    def decrypt_value(enc: Fernet, value: str) -> str:
        if not value:
            return value
        try:
            return enc.decrypt(value.encode()).decode()
        except Exception:
            return value

    @staticmethod
    def communication_session_path(resource_id: str):
        return CONSTANTS.S_SESSION_RESOURCE_DIR / "case_communications" / f"{resource_id}.enc"

    @staticmethod
    def delete_communication_session(communication: CaseCommunication) -> None:
        if not communication.sessionResourceId:
            return
        CaseHelperMethods.communication_session_path(communication.sessionResourceId).unlink(missing_ok=True)

    @staticmethod
    def sanitize_communication(communication: CaseCommunication) -> dict:
        return {
            "communicationId": communication.communicationId,
            "name": communication.name,
            "url": communication.url,
            "platform": communication.platform,
            "hasSession": bool(communication.sessionResourceId),
        }

    @staticmethod
    def apply_sensitive_case_values(record: db_case_model, transform) -> None:
        record.title = transform(record.title)
        record.description = transform(record.description)
        record.caseTypeOtherValue = transform(record.caseTypeOtherValue)
        record.intakeSourceOtherValue = transform(record.intakeSourceOtherValue)

        for entity in record.entities or []:
            entity.value = transform(entity.value)
            entity.entityDescription = transform(entity.entityDescription)
            entity.entityTypeOtherValue = transform(entity.entityTypeOtherValue)
            entity.entitySourceOtherValue = transform(entity.entitySourceOtherValue)
            CaseHelperMethods.apply_sensitive_entity_values(entity, transform)

        for artifact in record.artifacts or []:
            artifact.title = transform(artifact.title)
            artifact.description = transform(artifact.description)
            artifact.url = transform(artifact.url)
            artifact.artifactTypeOtherValue = transform(artifact.artifactTypeOtherValue)
            artifact.artifactSourceOtherValue = transform(artifact.artifactSourceOtherValue)
            artifact.linkedReportTitle = transform(artifact.linkedReportTitle)


            for artifact_file in artifact.files or []:
                artifact_file.fileName = transform(artifact_file.fileName)
                artifact_file.fileType = transform(artifact_file.fileType)
                artifact_file.fileResourceId = transform(artifact_file.fileResourceId)


        for comment in record.comments or []:
            comment.body = transform(comment.body)

        for task in record.tasks or []:
            task.title = transform(task.title)
            task.description = transform(task.description)

        for linked_case in record.linkedCases or []:
            linked_case.reason = transform(linked_case.reason)

        for communication in record.communications or []:
            communication.name = transform(communication.name)
            communication.url = transform(communication.url)

        if record.closure:
            record.closure.summary = transform(record.closure.summary)
            record.closure.resolution = transform(record.closure.resolution)
            record.closure.closureReasonOtherValue = transform(
                record.closure.closureReasonOtherValue
            )

    @staticmethod
    def apply_sensitive_entity_values(entity: CaseEntity, transform) -> None:
        for identifier in entity.identifiers or []:
            identifier.value = transform(identifier.value)
            identifier.issuer = transform(identifier.issuer)
            identifier.identifierTypeOtherValue = transform(
                identifier.identifierTypeOtherValue
            )

        for profile in entity.socialProfiles or []:
            profile.username = transform(profile.username)
            profile.profileUrl = transform(profile.profileUrl)
            profile.displayName = transform(profile.displayName)
            profile.platformOtherValue = transform(profile.platformOtherValue)
    
    @staticmethod
    def is_analyst(current_user) -> bool:
        role = getattr(current_user.role, "value", str(current_user.role))
        return role == user_role.ANALYST.value


    @staticmethod
    def normalize_case_for_analyst_compare(value):
        if value is None:
            return None

        if hasattr(value, "model_dump"):
            value = value.model_dump()

        if isinstance(value, list):
            return [CaseHelperMethods.normalize_case_for_analyst_compare(item) for item in value]

        if isinstance(value, dict):
            ignored_keys = {
                "id",
                "tenant_uuid",
                "caseId",
                "statusReasons",
                "comments",
                "tasks",
                "createdAt",
                "updatedAt",
                "createdBy",
                "updatedBy",
                "closedAt",
                "isArchived",
                "archivedAt",
                "archivedBy",
                "uploadedAt",
            }

            return {
                key: CaseHelperMethods.normalize_case_for_analyst_compare(val)
                for key, val in value.items()
                if key not in ignored_keys
            }

        return value
