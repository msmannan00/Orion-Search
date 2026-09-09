export function buildExportFileStem(title: string | null | undefined, generatedAt: string | null | undefined, fallback = 'intelligence-report'): string {
  const titleSlug = slugifyFilenamePart(title) || slugifyFilenamePart(fallback) || 'intelligence-report';
  const parsedDate = new Date(generatedAt ?? Date.now());
  const date = Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsedDate.toISOString().slice(0, 10);
  return `${titleSlug}-${date}`;
}

function slugifyFilenamePart(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
