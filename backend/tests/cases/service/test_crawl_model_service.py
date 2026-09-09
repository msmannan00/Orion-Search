from __future__ import annotations

import asyncio
import base64
import hashlib
import json
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from typing import Any, cast
from zipfile import ZipFile

import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException
from starlette.requests import Request

from orion.api.server.crawl_manager.class_model.CTITextRequest import CTITextRequest
from orion.api.server.crawl_manager.class_model.chat_model import chat_data_model
from orion.api.server.crawl_manager.class_model.defacement_model import CardExtractionModel as DefacementCardExtractionModel
from orion.api.server.crawl_manager.class_model.defacement_model import DefacementDataModel
from orion.api.server.crawl_manager.class_model.domain_scan_request_model import DomainScanRequest
from orion.api.server.crawl_manager.class_model.exploit_model import CardExtractionModel as ExploitCardExtractionModel
from orion.api.server.crawl_manager.class_model.exploit_model import ExploitDataModel
from orion.api.server.crawl_manager.class_model.file_model import ScreenshotPayload
from orion.api.server.crawl_manager.class_model.general_model import GeneralDataModel
from orion.api.server.crawl_manager.class_model.ip_scan_request_model import IPScanRequest
from orion.api.server.crawl_manager.class_model.leak_model import CardExtractionModel as LeakCardExtractionModel
from orion.api.server.crawl_manager.class_model.leak_model import LeakDataModel
from orion.api.server.crawl_manager.class_model.nlp_data_model import nlp_data_model
from orion.api.server.nexus_manager.model.nexus_chat_model import ReportChatRequest
from orion.api.server.crawl_manager.class_model.social_model import social_data_model, social_model
from orion.api.server.crawl_manager.class_model.social_scrape_request_model import SocialScrapeRequest
from orion.api.server.crawl_manager.crawl_index_generator import crawl_index_generator
from orion.api.server.crawl_manager.crawl_model import crawl_model
from orion.constants.constant import CONSTANTS
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX, ELASTIC_KEYS
from tests.cases.fake_model.fakes import FakeAsyncClient, FakeBloom, FakeDoc, FakeElastic, FakeMongoEngine, FakeResponse


def _run(coro):
    return asyncio.run(coro)


class _RoutingEngine:
    def __init__(self, mapping: dict[tuple[str, str], list[FakeDoc]]):
        self.mapping = mapping

    async def find(self, _model, query):
        rule_key = query.get("rule_key", "")
        if "entry_kind" in query:
            return self.mapping.get(("disabled", ""), [])
        return list(self.mapping.get((rule_key, json.dumps(query, sort_keys=True)), []))


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [],
            "query_string": b"",
            "client": ("127.0.0.1", 1234),
            "server": ("testserver", 80),
            "scheme": "http",
        }
    )


def _json_request(payload: dict) -> Request:
    body = json.dumps(payload).encode("utf-8")

    async def _receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"content-type", b"application/json")],
            "query_string": b"",
            "client": ("127.0.0.1", 1234),
            "server": ("testserver", 80),
            "scheme": "http",
        },
        receive=_receive,
    )


def test_swarm_url_helpers_and_proxy_resolution(monkeypatch):
    assert crawl_model._normalize_swarm_route_url(None) is None
    assert crawl_model._normalize_swarm_route_url("   ") is None
    assert crawl_model._normalize_swarm_route_url("ftp://example.com") is None
    assert crawl_model._normalize_swarm_route_url("HTTPS://Example.COM/path/?a=1#frag") == "https://example.com/path"
    assert crawl_model._extract_swarm_route_url({"m_url": "", "m_base_url": "https://base.example"}) == "https://base.example"
    assert crawl_model._extract_swarm_route_url({"url": "https://fallback.example"}) == "https://fallback.example"

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: '["https://one.example/", "https://two.example"]')),
    )
    monkeypatch.setattr("orion.api.server.crawl_manager.crawl_model.secrets.choice", lambda seq: seq[-1])

    assert crawl_model._get_swarm_proxy_url(_request()) == "https://two.example/user-dumps"

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.env_handler.get_instance",
        staticmethod(lambda: SimpleNamespace(env=lambda *_args: "")),
    )
    with pytest.raises(ValueError):
        crawl_model._get_swarm_proxy_url(_request())


