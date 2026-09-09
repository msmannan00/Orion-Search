import re
from datetime import timedelta, timezone
from datetime import datetime
from typing import Any
from orion.api.interactive.search_manager.search_data_model.consolidated.search_consolidated_param_model import search_consolidated_param_model
from orion.constants.constant import CONSTANTS, allowed_key_titles
from orion.helper_manager.country_normalization import expand_country_filter_values
from orion.helper_manager.env_handler import env_handler
from orion.helper_manager.helper_controller import helper_controller
from orion.services.elastic_manager.elastic_enums import ELASTIC_INDEX, ELASTIC_SEMANTIC, ELASTIC_ENUMS
from orion.api.interactive.search_manager.search_semantic_controller import search_semantic_controller
from orion.services.log_manager.log_controller import log


DATE_ONLY_FORMAT = "%Y-%m-%d"
DATE_START_UTC_FORMAT = "%Y-%m-%dT00:00:00+00:00"
DATE_END_UTC_FORMAT = "%Y-%m-%dT23:59:59+00:00"


class search_query_generator:
    @staticmethod
    def _domain_wildcard_clause(field, value):
        domain = str(value or "").strip().lower()
        domain = re.sub(r"^[a-z][a-z0-9+.-]*://", "", domain)
        domain = domain.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0].split(":", 1)[0].strip(".")

        if "." not in domain or "@" in domain:
            return {
                "term": {
                    field: {
                        "value": domain,
                        "case_insensitive": True
                    }
                }
            }

        return {
            "bool": {
                "should": [
                    {
                        "term": {
                            field: {
                                "value": domain,
                                "case_insensitive": True
                            }
                        }
                    },
                    {
                        "wildcard": {
                            field: {
                                "value": f"*.{domain}",
                                "case_insensitive": True,
                                "rewrite": "constant_score"
                            }
                        }
                    }
                ],
                "minimum_should_match": 1
            }
        }

    @staticmethod
    def build_es_from_tagged(parsed, mapping):
        if isinstance(parsed, dict):
            if "AND" in parsed:
                must_clauses = [search_query_generator.build_es_from_tagged(x, mapping)
                                for x in parsed["AND"]]
                if len(must_clauses) == 1:
                    return must_clauses[0]
                return {"bool": {"must": must_clauses}}

            if "OR" in parsed:
                should_clauses = [search_query_generator.build_es_from_tagged(x, mapping)
                                  for x in parsed["OR"]]
                if len(should_clauses) == 1:
                    return should_clauses[0]
                return {"bool": {"should": should_clauses, "minimum_should_match": 1}}

        if isinstance(parsed, list):
            should_clauses = [search_query_generator.build_es_from_tagged(x, mapping)
                              for x in parsed]
            if len(should_clauses) == 1:
                return should_clauses[0]
            return {"bool": {"should": should_clauses, "minimum_should_match": 1}}

        tag = str(parsed.get("tag") or "").strip().lower()
        value = parsed.get("value")
        fields = mapping.get(tag, [])

        if tag in ("m_domain", "domain", "m_search_all", "all"):
            merged = fields.copy()
            merged += mapping.get("source_domain", [])
            merged += mapping.get("m_source_domain", [])
            merged += ["source_domain.keyword", "source_domain"]
            fields = list(dict.fromkeys([f for f in merged if f]))

            if tag in ("m_search_all", "all") and allowed_key_titles:
                fields = list(dict.fromkeys(fields + list(allowed_key_titles.keys())))

        if not fields:
            return {"match_none": {}}

        def make_clause(field):
            if value == "*":
                return {"exists": {"field": field}}
            if field in ("domain.keyword", "source_domain.keyword", "source_domain"):
                return search_query_generator._domain_wildcard_clause(field, value)

            return {
                "term": {
                    field: {
                        "value": value,
                        "case_insensitive": True
                    }
                }
            }

        if len(fields) == 1:
            return make_clause(fields[0])

        return {
            "bool": {
                "should": [make_clause(f) for f in fields],
                "minimum_should_match": 1
            }
        }

    @staticmethod
    def build_ioc_filter_clauses(pfilter):
        must_filters = []

        if not pfilter:
            return must_filters

        for ioc_key, values in pfilter.items():
            if not values:
                continue

            if not isinstance(values, list):
                values = [values]

            if ioc_key == "m_country":
                values = expand_country_filter_values(values)

            if ioc_key == "m_search_all":
                es_fields = []
                search_keys = allowed_key_titles.keys() or ELASTIC_ENUMS.ioc_field_mapping.keys()
                for key in search_keys:
                    mapped = ELASTIC_ENUMS.ioc_field_mapping.get(key)
                    if not mapped:
                        continue
                    if isinstance(mapped, list):
                        es_fields.extend(mapped)
                    else:
                        es_fields.append(mapped)
            else:
                if ioc_key not in ELASTIC_ENUMS.ioc_field_mapping:
                    continue
                es_fields = ELASTIC_ENUMS.ioc_field_mapping[ioc_key]
                if not isinstance(es_fields, list):
                    es_fields = [es_fields]

            shoulds = []

            for val in values:
                if not isinstance(val, str):
                    continue

                val = val.strip()
                if not val:
                    continue

                filter_values = [val]

                for field in es_fields:
                    term_field = field if str(field).endswith((".keyword", ".raw")) else f"{field}"

                    for filter_value in filter_values:
                        shoulds.append({
                            "term": {
                                term_field: {
                                    "value": filter_value,
                                    "case_insensitive": True
                                }
                            }
                        })

                        if ioc_key == "m_country" and re.search(r"\s", filter_value):
                            shoulds.append({
                                "wildcard": {
                                    term_field: {
                                        "value": f"*{filter_value}*",
                                        "case_insensitive": True
                                    }
                                }
                            })

                    if ioc_key == "m_search_all":
                        shoulds.append({"match_phrase": {field: val}})
                        shoulds.append({"match": {field: {"query": val, "operator": "AND"}}})

                    if len(val) >= 5111:
                        shoulds.append({
                            "prefix": {
                                term_field: {
                                    "value": val,
                                    "case_insensitive": True
                                }
                            }
                        })

            if shoulds:
                must_filters.append({
                    "bool": {
                        "should": shoulds,
                        "minimum_should_match": 1
                    }
                })

        return must_filters

    @staticmethod
    def _build_query_block(p_query_model, pfilter, raw_query, quoted_value, exact_phrases, loose_terms, phrase_fields, must_clauses, must_not_clause, m_page_number, date_boost_fields):
        multi_fields = [f"{field}^{boost}" for field, boost in phrase_fields]

        content_query: dict
        if raw_query == "*":
            content_query = {"match_all": {}}
        else:
            content_query = {"bool": {"should": [], "minimum_should_match": 1}}

            if quoted_value:
                raw_query = raw_query.strip('"')
                for phrase in exact_phrases:
                    content_query["bool"]["should"].append({
                        "bool": {
                            "should": [
                                {"match_phrase": {field: {"query": phrase, "boost": boost}}}
                                for field, boost in phrase_fields
                            ],
                            "minimum_should_match": 1
                        }
                    })
            else:
                for phrase in exact_phrases:
                    must_clauses.append({
                        "bool": {
                            "should": [
                                {"match_phrase": {field: {"query": phrase, "boost": boost}}}
                                for field, boost in phrase_fields
                            ],
                            "minimum_should_match": 1
                        }
                    })

                for term in loose_terms:
                    content_query["bool"]["should"].append({
                        "multi_match": {
                            "query": term.lower(),
                            "fields": multi_fields,
                            "type": "best_fields",
                            "operator": "OR"
                        }
                    })

                if not exact_phrases and not loose_terms:
                    content_query = {
                        "multi_match": {
                            "query": raw_query.lower(),
                            "fields": multi_fields,
                            "type": "best_fields",
                            "operator": "OR"
                        }
                    }

        must_filter_clauses = search_query_generator.build_ioc_filter_clauses(pfilter)
        should_filter_clauses = []

        if pfilter and "m_url" in pfilter and pfilter["m_url"]:
            url_values = pfilter["m_url"]
            if not isinstance(url_values, list):
                url_values = [url_values]

            url_shoulds = []
            url_fields = ["m_url.raw", "m_url"]

            for u in url_values:
                if not isinstance(u, str):
                    continue

                u = u.strip()
                if not u:
                    continue

                has_scheme = bool(re.match(r"^https?://", u, flags=re.I))
                candidates = set()

                if has_scheme:
                    candidates.add(u)
                else:
                    candidates.update([
                        u,
                        f"http://{u}",
                        f"https://{u}"
                    ])

                expanded = set()
                for c in candidates:
                    expanded.add(c)
                    expanded.add(c.rstrip("/") + "/")

                for fld in url_fields:
                    for c in expanded:
                        url_shoulds.append({"term": {fld: c}})
                        url_shoulds.append({"prefix": {fld: {"value": c, "boost": 5}}})

            if url_shoulds:
                must_filter_clauses.append({
                    "bool": {
                        "should": url_shoulds,
                        "minimum_should_match": 1
                    }
                })

        base_bool_query = {
            "must": [content_query] if content_query else [],
            "filter": must_clauses + must_filter_clauses,
            "must_not": must_not_clause
        }

        if not p_query_model.must and should_filter_clauses:
            base_bool_query.setdefault("should", []).extend(should_filter_clauses)

        functions_block = []
        if p_query_model.matchtype != "semantic":
            functions_block = [{
                "filter": {"exists": {"field": field}},
                "gauss": {
                    field: {
                        "origin": "now",
                        "scale": "45d",
                        "offset": "7d",
                        "decay": 0.7
                    }
                },
                "weight": weight
            } for field, weight in date_boost_fields]

        query_statement: dict[str, Any] = {
            "min_score": 0,
            "query": {
                "function_score": {
                    "query": {"bool": base_bool_query},
                    **({"functions": functions_block} if functions_block else {}),
                    "score_mode": "sum",
                    "boost_mode": "sum"
                }
            },
            "from": max(0, (m_page_number - 1) * CONSTANTS.S_SETTINGS_SEARCHED_DOCUMENT_SIZE_GENERIC),
            "size": CONSTANTS.S_SETTINGS_FETCHED_DOCUMENT_SIZE,
            "track_total_hits": True,
            "explain": True
        }

        if (
            raw_query != "*"
            and env_handler.get_instance().env("SEMANTIC_ENABLED") == "1"
            and p_query_model.matchtype == "semantic"
        ):
            try:
                qvec = search_semantic_controller.get_instance().embed_query_sync(p_query_model.q)
                if qvec:
                    knn_clause = {
                        "knn": {
                            "field": ELASTIC_SEMANTIC.S_EMBED_FIELD,
                            "k": CONSTANTS.S_SETTINGS_FETCHED_DOCUMENT_SIZE,
                            "num_candidates": 1000,
                            "query_vector": qvec,
                            "filter": {"bool": {"filter": must_filter_clauses}}
                        }
                    }

                    query_statement["query"]["function_score"]["query"] = knn_clause
                    query_statement["query"]["function_score"]["script_score"] = {
                        "script": {
                            "source": (
                                "double s=_score; double eps=1e-9;"
                                "s=Math.max(eps, Math.min(1.0-eps, s));"
                                "double a=params.a; double t=params.t;"
                                "double z=0.5*(1.0+Math.tanh(a*(s-t))); return z;"
                            ),
                            "params": {"a": 10.0, "t": 0.8}
                        }
                    }
                    query_statement["query"]["function_score"]["score_mode"] = "sum"
                    query_statement["query"]["function_score"]["boost_mode"] = "replace"
                    query_statement["min_score"] = 0.4
            except Exception as ex:
                log.g().w(f"Semantic score adjustment skipped: {str(ex)}")

        return query_statement

    @staticmethod
    def on_search_persona(p_query_model):
        q = (p_query_model.q or "").strip()
        if not q: return None, None

        query = {
            "query": {
                "term": {
                    "email.keyword": q
                }
            },
            "size": 0,
            "track_total_hits": False,
            "terminate_after": 1000,
            "timeout": "25s",
            "aggs": {
                "channels": {
                    "terms": {
                        "field": "channel.keyword",
                        "size": 3,
                        "order": {"_count": "desc"}
                    }
                },
                "types": {
                    "terms": {
                        "field": "type.keyword",
                        "size": 3,
                        "order": {"_count": "desc"}
                    }
                }
            },
            "_source": False,
            "stored_fields": []
        }

        return ELASTIC_INDEX.S_STEALERLOGS_INDEX, query

    @staticmethod
    def build_date_priority_filter(from_date, to_date, priority_field_names):
        formatted_ranges = {
            "m_date": (from_date, to_date),
            "m_update_date": (from_date, to_date),
            "m_creation_date": (from_date, to_date),
        }
        priority_fields = [
            (field, *formatted_ranges[field])
            for field in priority_field_names
        ]
        should_clauses = []

        for index, (field, gte_value, lte_value) in enumerate(priority_fields):
            clause = {
                "bool": {
                    "filter": [
                        {"exists": {"field": field}},
                        {"range": {field: {"gte": gte_value, "lte": lte_value}}}
                    ]
                }
            }
            if index > 0:
                clause["bool"]["must_not"] = [
                    {"exists": {"field": previous_field}}
                    for previous_field, _, _ in priority_fields[:index]
                ]
            should_clauses.append(clause)

        return {
            "bool": {
                "should": should_clauses,
                "minimum_should_match": 1
            }
        }

    def on_search_consolidated_ranked_data(self, p_query_model: search_consolidated_param_model, pfilter, base_index, blocked_categories, allowed_categories, search_type=""):
        if p_query_model.matchtype and p_query_model.q:
            p_query_model.q = helper_controller.transform_query_match(p_query_model.q, p_query_model.matchtype)

        channel_q = p_query_model.q if p_query_model.q and p_query_model.q != "*" else None
        raw_query = p_query_model.q if p_query_model.q and p_query_model.q != "*" else "*"
        raw_query = helper_controller.remove_stopwords_from_string(raw_query) if raw_query != "*" else "*"
        if raw_query == "":
            raw_query = "*"

        m_date_range = p_query_model.daterange
        m_network = p_query_model.network
        m_page_number = getattr(p_query_model, "page", 1)
        m_content_type = str(getattr(p_query_model, "m_content_type", None) or p_query_model.content or "all").strip().lower()
        m_platform = (p_query_model.platform or "").strip().lower()
        m_family = (p_query_model.family or "").strip()
        m_country = (p_query_model.m_country or "").strip()
        m_selected_content_type = (p_query_model.content_type or "").strip()
        m_reporter = (p_query_model.m_reporter or "").strip()
        m_safe_search = p_query_model.safe
        result_size = p_query_model.platform_result_count
        must_clauses = []
        must_not_clause = []
        index_set = set(base_index or [])

        if index_set and index_set.issubset({ELASTIC_INDEX.S_EXPLOIT_INDEX, ELASTIC_INDEX.S_APT_INDEX, ELASTIC_INDEX.S_MALWARE_INDEX, ELASTIC_INDEX.S_DEFACEMENT_INDEX, ELASTIC_INDEX.S_LEAK_INDEX}):
            date_priority_fields = ["m_date", "m_update_date", "m_creation_date"]
            date_boost_fields = [("m_date", 0), ("m_update_date", 0), ("m_creation_date", 0)]
        elif index_set and index_set.issubset({ELASTIC_INDEX.S_CHATS_INDEX, ELASTIC_INDEX.S_SOCIAL_INDEX}):
            date_priority_fields = ["m_date"]
            date_boost_fields = [("m_date", 0)]
        elif index_set and index_set.issubset({ELASTIC_INDEX.S_GENERIC_INDEX}):
            date_priority_fields = ["m_update_date", "m_creation_date"]
            date_boost_fields = [("m_update_date", 0), ("m_creation_date", 0)]
        else:
            date_priority_fields = ["m_creation_date"]
            date_boost_fields = [("m_creation_date", 0)]

        if m_date_range:
            try:
                parts = m_date_range.split(",")
                if len(parts) == 2:
                    from_date = datetime.strptime(parts[0].strip(), DATE_ONLY_FORMAT).strftime(DATE_START_UTC_FORMAT)
                    to_date = datetime.strptime(parts[1].strip(), DATE_ONLY_FORMAT).strftime(DATE_END_UTC_FORMAT)
                    must_clauses.append(search_query_generator.build_date_priority_filter(from_date, to_date, date_priority_fields))
            except ValueError:
                pass
        elif m_date_range != "":
            to_date = datetime.now(timezone.utc).strftime(DATE_END_UTC_FORMAT)
            from_date = (datetime.now(timezone.utc) - timedelta(days=150)).strftime(DATE_START_UTC_FORMAT)
            must_clauses.append(search_query_generator.build_date_priority_filter(from_date, to_date, date_priority_fields))

        m_ctype = str(p_query_model.category or "all").strip().lower()
        allowed_categories = [
            str(category).strip().lower()
            for category in (allowed_categories or [])
            if category not in (None, "", [], {})
        ]
        allowed_categories = list(dict.fromkeys(allowed_categories))
        blocked_categories = [
            str(category).strip().lower()
            for category in (blocked_categories or [])
            if category not in (None, "", [], {})
        ]
        blocked_categories = list(dict.fromkeys(blocked_categories))

        if allowed_categories:
            selected_categories = allowed_categories
            if m_ctype != "all":
                selected_categories = [category for category in allowed_categories if category == m_ctype]

            if selected_categories:
                category_filters = [
                    {"bool": {"filter": [
                        {"exists": {"field": "m_content_type"}},
                        {"terms": {"m_content_type": selected_categories}}
                    ]}}
                ]
                if "leaks" in selected_categories or "leak" in selected_categories:
                    category_filters.append({"bool": {"must_not": {"exists": {"field": "m_content_type"}}}})
                must_clauses.append(
                    {"bool": {"should": category_filters, "minimum_should_match": 1}})
            else:
                must_clauses.append({"match_none": {}})
        elif m_ctype != "all":
            must_clauses.append(
                {"bool": {"should": [
                    *([] if m_ctype == "swarm" else [{"bool": {"must_not": {"exists": {"field": "m_content_type"}}}}]),
                    {"bool": {"filter": [{"exists": {"field": "m_content_type"}},
                        {"terms": {"m_content_type": [m_ctype]}}]}}], "minimum_should_match": 1}})

        if blocked_categories:
            must_not_clause.append({"terms": {"m_content_type": blocked_categories}})

        if m_network and m_network.lower() not in ("", "all"):
            must_clauses.append({"term": {"m_network": m_network.lower()}})

        if m_platform and m_platform not in ("", "all"):
            must_clauses.append({"term": {"m_platform": m_platform}})

        if m_family and m_family.lower() not in ("", "all") and index_set == {ELASTIC_INDEX.S_APT_INDEX}:
            must_clauses.append({"bool": {"should": [
                {"term": {"m_family": m_family}},
                {"term": {"m_name": m_family}},
                {"term": {"m_title.keyword": m_family}}
            ], "minimum_should_match": 1}})

        if m_country and m_country.lower() not in ("", "all") and index_set in ({ELASTIC_INDEX.S_APT_INDEX}, {ELASTIC_INDEX.S_MALWARE_INDEX}):
            must_clauses.append({"term": {"m_country": m_country}})

        if m_selected_content_type and m_selected_content_type.lower() not in ("", "all") and index_set == {ELASTIC_INDEX.S_MALWARE_INDEX}:
            must_clauses.append({"term": {"m_content_type": m_selected_content_type}})

        if m_reporter and m_reporter.lower() not in ("", "all") and index_set == {ELASTIC_INDEX.S_MALWARE_INDEX}:
            must_clauses.append({"term": {"m_reporter": m_reporter}})

        if m_safe_search and m_safe_search == True:
            must_not_clause.append({"term": {"m_content_type": "adult"}})

        if m_content_type == "phishing":
            must_clauses.append({"bool": {"filter": [{"exists": {"field": "m_ioc_type"}}, {"terms": {"m_ioc_type": ["phishing"]}}]}})
        elif m_content_type == "hacked":
            must_clauses.append({"bool": {"filter": [{"exists": {"field": "m_ioc_type"}}, {"terms": {"m_ioc_type": ["hacked"]}}]}})
        elif m_content_type == "databases":
            must_not_clause.append({"terms": {"m_ioc_type": ["phishing", "hacked"]}})

        is_defacement_ioc_filter = search_type == "defacement" and m_content_type in ("phishing", "hacked", "databases")
        if m_content_type and m_content_type.lower() not in ("", "all") and not is_defacement_ioc_filter:
            if m_content_type.lower() == "swarm":
                must_clauses.append(
                    {"bool": {"should": [
                        {"term": {"m_content_type": "swarm"}},
                        {"bool": {"filter": [{"exists": {"field": "content_type"}}, {"term": {"content_type": "swarm"}}]}},
                        {"bool": {"filter": [{"exists": {"field": "m_ioc_type"}}, {"terms": {"m_ioc_type": ["swarm"]}}]}}
                    ], "minimum_should_match": 1}})
            else:
                must_clauses.append(
                    {"bool": {"should": [
                        {"bool": {"filter": [{"exists": {"field": "content_type"}}, {"term": {"content_type": m_content_type.lower()}}]}},
                        {"bool": {"filter": [{"exists": {"field": "m_content_type"}}, {"term": {"m_content_type": m_content_type.lower()}}]}},
                        {"bool": {"filter": [{"exists": {"field": "m_ioc_type"}}, {"terms": {"m_ioc_type": [m_content_type.lower()]}}]}}
                    ], "minimum_should_match": 1}})

        phrases = re.findall(r'"([^"]+)"', p_query_model.q or "")
        quoted_value = bool(phrases) and (p_query_model.q or "").strip().startswith('"') and (
                p_query_model.q or "").strip().endswith('"')
        exact_phrases = phrases
        if search_type == "defacement":
            loose_terms = []
        else:
            loose_terms = [] if raw_query in ("*", "") else [t for t in re.findall(r'\w+', raw_query) if t and t.strip('"')]

        phrase_fields = [("m_title", 5), ("m_content", 3), ("m_url", 2), ("m_source_url", 2), ("m_sender_name", 2), ("m_sender_username", 3), ("m_author", 2), ("m_username", 2), ("m_base_url", 1),
            ("m_team", 1), ("m_attacker", 1), ("m_users", 1), ("m_network", 1), ("m_channel_name", 4),
            ("m_name", 4), ("m_family", 3), ("m_aliases", 3), ("m_actor_names", 3), ("m_references", 1),
            ("m_sha256_hash", 5), ("m_sha1_hash", 4), ("m_md5_hash", 4), ("m_signature", 4), ("m_tags", 3), ("m_file_name", 3)]

        unified_query = self._build_query_block(
            p_query_model=p_query_model,
            pfilter=pfilter,
            raw_query=raw_query,
            quoted_value=quoted_value,
            exact_phrases=exact_phrases,
            loose_terms=loose_terms,
            phrase_fields=phrase_fields,
            must_clauses=must_clauses,
            must_not_clause=must_not_clause,
            m_page_number=m_page_number,
            date_boost_fields=date_boost_fields)

        unified_query["size"] = result_size
        unified_query["from"] = max(0, (m_page_number - 1) * result_size)

        if channel_q:
            qb = unified_query["query"]["function_score"]["query"].setdefault("bool", {"must": []})
            qb.setdefault("should", []).extend(
                [{"term": {"m_channel_name.keyword": {"value": channel_q, "boost": 7.0}}},
                    {"match_phrase": {"m_channel_name": {"query": channel_q, "slop": 1, "boost": 7.0}}}])

        query = base_index, unified_query, [b for b in
            [{ELASTIC_INDEX.S_LEAK_INDEX: 2}, {ELASTIC_INDEX.S_GENERIC_INDEX: 0.5},
                {ELASTIC_INDEX.S_EXPLOIT_INDEX: 1.4}, {ELASTIC_INDEX.S_APT_INDEX: 1.4}, {ELASTIC_INDEX.S_MALWARE_INDEX: 1.4}, {ELASTIC_INDEX.S_CHATS_INDEX: 1.4},
                {ELASTIC_INDEX.S_SOCIAL_INDEX: 1.4}, {ELASTIC_INDEX.S_DEFACEMENT_INDEX: 1.4}] if
            next(iter(b)) in base_index]

        return query

    def on_search_consolidated_iocs(self, p_query_model, pfilter, base_index):
        must_clauses = []
        must_not_clause = []

        if p_query_model.ioc and p_query_model.ioc != "*":
            parsed = helper_controller.parse_tagged_logic_query_for_iocs(p_query_model.ioc)
            logic_query = self.build_es_from_tagged(parsed, ELASTIC_ENUMS.mapping_consolidated_iocs)
            must_clauses.append(logic_query)

        if p_query_model.daterange:
            parts = p_query_model.daterange.split(",")
            if len(parts) == 2:
                from_date = datetime.strptime(parts[0].strip(), DATE_ONLY_FORMAT).strftime(DATE_START_UTC_FORMAT)
                to_date = datetime.strptime(parts[1].strip(), DATE_ONLY_FORMAT).strftime(DATE_END_UTC_FORMAT)

                must_clauses.append({
                    "bool": {
                        "should": [
                            {"range": {"m_date": {"gte": from_date, "lte": to_date}}},
                            {"range": {"m_creation_date": {"gte": from_date, "lte": to_date}}},
                        ],
                        "minimum_should_match": 1,
                    }
                })

        unified_query = self._build_query_block(
            p_query_model=p_query_model,
            pfilter=pfilter,
            raw_query="*",
            quoted_value=False,
            exact_phrases=[],
            loose_terms=[],
            phrase_fields=[],
            must_clauses=must_clauses,
            must_not_clause=must_not_clause,
            m_page_number=getattr(p_query_model, "page", 1),
            date_boost_fields=[("m_creation_date", 0.1)],
        )

        unified_query["size"] = 15
        unified_query["from"] = max(0, (getattr(p_query_model, "page", 1) - 1) * 15)

        return (
            base_index,
            unified_query,
            [
                {ELASTIC_INDEX.S_LEAK_INDEX: 2},
                {ELASTIC_INDEX.S_GENERIC_INDEX: 0.5},
                {ELASTIC_INDEX.S_EXPLOIT_INDEX: 1.4},
                {ELASTIC_INDEX.S_CHATS_INDEX: 1.4},
                {ELASTIC_INDEX.S_SOCIAL_INDEX: 1.4},
                {ELASTIC_INDEX.S_DEFACEMENT_INDEX: 1.4},
            ],
        )

    @staticmethod
    def on_search_stealer_iocs(p_query_model):
        is_match_all = not p_query_model.ioc

        if is_match_all:
            inner_query = {"match_all": {}}
        else:
            parsed = helper_controller.parse_tagged_logic_query_for_iocs(p_query_model.ioc)
            inner_query = search_query_generator.build_es_from_tagged(
                parsed, ELASTIC_ENUMS.mapping_stealer_log_field
            )

        es_query = {
            "bool": {
                "must": [inner_query],
                "filter": []
            }
        }

        date_field = "date"
        date_range = str(getattr(p_query_model, "daterange", None) or "")

        if date_range:
            parts = date_range.split(',')
            if len(parts) == 2:
                try:
                    from_date = datetime.strptime(parts[0].strip(), DATE_ONLY_FORMAT).strftime(DATE_ONLY_FORMAT)
                    to_date = datetime.strptime(parts[1].strip(), DATE_ONLY_FORMAT).strftime(DATE_ONLY_FORMAT)
                    date_should_clauses = [
                        {"range": {date_field: {"gte": from_date, "lte": to_date}}}
                    ]

                    if from_date <= "2025-12-31" and to_date >= "2025-01-01":
                        date_should_clauses.extend([
                            {"bool": {"must_not": [{"exists": {"field": date_field}}]}},
                            {"term": {f"{date_field}.keyword": ""}},
                        ])

                    es_query["bool"]["filter"].append({
                        "bool": {
                            "should": date_should_clauses,
                            "minimum_should_match": 1
                        }
                    })
                except ValueError:
                    pass

        page = getattr(p_query_model, "page", 1) or 1
        size = (getattr(p_query_model, "size", None) or (100 if is_match_all else 500))
        frm = max((page - 1) * size, 0)

        query_body = {
            "query": es_query,
            "from": frm,
            "size": size,
            "sort": ["_doc"],
            "track_total_hits": False,
        }

        return ELASTIC_INDEX.S_STEALERLOGS_INDEX, query_body
