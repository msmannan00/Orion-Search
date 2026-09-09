import { Component, effect, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { StealerLogCallbackModel, StealerLogResultItem } from '../../../../shared/model/results/credentials/credential.callback.model';
import { expandFadeRow } from '../../../../shared/animations/row.animations';
import { fadeInDashboardItem } from '../../../../shared/animations/dashboard.item.animation';
import { RankedCallbackModel, RankedResultItem } from '../../../../shared/model/results/consolidated/ranked.callback.model';
import { ExpandedRowComponent } from '../expanded-row/expanded-row.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';

type IocResultTab = 'stealers' | 'threats';

@Component({
  selector: 'app-credential-list',
  standalone: true,
  templateUrl: './credential-list.component.html',
  animations: [fadeInDashboardItem, expandFadeRow],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ExpandedRowComponent, DatePipe, TranslatePipe, NgClass, ConfirmationPopupComponent]
})
export class CredentialListComponent {
  readonly rankedResultInput = input(new RankedCallbackModel(), { alias: 'rankedResult' });
  thretsExpandedRows = new Set<number>();
  stealersExpandedRows = new Set<number>();
  pendingDismissItem: StealerLogResultItem | null = null;
  readonly stealerData$ = input.required<StealerLogCallbackModel>();
  readonly type = input<string>('credential');
  readonly isLoading = input.required<boolean>();
  rankedResult: RankedCallbackModel = new RankedCallbackModel();
  readonly searchQuery = input<string>('');
  readonly activeTab = input<IocResultTab>('stealers');
  readonly canDismiss = input<boolean>(false);
  readonly dismissRequested = output<StealerLogResultItem>();

  constructor(private router: Router) {
    effect(() => {
      this.rankedResult = this.rankedResultInput();
    });
  }

  isStealerlogsRoute(): boolean {
    return this.router.url.includes('/stealerlog');
  }

  trackByIndex(index: number): number {
    return index;
  }

  getDisplayIndex(index: number): number {
    return index + 1;
  }

  toggleRow(index: number, expandedSet: Set<number>) {
    if (expandedSet.has(index)) {
      expandedSet.clear();
      return;
    }
    expandedSet.clear();
    expandedSet.add(index);
  }

  isExpanded(index: number, expandedSet: Set<number>): boolean {
    return expandedSet.has(index);
  }

  onRowKeydown(event: KeyboardEvent, index: number, expandedSet: Set<number>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleRow(index, expandedSet);
    }
  }

  onDismissClick(item: StealerLogResultItem, event: MouseEvent): void {
    event.stopPropagation();
    if (item.dismissed) {
      this.dismissRequested.emit(item);
      return;
    }
    this.pendingDismissItem = item;
  }

  confirmDismiss(confirmed: boolean): void {
    const item = this.pendingDismissItem;
    this.pendingDismissItem = null;
    if (confirmed && item) {
      this.dismissRequested.emit(item);
    }
  }

  getStealerDomainValues(item: StealerLogResultItem): string[] {
    if (!item || item.type === 'bin') {
      return [];
    }
    const domains = this.normalizeValues(item.domain);
    const sourceDomains = this.normalizeValues(item.source_domain);
    const mergedDomains = this.mergeUniqueValues(domains, sourceDomains);
    if (mergedDomains.length) {
      return mergedDomains;
    }
    return this.normalizeValues(item.ip);
  }

  getStealerDomainTitle(item: StealerLogResultItem): string {
    const values = this.getStealerDomainValues(item);
    return values.length ? values.join(', ') : 'Not available';
  }

  sliceText(text: string | null | undefined, maxLength = 30): string {
    if (!text) {
      return '';
    }
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  getThreatPrimaryUrl(result: RankedResultItem): string {
    if (!result) {
      return '-';
    }
    const candidates = [result.m_url, result.m_base_url, result.m_domain, result.m_weblink]
      .flatMap(value => this.normalizeValues(value));
    return candidates[0] || '-';
  }

  getThreatPrimaryUrlShort(result: RankedResultItem, maxLength = 25): string {
    return this.sliceText(this.getThreatPrimaryUrl(result), maxLength) || '-';
  }

  getThreatSourceIndex(result: RankedResultItem): string {
    const raw = result?.rank_index ?? result?.m_rank_index ?? result?.m_index ?? result?.index ?? result?.type ?? result?.file_type;
    if (!raw) {
      return '-';
    }
    const cleaned = String(raw)
      .replace(/^m[_\s-]+/i, '')
      .replace(/[_\s-]*model$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned ? cleaned.replace(/\b\w/g, c => c.toUpperCase()) : '-';
  }

  private normalizeValues(value: unknown): string[] {
    const values = Array.isArray(value) ? value : [value];
    return Array.from(new Set(values.map(v => v == null ? '' : String(v).trim()).filter(Boolean)));
  }

  private mergeUniqueValues(...groups: string[][]): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];
    groups.flat().forEach(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(value);
    });
    return merged;
  }
}