def test_update_or_create_model_updates_existing_and_creates_new_records(monkeypatch):
    existing = FakeDoc(
        url="https://example.com",
        content_type=["leaks"],
        index_type=["leak"],
        name="old",
        leak_model_last_update=None,
        geneic_model_last_update=None,
    )
    engine = FakeMongoEngine(records=[existing])
    manager = object.__new__(crawl_model)
    manager._engine = engine

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.helper_controller.get_base_url",
        staticmethod(lambda _url: "https://example.com/"),
    )

    response = _run(
        manager._update_or_create_model(
            base_url="https://example.com/page",
            new_content_type=["news"],
            new_index_type=["general"],
            network_type="web",
            is_leak_update=False,
            name="updated",
        )
    )

    assert response.status_code == 200
    assert set(existing.content_type) == {"leaks", "news"}
    assert set(existing.index_type) == {"leak", "general"}
    assert existing.name == "updated"
    assert existing.geneic_model_last_update is not None

    new_engine = FakeMongoEngine()
    new_manager = object.__new__(crawl_model)
    new_manager._engine = new_engine

    _run(
        new_manager._update_or_create_model(
            base_url="https://twitter.com/acme/status/1",
            new_content_type=[],
            new_index_type=["social"],
            network_type="twitter",
            is_leak_update=True,
            name=None,
        )
    )

    created = new_engine.saved[0]
    assert created.url == "https://twitter.com/acme/status/1"
    assert created.content_type == ["general"]
    assert created.index_type == ["social"]
    assert created.leak_model_last_update is not None


def test_http_wrappers_post_expected_payloads_and_handle_errors(monkeypatch):
    calls = []
    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.httpx.AsyncClient",
        lambda *args, **kwargs: FakeAsyncClient(response=FakeResponse(json_data={"ok": True}), calls=calls),
    )

    model = nlp_data_model(data=["hello"])
    assert _run(crawl_model.make_cti_request("ioc")) == {"ok": True}
    assert _run(crawl_model.parse_chat(model)) == {"ok": True}
    assert _run(crawl_model.parse_summarize_ai(model)) == {"ok": True}
    assert _run(crawl_model.parse_chat_ai(ReportChatRequest(session_id="s1", message="msg", report="rep"), "842")) == {"ok": True}

    assert calls[0] == {
        "url": "http://localhost:8000/cti_classifier/classify",
        "json": {"text": "ioc"},
        "timeout": None,
    }
    assert calls[1]["url"].endswith("/nlp/parse")
    assert calls[3]["url"].endswith("/nlp/chat/report/842")

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.httpx.AsyncClient",
        lambda *args, **kwargs: FakeAsyncClient(exc=RuntimeError("down")),
    )

    assert _run(crawl_model.parse_chat(model)) == {"error": "Failed to parse chat"}
    failed = _run(crawl_model.parse_summarize_ai(model))
    assert failed.status_code == 500
    assert json.loads(failed.body) == {
        "detail": "Something happened while calling nlp/summarize/ai"
    }
    assert _run(crawl_model.parse_chat_ai(ReportChatRequest(session_id="s1", message="msg", report="rep"))) == {"error": "Failed to generate chat report"}


