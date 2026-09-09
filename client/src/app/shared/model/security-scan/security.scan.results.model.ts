export interface UrlScanMeta {
    URL: string;
    Host: string;
    Port: string;
    Scanned_on_date: string;
    Scanned_by: string;
}
export type RiskLevel = string;
export interface UrlScanThreatItem {
    header: string;
    description: string;
    confidence: RiskLevel;
    risk: RiskLevel;
    proof?: string;
}
export interface UrlScanProofItem {
    header: string;
    proof: string;
    confidence: RiskLevel;
    risk: RiskLevel;
}

export interface UrlScanGradeCounts {
    high: number;
    medium: number;
    low: number;
    informational: number;
}

export interface UrlScanResult {
    status?: string;
    progress?: number;
    step?: string;
    meta?: UrlScanMeta;
    grade?: string;
    grade_counts?: UrlScanGradeCounts;
    threats?: Record<string, UrlScanThreatItem[]>;
    proofs?: Record<string, UrlScanProofItem[]>;
}

export interface UrlScanResponse {
    status?: string;
    progress?: number;
    step?: string;
    result?: UrlScanResult;
}
