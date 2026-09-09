from datetime import datetime, timezone
from typing import Any

from orion.constants import constant
from orion.constants.constant import allowed_key_titles
from orion.helper_manager.env_handler import env_handler
from orion.services.mail_manager.mail_enums import (
    AlertMailLabel,
    AlertMailMessage,
    AlertMailSubject,
    AlertMailTitle,
)
from orion.services.mail_manager.mail_manager import mail_manager
from orion.services.mongo_manager.shared_model.db_auth_models import LicenseName, db_user_account
from orion.services.mongo_manager.shared_model.db_alert_model import AlertModel


class AlertMailHelper:
    def __init__(self, engine):
        self._engine = engine

    @staticmethod
    def _display_alert_label(value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized == "seo scanning":
            return "SEO scanning"
        if normalized == "exploit":
            return "Exploits"
        if normalized == "stealerlogs":
            return "Stealer logs"
        if normalized == "email-breach":
            return "Email breach"
        if normalized == "social-scanner":
            return "Social scanner"
        if not normalized:
            return AlertMailLabel.UNCATEGORIZED.value
        return normalized.replace("-", " ").replace("_", " ").title()

    @staticmethod
    def _pluralize_alert(count: int) -> str:
        return "alert" if count == 1 else "alerts"

    @staticmethod
    def _alert_action_url(category: str = "") -> str:
        app_url = (env_handler.get_instance().env("APP_URL", "") or "").rstrip("/")
        if not app_url:
            return ""
        normalized_category = (category or "").strip().lower()
        if normalized_category:
            return f"{app_url}/dashboard/profile/alerts/{normalized_category}"
        return f"{app_url}/dashboard/profile/alerts"

    async def _get_alert_mail_recipient(self, tenant_id: str, current_user=None) -> tuple[str, str]:
        if current_user is not None:
            return current_user.email, current_user.username

        maintainer_user = None
        if tenant_id:
            maintainer_user = await self._engine.find_one(
                db_user_account,
                (db_user_account.tenant_uuid == str(tenant_id))
                & (db_user_account.licenses == LicenseName.MAINTAINER),
            )
        if maintainer_user:
            return maintainer_user.email, maintainer_user.username
        return "", ""

    @staticmethod
    def _format_ioc_label(ioc_type: str) -> str:
        return allowed_key_titles.get(ioc_type, ioc_type or AlertMailLabel.IOC_FALLBACK.value)

    def _alert_ioc_rows(self, alert: AlertModel) -> list[dict[str, str]]:
        rows = []
        if alert.ioc_value:
            rows.append({
                "type": self._format_ioc_label(alert.ioc_type),
                "value": alert.ioc_value,
            })

        for ioc in alert.all_ioc or []:
            ioc_type = getattr(ioc, "type", None) or getattr(ioc, "name", "")
            for value in ioc.values or []:
                row = {"type": self._format_ioc_label(ioc_type), "value": value}
                if row not in rows:
                    rows.append(row)
        return rows[:10]

    async def _send_alert_mail(
            self,
            *,
            tenant_id: str,
            subject: str,
            email_title: str,
            preheader: str,
            friendly_message: str,
            scan_status: str,
            total_alerts: int,
            module_rows: list[dict[str, Any]],
            ioc_rows: list[dict[str, str]],
            current_user=None,
            action_url: str = "",
            closing_message: str = AlertMailMessage.DEFAULT_CLOSING.value):
        try:
            if constant.alert_mail_template is None:
                return False

            to_email, recipient_name = await self._get_alert_mail_recipient(tenant_id, current_user)
            if not to_email:
                return False

            html_content = constant.alert_mail_template.render(
                email_title=email_title,
                preheader=preheader,
                recipient_name=recipient_name,
                friendly_message=friendly_message,
                scan_status=scan_status,
                total_alerts=total_alerts,
                event_date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                module_rows=module_rows,
                ioc_rows=ioc_rows,
                action_url=action_url,
                action_label=AlertMailLabel.ACTION_LABEL.value,
                closing_message=closing_message,
            )

            await mail_manager.get_instance().send_verification_mail(
                to=to_email,
                subject=subject,
                body=html_content,
                tenant_id=tenant_id,
            )
            return True
        except Exception:
            return False

    async def send_scan_completed_mail(
            self,
            tenant_id: str,
            scan_status: str,
            summary: dict[str, Any],
            current_user=None):
        counts_by_category = summary.get("counts_by_category", {}) if summary else {}
        ioc_values = summary.get("ioc_values", []) if summary else []
        total_alerts = int(summary.get("total", 0) if summary else 0)
        if total_alerts <= 0:
            return True

        module_rows = []
        for category, count in sorted(counts_by_category.items(), key=lambda entry: entry[0]):
            display_name = self._display_alert_label(category)
            count = int(count or 0)
            module_rows.append({
                "label": AlertMailMessage.MODULE_COUNT.value.format(
                    category=display_name,
                    count=count,
                    alert_word=self._pluralize_alert(count),
                ),
                "count": count,
            })

        ioc_rows = []
        for item in ioc_values[:10]:
            if isinstance(item, dict):
                ioc_type = (item.get("type") or "").strip()
                ioc_rows.append({
                    "type": self._format_ioc_label(ioc_type),
                    "value": item.get("value") or "",
                })

        alert_word = self._pluralize_alert(total_alerts)
        friendly_message = AlertMailMessage.SCAN_COMPLETED.value.format(
            count=total_alerts,
            alert_word=alert_word,
        )
        subject = AlertMailSubject.SCAN_COMPLETED.value.format(
            count=total_alerts,
            alert_word=alert_word,
        )

        return await self._send_alert_mail(
            tenant_id=tenant_id,
            current_user=current_user,
            subject=subject,
            email_title=AlertMailTitle.SCAN_COMPLETED.value,
            preheader=friendly_message,
            friendly_message=friendly_message,
            scan_status=self._display_alert_label(scan_status),
            total_alerts=total_alerts,
            module_rows=module_rows,
            ioc_rows=ioc_rows,
            action_url=self._alert_action_url(),
        )

    async def send_alert_change_mail(self, action: str, alert: AlertModel, current_user):
        tenant_id = str(current_user.tenant_uuid)
        is_created = action == "created"
        display_category = self._display_alert_label(alert.type)
        title = AlertMailTitle.CUSTOM_CREATED.value if is_created else AlertMailTitle.ALERT_UPDATED.value
        message = AlertMailMessage.CUSTOM_CREATED.value if is_created else AlertMailMessage.ALERT_UPDATED.value
        module_rows = [{
            "label": AlertMailMessage.SINGLE_ALERT_COUNT.value.format(category=display_category),
            "count": 1,
        }]

        await self._send_alert_mail(
            tenant_id=tenant_id,
            current_user=current_user,
            subject=title,
            email_title=title,
            preheader=message,
            friendly_message=message,
            scan_status=(
                AlertMailLabel.CREATED_STATUS.value
                if is_created
                else AlertMailLabel.UPDATED_STATUS.value
            ),
            total_alerts=1,
            module_rows=module_rows,
            ioc_rows=self._alert_ioc_rows(alert),
            action_url=self._alert_action_url(alert.type),
            closing_message=AlertMailMessage.ALERT_CHANGE_CLOSING.value,
        )
