from __future__ import annotations

import asyncio

from fastapi.routing import APIRoute

from orion.services.alert_webhook_manager.alert_webhook_manager import AlertWebhookManager
from orion.services.mongo_manager.shared_model.db_alert_connector_model import AlertConnectorProvider
from routes.alert_connector_routes import alert_connector_routes
from tests.cases.fake_model.fakes import FakeAlertConnectorManager, FakeSlackConnectorProvider


def test_alert_webhook_sends_only_to_requested_tenant_webhook(monkeypatch):
    connector_manager = FakeAlertConnectorManager()
    slack_provider = FakeSlackConnectorProvider()
    manager = object.__new__(AlertWebhookManager)
    manager._connector_manager = connector_manager
    manager._providers = {AlertConnectorProvider.SLACK: slack_provider}

    async def to_thread(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(asyncio, "to_thread", to_thread)

    asyncio.run(
        manager.send_alert(
            tenant_id="tenant-1",
            subject="Tenant alert",
            email_title="Tenant alert email",
            friendly_message="Alert message",
            scan_status="completed",
            total_alerts=1,
            module_rows=[{"label": "General", "count": 1}],
            ioc_rows=[{"type": "domain", "value": "example.com"}],
            action_url="https://orion.test/alerts",
        )
    )

    assert connector_manager.config_calls == [("tenant-1", AlertConnectorProvider.SLACK)]
    assert connector_manager.refresh_calls == [("tenant-1", AlertConnectorProvider.SLACK, {"webhook_url": "https://hooks.slack.test/tenant-1"})]
    assert len(slack_provider.sent) == 1
    sent_config, sent_alert = slack_provider.sent[0]
    assert sent_config["webhook_url"] == "https://hooks.slack.test/tenant-1"
    assert sent_config["webhook_url"] != "https://hooks.slack.test/tenant-2"
    assert sent_alert["subject"] == "Tenant alert"
    assert sent_alert["total_alerts"] == 1


def test_alert_connector_callback_route_is_configured():
    callback_routes = [
        route
        for route in alert_connector_routes.routes
        if isinstance(route, APIRoute) and route.path == "/api/alert-connectors/{provider}/callback"
    ]

    assert len(callback_routes) == 1
    assert callback_routes[0].endpoint.__name__ == "connector_callback"
    assert "GET" in callback_routes[0].methods
