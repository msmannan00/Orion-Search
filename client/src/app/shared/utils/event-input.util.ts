export function getInputValue(event: Event): string {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return '';
  }
  return target.value;
}
