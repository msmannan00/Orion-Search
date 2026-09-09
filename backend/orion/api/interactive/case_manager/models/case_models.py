from datetime import datetime
import re
from typing import List
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from orion.services.mongo_manager.shared_model.db_case_model import ArtifactType
from orion.services.mongo_manager.shared_model.db_case_model import CaseLinkRelationship
from orion.services.mongo_manager.shared_model.db_case_model import CaseTag
from orion.services.mongo_manager.shared_model.db_case_model import CaseType
from orion.services.mongo_manager.shared_model.db_case_model import ClosureReason
from orion.services.mongo_manager.shared_model.db_case_model import EntityRole
from orion.services.mongo_manager.shared_model.db_case_model import CaseStatus
from orion.services.mongo_manager.shared_model.db_case_model import EntityType
from orion.services.mongo_manager.shared_model.db_case_model import IdentifierType
from orion.services.mongo_manager.shared_model.db_case_model import IntakeSource
from orion.services.mongo_manager.shared_model.db_case_model import Priority
from orion.services.mongo_manager.shared_model.db_case_model import Severity
from orion.services.mongo_manager.shared_model.db_case_model import SocialPlatform
from orion.services.mongo_manager.shared_model.db_case_model import SourceType
from orion.services.mongo_manager.shared_model.db_case_model import TaskStatus
from orion.services.mongo_manager.shared_model.db_case_model import EntityConfidence


def validate_other_value(selected_value, other_value: str, field_name: str) -> None:
    if getattr(selected_value, "value", selected_value) == "other" and not other_value.strip():
        raise ValueError(f"{field_name} other value is required")


class CaseRequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SocialMediaProfileModel(CaseRequestModel):
    platform: SocialPlatform
    platformOtherValue: str = ""
    username: str
    profileUrl: str = ""
    displayName: str = ""

    @model_validator(mode="after")
    def validate_other_fields(self):
        validate_other_value(self.platform, self.platformOtherValue, "Social platform")
        return self


class AdditionalIdentifierModel(CaseRequestModel):
    type: IdentifierType
    identifierTypeOtherValue: str = ""
    value: str
    issuer: str = ""
    verified: bool = False

    @model_validator(mode="after")
    def validate_other_fields(self):
        validate_other_value(self.type, self.identifierTypeOtherValue, "Identifier type")
        return self


class CaseEntityModel(CaseRequestModel):
    entityId: str
    type: EntityType
    entityTypeOtherValue: str = ""
    value: str
    entityDescription: str = ""
    role: EntityRole = Field(default=EntityRole.RELATED)
    linkedEntityId: str = ""
    confidence: EntityConfidence = Field(default=EntityConfidence.HIGH)
    source: SourceType = Field(default=SourceType.MANUAL)
    entitySourceOtherValue: str = ""
    identifiers: List[AdditionalIdentifierModel] = Field(default_factory=list)
    socialProfiles: List[SocialMediaProfileModel] = Field(default_factory=list)
    tags: List[CaseTag] = Field(default_factory=list)

    @field_validator("entityId", "value")
    @classmethod
    def validate_required_entity_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Entity ID and value are required")
        return value

    @model_validator(mode="after")
    def validate_other_fields(self):
        validate_other_value(self.type, self.entityTypeOtherValue, "Entity type")
        validate_other_value(self.source, self.entitySourceOtherValue, "Entity source")
        return self
    
class CaseArtifactFileModel(CaseRequestModel):
    fileId: str = ""
    fileName: str = ""
    fileType: str = ""
    fileSize: int = 0
    fileResourceId: str = ""
    fileHash: str = ""
    integrityStatus: str = "unknown"
    uploadedAt: Optional[datetime] = None

class CaseArtifactModel(CaseRequestModel):
    artifactId: str = ""
    type: ArtifactType = Field(default=ArtifactType.EVIDENCE)
    artifactTypeOtherValue: str = ""
    title: str = ""
    description: str = ""
    source: SourceType = Field(default=SourceType.MANUAL)
    artifactSourceOtherValue: str = ""
    url: str = ""
    files: List[CaseArtifactFileModel] = Field(default_factory=list)
    linkedReportSource: str = ""
    linkedReportId: str = ""
    linkedReportTitle: str = ""
    entityIds: List[str] = Field(default_factory=list)
    tags: List[CaseTag] = Field(default_factory=list)
    capturedAt: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_other_fields(self):
        validate_other_value(self.type, self.artifactTypeOtherValue, "Artifact type")
        validate_other_value(
            self.source, self.artifactSourceOtherValue, "Artifact source"
        )
        return self


class CaseCommentModel(CaseRequestModel):
    commentId: str = ""
    body: str
    entityIds: List[str] = Field(default_factory=list)
    artifactIds: List[str] = Field(default_factory=list)


class CaseTaskModel(CaseRequestModel):
    taskId: str = ""
    title: str
    description: str = ""
    status: TaskStatus = Field(default=TaskStatus.OPEN)
    priority: Priority = Field(default=Priority.MEDIUM)
    assignedTo: str = ""
    dueAt: Optional[datetime] = None
    entityIds: List[str] = Field(default_factory=list)
    artifactIds: List[str] = Field(default_factory=list)


class CaseLinkModel(CaseRequestModel):
    targetCaseId: str
    relationship: CaseLinkRelationship = Field(default=CaseLinkRelationship.RELATED)
    reason: str


class CaseClosureModel(CaseRequestModel):
    reason: ClosureReason
    closureReasonOtherValue: str = ""
    summary: str = ""
    resolution: str = ""

    @model_validator(mode="after")
    def validate_other_fields(self):
        validate_other_value(
            self.reason, self.closureReasonOtherValue, "Closure reason"
        )
        return self


