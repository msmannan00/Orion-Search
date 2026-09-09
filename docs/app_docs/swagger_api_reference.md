(swagger-api-reference)=

# Swagger API Reference

This page documents the primary API operations maintained for integrators. It is based on the running FastAPI schema plus selected documented integration routes.

- Source: `/openapi.json` and maintained API docs
- Documented operations: **57**
- Tags: **10**

## Relationship To `api_docs`

This page is the consolidated published API reference for readers who want one long Swagger-style document. It should be treated as a synchronized artifact, not the only editing source.

For day-to-day maintenance:

- backend route metadata controls the live FastAPI `/openapi.json` schema
- `docs/api_docs/` contains the maintained per-endpoint Markdown reference
- `docs/api_docs/source_docs.py` is the source input for regenerated API Markdown bundles
- this page should be refreshed or manually synchronized after route metadata and `api_docs` are updated

Current route coverage:

- Social search includes Telegram-oriented searches through the documented Social search request fields.
- APT Intel search is `POST /api/search/apt-intel`; detail reports are split between `GET /api/search/apt/{doc_id}` and `GET /api/search/malware/{doc_id}`.
- Public API docs should cover the operations listed in this reference and the matching per-endpoint files under `docs/api_docs/`.

## Authentication

Most endpoints require an OAuth2 bearer token. Request samples use `$BASE_URL` and `$TOKEN` placeholders:

```bash
BASE_URL="http://localhost:8000"
TOKEN="<access-token>"
```

Common error shapes:

```json
{
  "401": {
    "detail": "Not authenticated"
  },
  "403": {
    "detail": "Forbidden"
  },
  "422": {
    "detail": [
      {
        "loc": [
          "body",
          "field"
        ],
        "msg": "Field required",
        "type": "missing"
      }
    ]
  }
}
```

## Endpoint Index

| Method | Path                                        | Summary                                                                                | Tag                  |
|--------|---------------------------------------------|----------------------------------------------------------------------------------------|----------------------|
| `POST` | `/api/index/injection`                      | Batch inject SIEM logs                                                                 | Crawler              |
| `POST` | `/api/dynamic/user`                         | Dynamic user email exposure search                                                     | Entity Scans         |
| `POST` | `/api/dynamic/cracked`                      | Dynamic cracked credential search                                                      | Entity Scans         |
| `POST` | `/api/dynamic/software`                     | Dynamic software credential search                                                     | Entity Scans         |
| `POST` | `/api/urlscan/domain`                       | Domain, SEO, and repository scan                                                       | Entity Scans         |
| `POST` | `/api/dynamic/social`                       | Dynamic social identifier exposure search                                              | Entity Scans         |
| `POST` | `/api/dynamic/wanted`                       | Searches wanted people around the Globe                                                | Entity Scans         |
| `POST` | `/api/dynamic/national-identity`            | Dynamic national identity search                                                       | Entity Scans         |
| `POST` | `/api/ioc/extract`                          | Extract IOCs from file(.pdf or .txt) or image(.png, .jpg or .jpeg)                     | Entity Scans         |
| `POST` | `/api/apk/scan`                             | Dynamic analysis scan to identify application metadata, cracking indicators, etc       | Entity Scans         |
| `POST` | `/api/crypto/scan`                          | Scan cryptocurrency wallet address or transaction hash                                 | Entity Scans         |
| `POST` | `/api/netintel/resolve_ip`                  | Resolve a domain to IP addresses                                                       | Network Intelligence |
| `POST` | `/api/netintel/ipscanner`                   | Scan an IP address for network intelligence                                            | Network Intelligence |
| `POST` | `/api/netintel/url_vulnerability_scan`      | Scan a domain URL for web vulnerabilities                                              | Network Intelligence |
| `POST` | `/api/netintel/iot_detect`                  | Scan a geographic area for exposed cameras                                             | Network Intelligence |
| `POST` | `/api/netintel/camera_detect_ranges`        | Scan IP ranges for exposed cameras                                                     | Network Intelligence |
| `POST` | `/api/profile/event-management/siem/search` | Search SIEM logs                                                                       | Profile              |
| `GET`  | `/api/search/defacement/{doc_id}`           | Get defacement report                                                                  | Reports              |
| `GET`  | `/api/search/breach/{doc_id}`               | Get breach monitoring report                                                           | Reports              |
| `GET`  | `/api/search/news/{doc_id}`                 | Get breach-related news report                                                         | Reports              |
| `GET`  | `/api/search/exploit/{doc_id}`              | Get exploit intelligence report                                                        | Reports              |
| `GET`  | `/api/search/apt/{doc_id}`                  | Get APT intelligence report                                                            | Reports              |
| `GET`  | `/api/search/malware/{doc_id}`              | Get malware intelligence report                                                        | Reports              |
| `GET`  | `/api/search/strategic/{doc_id}`            | Get darkweb strategic report                                                           | Reports              |
| `GET`  | `/api/search/chat/{doc_id}`                 | Get chat intelligence report                                                           | Reports              |
| `GET`  | `/api/search/social/{doc_id}`               | Get social media intelligence report                                                   | Reports              |
| `GET`  | `/api/search/breach/screenshot/{filename}`  | Get breach report screenshot                                                           | Reports              |
| `POST` | `/api/search/strategic`                     | Search strategic reports                                                               | Search               |
| `POST` | `/api/search/breach`                        | Search breach reports                                                                  | Search               |
| `POST` | `/api/search/social`                        | Search social reports                                                                  | Search               |
| `POST` | `/api/search/exploit`                       | Search exploit reports                                                                 | Search               |
| `POST` | `/api/search/apt-intel`                     | Search APT Intel reports                                                               | Search               |
| `POST` | `/api/search/defacement`                    | Search defacement reports                                                              | Search               |
| `POST` | `/api/search/stealer/ioc`                   | Search stealer log reports                                                             | Search               |
| `POST` | `/api/search/consolidated`                  | Search consolidated reports (grouped)                                                  | Search               |
| `POST` | `/api/social/recon`                         | Cross-platform identity search to locate a user's digital footprint                    | Social Search        |
| `POST` | `/api/social/profile`                       | Scrapes the profile of requested social account                                        | Social Search        |
| `POST` | `/api/social/online/images`                 | Scrapes the images of requested social account                                         | Social Search        |
| `POST` | `/api/social/recon/image`                   | Reverse image search to identify associated social profiles                            | Social Search        |
| `POST` | `/api/social/followers`                     | Scrapes the followers of requested social account                                      | Social Search        |
| `POST` | `/api/social/following`                     | Scrapes the following of requested social account                                      | Social Search        |
| `POST` | `/api/social/posts`                         | Scrapes the posts of requested social account                                          | Social Search        |
| `POST` | `/api/social/metadata`                      | Search for specific keyword combinations linked to a username across social platforms. | Social Search        |
| `GET`  | `/api/search/breach/stix/{doc_id}`          | Get breach media intelligence report in stix format                                    | Stix                 |
| `GET`  | `/api/search/strategic/stix/{doc_id}`       | Get strategic media intelligence report in stix format                                 | Stix                 |
| `GET`  | `/api/search/defacement/stix/{doc_id}`      | Get defacement media intelligence report in stix format                                | Stix                 |
| `GET`  | `/api/search/exploit/stix/{doc_id}`         | Get exploit media intelligence report in stix format                                   | Stix                 |
| `GET`  | `/api/search/social/stix/{doc_id}`          | Get social media intelligence report in stix format                                    | Stix                 |
| `GET`  | `/api/search/chat/stix/{doc_id}`            | Get chat intelligence report in stix format                                            | Stix                 |
| `GET`  | `/api/search/news/stix/{doc_id}`            | Get news media intelligence report in stix format                                      | Stix                 |
| `POST` | `/api/urlscan/subdomains`                   | Returns the list of associated subdomains                                              | Support Method       |
| `POST` | `/api/urlscan/dns`                          | Reverse DNS and ping check                                                             | Support Method       |
| `POST` | `/api/urlscan/wayback`                      | Fetches archived snapshots and timestamps                                              | Support Method       |
| `POST` | `/api/cross/search`                         | Run Cross Search                                                                       | Support Method       |
| `GET`  | `/api/directory`                            | Get monitored source directory                                                         | System Info          |
| `GET`  | `/api/insight`                              | Get system insights                                                                    | System Info          |
| `GET`  | `/api/insight/country`                      | Get paginated country insights                                                         | System Info          |

## Crawler

### `POST /api/index/injection`

- **Summary:** Batch inject SIEM logs
- **Operation ID:** `batchInjectSiemLogs`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Ingest multiple SIEM/raw log records into the SIEM index in a single request. Each item in `logs` becomes one upserted SIEM document keyed from the authenticated user's tenant and the raw log text. `tenant_id` is injected from the current user and is not accepted from the request body.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/index/injection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "logs": [
    {
      "event_type": "auth_failure",
      "host": "edge-gateway-01",
      "raw": "Failed login attempt for admin from 10.10.0.15 targeting login-0015.security.example for admin@alerts.example",
      "severity": "high",
      "source": "waf",
      "tags": [
        "auth",
        "waf"
      ],
      "timestamp": "2026-04-24T10:15:00+00:00",
      "user": "admin"
    }
  ]
}'
```

Request content type: `application/json` `InjectionBatchRequestModel`.

```json
{
  "logs": [
    {
      "event_type": "auth_failure",
      "host": "edge-gateway-01",
      "raw": "Failed login attempt for admin from 10.10.0.15 targeting login-0015.security.example for admin@alerts.example",
      "severity": "high",
      "source": "waf",
      "tags": [
        "auth",
        "waf"
      ],
      "timestamp": "2026-04-24T10:15:00+00:00",
      "user": "admin"
    }
  ]
}
```

**Request Fields**

| Field | Sample                                                                                                                                                                                                                                                                                                         |
|-------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| logs  | `[{"event_type": "auth_failure", "host": "edge-gateway-01", "raw": "Failed login attempt for admin from 10.10.0.15 targeting login-0015.security.example for admin@alerts.example", "severity": "high", "source": "waf", "tags": ["auth", "waf"], "timestamp": "2026-04-24T10:15:00+00:00", "user": "admin"}]` |

**Response Sample `200`**

Response content type: `application/json` `InjectionBatchResponseModel`.

```json
{
  "ids": [
    "1ceff28b8f1c9e3d9bb61d6f9c7f2a1d8bde8b6b469db1ce4a724ee8c70e8d8d",
    "853e82363b8e684d5c8c6ae6f4d5bb2d1230c9bb58bc7cf56b9dfefc5659ca3d"
  ],
  "index": "siem_model",
  "indexed": 2
}
```

## Entity Scans

### `POST /api/dynamic/user`

- **Summary:** Dynamic user email exposure search
- **Operation ID:** `dynamicUserEmailExposureSearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic search for user email addresses discovered in monitored breach and defacement data, returning exposed account metadata for further investigation and remediation. This operation also fetches **real-time results from external dark-web intelligence APIs**, which may take additional time to process. During this period the API may return a pending response indicating that the upstream data collection is still running. A typical in-progress response looks like: The request is an H...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/dynamic/user" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "email": "msmannan00@gmail.com",
    "username": ""
  }
}'
```

Request content type: `application/json` `search_dynamic_param_model`.

```json
{
  "text": {
    "email": "msmannan00@gmail.com",
    "username": ""
  }
}
```

**Request Fields**

| Field | Sample                                              |
|-------|-----------------------------------------------------|
| text  | `{"email": "msmannan00@gmail.com", "username": ""}` |

**Response Sample `200`**

Response content type: `application/json`.

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
      "m_content_type": [
        "stolen"
      ],
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
### `POST /api/dynamic/cracked`

- **Summary:** Dynamic cracked credential search
- **Operation ID:** `dynamicCrackedCredentialSearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic search for cracked credentials or applications identified in breach and defacement datasets, highlighting high-risk compromised apps, accounts and password reuse exposure. The request is an HTTP POST and expects a JSON body with a **text** object. For APK/app lookups, the backend currently supports using a Play Store URL to identify cracked or repackaged versions: The **playstore** field should contain a valid Google Play application URL for which cracked or modified artifac...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/dynamic/cracked" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"
  }
}'
```

Request content type: `application/json` `search_dynamic_crack_model`.

```json
{
  "text": {
    "name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"
  }
}
```

**Request Fields**

| Field | Sample                                                                                     |
|-------|--------------------------------------------------------------------------------------------|
| text  | `{"name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"}` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": [
    {
      "m_app_name": "SuperVPN Fast VPN Client v3.0.3.apk",
      "m_package_id": "com.jrzheng.supervpnfree",
      "m_app_url": "https://filecr.com/android/supervpn-fast-vpn-client/",
      "m_network": "clearnet",
      "m_version": "3.0.3",
      "m_content_type": [
        "apk"
      ],
      "m_download_link": [],
      "m_apk_size": null,
      "m_latest_date": "2025-10-30",
      "m_mod_features": ""
    }
  ]
}
```
### `POST /api/dynamic/software`

