export const REPORT_METADATA_HIDDEN_KEYS = new Set<string>([
  '_id',
  'id',
  'rank_index',
  'm_embedding',
  'm_title',
  'm_content',
  'm_important_content',
  'm_url',
  'm_source_url',
  'm_base_url',
  'm_hash',
  'm_hash_content',
  'm_hash_url',
  'm_validity_score',
  'm_crawl_status',
  'm_last_crawled_at',
  'm_creation_date',
  'm_update_date',
  'm_updation_date',
  'm_scrap_file',
  'm_scrape_file',
  'creation_date',
  'update_date',
  'updation_date',
  'created_at',
  'updated_at',
  'scrap_file',
  'scrape_file'
]);

export function isHiddenReportMetadataKey(key: string): boolean {
  return REPORT_METADATA_HIDDEN_KEYS.has(key);
}

function getDiffInDays(dateString?: string): number | null {
  if (!dateString) {
    return null;
  }

  const createdDate = new Date(dateString);
  const today = new Date();

  return Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function isWithinDays(dateString = '', days: number): boolean {
  const diffInDays = getDiffInDays(dateString);

  if (diffInDays === null) {
    return false;
  }

  return diffInDays <= days;
}

export function getStatusText(dateString?: string): 'Active' | 'Idle' | 'Inactive' {
  const diffInDays = getDiffInDays(dateString);

  if (diffInDays === null) {
    return 'Inactive';
  }

  if (diffInDays <= 5) {
    return 'Active';
  }
  if (diffInDays <= 10) {
    return 'Idle';
  }
  return 'Inactive';
}

export function getStatusFlag(dateString?: string): boolean {
  const diffInDays = getDiffInDays(dateString);

  if (diffInDays === null) {
    return false;
  }

  return diffInDays <= 10;
}

export function formatKeyLabel(key: string): string {
  const cleaned = key.replace(/^m_/, '').replace(/[^a-zA-Z0-9]/g, ' ');
  return cleaned.length < 4
    ? cleaned.toUpperCase()
    : cleaned.toLowerCase().replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
}

export function isLikelyUrl(value: string): boolean {
  const v = value.trim();
  return /^(https?:\/\/|www\.)/i.test(v) || /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/i.test(v);
}

export function formatTitleUrl(url?: string | null, fallback = ''): string {
  if (!url) {
    return fallback;
  }
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./i, '') || fallback;
  }
  catch {
    return url
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0] || fallback;
  }
}

export function getDisplayTitle(rawTitle?: string | null, fallbackUrl?: string | null, emptyFallback = '-'): string {
  const title = (rawTitle ?? '').trim();
  if (title) {
    return isLikelyUrl(title) ? formatTitleUrl(title, '') : title;
  }
  const cleanUrl = formatTitleUrl(fallbackUrl ?? '', '');
  return cleanUrl || emptyFallback;
}

export function normalizeDisplayUrl(url?: string | null, fallback = '-'): string {
  if (!url) {
    return fallback;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./i, '');
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${host}${path}` || host || fallback;
  }
  catch {
    return trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '') || fallback;
  }
}
