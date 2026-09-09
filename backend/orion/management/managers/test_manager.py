import json
import motor.motor_asyncio

from arango import ArangoClient
from orion.services.arango_manager.arango_enums import ARANGO_CONNECTIONS
from datetime import datetime, timezone
from pathlib import Path
from elastic_transport import ApiError
from odmantic import ObjectId
from elasticsearch import AsyncElasticsearch, helpers as es_helpers, NotFoundError
from orion.helper_manager.env_handler import env_handler
from orion.services.mongo_manager.mongo_enums import MONGO_CONNECTIONS
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.elastic_manager.elastic_enums import ELASTIC_CONNECTIONS
from orion.services.mongo_manager.shared_model.db_auth_models import db_user_account
from orion.services.session_manager.session_enums import admin_mock, admin_user, crawler_mock, crawler_user
from orion.services.log_manager.log_controller import log


class test_manager:
    __instance = None

    @staticmethod
    def get_instance():
        if test_manager.__instance is None:
            test_manager()
        return test_manager.__instance

    def __init__(self):
        if test_manager.__instance is not None:
            return
        test_manager.__instance = self

    async def apply_test_overrides(self):
        if env_handler.get_instance().env("TESTING_ENABLED", "0") != "1":
            return

        MONGO_CONNECTIONS.S_MONGO_DATABASE_NAME = "orion-web_test"
        ELASTIC_CONNECTIONS.S_DATABASE_NAME = "orion-elastic-search_test"
        ARANGO_CONNECTIONS.ARANGO_DATABASE_NAME = "orion-web_test"

        admin_mock["username"] = "admin_test_username"
        admin_user["password"] = db_user_account.hash_password(
            "Zq9M#rX@e7W^B0T+f(ysG!kJc1d2mC&N%hAUEP)6Y4n$R8VbHS")

        crawler_mock["username"] = "crawler_test_username"
        crawler_user["password"] = db_user_account.hash_password(
            "Zq9M#rX@e7W^B0T+f(ysG!kJc1d2mC&N%hAUEP)6Y4n$R8VbHS")

    def _fix(self, v):
        if isinstance(v, dict):
            if set(v.keys()) == {"$oid"}:
                return ObjectId(v["$oid"])
            if set(v.keys()) == {"$date"}:
                x = v["$date"]
                if isinstance(x, (int, float)):
                    return datetime.fromtimestamp(x / 1000, tz=timezone.utc)
                if isinstance(x, str):
                    return datetime.fromisoformat(x.replace("Z", "+00:00"))
            return {k: self._fix(x) for k, x in v.items()}
        if isinstance(v, list):
            return [self._fix(x) for x in v]
        return v

    async def reset_test_mongo_and_import_mocks(self):
        if env_handler.get_instance().env("TESTING_ENABLED", "0") != "1":
            return

        mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
            MONGO_CONNECTIONS.S_MONGO_DATABASE_IP,
            MONGO_CONNECTIONS.S_MONGO_DATABASE_PORT,
            username=MONGO_CONNECTIONS.S_MONGO_USERNAME,
            password=MONGO_CONNECTIONS.S_MONGO_PASSWORD,
            authSource="admin",
        )
        db = mongo_client[MONGO_CONNECTIONS.S_MONGO_DATABASE_NAME]

        cols = await db.list_collection_names()
        for c in cols:
            try:
                await db.drop_collection(c)
            except Exception as ex:
                log.g().e(f"Failed to drop test collection {c}: {ex}")

        mocks_dir = Path(__file__).resolve().parents[3] / "tests" / "mock" / "mongo"
        if mocks_dir.exists():
            for fp in sorted(mocks_dir.glob("*.json")):
                parts = fp.name.split(".")
                if len(parts) < 3:
                    continue
                collection = parts[-2]

                with fp.open("r", encoding="utf-8") as f:
                    payload = json.load(f)

                if isinstance(payload, list):
                    docs = payload
                elif isinstance(payload, dict) and isinstance(payload.get("data"), list):
                    docs = payload["data"]
                else:
                    docs = [payload]

                if docs:
                    fixed = self._fix(docs)
                    if collection == "db_tenant_model":
                        fixed = [d for d in fixed if d.get("is_default") is True]
                        if fixed:
                            await db[collection].insert_many(fixed, ordered=False)
                    else:
                        await db[collection].insert_many(fixed, ordered=False)

        admin_src = await db["db_user_account"].find_one({"role": "admin"})
        crawler_src = await db["db_user_account"].find_one({"role": crawler_user["role"]})
        await mongo_controller.get_instance().ensure_demo_user()

        await db["db_user_account"].delete_many({})

        docs = []

        if admin_src:
            admin_src = dict(admin_src)
            admin_src.pop("_id", None)
            admin_src["username"] = admin_mock["username"]
            admin_src["password"] = admin_user["password"]
            docs.append(admin_src)

        if crawler_src:
            crawler_src = dict(crawler_src)
            crawler_src.pop("_id", None)
            crawler_src["username"] = crawler_mock["username"]
            crawler_src["password"] = crawler_user["password"]
            docs.append(crawler_src)

        if docs:
            await db["db_user_account"].insert_many(docs, ordered=False)


    async def reset_test_elastic_and_import_mocks(self):
        if env_handler.get_instance().env("TESTING_ENABLED", "0") != "1":
            return

        print("reset_test_elastic_and_import_mocks: start", flush=True)

        es_host = ELASTIC_CONNECTIONS.S_DATABASE_IP or "localhost"
        es_port = int(ELASTIC_CONNECTIONS.S_DATABASE_PORT or 9400)
        es_user = ELASTIC_CONNECTIONS.S_ELASTIC_USERNAME
        es_pass = ELASTIC_CONNECTIONS.S_ELASTIC_PASSWORD

        print(f"Connecting to ES {es_host}:{es_port}", flush=True)

        if es_user and es_pass:
            es = AsyncElasticsearch(
                hosts=[{"host": es_host, "port": es_port, "scheme": "http"}],
                basic_auth=(es_user, es_pass),
            )
        else:
            es = AsyncElasticsearch(
                hosts=[{"host": es_host, "port": es_port, "scheme": "http"}]
            )

        try:
            async def _delete_indices(index_map):
                for index_name in list(index_map.keys()):
                    if index_name.startswith("."):
                        continue
                    print(f"Deleting index: {index_name}", flush=True)
                    try:
                        await es.indices.delete(index=index_name, ignore_unavailable=True)
                    except NotFoundError:
                        print(f"Index not found: {index_name}", flush=True)
                        continue
                    except ApiError as exc:
                        print(f"Error deleting index {index_name}: {exc}", flush=True)
                        if getattr(exc, "status_code", None) == 404:
                            continue
                        raise

            print("Fetching indices (*)", flush=True)
            indices = await es.indices.get(index="*", ignore_unavailable=True)
            await _delete_indices(indices)

            print("Updating cluster settings (allow destructive)", flush=True)
            await es.cluster.put_settings(
                persistent={
                    "action.destructive_requires_name": False,
                    "cluster.blocks.read_only_allow_delete": None,
                }
            )

            print("Fetching data streams", flush=True)
            try:
                ds = await es.indices.get_data_stream(name="*")
            except NotFoundError:
                print("No data streams found", flush=True)
                ds = {"data_streams": []}
            except ApiError as e:
                print(f"Error fetching data streams: {e}", flush=True)
                if getattr(e, "status_code", None) == 404:
                    ds = {"data_streams": []}
                else:
                    raise

            for d in ds.get("data_streams", []):
                print(f"Deleting data stream: {d['name']}", flush=True)
                try:
                    await es.indices.delete_data_stream(name=d["name"])
                except NotFoundError:
                    print(f"Data stream not found: {d['name']}", flush=True)
                    continue
                except ApiError as e:
                    print(f"Error deleting data stream {d['name']}: {e}", flush=True)
                    if getattr(e, "status_code", None) == 404:
                        continue
                    raise

            print("Fetching indices (*, expand_wildcards=all)", flush=True)
            indices = await es.indices.get(
                index="*", expand_wildcards="all", ignore_unavailable=True
            )
            await _delete_indices(indices)

            print("Refreshing indices", flush=True)
            try:
                await es.indices.refresh(index="*", ignore_unavailable=True)
            except ApiError as e:
                print(f"Refresh error: {e}", flush=True)
                if getattr(e, "status_code", None) != 404:
                    raise

            print("Restoring cluster settings (require name)", flush=True)
            await es.cluster.put_settings(
                persistent={"action.destructive_requires_name": True}
            )

            mocks_dir = (
                    Path(__file__).resolve().parents[3]
                    / "tests"
                    / "mock"
                    / "elastic"
            )
            print(f"Mocks dir: {mocks_dir}", flush=True)

            if not mocks_dir.exists():
                print("Mocks dir does not exist, exiting", flush=True)
                return

            async def _create_index_from_fixture(index_name: str):
                mapping_fp = mocks_dir / f"{index_name}.mapping.json"
                settings_fp = mocks_dir / f"{index_name}.settings.json"
                body = {}

                if mapping_fp.exists():
                    with mapping_fp.open("r", encoding="utf-8") as f:
                        mapping_payload = json.load(f)
                    mappings = mapping_payload.get(index_name, mapping_payload).get("mappings")
                    if mappings:
                        body["mappings"] = mappings

                if settings_fp.exists():
                    with settings_fp.open("r", encoding="utf-8") as f:
                        settings_payload = json.load(f)
                    index_settings = (
                        settings_payload
                        .get(index_name, settings_payload)
                        .get("settings", {})
                        .get("index", {})
                    )
                    allowed_settings = {}
                    for key in ("analysis", "max_result_window", "number_of_shards", "number_of_replicas"):
                        if key in index_settings:
                            allowed_settings[key] = index_settings[key]
                    if allowed_settings:
                        body["settings"] = allowed_settings

                if not body:
                    return

                print(f"Creating index from fixture mapping: {index_name}", flush=True)
                try:
                    await es.indices.create(index=index_name, body=body)
                except ApiError as exc:
                    if getattr(exc, "status_code", None) != 400:
                        raise

            def _has_data(p: Path) -> bool:
                with p.open("r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            return True
                return False

            for data_fp in sorted(
                mocks_dir.glob("*.data.ndjson"),
                key=lambda path: (path.name.count("-"), path.name),
            ):
                print(f"Processing mock file: {data_fp}", flush=True)

                if data_fp.stat().st_size == 0:
                    print("File is empty, skipping", flush=True)
                    continue
                if not _has_data(data_fp):
                    print("File has no data lines, skipping", flush=True)
                    continue

                idx = data_fp.name.replace(".data.ndjson", "")
                print(f"Target index: {idx}", flush=True)
                await _create_index_from_fixture(idx)

                async def gen(fp=data_fp, default_index=idx):
                    with fp.open("r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if not line:
                                continue
                            entry = json.loads(line)
                            _id = entry.get("_id")
                            _index = entry.get("_index") or default_index
                            src = entry.get("_source", entry)
                            a = {
                                "_op_type": "index",
                                "_index": _index,
                                "_source": src,
                            }
                            if _id is not None:
                                a["_id"] = _id
                            yield a

                print(f"Bulk indexing from {data_fp}", flush=True)
                await es_helpers.async_bulk(
                    es,
                    gen(),
                    chunk_size=2000,
                    request_timeout=120,
                    raise_on_error=False,
                    raise_on_exception=False,
                )
                print(f"Finished bulk indexing {data_fp}", flush=True)

            print("reset_test_elastic_and_import_mocks: done", flush=True)

        finally:
            print("Closing Elasticsearch client", flush=True)
            await es.close()

    async def reset_test_arango_and_import_mocks(self):
        if env_handler.get_instance().env("TESTING_ENABLED", "0") != "1":
            return

        dumps_root = Path(__file__).resolve().parents[3] / "tests" / "mock" / "arango"
        if not dumps_root.exists():
            return

        db_name = ARANGO_CONNECTIONS.ARANGO_DATABASE_NAME

        client = ArangoClient(hosts=ARANGO_CONNECTIONS.ARANGO_URL)

        db = client.db(
            db_name,
            username=ARANGO_CONNECTIONS.ARANGO_USERNAME,
            password=ARANGO_CONNECTIONS.ARANGO_PASSWORD,
        )

        if not db.has_collection("cti_vertices"):
            db.create_collection("cti_vertices")
        if not db.has_collection("cti_edges"):
            db.create_collection("cti_edges", edge=True)

        vcol = db.collection("cti_vertices")
        ecol = db.collection("cti_edges")

        try:
            vcol.truncate()
        except Exception as exc:
            log.g().w(f"Failed to truncate cti_vertices during test setup: {exc}")
        try:
            ecol.truncate()
        except Exception as exc:
            log.g().w(f"Failed to truncate cti_edges during test setup: {exc}")

        def load_docs(path: Path):
            entries = []
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    d = json.loads(line)
                    if isinstance(d, dict):
                        d.pop("_rev", None)
                        d.pop("_id", None)
                    entries.append(d)
            return entries

        v_files = sorted(dumps_root.rglob("cti_vertices_*.data.json"))
        e_files = sorted(dumps_root.rglob("cti_edges_*.data.json"))

        for fp in v_files:
            docs = load_docs(fp)
            if docs:
                vcol.import_bulk(docs, on_duplicate="ignore")

        for fp in e_files:
            docs = load_docs(fp)
            if docs:
                ecol.import_bulk(docs, on_duplicate="replace")
