import hashlib
from typing import Any

from orion.helper_manager.helper_controller import helper_controller
from orion.services.mongo_manager.shared_model.db_alert_model import alert_all_ioc


class RawFindingSanitizer:
    HIDDEN_KEYS = {
        "_id",
        "_index",
        "_rank",
        "_score",
        "_type",
        "all_ioc",
        "content_vector",
        "data_hash",
        "embedding",
        "hash",
        "hash_content",
        "hash_url",
        "m_code_snippet",
        "m_content",
        "m_embedding",
        "m_hash",
        "m_hash_content",
        "m_hash_url",
        "m_important_content",
        "m_ref_html",
        "m_scrap_file",
        "m_section",
        "rank_index",
        "raw_findings",
        "ref_html",
        "scrap_file",
        "vector",
        "vectors",
    }

    @classmethod
    def clean(cls, value: Any) -> Any:
        if isinstance(value, dict):
            cleaned = {}
            for key, item in value.items():
                if str(key).lower() in cls.HIDDEN_KEYS:
                    continue
                cleaned_item = cls.clean(item)
                if cleaned_item in (None, "", [], {}):
                    continue
                cleaned[key] = cleaned_item
            return cleaned

        if isinstance(value, list):
            return [
                cleaned_item
                for item in value
                if (cleaned_item := cls.clean(item)) not in (None, "", [], {})
            ]

        return value


class ResultMetadataMapper:
    EXCLUDED_KEYS = {
        "m_hash",
        "m_content_type",
        "m_title",
        "m_url",
        "m_content",
        "m_network",
        "m_code_snippet",
        "m_section",
        "m_important_content",
        "m_base_url",
    }

    @classmethod
    def get_additional_result_keys(cls, result: dict[str, Any]) -> list[tuple[str, Any]]:
        additional_data = []

        for key, val in result.items():
            if key in cls.EXCLUDED_KEYS:
                continue
            if val is None:
                continue
            if isinstance(val, list) and len(val) == 0:
                continue
            if isinstance(val, str) and val.strip() == "":
                continue

            additional_data.append((key, val))
        return additional_data

    @classmethod
    def all_iocs_for_result(cls, result: dict[str, Any], ioc_type: str, ioc_value: str) -> list[alert_all_ioc]:
        all_ioc_list = [alert_all_ioc(name=ioc_type, values=[ioc_value])]

        for key, val in cls.get_additional_result_keys(result):
            if isinstance(val, list):
                ioc_values = [str(v) for v in val]
            else:
                ioc_values = [str(val)]
            all_ioc_list.append(alert_all_ioc(name=key, values=ioc_values))

        return all_ioc_list


class ElasticsearchResultMapper:
    @staticmethod
    def to_alert_payload(category: str, ioc_type: str, ioc_value: str, result: dict[str, Any]) -> dict[str, Any]:
        data_hash = result.get("m_hash") or ""
        content_types = result.get("m_content_type") or []
        raw = result.get("raw") or ""
        title = result.get("m_title")
        description = result.get("m_content") or result.get("m_important_content")

        if category == "defacement":
            title = result.get("m_team")

        if category in ["stealerlogs", "email-breach"]:
            data_hash = helper_controller.extract_stealer_hash(result)
            username = result.get("username")
            password = result.get("password")
            if username and password:
                title = username[0]
                description = password
            elif raw:
                cleaned = raw.split("://")[-1]
                if ":" in cleaned:
                    parts = cleaned.split(":", 1)
                    title = parts[0]
                    description = parts[1]
                else:
                    title = cleaned
                    description = "-"
            else:
                title = "-"
                description = "-"
        else:
            description = description or "-"

        url = result.get("m_url") or result.get("m_base_url") or result.get("domain") or "-"
        url = url[0] if isinstance(url, list) and url else url
        source = result.get("m_network") or result.get("channel") or "-"

        return {
            "category": category,
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "title": title,
            "description": description,
            "url": url,
            "source": source,
            "content_types": content_types,
            "all_ioc": ResultMetadataMapper.all_iocs_for_result(result, ioc_type, ioc_value),
            "data_hash": data_hash,
            "raw_findings": RawFindingSanitizer.clean(result),
        }


