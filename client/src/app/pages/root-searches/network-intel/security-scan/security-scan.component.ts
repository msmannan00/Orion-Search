import { CommonModule, NgClass, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CodeBlockComponent } from '../../../../shared/partials/code-block/code-block.component';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { SecurityScanExportComponentComponent } from './security-scan-export-component/security-scan-export-component.component';
import { NgxPrintDirective, NgxPrintModule } from 'ngx-print';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmptyQueryComponent } from '../../../../shared/partials/empty-query/empty-query.component';
import { UrlScanMeta, UrlScanThreatItem, } from '../../../../shared/model/security-scan/security.scan.results.model';
import { ScannerService } from './scanner-service.service';
import { ReportExportService } from '../../../../shared/services/report-export.service';
import { GraphReportPayload } from '../../../../shared/model/report/report-export.model';
import { NetworkIntelScanService } from '../../../../shared/services/network-intel/network-intel-scan.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ExportChoiceModalComponent } from '../../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { SECURITY_SCAN_EXPORT_OPTIONS } from '../../../../shared/model/report/export-choice.model';
import { isIpv4Address } from '../../../../shared/utils/network-validation.util';

@Component({
  selector: 'app-security-scan',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    CodeBlockComponent,
    NgxPrintModule,
    NgOptimizedImage,
    TooltipDirective,
    SecurityScanExportComponentComponent,
    NgxPrintDirective,
    FormsModule,
    ReactiveFormsModule,
    EmptyQueryComponent, TranslatePipe, ExportChoiceModalComponent],
  templateUrl: './security-scan.component.html',
  styleUrls: ['./security-scan.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SecurityScanComponent implements OnInit {
  meta: UrlScanMeta | null = null;
  categories: { name: string; total: number; items: UrlScanThreatItem[]; }[] = [];
  requestedUrl = '';
  searchQuery = '';
  requestedDomain = '';
  isLoading = false;
  isFetched = false;
  hasError = false;
  errorMessage = '';
  skeletonCards = Array.from({ length: 3 });
  progress = signal(0);
  currentStep = '';
  scanType = '';
  grade = '';
  gradeCounts: { high: number; medium: number; low: number; informational: number; } = { high: 0, medium: 0, low: 0, informational: 0, };
  trackByCategory = ( _: number, c: { name: string; } ) => c.name;
  trackByItem = (i: number) => i;
  isExportChoiceOpen = false;
  readonly reportExportOptions = SECURITY_SCAN_EXPORT_OPTIONS;

  constructor(private router: Router, private route: ActivatedRoute, private scanner: ScannerService, private graphReportExport: ReportExportService, private scanHelperMethodsService: NetworkIntelScanService) { }

  ngOnInit(): void {
    this.scanType = this.route.snapshot.data.type;
    if (!this.scanType) {
      this.scanType = 'basic';
    }
    const rawParam = this.route.snapshot.queryParamMap.get('domain') ?? '';
    this.searchQuery = rawParam;
    if (!rawParam) {
      return;
    }
    const resolved = this.resolveRequestedUrl(rawParam);
    try {
      const u = new URL(resolved);
      const host = u.hostname;
      const isIPv4 = isIpv4Address(host);
      const validHost = host === 'localhost' || isIPv4 || host.includes('.');
      if (!validHost) {
        return;
      }
      this.requestedUrl = u.toString();
      this.requestedDomain = this.extractHost(this.requestedUrl) || window.location.hostname || 'localhost';
      if (this.scanner.first_load) {
        this.load();
      }
      this.scanner.first_load = false;
    }
    catch {
      return;
    }
  }

  private load(): void {
    this.isLoading = true;
    this.isFetched = false;
    this.hasError = false;
    this.errorMessage = '';
    this.meta = null;
    this.categories = [];
    this.progress.set(0);
    this.currentStep = '';
    this.grade = '';
    this.gradeCounts = { high: 0, medium: 0, low: 0, informational: 0 };
    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { domain: this.requestedUrl, scanType: this.scanType },
        queryParamsHandling: 'merge',
      })
      .then();
    this.scanner
      .scanDomain(this.requestedUrl, this.scanType)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res) => {
          if (res?.result?.status === 'busy' || res?.result?.status === 'pending' || res?.status === 'pending') {
            const p = res?.result?.progress ?? res?.progress;
            if (typeof p === 'number' && !Number.isNaN(p)) {
              this.progress.set(0);
            }
            const st = res?.result?.step ?? res?.step;
            if (typeof st === 'string' && st) {
              this.currentStep = st;
            }
            return;
          }
          this.isFetched = true;
          const result = res.result;
          if (!result?.meta) {
            this.hasError = true;
            this.errorMessage = 'No data received from scanner.';
            return;
          }
          const m = result.meta;
          this.meta = {
            ...m,
            Host: (m?.Host?.trim()) || this.extractHost(m?.URL) || this.requestedDomain,
            URL: m?.URL || this.requestedUrl,
          };
          this.grade = result.grade ?? '';
          this.gradeCounts = result.grade_counts ?? { high: 0, medium: 0, low: 0, informational: 0 };
          const proofMap = new Map<string, string>();
          const proofs = result.proofs ?? {};
          Object.entries(proofs).forEach(([cat, items]) => {
            items.forEach((p) => {
              const k = cat + '|' + (p.header || '').trim().toLowerCase();
              if (p.proof && !proofMap.has(k)) {
                proofMap.set(k, p.proof);
              }
            });
          });
          const entries = Object.entries(result.threats ?? {});
          this.categories = entries
            .map(([name, items]) => {
              const list: UrlScanThreatItem[] = Array.isArray(items) ? items : [];
              const seen = new Set<string>();
              const uniqueItems = list
                .filter((it) => {
                  const key = (it.header || '').trim().toLowerCase();
                  if (!key || seen.has(key)) {
                    return false;
                  }
                  seen.add(key);
                  return true;
                })
                .map((it) => {
                  const key = (it.header || '').trim().toLowerCase();
                  const mergedProof = proofMap.get(name + '|' + key);
                  return mergedProof ? { ...it, proof: mergedProof } : it;
                });
              return { name, total: list.length, items: uniqueItems };
            })
            .filter((c) => c.items.length > 0);
        },
        error: (err) => {
          this.isFetched = true;
          this.hasError = true;
          this.errorMessage =
                    String(err?.error?.detail ?? '') || String(err?.message ?? '') || 'Failed to fetch security scan results.';
        },
      });
  }

  openExportChoice(): void {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string): void {
    if (type === 'report' || type === 'json' || type === 'csv') {
      this.exportReport(type);
    }
    this.closeExportChoice();
  }

  private exportReport(type = 'report'): void {
    if (!this.meta) {
      return;
    }

    const now = new Date().toISOString();
    const host = this.displayHost || 'report';
    const totalFindings = this.categories.reduce((acc, c) => acc + (c.items?.length || 0), 0);
    const summarize = (text: string, limit = 180): string => {
      const v = (text || '').replace(/\s+/g, ' ').trim();
      return v.length > limit ? `${v.slice(0, limit - 3)}...` : (v || 'not available');
    };

    const metaValues: Record<string, string> = {
      target_url: this.meta.URL || 'not available',
      host: this.displayHost || 'not available',
      port: this.displayPort || 'not available',
      tls_status: this.hasSSL ? 'ssl enabled' : 'no ssl detected',
      scanned_on: this.meta.Scanned_on_date || 'not available',
      scanned_by: this.meta.Scanned_by || 'not available',
      scan_type: this.scanType || 'basic',
      grade: this.grade || 'not available',
      high_risk: String(this.gradeCounts.high ?? 0),
      medium_risk: String(this.gradeCounts.medium ?? 0),
      low_risk: String(this.gradeCounts.low ?? 0),
      informational_risk: String(this.gradeCounts.informational ?? 0),
    };

    const tables = [
      { title: 'Scan Summary', values: metaValues },
      ...this.categories.slice(0, 20).map((cat) => {
        const values: Record<string, string> = {};
        cat.items.slice(0, 25).forEach((item, idx) => {
          values[`${idx + 1}. ${item.header}`] = `${item.risk} Risk (${item.confidence} Confidence) | ${summarize(item.description)}`;
        });
        return { title: `${cat.name} Findings`, values };
      })
    ];

    const nodes = this.categories.flatMap((cat) => [
      { id: `category-${cat.name}`, label: cat.name, type: 'category' },
      ...cat.items.slice(0, 40).map((item, idx) => ({
        id: `finding-${cat.name}-${idx + 1}`,
        label: item.header || `Finding ${idx + 1}`,
        type: 'finding'
      }))
    ]);

    const edges = this.categories.flatMap((cat) => cat.items.slice(0, 40).map((_, idx) => ({
      id: `edge-${cat.name}-${idx + 1}`,
      from: `category-${cat.name}`,
      to: `finding-${cat.name}-${idx + 1}`,
      label: 'contains'
    })));

    const payload: GraphReportPayload = {
      graphKind: 'cti',
      title: 'Web Scan Report',
      sessionName: host,
      generatedAtIso: now,
      nodes,
      edges,
      summary: {
        target: host,
        scan_type: this.scanType || 'basic',
        total_categories: this.categories.length,
        total_findings: totalFindings,
        grade: this.grade || 'not available',
        tls_status: this.hasSSL ? 'enabled' : 'not detected',
        exported_at: now
      },
      tables
    };

    this.graphReportExport.exportByType(payload, type === 'report' ? 'doc_pdf' : type as 'json' | 'csv');
  }

  private resolveRequestedUrl(input: string): string {
    const v = decodeURIComponent(input || '').trim();
    if (!v) {
      return '';
    }
    try {
      const u = new URL((/^https?:\/\//i.exec(v)) ? v : `https://${v.replace(/^\/+/, '')}`);
      return u.toString();
    }
    catch {
      return `https://${v.replace(/^https?:\/\//i, '').replace(/^\/+/, '')}`;
    }
  }

  private extractHost(url?: string): string {
    try {
      return url ? new URL(url).hostname : '';
    }
    catch {
      return '';
    }
  }

  get displayHost(): string {
    return this.meta?.Host ?? this.extractHost(this.meta?.URL) ?? this.requestedDomain;
  }

  get displayPort(): string {
    if (!this.meta?.Port) {
      return '';
    }
    return this.meta.Port.replace(/\s*SSL/i, '').trim();
  }

  get hasSSL(): boolean {
    return !!this.meta?.Port && /ssl/i.test(this.meta.Port);
  }

  get loadingStepLabel(): string {
    return this.scanHelperMethodsService.getLoadingStepLabel(this.currentStep);
  }

  retry(): void {
    this.load();
  }

  onSearchSubmit(): void {
    if (this.isLoading) {
      return;
    }
    const raw = (this.searchQuery ?? '').trim();
    if (!raw) {
      return;
    }
    const domain = this.resolveRequestedUrl(raw);
    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { domain, scanType: this.scanType },
        queryParamsHandling: 'merge',
      })
      .then(() => {
        this.requestedUrl = domain;
        this.requestedDomain = this.extractHost(domain) || this.requestedDomain;
        this.load();
      });
  }
}
