import { ScrollService } from '../services/scroll.service';

export function scrollReportElementToTop(scrollService: ScrollService, element: HTMLElement): void {
  scrollService.scrollReportToTop();
  element.scrollIntoView({ block: 'start', behavior: 'auto' });
}