- **Summary:** Dynamic software credential search
- **Operation ID:** `dynamicSoftwareCredentialSearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scan for software or game titles to identify the presence of cracked, pirated, or unofficial distributions across indexed sources. This scan is typically used to detect: - Cracked software - Pirated games - Modded or repackaged distributions - Unofficial download sources

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/dynamic/software" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"
  }
}'
```

Request content type: `application/json` `search_dynamic_crack_model`.

```json
{
  "text": {
    "name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"
  }
}
```

**Request Fields**

| Field | Sample                                                                                     |
|-------|--------------------------------------------------------------------------------------------|
| text  | `{"name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"}` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": [
    {
      "m_app_name": "Grand Theft Auto V / GTA 5 (Legacy) – v1.0.3411/1.70 + NVE Platinum Modpack + Bonus Content",
      "m_package_id": "https---fitgirl-repacks.site-grand-theft-auto-v-",
      "m_app_url": "https://fitgirl-repacks.site/grand-theft-auto-v/",
      "m_network": "clearnet",
      "m_version": "(thanks to AR-81!): 114 GB",
      "m_content_type": [
        "pc_game"
      ],
      "m_download_link": [],
      "m_apk_size": null,
      "m_latest_date": "2024-12-17",
      "m_mod_features": ""
    }
  ]
}
```
### `POST /api/urlscan/domain`

- **Summary:** Domain, SEO, and repository scan
- **Operation ID:** `scanDomainBasicSeoRepo`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scan a target domain using the configured scanning engine. The request is an HTTP POST and expects a JSON body matching the `DomainScanRequest` schema: Fields: - **domain** — target domain or host to scan (e.g. `www.bbc.com`) - **scanType** — scan mode selector. Supported values: - `basic` — infrastructure & HTTP intelligence (security headers, caching, CSP, CORS, etc.) - `advanced` — same as `basic`, plus port scanning and service-level inspection - `seo` — SEO metadata, indexing and ranking...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/urlscan/domain" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}'
```

Request content type: `application/json` `DomainScanRequest`.

```json
{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}
```

**Request Fields**

| Field     | Sample        |
|-----------|---------------|
| checkLive | `False`       |
| domain    | `www.bbc.com` |
| scanType  | `basic`       |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/dynamic/social`

- **Summary:** Dynamic social identifier exposure search
- **Operation ID:** `dynamicSocialIdentifierExposureSearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic search for social media identifiers and related email addresses found in breach and defacement data, helping uncover exposed or impersonated social accounts. The request is an HTTP POST and expects a JSON body with a **text** object containing the social handle or username to look up. Example request payload: The **username** field should contain the social identifier to be resolved across monitored platforms and breach-related datasets.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/dynamic/social" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "username": "bitcoin"
  }
}'
```

Request content type: `application/json` `search_dynamic_social_model`.

```json
{
  "text": {
    "username": "bitcoin"
  }
}
```

**Request Fields**

| Field | Sample                    |
|-------|---------------------------|
| text  | `{"username": "bitcoin"}` |

**Response Sample `200`**

Response content type: `application/json`.

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
      "m_content_type": [
        "stolen"
      ],
      "m_screenshot": "",
      "m_weblink": [
        "https://twitter.com/bitcoin"
      ],
      "m_dumplink": [
        "https://twitter.com/bitcoin"
      ],
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
      "m_content_type": [
        "stolen"
      ],
      "m_screenshot": "",
      "m_weblink": [
        "https://clubhouse.com/@bitcoin"
      ],
      "m_dumplink": [
        "https://clubhouse.com/@bitcoin"
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
### `POST /api/dynamic/wanted`

- **Summary:** Searches wanted people around the Globe
- **Operation ID:** `dynamicWantedPeopleSearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Performs a scan for the Wanted people around the Globe in wanted databases, sanctions lists, watchlists, or law-enforcement records. This scan helps identify whether a person is flagged internationally and may return metadata such as aliases, issuing authority, offense category, risk indicators, and reference sources. The request is an HTTP POST and expects a JSON body with a text object containing identifying information about the person to analyze. Request Body Example request:

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/dynamic/wanted" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "username": "bitcoin"
  }
}'
```

Request content type: `application/json` `search_dynamic_social_model`.

```json
{
  "text": {
    "username": "bitcoin"
  }
}
```

**Request Fields**

| Field | Sample                    |
|-------|---------------------------|
| text  | `{"username": "bitcoin"}` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "input_name": "John Doe",
    "match_found": true,
    "person_details": {
      "name": "Johnathan Andrew Doe",
      "aliases": [
        "Jon Doe",
        "J.A. Doe"
      ],
      "dob": "1984-03-12",
      "nationality": "Unknown"
    },
    "issuing_authority": {
      "agency": "International Criminal Police Organization",
      "country": "France",
      "notice_type": "red_notice"
    },
    "offense_information": {
      "primary_offense": "Money Laundering",
      "description": "Suspected involvement in cross-border financial fraud and laundering activities.",
      "date_issued": "2022-11-05"
    },
    "sources": [
      "Interpol Notices Database",
      "Global Sanctions Watchlist",
      "Financial Crime Intelligence Unit"
    ],
    "status": "success",
    "query_type": "person_identity"
  }
}
```
### `POST /api/dynamic/national-identity`

- **Summary:** Dynamic national identity search
- **Operation ID:** `dynamicNationalIdentitySearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic lookup for Pakistani national identity and law-enforcement–related records using: - CNIC (Computerized National Identity Card number) - Phone number - Family number This API correlates national identity records, associated phone numbers, addresses, family tree information, and FIR/complaint-related metadata. Depending on the input type, the API returns different structured datasets: - **CNIC** - Returns associated phone numbers, addresses, person details, and family tree dat...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/dynamic/national-identity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"
  }
}'
```

Request content type: `application/json` `search_dynamic_crack_model`.

```json
{
  "text": {
    "name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"
  }
}
```

**Request Fields**

| Field | Sample                                                                                     |
|-------|--------------------------------------------------------------------------------------------|
| text  | `{"name": "https://play.google.com/store/apps/details?id=com.jrzheng.supervpnfree&hl=en"}` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/ioc/extract`

- **Summary:** Extract IOCs from file(.pdf or .txt) or image(.png, .jpg or .jpeg)
- **Operation ID:** `iocExtractFromFile`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic extraction of Indicators of Compromise (IOCs) from uploaded files or images. The API analyzes textual and visual content to identify security-relevant indicators such as CVEs, domains, IPs, URLs, hashes, and detected language metadata. Supported input formats include: - Text files: .txt, .pdf - Images: .png, .jpg, .jpeg The API automatically extracts readable text (OCR applied for images when required) and scans it for known IOC patterns.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/ioc/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file="string""
```

Request content type: `multipart/form-data` `Body_iocExtractFromFile`.

```json
{
  "file": "string"
}
```

**Request Fields**

| Field | Sample   |
|-------|----------|
| file  | `string` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "filename": "tmp9qxjcr5k.txt",
    "file_type": "text",
    "extracted_text_length": 1096,
    "iocs": [
      {
        "m_cve": "CVE-2025-59374"
      },
      {
        "m_domain": "asus.com"
      },
      {
        "m_domain": "bleepingcomputer.com"
      },
      {
        "m_language": "en"
      }
    ],
    "status": "success",
    "original_filename": "report_8_threats.txt"
  }
}
```
### `POST /api/apk/scan`

- **Summary:** Dynamic analysis scan to identify application metadata, cracking indicators, etc
- **Operation ID:** `dynamicApkScan`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic static-analysis scan of an uploaded Android APK file to identify application metadata, security posture, permission usage, cryptographic weaknesses, network behavior, and potential tampering or cracking indicators. The API inspects the APK without executing it and extracts security-relevant signals useful for malware analysis, threat intelligence, and mobile application risk assessment. Supported File Types - .apk

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/apk/scan" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file="string""
```

Request content type: `multipart/form-data` `Body_dynamicApkScan`.

```json
{
  "file": "string"
}
```

**Request Fields**

| Field | Sample   |
|-------|----------|
| file  | `string` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "package": "com.atomczak.notepat",
    "version": "1.43.2",
    "sdk": {
      "min": 23,
      "target": 35
    },
    "signed": true,
    "debuggable": false,
    "certificate": {
      "issuer": "CN=Unknown",
      "sha256": "93:BD:BF:69:DD:A6:73:1E:87:27:DE:50:3C:8F:00:D8:91..."
    },
    "permissions": {
      "total": 11,
      "dangerous": 0,
      "dangerous_list": []
    },
    "network": {
      "urls_found": 10,
      "cleartext": true,
      "sample_urls": [
        "http://bit.ly/notepad-personalized-ads-opt-out",
        "https://bit.ly/notepad-personalized-ads-opt-out",
        "https://drive.google.com",
        "https://firebase.google.com/support/privacy",
        "https://play.google.com/store/apps/details?id=com.google.android.apps.docs"
      ]
    },
    "crypto": {
      "weak_algorithms": [
        "MD5",
        "DES",
        "SHA1",
        "RC4"
      ]
    },
    "tampering": {
      "suspected": true,
      "reasons": [
        "Unofficial certificate",
        "Missing billing classes (possible cracked app)"
      ]
    },
    "status": "success",
    "original_filename": "Notepad - simple notes_1.43.2_APKPure.apk"
  }
}
```
### `POST /api/crypto/scan`

- **Summary:** Scan cryptocurrency wallet address or transaction hash
- **Operation ID:** `dynamicCryptoScan`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic cryptocurrency scan to retrieve intelligence related to Bitcoin wallet addresses or transaction hashes. This helps identify wallet activity, transaction history, balance information, and potential risk indicators. The request is an HTTP POST and expects a JSON body with a **text** object containing either a cryptocurrency wallet address or a transaction hash to analyze. The **wallet** field should contain a valid cryptocurrency wallet address. The **hash** field should conta...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/crypto/scan" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "hash": "685b826d9726bcb2e287abb47a24f575aefe6fec7ccb2fa6304ebc11ea2b0842",
    "wallet": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  }
}'
```

Request content type: `application/json` `search_dynamic_crypto_model`.

