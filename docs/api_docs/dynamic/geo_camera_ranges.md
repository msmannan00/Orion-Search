# Dynamic: geo_camera_ranges

## Description

Discover internet-exposed cameras across explicitly specified IP ranges without needing geographic coordinates. Accepts CIDR blocks, start–end IP ranges, or individual IPs — ideal when you already know the target network space.

The request is an HTTP POST and expects a JSON body matching the `GeoRangesRequest` schema:

```json
{
  "ip_ranges": ["119.152.0.0/13", "39.32.0.0/11"],
  "max_ips": 200,
  "parallel_scans": 50
}
```

Fields:
- **ip_ranges** — list of IP ranges to scan (required, at least one entry)
  - CIDR notation: `"119.152.0.0/13"`
  - Start–end range: `"39.32.0.0-39.63.255.255"`
  - Single IP: `"203.0.113.5"`
  - Multiple formats can be mixed in the same request
  - Large CIDRs are sampled intelligently to stay within `max_ips`

- **max_ips** — maximum total IPs to scan across all ranges (default: `200`, max: `2000`)
  - IPs are distributed proportionally across ranges
  - More IPs = higher chance of finding cameras but longer scan time
  - Recommended: `200-500` for targeted range scans

- **parallel_scans** — number of concurrent deep scans (default: `50`, max: `100`)
  - Higher = faster but more resource intensive
  - Recommended: `50` for optimal performance

Payload examples:

```json
{
  "ip_ranges": ["119.152.0.0/13"]
}
```

```json
{
  "ip_ranges": ["39.32.0.0/11", "103.4.0.0/14", "111.68.0.0/14"],
  "max_ips": 500
}
```

```json
{
  "ip_ranges": [
    "119.152.0.0/13",
    "10.0.0.1-10.0.0.255",
    "203.0.113.5"
  ],
  "max_ips": 1000,
  "parallel_scans": 100
}
```

## Workflow

The scan operates asynchronously with real-time progress tracking — identical polling pattern to `/geo/iot_detect`:

1. **Initial Request** — Submit IP ranges and parameters
   - Returns immediately with `{"status": "pending", "progress": 0, "step": "queued"}`

2. **Polling** — Send the same request body repeatedly to check progress
   - Returns updated progress: `{"status": "pending", "progress": 55, "step": "filtering_ports"}`
   - Progress ranges from 0% to 100%

3. **Completion** — Final request returns full results
   - Returns: `{"result": {"status": "success", "cameras_found": 6, ...}}`

**Scan Stages:**

- **0-10%** — Initializing scan
- **10-20%** — Expanding IP ranges into individual IPs (sampling large CIDRs)
- **20-25%** — Expansion complete: total IPs ready
- **25-50%** — Quick filtering: testing camera ports (80, 554, 8080, 8081, 8554, 8000, 8008, 8888, 81, 5000, 34567, 37777)
- **50-55%** — Filter complete: identified IPs with open camera ports
- **55-100%** — Deep scanning: analyzing surviving IPs for camera detection and brand identification

**Typical Duration:** 3-8 minutes for 200 IPs (faster than coordinate-based scan as IP extraction is instant)

## Response

### Polling Response (In Progress)

While scan is running, returns live progress information:

```json
{
  "status": "pending",
  "progress": 55,
  "step": "filtering_ports",
  "ips_extracted": 198,
  "ips_scanned": 12,
  "cameras_found": 1
}
```

Fields:
- **status** — `pending` (scanning) or `done` (complete)
- **progress** — completion percentage (0–100)
- **step** — current operation (e.g. `expanding_ranges`, `filtering_ports`, `deep_scanning`, `camera_found_119.153.107.83`)
- **ips_extracted** — total IPs expanded from all provided ranges
- **ips_scanned** — IPs with camera ports open (filtered subset being deep scanned)
- **cameras_found** — confirmed cameras detected so far

### Final Response (Complete)

When scan completes, returns full results under a top-level **result** field:

