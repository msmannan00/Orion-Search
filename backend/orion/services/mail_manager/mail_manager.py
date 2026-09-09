import asyncio
import base64
import html
from contextvars import ContextVar
from fastapi import HTTPException
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl
from email.mime.image import MIMEImage
from email.mime.application import MIMEApplication
import urllib.request
from urllib.parse import urlparse
import os
from orion.helper_manager.env_handler import env_handler
from orion.services.log_manager.log_controller import log
from orion.services.mail_manager.mail_enums import MailSubject

MAIL_CONFIGURATION_FAILED_STATUS = 424
_mail_tenant_id: ContextVar[str | None] = ContextVar("mail_tenant_id", default=None)


class mail_manager:
    __instance = None

    @staticmethod
    def get_instance():
        if mail_manager.__instance is None:
            mail_manager.__instance = mail_manager()
        return mail_manager.__instance

    def __init__(self):
        if mail_manager.__instance is not None:
            raise Exception("This class is a singleton!")
        mail_manager.__instance = self

    async def process_app_variables(self, subject: str, body: str, tenant_id: str | None = None):
        from orion.api.server.config_manager.config_controller import config_controller
        tenant_id = tenant_id or _mail_tenant_id.get()
        app_name = await config_controller.getInstance().get_cached("app_name", "Orion Intelligence", tenant_id=tenant_id)
        app_name = str(app_name)

        subject = subject.replace("appname", app_name)
        body = body.replace("appname", app_name)

        return subject, body

    @staticmethod
    def _global_mail_config():
        from orion.api.server.config_manager.config_controller import config_controller
        controller = config_controller.getInstance()
        if hasattr(controller, "get"):
            meta_info_raw = controller.get("meta_info", "{}")
        else:
            meta_info_raw = getattr(controller, "_config", {}).get("meta_info", "{}")
        try:
            meta_info = json.loads(meta_info_raw) if isinstance(meta_info_raw, str) else {}
        except (TypeError, ValueError):
            meta_info = {}

        return meta_info

    @staticmethod
    def _normalize_mail_config(config):
        password = config.get("ACCOUNTS_MAIL_PASSWORD")
        sender_email = config.get("ACCOUNTS_MAIL")
        smtp_server = config.get("ACCOUNTS_SMTP_SERVER")
        smtp_port_raw = config.get("ACCOUNTS_SMTP_PORT")
        if not password or not sender_email or not smtp_server or not smtp_port_raw:
            raise HTTPException(status_code=400, detail="SMTP configuration is incomplete")
        try:
            smtp_port = int(str(smtp_port_raw))
        except ValueError:
            raise HTTPException(status_code=400, detail="SMTP configuration is incomplete")
        return sender_email, password, smtp_server, smtp_port

    async def _tenant_system_mail_config(self, tenant_id: str | None):
        """Read SMTP fallback values from the tenant's system settings."""
        if not tenant_id:
            return None
        try:
            from orion.api.server.config_manager.config_controller import config_controller

            controller = config_controller.getInstance()
            await controller.load_config(tenant_id=tenant_id)
            meta_info_raw = controller.get("meta_info", "{}", tenant_id=tenant_id)
            meta_info = json.loads(meta_info_raw) if isinstance(meta_info_raw, str) else {}
            return meta_info if isinstance(meta_info, dict) and meta_info else None
        except Exception:
            return None

    async def _selected_mail_config(self, tenant_id: str | None):
        return await self._tenant_system_mail_config(tenant_id) or self._global_mail_config()

    async def _prepare_verification_message(self, to_header: str, subject: str, body: str, tenant_id: str | None = None, config=None):
        tenant_context = _mail_tenant_id.set(str(tenant_id) if tenant_id else None)
        try:
            subject, body = await self.process_app_variables(subject, body)
        finally:
            _mail_tenant_id.reset(tenant_context)
        sender_email, ACCOUNTS_MAIL_PASSWORD, smtp_server, smtp_port = self._normalize_mail_config(
            config or await self._selected_mail_config(tenant_id))
        msg = MIMEMultipart("alternative")
        msg["From"] = sender_email
        msg["To"] = to_header
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))
        return sender_email, ACCOUNTS_MAIL_PASSWORD, smtp_server, smtp_port, msg

    async def send_takedown_mail(self, to_email: str, target_domain: str, screenshot_filename: str, html_filename: str, tenant_id: str | None = None, config=None, screenshot_base64: str = "", html_content: str = "", screenshot_mime_type: str = "image/png", custom_message: str = ""):
        subject = MailSubject.TAKEDOWN_REQUEST.value.format(domain=target_domain)

        current_dir = os.path.dirname(os.path.abspath(__file__))
        template_path = os.path.abspath(os.path.join(
            current_dir, "..", "..", "..", "build", "assets", "data", "mail_template_data", "takedown_template.html"
        ))
        try:
            with open(template_path, "r", encoding="utf-8") as file:
                body = file.read()
        except Exception as e:
            log.g().e(f"Template not found: {e}")
            body = f"<p>Malicious activity detected on {target_domain}. Evidence attached.</p>"

        body = body.replace("{{domain}}", target_domain)
        if custom_message and custom_message.strip():
            note_html = f"""
            <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px;">
                <strong style="color: #0f172a; display: block; margin-bottom: 8px;">Additional Analyst Note:</strong>
                <span style="color: #334155; white-space: pre-wrap; font-family: inherit;">{html.escape(custom_message.strip())}</span>
            </div>
            """
            body = body.replace("{{custom_message}}", note_html)
        else:
            body = body.replace("{{custom_message}}", "")

        sender_email, password, smtp_server, smtp_port, msg = await self._prepare_verification_message(
            to_email, subject, body, tenant_id, config
        )

        def fetch_and_attach():
            hosts_to_try = []
            configured_base_url = env_handler.get_instance().env("TRUSTED_MICROS_API_BASE")
            if configured_base_url:
                parsed_base_url = urlparse(str(configured_base_url).rstrip("/"))
                if parsed_base_url.scheme in {"http", "https"} and parsed_base_url.netloc:
                    hosts_to_try.append(str(configured_base_url).rstrip("/"))
            hosts_to_try.extend(["http://trusted-micros-api:8010", "http://localhost:8010"])
            hosts_to_try = list(dict.fromkeys(hosts_to_try))

            attached_screenshot = False
            attached_html = False

            if screenshot_base64:
                try:
                    encoded_screenshot = screenshot_base64.split(",", 1)[-1].strip()
                    image_part = MIMEImage(base64.b64decode(encoded_screenshot), name=f"screenshot_{target_domain}.png")
                    if screenshot_mime_type:
                        image_part.replace_header("Content-Type", screenshot_mime_type)
                    msg.attach(image_part)
                    attached_screenshot = True
                except Exception as screenshot_error:
                    log.g().e(f"Failed to attach inline screenshot evidence: {screenshot_error}")

            if html_content:
                try:
                    html_part = MIMEApplication(html_content.encode("utf-8"), Name=f"source_{target_domain}.html")
                    html_part['Content-Disposition'] = f'attachment; filename="source_{target_domain}.html"'
                    msg.attach(html_part)
                    attached_html = True
                except Exception as html_error:
                    log.g().e(f"Failed to attach inline HTML evidence: {html_error}")

            safe_screenshot = os.path.basename(screenshot_filename) if screenshot_filename else None
            safe_html = os.path.basename(html_filename) if html_filename else None

            if safe_screenshot and not attached_screenshot:
                for host in hosts_to_try:
                    try:
                        req = urllib.request.Request(f"{host}/evidence/view/image/{safe_screenshot}")
                        with urllib.request.urlopen(req, timeout=10) as resp:  # nosec B310
                            img_bytes = resp.read()
                            image_part = MIMEImage(img_bytes, name=f"screenshot_{target_domain}.png")
                            msg.attach(image_part)
                            break
                    except Exception as exc:
                        raise HTTPException(status_code=500, detail="Failed to fetch screenshot evidence") from exc

            if safe_html and not attached_html:
                for host in hosts_to_try:
                    try:
                        req = urllib.request.Request(f"{host}/evidence/view/html/{safe_html}")
                        with urllib.request.urlopen(req, timeout=10) as resp:  # nosec B310
                            html_bytes = resp.read()
                            html_part = MIMEApplication(html_bytes, Name=f"source_{target_domain}.html")
                            html_part['Content-Disposition'] = f'attachment; filename="source_{target_domain}.html"'
                            msg.attach(html_part)
                            break
                    except Exception as html_fetch_error:
                        try:
                            req_alt = urllib.request.Request(f"{host}/evidence/view/source/{safe_html}")
                            with urllib.request.urlopen(req_alt, timeout=10) as resp:  # nosec B310
                                html_bytes = resp.read()
                            html_part = MIMEApplication(html_bytes, Name=f"source_{target_domain}.html")
                            html_part['Content-Disposition'] = f'attachment; filename="source_{target_domain}.html"'
                            msg.attach(html_part)
                            break
                        except Exception as e_alt:
                            log.g().e(f"Failed to fetch HTML evidence. Error 1: {html_fetch_error} | Error 2: {e_alt}")
                            raise HTTPException(status_code=500, detail="Failed to fetch HTML evidence") from e_alt

        await asyncio.to_thread(fetch_and_attach)

        await asyncio.to_thread(self._send_sync_email, sender_email, password, to_email, msg, smtp_server, smtp_port)

    async def send_verification_mail(self, to: str, subject: str, body: str, tenant_id: str | None = None, config=None):
        sender_email, ACCOUNTS_MAIL_PASSWORD, smtp_server, smtp_port, msg = await self._prepare_verification_message(to, subject, body, tenant_id, config)
        await asyncio.to_thread(self._send_sync_email, sender_email, ACCOUNTS_MAIL_PASSWORD, to, msg, smtp_server, smtp_port)

    async def send_verification_mail_list(self, to_list, subject: str, body: str, tenant_id: str | None = None):
        sender_email, ACCOUNTS_MAIL_PASSWORD, smtp_server, smtp_port, msg = await self._prepare_verification_message(", ".join(to_list), subject, body, tenant_id)
        await asyncio.to_thread(self._send_sync_email_list, sender_email, ACCOUNTS_MAIL_PASSWORD, to_list, msg, smtp_server, smtp_port)

    async def send_test_mail(self, tenant_id: str | None = None, config=None):
        meta_info = config or await self._selected_mail_config(tenant_id)
        to = meta_info.get("ACCOUNTS_MAIL")
        if not to:
            raise HTTPException(status_code=400, detail="SMTP configuration is incomplete")
        try:
            await self.send_verification_mail(to, "SMTP configuration test", "<p>SMTP configuration test email.</p>", tenant_id=tenant_id, config=meta_info)
        except HTTPException:
            raise
        except Exception as exc:
            smtp_code = getattr(exc, "smtp_code", "")
            smtp_error = getattr(exc, "smtp_error", None)
            if isinstance(smtp_error, bytes):
                smtp_error = smtp_error.decode(errors="ignore")
            detail = f"SMTP error {smtp_code}" if smtp_code else "Mail configuration is not working"
            if smtp_error:
                detail = f"{detail}: {smtp_error}"
            raise HTTPException(status_code=MAIL_CONFIGURATION_FAILED_STATUS, detail=detail) from exc

    @staticmethod
    def _send_sync_email(sender_email, password, to, msg, smtp_server, smtp_port):
        recipients = [to, sender_email]
        mail_manager._send_sync(sender_email, password, recipients, msg, smtp_server, smtp_port)

    @staticmethod
    def _send_sync_email_list(sender_email, password, to_list, msg, smtp_server, smtp_port):
        recipients = list(to_list) + [sender_email]
        mail_manager._send_sync(sender_email, password, recipients, msg, smtp_server, smtp_port)

    @staticmethod
    def _send_sync(sender_email, password, recipients, msg, smtp_server, smtp_port):
        if env_handler.get_instance().env("PRODUCTION", "0") == "1":
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(sender_email, password)
                server.sendmail(sender_email, recipients, msg.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.sendmail(sender_email, recipients, msg.as_string())

    async def validate_mail_configuration(self, tenant_id: str | None = None):
        if tenant_id:
            tenant_system_config = await self._tenant_system_mail_config(tenant_id)
            if tenant_system_config:
                sender_email, password, smtp_server, smtp_port = self._normalize_mail_config(tenant_system_config)
                await asyncio.to_thread(
                    mail_manager._validate_connection_sync, sender_email, password, smtp_server, smtp_port
                )
                return
        await asyncio.to_thread(mail_manager._validate_mail_configuration_sync)

    @staticmethod
    def _validate_mail_configuration_sync():
        sender_email, password, smtp_server, smtp_port = mail_manager._normalize_mail_config(
            mail_manager._global_mail_config())
        return mail_manager._validate_connection_sync(sender_email, password, smtp_server, smtp_port)

    @staticmethod
    def _validate_connection_sync(sender_email, password, smtp_server, smtp_port):
        try:
            is_production = env_handler.get_instance().env("PRODUCTION", "0") == "1"

            if is_production:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(
                    smtp_server,
                    smtp_port,
                    context=context,
                    timeout=10
                ) as server:

                    server.login(sender_email, password)

            else:
                with smtplib.SMTP(
                    smtp_server,
                    smtp_port,
                    timeout=10
                ) as server:
                    server.noop()

            return True

        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid network configuration in system settings"
            )
