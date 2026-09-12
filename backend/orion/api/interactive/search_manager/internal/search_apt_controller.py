from orion.api.interactive.search_manager.search_data_model.consolidated.search_consolidated_param_model import search_consolidated_param_model
from orion.api.interactive.search_manager.search_manager import search_manager
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX


class search_apt_controller:
    __instance = None
    GROUP_PAGE_SIZE = 100
    GROUP_RECORD_LIMIT = 5
    RAW_GROUP_MULTIPLIER = 10
    RAW_FETCH_MAX = 5000

    @staticmethod
    def getInstance():
        if search_apt_controller.__instance is None:
            search_apt_controller.__instance = search_apt_controller()
        return search_apt_controller.__instance

    def __init__(self):
        if search_apt_controller.__instance is None:
            search_apt_controller.__instance = self

    @staticmethod
    def _date_value(item):
        return item.get("m_date") or item.get("m_first_seen") or item.get("m_last_seen") or item.get("m_update_date") or item.get("m_creation_date") or ""

    @staticmethod
    def _to_list(value):
        if isinstance(value, list):
            return value
        return [] if value in (None, "") else [value]

    @staticmethod
    def _normalize_group_key(value):
        return " ".join(str(value or "unknown").strip().lower().split())

    @staticmethod
    def _minimal_record(item):
        allowed_fields = (
            "_id",
            "rank_index",
            "m_hash",
            "m_title",
            "m_team",
            "m_attacker",
            "m_family",
            "m_aliases",
            "m_signature",
            "m_file_name",
            "m_file_type",
            "m_file_type_mime",
            "m_sha256_hash",
            "m_sha1_hash",
            "m_md5_hash",
            "m_url",
            "m_base_url",
            "m_source_url",
            "m_reporter",
            "m_date",
            "m_first_seen",
            "m_last_seen",
            "m_update_date",
            "m_creation_date",
            "m_ioc_type",
            "m_ip",
            "m_web_server",
            "m_country",
            "m_origin_country",
            "m_platform",
            "m_references",
            "m_tags",
        )
        return {
            field: item.get(field)
            for field in allowed_fields
            if item.get(field) not in (None, "", [])
        }

    def _group_title(self, item):
        if item.get("rank_index") == ELASTIC_INDEX.S_DEFACEMENT_INDEX:
            attackers = self._to_list(item.get("m_attacker"))
            return item.get("m_team") or (attackers[0] if attackers else None) or item.get("m_url") or item.get("m_base_url") or "Unknown actor"
        if item.get("rank_index") == ELASTIC_INDEX.S_MALWARE_INDEX:
            return item.get("m_signature") or item.get("m_family") or item.get("m_file_name") or item.get("m_title") or "Unknown malware"
        aliases = self._to_list(item.get("m_aliases"))
        return item.get("m_family") or item.get("m_title") or (aliases[0] if aliases else None) or "Unknown actor"

    def _group_key(self, item):
        return self._normalize_group_key(self._group_title(item))

    def _group_page(self, results, page):
        groups = {}
        for item in results:
            key = self._group_key(item)
            record_date = self._date_value(item)
            group = groups.setdefault(key, {"records": [], "latest": "", "count": 0})
            group["records"].append(item)
            group["count"] += 1
            if str(record_date) > str(group["latest"]):
                group["latest"] = record_date

        ordered_groups = sorted(groups.items(), key=lambda entry: (str(entry[1]["latest"]), entry[1]["count"]), reverse=True)
        start = max(0, (page - 1) * self.GROUP_PAGE_SIZE)
        selected_keys = {key for key, _ in ordered_groups[start:start + self.GROUP_PAGE_SIZE]}
        page_results = []
        for key, group in ordered_groups[start:start + self.GROUP_PAGE_SIZE]:
            if key not in selected_keys:
                continue
            page_results.extend(
                self._minimal_record(item)
                for item in sorted(group["records"], key=self._date_value, reverse=True)[:self.GROUP_RECORD_LIMIT]
            )
        return sorted(page_results, key=self._date_value, reverse=True), len(ordered_groups), len(selected_keys)

    async def search_result(self, param: search_consolidated_param_model):
        route_category = (param.category or "all").lower()
        content_category = (param.content or "all").lower()
        content_filter_category = content_category if content_category in {"apt", "malware", "malware-bazaar", "defacement"} else None
        category = content_filter_category or route_category
        if category == "apt":
            base_index = [ELASTIC_INDEX.S_APT_INDEX]
        elif category in {"malware", "malware-bazaar"}:
            base_index = [ELASTIC_INDEX.S_MALWARE_INDEX]
        elif category == "defacement":
            base_index = []
        else:
            base_index = [ELASTIC_INDEX.S_APT_INDEX, ELASTIC_INDEX.S_MALWARE_INDEX]

        search_param = param.model_copy(deep=True)
        try:
            requested_page = max(1, int(search_param.page or 1))
        except (TypeError, ValueError):
            requested_page = 1
        search_param.page = 1
        search_param.platform_result_count = min(
            max(requested_page * self.GROUP_PAGE_SIZE * self.RAW_GROUP_MULTIPLIER, self.GROUP_PAGE_SIZE),
            self.RAW_FETCH_MAX
        )
        search_param.category = "all"
        threat_response = {"Result": [], "Page_Count": 1, "Total_Hits": 0}
        if base_index:
            threat_response = await search_manager.getInstance().search_consolidated_ranked_result(search_param, base_index, [], [])
        include_defacement = category in ("all", "apt", "defacement") if not content_filter_category else category == "defacement"
        if not include_defacement:
            results = sorted(threat_response.get("Result") or [], key=self._date_value, reverse=True)
            page_results, total_groups, selected_groups = self._group_page(results, requested_page)
            total_hits = int(threat_response.get("Total_Hits") or 0)
            page_count = (total_groups + self.GROUP_PAGE_SIZE - 1) // self.GROUP_PAGE_SIZE
            if total_hits > len(results) and selected_groups >= self.GROUP_PAGE_SIZE:
                page_count = max(page_count, requested_page + 1)
            return {
                "Result": page_results,
                "Page_Count": max(1, page_count),
                "Total_Hits": total_hits,
                "Total_Groups": total_groups,
            }

        defacement_param = search_param.model_copy(deep=True)
        defacement_param.content = "hacked"
        defacement_response = await search_manager.getInstance().search_consolidated_ranked_result(
            defacement_param, [ELASTIC_INDEX.S_DEFACEMENT_INDEX], [], [], "defacement")
        results = [
            *(threat_response.get("Result") or []),
            *(defacement_response.get("Result") or []),
        ]
        results = sorted(results, key=self._date_value, reverse=True)
        page_results, total_groups, selected_groups = self._group_page(results, requested_page)
        total_hits = int(threat_response.get("Total_Hits") or 0) + int(defacement_response.get("Total_Hits") or 0)
        page_count = (total_groups + self.GROUP_PAGE_SIZE - 1) // self.GROUP_PAGE_SIZE
        if total_hits > len(results) and selected_groups >= self.GROUP_PAGE_SIZE:
            page_count = max(page_count, requested_page + 1)
        return {
            "Result": page_results,
            "Page_Count": max(1, page_count),
            "Total_Hits": total_hits,
            "Total_Groups": total_groups,
        }
