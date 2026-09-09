export function formatFollowers(count?: number): string {
  if (count === undefined) {
    return 'N/A';
  }
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
export function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}
export function isUrl(value: unknown): boolean {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}
export function isImageUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return /\.(jpeg|jpg|gif|png|svg)(\?|$)/.test(value.toLowerCase());
}
