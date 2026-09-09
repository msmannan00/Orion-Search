from orion.api.server.entity_manager.constants import enums as graph_enums
from orion.constants.constant import allowed_key_titles
from orion.constants.cti_graph_schema import DEFAULT_CLUSTER_IDS, DEFAULT_CLUSTER_KEYS


class EntityRequestGenerator:
    GRAPH_EXTRA_KEY_TITLES = graph_enums.GRAPH_EXTRA_KEY_TITLES
    DOCUMENT_LABEL_PROPERTY_KEYS = (
        "m_cve",
        "m_vulnerability",
        "m_product",
        "m_domain",
        "m_url",
        "m_ip",
        "m_file_name",
        "m_file_paths",
        "m_sha256",
        "m_sha1",
        "m_md5",
    )
    STRONG_RELATED_PROPERTY_KEYS = {
        "m_alias",
        "m_asns",
        "m_attacker",
        "m_author",
        "m_company_name",
        "m_crypto_address",
        "m_cve",
        "m_cwe",
        "m_domain",
        "m_email",
        "m_enterprise_attack_tactics",
        "m_enterprise_attack_techniques",
        "m_family",
        "m_file_name",
        "m_file_paths",
        "m_hash",
        "m_hashes",
        "m_hashtag",
        "m_imphash",
        "m_ip",
        "m_mac_address",
        "m_md5",
        "m_mention",
        "m_org",
        "m_person",
        "m_phone_number",
        "m_product",
        "m_reporter",
        "m_registry_key_path",
        "m_sha1",
        "m_sha256",
        "m_sha3_384",
        "m_signature",
        "m_social_media_profiles",
        "m_telfhash",
        "m_tlsh",
        "m_uk_nhs",
        "m_username",
        "m_us_driver_license",
        "m_vendor",
        "m_vulnerability",
        "m_xmpp_addresses",
        "m_yara_rule",
    }

    @staticmethod
    def get_cluster_documents_query(normalized_value: str, document_limit: int):
        if normalized_value == "all":
            queried_id = "all_clusters"
            per_cluster_limit = max(document_limit - 20, 1)
            query_str = f"""
            LET clusters = @cluster_ids

            LET cluster_data = (
              FOR cluster_id IN clusters
                LET start_cluster = DOCUMENT(cluster_id)
                LET docs = (
                  FOR e IN cti_edges
                    FILTER e._from == cluster_id AND e.type == 'cluster_to_doc'
                    LIMIT {per_cluster_limit}
                    LET v = DOCUMENT(e._to)
                    FILTER v != null AND v.type == 'document'
                    LET current_label = FIRST(
                      FOR candidate IN [v.display_value, v.label, v.title, v.doc_id, v.m_document_id, v._key]
                        FILTER candidate != null AND TRIM(TO_STRING(candidate)) != ''
                        RETURN TRIM(TO_STRING(candidate))
                    )
                    LET fallback_label = FIRST(
                      FOR label_edge IN cti_edges
                        FILTER label_edge._from == v._id AND label_edge.type IN @document_label_edge_types
                        LET label_vertex = DOCUMENT(label_edge._to)
                        FILTER label_vertex.type IN @document_label_property_keys
                        LET label_value = FIRST(
                          FOR candidate IN [label_vertex.display_value, label_vertex.value, label_vertex.label]
                            FILTER candidate != null AND TRIM(TO_STRING(candidate)) != ''
                            RETURN TRIM(TO_STRING(candidate))
                        )
                        FILTER label_value != null
                        SORT POSITION(@document_label_property_keys, label_vertex.type, true) ASC
                        RETURN label_value
                    )
                    LET document_label = fallback_label != null ? fallback_label : CONCAT(TO_STRING(v.cluster_id), " report")
                    LET display_vertex = REGEX_TEST(LOWER(TO_STRING(current_label)), "^[a-f0-9]{{32,}}$")
                      ? MERGE(v, {{display_value: document_label, label: document_label, title: document_label}})
                      : v
                    RETURN {{
                      vertex: display_vertex,
                      edge: e,
                      path: {{
                        vertices: [start_cluster, display_vertex],
                        edges: [e]
                      }}
                    }}
                )
                RETURN docs
            )

            LET raw_depth1 = FLATTEN(cluster_data)

            LET document_ids = UNIQUE(
              FOR item IN raw_depth1
                RETURN item.vertex._id
            )

            LET cluster_edges = (
              FOR doc_id IN document_ids
                FOR e IN cti_edges
                  FILTER e._to == doc_id AND e.type == 'cluster_to_doc'
                  FOR cluster_vertex IN cti_vertices
                    FILTER cluster_vertex._id == e._from AND cluster_vertex.type == 'cluster'
                    RETURN {{
                      vertex: cluster_vertex,
                      edge: e,
                      path: null
                    }}
            )

            LET depth1 = APPEND(raw_depth1, cluster_edges)
            LET limit_hit_depth1 = false

            RETURN {{
              depth1,
              limit_hit_depth1,
              matched_ids: clusters
            }}
            """
            return queried_id, query_str, {
                "cluster_ids": list(DEFAULT_CLUSTER_IDS),
                "document_label_edge_types": [f"has_{key}" for key in EntityRequestGenerator.DOCUMENT_LABEL_PROPERTY_KEYS],
                "document_label_property_keys": list(EntityRequestGenerator.DOCUMENT_LABEL_PROPERTY_KEYS),
            }
        else:
            queried_id = f"cti_vertices/{normalized_value}"
            query_str = f"""
            LET start_cluster = DOCUMENT(@cluster_id)

            LET doc_nodes = (
              FOR e IN cti_edges
                FILTER e._from == @cluster_id AND e.type == 'cluster_to_doc'
                LIMIT {document_limit}
                LET v = DOCUMENT(e._to)
                FILTER v != null AND v.type == 'document'
                LET current_label = FIRST(
                  FOR candidate IN [v.display_value, v.label, v.title, v.doc_id, v.m_document_id, v._key]
                    FILTER candidate != null AND TRIM(TO_STRING(candidate)) != ''
                    RETURN TRIM(TO_STRING(candidate))
                )
                LET fallback_label = FIRST(
                  FOR label_edge IN cti_edges
                    FILTER label_edge._from == v._id AND label_edge.type IN @document_label_edge_types
                    LET label_vertex = DOCUMENT(label_edge._to)
                    FILTER label_vertex.type IN @document_label_property_keys
                    LET label_value = FIRST(
                      FOR candidate IN [label_vertex.display_value, label_vertex.value, label_vertex.label]
                        FILTER candidate != null AND TRIM(TO_STRING(candidate)) != ''
                        RETURN TRIM(TO_STRING(candidate))
                    )
                    FILTER label_value != null
                    SORT POSITION(@document_label_property_keys, label_vertex.type, true) ASC
                    RETURN label_value
                )
                LET document_label = fallback_label != null ? fallback_label : CONCAT(TO_STRING(v.cluster_id), " report")
                LET display_vertex = REGEX_TEST(LOWER(TO_STRING(current_label)), "^[a-f0-9]{{32,}}$")
                  ? MERGE(v, {{display_value: document_label, label: document_label, title: document_label}})
                  : v
                RETURN {{
                  vertex: display_vertex,
                  edge: e,
                  path: {{
                    vertices: [start_cluster, display_vertex],
                    edges: [e]
                  }}
                }}
            )

            LET document_ids = UNIQUE(
              FOR item IN doc_nodes
                RETURN item.vertex._id
            )

            LET cluster_edges = (
              FOR doc_id IN document_ids
                FOR e IN cti_edges
                  FILTER e._to == doc_id AND e.type == 'cluster_to_doc'
                  FOR cluster_vertex IN cti_vertices
                    FILTER cluster_vertex._id == e._from AND cluster_vertex.type == 'cluster'
                    RETURN {{
                      vertex: cluster_vertex,
                      edge: e,
                      path: null
                    }}
            )

            LET depth1 = APPEND(doc_nodes, cluster_edges)
            LET limit_hit_depth1 = LENGTH(doc_nodes) >= {document_limit}

            RETURN {{
              depth1,
              limit_hit_depth1,
              matched_ids: [@cluster_id]
            }}
            """
            bind_vars = {
                "cluster_id": queried_id,
                "document_label_edge_types": [f"has_{key}" for key in EntityRequestGenerator.DOCUMENT_LABEL_PROPERTY_KEYS],
                "document_label_property_keys": list(EntityRequestGenerator.DOCUMENT_LABEL_PROPERTY_KEYS),
            }
            return queried_id, query_str, bind_vars

    @staticmethod
    def build_property_search_query(normalized_value: str, document_limit: int, scope_cluster: str = ""):
        if scope_cluster and scope_cluster != "all":
            return EntityRequestGenerator.build_scoped_property_search_query(
                normalized_value=normalized_value,
                document_limit=document_limit,
                scope_cluster=scope_cluster,
            )

        queried_id = "all_properties"
        query_str = f"""
        LET props = (
          FOR property IN cti_vertices
            FILTER property.normalized_value == @search_value
            FILTER property.type NOT IN ['document', 'cluster']
            RETURN property._id
        )

        LET doc_matches = (
          FOR property_id IN props
            FOR property_edge IN cti_edges
              FILTER property_edge._to == property_id AND STARTS_WITH(property_edge.type, "has_")
              COLLECT matched_doc_id = property_edge._from INTO grouped = {{
                property_id: property_id,
                property_edge: property_edge
              }}
              LET score = LENGTH(grouped)
              SORT score DESC
              LIMIT {document_limit}
              RETURN {{
                doc_id: matched_doc_id,
                property_edges: SLICE(grouped, 0, 4)
              }}
        )

        LET raw_depth1 = (
          FOR match IN doc_matches
            LET doc = DOCUMENT(match.doc_id)
            FILTER doc != null AND doc.type == "document"
            FOR relation IN match.property_edges
              LET property = DOCUMENT(relation.property_id)
              FILTER property != null
              RETURN {{
                vertex: KEEP(doc, "_id", "_key", "_rev", "type", "node_class", "doc_id", "m_document_id", "cluster_id", "module", "label", "display_value", "title", "summary", "published", "source", "source_reliability"),
                edge: relation.property_edge,
                path: {{
                  vertices: [property, doc],
                  edges: [relation.property_edge]
                }}
              }}
        )

        LET default_clusters = @default_clusters
        LET filtered_cluster_edges = (
          FOR match IN doc_matches
            FOR e IN cti_edges
              FILTER e._to == match.doc_id AND e.type == 'cluster_to_doc'
              LET cluster_key = PARSE_IDENTIFIER(e._from).key
              FILTER cluster_key IN default_clusters
              LET cluster = DOCUMENT(e._from)
              RETURN {{vertex: cluster, edge: e, path: null}}
        )

        LET depth1 = APPEND(raw_depth1, filtered_cluster_edges)
        LET limit_hit_depth1 = LENGTH(doc_matches) >= {document_limit}

        RETURN {{
          depth1,
          limit_hit_depth1,
          matched_ids: props
        }}
        """

        bind_vars = {
            "default_clusters": list(DEFAULT_CLUSTER_KEYS),
            "search_value": normalized_value.lower(),
        }

        return queried_id, query_str, bind_vars

    @staticmethod
    def build_scoped_property_search_query(normalized_value: str, document_limit: int, scope_cluster: str):
        queried_id = f"cti_vertices/{scope_cluster}"
        query_str = f"""
        LET props = (
          FOR property IN cti_vertices
            FILTER property.normalized_value == @search_value
            FILTER property.type NOT IN ['document', 'cluster']
            RETURN property._id
        )

        LET scoped_doc_matches = (
          FOR property_id IN props
            FOR property_edge IN cti_edges
              FILTER property_edge._to == property_id AND STARTS_WITH(property_edge.type, "has_")
              LET doc_id = property_edge._from
              FILTER LENGTH(
                FOR candidate_edge IN cti_edges
                  FILTER candidate_edge._from == @scope_cluster_id
                    AND candidate_edge._to == doc_id
                    AND candidate_edge.type == "cluster_to_doc"
                  LIMIT 1
                  RETURN 1
              ) > 0
              COLLECT matched_doc_id = doc_id INTO grouped = {{
                property_id: property_id,
                property_edge: property_edge
              }}
              LET score = LENGTH(grouped)
              SORT score DESC
              LIMIT {document_limit}
              RETURN {{
                doc_id: matched_doc_id,
                property_edges: SLICE(grouped, 0, 4)
              }}
        )

        LET raw_depth1 = (
          FOR match IN scoped_doc_matches
            LET doc = DOCUMENT(match.doc_id)
            FILTER doc != null AND doc.type == "document"
            FOR relation IN match.property_edges
              LET property = DOCUMENT(relation.property_id)
              FILTER property != null
              RETURN {{
                vertex: KEEP(doc, "_id", "_key", "_rev", "type", "node_class", "doc_id", "m_document_id", "cluster_id", "module", "label", "display_value", "title", "summary", "published", "source", "source_reliability"),
                edge: relation.property_edge,
                path: {{
                  vertices: [property, doc],
                  edges: [relation.property_edge]
                }}
              }}
        )

        LET cluster_edges = (
          FOR match IN scoped_doc_matches
            LET cluster = DOCUMENT(@scope_cluster_id)
            FILTER cluster != null
            LET cluster_edge = FIRST(
              FOR candidate_edge IN cti_edges
                FILTER candidate_edge._from == @scope_cluster_id
                  AND candidate_edge._to == match.doc_id
                  AND candidate_edge.type == "cluster_to_doc"
                LIMIT 1
                RETURN candidate_edge
            )
            FILTER cluster_edge != null
            RETURN {{
              vertex: cluster,
              edge: cluster_edge,
              path: null
            }}
        )

        LET depth1 = APPEND(raw_depth1, cluster_edges)
        LET limit_hit_depth1 = LENGTH(scoped_doc_matches) >= {document_limit}

        RETURN {{
          depth1,
          limit_hit_depth1,
          matched_ids: APPEND(props, [@scope_cluster_id])
        }}
        """

        bind_vars = {
            "scope_cluster_id": queried_id,
            "search_value": normalized_value.lower(),
        }

        return queried_id, query_str, bind_vars

    @staticmethod
    def get_document_or_property_query(normalized_value: str,
            normalized_type: str,
            depth_level: int,
            document_limit: int,
            data_point_type: str):
        start_vertex = (
            f"cti_vertices/{normalized_value}" if data_point_type == "document" else f"cti_vertices/{normalized_type}:{normalized_value}")

        queried_id = start_vertex

        if data_point_type == "document":
            query_str = f"""
            LET direct_properties = (
              FOR v, e, p IN {depth_level}..{depth_level} ANY @start_vertex GRAPH 'cti_graph'
                OPTIONS {{ bfs: true, uniqueVertices: "global" }}
                FILTER v.type NOT IN ['document', 'cluster']
                RETURN {{
                  vertex: v,
                  edge: e,
                  path: p
                }}
            )

            LET property_ids = UNIQUE(
              FOR item IN direct_properties
                LET property_key = SPLIT(PARSE_IDENTIFIER(item.vertex._id).key, ":")[0]
                FILTER property_key IN @strong_related_property_types
                RETURN item.vertex._id
            )

            LET raw_per_property_document_limit = LENGTH(property_ids) == 0 ? 0 : FLOOR({document_limit} / LENGTH(property_ids))
            LET per_property_document_limit = raw_per_property_document_limit < 1 ? 1 : raw_per_property_document_limit

            LET related_doc_candidates = (
              FOR pid IN property_ids
                LET docs_for_property = (
                  FOR e IN cti_edges
                    FILTER e._to == pid AND STARTS_WITH(e.type, "has_")
                    FILTER e._from != @start_vertex
                    COLLECT doc_id = e._from WITH COUNT INTO score
                    SORT score DESC
                    RETURN doc_id
                )
                RETURN SLICE(docs_for_property, 0, per_property_document_limit)
            )

            LET doc_counts = UNIQUE(FLATTEN(related_doc_candidates))

            LET related_docs = (
              FOR doc_id IN doc_counts
                FOR e IN cti_edges
                  FILTER e._from == doc_id AND STARTS_WITH(e.type, "has_")
                  FILTER e._to IN property_ids
                  FOR doc IN cti_vertices
                    FILTER doc._id == doc_id AND doc.type == "document"
                    RETURN {{
                      vertex: KEEP(doc, "_id", "_key", "_rev", "type", "node_class", "doc_id", "m_document_id", "cluster_id", "module", "label", "display_value", "title", "summary", "published", "source", "source_reliability"),
                      edge: e,
                      path: null
                    }}
            )

            LET depth1 = APPEND(direct_properties, related_docs)
            LET limit_hit_depth1 = LENGTH(doc_counts) >= {document_limit}

            RETURN {{
              depth1,
              limit_hit_depth1,
              matched_ids: [@start_vertex]
            }}
            """
            return queried_id, query_str, {
                "strong_related_property_types": list(EntityRequestGenerator.STRONG_RELATED_PROPERTY_KEYS),
                "start_vertex": start_vertex,
            }

        query_str = f"""
        LET start_property = DOCUMENT(@start_vertex)

        LET doc_nodes = (
          FOR e IN cti_edges
            FILTER e._to == @start_vertex AND e.type == @edge_type
            LIMIT {document_limit}
            LET doc = DOCUMENT(e._from)
            FILTER doc != null AND doc.type == "document"
            RETURN {{
              vertex: KEEP(doc, "_id", "_key", "_rev", "type", "node_class", "doc_id", "m_document_id", "cluster_id", "module", "label", "display_value", "title", "summary", "published", "source", "source_reliability"),
              edge: e,
              path: {{
                vertices: [start_property, doc],
                edges: [e]
              }}
            }}
        )

        LET document_ids = UNIQUE(
          FOR item IN doc_nodes
            RETURN item.vertex._id
        )

        LET default_clusters = @default_clusters

        LET cluster_edges = (
          FOR doc_id IN document_ids
            FOR e IN cti_edges
              FILTER e._to == doc_id AND e.type == 'cluster_to_doc'
              LET cluster_key = PARSE_IDENTIFIER(e._from).key
              FILTER cluster_key IN default_clusters
              LET cluster = DOCUMENT(e._from)
              RETURN {{
                vertex: cluster,
                edge: e,
                path: null
              }}
        )

        LET depth1 = APPEND(doc_nodes, cluster_edges)
        LET limit_hit_depth1 = LENGTH(doc_nodes) >= {document_limit}

        RETURN {{
          depth1,
          limit_hit_depth1,
          matched_ids: [@start_vertex]
        }}
        """

        bind_vars = {
            "default_clusters": list(DEFAULT_CLUSTER_KEYS),
            "edge_type": f"has_{normalized_type}",
            "start_vertex": start_vertex,
        }
        return queried_id, query_str, bind_vars

    @staticmethod
    def deduplicate_key(key: str) -> str | None:
        dedup_map = {
            'country': 'm_country',
            'countries': 'm_country',
            'location': 'm_location',
            'locations': 'm_location',
            'username': 'm_username',
            'usernames': 'm_username',
            'm_actor_names': 'm_attacker',
            'm_address': 'm_location',
            'm_addresses': 'm_location',
            'm_aliases': 'm_alias',
            'm_archive_url': 'm_url',
            'm_attackers': 'm_attacker',
            'm_authors': 'm_author',
            'm_base_url': 'm_url',
            'm_channel_url': 'm_url',
            'm_clearnet_links': 'm_url',
            'm_companies': 'm_company_name',
            'm_company_names': 'm_company_name',
            'm_countries': 'm_country',
            'm_country_name': 'm_country',
            'm_country_names': 'm_country',
            'm_contact_link': 'm_url',
            'm_crypto_addresses': 'm_crypto_address',
            'm_cves': 'm_cve',
            'm_cwes': 'm_cwe',
            'm_domains': 'm_domain',
            'm_dumplink': 'm_url',
            'm_file_arch': 'm_platform',
            'm_file_format': 'm_file_type',
            'm_file_path': 'm_file_paths',
            'm_file_type_mime': 'm_file_type',
            'm_forwarded_from': 'm_person',
            'm_external_scanners': 'm_url',
            'm_gimphash': 'm_imphash',
            'm_github_link': 'm_url',
            'm_github_links': 'm_url',
            'm_hashtags': 'm_hashtag',
            'm_hashes': 'm_hashes',
            'm_ipv4_addresses': 'm_ip',
            'm_ipv4_cidrs': 'm_ip',
            'm_ipv6_addresses': 'm_ip',
            'm_ipv6_cidrs': 'm_ip',
            'm_ips': 'm_ip',
            'm_mac_addresses': 'm_mac_address',
            'm_media_url': 'm_url',
            'm_message_sharable_link': 'm_url',
            'm_md5_hash': 'm_md5',
            'm_md5_hashes': 'm_md5',
            'm_mirror_links': 'm_url',
            'm_orgs': 'm_org',
            'm_organization': 'm_org',
            'm_organizations': 'm_org',
            'm_os': 'm_platform',
            'm_phone_numbers': 'm_phone_number',
            'm_platforms': 'm_platform',
            'm_reference': 'm_url',
            'm_references': 'm_url',
            'm_registry_key_paths': 'm_registry_key_path',
            'm_reporters': 'm_reporter',
            'm_refs': 'm_url',
            'm_sender_name': 'm_person',
            'm_sender_username': 'm_username',
            'm_sha1_hash': 'm_sha1',
            'm_sha1_hashes': 'm_sha1',
            'm_sha3_384_hash': 'm_sha3_384',
            'm_sha3_384_hashes': 'm_sha3_384',
            'm_sha256_hash': 'm_sha256',
            'm_sha256_hashes': 'm_sha256',
            'm_source_channel_url': 'm_url',
            'm_source_url': 'm_url',
            'm_state': 'm_location',
            'm_states': 'm_location',
            'm_sub_url': 'm_url',
            'm_telephone_nums': 'm_phone_number',
            'm_uk_nhs_numbers': 'm_uk_nhs',
            'm_unencoded_urls': 'm_url',
            'm_us_driver_licenses': 'm_us_driver_license',
            'm_urls': 'm_url',
            'm_usernames': 'm_username',
            'm_users': 'm_person',
            'm_web_url': 'm_url',
            'm_websites': 'm_url',
            'm_weblink': 'm_url',
            'm_yara_rules': 'm_yara_rule',
        }

        canonical = dedup_map.get(key, key)
        return canonical if canonical in allowed_key_titles or canonical in EntityRequestGenerator.GRAPH_EXTRA_KEY_TITLES else None
