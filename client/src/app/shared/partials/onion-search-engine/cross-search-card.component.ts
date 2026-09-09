import { Component, ElementRef, Input, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, of, timer } from 'rxjs';
import { catchError, expand, finalize, switchMap, takeWhile } from 'rxjs/operators';
import { ProxyController } from '../../services/proxy-controller';
import { CrossSearchEntry, CrossSearchResponse } from './model/cross-search.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-cross-search-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './cross-search-card.component.html',
})
export class CrossSearchCardComponent {
  private readonly proxied_resource = inject(ProxyController);

  isExpandable = false;
  isLoading = false;
  progress = 0;
  currentStep = '';
  hasError = false;
  canScrollLeft = false;
  canScrollRight = false;
  engines: CrossSearchEntry[] = [];
  @ViewChild('scrollRow') scrollRow?: ElementRef<HTMLDivElement>;

  @Input() query = '';
  @Input() consolidated = false;

  constructor(private http: HttpClient) {}

  toggleResultsBarCollapse(): void {
    this.isExpandable = !this.isExpandable;


    if (this.isExpandable && !this.isLoading && this.engines.length === 0 && !this.hasError) {
      this.onSearch();
    }
    else if (this.isExpandable) {
      setTimeout(() => {
        this.updateScrollState();
      });
    }
  }

  onSearch(): void {
    const q = (this.query || '').trim();
    if (!q) {
      this.hasError = true;
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.progress = 0;
    this.currentStep = '';
    this.engines = [];

    const payload = { text: { query: q } };

    this.fetchSearchResults('/api/cross/search', payload)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: CrossSearchResponse | null) => {
          if (!res) {
            this.hasError = true;
            return;
          }

          if (this.isPendingResponse(res)) {
            const p = res?.result?.progress ?? res?.progress;
            if (typeof p === 'number' && !Number.isNaN(p)) {
              this.progress = p;
            }

            const st = res?.result?.step ?? res?.step;
            if (typeof st === 'string' && st) {
              this.currentStep = st;
            }

            return;
          }

          const resultStatus = (res?.result?.status ?? '').toLowerCase();
          if (resultStatus !== 'success') {
            this.hasError = true;
            return;
          }

          const results = Array.isArray(res.result?.results) ? res.result.results : [];
          this.engines = results
            .filter((r) => (r?.status ?? '').toLowerCase() === 'success')
            .map((r) => ({
              engine: r.engine,
              search_url: r.search_url,
              first_result: r.first_result,
            }));
          setTimeout(() => {
            this.updateScrollState();
          });
        },
        error: () => (this.hasError = true),
      });
  }

  scrollResults(direction: 'left' | 'right', event: Event): void {
    event.stopPropagation();
    const el = this.scrollRow?.nativeElement;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction === 'left' ? -332 : 332, behavior: 'smooth' });
    setTimeout(() => {
      this.updateScrollState();
    }, 250);
  }

  onScrollRow(): void {
    this.updateScrollState();
  }

  openEngineCard(entry: CrossSearchEntry, event?: Event): void {
    event?.stopPropagation();
    const targetUrl = entry.first_result?.url ?? entry.search_url;
    if (!targetUrl) {
      return;
    }
    this.proxied_resource.open(targetUrl);
  }

  get progressValue(): number {
    const p = Number(this.progress);
    if (!Number.isFinite(p)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  private fetchSearchResults(apiEndpoint: string, payload: { text: { query: string } }): Observable<CrossSearchResponse | null> {
    return this.http.post<CrossSearchResponse>(apiEndpoint, payload).pipe(expand((res) =>
      this.shouldContinuePolling(res)
        ? timer(2000).pipe(switchMap(() => this.http.post<CrossSearchResponse>(apiEndpoint, payload)))
        : EMPTY), takeWhile((res) => this.shouldContinuePolling(res), true), catchError(() => of(null)));
  }

  private isPendingResponse(res: CrossSearchResponse): boolean {
    const topStatus = (res?.status ?? '').toLowerCase();
    const nestedStatus = (res?.result?.status ?? '').toLowerCase();
    return (
      ['pending', 'processing', 'running', 'busy'].includes(topStatus) ||
      ['pending', 'processing', 'running', 'busy'].includes(nestedStatus)
    );
  }

  private shouldContinuePolling(res: CrossSearchResponse): boolean {
    return this.isPendingResponse(res);
  }

  private updateScrollState(): void {
    const el = this.scrollRow?.nativeElement;
    if (!el) {
      this.canScrollLeft = false;
      this.canScrollRight = false;
      return;
    }
    this.canScrollLeft = el.scrollLeft > 2;
    this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
  }
}
