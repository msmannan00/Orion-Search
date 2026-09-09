from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import httpx
import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException

from orion.api.interactive.search_manager.search_data_model.consolidated.search_consolidated_param_model import (
    search_consolidated_param_model,
)
from orion.api.interactive.search_manager.search_data_model.dump.search_credential_param_model import (
    PasswordFilterModel,
    search_credential_param_model,
)
from orion.api.interactive.search_manager.search_model import search_model
from orion.constants.constant import CONSTANTS
from orion.helper_manager.env_handler import env_handler
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX
from tests.cases.fake_model.fakes import FakeElastic


def _run(coro):
    return asyncio.run(coro)


def _hit(source: dict, *, index: str = "test-index", score: float = 1.0, doc_id: str = "doc-1") -> dict:
    return {
        "_id": doc_id,
        "_index": index,
        "_score": score,
        "_source": source,
    }


def _search_response(*hits: dict, total: int | None = None) -> dict:
    return {
        "hits": {
            "hits": list(hits),
            "total": {"value": len(hits) if total is None else total},
        }
    }


@pytest.fixture
def fake_elastic(monkeypatch):
    fake = FakeElastic()
    monkeypatch.setattr(
        "orion.services.elastic_manager.elastic_controller.elastic_controller.get_instance",
        staticmethod(lambda: fake),
    )
    monkeypatch.setattr(
        env_handler,
        "get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda key, default=None: "0" if key == "SEMANTIC_ENABLED" else default)),
    )
    return fake


def test_search_wanted_list_builds_query_and_returns_cards(fake_elastic):
    fake_elastic.search_query_result = (
        True,
        _search_response(
            _hit({"name": "John Doe", "caption": "listed target"}, index=ELASTIC_INDEX.S_OPENSANCTIONS_INDEX),
            total=1,
        ),
    )
    payload = SimpleNamespace(text={"query": "John Doe"})

    result = _run(search_model.search_wanted_list(payload))

    assert result == {
        "cards_data": [{"name": "John Doe", "caption": "listed target"}],
        "total": 1,
    }
    document, query = fake_elastic.search_query_calls[0]
    assert document == ELASTIC_INDEX.S_OPENSANCTIONS_INDEX
    should = query["query"]["bool"]["should"]
    assert any("caption" in clause["match"] for clause in should)
    assert any("name" in clause["match"] for clause in should)
    assert query["sort"][0] == {"_score": {"order": "desc"}}


def test_request_general_doc_fetches_document_and_translates_selected_fields(fake_elastic, monkeypatch):
    fake_elastic.get_doc_result = [{
        "m_title": "Doc",
        "m_url": "https://example.com/",
        "m_base_url": "https://example.com/",
        "m_content": "content",
        "m_important_content": "important",
        "m_content_type": "general",
        "m_update_date": datetime.now(timezone.utc),
        "m_creation_date": datetime.now(timezone.utc),
        "m_embedding": [1, 2, 3],
    }]
    translations = []
    monkeypatch.setattr(
        "orion.helper_manager.helper_controller.helper_controller.detect_and_translate",
        staticmethod(lambda text, target_lang: translations.append((text, target_lang)) or f"{target_lang}:{text}"),
    )

    async def fake_get_value_crawl_status(_record_name: str, _url: str):
        return {"status": "active", "last_checked_at": None}

    monkeypatch.setattr(
        "orion.api.interactive.search_manager.search_model.FeederManager.get_instance",
        staticmethod(lambda: SimpleNamespace(get_value_crawl_status=fake_get_value_crawl_status)),
    )

    result = _run(search_model().request_general_doc("doc-1", "ur"))

    assert fake_elastic.get_doc_calls == [(ELASTIC_INDEX.S_GENERIC_INDEX, "doc-1")]
    assert result["m_content"] == "ur:content"
    assert result["m_important_content"] == "ur:important"
    assert result["m_crawl_status"] == "active"
    assert result["m_last_crawled_at"] is None
    assert "m_embedding" not in result
    assert translations == [("content", "ur"), ("important", "ur")]


