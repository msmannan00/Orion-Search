export interface SubdomainResponse {
    progress?: number;
    result?: {
        status?: string;
        subdomains?: string[];
        live_subdomains?: string[];
        count?: number;
        live_count?: number;
        message?: string;
    };
    status?: string;
    subdomains?: string[];
    live_subdomains?: string[];
    count?: number;
    live_count?: number;
    message?: string;
}
export interface DnsRecord {
    ip: string;
    hostname: string;
    domains?: string[];
    error?: string;
}
export interface DnsResponse {
    status: 'idle' | 'pending' | 'busy' | 'done' | 'error';
    progress?: number;
    step?: string;
    result?: DnsRecord;
    error?: string;
}
export interface WaybackSnapshot {
    timestamp: string;
    url: string;
    statuscode: string;
    mimetype?: string;
}
export interface WaybackResponse {
    progress?: number;
    result?: {
        status?: string;
        snapshots?: WaybackSnapshot[];
        count?: number;
        message?: string;
    };
    status?: string;
    snapshots?: WaybackSnapshot[];
    count?: number;
    message?: string;
}
