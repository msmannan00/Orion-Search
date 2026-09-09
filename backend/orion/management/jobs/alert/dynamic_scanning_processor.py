import asyncio
from typing import Any

from orion.api.interactive.alert_manager.alert_summary_helper import AlertSummaryHelper
from orion.management.jobs.alert.alert_buffer import AlertScanBuffer
from orion.management.jobs.alert.cancellation_service import CancellationService
from orion.management.jobs.alert.config import DYNAMIC_SCAN_RULES, DynamicScanRule
from orion.management.jobs.alert.response_parser import ResponseParser
from orion.management.jobs.alert.result_mappers import DynamicResultMapper


class DynamicScanningProcessor:
    def __init__(self, search_model: Any, cancellation_service: CancellationService, alert_buffer: AlertScanBuffer):
        self._search_model = search_model
        self._cancellation_service = cancellation_service
        self._alert_buffer = alert_buffer

    @staticmethod
    def matching_rules(ioc_type: str, ioc_value: str) -> list[DynamicScanRule]:
        return [rule for rule in DYNAMIC_SCAN_RULES if rule.matches(ioc_type, ioc_value)]

    async def process_ioc(self, tenant_id: str, ioc_type: str, values: list[str], allowed_alert_categories: set[str] | None = None) -> dict:
        summary = AlertSummaryHelper.new_scan_summary()
        scans: list[tuple[DynamicScanRule, dict[str, Any]]] = []
        selected_ioc_value = ""

        for ioc_value in values or []:
            selected_ioc_value = ioc_value
            scans = [
                (rule, rule.build_payload(ioc_value))
                for rule in self.matching_rules(ioc_type, ioc_value)
                if allowed_alert_categories is None or rule.scan_type in allowed_alert_categories
            ]

        for rule, payload in scans:
            scan_summary = await self.handle_dynamic_scanning_alert(
                tenant_id,
                ioc_type,
                selected_ioc_value,
                rule.scan_type,
                payload,
                rule.category,
                rule.model,
            )
            AlertSummaryHelper.merge_scan_summary(summary, scan_summary)

        return summary

    async def handle_dynamic_scanning_alert(
        self,
        tenant_id: str,
        ioc_type: str,
        ioc_value: str,
        scan_type: str,
        search_payload: dict,
        dynamic_search_category: str,
        model_cls,
    ):
        try:
            summary = AlertSummaryHelper.new_scan_summary()
            param_model = model_cls(text=search_payload)
            result_list: Any = []

            while True:
                if self._cancellation_service.is_cancelled(tenant_id):
                    return summary

                response = await self._search_model.dynamic_search(param_model, dynamic_search_category)
                scan_result = ResponseParser.to_dict(response, allow_dict_method=False)
                if scan_result is None:
                    return summary

                status = scan_result.get("status")
                if status == "pending":
                    await asyncio.sleep(5)
                    continue

                inner_result: Any = scan_result.get("result", {})
                if isinstance(inner_result, dict):
                    result_list = inner_result.get("result", [])
                elif isinstance(inner_result, list):
                    result_list = inner_result
                else:
                    result_list = []
                break

            if not result_list:
                return summary

            for result in result_list:
                if self._cancellation_service.is_cancelled(tenant_id):
                    return summary

                alert_fields = DynamicResultMapper.to_alert_fields(scan_type, ioc_type, ioc_value, result)
                if not alert_fields:
                    continue

                self._alert_buffer.add_alert(tenant_id, alert_fields)

            return summary

        except Exception:
            return AlertSummaryHelper.new_scan_summary()