```json
{
  "result": {
    "status": "success",
    "query": {
      "ip_ranges": ["119.152.0.0/13", "39.32.0.0/11"]
    },
    "ips_extracted": 198,
    "ips_scanned": 14,
    "cameras_found": 6,
    "cameras": [
      {
        "ip": "119.153.107.83",
        "city": "Lahore",
        "country": "Pakistan",
        "latitude": 31.5826,
        "longitude": 74.3276,
        "open_ports": [80, 554],
        "brand": "Hikvision",
        "cameras": [
          {
            "is_camera": true,
            "brand": "Hikvision",
            "model_hint": null,
            "detection_method": "banner",
            "port": 80,
            "service": "http"
          },
          {
            "is_camera": true,
            "brand": null,
            "model_hint": "RTSP Stream",
            "detection_method": "banner",
            "port": 554,
            "service": "rtsp"
          }
        ],
        "ports": [80, 554]
      }
    ]
  }
}
```

Structure:
- **status** — `success` or `error`
- **query** — scan parameters used:
  - **ip_ranges** — the exact list of ranges submitted

- **ips_extracted** — total IPs sampled across all provided ranges
- **ips_scanned** — IPs with camera ports open (subset that was deep scanned)
- **cameras_found** — total number of confirmed cameras detected

- **cameras** — list of detected cameras, each containing:
  - **ip** — camera IP address
  - **city** — city name from GeoIP lookup (may be `"Unknown"` if GeoIP has no record)
  - **country** — country name from GeoIP lookup
  - **latitude** / **longitude** — geographic coordinates from GeoIP (omitted if unavailable)
  - **open_ports** — list of open camera-related ports
  - **brand** — detected camera brand (e.g. `Hikvision`, `Dahua`, `Axis`)
  - **cameras** — detailed camera information per port:
    - **is_camera** — confirmation boolean
    - **brand** — manufacturer (when detectable)
    - **model_hint** — model information or stream type
    - **detection_method** — how camera was identified (`banner`, `headers`, `content`)
    - **port** — specific port number
    - **service** — service type (`http`, `rtsp`, etc.)
  - **ports** — summary of all open ports

> **Note:** Unlike the coordinate-based endpoint, cameras are not sorted by `distance_km` since there is no target location. Results are returned in scan order.

### Error Response

If ranges are empty or expansion yields no valid IPs:

```json
{
  "result": {
    "status": "error",
    "message": "No valid IPs could be extracted from the provided ranges"
  }
}
```

### Empty Result

If IPs are extracted and scanned but no cameras detected:

```json
{
  "result": {
    "status": "success",
    "query": {
      "ip_ranges": ["119.152.0.0/13"]
    },
    "ips_extracted": 198,
    "ips_scanned": 3,
    "cameras_found": 0,
    "cameras": []
  }
}
```

## IP Range Formats

| Format    | Example                   | Notes                                     |
|-----------|---------------------------|-------------------------------------------|
| CIDR      | `119.152.0.0/13`          | Most efficient — large ranges are sampled |
| Start–End | `39.32.0.0-39.63.255.255` | Inclusive on both ends                    |
| Single IP | `203.0.113.5`             | Always included in full                   |
| Mixed     | All three in one request  | Fully supported                           |

**Sampling behaviour for large CIDRs:** A `/8` block contains 16 million IPs. The scanner samples them proportionally so the total across all ranges never exceeds `max_ips`. A `/24` (256 IPs) or smaller is always scanned in full if budget allows.

## Example Use Cases

**Scan a known ISP block for a city:**
```json
{
  "ip_ranges": ["119.152.0.0/13", "39.32.0.0/11"],
  "max_ips": 500
}
```
Directly targets Pakistani ISP ranges known to serve Lahore without needing coordinates.

**Audit a specific corporate subnet:**
```json
{
  "ip_ranges": ["203.0.113.0/24"],
  "max_ips": 256,
  "parallel_scans": 25
}
```
Full scan of a small /24 block — all 254 hosts checked.

**Multi-country range sweep:**
```json
{
  "ip_ranges": [
    "5.8.0.0/14",
    "31.12.0.0/14",
    "78.100.0.0/14"
  ],
  "max_ips": 1000,
  "parallel_scans": 100
}
```
Combines multiple UAE ISP CIDRs for broad regional coverage.

**Mixed format targeted scan:**
```json
{
  "ip_ranges": [
    "119.152.0.0/13",
    "103.4.100.0-103.4.100.255",
    "42.201.15.8"
  ],
  "max_ips": 300
}
```
Combines a large CIDR, a specific subnet range, and a single known IP.