```json
{
  "text": {
    "hash": "685b826d9726bcb2e287abb47a24f575aefe6fec7ccb2fa6304ebc11ea2b0842",
    "wallet": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  }
}
```

**Request Fields**

| Field | Sample                                                                                                                                 |
|-------|----------------------------------------------------------------------------------------------------------------------------------------|
| text  | `{"hash": "685b826d9726bcb2e287abb47a24f575aefe6fec7ccb2fa6304ebc11ea2b0842", "wallet": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"}` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "network": "bitcoin",
    "balance": {
      "confirmed": 362622341,
      "unconfirmed": 0
    },
    "transaction_count": {
      "total": 984,
      "received": 1024,
      "sent": 434
    },
    "total_received": 1649628180,
    "total_sent": 1287005839,
    "statistics": {
      "first_seen": 1768091818,
      "last_seen": 1770541860,
      "avg_transaction_value": 0.0161096501953125,
      "is_active": false
    },
    "recent_transactions": [],
    "risk_assessment": {
      "risk_level": "medium",
      "risk_factors": [
        "High balance wallet (>1 BTC)"
      ]
    },
    "status": "success",
    "query_type": "wallet_address",
    "detected_network": "bitcoin"
  }
}
```

## Network Intelligence

### `POST /api/netintel/resolve_ip`

- **Summary:** Resolve a domain to IP addresses
- **Operation ID:** `resolveIp`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Resolve a domain name to its associated IP addresses (both IPv4 and IPv6) using DNS A and AAAA record queries. The request is an HTTP POST and expects a JSON body matching the `DNSResolveRequest` schema: Fields: - **domain** — target domain name to resolve (e.g. `www.bbc.com`, `google.com`, `example.org`)

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/netintel/resolve_ip" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "domain": "example.com"
}'
```

Request content type: `application/json` `ResolveIPRequest`.

```json
{
  "domain": "example.com"
}
```

**Request Fields**

| Field  | Sample        |
|--------|---------------|
| domain | `example.com` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "domain": "www.bbc.com",
    "ips": [
      "151.101.0.81",
      "151.101.64.81",
      "151.101.128.81",
      "151.101.192.81"
    ]
  }
}
```
### `POST /api/netintel/ipscanner`

- **Summary:** Scan an IP address for network intelligence
- **Operation ID:** `ipScanner`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform comprehensive network reconnaissance on a target IP address using advanced port scanning, service fingerprinting, and security analysis. The request is an HTTP POST and expects a JSON body matching the `IPScanRequest` schema: Fields: - **ip** — target IPv4 address to scan (e.g. `52.211.48.174`, `192.168.1.1`) Payload example:

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/netintel/ipscanner" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "ip": "8.8.8.8"
}'
```

Request content type: `application/json` `NetIntelDeepScanRequest`.

```json
{
  "ip": "8.8.8.8"
}
```

**Request Fields**

| Field | Sample    |
|-------|-----------|
| ip    | `8.8.8.8` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "ip": "52.211.48.174",
  "hostnames": [
    "ec2-52-211-48-174.eu-west-1.compute.amazonaws.com"
  ],
  "country": "Ireland",
  "city": "Dublin",
  "organization": "AWS EC2 (eu-west-1)",
  "isp": "Amazon.com, Inc.",
  "asn": "AS16509 Amazon.com, Inc.",
  "cloud_provider": "Amazon Web Services",
  "cloud_region": "eu-west-1",
  "cloud_service": "EC2",
  "hosting_type": "hosting",
  "web_technologies": [
    "Apache HTTP Server"
  ],
  "vulnerabilities": [],
  "misconfigurations": [],
  "security": [
    "HSTS"
  ],
  "cdn": null,
  "waf": null,
  "paas": null,
  "amazon_s3": false,
  "load_balancer": null,
  "hsts": true,
  "web_server": "Apache",
  "favicon_hash": null,
  "allowed_methods": [],
  "cookies": [],
  "title": "BBC Account",
  "http_headers": {
    "Server": "Apache",
    "X-Powered-By": null,
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "base-uri 'self';frame-src https://www.bbc.com;..."
  },
  "cache_headers": {
    "Cache-Control": "no-cache,private,no-store",
    "Fastcgi-Cache": null,
    "X-Cache": null
  },
  "link_headers": [],
  "cameras": [],
  "is_camera": false,
  "open_ports": [
    443
  ],
  "ports": [
    {
      "port": 443,
      "protocol": "tcp",
      "service": "https",
      "banner": null,
      "state": "open",
      "protocol_verified": true,
      "cpe": null,
      "misconfigurations": [],
      "tls": {
        "version": "TLSv1.3",
        "cipher": "TLS_AES_256_GCM_SHA384",
        "bits": 256,
        "cert_cn": "*.bbc.co.uk",
        "cert_expires": "Mar 15 23:59:59 2026 GMT",
        "subject": {
          "commonName": "*.bbc.co.uk",
          "organizationName": "British Broadcasting Corporation"
        },
        "issuer": {
          "commonName": "DigiCert TLS RSA SHA256 2020 CA1",
          "organizationName": "DigiCert Inc",
          "countryName": "US"
        },
        "san": [
          [
            "DNS",
            "*.bbc.co.uk"
          ],
          [
            "DNS",
            "bbc.co.uk"
          ]
        ],
        "fingerprint_sha256": "d2291cfc03dd3199671d9300fa80da8373f3dc74bf482ea9544e23bd5546e00a",
        "is_self_signed": false,
        "not_before": "Apr 07 00:00:00 2025 GMT",
        "not_after": "Mar 15 23:59:59 2026 GMT",
        "serial_number": "0a:b2:5f:d6:ee:4b:67:52",
        "signature_algorithm": "sha256WithRSAEncryption",
        "public_key_algorithm": "RSA",
        "public_key_size": 2048,
        "key_usage": [
          "Digital Signature",
          "Key Encipherment"
        ],
        "extended_key_usage": [
          "TLS Web Server Authentication",
          "TLS Web Client Authentication"
        ],
        "authority_key_identifier": "55:D9:18:5F:D2:1C:CC:01",
        "subject_key_identifier": "80:46:88:14:CD:E1:78:4B",
        "ca_issuers": [
          "http://crt.digicert.com/DigiCertTLSRSASHA2562020CA1.crt"
        ],
        "crl_distribution_points": [
          "http://crl3.digicert.com/DigiCertTLSRSASHA2562020CA1.crl"
        ],
        "certificate_policies": [
          "2.23.140.1.2.1"
        ],
        "is_ca": false,
        "scts": [
          {
            "version": "v1",
            "log_id": "96:97:64:BF:55:58:97:AD",
            "timestamp": "Apr 07 01:59:56 2025 GMT"
          }
        ],
        "supported_versions": [
          "TLSv1.2",
          "TLSv1.3"
        ],
        "ciphers_by_version": {
          "TLSv1.2": {
            "cipher": "ECDHE-RSA-AES128-GCM-SHA256",
            "bits": 128
          },
          "TLSv1.3": {
            "cipher": "TLS_AES_256_GCM_SHA384",
            "bits": 256
          }
        },
        "weak_protocols": []
      },
      "confidence": 0.95,
      "risk_flags": [
        "strong_tls",
        "modern_tls"
      ]
    }
  ]
}
```
### `POST /api/netintel/url_vulnerability_scan`

- **Summary:** Scan a domain URL for web vulnerabilities
- **Operation ID:** `urlVulnerabilityScan`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scan a target domain using the configured scanning engine. The request is an HTTP POST and expects a JSON body matching the `DomainScanRequest` schema: Fields: - **domain** — target domain or host to scan (e.g. `www.bbc.com`) - **scanType** — scan mode selector. Supported values: - `basic` — infrastructure & HTTP intelligence (security headers, caching, CSP, CORS, etc.) - `advanced` — same as `basic`, plus port scanning and service-level inspection - `seo` — SEO metadata, indexing and ranking...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/netintel/url_vulnerability_scan" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "domain": "example.com"
}'
```

Request content type: `application/json` `UrlVulnerabilityScanRequest`.

```json
{
  "domain": "example.com"
}
```

**Request Fields**

| Field  | Sample        |
|--------|---------------|
| domain | `example.com` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/netintel/iot_detect`

- **Summary:** Scan a geographic area for exposed cameras
- **Operation ID:** `geoIotDetect`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Discover internet-exposed cameras near specified geographic coordinates using GeoIP database and intelligent port scanning. The request is an HTTP POST and expects a JSON body matching the `GeoCameraRequest` schema: Fields: - **coordinates** — geographic location in `lat,lon` format (e.g. `31.4829403,74.3343893`) - Latitude: -90 to 90 - Longitude: -180 to 180 - Works worldwide (18+ countries supported) - Country is auto-detected from coordinates - **radius_km** — search radius in kilometers (...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/netintel/iot_detect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "coordinates": "24.8607,67.0011",
  "max_ips": 200,
  "radius_km": 25
}'
```

Request content type: `application/json` `GeoCameraDetectRequest`.

```json
{
  "coordinates": "24.8607,67.0011",
  "max_ips": 200,
  "radius_km": 25
}
```

**Request Fields**

| Field       | Sample            |
|-------------|-------------------|
| coordinates | `24.8607,67.0011` |
| max_ips     | `200`             |
| radius_km   | `25`              |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/netintel/camera_detect_ranges`

- **Summary:** Scan IP ranges for exposed cameras
- **Operation ID:** `geoCameraDetectRanges`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Discover internet-exposed cameras across explicitly specified IP ranges without needing geographic coordinates. Accepts CIDR blocks, start–end IP ranges, or individual IPs — ideal when you already know the target network space. The request is an HTTP POST and expects a JSON body matching the `GeoRangesRequest` schema: Fields: - **ip_ranges** — list of IP ranges to scan (required, at least one entry) - CIDR notation: `"119.152.0.0/13"` - Start–end range: `"39.32.0.0-39.63.255.255"` - Single IP...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/netintel/camera_detect_ranges" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "ip_ranges": [
    "192.168.1.0/24"
  ],
  "max_ips": 200
}'
```

Request content type: `application/json` `GeoCameraDetectRangesRequest`.

```json
{
  "ip_ranges": [
    "192.168.1.0/24"
  ],
  "max_ips": 200
}
```

**Request Fields**

| Field     | Sample               |
|-----------|----------------------|
| ip_ranges | `["192.168.1.0/24"]` |
| max_ips   | `200`                |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```

## Profile

### `POST /api/profile/event-management/siem/search`

- **Summary:** Search SIEM logs
- **Operation ID:** `searchProfileSiemLogs`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search SIEM log records for the authenticated user tenant. Admin and maintainer users can search events only within their own tenant scope.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/profile/event-management/siem/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "date_range": "2026-04-01,2026-04-24",
  "from": 0,
  "q": "admin@alerts.example login-0015.security.example 10.10.0.15 auth_failure",
  "size": 500
}'
```

Request content type: `application/json` `SiemSearchRequestModel`.

```json
{
  "date_range": "2026-04-01,2026-04-24",
  "from": 0,
  "q": "admin@alerts.example login-0015.security.example 10.10.0.15 auth_failure",
  "size": 500
}
```

**Request Fields**

| Field      | Sample                                                                     |
|------------|----------------------------------------------------------------------------|
| date_range | `2026-04-01,2026-04-24`                                                    |
| from       | `0`                                                                        |
| q          | `admin@alerts.example login-0015.security.example 10.10.0.15 auth_failure` |
| size       | `500`                                                                      |

**Response Sample `200`**

Response content type: `application/json` `SiemSearchResponseModel`.