class ScanResultMapper:
    RISK_WEIGHT = {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "low": 1,
        "informational": 0,
        "info": 0,
    }

    @classmethod
    def _normalize_risk(cls, value: Any) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in ("", "n/a", "none", "null", "undefined"):
            return ""
        if normalized == "info":
            return "Informational"
        if normalized in cls.RISK_WEIGHT:
            return normalized.capitalize()
        return str(value).strip()

    @classmethod
    def _risk_from_items(cls, items: Any) -> str:
        best_risk = ""
        best_weight = -1
        if not isinstance(items, dict):
            return best_risk

        for findings in items.values():
            if not isinstance(findings, list):
                continue
            for finding in findings:
                if not isinstance(finding, dict):
                    continue
                risk = cls._normalize_risk(finding.get("risk") or finding.get("severity"))
                weight = cls.RISK_WEIGHT.get(risk.lower(), -1)
                if risk and weight > best_weight:
                    best_risk = risk
                    best_weight = weight
        return best_risk

    @classmethod
    def _risk_from_grade_counts(cls, counts: Any) -> str:
        if not isinstance(counts, dict):
            return ""
        for risk in ("critical", "high", "medium", "low", "informational"):
            try:
                count = int(counts.get(risk, 0) or 0)
            except (TypeError, ValueError):
                count = 0
            if count > 0:
                return cls._normalize_risk(risk)
        return "Informational"

    @classmethod
    def _risk_from_result(cls, result: dict[str, Any]) -> str:
        return (
            cls._normalize_risk(result.get("risk") or result.get("severity"))
            or cls._risk_from_items(result.get("threats"))
            or cls._risk_from_items(result.get("proofs"))
            or cls._risk_from_grade_counts(result.get("grade_counts"))
        )

    @staticmethod
    def to_alert_fields(scan_type: str, ioc_type: str, ioc_value: str, result: dict[str, Any]) -> dict[str, Any] | None:
        grade = result.get("grade", "N/A")
        if grade == "N/A":
            return None

        counts = result.get("grade_counts", {})
        risk = ScanResultMapper._risk_from_result(result)
        threat_categories = list(result.get("threats", {}).keys())

        description = (
            f"Security scan completed for {ioc_value}.\n"
            f"**Grade:** {grade}\n"
            f"**Risk Summary:** High: {counts.get('high', 0)} | "
            f"Medium: {counts.get('medium', 0)} | Low: {counts.get('low', 0)}\n"
            f"**Issues Found:** {', '.join(threat_categories)}"
        )

        return {
            "category": f"{scan_type} scanning",
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "title": f"{scan_type.upper()} Scan: {ioc_value} (Grade: {grade})",
            "description": description,
            "url": ioc_value,
            "source": f"Orion Scanner ({scan_type})",
            "risk": risk,
            "content_types": threat_categories,
            "all_ioc": [alert_all_ioc(name=ioc_type, values=[ioc_value])],
            "raw_findings": RawFindingSanitizer.clean(result),
        }


class VulnerabilityScanResultMapper:
    CATEGORY = "vulnerability-scanning"

    @staticmethod
    def findings_from_result(result: dict[str, Any]) -> list[dict[str, Any]]:
        findings = result.get("findings") or result.get("top_findings") or []
        if isinstance(findings, dict):
            findings = [findings]
        if not isinstance(findings, list):
            return []
        return [finding for finding in findings if isinstance(finding, dict)]

    @staticmethod
    def to_alert_fields(ioc_type: str, ioc_value: str, result: dict[str, Any], finding: dict[str, Any]) -> dict[str, Any] | None:
        title = finding.get("title") or finding.get("category") or "Vulnerability Finding"
        risk = finding.get("risk") or finding.get("severity") or "Unknown"
        description = finding.get("description") or finding.get("evidence") or "A vulnerability finding was detected."
        finding_category = finding.get("category") or "vulnerability"
        url = finding.get("url") or result.get("final_url") or result.get("url") or ioc_value
        source = finding.get("source") or "Orion Network Intel"

        content_types = [str(finding_category)]

        all_ioc = [
            alert_all_ioc(name=ioc_type, values=[ioc_value]),
            alert_all_ioc(name="domain", values=[str(result.get("domain") or ioc_value)]),
        ]
        if url:
            all_ioc.append(alert_all_ioc(name="url", values=[str(url)]))

        data_hash = hashlib.sha256(
            "|".join(
                [
                    VulnerabilityScanResultMapper.CATEGORY,
                    ioc_type,
                    ioc_value,
                    str(finding_category),
                    str(title),
                    str(risk),
                    str(url),
                ]
            ).strip().lower().encode("utf-8")
        ).hexdigest()

        return {
            "category": VulnerabilityScanResultMapper.CATEGORY,
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "title": f"Vulnerability Scan: {title} ({risk})",
            "description": description,
            "url": url,
            "source": source,
            "risk": str(risk).strip(),
            "content_types": content_types,
            "all_ioc": all_ioc,
            "data_hash": data_hash,
            "raw_findings": RawFindingSanitizer.clean(finding),
        }


class DynamicResultMapper:
    @staticmethod
    def to_alert_fields(scan_type: str, ioc_type: str, ioc_value: str, result: dict[str, Any]) -> dict[str, Any] | None:
        if scan_type in ["email-breach", "social-scanner"]:
            title = result.get("m_title", "Records for provided queries")
            description = result.get("m_important_content") or result.get("m_content", "A match was found.")
            url = result.get("m_url") or result.get("m_base_url") or "-"
            content_types = result.get("m_content_type") or []
        elif scan_type == "playstore-scanning":
            title = result.get("m_app_name", "Playstore App Found")
            description = (
                f"Package ID: {result.get('m_package_id', 'N/A')}\n"
                f"Mod Features: {result.get('m_mod_features', 'None')}\n"
                f"Version: {result.get('m_version', 'N/A')}"
            )
            url = result.get("m_app_url", "-")
            content_types = result.get("m_content_type") or []
        elif scan_type == "software-scanning":
            title = result.get("m_app_name", "Software Match Found")
            description = (
                f"Package ID: {result.get('m_package_id', 'N/A')}\n"
                f"Version: {result.get('m_version', 'N/A')}\n"
                f"Latest Date: {result.get('m_latest_date', 'N/A')}\n"
                f"Mod Features: {result.get('m_mod_features') or 'None'}"
            )
            url = result.get("m_app_url", "-")
            content_types = result.get("m_content_type") or []
        else:
            return None

        return {
            "category": scan_type,
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "title": title,
            "description": description,
            "url": url,
            "source": f"Orion Dynamic Scanner ({scan_type})",
            "content_types": content_types,
            "all_ioc": [alert_all_ioc(name=ioc_type, values=[ioc_value])],
            "raw_findings": RawFindingSanitizer.clean(result),
        }
