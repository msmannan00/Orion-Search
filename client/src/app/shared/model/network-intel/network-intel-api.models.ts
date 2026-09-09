import type { CameraInfo, GeoQueryInfo } from './network-intel.model';

export interface ResolveIpResponse {
  status?:   string;
  progress?: number;
  result?: {
    status?: string;
    domain:  string;
    ips:     string[];
  };

  domain?: string;
  ips?:    string[];
}

export interface NetworkIntelScanResponse {
  status?:   string;
  progress?: number;
  result?: {
    status?: string;
    ip:      string;
    [key: string]: unknown;
  };
  ip?: string;
  [key: string]: unknown;
}

export interface GeoCameraResponse {
  status?:        string;
  progress?:      number;
  step?:          string;
  ips_extracted?: number;
  ips_scanned?:   number;
  cameras_found?: number;
  ip_locations?:  Record<string, unknown>[];
  result?: {
    status?:        string;
    progress?:      number;
    step?:          string;
    cameras?:       CameraInfo[];
    ip_locations?:  Record<string, unknown>[];
    ips_extracted?: number;
    ips_scanned?:   number;
    cameras_found?: number;
    query?:         GeoQueryInfo;
  };
  cameras?: CameraInfo[];
  query?:   GeoQueryInfo;
}
