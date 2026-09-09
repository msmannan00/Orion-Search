from __future__ import annotations

import asyncio
import json
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from bson import ObjectId
from bson import json_util
from bson.errors import InvalidId
from elasticsearch import helpers as es_helpers
from fastapi import HTTPException

from orion.api.interactive.backup_manager.backup_job_store import BackupJobStore
from orion.api.interactive.backup_manager.maintenance_state import maintenance_state
from orion.services.arango_manager.arango_controller import arango_controller
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.log_manager.log_controller import log
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.services.mongo_manager.shared_model.db_backup_job_model import BackupJobStatus, db_backup_job_model
from orion.services.mongo_manager.shared_model.db_backup_model import BackupType, db_backup_model
from orion.constants.constant import CONSTANTS


class BackupManager:
    __instance = None
    _tasks: set = set()

    @staticmethod
    def get_instance():
        if BackupManager.__instance is None:
            BackupManager()
        return BackupManager.__instance

    def __init__(self):
        if BackupManager.__instance is not None:
            return
        BackupManager.__instance = self
        self.backup_root = CONSTANTS.BASE_DIR / "backups"
        self.maintenance_flag = CONSTANTS.MAINTENANCE_FLAG

    @property
    def restore_marker(self) -> Path:
        return self.backup_root / CONSTANTS.RESTORE_MARKER_NAME

    @property
    def _engine(self):
        engine = getattr(self, "_engine_instance", None)
        if engine is None:
            engine = mongo_controller.get_instance().get_engine()
            self._engine_instance = engine
        return engine

    @_engine.setter
    def _engine(self, value):
        self._engine_instance = value

    @property
    def _job_store(self) -> BackupJobStore:
        store = getattr(self, "_job_store_instance", None)
        if store is None:
            store = BackupJobStore.get_instance()
            self._job_store_instance = store
        return store

    @_job_store.setter
    def _job_store(self, value):
        self._job_store_instance = value

    async def job_status(self) -> dict:
        status = await self._job_store.read()
        if self.restore_marker.exists():
            status["interrupted_restore"] = self._read_json_file(self.restore_marker) or {}
        return status

    async def _set_progress(self, progress: int, message: str) -> None:
        await self._job_store.progress(progress, message)

    def _spawn(self, coroutine) -> None:
        task = asyncio.create_task(coroutine)
        BackupManager._tasks.add(task)
        task.add_done_callback(BackupManager._tasks.discard)

    @staticmethod
    async def _stop_heartbeat(heartbeat) -> None:
        heartbeat.cancel()
        try:
            await heartbeat
        except asyncio.CancelledError:
            pass

    @staticmethod
    async def _remove_tree(path: Path) -> None:
        await asyncio.to_thread(shutil.rmtree, path, ignore_errors=True)

    @staticmethod
    def _read_json_file(path: Path):
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    @staticmethod
    def _write_json_file(path: Path, payload) -> None:
        path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")

    async def start_backup(self, backup_type: BackupType) -> dict:
        if self.restore_marker.exists():
            raise HTTPException(status_code=409, detail="A previous restore was interrupted. Resolve it before running a backup.")
        if not await self._job_store.begin("backup", "Starting backup"):
            log.g().i("BACKUP: request ignored, another backup or restore is already running")
            return await self.job_status()
        self._spawn(self._run_backup(backup_type))
        return await self.job_status()

    async def run_backup_now(self, backup_type: BackupType) -> bool:
        if self.restore_marker.exists():
            log.g().e("BACKUP: scheduled run skipped, a previous restore was interrupted")
            return False
        if not await self._job_store.begin("backup", "Starting backup"):
            log.g().i("BACKUP: scheduled run skipped, another backup or restore is already running")
            return False
        await self._run_backup(backup_type)
        return True

    async def _run_backup(self, backup_type: BackupType) -> None:
        heartbeat = asyncio.create_task(self._job_store.keep_alive())
        try:
            result = await self.create_backup(backup_type)
            await self._job_store.finish(BackupJobStatus.DONE, "Backup completed successfully", result.get("filename", ""))
        except Exception as exc:
            log.g().e(f"BACKUP FAILED: {exc}")
            await self._job_store.finish(BackupJobStatus.FAILED, str(getattr(exc, "detail", exc)))
        finally:
            await self._stop_heartbeat(heartbeat)

    async def start_restore(self, backup_id: str) -> dict:
        if self.restore_marker.exists():
            raise HTTPException(status_code=409, detail="A previous restore was interrupted. Resolve it before running another restore.")
        if not await self._job_store.begin("restore", "Starting restore"):
            log.g().i("RESTORE: request ignored, another backup or restore is already running")
            return await self.job_status()
        self._spawn(self._run_restore(backup_id))
        return await self.job_status()

    async def _run_restore(self, backup_id: str) -> None:
        heartbeat = asyncio.create_task(self._job_store.keep_alive())
        try:
            result = await self.restore_backup_by_id(backup_id)
            await self._job_store.finish(BackupJobStatus.DONE, "Backup restored successfully", result.get("filename", ""))
        except Exception as exc:
            log.g().e(f"RESTORE FAILED: {exc}")
            await self._job_store.finish(BackupJobStatus.FAILED, str(getattr(exc, "detail", exc)))
        finally:
            await self._stop_heartbeat(heartbeat)

    async def list_backups(self):
        backups = await self._engine.find(db_backup_model, sort=db_backup_model.created_at.desc())
        return [
            {
                "id": str(backup.id),
                "filename": backup.filename,
                "backup_type": backup.backup_type.value if isinstance(backup.backup_type, BackupType) else backup.backup_type,
                "created_at": backup.created_at,
            }
            for backup in backups
        ]

    async def create_backup(self, backup_type: BackupType):
        created_at = datetime.now(timezone.utc)
        folder_name = created_at.strftime("%Y_%m_%d_%H_%M_%S")
        backup_dir = self.backup_root / folder_name
        log.g().i(f"BACKUP STARTED: {folder_name} type={backup_type.value}")

        await self._sweep_stale_rollbacks()
        await self._require_free_space(backup_dir.parent)

        try:
            await self._perform_backup(backup_dir, window=(0, 90))
        except Exception as exc:
            await self._remove_tree(backup_dir)
            raise HTTPException(status_code=500, detail=f"Backup failed: {exc}") from exc

        backup = db_backup_model(filename=folder_name, backup_type=backup_type, created_at=created_at)
        await self._engine.save(backup)
        log.g().i(f"BACKUP SUCCESS: {folder_name}")

        await self._prune_old_backups()
        return {
            "id": str(backup.id),
            "filename": backup.filename,
            "backup_type": backup.backup_type.value,
            "created_at": backup.created_at,
        }

    async def _prune_old_backups(self) -> None:
        existing_backups = await self._engine.find(db_backup_model, sort=db_backup_model.created_at.asc())
        for oldest in existing_backups[:max(0, len(existing_backups) - CONSTANTS.MAX_BACKUPS)]:
            await self._remove_tree(self.backup_root / oldest.filename)
            await self._engine.delete(oldest)
            log.g().i(f"BACKUP: limit of {CONSTANTS.MAX_BACKUPS} reached, removed oldest backup {oldest.filename}")

    async def _sweep_stale_rollbacks(self) -> None:
        if not self.backup_root.is_dir() or self.restore_marker.exists():
            return
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CONSTANTS.RESTORE_ROLLBACK_MAX_AGE_HOURS)
        for entry in self.backup_root.iterdir():
            if not entry.is_dir() or not entry.name.startswith(CONSTANTS.RESTORE_ROLLBACK_PREFIX):
                continue
            try:
                modified_at = datetime.fromtimestamp(entry.stat().st_mtime, tz=timezone.utc)
            except OSError:
                continue
            if modified_at < cutoff:
                await self._remove_tree(entry)
                log.g().i(f"BACKUP: removed abandoned rollback directory {entry.name}")

    async def _require_free_space(self, target: Path, reference: Path | None = None) -> None:
        target.mkdir(parents=True, exist_ok=True)
        usage = await asyncio.to_thread(shutil.disk_usage, target)
        needed = 0
        if reference is not None and reference.is_dir():
            needed = int(await asyncio.to_thread(self._directory_size, reference) * CONSTANTS.BACKUP_DISK_HEADROOM)
        if usage.free <= needed:
            raise HTTPException(
                status_code=507,
                detail=f"Not enough disk space: {usage.free} bytes free, {needed} bytes required",
            )

    @staticmethod
    def _directory_size(path: Path) -> int:
        total = 0
        for entry in path.rglob("*"):
            try:
                if entry.is_file():
                    total += entry.stat().st_size
            except OSError:
                continue
        return total

    async def _perform_backup(self, backup_dir: Path, window: tuple = (0, 90)):
        progress_base, progress_span = window
        total_steps = 5

        async def step(done: int, message: str, fraction: float = 0.0) -> None:
            position = min(1.0, (done + fraction) / total_steps)
            await self._set_progress(int(progress_base + progress_span * position), message)

        backup_dir.mkdir(parents=True, exist_ok=True)
        manifest = {"version": CONSTANTS.BACKUP_MANIFEST_VERSION, "completed": False, "created_at": datetime.now(timezone.utc)}

        await step(0, "Exporting MongoDB")
        manifest["mongo"] = await self._backup_mongo(backup_dir / "mongo", lambda fraction: step(0, "Exporting MongoDB", fraction))
        await step(1, "Exporting ArangoDB")
        manifest["arango"] = await asyncio.to_thread(self._backup_arango, backup_dir / "arango")
        await step(2, "Exporting Elasticsearch")
        manifest["elastic"] = await self._backup_elastic(backup_dir / "elastic")
        await step(3, "Copying logs")
        await asyncio.to_thread(self._copy_folder, CONSTANTS.BASE_DIR / "workspace" / "logs", backup_dir / "logs")
        await step(4, "Copying resources")
        await asyncio.to_thread(self._copy_folder, CONSTANTS.BASE_DIR / "static" / "resource", backup_dir / "resource")
        await step(5, "Finalizing")

        manifest["completed"] = True
        await asyncio.to_thread(self._write_json_file, backup_dir / CONSTANTS.BACKUP_MANIFEST_NAME, manifest)
        return manifest

    def read_manifest(self, backup_dir: Path):
        return self._read_json_file(backup_dir / CONSTANTS.BACKUP_MANIFEST_NAME)

    async def delete_backup(self, backup_id: str):
        try:
            backup_object_id = ObjectId(backup_id)
        except (InvalidId, TypeError) as exc:
            raise HTTPException(status_code=404, detail="Backup not found") from exc
        backup = await self._engine.find_one(db_backup_model, db_backup_model.id == backup_object_id)
        if backup is None:
            raise HTTPException(status_code=404, detail="Backup not found")
        await self._remove_tree(self.backup_root / backup.filename)
        await self._engine.delete(backup)
        return {"status": "deleted"}

    async def restore_backup_by_id(self, backup_id: str):
        try:
            backup_object_id = ObjectId(backup_id)
        except (InvalidId, TypeError) as exc:
            raise HTTPException(status_code=404, detail="Backup not found") from exc
        backup = await self._engine.find_one(db_backup_model, db_backup_model.id == backup_object_id)
        if backup is None:
            raise HTTPException(status_code=404, detail="Backup not found")
        return await self.restore_backup(backup.filename, source="ui")

    async def _quiesce_writers(self) -> None:
        quiesced = 0
        try:
            from orion.api.interactive.extension_manager.extension_socket_manager import extension_socket_manager
            socket_manager = extension_socket_manager.get_instance()
            for user_key in list(getattr(socket_manager, "_sockets", {}).keys()):
                await socket_manager.reset_sockets(user_key)
                quiesced += 1
        except Exception as exc:
            log.g().w(f"RESTORE: could not close extension sockets: {exc}")

        try:
            from orion.api.interactive.social_manager.social_scanner import social_scanner
            scanner = social_scanner.get_instance()
            for scan in list(getattr(scanner, "_scans", {}).values()):
                task = getattr(scan, "task", None)
                if task is not None and not task.done():
                    task.cancel()
                    quiesced += 1
        except Exception as exc:
            log.g().w(f"RESTORE: could not cancel social scans: {exc}")

        if quiesced:
            await asyncio.sleep(CONSTANTS.RESTORE_QUIESCE_DRAIN_SECONDS)
        log.g().i(f"RESTORE: in-flight writers quiesced ({quiesced} cancelled or closed)")

    async def restore_backup(self, filename: str, source: str = "cli"):
        backup_dir = self.backup_root / filename
        log.g().i(f"RESTORE STARTED: backup={filename} source={source}")

        if not backup_dir.is_dir() or not (backup_dir / "mongo").is_dir() or not any((backup_dir / "mongo").iterdir()):
            log.g().e(f"RESTORE FAILED: backup verification failed for {filename}")
            raise HTTPException(status_code=404, detail="Backup not found or missing required data")

        manifest = self.read_manifest(backup_dir)
        if manifest is None:
            log.g().w(f"RESTORE: {filename} has no manifest, restoring without count verification")
        elif not manifest.get("completed"):
            log.g().e(f"RESTORE FAILED: {filename} is an incomplete backup")
            raise HTTPException(status_code=422, detail="Backup is incomplete and cannot be restored")
        log.g().i(f"RESTORE: backup verified: {filename}")

        self.maintenance_flag.parent.mkdir(parents=True, exist_ok=True)
        self.maintenance_flag.touch()
        maintenance_state.get_instance().invalidate()
        log.g().i("RESTORE: maintenance mode enabled")
        await self._quiesce_writers()

        rollback_name = f"{CONSTANTS.RESTORE_ROLLBACK_PREFIX}{datetime.now(timezone.utc).strftime('%Y_%m_%d_%H_%M_%S')}"
        rollback_dir = self.backup_root / rollback_name
        try:
            await self._require_free_space(self.backup_root, backup_dir)
            await self._perform_backup(rollback_dir, window=(5, 35))
            log.g().i(f"RESTORE: rollback point created: {rollback_name}")
        except Exception as exc:
            await self._remove_tree(rollback_dir)
            self.maintenance_flag.unlink(missing_ok=True)
            maintenance_state.get_instance().invalidate()
            log.g().e(f"RESTORE FAILED: could not create rollback point: {exc}")
            raise HTTPException(status_code=500, detail=f"Restore aborted, could not create rollback point: {exc}") from exc

        await asyncio.to_thread(
            self._write_json_file,
            self.restore_marker,
            {"backup": filename, "rollback": rollback_name, "source": source, "started_at": datetime.now(timezone.utc)},
        )

        try:
            await self._set_progress(45, "Restoring data")
            await self._run_restore_engine(backup_dir)
            log.g().i(f"RESTORE: restore steps completed for {filename}")
            await self._set_progress(90, "Validating restore")
            valid, details = await self._validate_restore(manifest)
            if not valid:
                raise RuntimeError(f"validation failed: {details}")
            log.g().i(f"RESTORE: validation passed for {filename}")
        except Exception as exc:
            log.g().e(f"RESTORE FAILED: {exc}. Rolling back to {rollback_name}")
            try:
                await self._run_restore_engine(rollback_dir)
                valid, details = await self._validate_restore(self.read_manifest(rollback_dir))
                if not valid:
                    raise RuntimeError(f"rollback validation failed: {details}")
                log.g().i(f"RESTORE: rollback succeeded, previous state restored from {rollback_name}")
            except Exception as rollback_exc:
                log.g().c(
                    f"RESTORE CRITICAL: rollback FAILED after restore failure. "
                    f"backup={filename} rollback={rollback_name} restore_error={exc} rollback_error={rollback_exc}"
                )
                raise HTTPException(
                    status_code=500,
                    detail=f"Restore failed and rollback failed. Manual intervention required: {rollback_exc}",
                ) from rollback_exc

            self.restore_marker.unlink(missing_ok=True)
            await self._remove_tree(rollback_dir)
            await self._refresh_caches()
            log.g().i("RESTORE: starting site after rollback")
            self.maintenance_flag.unlink(missing_ok=True)
            maintenance_state.get_instance().invalidate()
            log.g().i("RESTORE: maintenance mode disabled")
            raise HTTPException(status_code=500, detail=f"Restore failed and was rolled back: {exc}") from exc

        self.restore_marker.unlink(missing_ok=True)
        await self._remove_tree(rollback_dir)
        await self._refresh_caches()
        log.g().i("RESTORE: starting site")
        self.maintenance_flag.unlink(missing_ok=True)
        maintenance_state.get_instance().invalidate()
        log.g().i(f"RESTORE SUCCESS: {filename}. Maintenance mode disabled.")
        return {"status": "restored", "filename": filename}

    async def _refresh_caches(self) -> None:
        try:
            from orion.api.server.config_manager.config_controller import config_controller
            await config_controller.getInstance().load_config(force_db=True)
            log.g().i("RESTORE: config cache reloaded from the restored database")
        except Exception as exc:
            log.g().e(f"RESTORE: config cache reload failed: {exc}")

    async def resolve_interrupted_restore(self) -> bool:
        marker = self._read_json_file(self.restore_marker)
        if not marker:
            return False
        self.maintenance_flag.parent.mkdir(parents=True, exist_ok=True)
        self.maintenance_flag.touch()
        maintenance_state.get_instance().invalidate()
        log.g().c(
            f"RESTORE CRITICAL: an interrupted restore was detected on startup. "
            f"backup={marker.get('backup')} rollback={marker.get('rollback')}. "
            f"The databases are in a partially restored state and the site is held in maintenance mode. "
            f"Recover with: python restore_backup.py {marker.get('rollback')}"
        )
        await self._job_store.finish(
            BackupJobStatus.FAILED,
            "Restore was interrupted and the databases are partially restored. Manual recovery required.",
            str(marker.get("backup") or ""),
        )
        return True

    async def _run_restore_engine(self, source_dir: Path):
        await self._restore_mongo(source_dir / "mongo")
        await asyncio.to_thread(self._restore_arango, source_dir / "arango")
        await self._restore_elastic(source_dir / "elastic")
        await asyncio.to_thread(self._restore_folder, source_dir / "resource", CONSTANTS.BASE_DIR / "static" / "resource")

    async def _validate_restore(self, manifest=None):
        try:
            collection_names = await self._engine.database.list_collection_names()
        except Exception as exc:
            return False, f"MongoDB validation failed: {exc}"
        try:
            db = arango_controller.get_instance().get_db()
            if db is not None:
                db.collections()
        except Exception as exc:
            return False, f"ArangoDB validation failed: {exc}"
        try:
            conn = elastic_controller.get_instance().get_connection()
            if conn is not None:
                await conn.info()
        except Exception as exc:
            return False, f"Elasticsearch validation failed: {exc}"

        if not manifest:
            return True, "ok"

        preserved = self._preserved_collections()
        for collection_name, expected in (manifest.get("mongo") or {}).items():
            if collection_name in preserved:
                continue
            if collection_name not in collection_names:
                return False, f"MongoDB collection {collection_name} is missing after restore"
            actual = await self._engine.database[collection_name].count_documents({})
            if actual != expected:
                return False, f"MongoDB collection {collection_name} has {actual} documents, expected {expected}"
        return True, "ok"

    def _preserved_collections(self) -> set:
        return {
            self._engine.get_collection(db_backup_model).name,
            self._engine.get_collection(db_backup_job_model).name,
        }

    async def _backup_mongo(self, output_dir: Path, report=None) -> dict:
        output_dir.mkdir(parents=True, exist_ok=True)
        database = self._engine.database
        collections = await database.list_collection_names()
        total = len(collections) or 1
        counts = {}
        for index, collection_name in enumerate(collections):
            counts[collection_name] = await self._dump_collection(database, collection_name, output_dir / f"{collection_name}.ndjson")
            if report is not None:
                await report((index + 1) / total)
        return counts

    async def _dump_collection(self, database, collection_name: str, path: Path) -> int:
        handle = await asyncio.to_thread(path.open, "w", encoding="utf-8")
        written = 0
        try:
            batch = []
            cursor = database[collection_name].find({}, batch_size=CONSTANTS.BACKUP_BATCH_SIZE)
            async for document in cursor:
                batch.append(document)
                if len(batch) >= CONSTANTS.BACKUP_BATCH_SIZE:
                    await asyncio.to_thread(self._write_json_lines, handle, batch)
                    written += len(batch)
                    batch = []
            if batch:
                await asyncio.to_thread(self._write_json_lines, handle, batch)
                written += len(batch)
            await asyncio.to_thread(handle.flush)
        finally:
            await asyncio.to_thread(handle.close)
        return written

    @staticmethod
    def _write_json_lines(handle, documents) -> None:
        handle.write("".join(f"{json_util.dumps(document)}\n" for document in documents))

    @staticmethod
    def _read_json_lines(handle, limit: int) -> list:
        documents = []
        for line in handle:
            line = line.strip()
            if line:
                documents.append(json_util.loads(line))
            if len(documents) >= limit:
                break
        return documents

    @staticmethod
    def _read_json_dump(path: Path):
        return json_util.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _collect_sources(source_dir: Path) -> dict:
        sources = {}
        for suffix in ("*.json", "*.ndjson"):
            for file in sorted(source_dir.glob(suffix)):
                if file.name == CONSTANTS.BACKUP_MANIFEST_NAME or file.name.endswith(".meta.json"):
                    continue
                sources[file.stem] = file
        return sources

    def _backup_arango(self, output_dir: Path) -> dict:
        output_dir.mkdir(parents=True, exist_ok=True)
        db = arango_controller.get_instance().get_db()
        if db is None:
            return {}
        counts = {}
        for collection_info in db.collections():
            collection_name = collection_info.get("name")
            if not collection_name or collection_name.startswith("_"):
                continue
            is_edge = collection_info.get("type") == "edge" or bool(collection_info.get("edge"))
            cursor = db.aql.execute(
                f"FOR doc IN `{collection_name}` RETURN doc",
                batch_size=CONSTANTS.BACKUP_BATCH_SIZE,
                stream=True,
            )
            written = 0
            with (output_dir / f"{collection_name}.ndjson").open("w", encoding="utf-8") as handle:
                for document in cursor:
                    handle.write(f"{json.dumps(document, default=str)}\n")
                    written += 1
            self._write_json_file(output_dir / f"{collection_name}.meta.json", {"edge": is_edge, "count": written})
            counts[collection_name] = {"count": written, "edge": is_edge}
        return counts

    async def _backup_elastic(self, output_dir: Path) -> dict:
        output_dir.mkdir(parents=True, exist_ok=True)
        conn = elastic_controller.get_instance().get_connection()
        if conn is None:
            return {}
        indices = await conn.indices.get(index="*", expand_wildcards="open", ignore_unavailable=True)
        counts = {}
        for index_name, definition in indices.items():
            if self._is_excluded_index(index_name):
                log.g().i(f"BACKUP: skipping excluded Elasticsearch index {index_name}")
                continue
            await asyncio.to_thread(
                self._write_json_file,
                output_dir / f"{index_name}.meta.json",
                {
                    "mappings": (definition or {}).get("mappings") or {},
                    "settings": self._sanitize_index_settings((definition or {}).get("settings") or {}),
                },
            )
            path = output_dir / f"{index_name}.ndjson"
            written = 0
            with path.open("w", encoding="utf-8") as file:
                response = await conn.search(index=index_name, body={"query": {"match_all": {}}}, scroll="10m", size=500)
                scroll_id = response.get("_scroll_id")
                hits = response.get("hits", {}).get("hits", [])
                while hits:
                    await asyncio.to_thread(self._write_hits, file, hits)
                    written += len(hits)
                    response = await conn.scroll(scroll_id=scroll_id, scroll="10m")
                    scroll_id = response.get("_scroll_id")
                    hits = response.get("hits", {}).get("hits", [])
                if scroll_id:
                    await conn.clear_scroll(scroll_id=scroll_id)
            counts[index_name] = written
        return counts

    @staticmethod
    def _is_excluded_index(index_name: str) -> bool:
        return index_name.startswith(".") or index_name in CONSTANTS.BACKUP_EXCLUDED_ELASTIC_INDICES

    @staticmethod
    def _sanitize_index_settings(settings: dict) -> dict:
        index_settings = dict((settings.get("index") or {}))
        for key in CONSTANTS.BACKUP_UNSETTABLE_INDEX_SETTINGS:
            index_settings.pop(key, None)
        return {"index": index_settings} if index_settings else {}

    @staticmethod
    def _write_hits(file, hits) -> None:
        for hit in hits:
            file.write(json.dumps(hit, default=str) + "\n")

    def _copy_folder(self, source: Path, destination: Path):
        destination.mkdir(parents=True, exist_ok=True)
        if source.exists():
            shutil.copytree(source, destination, dirs_exist_ok=True)

    async def _read_documents(self, path: Path):
        if path.suffix == ".json":
            documents = await asyncio.to_thread(self._read_json_dump, path)
            for start in range(0, len(documents), CONSTANTS.BACKUP_BATCH_SIZE):
                yield documents[start:start + CONSTANTS.BACKUP_BATCH_SIZE]
            return
        handle = await asyncio.to_thread(path.open, "r", encoding="utf-8")
        try:
            while True:
                batch = await asyncio.to_thread(self._read_json_lines, handle, CONSTANTS.BACKUP_BATCH_SIZE)
                if not batch:
                    return
                yield batch
        finally:
            await asyncio.to_thread(handle.close)

    async def _restore_mongo(self, source_dir: Path):
        if not source_dir.exists():
            return
        database = self._engine.database
        preserved = self._preserved_collections()
        sources = self._collect_sources(source_dir)

        for collection_name in await database.list_collection_names():
            if collection_name in preserved or collection_name in sources:
                continue
            await database[collection_name].drop()
            log.g().i(f"RESTORE: dropped MongoDB collection absent from the backup: {collection_name}")

        for collection_name, file in sources.items():
            if collection_name in preserved:
                continue
            await database[collection_name].delete_many({})
            async for batch in self._read_documents(file):
                await database[collection_name].insert_many(batch, ordered=False)

    @staticmethod
    def _iter_documents(path: Path):
        if path.suffix == ".json":
            documents = json.loads(path.read_text(encoding="utf-8"))
            for start in range(0, len(documents), CONSTANTS.BACKUP_BATCH_SIZE):
                yield documents[start:start + CONSTANTS.BACKUP_BATCH_SIZE]
            return
        with path.open("r", encoding="utf-8") as handle:
            batch = []
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                batch.append(json.loads(line))
                if len(batch) >= CONSTANTS.BACKUP_BATCH_SIZE:
                    yield batch
                    batch = []
            if batch:
                yield batch

    def _restore_arango(self, source_dir: Path):
        if not source_dir.exists():
            return
        db = arango_controller.get_instance().get_db()
        if db is None:
            return
        sources = self._collect_sources(source_dir)

        for collection_info in db.collections():
            collection_name = collection_info.get("name")
            if not collection_name or collection_name.startswith("_") or collection_name in sources:
                continue
            db.delete_collection(collection_name)
            log.g().i(f"RESTORE: dropped ArangoDB collection absent from the backup: {collection_name}")

        for collection_name, file in sources.items():
            meta = self._read_json_file(source_dir / f"{collection_name}.meta.json") or {}
            is_edge = bool(meta.get("edge"))
            if db.has_collection(collection_name):
                properties = db.collection(collection_name).properties()
                existing_edge = properties.get("edge") or properties.get("type") == 3
                if bool(existing_edge) != is_edge:
                    db.delete_collection(collection_name)
                    db.create_collection(collection_name, edge=is_edge)
            else:
                db.create_collection(collection_name, edge=is_edge)
            collection = db.collection(collection_name)
            collection.truncate()
            for batch in self._iter_documents(file):
                collection.import_bulk(batch, on_duplicate="replace")

    async def _restore_elastic(self, source_dir: Path):
        if not source_dir.exists():
            return
        conn = elastic_controller.get_instance().get_connection()
        if conn is None:
            return

        files = {file.stem: file for file in sorted(source_dir.glob("*.ndjson")) if not self._is_excluded_index(file.stem)}
        live = await conn.indices.get(index="*", expand_wildcards="open", ignore_unavailable=True)
        for index_name in live.keys():
            if self._is_excluded_index(index_name) or index_name in files:
                continue
            await conn.indices.delete(index=index_name, ignore_unavailable=True)
            log.g().i(f"RESTORE: dropped Elasticsearch index absent from the backup: {index_name}")

        for index_name, file in files.items():
            meta = await asyncio.to_thread(self._read_json_file, source_dir / f"{index_name}.meta.json")
            if await conn.indices.exists(index=index_name):
                await conn.indices.delete(index=index_name)
            body = {}
            if meta:
                if meta.get("mappings"):
                    body["mappings"] = meta["mappings"]
                if meta.get("settings"):
                    body["settings"] = meta["settings"]
            else:
                log.g().w(f"RESTORE: no index metadata for {index_name}, recreating with dynamic mappings")
            await conn.indices.create(index=index_name, **body)

            handle = await asyncio.to_thread(file.open, "r", encoding="utf-8")
            try:
                while True:
                    actions = await asyncio.to_thread(self._read_hits, handle, index_name, CONSTANTS.BACKUP_BATCH_SIZE)
                    if not actions:
                        break
                    await es_helpers.async_bulk(conn, actions)
            finally:
                await asyncio.to_thread(handle.close)

    @staticmethod
    def _read_hits(handle, index_name: str, limit: int) -> list:
        actions = []
        for line in handle:
            line = line.strip()
            if line:
                hit = json.loads(line)
                actions.append({
                    "_op_type": "index",
                    "_index": index_name,
                    "_id": hit.get("_id"),
                    "_source": hit.get("_source", {}),
                })
            if len(actions) >= limit:
                break
        return actions

    def _restore_folder(self, source: Path, destination: Path):
        if not source.exists():
            return
        shutil.rmtree(destination, ignore_errors=True)
        shutil.copytree(source, destination, dirs_exist_ok=True)
