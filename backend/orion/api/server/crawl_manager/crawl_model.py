import base64
import binascii
import hashlib
import os
import asyncio
import json
import secrets
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse, urlunparse
from zipfile import ZIP_DEFLATED, ZipFile
from bloom_filter2 import BloomFilter
import httpx
import requests
from cryptography.fernet import Fernet
from fastapi import Request, HTTPException
from fastapi.responses import FileResponse, Response
from starlette.responses import JSONResponse
from orion.api.server.crawl_manager.class_model.apt_model import AptDataModel
from orion.api.server.crawl_manager.class_model.chat_model import chat_data_model
from orion.api.server.crawl_manager.class_model.defacement_model import DefacementDataModel
from orion.api.server.crawl_manager.class_model.exploit_model import ExploitDataModel
from orion.api.server.crawl_manager.class_model.file_model import ScreenshotPayload
from orion.api.server.crawl_manager.class_model.general_model import GeneralDataModel
from orion.api.server.crawl_manager.class_model.leak_model import LeakDataModel
from orion.api.server.crawl_manager.class_model.log_model import LogBatchModel
from orion.api.server.crawl_manager.class_model.malware_model import MalwareDataModel
from orion.api.server.crawl_manager.class_model.nlp_data_model import nlp_data_model
from orion.api.server.crawl_manager.class_model.social_model import social_data_model
from orion.api.server.crawl_manager.class_model.entity_model import entity_model
from orion.api.server.crawl_manager.crawl_enums import CRAWL_CALLBACK_RESPONSES, CRAWL_PATHS
from orion.api.server.entity_manager.entity_manager import entity_manager
from orion.helper_manager.helper_controller import helper_controller
from orion.helper_manager.env_handler import env_handler
from orion.services.log_manager.log_controller import log
from orion.api.server.crawl_manager.crawl_index_generator import crawl_index_generator
from orion.services.arango_manager.arango_controller import arango_controller
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.elastic_manager.elastic_enums import ELASTIC_KEYS, ELASTIC_INDEX
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_feeder_script_model import db_feeder_script_model
from orion.services.mongo_manager.shared_model.db_url_data_model import db_url_data_model
from orion.api.server.crawl_manager.class_model.CTITextRequest import CTITextRequest
from orion.constants.constant import CONSTANTS
from orion.constants import constant

