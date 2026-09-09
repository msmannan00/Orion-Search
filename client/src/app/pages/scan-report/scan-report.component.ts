import { CommonModule, NgClass } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TooltipDirective } from '../../shared/directive/tooltip-directive.directive';
import { DnsResult, IpDetail, IpRowState, UrlVulnerabilityScanResult, VulnerabilityScanDepth } from '../../shared/model/network-intel/network-intel.model';
import { buildStandardExportOptions } from '../../shared/model/report/export-choice.model';
import { GraphReportPayload } from '../../shared/model/report/report-export.model';
import { ScanJob } from '../../shared/model/scan-jobs/scan-job.model';
import { ExportChoiceModalComponent } from '../../shared/partials/export-choice-modal/export-choice-modal.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ReportExportService } from '../../shared/services/report-export.service';
import { ScanNotificationService } from '../../shared/services/scan-notification.service';
import { ValuePresentationBase } from '../../shared/utils/value-presentation.base';
import { DnsSectionComponent } from '../root-searches/network-intel/dns-section/dns-section.component';
import { ShodanSectionComponent } from '../root-searches/network-intel/shodan-section/shodan-section.component';
import { VulnerabilitySectionComponent } from '../root-searches/network-intel/vulnerability-section/vulnerability-section.component';
import { TranslationService } from '../../shared/services/translation.service';
import { asUnknownRecord, getOwnProperty, isUnknownRecord, setOwnProperty, UnknownRecord } from '../../shared/utils/type-guards.util';
import { ScanReportField } from './model/scan-report.model';
import { ScanReportSection } from './model/scan-report.model';

const SCAN_REPORT_EXPORT_OPTIONS = buildStandardExportOptions('scan-report-export', 'report', 'Generate consistent scan report PDF export.');