def test_search_consolidated_ranked_result_uses_real_generator_and_passes_built_query(fake_elastic):
    fake_elastic.search_consolidated_result = _search_response(
        _hit({"m_title": "Leak", "m_content": "body", "m_content_type": ["leaks"]}, index=ELASTIC_INDEX.S_LEAK_INDEX, score=5.0),
        total=1,
    )
    param = search_consolidated_param_model(
        q="alpha beta",
        matchtype="full",
        page=2,
        network="telegram",
        safe=True,
        daterange="2026-01-01,2026-01-31",
        entity_filter={"m_url": ["example.com"]},
    )

    result = _run(
        search_model.search_consolidated_ranked_result(
            param,
            [ELASTIC_INDEX.S_LEAK_INDEX],
            blocked_categories=["news"],
            allowed_categories=["leaks"],
        )
    )

    assert result["Total_Hits"] == 1
    assert result["Page_Count"] == 1
    assert result["Result"][0]["rank_index"] == ELASTIC_INDEX.S_LEAK_INDEX

    indices, query, indices_boost = fake_elastic.search_consolidated_calls[0]
    assert indices == [ELASTIC_INDEX.S_LEAK_INDEX]
    assert indices_boost == [{ELASTIC_INDEX.S_LEAK_INDEX: 2}]
    filters = query["query"]["function_score"]["query"]["bool"]["filter"]
    assert any("range" in clause["bool"]["should"][0]["bool"]["filter"][1] for clause in filters if "bool" in clause and "should" in clause["bool"])
    assert any(clause == {"term": {"m_network": "telegram"}} for clause in filters)
    assert any("m_url.raw" in str(clause) for clause in filters)
    must_not = query["query"]["function_score"]["query"]["bool"]["must_not"]
    assert {"term": {"m_content_type": "adult"}} in must_not
    assert query["from"] == 15
    assert query["size"] == 15


def test_search_consolidated_iocs_builds_ioc_logic_and_returns_ranked_results(fake_elastic):
    fake_elastic.search_consolidated_result = _search_response(
        _hit({"m_title": "IOC", "m_content": "body", "m_content_type": ["leaks"]}, index=ELASTIC_INDEX.S_LEAK_INDEX),
        total=3,
    )
    param = search_consolidated_param_model(
        ioc="m_email:test@example.com AND m_domain:example.com",
        daterange="2026-02-01,2026-02-10",
        page=1,
    )

    result = _run(search_model.search_consolidated_iocs(param, [ELASTIC_INDEX.S_LEAK_INDEX]))

    assert result["Total_Hits"] == 3
    indices, query, _indices_boost = fake_elastic.search_consolidated_calls[0]
    assert indices == [ELASTIC_INDEX.S_LEAK_INDEX]
    filters = query["query"]["function_score"]["query"]["bool"]["filter"]
    assert any("m_email" in str(clause) and "m_domain" in str(clause) for clause in filters)
    assert any("m_date" in str(clause) or "m_date" in str(clause) for clause in filters)


# def test_search_stealerlogs_result_normalizes_mapping_and_preserves_page(fake_elastic):
#     fake_elastic.search_query_result = (
#         True,
#         _search_response(
#             _hit(
#                 {
#                     "type": "credential",
#                     "channel": "telegram",
#                     "mapping": ["email:foo{}", "domain:bar{}"],
#                 },
#                 index=ELASTIC_INDEX.S_STEALERLOGS_INDEX,
#                 doc_id="cred-1",
#             ),
#             total=1,
#         ),
#     )
#     model = search_model()
#     param = search_credential_param_model(q="alice@example.com", category="all", page=2)

#     result = _run(model.search_stealerlogs_result(param))

#     assert result.Result[0].model_dump()["_id"] == "cred-1"
#     assert result.Result[0].mapping == ["email", "domain"]
#     assert result.Page_Count == 2
#     document, query = fake_elastic.search_query_calls[0]
#     assert document == ELASTIC_INDEX.S_STEALERLOGS_INDEX
#     assert query["size"] >= 1


def test_search_stealer_iocs_applies_password_schema_after_real_query_build(fake_elastic):
    fake_elastic.search_query_result = (
        True,
        _search_response(
            _hit({"password": "abc123!", "channel": "telegram"}, index=ELASTIC_INDEX.S_STEALERLOGS_INDEX, doc_id="good"),
            _hit({"password": "abcdef", "channel": "telegram"}, index=ELASTIC_INDEX.S_STEALERLOGS_INDEX, doc_id="bad"),
            total=2,
        ),
    )
    model = search_model()
    param = search_credential_param_model(
        ioc="m_email:test@example.com",
        page=1,
        password_schema=PasswordFilterModel(
            minLength=6,
            hasNumbers=True,
            hasSpecialChars=True,
        ),
    )

    result = _run(model.search_stealer_iocs(param))

    assert [item.model_dump()["password"] for item in result.Result] == ["abc123!"]
    assert result.Page_Count == 1
    document, query = fake_elastic.search_query_calls[0]
    assert document == ELASTIC_INDEX.S_STEALERLOGS_INDEX
    assert "m_emails" in str(query) or "email" in str(query)


