export type ScanJobStatus = 'queued' | 'running' | 'partial' | 'done' | 'error' | 'cancelled' | 'expired';

export interface ScanJobNotificationResponse {
  scan_id: string;
  title?: string;
  target?: string;
  status: ScanJobStatus;
  seen?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
  completed_at?: string | Date | null;
}

export interface ScanJobDetailResponse extends ScanJobNotificationResponse {
  api_reference?: string;
  payload: Record<string, unknown>;
  response: unknown;
}

export interface ScanJob extends ScanJobNotificationResponse {
  api_reference?: string;
  payload?: Record<string, unknown>;
  response?: unknown;
}

export interface ScanJobCreateResponse {
  scan_id: string;
  title: string;
  target: string;
  api_reference?: string;
  payload: Record<string, unknown>;
  status: ScanJobStatus;
  response?: unknown;
  seen?: boolean;
  source?: 'new' | 'existing_running' | 'previous_completed';
  created_at?: string | Date;
  updated_at?: string | Date;
  completed_at?: string | Date | null;
}

export interface ScanJobDuplicateChoiceResponse {
  requires_confirmation: true;
  message: string;
  source?: 'previous_completed';
  previous_scan: ScanJobNotificationResponse;
}

export type ScanJobCreateApiResponse = ScanJobCreateResponse | ScanJobDuplicateChoiceResponse;

export type DuplicateScanChoice = 'previous' | 'new' | 'cancel';

export interface DuplicateScanPrompt {
  message: string;
  previousScan: ScanJobNotificationResponse;
}

export interface ScanJobIncompleteResponse {
  scan_id: string;
  payload?: Record<string, unknown>;
}

export interface ScanJobListResponse<T = ScanJobNotificationResponse> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface ScanJobPollResponse {
  response?: unknown;
  seen?: boolean;
  updated_at?: string | Date;
  completed_at?: string | Date | null;
}

export interface ScanJobStartRequest {
  apiReference: string;
  payload: Record<string, unknown>;
  metadata?: {
    section?: string;
    title?: string;
    target?: string;
  };
  pollDelayMs?: number;
  forceNew?: boolean;
  reusePrevious?: boolean;
}
