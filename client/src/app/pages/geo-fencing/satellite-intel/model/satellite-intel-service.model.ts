import { UnknownRecord } from '../../../../shared/utils/type-guards.util';

export interface SatelliteResponseRecord extends UnknownRecord {
  status?: string;
  result?: SatelliteResponseRecord;
  error_message?: string;
  message?: string;
  error?: unknown;
  statusText?: string;
}

export interface SatellitePollingOptions {
  trackState?: boolean;
}
