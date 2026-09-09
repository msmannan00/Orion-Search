import asyncio
from types import MethodType

from orion.api.server.entity_manager.entity_manager import entity_manager
from orion.api.server.entity_manager.modal.EntityQueryModel import EntityGraphBatchQueryModel


def run(coro):
    return asyncio.run(coro)


def graph_item(doc_key: str, property_key: str, property_value: str) -> dict:
    doc_id = f"cti_vertices/{doc_key}"
    property_id = f"cti_vertices/{property_key}:{property_value.lower()}"
    return {
        "vertex": {"_id": doc_id, "_key": doc_key, "type": "document"},
        "edge": {
            "_id": f"cti_edges/{doc_key}-{property_key}-{property_value.lower()}",
            "_from": doc_id,
            "_to": property_id,
            "type": f"has_{property_key.replace('m_', '')}",
        },
        "path": {
            "vertices": [{"_id": doc_id, "_key": doc_key, "type": "document"}],
            "edges": [],
        },
    }


def test_graph_batch_expands_country_values_and_applies_builder_and():
    manager = object.__new__(entity_manager)
    calls = []

    responses = {
        ("m_country", "India"): [graph_item("doc-india", "m_country", "India")],
        ("m_country", "Pakistan"): [graph_item("doc-shared", "m_country", "Pakistan")],
        ("m_ip", "8.8.8.8"): [graph_item("doc-shared", "m_ip", "8.8.8.8")],
    }

    async def fake_get_entity_relations(_self, query):
        calls.append(query)
        return {
            "results": responses.get((query.model_type, query.query_value), []),
            "limit_reached": False,
            "queried_id": f"cti_vertices/{query.model_type}:{query.query_value.lower()}",
            "matched_vertex_ids": [f"cti_vertices/{query.model_type}:{query.query_value.lower()}"],
        }

    manager.get_entity_relations = MethodType(fake_get_entity_relations, manager)
    payload = EntityGraphBatchQueryModel(
        edge="25",
        depth="1",
        requests=[
            {
                "data_point_type": "property",
                "model_type": "m_country",
                "query_values": ["India", "Pakistan"],
            },
            {
                "data_point_type": "property",
                "model_type": "m_ip",
                "query_values": ["8.8.8.8"],
                "operator": "&&",
            },
        ],
    )

    result = run(manager.get_entity_relations_batch(payload))

    assert [(call.model_type, call.query_value) for call in calls] == [
        ("m_country", "India"),
        ("m_country", "Pakistan"),
        ("m_ip", "8.8.8.8"),
    ]
    assert entity_manager._extract_document_ids_from_graph_results(result["results"]) == {"cti_vertices/doc-shared"}
    assert result["queried_ids"] == [
        "cti_vertices/m_country:india",
        "cti_vertices/m_country:pakistan",
        "cti_vertices/m_ip:8.8.8.8",
    ]


def test_graph_batch_preserves_repeated_country_row_and_operator():
    manager = object.__new__(entity_manager)
    calls = []

    responses = {
        ("m_country", "pakistan"): [graph_item("doc-pakistan", "m_country", "pakistan")],
        ("m_country", "india"): [graph_item("doc-india", "m_country", "india")],
    }

    async def fake_get_entity_relations(_self, query):
        calls.append(query)
        return {
            "results": responses.get((query.model_type, query.query_value), []),
            "limit_reached": False,
            "queried_id": f"cti_vertices/{query.model_type}:{query.query_value}",
            "matched_vertex_ids": [f"cti_vertices/{query.model_type}:{query.query_value}"],
        }

    manager.get_entity_relations = MethodType(fake_get_entity_relations, manager)
    payload = EntityGraphBatchQueryModel(
        edge="25",
        depth="1",
        requests=[
            {
                "data_point_type": "property",
                "model_type": "m_country",
                "query_value": "pakistan",
                "query_values": ["pakistan"],
            },
            {
                "data_point_type": "property",
                "model_type": "m_country",
                "query_value": "india",
                "query_values": ["india"],
                "operator": "&&",
            },
        ],
    )

    result = run(manager.get_entity_relations_batch(payload))

    assert [(call.model_type, call.query_value) for call in calls] == [
        ("m_country", "pakistan"),
        ("m_country", "india"),
    ]
    assert entity_manager._extract_document_ids_from_graph_results(result["results"]) == set()
