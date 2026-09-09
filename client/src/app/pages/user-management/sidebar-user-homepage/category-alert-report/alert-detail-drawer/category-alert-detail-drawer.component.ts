import { ChangeDetectorRef, Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryAlerts } from '../../../../../shared/partials/alert-notification/model/alert.notification.model';
import { RawFindingRow } from '../../../../../shared/partials/alert-notification/model/raw-finding-row.model';
import { SidebarService } from '../../../../../shared/services/sidebar.service';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-category-alert-detail-drawer',
  imports: [CommonModule, TranslatePipe],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './category-alert-detail-drawer.component.html',
})
export class CategoryAlertDetailDrawerComponent {
  private alertDetailOpenTimer: ReturnType<typeof setTimeout> | null = null;
  private alertDetailCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly rawFindingBlockDivider = '\n\n';
  private readonly hiddenRawFindingKeys = new Set(['hash_content', 'hash_url', 'm_hash_content', 'm_hash_url']);
  private cachedRawFindingsInput: unknown = undefined;
  private cachedRawFindingRows: RawFindingRow[] = [];

  expandedDescriptionIds = new Set<string>();
  selectedDetailAlert: CategoryAlerts | null = null;
  isAlertDetailDrawerOpen = false;

  @Output() detailAlertChange = new EventEmitter<CategoryAlerts | null>();

  constructor(private sidebarService: SidebarService, private cdr: ChangeDetectorRef) {
  }

  openAlertDetails(alert: CategoryAlerts): void {
    this.sidebarService.closeSidebar();
    if (this.alertDetailOpenTimer) {
      clearTimeout(this.alertDetailOpenTimer);
    }
    if (this.alertDetailCloseTimer) {
      clearTimeout(this.alertDetailCloseTimer);
    }
    this.selectedDetailAlert = alert;
    this.isAlertDetailDrawerOpen = false;
    this.detailAlertChange.emit(alert);
    this.cdr.detectChanges();
    this.alertDetailOpenTimer = setTimeout(() => {
      this.isAlertDetailDrawerOpen = true;
      this.cdr.detectChanges();
    }, 10);
  }

  closeAlertDetails(): void {
    if (!this.selectedDetailAlert) {
      return;
    }
    if (this.alertDetailOpenTimer) {
      clearTimeout(this.alertDetailOpenTimer);
    }
    if (this.alertDetailCloseTimer) {
      clearTimeout(this.alertDetailCloseTimer);
    }
    this.isAlertDetailDrawerOpen = false;
    this.cdr.detectChanges();
    this.alertDetailCloseTimer = setTimeout(() => {
      this.selectedDetailAlert = null;
      this.detailAlertChange.emit(null);
      this.cdr.detectChanges();
    }, 300);
  }

