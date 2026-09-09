
from __future__ import annotations

import pytest

from orion.services.stix_manager.converters.chat_converter import chat_converter
from orion.services.stix_manager.converters.defacement_converter import defacement_converter
from orion.services.stix_manager.converters.exploit_converter import exploit_converter
from orion.services.stix_manager.converters.general_converter import general_converter
from orion.services.stix_manager.converters.leak_converter import leak_converter
from orion.services.stix_manager.converters.social_converter import social_converter
from orion.services.stix_manager.converters.stix_minimal import convert_to_stix


def _objects_by_type(bundle: dict) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for obj in bundle["objects"]:
        grouped.setdefault(obj["type"], []).append(obj)
    return grouped


def _single(bundle: dict, object_type: str) -> dict:
    matches = _objects_by_type(bundle).get(object_type, [])
    assert matches, f"missing object type: {object_type}"
    assert len(matches) == 1, f"expected one {object_type}, got {len(matches)}"
    return matches[0]


@pytest.mark.parametrize(
    ("converter_cls", "raw", "expected_name", "expected_tag"),
    [
        (
            chat_converter,
            {
                "m_caption": "Telegram dump",
                "m_content": "chat body",
                "m_channel_name": "alpha",
                "m_message_sharable_link": "https://t.me/example/1",
                "m_channel_url": "https://t.me/example",
                "m_date": "2026-04-01T10:11:12Z",
            },
            "Telegram dump",
            "tenant:chat",
        ),
        (
            defacement_converter,
            {
                "m_content": "defaced homepage",
                "m_url": "https://defaced.example/",
                "m_source_url": "https://mirror.example/",
                "m_date": "2026-04-01",
            },
            "https://defaced.example/",
            "tenant:defacement",
        ),
        (
            exploit_converter,
            {
                "m_title": "RCE advisory",
                "m_important_content": "critical exploit",
                "m_weblink": ["https://exploit.example/advisory"],
                "m_name": "ExploitDB",
                "m_creation_date": "2026-04-01T00:00:00Z",
            },
            "RCE advisory",
            "tenant:exploit",
        ),
        (
            general_converter,
            {
                "m_title": "General report",
                "m_important_content": "summary",
                "m_url": "https://general.example/",
                "m_base_url": "https://general.example",
                "m_creation_date": "2026-04-01T00:00:00Z",
            },
            "General report",
            "tenant:general",
        ),
        (
            leak_converter,
            {
                "m_title": "Leak post",
                "m_content": "database leak",
                "m_url": "https://leak.example/post",
                "m_base_url": "https://leak.example",
                "m_date": "2026-04-01",
            },
            "Leak post",
            "tenant:leak",
        ),
        (
            social_converter,
            {
                "m_title": "Social mention",
                "m_content": "account takeover",
                "m_channel_url": "https://x.example/profile",
                "m_message_sharable_link": "https://x.example/post/1",
                "m_date": "2026-04-01T10:11:12Z",
            },
            "Social mention",
            "tenant:social",
        ),
    ],
)
def test_wrapper_converters_build_stix_bundle(converter_cls, raw, expected_name, expected_tag):
    bundle = converter_cls().convert(raw)

    report = _single(bundle, "report")
    assert bundle["type"] == "bundle"
    assert report["name"] == expected_name
    assert expected_tag in report["labels"]


def test_convert_to_stix_builds_full_relationship_graph_for_general_content():
    raw = {
        "m_title": "Threat bulletin",
        "m_important_content": "operator summary",
        "m_content": "full content body",
        "m_url": "https://example.com/report",
        "m_base_url": "https://example.com",
        "m_creation_date": "2026-04-01T10:11:12Z",
        "m_update_date": "2026-04-02T11:12:13Z",
        "m_hash": "abc123",
        "m_domain": ["example.com", "example.com"],
        "m_ip": ["1.2.3.4", "2001:db8::1"],
        "m_email": ["user@example.com"],
        "m_cve": ["CVE-2026-1234", "CWE-79"],
        "m_hashtag": ["#breach"],
        "m_mention": ["@actor"],
        "m_team": "APT Demo",
        "m_sender_username": "analyst1",
        "m_network": "onion",
        "m_platform": ["forum"],
        "m_language": ["en"],
        "m_content_type": ["leaks"],
    }

    bundle = convert_to_stix("general", raw, "Acme Labs")
    grouped = _objects_by_type(bundle)

    report = _single(bundle, "report")
    observed = _single(bundle, "observed-data")
    note = _single(bundle, "note")
    relationship = _single(bundle, "relationship")

    assert "marking-definition" in grouped
    assert "intrusion-set" in grouped
    assert "identity" in grouped
    assert "infrastructure" in grouped
    assert len(grouped["indicator"]) == 5
    assert len(grouped["vulnerability"]) == 2
    assert len(grouped["url"]) == 2
    assert len(grouped["domain-name"]) == 1
    assert len(grouped["ipv4-addr"]) == 1
    assert len(grouped["ipv6-addr"]) == 1
    assert len(grouped["email-addr"]) == 1

    assert report["name"] == "Threat bulletin"
    assert report["published"] == "2026-04-01T10:11:12.000Z"
    assert report["modified"] == "2026-04-02T11:12:13.000Z"
    assert report["lang"] == "en"
    assert bundle["x_tenant_name"] == "Acme Labs"
    assert report["x_tenant_name"] == "Acme Labs"
    assert "acme-labs:general" in report["labels"]
    assert report["x_tenant_doc_id"] == "abc123"
    assert report["x_tenant_network"] == "onion"
    assert report["x_tenant_platform"] == ["forum"]
    assert report["external_references"][0]["url"] == "https://example.com/report"

    assert grouped["infrastructure"][0]["infrastructure_types"] == ["anonymization"]
    assert relationship["relationship_type"] == "uses"
    assert observed["number_observed"] == 1
    assert len(observed["object_refs"]) == 6
    assert "breach" in note["content"]
    assert "actor" in note["content"]


def test_convert_to_stix_filters_non_http_urls_and_invalid_cve_tokens():
    raw = {
        "m_title": "Exploit post",
        "m_content": "payload",
        "m_weblink": ["ftp://ignored.example/file", "https://kept.example/advisory"],
        "m_social_media_profiles": ["mailto:user@example.com"],
        "m_cve": ["not-a-cve", "CWE-999", "CVE-2026-8888"],
        "m_creation_date": "2026-04-01T00:00:00Z",
    }

    bundle = convert_to_stix("exploit", raw)
    grouped = _objects_by_type(bundle)

    assert [obj["value"] for obj in grouped["url"]] == ["https://kept.example/advisory"]
    vuln_names = sorted(obj["name"] for obj in grouped["vulnerability"])
    assert vuln_names == ["CVE-2026-8888", "CWE-999"]


def test_convert_to_stix_uses_now_when_dates_are_invalid_and_never_backdates_modified():
    raw = {
        "m_title": "Chat alert",
        "m_content": "message body",
        "m_channel_url": "https://chat.example/channel",
        "m_message_sharable_link": "https://chat.example/channel/1",
        "m_creation_date": "not-a-date",
        "m_update_date": "2020-01-01T00:00:00Z",
    }

    bundle = convert_to_stix("chat", raw)
    report = _single(bundle, "report")

    assert report["created"].endswith("Z")
    assert report["modified"] == report["created"]
