export function countFilterValues(source: Record<string, unknown> | readonly unknown[] | null | undefined): number {
  if (!source) {
    return 0;
  }
  return Object.values(source).reduce<number>((count, value) => {
    if (Array.isArray(value)) {
      return count + value.length;
    }
    return count + 1;
  }, 0);
}
