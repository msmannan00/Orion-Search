# Search: stealerlogs

## Description

Search stealer log credentials and log files using a flexible IOC-based query system, along with optional date range filtering. The search supports multiple field-based filters (such as domain, email, username, IP, etc.) and logical operators (&&, ||) to build complex queries.

Request body (`search_credential_param_model`):
- **daterange** — optional creation date range in `YYYY-MM-DD,YYYY-MM-DD` format; empty string means no filter
- **ioc** — main search query string using field-based syntax
  - General search across all fields:
    - "m_search_all:<value>"
  - Field-specific search examples:
    - "username:jon"
    - "m_domain:jon.com"
    - "m_email:jon@gmail.com"
    - "ip:1.1.1.1"
    - "file_name:log.txt"
    - "channel:telegram"
    - "credit_card:xxxx"
  - Logical operators supported:
    - AND (&&)
    - OR (||)
  - Example queries:
    - "ioc": "m_domain:jon.com && m_email:jon@gmail.com"
    - "ioc": "m_domain:jon.com && m_email:jon@gmail.com || m_domain:jon2.com"
- **daterange** — optional filter to restrict results based on date
  - Format: "YYYY-MM-DD,YYYY-MM-DD"
  - Returns records whose date falls within the given range
  - Example: "daterange": "2026-04-09,2026-04-17"



Minimal example request for a credential (stealer log) search:
```json
{
  "ioc": "m_search_all:jon",
  "daterange": ""
}
```

Example with Filters
```json
{
  "ioc": "m_domain:jon.com && m_email:jon@gmail.com",
  "daterange": "2026-04-09,2026-04-17"
}
```


## Response

Stealer logs search results containing a list of matching records based on the IOC query and optional date filter.

The response is a JSON object with:
- **Result** — list of matching records from the stealer logs index
- **Suggestions** — optional list of suggestion strings (for example corrected queries); may be empty
- **Page_Count** — number of pages available for the given query and filters (may be fractional depending on the backend calculation)

Each entry in **Result** for `type = "c"` (credential mode) typically contains:
- **type** — record type (e.g., "combo", "c", etc.)
- **raw** — original raw line from the log
- **channel** — source channel (e.g., Telegram group, collection source)
- **file** — optional file identifier (may be null)
- **file_name** — full file path or file source name
- **date** — record date (YYYY-MM-DD)
- **email** — list of extracted email addresses
- **password** — extracted password (if available)
- **username** — list of extracted usernames
- **hash** — unique hash identifier of the record
- **m_index** — internal index used (e.g., "stealer_model")
- **m_sub_host** — extracted sub-host or path

When `type` is not `"c"`, records may represent higher-level log or file objects (for example leaked CSV or other file-based dumps) and can include additional file-related metadata fields depending on the source.

Example response:
```json
{
  "Result": [
    {
      "type": "combo",
      "raw": "abc@abc.com:Blades52",
      "channel": "°-| [D3V1LZoNe] Commiunity |-°",
      "file": null,
      "file_name": "/home/morgan-freeman/Workspace/Orion/Orion-Crawler/app/crawler/crawler_instance/genbot_service/telegram_parser/core/dump/result_22-01-2026_19-30-11.txt",
      "date": "2026-01-24",
      "email": [
        "abc@abc.com"
      ],
      "password": "abcdef123",
      "username": [
        "abc"
      ],
      "hash": "e257c2aa4c1e6d7194b967c7ff10cdc0e617a0ed777c09639560ee63d95e32ef",
      "m_index": "stealer_model",
      "m_sub_host": "/"
    }
  ],
  "Suggestions": [],
  "Page_Count": 0.2
}
```
