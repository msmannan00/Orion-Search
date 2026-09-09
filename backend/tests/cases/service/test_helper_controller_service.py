from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from orion.constants import constant
from orion.constants.constant import allowed_key_titles
from orion.helper_manager.helper_controller import helper_controller
from orion.services.redis_manager.redis_enums import REDIS_KEYS
from tests.cases.fake_model.fakes import FakeElastic, FakeRedis


def test_parse_filters_json_returns_mapping_and_invalid_input():
    assert helper_controller.parse_filters_json('[{"categoryId":"email","tags":["a","b"]}]') == {"email": ["a", "b"]}
    assert helper_controller.parse_filters_json("{bad") == {}


def test_extract_stealer_hash_handles_credential_and_general_logs():
    credential_hash = helper_controller.extract_stealer_hash(
        {"type": "credential", "email": ["alice@example.com"], "channel": "telegram"}
    )
    general_hash = helper_controller.extract_stealer_hash({"type": "log", "domain": ["example.com"], "channel": "telegram"})

    assert credential_hash
    assert general_hash
    assert helper_controller.extract_stealer_hash({"type": "credential"}) is None


def test_filter_clause_hash_and_url_helpers_cover_core_paths():
    must, should = helper_controller.getFilterClause(
        {"m_search_all": "alpha", "m_email": ["alice@example.com"]},
        SimpleNamespace(must=False),
        ["m_title", "m_email"],
    )

    assert must == []
    assert should["bool"]["should"]
    assert helper_controller.get_base_url("https://www.example.com/x?q=1") == "https://example.com"
    assert helper_controller.normalize_url("https://example.com/a?q=1#frag") == "https://example.com/a"
    assert helper_controller.extract_first_email("reach me at alice@example.com now") == "alice@example.com"
    assert helper_controller.extract_domains_from_text("visit https://www.example.com/path and test.io") == ["example.com", "test.io"]


def test_generate_data_hash_and_clone_model_behave_predictably():
    data = {"m_title": "Doc", "m_url": "https://example.com", "m_update_date": "today"}
    hashed = helper_controller.generate_data_hash(data)

    assert hashed == helper_controller.generate_data_hash({"m_title": "Doc"})
    assert helper_controller.generate_data_hash("value")
    with pytest.raises(ValueError):
        helper_controller.generate_data_hash(123)

    original = {"nested": {"a": 1}}
    cloned = helper_controller.clone_model(original)
    cloned["nested"]["a"] = 2
    assert original["nested"]["a"] == 1


def test_email_validation_query_helpers_and_password_schema(monkeypatch):
    monkeypatch.setattr(
        "orion.helper_manager.helper_controller.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "1")),
    )

    with pytest.raises(HTTPException):
        helper_controller.validate_company_email_domain("user@gmail.com")

    assert helper_controller.transform_query_match("alpha beta", "and") == '"alpha" "beta"'
    assert helper_controller.transform_query_match("alpha beta", "full") == '"alpha beta"'
    assert helper_controller.remove_stopwords_from_string('the quick "exact phrase" and fox') == '"exact phrase" quick fox'
    assert helper_controller.parse_tagged_logic_query_for_iocs("m_email:a@example.com AND m_domain:example.com")
    assert helper_controller.password_matches_schema("abc123!", SimpleNamespace(minLength=6, maxLength=10, hasAlphabets=True, hasNumbers=True, hasSpecialChars=True)) is True
    assert helper_controller.password_matches_schema("abcdef", SimpleNamespace(minLength=6, maxLength=10, hasNumbers=True)) is False


def test_build_assets_loads_templates_and_keys(tmp_path: Path):
    entities_dir = tmp_path / "assets" / "data" / "entities_data"
    mail_dir = tmp_path / "assets" / "data" / "mail_template_data"
    license_dir = tmp_path / "assets" / "data" / "licenses"
    url_dir = tmp_path / "assets" / "data" / "url_rules"
    satellite_dir = tmp_path / "assets" / "data" / "satellite"
    entities_dir.mkdir(parents=True)
    mail_dir.mkdir(parents=True)
    license_dir.mkdir(parents=True)
    url_dir.mkdir(parents=True)
    satellite_dir.mkdir(parents=True)

    (entities_dir / "entities.json").write_text(json.dumps([{"key": "m_email"}, {"key": "m_domain"}]), encoding="utf-8")
    (mail_dir / "mail_template.html").write_text("<p>{{ name }}</p>", encoding="utf-8")
    (mail_dir / "alert_mail_template.html").write_text("<p>{{ email_title }}</p>", encoding="utf-8")
    (license_dir / "license_rules.json").write_text('{"free": {"modules": []}}', encoding="utf-8")
    (url_dir / "url_rules.json").write_text('{"allowed": ["example.com"]}', encoding="utf-8")
    (satellite_dir / "satellite_assets.json").write_text('{"version": 1, "data": []}', encoding="utf-8")

    helper_controller.build_assets(tmp_path)

    assert "m_email" in allowed_key_titles
    assert constant.mail_template.render(name="alice") == "<p>alice</p>"
    assert constant.license_rules["free"]["modules"] == []
    assert constant.url_rules["allowed"] == ["example.com"]


@pytest.mark.anyio
async def test_init_map_entities_without_build_dir_is_noop():
    await helper_controller.init_map_entities(None)


@pytest.mark.anyio
async def test_satellite_asset_reindex_uses_asset_version(tmp_path: Path, monkeypatch):
    asset_file = tmp_path / "satellite_assets.json"
    fake_redis = FakeRedis({REDIS_KEYS.SATELLITE_ASSET_VERSION: "2"})
    fake_elastic = FakeElastic()

    monkeypatch.setattr(
        "orion.helper_manager.helper_controller.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )
    monkeypatch.setattr(
        "orion.helper_manager.helper_controller.elastic_controller.get_instance",
        staticmethod(lambda: fake_elastic),
    )

    asset_file.write_text('{"version": 2, "data": []}', encoding="utf-8")
    assert await helper_controller.build_satellite_asset_if_needed(asset_file) is False
    assert fake_elastic.reindex_map_entities_calls == []

    asset_file.write_text('{"version": 3, "data": [{"name": "new-map-entity"}]}', encoding="utf-8")
    assert await helper_controller.build_satellite_asset_if_needed(asset_file) is True
    assert fake_elastic.reindex_map_entities_calls == [True]
    assert constant.map_entities_data == '[{"name": "new-map-entity"}]'
    assert fake_redis.values[REDIS_KEYS.SATELLITE_ASSET_VERSION] == "3"
