from __future__ import annotations

from datetime import datetime
from datetime import timezone
from enum import Enum
from typing import List
from typing import Optional

from odmantic import EmbeddedModel
from odmantic import Field
from odmantic import Model
from pydantic import BaseModel
from pydantic import Field as PydanticField


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CaseType(str, Enum):
    DATA_LEAK = "data_leak"
    ACCOUNT_TAKEOVER = "account_takeover"
    PHISHING = "phishing"
    MALWARE = "malware"
    FRAUD = "fraud"
    DEFACEMENT = "defacement"
    SUSPICIOUS_INFRASTRUCTURE = "suspicious_infrastructure"
    VULNERABILITY_EXPOSURE = "vulnerability_exposure"
    INSIDER_THREAT = "insider_threat"
    SOCIAL_IMPERSONATION = "social_impersonation"
    DARK_WEB_MENTION = "dark_web_mention"
    OTHER = "other"


class CaseStatus(str, Enum):
    NEW = "new"
    INTAKE_REVIEW = "intake_review"
    UNDER_INVESTIGATION = "under_investigation"
    EVIDENCE_COLLECTION = "evidence_collection"
    VERIFICATION = "verification"
    REGULATORY_ACTION = "regulatory_action"
    LEGAL_REVIEW = "legal_review"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Severity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IntakeSource(str, Enum):
    MANUAL = "manual"
    SOC_ALERT = "soc_alert"
    TENANT_ALERT = "tenant_alert"
    SIEM = "siem"
    EMAIL_REPORT = "email_report"
    EMPLOYEE_REPORT = "employee_report"
    CUSTOMER_REPORT = "customer_report"
    BREACH_SEARCH = "breach_search"
    STEALER_LOGS = "stealer_logs"
    ENTITY_API = "entity_api"
    NETWORK_INTEL = "network_intel"
    SOCIAL_INTEL = "social_intel"
    CTI_GRAPH = "cti_graph"
    EXTERNAL_INTEL = "external_intel"
    OTHER = "other"


class EntityType(str, Enum):
    PERSON = "person"
    ORGANIZATION = "organization"
    EMAIL = "email"
    DOMAIN = "domain"
    IP = "ip"
    URL = "url"
    USERNAME = "username"
    PHONE = "phone"
    WALLET = "wallet"
    FINANCIAL_INSTITUTION = "financial_institution"
    PAYMENT_PROCESSOR = "payment_processor"
    BANK_ACCOUNT = "bank_account"
    CARD = "card"
    IBAN = "iban"
    SWIFT_BIC = "swift_bic"
    MERCHANT_ACCOUNT = "merchant_account"
    TRANSACTION = "transaction"
    CRYPTO_EXCHANGE = "crypto_exchange"
    DEVICE = "device"
    CLOUD_ASSET = "cloud_asset"
    CREDENTIAL = "credential"
    SOCIAL_PROFILE = "social_profile"
    MALWARE = "malware"
    VULNERABILITY = "vulnerability"
    THREAT_ACTOR = "threat_actor"
    CAMPAIGN = "campaign"
    INCIDENT = "incident"
    OTHER = "other"


class EntityRole(str, Enum):
    PRIMARY = "primary"
    RELATED = "related"
    VICTIM = "victim"
    ATTACKER = "attacker"
    ASSET = "asset"
    INDICATOR = "indicator"
    SOURCE = "source"
    RECIPIENT = "recipient"
    OBSERVED_ON = "observed_on"
    OWNER = "owner"


class EntityConfidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SocialPlatform(str, Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    X = "x"
    LINKEDIN = "linkedin"
    TELEGRAM = "telegram"
    DISCORD = "discord"
    REDDIT = "reddit"
    GITHUB = "github"
    GITLAB = "gitlab"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    MASTODON = "mastodon"
    PASTEBIN = "pastebin"
    DARK_WEB_FORUM = "dark_web_forum"
    OTHER = "other"


class IdentifierType(str, Enum):
    EMAIL = "email"
    PHONE = "phone"
    USERNAME = "username"
    DOMAIN = "domain"
    IP = "ip"
    URL = "url"
    NATIONAL_ID = "national_id"
    PASSPORT = "passport"
    EMPLOYEE_ID = "employee_id"
    CUSTOMER_ID = "customer_id"
    BANK_ACCOUNT_NUMBER = "bank_account_number"
    IBAN = "iban"
    SWIFT_BIC = "swift_bic"
    CARD_BIN = "card_bin"
    CARD_LAST4 = "card_last4"
    MERCHANT_ID = "merchant_id"
    TRANSACTION_ID = "transaction_id"
    DEVICE_ID = "device_id"
    HOSTNAME = "hostname"
    MAC_ADDRESS = "mac_address"
    WALLET_ADDRESS = "wallet_address"
    CVE = "cve"
    OTHER = "other"


class ArtifactType(str, Enum):
    EVIDENCE = "evidence"
    SCREENSHOT = "screenshot"
    FILE = "file"
    URL_CAPTURE = "url_capture"
    RAW_ALERT = "raw_alert"
    CHAT_TRANSCRIPT = "chat_transcript"
    EMAIL_HEADER = "email_header"
    LOG_EXCERPT = "log_excerpt"
    REPORT = "report"
    OTHER = "other"


class SourceType(str, Enum):
    MANUAL = "manual"
    ORION_ALERT = "orion_alert"
    ORION_SEARCH = "orion_search"
    ORION_SCAN = "orion_scan"
    IMPORT = "import"
    API = "api"
    EXTERNAL = "external"
    OTHER = "other"


class TaskStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    UNDER_REVIEW = "under_review"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"


class CaseLinkRelationship(str, Enum):
    DUPLICATE = "duplicate"
    RELATED = "related"
    PARENT = "parent"
    CHILD = "child"
    FOLLOW_UP = "follow_up"
    ESCALATION = "escalation"
    SAME_ACTOR = "same_actor"
    SAME_VICTIM = "same_victim"
    SAME_INFRASTRUCTURE = "same_infrastructure"


class ClosureReason(str, Enum):
    TRUE_POSITIVE = "true_positive"
    FALSE_POSITIVE = "false_positive"
    DUPLICATE = "duplicate"
    RISK_ACCEPTED = "risk_accepted"
    REMEDIATED = "remediated"
    NO_ACTION_REQUIRED = "no_action_required"
    INCONCLUSIVE = "inconclusive"
    OTHER = "other"


class CaseTag(str, Enum):
    VIP = "vip"
    EXECUTIVE = "executive"
    WATCHLIST = "watchlist"
    HIGH_VALUE_ASSET = "high_value_asset"
    CUSTOMER_IMPACT = "customer_impact"
    REGULATORY = "regulatory"
    PUBLIC_EXPOSURE = "public_exposure"
    CREDENTIAL_EXPOSURE = "credential_exposure"
    REQUIRES_REVIEW = "requires_review"
    ESCALATED = "escalated"
    FALSE_POSITIVE = "false_positive"
    DUPLICATE = "duplicate"


class SocialMediaProfile(EmbeddedModel):
    platform: SocialPlatform
    username: str
    platformOtherValue: str = ""
    profileUrl: str = ""
    displayName: str = ""


class AdditionalIdentifier(EmbeddedModel):
    type: IdentifierType
    value: str
    identifierTypeOtherValue: str = ""
    issuer: str = ""
    verified: bool = False


class CaseEntity(EmbeddedModel):
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
    identifiers: List[AdditionalIdentifier] = Field(default_factory=list)
    socialProfiles: List[SocialMediaProfile] = Field(default_factory=list)
    tags: List[CaseTag] = Field(default_factory=list)
    createdBy: str = ""
    updatedBy: str = ""
    createdAt: datetime = Field(default_factory=utc_now)
    updatedAt: datetime = Field(default_factory=utc_now)


class CaseArtifactFile(EmbeddedModel):
    fileId: str
    fileName: str = ""
    fileType: str = ""
    fileSize: int = 0
    fileResourceId: str = ""
    fileHash: str = ""
    integrityStatus: str = "unknown"
    uploadedAt: datetime = Field(default_factory=utc_now)


class CaseArtifact(EmbeddedModel):
    artifactId: str
    type: ArtifactType = Field(default=ArtifactType.EVIDENCE)
    artifactTypeOtherValue: str = ""
    title: str
    description: str = ""
    source: SourceType = Field(default=SourceType.MANUAL)
    artifactSourceOtherValue: str = ""
    url: str = ""
    files: List[CaseArtifactFile] = Field(default_factory=list)
    linkedReportSource: str = ""
    linkedReportId: str = ""
    linkedReportTitle: str = ""
    entityIds: List[str] = Field(default_factory=list)
    tags: List[CaseTag] = Field(default_factory=list)
    capturedAt: Optional[datetime] = None
    createdBy: str = ""
    createdAt: datetime = Field(default_factory=utc_now)


class CaseComment(EmbeddedModel):
    commentId: str
    body: str
    entityIds: List[str] = Field(default_factory=list)
    artifactIds: List[str] = Field(default_factory=list)
    createdBy: str = ""
    createdAt: datetime = Field(default_factory=utc_now)
    updatedAt: datetime = Field(default_factory=utc_now)


class CaseTask(EmbeddedModel):
    taskId: str
    title: str
    description: str = ""
    status: TaskStatus = Field(default=TaskStatus.OPEN)
    priority: Priority = Field(default=Priority.MEDIUM)
    assignedTo: str = ""
    dueAt: Optional[datetime] = None
    entityIds: List[str] = Field(default_factory=list)
    artifactIds: List[str] = Field(default_factory=list)
    createdBy: str = ""
    createdAt: datetime = Field(default_factory=utc_now)
    updatedAt: datetime = Field(default_factory=utc_now)
    completedAt: Optional[datetime] = None


class CaseCommunication(EmbeddedModel):
    communicationId: str
    name: str
    url: str
    platform: str = ""
    sessionResourceId: str = ""


class CaseLink(EmbeddedModel):
    targetCaseId: str
    relationship: CaseLinkRelationship = Field(default=CaseLinkRelationship.RELATED)
    reason: str
    createdBy: str = ""
    createdAt: datetime = Field(default_factory=utc_now)


class CaseClosure(BaseModel):
    reason: ClosureReason
    closureReasonOtherValue: str = ""
    summary: str = ""
    resolution: str = ""
    closedBy: str = ""
    closedAt: datetime = PydanticField(default_factory=utc_now)


class CaseStatusReason(EmbeddedModel):
    status: CaseStatus
    reason: str


class CaseShare(EmbeddedModel):
    shareId: str
    tokenHash: str
    createdBy: str = ""
    createdAt: datetime = Field(default_factory=utc_now)
    expiresAt: datetime
    revokedAt: Optional[datetime] = None



class db_case_model(Model):
    caseId: str = Field(index=True)
    tenant_uuid: str = Field(index=True)

    title: str
    description: str = ""
    caseType: CaseType = Field(default=CaseType.OTHER)
    caseTypeOtherValue: str = ""
    status: CaseStatus = Field(default=CaseStatus.NEW)
    statusReasons: List[CaseStatusReason] = Field(default_factory=list)
    severity: Severity = Field(default=Severity.LOW)
    priority: Priority = Field(default=Priority.LOW)
    tags: List[CaseTag] = Field(default_factory=list)
    intakeSource: IntakeSource = Field(default=IntakeSource.MANUAL)
    intakeSourceOtherValue: str = ""

    createdBy: str = ""
    assignedAnalystIds: List[str] = Field(default_factory=list)
    primaryEntityId: Optional[str] = None

    createdAt: datetime = Field(default_factory=utc_now)
    updatedAt: datetime = Field(default_factory=utc_now)
    closedAt: Optional[datetime] = None
    
    isArchived: bool = Field(default=False, index=True)
    archivedAt: Optional[datetime] = None
    archivedBy: str = ""

    entities: List[CaseEntity] = Field(default_factory=list)
    artifacts: List[CaseArtifact] = Field(default_factory=list)
    tasks: List[CaseTask] = Field(default_factory=list)
    comments: List[CaseComment] = Field(default_factory=list)
    linkedCases: List[CaseLink] = Field(default_factory=list)
    communications: List[CaseCommunication] = Field(default_factory=list)
    shares: List[CaseShare] = Field(default_factory=list)

    closure: Optional[CaseClosure] = None

    model_config = {"collection": "cases"}
