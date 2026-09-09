# System Info

## directory

### Description

Retrieve the complete list of monitored and crawled sources across Clearnet, Onion, and I2P.

Supported filters:
- **page:** page number of the result
- **network:** all, onion, i2p, clearnet
- **index:** all, general, leak, defacement, chat, exploit, twitter, reddit
- **content_type:** all, general, forums, news, stolen, drugs, hacking, marketplaces, cryptocurrency, leaks, adult, tracking, chat, social
- **daterange:** optional date range (e.g., `2025-12-03,2025-12-18`)

Results include URL, detected content type(s), index classification, network layer, and last-update metadata.


### Response

Paginated directory results containing fields:
- **url** — source address
- **content_type** — detected source categories
- **index_type** — assigned indexing group
- **leak_model_last_update / generic_model_last_update** — last time parsed
- **network_type** — clearnet / onion / i2p
- **name** — resolved source identifier (if applicable)

Example response:
```json
{
  "total": 12345,
  "page": 1,
  "results": [
    {
      "url": "http://exampleonionforumabcdef.onion/",
      "content_type": ["forums", "hacking"],
      "index_type": "general",
      "leak_model_last_update": "2025-12-05T10:15:00Z",
      "generic_model_last_update": "2025-12-04T09:00:00Z",
      "network_type": "onion",
      "name": "Example Darknet Forum"
    }
  ]
}
```


---

## insight

### Description

Retrieve system-wide analytics and high-level intelligence metrics across all monitored data sources.

This endpoint does not take any parameters and returns pre-aggregated insights computed by Orion.

Returned analytics include (per data type such as general, leak, defacement):
- Document volume and activity over time (`document_count`, `updated_5_days_ago`, `updated_9_days_ago`)
- Freshness indicators (`most_recent`, `oldest_update`)
- Enrichment density (`url_document_count`, `archive_document_count`, `email_document_count`, `phone_document_count`, `clearnet_document_count`)
- Common content characteristics (`common_types`, `top_team`, `common_server`, `unique_base_urls`, `dumps_document_count`, etc.)

Each metric is returned as an object containing:
- **key** — human-readable label
- **value** — current metric value
- **change_weekly** — weekly change percentage (string)
- **change_daily** — daily change percentage (string)

It also returns latest documents discovered across leak, generic and defacement sources, as well as graph-style aggregations such as top teams, locations, and hashtags.


### Response

System-wide insight payload with three main sections:

- **insights** — aggregated metrics grouped by data type (e.g. `general`, `leak`, `defacement`), each containing objects of the form:
  - **document_count** — { key, value, change_weekly, change_daily }
  - **most_recent / oldest_update** — { key, value, change_weekly, change_daily }
  - **updated_5_days_ago / updated_9_days_ago** — { key, value, change_weekly, change_daily }
  - **average_score** — { key, value, change_weekly, change_daily } (where applicable)
  - **url_document_count, archive_document_count, email_document_count, phone_document_count, clearnet_document_count** — enrichment metrics
  - **common_types, dumps_document_count, unique_base_urls, top_team, common_server** — category-specific metrics

- **latestDocument** — latest crawled documents by model type:
  - **leak_model, exploit_model, chat_model, generic_model, defacement_model** — each is a list of documents with:
    - **title** — document title or caption
    - **date** — human-readable discovery or publish date
    - **location** — optional geo/location field
    - **phoneNumber** — extracted phone numbers (if any)
    - **url** — list of associated URLs
    - **source** — origin (e.g. onion, XYZ)
    - **hash** — internal document hash identifier

- **graph_insight** — graph and aggregation-oriented insights represented as a 2-element array:
  - index 0 — boolean flag indicating graph availability
  - index 1 — list of aggregation objects, each including:
    - **aggregation_name** — e.g. 'Top Teams (Leak)', 'Top Teams (Defacement)', 'Top Locations (Defacement)', 'Top Hashtags (Social)'
    - **index** — underlying model/index (e.g. `leak_model`, `defacement_model`, `chat_model`)
    - **buckets** — list of key/count pairs representing the top entities (teams, locations, hashtags, etc.)

Example response:
```json
{
  "insights": {
    "general": {
      "document_count": {
        "key": "Document Count",
        "value": 57,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "most_recent": {
        "key": "Most Recent",
        "value": "26 Nov",
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "oldest_update": {
        "key": "Oldest Update",
        "value": "26 Nov",
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "updated_5_days_ago": {
        "key": "Updated 5 Days ago",
        "value": 0,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "updated_9_days_ago": {
        "key": "Updated 9 Days ago",
        "value": 0,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "average_score": {
        "key": "Average Score",
        "value": 50.75,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "url_document_count": {
        "key": "URL/Document",
        "value": 451,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "archive_document_count": {
        "key": "Archive/Document",
        "value": 5,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "email_document_count": {
        "key": "Email/Document",
        "value": 3,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "phone_document_count": {
        "key": "Phone/Document",
        "value": 0,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "clearnet_document_count": {
        "key": "Clearnet/Document",
        "value": 68,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "common_types": {
        "key": "Common Type",
        "value": "Adult",
        "change_weekly": "0%",
        "change_daily": "0%"
      }
    },
    "leak": {
      "document_count": {
        "key": "Document Count",
        "value": 3,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "url_document_count": {
        "key": "URL/Documents",
        "value": 0,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "dumps_document_count": {
        "key": "Dumps/Document",
        "value": 8,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "updated_5_days_ago": {
        "key": "Updated 5 Days ago",
        "value": 3,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "updated_9_days_ago": {
        "key": "Updated 9 Days ago",
        "value": 3,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "most_recent": {
        "key": "Most Recent",
        "value": "03 Dec",
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "oldest_update": {
        "key": "Oldest Update",
        "value": "03 Dec",
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "unique_base_urls": {
        "key": "Unique Base URLs",
        "value": 3,
        "change_weekly": "0%",
        "change_daily": "0%"
      }
    },
    "defacement": {
      "document_count": {
        "key": "Document Count",
        "value": 12,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "updated_5_days_ago": {
        "key": "Updated 5 Days ago",
        "value": 6,
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "top_team": {
        "key": "Top Team",
        "value": "Alpha Wolf",
        "change_weekly": "0%",
        "change_daily": "0%"
      },
      "common_server": {
        "key": "Common Server",
        "value": "Litespeed",
        "change_weekly": "0%",
        "change_daily": "0%"
      }
    }
  },
  "latestDocument": {
    "leak_model": [
      {
        "title": "Announcement",
        "date": "December 03, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "http://brohoodyaifh2ptccph5zfljyajjabwjjo4lg6gfp4xb6ynw5w7ml6id.onion/"
        ],
        "source": "onion",
        "hash": "ca1c7476db86b66c05773f62b85ea5ab0042cd356744ad189f218d16b29db344"
      }
    ],
    "exploit_model": [],
    "chat_model": [],
    "generic_model": [
      {
        "title": "shop pirated content - best hacked accounts, stolen credit cards and other hacker stuff.",
        "date": "November 26, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "http://2222222dk552uwysu3xjaotjmf7basqqrhxrjundlmnzhp6yauj6puqd.onion/shop/cards/mastercard"
        ],
        "source": "onion",
        "hash": "2e3fbb01cb946b9afc5c67e249ffe5431985a05e3b79c5359f2b420231257a71"
      },
      {
        "title": "coin swap",
        "date": "November 26, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "http://2222222m7dzmk7wffagz7cduawmrciml67s3brw2pmvjihhhuf3hukid.onion/convert/?amount_from=0.01012&from_coin=BTC&to_coin=XMR"
        ],
        "source": "onion",
        "hash": "ed72d568d19e1fc76e6d6102b465fd27f244771e97927766b40bf284d3700ca7"
      },
      {
        "title": "shop pirated content - best hacked accounts, stolen credit cards and other hacker stuff.",
        "date": "November 26, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "http://2222222dk552uwysu3xjaotjmf7basqqrhxrjundlmnzhp6yauj6puqd.onion/shop/cards/visa"
        ],
        "source": "onion",
        "hash": "ed2f9550a258229c7c7f4db6df457a34c98392c8a7178bca41dda9413c721ab9"
      },
      {
        "title": "coin swap",
        "date": "November 26, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "http://2222222m7dzmk7wffagz7cduawmrciml67s3brw2pmvjihhhuf3hukid.onion/convert/?amount_from=0.00164&from_coin=BTC&to_coin=DOGE"
        ],
        "source": "onion",
        "hash": "649845a2c6c8d0bc13a88582ff822caf5e9fc745f47d162c3185ffac1e5b4849"
      }
    ],
    "defacement_model": [
      {
        "title": "http://phaoboi.vn/",
        "date": "December 03, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "http://phaoboi.vn/"
        ],
        "source": "XYZ",
        "hash": "31d109a231bfdaa36fc757a7c749253021f04fad0c54d08455c516007c7feabb"
      },
      {
        "title": "https://www.phdfpakistan.com/index.html",
        "date": "December 03, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "https://www.phdfpakistan.com/index.html"
        ],
        "source": "XYZ",
        "hash": "599e8416b67e070178ccbfd0b727abe01150f17a3c50dc20446c72825bf8c523"
      },
      {
        "title": "https://monsite-wp.net/index.html",
        "date": "December 03, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "https://monsite-wp.net/index.html"
        ],
        "source": "XYZ",
        "hash": "50440bc0e8994252e3fac7299bd110afc3086bb54f171468a55e246778b8c170"
      },
      {
        "title": "https://www.arc9.us/",
        "date": "December 03, 2025",
        "location": "",
        "phoneNumber": [],
        "url": [
          "https://www.arc9.us/"
        ],
        "source": "XYZ",
        "hash": "fbee8ab2e997183dc9bc2580a99f8ac6a70744fc8f51ff5ea69d7d600ca367e9"
      }
    ]
  },
  "graph_insight": [
    true,
    [
      {
        "aggregation_name": "Top Teams (Leak)",
        "index": "leak_model",
        "buckets": [
          {
            "key": "BROTHERHOOD",
            "count": 3
          }
        ]
      },
      {
        "aggregation_name": "Top Teams (Defacement)",
        "index": "defacement_model",
        "buckets": [
          {
            "key": "Alpha Wolf",
            "count": 6
          },
          {
            "key": "BONDOWOSO BLACK HAT",
            "count": 4
          },
          {
            "key": "Death Networks",
            "count": 1
          }
        ]
      },
      {
        "aggregation_name": "Top Locations (Defacement)",
        "index": "defacement_model",
        "buckets": []
      },
      {
        "aggregation_name": "Top Hashtags (Social)",
        "index": "chat_model",
        "buckets": []
      }
    ]
  ]
}
```


---

# Reports

## defacement

### Description

Search defacement intelligence reports for hacked or phishing websites; returns a paginated list of defacement events and their metadata.

Request body (`search_consolidated_param_model`):
- **q** — free-text search over URL, IP, team, attacker handle and content fields (default: empty string)
- **category** — optional category filter (default `all`)
- **page** — page number of the paginated result set (1-based)
- **network** — one of: `all`, `clearnet`, `onion`, `i2p` (default `all`)
- **daterange** — optional leak/observation date range in `YYYY-MM-DD,YYYY-MM-DD` format; empty string means no date filter
- **attacker** — attacker nick/handle to match against `m_attacker`
- **team** — defacement crew or group name to match against `m_team`
- **content** — optional content/type string (for example an IOC/incident label) depending on configuration
- **must** — when `true`, values in `entity_filter` are treated as mandatory (must) filters
- **matchtype** — logical operator for combining query / attacker / team / entity_filter clauses (`and` or `or`)
- **entity_filter** — IOC-style filter map of field → list of values. Example valid payload:
```json
{
  "entity_filter": {
    "m_ip": ["103.218.122.8"],
    "m_attacker": ["XYZ"],
    "m_team": ["Alpha Wolf"]
  }
}
```
Commonly supported fields include `m_ip`, `m_domain`, `m_country`, `m_location`, `m_attacker`, `m_team`, `m_ioc_type`, `m_web_server`, `m_social_media_profiles`, `m_scrap_file` and other IOC-style keys depending on deployment.

Minimal example request:
```json
{
  "q": "defacer.net",
  "page": 1,
  "attacker": "XYZ",
  "team": "Alpha Wolf",
  "entity_filter": { "m_ip": ["103.218.122.8"] },
  "matchtype": "or",
  "daterange": "2025-11-28,2025-12-03"
}
```


### Response

Defacement search results containing a paginated list of hacked/defaced or phishing websites.

The response is a JSON object with:
- **Result** — list of defacement report objects
- **Suggestions** — optional list of suggested queries or corrections (may be empty)
- **Page_Count** — number of pages available for the given query and filters (may be fractional depending on backend calculation)