SCREENSHOT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
SCREENSHOT_UPLOAD_MAX_BASE64_LENGTH = ((SCREENSHOT_UPLOAD_MAX_BYTES + 2) // 3) * 4


class crawl_model:
    __instance = None
    __swarm_bloom = None
    CTI_GRAPH_INDEX_CLUSTER_MAP = {
        ELASTIC_INDEX.S_GENERIC_INDEX: "general",
        ELASTIC_INDEX.S_LEAK_INDEX: "leak",
        ELASTIC_INDEX.S_DEFACEMENT_INDEX: "defacement",
        ELASTIC_INDEX.S_CHATS_INDEX: "chat",
        ELASTIC_INDEX.S_EXPLOIT_INDEX: "exploit",
        ELASTIC_INDEX.S_SOCIAL_INDEX: "social",
        ELASTIC_INDEX.S_APT_INDEX: "apt",
        ELASTIC_INDEX.S_MALWARE_INDEX: "malware",
    }
    LEAK_CONTENT_TYPE_CLUSTERS = ("tracking", "news", "leaks", "leak")

    @staticmethod
    def getInstance():
        instance = crawl_model.__instance
        if instance is None:
            instance = crawl_model()
        return instance

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()
        if crawl_model.__instance is not None:
            pass
        else:
            crawl_model.__instance = self

    async def _index_cti_data(self, m_data, bypass_empty_embedding=False):
        result = await elastic_controller.get_instance().index_data(m_data, bypass_empty_embedding)
        await self._pass_cti_graph_documents(m_data)
        return result

    async def _pass_cti_graph_documents(self, m_data):
        entries = m_data if isinstance(m_data, list) else [m_data]
        graph_entries = [
            entry for entry in entries
            if isinstance(entry, dict)
            and entry.get(ELASTIC_KEYS.S_DOCUMENT) in self.CTI_GRAPH_INDEX_CLUSTER_MAP
            and isinstance(entry.get(ELASTIC_KEYS.S_VALUE), dict)
        ]
        if not graph_entries:
            return

        try:
            arango = arango_controller.get_instance()
            if arango.get_db() is None:
                await arango.link_connection()
            if arango.get_graph() is None:
                await arango.initialize()
            if arango.get_db() is None or arango.get_graph() is None:
                log.g().w("Skipping CTI graph document pass because Arango graph is unavailable.")
                return
        except Exception as ex:
            log.g().w(f"Skipping CTI graph document pass because Arango is unavailable: {ex}")
            return

        manager = entity_manager.get_instance()
        for entry in graph_entries:
            index = entry[ELASTIC_KEYS.S_DOCUMENT]
            document = self._graph_document_from_index_entry(index, entry[ELASTIC_KEYS.S_VALUE])
            try:
                result = await manager.create_or_update_entity_nodes(entity_model(**document))
                if result.get("status") != "success":
                    log.g().w(f"Skipping CTI graph document pass for {index}/{document.get('m_document_id', '')}: {result.get('message')}")
            except Exception as ex:
                log.g().e(f"Skipping CTI graph document pass for {index}/{document.get('m_document_id', '')}: {ex}")

    def _graph_document_from_index_entry(self, index: str, document: dict):
        graph_document = dict(document)
        graph_document.pop("m_embedding", None)
        graph_document["m_cluster_id"] = self._cluster_for_graph_document(
            index,
            graph_document,
            self.CTI_GRAPH_INDEX_CLUSTER_MAP[index],
        )
        if not graph_document.get("m_document_id"):
            graph_document["m_document_id"] = (
                graph_document.get("m_hash")
                or graph_document.get("m_message_id")
                or graph_document.get("m_url")
                or graph_document.get("m_title")
            )
        return graph_document

    def _cluster_for_graph_document(self, index: str, document: dict, default_cluster_id: str) -> str:
        explicit_cluster = str(document.get("m_cluster_id") or "").strip().lower()
        if explicit_cluster in {"leak", "tracking", "news"}:
            return explicit_cluster

        if index != ELASTIC_INDEX.S_LEAK_INDEX:
            return default_cluster_id

        raw_content_type = document.get("m_content_type") or document.get("content_type") or []
        content_types = raw_content_type if isinstance(raw_content_type, list) else [raw_content_type]
        normalized_types = {str(item).strip().lower() for item in content_types if item not in (None, "", [], {})}

        for content_type in self.LEAK_CONTENT_TYPE_CLUSTERS:
            if content_type in normalized_types:
                return "leak" if content_type == "leaks" else content_type

        return default_cluster_id

    @staticmethod
    def _normalize_swarm_route_url(raw_url: str | None) -> str | None:
        if raw_url is None:
            return None

        text: str = raw_url.strip()
        if not text:
            return None

        parsed = urlparse(text)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return None

        normalized = parsed._replace(
            scheme=parsed.scheme.lower(),
            netloc=parsed.netloc.lower(),
            params="",
            query="",
            fragment="",
        )
        normalized_url = str(urlunparse(normalized))
        return normalized_url.rstrip("/")

    @staticmethod
    def _extract_swarm_route_url(payload: dict) -> str | None:
        for key in ("m_url", "m_base_url", "url"):
            value = payload.get(key) or ""
            if value.strip():
                return value
        return None

    @classmethod
    def _get_swarm_bloom(cls) -> BloomFilter:
        if cls.__swarm_bloom is None:
            bloom_dir = env_handler.get_instance().env("BLOOM_DIR") or str(Path.cwd() / ".bloom")
            os.makedirs(bloom_dir, exist_ok=True)
            cls.__swarm_bloom = BloomFilter(
                max_elements=10_000_000,
                error_rate=0.01,
                filename=os.path.join(bloom_dir, "swarm_routes.bloom"),
            )
        return cls.__swarm_bloom

    async def _update_or_create_model(self,
            base_url: str,
            new_content_type: list,
            new_index_type: list,
            network_type: str,
            is_leak_update: bool,
            name: str = None):
        raw_base_url = base_url or ""
        normalized_url = raw_base_url
        if network_type != "telegram":
            normalized_url = helper_controller.get_base_url(raw_base_url).rstrip('/')

        if any(token in raw_base_url for token in ("twitter", "reddit", "forum")):
            normalized_url = raw_base_url

        general_model = await self._engine.find_one(db_url_data_model, db_url_data_model.url == normalized_url)
        if not new_content_type:
            new_content_type = ["general"]

        if general_model:
            general_model.content_type = list(set((general_model.content_type or []) + new_content_type))
            general_model.index_type = list(set((general_model.index_type or []) + new_index_type))
            if name:
                general_model.name = name
            if is_leak_update:
                general_model.leak_model_last_update = datetime.now(timezone.utc)
            else:
                general_model.geneic_model_last_update = datetime.now(timezone.utc)
        else:
            general_model = db_url_data_model(
                url=normalized_url,
                content_type=list(set(new_content_type)),
                index_type=list(set(new_index_type)),
                network_type=network_type,
                name=name,
                leak_model_last_update=datetime.now(timezone.utc) if is_leak_update else None,
                geneic_model_last_update=datetime.now(timezone.utc) if not is_leak_update else None)

        await self._engine.save(general_model)
        return JSONResponse(content={"message": CRAWL_CALLBACK_RESPONSES.M_WEBSITE_INDEXED}, status_code=200)

    @staticmethod
    async def make_cti_request(text: str):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/cti_classifier/classify", json={"text": text})
            return response.json()

    @staticmethod
    async def parse_chat(model: nlp_data_model):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://trusted-micros-api:8010/nlp/parse", json={"data": model.data}, timeout=10)
                return response.json()
        except Exception:
            return {"error": "Failed to parse chat"}

    @staticmethod
    async def parse_summarize_ai(model: nlp_data_model, user_id: str = "system"):
        try:
            base_url = (env_handler.get_instance().env("DARKNEXUS_API_BASE") or "http://trusted-nexus-api:8030").strip().rstrip("/")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/nlp/summarize/ai/{user_id}", json={"data": model.data}, timeout=120)
                if response.status_code != 200:
                    return JSONResponse(
                        status_code=response.status_code,
                        content={"detail": "Something happened while calling nlp/summarize/ai"})
                return response.json()
        except Exception:
            return JSONResponse(
                status_code=500, content={"detail": "Something happened while calling nlp/summarize/ai"})

    @staticmethod
    async def scan_domain(model, user_id: str = "system"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"http://trusted-micros-api:8010/urlscan/domain/{user_id}", json=model.model_dump(), timeout=120)
                if response.status_code != 200:
                    return JSONResponse(
                        status_code=response.status_code,
                        content={"detail": "Something happened while calling urlscan/domain"})
                return response.json()
        except Exception:
            return JSONResponse(
                status_code=500, content={"detail": "Something happened while calling urlscan/domain"})

    @staticmethod
    async def scan_ip(model, user_id: str = "system"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"http://trusted-micros-api:8010/urlscan/ip/{user_id}",
                    json=model.model_dump(),
                    timeout=120
                )

                if response.status_code != 200:
                    return JSONResponse(
                        status_code=response.status_code,
                        content={"detail": "Something happened while calling urlscan/ip"}
                    )

                return response.json()

        except Exception:
            return JSONResponse(
                status_code=500,
                content={"detail": "Something happened while calling urlscan/ip"}
            )

    @staticmethod
    async def scrape_social(model, user_id: str = "system"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"http://trusted-micros-api:8010/social/scrape/{user_id}", json=model.model_dump(), timeout=120)
                if response.status_code != 200:
                    return JSONResponse(
                        status_code=response.status_code,
                        content={"detail": "Something happened while calling social/scrape"})
                return response.json()
        except Exception:
            return JSONResponse(
                status_code=500, content={"detail": "Something happened while calling social/scrape"})

    @staticmethod
    async def ioc_extract(model, user_id: str = "system"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"http://trusted-micros-api:8010/ioc/extract/{user_id}", json=model.model_dump(), timeout=120)
                if response.status_code != 200:
                    return JSONResponse(
                        status_code=response.status_code,
                        content={"detail": "Something happened while calling /ioc/extract"})
                return response.json()
        except Exception:
            return JSONResponse(
                status_code=500, content={"detail": "Something happened while calling /ioc/extract"})

    @staticmethod
    async def parse_chat_ai(model, user_id: str = "system"):
        try:
            base_url = (env_handler.get_instance().env("DARKNEXUS_API_BASE") or "http://trusted-nexus-api:8030").strip().rstrip("/")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/nlp/chat/report/{user_id}", json=model.model_dump(), timeout=120)
                response.raise_for_status()
                return response.json()
        except Exception:
            return {"error": "Failed to generate chat report"}

    @staticmethod
    async def invoke_stealerlog_index(credential_index: LogBatchModel):
        m_data = crawl_index_generator.index_query_stealerlog(credential_index.model_dump())

        if not m_data:
            return {"parsed": "empty unqiue"}

        await elastic_controller.get_instance().index_dump(m_data)
        return {"parsed": "true"}

    async def invoke_social_index(self, social_index: social_data_model):

        platforms = social_index.cards_data[0].m_platform if social_index.cards_data else []
        m_bybass_embedding = any(str(platform).strip().lower() == "pastebin" for platform in platforms)
        m_data = crawl_index_generator.index_query_social(social_index.model_dump())
        await self._index_cti_data(m_data, m_bybass_embedding)

        return await self._update_or_create_model(
            base_url=social_index.seed_url,
            new_content_type=["social"],
            name=social_index.seed_url,
            new_index_type=[helper_controller.get_base_url(social_index.seed_url).replace("https://", "").replace(
                ".com",
                "").rstrip('/')],
            network_type=social_index.m_network,
            is_leak_update=False)

    async def invoke_sanctions_index(self, sanctions_index):
        if hasattr(sanctions_index, "model_dump"):
            payload = sanctions_index.model_dump(by_alias=True)
        else:
            payload = sanctions_index

        m_data = crawl_index_generator.index_query_sanctions(payload)
        if not m_data:
            return {"message": "no valid sanctions records to index"}

        await elastic_controller.get_instance().index_data(m_data, bypass_empty_embedding=True)
        return {"message": "sanctions indexed successfully", "indexed": len(m_data)}

    async def invoke_chat_index(self, chat_index: chat_data_model):
        m_data = crawl_index_generator.index_query_chat(chat_index.model_dump())
        await self._index_cti_data(m_data)

        return await self._update_or_create_model(
            base_url=chat_index.m_source_channel_url,
            new_content_type=["channel"],
            name=chat_index.m_channel_name,
            new_index_type=["chat"],
            network_type=chat_index.m_network,
            is_leak_update=False)

    async def invoke_generic_index(self, general_index: GeneralDataModel):
        m_data = crawl_index_generator.index_query_general(general_index.model_dump())
        await self._index_cti_data(m_data)
        return await self._update_or_create_model(
            base_url=general_index.m_base_url,
            new_content_type=general_index.m_content_type,
            new_index_type=['general'],
            network_type=general_index.m_network,
            is_leak_update=False)

    async def invoke_exploit_index(self, exploit_index: ExploitDataModel):
        m_data = crawl_index_generator.index_query_exploit(exploit_index.model_dump())
        await self._index_cti_data(m_data)
        return await self._update_or_create_model(
            base_url=exploit_index.base_url,
            new_content_type=['exploit'],
            new_index_type=['exploit'],
            network_type=exploit_index.m_network,
            is_leak_update=True)

    async def invoke_apt_index(self, apt_index: AptDataModel):
        m_data = crawl_index_generator.index_query_apt(apt_index.model_dump())
        await self._index_cti_data(m_data)
        return await self._update_or_create_model(
            base_url=apt_index.base_url,
            new_content_type=['apt'],
            new_index_type=['apt'],
            network_type="surface",
            is_leak_update=True)

    async def invoke_malware_index(self, malware_index: MalwareDataModel):
        m_data = crawl_index_generator.index_query_malware(malware_index.model_dump())
        if not m_data:
            return {"message": "no valid malware records to index"}
        await self._index_cti_data(m_data, bypass_empty_embedding=True)
        return {"message": "malware indexed successfully", "indexed": len(m_data)}

    async def init_stealerlogs(self, leak_index: LeakDataModel):
        m_data = crawl_index_generator.index_query_stealerlog(leak_index.model_dump())
        await elastic_controller.get_instance().index_data(m_data)
        return await self._update_or_create_model(
            base_url=leak_index.base_url,
            new_content_type=['stealer'],
            new_index_type=['stealer'],
            network_type=leak_index.m_network,
            is_leak_update=True)

    async def invoke_leak_index(self, leak_index: LeakDataModel):
        m_data = crawl_index_generator.index_query_leak(
            leak_index.model_dump(),
            cluster_id="leak",
            default_content_type=["leaks"],
        )
        await self._index_cti_data(m_data)
        return await self._update_or_create_model(
            base_url=leak_index.base_url,
            new_content_type=['leaks'],
            new_index_type=['leak'],
            network_type=leak_index.m_network,
            is_leak_update=True)

    async def invoke_news_index(self, leak_index: LeakDataModel):
        m_data = crawl_index_generator.index_query_leak(
            leak_index.model_dump(),
            cluster_id="news",
            default_content_type=["news"],
        )
        await self._index_cti_data(m_data)
        return await self._update_or_create_model(
            base_url=leak_index.base_url,
            new_content_type=['news'],
            new_index_type=['leak'],
            network_type=leak_index.m_network,
            is_leak_update=True)

    async def invoke_tracking_index(self, leak_index: LeakDataModel):
        m_data = crawl_index_generator.index_query_leak(
            leak_index.model_dump(),
            cluster_id="tracking",
            default_content_type=["tracking"],
        )
        await self._index_cti_data(m_data)
        return await self._update_or_create_model(
            base_url=leak_index.base_url,
            new_content_type=['tracking'],
            new_index_type=['leak'],
            network_type=leak_index.m_network,
            is_leak_update=True)

    async def invoke_defacement_index(self, defacement_index: DefacementDataModel):
        m_data = crawl_index_generator.index_query_defacement(defacement_index.model_dump())
        await self._index_cti_data(m_data, True)
        return await self._update_or_create_model(
            base_url=defacement_index.base_url,
            new_content_type=['defacement'],
            new_index_type=['defacement'],
            network_type=defacement_index.m_network,
            is_leak_update=True)

    @staticmethod
    async def invoke_fetch_parser():
        parser_root = Path(CRAWL_PATHS.M_PARSER_FILE_PATH).with_name("parser_files")
        if not parser_root.exists():
            return JSONResponse(content={"detail": "File not found"}, status_code=404)
        payload = await crawl_model.getInstance()._build_parser_payload(parser_root)
        return Response(
            content=payload,
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="parser_files.zip"'},
        )

    @staticmethod
    async def invoke_fetch_feeder(index_type):
        rule = constant.url_rules.get(index_type)
        if not rule:
            return JSONResponse(content={"detail": "File not found"}, status_code=404)
        payload = await crawl_model.getInstance()._build_feeder_file_content(index_type, str(rule.get("rule_type") or ""))
        return Response(
            content=payload,
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="crawl_data_{index_type}.txt"'},
        )

    @staticmethod
    def _is_valid_screenshot_filename(filename: str) -> bool:
        allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-"
        return (
            bool(filename)
            and filename.endswith(".webp")
            and filename != ".webp"
            and Path(filename).name == filename
            and all(char in allowed for char in filename)
        )

    @staticmethod
    async def get_screenshot_file(filename: str):
        try:
            if not crawl_model._is_valid_screenshot_filename(filename):
                return {"error": "File not found"}
            screenshot_root = Path(CRAWL_PATHS.M_SCREENSHOT)
            requested_path = next((path for path in screenshot_root.iterdir() if path.name == filename and path.is_file()), None)

            if not requested_path:
                return {"error": "File not found"}
            return FileResponse(path=requested_path, filename=filename, media_type="image/webp")
        except Exception:
            return {"error": "Failed to retrieve screenshot"}

    @staticmethod
    async def invoke_file_upload(payload: ScreenshotPayload):
        try:
            filename = os.path.basename(payload.filename)
            if filename != payload.filename or not crawl_model._is_valid_screenshot_filename(filename):
                return {"error": "Failed to save screenshot"}
            screenshot_root = os.path.realpath(CRAWL_PATHS.M_SCREENSHOT)
            os.makedirs(screenshot_root, exist_ok=True)
            file_path = os.path.realpath(os.path.join(screenshot_root, filename))
            if not file_path.startswith(f"{screenshot_root}{os.sep}"):
                return {"error": "Failed to save screenshot"}
            encoded_data = (payload.data or "").strip()
            if encoded_data.startswith("data:") and "," in encoded_data:
                encoded_data = encoded_data.split(",", 1)[1]
            if len(encoded_data) > SCREENSHOT_UPLOAD_MAX_BASE64_LENGTH:
                raise HTTPException(status_code=413, detail="Screenshot too large! Maximum allowed size is 10 MB.")
            try:
                decoded_data = base64.b64decode(encoded_data, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise HTTPException(status_code=400, detail="Invalid screenshot data") from exc
            if len(decoded_data) > SCREENSHOT_UPLOAD_MAX_BYTES:
                raise HTTPException(status_code=413, detail="Screenshot too large! Maximum allowed size is 10 MB.")
            with open(file_path, "wb") as f:
                f.write(decoded_data)
            return {"message": f"Screenshot saved successfully at {file_path}", "filename": filename}
        except HTTPException:
            raise
        except Exception:
            return {"error": "Failed to save screenshot"}

    def _decrypt_parser_file(self, parser_root: Path, source_path: Path, raw: bytes) -> bytes:
        if not raw.startswith(b"gAAAAA"):
            return raw

        try:
            decrypted = Fernet(CONSTANTS.S_ENCRYPTION_KEY.encode()).decrypt(raw)
        except Exception as exc:
            relative_path = source_path.relative_to(parser_root).as_posix()
            raise HTTPException(status_code=500, detail=f"Unable to decrypt parser file: {relative_path}") from exc

        return decrypted

    async def _build_feeder_file_content(self, rule_key: str, rule_type: str) -> bytes:
        engine = mongo_controller.get_instance().get_engine()
        entries: list[dict] = []
        if rule_type in {"shared", "generic"}:
            records = await engine.find(
                db_feeder_script_model,
                {
                    "rule_key": rule_key,
                    "feeder.index_status": True,
                },
            )
            for record in records:
                for value in (record.values or []):
                    url = value.get("url")
                    if not url:
                        continue
                    entries.append({
                        "url": url,
                        "file": f"_{rule_key}" if rule_type == "shared" else None,
                    })
        else:
            records = await engine.find(
                db_feeder_script_model,
                {
                    "rule_key": rule_key,
                    "url": {"$ne": None},
                    "feeder.index_status": True,
                },
            )
            for record in records:
                if not record.url:
                    continue
                entries.append({"url": record.url, "file": Path(record.name).stem})

        payload = "\n".join(json.dumps(entry, ensure_ascii=True) for entry in entries)
        return (f"{payload}\n" if payload else "").encode("utf-8")

    async def _build_parser_payload(self, parser_root: Path) -> bytes:
        disabled_script_names = {
            record.name
            for record in await self._engine.find(
                db_feeder_script_model,
                {
                    "entry_kind": "script",
                    "feeder.index_status": False,
                },
            )
        }
        zip_buffer = BytesIO()
        with ZipFile(zip_buffer, "w", compression=ZIP_DEFLATED) as archive:
            for source_path in sorted(path for path in parser_root.rglob("*") if path.is_file()):
                if source_path.name in disabled_script_names:
                    continue
                archive.writestr(
                    source_path.relative_to(parser_root).as_posix(),
                    self._decrypt_parser_file(parser_root, source_path, source_path.read_bytes()),
                )
            for rule_key, rule_value in sorted(constant.url_rules.items()):
                archive.writestr(
                    f"feeder/crawl_data_{rule_key}.txt",
                    await self._build_feeder_file_content(rule_key, str(rule_value.get("rule_type") or "")),
                )
        return zip_buffer.getvalue()

    async def index_log_record(self, log_model):
        timestamp = datetime.now(timezone.utc).isoformat()

        for log_entry in log_model.logs:
            log_hash = hashlib.sha256(log_entry.encode("utf-8")).hexdigest()

            doc = {"log": log_entry, "log_hash": log_hash, "timestamp": timestamp}

            await self._engine.save(
                {ELASTIC_KEYS.S_DOCUMENT: ELASTIC_INDEX.S_STEALERLOGS_INDEX, ELASTIC_KEYS.S_VALUE: doc})

        return JSONResponse(content={"message": "Logs indexed successfully"}, status_code=200)

    @staticmethod
    async def fetch_cti_label(payload: CTITextRequest):
        trusted_micros_base_url = (
            env_handler.get_instance().env("TRUSTED_MICROS_API_BASE")
            or "://".join(("http", "trusted-micros-api:8010"))
        )
        url = f"{trusted_micros_base_url.rstrip('/')}/cti_classifier/classify"
        payload = {"data": payload.data}

        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()

        return response.json()["result"]

    @staticmethod
    def _get_swarm_proxy_url(_request: Request) -> str:
        swarm_url = env_handler.get_instance().env("SWARM_URL")
        swarm_urls = [swarm_url]

        if swarm_url:
            stripped_value = swarm_url.strip()
            if stripped_value.startswith("["):
                try:
                    swarm_urls = json.loads(stripped_value)
                except json.JSONDecodeError:
                    swarm_urls = [item.strip() for item in stripped_value.split(",") if item.strip()]
            elif "," in stripped_value:
                swarm_urls = [item.strip() for item in stripped_value.split(",") if item.strip()]
            else:
                swarm_urls = [stripped_value]

        available_swarm_urls = [url.rstrip("/") for url in swarm_urls if url]
        if not available_swarm_urls:
            raise ValueError("SWARM_URL is not configured")

        target_base_url = secrets.choice(available_swarm_urls)
        return f"{target_base_url}/user-dumps"

    @staticmethod
    async def _post_swarm_payload(target_url: str, payload: dict):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                await client.post(target_url, json=payload)
        except httpx.HTTPError:
            log.g().w(f"Crawl swarm not reachable: {target_url}")

    async def proxy_swarm_index(self, request: Request):
        payload = await request.json()
        normalized_url = self._normalize_swarm_route_url(self._extract_swarm_route_url(payload))

        if normalized_url:
            bloom = self._get_swarm_bloom()
            if normalized_url in bloom:
                return JSONResponse(content={"status": "duplicate_ignored"}, status_code=200)
            bloom.add(normalized_url)

        target_url = self._get_swarm_proxy_url(request)
        asyncio.create_task(self._post_swarm_payload(target_url, payload))
        return JSONResponse(content={"status": "accepted"}, status_code=202)