  onAlertRowKeydown(event: KeyboardEvent, alert: CategoryAlerts): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.openAlertDetails(alert);
  }

  isLightTheme(): boolean {
    return document.body.classList.contains('light-theme');
  }

  getRiskIcon(risk: string): string {
    switch ((risk || '').toLowerCase()) {
      case 'critical':
        return 'bi-exclamation-octagon-fill';
      case 'high':
        return 'bi-exclamation-triangle-fill';
      case 'medium':
        return 'bi-exclamation-circle-fill';
      case 'low':
        return 'bi-info-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }

  getRiskIconColorClass(risk: string): string {
    switch ((risk || '').toLowerCase()) {
      case 'critical':
        return '[&_i]:text-[#ef4444] [body.light-theme_&]:[&_i]:text-red-700';
      case 'high':
        return '[&_i]:text-[#f97316] [body.light-theme_&]:[&_i]:text-orange-700';
      case 'medium':
        return '[&_i]:text-[#f59e0b] [body.light-theme_&]:[&_i]:text-amber-700';
      case 'low':
        return '[&_i]:text-[#60a5fa] [body.light-theme_&]:[&_i]:text-sky-700';
      default:
        return '[body.light-theme_&]:[&_i]:text-sky-700';
    }
  }

  getRiskLabelClass(risk: string): string {
    switch ((risk || '').toLowerCase()) {
      case 'critical':
        return 'border border-[var(--color-border)] bg-[rgb(255_76_76/10%)] text-[#ff4c4c] [body.light-theme_&]:border-[#f3b6bb] [body.light-theme_&]:bg-[#feecec] [body.light-theme_&]:text-[#dc2626]';
      case 'high':
        return 'border border-[var(--color-border)] bg-[rgb(255_179_71/10%)] text-[#ffb347] [body.light-theme_&]:border-[#efcd98] [body.light-theme_&]:bg-[#fff5e8] [body.light-theme_&]:text-[#c66a08]';
      case 'medium':
        return 'border border-[var(--color-border)] bg-[rgb(255_217_102/10%)] text-[#ffd966] [body.light-theme_&]:border-[#e8d694] [body.light-theme_&]:bg-[#fffbe6] [body.light-theme_&]:text-[#a16207]';
      case 'low':
        return 'border border-[var(--color-border)] bg-[rgb(108_207_126/10%)] text-[#6ccf7e] [body.light-theme_&]:border-[#b7dec0] [body.light-theme_&]:bg-[#e8f8ec] [body.light-theme_&]:text-[#166534]';
      default:
        return '';
    }
  }

  hasAlertUrl(url: string): boolean {
    const normalizedUrl = (url || '').trim().toLowerCase();
    return !!normalizedUrl && !['-', 'n/a', 'none', 'null'].includes(normalizedUrl);
  }

  getAlertCardDate(alert: CategoryAlerts): Date {
    return alert.resultDate ?? alert.detectedOn;
  }

  hasRawFindings(alert: CategoryAlerts | null): boolean {
    return this.getRawFindingRows(alert?.rawFindings).length > 0;
  }

  getRawFindingRows(rawFindings: unknown): RawFindingRow[] {
    if (rawFindings === this.cachedRawFindingsInput) {
      return this.cachedRawFindingRows;
    }
    const rows: RawFindingRow[] = [];
    this.buildRawFindingRows(rawFindings, [], rows);
    this.cachedRawFindingsInput = rawFindings;
    this.cachedRawFindingRows = rows;
    return rows;
  }

  getRawFindingValueBlocks(row: RawFindingRow): string[] {
    return row.valueBlocks?.length ? row.valueBlocks : [row.value];
  }

  isDetailDescriptionExpanded(alert: CategoryAlerts | null): boolean {
    return !!alert?.id && this.expandedDescriptionIds.has(alert.id);
  }

  shouldShowDescriptionToggle(description: string | null | undefined): boolean {
    const text = (description ?? '').trim();
    return text.split(/\r?\n/).length > 4 || text.length > 280;
  }

  toggleDetailDescription(alert: CategoryAlerts | null): void {
    if (!alert?.id) {
      return;
    }
    if (this.expandedDescriptionIds.has(alert.id)) {
      this.expandedDescriptionIds.delete(alert.id);
      return;
    }
    this.expandedDescriptionIds.add(alert.id);
  }

  private buildRawFindingRows(value: unknown, path: string[], rows: RawFindingRow[]): void {
    if (value === null || value === undefined || value === '') {
      return;
    }

    if (this.shouldSplitRawFindingGroup(value, path.length)) {
      Object.entries(value).forEach(([key, item]) => {
        if (this.isHiddenRawFindingKey(key)) {
          return;
        }
        this.buildRawFindingRows(item, [...path, key], rows);
      });
      return;
    }

    const valueBlocks = this.formatRawFindingBlocks(value);
    if (!valueBlocks.length) {
      return;
    }
    rows.push({
      label: this.formatRawFindingKey(path.join('.')) || 'Value',
      value: valueBlocks.join(this.rawFindingBlockDivider),
      valueBlocks
    });
  }

  private shouldSplitRawFindingGroup(value: unknown, depth: number): value is Record<string, unknown> {
    if (!this.isRecord(value) || depth >= 2) {
      return false;
    }
    if (depth === 0) {
      return true;
    }
    return Object.values(value).some(item => Array.isArray(item) || this.isRecord(item));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isHiddenRawFindingKey(key: string): boolean {
    return this.hiddenRawFindingKeys.has(key.toLowerCase());
  }

  private formatRawFindingBlocks(value: unknown, depth = 1): string[] {
    const formattedValue = this.formatRawFindingBlock(value, depth);
    return formattedValue ? [formattedValue] : [];
  }

  private formatRawFindingBlock(value: unknown, depth = 1): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (Array.isArray(value)) {
      return value
        .map(item => this.formatRawFindingBlock(item, depth))
        .filter(Boolean)
        .join(this.rawFindingBlockDivider);
    }

    if (this.isRecord(value)) {
      return Object.entries(value)
        .map(([key, item]) => {
          if (this.isHiddenRawFindingKey(key)) {
            return '';
          }
          if (item === null || item === undefined || item === '') {
            return '';
          }
          const isNested = Array.isArray(item) || this.isRecord(item);
          const formattedItem = isNested && depth <= 0
            ? this.formatRawFindingCompactValue(item)
            : this.formatRawFindingBlock(item, Math.max(depth - 1, 0));
          if (!formattedItem) {
            return '';
          }
          const label = this.formatRawFindingKey(key);
          return isNested && formattedItem.includes('\n')
            ? `${label}:\n${this.indentRawFindingBlock(formattedItem)}`
            : `${label}: ${formattedItem}`;
        })
        .filter(Boolean)
        .join('\n');
    }

    return this.formatRawFindingValue(value);
  }

  private formatRawFindingCompactValue(value: unknown): string {
    if (Array.isArray(value)) {
      if (value.every(item => !Array.isArray(item) && !this.isRecord(item))) {
        return value.map(item => this.formatRawFindingValue(item)).filter(Boolean).join(', ');
      }
      return value
        .map((item) => {
          const formattedItem = this.formatRawFindingCompactValue(item);
          return formattedItem || '';
        })
        .filter(Boolean)
        .join(this.rawFindingBlockDivider);
    }

    if (this.isRecord(value)) {
      return Object.entries(value)
        .map(([key, item]) => {
          if (this.isHiddenRawFindingKey(key)) {
            return '';
          }
          const formattedItem = Array.isArray(item) || this.isRecord(item)
            ? this.formatRawFindingCompactValue(item)
            : this.formatRawFindingValue(item);
          return formattedItem ? `${this.formatRawFindingKey(key)}: ${formattedItem}` : '';
        })
        .filter(Boolean)
        .join('\n');
    }

    return this.formatRawFindingValue(value);
  }

  private indentRawFindingBlock(value: string): string {
    return value
      .split('\n')
      .map(line => line ? `  ${line}` : line)
      .join('\n');
  }

  private formatRawFindingKey(path: string): string {
    const acronymLabels: Record<string, string> = {
      abn: 'ABN',
      asn: 'ASN',
      cve: 'CVE',
      cwe: 'CWE',
      cvss: 'CVSS',
      id: 'ID',
      ip: 'IP',
      ioc: 'IOC',
      url: 'URL'
    };

    return path
      .replace(/\[(\d+)\]/g, ' $1')
      .split('.')
      .map(part => part.replace(/^m_/, '').replace(/_/g, ' ').trim())
      .filter(Boolean)
      .map(part => part
        .split(/\s+/)
        .map(word => acronymLabels[word.toLowerCase()] || word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '))
      .join(' ')
      .replace(/^Findings?\s+/i, '')
      .trim();
  }

  private formatRawFindingValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value);
  }
}
