import hashlib
import re
import threading
import time
from datetime import date, datetime
from typing import Any

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool

from orion.api.server.crawl_manager.class_model.entity_model import entity_model
from orion.api.server.entity_manager.constants import enums as graph_enums
from orion.api.server.entity_manager.entity_request_generator import EntityRequestGenerator
from orion.api.server.entity_manager.modal.EntityQueryModel import EntityGraphBatchQueryModel, EntityQueryModel
from orion.constants.constant import allowed_key_titles
from orion.constants.cti_graph_schema import (
    CLUSTER_ALIASES as CTI_CLUSTER_ALIASES,
    CLUSTER_LABELS as CTI_CLUSTER_LABELS,
    GRAPH_SCHEMA_VERSION as CTI_GRAPH_SCHEMA_VERSION,
)
from orion.services.arango_manager.arango_controller import arango_controller
from orion.services.log_manager.log_controller import log
from orion.services.redis_manager.redis_controller import redis_controller


class entity_manager:
    __instance = None
    __db = None
    __graph = None
    __upsert_locks = [threading.Lock() for _ in range(256)]
    GRAPH_SCHEMA_VERSION = CTI_GRAPH_SCHEMA_VERSION
    CLUSTER_LABELS = CTI_CLUSTER_LABELS
    CLUSTER_ALIASES = CTI_CLUSTER_ALIASES
    ACTOR_CONTEXT_CLUSTERS = graph_enums.ACTOR_CONTEXT_CLUSTERS
    TARGET_CONTEXT_CLUSTERS = graph_enums.TARGET_CONTEXT_CLUSTERS
    SOURCE_ENTITY_KEYS = graph_enums.SOURCE_ENTITY_KEYS
    ORG_SUFFIXES = graph_enums.ORG_SUFFIXES
    CLUSTER_RELIABILITY_BASE = graph_enums.CLUSTER_RELIABILITY_BASE
    DEFAULT_SOURCE_RELIABILITY = graph_enums.DEFAULT_SOURCE_RELIABILITY
    CONFIDENCE_LABEL_SCORES = graph_enums.CONFIDENCE_LABEL_SCORES
    HASH_KEY_BY_HEX_LENGTH = graph_enums.HASH_KEY_BY_HEX_LENGTH
    DERIVED_USES_KEYS = graph_enums.DERIVED_USES_KEYS
    REPORT_METADATA_KEYS = graph_enums.REPORT_METADATA_KEYS
    REPORT_TITLE_KEYS = graph_enums.REPORT_TITLE_KEYS
    REPORT_SUMMARY_KEYS = graph_enums.REPORT_SUMMARY_KEYS
    REPORT_DATE_KEYS = graph_enums.REPORT_DATE_KEYS
    SKIP_GRAPH_ENTITY_KEYS = graph_enums.SKIP_GRAPH_ENTITY_KEYS
    SPLIT_VALUE_KEYS = graph_enums.SPLIT_VALUE_KEYS
    ENTITY_CLASS_BY_KEY = graph_enums.ENTITY_CLASS_BY_KEY
    EDGE_TYPE_BY_KEY = graph_enums.EDGE_TYPE_BY_KEY
    DEFAULT_HIDDEN_KEYS = graph_enums.DEFAULT_HIDDEN_KEYS
    GRAPH_BATCH_LIST_KEYS = {"m_country", "m_origin_country"}
    ARANGO_LOCK_TIMEOUT_ERROR_CODE = 1200
    ARANGO_LOCK_RETRY_ATTEMPTS = 5
    ARANGO_LOCK_RETRY_BASE_DELAY = 0.05
    ARANGO_DISTRIBUTED_LOCK_TTL = 10
    ARANGO_DISTRIBUTED_LOCK_WAIT = 5
    PROVENANCE_SAMPLE_LIMIT = 6

    @staticmethod
    def get_instance():
        instance = entity_manager.__instance
        if instance is None:
            instance = entity_manager()
        instance._refresh_arango_handles()
        return instance

    def __init__(self):
        if entity_manager.__instance is not None:
            raise Exception("This class is a singleton!")
        entity_manager.__instance = self
        self._refresh_arango_handles()

    def _refresh_arango_handles(self):
        arango = arango_controller.get_instance()
        self.__db = arango.get_db()
        self.__graph = arango.get_graph()

    @staticmethod
    def _normalize_key(text: str) -> str:
        if not isinstance(text, str):
            text = str(text)
        return text.lower().replace(" ", "_")

    @staticmethod
    def _sanitize(value: str) -> str:
        return re.sub(r'[^a-zA-Z0-9_\-\.@()+,=;\$!\*\'%:]', '', value.replace(' ', '_')).lower()

    @staticmethod
    def _clean_text(value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()

    @classmethod
    def _json_safe(cls, value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, dict):
            return {str(k): cls._json_safe(v) for k, v in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [cls._json_safe(item) for item in value]
        return value

    @staticmethod
    def _as_values(value: Any) -> list[Any]:
        if value in (None, "", [], {}):
            return []
        if isinstance(value, list):
            values: list[Any] = []
            for item in value:
                values.extend(entity_manager._as_values(item))
            return values
        if isinstance(value, tuple) or isinstance(value, set):
            values = []
            for item in value:
                values.extend(entity_manager._as_values(item))
            return values
        if isinstance(value, dict):
            return []
        return [value]

    @staticmethod
    def _first_non_empty(raw: dict[str, Any], keys: tuple[str, ...]) -> Any:
        for key in keys:
            values = entity_manager._as_values(raw.get(key))
            if values:
                return values[0]
        return None

    @classmethod
    def _as_graph_values(cls, key: str, value: Any) -> list[Any]:
        values: list[Any] = []
        for item in cls._as_values(value):
            if key in cls.SPLIT_VALUE_KEYS and isinstance(item, str):
                values.extend(part.strip() for part in item.split(",") if part.strip())
            else:
                values.append(item)
        return values

    @staticmethod
    def _truncate(value: Any, limit: int = 500) -> str:
        text = entity_manager._clean_text(value)
        if len(text) <= limit:
            return text
        return f"{text[:limit - 3]}..."

    @classmethod
    def _canonical_cluster_id(cls, cluster_id: Any) -> str:
        normalized = cls._sanitize(cls._normalize_key(cluster_id or "general"))
        return cls.CLUSTER_ALIASES.get(normalized, normalized or "general")

    @classmethod
    def _strip_org_suffixes(cls, value: str) -> str:
        cleaned = re.sub(r"[.,]", " ", value)
        parts = [part for part in cleaned.split() if part]
        while parts and parts[-1].lower() in cls.ORG_SUFFIXES:
            parts.pop()
        return " ".join(parts) or value

    @classmethod
    def _strip_actor_variant_suffixes(cls, value: str) -> str:
        cleaned = cls._clean_text(value)
        cleaned = re.sub(r"(?<=[A-Za-z])[\s._-]+v?\d+(?:\.\d+)*$", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"(?<=[A-Za-z])\d+\.\d+$", "", cleaned)
        cleaned = re.sub(r"(?<=[A-Za-z])v\d+$", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"[_./-]+", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned or value

    @classmethod
    def _canonical_entity_value(cls, key: str, display_value: Any) -> tuple[str, str, str | None]:
        original_display = cls._display_value(key, display_value)
        original_normalized = cls._sanitize(cls._normalize_key(original_display))
        normalized = original_normalized
        display = original_display

        if key == "m_org":
            display = cls._strip_org_suffixes(original_display)
            normalized = cls._sanitize(cls._normalize_key(display))
        elif key == "m_attacker":
            display = cls._strip_actor_variant_suffixes(original_display)
            normalized = cls._sanitize(cls._normalize_key(display))
        elif key in {"m_enterprise_attack_tactics", "m_enterprise_attack_techniques"}:
            match = re.search(r"\bTA\d{4}\b|\bT\d{4}(?:\.\d{3})?\b", original_display, flags=re.IGNORECASE)
            if match:
                normalized = match.group(0).lower()

        alias = original_display if normalized != original_normalized else None
        return normalized, display, alias

    @staticmethod
    def _display_from_normalized(value: str) -> str:
        return value.replace("_", " ").title()

    def _resolve_existing_actor_variant_sync(self, normalized_value: str, display_value: str) -> tuple[str, str, str | None]:
        if "_" not in normalized_value:
            return normalized_value, display_value, None

        vertex_collection = self.__db.collection("cti_vertices")
        parts = [part for part in normalized_value.split("_") if part]
        for end in range(len(parts) - 1, 0, -1):
            candidate = "_".join(parts[:end])
            if len(candidate) < 4:
                continue

            candidate_key = f"m_attacker:{candidate}"
            if not vertex_collection.has(candidate_key):
                continue

            existing = vertex_collection.get(candidate_key) or {}
            if existing.get("node_class") != "threat_actor":
                continue

            existing_display = self._clean_text(existing.get("display_value") or existing.get("value")) or self._display_from_normalized(candidate)
            return candidate, existing_display, display_value

        return normalized_value, display_value, None

    @classmethod
    def _canonical_graph_key(cls, source_key: str, cluster_id: str) -> str | None:
        canonical = EntityRequestGenerator.deduplicate_key(source_key)
        if not canonical:
            return None
        if canonical == "m_team" and cluster_id in cls.ACTOR_CONTEXT_CLUSTERS:
            return "m_attacker"
        if canonical == "m_company_name":
            return "m_org"
        return canonical

    @classmethod
    def _canonical_graph_value_key(cls, key: str, value: Any) -> str | None:
        if key != "m_hashes":
            return key

        text = cls._clean_text(value)
        compact = re.sub(r"[^A-Fa-f0-9]", "", text)
        if not compact or len(compact) != len(text):
            return None
        return cls.HASH_KEY_BY_HEX_LENGTH.get(len(compact))

    @classmethod
    def _entity_role_for_key(cls, key: str, cluster_id: str) -> str:
        if key == "m_attacker":
            return "threat_actor"
        if key == "m_org":
            if cluster_id == "leak":
                return "victim_organization"
            if cluster_id in cls.TARGET_CONTEXT_CLUSTERS:
                return "target_organization"
            return "mentioned_organization"
        if key == "m_enterprise_attack_techniques":
            return "attack_technique"
        if key == "m_enterprise_attack_tactics":
            return "attack_tactic"
        if key in cls.SOURCE_ENTITY_KEYS:
            return "reporting_source"
        return "mentioned_entity"

    @classmethod
    def _edge_type_for_context(cls, key: str, entity_role: str) -> str:
        if entity_role == "threat_actor":
            return "attributed_to_actor"
        if entity_role == "victim_organization":
            return "impacts_organization"
        if entity_role == "target_organization":
            return "targets_organization"
        if entity_role == "mentioned_organization":
            return "mentions_organization"
        if entity_role == "reporting_source":
            return "published_by_source"
        return cls.EDGE_TYPE_BY_KEY.get(key, f"mentions_{cls.ENTITY_CLASS_BY_KEY.get(key, 'indicator')}")

    @staticmethod
    def _relationship_type_for_role(entity_role: str) -> str:
        relation_map = {
            "threat_actor": "attributed-to",
            "victim_organization": "impacts",
            "target_organization": "targets",
            "mentioned_organization": "mentions",
            "reporting_source": "reported-by",
        }
        return relation_map.get(entity_role, "mentions")

    @classmethod
    def _source_name(cls, raw_data: dict[str, Any]) -> str:
        source = (
            raw_data.get("m_scrap_file")
            or raw_data.get("m_source_url")
            or raw_data.get("m_base_url")
            or raw_data.get("m_network")
            or "unknown"
        )
        values = cls._as_values(source)
        return cls._clean_text(values[0] if values else source) or "unknown"

    @classmethod
    def _explicit_confidence_score(cls, raw_data: dict[str, Any]) -> float | None:
        value = cls._first_non_empty(raw_data, ("m_confidence", "confidence", "source_confidence"))
        if value in (None, "", [], {}):
            return None
        if isinstance(value, (int, float)):
            score = float(value)
            normalized_score = score / 100 if score > 1 else score
            return round(max(0.0, min(1.0, normalized_score)), 3)
        text = cls._sanitize(cls._normalize_key(value))
        if text in cls.CONFIDENCE_LABEL_SCORES:
            return cls.CONFIDENCE_LABEL_SCORES[text]
        return None

    @classmethod
    def _source_reliability(cls, raw_data: dict[str, Any], cluster_id: str, source: str) -> float:
        explicit = cls._explicit_confidence_score(raw_data)
        if explicit is not None:
            return round(explicit, 3)

        score = float(cls.CLUSTER_RELIABILITY_BASE.get(cluster_id, cls.DEFAULT_SOURCE_RELIABILITY))
        network_values = " ".join(cls._clean_text(value).lower() for value in cls._as_values(raw_data.get("m_network")))
        source_text = cls._clean_text(source).lower()
        combined = f"{network_values} {source_text}"

        if "clearnet" in combined or source_text.startswith("https://"):
            score += 0.03
        if "onion" in combined or "darkweb" in combined or "dark web" in combined:
            score -= 0.02
        if cluster_id in {"chat", "social"}:
            score -= 0.03
        if raw_data.get("m_source_url") or raw_data.get("m_base_url"):
            score += 0.02

        return round(max(0.1, min(0.95, float(score))), 3)

    @classmethod
    def _score_confidence(cls, base_confidence: float, evidence_count: int, source_reliability: float, unique_source_count: int = 1) -> float:
        evidence_bonus = min(max(evidence_count, 1) - 1, 10) * 0.015
        source_bonus = min(max(unique_source_count, 1) - 1, 5) * 0.02
        reliability_adjustment = (source_reliability - cls.DEFAULT_SOURCE_RELIABILITY) * 0.25
        confidence = float(base_confidence + evidence_bonus + source_bonus + reliability_adjustment)
        return round(max(0.1, min(0.99, confidence)), 3)

    @classmethod
    def _confidence_for_observation(cls, key: str, source_reliability: float) -> float:
        base_confidence = cls._confidence_for_key(key)
        return cls._score_confidence(base_confidence, 1, source_reliability)

    @staticmethod
    def _observation_confidence(observation: dict[str, Any]) -> float:
        return float(observation.get("confidence") or 0.0)

    @staticmethod
    def _merge_unique(existing: Any, additions: list[Any], limit: int | None = None) -> list[Any]:
        values = []
        seen = set()
        for value in (existing if isinstance(existing, list) else []):
            marker = str(value)
            if marker not in seen and value not in (None, "", [], {}):
                values.append(value)
                seen.add(marker)
        for value in additions:
            marker = str(value)
            if marker not in seen and value not in (None, "", [], {}):
                values.append(value)
                seen.add(marker)
        return values[:limit] if limit is not None else values

    @classmethod
    def _updated_evidence_count(cls, old: dict[str, Any], additions: list[Any]) -> int:
        existing_ids = cls._merge_unique([], old.get("evidence_doc_ids") or [])
        existing_markers = {str(value) for value in existing_ids}
        previous_count = max(int(old.get("evidence_count") or 0), len(existing_ids))
        new_ids = cls._merge_unique([], additions)
        return previous_count + sum(str(value) not in existing_markers for value in new_ids)

    @classmethod
    def _upsert_lock(cls, key: str):
        return cls.__upsert_locks[abs(hash(key)) % len(cls.__upsert_locks)]

    @classmethod
    def _is_arango_lock_timeout(cls, exc: Exception) -> bool:
        error_code = getattr(exc, "error_code", None)
        if error_code == cls.ARANGO_LOCK_TIMEOUT_ERROR_CODE:
            return True
        message = str(exc)
        return (
            f"ERR {cls.ARANGO_LOCK_TIMEOUT_ERROR_CODE}" in message
            or "timeout waiting to lock key" in message.lower()
        )

    @classmethod
    def _run_arango_with_retry_sync(cls, operation):
        attempt = 0
        while True:
            try:
                return operation()
            except Exception as exc:
                attempt += 1
                if attempt >= cls.ARANGO_LOCK_RETRY_ATTEMPTS or not cls._is_arango_lock_timeout(exc):
                    raise
                time.sleep(cls.ARANGO_LOCK_RETRY_BASE_DELAY * (2 ** (attempt - 1)))

    async def _run_arango_with_distributed_lock(self, lock_key: str, operation):
        redis_lock_key = f"arango:cti_graph:{lock_key}"
        async with redis_controller.getInstance().lock(
            redis_lock_key,
            timeout=self.ARANGO_DISTRIBUTED_LOCK_TTL,
            blocking_timeout=self.ARANGO_DISTRIBUTED_LOCK_WAIT,
        ):
            return await run_in_threadpool(lambda: self._run_arango_with_retry_sync(operation))

    @staticmethod
    def _min_seen(existing: Any, incoming: Any) -> Any:
        if not existing:
            return incoming
        if not incoming:
            return existing
        return incoming if str(incoming) < str(existing) else existing

    @staticmethod
    def _max_seen(existing: Any, incoming: Any) -> Any:
        if not existing:
            return incoming
        if not incoming:
            return existing
        return incoming if str(incoming) > str(existing) else existing

    @classmethod
    def _campaign_period(cls, published: str | None) -> str:
        if not published:
            return "unknown"
        match = re.match(r"(\d{4})-(\d{2})", published)
        return f"{match.group(1)}-{match.group(2)}" if match else "unknown"

    @classmethod
    def _derived_use_edge_type(cls, key: str) -> tuple[str, str, str]:
        if key in {"m_cve", "m_cwe", "m_vulnerability"}:
            return "uses_vulnerability", "uses", "uses vulnerability"
        if key in {"m_enterprise_attack_techniques"}:
            return "uses_technique", "uses", "uses technique"
        if key in {"m_enterprise_attack_tactics"}:
            return "uses_tactic", "uses", "uses tactic"
        if key == "m_family":
            return "uses_malware_family", "uses", "uses malware family"
        if key in {"m_crypto_address", "m_currencies"}:
            return "uses_financial_indicator", "uses", "uses financial indicator"
        if key in {"m_domain", "m_ip", "m_url", "m_encoded_urls", "m_asns", "m_mac_address", "m_user_agents"}:
            return "uses_infrastructure", "uses", "uses infrastructure"
        if key == "m_registry_key_path":
            return "uses_host_indicator", "uses", "uses host indicator"
        if key in {"m_md5", "m_sha1", "m_sha3_384", "m_sha256", "m_imphash", "m_telfhash", "m_tlsh", "m_signature"}:
            return "uses_file_indicator", "uses", "uses file indicator"
        if key in {"m_product", "m_platform", "m_vendor", "m_version", "m_web_server"}:
            return "targets_technology", "targets", "targets technology"
        if key == "m_yara_rule":
            return "detected_by_rule", "detected-by", "detected by rule"
        return "associated_with_indicator", "associated-with", "associated with"

    @classmethod
    def _safe_key(cls, *parts: Any, max_len: int = 240) -> str:
        raw = "_".join(cls._sanitize(cls._normalize_key(part)) for part in parts if part not in (None, ""))
        raw = raw.strip("_") or "cti"
        if len(raw) <= max_len:
            return raw
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
        return f"{raw[:max_len - 17]}_{digest}"

    @classmethod
    def _display_value(cls, key: str, value: Any) -> str:
        text = cls._clean_text(value)
        if key in {"m_cve", "m_cwe"}:
            return text.upper()
        return text

    @classmethod
    def _is_low_value_entity(cls, key: str, display_value: str, normalized_value: str) -> bool:
        if not normalized_value:
            return True
        if key in {"m_person", "m_location", "m_hashtag", "m_mention"} and len(normalized_value) <= 2:
            return True
        if key in {"m_username", "m_us_driver_license", "m_uk_nhs"} and len(normalized_value) <= 4:
            return True
        if key == "m_username" and normalized_value.isdigit():
            return True
        if key == "m_mac_address":
            text = cls._clean_text(display_value)
            if not re.fullmatch(r"[A-Fa-f0-9]{2}([:-][A-Fa-f0-9]{2}){5}", text):
                return True
        if key == "m_registry_key_path":
            text = cls._clean_text(display_value).upper()
            if not text.startswith(("HKCU\\", "HKLM\\", "HKCR\\", "HKU\\", "HKCC\\", "HKEY_")):
                return True
        if key == "m_uk_nhs":
            digits = re.sub(r"\D", "", display_value)
            if len(digits) != 10 or len(set(digits)) == 1:
                return True
        if key == "m_url" and normalized_value in {"http", "https"}:
            return True
        return False

    @classmethod
    def _entity_label(cls, key: str, display_value: str) -> str:
        prefix = allowed_key_titles.get(key) or EntityRequestGenerator.GRAPH_EXTRA_KEY_TITLES.get(key, key.replace("m_", "").replace("_", " ").title())
        return f"{prefix}: {display_value}"

    @classmethod
    def _confidence_for_key(cls, key: str) -> float:
        if key in {"m_cve", "m_cwe", "m_sha256", "m_sha3_384", "m_sha1", "m_md5", "m_ip", "m_domain", "m_url", "m_mac_address", "m_registry_key_path"}:
            return 0.95
        if key in {"m_company_name", "m_org", "m_email", "m_product", "m_yara_rule"}:
            return 0.85
        if key in {"m_username", "m_us_driver_license", "m_uk_nhs"}:
            return 0.65
        if key in {"m_country", "m_location", "m_person"}:
            return 0.55
        if key in {"m_team", "m_author", "m_reporter"}:
            return 0.7
        return 0.75

    @classmethod
    def _report_title(cls, raw_data: dict[str, Any], normalized_doc_id: str) -> str:
        title = cls._first_non_empty(raw_data, cls.REPORT_TITLE_KEYS)
        if title:
            return cls._truncate(title, 140)
        return normalized_doc_id

    @classmethod
    def _report_summary(cls, raw_data: dict[str, Any]) -> str:
        summary = cls._first_non_empty(raw_data, cls.REPORT_SUMMARY_KEYS)
        return cls._truncate(summary, 700)

    @classmethod
    def _report_published(cls, raw_data: dict[str, Any]) -> str | None:
        published = cls._first_non_empty(raw_data, cls.REPORT_DATE_KEYS)
        return cls._clean_text(published) or None

    @classmethod
    def _report_metadata(cls, raw_data: dict[str, Any]) -> dict[str, Any]:
        metadata = {}
        for key in cls.REPORT_METADATA_KEYS:
            value = raw_data.get(key)
            if value in (None, "", [], {}):
                continue
            if key in cls.REPORT_SUMMARY_KEYS:
                metadata[key] = cls._json_safe(cls._truncate(value, 700))
            else:
                metadata[key] = cls._json_safe(value)
        return metadata

    def _upsert_vertex_sync(self, document: dict[str, Any], merge_arrays: dict[str, list[Any]] | None = None):
        vertex_collection = self.__db.collection("cti_vertices")
        key = document["_key"]
        with self._upsert_lock(f"vertex:{key}"):
            old = (vertex_collection.get(key) if vertex_collection.has(key) else {}) or {}
            merged = {k: v for k, v in old.items() if k not in {"_id", "_rev"}}
            merged.update({k: v for k, v in document.items() if v not in (None, "", [], {})})
            for field, additions in (merge_arrays or {}).items():
                if field == "evidence_doc_ids":
                    merged["evidence_count"] = self._updated_evidence_count(old, additions)
                    continue
                merged[field] = self._merge_unique(old.get(field), additions, self.PROVENANCE_SAMPLE_LIMIT)
            merged.pop("evidence_doc_ids", None)
            if document.get("first_seen") or old.get("first_seen"):
                merged["first_seen"] = self._min_seen(old.get("first_seen"), document.get("first_seen"))
            if document.get("last_seen") or old.get("last_seen"):
                merged["last_seen"] = self._max_seen(old.get("last_seen"), document.get("last_seen"))
            if document.get("max_source_reliability") is not None or old.get("max_source_reliability") is not None:
                merged["max_source_reliability"] = float(max(float(old.get("max_source_reliability") or 0), float(document.get("max_source_reliability") or 0)))
            if "base_confidence" in merged and "evidence_count" in merged:
                merged["confidence"] = self._score_confidence(
                    float(merged.get("base_confidence") or 0.75),
                    int(merged.get("evidence_count") or 1),
                    float(merged.get("max_source_reliability") or self.DEFAULT_SOURCE_RELIABILITY),
                    len(merged.get("sources") or []),
                )
            self._run_arango_with_retry_sync(lambda: vertex_collection.insert(self._json_safe(merged), overwrite=True))

    async def _upsert_observation_vertex(self, document: dict[str, Any], aliases: list[str], source_module: str, source_fields: list[str], doc_id: str):
        await self._run_arango_with_distributed_lock(
            f"vertex:{document['_key']}",
            lambda: self._upsert_vertex_sync(
                document,
                {
                    "aliases": aliases,
                    "source_modules": [source_module],
                    "source_fields": source_fields,
                    "evidence_doc_ids": [doc_id],
                },
            )
        )

    def _upsert_derived_edge_sync(self, edge_document: dict[str, Any], doc_id: str, source: str, source_module: str, published: str | None, source_reliability: float):
        edge_collection = self.__db.collection("cti_edges")
        key = edge_document["_key"]
        with self._upsert_lock(f"edge:{key}"):
            old = (edge_collection.get(key) if edge_collection.has(key) else {}) or {}
            merged = {k: v for k, v in old.items() if k not in {"_id", "_rev"}}
            merged.update({k: v for k, v in edge_document.items() if v not in (None, "", [], {})})
            merged["base_confidence"] = float(max(
                float(old.get("base_confidence") or 0),
                float(edge_document.get("base_confidence") or 0.75),
            ))
            merged.pop("evidence_doc_ids", None)
            merged["source_modules"] = self._merge_unique(old.get("source_modules"), [source_module], self.PROVENANCE_SAMPLE_LIMIT)
            merged["sources"] = self._merge_unique(old.get("sources"), [source], self.PROVENANCE_SAMPLE_LIMIT)
            merged["first_seen"] = self._min_seen(old.get("first_seen"), published)
            merged["last_seen"] = self._max_seen(old.get("last_seen"), published)
            merged["evidence_count"] = self._updated_evidence_count(old, [doc_id])
            merged["max_source_reliability"] = float(max(float(old.get("max_source_reliability") or 0), source_reliability))
            merged["confidence"] = self._score_confidence(
                float(merged.get("base_confidence") or 0.75),
                merged["evidence_count"],
                merged["max_source_reliability"],
                len(merged["sources"]),
            )
            self._run_arango_with_retry_sync(lambda: edge_collection.insert(self._json_safe(merged), overwrite=True))

    async def _upsert_derived_edge(self, from_vertex: str, to_vertex: str, edge_type: str, relationship_type: str, label: str, doc_id: str, source: str, source_module: str, published: str | None, source_reliability: float, base_confidence: float, extra: dict[str, Any] | None = None):
        edge_key = self._safe_key("derived", edge_type, from_vertex, to_vertex)
        edge_document = {
            "_key": edge_key,
            "_from": from_vertex,
            "_to": to_vertex,
            "type": f"derived_{edge_type}",
            "edge_type": edge_type,
            "relationship_type": relationship_type,
            "label": label,
            "base_confidence": round(base_confidence, 3),
            "derived": True,
            "schema_version": self.GRAPH_SCHEMA_VERSION,
        }
        if extra:
            edge_document.update(extra)
        await self._run_arango_with_distributed_lock(
            f"edge:{edge_key}",
            lambda: self._upsert_derived_edge_sync(
                edge_document,
                doc_id,
                source,
                source_module,
                published,
                source_reliability,
            )
        )

    async def _upsert_campaign_vertex(self, actor_observation: dict[str, Any], cluster_id: str, doc_id: str, source: str, published: str | None, source_reliability: float):
        period = self._campaign_period(published)
        campaign_key = self._safe_key("campaign", actor_observation["normalized_value"], cluster_id, period)
        campaign_label = f"{actor_observation['display_value']} {self.CLUSTER_LABELS.get(cluster_id, cluster_id.title())} {period}"
        document = {
            "_key": campaign_key,
            "type": "campaign",
            "node_class": "campaign",
            "stix_type": "campaign",
            "label": campaign_label,
            "display_value": campaign_label,
            "actor_key": actor_observation["prop_key"],
            "actor_label": actor_observation["display_value"],
            "cluster_id": cluster_id,
            "period": period,
            "base_confidence": 0.72,
            "confidence": self._score_confidence(0.72, 1, source_reliability),
            "first_seen": published,
            "last_seen": published,
            "max_source_reliability": source_reliability,
            "schema_version": self.GRAPH_SCHEMA_VERSION,
        }
        await run_in_threadpool(
            lambda: self._upsert_vertex_sync(
                document,
                {
                    "evidence_doc_ids": [doc_id],
                    "source_modules": [cluster_id],
                    "sources": [source],
                },
            )
        )
        return f"cti_vertices/{campaign_key}"

    async def _create_derived_intelligence(self, observations: list[dict[str, Any]], normalized_doc_id: str, normalized_cluster_id: str, published: str | None, source: str, source_reliability: float):
        actors = [item for item in observations if item["entity_role"] == "threat_actor"]
        organizations = [
            item for item in observations
            if item["entity_role"] in {"victim_organization", "target_organization"}
        ]
        usable_entities = [
            item for item in observations
            if item["key"] in self.DERIVED_USES_KEYS
            and item["entity_role"] not in {"threat_actor", "victim_organization", "target_organization", "reporting_source"}
        ]
        techniques = [item for item in observations if item["key"] == "m_enterprise_attack_techniques"]
        tactics = [item for item in observations if item["key"] == "m_enterprise_attack_tactics"]

        for actor in actors:
            actor_vertex = actor["prop_vertex"]
            campaign_vertex = await self._upsert_campaign_vertex(
                actor,
                normalized_cluster_id,
                normalized_doc_id,
                source,
                published,
                source_reliability,
            )

            await self._upsert_derived_edge(
                actor_vertex,
                campaign_vertex,
                "associated_with_campaign",
                "associated-with",
                "associated with campaign",
                normalized_doc_id,
                source,
                normalized_cluster_id,
                published,
                source_reliability,
                min(self._observation_confidence(actor), 0.78),
                {"from_entity_role": actor["entity_role"], "to_entity_role": "campaign"},
            )

            for organization in organizations:
                derived_edge_type = "impacts_organization" if organization["entity_role"] == "victim_organization" else "targets_organization"
                derived_relationship_type = "impacts" if organization["entity_role"] == "victim_organization" else "targets"
                derived_label = "impacts organization" if organization["entity_role"] == "victim_organization" else "targets organization"
                base_confidence = min(self._observation_confidence(actor), self._observation_confidence(organization))
                extra = {
                    "from_entity_role": actor["entity_role"],
                    "to_entity_role": organization["entity_role"],
                    "evidence_cluster_id": normalized_cluster_id,
                }
                await self._upsert_derived_edge(
                    actor_vertex,
                    organization["prop_vertex"],
                    derived_edge_type,
                    derived_relationship_type,
                    derived_label,
                    normalized_doc_id,
                    source,
                    normalized_cluster_id,
                    published,
                    source_reliability,
                    base_confidence,
                    extra,
                )
                await self._upsert_derived_edge(
                    campaign_vertex,
                    organization["prop_vertex"],
                    derived_edge_type,
                    derived_relationship_type,
                    derived_label,
                    normalized_doc_id,
                    source,
                    normalized_cluster_id,
                    published,
                    source_reliability,
                    base_confidence,
                    {"from_entity_role": "campaign", "to_entity_role": organization["entity_role"]},
                )

            for target in usable_entities:
                if target["prop_vertex"] == actor_vertex:
                    continue
                derived_edge_type, derived_relationship_type, derived_label = self._derived_use_edge_type(target["key"])
                base_confidence = min(self._observation_confidence(actor), self._observation_confidence(target))
                extra = {
                    "from_entity_role": actor["entity_role"],
                    "to_entity_role": target["entity_role"],
                    "target_node_class": target["node_class"],
                    "target_type": target["key"],
                    "evidence_cluster_id": normalized_cluster_id,
                }
                await self._upsert_derived_edge(
                    actor_vertex,
                    target["prop_vertex"],
                    derived_edge_type,
                    derived_relationship_type,
                    derived_label,
                    normalized_doc_id,
                    source,
                    normalized_cluster_id,
                    published,
                    source_reliability,
                    base_confidence,
                    extra,
                )
                await self._upsert_derived_edge(
                    campaign_vertex,
                    target["prop_vertex"],
                    derived_edge_type,
                    derived_relationship_type,
                    derived_label,
                    normalized_doc_id,
                    source,
                    normalized_cluster_id,
                    published,
                    source_reliability,
                    base_confidence,
                    {"from_entity_role": "campaign", "to_entity_role": target["entity_role"], "target_type": target["key"]},
                )

        for technique in techniques:
            for tactic in tactics:
                await self._upsert_derived_edge(
                    technique["prop_vertex"],
                    tactic["prop_vertex"],
                    "belongs_to_tactic",
                    "belongs-to",
                    "belongs to tactic",
                    normalized_doc_id,
                    source,
                    normalized_cluster_id,
                    published,
                    source_reliability,
                    min(self._observation_confidence(technique), self._observation_confidence(tactic)),
                    {"from_entity_role": "attack_technique", "to_entity_role": "attack_tactic"},
                )

    async def _ensure_default_clusters(self):
        vertex_collection = self.__db.collection("cti_vertices")
        for cluster_key, cluster_label in self.CLUSTER_LABELS.items():
            await run_in_threadpool(
                lambda key=cluster_key, label=cluster_label: vertex_collection.insert(
                    {
                        "_key": key,
                        "type": "cluster",
                        "node_class": "cluster",
                        "stix_type": "grouping",
                        "label": label,
                        "display_value": label,
                        "schema_version": self.GRAPH_SCHEMA_VERSION,
                    },
                    overwrite=True,
                )
            )

    async def get_entity_relations(self, query: EntityQueryModel):
        try:
            normalized_value = self._sanitize(self._normalize_key(query.query_value))
            normalized_type = self._sanitize(self._normalize_key(query.model_type)) if query.model_type else ""

            requested_depth = int(query.depth)
            if requested_depth < 1:
                requested_depth = 1
            if requested_depth > 5:
                requested_depth = 5
            depth_level = requested_depth
            document_limit = int(query.edge)
            if document_limit < 20:
                document_limit = 20
            if document_limit > 800:
                document_limit = 800

            query_str = ""
            bind_vars = {}
            scope_cluster = ""
            raw_scope_cluster = self._clean_text(getattr(query, "scope_cluster", ""))
            if raw_scope_cluster:
                candidate_scope_cluster = self._canonical_cluster_id(raw_scope_cluster)
                if candidate_scope_cluster in self.CLUSTER_LABELS:
                    scope_cluster = candidate_scope_cluster

            if query.data_point_type == "cluster" and normalized_type == "cluster":
                queried_id, query_str, bind_vars = EntityRequestGenerator.get_cluster_documents_query(
                    normalized_value=normalized_value, document_limit=document_limit)
            elif query.data_point_type == "property" and normalized_type == "all":
                queried_id, query_str, bind_vars = EntityRequestGenerator.build_property_search_query(
                    normalized_value, document_limit, scope_cluster)
            else:
                queried_id, query_str, bind_vars = EntityRequestGenerator.get_document_or_property_query(
                    normalized_value=normalized_value,
                    normalized_type=normalized_type,
                    depth_level=depth_level,
                    document_limit=document_limit,
                    data_point_type=query.data_point_type)

            result_obj = await run_in_threadpool(lambda: list(self.__db.aql.execute(query_str, bind_vars=bind_vars)))
            result_obj = result_obj[0] if result_obj else {}

            results = result_obj.get("depth1", [])
            matched_vertex_ids = result_obj.get("matched_ids", []) or []
            limit_reached = result_obj.get("limit_hit_depth1", False)

            unique_edges = set()
            final_results = []
            for item in results:
                edge = item.get('edge')
                if edge:
                    signature = (edge['_from'], edge['_to'], edge.get('type'))
                    if signature not in unique_edges:
                        unique_edges.add(signature)
                        final_results.append(item)

            return {"results": final_results, "limit_reached": limit_reached, "queried_id": queried_id, "matched_vertex_ids": matched_vertex_ids}

        except Exception as ex:
            log.g().e(f"ARANGO ENTITY RELATION FETCH ERROR: {ex}")
            return {"results": [], "limit_reached": False, "queried_id": None, "matched_vertex_ids": []}

    @classmethod
    def _graph_query_values(cls, query_values: list[Any] | None, query_value: Any) -> list[str]:
        raw_values = query_values if query_values else [query_value]
        values: list[str] = []
        seen: set[str] = set()
        for value in raw_values:
            cleaned = cls._clean_text(value)
            if not cleaned:
                continue
            normalized = cls._sanitize(cls._normalize_key(cleaned))
            if normalized in seen:
                continue
            seen.add(normalized)
            values.append(cleaned)
        return values

    @classmethod
    def _merge_graph_query_values(cls, first: list[str], second: list[str]) -> list[str]:
        values: list[str] = []
        seen: set[str] = set()
        for value in [*first, *second]:
            cleaned = cls._clean_text(value)
            normalized = cls._sanitize(cls._normalize_key(cleaned))
            if not cleaned or normalized in seen:
                continue
            seen.add(normalized)
            values.append(cleaned)
        return values

    @classmethod
    def _graph_batch_items(cls, request_items: list[Any], query: EntityGraphBatchQueryModel) -> list[dict[str, Any]]:
        normalized_items: list[dict[str, Any]] = []

        for item in request_items:
            data_point_type = getattr(item, "data_point_type", query.data_point_type)
            model_type = getattr(item, "model_type", query.model_type)
            scope_cluster = getattr(item, "scope_cluster", "") or query.scope_cluster
            values = cls._graph_query_values(
                getattr(item, "query_values", []),
                getattr(item, "query_value", ""),
            )
            if not values:
                continue

            raw_operator = getattr(item, "operator", "||")
            operator = "&&" if raw_operator in {"&&", "AND", "and"} else "||"
            normalized_item = {
                "data_point_type": data_point_type,
                "model_type": model_type,
                "query_values": values,
                "operator": operator,
                "scope_cluster": scope_cluster,
            }

            if data_point_type == "property" and model_type in cls.GRAPH_BATCH_LIST_KEYS:
                previous = normalized_items[-1] if normalized_items else None
                if previous is not None:
                    can_merge_with_previous = (
                        operator != "&&"
                        and previous["data_point_type"] == data_point_type
                        and previous["model_type"] == model_type
                        and previous["scope_cluster"] == scope_cluster
                        and previous["operator"] != "&&"
                    )
                    if can_merge_with_previous:
                        previous["query_values"] = cls._merge_graph_query_values(previous["query_values"], values)
                        continue

            normalized_items.append(normalized_item)

        return normalized_items

    @staticmethod
    def _graph_document_limit(edge: Any) -> int:
        try:
            document_limit = int(edge)
        except (TypeError, ValueError):
            document_limit = 25
        if document_limit < 20:
            document_limit = 20
        if document_limit > 800:
            document_limit = 800
        return document_limit

    @staticmethod
    def _graph_and_candidate_scan_limit(document_limit: int) -> int:
        return min(max(document_limit * 200, 5000), 50000)

    @classmethod
    def _conjunctive_graph_groups(cls, request_items: list[dict[str, Any]]) -> dict[str, Any] | None:
        if len(request_items) < 2:
            return None

        scope_cluster = request_items[0]["scope_cluster"]
        match_groups: list[dict[str, Any]] = []
        for index, item in enumerate(request_items):
            if index > 0 and item["operator"] != "&&":
                return None
            if item["scope_cluster"] != scope_cluster:
                return None

            data_point_type = item["data_point_type"]
            model_type = item["model_type"]
            group: list[str] = []
            seen_group_ids: set[str] = set()
            edge_type = ""

            if data_point_type == "cluster" and model_type == "cluster":
                for value in item["query_values"]:
                    normalized_value = cls._sanitize(cls._normalize_key(value))
                    if normalized_value == "all":
                        cluster_ids = [f"cti_vertices/{cluster_key}" for cluster_key in cls.CLUSTER_LABELS]
                    else:
                        cluster_key = cls._canonical_cluster_id(normalized_value)
                        cluster_ids = [f"cti_vertices/{cluster_key}"] if cluster_key in cls.CLUSTER_LABELS else []
                    for cluster_id in cluster_ids:
                        if cluster_id in seen_group_ids:
                            continue
                        seen_group_ids.add(cluster_id)
                        group.append(cluster_id)
                group_kind = "cluster"
            elif data_point_type == "property" and model_type not in {"", "all"}:
                normalized_type = cls._sanitize(cls._normalize_key(model_type))
                for value in item["query_values"]:
                    normalized_value = cls._sanitize(cls._normalize_key(value))
                    if not normalized_type or not normalized_value:
                        continue
                    property_id = f"cti_vertices/{normalized_type}:{normalized_value}"
                    if property_id in seen_group_ids:
                        continue
                    seen_group_ids.add(property_id)
                    group.append(property_id)
                group_kind = "property"
                edge_type = f"has_{normalized_type}"
            else:
                return None

            if not group:
                return None
            match_group = {"kind": group_kind, "ids": group}
            if group_kind == "property":
                match_group["edge_type"] = edge_type
            match_groups.append(match_group)

        return {
            "match_groups": match_groups,
            "queried_ids": [match_id for group in match_groups for match_id in group["ids"]],
            "scope_cluster": scope_cluster,
        }

    @classmethod
    def _dedupe_graph_results(cls, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        merged: dict[str, dict[str, Any]] = {}
        for item in results:
            edge = item.get("edge") or {}
            vertex = item.get("vertex") or {}
            key = f"{edge.get('_id', '')}:{vertex.get('_id', '')}:{vertex.get('_key', '')}"
            if not key.strip(":"):
                key = repr(item)
            if key not in merged:
                merged[key] = item
        return list(merged.values())

    @classmethod
    def _extract_document_ids_from_graph_result(cls, item: dict[str, Any]) -> list[str]:
        ids: set[str] = set()

        def add_document_id(value: Any):
            doc_id = cls._clean_text(value)
            if not doc_id:
                return
            cluster_key = doc_id.replace("cti_vertices/", "", 1)
            if cluster_key in cls.CLUSTER_LABELS:
                return
            ids.add(doc_id)

        def inspect_edge(edge_item: Any):
            if not isinstance(edge_item, dict):
                return
            edge_type = cls._clean_text(edge_item.get("type"))
            if edge_type == "cluster_to_doc":
                add_document_id(edge_item.get("_to"))
            elif edge_type.startswith("has_"):
                add_document_id(edge_item.get("_from"))

        def inspect_vertex(vertex_item: Any):
            if not isinstance(vertex_item, dict):
                return
            if cls._clean_text(vertex_item.get("type")).lower() == "document":
                add_document_id(vertex_item.get("_id"))

        inspect_vertex(item.get("vertex"))
        inspect_edge(item.get("edge"))
        path = item.get("path") or {}
        if isinstance(path, dict):
            for vertex in path.get("vertices") or []:
                inspect_vertex(vertex)
            for edge in path.get("edges") or []:
                inspect_edge(edge)
        return list(ids)

    @classmethod
    def _extract_document_ids_from_graph_results(cls, results: list[dict[str, Any]]) -> set[str]:
        ids: set[str] = set()
        for item in results:
            ids.update(cls._extract_document_ids_from_graph_result(item))
        return ids

    @staticmethod
    def _union_sets(first: set[str], second: set[str]) -> set[str]:
        return first | second

    @staticmethod
    def _intersect_sets(first: set[str], second: set[str]) -> set[str]:
        return first & second

    @classmethod
    def _merge_graph_result_groups(cls, response_groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not response_groups:
            return []

        aggregate = response_groups[0].get("results") or []
        aggregate_document_ids = cls._extract_document_ids_from_graph_results(aggregate)
        for group in response_groups[1:]:
            current = group.get("results") or []
            operator = group.get("operator") or "||"
            if operator != "&&":
                aggregate = cls._dedupe_graph_results([*aggregate, *current])
                aggregate_document_ids = cls._union_sets(
                    aggregate_document_ids,
                    cls._extract_document_ids_from_graph_results(current),
                )
                continue

            current_document_ids = cls._extract_document_ids_from_graph_results(current)
            if not aggregate_document_ids or not current_document_ids:
                aggregate = []
                break

            shared_document_ids = cls._intersect_sets(aggregate_document_ids, current_document_ids)
            aggregate = cls._dedupe_graph_results([
                item
                for item in [*aggregate, *current]
                if any(document_id in shared_document_ids for document_id in cls._extract_document_ids_from_graph_result(item))
            ])
            aggregate_document_ids = shared_document_ids

        return cls._dedupe_graph_results(aggregate)

    @classmethod
    def _group_graph_results_by_document(cls, results: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
        grouped: dict[str, list[dict[str, Any]]] = {}
        ordered_document_ids: list[str] = []
        unscoped_results: list[list[dict[str, Any]]] = []

        for item in results:
            document_ids = cls._extract_document_ids_from_graph_result(item)
            document_id = document_ids[0] if document_ids else ""
            if not document_id:
                unscoped_results.append([item])
                continue
            if document_id not in grouped:
                grouped[document_id] = []
                ordered_document_ids.append(document_id)
            grouped[document_id].append(item)

        return [grouped[document_id] for document_id in ordered_document_ids] + unscoped_results

    @classmethod
    def _interleave_graph_result_sets_by_document(cls, result_sets: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
        grouped_sets = [cls._group_graph_results_by_document(results) for results in result_sets if results]
        if not grouped_sets:
            return []

        interleaved: list[dict[str, Any]] = []
        max_group_count = max(len(groups) for groups in grouped_sets)
        for group_index in range(max_group_count):
            for groups in grouped_sets:
                if group_index < len(groups):
                    interleaved.extend(groups[group_index])
        return cls._dedupe_graph_results(interleaved)

    @classmethod
    def _limit_graph_results_by_documents(cls, results: list[dict[str, Any]], document_limit: int) -> list[dict[str, Any]]:
        if document_limit < 1:
            return cls._dedupe_graph_results(results)

        ordered_document_ids: list[str] = []
        seen_document_ids: set[str] = set()
        for item in results:
            for document_id in cls._extract_document_ids_from_graph_result(item):
                if document_id in seen_document_ids:
                    continue
                seen_document_ids.add(document_id)
                ordered_document_ids.append(document_id)

        if len(ordered_document_ids) <= document_limit:
            return cls._dedupe_graph_results(results)

        allowed_document_ids = set(ordered_document_ids[:document_limit])
        limited_results = [
            item
            for item in results
            if any(document_id in allowed_document_ids for document_id in cls._extract_document_ids_from_graph_result(item))
        ]
        return cls._dedupe_graph_results(limited_results)

    async def _get_conjunctive_property_only_relations(self, conjunctive_groups: dict[str, Any], document_limit: int):
        scope_cluster = ""
        raw_scope_cluster = self._clean_text(conjunctive_groups["scope_cluster"])
        if raw_scope_cluster:
            candidate_scope_cluster = self._canonical_cluster_id(raw_scope_cluster)
            if candidate_scope_cluster in self.CLUSTER_LABELS:
                scope_cluster = f"cti_vertices/{candidate_scope_cluster}"

        query_str = """
        LET group_doc_matches = (
          FOR group_index IN 0..(LENGTH(@match_groups) - 1)
            LET group = @match_groups[group_index]
            LET group_doc_ids = UNIQUE(FLATTEN(
              FOR property_id IN group.ids
                RETURN (
                  FOR edge IN cti_edges
                    FILTER edge._to == property_id AND edge.type == group.edge_type
                    LIMIT @candidate_scan_limit
                    RETURN edge._from
                )
            ))
            FOR doc_id IN group_doc_ids
              RETURN {
                doc_id: doc_id,
                group_index: group_index
              }
        )

        LET matched_doc_ids = (
          FOR match IN group_doc_matches
            COLLECT doc_id = match.doc_id INTO grouped
            LET matched_group_indexes = UNIQUE(grouped[*].match.group_index)
            FILTER LENGTH(matched_group_indexes) == LENGTH(@match_groups)
            LET in_scope = @scope_cluster_id == "" ? true : LENGTH(
              FOR scope_edge IN cti_edges
                FILTER scope_edge._from == @scope_cluster_id
                  AND scope_edge._to == doc_id
                  AND scope_edge.type == "cluster_to_doc"
                LIMIT 1
                RETURN 1
            ) > 0
            FILTER in_scope
            LIMIT @document_limit
            RETURN doc_id
        )

        LET property_edges = (
          FOR doc_id IN matched_doc_ids
            LET doc = DOCUMENT(doc_id)
            FILTER doc != null AND doc.type == "document"
            FOR group IN @match_groups
              FOR property_id IN group.ids
                FOR edge IN cti_edges
                  FILTER edge._from == doc_id
                    AND edge._to == property_id
                    AND edge.type == group.edge_type
                  LET property = DOCUMENT(edge._to)
                  FILTER property != null
                  RETURN {
                    vertex: KEEP(doc, "_id", "_key", "_rev", "type", "node_class", "doc_id", "m_document_id", "cluster_id", "module", "label", "display_value", "title", "summary", "published", "source", "source_reliability"),
                    edge: edge,
                    path: {
                      vertices: [property, doc],
                      edges: [edge]
                    }
                  }
        )

        LET cluster_edges = (
          FOR doc_id IN matched_doc_ids
            FOR edge IN cti_edges
              FILTER edge._to == doc_id AND edge.type == "cluster_to_doc"
              LET cluster_key = PARSE_IDENTIFIER(edge._from).key
              FILTER cluster_key IN @default_clusters
              LET cluster = DOCUMENT(edge._from)
              FILTER cluster != null
              RETURN {
                vertex: cluster,
                edge: edge,
                path: null
              }
        )

        RETURN {
          depth1: APPEND(property_edges, cluster_edges),
          limit_hit_depth1: LENGTH(matched_doc_ids) >= @document_limit,
          matched_ids: @queried_ids
        }
        """

        bind_vars = {
            "candidate_scan_limit": self._graph_and_candidate_scan_limit(document_limit),
            "default_clusters": list(self.CLUSTER_LABELS.keys()),
            "document_limit": document_limit,
            "match_groups": conjunctive_groups["match_groups"],
            "queried_ids": conjunctive_groups["queried_ids"],
            "scope_cluster_id": scope_cluster,
        }
        return await self._execute_conjunctive_graph_query(query_str, bind_vars, conjunctive_groups["queried_ids"])

    async def _execute_conjunctive_graph_query(self, query_str: str, bind_vars: dict, queried_ids: list):
        result_obj = await run_in_threadpool(lambda: list(self.__db.aql.execute(query_str, bind_vars=bind_vars)))
        result_obj = result_obj[0] if result_obj else {}
        results = self._dedupe_graph_results(result_obj.get("depth1", []) or [])
        return {
            "results": results,
            "limit_reached": bool(result_obj.get("limit_hit_depth1")),
            "queried_id": queried_ids[0] if queried_ids else None,
            "queried_ids": queried_ids,
            "matched_vertex_ids": result_obj.get("matched_ids", []) or [],
        }

    async def _get_conjunctive_graph_relations(self, request_items: list[dict[str, Any]], document_limit: int):
        conjunctive_groups = self._conjunctive_graph_groups(request_items)
        if conjunctive_groups is None:
            return None

        if all(group["kind"] == "property" for group in conjunctive_groups["match_groups"]):
            return await self._get_conjunctive_property_only_relations(conjunctive_groups, document_limit)

        scope_cluster = ""
        raw_scope_cluster = self._clean_text(conjunctive_groups["scope_cluster"])
        if raw_scope_cluster:
            candidate_scope_cluster = self._canonical_cluster_id(raw_scope_cluster)
            if candidate_scope_cluster in self.CLUSTER_LABELS:
                scope_cluster = f"cti_vertices/{candidate_scope_cluster}"

        query_str = """
        LET ordered_match_groups = (
          FOR group IN @match_groups
            LET cluster_count = group.kind == "cluster" ? SUM(
              FOR match_id IN group.ids
                RETURN LENGTH(
                  FOR seed_edge IN cti_edges
                    FILTER seed_edge._from == match_id AND seed_edge.type == "cluster_to_doc"
                    LIMIT @seed_probe_limit
                    RETURN 1
                )
            ) : 0
            LET property_count = group.kind == "property" ? SUM(
              FOR match_id IN group.ids
                RETURN LENGTH(
                  FOR seed_edge IN cti_edges
                    FILTER seed_edge._to == match_id AND seed_edge.type == group.edge_type
                    LIMIT @seed_probe_limit
                    RETURN 1
                )
            ) : 0
            LET capped_count = cluster_count + property_count
            SORT capped_count ASC
            RETURN group
        )

        LET seed_group = FIRST(ordered_match_groups)

        LET cluster_seed_doc_ids = seed_group.kind == "cluster" ? UNIQUE(FLATTEN(
          FOR match_id IN seed_group.ids
            RETURN (
              FOR seed_edge IN cti_edges
                FILTER seed_edge._from == match_id AND seed_edge.type == "cluster_to_doc"
                LIMIT @candidate_scan_limit
                RETURN seed_edge._to
            )
        )) : []

        LET property_seed_doc_ids = seed_group.kind == "property" ? UNIQUE(FLATTEN(
          FOR match_id IN seed_group.ids
            RETURN (
              FOR seed_edge IN cti_edges
                FILTER seed_edge._to == match_id AND seed_edge.type == seed_group.edge_type
                LIMIT @candidate_scan_limit
                RETURN seed_edge._from
            )
        )) : []

        LET seed_doc_ids = APPEND(cluster_seed_doc_ids, property_seed_doc_ids)

        LET matched_doc_ids = (
          FOR doc_id IN seed_doc_ids
            LET matched_group_count = LENGTH(
              FOR group IN ordered_match_groups
                LET cluster_group_matches = group.kind == "cluster" ? (
                  FOR match_id IN group.ids
                    FOR candidate_edge IN cti_edges
                      FILTER candidate_edge._from == match_id
                        AND candidate_edge._to == doc_id
                        AND candidate_edge.type == "cluster_to_doc"
                      LIMIT 1
                      RETURN 1
                ) : []
                LET property_group_matches = group.kind == "property" ? (
                  FOR match_id IN group.ids
                    FOR candidate_edge IN cti_edges
                      FILTER candidate_edge._from == doc_id
                        AND candidate_edge._to == match_id
                        AND candidate_edge.type == group.edge_type
                      LIMIT 1
                      RETURN 1
                ) : []
                LET group_matches = APPEND(cluster_group_matches, property_group_matches)
                FILTER LENGTH(group_matches) > 0
                RETURN 1
            )
            FILTER matched_group_count == LENGTH(ordered_match_groups)
            LET in_scope = @scope_cluster_id == "" ? true : LENGTH(
              FOR scope_edge IN cti_edges
                FILTER scope_edge._from == @scope_cluster_id
                  AND scope_edge._to == doc_id
                  AND scope_edge.type == "cluster_to_doc"
                LIMIT 1
                RETURN 1
            ) > 0
            FILTER in_scope
            LIMIT @document_limit
            RETURN doc_id
        )

        LET property_edges = (
          FOR doc_id IN matched_doc_ids
            LET doc = DOCUMENT(doc_id)
            FILTER doc != null AND doc.type == "document"
            FOR group IN ordered_match_groups
              FILTER group.kind == "property"
              FOR property_id IN group.ids
                FOR edge IN cti_edges
                  FILTER edge._from == doc_id
                    AND edge._to == property_id
                    AND edge.type == group.edge_type
                  LET property = DOCUMENT(edge._to)
                  FILTER property != null
                  RETURN {
                    vertex: KEEP(doc, "_id", "_key", "_rev", "type", "node_class", "doc_id", "m_document_id", "cluster_id", "module", "label", "display_value", "title", "summary", "published", "source", "source_reliability"),
                    edge: edge,
                    path: {
                      vertices: [property, doc],
                      edges: [edge]
                    }
                  }
        )

        LET cluster_edges = (
          FOR doc_id IN matched_doc_ids
            FOR edge IN cti_edges
              FILTER edge._to == doc_id AND edge.type == "cluster_to_doc"
              LET cluster_key = PARSE_IDENTIFIER(edge._from).key
              FILTER cluster_key IN @default_clusters
              LET cluster = DOCUMENT(edge._from)
              FILTER cluster != null
              RETURN {
                vertex: cluster,
                edge: edge,
                path: null
              }
        )

        RETURN {
          depth1: APPEND(property_edges, cluster_edges),
          limit_hit_depth1: LENGTH(matched_doc_ids) >= @document_limit OR LENGTH(seed_doc_ids) >= @candidate_scan_limit,
          matched_ids: @queried_ids
        }
        """

        bind_vars = {
            "candidate_scan_limit": self._graph_and_candidate_scan_limit(document_limit),
            "default_clusters": list(self.CLUSTER_LABELS.keys()),
            "document_limit": document_limit,
            "match_groups": conjunctive_groups["match_groups"],
            "queried_ids": conjunctive_groups["queried_ids"],
            "scope_cluster_id": scope_cluster,
            "seed_probe_limit": min(document_limit * 20, 1000),
        }
        return await self._execute_conjunctive_graph_query(query_str, bind_vars, conjunctive_groups["queried_ids"])

    async def get_entity_relations_batch(self, query: EntityGraphBatchQueryModel):
        try:
            response_groups: list[dict[str, Any]] = []
            queried_ids: list[str] = []
            matched_vertex_ids: list[str] = []
            limit_reached = False
            request_items = self._graph_batch_items(query.requests or [query], query)
            document_limit = self._graph_document_limit(query.edge)

            if getattr(self, "_entity_manager__db", None) is not None:
                conjunctive_response = await self._get_conjunctive_graph_relations(request_items, document_limit)
                if conjunctive_response is not None:
                    return conjunctive_response

            for item in request_items:
                group_result_sets: list[list[dict[str, Any]]] = []
                for value in item["query_values"]:
                    relation_query = EntityQueryModel(
                        data_point_type=item["data_point_type"],
                        model_type=item["model_type"],
                        query_value=value,
                        edge=query.edge,
                        depth=query.depth,
                        scope_cluster=item["scope_cluster"],
                    )
                    response = await self.get_entity_relations(relation_query)
                    group_result_sets.append(response.get("results") or [])
                    limit_reached = limit_reached or bool(response.get("limit_reached"))
                    queried_id = response.get("queried_id")
                    if queried_id and queried_id not in queried_ids:
                        queried_ids.append(queried_id)
                    for matched_id in response.get("matched_vertex_ids") or []:
                        if matched_id not in matched_vertex_ids:
                            matched_vertex_ids.append(matched_id)

                response_groups.append({
                    "operator": item["operator"],
                    "results": self._interleave_graph_result_sets_by_document(group_result_sets),
                })

            merged_results = self._merge_graph_result_groups(response_groups)
            limited_results = self._limit_graph_results_by_documents(
                merged_results,
                document_limit,
            )
            return {
                "results": limited_results,
                "limit_reached": limit_reached,
                "queried_id": queried_ids[0] if queried_ids else None,
                "queried_ids": queried_ids,
                "matched_vertex_ids": matched_vertex_ids,
            }
        except Exception as ex:
            log.g().e(f"ARANGO ENTITY RELATION BATCH FETCH ERROR: {ex}")
            return {"results": [], "limit_reached": False, "queried_id": None, "queried_ids": [], "matched_vertex_ids": []}

    async def create_or_update_entity_nodes(self, entity: entity_model):
        try:
            raw_data = entity.model_dump()
            raw_doc_id = self._first_non_empty(
                raw_data,
                ("m_document_id", "m_hash", "m_url", "m_title", "m_message_id", "m_base_url"),
            )
            if raw_doc_id in (None, "", [], {}):
                return {"status": "skipped", "message": "Entity has no stable document identifier."}
            normalized_doc_id = self._sanitize(self._normalize_key(raw_doc_id))
            if not normalized_doc_id:
                return {"status": "skipped", "message": "Entity has no stable document identifier."}
            normalized_cluster_id = self._canonical_cluster_id(raw_data.get("m_cluster_id"))
            source = self._source_name(raw_data)
            source_reliability = self._source_reliability(raw_data, normalized_cluster_id, source)

            doc_vertex = f"cti_vertices/{normalized_doc_id}"
            cluster_vertex = f"cti_vertices/{normalized_cluster_id}"

            raw_properties = {k: v for k, v in raw_data.items() if k not in {"m_cluster_id", "m_document_id"}}

            properties: dict[str, dict[str, dict[str, Any]]] = {}
            for source_key, value in raw_properties.items():
                canonical = self._canonical_graph_key(source_key, normalized_cluster_id)
                if not canonical:
                    continue
                for item in self._as_graph_values(canonical, value):
                    if item in (None, "", [], {}):
                        continue
                    graph_key = self._canonical_graph_value_key(canonical, item)
                    if not graph_key:
                        continue
                    property_value_key, property_display_value, alias = self._canonical_entity_value(graph_key, item)
                    if graph_key == "m_attacker":
                        resolved_item, resolved_display, resolved_alias = await run_in_threadpool(
                            lambda actor_value_key=property_value_key, actor_display_value=property_display_value:
                            self._resolve_existing_actor_variant_sync(actor_value_key, actor_display_value)
                        )
                        property_value_key = resolved_item
                        property_display_value = resolved_display
                        alias = resolved_alias or alias
                    if self._is_low_value_entity(graph_key, property_display_value, property_value_key):
                        continue
                    observation = properties.setdefault(graph_key, {}).setdefault(
                        property_value_key,
                        {
                            "display_value": property_display_value,
                            "aliases": set(),
                            "source_fields": set(),
                        },
                    )
                    if alias:
                        observation["aliases"].add(alias)
                    observation["source_fields"].add(source_key)

            has_valid_property = any(values for values in properties.values())
            if not has_valid_property:
                return {"status": "skipped", "message": f"Entity {normalized_doc_id} has no valid properties."}

            title = self._report_title(raw_data, normalized_doc_id)
            summary = self._report_summary(raw_data)
            published = self._report_published(raw_data)
            report_vertex = {
                "_key": normalized_doc_id,
                "type": "document",
                "node_class": "report",
                "stix_type": "report",
                "doc_id": self._clean_text(raw_doc_id) or normalized_doc_id,
                "m_document_id": self._clean_text(raw_doc_id) or normalized_doc_id,
                "cluster_id": normalized_cluster_id,
                "module": normalized_cluster_id,
                "label": title,
                "display_value": title,
                "title": title,
                "summary": summary,
                "published": published,
                "source": source,
                "source_reliability": source_reliability,
                "metadata": self._report_metadata(raw_data),
                "schema_version": self.GRAPH_SCHEMA_VERSION,
            }
            report_vertex = {k: v for k, v in report_vertex.items() if v not in (None, "", [], {})}

            await self._run_arango_with_distributed_lock(
                f"vertex:{normalized_doc_id}",
                lambda: self.__db.collection("cti_vertices").insert(report_vertex, overwrite=True))

            await self._run_arango_with_distributed_lock(
                f"vertex:{normalized_cluster_id}",
                lambda: self.__db.collection("cti_vertices").insert(
                    {
                        "_key": normalized_cluster_id,
                        "type": "cluster",
                        "node_class": "cluster",
                        "stix_type": "grouping",
                        "label": self.CLUSTER_LABELS.get(normalized_cluster_id, normalized_cluster_id.title()),
                        "display_value": self.CLUSTER_LABELS.get(normalized_cluster_id, normalized_cluster_id.title()),
                        "schema_version": self.GRAPH_SCHEMA_VERSION,
                    }, overwrite=True))

            cluster_edge_key = self._safe_key(normalized_cluster_id, "to", normalized_doc_id)
            await self._run_arango_with_distributed_lock(
                f"edge:{cluster_edge_key}",
                lambda: self.__db.collection("cti_edges").insert(
                    {
                        "_key": cluster_edge_key,
                        "_from": cluster_vertex,
                        "_to": doc_vertex,
                        "type": "cluster_to_doc",
                        "edge_type": "belongs_to_cluster",
                        "relationship_type": "belongs-to",
                        "label": "belongs to",
                        "confidence": 1.0,
                        "schema_version": self.GRAPH_SCHEMA_VERSION,
                    },
                    overwrite=True))

            observation_records: list[dict[str, Any]] = []
            for graph_key, observations in properties.items():
                try:
                    if graph_key in self.SKIP_GRAPH_ENTITY_KEYS:
                        continue
                    for property_value_key, observation in observations.items():
                        property_display_value = str(observation["display_value"])
                        aliases = sorted(str(alias_value) for alias_value in observation["aliases"] if alias_value not in (None, ""))
                        source_fields = sorted(str(source_field) for source_field in observation["source_fields"] if source_field not in (None, ""))
                        prop_key = f"{graph_key}:{property_value_key}"
                        prop_vertex = f"cti_vertices/{prop_key}"
                        edge_key = self._safe_key(normalized_doc_id, graph_key, property_value_key)
                        if len(prop_key) > 240:
                            continue
                        node_class = self.ENTITY_CLASS_BY_KEY.get(graph_key, "indicator")
                        confidence = self._confidence_for_observation(graph_key, source_reliability)
                        hidden_by_default = graph_key in self.DEFAULT_HIDDEN_KEYS
                        entity_role = self._entity_role_for_key(graph_key, normalized_cluster_id)
                        edge_type = self._edge_type_for_context(graph_key, entity_role)
                        property_edge_type = f"has_{graph_key}"
                        observation_record = {
                            "key": graph_key,
                            "normalized_value": property_value_key,
                            "display_value": property_display_value,
                            "prop_key": prop_key,
                            "prop_vertex": prop_vertex,
                            "node_class": node_class,
                            "entity_role": entity_role,
                            "confidence": confidence,
                            "source_fields": source_fields,
                        }
                        observation_records.append(observation_record)
                        await self._upsert_observation_vertex(
                            {
                                "_key": prop_key,
                                "value": property_display_value,
                                "normalized_value": property_value_key,
                                "display_value": property_display_value,
                                "label": self._entity_label(graph_key, property_display_value),
                                "type": graph_key,
                                "node_class": node_class,
                                "stix_type": node_class,
                                "entity_role": entity_role,
                                "hidden_by_default": hidden_by_default,
                                "base_confidence": self._confidence_for_key(graph_key),
                                "confidence": confidence,
                                "max_source_reliability": source_reliability,
                                "schema_version": self.GRAPH_SCHEMA_VERSION,
                            },
                            aliases,
                            normalized_cluster_id,
                            source_fields,
                            normalized_doc_id,
                        )
                        await self._run_arango_with_distributed_lock(
                            f"edge:{edge_key}",
                            lambda: self.__db.collection("cti_edges").insert(
                                {
                                    "_key": edge_key,
                                    "_from": doc_vertex,
                                    "_to": prop_vertex,
                                    "type": property_edge_type,
                                    "edge_type": edge_type,
                                    "relationship_type": self._relationship_type_for_role(entity_role),
                                    "entity_role": entity_role,
                                    "label": edge_type.replace("_", " "),
                                    "confidence": confidence,
                                    "source_fields": source_fields,
                                    "source": source,
                                    "source_reliability": source_reliability,
                                    "first_seen": published,
                                    "last_seen": published,
                                    "schema_version": self.GRAPH_SCHEMA_VERSION,
                                },
                                overwrite=True))
                except Exception as ex:
                    log.g().e(f"Skipping entity property upsert for key={graph_key}, doc={normalized_doc_id}: {ex}")

            await self._create_derived_intelligence(
                observation_records,
                normalized_doc_id,
                normalized_cluster_id,
                published,
                source,
                source_reliability,
            )

            return {"status": "success", "message": f"Entity {normalized_doc_id} processed."}

        except Exception as ex:
            log.g().e(f"ARANGO ENTITY UPSERT ERROR: {ex}")
            raise HTTPException(status_code=500, detail="ARANGO ENTITY UPSERT ERROR")