```json
{
  "batch_size": 500,
  "cards_data": [
    {
      "event_id": "siem-event-0001",
      "event_type": "auth_failure",
      "hash": "1ceff28b8f1c9e3d9bb61d6f9c7f2a1d8bde8b6b469db1ce4a724ee8c70e8d8d",
      "host": "edge-gateway-01",
      "ingested_at": "2026-04-24T10:15:05+00:00",
      "raw": "Failed login attempt for admin from 10.10.0.15 targeting login-0015.security.example for admin@alerts.example",
      "severity": "high",
      "source": "waf",
      "tags": [
        "auth",
        "waf"
      ],
      "tenant_id": "<authenticated-user-tenant-id>",
      "timestamp": "2026-04-24T10:15:00+00:00",
      "user": "admin"
    }
  ],
  "page_count": 1,
  "total_hits": 1
}
```

## Reports

### `GET /api/search/defacement/{doc_id}`

- **Summary:** Get defacement report
- **Operation ID:** `getDefacementReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search defacement intelligence reports for hacked or phishing websites; returns a paginated list of defacement events and their metadata. Request body (`search_consolidated_param_model`): - **q** — free-text search over URL, IP, team, attacker handle and content fields (default: empty string) - **category** — optional category filter (default `all`) - **page** — page number of the paginated result set (1-based) - **network** — one of: `all`, `clearnet`, `onion`, `i2p` (default `all`) - **datera...

**Parameters**

| Name   | In   | Required | Type   | Description | Sample           |
|--------|------|----------|--------|-------------|------------------|
| doc_id | path | yes      | string |             | `example-doc-id` |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/defacement/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "Result": [
    {
      "m_location": null,
      "m_attacker": [
        "XYZ"
      ],
      "m_team": "Alpha Wolf",
      "m_hash": "31d109a231bfdaa36fc757a7c749253021f04fad0c54d08455c516007c7feabb",
      "m_web_server": [
        "LiteSpeed"
      ],
      "m_ioc_type": [
        "hacked"
      ],
      "m_content": null,
      "m_base_url": "https://defacer.net",
      "m_url": "http://phaoboi.vn/",
      "m_ip": [
        "103.218.122.8"
      ],
      "m_leak_date": "2025-12-03",
      "m_source_url": [
        "https://defacer.net/view/54543/"
      ],
      "m_screenshot": null,
      "m_mirror_links": [
        "https://defacer.net/sc/54543"
      ]
    }
  ],
  "Suggestions": [],
  "Page_Count": 1.2
}
```
### `GET /api/search/breach/{doc_id}`

- **Summary:** Get breach monitoring report
- **Operation ID:** `getBreachReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Get a specific breach monitoring report for a tracked website or asset by its report ID. The request is an HTTP GET and accepts: - **doc_id** (path) — string identifier of the breach report document - **lang** (query, optional) — language code for localized narrative content when available. No request body is required.

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/breach/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "m_title": "Columbus Regional Healthcare System",
  "m_url": "http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion/",
  "m_screenshot": "69993154316451142028569605097804",
  "m_base_url": "http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion",
  "m_content": "Columbus Regional Healthcare System has one of the highest volume and most experienced robotic surgical programs in Southeastern North Carolina. http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion http://7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion/",
  "m_important_content": "Columbus Regional Healthcare System has one of the highest volume and most experienced robotic surgical programs in Southeastern North Carolina.",
  "m_network": "onion",
  "m_content_type": [
    "leaks"
  ],
  "m_weblink": [
    "https://crhealthcare.org/"
  ],
  "m_dumplink": [
    "https://crhealthcare.org/"
  ],
  "m_company_name": "Columbus Regional Healthcare System",
  "m_location": [
    "US"
  ],
  "m_team": "diaxin",
  "m_scrap_file": "_7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd",
  "m_language": [
    "en"
  ],
  "m_domain": [
    "7ukmkdtyxdkdivtjad57klqnd3kdsmq6tp45rrsxqnu76zzv3jvitlqd.onion",
    "crhealthcare.org"
  ],
  "m_hash": "1a17b87ad12262b38a81419c3d1cc8c57868ce62b9e32e042ff1b20a9aefacc0",
  "m_update_date": "2025-12-03T20:46:34.909368+00:00",
  "m_creation_date": "2025-12-03T20:46:34.909391+00:00",
  "content_type": [
    "ddos",
    "darkweb"
  ]
}
```
### `GET /api/search/news/{doc_id}`

- **Summary:** Get breach-related news report
- **Operation ID:** `getNewsReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Get a specific breach-related news intelligence report generated from external news feeds by its report ID. The request is an HTTP GET and accepts: - **doc_id** (path) — string identifier of the news report document - **lang** (query, optional) — language code to localize narrative sections when supported. No request body is required.

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/news/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "m_title": "Turning Intelligence Into Action with Threat-Informed Defense",
  "m_url": "https://thehackernews.com/expert-insights/2025/09/turning-intelligence-into-action-with.html",
  "m_base_url": "https://thehackernews.com/",
  "m_content": "Jean-Philippe Salles — Head of Product at Filigran Sept 22, 2025  Cybersecurity is undergoing a necessary transformation from reacting to threats as they arise to proactively anticipating and addressing them through Threat-Informed Defense (TID). This shift emphasizes operational discipline over accumulating more tools. It involves using threat intelligence to streamline existing technologies, enhance the quality of security signals, and focus efforts on the threats most relevant to each organization. The goal is to continuously identify and close security gaps by combining insights from external threat data with internal defense capabilities.  How do you put TID into practice? The team at Filigran has broken down the TID framework into a six-stage pipeline to develop actionable chunks for cybersecurity leaders. In this article, we share the details so that your security teams can leverage it too to support TID.  What is Threat-Informed Defense?#  First advocated by MITRE, Threat-Informed Defense (TID) leverages MITRE ATT&CK framework to map how real threat actors operate and align defenses accordingly. It rests on three pillars:  Cyber threat intelligence: First gather, ingest and process all of your threat intelligence to make it contextual and relevant for you. Go beyond IOCs to understand adversary behaviors and intent, which are more durable and more costly for attackers to change. Defensive measures: Translate prioritized threat intelligence into detections, hardening, response playbooks, and configurations; utilize it properly and make it do the work for you. Adapt controls to the threats most likely to target you. Testing and evaluation: Plan adversary emulation and run continuous breach-and-attack simulations to verify coverage and avoid regressions. Gain granular level visibility into the effectiveness of your security programs. Automate and scale for continuous security posture validation and improvement.  Security teams today are facing tighter budgets and limited resources. As a result, many CISOs are shifting their focus from constantly adopting new tools to making the most of the technologies they already have. This change in mindset is driving a more proactive approach to cybersecurity. Instead of waiting for threats to happen, leaders are asking critical questions like 'Who might target us?', 'How do they operate?', 'Are our defenses strong enough?' and 'What's our plan if something fails?'. Implementing a Threat-Informed Defense (TID) strategy requires breaking down silos between teams, encouraging collaboration and information sharing across security operations, threat intelligence, and testing groups.  From Idea to Execution: Threat-Informed Defense Pipeline#  Similar to Continuous Threat Exposure Management (CTEM), TID is a concept, a cybersecurity strategy. Organizations can adopt and implement TID through various approaches, whether using commercial solutions, open-source tools, or hybrid implementations. For example, one approach could involve leveraging Filigran's open-source extended threat management (XTM) suite that combines threat intelligence platform with adversary emulation capabilities. These integrated solutions help security teams operationalize TID through six actionable stages:  Stage 01: Strategic threat landscape assessment#  Goal: Identify which adversaries, malware, and campaigns are most relevant to your business model, stack, and region.  How: Threat assessment in threat-informed defense involves systematically evaluating and prioritizing the specific threat actors, their capabilities, tactics, techniques, and procedures (TTPs) that are most likely to target your organization's critical assets. A threat intelligence platform (TIP) allows you to gather, analyze, refine and share prioritized threat intelligence is a useful component for this step.  Outcome: A prioritized watchlist with clear inclusion criteria and analyst annotations.  Stage 02: Actor and malware tracking#  Goal: Keep pace with evolving TTPs and indicators while filtering noise.  How: Maintain adaptive watchlists; triage incoming reports; tag IOCs and TTPs and distribute them to SIEM/EDR/SOAR. Modern TIPs like open-source based OpenCTI use knowledge graph models to provide powerful visualizations to link campaigns, malware, techniques, and exploited vulnerabilities.  Outcome: Continuously updated views of active threats and automated, stakeholder-ready reporting to show program progress.  Stage 03: TTP and report mapping#  Goal: See where attacker behaviors outpace your defenses.  How: Advanced Persistent Threats (APTs) and opportunistic attackers increasingly target the expanded attack surface created by cloud-native architectures, leveraging misconfigurations in multi-cloud environments, exploiting container escape vulnerabilities, poisoning CI/CD pipelines with malicious code, and conducting identity-based attacks through stolen credentials and API keys. OpenCTI can serve as a critical enabler for this assessment by centralizing and correlating threat intelligence specific to your technology stack, automatically ingesting indicators and TTPs from multiple sources—including cloud provider threat feeds, container security advisories, and identity-focused threat research. The platform maps these threats to the MITRE ATT&CK framework, allowing security teams to visualize adversary groups.  Outcome: A prioritized TTP list ready for adversary emulation and detection engineering.  Stage 04: Breach & attack simulation#  Goal: Prove whether you security controls detect and respond as designed.  How: Testing security controls in TID moves beyond generic vulnerability scanning and compliance checks to validate whether your defenses actually stop the specific adversary behaviors targeting your organization. Adversary Exposure Validation (AEV) tools makes threat intelligence actionable by emulating the exact techniques your most likely threat actors employ. Filigran's open-source OpenBAS provides scalability to design and execute purple team exercises, breach and attack simulations, and atomic red team tests. It also feed outcomes back into OpenCTI to maintain context with the threats that matter.  Outcome: A continuous feedback loop that catches regressions, validates detections, and informs engineering fixes.  Stage 05: Control validation and investment#  Goal: Translate intel and testing into targeted remediation and budget decisions.  How: Use time-series and historical snapshots to show coverage trends and risk reduction. Apply remediation guidance from OpenBAS to tune configs, update rules, and plan upgrades or replacements. The continuous validation using the combination of OpenCTI and OpenBAS creates a feedback loop that informs strategic investments and architectural decisions with unprecedented precision. The quantifiable nature of these insights enables CISOs to justify budget requests with specific risk reduction metrics, prioritize engineering efforts based on actual adversary impact  Outcome: Evidence-based prioritization that improves day-to-day resilience and informs quarterly planning.  Stage 06: Quarterly review#  Goal: Recalibrate strategy and maintain executive alignment.  How: Consolidate threat insights, control coverage, and simulation results into executive-ready reporting. Our recommendation is to make this as a quarterly exercise to share with your key stakeholders. This creates a closed-loop system where threat intelligence directly drives security validation priorities. Revisit tracked threats, business priorities, and risk appetite as part of a broader Continuous Threat Exposure Management (CTEM) rhythm.  Outcome: A living program that stays aligned to business risk and adversary reality.  Ready to make the shift to Threat-Informed Defense?#  Utilize TID to shift the conversation from traditional security life cycle (protection/detection/response) to proactive finding the gaps in your security controls and reducing cyber risks. The empirical approach of TID provides metrics that matter, from 'we blocked 10 million attacks' to 'we can detect and stop 85% of the techniques used by the ransomware groups actively targeting our sector and here is what we are going to do to fill our gaps for the rest 15%'.  If you'd like to learn more about TID, Filigran's open-source product suite, and its alignment with the framework you can download our latest white paper, A Practical Guide to Threat-Informed Defense, or contact us to speak directly with our team.    SHARE      Tweet  Share  Share  Share",
  "m_important_content": "Jean-Philippe Salles — Head of Product at Filigran Sept 22, 2025  Cybersecurity is undergoing a necessary transformation from reacting to threats as they arise to proactively anticipating and addressing them through Threat-Informed Defense (TID). This shift emphasizes operational discipline over accumulating more tools.",
  "m_network": "clearnet",
  "m_content_type": [
    "news"
  ],
  "m_weblink": [
    "https://thehackernews.com/expert-insights/2025/09/turning-intelligence-into-action-with.html"
  ],
  "m_dumplink": [
    "https://thehackernews.com/expert-insights/2025/09/turning-intelligence-into-action-with.html"
  ],
  "m_team": "hackernews live",
  "m_scrap_file": "_thehackernews",
  "m_organization": [
    "Filigran",
    "MITRE",
    "Cybersecurity"
  ],
  "m_language": [
    "en"
  ],
  "m_domain": [
    "thehackernews.com"
  ],
  "m_hash": "7cd89edea323f8127203c984df5df7d7cbb0b564cae4b5ef770f7050f11cba34",
  "m_update_date": "2025-10-10T08:21:46.160580+00:00",
  "m_creation_date": "2025-10-10T08:21:46.186711+00:00"
}
```
### `GET /api/search/exploit/{doc_id}`

