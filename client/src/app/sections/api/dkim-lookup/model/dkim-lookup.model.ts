export interface DkimCheck {
  test: string;
  status: string;
  response: string;
}

export interface DkimDmarc {
  published?: boolean;
  dns_query?: string;
  raw_record?: string | null;
  policy?: string | null;
  subdomain_policy?: string | null;
  pct?: string | null;
  rua?: string | null;
  ruf?: string | null;
  parsed?: Record<string, string>;
}

export interface DkimSpf {
  published?: boolean;
  raw_record?: string | null;
  dns_query?: string;
}

export interface DkimValidation {
  status?: string;
  domain?: string;
  selector?: string;
  dns_query?: string;
  source?: string | null;
  found?: boolean;
  is_valid?: boolean;
  key_type?: string | null;
  key_size_bits?: number | null;
  raw_record?: string;
  parsed_data?: Record<string, string>;
  first_seen?: string | null;
  last_seen?: string | null;
  warnings?: string[];
  checks?: DkimCheck[];
  dmarc?: DkimDmarc;
  spf?: DkimSpf;
  related?: DkimCheck[];
  error_message?: string;
}

export interface DkimSelectorDetail {
  selector: string;
  first_seen?: string | null;
  last_seen?: string | null;
  value?: string | null;
}

export interface DkimLookupResult extends DkimValidation {
  selectors?: string[];
  selectors_detail?: DkimSelectorDetail[];
}

export interface DkimLookupResponse {
  status?: string;
  progress?: number;
  step?: string;
  message?: string;
  error_message?: string;
  result?: DkimLookupResult;
}

export interface DkimDomainInfo {
  domain: string;
  dmarc: DkimDmarc | null;
  spf: DkimSpf | null;
  related: DkimCheck[];
}

export interface DkimSelectorEntry {
  selector: string;
  loading: boolean;
  progress: number;
  step: string;
  error: string;
  validation: DkimValidation | null;
}
