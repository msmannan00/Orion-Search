from __future__ import annotations

import asyncio
import json

from orion.api.interactive.hompage_manager.homepage_model import homepage_model
from orion.management.models.insight_model_comparison import InsightComparisonModel
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS, REDIS_KEYS
from tests.cases.fake_model.fakes import FakeElastic, FakeRedis


def _run(coro):
    return asyncio.run(coro)


def test_invoke_analytics_reads_valid_comparison_from_redis(monkeypatch):
    payload = InsightComparisonModel().model_dump_json()
    fake_redis = FakeRedis({REDIS_KEYS.INSIGHT_STAT: payload})
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )

    result = _run(homepage_model.invoke_analytics())

    assert result == InsightComparisonModel()
    assert fake_redis.calls == [
        (REDIS_COMMANDS.S_GET_STRING, [REDIS_KEYS.INSIGHT_STAT, InsightComparisonModel().model_dump_json(), None])
    ]


def test_invoke_analytics_returns_none_for_missing_or_invalid_json(monkeypatch):
    fake_redis = FakeRedis({REDIS_KEYS.INSIGHT_STAT: "{bad"})
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.log.g",
        staticmethod(lambda: type("Logger", (), {"ex": staticmethod(lambda *_args, **_kwargs: None)})()),
    )

    assert _run(homepage_model.invoke_analytics()) is None


def test_insight_consolidated_result_uses_cache_before_elastic(monkeypatch):
    cached = {"leak_model": [{"hash": "abc"}]}
    fake_redis = FakeRedis({REDIS_KEYS.APP_INSIGHT_KEY: json.dumps(cached)})
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )

    result = _run(homepage_model.insight_consolidated_result())

    assert result == cached
    assert fake_redis.calls == [(REDIS_COMMANDS.S_GET_STRING, [REDIS_KEYS.APP_INSIGHT_KEY, None, None])]


def test_insight_consolidated_result_builds_and_caches_display_data(monkeypatch):
    fake_redis = FakeRedis()
    fake_elastic = FakeElastic(
        responses=[
            {"hits": {"hits": [{"_source": {"m_hash": "leak-1", "m_title": "Leak title", "m_country_name": "US", "m_update_date": "2026-04-01"}}]}},
            {"hits": {"hits": [{"_source": {"m_hash": "chat-1", "m_caption": "Chat hit", "m_channel_name": "alpha", "m_date": "2026-04-01"}}]}},
            {"hits": {"hits": [{"_source": {"m_hash": "exp-1", "m_title": "Exploit title", "m_network": "forum", "m_update_date": "2026-04-01"}}]}},
            {"hits": {"hits": [{"_source": {"m_hash": "gen-1", "m_title": "General title", "m_company_name": "Acme", "m_update_date": "2026-04-01", "m_url": "https://example.com"}}]}},
            {"hits": {"hits": [{"_source": {"m_hash": "def-1", "m_url": "https://defaced.example", "m_attacker": ["team-x"], "m_location": "US, CA", "m_date": "2026-04-01"}}]}},
        ]
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.insight_generator.on_insight_consolidated_data",
        lambda self: (["leak_model", "chat_model", "exploit_model", "generic_model", "defacement_model"], [{"q": 1}] * 5),
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.elastic_controller.get_instance",
        staticmethod(lambda: fake_elastic),
    )

    result = _run(homepage_model.insight_consolidated_result())

    assert result["leak_model"][0]["hash"] == "leak-1"
    assert result["chat_model"][0]["source"] == "alpha"
    assert result["exploit_model"][0]["source"] == "forum"
    assert result["generic_model"][0]["url"] == ["https://example.com"]
    assert result["defacement_model"][0]["source"] == "team-x"
    assert fake_redis.calls[-1] == (
        REDIS_COMMANDS.S_SET_STRING,
        [REDIS_KEYS.APP_INSIGHT_KEY, json.dumps(result), 300],
    )


def test_country_specific_insights_and_pagination_resolve_hashes(monkeypatch):
    fake_redis = FakeRedis()
    fake_elastic = FakeElastic(
        responses=[
            {"hits": {"hits": [{"_source": {"m_country": ["US"], "m_hash": "leak-1"}}]}},
            {"hits": {"hits": [{"_source": {"m_country": "DE", "m_hash": "gen-1"}}]}},
            {"hits": {"hits": []}},
            {"hits": {"hits": []}},
            {"hits": {"hits": []}},
            {"hits": {"hits": []}},
        ]
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.insight_generator.on_insight_consolidated_country",
        lambda self: (["leak_model", "generic_model", "exploit_model", "chat_model", "social_model", "defacement_model"], {"q": 1}),
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.elastic_controller.get_instance",
        staticmethod(lambda: fake_elastic),
    )

    grouped = _run(homepage_model.get_country_specific_insights())

    assert grouped["leak"] == [{"m_country": ["US"], "m_hash": "leak-1"}]
    assert grouped["generic"] == [{"m_country": ["DE"], "m_hash": "gen-1"}]
    assert fake_redis.calls[-1] == (
        REDIS_COMMANDS.S_SET_STRING,
        [f"{REDIS_KEYS.APP_INSIGHT_KEY}:country_v1", json.dumps(grouped), 86400],
    )

    resolver_elastic = FakeElastic(
        responses=[
            {"hits": {"hits": [{"_source": {"m_hash": "leak-1", "m_title": "Resolved leak"}}]}},
        ]
    )
    monkeypatch.setattr(
        homepage_model,
        "get_country_specific_insights",
        staticmethod(lambda: asyncio.sleep(0, result={"leak": grouped["leak"]})),
    )
    monkeypatch.setattr(
        "orion.api.interactive.hompage_manager.homepage_model.elastic_controller.get_instance",
        staticmethod(lambda: resolver_elastic),
    )

    paginated = _run(homepage_model.get_country_specific_insights_paginated("leak", "us", page=1, limit=1))

    assert paginated == {
        "items": [{"m_hash": "leak-1", "m_title": "Resolved leak"}],
        "total": 1,
        "page": 1,
        "limit": 1,
        "has_more": False,
    }


def test_homepage_country_and_display_helpers_cover_edge_cases():
    assert homepage_model._country_category_to_index("social") == "social_model"
    assert homepage_model._country_category_to_index("missing") is None
    assert homepage_model._country_only_payload({"m_country": "US", "m_hash": "abc"}) == {"m_country": ["US"], "m_hash": "abc"}
    assert homepage_model._country_matches(["PK, US"], "us") is True
    assert homepage_model._country_matches("DE", "us") is False
    assert homepage_model.parse_date_fallback("2026-04-01") == "April 01, 2026"

    display = homepage_model.transform_for_display(
        "defacement_model",
        {
            "m_hash": "abc",
            "m_url": "https://defaced.example",
            "m_attacker": ["team-x"],
            "m_location": "US, CA",
            "m_date": "2026-04-01",
        },
    )

    assert display["source"] == "team-x"
    assert display["location"] == "US, CA"
    assert display["hash"] == "abc"