- **Summary:** Get exploit intelligence report
- **Operation ID:** `getExploitReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Get a specific exploit intelligence report (CVE, exploit kit, zero-day activity, etc.) by its report ID. The request is an HTTP GET and accepts: - **doc_id** (path) — string identifier of the exploit report document - **lang** (query, optional) — language code for localized narrative fields when available. No request body is required.

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/exploit/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "m_title": "Windows Registry Only Persistence",
  "m_url": "https://www.rapid7.com/db/modules/exploit/windows/persistence/registry/",
  "m_base_url": "https://www.rapid7.com/contact/",
  "m_content": "Windows Registry Only Persistence",
  "m_important_content": "Windows Registry Only Persistence",
  "m_network": "clearnet",
  "m_content_type": [
    "cve"
  ],
  "m_weblink": [
    "https://github.com/rapid7/metasploit-framework/blob/master//modules/exploits/windows/persistence/registry.rb",
    "https://github.com/rapid7/metasploit-framework/commits/master//modules/exploits/windows/persistence/registry.rb"
  ],
  "content_type": [
    "persistence"
  ],
  "m_name": "Donny Maasland donny.maasland@fox-it.com,h00die",
  "m_code_snippet": [
    "msf > use exploit/windows/persistence/registry\n\n    msf exploit(registry) > show targets\n\n        ...targets...\n\n    msf exploit(registry) > set TARGET < target-id >\n\n    msf exploit(registry) > show options\n\n        ...show and set options...\n\n    msf exploit(registry) > exploit"
  ],
  "m_platform": [
    "Windows"
  ],
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
### `GET /api/search/apt/{doc_id}`

- **Summary:** Get APT intelligence report
- **Operation ID:** `getAptReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Retrieve an indexed APT actor intelligence report by document id. The optional `lang` query parameter requests localized narrative fields when available.

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/apt/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "m_title": "Example APT Actor",
  "m_content": "Actor profile, aliases, targeting, tooling, and related indicators.",
  "m_family": ["Example Actor"],
  "m_country": ["Example Country"],
  "m_url": ["https://example.test/report"],
  "m_hash": "example-document-hash"
}
```
### `GET /api/search/malware/{doc_id}`

- **Summary:** Get malware intelligence report
- **Operation ID:** `getMalwareReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Retrieve an indexed malware intelligence report by document id. The optional `lang` query parameter requests localized narrative fields when available.

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/malware/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "m_title": "Example Malware Family",
  "m_signature": "example.signature",
  "m_content": "Malware profile, signatures, indicators, reporting source, and related metadata.",
  "m_family": ["Example Malware"],
  "m_reporter": ["Example Source"],
  "m_hash": "example-document-hash"
}
```
### `GET /api/search/strategic/{doc_id}`

- **Summary:** Get darkweb strategic report
- **Operation ID:** `getStrategicReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Get a specific strategic intelligence report aggregating crawled content from onion, I2P, and similar hidden-service pages by its report ID. The request is an HTTP GET and accepts: - **doc_id** (path) — string identifier of the strategic (generic) report document - **lang** (query, optional) — language code for localized narrative content. No request body is required.

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/strategic/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```text
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
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/static/assets/amazon.png",
  ],
  "m_sub_url": [
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/popular/823",
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/new_arraival/823",
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
### `GET /api/search/chat/{doc_id}`

- **Summary:** Get chat intelligence report
- **Operation ID:** `getChatReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Get a specific chat intelligence report focused on messaging platforms such as Telegram by its report ID. The request is an HTTP GET and accepts: - **doc_id** (path) — string identifier of the chat report document - **lang** (query, optional) — language code used to localize analytical summaries when available. No request body is required.

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/chat/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
  "m_message_type": [
    "photo"
  ],
  "m_media_url": "https://t.me/mash/69893",
  "m_media_caption": "9 9 1 0 0 0 2 3 0 0 RUKO SENTRA NIAGA KALIMALANG BLOK B-1 NO.24 JALAN AHMAD YANI, KAYURINGIN BELAKANG MALL BCP •QEYSA •LENKA •MEMEY •SANSAN •KHANZA •ALEXA •ANITA •SENA •ESSA •NAOMI •MPIE •VITTA •CATRIN •MUTIA •FELISHA •ARRA •LALA •KIKI •EVA ID INSTAGRAM https://www.instagram.com/new_king_spa_bekasi_selatan?igsh=Znk4cWY3OG1udzZ3 BOKING DISINI @Tiarkasir LOKASI https://maps.app.goo.gl/sNzBhjnHhk7bgF2WA SAYA TUNGGU KEHADIRANNYA SELALU BOS KU",
  "m_reply_to_message_id": "69892",
  "m_message_status": "success",
  "m_channel_name": "Mash",
  "m_weblink": [
    "https://t.me/+mBgDVq0QTftmY2Ji"
  ],
  "m_users": [
    "Tiarkasir"
  ],
  "m_content_type": [
    "text"
  ],
  "m_sender_id": "1117628569",
  "m_sender_is_bot": false,
  "m_is_forwarded": false,
  "m_forwarded_date": "2025-11-05 08:29:26",
  "m_is_reply": true,
  "m_pinned": false,
  "m_location": [
    "KAYURINGIN"
  ],
  "m_social_media_profiles": [
    "https://www.instagram.com/new_king_spa_bekasi_"
  ],
  "m_domain": [
    "instagram.com"
  ],
  "m_platforms": [
    "instagram"
  ],
  "m_cluster_id": "chat",
  "m_document_id": "e233d6042cec2a3239a701d0eebebe3430f72543c0fd0e20de00f228808cafa5",
  "m_hash": "e233d6042cec2a3239a701d0eebebe3430f72543c0fd0e20de00f228808cafa5",
  "m_creation_date": "2025-12-03T21:36:59.858292+00:00",
  "m_edit_date": "2025-12-03 19:40:44",
  "m_organization": [
    "Boeing"
  ],
  "m_language": [
    "ru"
  ]
}
```
### `GET /api/search/social/{doc_id}`

- **Summary:** Get social media intelligence report
- **Operation ID:** `getSocialReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/social/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `GET /api/search/breach/screenshot/{filename}`

- **Summary:** Get breach report screenshot
- **Operation ID:** `getBreachReportScreenshot`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Retrieve the screenshot image associated with a specific breach report, stored in WebP format. The request is an HTTP GET and accepts: - **filename** (path) — base filename of the screenshot without extension. No request body is required.

**Parameters**

| Name     | In   | Required | Type   | Description | Sample    |
|----------|------|----------|--------|-------------|-----------|
| filename | path | yes      | string |             | `example` |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/breach/screenshot/example" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```text
<webp image bytes>
```

## Search

### `POST /api/search/strategic`

- **Summary:** Search strategic reports
- **Operation ID:** `searchStrategicReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search strategic intelligence reports using filters such as free-text query, network, date range, content type, and IOC entity filters. Matching records can be opened through the strategic report detail API.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/strategic" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}'
```

Request content type: `application/json` `search_consolidated_param_model`.

```json
{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}
```

**Request Fields**

| Field         | Sample                        |
|---------------|-------------------------------|
| attacker      | ``                            |
| category      | `all`                         |
| content       | `all`                         |
| daterange     | ``                            |
| entity_filter | `{"m_country": ["pakistan"]}` |
| fullsearch    | `False`                       |
| ioc           | ``                            |
| matchtype     | ``                            |
| must          | `False`                       |
| network       | `all`                         |
| page          | `1`                           |
| platform      | ``                            |
| q             | ``                            |
| safe          | `False`                       |
| team          | ``                            |
| url           | ``                            |
| user          | ``                            |

**Response Sample `200`**

Response content type: `application/json`.

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
      "m_content_type": [
        "news",
        "adult"
      ],
      "m_clearnet_links": [
        "instagram.com/bbcnews/",
        "tiktok.com/@bbcnews?lang=en",
        "facebook.com/bbcnews",
        "twitter.com/BBCNews"
      ],
      "m_country": [
        "India",
        "Japan",
        "China",
        "Hong Kong",
        "Pakistan",
        "New Zealand",
        "Australia",
        "Ukraine",
        "Israel"
      ],
      "m_location": [
        "India",
        "UK",
        "China",
        "South East Asia",
        "Hong Kong",
        "New Zealand",
        "Australia",
        "Thai",
        "Ukraine",
        "Asia"
      ],
      "m_person": [
        "Trump",
        "Xi",
        "Robert Irwin"
      ],
      "m_organization": [
        "Bollywood"
      ],
      "m_language": [
        "en"
      ],
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
### `POST /api/search/breach`

- **Summary:** Search breach reports
- **Operation ID:** `searchBreachReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search breach / leak intelligence reports aggregated from ransomware blogs, extortion sites, leak forums, and darkweb data-dump portals; returns a paginated list of breach announcements and related metadata. Request body (`search_consolidated_param_model`): - **q** — free-text search term applied across title, content, location, industry, team name, domains, etc. (default: empty string) - **category** — logical content bucket. `"all"` searches across consolidated leak indices; other values may restri...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/breach" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}'
```

Request content type: `application/json` `search_consolidated_param_model`.

```json
{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}
```

**Request Fields**

| Field         | Sample                        |
|---------------|-------------------------------|
| attacker      | ``                            |
| category      | `all`                         |
| content       | `all`                         |
| daterange     | ``                            |
| entity_filter | `{"m_country": ["pakistan"]}` |
| fullsearch    | `False`                       |
| ioc           | ``                            |
| matchtype     | ``                            |
| must          | `False`                       |
| network       | `all`                         |
| page          | `1`                           |
| platform      | ``                            |
| q             | ``                            |
| safe          | `False`                       |
| team          | ``                            |
| url           | ``                            |
| user          | ``                            |

**Response Sample `200`**

Response content type: `application/json`.

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
      "m_content_type": [
        "leaks"
      ],
      "m_industry": "Agricultural Sector",
      "m_logo_or_images": [
        "http://.../images/announcement/logo.png"
      ],
      "m_location": [
        "Germany"
      ],
      "m_team": "BROTHERHOOD",
      "m_country": [
        "Germany"
      ],
      "m_domain": [
        "brohoodyaifh2ptccph5zfljyajjabwjjo4lg6gfp4xb6ynw5w7ml6id.onion"
      ],
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
      "m_content_type": [
        "leaks"
      ],
      "m_industry": "Electricity, Oil & Gas",
      "m_websites": [
        "https://www.ib-laudi.de/"
      ],
      "m_location": [
        "Germany"
      ],
      "m_team": "BROTHERHOOD",
      "m_country": [
        "Germany"
      ],
      "m_dumplink": [
        "http://.../files/230629 Berechnung Raumluftmengen LPH4.xlsx",
        "..."
      ]
    }
  ],
  "Page_Count": 1
}
```
### `POST /api/search/social`

