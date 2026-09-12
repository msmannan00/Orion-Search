export function getComposerLineCount(textarea: HTMLTextAreaElement): number {
  const horizontalPadding = 24;
  const averageCharWidth = 7;
  const availableWidth = Math.max(averageCharWidth, textarea.clientWidth - horizontalPadding);
  const charsPerLine = Math.max(1, Math.floor(availableWidth / averageCharWidth));
  const lines = (textarea.value || '').split('\n');

  return Math.max(1, lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0));
}

export function countMessageTokens(value: string): number {
  return value.trim().match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g)?.length ?? 0;
}
