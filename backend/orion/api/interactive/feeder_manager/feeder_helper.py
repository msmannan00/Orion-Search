import re
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from cryptography.fernet import Fernet
from fastapi import HTTPException

from orion.api.interactive.auditlog_manager.audit_log_manager import AuditLogManager
from orion.api.interactive.feeder_manager.models.feeder_models import FeederScriptItem, FeederValueItem, PathMetadata
from orion.constants import constant
from orion.constants.constant import CONSTANTS
from orion.services.mongo_manager.shared_model.db_auth_models import user_role
from orion.services.mongo_manager.shared_model.db_feeder_script_model import db_feeder_script_model, osint_feeder


class FeederHelper:
    ROOT_SUBCATEGORY = "__root__"
    MAX_FILE_SIZE = 1024 * 1024
    model = db_feeder_script_model
    SEED_URL_PATTERN = re.compile(
        r"(?m)^[ \t]*@property[ \t]*\r?\n"
        r"[ \t]*def[ \t]+seed_url\(self\)[ \t]*->[ \t]*str[ \t]*:[ \t]*\r?\n"
        r"[ \t]*return[ \t]+(?P<quote>['\"])(?P<url>https?://[A-Za-z0-9._~:/?#\[\]@!$&()*+,;=%-]+)(?P=quote)[ \t]*$"
    )
    VALUE_URL_PATTERN = re.compile(r"^https?://[A-Za-z0-9._~:/?#\[\]@!$&()*+,;=%-]+$")
    RULE_CONFIG_RULE_TYPE_PATTERN = re.compile(
        r"def[ \t]+rule_config\(self\)[ \t]*(?:->[ \t]*[A-Za-z0-9_., \[\]]+)?[ \t]*:[ \t]*\r?\n"
        r"[\s\S]*?"
        r"m_rule_type[ \t]*=[ \t]*RuleType\.(?P<rule_type>[A-Z0-9_]+)",
        re.MULTILINE,
    )
    SAFE_PATH_PART_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")

    def __init__(self, engine, parser_root: Path):
        self._engine = engine
        self._parser_root = parser_root
        self._cipher = Fernet(CONSTANTS.S_ENCRYPTION_KEY.encode())

    @staticmethod
    def sanitize_file_name(file_name: str) -> str:
        suffix = Path(file_name).suffix.lower()
        stem = Path(file_name).stem
        stem = re.sub(r"[^A-Za-z0-9_-]+", "-", stem).strip("-").lower()
        safe_stem = stem[:64] or "script"
        if not safe_stem.startswith("_"):
            safe_stem = f"_{safe_stem}"
        return f"{safe_stem}{suffix or '.py'}"

    @staticmethod
    def sanitize_support_file_name(script_name: str, file_name: str) -> str:
        suffix = Path(file_name).suffix.lower()
        stem = Path(script_name).stem
        stem = re.sub(r"[^A-Za-z0-9_-]+", "-", stem).strip("-").lower()
        return f"{stem[:64] or 'script'}_session{suffix}"

    def resolve_target_dir(self, category_key: str, subcategory_key: str) -> Path:
        base_dir = self._parser_root / category_key
        if subcategory_key == self.ROOT_SUBCATEGORY:
            return base_dir
        return base_dir / subcategory_key

    def safe_relative_path(self, target_path: Path) -> Path | None:
        parser_root = self._parser_root.resolve()
        try:
            relative_path = target_path.relative_to(self._parser_root)
        except ValueError:
            if target_path.is_absolute():
                try:
                    relative_path = target_path.relative_to(parser_root)
                except ValueError:
                    return None
            else:
                relative_path = target_path

        if not relative_path.parts:
            return None
        if any(part in {"", ".", ".."} or not self.SAFE_PATH_PART_PATTERN.fullmatch(part) for part in relative_path.parts):
            return None
        return Path(*relative_path.parts)

    def parser_file_path(self, target_path: Path) -> Path | None:
        relative_path = self.safe_relative_path(target_path)
        if relative_path is None:
            return None
        try:
            parser_root = self._parser_root.resolve()
            resolved_path = (parser_root / relative_path).resolve()
            resolved_path.relative_to(parser_root)
        except (OSError, ValueError):
            return None
        return resolved_path if resolved_path.is_file() else None

    def rule_path_parts(self, rule_path: str | None) -> tuple[str, str]:
        if not rule_path:
            raise HTTPException(status_code=400, detail="Selected rule has no upload path")
        parts = Path(rule_path).parts
        if Path(rule_path).is_absolute() or not parts:
            raise HTTPException(status_code=400, detail="Invalid upload path")
        if any(part in {"", ".", ".."} or not self.SAFE_PATH_PART_PATTERN.fullmatch(part) for part in parts):
            raise HTTPException(status_code=400, detail="Invalid upload path")
        return parts[0], parts[1] if len(parts) > 1 else self.ROOT_SUBCATEGORY

    def extract_seed_url(self, content: str) -> str:
        match = self.SEED_URL_PATTERN.search(content)
        if not match:
            raise HTTPException(
                status_code=400,
                detail="Unique parser file must contain an exact seed_url property returning a strict quoted URL",
            )
        return match.group("url")

    def validate_rule_config_rule_type(self, content: str, rule_key: str) -> None:
        match = self.RULE_CONFIG_RULE_TYPE_PATTERN.search(content)
        if not match:
            raise HTTPException(
                status_code=400,
                detail="Rule Type Missmatch select proper rule type",
            )

        script_rule_type = match.group("rule_type").strip().lower()
        expected_rule_type = rule_key.strip().lower()
        if script_rule_type != expected_rule_type:
            raise HTTPException(
                status_code=400,
                detail="Rule Type Missmatch select proper rule type",
            )

    def normalize_value_lines(self, values_text: str) -> list[str]:
        urls: list[str] = []
        for raw_line in values_text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if "://" not in line:
                line = f"https://{line}"
            if not self.VALUE_URL_PATTERN.fullmatch(line):
                raise HTTPException(status_code=400, detail=f"Invalid URL value: {line}")
            urls.append(line)
        return urls

    @staticmethod
    def validate_rule_value(url: str, rule: dict | None) -> None:
        value_regex = str((rule or {}).get("value_regex") or "").strip()
        if value_regex and not re.fullmatch(value_regex, url):
            raise HTTPException(status_code=400, detail="Value does not match selected rule")

    def current_rule_values(self, records: list[db_feeder_script_model], rule_key: str, rule_type: str) -> list[str]:
        if rule_type not in {"shared", "generic"}:
            return []
        return self.normalize_urls([
            str(value.get("url") or "")
            for record in records
            if record.rule_key == rule_key
            for value in (record.values or [])
            if value.get("url")
        ])

    def filter_records(self, records: list[db_feeder_script_model], entry_type: str) -> list[db_feeder_script_model]:
        filtered: list[db_feeder_script_model] = []
        for record in records:
            rule = constant.url_rules.get(record.rule_key or "") or {}
            rule_type = str(rule.get("rule_type") or "")
            is_value_record = record.entry_kind == "values"
            if entry_type == "values":
                if is_value_record or (rule_type == "shared" and bool(record.values)):
                    filtered.append(record)
                continue
            if entry_type == "scripts":
                if not is_value_record:
                    filtered.append(record)
                continue
            if rule_type == "generic":
                if is_value_record:
                    filtered.append(record)
                continue
            if not is_value_record:
                filtered.append(record)
        return filtered

    @staticmethod
    def normalize_urls(urls: list[str]) -> list[str]:
        ordered: list[str] = []
        seen: set[str] = set()
        for url in urls:
            if url in seen:
                continue
            seen.add(url)
            ordered.append(url)
        return ordered

    def merge_value_entries(self, existing_values: list[dict], urls: list[str]) -> list[dict]:
        merged_by_url: dict[str, dict] = {}
        for value in existing_values:
            url = str(value.get("url") or "").strip()
            if not url:
                continue
            merged_by_url[url] = {
                "url": url,
                "status": value.get("status"),
                "last_checked_at": value.get("last_checked_at"),
                "last_error": value.get("last_error"),
                "last_success_date": value.get("last_success_date"),
                "last_success_message": value.get("last_success_message"),
                "last_failure_date": value.get("last_failure_date"),
                "last_failure_message": value.get("last_failure_message"),
            }

        for url in urls:
            if url in merged_by_url:
                continue
            merged_by_url[url] = {"url": url, "status": "pending"}

        return list(merged_by_url.values())

    def replace_value_entries(self, existing_values: list[dict], urls: list[str]) -> list[dict]:
        merged_by_url = {
            str(value.get("url") or "").strip(): value
            for value in self.merge_value_entries(existing_values, [])
        }
        return [
            merged_by_url[url] if url in merged_by_url else {"url": url, "status": "pending"}
            for url in urls
        ]

    @staticmethod
    def value_record_name(rule_key: str) -> str:
        return f"_{rule_key}__values"

    async def replace_rule_values(self, rule_key: str, urls: list[str], current_user) -> None:
        normalized_urls = self.normalize_urls(urls)
        rule = constant.url_rules.get(rule_key) or {}
        rule_type = str(rule.get("rule_type") or "")
        record_name = self.value_record_name(rule_key)
        if rule_type == "shared":
            record = await self._engine.find_one(
                self.model,
                (self.model.rule_key == rule_key) & (self.model.entry_kind == "script"),
            )
            if not record:
                raise HTTPException(status_code=400, detail="Upload the parser file before adding values")
        else:
            record = await self._engine.find_one(self.model, self.model.name == record_name)

        if record:
            if rule_type == "generic" and not normalized_urls:
                await self._engine.delete(record)
                return
            record.rule_key = rule_key
            record.values = (
                self.replace_value_entries(record.values or [], normalized_urls)
                if rule_type == "generic"
                else self.merge_value_entries(record.values or [], normalized_urls)
            )
            if rule_type != "shared":
                record.url = None
                record.entry_kind = "values"
        elif rule_type == "generic" and not normalized_urls:
            return
        else:
            record = self.model(
                name=record_name,
                url=None,
                rule_key=rule_key,
                entry_kind="values",
                values=self.merge_value_entries([], normalized_urls),
                feeder=osint_feeder(
                    author_id=str(current_user.id),
                    author_name=current_user.username,
                    index_date=datetime.now(timezone.utc),
                    index_status=True,
                    last_failure_date=None,
                    last_failure_message=None,
                    last_success_date=None,
                ),
            )
        await self._engine.save(record)

    def encrypt_script_content(self, content: str) -> str:
        return self._cipher.encrypt(content.encode("utf-8")).decode()

    def decrypt_script_content(self, encrypted_content: str) -> str:
        try:
            return self._cipher.decrypt(encrypted_content.encode()).decode("utf-8")
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to decrypt feeder script") from exc

    async def process_upload(self, rule_key: str, category_key: str, subcategory_key: str, file_name: str, content: str, current_user, url: str | None = None, session_file_name: str | None = None, session_content: bytes | None = None) -> FeederScriptItem:
        target_dir = self.resolve_target_dir(category_key, subcategory_key)
        target_dir.mkdir(parents=True, exist_ok=True)

        target_name = self.sanitize_file_name(file_name)
        target_path = target_dir / target_name

        existing = await self._engine.find_one(self.model, self.model.name == target_name)
        encrypted_content = self.encrypt_script_content(content)

        existing_feeder = existing.feeder if existing and existing.feeder else None
        existing_author_id = None
        existing_author_name = None
        if existing_feeder:
            existing_author_id = existing_feeder.author_id
            existing_author_name = existing_feeder.author_name
        if existing_author_id and existing_author_id != str(current_user.id) and current_user.role != user_role.ADMIN:
            raise HTTPException(status_code=409, detail="Script owner already exists")

        target_path.write_bytes(encrypted_content.encode())
        if session_file_name and session_content:
            (target_dir / self.sanitize_support_file_name(target_name, session_file_name)).write_bytes(session_content)

        if existing:
            existing.rule_key = rule_key
            existing.url = url
            existing.entry_kind = "script"
            existing.feeder.author_id = existing_author_id or str(current_user.id)
            existing.feeder.author_name = existing_author_name or current_user.username
            record = existing
        else:
            record = self.model(
                name=target_name,
                url=url,
                rule_key=rule_key,
                entry_kind="script",
                feeder=osint_feeder(
                    author_id=str(current_user.id),
                    author_name=current_user.username,
                    index_date=datetime.now(timezone.utc),
                    index_status=True,
                    last_failure_date=None,
                    last_failure_message=None,
                    last_success_date=None,
                ),
            )

        await self._engine.save(record)
        await AuditLogManager.get_instance().register(
            str(current_user.tenant_uuid),
            str(current_user.id),
            "feeder_script_uploaded",
        )
        return await self.to_script_item(record)

    @staticmethod
    def script_query(current_user, rule_key: str | None = None):
        query = {}
        if current_user.role != user_role.ADMIN:
            query["feeder.author_id"] = str(current_user.id)
        if rule_key:
            query["rule_key"] = rule_key
        return query

    def resolve_record_file_path(self, record: db_feeder_script_model) -> Path:
        matches = sorted(path for path in self._parser_root.rglob(record.name) if path.is_file())
        return matches[0] if matches else self._parser_root / record.name

    def path_metadata(self, record: db_feeder_script_model, target_path: Path | None = None) -> PathMetadata:
        target_path = target_path or self.resolve_record_file_path(record)
        relative_path = target_path.relative_to(self._parser_root).as_posix() if target_path.exists() else record.name
        path = Path(relative_path)
        parts = path.parts
        category_key = parts[0] if len(parts) >= 1 else ""
        subcategory_key = parts[1] if len(parts) >= 3 else self.ROOT_SUBCATEGORY
        file_name = path.name

        created_at = None
        updated_at = None
        if target_path.is_file():
            stat = target_path.stat()
            created_at = datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc)
            updated_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

        return {
            "relative_path": relative_path,
            "category_key": category_key,
            "subcategory_key": subcategory_key,
            "file_name": file_name,
            "created_at": created_at,
            "updated_at": updated_at,
        }

    def shared_rule_script_path(self, rule_key: str | None) -> Path | None:
        if not rule_key:
            return None
        rule = constant.url_rules.get(rule_key) or {}
        rule_path = rule.get("path")
        if not rule_path:
            return None
        category_key, subcategory_key = self.rule_path_parts(rule_path)
        target_dir = self.resolve_target_dir(category_key, subcategory_key)
        return self.parser_file_path(target_dir / self.sanitize_file_name(f"{rule_key}.py"))

    def shared_content_path(self, record: db_feeder_script_model) -> Path | None:
        if record.entry_kind == "values":
            return None
        if not record.url:
            return None
        return self.shared_rule_script_path(record.rule_key)

    def item_content(self, record: db_feeder_script_model, has_file: bool, target_path: Path) -> str | None:
        if has_file:
            safe_target_path = self.parser_file_path(target_path)
            return self.decrypt_script_content(safe_target_path.read_bytes().decode()) if safe_target_path else None

        shared_target_path = self.shared_content_path(record)
        if shared_target_path:
            return self.decrypt_script_content(shared_target_path.read_bytes().decode())

        return None

    @staticmethod
    def session_file_name(target_path: Path) -> str | None:
        if not target_path.is_file():
            return None
        exact_match = target_path.parent / f"{target_path.stem}_session"
        if exact_match.is_file():
            return exact_match.name
        matches = sorted(target_path.parent.glob(f"{target_path.stem}_session.*"))
        if matches:
            return matches[0].name
        if target_path.stem.startswith("_"):
            legacy_stem = target_path.stem.lstrip("_")
            legacy_exact_match = target_path.parent / f"{legacy_stem}_session"
            if legacy_exact_match.is_file():
                return legacy_exact_match.name
            legacy_matches = sorted(target_path.parent.glob(f"{legacy_stem}_session.*"))
            return legacy_matches[0].name if legacy_matches else None
        return None

    async def to_script_item(self, record: db_feeder_script_model) -> FeederScriptItem:
        target_path = self.resolve_record_file_path(record)
        metadata = self.path_metadata(record, target_path)
        has_file = target_path.is_file()
        fallback_timestamp = record.feeder.index_date if record.feeder else None
        content = self.item_content(record, has_file, target_path)
        return FeederScriptItem(
            id=str(record.id),
            rule_key=record.rule_key,
            entry_kind=record.entry_kind,
            enabled=(record.feeder.index_status is not False) if record.feeder else True,
            file_name=str(metadata["file_name"] if has_file else record.name),
            category_key=str(metadata["category_key"]) if has_file else "",
            subcategory_key=str(metadata["subcategory_key"]) if has_file else self.ROOT_SUBCATEGORY,
            path=str(Path(metadata["relative_path"]).parent.as_posix()) if has_file and "/" in str(metadata["relative_path"]) else "",
            session_file_name=self.session_file_name(target_path),
            content=content,
            url=record.url,
            values=[
                FeederValueItem(
                    url=str(value.get("url") or ""),
                    status=value.get("status"),
                    last_checked_at=value.get("last_checked_at"),
                    last_error=value.get("last_error"),
                    last_success_date=value.get("last_success_date"),
                    last_success_message=value.get("last_success_message"),
                    last_failure_date=value.get("last_failure_date"),
                    last_failure_message=value.get("last_failure_message"),
                )
                for value in (record.values or [])
                if value.get("url")
            ],
            owner_id=record.feeder.author_id if record.feeder else None,
            owner_name=record.feeder.author_name if record.feeder else None,
            last_failure_date=record.feeder.last_failure_date if record.feeder else None,
            last_failure_message=record.feeder.last_failure_message if record.feeder else None,
            last_success_date=record.feeder.last_success_date if record.feeder else None,
            last_success_message=record.feeder.last_success_message if record.feeder else None,
            created_at=metadata["created_at"] or fallback_timestamp,
            updated_at=metadata["updated_at"] or fallback_timestamp,
        )

    async def get_script_record(self, script_id: str, current_user) -> db_feeder_script_model:
        try:
            object_id = ObjectId(script_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail="Script not found") from exc

        record = await self._engine.find_one(self.model, self.model.id == object_id)
        if not record or not record.feeder:
            raise HTTPException(status_code=404, detail="Script not found")
        if current_user.role != user_role.ADMIN and record.feeder.author_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Script not found")

        return record
