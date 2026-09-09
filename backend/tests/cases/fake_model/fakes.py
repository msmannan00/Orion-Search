from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any, Dict

from pymongo.errors import DuplicateKeyError

from orion.services.mongo_manager.shared_model.db_alert_connector_model import AlertConnectorProvider
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS


class FakeDoc:
    def __init__(self, **data: Any):
        normalized: dict[str, Any] = {str(key): value for key, value in data.items()}
        object.__setattr__(self, "_data", normalized)

    def __getattr__(self, name: str) -> Any:
        try:
            return self._data[name]
        except KeyError as exc:
            raise AttributeError(name) from exc

    def __setattr__(self, name: str, value: Any) -> None:
        self._data[name] = value

    def dict(self) -> Dict[str, Any]:
        return self._data.copy()


class FakeAuditManager:
    def __init__(self):
        self.calls = []

    async def register(self, tenant_id: str, user_id: str, action: str):
        self.calls.append((tenant_id, user_id, action))


class FakeAlertConnectorManager:
    def __init__(self):
        self.configs = {
            ("tenant-1", AlertConnectorProvider.SLACK): {"webhook_url": "https://hooks.slack.test/tenant-1"},
            ("tenant-2", AlertConnectorProvider.SLACK): {"webhook_url": "https://hooks.slack.test/tenant-2"},
        }
        self.config_calls = []
        self.refresh_calls = []

    async def tenant_provider_config(self, tenant_id, provider):
        self.config_calls.append((tenant_id, provider))
        return self.configs.get((tenant_id, provider))

    async def refresh_provider_access_token(self, tenant_id, provider, config):
        self.refresh_calls.append((tenant_id, provider, config))
        return config


class FakeSlackConnectorProvider:
    def __init__(self):
        self.sent = []

    def delivery_config(self, config):
        return config if config and config.get("webhook_url") else None

    def send_alert(self, config, alert):
        self.sent.append((config, alert))


class FakeMongoEngine:
    def __init__(self, records=None, find_one_results=None, append_on_save=False):
        self.append_on_save = append_on_save
        if records is None:
            self.records = []
        elif isinstance(records, (list, tuple)):
            self.records = list(records)
        else:
            self.records = [records]
        self.find_one_results = list(find_one_results or [])
        self.saved = []
        self.deleted = []
        self.removed = []
        self.count_result = 0

    async def find_one(self, *_args, **_kwargs):
        if self.find_one_results:
            return self.find_one_results.pop(0)
        return self.records[0] if self.records else None

    async def find(self, *_args, **_kwargs):
        return list(self.records)

    async def save(self, model):
        self.saved.append(model)
        if self.append_on_save or not self.records:
            self.records.append(model)
        else:
            self.records[0] = model
        return model

    async def delete(self, model):
        self.deleted.append(model)
        if model in self.records:
            self.records.remove(model)
        return True

    async def remove(self, *args, **kwargs):
        self.removed.append((args, kwargs))
        return True

    async def count(self, *_args, **_kwargs):
        return self.count_result


class FakeElastic:
    def __init__(self, responses=None):
        self.index_calls = []
        self.dump_index_calls = []
        self.search_calls = []
        self.search_query_calls = []
        self.search_consolidated_calls = []
        self.search_consolidated_queries_calls = []
        self.get_calls = []
        self.get_doc_calls = []
        self.delete_calls = []
        self.reindex_map_entities_calls = []
        self.responses = list(responses or [])
        self.search_result = {}
        self.search_query_result = (True, {})
        self.search_consolidated_result = {}
        self.get_result = {}
        self.get_doc_result = []
        self.docs: dict[str, dict] = {}

    async def index_data(self, payload, bypass_empty_embedding=False):
        self.index_calls.append((payload, bypass_empty_embedding))
        return True

    async def index_dump(self, payload):
        self.dump_index_calls.append(payload)
        return True

    async def search_data(self, *args, **kwargs):
        self.search_calls.append((args, kwargs))
        return self.search_result

    async def search_query(self, document, data_filter):
        self.search_query_calls.append((document, data_filter))
        if self.docs and self.search_query_result == (True, {}):
            must_clauses = data_filter["query"]["bool"]["must"]
            tenant_id = next(
                clause["term"]["tenant_id"]
                for clause in must_clauses
                if "term" in clause and "tenant_id" in clause["term"]
            )
            matching_hits = []
            for stored in self.docs.values():
                source = stored["_source"]
                if source.get("tenant_id") != tenant_id:
                    continue
                matching_hits.append(stored)

            return True, {
                "hits": {
                    "hits": matching_hits[: data_filter["size"]],
                    "total": {"value": len(matching_hits)},
                }
            }
        return self.search_query_result

    async def search_consolidated_ranked_query(self, indices, query, indices_boost=None):
        self.search_consolidated_calls.append((indices, query, indices_boost))
        return self.search_consolidated_result

    async def search_consolidated_queries(self, indices, queries):
        self.search_consolidated_queries_calls.append((indices, queries))
        return self.responses

    async def get_data(self, *args, **kwargs):
        self.get_calls.append((args, kwargs))
        return self.get_result

    async def get_doc(self, index, doc_id):
        self.get_doc_calls.append((index, doc_id))
        return self.get_doc_result

    async def delete_data(self, *args, **kwargs):
        self.delete_calls.append((args, kwargs))
        return True

    async def reindex_map_entities_data(self):
        self.reindex_map_entities_calls.append(True)
        return True

    def get_connection(self):
        return self

    async def update(self, index, id, body, **_kwargs):
        self.docs[id] = {
            "_index": index,
            "_id": id,
            "_source": dict(body["doc"]),
        }
        return {"result": "updated"}


