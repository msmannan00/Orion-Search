import type { social_profile, social_resource } from '../models/social.models';
import type { FetchTabKey } from '../enums/social-graph.enums';
import { CONTENT_DATE_KEYS } from '../constants/social-graph.constants';
import { isDecimalString } from '../../../shared/utils/network-validation.util';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';


export function getPlatformCardId(platformData: social_profile): string {
  return `platform-${platformData.meta.username}|${platformData.meta.platform}|${platformData.meta.username}`;
}

export function crawlKey(platformData: social_profile, type: FetchTabKey): string {
  return `${getPlatformCardId(platformData)}:${type}`;
}

export function isSamePlatform(left: social_profile, right: social_profile): boolean {
  return left.meta.username === right.meta.username
    && left.meta.platform.toLowerCase() === right.meta.platform.toLowerCase();
}

export function resourceKey(item: social_resource): string {
  return String(item?.resource_id ?? item?.url ?? JSON.stringify(item));
}

export function postUrlsOf(item: social_resource): string[] {
  const urls = [item?.parent_url ?? '', ...(item?.parent_urls ?? [])].map(url => String(url ?? '').trim().replace(/\/+$/, '')).filter(Boolean);
  return Array.from(new Set(urls));
}

export function contentTime(item: social_resource): number {
  const record = item as unknown as Record<string, unknown>;
  for (const key of CONTENT_DATE_KEYS) {
    const raw = getOwnProperty(record, key);
    if (raw === undefined || raw === null || raw === '') {
      continue;
    }
    const numericText = String(raw).trim();
    const numeric = typeof raw === 'number' ? raw : (isDecimalString(numericText) ? Number(numericText) : NaN);
    const value = Number.isFinite(numeric) ? (numeric > 1e12 ? numeric : numeric * 1000) : Date.parse(String(raw));
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

export function sortByContentDate(items: social_resource[]): social_resource[] {
  return items.map((item, index) => ({ item, index, time: contentTime(item) })).sort((left, right) => (right.time - left.time) || (left.index - right.index)).map(entry => entry.item);
}

export function mergeResourcesById(previous: social_resource[], incoming: social_resource[]): social_resource[] {
  const indexByKey = new Map(previous.map((item, index) => [resourceKey(item), index] as const));
  const merged = [...previous];
  for (const item of incoming) {
    const key = resourceKey(item);
    const index = indexByKey.get(key);
    if (index === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(item);
      continue;
    }
    const known = postUrlsOf(getOwnProperty(merged, index));
    const added = postUrlsOf(item).filter(url => !known.includes(url));
    if (added.length) {
      setOwnProperty(merged, index, { ...getOwnProperty(merged, index), parent_urls: [...known, ...added] });
    }
  }
  return merged;
}

export function getProfileGroupKey(results: Map<string, social_profile[]>, platform: social_profile): string {
  if (results.has(platform.meta.username)) {
    return platform.meta.username;
  }
  for (const [key, profiles] of results) {
    if (profiles.some(entry => isSamePlatform(entry, platform))) {
      return key;
    }
  }
  return platform.meta.username;
}
