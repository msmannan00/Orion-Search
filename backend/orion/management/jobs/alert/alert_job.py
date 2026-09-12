from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from orion.api.interactive.alert_manager.alert_manager import AlertManager
from orion.api.interactive.alert_manager.alert_summary_helper import AlertSummaryHelper
from orion.api.interactive.search_manager.search_manager import search_manager
from orion.api.interactive.tenant_manager.tenant_manager import TenantManager
from orion.api.server.crawl_manager.crawl_manager import crawl_manager
from orion.management.jobs.alert.alert_buffer import AlertScanBuffer
from orion.management.jobs.alert.cancellation_service import CancellationService
from orion.management.jobs.alert.category_processor import CategoryAlertProcessor
from orion.management.jobs.alert.config import ALERT_CATEGORIES, SCANNING_ALERT_CATEGORIES
from orion.management.jobs.alert.dynamic_scanning_processor import DynamicScanningProcessor
from orion.management.jobs.alert.result_mappers import ResultMetadataMapper
from orion.management.jobs.alert.scanning_processor import ScanningAlertProcessor
from orion.management.jobs.alert.tenant_ioc_service import TenantIocService
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_tenant_model import IocCategory, db_tenant_model


class alert_job:
    _instances = None
    _category_index = 0

    @classmethod
    def get_instance(cls):
        if cls._instances is None:
            cls._instances = cls()
        return cls._instances

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        self._tenant_manager = TenantManager.get_instance()
        self._alert_manager = AlertManager.getInstance()
        self._search_model = search_manager.getInstance()
        self._crawl_model = crawl_manager.getInstance()
        self._cancellation_service = CancellationService()
        self._cancel_scan_flags = self._cancellation_service._cancel_scan_flags
        self._tenant_ioc_service = TenantIocService()
        self._alert_buffer = AlertScanBuffer(self._alert_manager)
        self._category_processor = CategoryAlertProcessor(self._alert_buffer, self._search_model)
        self._scanning_processor = ScanningAlertProcessor(self._crawl_model, self._cancellation_service, self._alert_buffer, self._search_model)
        self._dynamic_scanning_processor = DynamicScanningProcessor(self._search_model, self._cancellation_service, self._alert_buffer)

    @staticmethod
    def _tenant_key(tenant_id) -> str:
        return str(tenant_id)

    @staticmethod
    def _value(data: Any, field: str, default: Any = None) -> Any:
        if isinstance(data, dict):
            return data.get(field, default)
        return getattr(data, field, default)

    @staticmethod
    def _normalize_alert_category(category: Any) -> str:
        return str(category or "").strip().lower()

    @classmethod
    def _allowed_alert_categories(cls, tenant: Any) -> set[str] | None:
        allowed = cls._value(tenant, "allowed_alert_categories", None)
        if allowed is None:
            return None
        return {cls._normalize_alert_category(category) for category in allowed if cls._normalize_alert_category(category)}

    @classmethod
    def _can_run_category(cls, category: str, allowed_categories: set[str] | None) -> bool:
        if allowed_categories is None:
            return True
        if category == "scanning":
            return bool(allowed_categories.intersection(SCANNING_ALERT_CATEGORIES))
        return cls._normalize_alert_category(category) in allowed_categories

    async def _process_tenant_alerts(self, tenant: db_tenant_model, category: str, allowed_categories: set[str] | None = None):
        tenant_key = self._cancellation_service.ensure_tenant(self._value(tenant, "id", ""))
        summary = AlertSummaryHelper.new_scan_summary()

        try:
            iocs = self._value(tenant, "iocs", [])
            if not iocs:
                return summary

            if category == "scanning":
                return await self._process_scanning_category(tenant_key, iocs, allowed_categories)

            return await self._category_processor.process_tenant_category(tenant_key, iocs, category)
        except Exception as e:
            log.g().e(f"Tenant alert processing failed for tenant={tenant_key}, category={category}: {e}")
        return summary

    async def _process_scanning_category(self, tenant_id: str, iocs: list[Any], allowed_categories: set[str] | None = None) -> dict:
        summary = AlertSummaryHelper.new_scan_summary()

        for ioc in iocs:
            if self._cancellation_service.is_cancelled(tenant_id):
                return summary

            ioc_type_name = self._value(ioc, "ioc_id", "")
            ioc_values = self._value(ioc, "values", []) or []

            scan_summary = await self._scanning_processor.process_ioc(tenant_id, ioc_type_name, ioc_values, allowed_categories)
            AlertSummaryHelper.merge_scan_summary(summary, scan_summary)

            dynamic_summary = await self._dynamic_scanning_processor.process_ioc(tenant_id, ioc_type_name, ioc_values, allowed_categories)
            AlertSummaryHelper.merge_scan_summary(summary, dynamic_summary)

        return summary

    @staticmethod
    def tenant_alert_run_time(tenant: Any) -> str | None:
        value = alert_job._value(tenant, "alert_run_time", None)
        if value is None:
            return None
        value = str(value).strip()
        return value or None

    async def run_tenant_batch(self, all_tenants: list[Any] | None = None, tenant_filter=None):
        all_tenants = all_tenants if all_tenants is not None else await self._tenant_manager.get_all_tenant()
        if not all_tenants:
            return {
                "status": "success",
                "mail_status": "sent",
                "message": "No tenants found for alert scan.",
                "tenant_count": 0,
                "processed_tenant_count": 0,
                "skipped_tenant_count": 0,
                "error_count": 0,
                "mail_sent_count": 0,
                "mail_failed_count": 0,
            }

        processed_tenant_count = 0
        skipped_tenant_count = 0
        error_count = 0
        mail_sent_count = 0
        mail_failed_count = 0
        compromised_tenants = []

        for tenant in all_tenants:
            tenant_id = self._tenant_key(self._value(tenant, "id", ""))
            if self._value(tenant, "is_default", False):
                skipped_tenant_count += 1
                continue
            if tenant_filter is not None and not tenant_filter(tenant):
                skipped_tenant_count += 1
                continue

            status = await self._alert_manager.getInstance().get_scan_status_by_tenant_id(tenant_id)
            if status.get("scan_running"):
                skipped_tenant_count += 1
                continue

            scan_summary = AlertSummaryHelper.new_scan_summary()
            scan_status = "success"
            processed_tenant_count += 1
            self._alert_buffer.clear(tenant_id)
            await self._alert_manager.getInstance().set_scan_running(tenant_id, True)
            try:
                allowed_categories = self._allowed_alert_categories(tenant)
                for category in ALERT_CATEGORIES:
                    if not self._can_run_category(category, allowed_categories):
                        continue
                    category_summary = await self._process_tenant_alerts(tenant, category, allowed_categories)
                    AlertSummaryHelper.merge_scan_summary(scan_summary, category_summary)
                if self._cancellation_service.is_cancelled(tenant_id):
                    scan_status = "cancelled"
                    error_count += 1
                    self._alert_buffer.clear(tenant_id)
                else:
                    flush_summary = await self._alert_buffer.flush(tenant_id)
                    AlertSummaryHelper.merge_scan_summary(scan_summary, flush_summary)
            except Exception:
                scan_status = "completed_with_errors"
                error_count += 1
                self._alert_buffer.clear(tenant_id)
                log.g().e(f"Alert category run failed for tenant={tenant_id}")
            finally:
                self._cancellation_service.clear(tenant_id)
                await self._alert_manager.getInstance().set_scan_running(tenant_id, False)
                total_alerts = int(scan_summary.get("total", 0) or 0)
                if total_alerts > 0:
                    compromised_tenants.append({
                        "tenant_id": tenant_id,
                        "tenant_name": self._value(tenant, "name", tenant_id) or tenant_id,
                        "alert_count": total_alerts,
                    })
                mail_sent = await self._alert_manager.send_scan_completed_mail(
                    tenant_id=tenant_id,
                    scan_status=scan_status,
                    summary=scan_summary,
                    tenant=tenant,
                )
                if mail_sent:
                    mail_sent_count += 1
                else:
                    mail_failed_count += 1

        admin_mail_sent = await self._alert_manager.send_admin_scan_summary_mail(compromised_tenants)
        if not admin_mail_sent:
            mail_failed_count += 1

        if mail_failed_count and mail_sent_count:
            mail_status = "partial"
        elif mail_failed_count:
            mail_status = "failed"
        else:
            mail_status = "sent"

        overall_status = "success" if error_count == 0 and mail_status == "sent" else "completed_with_errors"
        return {
            "status": overall_status,
            "mail_status": mail_status,
            "message": "Alert generation job finished.",
            "tenant_count": len(all_tenants),
            "processed_tenant_count": processed_tenant_count,
            "skipped_tenant_count": skipped_tenant_count,
            "error_count": error_count,
            "mail_sent_count": mail_sent_count,
            "mail_failed_count": mail_failed_count,
            "compromised_tenant_count": len(compromised_tenants),
            "admin_mail_sent": admin_mail_sent,
        }

    async def run_default_scheduled_categories(self):
        return await self.run_tenant_batch(
            tenant_filter=lambda tenant: self.tenant_alert_run_time(tenant) is None
        )

    async def run_tenant_categories(self, tenant):
        return await self.run_tenant_batch(
            all_tenants=[tenant],
            tenant_filter=None,
        )

    def get_additional_result_keys(self, result: Any) -> list[tuple[str, Any]]:
        return ResultMetadataMapper.get_additional_result_keys(result)

    async def get_iocs_of_tenant(self, tenant: db_tenant_model) -> list[IocCategory]:
        return await self._tenant_ioc_service.get_iocs_of_tenant(tenant)

    async def run_all_categories_for_api(self, current_user) -> dict:
        tenant_id = current_user.tenant_uuid
        await self._alert_manager.getInstance().set_scan_running(tenant_id, True)
        current_tenant = await self._engine.find_one(db_tenant_model, db_tenant_model.id == ObjectId(tenant_id))
        start_time = datetime.now(timezone.utc)
        tenant_key = str(tenant_id)
        self._alert_buffer.clear(tenant_key)

        try:
            if not current_tenant:
                return {
                    "status": "error",
                    "message": "Invalid tenant/user object provided.",
                    "duration_seconds": (datetime.now(timezone.utc) - start_time).total_seconds(),
                    "results": [],
                }

            current_tenant = await self._tenant_ioc_service.decrypt_tenant_for_api(current_tenant)

            category_statuses = []
            overall_success = True
            scan_summary = AlertSummaryHelper.new_scan_summary()

            allowed_categories = self._allowed_alert_categories(current_tenant)
            for category in ALERT_CATEGORIES:
                if not self._can_run_category(category, allowed_categories):
                    continue
                category_start_time = datetime.now(timezone.utc)
                try:
                    category_summary = await self._process_tenant_alerts(current_tenant, category, allowed_categories)
                    AlertSummaryHelper.merge_scan_summary(scan_summary, category_summary)

                    category_status = {
                        "category": category,
                        "status": "completed_successfully",
                        "tenant_count": 1,
                        "duration_seconds": (datetime.now(timezone.utc) - category_start_time).total_seconds(),
                        "error_count": 0,
                    }
                except Exception:
                    overall_success = False
                    category_status = {
                        "category": category,
                        "status": "completed_with_errors",
                        "tenant_count": 1,
                        "duration_seconds": (datetime.now(timezone.utc) - category_start_time).total_seconds(),
                        "error_count": 1,
                    }

                category_statuses.append(category_status)

            if self._cancellation_service.is_cancelled(tenant_key):
                response_status = "cancelled"
                self._alert_buffer.clear(tenant_key)
            else:
                flush_summary = await self._alert_buffer.flush(tenant_key)
                AlertSummaryHelper.merge_scan_summary(scan_summary, flush_summary)
                response_status = "success" if overall_success else "completed_with_errors"

            end_time = datetime.now(timezone.utc)
            await self._alert_manager.send_scan_completed_mail(
                tenant_id=str(tenant_id),
                scan_status=response_status,
                summary=scan_summary,
                current_user=current_user,
                tenant=current_tenant,
            )
            return {
                "status": response_status,
                "message": f"Alert generation job finished for tenant {tenant_id}.",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "total_duration_seconds": (end_time - start_time).total_seconds(),
                "results": category_statuses,
            }
        except Exception as exc:
            self._alert_buffer.clear(tenant_key)
            log.g().e(f"Alert generation job failed for tenant {tenant_id}: {exc}")
        finally:
            self._cancellation_service.clear(tenant_key)
            await self._alert_manager.getInstance().set_scan_running(tenant_id, False)

    async def cancel_tenant_scan(self, tenant_id: str):
        self._cancellation_service.cancel(tenant_id)