def test_search_stealer_iocs_decrypts_password_before_return(fake_elastic, monkeypatch):
    key = Fernet.generate_key().decode()
    encrypted_password = Fernet(key.encode()).encrypt(b"Secret123!").decode()
    monkeypatch.setattr(CONSTANTS, "S_ENCRYPTION_KEY", key)
    fake_elastic.search_query_result = (
        True,
        _search_response(
            _hit({"password": encrypted_password, "channel": "telegram"}, index=ELASTIC_INDEX.S_STEALERLOGS_INDEX),
            total=1,
        ),
    )

    result = _run(search_model().search_stealer_iocs(search_credential_param_model(ioc="m_email:test@example.com")))

    assert result.Result[0].model_dump()["password"] == "Secret123!"


def test_dynamic_search_returns_json_payload(monkeypatch):
    class _Response:
        status_code = 200

        @staticmethod
        def json():
            return {"ok": True}

    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, json, timeout):
            assert "runtime/parse/example/user-1" in url
            assert json == {"hello": "world"}
            assert timeout == 120
            return _Response()

    monkeypatch.setattr(httpx, "AsyncClient", lambda: _Client())

    result = _run(search_model.dynamic_search(SimpleNamespace(model_dump=lambda: {"hello": "world"}), "example", "user-1"))

    assert result == {"ok": True}


def test_social_search_handles_transport_failure(monkeypatch):
    class _Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            raise RuntimeError("boom")

    monkeypatch.setattr(httpx, "AsyncClient", lambda: _Client())

    result = _run(search_model.social_search({"query": "x"}, "lookup"))

    assert result.status_code == 500
    assert result.body == b'{"detail":"Failed to process social search"}'


def test_search_consolidated_result_groups_platform_results(fake_elastic):
    fake_elastic.search_consolidated_result = _search_response(
        _hit({"m_title": "Leak", "m_content": "body", "m_content_type": ["leaks"]}, index=ELASTIC_INDEX.S_LEAK_INDEX),
        total=1,
    )
    param = search_consolidated_param_model(q="alpha", platform="leak_model")

    result = _run(search_model.search_consolidated_result(param))

    assert len(result.leak_model.Result) == 1
    assert result.leak_model.Result[0].m_title == "Leak"
    assert len(fake_elastic.search_consolidated_calls) == 3
    assert all(indices == [ELASTIC_INDEX.S_LEAK_INDEX] for indices, _query, _boost in fake_elastic.search_consolidated_calls)


def test_search_consolidated_result_does_not_filter_apt_malware_by_page_category(fake_elastic):
    fake_elastic.search_consolidated_result = _search_response()
    param = search_consolidated_param_model(q="malware", category="credential")

    _run(search_model.search_consolidated_result(param))

    apt_queries = [query for indices, query, _boost in fake_elastic.search_consolidated_calls if indices == [ELASTIC_INDEX.S_APT_INDEX]]
    malware_queries = [query for indices, query, _boost in fake_elastic.search_consolidated_calls if indices == [ELASTIC_INDEX.S_MALWARE_INDEX]]
    assert apt_queries
    assert malware_queries
    assert "credential" not in str(apt_queries[0])
    assert "credential" not in str(malware_queries[0])


def test_search_stealerlogs_persona_breach_summarizes_aggregations(fake_elastic):
    fake_elastic.search_query_result = (
        True,
        {
            "aggregations": {
                "channels": {"buckets": [{"key": "telegram", "doc_count": 3}]},
                "types": {"buckets": [{"key": "credential", "doc_count": 2}]},
            }
        },
    )

    result = _run(search_model().search_stealerlogs_persona_breach(search_credential_param_model(q="alice@example.com")))

    assert result["breach_found"] is True
    assert result["primary_channel"] == "telegram"
    assert result["severity"] == "HIGH"


def test_extract_ioc_from_file_raises_http_exception_on_failed_service(monkeypatch):
    class _Response:
        status_code = 500
        text = "bad upstream"

    class _Client:
        def __init__(self, timeout):
            assert timeout == 120

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_value, tb):
            return False

        async def post(self, url, files):
            assert "file/scan/user-1" in url
            assert files["file"][0] == "ioc.txt"
            return _Response()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)

    with pytest.raises(HTTPException) as exc:
        _run(search_model().extract_ioc_from_file(b"ioc-data", "ioc.txt", "user-1"))

    assert "bad upstream" in str(exc.value.detail)
