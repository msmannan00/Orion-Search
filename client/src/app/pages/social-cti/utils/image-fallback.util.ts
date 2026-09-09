import { bootstrapIconRegistry } from '../../../shared/icons/bootstrap-icon-registry';

const FALLBACK_ICON = bootstrapIconRegistry['bi-image'];
const IMAGE_FALLBACK_SRC = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FALLBACK_ICON.viewBox}" fill="#94a3b8">${FALLBACK_ICON.markup}</svg>`);

export function applyImageFallback(event: Event): void {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) {
    return;
  }
  const current = image.getAttribute('src') ?? '';




  const ytId = /(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/([^/]+)\//.exec(current)?.[1];
  if (ytId && !image.dataset.ytHqTried && !/\/hqdefault\.jpg(?:$|\?)/.test(current)) {
    image.dataset.ytHqTried = '1';
    image.src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    return;
  }

  if (image.dataset.fallbackApplied) {
    return;
  }
  image.dataset.fallbackApplied = '1';
  image.src = IMAGE_FALLBACK_SRC;
  image.classList.remove('object-cover', 'max-h-[420px]');
  image.classList.add('object-contain', 'max-h-[72px]', 'p-[12px]', 'opacity-50');
}
