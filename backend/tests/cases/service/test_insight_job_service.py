from __future__ import annotations

import json

import pytest

from orion.management.jobs.insight_generator import insight_generator
from orion.management.jobs.insight_job import insight_job
from orion.management.models.insight_model import InsightData
from orion.services.elastic_manager.elastic_enums import ELASTIC_ENUMS, ELASTIC_INDEX, ELASTIC_KEYS
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS, REDIS_KEYS
from tests.cases.fake_model.fakes import FakeRedis


def test_populate_comparison_model_calculates_daily_and_weekly_changes():
    old_daily = InsightData()
    old_weekly = InsightData()
    new = InsightData()
    new.general.document_count = 10
    new.general.most_recent = "2026-04-01"
    new.leak.document_count = 5
    new.leak.unique_base_urls = 4
    new.leak.url_document_count = 4
    new.leak.dumps_document_count = 2
    new.defacement.common_server = "actor"
    old_daily.leak.document_count = 5
    old_weekly.general.document_count = 5

    result = insight_job.populate_comparison_model(old_daily, new, old_weekly)

    assert result.general.document_count.key == "Document Count"
    assert result.general.document_count.change_daily == "100%"
    assert result.general.document_count.change_weekly == "100.00%"
    assert result.leak.document_count.change_daily == "0%"
    assert result.general.most_recent.value == "2026-04-01"
    assert result.leak.unique_base_urls.key == "Actor Coverage"
    assert result.leak.url_document_count.key == "Victim Records"
    assert result.leak.dumps_document_count.key == "Countries Tagged"
    assert result.defacement.common_server.key == "Top Actor"


def test_generate_insight_queries_count_optional_metric_fields_by_document_presence():
    queries = insight_job.generate_insight_queries()
    aggs_by_label = {}
    for query in queries:
        aggs = query[ELASTIC_KEYS.S_FILTER]["aggs"]
        label = next(iter(aggs))
        aggs_by_label[(query[ELASTIC_KEYS.S_DOCUMENT], label)] = aggs[label]

    assert aggs_by_label[(ELASTIC_INDEX.S_GENERIC_INDEX, "Indexed URLs")] == {
        "filter": {
            "bool": {
                "should": [{"exists": {"field": "m_url"}}],
                "minimum_should_match": 1,
            }
        }
    }
    assert aggs_by_label[(ELASTIC_INDEX.S_GENERIC_INDEX, "Known Domains")] == {
        "filter": {
            "bool": {
                "should": [{"exists": {"field": "m_domain"}}],
                "minimum_should_match": 1,
            }
        }
    }
    assert aggs_by_label[(ELASTIC_INDEX.S_GENERIC_INDEX, "Common Type")] == {
        "terms": {"field": "m_content_type", "size": 1}
    }
    assert aggs_by_label[(ELASTIC_INDEX.S_LEAK_INDEX, "Actor Coverage")] == {
        "filter": {
            "bool": {
                "should": [{"exists": {"field": "m_team"}}, {"exists": {"field": "m_attacker"}}],
                "minimum_should_match": 1,
            }
        }
    }
    assert aggs_by_label[(ELASTIC_INDEX.S_LEAK_INDEX, "Victim Records")] == {
        "filter": {
            "bool": {
                "should": [{"exists": {"field": "m_title"}}, {"exists": {"field": "m_name"}}, {"exists": {"field": "m_company_name"}}],
                "minimum_should_match": 1,
            }
        }
    }
    assert aggs_by_label[(ELASTIC_INDEX.S_LEAK_INDEX, "Countries Tagged")] == {
        "filter": {
            "bool": {
                "should": [{"exists": {"field": "m_country"}}, {"exists": {"field": "m_country_name"}}],
                "minimum_should_match": 1,
            }
        }
    }
    assert aggs_by_label[(ELASTIC_INDEX.S_DEFACEMENT_INDEX, "Top Team")] == {
        "terms": {"field": "m_team", "size": 1}
    }
    assert aggs_by_label[(ELASTIC_INDEX.S_DEFACEMENT_INDEX, "Top Actor")] == {
        "terms": {"field": "m_attacker", "size": 1}
    }


def test_insight_leak_query_collapses_on_mapped_domain_keyword_field():
    index, query = insight_generator.on_insight_leakdata()

    assert index == ELASTIC_INDEX.S_LEAK_INDEX
    assert query["collapse"] == {"field": "m_domain"}
    assert {"exists": {"field": "m_domain"}} in query["query"]["bool"]["must"]
    assert query["query"]["bool"]["must"][1]["script"]["script"]["source"] == "doc['m_domain'].size()==1"
    assert "m_domain.keyword" not in json.dumps(query)
    assert query["sort"] == [
        {"m_update_date": {"order": "desc", "missing": "_last", "unmapped_type": "date"}}
    ]


def test_country_insight_sort_tolerates_indices_without_update_date_mapping():
    indices, query = insight_generator.on_insight_consolidated_country()

    assert ELASTIC_INDEX.S_CHATS_INDEX in indices
    assert ELASTIC_INDEX.S_SOCIAL_INDEX in indices
    assert query["sort"] == [
        {"_doc": {"order": "asc"}}
    ]


def test_leak_mapping_declares_domain_for_collapse():
    properties = ELASTIC_ENUMS.mapping_leakdatamodel["mappings"]["properties"]

    assert properties["m_domain"] == {"type": "keyword"}


