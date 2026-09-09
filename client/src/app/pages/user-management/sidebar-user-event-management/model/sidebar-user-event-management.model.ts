import { UnknownRecord } from '../../../../shared/utils/type-guards.util';

export interface SiemEventRecord extends UnknownRecord {
  raw?: unknown;
  event_type?: unknown;
  source?: unknown;
  host?: unknown;
  timestamp?: unknown;
  ingested_at?: unknown;
  severity?: unknown;
  tags?: unknown[];
  event_id?: unknown;
  user?: unknown;
  hash?: unknown;
}

export interface SiemSearchResponse {
  cards_data?: SiemEventRecord[];
  total_hits?: number;
  page_count?: number;
  batch_size?: number;
}
