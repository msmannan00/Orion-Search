import asyncio
from typing import Any

from orion.api.interactive.alert_manager.alert_summary_helper import AlertSummaryHelper
from orion.api.server.crawl_manager.class_model.domain_scan_request_model import (
    DomainScanRequest,
    UrlVulnerabilityScanRequest,
)
from orion.management.jobs.alert.alert_buffer import AlertScanBuffer
from orion.management.jobs.alert.cancellation_service import CancellationService
from orion.management.jobs.alert.response_parser import ResponseParser
from orion.management.jobs.alert.result_mappers import ScanResultMapper, VulnerabilityScanResultMapper


SCAN_TYPE_ALERT_CATEGORIES = {
    "advanced": "advanced scanning",
    "seo": "seo scanning",
    "repo": "repo scanning",
}


class ScanningAlertProcessor:
    def __init__(self, crawl_model: Any, cancellation_service: CancellationService, alert_buffer: AlertScanBuffer, search_model: Any | None = None):
        self._crawl_model = crawl_model
        self._cancellation_service = cancellation_service
        self._alert_buffer = alert_buffer
        self._search_model = search_model

    @staticmethod
    def scan_types_for_ioc(ioc_type: str, ioc_value: str) -> list[str]:
        if ioc_type == "m_domain":
            return ["advanced", "seo"]
        if ioc_type == "m_url" and "github" in ioc_value.lower():
            return ["repo"]
        return []

    async def process_ioc(self, tenant_id: str, ioc_type: str, values: list[str], allowed_alert_categories: set[str] | None = None) -> dict:
        summary = AlertSummaryHelper.new_scan_summary()

        if ioc_type not in ["m_domain", "m_url"]:
            return summary

        for ioc_value in values or []:
            if self._cancellation_service.is_cancelled(tenant_id):
                return summary

            for scan_type in self.scan_types_for_ioc(ioc_type, ioc_value):
                alert_category = SCAN_TYPE_ALERT_CATEGORIES.get(scan_type)
                if allowed_alert_categories is not None and alert_category not in allowed_alert_categories:
                    continue
                scan_summary = await self.handle_scanning_alert(tenant_id, ioc_value, ioc_type, scan_type)
                AlertSummaryHelper.merge_scan_summary(summary, scan_summary)

            if allowed_alert_categories is None or "vulnerability-scanning" in allowed_alert_categories:
                vulnerability_summary = await self.handle_vulnerability_scanning_alert(tenant_id, ioc_value, ioc_type)
                AlertSummaryHelper.merge_scan_summary(summary, vulnerability_summary)

        return summary

    @staticmethod
    def _normalize_domain(value: str, *, include_scheme: bool = False, trailing_slash: bool = False) -> str:
        clean_domain = value.strip()
        if include_scheme and not clean_domain.startswith(("http://", "https://")):
            clean_domain = "https://" + clean_domain
        if trailing_slash and not clean_domain.endswith("/"):
            clean_domain += "/"
        return clean_domain

    async def handle_scanning_alert(self, tenant_id: str, ioc_value: str, ioc_type: str, scan_type: str):
        try:
            clean_domain = self._normalize_domain(ioc_value, include_scheme=True, trailing_slash=True)

            payload = DomainScanRequest(domain=clean_domain, scanType=scan_type)

            while True:
                if self._cancellation_service.is_cancelled(tenant_id):
                    return None

                response = await self._crawl_model.scan_domain(payload)
                scan_result = ResponseParser.to_dict(response, allow_model_dump=False, allow_dict_method=False)
                if scan_result is None:
                    return None

                status = scan_result.get("status")
                if status == "pending":
                    await asyncio.sleep(5)
                    continue

                result = scan_result.get("result")
                if not isinstance(result, dict):
                    return False

                alert_fields = ScanResultMapper.to_alert_fields(scan_type, ioc_type, ioc_value, result)
                if not alert_fields:
                    return None

                self._alert_buffer.add_alert(tenant_id, alert_fields)
                return AlertSummaryHelper.new_scan_summary()

        except Exception:
            return AlertSummaryHelper.new_scan_summary()

    async def handle_vulnerability_scanning_alert(self, tenant_id: str, ioc_value: str, ioc_type: str):
        summary = AlertSummaryHelper.new_scan_summary()
        if ioc_type != "m_domain":
            return summary

        search_model = self._search_model
        if search_model is None:
            return summary

        try:
            payload = UrlVulnerabilityScanRequest(
                domain=self._normalize_domain(ioc_value),
                depth="high",
            )

            while True:
                if self._cancellation_service.is_cancelled(tenant_id):
                    return summary

                response = await search_model.network_intel(payload, "url_vulnerability_scan")
                scan_result = ResponseParser.to_dict(response, allow_dict_method=False)
                if scan_result is None:
                    return summary

                status = scan_result.get("status")
                if status == "pending":
                    await asyncio.sleep(5)
                    continue

                result = scan_result.get("result")
                if not isinstance(result, dict):
                    return summary

                for finding in VulnerabilityScanResultMapper.findings_from_result(result):
                    if self._cancellation_service.is_cancelled(tenant_id):
                        return summary

                    alert_fields = VulnerabilityScanResultMapper.to_alert_fields(ioc_type, ioc_value, result, finding)
                    if not alert_fields:
                        continue

                    self._alert_buffer.add_alert(tenant_id, alert_fields)

                return summary

        except Exception:
            return AlertSummaryHelper.new_scan_summary()