@pytest.mark.anyio
async def test_get_insight_reads_doc_count_aggregations(monkeypatch):
    class _Elastic:
        async def search_query(self, document, data_filter):
            key = next(iter(data_filter["aggs"]))
            doc_count_values = {
                (ELASTIC_INDEX.S_GENERIC_INDEX, "Document Count"): 302,
                (ELASTIC_INDEX.S_GENERIC_INDEX, "Indexed URLs"): 302,
                (ELASTIC_INDEX.S_GENERIC_INDEX, "Known Domains"): 302,
                (ELASTIC_INDEX.S_GENERIC_INDEX, "Languages Tagged"): 281,
                (ELASTIC_INDEX.S_GENERIC_INDEX, "Organizations Tagged"): 80,
                (ELASTIC_INDEX.S_GENERIC_INDEX, "Countries Tagged"): 54,
                (ELASTIC_INDEX.S_LEAK_INDEX, "Actor Coverage"): 14940,
                (ELASTIC_INDEX.S_LEAK_INDEX, "Victim Records"): 14960,
                (ELASTIC_INDEX.S_LEAK_INDEX, "Countries Tagged"): 5678,
                (ELASTIC_INDEX.S_DEFACEMENT_INDEX, "Document Count"): 48628,
            }

            if (document, key) in doc_count_values:
                return True, {"aggregations": {key: {"doc_count": doc_count_values[(document, key)]}}}
            if "terms" in data_filter["aggs"][key]:
                return True, {"aggregations": {key: {"buckets": [{"key": "sample"}]}}}
            return True, {"aggregations": {key: {"value": 0}}}

    monkeypatch.setattr(
        "orion.management.jobs.insight_job.elastic_controller.get_instance",
        staticmethod(lambda: _Elastic()),
    )

    status, result = await insight_job.get_insight()

    assert status is True
    assert result.general.document_count == 302
    assert result.general.url_document_count == 302
    assert result.general.archive_document_count == 302
    assert result.general.email_document_count == 281
    assert result.general.phone_document_count == 80
    assert result.general.clearnet_document_count == 54
    assert result.leak.unique_base_urls == 14940
    assert result.leak.url_document_count == 14960
    assert result.leak.dumps_document_count == 5678
    assert result.defacement.document_count == 48628


@pytest.mark.anyio
async def test_update_trending_insights_reads_old_values_and_writes_day_snapshot(monkeypatch):
    fake_redis = FakeRedis()
    new_insight = InsightData()
    new_insight.general.document_count = 7

    async def _fake_fetch():
        return new_insight

    monkeypatch.setattr(insight_job, "_insight_job__fetch_elastic_insight", staticmethod(_fake_fetch))
    monkeypatch.setattr(
        "orion.management.jobs.insight_job.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )

    job = object.__new__(insight_job)
    await job.update_trending_insights(REDIS_KEYS.INSIGHT_OLD_DAY)

    assert any(call[1][0] == REDIS_KEYS.INSIGHT_STAT for call in fake_redis.calls)
    assert REDIS_KEYS.INSIGHT_OLD_DAY in fake_redis.values
    stored = json.loads(fake_redis.values[REDIS_KEYS.INSIGHT_OLD_DAY])
    assert stored["general"]["document_count"] == 7


@pytest.mark.anyio
async def test_update_trending_insights_writes_week_snapshot_when_requested(monkeypatch):
    fake_redis = FakeRedis(
        {
            REDIS_KEYS.INSIGHT_OLD_DAY: InsightData().model_dump_json(),
            REDIS_KEYS.INSIGHT_OLD_WEEK: InsightData().model_dump_json(),
        }
    )
    new_insight = InsightData()
    new_insight.defacement.document_count = 3

    async def _fake_fetch():
        return new_insight

    monkeypatch.setattr(insight_job, "_insight_job__fetch_elastic_insight", staticmethod(_fake_fetch))
    monkeypatch.setattr(
        "orion.management.jobs.insight_job.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )

    job = object.__new__(insight_job)
    await job.update_trending_insights(REDIS_KEYS.INSIGHT_OLD_WEEK)

    stored = json.loads(fake_redis.values[REDIS_KEYS.INSIGHT_OLD_WEEK])
    assert stored["defacement"]["document_count"] == 3


@pytest.mark.anyio
async def test_update_insights_runs_day_then_weekly_rollover(monkeypatch):
    class _StopLoop(Exception):
        pass

    calls = []

    async def _fake_update(_self, arg):
        calls.append(arg)
        if arg == REDIS_KEYS.INSIGHT_OLD_WEEK:
            raise _StopLoop

    async def _fake_sleep(_seconds):
        return None

    fake_redis = FakeRedis()
    monkeypatch.setattr(
        "orion.management.jobs.insight_job.redis_controller.getInstance",
        staticmethod(lambda: fake_redis),
    )
    monkeypatch.setattr(insight_job, "update_trending_insights", _fake_update)

    monkeypatch.setattr("orion.management.jobs.insight_job.asyncio.sleep", _fake_sleep)
    job = object.__new__(insight_job)

    try:
        await job.update_insights()
    except _StopLoop:
        pass

    assert fake_redis.calls[0] == (REDIS_COMMANDS.S_GET_STRING, [REDIS_KEYS.INSIGHT_OLD_DAY, None, None])
    assert calls[0] == REDIS_KEYS.INSIGHT_OLD_DAY
    assert REDIS_KEYS.INSIGHT_OLD_WEEK in calls