Each entry in **Result** typically contains:
- **m_location** — geo-location or region for the affected asset, when available
- **m_attacker** — list of attacker nicknames/handles claiming the defacement
- **m_team** — defacement crew or group name
- **m_hash** — internal hash of the event/document used for deduplication
- **m_web_server** — list of observed web-server banners (for example `LiteSpeed`, `Apache`, `Cloudflare`, `unknown`)
- **m_ioc_type** — high-level classification such as `hacked`, `phishing`, etc.
- **m_content** — extracted HTML/text content or landing page text when captured
- **m_base_url** — base/source platform (for example `https://defacer.net`)
- **m_url** — URL of the defaced or phishing page
- **m_ip** — list of IP addresses associated with the defaced host
- **m_leak_date** — date the defacement was first recorded/observed
- **m_source_url** — list of source pages describing the defacement (for example the defacer.net view URL)
- **m_screenshot** — screenshot reference when available, otherwise `null`
- **m_mirror_links** — list of mirror/screenshot links for the defacement entry

Example response:
```json
{
  "Result": [
    {
      "m_location": null,
      "m_attacker": ["XYZ"],
      "m_team": "Alpha Wolf",
      "m_hash": "31d109a231bfdaa36fc757a7c749253021f04fad0c54d08455c516007c7feabb",
      "m_web_server": ["LiteSpeed"],
      "m_ioc_type": ["hacked"],
      "m_content": null,
      "m_base_url": "https://defacer.net",
      "m_url": "http://phaoboi.vn/",
      "m_ip": ["103.218.122.8"],
      "m_leak_date": "2025-12-03",
      "m_source_url": ["https://defacer.net/view/54543/"],
      "m_screenshot": null,
      "m_mirror_links": ["https://defacer.net/sc/54543"]
    }
  ],
  "Suggestions": [],
  "Page_Count": 1.2
}
```

Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## stix

### Description

Return a **STIX 2.1 bundle** for a single document.

This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing:
- **TLP marking definitions** (AMBER and RED)
- a primary **report** object
- optional **infrastructure** describing the source/service (e.g., onion market/forum)
- extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`)
- an **observed-data** object referencing extracted SCOs
- optional **indicator** objects with STIX patterns for extracted observables

Request:
- **doc_id** — required. Orion document identifier.
- **lang** — optional. Language variant requested from backend.

Notes:
- Missing fields are skipped (no empty objects are emitted).
- `report.object_refs` links all generated objects (indicators, infrastructure, observed-data, etc.).
- `report.external_references` includes the source URL (when available) and Orion content hash.
- Custom Orion metadata is exported using `x_orion_*` properties on relevant objects.

Minimal example request:
```json
{
  "doc_id": "4856ea0a54f79ddb5ad8377ecf3b08f16491441208aaab95c095dcb0b46266a1",
  "lang": "en"
}
```


### Response

A STIX 2.1 bundle matching the structure below.

Top-level response fields:
- **type**: `bundle`
- **id**: `bundle--<uuid>`
- **spec_version**: `2.1`
- **objects**: array of STIX objects

Objects you will commonly see in `objects`:
1) **marking-definition** (TLP AMBER / TLP RED)
2) **infrastructure** (optional) — e.g., onion/clearnet service context
3) **SCOs** (optional) — `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, etc.
4) **observed-data** (optional) — references SCOs via `object_refs`
5) **indicator** (optional) — one per IOC category with `pattern_type: stix`
6) **report** — the primary object that ties everything together via `object_refs`

Example response:
```json
{
  "type": "bundle",
  "id": "bundle--9b9910f5-1d12-5908-bcfc-862ad032bcf7",
  "spec_version": "2.1",
  "objects": [
    {
      "type": "marking-definition",
      "spec_version": "2.1",
      "id": "marking-definition--...",
      "created": "2025-12-09T03:35:41.659Z",
      "definition_type": "tlp",
      "definition": {"tlp": "amber"}
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": ["anonymization"],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": ["leaks", "marketplaces", "onion", "orion:general"],
      "object_marking_refs": ["marking-definition--..."],
      "x_orion_network": "onion"
    },
    {
      "type": "url",
      "id": "url--...",
      "value": "http://example.onion"
    },
    {
      "type": "domain-name",
      "id": "domain-name--...",
      "value": "example.onion"
    },
    {
      "type": "observed-data",
      "spec_version": "2.1",
      "id": "observed-data--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "first_observed": "2025-12-09T03:35:41.659Z",
      "last_observed": "2025-12-09T03:35:41.659Z",
      "number_observed": 1,
      "object_refs": ["domain-name--...", "url--..."],
      "object_marking_refs": ["marking-definition--..."]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": ["malicious-activity"],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": ["leaks", "marketplaces", "onion", "orion:general"],
      "object_marking_refs": ["marking-definition--..."]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": ["threat-report"],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": ["leaks", "marketplaces", "onion", "orion:general"],
      "lang": "en",
      "external_references": [
        {"source_name": "source", "url": "http://example.onion"},
        {"source_name": "content-hash", "external_id": "<hash>"}
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": ["marking-definition--..."],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```


---

## breach

### Description

Get a specific breach monitoring report for a tracked website or asset by its report ID.

The request is an HTTP GET and accepts:
- **doc_id** (path) — string identifier of the breach report document
- **lang** (query, optional) — language code for localized narrative content when available.

No request body is required.


### Response

Single breach monitoring report document, returned as a JSON object representing the tracked website or asset and associated breach data.

Example response:
```json
{
  "m_title": "Columbus Regional Healthcare System",
  "m_url": "http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion/",
  "m_screenshot": "69993154316451142028569605097804",
  "m_base_url": "http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion",
  "m_content": "Columbus Regional Healthcare System has one of the highest volume and most experienced robotic surgical programs in Southeastern North Carolina. http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion/",
  "m_important_content": "Columbus Regional Healthcare System has one of the highest volume and most experienced robotic surgical programs in Southeastern North Carolina.",
  "m_network": "onion",
  "m_content_type": ["leaks"],
  "m_weblink": ["https://crhealthcare.org/"],
  "m_dumplink": ["https://crhealthcare.org/"],
  "m_company_name": "Columbus Regional Healthcare System",
  "m_location": ["US"],
  "m_team": "diaxin",
  "m_scrap_file": "_7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd",
  "m_language": ["en"],
  "m_domain": [
    "7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion",
    "crhealthcare.org"
  ],
  "m_hash": "1a17b87ad12262b38a81419c3d1cc8c57868ce62b9e32e042ff1b20a9aefacc0",
  "m_update_date": "2025-12-03T20:46:34.909368+00:00",
  "m_creation_date": "2025-12-03T20:46:34.909391+00:00",
  "content_type": ["ddos", "darkweb"]
}
```

Common fields and their meaning:
- **m_title** — human-readable title of the victim or breached asset
- **m_url** — leak or post URL on the darkweb/dump source
- **m_screenshot** — screenshot identifier (use `/api/search/breach/screenshot/{m_screenshot}`)
- **m_base_url** — base onion/clearnet URL of the leak site
- **m_content** — full textual content of the breach announcement
- **m_important_content** — condensed summary of the breach
- **m_network** — network type (e.g. `onion`)
- **m_content_type** — internal category labels (e.g. `leaks`)
- **m_weblink** — URLs pointing to the victim’s clearnet web presence
- **m_dumplink** — URLs referencing claimed leaked data
- **m_company_name** — normalized company/organization name
- **m_location** — list of associated country/region codes
- **m_team** — threat actor or ransomware group name
- **m_scrap_file** — internal scraper identifier
- **m_language** — detected language(s)
- **m_domain** — domains associated with the leak site and victim
- **m_hash** — internal hash used for deduplication and correlation
- **m_update_date** — last update timestamp
- **m_creation_date** — ingestion timestamp
- **content_type** — high-level classification tags (e.g. `ddos`, `darkweb`)


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## news

### Description

Get a specific breach-related news intelligence report generated from external news feeds by its report ID.

The request is an HTTP GET and accepts:
- **doc_id** (path) — string identifier of the news report document
- **lang** (query, optional) — language code to localize narrative sections when supported.

No request body is required.


### Response

News intelligence report document describing breach- or threat-related events from external news sources, returned as a single JSON object.

Core response fields typically include:
- **m_title** — title of the article or report
- **m_url** — direct URL of the article
- **m_base_url** — base URL of the source site
- **m_content** — normalized article text, including extracted narrative content
- **m_important_content** — summary or extracted key snippet
- **m_network** — usually `clearnet`
- **m_content_type** — internal classification labels such as `news`
- **m_team** — publishing organization or referenced entity
- **m_weblink** — list of related article URLs
- **m_dumplink** — list of referenced dump or external resources
- **m_organization** — organizations mentioned or discussed in the article
- **m_language** — detected language(s)
- **m_domain** — domains associated with the source
- **m_hash** — internal hash for deduplication
- **m_update_date** — last update timestamp
- **m_creation_date** — ingestion timestamp
- **content_type** — high-level classification tags used by other modules