- **Summary:** Search social reports
- **Operation ID:** `searchSocialReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search social media and chat intelligence reports using free-text query, platform/category selectors, date range, and structured IOC filters. Telegram searches are routed through this endpoint by using `category: "telegram"`.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/social" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}'
```

Request content type: `application/json` `search_consolidated_param_model`.

```json
{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}
```

**Request Fields**

| Field         | Sample                        |
|---------------|-------------------------------|
| attacker      | ``                            |
| category      | `all`                         |
| content       | `all`                         |
| daterange     | ``                            |
| entity_filter | `{"m_country": ["pakistan"]}` |
| fullsearch    | `False`                       |
| ioc           | ``                            |
| matchtype     | ``                            |
| must          | `False`                       |
| network       | `all`                         |
| page          | `1`                           |
| platform      | ``                            |
| q             | ``                            |
| safe          | `False`                       |
| team          | ``                            |
| url           | ``                            |
| user          | ``                            |

**Response Sample `200`**

Response content type: `application/json`.

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
      "m_content_type": [
        "news",
        "adult"
      ],
      "m_clearnet_links": [
        "instagram.com/bbcnews/",
        "tiktok.com/@bbcnews?lang=en",
        "facebook.com/bbcnews",
        "twitter.com/BBCNews"
      ],
      "m_country": [
        "India",
        "Japan",
        "China",
        "Hong Kong",
        "Pakistan",
        "New Zealand",
        "Australia",
        "Ukraine",
        "Israel"
      ],
      "m_location": [
        "India",
        "UK",
        "China",
        "South East Asia",
        "Hong Kong",
        "New Zealand",
        "Australia",
        "Thai",
        "Ukraine",
        "Asia"
      ],
      "m_person": [
        "Trump",
        "Xi",
        "Robert Irwin"
      ],
      "m_organization": [
        "Bollywood"
      ],
      "m_language": [
        "en"
      ],
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
### `POST /api/search/exploit`

- **Summary:** Search exploit reports
- **Operation ID:** `searchExploitReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search exploit and vulnerability intelligence reports using free-text query, CVE/vendor/product filters, content type, network, date range, and structured IOC filters.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/exploit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}'
```

Request content type: `application/json` `search_consolidated_param_model`.

```json
{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}
```

**Request Fields**

| Field         | Sample                        |
|---------------|-------------------------------|
| attacker      | ``                            |
| category      | `all`                         |
| content       | `all`                         |
| daterange     | ``                            |
| entity_filter | `{"m_country": ["pakistan"]}` |
| fullsearch    | `False`                       |
| ioc           | ``                            |
| matchtype     | ``                            |
| must          | `False`                       |
| network       | `all`                         |
| page          | `1`                           |
| platform      | ``                            |
| q             | ``                            |
| safe          | `False`                       |
| team          | ``                            |
| url           | ``                            |
| user          | ``                            |

**Response Sample `200`**

Response content type: `application/json`.

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
      "m_content_type": [
        "news",
        "adult"
      ],
      "m_clearnet_links": [
        "instagram.com/bbcnews/",
        "tiktok.com/@bbcnews?lang=en",
        "facebook.com/bbcnews",
        "twitter.com/BBCNews"
      ],
      "m_country": [
        "India",
        "Japan",
        "China",
        "Hong Kong",
        "Pakistan",
        "New Zealand",
        "Australia",
        "Ukraine",
        "Israel"
      ],
      "m_location": [
        "India",
        "UK",
        "China",
        "South East Asia",
        "Hong Kong",
        "New Zealand",
        "Australia",
        "Thai",
        "Ukraine",
        "Asia"
      ],
      "m_person": [
        "Trump",
        "Xi",
        "Robert Irwin"
      ],
      "m_organization": [
        "Bollywood"
      ],
      "m_language": [
        "en"
      ],
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
### `POST /api/search/apt-intel`

- **Summary:** Search APT Intel reports
- **Operation ID:** `searchAptIntelReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search APT actor and malware intelligence reports across the Actors & Malware data set. Use `category: "all"` for combined results, `category: "apt"` for actor reports, and `category: "malware"` or `category: "malware-bazaar"` for malware records.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/apt-intel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "category": "apt",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "KP"
    ],
    "m_family": [
      "Lazarus"
    ]
  },
  "matchtype": "or",
  "must": false,
  "network": "all",
  "page": 1,
  "q": "lazarus"
}'
```

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "Result": [
    {
      "doc_id": "example-doc-id",
      "rank_index": "apt_model",
      "m_title": "Example APT Actor",
      "m_family": ["Lazarus"],
      "m_country": ["KP"],
      "m_hash": "example-document-hash"
    }
  ],
  "Page_Count": 1
}
```
### `POST /api/search/defacement`

- **Summary:** Search defacement reports
- **Operation ID:** `searchDefacementReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search defacement, phishing, hacked-site, and related website compromise reports using free-text query, attacker/team filters, content type, network, date range, and structured IOC filters.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/defacement" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}'
```

Request content type: `application/json` `search_consolidated_param_model`.

```json
{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}
```

**Request Fields**

| Field         | Sample                        |
|---------------|-------------------------------|
| attacker      | ``                            |
| category      | `all`                         |
| content       | `all`                         |
| daterange     | ``                            |
| entity_filter | `{"m_country": ["pakistan"]}` |
| fullsearch    | `False`                       |
| ioc           | ``                            |
| matchtype     | ``                            |
| must          | `False`                       |
| network       | `all`                         |
| page          | `1`                           |
| platform      | ``                            |
| q             | ``                            |
| safe          | `False`                       |
| team          | ``                            |
| url           | ``                            |
| user          | ``                            |

**Response Sample `200`**

Response content type: `application/json`.

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
      "m_content_type": [
        "news",
        "adult"
      ],
      "m_clearnet_links": [
        "instagram.com/bbcnews/",
        "tiktok.com/@bbcnews?lang=en",
        "facebook.com/bbcnews",
        "twitter.com/BBCNews"
      ],
      "m_country": [
        "India",
        "Japan",
        "China",
        "Hong Kong",
        "Pakistan",
        "New Zealand",
        "Australia",
        "Ukraine",
        "Israel"
      ],
      "m_location": [
        "India",
        "UK",
        "China",
        "South East Asia",
        "Hong Kong",
        "New Zealand",
        "Australia",
        "Thai",
        "Ukraine",
        "Asia"
      ],
      "m_person": [
        "Trump",
        "Xi",
        "Robert Irwin"
      ],
      "m_organization": [
        "Bollywood"
      ],
      "m_language": [
        "en"
      ],
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
### `POST /api/search/stealer/ioc`

- **Summary:** Search stealer log reports
- **Operation ID:** `searchStealerLogAndConsolidatedReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search stealer log credentials and log files using filters such as free-text query, URL, username, type and date range; returns normalized credential or log records from the stealer logs index. Request body (`search_credential_param_model`): - **daterange** — optional creation date range in `YYYY-MM-DD,YYYY-MM-DD` format; empty string means no filter - **q** — free-text search across the raw line and extracted fields (email, domain, username, URL, etc.) - **url** — optional URL/domain filter...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/stealer/ioc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "category": "",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "page": 1,
  "password_schema": {
    "hasAlphabets": true,
    "hasNumbers": true,
    "hasSpecialChars": true,
    "maxLength": 1,
    "minLength": 1
  },
  "q": "",
  "type": "c",
  "url": "",
  "user": ""
}'
```

Request content type: `application/json` `search_credential_param_model`.

```json
{
  "category": "",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "page": 1,
  "password_schema": {
    "hasAlphabets": true,
    "hasNumbers": true,
    "hasSpecialChars": true,
    "maxLength": 1,
    "minLength": 1
  },
  "q": "",
  "type": "c",
  "url": "",
  "user": ""
}
```

**Request Fields**

| Field           | Sample                                                                                                |
|-----------------|-------------------------------------------------------------------------------------------------------|
| category        | ``                                                                                                    |
| daterange       | ``                                                                                                    |
| entity_filter   | `{"m_country": ["pakistan"]}`                                                                         |
| fullsearch      | `False`                                                                                               |
| ioc             | ``                                                                                                    |
| page            | `1`                                                                                                   |
| password_schema | `{"hasAlphabets": true, "hasNumbers": true, "hasSpecialChars": true, "maxLength": 1, "minLength": 1}` |
| q               | ``                                                                                                    |
| type            | `c`                                                                                                   |
| url             | ``                                                                                                    |
| user            | ``                                                                                                    |

**Response Sample `200`**

Response content type: `application/json`.

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
### `POST /api/search/consolidated`

- **Summary:** Search consolidated reports (grouped)
- **Operation ID:** `searchConsolidatedReports`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Search across all report types (breach/leak, exploit, generic/strategic, chat, social, etc.) and return a consolidated, section-grouped set of report metadata. The request is an HTTP POST and expects a JSON body matching the `search_consolidated_param_model` schema. A typical request payload might look like: Semantics: - **q** — free-text query across all supported indices - **page** — page number for paginated results - **network** — network filter (e.g. `all`, `clearnet`, `onion`, `i2p`) -...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/search/consolidated" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}'
```

Request content type: `application/json` `search_consolidated_param_model`.

```json
{
  "attacker": "",
  "category": "all",
  "content": "all",
  "daterange": "",
  "entity_filter": {
    "m_country": [
      "pakistan"
    ]
  },
  "fullsearch": false,
  "ioc": "",
  "matchtype": "",
  "must": false,
  "network": "all",
  "page": 1,
  "platform": "",
  "q": "",
  "safe": false,
  "team": "",
  "url": "",
  "user": ""
}
```

**Request Fields**

| Field         | Sample                        |
|---------------|-------------------------------|
| attacker      | ``                            |
| category      | `all`                         |
| content       | `all`                         |
| daterange     | ``                            |
| entity_filter | `{"m_country": ["pakistan"]}` |
| fullsearch    | `False`                       |
| ioc           | ``                            |
| matchtype     | ``                            |
| must          | `False`                       |
| network       | `all`                         |
| page          | `1`                           |
| platform      | ``                            |
| q             | ``                            |
| safe          | `False`                       |
| team          | ``                            |
| url           | ``                            |
| user          | ``                            |

**Response Sample `200`**

Response content type: `application/json`.

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
        "m_domain": [
          "okta.com"
        ],
        "m_network": "onion",
        "m_content_type": [
          "leaks"
        ],
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
        "m_platform": [
          "Web"
        ],
        "m_content_type": [
          "exploit"
        ],
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
        "content_type": [
          "threat_intel",
          "news"
        ],
        "m_hash": "ghi789..."
      }
    ]
  }
}
```

## Social Search

### `POST /api/social/recon`

- **Summary:** Cross-platform identity search to locate a user's digital footprint
- **Operation ID:** `getSocialProfileGlobalPresence`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scans a vast ecosystem of over 100+ social networks, professional forums, and niche community sites to identify profiles associated with a specific name or query. This API is designed for digital reconnaissance, identity mapping, and background verification, providing a comprehensive view of a target's online presence across fragmented platforms. The API distinguishes between direct URL matches (active) and potential engine-indexed matches (suggested), ensuring high-confidence results. Suppor...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/recon" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "query": "example query"
}'
```

