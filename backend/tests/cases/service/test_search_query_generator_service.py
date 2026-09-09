from __future__ import annotations

from types import SimpleNamespace

from orion.api.server.crawl_manager.crawl_index_generator import crawl_index_generator
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX, ELASTIC_KEYS
from orion.api.interactive.search_manager.search_query_generator import search_query_generator


def test_build_es_from_tagged_and_ioc_filters_cover_domain_and_match_none():
    query = search_query_generator.build_es_from_tagged(
        {"OR": [{"tag": "m_domain", "value": "example.com"}, {"tag": "unknown", "value": "x"}]},
        {"m_domain": ["m_domain"], "source_domain": ["source_domain"]},
    )
    filters = search_query_generator.build_ioc_filter_clauses(
        {"m_email": ["alice@example.com"], "m_search_all": ["example.com"]}
    )

    assert "should" in query["bool"]
    assert {"match_none": {}} in query["bool"]["should"]
    assert filters


def test_query_block_supports_match_all_and_semantic_knn(monkeypatch):
    semantic = SimpleNamespace(embed_query_sync=lambda _query: [0.1, 0.2, 0.3])
    monkeypatch.setattr(
        "orion.api.interactive.search_manager.search_query_generator.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda key, default=None: "1" if key == "SEMANTIC_ENABLED" else default)),
    )
    monkeypatch.setattr(
        "orion.api.interactive.search_manager.search_query_generator.search_semantic_controller.get_instance",
        staticmethod(lambda: semantic),
    )

    match_all_query = search_query_generator._build_query_block(
        p_query_model=SimpleNamespace(matchtype="or", q="*", must=False),
        pfilter={},
        raw_query="*",
        quoted_value=False,
        exact_phrases=[],
        loose_terms=[],
        phrase_fields=[("m_title", 3)],
        must_clauses=[],
        must_not_clause=[],
        m_page_number=1,
        date_boost_fields=[("m_creation_date", 0.1)],
    )
    semantic_query = search_query_generator._build_query_block(
        p_query_model=SimpleNamespace(matchtype="semantic", q="alpha beta", must=False),
        pfilter={"m_email": ["alice@example.com"]},
        raw_query="alpha beta",
        quoted_value=False,
        exact_phrases=[],
        loose_terms=["alpha", "beta"],
        phrase_fields=[("m_title", 3)],
        must_clauses=[],
        must_not_clause=[],
        m_page_number=1,
        date_boost_fields=[("m_creation_date", 0.1)],
    )

    assert match_all_query["query"]["function_score"]["query"]["bool"]["must"][0] == {"match_all": {}}
    assert "knn" in semantic_query["query"]["function_score"]["query"]


def test_date_priority_filter_include_expected_ranges():
    priority_filter = search_query_generator.build_date_priority_filter(
        "2026-01-01T00:00:00+00:00",
        "2026-01-31T23:59:59+00:00",
        ["m_date", "m_update_date"],
    )

    assert priority_filter["bool"]["should"][1]["bool"]["must_not"]


def test_index_queries_and_summary_queries_return_entries():
    general_entries = crawl_index_generator.index_query_general(
        {"m_important_content": "important", "m_title": "Doc", "m_url": "https://example.com"}
    )
    sanctions_entries = crawl_index_generator.index_query_sanctions({"id": "entity-1", "schema_name": "Person"})
    social_entries = crawl_index_generator.index_query_social({"cards_data": [{"m_title": "Post", "m_channel_url": "https://t.me/x"}]})

    assert general_entries[0][ELASTIC_KEYS.S_DOCUMENT] == ELASTIC_INDEX.S_GENERIC_INDEX
    assert sanctions_entries[0][ELASTIC_KEYS.S_VALUE]["schema"] == "Person"
    assert social_entries[0][ELASTIC_KEYS.S_DOCUMENT] == ELASTIC_INDEX.S_SOCIAL_INDEX
