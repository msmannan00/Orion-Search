import { UnknownRecord } from '../../utils/type-guards.util';

export interface ScanResponseRecord extends UnknownRecord {
  scan_id?: unknown;
  scan_title?: string;
  scan_target?: string;
  scan_status?: string;
  scan_seen?: boolean;
  scan_created_at?: string | Date;
  scan_updated_at?: string | Date;
  scan_completed_at?: string | Date | null;
  status?: string;
  progress?: number;
  step?: string;
  result?: ScanResponseRecord;
  data?: ScanResponseRecord;
  message?: unknown;
  detail?: unknown;
  error?: unknown;
  meta?: unknown;
}