@pytest.mark.parametrize(
    ("method_name", "path", "detail"),
    [
        ("scan_domain", "/urlscan/domain/user-1", "Something happened while calling urlscan/domain"),
        ("scan_ip", "/urlscan/ip/user-1", "Something happened while calling urlscan/ip"),
        ("scrape_social", "/social/scrape/user-1", "Something happened while calling social/scrape"),
        ("ioc_extract", "/ioc/extract/user-1", "Something happened while calling /ioc/extract"),
    ],
)
def test_scan_wrappers_cover_success_non_200_and_exception(monkeypatch, method_name, path, detail):
    calls = []
    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.httpx.AsyncClient",
        lambda *args, **kwargs: FakeAsyncClient(response=FakeResponse(status_code=200, json_data={"value": 1}), calls=calls),
    )
    method = getattr(crawl_model, method_name)
    payload = (
        DomainScanRequest(domain="example.com", scanType="basic")
        if method_name == "scan_domain"
        else IPScanRequest(ip="8.8.8.8")
        if method_name == "scan_ip"
        else SocialScrapeRequest(usernames=["alice"], platform="x", max_followers=10, max_following=10)
        if method_name == "scrape_social"
        else nlp_data_model(data=["indicator"])
    )

    assert _run(method(payload, user_id="user-1")) == {"value": 1}
    assert calls[0]["url"].endswith(path)
    assert calls[0]["timeout"] == 120

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.httpx.AsyncClient",
        lambda *args, **kwargs: FakeAsyncClient(response=FakeResponse(status_code=418)),
    )
    non_200 = _run(method(payload, user_id="user-1"))
    assert non_200.status_code == 418
    assert json.loads(non_200.body) == {"detail": detail}

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.httpx.AsyncClient",
        lambda *args, **kwargs: FakeAsyncClient(exc=RuntimeError("down")),
    )
    failed = _run(method(payload, user_id="user-1"))
    assert failed.status_code == 500
    assert json.loads(failed.body) == {"detail": detail}


