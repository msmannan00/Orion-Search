from orion.api.interactive.feeder_manager.feeder_manager import FeederManager
from orion.api.interactive.search_manager.search_data_model.consolidated.search_consolidated_param_model import search_consolidated_param_model
from orion.api.interactive.search_manager.search_query_generator import search_query_generator
from orion.services.elastic_manager.elastic_controller import elastic_controller


class search_defacement_controller:
    __instance = None
    GROUP_RECORD_LIMIT = 5

    @staticmethod
    def getInstance():
        if search_defacement_controller.__instance is None:
            search_defacement_controller.__instance = search_defacement_controller()
        return search_defacement_controller.__instance

    def __init__(self):
        if search_defacement_controller.__instance is None:
            search_defacement_controller.__instance = self

    @staticmethod
    def _crawl_lookup_url(item):
        source_url = item.get("m_source_url") or []
        if isinstance(source_url, list):
            source_url = source_url[0] if source_url else ""
        return item.get("m_base_url") or item.get("m_url") or source_url or ""

    @staticmethod
    def _minimal_record(item):
        allowed_fields = (
            "_id",
            "rank_index",
            "m_hash",
            "m_title",
            "m_team",
            "m_attacker",
            "m_url",
            "m_base_url",
            "m_source_url",
            "m_date",
            "m_update_date",
            "m_creation_date",
            "m_ioc_type",
            "m_ip",
            "m_web_server",
            "m_country",
            "m_platform",
        )
        return {
            field: item.get(field)
            for field in allowed_fields
            if item.get(field) not in (None, "", [])
        }

    @classmethod
    async def _add_crawl_status(cls, records):
        for item in records:
            crawl_status = await FeederManager.get_instance().get_value_crawl_status(
                "_defacement__values",
                cls._crawl_lookup_url(item),
            )
            item["m_crawl_status"] = crawl_status["status"]
            item["m_last_crawled_at"] = crawl_status["last_checked_at"]

    @staticmethod
    def _title(item):
        team = str(item.get("m_team") or "").strip()
        if team:
            return team

        attackers = item.get("m_attacker")
        if not isinstance(attackers, list):
            attackers = [] if attackers is None else [attackers]
        attackers = [str(attacker).strip() for attacker in attackers if str(attacker or "").strip()]
        if attackers:
            return ", ".join(attackers)

        url = str(item.get("m_url") or item.get("m_base_url") or "").strip()
        if url:
            return url.replace("https://", "").replace("http://", "")

        return "Unknown team"

    @staticmethod
    def _records(response):
        records = []
        if response and "hits" in response and "hits" in response["hits"]:
            for rank, hit in enumerate(response["hits"]["hits"]):
                source = hit.get("_source", {})
                source["_id"] = hit.get("_id", "")
                source.pop("m_embedding", None)
                source["rank_index"] = hit.get("_index")
                source["_score"] = hit.get("_score", 0)
                source["_rank"] = rank + 1
                records.append(source)

        total = 0
        if response and "hits" in response:
            total_field = response["hits"].get("total", 0)
            total = total_field.get("value", 0) if isinstance(total_field, dict) else int(total or 0)
        return records, total

    @classmethod
    def _build_groups(cls, records):
        groups = {}

        for item in records:
            title = cls._title(item)
            key = title.strip().lower() or "unknown-team"
            group = groups.setdefault(key, {
                "key": key,
                "title": title,
                "subtitle": "Team / actor group",
                "records": [],
                "record_count": 0,
                "affected_sites": 0,
                "ip_count": 0,
                "servers": [],
                "latest_seen": None,
            })
            group["records"].append(item)

        for group in groups.values():
            records_in_group = sorted(
                group["records"],
                key=lambda entry: str(entry.get("m_date") or entry.get("m_update_date") or entry.get("m_creation_date") or ""),
                reverse=True)
            sites = set()
            ips = set()
            servers = []
            for record in records_in_group:
                source_url = record.get("m_source_url") or []
                if isinstance(source_url, list):
                    source_url = source_url[0] if source_url else ""
                site = str(record.get("m_url") or record.get("m_base_url") or source_url or "").strip()
                if site:
                    sites.add(site)

                ips_value = record.get("m_ip")
                if not isinstance(ips_value, list):
                    ips_value = [] if ips_value is None else [ips_value]
                for ip in ips_value:
                    ip = str(ip or "").strip()
                    if ip:
                        ips.add(ip)

                servers_value = record.get("m_web_server")
                if not isinstance(servers_value, list):
                    servers_value = [] if servers_value is None else [servers_value]
                for server in servers_value:
                    server = str(server or "").strip()
                    if server and server not in servers:
                        servers.append(server)

            group["record_count"] = len(records_in_group)
            group["records"] = [cls._minimal_record(record) for record in records_in_group[:cls.GROUP_RECORD_LIMIT]]
            group["affected_sites"] = len(sites)
            group["ip_count"] = len(ips)
            group["servers"] = servers[:6]
            group["latest_seen"] = next(
                (record.get("m_date") or record.get("m_update_date") or record.get("m_creation_date") for record in records_in_group
                 if record.get("m_date") or record.get("m_update_date") or record.get("m_creation_date")),
                None)

        return sorted(
            groups.values(),
            key=lambda team_group: (str(team_group["latest_seen"] or ""), team_group["record_count"]),
            reverse=True)

    async def search_grouped_result(self, param: search_consolidated_param_model, base_index):
        filter_dict = param.entity_filter if param.entity_filter else {}
        content = str(param.content or "all").strip().lower()
        category = str(param.category or "all").strip().lower()
        allowed_content = ("hacked", "malicious_redirect", "malware_url", "open_directory", "phishing", "phishing_domain", "scam", "spam_url", "typosquatting", "databases")
        if content in ("", "all") and category in allowed_content:
            content = category
        if content not in allowed_content:
            content = "all"

        grouped_param = param.model_copy(deep=True)
        grouped_param.category = "all"
        grouped_param.content = content
        grouped_param.page = 1

        indices, query, indices_boost = search_query_generator().on_search_consolidated_ranked_data(
            grouped_param, filter_dict, base_index, [], [], "defacement")
        query["size"] = 1000
        query["from"] = 0
        query["sort"] = [
            {"m_date": {"order": "desc", "missing": "_last"}},
            {"m_update_date": {"order": "desc", "missing": "_last"}},
            {"m_creation_date": {"order": "desc", "missing": "_last"}},
            {"_score": {"order": "desc"}},
        ]

        response = await elastic_controller.get_instance().search_consolidated_ranked_query(
            indices, query, indices_boost)
        records, total = self._records(response)
        await self._add_crawl_status(records)
        result_records = [self._minimal_record(record) for record in records]
        return {
            "Result": result_records,
            "Page_Count": 1,
            "Total_Hits": total,
            "Defacement_Groups": self._build_groups(records)
        }
