import { UnknownRecord } from '../../../../shared/utils/type-guards.util';

export interface FileScanResponse extends UnknownRecord {
  status?: string;
  progress?: number;
  step?: string;
  result?: unknown;
  error?: unknown;
  message?: unknown;
}

export interface ScannerResultItem { label: string; value: string }

export interface ScannerResultSection { title: string; items: ScannerResultItem[] }
