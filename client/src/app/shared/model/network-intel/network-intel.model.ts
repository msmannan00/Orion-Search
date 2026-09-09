export type NetworkIntelTab = 'dns' | 'shodan' | 'vuln' | 'geo' | 'seo' | 'repo';

export interface IpPortTls {
  version?:              string;
  cipher?:               string;
  bits?:                 number;
  cert_cn?:              string;
  cert_expires?:         string;
  subject?:              Record<string, unknown>;
  issuer?:               Record<string, unknown>;
  san?:                  unknown[];
  fingerprint_sha256?:   string;
  is_self_signed?:       boolean;
  not_before?:           string;
  not_after?:            string;
  serial_number?:        string;
  signature_algorithm?:  string;
  public_key_algorithm?: string;
  public_key_size?:      number;
  key_usage?:            string[];
  extended_key_usage?:   string[];
  weak_protocols?:       string[];
  supported_versions?:   string[];
  risk_flags?:           string[];
  ciphers_by_version?:   Record<string, string[]>;
  certificate_policies?: string[];
  ca_issuers?:           string[];
  crl_distribution_points?: string[];
  scts?:                 unknown[];
  subject_key_identifier?: string;
  authority_key_identifier?: string;
  is_ca?:                boolean;
  [key: string]: unknown;
}

export interface IpPortData {
  port:                number;
  protocol?:           string;
  proto?:              string;
  service?:            string;
  banner?:             string;
  http?:               { title?: string; server?: string; [k: string]: unknown } | null;
  tls?:                IpPortTls | null;
  state?:              string;
  risk_flags?:         string[];
  misconfigurations?:  string[];
  is_camera?:          boolean;
  is_iot?:             boolean;
  device_type?:        string;
  device_category?:    string;
  device_vendor?:      string;
  device_family?:      string;
  device_model?:       string;
  device_version?:     string;
  device_tags?:        string[];
  device_confidence?:  number;
  fingerprint_source?: string;
  fingerprint_match?: string;
  protocol_verified?: boolean;
  cpe?:                string;
  product?:            string;
  version?:            string;
  vendor?:             string;
  discovered_paths?:   string[];
  [key: string]: unknown;
}

export interface CameraInfo {
  ip:               string;
  latitude?:        number;
  longitude?:       number;
  port?:            number;
  service?:         string;
  brand?:           string;
  model?:           string;
  model_hint?:      string | null;
  distance_km?:     number;
  country?:         string;
  city?:            string;
  url?:             string;
  stream_url?:      string;
  camera_path?:     string;
  camera_paths?:    string[];
  cameras?:         {
    port?: number;
    service?: string;
    brand?: string;
    model_hint?: string | null;
    camera_path?: string;
    path_status?: number;
    is_camera?: boolean;
    [key: string]: unknown;
  }[];
  ports?:           (number | IpPortData)[];
  vulnerabilities?: string[];
}

export interface DnsResult {
  domain: string;
  ips:    string[];
}

export interface IpDetail {
  ip:                 string;
  status?:            string | null;
  ip_info?:           Record<string, unknown> | null;
  hostnames?:         string[];
  country?:           string | null;
  city?:              string | null;
  organization?:      string | null;
  isp?:               string | null;
  asn?:               string | null;
  cloud_provider?:    string | null;
  cloud_region?:      string | null;
  cloud_service?:     string | null;
  hosting_type?:      string | null;
  web_technologies?:  string[];
  vulnerabilities?:   string[];
  misconfigurations?: string[];
  security?:          string[] | Record<string, boolean>;
  cdn?:               string | null;
  waf?:               string | null;
  paas?:              string | null;
  amazon_s3?:         boolean;
  load_balancer?:     string | null;
  hsts?:              boolean;
  web_server?:        string | null;
  favicon_hash?:      string | null;
  allowed_methods?:   string[];
  cookies?:           string[];
  title?:             string | null;
  http_headers?:      Record<string, string | null>;
  cache_headers?:     Record<string, string | null>;
  link_headers?:      string[];
  camera_paths?:      string[];
  cameras?:           CameraInfo[];
  is_camera?:         boolean;
  ports?:             IpPortData[];
  open_ports?:        number[];
  [key: string]:      unknown;
}

export interface IpRowState {
  ip:       string;
  expanded: boolean;
  loading:  boolean;
  progress?: number;
  step?:    string | null;
  startedAtMs?: number;
  detail:   IpDetail | null;
  error:    string | null;
}

export interface GeoQueryInfo {
  latitude:  number;
  longitude: number;
  radius_km: number;
  country:   string;
}

export interface GeoResult {
  status:        string;
  query:         GeoQueryInfo;
  ips_extracted: number;
  ips_scanned:   number;
  cameras_found: number;
  cameras:       CameraInfo[];
}

export interface GeoLiveStats {
  ips_extracted: number;
  ips_scanned:   number;
  cameras_found: number;
}

export type VulnerabilityScanDepth = 'low' | 'medium' | 'high' | 'full';

export interface VulnerabilityTargetSelection {
  target: string;
  depth: VulnerabilityScanDepth;
}

export interface VulnerabilitySummary {
  total?: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  informational?: number;
}

export interface VulnerabilityExtractedData {
  host?: string;
  url?: string;
  status_code?: number;
  server?: string;
  content_type?: string;
  content_length?: number;
  redirect_location?: string;
  title?: string;
  security_headers?: Record<string, unknown>;
  interesting_headers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VulnerabilityFinding {
  title?: string;
  header?: string;
  category?: string;
  risk?: string;
  confidence?: string;
  description?: string;
  url?: string;
  source?: string;
  evidence?: string;
  cve?: string;
  cvss?: string | number;
  urls?: string[];
  references?: { url?: string; [key: string]: unknown }[];
  url_count?: number;
  [key: string]: unknown;
}

export interface UrlVulnerabilityScanResult {
  status?: string;
  step?: string;
  progress?: number;
  scan_created_at?: string | number | Date;
  host?: string;
  url?: string;
  final_url?: string;
  request_mode?: string;
  elapsed_seconds?: number;
  max_minutes?: number;
  summary?: VulnerabilitySummary;
  extracted?: VulnerabilityExtractedData;
  scanned_urls?: string[];
  findings?: VulnerabilityFinding[];
  top_findings?: VulnerabilityFinding[];
}


export interface ScanTaskResponse extends UrlVulnerabilityScanResult {
  result?: ScanTaskResponse | null;
  message?: string;
  error?: string;
  domain?: string;
  ips?: string[];
  ip?: string;
  count?: number;
  subdomains?: string[];
  live_subdomains?: string[];
  cameras?: CameraInfo[];
  cameras_found?: number;
  ips_extracted?: number;
  ips_scanned?: number;
  query?: GeoQueryInfo;
  snapshots?: import('../scanners/scanner.models').WaybackSnapshot[];
  hostname?: string;
  domains?: string[];
}

export interface ScanTaskError {
  message: string;
}