Example response:
```json
{
  "m_title": "Turning Intelligence Into Action with Threat-Informed Defense",
  "m_url": "https://thehackernews.com/expert-insights/2025/09/turning-intelligence-into-action-with.html",
  "m_base_url": "https://thehackernews.com/",
  "m_content": "Jean-Philippe Salles — Head of Product at Filigran Sept 22, 2025  Cybersecurity is undergoing a necessary transformation from reacting to threats as they arise to proactively anticipating and addressing them through Threat-Informed Defense (TID). This shift emphasizes operational discipline over accumulating more tools. It involves using threat intelligence to streamline existing technologies, enhance the quality of security signals, and focus efforts on the threats most relevant to each organization. The goal is to continuously identify and close security gaps by combining insights from external threat data with internal defense capabilities.  How do you put TID into practice? The team at Filigran has broken down the TID framework into a six-stage pipeline to develop actionable chunks for cybersecurity leaders. In this article, we share the details so that your security teams can leverage it too to support TID.  What is Threat-Informed Defense?#  First advocated by MITRE, Threat-Informed Defense (TID) leverages MITRE ATT&CK framework to map how real threat actors operate and align defenses accordingly. It rests on three pillars:  Cyber threat intelligence: First gather, ingest and process all of your threat intelligence to make it contextual and relevant for you. Go beyond IOCs to understand adversary behaviors and intent, which are more durable and more costly for attackers to change. Defensive measures: Translate prioritized threat intelligence into detections, hardening, response playbooks, and configurations; utilize it properly and make it do the work for you. Adapt controls to the threats most likely to target you. Testing and evaluation: Plan adversary emulation and run continuous breach-and-attack simulations to verify coverage and avoid regressions. Gain granular level visibility into the effectiveness of your security programs. Automate and scale for continuous security posture validation and improvement.  Security teams today are facing tighter budgets and limited resources. As a result, many CISOs are shifting their focus from constantly adopting new tools to making the most of the technologies they already have. This change in mindset is driving a more proactive approach to cybersecurity. Instead of waiting for threats to happen, leaders are asking critical questions like 'Who might target us?', 'How do they operate?', 'Are our defenses strong enough?' and 'What's our plan if something fails?'. Implementing a Threat-Informed Defense (TID) strategy requires breaking down silos between teams, encouraging collaboration and information sharing across security operations, threat intelligence, and testing groups.  From Idea to Execution: Threat-Informed Defense Pipeline#  Similar to Continuous Threat Exposure Management (CTEM), TID is a concept, a cybersecurity strategy. Organizations can adopt and implement TID through various approaches, whether using commercial solutions, open-source tools, or hybrid implementations. For example, one approach could involve leveraging Filigran's open-source extended threat management (XTM) suite that combines threat intelligence platform with adversary emulation capabilities. These integrated solutions help security teams operationalize TID through six actionable stages:  Stage 01: Strategic threat landscape assessment#  Goal: Identify which adversaries, malware, and campaigns are most relevant to your business model, stack, and region.  How: Threat assessment in threat-informed defense involves systematically evaluating and prioritizing the specific threat actors, their capabilities, tactics, techniques, and procedures (TTPs) that are most likely to target your organization's critical assets. A threat intelligence platform (TIP) allows you to gather, analyze, refine and share prioritized threat intelligence is a useful component for this step.  Outcome: A prioritized watchlist with clear inclusion criteria and analyst annotations.  Stage 02: Actor and malware tracking#  Goal: Keep pace with evolving TTPs and indicators while filtering noise.  How: Maintain adaptive watchlists; triage incoming reports; tag IOCs and TTPs and distribute them to SIEM/EDR/SOAR. Modern TIPs like open-source based OpenCTI use knowledge graph models to provide powerful visualizations to link campaigns, malware, techniques, and exploited vulnerabilities.  Outcome: Continuously updated views of active threats and automated, stakeholder-ready reporting to show program progress.  Stage 03: TTP and report mapping#  Goal: See where attacker behaviors outpace your defenses.  How: Advanced Persistent Threats (APTs) and opportunistic attackers increasingly target the expanded attack surface created by cloud-native architectures, leveraging misconfigurations in multi-cloud environments, exploiting container escape vulnerabilities, poisoning CI/CD pipelines with malicious code, and conducting identity-based attacks through stolen credentials and API keys. OpenCTI can serve as a critical enabler for this assessment by centralizing and correlating threat intelligence specific to your technology stack, automatically ingesting indicators and TTPs from multiple sources—including cloud provider threat feeds, container security advisories, and identity-focused threat research. The platform maps these threats to the MITRE ATT&CK framework, allowing security teams to visualize adversary groups.  Outcome: A prioritized TTP list ready for adversary emulation and detection engineering.  Stage 04: Breach & attack simulation#  Goal: Prove whether you security controls detect and respond as designed.  How: Testing security controls in TID moves beyond generic vulnerability scanning and compliance checks to validate whether your defenses actually stop the specific adversary behaviors targeting your organization. Adversary Exposure Validation (AEV) tools makes threat intelligence actionable by emulating the exact techniques your most likely threat actors employ. Filigran's open-source OpenBAS provides scalability to design and execute purple team exercises, breach and attack simulations, and atomic red team tests. It also feed outcomes back into OpenCTI to maintain context with the threats that matter.  Outcome: A continuous feedback loop that catches regressions, validates detections, and informs engineering fixes.  Stage 05: Control validation and investment#  Goal: Translate intel and testing into targeted remediation and budget decisions.  How: Use time-series and historical snapshots to show coverage trends and risk reduction. Apply remediation guidance from OpenBAS to tune configs, update rules, and plan upgrades or replacements. The continuous validation using the combination of OpenCTI and OpenBAS creates a feedback loop that informs strategic investments and architectural decisions with unprecedented precision. The quantifiable nature of these insights enables CISOs to justify budget requests with specific risk reduction metrics, prioritize engineering efforts based on actual adversary impact  Outcome: Evidence-based prioritization that improves day-to-day resilience and informs quarterly planning.  Stage 06: Quarterly review#  Goal: Recalibrate strategy and maintain executive alignment.  How: Consolidate threat insights, control coverage, and simulation results into executive-ready reporting. Our recommendation is to make this as a quarterly exercise to share with your key stakeholders. This creates a closed-loop system where threat intelligence directly drives security validation priorities. Revisit tracked threats, business priorities, and risk appetite as part of a broader Continuous Threat Exposure Management (CTEM) rhythm.  Outcome: A living program that stays aligned to business risk and adversary reality.  Ready to make the shift to Threat-Informed Defense?#  Utilize TID to shift the conversation from traditional security life cycle (protection/detection/response) to proactive finding the gaps in your security controls and reducing cyber risks. The empirical approach of TID provides metrics that matter, from 'we blocked 10 million attacks' to 'we can detect and stop 85% of the techniques used by the ransomware groups actively targeting our sector and here is what we are going to do to fill our gaps for the rest 15%'.  If you'd like to learn more about TID, Filigran's open-source product suite, and its alignment with the framework you can download our latest white paper, A Practical Guide to Threat-Informed Defense, or contact us to speak directly with our team.    SHARE      Tweet  Share  Share  Share",
  "m_important_content": "Jean-Philippe Salles — Head of Product at Filigran Sept 22, 2025  Cybersecurity is undergoing a necessary transformation from reacting to threats as they arise to proactively anticipating and addressing them through Threat-Informed Defense (TID). This shift emphasizes operational discipline over accumulating more tools.",
  "m_network": "clearnet",
  "m_content_type": ["news"],
  "m_weblink": [
    "https://thehackernews.com/expert-insights/2025/09/turning-intelligence-into-action-with.html"
  ],
  "m_dumplink": [
    "https://thehackernews.com/expert-insights/2025/09/turning-intelligence-into-action-with.html"
  ],
  "m_team": "hackernews live",
  "m_scrap_file": "_thehackernews",
  "m_organization": ["Filigran", "MITRE", "Cybersecurity"],
  "m_language": ["en"],
  "m_domain": ["thehackernews.com"],
  "m_hash": "7cd89edea323f8127203c984df5df7d7cbb0b564cae4b5ef770f7050f11cba34",
  "m_update_date": "2025-10-10T08:21:46.160580+00:00",
  "m_creation_date": "2025-10-10T08:21:46.186711+00:00"
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## exploit

### Description

Get a specific exploit intelligence report (CVE, exploit kit, zero-day activity, etc.) by its report ID.

The request is an HTTP GET and accepts:
- **doc_id** (path) — string identifier of the exploit report document
- **lang** (query, optional) — language code for localized narrative fields when available.

No request body is required.


### Response

Exploit intelligence report document containing exploit details, returned as a single JSON object.

Core response fields typically include:
- **m_title** — exploit or module title
- **m_url** — direct URL for the exploit/module page
- **m_base_url** — base URL of the publishing site or contact page
- **m_content** — normalized exploit description or short text body
- **m_important_content** — key snippet or short summary emphasizing the exploit name or purpose
- **m_network** — network type of the source, typically `clearnet`
- **m_content_type** — internal labels such as `cve`, `exploit`, `poc`
- **m_weblink** — list of additional URLs related to the exploit (e.g. source code or commits)
- **content_type** — high-level classification tags used by other modules
- **m_name** — author or contributor information
- **m_code_snippet** — list of code or command snippets showing usage of the exploit
- **m_platform** — list of affected or supported platforms
- **m_scrap_file** — internal scraper identifier or file prefix
- **m_domain** — domains related to the exploit content and references
- **m_hash** — internal hash for this document, used for deduplication and correlation
- **m_update_date** — last time the document was updated in the system
- **m_creation_date** — first time the document was created/ingested into the system

Depending on the source and context, additional enrichment fields may be present, such as CVE identifiers, threat actor information or extended narrative text.

Example response:
```json
{
  "m_title": "Windows Registry Only Persistence",
  "m_url": "https://www.rapid7.com/db/modules/exploit/windows/persistence/registry/",
  "m_base_url": "https://www.rapid7.com/contact/",
  "m_content": "Windows Registry Only Persistence",
  "m_important_content": "Windows Registry Only Persistence",
  "m_network": "clearnet",
  "m_content_type": ["cve"],
  "m_weblink": [
    "https://github.com/rapid7/metasploit-framework/blob/master//modules/exploits/windows/persistence/registry.rb",
    "https://github.com/rapid7/metasploit-framework/commits/master//modules/exploits/windows/persistence/registry.rb"
  ],
  "content_type": ["persistence"],
  "m_name": "Donny Maasland donny.maasland@fox-it.com,h00die",
  "m_code_snippet": [
    "msf > use exploit/windows/persistence/registry\n\n    msf exploit(registry) > show targets\n\n        ...targets...\n\n    msf exploit(registry) > set TARGET < target-id >\n\n    msf exploit(registry) > show options\n\n        ...show and set options...\n\n    msf exploit(registry) > exploit"
  ],
  "m_platform": ["Windows"],
  "m_scrap_file": "_rapid7",
  "m_domain": [
    "github.com",
    "rapid7.com",
    "rapid7.com/contact"
  ],
  "m_hash": "6c88d95f4d98b5c95f65a79da548fd5c3b33d6ac319790c33630dc2f2d869019",
  "m_update_date": "2025-10-28T18:09:14.512739+00:00",
  "m_creation_date": "2025-10-28T18:09:14.516589+00:00"
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## strategic

### Description

Get a specific strategic intelligence report aggregating crawled content from onion, I2P, and similar hidden-service pages by its report ID.

The request is an HTTP GET and accepts:
- **doc_id** (path) — string identifier of the strategic (generic) report document
- **lang** (query, optional) — language code for localized narrative content.

No request body is required.


### Response

Strategic darkweb intelligence document representing a single crawled page (such as a marketplace listing, forum thread or generic page), returned as a JSON object.

Core response fields typically include:
- **m_base_url** — base URL of the hidden service or site
- **m_url** — specific page URL
- **m_network** — network type (e.g. `onion`)
- **m_title** — page title as seen in the source
- **m_meta_description** — meta description extracted from the HTML, if available
- **m_content** — normalized text content extracted from the page
- **m_important_content** — key snippet or condensed portion of the most relevant text
- **m_images** — list of image URLs extracted from the page
- **m_sub_url** — list of internal navigation or related links
- **m_validity_score** — internal confidence/validity score for the crawled document
- **m_meta_keywords** — keyword string summarizing tags, topics and SEO-style keywords (when available)
- **m_content_type** — internal classification labels such as `marketplaces`, `general`, `forums`
- **m_country** — list of associated countries inferred from the content or targeting
- **m_location** — list of locations or regions mentioned or targeted
- **m_organization** — extracted organizations or platforms mentioned
- **m_language** — detected language(s) of the content
- **m_currencies** — list of currencies mentioned or used on the page
- **m_domain** — list of domains associated with the page and its references
- **m_hash_content** — hash of the normalized page content
- **m_hash_url** — hash of the page URL
- **m_hash** — internal document hash identifier used for deduplication and correlation
- **m_update_date** — last time the document was updated in the system
- **m_creation_date** — first time the document was created/ingested into the system

Depending on the source, additional enrichment fields may be present, such as forum-specific metadata, structured attributes describing the section or category, or clearnet reference links.

Example response:
```json
{
  "m_base_url": "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion",
  "m_url": "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/popular/442",
  "m_network": "onion",
  "m_title": "giftcardxpress - buy cheap gift cards",
  "m_meta_description": "save up to 70% on all your favorite gift cards",
  "m_content": "save up to 70 on all your favorite gift cards\nsave up to 70% on all your favorite gift cards\nSave up to 70% on all your favorite gift cards",
  "m_important_content": "no description found but contains some urls. this website is most probably a search engine or only contain references of other websites giftcardxpress - buy cheap gift cards save up to 70% on all your favorite",
  "m_images": [
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/static/assets/amazon.png",
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/static/assets/amazon.png"
  ],
  "m_sub_url": [
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/popular/823",
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/new_arraival/823"
  ],
  "m_validity_score": 0,
  "m_content_type": ["marketplaces"],
  "m_domain": [
    "amazon.de",
    "cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion"
  ],
  "m_country": ["Spain", "Netherlands", "Germany", "France"],
  "m_organization": ["Amazon", "Fortnite", "iTunes", "GiftCardXpress", "Google", "Steam", "Netflix"],
  "m_location": ["Spain", "Germany", "France"],
  "m_language": ["en"],
  "m_currencies": ["USD", "EUR", "GBP"],
  "m_update_date": "2025-12-02T13:13:55.970184+00:00",
  "m_hash_content": "7c2739bc52efab970134f87542ac382daf25a1fa429aa0a15cbacbe30740b896",
  "m_hash_url": "3fa64feadef7ea1a7765ee0849e6797838a468b3496759042ca7f33c22b9d6f9",
  "m_hash": "c8790e0132c7fdfbbf6420cc9a73f478fbfc884202a5dab6f6ad3f1195882bbd",
  "m_creation_date": "2025-12-02T13:13:55.970231+00:00"
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## chat

### Description

Get a specific chat intelligence report focused on messaging platforms such as Telegram by its report ID.

The request is an HTTP GET and accepts:
- **doc_id** (path) — string identifier of the chat report document
- **lang** (query, optional) — language code used to localize analytical summaries when available.

No request body is required.


### Response

Chat intelligence report consolidating one chat message or a small thread (for example from Telegram), returned as a single JSON object.

Core response fields typically include:
- **m_content** — normalized text content of the message (main body text)
- **m_caption** — original caption text, often mirroring **m_content** for media posts
- **m_message_date** — message date in `YYYY-MM-DD` format
- **m_message_id** — platform-specific message identifier (e.g. Telegram message id)
- **m_message_sharable_link** — deep link to the message (e.g. `https://t.me/...`)
- **m_channel_id** — internal or platform channel identifier
- **m_views** — number of views or impressions for the message
- **m_sender_name** — human-readable sender name (may include additional text)
- **m_sender_username** — sender username/handle (e.g. Telegram `@` handle)
- **m_message_type** — list of message types (e.g. `["photo"]`, `["text"]`)
- **m_media_url** — URL pointing to the media or message (for example a Telegram web link)
- **m_media_caption** — caption/description related to the attached media
- **m_reply_to_message_id** — message id of the parent message when this is a reply
- **m_message_status** — message processing status in the system (e.g. `success`)
- **m_channel_name** — human-readable channel name (e.g. `Mash`)
- **m_weblink** — list of additional links associated with the channel or message (e.g. invite links)
- **m_users** — list of user identifiers or usernames referenced in the message (e.g. `["Tiarkasir"]`)
- **m_content_type** — high-level internal labels for the content (e.g. `["text"]`)
- **m_sender_id** — numeric sender id on the platform
- **m_sender_is_bot** — boolean indicating whether the sender is a bot
- **m_is_forwarded** — boolean indicating whether the message is a forwarded message
- **m_forwarded_date** — original forward date when **m_is_forwarded** is true
- **m_is_reply** — boolean indicating whether the message is a reply
- **m_pinned** — boolean indicating whether the message is pinned in the channel
- **m_location** — list of location strings extracted from the content (e.g. city or area names)
- **m_social_media_profiles** — list of social profile URLs mentioned in the message content
- **m_domain** — list of domains extracted from links in the message
- **m_platforms** — list of platforms referenced or linked (e.g. `["instagram"]`)
- **m_cluster_id** — internal logical cluster/group identifier for related chat items (e.g. `chat`)
- **m_document_id** — internal document id used by the system for this chat record
- **m_hash** — internal content hash used for deduplication and correlation
- **m_creation_date** — timestamp when the message document was created/ingested
- **m_edit_date** — last edit timestamp for the message (if it was edited)
- **m_organization** — list of organizations or entities mentioned (e.g. `Boeing`)
- **m_language** — detected language(s) of the message content (e.g. `["ru"]`)

Depending on the platform and message type, additional enrichment fields may be present, such as media metadata, reaction counts or extended thread context.

Example response:
```json
{
  "m_content": "Причина сигнала бедствия Boeing 777-200 — возгорание одного из двигателей. На данный момент пожар потушен. Сейчас самолёт вырабатывает топливо, готовясь к возвращению в Домодедово в 22:40. Экипаж работает штатно, паники на борту нет. UPD. На судне находятся 412 пассажиров и 13 членов бортовой команды. Подписывайся на Mash",
  "m_caption": "Причина сигнала бедствия Boeing 777-200 — возгорание одного из двигателей. На данный момент пожар потушен. Сейчас самолёт вырабатывает топливо, готовясь к возвращению в Домодедово в 22:40. Экипаж работает штатно, паники на борту нет. UPD. На судне находятся 412 пассажиров и 13 членов бортовой команды. Подписывайся на Mash",
  "m_message_date": "2025-12-03",
  "m_message_id": "69893",
  "m_message_sharable_link": "https://t.me/mash/69893",
  "m_channel_id": "1117628569",
  "m_views": "401445",
  "m_sender_name": "TIAR None",
  "m_sender_username": "Tiarkasir",
  "m_message_type": ["photo"],
  "m_media_url": "https://t.me/mash/69893",
  "m_media_caption": "9 9 1 0 0 0 2 3 0 0 RUKO SENTRA NIAGA KALIMALANG BLOK B-1 NO.24 JALAN AHMAD YANI, KAYURINGIN BELAKANG MALL BCP •QEYSA •LENKA •MEMEY •SANSAN •KHANZA •ALEXA •ANITA •SENA •ESSA •NAOMI •MPIE •VITTA •CATRIN •MUTIA •FELISHA •ARRA •LALA •KIKI •EVA ID INSTAGRAM https://www.instagram.com/new_king_spa_bekasi_selatan?igsh=Znk4cWY3OG1udzZ3 BOKING DISINI @Tiarkasir LOKASI https://maps.app.goo.gl/sNzBhjnHhk7bgF2WA SAYA TUNGGU KEHADIRANNYA SELALU BOS KU",
  "m_reply_to_message_id": "69892",
  "m_message_status": "success",
  "m_channel_name": "Mash",
  "m_weblink": ["https://t.me/+mBgDVq0QTftmY2Ji"],
  "m_users": ["Tiarkasir"],
  "m_content_type": ["text"],
  "m_sender_id": "1117628569",
  "m_sender_is_bot": false,
  "m_is_forwarded": false,
  "m_forwarded_date": "2025-11-05 08:29:26",
  "m_is_reply": true,
  "m_pinned": false,
  "m_location": ["KAYURINGIN"],
  "m_social_media_profiles": ["https://www.instagram.com/new_king_spa_bekasi_"],
  "m_domain": ["instagram.com"],
  "m_platforms": ["instagram"],
  "m_cluster_id": "chat",
  "m_document_id": "e233d6042cec2a3239a701d0eebebe3430f72543c0fd0e20de00f228808cafa5",
  "m_hash": "e233d6042cec2a3239a701d0eebebe3430f72543c0fd0e20de00f228808cafa5",
  "m_creation_date": "2025-12-03T21:36:59.858292+00:00",
  "m_edit_date": "2025-12-03 19:40:44",
  "m_organization": ["Boeing"],
  "m_language": ["ru"]
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## apt_intel

### Description

Search APT actor and malware intelligence reports across the Actors & Malware data set.

This endpoint corresponds to `/api/search/apt-intel` and expects a JSON body matching the consolidated search request model used by indexed investigation modules.

Supported request fields include:

- **q** - free-text query over actor names, malware families, aliases, report titles, descriptions, IOCs, and related metadata.
- **category** - high-level selector. Use `all` for actor and malware results together, `apt` for actor reports, or `malware` / `malware-bazaar` for malware records.
- **page** - page number for paginated results.
- **network** - network scope when applicable.
- **daterange** - optional date range in `YYYY-MM-DD,YYYY-MM-DD` format.
- **content** - content or report-type selector where supported by the active category.
- **entity** - primary IOC/entity dimension for the query.
- **matchtype** - logical operator for combining query and filters.
- **must** - when true, values under **entity_filter** must be present in matched documents.
- **entity_filter** - structured IOC/entity filters, such as family, country, reporter, hashes, domains, IPs, CVEs, URLs, or aliases depending on the selected data source.

### Response

APT Intel search results containing actor, malware, and related threat-intelligence records.

The response is a paginated result object. Result rows can include:

- **doc_id** - document identifier for the report detail endpoint.
- **rank_index** - source index, usually APT or malware.
- **m_title** - actor, malware family, signature, or report title.
- **m_content** - normalized report body or description.
- **m_family** - malware or actor family where present.
- **m_signature** - malware signature where present.
- **m_country** - associated countries where present.
- **m_reporter** - reporting source where present.
- **m_url** - source URLs or references.
- **m_hash** - internal content hash or malware hash fields where present.
- **m_creation_date / m_update_date** - ingestion and update timestamps.

Use `GET /api/search/apt/{doc_id}` for actor report details and `GET /api/search/malware/{doc_id}` for malware report details.

---

## social

### Description

Get a specific social media intelligence report (for example posts by ransomware groups or other threat actors) by its report ID.

The request is an HTTP GET and accepts:
- **doc_id** (path) — string identifier of the social media report document
- **lang** (query, optional) — language code for localized narrative content.

No request body is required.


### Response

Social media intelligence report containing posts and activity from monitored social platforms, returned as a single JSON object.

Core response fields typically include:
- **m_sender_name** — display name or handle of the account that posted the content (e.g. `@lu3ky13`)
- **m_message_sharable_link** — full platform URL or deep link to the post
- **m_content** — normalized text content of the post, including hashtags, mentions and links
- **m_content_type** — internal labels describing the social collector/source type (e.g. `["social_collector"]`)
- **m_message_date** — date the post was created, in `YYYY-MM-DD` format
- **m_channel_url** — URL of the profile, channel or account page
- **m_message_id** — platform-specific unique identifier for the post
- **m_platform** — social platform name (e.g. `twitter`)
- **m_network** — network type for the source (typically `clearnet`)
- **m_views** — approximate view/impression count when available
- **m_comment_count** — number of comments or replies when available
- **m_likes** — number of likes or favorites when available
- **m_retweets** — number of reshares/retweets/boosts when available
- **content_type** — high-level classification tags used by other modules (e.g. `["ddos", "exploit", "rce"]`)
- **m_name** — profile display name (e.g. `lu3ky13`)
- **m_scrap_file** — internal scraper identifier or file prefix (e.g. `_twitter`)
- **m_language** — detected language(s) of the post content (e.g. `["en"]`)
- **m_hashtag** — list of hashtags extracted from the content
- **m_mention** — list of mentioned accounts/handles in the post
- **m_currencies** — list of currencies referenced in the post
- **m_domain** — list of domains referenced in links within the post
- **m_hash** — internal content hash used for deduplication and correlation
- **m_creation_date** — timestamp when the social post document was created/ingested by the system

Depending on the platform and event type, additional enrichment fields may be present, such as reaction breakdowns, attached media details or thread/conversation context.

Example response:
```json
{
  "m_sender_name": "@lu3ky13",
  "m_message_sharable_link": "https://x.com/lu3ky13/status/1852382887246541180",
  "m_content": "Remote Code Execution (RCE) thank you \n@nahamsec\n \n\nYay, I was awarded a $7,800 bounty on \n@Hacker0x01\n! \nhttps://\nhackerone.com/lu3ky-13 #TogetherWeHitHarder #bugbounty",
  "m_content_type": ["social_collector"],
  "m_message_date": "2024-11-01",
  "m_channel_url": "https://x.com/lu3ky13",
  "m_message_id": "1852382887246541180",
  "m_platform": "twitter",
  "m_network": "clearnet",
  "m_views": "23000",
  "m_comment_count": "15",
  "m_likes": "357",
  "m_retweets": "13",
  "m_name": "lu3ky13",
  "m_scrap_file": "_twitter",
  "m_domain": [
    "x.com",
    "hackerone.com"
  ],
  "m_language": ["en"],
  "m_hashtag": ["#bugbounty", "#togetherwehitharder"],
  "m_currencies": ["USD"],
  "m_mention": ["@hacker0x01", "@lu3ky13remote", "@nahamsec"],
  "m_hash": "07b76a8a449633b73d38cc4f7c55ae970e01e942ea525a5dc9f39225de347c2d",
  "m_creation_date": "2025-12-02T11:24:10.131332+00:00",
  "content_type": ["ddos", "exploit", "rce"]
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## breach_screenshot

### Description

Retrieve the screenshot image associated with a specific breach report, stored in WebP format.

The request is an HTTP GET and accepts:
- **filename** (path) — base filename of the screenshot without extension.

No request body is required.


### Response

WebP screenshot image that visually represents the breached website or resource described in the associated breach report. The service automatically appends the `.webp` extension, and the response payload is the raw image bytes.

Example:
- Request: `GET /api/search/breach/screenshot/{filename}`
- Effective file retrieved: `{filename}.webp`
- Response headers: `Content-Type: image/webp` with the binary image data in the body.


---

# Search

## defacement

### Description

Search defacement intelligence reports by keyword, threat group, or affected domain; returns metadata for matching defacement reports.

This endpoint corresponds to `/api/search/defacement` and expects a JSON body matching the `search_consolidated_param_model` schema.

Supported request fields:
- **q** — free-text search query over normalized titles, content and metadata (e.g. banner text, domains).
- **category** — ML-based classifier label (e.g. `all`, `currency`, `forums`, `news`, `leaks`, etc.); can be safely left as `all` to avoid category filtering.
- **page** — page number for paginated results (1-based integer).
- **network** — network scope for the search: `all`, `clearnet`, `onion`, `i2p`, `freenet`.
matching defacement documents.
- **daterange** — optional date range in `YYYY-MM-DD,YYYY-MM-DD` format to restrict results based on creation or update time.
- **attacker** — raw attacker string (actual attacker name as it appears in the source content).
- **must** — if `true`, filtered values (attacker, team, IOC entities) must be present in the document; if `false`, they are treated as optional/boosting filters.
- **matchtype** — logical operator for multi-valued filters: `and` (all values must match) or `or` (any value can match).
- **team** — normalized defacer / hacker / threat actor name (e.g. `mthcht`).
- **content** — high-level defacement content type such as `phishing`, `hacked`, or `databases`.
- **entity_filter** — IOC-based filter object where keys are IOC/metadata fields and values are lists of allowed values (for example domains, IPs, countries, emails, etc.).

Example request payload:
```json
{
  "q": "Hacked by",
  "category": "all",
  "page": 1,
  "network": "onion",
  "daterange": "2025-12-01,2025-12-07",
  "attacker": "mthcht",
  "must": true,
  "matchtype": "and",
  "team": "mthcht",
  "content": "phishing",
  "entity_filter": {
    "m_domain": ["github.com"],
    "m_country": ["US"],
    "m_ip": ["192.0.2.10"]
  }
}
```


### Response

Defacement intelligence search results with metadata for each matching defacement report.

The response is a JSON object containing pagination metadata and a list of defacement documents:

- **total** — total number of matching defacement reports.
- **page** — current page number.
- **page_size** — number of documents returned in this page.
- **results** — list of defacement report summary objects.

Each element in **results** typically includes:
- **doc_id** — internal document identifier to be used with the defacement report detail API.
- **m_title** — defacement/phishing page title or banner text (e.g. `Hacked by mthcht`).
- **m_team** — normalized defacer / hacker / threat actor name.
- **m_base_url** — base URL or service where the content originates (e.g. `https://github.com/`).
- **m_url** — concrete URL of the defaced or phishing page.
- **m_ioc_type** — high-level classification of the event (e.g. `phishing`, `defacement`).
- **m_leak_date** — first observed date for the event.
- **m_network** — network type (`clearnet`, `onion`, `i2p`, etc.).
- **m_domain** — list of domains involved in the event.
- **m_content_type** — classification labels (e.g. [`defacement`, `phishing`]).
- **m_important_content** — key snippet summarizing the defacement.
- **m_screenshot** — screenshot identifier for the defaced page.
- **m_update_date** — last time this document was updated in the system.
- **m_creation_date** — first time the document was created/ingested.
- **m_hash** — internal document hash used for deduplication.

Example response:
```json
{
  "total": 42,
  "page": 1,
  "page_size": 10,
  "results": [
    {
      "doc_id": "c4d0d2d2-3c0a-4e2d-a0f5-9a1c7f9e3c01",
      "m_title": "Hacked by mthcht",
      "m_team": "mthcht",
      "m_base_url": "https://github.com/",
      "m_url": "https://github.com/some-victim-repo",
      "m_ioc_type": "phishing",
      "m_leak_date": "2025-12-01T18:22:41.032Z",
      "m_network": "clearnet",
      "m_domain": [
        "github.com",
        "victim.org"
      ],
      "m_content_type": [
        "defacement",
        "phishing"
      ],
      "m_important_content": "Hacked by mthcht – database dumped and leaked.",
      "m_screenshot": "69993154316451142028569605097804",
      "m_update_date": "2025-12-02T10:05:12.910Z",
      "m_creation_date": "2025-12-01T18:22:41.032Z",
      "m_hash": "9b4b1f15f1f94a5fb3a4a0ea0dcbf9a0"
    }
  ]
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## exploit

### Description

Search exploit and vulnerability intelligence reports using free-text query and structured filters such as CVE identifier, vendor, product, platform, or keyword.

The request is an HTTP POST with a JSON body matching the `search_consolidated_param_model` schema:

```json
{
  "q": "CVE-2024-12345",
  "category": "all",
  "page": 1,
  "safe": false,
  "network": "all",
  "matchtype": "or",
  "daterange": "2025-11-01,2025-12-07",
  "content": "all",
  "entity": "cve",
  "must": false,
  "entity_filter": {
    "m_cve": ["CVE-2024-12345"],
    "m_vendor": ["ExampleCorp"],
    "m_product": ["ExampleServer"]
  }
}
```

Field semantics:
- **q** — free-text query (CVE id, exploit name, vendor, product, function name, etc.). Empty string searches all.
- **category** — ML-based content/category classifier (e.g., `cve`, `exploit`, `poc`, `advisory`); set to `all` to disable.
- **page** — page number for paginated results (1-based).
- **safe** — safety toggle; when true, UI can mask or downrank potentially dangerous payload details.
- **network** — content network filter: `all`, `clearnet`, `onion`, `i2p`, etc.
- **matchtype** — logical operator for combining query and filters: `or` (default) or `and`.
- **daterange** — optional date range filter in `YYYY-MM-DD,YYYY-MM-DD` format (e.g., `2025-11-01,2025-12-07`).
- **content** — exploit content-type filter, such as `all`, `cve`, `exploit`, `poc`, `advisory`.
- **entity** — primary entity/IOC dimension for the query (e.g., `cve`, `vendor`, `product`, `ip`, `domain`).
- **must** — when true, values under **entity_filter** must be present in the matched documents (hard filter).
- **entity_filter** — IOC/entity filter map; keys are IOC fields (e.g., `m_cve`, `m_vendor`, `m_product`, `m_domain`) and
  values are lists of required values for those fields.


### Response

Exploit intelligence search results containing metadata for each matching exploit or vulnerability report.

The response is a JSON object with pagination and a list of exploit documents. Typical fields:
- **total** — total number of exploit documents matching the query and filters
- **page** — current page number
- **results** — list of exploit report summaries, where each entry may include:
  - **m_title** — exploit or vulnerability title (often includes CVE id and short description)
  - **m_url** — primary URL of the exploit or advisory page
  - **m_base_url** — base URL/host of the source site (e.g. `https://www.rapid7.com`)
  - **m_content** — normalized exploit/advisory description or body text
  - **m_important_content** — key snippet summarizing the exploit or impact
  - **m_network** — network classification (`clearnet`, `onion`, etc.)
  - **m_content_type** — internal labels such as `cve`, `exploit`, `poc`, `advisory`
  - **m_cve** — list of associated CVE identifiers
  - **m_vendor** — list of affected vendors
  - **m_product** — list of affected products or components
  - **m_platform** — list of affected platforms/OS (e.g. `Windows`, `Linux`)
  - **m_publication_date** — publication or first-seen date for the exploit/advisory
  - **m_exploit_type** — exploit type or tactic (e.g. `remote_code_execution`, `privilege_escalation`)
  - **m_source** — normalized name of the source (e.g. `rapid7`, `exploitdb`)
  - **m_hash** — internal document hash identifier used for correlation
  - optional IOC/enrichment fields (IP addresses, domains, URLs, file hashes, etc.) depending on the document

Example response:
```json
{
  "total": 87,
  "page": 1,
  "results": [
    {
      "m_title": "CVE-2024-12345 Remote Code Execution in ExampleServer",
      "m_url": "https://www.rapid7.com/db/modules/exploit/example/cve_2024_12345/",
      "m_base_url": "https://www.rapid7.com",
      "m_content": "This module exploits a remote code execution vulnerability in ExampleServer...",
      "m_important_content": "Unauthenticated RCE in ExampleServer via crafted HTTP request.",
      "m_network": "clearnet",
      "m_content_type": ["cve", "exploit"],
      "m_cve": ["CVE-2024-12345"],
      "m_vendor": ["ExampleCorp"],
      "m_product": ["ExampleServer"],
      "m_platform": ["Windows"],
      "m_publication_date": "2025-11-30T14:33:00Z",
      "m_exploit_type": ["remote_code_execution"],
      "m_source": "rapid7",
      "m_hash": "f9d8e7c6b5a4..."
    }
  ]
}
```


---

## breach

### Description

Search breach / leak intelligence reports aggregated from ransomware blogs, extortion sites, leak forums, and darkweb data-dump portals; returns a paginated list of breach announcements and related metadata.

Request body (`search_consolidated_param_model`):
- **q** — free-text search term applied across title, content, location, industry, team name, domains, etc. (default: empty string)
- **category** — logical content bucket. `"all"` searches across consolidated leak indices; other values may restrict the search to specific collections such as `"leaks"`, `"tracking"`, or `"news"` depending on deployment (default: `"all"`). When `"all"`, the backend runs a consolidated ranked search over the core leak index.
- **page** — page number of the paginated result set (1-based; default: `1`).
- **safe** — safe-search toggle. When `true`, sensitive or graphic content is filtered or down-ranked; when `false`, all matching breach items are returned (frontend maps `"yes"/"no"` to this boolean).
- **network** — web layer filter; one of:
  - `"all"` — no restriction
  - `"clearnet"` — surface web sources
  - `"onion"` — Tor hidden services
  - `"i2p"` — I2P hidden services
- **matchtype** — logical operator for combining the main query and filters; usually `"or"` (default) or `"and"`.
- **daterange** — optional creation/ingestion date range for the leak document in `YYYY-MM-DD,YYYY-MM-DD` format; empty string means no date filter. This maps to `m_creation_date`.
- **content** — content-type key such as: `all`, `breach`, `credential`, `ransomware`, `phishing`, `scam`, `malware`, `infostealer`, `c2`, `ddos`, `exploit`, `leak`, `logs`, `vpn`, `carding`, `rat`, `keylogger`, `spyware`, `sqlinjection`, `xss`, `supplychain`, `insider`, `fraud`, `obfuscation`, `crack`, `cheats`, `cve`, `zero_day`, `rootkit`, `apt`, `threat_intel`, `darkweb`, `rce`, `lpe`, `exfiltration`, `persistence`, `reconnaissance`, `hack`, `news`, `credentials_common`, `war`
- **entity_filter** — IOC-style structured filter map of `field_name → [values]`. This allows precise filtering on specific leak attributes. Example valid payload:
```json
{
  "entity_filter": {
    "m_country": ["Germany"],
    "m_team": ["BROTHERHOOD"],
    "m_industry": ["Electricity, Oil & Gas"],
    "m_network": ["onion"],
    "m_domain": ["ib-laudi.de"]
  }
}
```
Commonly supported fields include (but are not limited to):
- `m_country` — affected country or countries
- `m_location` — free-text or structured location
- `m_team` — ransomware / leak group name (for example `"BROTHERHOOD"`)
- `m_industry` — victim industry vertical (for example `"Agricultural Sector"`, `"Electricity, Oil & Gas"`, `"Jewelry & Watch Retail"`)
- `m_domain` — victim or leak domains
- `m_network` — network type (`"clearnet"`, `"onion"`, `"i2p"`)
- `m_content_type` or `content_type` — internal classification tags (for example `"leaks"`, `"ransomware"`, `"darkweb"`)
- `m_language` — language codes (for example `"en"`)
- `m_person` — people or organisation names extracted from the leak
- `m_scrap_file` — scraper/source identifier
- any other indexed IOC-style fields exposed by the underlying leak index.

Minimal example request:
```json
{
  "q": "Germany energy sector",
  "category": "all",
  "page": 1,
  "network": "onion",
  "safe": true,
  "daterange": "2025-11-20,2025-12-05",
  "entity_filter": {
    "m_country": ["Germany"],
    "m_team": ["BROTHERHOOD"]
  },
  "matchtype": "or"
}
```


### Response

Breach/leak search results as a JSON object describing matching breach announcements and data-dump entries.

Top-level response keys:
- **Result** — list of breach/leak report objects
- **Suggestions** — optional list of suggested queries or corrections (may be omitted or empty depending on backend implementation)
- **Page_Count** — number of pages for the current query and filters (may be fractional depending on scoring and backend pagination strategy)

Each entry in **Result** typically contains a subset of the following fields:
- **m_title** — title of the leak/announcement (for example `"Ingenieurbüro Laudi"`, `"Ninas Jewellery"`)
- **m_url** — primary URL of the leak page (often the group’s onion site landing page)
- **m_base_url** — base/source URL of the leak site
- **m_network** — network type such as `onion`, `clearnet`, or `i2p`
- **m_content** — full leak description or structured summary including organisation, country, data size, and embedded links
- **m_important_content** — condensed or highlighted version of `m_content` optimised for summarisation/search
- **m_content_type** — high-level classification tags, commonly including `"leaks"` and potentially other internal tags
- **m_industry** — victim’s industry vertical (for example `"Agricultural Sector"`, `"Electricity, Oil & Gas"`, `"Jewelry & Watch Retail"`)
- **m_location** — list of locations/regions attached to the victim
- **m_country** — list of affected countries (for example `["Germany"]`, `["Australia"]`)
- **m_team** — ransomware / leak group name (for example `"BROTHERHOOD"`)
- **m_websites** — list of victim websites (for example `"https://www.ib-laudi.de/"`)
- **m_logo_or_images** — list of logo / screenshot URLs hosted on the leak site
- **m_dumplink** — list of direct links to leaked files (documents, spreadsheets, images, etc.)
- **m_person** — people or organisation names extracted from the dump, when available
- **m_language** — language(s) of the leak content (for example `["en"]`)
- **m_domain** — list of domains associated with the leak (victim domain and/or leak portal domain)
- **m_scrap_file** — internal scraper identifier for the leak source
- **m_hash** — stable internal hash identifier for the leak record used for deduplication
- **m_update_date** — last update timestamp of the leak record
- **m_creation_date** — first time the leak record was ingested
- **rank_index** — internal ranking/index identifier (for example `"leak_model"`)
- **_score** — search-engine relevance score
- **_rank** — rank position of the document in the current result set
- **m_embedding** — optional internal embedding vector used for semantic search (large numeric array; primarily for internal use and usually not required by clients)

Example response:
```json
{
  "Result": [
    {
      "m_title": "Announcement",
      "m_url": "http://brohoodyaifh2ptccph5zfljyajjabwjjo4lg6gfp4xb6ynw5w7ml6id.onion/",
      "m_screenshot": "45422919581257033639454756554585",
      "m_base_url": "http://brohoodyaifh2ptccph5zfljyajjabwjjo4lg6gfp4xb6ynw5w7ml6id.onion/",
      "m_content": "Title: Announcement\nOrganization: Agricultural Sector\nCountry: Germany\n...",
      "m_important_content": "Title: Announcement\nOrganization: Agricultural Sector\nCountry: Germany\n...",
      "m_network": "onion",
      "m_content_type": ["leaks"],
      "m_industry": "Agricultural Sector",
      "m_logo_or_images": ["http://.../images/announcement/logo.png"],
      "m_location": ["Germany"],
      "m_team": "BROTHERHOOD",
      "m_country": ["Germany"],
      "m_domain": ["brohoodyaifh2ptccph5zfljyajjabwjjo4lg6gfp4xb6ynw5w7ml6id.onion"],
      "m_scrap_file": "_brohoodyaifh2ptccph5zfljyajjabwjjo4lg6gfp4xb6ynw5w7ml6id",
      "m_hash": "ca1c7476db86b66c05773f62b85ea5ab0042cd356744ad189f218d16b29db344",
      "m_update_date": "2025-12-03T19:13:20.077156+00:00",
      "m_creation_date": "2025-12-03T19:13:20.077203+00:00",
      "rank_index": "leak_model",
      "_score": 0.2,
      "_rank": 1
    },
    {
      "m_title": "Ingenieurbüro Laudi",
      "m_url": "http://brohoodyaifh2ptccph5zfljyajjabwjjo4lg6gfp4xb6ynw5w7ml6id.onion/",
      "m_network": "onion",
      "m_content_type": ["leaks"],
      "m_industry": "Electricity, Oil & Gas",
      "m_websites": ["https://www.ib-laudi.de/"],
      "m_location": ["Germany"],
      "m_team": "BROTHERHOOD",
      "m_country": ["Germany"],
      "m_dumplink": ["http://.../files/230629 Berechnung Raumluftmengen LPH4.xlsx", "..."]
    }
  ],
  "Page_Count": 1
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script


---

## social

### Description

Search social media intelligence reports using free-text queries and structured filters such as hashtag, platform, organization, domain, or country.

The request is an HTTP POST with a JSON body matching the `search_consolidated_param_model` schema:

```json
{
  "q": "#ransomware data leak",
  "page": 1,
  "content": "all",
  "category": "all",
  "network": "all",
  "daterange": "2025-11-01,2025-12-07",
  "matchtype": "or",
  "platform": "mastodon",
  "must": false,
  "entity_filter": {
    "m_hashtag": ["#ransomware", "#databreach"],
    "m_organization": ["ThreatFox"],
    "m_domain": ["ioc.exchange"]
  }
}
```

Field semantics (request):
- **q** — free-text query applied to normalized social post content (message text, hashtags, mentions, URLs).
- **page** — page number for paginated search results (1-based).
- **content** — content-type key such as `all`, `breach`, `credential`, `ransomware`, `phishing`, `scam`, `malware`, `infostealer`, `c2`, `ddos`, `exploit`, `leak`, `logs`, `vpn`, `carding`, `rat`, `keylogger`, `spyware`, `sqlinjection`, `xss`, `supplychain`, `insider`, `fraud`, `obfuscation`, `crack`, `cheats`, `cve`, `zero_day`, `rootkit`, `apt`, `threat_intel`, `darkweb`, `rce`, `lpe`, `exfiltration`, `persistence`, `reconnaissance`, `hack`, `news`, `credentials_common`, `war`; derived from internal `content_type` tags.
- **category** — ML-based classifier for social content categories (campaign/theme); use `all` to disable.
- **network** — network filter for the underlying source (`all`, `clearnet`, `onion`, `i2p`); social content is typically `clearnet`.
- **daterange** — optional ingestion/date range in `YYYY-MM-DD,YYYY-MM-DD` format.
- **matchtype** — logical operator (`or` or `and`) controlling how query and filters are combined.
- **platform** — social platform filter (e.g. `twitter`, `mastodon`, `telegram`, `discord`), mapped to the underlying **m_platform** field.
- **must** — when true, all values in **entity_filter** are treated as mandatory constraints.
- **entity_filter** — IOC/enrichment filter map where keys are enrichment fields (for example `m_hashtag`, `m_mention`, `m_organization`, `m_domain`, `m_country`, `m_language`) and values are lists of values that documents must/may contain depending on **must**.


### Response

Social media intelligence search results containing metadata for each matching social report.

The response is a JSON object with pagination info and a list of social post summaries:
- **Result** — list of normalized social media entries
- **Suggestions** — optional list of query suggestions (may be empty)
- **Page_Count** — total number of result pages as a floating-point value

Each result usually exposes a subset of the social report fields:
- **m_sender_name** — display name or handle of the posting account (e.g. `@abuse_ch`)
- **m_message_sharable_link** — platform-specific link/path to the post (e.g. `https://x.com/anyrun_app/status/1861024182210900357`)
- **m_content** — normalized text content, including hashtags, mentions and links
- **m_content_type** — internal labels describing the social collector/source type (e.g. `["social_collector"]`)
- **m_message_date** — date the post was created in `YYYY-MM-DD` format
- **m_channel_url** — URL of the profile, channel or account page
- **m_message_id** — platform-specific unique identifier
- **m_platform** — social platform name (e.g. `twitter`, `mastodon`)
- **m_network** — network type (typically `clearnet`)
- **content_type** — high-level classification tags (e.g. `["malware", "ddos", "threat_intel", "news"]`)
- **m_username** — usernames/handles associated with the posting account
- **m_scrap_file** — internal scraper identifier
- **m_organization** — organizations or projects referenced
- **m_language** — detected languages
- **m_hashtag** — list of hashtags extracted from the content
- **m_mention** — list of mentioned accounts
- **m_domain** — list of referenced domains
- **m_hash** — internal content hash
- **m_creation_date** — ingestion timestamp
- optionally, IOC/enrichment fields such as `m_ip`, `m_url`, `m_cve`, `m_crypto_address`, etc.

Example response:
```json
{
  "Result": [
    {
      "m_sender_name": "@anyrun_app",
      "m_message_sharable_link": "https://x.com/anyrun_app/status/1861024182210900357",
      "m_content": "ALERT: Potential ZERO-DAY, Attackers Use Corrupted Files to Evade Detection (1/3)...",
      "m_content_type": ["social_collector"],
      "m_message_date": "2024-11-25",
      "m_channel_url": "https://x.com/anyrun_app",
      "m_message_id": "1861024182210900357",
      "m_platform": "twitter",
      "m_network": "clearnet",
      "content_type": ["credential", "ransomware", "phishing", "malware", "ddos", "exploit", "xss"],
      "m_username": ["anyrun_app"],
      "m_scrap_file": "_twitter",
      "m_language": ["en"],
      "m_hashtag": ["#ANYRUN", "#antivirus"],
      "m_mention": ["@anyrun_appalert"],
      "m_domain": ["x.com"],
      "m_hash": "7872303ba1faefc7d645ecd551c7dfcf64f7d963413e66beda38dc9161e4c43a",
      "m_creation_date": "2025-12-04T12:38:19.665394+00:00"
    }
  ],
  "Suggestions": [],
  "Page_Count": 278.1
}
```


---

## consolidated

### Description

Search across all report types (breach/leak, exploit, generic/strategic, chat, social, etc.) and return a
consolidated, section-grouped set of report metadata.

The request is an HTTP POST and expects a JSON body matching the `search_consolidated_param_model` schema.
A typical request payload might look like:

```json
{
  "q": "okta",
  "page": 1,
  "network": "all",
  "matchtype": "or",
  "safe": false,
  "daterange": "2025-11-01,2025-12-07",
  "content": "all",
  "entity": "",
  "must": false,
  "entity_filter": {
    "m_company_name": ["Okta"],
    "m_country": ["US"]
  }
}
```

Semantics:
- **q** — free-text query across all supported indices
- **page** — page number for paginated results
- **network** — network filter (e.g. `all`, `clearnet`, `onion`, `i2p`)
- **matchtype** — logical query mode, typically `or` or `and`
- **safe** — when true, enables additional safety/content restrictions
- **daterange** — optional date range filter in `YYYY-MM-DD,YYYY-MM-DD` format
- **content** — high-level content type filter when supported (e.g. `all`, `leaks`, `news`)
- **entity / entity_filter** — IOC/entity-based filters (e.g. `m_company_name`, `m_domain`, `m_country`)
- **must** — when true, entity filters are treated as mandatory (must-match) conditions

Unlike the ranked variant, this consolidated endpoint groups results by section/index. Each group contains its
own total and list of matching documents and is suitable for driving dashboards and per-section drill-down.


### Response

Consolidated, section-grouped search results across all enabled indices.

The response is a JSON object where each top-level key corresponds to a logical section or model
(for example `breach`, `exploit`, `generic`, `chat`, `social`). Each section contains its own metadata and
list of matching reports.

Typical structure:
- **breach / leak** — grouped breach/leak reports (ransomware notes, data leak posts, etc.)
- **exploit** — exploit/CVE-related documents
- **generic / strategic** — generic darkweb/clearnet documents (forums, marketplaces, generic pages)
- **chat** — chat/Telegram-driven intelligence items
- **social** — social media-based threat intel posts

Example response:
```json
{
  "breach": {
    "total": 2,
    "page": 1,
    "results": [
      {
        "doc_id": "breach-123",
        "m_title": "Okta customer data leak announced",
        "m_company_name": "Okta Inc.",
        "m_domain": ["okta.com"],
        "m_network": "onion",
        "m_content_type": ["leaks"],
        "m_hash": "abc123...",
        "m_creation_date": "2025-12-06T09:10:00Z",
        "m_update_date": "2025-12-07T08:45:00Z"
      }
    ]
  },
  "exploit": {
    "total": 1,
    "page": 1,
    "results": [
      {
        "doc_id": "exploit-456",
        "m_title": "PoC for Okta SSO misconfiguration abuse",
        "m_url": "https://example.com/exploit/okta-poc",
        "m_platform": ["Web"],
        "m_content_type": ["exploit"],
        "m_hash": "def456...",
        "m_creation_date": "2025-12-05T14:20:00Z"
      }
    ]
  },
  "chat": {
    "total": 0,
    "page": 1,
    "results": []
  },
  "social": {
    "total": 1,
    "page": 1,
    "results": [
      {
        "doc_id": "social-789",
        "m_sender_name": "@threatintelfeed",
        "m_message_date": "2025-12-07",
        "m_content": "New Okta-related access sale spotted on darkweb.",
        "m_platform": "mastodon",
        "m_network": "clearnet",
        "content_type": ["threat_intel", "news"],
        "m_hash": "ghi789..."
      }
    ]
  }
}
```

Exact sections and fields depend on enabled modules and query filters, but the grouped structure remains
consistent: each top-level section exposes `total`, `page`, and a list of result objects containing common
metadata fields like **doc_id**, **m_title**, **m_network**, **m_content_type**, and hash/timestamp fields.


---

## consolidated_ranked

### Description

Search the entire database across all report types and return a single, globally relevance-ranked list of
report metadata without per-section grouping.

The request is an HTTP POST and expects a JSON body matching the `search_consolidated_param_model` schema.
It reuses the same fields as the grouped consolidated search endpoint (for example `q`, `page`, `network`,
`matchtype`, `daterange`, `entity_filter`, `must`, etc.).

Example request payload:

```json
{
  "q": "okta",
  "page": 1,
  "network": "all",
  "matchtype": "or",
  "safe": false,
  "daterange": "2025-11-01,2025-12-07",
  "content": "all",
  "entity_filter": {
    "m_company_name": ["Okta"]
  }
}
```

Unlike the grouped consolidated endpoint, this variant merges hits from all indices (breach/leak, exploit,
generic, chat, social, etc.) into a *single list* sorted by a global relevance score. Each result row
includes metadata about the source index/section so that clients can still route to the appropriate
underlying report API.


### Response

Globally ranked consolidated search results across all enabled indices.

The response is a JSON object containing a single list of hits ordered by a global relevance score, along
with pagination metadata.

Typical fields:
- **total** — total number of matched documents across all indices
- **page** — current result page
- **results** — ordered list of result objects, highest relevance first

Each element in **results** usually contains:
- **index** — logical source index/section (e.g. `leak_model`, `exploit_model`, `generic_model`,
  `chat_model`, `social_model`)
- **doc_id** — internal identifier of the document (to be used with the corresponding report API)
- **score** — search/relevance score (when exposed)
- Common metadata fields depending on the index, such as:
  - For leak/breach: **m_title**, **m_company_name**, **m_domain**, **m_network**, **m_content_type**
  - For exploit: **m_title**, **m_platform**, **m_content_type**, **m_url**
  - For chat: **m_sender_name**, **m_message_date**, **m_content**, **m_channel_name**
  - For social: **m_sender_name**, **m_message_date**, **m_content**, **m_platform**

Example response:
```json
{
  "total": 25,
  "page": 1,
  "results": [
    {
      "index": "leak_model",
      "doc_id": "breach-123",
      "score": 12.34,
      "m_title": "Okta customer data leak announced",
      "m_company_name": "Okta Inc.",
      "m_domain": ["okta.com"],
      "m_network": "onion",
      "m_content_type": ["leaks"],
      "m_hash": "abc123...",
      "m_creation_date": "2025-12-06T09:10:00Z"
    },
    {
      "index": "exploit_model",
      "doc_id": "exploit-456",
      "score": 10.87,
      "m_title": "PoC for Okta SSO misconfiguration abuse",
      "m_platform": ["Web"],
      "m_content_type": ["exploit"],
      "m_url": "https://example.com/exploit/okta-poc",
      "m_hash": "def456..."
    },
    {
      "index": "social_model",
      "doc_id": "social-789",
      "score": 9.42,
      "m_sender_name": "@threatintelfeed",
      "m_message_date": "2025-12-07",
      "m_content": "New Okta-related access sale spotted on darkweb.",
      "m_platform": "mastodon",
      "m_network": "clearnet",
      "content_type": ["threat_intel", "news"]
    }
  ]
}
```

This ranked view is optimized for global search experiences where the user wants "the most relevant
things first" regardless of which underlying index they came from, while still preserving enough
metadata to call the corresponding detailed report endpoints.


---

## strategic

### Description

Search strategic intelligence reports using filters such as free-text query, network, date range, MITRE/STIX object type or IOC entities; returns metadata for matching strategic reports that can be opened via the strategic report API.

Request body (`search_consolidated_param_model`):
- **q** — free-text search over title, content and enrichment fields (default: empty string)
- **page** — page number of the paginated result set (1-based)
- **network** — one of: `all`, `clearnet`, `onion`, `i2p`
- **content** — content-type key such as: `all`, `breach`, `credential`, `ransomware`, `phishing`, `scam`, `malware`, `infostealer`, `c2`, `ddos`, `exploit`, `leak`, `logs`, `vpn`, `carding`, `rat`, `keylogger`, `spyware`, `sqlinjection`, `xss`, `supplychain`, `insider`, `fraud`, `obfuscation`, `crack`, `cheats`, `cve`, `zero_day`, `rootkit`, `apt`, `threat_intel`, `darkweb`, `rce`, `lpe`, `exfiltration`, `persistence`, `reconnaissance`, `hack`, `news`, `credentials_common`, `war`
- **safe** — boolean flag enabling safe filtering of sensitive/adult content
- **daterange** — optional creation date range in `YYYY-MM-DD,YYYY-MM-DD` format applied to `m_creation_date`
- **matchtype** — logical operator for combining query / entity / filter clauses (`and` or `or`)
- **entity_filter** — IOC-style filter map of field → list of values. Example valid payload:
```json
{
  "entity_filter": {
    "m_country": ["pakistan"],
    "m_domain": ["example.com"],
    "m_person": ["john doe"]
  }
}
```
Supported fields include: `m_phone_number`, `m_email`, `m_domain`, `m_country`, `m_url`, `m_cve`, `m_ip`, `m_yara_rule`, `m_encoded_urls`, `m_file_paths`, `m_credit_card`, `m_org`, `m_company_name`, `m_person`, `m_location`, `m_language`, `m_user_agents`, `m_asns`, `m_team`, `m_hashtag`, `m_mention`, `m_social_media_profiles`, `m_currencies`, `m_crypto_address`, `m_xmpp_addresses`, `m_enterprise_attack_tactics`, `m_enterprise_attack_techniques`, `m_document_id`, `m_au_abn`, `m_us_passport`, `m_us_bank_number`, `m_platform`, `m_author`, `m_industry`, `m_scrap_file`.

Minimal example request:
```json
{
  "q": "pakistan",
  "page": 1,
  "entity_filter": { "m_country": ["pakistan"] },
  "matchtype": "or"
}
```


### Response

Strategic intelligence search results containing a paginated list of matching strategic documents.

The response is a JSON object with:
- **Result** — list of raw document records from the strategic index
- **Page_Count** — total number of pages available for the given query and filters

Each entry in **Result** is a metadata object that typically contains:
- **m_base_url** — base URL of the hidden service or site
- **m_url** — concrete crawled page URL
- **m_network** — network type, e.g. `onion`, `i2p`, `clearnet`
- **m_title** — normalized page or thread title
- **m_meta_description** — HTML meta description where available
- **m_content** — normalized full text content
- **m_important_content** — densified or highlighted important content
- **m_images** — list of image URLs extracted from the page
- **m_sub_url** — list of related sub-URLs discovered on the page
- **m_validity_score** — internal confidence/validity score (0–100)
- **m_content_type** — list of high-level classification labels such as `news`, `adult`, etc.
- **m_clearnet_links** — list of clearnet links referenced in the document
- **m_country** — list of detected country entities
- **m_location** — list of detected location/place entities
- **m_person** — list of detected person entities
- **m_organization** — list of detected organizations/platforms
- **m_language** — detected language codes
- **m_domain** — list of associated domains
- **m_update_date** — last update timestamp
- **m_creation_date** — first-seen/ingestion timestamp
- **rank_index** — internal index/model used for ranking (for example `generic_model`)
- **_score** — relevance score from the search engine
- **_rank** — rank of the document in the current result page
- Additional internal fields such as `m_hash_content`, `m_hash_url`, `m_hash` and `m_embedding` may also be present.

Example response:
```json
{
  "Result": [
    {
      "m_base_url": "http://bbcnewsd73hkzno2ini43t4gblxvycyac5aw4gnv7t2rccijh7745uqd.onion",
      "m_url": "http://bbcnewsd73hkzno2ini43t4gblxvycyac5aw4gnv7t2rccijh7745uqd.onion/news/world/asia",
      "m_network": "onion",
      "m_title": "asia latest & updates | bbc news",
      "m_meta_description": "get all the latest news, live updates and content about asia from across the bbc.",
      "m_content": "you are now following asia at least 36 dead as fire engulfs hong kong tower blocks ...",
      "m_important_content": "you are now following asia updates from your news topics will appear in firefighters are struggling ...",
      "m_images": [
        "https://ichef.bbcws2hcewhlhutm5qrjkekkg3eraphuc7ba7qh4jeinhibnx3ymxaqd.onion/ace/standard/480/cpsprodpb/726a/live/92a91ae0-cab6-11f0-8c06-f5d460985095.jpg",
        "https://ichef.bbcws2hcewhlhutm5qrjkekkg3eraphuc7ba7qh4jeinhibnx3ymxaqd.onion/ace/standard/480/cpsprodpb/c5d3/live/28ebb110-cabd-11f0-a892-01d657345866.jpg"
      ],
      "m_sub_url": [
        "http://bbcnewsd73hkzno2ini43t4gblxvycyac5aw4gnv7t2rccijh7745uqd.onion/news/topics/c2vdnvdg6xxt",
        "http://bbcnewsd73hkzno2ini43t4gblxvycyac5aw4gnv7t2rccijh7745uqd.onion/news/world"
      ],
      "m_validity_score": 65,
      "m_content_type": ["news", "adult"],
      "m_clearnet_links": [
        "instagram.com/bbcnews/",
        "tiktok.com/@bbcnews?lang=en",
        "facebook.com/bbcnews",
        "twitter.com/BBCNews"
      ],
      "m_country": [
        "India", "Japan", "China", "Hong Kong", "Pakistan",
        "New Zealand", "Australia", "Ukraine", "Israel"
      ],
      "m_location": [
        "India", "UK", "China", "South East Asia", "Hong Kong",
        "New Zealand", "Australia", "Thai", "Ukraine", "Asia"
      ],
      "m_person": ["Trump", "Xi", "Robert Irwin"],
      "m_organization": ["Bollywood"],
      "m_language": ["en"],
      "m_domain": [
        "facebook.com",
        "twitter.com",
        "instagram.com",
        "tiktok.com",
        "bbcnewsd73hkzno2ini43t4gblxvycyac5aw4gnv7t2rccijh7745uqd.onion"
      ],
      "m_update_date": "2025-11-26T18:05:48.003165+00:00",
      "m_hash_content": "8207ff33a9358d0aa0be3f9c00f0d7a29b9a1424055ad9d69c3a84d7f793f11d",
      "m_hash_url": "b9b9ababd96907acb0666bf6791d93a74162de5dd96e68eceb76394e805c30ab",
      "m_hash": "a7e0dd8c425614b37ab0acd5a793a786503779dce49b1b46dd93f5db014bbc11",
      "m_creation_date": "2025-11-26T18:05:48.003504+00:00",
      "rank_index": "generic_model",
      "_score": 0.44736758,
      "_rank": 1
    }
  ],
  "Page_Count": 1
}
```


---

## stealerlogs

### Description

Search stealer log credentials and log files using filters such as free-text query, URL, username, type and date range; returns normalized credential or log records from the stealer logs index.

Request body (`search_credential_param_model`):
- **daterange** — optional creation date range in `YYYY-MM-DD,YYYY-MM-DD` format; empty string means no filter
- **q** — free-text search across the raw line and extracted fields (email, domain, username, URL, etc.)
- **url** — optional URL/domain filter (for example `accounts.epicgames.com`)
- **user** — optional username or login identifier (for example `uzzalsen2530`)
- **type** — record type; `"c"` returns credential-level stealer log entries (email/password, username, etc.); any other value returns log/file-style entries (for example leaked CSV or other files)
- **page** — page number of the paginated result set (1-based)
- **category** — optional category string (reserved for future use)
- **fullsearch** — when `false`, uses an optimized/simple search (for example email domain lookups like `gmail.com`) for faster responses; when `true`, enables full wildcard/substring search over `raw` and extracted fields at the cost of performance.

Minimal example request for a credential (stealer log) search:
```json
{
  "q": "gmail.com",
  "url": "accounts.epicgames.com",
  "user": "uzzalsen2530",
  "type": "c",
  "page": 1,
  "fullsearch": false,
  "daterange": ""
}
```
Example full wildcard search over a password value:
```json
{
  "q": "Zolkina23!",
  "type": "c",
  "page": 1,
  "fullsearch": true
}
```


### Response

Stealer logs search results containing a paginated list of matching credential or log records.

The response is a JSON object with:
- **Result** — list of matching records from the stealer logs index
- **Suggestions** — optional list of suggestion strings (for example corrected queries); may be empty
- **Page_Count** — number of pages available for the given query and filters (may be fractional depending on the backend calculation)

Each entry in **Result** for `type = "c"` (credential mode) typically contains:
- **type** — record type (for example `"c"` for credential)
- **raw** — original raw line as found in the source log
- **channel** — high-level source channel (for example `"Collection"`)
- **file** — optional file name or identifier when available, otherwise `null`
- **domain** — list of extracted domains (for example `"gmail.com"` or `"authenticate.riotgames.com"`)
- **email** — list of extracted email addresses when present
- **password** — extracted password value when present
- **username** — list of extracted usernames or logins
- **_id** — internal unique identifier of the record
- **m_index** — internal index/model used for search (for example `"stealer_model"`)
- **m_sub_host** — extracted sub-host or path component (for example `"/"`)

When `type` is not `"c"`, records may represent higher-level log or file objects (for example leaked CSV or other file-based dumps) and can include additional file-related metadata fields depending on the source.

Example response:
```json
{
  "Result": [
    {
      "type": "c",
      "raw": "https://accounts.epicgames.com/register/customized uzzalsen2530@gmail.com:Lazpro&Adi@2022!",
      "channel": "Collection",
      "file": null,
      "domain": [
        "gmail.com"
      ],
      "email": [
        "uzzalsen2530@gmail.com"
      ],
      "password": "Lazpro&Adi@2022!",
      "username": [
        "uzzalsen2530"
      ],
      "_id": "2025_UTC_1d57898b680608fcb703a2bccede92d4b913bd810f84ef81fd95c8037493b4f6",
      "m_index": "stealer_model",
      "m_sub_host": "/"
    },
    {
      "type": "c",
      "raw": "https://authenticate.riotgames.com/ FaM1R:Zolkina23!",
      "channel": "Collection",
      "file": null,
      "domain": [
        "authenticate.riotgames.com"
      ],
      "password": "Zolkina23!",
      "username": [
        "FaM1R"
      ],
      "_id": "2025_UTC_ac9459ac22cc2fe21060f39980882d98aa0cf15f524e7f835a55c94c08631371",
      "m_index": "stealer_model",
      "m_sub_host": "/"
    }
  ],
  "Suggestions": [],
  "Page_Count": 0.2
}
```


---

# Dynamic

## dynamic_user_email

### Description

Perform a dynamic search for user email addresses discovered in monitored breach and defacement data, returning exposed account metadata for further investigation and remediation.

This operation also fetches **real-time results from external dark-web intelligence APIs**, which may take additional time to process. During this period the API may return a pending response indicating that the upstream data collection is still running.

A typical in-progress response looks like:

```json
{
  "status": "pending",
  "progress": 10,
  "step": "running"
}
```

The request is an HTTP POST and expects a JSON body with a **text** object containing the lookup fields. Typical request payload:

```json
{
  "text": {
    "username": "",
    "email": "msmannan00@gmail.com"
  }
}
```

The **username** field is optional and can be left empty when only the email address should be used for the exposure search.


### Response

Dynamic search results listing exposed user email addresses and associated intelligence metadata.

The response is a JSON object containing a **result** array. Each element summarizes where the supplied identifier appears in known breaches or leak collections.

Example response:
```json
{
  "result": [
    {
      "m_title": "Records for provided queries",
      "m_url": "http://breachdbsztfykg2fdaq2gnqnxfsbj5d35byz3yzj73hazydk4vq72qd.onion",
      "m_base_url": "http://breachdbsztfykg2fdaq2gnqnxfsbj5d35byz3yzj73hazydk4vq72qd.onion",
      "m_content": "",
      "m_important_content": "Records were found in a data breach.",
      "m_network": "onion",
      "m_section": [],
      "m_content_type": ["stolen"],
      "m_screenshot": "",
      "m_weblink": [],
      "m_dumplink": [
        "Canva",
        "000WebHost.com",
        "Breach Compilation",
        "Exploit.In",
        "Collection #2",
        "Mathway (v2)",
        "Collection #5",
        "Slideteam.net",
        "Mathway (v1)"
      ],
      "m_websites": [],
      "m_logo_or_images": [],
      "m_leak_date": null,
      "m_data_size": null,
      "m_revenue": null
    }
  ]
}
```

Field semantics for each element under **result**:
- **m_title** — high level summary of the match context for the provided email or username
- **m_url** — primary reference URL where the aggregated breach information is hosted
- **m_base_url** — base URL of the breach or aggregation site
- **m_content** — optional textual details, which may be empty when only summary text is available
- **m_important_content** — short human-readable description of the exposure
- **m_network** — network type where the breach information is hosted (e.g. `onion`)
- **m_section** — list of sections or categories on the breach site that this record belongs to
- **m_content_type** — internal labels describing the nature of the data, such as `stolen`
- **m_screenshot** — identifier for a related screenshot image when available, or empty string if none
- **m_weblink** — list of clearnet URLs directly related to this breach record, if present
- **m_dumplink** — list of named breach collections or dump sources where the email was found
- **m_websites** — list of affected websites or services when this information is available
- **m_logo_or_images** — list of URLs pointing to logos or images associated with the victim or breach
- **m_leak_date** — date of the leak if known, otherwise null
- **m_data_size** — approximate size of the exposed dataset when provided, otherwise null
- **m_revenue** — optional revenue or financial impact metadata, when tracked by the source

Multiple entries can be returned in **result** if the same email or username was observed in more than one breach collection or dataset.


---

## dynamic_cracked

### Description

Perform a dynamic search for cracked credentials or applications identified in breach and defacement datasets, highlighting high-risk compromised apps, accounts and password reuse exposure.

The request is an HTTP POST and expects a JSON body with a **text** object. For APK/app lookups, the backend currently supports using a Play Store URL to identify cracked or repackaged versions:

```json
{
  "text": {
    "playstore": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"
  }
}
```

The **playstore** field should contain a valid Google Play application URL for which cracked or modified artifacts should be discovered.


### Response

Dynamic search results listing cracked or modified application artifacts with related context and metadata.

The response is a JSON object containing a **result** array. Each element describes one discovered artifact, such as a cracked APK:

Example response:
```json
{
  "result": [
    {
      "m_app_name": "SuperVPN Fast VPN Client v3.0.3.apk",
      "m_package_id": "com.jrzheng.supervpnfree",
      "m_app_url": "https://filecr.com/android/supervpn-fast-vpn-client/",
      "m_network": "clearnet",
      "m_version": "3.0.3",
      "m_content_type": ["apk"],
      "m_download_link": [],
      "m_apk_size": null,
      "m_latest_date": "2025-10-30",
      "m_mod_features": ""
    }
  ]
}
```

Field semantics for each element under **result**:
- **m_app_name** — name of the discovered app artifact (often includes version and `.apk` suffix)
- **m_package_id** — application package identifier (e.g. `com.jrzheng.supervpnfree`)
- **m_app_url** — URL of the site hosting the cracked or redistributed app (e.g. warez/file hosting site)
- **m_network** — network type where the artifact is hosted (typically `clearnet`)
- **m_version** — discovered application version string
- **m_content_type** — internal labels describing artifact type (e.g. `apk`)
- **m_download_link** — list of direct download URLs for the artifact when available (may be empty)
- **m_apk_size** — APK file size when known, otherwise null
- **m_latest_date** — most recent observation date for this artifact
- **m_mod_features** — description of modifications, cracks or extra features, if provided by the source

Multiple entries can be returned in **result** if the same Play Store app is found across different cracked repositories or mirrors. Duplicate-looking entries may indicate separate sources with the same version and metadata.


---

## dynamic_social

### Description

Perform a dynamic search for social media identifiers and related email addresses found in breach and defacement data, helping uncover exposed or impersonated social accounts.

The request is an HTTP POST and expects a JSON body with a **text** object containing the social handle or username to look up.

Example request payload:

```json
{
  "text": {
    "username": "bitcoin"
  }
}
```

The **username** field should contain the social identifier to be resolved across monitored platforms and breach-related datasets.


### Response

Dynamic search results listing exposed or observed social media identifiers and related contact details.

The response is a JSON object containing a **result** array. Each element describes one occurrence of the provided username on a monitored platform.

Example response:
```json
{
  "result": [
    {
      "m_title": "User bitcoin found on https://twitter.com",
      "m_url": "https://twitter.com/bitcoin",
      "m_base_url": "https://twitter.com",
      "m_content": "",
      "m_important_content": "Found on: https://twitter.com/bitcoin",
      "m_network": "clearnet",
      "m_section": [],
      "m_content_type": ["stolen"],
      "m_screenshot": "",
      "m_weblink": ["https://twitter.com/bitcoin"],
      "m_dumplink": ["https://twitter.com/bitcoin"],
      "m_websites": [],
      "m_logo_or_images": [],
      "m_leak_date": null,
      "m_data_size": null,
      "m_revenue": null
    },
    {
      "m_title": "User bitcoin found on https://clubhouse.com",
      "m_url": "https://clubhouse.com/@bitcoin",
      "m_base_url": "https://clubhouse.com",
      "m_content": "",
      "m_important_content": "Found on: https://clubhouse.com/@bitcoin",
      "m_network": "clearnet",
      "m_section": [],
      "m_content_type": ["stolen"],
      "m_screenshot": "",
      "m_weblink": ["https://clubhouse.com/@bitcoin"],
      "m_dumplink": ["https://clubhouse.com/@bitcoin"],
      "m_websites": [],
      "m_logo_or_images": [],
      "m_leak_date": null,
      "m_data_size": null,
      "m_revenue": null
    }
  ]
}
```

Field semantics for each element under **result**:
- **m_title** — summary line indicating the username and the platform where it was found
- **m_url** — direct URL to the profile or page for the discovered account
- **m_base_url** — base URL of the platform (e.g. `https://twitter.com`, `https://clubhouse.com`)
- **m_content** — optional additional text content, which may be empty when only metadata is stored
- **m_important_content** — short human-readable description of the finding (for example `Found on: https://twitter.com/bitcoin`)
- **m_network** — network type where the account is hosted (typically `clearnet`)
- **m_section** — optional list of sections/categories on the platform or in the underlying dataset
- **m_content_type** — internal classification labels for the record (e.g. `stolen` to indicate possible compromise or risk)
- **m_screenshot** — identifier for a screenshot of the profile or page, when available, or empty string
- **m_weblink** — list of direct profile URLs for the discovered account on that platform
- **m_dumplink** — list of links or references within breach/collection data pointing to this account
- **m_websites** — list of associated websites when available
- **m_logo_or_images** — list of URLs for logos, avatars or images tied to the account
- **m_leak_date** — date of the leak or earliest observation if known, otherwise null
- **m_data_size** — size of associated dataset when this information is available, otherwise null
- **m_revenue** — optional revenue/financial impact metadata when tracked by the backend

Multiple entries can be returned in **result** when the same username is observed on different social platforms or in various breach-related datasets.


---

## domain_scan

### Description

Scan a target domain using the configured scanning engine.

The request is an HTTP POST and expects a JSON body matching the `DomainScanRequest` schema:

```json
{
  "domain": "www.bbc.com",
  "scanType": "basic"
}
```

Fields:
- **domain**   — target domain or host to scan (e.g. `www.bbc.com`)
- **scanType** — scan mode selector. Supported values:
  - `basic`    — infrastructure & HTTP intelligence (security headers, caching, CSP, CORS, etc.)
  - `advanced` — same as `basic`, plus port scanning and service-level inspection
  - `seo`      — SEO metadata, indexing and ranking-related signals
  - `repo`     — linked repository scan (GitHub/GitLab, exposed files, commit metadata)

Payload examples by **scanType** (all share the same schema; only `scanType` changes):

```json
{
  "domain": "www.bbc.com",
  "scanType": "basic"
}
```

```json
{
  "domain": "www.bbc.com",
  "scanType": "advanced"
}
```

```json
{
  "domain": "www.bbc.com",
  "scanType": "seo"
}
```

```json
{
  "domain": "https://github.com/globaleaks/globaleaks-whistleblowing-software",
  "scanType": "repo"
}
```


### Response

Scan results for the selected `scanType`, returned as a JSON object with a top-level **result** field.

For **basic / advanced / seo** scans, the structure of `result` is typically:

- **meta** — scan metadata:
  - **URL**              — fully qualified URL that was scanned (e.g. `https://www.bbc.com`)
  - **Host**             — resolved host name (e.g. `www.bbc.com`)
  - **Port**             — port and protocol (e.g. `443 SSL`)
  - **Scanned_on_date**  — human-readable scan date (e.g. `December 07, 2025`)
  - **Scanned_by**       — scanner identity (e.g. `Orion Intelligence`)

- **summary** — map of category name → count of findings in that category, such as:
  - `Headers`, `Caching Findings`, `Caching`, `CSP/Policy`, `CORS`, `General`, `Informational`

- **threats** — map of category name → list of findings, each containing:
  - **header**       — finding title or header (e.g. `Permissions-Policy`)
  - **description**  — detailed explanation of the issue
  - **confidence**   — confidence level (`High`, `Medium`, `Low`)
  - **risk**         — risk level (`High`, `Medium`, `Low`, `Informational`)

- **proofs** — map of category name → list of evidence items, each containing:
  - **header**       — finding title or header
  - **proof**        — HTML/response snippet or other raw evidence
  - **confidence**   — confidence level
  - **risk**         — risk level

- **grade** — overall security/quality grade (e.g. `D`)
- **grade_counts** — totals of findings by severity:
  - **high**, **medium**, **low**, **informational**

For **advanced** scans, the structure is the same as `basic` but may include additional port and service
intelligence within **meta** and/or as extra categories in **summary**/**threats**.

For **repo** scans, `result` has the same top-level structure but often with empty findings when no issues
are detected. A typical `repo` scan looks like:

```json
{
  "result": {
    "meta": {
      "URL": "https://github.com/globaleaks/globaleaks-whistleblowing-software",
      "Host": "github.com",
      "Port": "443 SSL",
      "Scanned_on_date": "December 07, 2025",
      "Scanned_by": "Orion Intelligence"
    },
    "summary": {},
    "threats": {},
    "proofs": {},
    "grade": "A",
    "grade_counts": {
      "high": 0,
      "medium": 0,
      "low": 0,
      "informational": 0
    }
  }
}
```

The exact number of findings and the categories under **summary**, **threats**, and **proofs** depend on the
target and the selected `scanType`.
