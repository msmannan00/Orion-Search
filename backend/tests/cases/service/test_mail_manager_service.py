from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from orion.services.mail_manager.mail_manager import mail_manager


def test_validate_mail_configuration_rejects_invalid_smtp_settings(monkeypatch):
    monkeypatch.setattr(
        "orion.api.server.config_manager.config_controller.config_controller.getInstance",
        staticmethod(
            lambda: SimpleNamespace(
                _config={
                    "meta_info": json.dumps(
                        {
                            "ACCOUNTS_MAIL": "accounts@example.com",
                            "ACCOUNTS_MAIL_PASSWORD": "1#VSC&cuad)d",
                            "ACCOUNTS_SMTP_SERVER": "mailpit",
                            "ACCOUNTS_SMTP_PORT": "bad-port",
                        }
                    )
                }
            )
        ),
    )

    with pytest.raises(HTTPException) as exc:
        mail_manager._validate_mail_configuration_sync()

    assert exc.value.status_code == 400
    assert exc.value.detail == "SMTP configuration is incomplete"


@pytest.mark.anyio
async def test_send_verification_mail_uses_saved_smtp_settings(monkeypatch):
    manager: mail_manager = mail_manager.get_instance()
    sent = {}

    monkeypatch.setattr(
        "orion.api.server.config_manager.config_controller.config_controller.getInstance",
        staticmethod(
            lambda: SimpleNamespace(
                _config={
                    "meta_info": json.dumps(
                        {
                            "ACCOUNTS_MAIL": "accounts@example.com",
                            "ACCOUNTS_MAIL_PASSWORD": "1#VSC&cuad)d",
                            "ACCOUNTS_SMTP_SERVER": "mailpit",
                            "ACCOUNTS_SMTP_PORT": "1025",
                        }
                    )
                }
            )
        ),
    )

    async def process_app_variables(subject: str, body: str):
        return subject, body

    async def to_thread(func, *args, **kwargs):
        return func(*args, **kwargs)

    def send_sync_email(sender_email, password, to, msg, smtp_server, smtp_port):
        sent.update(
            {
                "sender_email": sender_email,
                "password": password,
                "to": to,
                "subject": msg["Subject"],
                "smtp_server": smtp_server,
                "smtp_port": smtp_port,
            }
        )

    monkeypatch.setattr(manager, "process_app_variables", process_app_variables)
    monkeypatch.setattr(asyncio, "to_thread", to_thread)
    monkeypatch.setattr(mail_manager, "_send_sync_email", staticmethod(send_sync_email))

    await manager.send_verification_mail("user@example.com", "Subject", "<p>Hello</p>")

    assert sent == {
        "sender_email": "accounts@example.com",
        "password": "1#VSC&cuad)d",
        "to": "user@example.com",
        "subject": "Subject",
        "smtp_server": "mailpit",
        "smtp_port": 1025,
    }


@pytest.mark.anyio
async def test_send_test_mail_verifies_configuration(monkeypatch):
    manager: mail_manager = mail_manager.get_instance()
    sent = {}

    async def process_app_variables(subject: str, body: str):
        return subject, body

    async def to_thread(func, *args, **kwargs):
        return func(*args, **kwargs)

    def send_sync_email(sender_email, password, to, msg, smtp_server, smtp_port):
        sent.update(
            {
                "sender_email": sender_email,
                "password": password,
                "to": to,
                "subject": msg["Subject"],
                "smtp_server": smtp_server,
                "smtp_port": smtp_port,
            }
        )

    monkeypatch.setattr(manager, "process_app_variables", process_app_variables)
    monkeypatch.setattr(asyncio, "to_thread", to_thread)
    monkeypatch.setattr(mail_manager, "_send_sync_email", staticmethod(send_sync_email))

    await manager.send_test_mail(
        config={
            "ACCOUNTS_MAIL": "accounts@example.com",
            "ACCOUNTS_MAIL_PASSWORD": "1#VSC&cuad)d",
            "ACCOUNTS_SMTP_SERVER": "mailpit",
            "ACCOUNTS_SMTP_PORT": "1025",
        }
    )

    assert sent == {
        "sender_email": "accounts@example.com",
        "password": "1#VSC&cuad)d",
        "to": "accounts@example.com",
        "subject": "SMTP configuration test",
        "smtp_server": "mailpit",
        "smtp_port": 1025,
    }


@pytest.mark.anyio
async def test_send_test_mail_falls_back_to_global_smtp_when_tenant_smtp_missing(monkeypatch):
    manager: mail_manager = mail_manager.get_instance()
    sent = {}

    async def tenant_system_mail_config(tenant_id: str | None):
        assert tenant_id == "tenant-without-smtp"
        return None

    async def process_app_variables(subject: str, body: str):
        return subject, body

    async def to_thread(func, *args, **kwargs):
        return func(*args, **kwargs)

    def send_sync_email(sender_email, password, to, msg, smtp_server, smtp_port):
        sent.update(
            {
                "sender_email": sender_email,
                "password": password,
                "to": to,
                "subject": msg["Subject"],
                "smtp_server": smtp_server,
                "smtp_port": smtp_port,
            }
        )

    monkeypatch.setattr(manager, "_tenant_system_mail_config", tenant_system_mail_config)
    monkeypatch.setattr(
        mail_manager,
        "_global_mail_config",
        staticmethod(
            lambda: {
                "ACCOUNTS_MAIL": "global@example.com",
                "ACCOUNTS_MAIL_PASSWORD": "global-pass",
                "ACCOUNTS_SMTP_SERVER": "mailpit",
                "ACCOUNTS_SMTP_PORT": "1025",
            }
        ),
    )
    monkeypatch.setattr(manager, "process_app_variables", process_app_variables)
    monkeypatch.setattr(asyncio, "to_thread", to_thread)
    monkeypatch.setattr(mail_manager, "_send_sync_email", staticmethod(send_sync_email))

    await manager.send_test_mail(tenant_id="tenant-without-smtp")

    assert sent == {
        "sender_email": "global@example.com",
        "password": "global-pass",
        "to": "global@example.com",
        "subject": "SMTP configuration test",
        "smtp_server": "mailpit",
        "smtp_port": 1025,
    }
