import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostBinding, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThreatLensDisplayFeedItem, ThreatLensFeedItem, ThreatLensFeedRange, ThreatLensFeedRangeOption } from '../../../models/geo-fencing.models';
import { ThreatLensFeedPanelType } from '../../models/threat-lens-map.types';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-threat-lens-feed-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './threat-lens-feed-panel.component.html',
})
export class ThreatLensFeedPanelComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('feedScroller') private feedScroller?: ElementRef<HTMLDivElement>;
  private feedItems: ThreatLensDisplayFeedItem[] = [];
  private autoScrollTimer: number | null = null;
  private autoScrollPaused = false;
  private resumeTimer: number | null = null;

  protected readonly ranges: ThreatLensFeedRangeOption[] = [ { key: '1d', label: '1 Day' }, { key: '7d', label: '1 Week' }, { key: 'all', label: 'All Time' }, ];

  collapsed = false;
  searchTerm = '';
  selectedRange: ThreatLensFeedRange = 'all';
  displayItems: ThreatLensDisplayFeedItem[] = [];

  @Input() title = '';
  @Input() description = '';
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyMessage = 'No records found for the selected time window.';
  @Input() feedType: ThreatLensFeedPanelType = 'news';
  @Input() items: ThreatLensFeedItem[] = [];

  constructor(private ngZone: NgZone) {
  }

  @HostBinding('class')
  get hostClass(): string {
    const sizeClass = this.collapsed
      ? 'h-auto min-h-0'
      : 'h-[calc(50%-0.375rem)] min-h-0 max-[1100px]:h-auto max-[1100px]:min-h-0';

    return `block w-full ${sizeClass}`;
  }

  ngAfterViewInit(): void {
    this.restartAutoScroll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.items || changes.feedType) {
      this.setFeedCollections();
      this.restartAutoScroll();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    if (this.collapsed) {
      this.stopAutoScroll();
      return;
    }

    this.resetScrollPosition();
    this.restartAutoScroll();
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.applyFilters();
    this.resetScrollPosition();
  }

  setRange(range: ThreatLensFeedRange): void {
    if (this.selectedRange === range) {
      return;
    }

    this.selectedRange = range;
    this.applyFilters();
    this.resetScrollPosition();
  }

  setAutoScrollPaused(paused: boolean): void {
    this.autoScrollPaused = paused;
    if (paused && this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  pauseAutoScrollTemporarily(): void {
    if (!this.isBrowserEnvironment()) {
      return;
    }

    this.setAutoScrollPaused(true);

    if (this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
    }

    this.resumeTimer = window.setTimeout(() => {
      this.setAutoScrollPaused(false);
    }, 2500);
  }

  openFeedItem(item: ThreatLensDisplayFeedItem): void {
    if (!this.isBrowserEnvironment()) {
      return;
    }

    const safeUrl = this.toSafeHttpUrl(item.link);
    if (!safeUrl) {
      return;
    }

    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }

  private setFeedCollections(): void {
    this.feedItems = this.items
      .map((item) => ({
        ...item,
        displayDate: this.formatFeedDate(item.date),
        colorHex: this.toHexColor(item.color),
      }))
      .filter((item) => this.feedType === 'news'
        ? item.categoryKey === 'news_model'
        : item.categoryKey !== 'news_model');

    this.applyFilters();
    this.resetScrollPosition();
  }

  private applyFilters(): void {
    const minTimestamp = this.getRangeMinTimestamp();
    const normalizedLocalSearch = this.searchTerm.trim().toLowerCase();

    this.displayItems = this.feedItems.filter((item) => {
      if (minTimestamp && item.timestamp < minTimestamp) {
        return false;
      }

      if (!normalizedLocalSearch) {
        return true;
      }

      const searchable = `${item.title} ${item.summary || ''} ${item.categoryLabel} ${item.highlights.join(' ')}`.toLowerCase();
      return searchable.includes(normalizedLocalSearch);
    });
  }

  private getRangeMinTimestamp(): number {
    if (this.selectedRange === 'all') {
      return 0;
    }

    const dayCount = Number.parseInt(this.selectedRange, 10);
    if (!Number.isFinite(dayCount)) {
      return 0;
    }

    return Date.now() - (dayCount * 24 * 60 * 60 * 1000);
  }

  private formatFeedDate(value: string): string {
    if (!value) {
      return 'Date unavailable';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private toHexColor(color: [number, number, number]): string {
    return `#${color.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  }

  private restartAutoScroll(): void {
    this.stopAutoScroll();
    this.startAutoScroll();
  }

  private startAutoScroll(): void {
    if (!this.isBrowserEnvironment()) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.autoScrollTimer = window.setInterval(() => {
        const container = this.feedScroller?.nativeElement;
        if (!container || this.autoScrollPaused || this.collapsed) {
          return;
        }

        const maxScrollTop = container.scrollHeight - container.clientHeight;
        if (maxScrollTop <= 0) {
          return;
        }

        if (container.scrollTop >= maxScrollTop - 1) {
          container.scrollTop = 0;
          return;
        }

        container.scrollTop += 1;
      }, 45);
    });
  }

  private stopAutoScroll(): void {
    if (!this.isBrowserEnvironment()) {
      return;
    }

    if (this.autoScrollTimer !== null) {
      window.clearInterval(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }

    if (this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  private resetScrollPosition(): void {
    if (!this.isBrowserEnvironment()) {
      return;
    }

    window.setTimeout(() => {
      this.feedScroller?.nativeElement.scrollTo({ top: 0 });
    });
  }

  private isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined';
  }

  private toSafeHttpUrl(value: string): string {
    const input = String(value || '').trim();
    if (!input || !this.isBrowserEnvironment()) {
      return '';
    }

    try {
      const url = new URL(input, window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
    }
    catch {
      return '';
    }

    return '';
  }
}
