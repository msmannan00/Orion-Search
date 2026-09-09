import base64
import binascii
import hashlib
import re
import secrets
from urllib.parse import parse_qs, urlparse
from datetime import UTC, datetime
from typing import Any

import httpx
import jwt
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from configs.auth_cookie import token_from_request
from orion.constants.constant import CONSTANTS
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX
from orion.services.mongo_manager.mongo_controller import mongo_controller
from orion.helper_manager.env_handler import env_handler
from orion.services.mongo_manager.shared_model.db_social_model import SOCIAL_COLLECTION, social_profile, social_profile_config



class social_model:
    __instance = None
    SOCIAL_IMAGE_MAX_BYTES = 10 * 1024 * 1024
    SOCIAL_IMAGE_MAX_BASE64_LENGTH = ((SOCIAL_IMAGE_MAX_BYTES + 2) // 3) * 4
    INT64_MIN = -(2 ** 63)
    INT64_MAX = 2 ** 63 - 1

    @staticmethod
    def _is_unstorable_int(value):
        return isinstance(value, int) and not isinstance(value, bool) and not (social_model.INT64_MIN <= value <= social_model.INT64_MAX)

    @staticmethod
    def _drop_unstorable_ints(value):
        if isinstance(value, dict):
            return {key: social_model._drop_unstorable_ints(item) for key, item in value.items() if not social_model._is_unstorable_int(item)}
        if isinstance(value, list):
            return [social_model._drop_unstorable_ints(item) for item in value if not social_model._is_unstorable_int(item)]
        return value

    @staticmethod
    def default_profile_config(_profiles: list[dict]) -> dict:
        return social_profile_config(disallowed=[]).model_dump(mode="json")

    @staticmethod
    def getInstance():
        if social_model.__instance is None:
            social_model.__instance = social_model()
        return social_model.__instance

    def __init__(self):
        self._engine = mongo_controller.get_instance().get_engine()

    @staticmethod
    def _recon_profile_details(item: dict) -> dict:
        followers = item.get("total_followers") or item.get("follower_count") or item.get("followers")
        details: dict[str, Any] = {
            "real_name": item.get("full_name") or item.get("name") or item.get("real_name"),
            "bio": item.get("description") or item.get("bio"),
            "location": item.get("location"),
            "profile_url": item.get("url") or item.get("profile_url"),
            "total_posts": item.get("total_posts") or item.get("post_count"),
            "total_followers": followers,
            "total_likes": item.get("total_likes") or item.get("like_count"),
        }
        return {key: str(value) for key, value in details.items() if value}

    @staticmethod
    def _recon_meta(item: dict, metadata: dict, ids: dict, profile_username: str) -> dict:
        platform = str(item.get("platform") or metadata.get("platform") or "")
        values = {
            "platform": platform,
            "username": str(item.get("username") or metadata.get("username") or metadata.get("social_handle") or profile_username or ""),
            "url": str(item.get("url") or metadata.get("url") or ""),
            "target_type": item.get("target_type") or metadata.get("target_type"),
            "entity_type": item.get("entity_type") or metadata.get("entity_type"),
            "status": item.get("status") or metadata.get("status") or "active",
            "timestamp": item.get("timestamp") or metadata.get("timestamp"),
            "description": item.get("description") or item.get("bio") or ids.get("bio") or ids.get("description"),
            "avatar": item.get("avatar") or metadata.get("avatar"),
        }
        return {key: value for key, value in values.items() if value}

    @staticmethod
    def flatten_recon_profile(item: dict, profile_username: str) -> dict:
        if not isinstance(item, dict):
            return item
        if isinstance(item.get("meta"), dict):
            try:
                return social_profile.model_validate(item).model_dump(mode="json")
            except Exception:
                return item

        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        raw_data = item.get("data")
        data = raw_data if isinstance(raw_data, dict) else {}
        if not item.get("platform") and not metadata and "platform" not in item:
            return item

        platform_profile = data.get("platform_profile")
        ids = platform_profile.get("ids") if isinstance(platform_profile, dict) else None
        if not isinstance(ids, dict):
            raw_ids = data.get("ids")
            ids = raw_ids if isinstance(raw_ids, dict) else {}

        built = {"meta": social_model._recon_meta(item, metadata, ids, profile_username)}
        details = item.get("profile_details") if isinstance(item.get("profile_details"), dict) else None
        if not details:
            details = item.get("profileDetails") if isinstance(item.get("profileDetails"), dict) else None
        if not details:
            details = social_model._recon_profile_details({**ids, **item})
        if details:
            built["profile_details"] = details
        for key in ("resources", "online_presence", "stealer_logs", "wanted", "wanted_query", "exposure_signals", "phone_lookup"):
            if item.get(key) is not None:
                built[key] = item.get(key)
        try:
            return social_profile.model_validate(built).model_dump(mode="json")
        except Exception:
            return built

    @staticmethod
    def _document_payload(record: dict) -> dict:
        profiles = record.get("profiles")
        if not isinstance(profiles, list):
            profiles = []
            legacy_profile = record.get("profile")
            if isinstance(legacy_profile, dict):
                profiles = [legacy_profile]
        profile_username = record.get("profile_username") or record.get("root_username") or ""
        profiles = [social_model.flatten_recon_profile(item, profile_username) for item in profiles if isinstance(item, dict)]
        raw_config = dict(record.get("config")) if isinstance(record.get("config"), dict) else {}
        raw_config.pop("allowed", None)
        try:
            config = social_profile_config.model_validate(raw_config).model_dump(mode="json")
        except Exception:
            config = social_profile_config().model_dump(mode="json")
        return {
            "user_id": record.get("user_id"),
            "profile_username": profile_username,
            "profiles": profiles,
            "config": config,
            "count": len(profiles),
            "status": record.get("status"),
            "scan_progress": record.get("scan_progress"),
            "scan_step": record.get("scan_step"),
            "updated_at": record.get("updated_at"),
        }

    @staticmethod
    def _social_hash_id(platform: str, stable_id: str) -> str:
        return hashlib.sha256("|".join([platform or "", stable_id or "", "", "", ""]).encode("utf-8")).hexdigest()

    @staticmethod
    def _social_api_base_urls() -> list[str]:
        configured = env_handler.get_instance().env("ORION_SOCIAL_API_BASE_URL") or ""
        url = str(configured).strip().rstrip("/")
        return [url] if url else []

    @classmethod
    def _social_headers(cls, current_user=None, request=None) -> dict[str, str]:
        headers: dict[str, str] = {}
        internal_token = env_handler.get_instance().env("ORION_SOCIAL_INTERNAL_TOKEN")
        if internal_token:
            headers["X-Orion-Internal-Token"] = internal_token

        if current_user is not None:
            headers["X-Orion-User"] = str(getattr(current_user, "username", "") or "")
            headers["X-Orion-User-Id"] = str(getattr(current_user, "id", "") or "")
            headers["X-Orion-Tenant-Id"] = str(getattr(current_user, "tenant_uuid", "") or "")

        token = token_from_request(request) if request is not None else ""
        if token:
            try:
                payload = jwt.decode(token, CONSTANTS.S_AUTH_SECRET_KEY, algorithms=[CONSTANTS.S_AUTH_ALGORITHM], options={"verify_exp": True})
                session_id = str(payload.get("sid") or "")
                client = str(payload.get("client") or "web")
                if session_id:
                    headers["X-Orion-Session-Id"] = session_id
                if client:
                    headers["X-Orion-Session-Client"] = client
            except jwt.InvalidTokenError:
                pass
        return {key: value for key, value in headers.items() if value}

    @classmethod
    def _normalize_social_cursor(cls, payload: dict, key: str) -> dict:
        if key not in {"posts", "videos", "shorts"}:
            return payload
        hash_id = str(payload.get("hash_id") or "").strip()
        if not hash_id or (len(hash_id) == 64 and all(char in "0123456789abcdefABCDEF" for char in hash_id)):
            return payload
        if "://" not in hash_id:
            return payload
        normalized_payload = dict(payload)
        normalized_payload["hash_id"] = cls._social_hash_id(str(payload.get("platform") or "").lower(), hash_id)
        return normalized_payload

    @classmethod
    def _merge_profile_documents(cls, rows: list[dict]) -> list[dict]:
        merged: dict[str, dict] = {}
        for row in rows:
            payload = cls._document_payload(row)
            profile_username = (payload.get("profile_username") or "").strip().lstrip("@").lower()
            if not profile_username:
                continue
            current = merged.setdefault(profile_username, {
                "user_id": payload.get("user_id"),
                "profile_username": profile_username,
                "profiles": [],
                "config": {
                    **{key: value for key, value in (payload.get("config") or {}).items() if key != "disallowed"},
                    "disallowed": [],
                },
                "count": 0,
                "status": payload.get("status"),
                "scan": cls._scan_status(payload),
                "updated_at": payload.get("updated_at"),
            })
            current["profiles"].extend(payload.get("profiles") or [])
            disallowed_ids = set(current["config"]["disallowed"])
            for profile_id in (payload.get("config") or {}).get("disallowed", []):
                if profile_id not in disallowed_ids:
                    current["config"]["disallowed"].append(profile_id)
                    disallowed_ids.add(profile_id)
            current["count"] = len(current["profiles"])
            updated_at = payload.get("updated_at")
            if updated_at and (not current.get("updated_at") or updated_at > current["updated_at"]):
                current["updated_at"] = updated_at
                current["status"] = payload.get("status")
                current["scan"] = cls._scan_status(payload)
        return sorted(merged.values(), key=lambda item: item.get("updated_at") or datetime.min.replace(tzinfo=UTC), reverse=True)

    @staticmethod
    def _scan_status(payload: dict) -> dict:
        return {"status": payload.get("status"), "progress": int(payload.get("scan_progress") or 0), "step": str(payload.get("scan_step") or "")}

    async def social_request(self, payload: Any, key: str, headers: dict[str, str]) -> tuple[int, Any]:
        last_error = ""
        for base_url in self._social_api_base_urls():
            try:
                async with httpx.AsyncClient() as client:
                    if isinstance(payload, dict) and "file_bytes" in payload:
                        response = await client.post(
                            f"{base_url.rstrip('/')}/{f'social/{key}'.lstrip('/')}",
                            files={"file": (payload["filename"], payload["file_bytes"], "application/octet-stream")},
                            headers=headers,
                            timeout=120,
                        )
                    else:
                        response = await client.post(
                            f"{base_url.rstrip('/')}/{f'social/{key}'.lstrip('/')}",
                            json=payload,
                            headers=headers,
                            timeout=120,
                        )
                if response.status_code != 200:
                    return response.status_code, None
                return 200, response.json()
            except httpx.RequestError as exc:
                last_error = str(exc)
                continue
        return 0, last_error

    async def social_search(self, model, key: str, current_user=None, request=None) -> Any:
        headers = self._social_headers(current_user, request)
        payload = model.model_dump() if hasattr(model, "model_dump") else model
        payload = self._normalize_social_cursor(payload, key) if isinstance(payload, dict) else payload
        try:
            status_code, body = await self.social_request(payload, key, headers)
        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Failed to process social search"})
        if status_code == 200:
            return body
        if status_code == 0:
            return JSONResponse(status_code=502, content={"detail": "Social service unreachable", "error": body})
        return JSONResponse(status_code=status_code, content={"detail": "Social service request failed"})

    async def search_forum_profiles(self, param):
        query = (getattr(param, "query", "") or "").strip().lstrip("@").lower()
        if not query:
            return {"Result": [], "Total_Hits": 0}

        max_results = int(getattr(param, "max_results", 50) or 50)
        data_filter = {
            "size": max(1, min(max_results, 100)),
            "query": {
                "bool": {
                    "filter": [
                        {"term": {"m_platform": {"value": "forum", "case_insensitive": True}}}
                    ],
                    "should": [
                        {"term": {"m_sender_name": {"value": query, "case_insensitive": True, "boost": 6}}},
                        {"term": {"m_author": {"value": query, "case_insensitive": True, "boost": 5}}},
                        {"term": {"m_attacker": {"value": query, "case_insensitive": True, "boost": 4}}},
                        {"term": {"m_username": {"value": query, "case_insensitive": True, "boost": 4}}},
                        {"term": {"m_comments.m_username": {"value": query, "case_insensitive": True, "boost": 4}}},
                        {"match": {"m_sender_name": {"query": query, "operator": "and", "boost": 4}}},
                        {"match": {"m_author": {"query": query, "operator": "and", "boost": 3}}},
                        {"match": {"m_attacker": {"query": query, "operator": "and", "boost": 3}}},
                        {"match": {"m_username": {"query": query, "operator": "and", "boost": 3}}},
                        {"match": {"m_title": {"query": query, "operator": "and", "boost": 2}}},
                        {"match": {"m_content": {"query": query, "operator": "and"}}},
                    ],
                    "minimum_should_match": 1,
                }
            },
            "sort": [
                {"m_date": {"order": "desc", "unmapped_type": "date"}},
                {"m_creation_date": {"order": "desc", "unmapped_type": "date"}},
                {"_score": {"order": "desc"}},
            ],
        }

        success, documents = await elastic_controller.get_instance().search_query(ELASTIC_INDEX.S_SOCIAL_INDEX, data_filter)
        if not success:
            return {"Result": [], "Total_Hits": 0}

        body = documents.body if hasattr(documents, "body") else documents
        hits = (body or {}).get("hits", {}).get("hits", [])
        total = (body or {}).get("hits", {}).get("total", 0)
        total_hits = total.get("value", 0) if isinstance(total, dict) else int(total or 0)
        results = []
        for rank, hit in enumerate(hits, start=1):
            source = dict(hit.get("_source", {}) or {})
            source.pop("m_embedding", None)
            source["_id"] = hit.get("_id", "")
            source["_score"] = hit.get("_score", 0)
            source["_rank"] = rank
            source["rank_index"] = ELASTIC_INDEX.S_SOCIAL_INDEX
            results.append(source)

        return {"Result": results, "Total_Hits": total_hits}

    async def search_phone_recon(self, param, current_user=None, request=None):
        return await self.social_search(param, "phone", current_user, request)

    async def search_profile(self, param, current_user=None, request=None):
        payload = param.model_dump() if hasattr(param, "model_dump") else dict(param)
        if str(payload.get("command") or "") in {"crawl", "poll", "cancel"} or str(payload.get("type") or "") == "details":
            return await self._fetch_profile_via_extension(payload, current_user)
        return await self.social_search(param, "profile", current_user, request)

    async def _fetch_profile_via_extension(self, payload: dict, current_user=None):
        from orion.api.interactive.extension_manager.extension_socket_manager import extension_socket_manager

        user_key = str(getattr(current_user, "id", "") or "")
        crawl_type = str(payload.get("type") or "details")
        cursor = str(payload.get("cursor") or "").strip()
        if not user_key:
            return {"status": "pending"}

        platform_scope = re.sub(r"[^a-z0-9]", "", str(payload.get("platform") or "").lower())
        identity = (str(payload.get("username") or "").strip() or str(payload.get("url") or "").strip()).lower()
        profile_scope = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:12] if identity else ""
        result_scope = f"{platform_scope}:{profile_scope}:{crawl_type}:{cursor}" if cursor else f"{platform_scope}:{profile_scope}:{crawl_type}"

        manager = extension_socket_manager.get_instance()
        if str(payload.get("command") or "") == "cancel":
            await manager.cancel(user_key, result_scope)
            return {"status": "idle"}

        reply = await manager.take_result(user_key, result_scope)
        if reply is None:
            if str(payload.get("command") or "") == "poll":
                return {"status": "pending" if await manager.is_inflight(user_key, result_scope) else "idle"}
            if not await manager.has_live_socket(user_key):
                return {"status": "idle"}
            command = {"command": "crawl", "platform": payload.get("platform"), "type": crawl_type, "url": payload.get("url"), "username": payload.get("username"), "payload": {"url": payload.get("url"), "username": payload.get("username"), "cursor": cursor}}
            await manager.fire(user_key, command, result_scope)
            return {"status": "pending"}

        if reply.get("error"):
            return {"error": reply.get("error"), "login_url": reply.get("login_url")}
        items = (reply.get("items") if reply.get("implemented") else []) or []
        if crawl_type == "details":
            return {"result": {"profile": (items or [{}])[0]}}
        return {"result": {"items": items, "next_cursor": reply.get("next_cursor"), "has_more": bool(reply.get("has_more"))}}

    async def search_online_images(self, param, current_user=None, request=None):
        return await self.social_search(param, "online/images", current_user, request)

    async def search_followers(self, param, current_user=None, request=None):
        return await self.social_search(param, "followers", current_user, request)

    async def search_posts(self, param, current_user=None, request=None):
        return await self.social_search(param, "posts", current_user, request)

    async def search_videos(self, param, current_user=None, request=None):
        return await self.social_search(param, "videos", current_user, request)

    async def search_shorts(self, param, current_user=None, request=None):
        return await self.social_search(param, "shorts", current_user, request)

    async def search_entity(self, param, current_user=None, request=None):
        return await self.social_search(param, "entity", current_user, request)

    async def search_metadata(self, param, current_user=None, request=None):
        return await self.social_search(param, "metadata", current_user, request)

    async def extension_version(self):
        from orion.api.server.config_manager.config_controller import config_controller
        from orion.services.mongo_manager.shared_model.db_system_settings import AllowedKeys

        version = config_controller.getInstance().get(AllowedKeys.EXTENSION_VERSION.value, "") or ""
        return {"chrome": version, "firefox": version}

    def decode_image_payload(self, image_base64: Any) -> bytes:
        if not isinstance(image_base64, str):
            raise HTTPException(status_code=400, detail="Invalid image_base64")
        image_base64 = image_base64.strip()
        if image_base64.startswith("data:") and "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        if len(image_base64) > self.SOCIAL_IMAGE_MAX_BASE64_LENGTH:
            raise HTTPException(status_code=413, detail="Image too large! Maximum allowed size is 10 MB")

        try:
            file_bytes = base64.b64decode(image_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Invalid image_base64") from exc
        if len(file_bytes) > self.SOCIAL_IMAGE_MAX_BYTES:
            raise HTTPException(status_code=413, detail="Image too large! Maximum allowed size is 10 MB")
        return file_bytes

    async def append_social_profiles(self, user_id: str, profile_username: str, profiles: list[dict], config: dict | None = None, replace: bool = False):
        try:
            normalized_username = profile_username.strip().lstrip("@").lower()
            if not normalized_username:
                return JSONResponse(status_code=400, content={"detail": "profile_username is required"})
            if not isinstance(profiles, list):
                return JSONResponse(status_code=400, content={"detail": "profiles must be a list"})

            config_payload = None
            if config is not None:
                if not isinstance(config, dict):
                    return JSONResponse(status_code=400, content={"detail": "config must be an object"})
                try:
                    config_payload = social_profile_config.model_validate(config).model_dump(mode="json")
                    config_payload.pop("allowed", None)
                except Exception:
                    return JSONResponse(status_code=400, content={"detail": "Invalid social profile config"})

            now_utc = datetime.now(UTC)
            normalized_profiles = []
            for profile in profiles:
                if not isinstance(profile, dict):
                    continue
                shaped = social_model.flatten_recon_profile(profile, normalized_username)
                normalized_profiles.append(social_model._drop_unstorable_ints(shaped))

            update_doc = {
                "$setOnInsert": {
                    "user_id": user_id,
                    "profile_username": normalized_username,
                },
                "$set": {"updated_at": now_utc},
            }
            if normalized_profiles:
                if replace:
                    update_doc["$set"]["profiles"] = normalized_profiles
                else:
                    update_doc["$push"] = {"profiles": {"$each": normalized_profiles}}
                if config_payload is None:
                    profile_ids = [profile["id"] for profile in normalized_profiles if isinstance(profile.get("id"), str) and profile["id"]]
                    if replace:
                        default_config = social_model.default_profile_config(normalized_profiles)
                        update_doc["$set"]["config.disallowed"] = default_config["disallowed"]
                        update_doc["$unset"] = {"config.allowed": ""}
                    elif profile_ids:
                        update_doc["$pullAll"] = {"config.disallowed": profile_ids}
            if config_payload is not None:
                update_doc["$set"]["config"] = config_payload
            await self._engine.database[SOCIAL_COLLECTION].update_one(
                {"user_id": user_id, "profile_username": normalized_username},
                update_doc,
                upsert=True,
            )

            return {
                "user_id": user_id,
                "profile_username": normalized_username,
                "saved": len(normalized_profiles),
                "config": config_payload,
            }

        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Failed to save social profiles"})

    async def get_social_profiles(self, user_id: str, profile_username: str | None = None):
        try:
            collection = self._engine.database[SOCIAL_COLLECTION]
            query = {"user_id": user_id}
            normalized_username = (profile_username or "").strip().lstrip("@").lower()
            if normalized_username:
                query = {
                    "user_id": user_id,
                    "$or": [
                        {"profile_username": normalized_username},
                        {"root_username": normalized_username},
                    ],
                }
            rows = []
            cursor = collection.find(query).sort("updated_at", -1)
            async for row in cursor:
                rows.append(row)
            documents = self._merge_profile_documents(rows)
            if normalized_username:
                return documents[0] if documents else {"user_id": user_id, "profile_username": normalized_username, "profiles": [], "config": social_profile_config().model_dump(mode="json")}
            return {"result": documents}

        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Failed to fetch social profiles"})

    GRAPH_PEOPLE_IDS = {"followers", "following", "friends", "connections", "organizations", "contacts", "members", "subscribers"}

    @staticmethod
    def _graph_handle(value) -> str:
        text = str(value or "").strip()
        if not text:
            return ""
        if re.match(r"^https?://", text, re.IGNORECASE):
            try:
                parsed = urlparse(text)
                ids = parse_qs(parsed.query).get("id") or []
                if ids and str(ids[0]).strip():
                    return str(ids[0]).strip().lower()
                segments = [segment for segment in parsed.path.split("/") if segment]
                return (segments[-1] if segments else "").strip().lstrip("@").lower()
            except Exception:
                return ""
        return text.lstrip("@").rstrip("/").lower()

    @classmethod
    def _graph_person_handle(cls, item: dict) -> str:
        if not isinstance(item, dict):
            return ""
        raw = next((str(item.get(key) or "").strip() for key in ("handle", "screen_name", "acct", "username", "login", "author") if str(item.get(key) or "").strip()), "")
        url = next((str(item.get(key) or "").strip() for key in ("url", "media_url", "profile_url") if str(item.get(key) or "").strip()), "")
        if raw and not re.search(r"\s", raw):
            return cls._graph_handle(raw)
        return cls._graph_handle(url) or cls._graph_handle(raw)

    async def get_graph_data(self, user_id: str, usernames: list[str], priority: list[str], limit: int = 200):
        response = await self.get_social_profiles(user_id)
        documents = response.get("result") if isinstance(response, dict) else None
        if not isinstance(documents, list):
            return response
        limit = max(1, min(int(limit or 200), 500))
        requested = {self._graph_handle(username) for username in usernames if self._graph_handle(username)}
        pinned = set(requested) | {self._graph_handle(handle) for handle in priority if self._graph_handle(handle)}
        by_owner = {str(document.get("profile_username") or "").strip().lstrip("@").lower(): document for document in documents if isinstance(document, dict)}
        for owner in requested:
            for profile in (by_owner.get(owner) or {}).get("profiles") or []:
                alias = self._graph_handle((profile.get("meta") or {}).get("username")) if isinstance(profile, dict) else ""
                if alias:
                    pinned.add(alias)
        owners_by_handle: dict[str, set[str]] = {}
        for owner in requested:
            for profile in (by_owner.get(owner) or {}).get("profiles") or []:
                for collection in (profile.get("resources") if isinstance(profile, dict) else None) or []:
                    if str(collection.get("id") or "").lower() not in self.GRAPH_PEOPLE_IDS:
                        continue
                    for item in collection.get("resources") or []:
                        handle = self._graph_person_handle(item)
                        if handle:
                            owners_by_handle.setdefault(handle, set()).add(owner)
        trimmed = []
        for document in documents:
            if not isinstance(document, dict):
                continue
            owner = str(document.get("profile_username") or "").strip().lstrip("@").lower()
            profiles_out = []
            for profile in document.get("profiles") or []:
                if not isinstance(profile, dict):
                    continue
                resources_out = []
                for collection in profile.get("resources") or []:
                    items = collection.get("resources") or []
                    if str(collection.get("id") or "").lower() not in self.GRAPH_PEOPLE_IDS or len(items) <= limit:
                        resources_out.append(collection)
                        continue
                    first, second, rest = [], [], []
                    for item in items:
                        handle = self._graph_person_handle(item)
                        if handle and handle in pinned:
                            first.append(item)
                        elif handle and (owners_by_handle.get(handle, set()) - {owner}):
                            second.append(item)
                        else:
                            rest.append(item)
                    keep = (first + second)[:limit]
                    remaining = limit - len(keep)
                    if remaining > 0 and rest:
                        keep = keep + secrets.SystemRandom().sample(rest, min(remaining, len(rest)))
                    resources_out.append({**collection, "resources": keep, "trimmed_from": len(items)})
                profiles_out.append({**profile, "resources": resources_out})
            trimmed.append({**document, "profiles": profiles_out})
        return {"result": trimmed}

    async def search_connections(self, user_id: str, profile_username: str, platform: str = "", query: str = "", limit: int = 500, post_url: str = ""):
        document = await self.get_social_profiles(user_id)
        documents = document.get("result") if isinstance(document, dict) else None
        if not isinstance(documents, list):
            return {"result": {"items": [], "total": 0}}
        needle = (query or "").strip().lstrip("@").lower()
        platform_key = (platform or "").strip().lower()
        username_key = (profile_username or "").strip().lstrip("@").lower()
        post_url_key = (post_url or "").strip().rstrip("/")
        fields = ("author", "name", "username", "handle", "screen_name", "acct", "login", "url", "caption")
        matches = []
        for doc in documents:
            for profile in doc.get("profiles") or []:
                meta = profile.get("meta") or {}
                if platform_key and str(meta.get("platform", "")).lower() != platform_key:
                    continue
                if username_key and str(meta.get("username", "")).strip().lstrip("@").lower() != username_key:
                    continue
                for collection in profile.get("resources") or []:
                    if collection.get("id") != "connections":
                        continue
                    for item in collection.get("resources") or []:
                        if post_url_key and str(item.get("parent_url") or "").strip().rstrip("/") != post_url_key:
                            continue
                        if not needle:
                            matches.append(item)
                            continue
                        haystack = " ".join(str(item.get(field, "")) for field in fields).lower()
                        if needle in haystack:
                            matches.append(item)
        capped = max(1, min(int(limit or 500), 1000))
        return {"result": {"items": matches[:capped], "total": len(matches)}}

    async def delete_social_profiles(self, user_id: str, profile_username: str):
        try:
            normalized_username = profile_username.strip().lstrip("@").lower()
            result = await self._engine.database[SOCIAL_COLLECTION].delete_many({
                "user_id": user_id,
                "$or": [
                    {"profile_username": normalized_username},
                    {"root_username": normalized_username},
                ],
            })
            return {"profile_username": normalized_username, "deleted": result.deleted_count}

        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Failed to delete social profile data"})