def test_index_wrappers_cover_generator_and_elastic_paths(monkeypatch):
    fake_elastic = FakeElastic()
    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.elastic_controller.get_instance",
        staticmethod(lambda: fake_elastic),
    )

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.crawl_index_generator",
        SimpleNamespace(
            index_query_stealerlog=lambda payload: [] if payload.get("empty") else [{"type": "stealer"}],
            index_query_sanctions=lambda payload: payload.get("records", []),
            index_query_social=lambda payload: [{"type": "social", "payload": payload}],
            index_query_chat=lambda payload: [{"type": "chat", "payload": payload}],
            index_query_general=lambda payload: [{"type": "general", "payload": payload}],
            index_query_exploit=lambda payload: [{"type": "exploit", "payload": payload}],
                index_query_leak=lambda payload, **_: [{"type": "leak", "payload": payload}],
            index_query_defacement=lambda payload: [{"type": "defacement", "payload": payload}],
        ),
    )

    empty = _run(
        crawl_model.invoke_stealerlog_index(cast(Any, SimpleNamespace(model_dump=lambda: {"empty": True})))
    )
    success = _run(
        crawl_model.invoke_stealerlog_index(cast(Any, SimpleNamespace(model_dump=lambda: {"empty": False})))
    )

    manager = object.__new__(crawl_model)
    updates = []

    async def _fake_update(**kwargs):
        updates.append(kwargs)
        return kwargs

    manager._update_or_create_model = _fake_update

    no_sanctions = _run(manager.invoke_sanctions_index({"records": []}))
    yes_sanctions = _run(
        manager.invoke_sanctions_index(
            {"records": [{"id": "s1"}, {"id": "s2"}]}
        )
    )
    social = _run(
        manager.invoke_social_index(
            social_data_model(
                seed_url="https://acme.com",
                m_network="surface",
                cards_data=[
                    social_model(
                        m_message_sharable_link="https://pastebin.com/raw/abc",
                        m_content="post",
                        m_platform=["pastebin"],
                        m_network="surface",
                    )
                ],
            )
        )
    )
    _run(manager.invoke_chat_index(chat_data_model(m_source_channel_url="https://t.me/acme", m_channel_name="acme", m_network="telegram")))
    _run(
        manager.invoke_generic_index(
            GeneralDataModel(
                m_base_url="https://acme.com",
                m_url="https://acme.com/page",
                m_network="surface",
                m_title="Acme",
                m_meta_description="desc",
                m_content="content",
                m_important_content="important",
                m_images=[],
                m_sub_url=[],
                m_document=[],
                m_video=[],
                m_archive_url=[],
                m_validity_score=1,
                m_meta_keywords="k",
                m_content_type=["general"],
                m_clearnet_links=[],
            )
        )
    )
    _run(
        manager.invoke_exploit_index(
            ExploitDataModel(
                base_url="https://forum.example/thread",
                m_network="forum",
                cards_data=[ExploitCardExtractionModel(m_url="https://forum.example/thread")],
            )
        )
    )
    _run(
        manager.init_stealerlogs(
            LeakDataModel(
                base_url="https://leak.example",
                m_network="surface",
                cards_data=[LeakCardExtractionModel(m_url="https://leak.example")],
            )
        )
    )
    _run(
        manager.invoke_leak_index(
            LeakDataModel(
                base_url="https://leak.example",
                m_network="surface",
                cards_data=[LeakCardExtractionModel(m_url="https://leak.example")],
            )
        )
    )
    _run(
        manager.invoke_news_index(
            LeakDataModel(
                base_url="https://news.example",
                m_network="surface",
                cards_data=[LeakCardExtractionModel(m_url="https://news.example")],
            )
        )
    )
    _run(
        manager.invoke_tracking_index(
            LeakDataModel(
                base_url="https://tracking.example",
                m_network="surface",
                cards_data=[LeakCardExtractionModel(m_url="https://tracking.example")],
            )
        )
    )
    _run(
        manager.invoke_defacement_index(
            DefacementDataModel(
                base_url="https://defaced.example",
                m_network="surface",
                cards_data=[DefacementCardExtractionModel(m_url="https://defaced.example")],
            )
        )
    )

    assert empty == {"parsed": "empty unqiue"}
    assert success == {"parsed": "true"}
    assert no_sanctions == {"message": "no valid sanctions records to index"}
    assert yes_sanctions == {"message": "sanctions indexed successfully", "indexed": 2}
    assert social["new_content_type"] == ["social"]
    assert fake_elastic.dump_index_calls == [[{"type": "stealer"}]]
    assert fake_elastic.index_calls[0][1] is True
    assert fake_elastic.index_calls[1][1] is True
    assert any(
        isinstance(payload, list) and payload and payload[0].get("type") == "chat"
        for payload, _bypass in fake_elastic.index_calls
    )
    assert any(update["new_index_type"] == ["chat"] for update in updates)
    assert any(update["new_content_type"] == ["defacement"] for update in updates)


def test_build_feeder_file_content_handles_shared_and_direct_rules(monkeypatch):
    shared_query = json.dumps({"feeder.index_status": True, "rule_key": "shared-rule"}, sort_keys=True)
    direct_query = json.dumps(
        {"feeder.index_status": True, "rule_key": "direct-rule", "url": {"$ne": None}},
        sort_keys=True,
    )
    engine = _RoutingEngine(
        {
            ("shared-rule", shared_query): [FakeDoc(values=[{"url": "https://one.example"}, {"url": None}])],
            ("direct-rule", direct_query): [FakeDoc(url="https://two.example", name="feed.py"), FakeDoc(url=None, name="skip.py")],
        }
    )
    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.mongo_controller.get_instance",
        staticmethod(lambda: SimpleNamespace(get_engine=lambda: engine)),
    )

    manager = object.__new__(crawl_model)
    shared = _run(manager._build_feeder_file_content("shared-rule", "shared")).decode()
    direct = _run(manager._build_feeder_file_content("direct-rule", "tenant")).decode()

    assert shared == '{"url": "https://one.example", "file": "_shared-rule"}\n'
    assert direct == '{"url": "https://two.example", "file": "feed"}\n'