FakeEngine = FakeMongoEngine


class FakeRedis:
    def __init__(self, values=None):
        self.calls = []
        self.values = dict(values or {})

    async def invoke_trigger(self, command, payload):
        self.calls.append((command, payload))

        if command == REDIS_COMMANDS.S_GET_STRING:
            return self.values.get(payload[0])

        if command == REDIS_COMMANDS.S_SET_STRING:
            self.values[payload[0]] = payload[1]
            return True

        return None


class FakeResponse:
    def __init__(self, *, status_code=200, json_data=None, raises=False):
        self.status_code = status_code
        self._json_data = json_data or {}
        self._raises = raises

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self._raises:
            raise RuntimeError("boom")


class FakeAsyncClient:
    def __init__(self, response=None, exc: Exception | None = None, calls: list | None = None):
        self._response = response or FakeResponse()
        self._exc = exc
        self._calls = calls if calls is not None else []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, json_body=None, timeout=None, **kwargs):
        payload = kwargs.get("json", json_body)
        self._calls.append({"url": url, "json": payload, "timeout": timeout})
        if self._exc is not None:
            raise self._exc
        return self._response


class FakeBloom:
    def __init__(self):
        self.values = set()

    def __contains__(self, item):
        return item in self.values

    def add(self, item):
        self.values.add(item)


class FakeBackupJobStore:
    def __init__(self, can_begin: bool = True):
        self.can_begin = can_begin
        self.begun = []
        self.progressed = []
        self.finished = []
        self.heartbeats = 0

    async def read(self):
        return {"operation": "", "status": "idle", "progress": 0, "message": "", "filename": ""}

    async def begin(self, operation: str, message: str) -> bool:
        self.begun.append((operation, message))
        return self.can_begin

    async def progress(self, progress: int, message: str) -> None:
        self.progressed.append((progress, message))

    async def heartbeat(self) -> None:
        self.heartbeats += 1

    async def finish(self, status, message: str, filename: str = "") -> None:
        self.finished.append((status, message, filename))

    async def keep_alive(self) -> None:
        while True:
            await asyncio.sleep(3600)


class FakeBackupJobCollection:
    def __init__(self, document=None):
        self.document = dict(document) if document else None

    def _matches(self, query) -> bool:
        if self.document is None:
            return False
        for key, condition in query.items():
            value = self.document.get(key)
            if isinstance(condition, dict):
                if "$ne" in condition and value == condition["$ne"]:
                    return False
                if "$lte" in condition and (value is None or value > condition["$lte"]):
                    return False
            elif value != condition:
                return False
        return True

    async def find_one(self, query):
        return dict(self.document) if self._matches(query) else None

    async def update_one(self, query, update):
        if not self._matches(query):
            return SimpleNamespace(modified_count=0)
        self.document.update(update.get("$set", {}))
        return SimpleNamespace(modified_count=1)

    async def find_one_and_update(self, query, update, upsert=False, return_document=None):
        if self._matches(query):
            self.document.update(update.get("$set", {}))
            return dict(self.document)
        if not upsert:
            return None
        if self.document is not None:
            raise DuplicateKeyError("duplicate job_key")
        self.document = dict(update.get("$setOnInsert", {}))
        self.document.update(update.get("$set", {}))
        return dict(self.document)
