# Dynamic: geo_iot_detect

## Description

Discover internet-exposed cameras near specified geographic coordinates using GeoIP database and intelligent port scanning.

The request is an HTTP POST and expects a JSON body matching the `GeoCameraRequest` schema:

```json
{
  "coordinates": "31.4829403,74.3343893",
  "radius_km": 20,
  "max_ips": 500,
  "parallel_scans": 50
}
```

Fields:
- **coordinates** — geographic location in `lat,lon` format (e.g. `31.4829403,74.3343893`)
  - Latitude: -90 to 90
  - Longitude: -180 to 180
  - Works worldwide (18+ countries supported)
  - Country is auto-detected from coordinates
  
- **radius_km** — search radius in kilometers (default: `20`, max: `100`)
  - Recommended: `20-30` for city coverage
  - Larger radius = more IPs extracted but longer scan time
  
- **max_ips** — maximum IPs to extract from GeoLite2 database (default: `500`, max: `2000`)
  - More IPs = higher chance of finding cameras
  - Recommended: `500-1000` for balanced results
  
- **parallel_scans** — number of concurrent scans (default: `50`, max: `100`)
  - Higher = faster but more resource intensive
  - Recommended: `50` for optimal performance

Payload examples:

```json
{
  "coordinates": "31.4829403,74.3343893",
  "radius_km": 20
}
```

```json
{
  "coordinates": "40.7128,-74.0060",
  "radius_km": 30,
  "max_ips": 1000,
  "parallel_scans": 50
}
```

```json
{
  "coordinates": "51.5074,-0.1278",
  "radius_km": 50,
  "max_ips": 2000,
  "parallel_scans": 100
}
```

## Workflow

The scan operates asynchronously with real-time progress tracking:

1. **Initial Request** — Submit coordinates and parameters
   - Returns immediately with `{"status": "pending", "progress": 0, "step": "queued"}`
   
2. **Polling** — Send the same request repeatedly to check progress
   - Returns updated progress: `{"status": "pending", "progress": 65, "step": "deep_scanning"}`
   - Progress ranges from 0% to 100%
   
3. **Completion** — Final request returns full results
   - Returns: `{"result": {"status": "success", "cameras_found": 8, ...}}`

**Scan Stages:**
- **0-20%** — Initializing and preparing scan
- **20-50%** — Extracting IPs from GeoLite2 database near coordinates
- **50-60%** — Quick filtering: testing camera ports (80, 554, 8080, etc.)
- **60-65%** — Filter complete: identified IPs with camera ports
- **65-100%** — Deep scanning: analyzing IPs for camera detection and brand identification

**Typical Duration:** 5-10 minutes for 500 IPs

## Response

### Polling Response (In Progress)

While scan is running, returns progress information:

```json
{
  "status": "pending",
  "progress": 65,
  "step": "deep_scanning",
  "ips_extracted": 523,
  "ips_scanned": 42,
  "cameras_found": 3
}
```

Fields:
- **status** — `pending` (scanning) or `done` (complete)
- **progress** — completion percentage (0-100)
- **step** — current operation (e.g. `extracting_from_111.68.0.0/14`, `filtering_ports`, `deep_scanning`)
- **ips_extracted** — total IPs found near coordinates in GeoLite2 database
- **ips_scanned** — IPs with camera ports open (filtered subset)
- **cameras_found** — confirmed cameras detected so far

### Final Response (Complete)

When scan completes, returns full results under a top-level **result** field:

```json
{
  "result": {
    "status": "success",
    "query": {
      "latitude": 31.4829403,
      "longitude": 74.3343893,
      "radius_km": 20,
      "country": "PK"
    },
    "ips_extracted": 523,
    "ips_scanned": 42,
    "cameras_found": 8,
    "cameras": [
      {
        "ip": "119.153.107.83",
        "latitude": 31.5826,
        "longitude": 74.3276,
        "city": "Lahore",
        "country": "Pakistan",
        "distance_km": 11.1,
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
  - **latitude** — target latitude
  - **longitude** — target longitude
  - **radius_km** — search radius used
  - **country** — auto-detected country code (e.g. `PK`, `US`, `GB`)
  
- **ips_extracted** — total IPs sampled from GeoLite2 database within radius
- **ips_scanned** — IPs with camera ports open (subset that was deep scanned)
- **cameras_found** — total number of confirmed cameras detected

- **cameras** — list of detected cameras, each containing:
  - **ip** — camera IP address
  - **latitude** — camera geographic latitude
  - **longitude** — camera geographic longitude
  - **city** — city name from GeoIP database
  - **country** — country name from GeoIP database
  - **distance_km** — distance from target coordinates in kilometers
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

Cameras are sorted by **distance_km** (nearest first).

### Error Response

If no IPs are found or scan fails:

```json
{
  "result": {
    "status": "error",
    "message": "No IPs found in area"
  }
}
```

### Empty Result

If IPs are extracted but no cameras detected:

```json
{
  "result": {
    "status": "success",
    "query": {
      "latitude": 31.4829403,
      "longitude": 74.3343893,
      "radius_km": 20,
      "country": "PK"
    },
    "ips_extracted": 141,
    "ips_scanned": 3,
    "cameras_found": 0,
    "cameras": []
  }
}
```

## Performance Expectations

**Camera Detection Rate:**
- Approximately 1-3% of IPs have exposed camera ports
- Typical results: 5-15 cameras per 500 IPs scanned
- Urban areas generally yield more results than rural areas

**Scan Duration by Configuration:**

| max_ips | radius_km | Expected Duration | Typical Cameras Found |
|---------|-----------|-------------------|-----------------------|
| 500     | 20        | 5-8 minutes       | 3-8                   |
| 1000    | 30        | 8-12 minutes      | 5-15                  |
| 2000    | 50        | 12-18 minutes     | 10-25                 |

**Factors Affecting Results:**
- **Location density** — urban areas have more IPs per square kilometer
- **Network topology** — some regions have more public-facing IPs than others
- **Port exposure** — NAT/firewall configurations vary by region
- **GeoIP accuracy** — database typically accurate to 10-50km at city level

## Supported Regions

Worldwide support with optimized IP ranges for 18 countries:

🇵🇰 Pakistan • 🇺🇸 United States • 🇬🇧 United Kingdom • 🇦🇪 UAE • 🇮🇳 India • 🇨🇳 China • 🇧🇷 Brazil • 🇦🇺 Australia • 🇨🇦 Canada • 🇩🇪 Germany • 🇫🇷 France • 🇯🇵 Japan • 🇰🇷 South Korea • 🇲🇽 Mexico • 🇷🇺 Russia • 🇸🇦 Saudi Arabia • 🇹🇷 Turkey • 🇿🇦 South Africa

Country is automatically detected from coordinates — no manual selection required.

## Example Use Cases

**Urban Security Assessment:**
```json
{
  "coordinates": "31.5204,74.3587",
  "radius_km": 25,
  "max_ips": 1000
}
```
Scans major city (Lahore) for exposed cameras across ~25km radius.

**Targeted Neighborhood Scan:**
```json
{
  "coordinates": "40.7589,-73.9851",
  "radius_km": 5,
  "max_ips": 300
}
```
Focused scan of specific neighborhood (Times Square area) with smaller radius.

**Wide Area Reconnaissance:**
```json
{
  "coordinates": "51.5074,-0.1278",
  "radius_km": 50,
  "max_ips": 2000,
  "parallel_scans": 100
}
```
Comprehensive scan of metropolitan area (Greater London) for maximum coverage.