Request content type: `application/json` `SocialReconRequest`.

```json
{
  "query": "example query"
}
```

**Request Fields**

| Field | Sample          |
|-------|-----------------|
| query | `example query` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": [
    {
      "metadata": {
        "platform": "instagram",
        "username": "usman_unchained",
        "social_handle": "usman_unchained",
        "url": "https://www.instagram.com/",
        "timestamp": "2026-02-27T07:19:35.570506+00:00",
        "status": "suggested"
      },
      "data": {
        "title": "Usman Ali | Online Mental Health Coach",
        "snippet": "132K Followers, 3,859 Following... Guiding Muslim Professionals...",
        "real_name": "Usman Ali"
      }
    }
  ]
}
```
### `POST /api/social/profile`

- **Summary:** Scrapes the profile of requested social account
- **Operation ID:** `getSocialProfiles`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scrape public profile information for a requested social media account by platform and username; returns structured profile metadata for the specified account. This endpoint corresponds to `POST /api/social/profile` and expects a JSON body containing the target platform and username. Supported request fields: - **platform** — name of the social media platform - **username** — account handle / username to scrape Example request payload:

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "platform": "tiktok",
  "username": "@msmannan00"
}'
```

Request content type: `application/json` `SocialProfileRequest`.

```json
{
  "platform": "tiktok",
  "username": "@msmannan00"
}
```

**Request Fields**

| Field    | Sample        |
|----------|---------------|
| platform | `tiktok`      |
| username | `@msmannan00` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "profile": {
      "real_name": "Sarcaxxm🇵🇸",
      "bio": "i be postin cuz i cant afford a therapist\npersonal: @sarcaxxm.exe\nnew broadcast ⬇️",
      "location": "",
      "total_posts": "561",
      "total_followers": "500K",
      "total_following": "1",
      "profile_url": "https://www.instagram.com/sarcaxxm"
    },
    "platform": "instagram",
    "username": "sarcaxxm",
    "status": "active"
  }
}
```
### `POST /api/social/online/images`

- **Summary:** Scrapes the images of requested social account
- **Operation ID:** `getSocialProfileImages`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Retrieves a collection of images associated with a specific social media profile. This API performs a deep search across indexed web resources to locate profile pictures, shared posts, and media assets linked to the requested username and platform. The API is particularly effective for digital asset discovery, profile verification, and visual content archival. Supported request fields: - **platform** — name of the social media platform - **username** — account handle / username to scrape Exam...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/online/images" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "platform": "all",
  "username": "string",
  "max_followers": 50
}'
```

Request content type: `application/json` `SocialOnlineImages`.

```json
{
  "platform": "all",
  "username": "string",
  "max_followers": 50
}
```

**Request Fields**

| Field         | Sample   |
|---------------|----------|
| platform      | `all`    |
| username      | `string` |
| max_followers | `50`     |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "searched_username": "sarcaxxm",
    "platform": "instagram",
    "total_found": 10,
    "images": [
      {
        "image_url": "https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3625261035619386821",
        "thumbnail": "https://tse2.mm.bing.net/th/id/OIP.Ie7AsRvJ_QTzkNIZkQ9ZrAHaJQ?pid=Api",
        "title": "Sarcaxxm🇵🇸 | good for us tho | Instagram",
        "source": "Bing"
      }
    ]
  }
}
```
### `POST /api/social/recon/image`

- **Summary:** Reverse image search to identify associated social profiles
- **Operation ID:** `getSocialReconImageSearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Performs a reverse image search to identify and locate a specific person or profile across various digital platforms. By uploading an image, the API scans social networks, professional portfolios, and public databases to find matching visual identities and their associated social handles. This API is a powerful tool for OSINT (Open Source Intelligence), identity verification, and cross-platform profile linking. Supported File Types: - image: .png, .jpg, .jpeg

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/recon/image" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "key": "value"
}'
```

Request content type: `application/json`.

```json
{
  "key": "value"
}
```

**Request Fields**

| Field | Sample  |
|-------|---------|
| key   | `value` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": [
    {
      "metadata": {
        "platform": "upwork",
        "username": "en-gb",
        "social_handle": "upwork",
        "url": "https://www.upwork.com/",
        "timestamp": "2026-02-27T07:05:28.006703+00:00",
        "image_path": "tmp_uploads/5e9042deff014d24a17a042702891edd.png",
        "status": "active"
      },
      "data": {
        "title": "",
        "snippet": "",
        "real_name": null,
        "matched_page": "https://www.upwork.com/en-gb/freelancers/~018a513076547a14a0..."
      }
    }
  ]
}
```
### `POST /api/social/followers`

- **Summary:** Scrapes the followers of requested social account
- **Operation ID:** `getSocialProfileFollowers`
- **Auth:** Bearer token required
- **Response status:** `200`

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/followers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "platform": "all",
  "username": "string",
  "max_followers": 50
}'
```

Request content type: `application/json` `SocialFollowersRequest`.

```json
{
  "platform": "all",
  "username": "string",
  "max_followers": 50
}
```

**Request Fields**

| Field         | Sample   |
|---------------|----------|
| platform      | `all`    |
| username      | `string` |
| max_followers | `50`     |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/social/following`

- **Summary:** Scrapes the following of requested social account
- **Operation ID:** `getSocialProfileFollowing`
- **Auth:** Bearer token required
- **Response status:** `200`

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/following" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "platform": "all",
  "username": "string",
  "max_following": 50
}'
```

Request content type: `application/json` `SocialFollowingRequest`.

```json
{
  "platform": "all",
  "username": "string",
  "max_following": 50
}
```

**Request Fields**

| Field         | Sample   |
|---------------|----------|
| platform      | `all`    |
| username      | `string` |
| max_following | `50`     |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/social/posts`

- **Summary:** Scrapes the posts of requested social account
- **Operation ID:** `getSocialProfilePosts`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scrapes and retrieves a detailed feed of posts from a requested social media account based on the provided platform and username. This API extracts post-specific data including engagement metrics, media types, and audience interactions. The API is useful for social media monitoring, sentiment analysis, influencer tracking, and digital footprint assessment. Supported request fields: - **platform** — name of the social media platform (e.g. Instagram, Twitter, Facebook, etc.) - **username** — ac...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "platform": "tiktok",
  "username": "@msmannan00"
}'
```

Request content type: `application/json` `SocialProfileRequest`.

```json
{
  "platform": "tiktok",
  "username": "@msmannan00"
}
```

**Request Fields**

| Field    | Sample        |
|----------|---------------|
| platform | `tiktok`      |
| username | `@msmannan00` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": [
    {
      "status": "active",
      "post_url": "https://www.instagram.com/sarcaxxm/p/DU600SiiAKJ/",
      "datetime": "2026-02-19T00:20:07.000Z",
      "caption": "roza iftaar hone me kitne time reh gya hai guys?",
      "likes": "55000",
      "comments": "359",
      "shares": "0",
      "views": "0",
      "media_type": "text",
      "media_url": "",
      "connections": [
        "zarafatima_.xo",
        "aleeza_ox"
      ],
      "comments_text": [
        "1st sehri done 🥰🥰",
        "RamzanHolic 🥀"
      ]
    }
  ]
}
```
### `POST /api/social/metadata`

- **Summary:** Search for specific keyword combinations linked to a username across social platforms.
- **Operation ID:** `getSocialMetadata`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scans a specified social media platform for mentions of a target username in conjunction with a list of specific search tokens or keywords. This API is designed for brand reputation monitoring, crisis management, and sentiment discovery, allowing users to find specific narrative clusters (e.g., specific events or scandals) surrounding a public figure or organization. The API combines the provided tokens with the username to generate a targeted search query and returns the most relevant posts...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/social/metadata" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "tokens": [
    "string"
  ],
  "username": "string",
  "platform": "all"
}'
```

Request content type: `application/json` `SocialMetadataRequest`.

```json
{
  "tokens": [
    "string"
  ],
  "username": "string",
  "platform": "all"
}
```

**Request Fields**

| Field    | Sample       |
|----------|--------------|
| tokens   | `["string"]` |
| username | `string`     |
| platform | `all`        |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "result": {
    "query": "pti scam imrankhan",
    "total_found": 20,
    "timestamp": "2026-02-27T07:08:57.351496+00:00",
    "results": [
      {
        "title": "#ToshaKhan - Twitter Search / Twitter",
        "url": "https://twitter.com/hashtag/ToshaKhan?src=hashtag_click",
        "snippet": "Imran Khan is even the bigger idiot than that chor as he sold the priceless watch for just 2 crore! Due to the Toshakhana scam...",
        "timestamp": "2026-02-27T07:08:57.351496+00:00"
      }
    ]
  }
}
```

## Stix

### `GET /api/search/breach/stix/{doc_id}`

- **Summary:** Get breach media intelligence report in stix format
- **Operation ID:** `getBreachStixReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Return a **STIX 2.1 bundle** for a single document. This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing: - **TLP marking definitions** (AMBER and RED) - a primary **report** object - optional **infrastructure** describing the source/service (e.g., onion market/forum) - extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`) - an **observed-data** object refe...

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/breach/stix/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
      "definition": {
        "tlp": "amber"
      }
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": [
        "anonymization"
      ],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
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
      "object_refs": [
        "domain-name--...",
        "url--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": [
        "malicious-activity"
      ],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": [
        "threat-report"
      ],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "lang": "en",
      "external_references": [
        {
          "source_name": "source",
          "url": "http://example.onion"
        },
        {
          "source_name": "content-hash",
          "external_id": "<hash>"
        }
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```
### `GET /api/search/strategic/stix/{doc_id}`

- **Summary:** Get strategic media intelligence report in stix format
- **Operation ID:** `getStrategicStixReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Return a **STIX 2.1 bundle** for a single document. This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing: - **TLP marking definitions** (AMBER and RED) - a primary **report** object - optional **infrastructure** describing the source/service (e.g., onion market/forum) - extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`) - an **observed-data** object refe...

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/strategic/stix/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
      "definition": {
        "tlp": "amber"
      }
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": [
        "anonymization"
      ],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
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
      "object_refs": [
        "domain-name--...",
        "url--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": [
        "malicious-activity"
      ],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": [
        "threat-report"
      ],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "lang": "en",
      "external_references": [
        {
          "source_name": "source",
          "url": "http://example.onion"
        },
        {
          "source_name": "content-hash",
          "external_id": "<hash>"
        }
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```
### `GET /api/search/defacement/stix/{doc_id}`

- **Summary:** Get defacement media intelligence report in stix format
- **Operation ID:** `getDefacementStixReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Return a **STIX 2.1 bundle** for a single document. This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing: - **TLP marking definitions** (AMBER and RED) - a primary **report** object - optional **infrastructure** describing the source/service (e.g., onion market/forum) - extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`) - an **observed-data** object refe...

**Parameters**

