import { formatFollowers } from '../../../shared/utils/formatters';
import type { resource_entry, resource_time } from './model/resource-view.model';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';

export type { resource_entry, resource_time } from './model/resource-view.model';


export type resource_record = Record<string, unknown>;





export function asRecord(item: unknown): resource_record {
  return (item && typeof item === 'object' ? item : {}) as resource_record;
}

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return true;
}

export function pickText(record: resource_record, ...keys: string[]): string {
  for (const key of keys) {
    const value = getOwnProperty(record, key);
    if (hasValue(value) && typeof value !== 'object') {
      return String(value).trim();
    }
  }
  return '';
}

export function pickFlag(record: resource_record, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = getOwnProperty(record, key);
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
  }
  return false;
}

export function pickList(record: resource_record, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = getOwnProperty(record, key);
    if (Array.isArray(value) && value.length) {
      return value.map(entry => typeof entry === 'object' && entry !== null ? pickText(asRecord(entry), 'url', 'name', 'text', 'tag') : String(entry)).filter(Boolean);
    }
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(entry => entry.trim()).filter(Boolean);
    }
  }
  return [];
}

export function pickCount(record: resource_record, ...keys: string[]): string {
  const raw = pickText(record, ...keys).replace(/,/g, '');
  if (!raw) {
    return '';
  }
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return numeric === 0 ? '0' : formatFollowers(numeric);
  }
  return raw;
}

export function pickTime(record: resource_record, ...keys: string[]): resource_time {
  const raw = pickText(record, ...keys);
  if (!raw) {
    return { date: null, raw: '' };
  }
  const numeric = Number(raw);
  const parsed = Number.isFinite(numeric) && raw.length >= 10 ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(raw.replace(' UTC', 'Z').replace(' ', 'T'));
  return { date: Number.isNaN(parsed.getTime()) ? null : parsed, raw };
}

export function formatBytes(value: string | number, unit: 'b' | 'kb' = 'b'): string {
  const numeric = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }
  let size = unit === 'kb' ? numeric * 1024 : numeric;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${getOwnProperty(units, index)}`;
}

export function formatKeyLabel(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

export function leftoverEntries(record: resource_record, claimed: Set<string>): resource_entry[] {
  return Object.entries(record)
    .filter(([key, value]) => !claimed.has(key) && hasValue(value))
    .map(([key, value]) => ({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) }));
}

export function toggleKey(current: Set<string>, key: string): Set<string> {
  const next = new Set(current);
  if (next.has(key)) {
    next.delete(key);
  }
  else {
    next.add(key);
  }
  return next;
}

export function initialOf(label: string): string {
  return ((/\p{L}|\p{N}/u.exec(label))?.[0] ?? '?').toLocaleUpperCase();
}
