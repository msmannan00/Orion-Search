export function resolveRequestedUrl(input: string): string {
  const v = decodeURIComponent(input || '').trim();
  if (!v) {
    return '';
  }
  try {
    const u = new URL((/^https?:\/\//i.exec(v)) ? v : `https://${v.replace(/^\/+/, '')}`);
    return u.toString();
  }
  catch {
    return `https://${v.replace(/^https?:\/\//i, '').replace(/^\/+/, '')}`;
  }
}