| Name   | In   | Required | Type   | Description | Sample           |
|--------|------|----------|--------|-------------|------------------|
| doc_id | path | yes      | string |             | `example-doc-id` |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/defacement/stix/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
      "definition": {
        "tlp": "amber"
      }
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": [
        "anonymization"
      ],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
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
      "object_refs": [
        "domain-name--...",
        "url--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": [
        "malicious-activity"
      ],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": [
        "threat-report"
      ],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "lang": "en",
      "external_references": [
        {
          "source_name": "source",
          "url": "http://example.onion"
        },
        {
          "source_name": "content-hash",
          "external_id": "<hash>"
        }
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```
### `GET /api/search/exploit/stix/{doc_id}`

- **Summary:** Get exploit media intelligence report in stix format
- **Operation ID:** `getExploitStixReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Return a **STIX 2.1 bundle** for a single document. This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing: - **TLP marking definitions** (AMBER and RED) - a primary **report** object - optional **infrastructure** describing the source/service (e.g., onion market/forum) - extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`) - an **observed-data** object refe...

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/exploit/stix/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
      "definition": {
        "tlp": "amber"
      }
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": [
        "anonymization"
      ],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
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
      "object_refs": [
        "domain-name--...",
        "url--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": [
        "malicious-activity"
      ],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": [
        "threat-report"
      ],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "lang": "en",
      "external_references": [
        {
          "source_name": "source",
          "url": "http://example.onion"
        },
        {
          "source_name": "content-hash",
          "external_id": "<hash>"
        }
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```
### `GET /api/search/social/stix/{doc_id}`

- **Summary:** Get social media intelligence report in stix format
- **Operation ID:** `getSocialStixReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Return a **STIX 2.1 bundle** for a single document. This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing: - **TLP marking definitions** (AMBER and RED) - a primary **report** object - optional **infrastructure** describing the source/service (e.g., onion market/forum) - extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`) - an **observed-data** object refe...

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/social/stix/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
      "definition": {
        "tlp": "amber"
      }
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": [
        "anonymization"
      ],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
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
      "object_refs": [
        "domain-name--...",
        "url--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": [
        "malicious-activity"
      ],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": [
        "threat-report"
      ],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "lang": "en",
      "external_references": [
        {
          "source_name": "source",
          "url": "http://example.onion"
        },
        {
          "source_name": "content-hash",
          "external_id": "<hash>"
        }
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```
### `GET /api/search/chat/stix/{doc_id}`

- **Summary:** Get chat intelligence report in stix format
- **Operation ID:** `getSocialStixReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Return a **STIX 2.1 bundle** for a single document. This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing: - **TLP marking definitions** (AMBER and RED) - a primary **report** object - optional **infrastructure** describing the source/service (e.g., onion market/forum) - extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`) - an **observed-data** object refe...

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/chat/stix/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
      "definition": {
        "tlp": "amber"
      }
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": [
        "anonymization"
      ],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
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
      "object_refs": [
        "domain-name--...",
        "url--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": [
        "malicious-activity"
      ],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": [
        "threat-report"
      ],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "lang": "en",
      "external_references": [
        {
          "source_name": "source",
          "url": "http://example.onion"
        },
        {
          "source_name": "content-hash",
          "external_id": "<hash>"
        }
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```
### `GET /api/search/news/stix/{doc_id}`

- **Summary:** Get news media intelligence report in stix format
- **Operation ID:** `getNewsStixReport`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Return a **STIX 2.1 bundle** for a single document. This endpoint converts an Orion document into a STIX 2.1 `bundle` (spec_version `2.1`) containing: - **TLP marking definitions** (AMBER and RED) - a primary **report** object - optional **infrastructure** describing the source/service (e.g., onion market/forum) - extracted **SCO observables** (e.g., `url`, `domain-name`, `ipv4-addr`, `ipv6-addr`, `email-addr`, `autonomous-system`, `directory`, `user-agent`) - an **observed-data** object refe...

**Parameters**

| Name   | In    | Required | Type   | Description                                          | Sample           |
|--------|-------|----------|--------|------------------------------------------------------|------------------|
| doc_id | path  | yes      | string |                                                      | `example-doc-id` |
| lang   | query | no       | string | Optional language code for localized report content. | `en`             |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/search/news/stix/example-doc-id" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
      "definition": {
        "tlp": "amber"
      }
    },
    {
      "type": "infrastructure",
      "spec_version": "2.1",
      "id": "infrastructure--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "infrastructure_types": [
        "anonymization"
      ],
      "first_seen": "2025-12-09T03:35:41.659Z",
      "last_seen": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
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
      "object_refs": [
        "domain-name--...",
        "url--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "Domains",
      "indicator_types": [
        "malicious-activity"
      ],
      "pattern_type": "stix",
      "pattern": "[domain-name:value IN ('example.onion')]",
      "valid_from": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ]
    },
    {
      "type": "report",
      "spec_version": "2.1",
      "id": "report--...",
      "created": "2025-12-09T03:35:41.659Z",
      "modified": "2025-12-09T03:35:41.659Z",
      "name": "fast card service - credit cards, transfers, gift",
      "description": "...",
      "report_types": [
        "threat-report"
      ],
      "published": "2025-12-09T03:35:41.659Z",
      "labels": [
        "leaks",
        "marketplaces",
        "onion",
        "orion:general"
      ],
      "lang": "en",
      "external_references": [
        {
          "source_name": "source",
          "url": "http://example.onion"
        },
        {
          "source_name": "content-hash",
          "external_id": "<hash>"
        }
      ],
      "object_refs": [
        "indicator--...",
        "infrastructure--...",
        "observed-data--..."
      ],
      "object_marking_refs": [
        "marking-definition--..."
      ],
      "x_orion_doc_id": "<hash>",
      "x_orion_network": "onion"
    }
  ]
}
```

## Support Method

### `POST /api/urlscan/subdomains`

- **Summary:** Returns the list of associated subdomains
- **Operation ID:** `scanSubdomains`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Scan a target domain using the configured scanning engine. The request is an HTTP POST and expects a following JSON schema: Fields: - **domain** — target domain or host to scan (e.g. `www.bbc.com`) - **checkLive** - check to get live subdomains

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/urlscan/subdomains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}'
```

Request content type: `application/json` `DomainScanRequest`.

```json
{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}
```

**Request Fields**

| Field     | Sample        |
|-----------|---------------|
| checkLive | `False`       |
| domain    | `www.bbc.com` |
| scanType  | `basic`       |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/urlscan/dns`

- **Summary:** Reverse DNS and ping check
- **Operation ID:** `scanDns`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Performs reverse DNS lookup and ping test to return hostname and connectivity status for a given IP The request is an HTTP POST and expects a following JSON schema: Fields: - **domain** — target domain or host to scan (e.g. `www.bbc.com`)

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/urlscan/dns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}'
```

Request content type: `application/json` `DomainScanRequest`.

```json
{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}
```

**Request Fields**

| Field     | Sample        |
|-----------|---------------|
| checkLive | `False`       |
| domain    | `www.bbc.com` |
| scanType  | `basic`       |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/urlscan/wayback`

- **Summary:** Fetches archived snapshots and timestamps
- **Operation ID:** `scanWaybackDomain`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Retrieves historical archived snapshots and timestamps of the provided domain from web archive sources The request is an HTTP POST and expects a following JSON schema: Fields: - **domain** — target domain or host to scan (e.g. `www.bbc.com`)

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/urlscan/wayback" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}'
```

Request content type: `application/json` `DomainScanRequest`.

```json
{
  "checkLive": false,
  "domain": "www.bbc.com",
  "scanType": "basic"
}
```

**Request Fields**

| Field     | Sample        |
|-----------|---------------|
| checkLive | `False`       |
| domain    | `www.bbc.com` |
| scanType  | `basic`       |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
### `POST /api/cross/search`

- **Summary:** Run Cross Search
- **Operation ID:** `dynamicCrossSearch`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Perform a dynamic Cross Search using a user-provided query string. The API submits the query to multiple search engines and returns raw results without UI rendering. Supported input: - **query**: search string (keywords, onion URLs, or identifiers) The API is designed for rapid investigative lookups and does not require rendering on the client.

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X POST "$BASE_URL/api/cross/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "text": {
    "query": "hacking"
  }
}'
```

Request content type: `application/json` `search_dynamic_onion_search`.

```json
{
  "text": {
    "query": "hacking"
  }
}
```

**Request Fields**

| Field | Sample                 |
|-------|------------------------|
| text  | `{"query": "hacking"}` |

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "job_id": "5486279598248634122",
  "status": "done",
  "result": {
    "status": "success",
    "query": "hacking",
    "results": [
      {
        "engine": "example_engine.onion",
        "status": "success",
        "search_url": "http://example_engine.onion/search?q=hacking",
        "first_result": {
          "url": "http://example_result.onion",
          "title": "Example Title",
          "description": "Example description..."
        }
      }
    ],
    "query_type": "search_text"
  }
}
```

## System Info

### `GET /api/directory`

- **Summary:** Get monitored source directory
- **Operation ID:** `getSystemDirectory`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Retrieve the complete list of monitored and crawled sources across Clearnet, Onion, and I2P. Supported filters: - **page:** page number of the result - **network:** all, onion, i2p, clearnet - **index:** all, general, leak, defacement, chat, exploit, twitter, reddit - **content_type:** all, general, forums, news, stolen, drugs, hacking, marketplaces, cryptocurrency, leaks, adult, tracking, chat, social - **daterange:** optional date range (e.g., `2025-12-03,2025-12-18`) Results include URL, d...

**Parameters**

| Name         | In    | Required | Type    | Description | Sample |
|--------------|-------|----------|---------|-------------|--------|
| page         | query | no       | integer |             | `1`    |
| content_type | query | no       | string  |             | `all`  |
| index        | query | no       | string  |             | `all`  |
| network      | query | no       | string  |             | `all`  |
| daterange    | query | no       | string  |             | ``     |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/directory?page=1&content_type=all&index=all&network=all&daterange=" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "total": 12345,
  "page": 1,
  "results": [
    {
      "url": "http://exampleonionforumabcdef.onion/",
      "content_type": [
        "forums",
        "hacking"
      ],
      "index_type": "general",
      "leak_model_last_update": "2025-12-05T10:15:00Z",
      "generic_model_last_update": "2025-12-04T09:00:00Z",
      "network_type": "onion",
      "name": "Example Darknet Forum"
    }
  ]
}
```
### `GET /api/insight`

- **Summary:** Get system insights
- **Operation ID:** `getSystemInsights`
- **Auth:** Bearer token required
- **Response status:** `200`

**Description**

Retrieve system-wide analytics and high-level intelligence metrics across all monitored data sources. This endpoint does not take any parameters and returns pre-aggregated insights computed by Orion. Returned analytics include (per data type such as general, leak, defacement): - Document volume and activity over time (`document_count`, `updated_5_days_ago`, `updated_9_days_ago`) - Freshness indicators (`most_recent`, `oldest_update`) - Enrichment density (`url_document_count`, `archive_docume...

**Parameters**

No path or query parameters.

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/insight" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

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
### `GET /api/insight/country`

- **Summary:** Get paginated country insights
- **Operation ID:** `getCountryInsights`
- **Auth:** Bearer token required
- **Response status:** `200`

**Parameters**

| Name     | In    | Required | Type    | Description | Sample     |
|----------|-------|----------|---------|-------------|------------|
| category | query | yes      | string  |             | `all`      |
| country  | query | yes      | string  |             | `pakistan` |
| page     | query | no       | integer |             | `1`        |
| limit    | query | no       | integer |             | `20`       |

**Request Sample**

```bash
curl -X GET "$BASE_URL/api/insight/country?category=all&country=pakistan&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

Request body: none.

**Response Sample `200`**

Response content type: `application/json`.

```json
{
  "status": "success",
  "result": {}
}
```