def test_build_parser_payload_decrypts_files_and_embeds_feeders(monkeypatch, tmp_path: Path):
    parser_root = tmp_path / "parser_files"
    parser_root.mkdir()
    (parser_root / "plain.py").write_bytes(b"print('plain')")
    monkeypatch.setattr(CONSTANTS, "S_ENCRYPTION_KEY", Fernet.generate_key().decode())
    encrypted = Fernet(CONSTANTS.S_ENCRYPTION_KEY.encode()).encrypt(b"secret = 1")
    (parser_root / "secret.py").write_bytes(encrypted)
    (parser_root / "disabled.py").write_text("skip", encoding="utf-8")

    manager = object.__new__(crawl_model)
    manager._engine = SimpleNamespace(find=lambda *_args, **_kwargs: asyncio.sleep(0, result=[FakeDoc(name="disabled.py")]))
    monkeypatch.setattr(
        manager,
        "_build_feeder_file_content",
        lambda rule_key, _rule_type: asyncio.sleep(0, result=f"{rule_key}\n".encode()),
    )
    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.constant.url_rules",
        {"alpha": {"rule_type": "shared"}, "beta": {"rule_type": "tenant"}},
    )

    payload = _run(manager._build_parser_payload(parser_root))
    archive = ZipFile(BytesIO(payload))

    assert set(archive.namelist()) == {"plain.py", "secret.py", "feeder/crawl_data_alpha.txt", "feeder/crawl_data_beta.txt"}
    assert archive.read("plain.py") == b"print('plain')"
    assert archive.read("secret.py") == b"secret = 1"
    assert archive.read("feeder/crawl_data_alpha.txt") == b"alpha\n"


def test_index_query_stealerlog_encrypts_password(monkeypatch):
    key = Fernet.generate_key().decode()
    monkeypatch.setattr(CONSTANTS, "S_ENCRYPTION_KEY", key)

    result = crawl_index_generator.index_query_stealerlog(
        {
            "logs": [
                {
                    "m_hash": "hash-1",
                    "username": "alice",
                    "password": "secret-password",
                    "file": None,
                }
            ]
        }
    )

    doc = result[1]
    assert doc["username"] == "alice"
    assert "file" not in doc
    assert doc["password"] != "secret-password"
    assert Fernet(key.encode()).decrypt(doc["password"].encode()).decode() == "secret-password"


def test_fetch_file_helpers_and_decrypt_error_paths(monkeypatch, tmp_path: Path):
    screenshot_dir = tmp_path / "shots"
    screenshot_dir.mkdir()
    monkeypatch.setattr("orion.api.server.crawl_manager.crawl_model.CRAWL_PATHS.M_SCREENSHOT", str(screenshot_dir))

    saved = _run(
        crawl_model.invoke_file_upload(
            ScreenshotPayload(filename="shot.webp", data=base64.b64encode(b"img").decode())
        )
    )
    fetched = _run(crawl_model.get_screenshot_file("shot.webp"))
    missing = _run(crawl_model.get_screenshot_file("missing.webp"))

    assert saved["filename"] == "shot.webp"
    assert fetched.filename == "shot.webp"
    assert missing == {"error": "File not found"}

    parser_root = tmp_path / "parser"
    parser_root.mkdir()
    source_path = parser_root / "secret.py"
    source_path.write_bytes(b"gAAAAAbad")
    manager = object.__new__(crawl_model)

    with pytest.raises(HTTPException) as exc_info:
        manager._decrypt_parser_file(parser_root, source_path, b"gAAAAAbad")

    assert exc_info.value.status_code == 500
    assert "secret.py" in exc_info.value.detail


