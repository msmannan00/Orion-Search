import asyncio
import copy
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime, timezone
import builtins
from fastapi import HTTPException
from jinja2 import Environment
from jinja2 import FileSystemLoader
from urllib.parse import urlparse, urlunparse

from deep_translator import GoogleTranslator
from stopwords import get_stopwords

from orion.constants import constant
from orion.constants.constant import CONSTANTS, allowed_key_titles
from orion.helper_manager.env_handler import env_handler
from orion.services.elastic_manager.elastic_controller import elastic_controller
from orion.services.elastic_manager.elastic_enums import ELASTIC_ENUMS
from orion.services.log_manager.log_controller import log
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS, REDIS_KEYS


class helper_controller:
    __instance = None

    @staticmethod
    def parse_filters_json(json_str):
        try:
            data = json.loads(json_str)
            result = {}
            for item in data:
                category = item.get("categoryId")
                tags = item.get("tags", [])
                result[category] = tags
            return result
        except json.JSONDecodeError as e:
            print(f"Invalid JSON: {e}")
            return {}

    @staticmethod
    def extract_stealer_hash(stealer_log):
        email = stealer_log["email"][0] if stealer_log.get("email") else None
        username = stealer_log["username"][0] if stealer_log.get("username") else None
        domain = stealer_log["domain"][0] if stealer_log.get("domain") else None
        ip = stealer_log["ip"][0] if stealer_log.get("ip") else None
        channel = stealer_log.get("channel")

        if stealer_log.get("type") in ("c", "credential"):
            val = email or username
        else:
            val = email or username or domain or ip or channel

        if not val:
            return None

        seed = f"{val}|{channel or ''}"
        return hashlib.sha256(seed.lower().encode("utf-8", "ignore")).hexdigest()

    @staticmethod
    def get_base_url(url):
        parsed_url = urlparse(url)
        netloc = parsed_url.netloc.replace('www.', '') if parsed_url.netloc.startswith('www.') else parsed_url.netloc
        base_url = f"{parsed_url.scheme}://{netloc}"
        return base_url

    @staticmethod
    def getFilterClause(pfilter, p_query_model, allowed_keys):
        must_filter_clauses = []
        should_filter_clauses = []

        if pfilter:
            allowed_filtered = {
                k: (v if isinstance(v, list) else [v])
                for k, v in pfilter.items()
                if k in allowed_keys or k == "m_search_all"
            }
            clauses = []

            for k, vals in allowed_filtered.items():
                for val in vals:
                    fields = allowed_keys if k == "m_search_all" else [k]
                    clauses.append({
                        "bool": {
                            "should": (
                                    [{"term": {f: {"value": val, "case_insensitive": True}}} for f in fields] +
                                    [{"match": {f: val}} for f in fields] +
                                    [{"match_phrase": {f: val}} for f in fields] +
                                    [{"prefix": {f: val}} for f in fields]
                            ),
                            "minimum_should_match": 1
                        }
                    })

            if p_query_model.must:
                must_filter_clauses = clauses
            else:
                should_filter_clauses = {"bool": {"should": clauses}}

        return must_filter_clauses, should_filter_clauses

    @staticmethod
    def generate_data_hash(data):
        if isinstance(data, dict):
            data_copy = {key: value for key, value in data.items() if
                key not in {'m_update_date', 'm_base_url', 'm_url'}}
            data_string = json.dumps(data_copy, sort_keys=True)
        elif isinstance(data, str):
            data_string = data
        else:
            raise ValueError("Input must be a dictionary or a string")
        return hashlib.sha256(data_string.encode('utf-8')).hexdigest()

    @staticmethod
    def detect_and_translate(text: str, target_lang: str) -> str:
        try:
            translated_text = GoogleTranslator(source='auto', target=target_lang).translate(text[0:4500])
            return translated_text
        except Exception as e:
            return f"Error translating text: {str(e)}"

    @staticmethod
    def normalize_url(input_url):
        parsed = urlparse(input_url)
        normalized = parsed._replace(query='', fragment='')
        normalized_url = urlunparse(normalized).rstrip('/')
        return normalized_url

    @staticmethod
    def extract_user_mail_fields(data):
        return (
            (data.username or "").strip(),
            (data.email or "").strip().lower(),
            data.password,
        )

    @staticmethod
    def validate_company_email_domain(email: str, detail: str = "Please enter your company email (Gmail, Yahoo, etc. not allowed)."):
        NON_COMPANY_DOMAINS = {
            "gmail.com",
            "yahoo.com",
            "hotmail.com",
            "outlook.com",
            "proton.me",
            "protonmail.com",
            "mail.ru",
            "aol.com",
            "icloud.com",
            "msn.com",
            "live.com",
            "zoho.com",
            "gmx.com",
            "gmx.net",
            "yandex.com",
            "yandex.ru",
            "fastmail.com",
            "pm.me",
            "me.com",
            "mail.com",
            "inbox.com",
        }

        production = str(env_handler.get_instance().env("PRODUCTION", 0))
        if production != "1":
            return

        domain = (email or "").split("@")[-1].lower()
        if domain in NON_COMPANY_DOMAINS:
            raise HTTPException(status_code=400, detail=detail)

    @staticmethod
    def build_assets(build_dir):
        entities_file = build_dir / "assets" / "data" / "entities_data" / "entities.json"
        if not entities_file.exists():
            raise FileNotFoundError(f"entities.json not found at {entities_file}")

        with open(entities_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        allowed_key_titles.clear()
        for item in data:
            if "key" in item:
                allowed_key_titles[item["key"]] = item.get("title") or item["key"]
        ELASTIC_ENUMS.ioc_field_mapping = helper_controller.build_ioc_field_mapping_from_entities(data)

        mail_templete_env = Environment(
            loader=FileSystemLoader(build_dir / "assets" / "data" / "mail_template_data"),
            autoescape=True
        )
        constant.mail_template = mail_templete_env.get_template("mail_template.html")
        constant.alert_mail_template = mail_templete_env.get_template("alert_mail_template.html")
        license_rules_env = Environment(
            loader=FileSystemLoader(build_dir / "assets" / "data" / "licenses"),
            autoescape=True
        )
        license_rules_template = license_rules_env.get_template("license_rules.json")
        license_rules_json_str = license_rules_template.render()
        constant.license_rules = json.loads(license_rules_json_str)
        url_rules_env = Environment(
            loader=FileSystemLoader(build_dir / "assets" / "data" / "url_rules"),
            autoescape=True
        )
        url_rules_template = url_rules_env.get_template("url_rules.json")
        url_rules_json_str = url_rules_template.render()
        constant.url_rules = json.loads(url_rules_json_str)
        map_entities_env = Environment(
            loader=FileSystemLoader(build_dir / "assets" / "data" / "satellite"),
            autoescape=True
        )
        satellite_asset = map_entities_env.get_template(CONSTANTS.S_SATELLITE_ASSET_FILE_NAME).render()
        _, data = helper_controller.parse_satellite_asset(satellite_asset)
        constant.map_entities_data = data

    @staticmethod
    def build_ioc_field_mapping_from_entities(entities):
        mapping = {}
        for item in entities or []:
            if not isinstance(item, dict):
                continue
            key = str(item.get("key") or "").strip()
            if not key:
                continue
            raw_fields = item.get("fields") or [key]
            if isinstance(raw_fields, str):
                raw_fields = [raw_fields]
            fields = [str(field).strip() for field in raw_fields if str(field or "").strip()]
            mapping[key] = fields or [key]
        return mapping

    @staticmethod
    def parse_satellite_asset(asset_data):
        payload = json.loads(asset_data)
        if isinstance(payload, dict):
            version = int(payload.get("version") or 0)
            data = payload.get("data") or []
        else:
            version = 0
            data = payload
        return version, json.dumps(data)

    @staticmethod
    async def build_satellite_asset_if_needed(map_entities_file):
        version, data = helper_controller.parse_satellite_asset(map_entities_file.read_text(encoding="utf-8"))
        if version <= 0:
            log.g().w("Satellite asset version missing, indexing skipped")
            return False

        stored_version = await redis_controller.getInstance().invoke_trigger(
            REDIS_COMMANDS.S_GET_STRING, [REDIS_KEYS.SATELLITE_ASSET_VERSION, None, None])
        stored_version = int(stored_version or 0)

        constant.map_entities_data = data

        if stored_version and version <= stored_version:
            log.g().i(f"Satellite asset version {version} already indexed")
            return False

        await elastic_controller.get_instance().reindex_map_entities_data()
        await redis_controller.getInstance().invoke_trigger(
            REDIS_COMMANDS.S_SET_STRING, [REDIS_KEYS.SATELLITE_ASSET_VERSION, str(version), None])
        return True

    @staticmethod
    async def init_map_entities_task(build_dir):
        asyncio.create_task(helper_controller.init_map_entities(build_dir))

    @staticmethod
    async def init_map_entities(build_dir):
        if build_dir is None:
            log.g().w("Map entities build directory not configured, file watching disabled")
            return

        build_dir = Path(build_dir)
        map_entities_file = None
        map_entities_candidates = [
            build_dir / "assets" / "data" / "satellite" / CONSTANTS.S_SATELLITE_ASSET_FILE_NAME,
            build_dir.parent / "client" / "src" / "assets" / "data" / "satellite" / CONSTANTS.S_SATELLITE_ASSET_FILE_NAME,
        ]

        for candidate in map_entities_candidates:
            if candidate.exists():
                map_entities_file = candidate
                break

        if not map_entities_file:
            log.g().w("Map entities file not found, file watching disabled")
            return

        log.g().i(f"Loading map entities data from: {map_entities_file}")
        try:
            if await helper_controller.build_satellite_asset_if_needed(map_entities_file):
                log.g().i("Initial map entities data indexed successfully")
        except Exception as ex:
            log.g().e(f"Error during initial indexing: {str(ex)}")

        last_modified = map_entities_file.stat().st_mtime
        log.g().i(f"File watcher started for: {map_entities_file}")

        while True:
            try:
                await asyncio.sleep(5)
                if map_entities_file.exists():
                    current_modified = map_entities_file.stat().st_mtime
                    if current_modified > last_modified:
                        last_modified = current_modified
                        log.g().i(f"Detected change in {map_entities_file.name}, re-indexing...")
                        try:
                            await helper_controller.build_satellite_asset_if_needed(map_entities_file)
                        except Exception as ex:
                            log.g().e(f"Error during re-indexing: {str(ex)}")
            except Exception as ex:
                log.g().e(f"File watcher error: {str(ex)}")
                await asyncio.sleep(5)

    @staticmethod
    async def init_persona_posts_task(build_dir):
        asyncio.create_task(helper_controller.init_persona_posts(build_dir))

    @staticmethod
    async def init_persona_posts(build_dir):

        if build_dir is None:
            return

        build_dir = Path(build_dir)
        posts_file = None
        candidates = [
            build_dir / "assets" / "data" / "persona_posts" / "posts.json",
            build_dir.parent / "client" / "src" / "assets" / "data" / "persona_posts" / "posts.json",
        ]

        for candidate in candidates:
            if candidate.exists():
                posts_file = candidate
                break

        if not posts_file:
            log.g().w("Persona posts file not found, skipping dump.")
            return

        try:
            from orion.services.mongo_manager.mongo_controller import mongo_controller
            from orion.services.mongo_manager.shared_model.db_social_profile_management_model import db_persona_posts
            
            engine = mongo_controller.get_instance().get_engine()
            collection = engine.get_collection(db_persona_posts)

            count = await collection.count_documents({})
            if count > 0:
                log.g().i(f"Persona posts already dumped ({count} records). Skipping.")
                return

            log.g().i(f"Loading persona posts from: {posts_file} (This may take a minute...)")

            def load_json():
                with builtins.open(posts_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            
            data = await asyncio.to_thread(load_json)

            if not isinstance(data, list):
                log.g().e("Persona posts file is not a valid JSON array.")
                return

            log.g().i(f"Parsed {len(data)} persona post records. Inserting into MongoDB...")

            chunk_size = 500
            for i in range(0, len(data), chunk_size):
                chunk = data[i:i + chunk_size]
                await collection.insert_many(chunk)

            log.g().i("Successfully dumped persona posts to MongoDB.")
        except Exception as ex:
            log.g().e(f"Error during persona posts dump: {str(ex)}")

    @staticmethod
    def clone_model(model):
        return copy.deepcopy(model)

    @staticmethod
    def extract_first_email(text):
        match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        return match.group(0) if match else None

    @staticmethod
    def extract_domains_from_text(text: str) -> list[str]:
        url_regex = re.compile(
            r'(?:https?://)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:[/?]\S*)?', re.IGNORECASE)
        matches = url_regex.findall(text)
        domains = set()
        for match in matches:
            domain = match.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            domains.add(domain)
        return sorted(domains)

    @staticmethod
    def transform_query_match(query: str, matchtype: str) -> str:
        query = " ".join(query.strip().split())
        if not query or query.count('"') >= 2:
            return query
        if matchtype == "or":
            return query
        if matchtype == "and":
            return " ".join(f'"{t}"' for t in query.split())
        if matchtype == "full":
            return f'"{query}"'
        return query

    @staticmethod
    def remove_stopwords_from_string(text: str) -> str:
        stopword_set = set(get_stopwords("en"))

        additional_stopwords = {"was", "by", "were", "been", "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "shall", "should", "may", "might", "can", "could", "must", "i", "you", "he", "she", "it", "we",
            "they", "me", "him", "her", "them", "my", "your", "his", "its", "our", "their", "mine", "yours", "hers",
            "ours", "theirs", "this", "that", "these", "those", "here", "there", "where", "when", "why", "how", "also",
            "just", "still", "even", "yet", "so", "than", "then", "very", "too", "because", "while", "though",
            "although", "if", "unless", "until", "before", "after", "once", "again", "ever", "always", "sometimes",
            "often", "never", "each", "every", "any", "all", "some", "no", "none", "both", "either", "neither", "few",
            "several", "many", "much", "most", "more", "less", "lot", "lots", "such", "get", "got", "gets", "getting",
            "make", "makes", "made", "say", "says", "said", "go", "goes", "went", "gone", "see", "sees", "saw", "seen",
            "know", "knows", "knew", "known", "take", "takes", "took", "taken", "come", "comes", "came", "coming",
            "thing", "things", "something", "anything", "everything", "nothing"}

        stopword_set.update(additional_stopwords)

        quoted_phrases = re.findall(r'"([^"]+)"', text)
        unquoted_part = re.sub(r'"[^"]+"', '', text)

        tokens = unquoted_part.split()
        filtered_tokens = [token for token in tokens if token.lower() not in stopword_set]

        result_parts = ['"{}"'.format(p) for p in quoted_phrases] + filtered_tokens
        return ' '.join(result_parts)

    @staticmethod
    def parse_tagged_logic_query_for_iocs(query: str):
        query = query.replace("&&", " AND ").replace("||", " OR ")
        tokens = query.split()

        output = []
        current = []
        op = None

        for token in tokens:
            t = token.upper()
            if t in ("AND", "OR"):
                op = t
                continue

            if ":" not in token:
                continue

            tag, value = token.split(":", 1)
            node = {"tag": tag.strip(), "value": value.strip()}

            if op == "AND":
                if current:
                    last = current.pop()
                    current.append({"AND": [last, node]})
                else:
                    current.append(node)
            elif op == "OR":
                if current:
                    output.append(current)
                current = [node]
            else:
                current.append(node)

            op = None

        if output:
            return {"OR": [item for sub in output for item in sub] + current}
        return current[0] if len(current) == 1 else current

    @staticmethod
    def password_matches_schema(password: str, schema) -> bool:
        if not password:
            return False

        min_l = schema.minLength or 0
        max_l = schema.maxLength or 10_000

        if not (min_l <= len(password) <= max_l):
            return False

        if getattr(schema, "hasAlphabets", False):
            if not re.search(r"[a-zA-Z]", password):
                return False

        if getattr(schema, "hasNumbers", False):
            if not re.search(r"[0-9]", password):
                return False

        if getattr(schema, "hasSpecialChars", False):
            if not re.search(r"[^a-zA-Z0-9]", password):
                return False

        return True

    @staticmethod
    def threat_lens_sort_latest_and_limit_response(response, limit: int = 100):
        def coerce_date_timestamp(value):
            if not value:
                return 0

            if isinstance(value, datetime):
                parsed_date = value
            elif isinstance(value, str):
                raw_value = value.strip()
                if not raw_value:
                    return 0

                try:
                    if len(raw_value) == 10:
                        parsed_date = datetime.strptime(raw_value, "%Y-%m-%d").replace(
                            tzinfo=timezone.utc
                        )
                    else:
                        parsed_date = datetime.fromisoformat(
                            raw_value.replace("Z", "+00:00")
                        )
                except ValueError:
                    return 0
            else:
                return 0

            if parsed_date.tzinfo is None:
                parsed_date = parsed_date.replace(tzinfo=timezone.utc)

            return parsed_date.timestamp()

        def latest_document_timestamp(document):
            date_fields = ("m_date", "m_update_date", "m_creation_date")
            return max(
                coerce_date_timestamp(document.get(field))
                for field in date_fields
            )

        ranked_results = response.get("Result") or []

        ranked_results.sort(
            key=lambda document: (
                latest_document_timestamp(document),
                float(document.get("_score") or 0),
            ),
            reverse=True,
        )

        limited_results = ranked_results[:limit]

        for rank, item in enumerate(limited_results):
            item["_rank"] = rank + 1

        response["Result"] = limited_results
        response["Total_Hits"] = len(limited_results)
        response["Page_Count"] = 1 if limited_results else 0

        return response
