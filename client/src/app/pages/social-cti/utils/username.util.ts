export function toUsername(raw: string): string {
  const value = (raw || '').trim();
  if (!/^https?:\/\//i.test(value)) {
    return value;
  }
  try {
    const segment = new URL(value).pathname.split('/').filter(Boolean).pop();
    return segment ?? value;
  }
  catch {
    return value;
  }
}