def test_fetch_parser_and_feeder_responses_cover_missing_and_success(monkeypatch, tmp_path: Path):
    parser_zip = tmp_path / "parser_files.zip"
    parser_zip.write_bytes(b"zip")
    parser_root = tmp_path / "parser_files"
    parser_root.mkdir()

    instance = object.__new__(crawl_model)
    monkeypatch.setattr(
        instance,
        "_build_parser_payload",
        lambda _root: asyncio.sleep(0, result=b"parser-zip"),
    )
    monkeypatch.setattr(
        instance,
        "_build_feeder_file_content",
        lambda key, rule_type: asyncio.sleep(0, result=f"{key}:{rule_type}".encode()),
    )
    monkeypatch.setattr("orion.api.server.crawl_manager.crawl_model.crawl_model.getInstance", staticmethod(lambda: instance))
    monkeypatch.setattr("orion.api.server.crawl_manager.crawl_model.CRAWL_PATHS.M_PARSER_FILE_PATH", str(parser_zip))
    monkeypatch.setattr("orion.api.server.crawl_manager.crawl_model.constant.url_rules", {"alpha": {"rule_type": "shared"}})

    parser_response = _run(crawl_model.invoke_fetch_parser())
    feeder_response = _run(crawl_model.invoke_fetch_feeder("alpha"))
    missing_feeder = _run(crawl_model.invoke_fetch_feeder("missing"))

    assert parser_response.status_code == 200
    assert parser_response.body == b"parser-zip"
    assert feeder_response.body == b"alpha:shared"
    assert missing_feeder.status_code == 404

    parser_root.rmdir()
    missing_parser = _run(crawl_model.invoke_fetch_parser())
    assert missing_parser.status_code == 404


def test_index_log_record_cover_success():
    engine = FakeMongoEngine()
    manager = object.__new__(crawl_model)
    manager._engine = engine

    response = _run(manager.index_log_record(cast(Any, SimpleNamespace(logs=["alpha", "beta"]))))
    assert response.status_code == 200
    assert len(engine.saved) == 2
    first = engine.saved[0][ELASTIC_KEYS.S_VALUE]
    assert engine.saved[0][ELASTIC_KEYS.S_DOCUMENT] == ELASTIC_INDEX.S_STEALERLOGS_INDEX
    assert first["log_hash"] == hashlib.sha256("alpha".encode("utf-8")).hexdigest()


def test_fetch_cti_label_and_proxy_swarm_index_cover_forwarding_and_dedup(monkeypatch):
    posted = {}

    class _ReqResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"result": "malware"}

    monkeypatch.setattr(
        "orion.api.server.crawl_manager.crawl_model.requests.post",
        lambda url, **kwargs: posted.update({"url": url, "json": kwargs.get("json")}) or _ReqResponse(),
    )

    assert _run(crawl_model.fetch_cti_label(CTITextRequest(data="indicator"))) == "malware"
    assert posted == {
        "url": "http://trusted-micros-api:8010/cti_classifier/classify",
        "json": {"data": "indicator"},
    }

    manager = object.__new__(crawl_model)
    bloom = FakeBloom()
    scheduled = []

    async def _fake_post(target_url, payload):
        scheduled.append((target_url, payload))

    def _fake_create_task(coro):
        scheduled.append(("scheduled", coro.cr_code.co_name))
        coro.close()
        return None

    monkeypatch.setattr("orion.api.server.crawl_manager.crawl_model.crawl_model._crawl_model__swarm_bloom", bloom)
    monkeypatch.setattr(manager, "_post_swarm_payload", _fake_post)
    monkeypatch.setattr(manager, "_get_swarm_proxy_url", lambda _request: "https://swarm.example/user-dumps")
    monkeypatch.setattr("orion.api.server.crawl_manager.crawl_model.asyncio.create_task", _fake_create_task)

    accepted = _run(manager.proxy_swarm_index(_json_request({"m_url": "HTTPS://Example.COM/path/"})))
    duplicate = _run(manager.proxy_swarm_index(_json_request({"m_url": "https://example.com/path"})))

    assert accepted.status_code == 202
    assert json.loads(accepted.body) == {"status": "accepted"}
    assert duplicate.status_code == 200
    assert json.loads(duplicate.body) == {"status": "duplicate_ignored"}
    assert bloom.values == {"https://example.com/path"}
    assert scheduled == [("scheduled", "_fake_post")]
