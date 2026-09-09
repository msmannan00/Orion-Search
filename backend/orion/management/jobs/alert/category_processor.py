from typing import Any

from orion.api.interactive.alert_manager.alert_summary_helper import AlertSummaryHelper
from orion.management.jobs.alert.alert_buffer import AlertScanBuffer
from orion.management.jobs.alert.config import CATEGORY_SEARCH_CONFIG, CategorySearchConfig
from orion.management.jobs.alert.response_parser import ResponseParser
from orion.management.jobs.alert.result_mappers import ElasticsearchResultMapper
from orion.services.log_manager.log_controller import log


class CategoryAlertProcessor:
    def __init__(self, alert_buffer: AlertScanBuffer, search_model: Any):
        self._alert_buffer = alert_buffer
        self._search_model = search_model

    @staticmethod
    def _value(data: Any, field: str, default: Any = None) -> Any:
        if isinstance(data, dict):
            return data.get(field, default)
        return getattr(data, field, default)

    async def process_tenant_category(self, tenant_id: str, iocs: list[Any], category: str) -> dict:
        summary = AlertSummaryHelper.new_scan_summary()
        config = CATEGORY_SEARCH_CONFIG.get(category)
        if not config:
            return summary

        try:
            for ioc in iocs:
                ioc_type_name = self._value(ioc, "ioc_id", "")
                if config.allowed_ioc_types and ioc_type_name not in config.allowed_ioc_types:
                    continue

                for ioc_value in self._value(ioc, "values", []) or []:
                    await self._process_ioc_value(tenant_id, category, config, ioc_type_name, ioc_value)
        except Exception as e:
            log.g().e(f"Tenant alert processing failed for tenant={tenant_id}, category={category}: {e}")

        return summary

    async def _process_ioc_value(self, tenant_id: str, category: str, config: CategorySearchConfig, ioc_type_name: str, ioc_value: str) -> None:
        search_data = {
            "entity_filter": {ioc_type_name: [ioc_value]},
            "category": config.search_data_category,
            "page": 1,
            "size": 100,
            "matchtype": "or",
            "fullsearch": True,
            "must": True,
            "ioc": f"{ioc_type_name}:{ioc_value}",
        }

        try:
            search_param = config.param_model(**search_data)
            es_response = await self._search(config, search_param)
            es_response_dict = ResponseParser.to_dict(es_response, allow_body=False)
            if es_response_dict is None:
                return

            results = es_response_dict.get("Result", [])
            if not results:
                return

            bulk_alerts = []
            for result in results:
                bulk_alerts.append(
                    ElasticsearchResultMapper.to_alert_payload(category, ioc_type_name, ioc_value, result)
                )

            if bulk_alerts:
                self._alert_buffer.add_alerts(tenant_id, bulk_alerts)

        except Exception:
            log.g().e(
                f"Alert processing failed for tenant={tenant_id}, "
                f"category={category}, ioc={ioc_type_name}:{ioc_value}"
            )

    async def _search(self, config: CategorySearchConfig, search_param: Any) -> Any:
        search_func = getattr(self._search_model, config.search_method)

        if config.search_method == "search_stealer_iocs":
            return await search_func(search_param)

        return await search_func(
            search_param,
            config.base_index,
            config.blocked_categories or [],
            config.allowed_categories or [],
        )
