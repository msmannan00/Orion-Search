import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { ThreatLensDisplayFeedItem, ThreatLensFeedItem } from '../../../models/geo-fencing.models';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { ThreatLensArcSelection } from '../../models/threat-lens-map.types';

@Component({
  selector: 'app-threat-lens-arc-report-popup',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './arc-report-popup.component.html',
})
export class ArcReportPopupComponent implements OnChanges {
  displayItems: ThreatLensDisplayFeedItem[] = [];

  @Input() arc: ThreatLensArcSelection | null = null;
  @Input() items: ThreatLensFeedItem[] = [];

  @Output() close = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.arc || changes.items) {
      this.setDisplayItems();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  openReportItem(item: ThreatLensDisplayFeedItem): void {
    if (typeof window === 'undefined') {
      return;
    }

    const safeUrl = this.toSafeHttpUrl(item.link);
    if (!safeUrl) {
      return;
    }

    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }

  private setDisplayItems(): void {
    if (!this.arc) {
      this.displayItems = [];
      return;
    }

    this.displayItems = this.items
      .filter((item) => item.categoryKey === this.arc?.categoryKey
        && item.countryKeys.includes(this.arc.countryAKey)
        && item.countryKeys.includes(this.arc.countryBKey))
      .map((item) => ({
        ...item,
        displayDate: this.formatFeedDate(item.date),
        colorHex: this.toHexColor(item.color),
      }));
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

  private toSafeHttpUrl(value: string): string {
    if (!value) {
      return '';
    }

    try {
      const url = new URL(value);
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
