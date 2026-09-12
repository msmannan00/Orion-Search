import json
from contextlib import suppress
from datetime import datetime

from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX
from orion.management.models.insight_model_comparison import InsightComparisonModel
from orion.services.log_manager.log_controller import log
from orion.services.redis_manager.redis_controller import redis_controller
from orion.services.redis_manager.redis_enums import REDIS_COMMANDS, REDIS_KEYS
from orion.management.jobs.insight_generator import insight_generator
from orion.services.elastic_manager.elastic_controller import elastic_controller


HOMEPAGE_DISPLAY_DATE_FORMAT = "%B %d, %Y"


class homepage_manager:
    __instance = None

    @staticmethod
    def getInstance():
        if homepage_manager.__instance is None:
            homepage_manager.__instance = homepage_manager()
        return homepage_manager.__instance

    @staticmethod
    async def invoke_analytics():
        results = await redis_controller.getInstance().invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [REDIS_KEYS.INSIGHT_STAT, InsightComparisonModel().model_dump_json(), None])
        if not results:
            log.g().ex("Error: No data retrieved from Redis")
            return None

        try:
            parsed_results = json.loads(results)
            validated_results = InsightComparisonModel.model_validate(parsed_results)

            return validated_results
        except json.JSONDecodeError as ex:
            log.g().ex(f"JSON Decode Error: {ex}")
            return None

    @staticmethod
    async def insight_consolidated_result():
        redis_instance = redis_controller.getInstance()
        redis_key = f"{REDIS_KEYS.APP_INSIGHT_KEY}"
        cached = await redis_instance.invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [redis_key, None, None])
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                pass

        indices, queries = insight_generator().on_insight_consolidated_data()
        responses = await elastic_controller.get_instance().search_consolidated_queries(indices, queries)

        leak_hits = []
        chat_hits = []
        exploit_hits = []
        general_hits = []
        defacement_hits = []

        for index, res in zip(indices, responses):
            hits = res.get("hits", {}).get("hits", []) if res else []

            if index == "leak_model":
                leak_hits = hits
            elif index == "chat_model":
                chat_hits = hits
            elif index == "exploit_model":
                exploit_hits = hits
            elif index == "generic_model":
                general_hits = hits
            elif index == "defacement_model":
                defacement_hits = hits

        display_data = {"leak_model": [homepage_manager.transform_for_display("leak_model", hit["_source"]) for hit in
            leak_hits if "m_hash" in hit.get("_source", {})], "exploit_model": [
            homepage_manager.transform_for_display("exploit_model", hit["_source"]) for hit in exploit_hits if
            "m_hash" in hit.get("_source", {})], "chat_model": [
            homepage_manager.transform_for_display("chat_model", hit["_source"]) for hit in chat_hits if
            "m_hash" in hit.get("_source", {})], "generic_model": [
            homepage_manager.transform_for_display("generic_model", hit["_source"]) for hit in general_hits if
            "m_hash" in hit.get("_source", {})], "defacement_model": [
            homepage_manager.transform_for_display("defacement_model", hit["_source"]) for hit in defacement_hits if
            "m_hash" in hit.get("_source", {})], }

        await redis_instance.invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [redis_key, json.dumps(display_data), 300])

        return display_data

    @staticmethod
    async def get_country_specific_insights():
        redis_instance = redis_controller.getInstance()
        redis_key = f"{REDIS_KEYS.APP_INSIGHT_KEY}:country_v1"
        cached = await redis_instance.invoke_trigger(REDIS_COMMANDS.S_GET_STRING, [redis_key, None, None])
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                pass

        indices, query = insight_generator().on_insight_consolidated_country()
        queries = [query.copy() for _ in indices]
        responses = await elastic_controller.get_instance().search_consolidated_queries(indices, queries)

        grouped_results = {
            "leak": [],
            "generic": [],
            "exploit": [],
            "chat": [],
            "social": [],
            "defacement": []
        }

        for index_name, response in zip(indices, responses):
            hits = response.get("hits", {}).get("hits", []) if response else []
            sources = [homepage_manager._country_only_payload(hit.get("_source", {}))
                for hit in hits if hit.get("_source", {}).get("m_country")]

            if index_name == ELASTIC_INDEX.S_LEAK_INDEX:
                grouped_results["leak"] = sources
            elif index_name == ELASTIC_INDEX.S_GENERIC_INDEX:
                grouped_results["generic"] = sources
            elif index_name == ELASTIC_INDEX.S_EXPLOIT_INDEX:
                grouped_results["exploit"] = sources
            elif index_name == ELASTIC_INDEX.S_CHATS_INDEX:
                grouped_results["chat"] = sources
            elif index_name == ELASTIC_INDEX.S_SOCIAL_INDEX:
                grouped_results["social"] = sources
            elif index_name == ELASTIC_INDEX.S_DEFACEMENT_INDEX:
                grouped_results["defacement"] = sources

        await redis_instance.invoke_trigger(REDIS_COMMANDS.S_SET_STRING, [redis_key, json.dumps(grouped_results), 86400])
        return grouped_results

    @staticmethod
    async def get_country_specific_insights_paginated(category: str, country: str, page: int = 1, limit: int = 20):
        all_country_insights = await homepage_manager.get_country_specific_insights()
        category_key = (category or "").strip().lower()
        country_key = (country or "").strip().lower()

        if not category_key or not country_key:
            return {"items": [], "total": 0, "page": page, "limit": limit, "has_more": False}

        category_items = all_country_insights.get(category_key, []) if isinstance(all_country_insights, dict) else []
        filtered_items = [
            item for item in category_items
            if homepage_manager._country_matches(item.get("m_country", []), country_key)
        ]

        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_items = filtered_items[start_index:end_index]
        page_hashes = [item.get("m_hash") for item in paginated_items if item.get("m_hash")]
        items = await homepage_manager._resolve_country_items(category_key, page_hashes, paginated_items)
        total = len(filtered_items)

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": end_index < total
        }

    @staticmethod
    async def _resolve_country_items(category_key: str, page_hashes: list[str], fallback_items: list[dict]) -> list[dict]:
        index_name = homepage_manager._country_category_to_index(category_key)
        if not index_name or not page_hashes:
            return fallback_items

        query = {
            "size": len(page_hashes),
            "query": {
                "bool": {
                    "must": [
                        {"terms": {"m_hash": page_hashes}}
                    ]
                }
            },
            "track_total_hits": False
        }

        responses = await elastic_controller.get_instance().search_consolidated_queries([index_name], [query])
        hits = responses[0].get("hits", {}).get("hits", []) if responses and responses[0] else []
        source_by_hash = {
            hit.get("_source", {}).get("m_hash"): hit.get("_source", {})
            for hit in hits if hit.get("_source", {}).get("m_hash")
        }

        ordered_sources = [source_by_hash[h] for h in page_hashes if h in source_by_hash]
        return ordered_sources if ordered_sources else fallback_items

    @staticmethod
    def _country_category_to_index(category_key: str) -> str | None:
        mapping = {
            "leak": ELASTIC_INDEX.S_LEAK_INDEX,
            "generic": ELASTIC_INDEX.S_GENERIC_INDEX,
            "exploit": ELASTIC_INDEX.S_EXPLOIT_INDEX,
            "apt": ELASTIC_INDEX.S_APT_INDEX,
            "chat": ELASTIC_INDEX.S_CHATS_INDEX,
            "social": ELASTIC_INDEX.S_SOCIAL_INDEX,
            "defacement": ELASTIC_INDEX.S_DEFACEMENT_INDEX,
        }
        return mapping.get(category_key)

    @staticmethod
    def _country_only_payload(source: dict) -> dict:
        country_value = source.get("m_country", [])
        if isinstance(country_value, str):
            countries = [country_value]
        elif isinstance(country_value, list):
            countries = [str(value) for value in country_value if value]
        else:
            countries = []
        return {"m_country": countries, "m_hash": source.get("m_hash")}

    @staticmethod
    def _country_matches(country_values: list | str, country_key: str) -> bool:
        values = country_values if isinstance(country_values, list) else [country_values]
        for value in values:
            if not value:
                continue
            parts = [part.strip().lower() for part in str(value).split(",") if part.strip()]
            if country_key in parts:
                return True
        return False

    @staticmethod
    def transform_for_display(model_key: str, item: dict) -> dict:

        m_hash = item["m_hash"] or item.get("m_message_id")

        title = item.get("m_title") or item.get("m_name") or item.get("m_caption") or item.get("m_url") or "Untitled"
        display_title = title if len(title) > 20 else title

        date_fields = ["m_update_date", "m_date"]
        raw_date = next((item.get(f) for f in date_fields if item.get(f)), None)

        display_date = homepage_manager.parse_date_fallback(raw_date)

        locations = []
        phoneNumbers = []
        urls = []
        if model_key == "defacement_model" and item.get("m_location"):
            if isinstance(item["m_location"], list):
                locations = item["m_location"]
            elif isinstance(item["m_location"], str):
                locations = [loc.strip() for loc in item["m_location"].split(",")]
        elif model_key == "leak_model":
            if item.get("m_country_name"):
                if isinstance(item["m_country_name"], str):
                    locations = [loc.strip() for loc in item["m_country_name"].split(",")]

        location_summary = ", ".join(locations)
        location_summary = location_summary if len(location_summary) > 24 else location_summary

        phoneNumber = phoneNumbers if len(phoneNumbers) > 24 else phoneNumbers

        if "m_url" in item:
            urls.append(item["m_url"])

        source = "-"
        if model_key == "defacement_model":
            if isinstance(item.get("m_attacker"), list) and item["m_attacker"]:
                source = ", ".join(item["m_attacker"])
            elif item.get("m_team"):
                source = item["m_team"]
        elif model_key in ["exploit_model", "chat_model", "leak_model", "generic_model"]:
            for key in ["m_sender_name", "m_network", "m_company_name", "m_channel_name"]:
                if item.get(key):
                    source = item[key]
                    break

        return {"title": display_title, "date": display_date, "location": location_summary, "phoneNumber": phoneNumber, "url": urls, "source": source, "hash": m_hash, }

    @staticmethod
    def parse_date_fallback(raw_date: str) -> str | None:
        formats = ["%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S.%fZ"]
        for fmt in formats:
            with suppress(ValueError):
                dt = datetime.strptime(raw_date, fmt)
                return dt.strftime(HOMEPAGE_DISPLAY_DATE_FORMAT)
        return None
