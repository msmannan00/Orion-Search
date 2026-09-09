const PDF_ASCII_REPLACEMENTS: readonly [RegExp, string][] = [
  [/\u00a0/g, ' '],
  [/[\u200b-\u200d\u2060\ufeff]/g, ''],
  [/[\u2018\u2019\u201a\u201b]/g, '\''],
  [/[\u201c\u201d\u201e\u201f]/g, '"'],
  [/[\u2010-\u2015\u2212]/g, '-'],
  [/\u2026/g, '...'],
  [/[\u2022\u2023\u2043\u00b7\u25cf]/g, '-'],
  [/\u2192/g, '->'],
  [/\u2190/g, '<-'],
  [/\u00d7/g, 'x']
];

export function normalizePdfText(value: unknown): string {
  let text = String(value ?? '').replace(/\r\n?/g, '\n');
  PDF_ASCII_REPLACEMENTS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  text = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\t\n\x20-\x7e]/g, '?')
    .replace(/\t/g, '  ')
    .replace(/[ \f\v]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function preparePdfValue(value: unknown, maxTokenLength = 42): string {
  const text = normalizePdfText(value);
  if (!text || /^data:image\//i.test(text)) {
    return text;
  }
  return text
    .split(/(\s+)/)
    .map(part => /\s+/.test(part) ? part : breakLongToken(part, maxTokenLength))
    .join('');
}

function breakLongToken(token: string, maxLength: number): string {
  if (token.length <= maxLength) {
    return token;
  }

  const chunks: string[] = [];
  let remaining = token;
  while (remaining.length > maxLength) {
    let splitAt = findPreferredSplit(remaining, maxLength);
    if (splitAt < Math.floor(maxLength * 0.62)) {
      splitAt = maxLength;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks.join('\n');
}

function findPreferredSplit(value: string, maxLength: number): number {
  const candidates = ['/', '?', '&', '=', '#', '.', '-', '_', ':'];
  let best = -1;
  candidates.forEach(character => {
    const index = value.lastIndexOf(character, maxLength - 1);
    if (index >= 0) {
      best = Math.max(best, index + 1);
    }
  });
  return best;
}
