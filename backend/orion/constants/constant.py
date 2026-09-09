from pathlib import Path

from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from orion.helper_manager.env_handler import env_handler
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX


class CONSTANTS:
    S_SETTINGS_INDEX_EXPIRY_TIMEOUT = 5184000
    S_SETTINGS_INDEX_EXPIRY = 15
    S_SETTINGS_INDEX_STATS_DAILY_TIMEOUT = 86400
    S_SETTINGS_INDEX_STATS_WEEKLY_TIMEOUT = 604800
    S_SETTINGS_SEARCHED_DOCUMENT_SIZE = 10
    S_SETTINGS_SEARCHED_DOCUMENT_SIZE_GENERIC = 10
    S_SETTINGS_SEARCHED_DOCUMENT_SIZE_CONSOLIDATED = 15
    S_SETTINGS_FETCHED_DOCUMENT_SIZE = 30
    S_SETTINGS_FETCHED_INSIGHT_DOCUMENT_SIZE = 10
    S_SETTINGS_DIRECTORY_LIST_MAX_SIZE = 1000
    S_SETTINGS_SEARCH_MAX_DYNAMIC_RESOURCE_LIMIT = 1
    S_SETTINGS_COUNTRY_DOCUMENT_SIZE = 500

    S_SUPER_PASSWORD = env_handler.get_instance().env("S_SUPER_PASSWORD_V1")
    S_AUTH_SECRET_KEY = env_handler.get_instance().env("JWT_SECRET_KEY")
    S_CRAWL_SECRET_KEY = env_handler.get_instance().env("S_CRAWLER_PASSWORD")
    S_AUTH_ALGORITHM = "HS256"
    S_AUTH_ACCESS_TOKEN_EXPIRE_MINUTES = 30
    S_AUTH_OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl="token")
    S_AUTH_PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")
    S_ENCRYPTION_KEY = env_handler.get_instance().env("ENCRYPTION_KEY")

    BASE_DIR = Path(__file__).resolve().parents[2]
    IMAGE_DIR = BASE_DIR / "workspace" / "resource" / "tenant"
    S_SATELLITE_ASSET_FILE_NAME = "satellite_assets.json"
    S_CASE_ARTIFACT_RESOURCE_DIR = (
        Path(__file__).resolve().parents[2]
        / "workspace"
        / "resource"
        / "case_artifacts"
    )
    S_SESSION_RESOURCE_DIR = (
        Path(__file__).resolve().parents[2]
        / "workspace"
        / "resource"
        / "session_data"
    )
    S_CASE_ARTIFACT_SCREENSHOT_ALLOWED = {"image/png"}
    S_CASE_ARTIFACT_FILE_ALLOWED = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    MAX_BACKUPS = 2
    BACKUP_BATCH_SIZE = 1000
    BACKUP_MANIFEST_NAME = "manifest.json"
    BACKUP_MANIFEST_VERSION = 1
    BACKUP_DISK_HEADROOM = 1.5
    BACKUP_EXCLUDED_ELASTIC_INDICES = {ELASTIC_INDEX.S_STEALERLOGS_INDEX}
    BACKUP_UNSETTABLE_INDEX_SETTINGS = {"creation_date", "uuid", "version", "provided_name", "resize", "routing"}
    BACKUP_JOB_KEY = "backup_job"
    BACKUP_JOB_HEARTBEAT_SECONDS = 30
    BACKUP_JOB_STALE_SECONDS = 120
    BACKUP_JOB_STALE_MESSAGE = "Backup worker stopped responding"
    RESTORE_MARKER_NAME = ".restore_in_progress"
    RESTORE_ROLLBACK_PREFIX = "rollback_"
    RESTORE_ROLLBACK_MAX_AGE_HOURS = 12
    RESTORE_QUIESCE_DRAIN_SECONDS = 3
    MAINTENANCE_FLAG = BASE_DIR / "static" / ".maintenance"
    MAINTENANCE_CACHE_TTL_SECONDS = 1.0

allowed_key_titles: dict[str, str] = {}
mail_template = None
alert_mail_template = None
license_rules = {}
url_rules = {}
map_entities_data = {}