def validate_case_primary_entity(model):
    validate_other_value(model.caseType, model.caseTypeOtherValue, "Case type")
    validate_other_value(
        model.intakeSource, model.intakeSourceOtherValue, "Intake source"
    )

    if not model.entities:
        raise ValueError("At least one case entity is required")

    primary_entity = next(
        (
            entity
            for entity in model.entities
            if entity.entityId == model.primaryEntityId
        ),
        None,
    )
    if not primary_entity:
        raise ValueError("Primary entity ID must match one of the case entities")
    if primary_entity.role != EntityRole.PRIMARY:
        raise ValueError("Primary entity must have role primary")

    return model


class CaseMutationRequest(CaseRequestModel):
    title: str
    description: str = ""
    caseType: CaseType = Field(default=CaseType.OTHER)
    caseTypeOtherValue: str = ""
    status: CaseStatus = Field(default=CaseStatus.NEW)
    severity: Severity = Field(default=Severity.LOW)
    priority: Priority = Field(default=Priority.LOW)
    intakeSource: IntakeSource = Field(default=IntakeSource.MANUAL)
    intakeSourceOtherValue: str = ""
    tags: List[CaseTag] = Field(default_factory=list)
    primaryEntityId: str
    assignedAnalystIds: List[str] = Field(default_factory=list)
    artifacts: List[CaseArtifactModel] = Field(default_factory=list)
    entities: List[CaseEntityModel] = Field(default_factory=list)
    tasks: List[CaseTaskModel] = Field(default_factory=list)
    linkedCases: List[CaseLinkModel] = Field(default_factory=list)
    closure: Optional[CaseClosureModel] = None

    @model_validator(mode="after")
    def validate_primary_entity(self):
        return validate_case_primary_entity(self)


class CreateCaseRequest(CaseMutationRequest):
    caseId: str
    comments: List[CaseCommentModel] = Field(default_factory=list)

    @field_validator("caseId", "title", "primaryEntityId")
    @classmethod
    def validate_required_case_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Case ID, title, and primary entity ID are required")
        return value


class UpdateCaseRequest(CaseMutationRequest):
    comments: Optional[List[CaseCommentModel]] = None

    @field_validator("title", "primaryEntityId")
    @classmethod
    def validate_required_update_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title and primary entity ID are required")
        return value


class CaseResponse(BaseModel):
    id: str
    viewerId: str = ""
    viewerRole: str = ""
    caseId: str
    tenant_uuid: str
    assignedAnalysts: List[dict] = Field(default_factory=list)
    title: str
    description: str = ""
    caseType: CaseType = Field(default=CaseType.OTHER)
    caseTypeOtherValue: str = ""
    status: CaseStatus = Field(default=CaseStatus.NEW)
    statusReasons: List[dict] = Field(default_factory=list)
    severity: Severity = Field(default=Severity.LOW)
    priority: Priority = Field(default=Priority.LOW)
    intakeSource: IntakeSource = Field(default=IntakeSource.MANUAL)
    intakeSourceOtherValue: str = ""
    tags: List[CaseTag] = Field(default_factory=list)
    createdBy: str = ""
    assignedAnalystIds: List[str] = Field(default_factory=list)
    primaryEntityId: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    closedAt: Optional[datetime] = None
    isArchived: bool = False
    archivedAt: Optional[datetime] = None
    archivedBy: str = ""
    artifacts: List[dict] = Field(default_factory=list)
    entities: List[dict] = Field(default_factory=list)
    comments: List[dict] = Field(default_factory=list)
    tasks: List[dict] = Field(default_factory=list)
    linkedCases: List[dict] = Field(default_factory=list)
    closure: Optional[dict] = None


class CreateCaseShareRequest(CaseRequestModel):
    expiresInHours: int = Field(default=168, ge=1, le=720)


class CaseShareResponse(BaseModel):
    shareId: str
    token: str
    path: str
    expiresAt: datetime


class UpdateCaseStatusRequest(CaseRequestModel):
    status: CaseStatus
    reason: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Status change reason is required")
        return value


class AssignCaseAnalystRequest(CaseRequestModel):
    analystId: str

    @field_validator("analystId")
    @classmethod
    def validate_analyst_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Analyst ID is required")
        return value


class CaseStatusBoardItem(BaseModel):
    value: str
    label: str = ""
    enabled: bool = True
    skippable: bool = False

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: str) -> str:
        value = (value or "").strip().lower().replace("-", "_").replace(" ", "_")
        STATUS_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
        if not STATUS_KEY_PATTERN.match(value):
            raise ValueError("Status key must use lowercase letters, numbers, and underscores")
        return value

    @field_validator("label")
    @classmethod
    def validate_label(cls, value: str) -> str:
        value = (value or "").strip()
        if len(value) > 80:
            raise ValueError("Status display name is too long")
        return value
    
class CaseStatusBoardConfig(BaseModel):
    statuses: List[CaseStatusBoardItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_statuses(self):
        if not self.statuses:
            raise ValueError("At least one status is required")

        values = [item.value.lower() for item in self.statuses]
        labels = [(item.label or item.value.replace("_", " ").replace("-", " ").title()).strip().lower() for item in self.statuses]
        if len(values) != len(set(values)):
            raise ValueError("Duplicate status keys are not allowed")
        if len(labels) != len(set(labels)):
            raise ValueError("Duplicate status display names are not allowed")
        if "new" not in values or "closed" not in values:
            raise ValueError("New and Closed statuses are required")
        return self
