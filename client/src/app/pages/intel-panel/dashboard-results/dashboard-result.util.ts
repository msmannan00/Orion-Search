export function scrollToResultCard(host: HTMLElement, index: number): void {
  if (index < 0) {
    return;
  }
  setTimeout(() => {
    host
      .querySelector<HTMLElement>(`[data-result-index="${index}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}