@Component({
  selector: 'app-scan-report',
  standalone: true,
  imports: [CommonModule, NgClass, TooltipDirective, ExportChoiceModalComponent, TranslatePipe, DnsSectionComponent, ShodanSectionComponent, VulnerabilitySectionComponent],
  templateUrl: './scan-report.component.html',
  styleUrls: ['./scan-report.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ScanReportComponent extends ValuePresentationBase implements OnInit {
  private readonly translationService = inject(TranslationService);
  private cachedResultSections: ScanReportSection[] | undefined;

  job: ScanJob | null = null;
  loading = true;
  errorMessage = '';
  isExportChoiceOpen = false;
  dnsReportResult: DnsResult | null = null;
  dnsReportRows: IpRowState[] = [];
  shodanReportResult: IpDetail | null = null;
  vulnerabilityReportTargets: string[] = [];
  vulnerabilityReportTarget: string | null = null;
  vulnerabilityReportDepth: VulnerabilityScanDepth = 'low';
  readonly reportExportOptions = SCAN_REPORT_EXPORT_OPTIONS;
  readonly trackByIndex = (index: number) => index;

  constructor(private route: ActivatedRoute, private scanNotifications: ScanNotificationService, private reportExportService: ReportExportService) {
    super();
  }

  ngOnInit(): void {
    const scanId = this.route.snapshot.paramMap.get('scanId') ?? '';
    if (!scanId) {
      this.loading = false;
      this.errorMessage = this.translationService.translate('Scan report not found.');
      return;
    }

    this.scanNotifications.getScanDetail(scanId).subscribe({
      next: job => {
        this.job = job;
        this.cachedResultSections = undefined;
        this.prepareNetworkIntelReport();
        this.loading = false;
        if (this.statusLabel === 'Completed' || this.statusLabel === 'Partial') {
          this.scanNotifications.markSeen(job);
        }
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err?.error?.detail ?? this.translationService.translate('Unable to load scan report.');
      },
    });
  }

  get result(): unknown {
    return this.unwrapResult(this.job?.response);
  }

  get vulnerabilityResult(): UrlVulnerabilityScanResult | null {
    return this.result as UrlVulnerabilityScanResult | null;
  }

  private get resultRecord(): UnknownRecord {
    return asUnknownRecord(this.result);
  }

  get apiType(): string {
    const raw = String(this.job?.api_reference ?? this.job?.title ?? 'scan')
      .replace(/^\/?api\//, '')
      .replace(/^dynamic\//, '')
      .replace(/^netintel\//, '')
      .replace(/^urlscan\//, '')
      .replace(/_/g, '-');

    if (raw === 'cracked') {
      return 'playstore';
    }
    if (raw === 'url-vulnerability-scan') {
      return 'vulnerability-scan';
    }
    if (raw === 'ipscanner') {
      return 'ip-scan';
    }
    if (raw === 'resolve-ip') {
      return 'host-recon';
    }
    return raw || 'scan';
  }

  get targetText(): string {
    const result = this.resultRecord;
    return this.job?.target ?? String(result.domain ?? result.host ?? result.url ?? result.ip ?? result.query ?? this.translationService.translate('Scan target'));
  }

  get isHostReconReport(): boolean {
    return this.apiType === 'host-recon';
  }

  get isIpScanReport(): boolean {
    return this.apiType === 'ip-scan';
  }

  get isVulnerabilityReport(): boolean {
    return this.apiType === 'vulnerability-scan';
  }

  get statusLabel(): string {
    const status = this.job ? this.scanNotifications.getStatus(this.job) : 'queued';
    if (status === 'done') {
      return 'Completed';
    }
    if (status === 'partial') {
      return 'Partial';
    }
    if (status === 'error') {
      return 'Failed';
    }
    if (status === 'running') {
      return 'Running';
    }
    if (status === 'queued') {
      return 'Queued';
    }
    return status;
  }

  get resultCount(): number {
    if (this.isHostReconReport) {
      return this.dnsReportRows.length;
    }
    if (this.isIpScanReport) {
      return this.shodanReportResult ? 1 : 0;
    }
    if (this.isVulnerabilityReport) {
      const total = Number(asUnknownRecord(this.resultRecord.summary).total);
      return this.findingItems.length || (Number.isFinite(total) ? total : 0);
    }
    if (this.findingItems.length) {
      return this.findingItems.length;
    }
    if (Array.isArray(this.result)) {
      return this.result.length;
    }
    if (this.resultSections.length) {
      return this.resultSections.length;
    }
    return this.result && typeof this.result === 'object' ? 1 : 0;
  }

  get fieldCount(): number {
    if (this.isHostReconReport) {
      return this.dnsReportRows.length;
    }
    if (this.isIpScanReport) {
      return this.shodanReportResult ? Object.keys(this.shodanReportResult).length : 0;
    }
    if (this.isVulnerabilityReport) {
      return this.findingItems.length + Object.keys(asUnknownRecord(this.resultRecord.summary)).length;
    }
    return this.resultSections.reduce((total, section) => total + section.items.length, 0);
  }

  get resultSections(): ScanReportSection[] {
    this.cachedResultSections ??= this.buildResultSections(this.result);
    return this.cachedResultSections;
  }

  get completedAtLabel(): string {
    return this.formatDate(this.job?.completed_at ?? this.job?.updated_at ?? this.job?.created_at);
  }

  isLastSectionRow(section: ScanReportSection, index: number): boolean {
    const count = section.items.length;
    return index === count - 1 || (index === count - 2 && count % 2 === 0);
  }

  openExportChoice(): void {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string): void {
    if (type === 'json' || type === 'csv' || type === 'report') {
      this.exportReport(type);
    }
    this.closeExportChoice();
  }

  private exportReport(type: string): void {
    if (!this.job) {
      return;
    }
    this.reportExportService.exportByType(this.buildReportPayload(), type === 'json' || type === 'csv' ? type : 'doc_pdf');
  }

  private prepareNetworkIntelReport(): void {
    const result = this.resultRecord;

    if (this.isHostReconReport) {
      const domain = String(result.domain ?? this.job?.payload?.domain ?? this.job?.target ?? '');
      const ips: string[] = Array.isArray(result.ips) ? result.ips.map((ip: unknown) => String(ip)).filter(Boolean) : [];
      this.dnsReportResult = { domain, ips };
      this.dnsReportRows = ips.map(ip => ({ ip, expanded: false, loading: false, detail: null, error: null }));
      return;
    }

    if (this.isIpScanReport && result.ip) {
      this.shodanReportResult = result as unknown as IpDetail;
      return;
    }

    if (this.isVulnerabilityReport) {
      const extracted = asUnknownRecord(result.extracted);
      const target = this.normalizeVulnerabilityTarget(result.host ?? extracted.host ?? this.job?.payload?.domain ?? this.job?.target ?? result.url);
      this.vulnerabilityReportTarget = target || null;
      this.vulnerabilityReportTargets = target ? [target] : [];
      const depth = String(this.job?.payload?.depth ?? '').toLowerCase();
      this.vulnerabilityReportDepth = ['low', 'medium', 'high', 'full'].includes(depth) ? depth as VulnerabilityScanDepth : 'low';
    }
  }

  private normalizeVulnerabilityTarget(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    try {
      return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname || raw;
    }
    catch {
      return raw;
    }
  }

  private buildReportPayload(): GraphReportPayload {
    const now = new Date().toISOString();
    const sections = this.resultSections;
    const target = this.targetText || 'Scan target';
    const apiLabel = this.displayFieldLabel(this.apiType);
    const sectionNodes = sections.slice(0, 120).map((section, index) => ({
      id: `section-${index + 1}`,
      label: section.title,
      type: 'section',
    }));

    return {
      graphKind: 'cti',
      title: `Scan Report - ${apiLabel}`,
      sessionName: `${this.apiType}-${target}`.slice(0, 80),
      generatedAtIso: now,
      nodes: [
        { id: 'target', label: target, type: 'target' },
        ...sectionNodes,
      ],
      edges: sectionNodes.map(node => ({
        id: `edge-${node.id}`,
        from: 'target',
        to: node.id,
        label: 'contains',
      })),
      summary: {
        scan_type: apiLabel,
        target,
        status: this.statusLabel,
        results: this.resultCount,
        fields: this.fieldCount,
        completed_at: this.completedAtLabel,
        exported_at: new Date(now).toLocaleString(),
      },
      tables: [
        {
          title: 'Request Context',
          values: {
            'Scan Type': apiLabel,
            Target: target,
            Status: this.statusLabel,
            Results: String(this.resultCount),
            Fields: String(this.fieldCount),
            Completed: this.completedAtLabel,
            'Exported At': new Date(now).toLocaleString(),
          },
        },
        ...sections.slice(0, 80).map(section => ({
          title: section.title,
          values: this.buildReportTableValues(section),
        })),
      ],
    };
  }

  private unwrapResult(response: unknown): unknown {
    if (!isUnknownRecord(response)) {
      return response;
    }
    const nestedResult = asUnknownRecord(response.result);
    if (isUnknownRecord(nestedResult.result) || Array.isArray(nestedResult.result)) {
      return nestedResult.result;
    }
    if (isUnknownRecord(response.data) || Array.isArray(response.data)) {
      return response.data;
    }
    if (isUnknownRecord(response.result) || Array.isArray(response.result)) {
      return response.result;
    }
    return response;
  }

  private get findingItems(): unknown[] {
    const result = this.resultRecord;
    return Array.isArray(result.findings)
      ? result.findings
      : Array.isArray(result.top_findings)
        ? result.top_findings
        : [];
  }

  private buildResultSections(result: unknown): ScanReportSection[] {
    if (!result) {
      return [];
    }

    if (Array.isArray(result)) {
      return result
        .map((item, index) => ({
          title: `${this.displayFieldLabel(this.apiType)} ${index + 1}`,
          items: this.flattenReportValue(item),
        }))
        .filter(section => section.items.length > 0);
    }

    if (!isUnknownRecord(result)) {
      return this.isEmptyDisplayValue(result)
        ? []
        : [{ title: 'Result', items: [{ label: 'Value', value: result }] }];
    }

    return Object.entries(result)
      .filter(([key, value]) => !this.isInternalField(key) && !this.isEmptyDisplayValue(value))
      .map(([key, value]) => ({
        title: this.displayFieldLabel(key),
        items: this.flattenReportValue(value),
      }))
      .filter(section => section.items.length > 0);
  }

  private flattenReportValue(value: unknown, path: string[] = []): ScanReportField[] {
    if (this.isEmptyDisplayValue(value)) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item, index) => this.flattenReportValue(item, path.length ? path : [`Item ${index + 1}`]));
    }

    if (!isUnknownRecord(value)) {
      return [{
        label: this.displayFieldLabel(path[path.length - 1] || 'Value'),
        value,
      }];
    }

    return Object.entries(value)
      .filter(([key, child]) => !this.isInternalField(key) && !this.isEmptyDisplayValue(child))
      .flatMap(([key, child]) => this.flattenReportValue(child, [...path, key]))
      .filter((item, index, items) => index === items.findIndex(match => match.label === item.label && this.stringifyNestedValue(match.value) === this.stringifyNestedValue(item.value)));
  }

  private buildReportTableValues(section: ScanReportSection): Record<string, string> {
    const values: Record<string, string> = {};
    section.items.slice(0, 80).forEach((item, index) => {
      const label = item.label || `Field ${index + 1}`;
      const key = getOwnProperty(values, label) === undefined ? label : `${label} ${index + 1}`;
      setOwnProperty(values, key, this.toReportCellValue(item.value));
    });
    return Object.keys(values).length ? values : { Details: '-' };
  }

  private toReportCellValue(value: unknown): string {
    const text = this.stringifyNestedValue(value) || '-';
    return text.length > 1000 ? `${text.slice(0, 997)}...` : text;
  }

  private isInternalField(key: string): boolean {
    const normalized = key.toLowerCase().replace(/[-\s]+/g, '_');
    return ['status', 'step', 'progress', 'scan_id', 'job_id', 'request_mode', 'elapsed_seconds', 'api_reference'].includes(normalized);
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
  }
}
