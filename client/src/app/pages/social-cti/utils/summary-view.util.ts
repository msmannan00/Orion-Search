import { social_profile } from '../models/social.models';
const HIDDEN_PROFILE_DETAIL_KEYS = new Set(['m_scrap_file', 'm_network', 'm_hash_id', 'm_hash', 'm_content_type', 'm_channel_url', 'm_weblink', 'm_date', 'm_sender_name', 'm_message_id', 'crawl_type', 'is_parsed', 'total_following']);

function hasProfileDetailValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  if (Array.isArray(value)) {
    return value.some(item => hasProfileDetailValue(item));
  }
  return true;
}

export function getProfileDetailEntries(platform: social_profile | null): {
    key: string;
    value: unknown;
}[] {
  if (!platform) {
    return [];
  }
  const details = platform.profile_details;
  if (!details) {
    return [];
  }
  return Object.entries(details)
    .filter(([key, value]) => !HIDDEN_PROFILE_DETAIL_KEYS.has(key.toLowerCase()) && hasProfileDetailValue(value))
    .map(([key, value]) => ({ key, value }));
}
export function getMetadataEntries(metadata: Record<string, unknown> | null | undefined): {
    key: string;
    value: unknown;
}[] {
  if (!metadata) {
    return [];
  }
  return Object.entries(metadata).map(([key, value]) => ({ key, value }));
}
