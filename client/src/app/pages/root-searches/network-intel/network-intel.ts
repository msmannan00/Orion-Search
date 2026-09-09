import { Component, OnDestroy, OnInit, computed, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EMPTY, Subject, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, concatMap, finalize, tap } from 'rxjs/operators';
import { NetworkIntelScanService } from '../../../shared/services/network-intel/network-intel-scan.service';
import { DnsResult, IpDetail, IpRowState, GeoResult, GeoLiveStats, NetworkIntelTab, UrlVulnerabilityScanResult, VulnerabilityFinding, VulnerabilityScanDepth } from '../../../shared/model/network-intel/network-intel.model';
import { GraphReportPayload, GraphReportTableRow } from '../../../shared/model/report/report-export.model';
import { ReportExportService } from '../../../shared/services/report-export.service';
import { EmptyQueryComponent } from '../../../shared/partials/empty-query/empty-query.component';
import { GeoCoordinatesModalComponent } from './modal/geo-coordinates-modal/geo-coordinates-modal.component';
import { DnsSectionComponent } from './dns-section/dns-section.component';
import { ShodanSectionComponent } from './shodan-section/shodan-section.component';
import { VulnerabilitySectionComponent } from './vulnerability-section/vulnerability-section.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ScannerService } from './security-scan/scanner-service.service';
import { UrlScanMeta, UrlScanProofItem, UrlScanResponse, UrlScanThreatItem } from '../../../shared/model/security-scan/security.scan.results.model';
import { NetworkIntelSeoRepoScanCategory, SeoRepoScanSectionComponent } from './seo-repo-scan-section/seo-repo-scan-section.component';
import { ExportChoiceModalComponent } from '../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { NETWORK_INTEL_EXPORT_OPTIONS } from '../../../shared/model/report/export-choice.model';
import { asUnknownRecord, getOwnProperty } from '../../../shared/utils/type-guards.util';
import { isIpv4Address } from '../../../shared/utils/network-validation.util';

@Component({
  selector:    'app-network-intel',
  templateUrl: './network-intel.html',
  styleUrls:   ['./network-intel.css'],
  standalone:  true,
  imports:     [CommonModule, FormsModule, EmptyQueryComponent, GeoCoordinatesModalComponent, DnsSectionComponent, ShodanSectionComponent, VulnerabilitySectionComponent, SeoRepoScanSectionComponent, TranslatePipe, ExportChoiceModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class NetworkIntel implements OnInit, OnDestroy {
  private sub?: Subscription;
  private seoRepoScanSub?: Subscription;
  private vulnerabilityElapsedInterval?: ReturnType<typeof setInterval>;
  private vulnerabilityCreatedAtMs: number | null = null;
  private readonly dnsIpDetailQueue$ = new Subject<IpRowState>();
  private dnsIpDetailQueueSub?: Subscription;
  private readonly sectionToTab: Record<string, NetworkIntelTab> = { 'host-recon': 'dns', 'deep-scan': 'shodan', 'vulnerability-scan': 'vuln', 'geo-cameras': 'geo', 'seo-scan': 'seo', 'repository-scan': 'repo', };
  private readonly tabToSection: Record<NetworkIntelTab, string> = { dns: 'host-recon', shodan: 'deep-scan', vuln: 'vulnerability-scan', geo: 'geo-cameras', seo: 'seo-scan', repo: 'repository-scan', };

  readonly progressSegments = Array.from({ length: 20 }, (_, index) => index);
  activeTab: NetworkIntelTab = 'dns';
  lastPrimaryTab: 'dns' | 'shodan' | 'vuln' = 'dns';
  geoMode:   'coords' | 'ranges'      = 'coords';
  dnsForm    = { domain: '' };
  shodanForm = { ip: '' };
  vulnForm   = { ip: '' };
  geoForm    = { coordinates: '', radius_km: 25, max_ips: 200, ip_ranges: '' };
  seoRepoScanForm = { target: '' };
  formError: string | null = null;
  parsedRanges: { value: string; valid: boolean }[] = [];
  dnsResult:       DnsResult | null = null;
  ipRows:          IpRowState[]     = [];
  shodanResult:    IpDetail | null  = null;
  vulnerabilityResult: UrlVulnerabilityScanResult | null = null;
  vulnerabilityTargets: string[] = [];
  vulnerabilityActiveTarget: string | null = null;
  vulnerabilityElapsedSeconds = signal(0);
  geoIpListResult: DnsResult | null = null;
  geoIpRows:       IpRowState[]     = [];
  geoResult:       GeoResult | null    = null;
  geoLiveStats:    GeoLiveStats | null = null;
  seoRepoScanMeta: UrlScanMeta | null = null;
  seoRepoScanCategories: NetworkIntelSeoRepoScanCategory[] = [];
  seoRepoScanErrorMessage: string | null = null;
  seoRepoScanGrade = '';
  seoRepoScanGradeCounts: { high: number; medium: number; low: number; informational: number; } = { high: 0, medium: 0, low: 0, informational: 0 };
  seoRepoScanRequestedUrl = '';
  seoRepoScanRequestedDomain = '';
  seoRepoScanProgress = signal(0);
  seoRepoScanLoading = signal(false);
  currentStep      = '';
  exportCurrentStep = '';
  lastResultCount = 0;
  hasSearched = false;
  showGeoCoordinatesModal = false;
  showGeoRangesModal = false;
  geoRangesSubmitAttempted = false;
  isExportingReport = false;
  exportProgress = 0;
  isExportChoiceOpen = false;
  readonly reportExportOptions = NETWORK_INTEL_EXPORT_OPTIONS;
  isScanning = computed(() =>
    this.seoRepoScanLoading() ||
    this.scanHelper.isRunning() &&
    !this.scanHelper.onError());

  get isEmbeddedInConsolidated(): boolean {
    return this.router.url.includes('/consolidated');
  }

  get vulnerabilityElapsedLabel(): string {
    const elapsed = this.vulnerabilityResult?.elapsed_seconds;
    if (typeof elapsed === 'number' && Number.isFinite(elapsed)) {
      return `${elapsed.toFixed(1)}s`;
    }
    if (this.isScanning() && this.vulnerabilityCreatedAtMs !== null) {
      const elapsedSeconds = this.vulnerabilityElapsedSeconds();
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = elapsedSeconds % 60;
      const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      return hours ? `${String(hours).padStart(2, '0')}:${clock}` : clock;
    }
    return '-';
  }

  constructor( public scanHelper: NetworkIntelScanService, private route: ActivatedRoute, private router: Router, private reportExport: ReportExportService, private scanner: ScannerService, ) {
    effect(() => {
      const done = this.scanHelper.onDone();
      if (!done) {
        return;
      }
      if (this.activeTab === 'dns') {
        this.parseDnsResult();
      }
      else if (this.activeTab === 'shodan') {
        this.parseShodanResult();
      }
      else if (this.activeTab === 'vuln' && this.vulnerabilityActiveTarget) {
        this.startVulnerabilityElapsedTimer(done.scan_created_at ?? done.result?.scan_created_at);
        this.parseVulnerabilityResult();
      }
      else if (this.activeTab === 'vuln') {
        this.parseVulnerabilityTargets();
      }
      else if (this.activeTab === 'geo') {
        this.parseGeoResult();
      }
    });
  }

  ngOnInit(): void {
    this.scanHelper.resetState();
    this.bindDnsIpDetailQueue();

    const section = this.route.snapshot.queryParamMap.get('section');
    const q = (this.route.snapshot.queryParamMap.get('q') ?? this.route.snapshot.queryParamMap.get('domain') ?? '').trim();

    if (section && getOwnProperty(this.sectionToTab, section)) {
      this.activeTab = getOwnProperty(this.sectionToTab, section);
      if (this.activeTab === 'dns' || this.activeTab === 'shodan' || this.activeTab === 'vuln') {
        this.lastPrimaryTab = this.activeTab;
      }
    }

    if (!q) {
      this.syncUrl();
      return;
    }

    if (this.activeTab === 'dns') {
      this.dnsForm.domain = q;
      this.validateDns();
    }
    else if (this.activeTab === 'shodan') {
      this.shodanForm.ip = q;
      this.validateShodan();
    }
    else if (this.activeTab === 'vuln') {
      this.vulnForm.ip = q;
      this.validateVulnerability();
    }
    else if (this.activeTab === 'seo') {
      this.seoRepoScanForm.target = q;
      this.validateSeoScan();
    }
    else if (this.activeTab === 'repo') {
      this.seoRepoScanForm.target = q;
      this.validateRepositoryScan();
    }
    else {
      this.geoForm.coordinates = q;
      this.validateGeo();
    }

    if (!this.formError) {
      queueMicrotask(() => {
        this.runToolbarSearch();
      });
    }
    else {
      this.syncUrl();
    }
  }

  validateDns(): void {
    this.formError = this.scanHelper.validateDnsInput(this.normalizeDomainInput(this.dnsForm.domain));
  }

  validateShodan(): void {
    this.formError = this.scanHelper.validateShodanInput(this.normalizeIpInput(this.shodanForm.ip));
  }

  validateVulnerability(): void {
    this.formError = this.scanHelper.validateVulnerabilityInput(this.normalizeDomainInput(this.vulnForm.ip));
  }

  validateGeo(): void {
    this.formError = this.scanHelper.validateGeoCoordinatesInput(this.geoForm.coordinates);
  }

  validateSeoScan(): void {
    this.formError = this.scanHelper.validateDnsInput(this.normalizeDomainInput(this.seoRepoScanForm.target));
  }

  validateRepositoryScan(): void {
    const target = this.seoRepoScanForm.target.trim();
    this.formError = target ? this.scanHelper.validateGithubRepositoryInput(target) : 'Please enter a GitHub repository URL';
  }

  setTab(id: NetworkIntelTab): void {
    if (this.activeTab === id) {
      return;
    }
    if (this.isScanning()) {
      this.cancel();
    }
    this.activeTab = id;
    if (id === 'dns' || id === 'shodan' || id === 'vuln') {
      this.lastPrimaryTab = id;
    }
    this.clearAll();
    this.syncUrl();
  }

  setGeoTab(): void {
    if (this.activeTab === 'geo') {
      return;
    }
    if (this.isScanning()) {
      this.cancel();
    }
    this.geoMode = 'coords';
    this.activeTab = 'geo';
    this.clearAll();
    this.syncUrl();
    this.openGeoCoordinatesModalFromStatus();
  }

  openGeoCoordinatesModalFromStatus(): void {
    this.geoMode = 'coords';
    this.showGeoRangesModal = false;
    this.showGeoCoordinatesModal = true;
  }

  onGeoCoordinatesChange(value: string): void {
    this.geoForm.coordinates = value;
    this.activeTab = 'geo';
    this.geoMode = 'coords';
    this.validateGeo();
    this.syncUrl();
  }

  getToolbarQuery(): string {
    if (this.activeTab === 'dns') {
      return this.dnsForm.domain;
    }
    if (this.activeTab === 'shodan') {
      return this.shodanForm.ip;
    }
    if (this.activeTab === 'vuln') {
      return this.vulnForm.ip;
    }
    if (this.activeTab === 'seo' || this.activeTab === 'repo') {
      return this.seoRepoScanForm.target;
    }
    return this.geoForm.coordinates;
  }

  setToolbarQuery(value: string): void {
    if (this.activeTab === 'dns') {
      this.dnsForm.domain = value;
      this.validateDns();
      this.syncUrl();
      return;
    }
    if (this.activeTab === 'shodan') {
      this.shodanForm.ip = value;
      this.validateShodan();
      this.syncUrl();
      return;
    }
    if (this.activeTab === 'vuln') {
      this.vulnForm.ip = value;
      this.validateVulnerability();
      this.syncUrl();
      return;
    }
    if (this.activeTab === 'seo') {
      this.seoRepoScanForm.target = value;
      this.validateSeoScan();
      this.syncUrl();
      return;
    }
    if (this.activeTab === 'repo') {
      this.seoRepoScanForm.target = value;
      this.validateRepositoryScan();
      this.syncUrl();
      return;
    }
    this.geoForm.coordinates = value;
    this.validateGeo();
    this.syncUrl();
  }

  getToolbarPlaceholder(): string {
    if (this.activeTab === 'dns') {
      return 'Search domain...';
    }
    if (this.activeTab === 'shodan') {
      return 'Search IP...';
    }
    if (this.activeTab === 'vuln') {
      return 'Search domain...';
    }
    if (this.activeTab === 'seo') {
      return 'Search domain...';
    }
    if (this.activeTab === 'repo') {
      return 'Search repository URL...';
    }
    return 'Search coordinates...';
  }

  canDownloadReport(): boolean {
    if (this.isScanning() || this.isExportingReport) {
      return false;
    }
    if (this.activeTab === 'dns') {
      return Boolean(this.dnsResult?.ips?.length);
    }
    if (this.activeTab === 'shodan') {
      return Boolean(this.shodanResult);
    }
    if (this.activeTab === 'vuln') {
      return Boolean(this.vulnerabilityResult);
    }
    if (this.activeTab === 'seo' || this.activeTab === 'repo') {
      return Boolean(this.seoRepoScanMeta && !this.seoRepoScanErrorMessage);
    }
    return [this.geoIpListResult?.ips?.length, this.geoResult?.cameras?.length, this.geoResult, this.geoLiveStats].some(Boolean);
  }

  openExportChoice(): void {
    void this.downloadReport();
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string): void {
    if (type === 'report' || type === 'json' || type === 'csv') {
      void this.downloadReport(type);
    }
    this.closeExportChoice();
  }

  private async downloadReport(type = 'report'): Promise<void> {
    try {
      this.isExportingReport = true;
      this.exportProgress = 6;
      this.exportCurrentStep = 'Preparing export...';
      await this.waitForPaint();

      if (this.activeTab === 'dns') {
        await this.loadAllDnsIpDetailsForExport();
      }

      this.exportProgress = Math.max(this.exportProgress, 96);
      this.exportCurrentStep = 'Generating report...';
      await this.waitForPaint();

      const payload = this.buildReportPayload();
      if (!payload) {
        return;
      }
      this.reportExport.exportByType(payload, type === 'report' ? 'doc_pdf' : type as 'json' | 'csv');
    }
    finally {
      this.isExportingReport = false;
      this.exportProgress = 0;
      this.exportCurrentStep = '';
    }
  }

  runToolbarSearch(): void {
    if (this.activeTab === 'dns') {
      this.startDnsScan();
      return;
    }
    if (this.activeTab === 'shodan') {
      this.startShodanScan();
      return;
    }
    if (this.activeTab === 'vuln') {
      this.startVulnerabilityScan();
      return;
    }
    if (this.activeTab === 'seo' || this.activeTab === 'repo') {
      this.startSeoRepoScan();
      return;
    }
    if (this.geoMode === 'coords') {
      this.startGeoScan();
    }
  }

  validateIpRanges(): void {
    const result = this.scanHelper.validateIpRanges(this.geoForm.ip_ranges);
    this.parsedRanges = result.parsedRanges;
    this.formError = result.error;
  }

  private clearAll(resetSearchState = true): void {
    this.dnsResult       = null;
    this.ipRows          = [];
    this.shodanResult    = null;
    this.vulnerabilityResult = null;
    this.vulnerabilityTargets = [];
    this.vulnerabilityActiveTarget = null;
    this.geoIpListResult = null;
    this.geoIpRows       = [];
    this.geoResult       = null;
    this.geoLiveStats    = null;
    this.seoRepoScanMeta = null;
    this.seoRepoScanCategories = [];
    this.seoRepoScanErrorMessage = null;
    this.seoRepoScanGrade = '';
    this.seoRepoScanGradeCounts = { high: 0, medium: 0, low: 0, informational: 0 };
    this.seoRepoScanRequestedUrl = '';
    this.seoRepoScanRequestedDomain = '';
    this.seoRepoScanProgress.set(0);
    this.currentStep     = '';
    this.lastResultCount = 0;
    this.formError       = null;
    this.parsedRanges    = [];
    if (resetSearchState) {
      this.hasSearched = false;
    }
    this.scanHelper.onDone.set(null);
    this.scanHelper.onError.set(null);
    this.scanHelper.progress.set(0);
    this.scanHelper.isRunning.set(false);
  }

  cancel(): void {
    this.scanHelper.cancelCurrentScan();
    this.scanner.cancel();
    this.sub?.unsubscribe();
    this.seoRepoScanSub?.unsubscribe();
    this.sub          = undefined;
    this.seoRepoScanSub = undefined;
    this.seoRepoScanLoading.set(false);
    this.geoLiveStats = null;
    this.currentStep  = '';
  }

  startDnsScan(): void {
    this.dnsForm.domain = this.normalizeDomainInput(this.dnsForm.domain);
    this.validateDns();
    if (Boolean(this.formError) || !this.dnsForm.domain.trim() || this.isScanning()) {
      return;
    }
    this.resetActiveWork();
    this.hasSearched = true;
    this.clearAll(false);
    this.syncUrl();
    this.sub = this.scanHelper.scanResolveIp(this.dnsForm.domain.trim());
    this.watchResult(this.parseDnsResult.bind(this));
  }

  private parseDnsResult(): void {
    const done = this.scanHelper.onDone();
    if (!done) {
      return;
    }
    this.currentStep = done.step ?? done.result?.step ?? done.status ?? done.result?.status ?? '';
    const payload = done.result ?? done;
    if (payload?.domain != null && Array.isArray(payload.ips)) {
      const existingRows = new Map(this.ipRows.map((row) => [row.ip, row]));
      this.dnsResult = { domain: payload.domain, ips: payload.ips };
      this.ipRows = payload.ips.map((ip: string) => existingRows.get(ip) ?? {
        ip, expanded: false, loading: false, progress: 0, step: null, detail: null, error: null,
      });
      this.lastResultCount = payload.ips.length;
    }
  }

  toggleIpRow(row: IpRowState): void {
    if (row.expanded) {
      row.expanded = false; return;
    }
    row.expanded = true;
    if (Boolean(row.detail) || row.loading) {
      return;
    }

    row.loading = true;
    row.progress = 5;
    row.step = 'queued';
    row.startedAtMs = Date.now();
    row.error   = null;
    this.enqueueDnsIpDetail(row);
  }

  startShodanScan(): void {
    this.shodanForm.ip = this.normalizeIpInput(this.shodanForm.ip);
    this.validateShodan();
    if (Boolean(this.formError) || !this.shodanForm.ip.trim() || this.isScanning()) {
      return;
    }
    this.resetActiveWork();
    this.hasSearched = true;
    this.clearAll(false);
    this.syncUrl();
    this.sub = this.scanHelper.scanShodanIp(this.shodanForm.ip.trim());
    this.watchResult(this.parseShodanResult.bind(this));
  }

  startVulnerabilityScan(): void {
    this.vulnForm.ip = this.normalizeDomainInput(this.vulnForm.ip);
    this.validateVulnerability();
    if (Boolean(this.formError) || !this.vulnForm.ip.trim() || this.isScanning()) {
      return;
    }
    this.resetActiveWork();
    this.hasSearched = true;
    this.clearAll(false);
    this.syncUrl();
    this.sub = this.scanHelper.scanSubdomains(this.vulnForm.ip.trim(), false);
    this.watchResult(this.parseVulnerabilityTargets.bind(this));
  }

  private normalizeDomainInput(value: string): string {
    const trimmed = value.trim();
    const match = /^(?:https:\/\/)?(?:www\.)?([^/?#]+)\/?$/i.exec(trimmed);
    return match?.[1] ?? trimmed;
  }

  private normalizeIpInput(value: string): string {
    const trimmed = value.trim();
    const match = /^(?:https:\/\/)?([^/?#]+)\/?$/i.exec(trimmed);
    return match?.[1] ?? trimmed;
  }

  startVulnerabilityScanForTarget(target: string, depth: VulnerabilityScanDepth): void {
    const normalizedTarget = target.trim();
    if (!normalizedTarget) {
      return;
    }
    this.vulnForm.ip = normalizedTarget;
    this.validateVulnerability();
    if (this.formError) {
      return;
    }
    if (this.isScanning()) {
      this.cancel();
    }
    this.resetActiveWork();
    this.hasSearched = true;
    this.vulnerabilityActiveTarget = normalizedTarget;
    this.vulnerabilityResult = null;
    this.lastResultCount = this.vulnerabilityTargets.length;
    this.syncUrl();
    this.sub = this.scanHelper.scanUrlVulnerability(normalizedTarget, depth);
    this.startVulnerabilityElapsedTimer(Date.now());
    this.watchResult(this.parseVulnerabilityResult.bind(this));
  }

  startSeoRepoScan(): void {
    if (this.activeTab !== 'seo' && this.activeTab !== 'repo') {
      return;
    }
    if (this.activeTab === 'repo') {
      this.validateRepositoryScan();
    }
    else {
      this.seoRepoScanForm.target = this.normalizeDomainInput(this.seoRepoScanForm.target);
      this.validateSeoScan();
    }
    if (Boolean(this.formError) || !this.seoRepoScanForm.target.trim() || this.isScanning()) {
      return;
    }

    const resolvedTarget = this.resolveSeoRepoScanTarget(this.seoRepoScanForm.target);
    const host = this.extractSeoRepoScanHost(resolvedTarget);
    if (!host || (host !== 'localhost' && !host.includes('.') && !isIpv4Address(host))) {
      this.formError = 'Enter a valid URL or host';
      return;
    }

    this.resetActiveWork();
    this.hasSearched = true;
    this.clearAll(false);
    this.seoRepoScanRequestedUrl = resolvedTarget;
    this.seoRepoScanRequestedDomain = host;
    this.seoRepoScanLoading.set(true);
    this.seoRepoScanProgress.set(8);
    this.currentStep = 'queued';
    this.syncUrl();
    this.seoRepoScanSub = this.scanner
      .scanDomain(resolvedTarget, this.activeTab)
      .pipe(finalize(() => {
        this.seoRepoScanLoading.set(false);
      }))
      .subscribe({
        next: (response) => {
          this.parseSeoRepoScanResult(response);
        },
        error: (error) => {
          this.seoRepoScanErrorMessage = String(error?.error?.detail ?? '') || String(error?.message ?? '') || 'Failed to fetch scan results.';
          this.seoRepoScanProgress.set(0);
        },
      });
  }

  private parseSeoRepoScanResult(response: UrlScanResponse): void {
    const status = String(response?.result?.status ?? response?.status ?? '').toLowerCase();
    const progress = response?.result?.progress ?? response?.progress;
    if (typeof progress === 'number' && Number.isFinite(progress)) {
      this.seoRepoScanProgress.set(Math.max(8, Math.min(99, Math.round(progress))));
    }

    if (status === 'busy' || status === 'pending') {
      const step = response?.result?.step ?? response?.step;
      this.currentStep = typeof step === 'string' && step ? step : this.currentStep;
      return;
    }

    const result = response?.result;
    if (!result?.meta) {
      this.seoRepoScanErrorMessage = 'No data received from scanner.';
      this.seoRepoScanProgress.set(0);
      return;
    }

    const meta = result.meta;
    this.seoRepoScanMeta = {
      ...meta,
      Host: meta?.Host?.trim() || this.extractSeoRepoScanHost(meta?.URL) || this.seoRepoScanRequestedDomain,
      URL: meta?.URL || this.seoRepoScanRequestedUrl,
    };
    this.seoRepoScanGrade = result.grade ?? '';
    this.seoRepoScanGradeCounts = result.grade_counts ?? { high: 0, medium: 0, low: 0, informational: 0 };
    this.seoRepoScanCategories = this.buildSeoRepoScanCategories(result.threats, result.proofs);
    this.lastResultCount = this.seoRepoScanCategories.reduce((total, category) => total + category.items.length, 0);
    this.currentStep = 'Done';
    this.seoRepoScanProgress.set(100);
  }

  private buildSeoRepoScanCategories(threats: Record<string, UrlScanThreatItem[]> | undefined, proofs: Record<string, UrlScanProofItem[]> | undefined): NetworkIntelSeoRepoScanCategory[] {
    const proofMap = new Map<string, string>();
    Object.entries(proofs ?? {}).forEach(([category, items]) => {
      items.forEach((item) => {
        const key = `${category}|${String(item?.header || '').trim().toLowerCase()}`;
        if (item?.proof && !proofMap.has(key)) {
          proofMap.set(key, item.proof);
        }
      });
    });

    return Object.entries(threats ?? {})
      .map(([name, items]) => {
        const list = items;
        const seen = new Set<string>();
        const uniqueItems = list
          .filter((item) => {
            const key = String(item?.header || '').trim().toLowerCase();
            if (!key || seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          })
          .map((item) => {
            const key = String(item?.header || '').trim().toLowerCase();
            const proof = proofMap.get(`${name}|${key}`);
            return proof ? { ...item, proof } : item;
          });
        return { name, total: list.length, items: uniqueItems };
      })
      .filter((category) => category.items.length > 0);
  }

  private resolveSeoRepoScanTarget(input: string): string {
    const value = decodeURIComponent(input || '').trim();
    if (!value) {
      return '';
    }
    try {
      return new URL((/^https?:\/\//i.exec(value)) ? value : `https://${value.replace(/^\/+/, '')}`).toString();
    }
    catch {
      return `https://${value.replace(/^https?:\/\//i, '').replace(/^\/+/, '')}`;
    }
  }

  private extractSeoRepoScanHost(url?: string): string {
    try {
      return url ? new URL(url).hostname : '';
    }
    catch {
      return '';
    }
  }

  private parseShodanResult(): void {
    const done = this.scanHelper.onDone();
    if (!done) {
      return;
    }
    this.currentStep = done.step ?? done.result?.step ?? done.status ?? done.result?.status ?? '';
    const payload = done.result ?? done;
    if (payload?.ip) {
      this.shodanResult    = payload as IpDetail;
      this.lastResultCount = 1;
    }
  }

  private parseVulnerabilityResult(): void {
    const done = this.scanHelper.onDone();
    if (!done) {
      return;
    }
    this.currentStep = done.step ?? done.result?.step ?? done.status ?? done.result?.status ?? '';
    const payload = done.result ?? done;
    const status = String(payload?.status ?? done?.status ?? '').toLowerCase();
    const hasRenderablePayload =
      !!payload &&
      (
        typeof payload?.url === 'string' ||
        typeof payload?.host === 'string' ||
        !!payload?.summary ||
        Array.isArray(payload?.findings) ||
        Array.isArray(payload?.top_findings)
      );

    if (status === 'pending' || status === 'busy' || !hasRenderablePayload) {
      return;
    }

    if (payload) {
      this.vulnerabilityResult = payload;
      this.lastResultCount = payload?.summary?.total ?? payload?.findings?.length ?? payload?.top_findings?.length ?? 0;
    }
  }

  private parseVulnerabilityTargets(): void {
    const done = this.scanHelper.onDone();
    if (!done) {
      return;
    }
    this.currentStep = done.step ?? done.result?.step ?? done.status ?? done.result?.status ?? '';
    const payload = done.result ?? done;
    const status = String(payload?.status ?? done?.status ?? '').toLowerCase();
    if (status === 'pending' || status === 'busy') {
      return;
    }

    const baseDomain = this.vulnForm.ip.trim();
    const subdomains = Array.isArray(payload?.subdomains)
      ? payload.subdomains
      : Array.isArray(payload?.live_subdomains)
        ? payload.live_subdomains
        : [];

    this.vulnerabilityTargets = [
      baseDomain,
      ...subdomains.filter((entry: string) => entry && entry !== baseDomain),
    ].filter(Boolean);
    this.lastResultCount = this.vulnerabilityTargets.length;
  }

  startGeoScan(): void {
    this.activeTab = 'geo';
    this.resetActiveWork();
    if (this.geoMode === 'coords') {
      this.validateGeo();
      if (Boolean(this.formError) || !this.geoForm.coordinates.trim() || this.isScanning()) {
        return;
      }
      this.hasSearched = true;
      this.clearAll(false);
      this.syncUrl();
      this.sub = this.scanHelper.scanGeoCamera(this.geoForm.coordinates.trim(),
        this.geoForm.radius_km,
        this.geoForm.max_ips);
    }
    else {
      this.geoRangesSubmitAttempted = true;
      this.validateIpRanges();
      if (Boolean(this.formError) || !this.geoForm.ip_ranges.trim() || this.isScanning()) {
        return;
      }
      const ranges = this.geoForm.ip_ranges
        .split('\n').map(l => l.trim()).filter(l => l.length > 0);
      this.showGeoRangesModal = false;
      this.geoRangesSubmitAttempted = false;
      this.hasSearched = true;
      this.clearAll(false);
      this.syncUrl();
      this.sub = this.scanHelper.scanGeoCameraByRanges(ranges,
        this.geoForm.max_ips);
    }
    this.watchResult(this.parseGeoResult.bind(this));
  }

  private parseGeoResult(): void {
    const done = this.scanHelper.onDone();
    if (!done) {
      return;
    }
    this.currentStep = done.step ?? done.result?.step ?? done.status ?? done.result?.status ?? '';
    const payload = done.result ?? done;

    if (Array.isArray(payload?.ips)) {
      this.geoIpListResult = {
        domain: payload.domain ?? this.geoForm.coordinates.trim() ?? 'geo-results',
        ips: payload.ips,
      };
      this.geoIpRows = payload.ips.map((ip: string) => ({
        ip, expanded: false, loading: false, progress: 0, step: null, detail: null, error: null,
      }));
      this.geoResult = null;
      this.geoLiveStats = null;
      this.lastResultCount = payload.count ?? payload.ips.length;
    }
    else if (payload?.cameras !== undefined) {
      this.geoResult       = payload as GeoResult;
      this.geoLiveStats    = null;
      this.lastResultCount = payload.cameras_found ?? 0;
    }
    else {
      if (payload?.ips_extracted != null || payload?.ips_scanned != null || payload?.cameras_found != null) {
        this.geoLiveStats = {
          ips_extracted: payload.ips_extracted ?? 0,
          ips_scanned:   payload.ips_scanned   ?? 0,
          cameras_found: payload.cameras_found ?? 0,
        };
      }
    }
  }

  private watchResult(fn: () => void): void {
    fn();
  }

  private syncUrl(): void {
    const query = this.getToolbarQuery().trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        section: this.tabToSection[this.activeTab],
        q: query || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    }).then();
  }

  ngOnDestroy(): void {
    this.resetActiveWork();
    this.dnsIpDetailQueueSub?.unsubscribe();
    this.scanHelper.resetState();
  }

  private buildReportPayload(): GraphReportPayload | null {
    const dnsResult = this.dnsResult;
    if (this.activeTab === 'dns' && dnsResult) {
      const now = new Date().toISOString();
      const completedDetails = this.ipRows.flatMap(row => row.detail ? [row.detail] : []);
      const scanStatuses = Array.from(new Set(completedDetails
        .map(detail => this.normalizeReportValue(detail.scan_status ?? detail.status))
        .filter(Boolean)));
      const nodes = [
        { id: `domain-${dnsResult.domain}`, label: dnsResult.domain, type: 'domain' },
        ...dnsResult.ips.map(ip => ({ id: `ip-${ip}`, label: ip, type: 'ip' as const }))
      ];
      const edges = dnsResult.ips.map(ip => ({
        id: `${dnsResult.domain}-${ip}`,
        from: `domain-${dnsResult.domain}`,
        to: `ip-${ip}`,
        label: 'resolves_to'
      }));

      return {
        graphKind: 'cti',
        title: 'Host Recon Report',
        sessionName: dnsResult.domain,
        generatedAtIso: now,
        nodes,
        edges,
        summary: {
          domain: dnsResult.domain,
          resolved_ips: dnsResult.ips.length,
          enriched_ips: completedDetails.length,
          open_ports: completedDetails.reduce((total, detail) => total + (detail.open_ports?.length ?? 0), 0),
          scan_status: scanStatuses.length ? scanStatuses.join(', ') : 'Not reported',
          exported_at: now
        },
        tables: [
          {
            title: 'Resolved IPs',
            values: dnsResult.ips.reduce<Record<string, string>>((acc, ip, index) => {
              acc[`IP ${index + 1}`] = ip;
              return acc;
            }, {})
          },
          ...this.buildRawJsonTables(dnsResult, 'DNS Raw Result'),
          ...this.ipRows
            .flatMap((row, index) => {
              const detail = row.detail;
              return detail ? [
                ...this.buildIpDetailTables(detail, `IP ${index + 1}`),
                ...this.buildRawJsonTables(detail, `IP ${index + 1} Raw Result`)
              ] : [];
            })
        ]
      };
    }

    if (this.activeTab === 'shodan' && this.shodanResult) {
      const now = new Date().toISOString();
      const detail = this.shodanResult;
      const nodes = [{ id: `ip-${detail.ip}`, label: detail.ip, type: 'ip' }];
      const edges: GraphReportPayload['edges'] = [];

      const addNode = (id: string, label: string, type: string, edgeLabel: string) => {
        if (!label) {
          return;
        }
        nodes.push({ id, label, type });
        edges.push({ id: `${nodes[0].id}-${id}`, from: nodes[0].id, to: id, label: edgeLabel });
      };

      addNode(`org-${detail.organization}`, detail.organization ?? '', 'organization', 'owned_by');
      addNode(`country-${detail.country}`, detail.country ?? '', 'country', 'located_in');
      addNode(`city-${detail.city}`, detail.city ?? '', 'city', 'city');

      return {
        graphKind: 'cti',
        title: 'IP Scan Report',
        sessionName: detail.ip,
        generatedAtIso: now,
        nodes,
        edges,
        summary: {
          ip: detail.ip,
          country: detail.country ?? '-',
          city: detail.city ?? '-',
          organization: detail.organization ?? '-',
          open_ports: detail.open_ports?.length ?? 0,
          vulnerabilities: detail.vulnerabilities?.length ?? 0,
          cameras: detail.cameras?.length ?? 0,
          exported_at: now
        },
        tables: [
          ...this.buildIpDetailTables(detail),
          ...this.buildRawJsonTables(detail, 'IP Raw Result')
        ]
      };
    }

    if (this.activeTab === 'geo' && [this.geoIpListResult, this.geoResult, this.geoLiveStats].some(Boolean)) {
      const now = new Date().toISOString();
      if (this.geoIpListResult) {
        return {
          graphKind: 'cti',
          title: 'Geo IP Scan Report',
          sessionName: this.geoIpListResult.domain || 'geo-results',
          generatedAtIso: now,
          nodes: this.geoIpRows.slice(0, 100).map((row) => ({
            id: `ip-${row.ip}`,
            label: row.ip,
            type: 'ip'
          })),
          edges: [],
          summary: {
            mode: this.geoMode === 'coords' ? 'coordinates' : 'ip_ranges',
            query: this.geoMode === 'coords' ? (this.geoForm.coordinates.trim() || '-') : 'range_scan',
            total_ips: this.geoIpRows.length,
            exported_at: now
          },
          tables: [
            {
              title: 'Resolved IPs',
              values: this.geoIpRows.slice(0, 25).reduce<Record<string, string>>((acc, row, index) => {
                acc[`IP ${index + 1}`] = row.ip;
                return acc;
              }, {})
            },
            ...this.buildRawJsonTables(this.geoIpListResult, 'Geo IP Raw Result')
          ]
        };
      }

      const result = this.geoResult;
      const stats = this.geoLiveStats;
      const ranges = this.geoForm.ip_ranges.split('\n').map(line => line.trim()).filter(Boolean);
      const sessionName = this.geoMode === 'coords'
        ? (this.geoForm.coordinates.trim() || 'geo-coordinates')
        : (ranges[0] || 'geo-ranges');
      const cameras = result?.cameras ?? [];

      return {
        graphKind: 'cti',
        title: 'Geo Cameras Report',
        sessionName,
        generatedAtIso: now,
        nodes: cameras.slice(0, 100).map((camera, index) => ({
          id: `camera-${camera.ip || index}-${camera.port ?? 0}`,
          label: camera.ip || `Camera ${index + 1}`,
          type: 'camera'
        })),
        edges: [],
        summary: {
          mode: this.geoMode === 'coords' ? 'coordinates' : 'ip_ranges',
          query: this.geoMode === 'coords' ? (this.geoForm.coordinates.trim() || '-') : (ranges[0] || '-'),
          radius_km: this.geoForm.radius_km,
          max_ips: this.geoForm.max_ips,
          ips_extracted: result?.ips_extracted ?? stats?.ips_extracted ?? 0,
          ips_scanned: result?.ips_scanned ?? stats?.ips_scanned ?? 0,
          cameras_found: result?.cameras_found ?? stats?.cameras_found ?? 0,
          exported_at: now
        },
        tables: [
          {
            title: 'Query Configuration',
            values: this.geoMode === 'coords'
              ? {
                Coordinates: this.geoForm.coordinates.trim() || '-',
                'Radius (km)': String(this.geoForm.radius_km),
                'Max IPs': String(this.geoForm.max_ips)
              }
              : {
                'Range 1': ranges[0] || '-',
                'Additional Ranges': String(Math.max(0, ranges.length - 1)),
                'Max IPs': String(this.geoForm.max_ips)
              }
          },
          {
            title: 'Detected Cameras',
            values: cameras.slice(0, 25).reduce<Record<string, string>>((acc, camera, index) => {
              acc[`Camera ${index + 1}`] = [
                camera.ip || 'Unknown IP',
                camera.port ? `:${camera.port}` : '',
                camera.brand ?? camera.model ?? ''
              ].join(' ').trim();
              return acc;
            }, {})
          },
          ...this.buildRawJsonTables(result, 'Geo Cameras Raw Result'),
          ...this.buildRawJsonTables(stats, 'Geo Cameras Live Stats')
        ]
      };
    }

    if (this.activeTab === 'vuln' && this.vulnerabilityResult) {
      const now = new Date().toISOString();
      const result = this.vulnerabilityResult;
      const host = result.host ?? result.url ?? 'url-vulnerability-scan';
      const scannedUrls = Array.isArray(result.scanned_urls) ? result.scanned_urls : [];
      const findings = Array.isArray(result.findings)
        ? result.findings
        : Array.isArray(result.top_findings)
          ? result.top_findings
          : [];

      const nodes = [
        { id: `host-${host}`, label: host, type: 'domain' as const },
        ...scannedUrls.slice(0, 25).map((url: string, index: number) => ({
          id: `url-${index}`,
          label: url,
          type: 'url' as const
        }))
      ];
      const edges = scannedUrls.slice(0, 25).map((_: string, index: number) => ({
        id: `host-${host}-url-${index}`,
        from: `host-${host}`,
        to: `url-${index}`,
        label: 'scanned'
      }));

      return {
        graphKind: 'cti',
        title: 'URL Vulnerability Report',
        sessionName: host,
        generatedAtIso: now,
        nodes,
        edges,
        summary: {
          host: result.host ?? '-',
          url: result.url ?? '-',
          final_url: result.final_url ?? '-',
          request_mode: result.request_mode ?? '-',
          elapsed_seconds: typeof result.elapsed_seconds === 'number' ? result.elapsed_seconds.toFixed(1) : '-',
          total_findings: result.summary?.total ?? findings.length,
          critical: result.summary?.critical ?? 0,
          high: result.summary?.high ?? 0,
          medium: result.summary?.medium ?? 0,
          low: result.summary?.low ?? 0,
          informational: result.summary?.informational ?? 0,
          exported_at: now
        },
        tables: [
          {
            title: 'Request Information',
            values: {
              Host: result.host ?? '-',
              URL: result.url ?? '-',
              'Final URL': result.final_url ?? '-',
              'Request Mode': result.request_mode ?? '-',
              Elapsed: typeof result.elapsed_seconds === 'number' ? `${result.elapsed_seconds.toFixed(1)}s` : '-',
              'Max Minutes': this.normalizeReportValue(result.max_minutes)
            }
          },
          {
            title: 'Severity Summary',
            values: {
              Critical: String(result.summary?.critical ?? 0),
              High: String(result.summary?.high ?? 0),
              Medium: String(result.summary?.medium ?? 0),
              Low: String(result.summary?.low ?? 0),
              Informational: String(result.summary?.informational ?? 0),
              Total: String(result.summary?.total ?? findings.length)
            }
          },
          {
            title: 'Response Details',
            values: {
              'Status Code': this.normalizeReportValue(result.extracted?.status_code),
              Server: this.normalizeReportValue(result.extracted?.server),
              'Content Type': this.normalizeReportValue(result.extracted?.content_type),
              'Content Length': this.normalizeReportValue(result.extracted?.content_length),
              Redirect: this.normalizeReportValue(result.extracted?.redirect_location),
              Title: this.normalizeReportValue(result.extracted?.title)
            }
          },
          {
            title: 'Security Headers',
            values: this.toStringRecord(result.extracted?.security_headers)
          },
          {
            title: 'Interesting Headers',
            values: this.toStringRecord(result.extracted?.interesting_headers)
          },
          {
            title: 'Scanned URLs',
            values: scannedUrls.slice(0, 25).reduce((acc: Record<string, string>, url: string, index: number) => {
              acc[`URL ${index + 1}`] = url;
              return acc;
            }, {})
          },
          ...findings.slice(0, 20).map((finding, index: number) => ({
            title: `Finding ${index + 1}`,
            values: {
              Title: this.normalizeReportValue(finding?.title ?? finding?.header),
              Category: this.normalizeReportValue(finding?.category),
              Risk: this.normalizeReportValue(finding?.risk),
              Confidence: this.normalizeReportValue(finding?.confidence),
              Description: this.truncateReportText(finding?.description, 1000),
              URL: this.normalizeReportValue(finding?.url),
              Source: this.normalizeReportValue(finding?.source),
              Evidence: this.truncateReportText(finding?.evidence, 1000)
            }
          })),
          ...this.buildRawJsonTables(result, 'Vulnerability Raw Result')
        ].filter(table => Object.values(table.values).some((value) => {
          const normalized = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
          return Boolean(normalized) && normalized !== '-';
        }))
      };
    }

    if ((this.activeTab === 'seo' || this.activeTab === 'repo') && this.seoRepoScanMeta) {
      const now = new Date().toISOString();
      const host = this.seoRepoScanMeta.Host || this.extractSeoRepoScanHost(this.seoRepoScanMeta.URL) || 'scan-target';
      const scanLabel = this.activeTab === 'repo' ? 'Repository Scan' : 'SEO Scan';
      const findings = this.seoRepoScanCategories.flatMap((category) => category.items.map((item) => ({ category: category.name, item })));
      const nodes = [
        { id: `host-${host}`, label: host, type: 'domain' as const },
        ...this.seoRepoScanCategories.slice(0, 30).map((category) => ({
          id: `category-${category.name}`,
          label: category.name,
          type: 'category' as const
        })),
        ...findings.slice(0, 60).map(({ item }, index) => ({
          id: `finding-${index + 1}`,
          label: item.header || `Finding ${index + 1}`,
          type: 'finding' as const
        }))
      ];
      const categoryEdges = this.seoRepoScanCategories.slice(0, 30).map((category) => ({
        id: `host-${host}-category-${category.name}`,
        from: `host-${host}`,
        to: `category-${category.name}`,
        label: 'has'
      }));
      const findingEdges = findings.slice(0, 60).map(({ category }, index) => ({
        id: `category-${category}-finding-${index + 1}`,
        from: `category-${category}`,
        to: `finding-${index + 1}`,
        label: 'contains'
      }));

      return {
        graphKind: 'cti',
        title: `${scanLabel} Report`,
        sessionName: host,
        generatedAtIso: now,
        nodes,
        edges: [...categoryEdges, ...findingEdges],
        summary: {
          target_url: this.seoRepoScanMeta.URL || '-',
          host,
          scan_type: this.activeTab,
          grade: this.seoRepoScanGrade || '-',
          high: this.seoRepoScanGradeCounts.high ?? 0,
          medium: this.seoRepoScanGradeCounts.medium ?? 0,
          low: this.seoRepoScanGradeCounts.low ?? 0,
          informational: this.seoRepoScanGradeCounts.informational ?? 0,
          total_findings: findings.length,
          exported_at: now
        },
        tables: [
          {
            title: 'Scan Summary',
            values: {
              URL: this.seoRepoScanMeta.URL || '-',
              Host: host,
              Port: this.normalizeReportValue(this.seoRepoScanMeta.Port),
              TLS: /ssl/i.test(this.seoRepoScanMeta.Port || '') ? 'Enabled' : 'Not detected',
              'Scanned On': this.normalizeReportValue(this.seoRepoScanMeta.Scanned_on_date),
              Grade: this.seoRepoScanGrade || '-'
            }
          },
          {
            title: 'Severity Summary',
            values: {
              High: String(this.seoRepoScanGradeCounts.high ?? 0),
              Medium: String(this.seoRepoScanGradeCounts.medium ?? 0),
              Low: String(this.seoRepoScanGradeCounts.low ?? 0),
              Informational: String(this.seoRepoScanGradeCounts.informational ?? 0),
              Total: String(findings.length)
            }
          },
          ...this.seoRepoScanCategories.slice(0, 20).map((category) => {
            const values = category.items.slice(0, 25).reduce<Record<string, string>>((acc, item, index) => {
              acc[`${index + 1}. ${item.header}`] = [
                item.risk ? `${item.risk} risk` : '',
                item.confidence ? `${item.confidence} confidence` : '',
                this.truncateReportText(item.description, 700)
              ].filter(Boolean).join(' | ');
              return acc;
            }, {});
            return { title: `${category.name} Findings`, values };
          })
        ].filter(table => Object.values(table.values).some((value) => {
          const normalized = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
          return Boolean(normalized) && normalized !== '-';
        }))
      };
    }

    return null;
  }

  private async loadAllDnsIpDetailsForExport(): Promise<void> {
    const pendingRows = this.ipRows.filter(row => !row.detail && !row.error);
    const total = pendingRows.length;

    if (!total) {
      this.exportProgress = 100;
      this.exportCurrentStep = 'Export is ready...';
      return;
    }

    let completed = 0;
    for (const row of pendingRows) {
      this.exportCurrentStep = `Loading details for ${row.ip}...`;
      this.exportProgress = Math.max(6, Math.min(95, Math.round((completed / total) * 100)));

      if (Boolean(row.detail) || Boolean(row.error)) {
        continue;
      }

      try {
        const detail = await this.scanHelper.fetchShodanIpDetail(row.ip);
        if (detail?.ip) {
          row.detail = detail;
        }
      }
      catch (error: unknown) {
        row.error = error instanceof Error ? error.message : 'Failed to load details';
      }

      completed += 1;
      this.exportProgress = Math.max(6, Math.min(100, Math.round((completed / total) * 100)));
    }

    this.exportCurrentStep = 'Export is ready...';
  }

  private resetActiveWork(): void {
    clearInterval(this.vulnerabilityElapsedInterval);
    this.vulnerabilityElapsedInterval = undefined;
    this.vulnerabilityCreatedAtMs = null;
    this.vulnerabilityElapsedSeconds.set(0);
    this.sub?.unsubscribe();
    this.seoRepoScanSub?.unsubscribe();
    this.sub = undefined;
    this.seoRepoScanSub = undefined;
    this.scanner.cancel();
    this.seoRepoScanLoading.set(false);
  }

  private startVulnerabilityElapsedTimer(createdAt: string | Date | number | null | undefined): void {
    if (createdAt) {
      const timestamp = new Date(typeof createdAt === 'string' && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(createdAt) ? `${createdAt}Z` : createdAt).getTime();
      if (Number.isFinite(timestamp)) {
        this.vulnerabilityCreatedAtMs = timestamp;
      }
    }
    if (this.vulnerabilityCreatedAtMs === null) {
      return;
    }

    const updateElapsed = () => {
      this.vulnerabilityElapsedSeconds.set(Math.max(0, Math.floor((Date.now() - (this.vulnerabilityCreatedAtMs ?? Date.now())) / 1000)));
    };
    updateElapsed();
    this.vulnerabilityElapsedInterval ??= setInterval(() => {
      if (!this.isScanning()) {
        clearInterval(this.vulnerabilityElapsedInterval);
        this.vulnerabilityElapsedInterval = undefined;
        return;
      }
      updateElapsed();
    }, 1000);
  }

  private enqueueDnsIpDetail(row: IpRowState): void {
    this.dnsIpDetailQueue$.next(row);
  }

  private bindDnsIpDetailQueue(): void {
    this.dnsIpDetailQueueSub?.unsubscribe();
    this.dnsIpDetailQueueSub = this.dnsIpDetailQueue$.pipe(concatMap((row) => {
      if (!row || Boolean(row.detail) || Boolean(row.error)) {
        return EMPTY;
      }

      row.step = 'processing';

      return this.scanHelper.fetchShodanIpDetail$(row.ip, (response) => {
        row.progress = typeof response?.progress === 'number' ? Math.max(5, Math.min(99, Math.round(response.progress))) : row.progress;
        const responseRecord = asUnknownRecord(response);
        const resultRecord = asUnknownRecord(responseRecord.result);
        const nextStep = responseRecord.step ?? resultRecord.step ?? responseRecord.status ?? resultRecord.status;
        row.step = typeof nextStep === 'string' ? nextStep : row.step;
      }).pipe(tap((detail) => {
        if (detail?.ip) {
          row.detail = detail;
          row.progress = 100;
          row.step = 'Done';
          row.loading = false;
        }
      }),
      catchError((error) => {
        row.loading = false;
        row.error = error?.message ?? 'Failed to load details';
        return EMPTY;
      }));
    })).subscribe();
  }

  private waitForPaint(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => {
      resolve();
    }));
  }

  private joinValues(values: unknown[] | undefined | null): string {
    const normalized = (values ?? [])
      .map(value => String(value ?? '').trim())
      .filter(Boolean);

    return normalized.length ? normalized.join(', ') : '-';
  }

  private toStringRecord(source: Record<string, unknown> | undefined | null): Record<string, string> {
    const entries = Object.entries(source ?? {})
      .map(([key, value]) => {
        if (key.toLowerCase() === 'unknown' && value && typeof value === 'object' && !Array.isArray(value)) {
          const nested = value as Record<string, unknown>;
          const nestedKey = this.normalizeReportValue(nested.key).replace(/_/g, '-');
          if (nestedKey) {
            return [nestedKey, this.normalizeReportValue(nested.value)] as [string, string];
          }
        }
        return [key, this.normalizeReportValue(value)] as [string, string];
      })
      .filter(([, value]) => Boolean(value));

    if (!entries.length) {
      return { Status: '-' };
    }

    return Object.fromEntries(entries);
  }

  private buildIpDetailTables(detail: IpDetail, prefix = ''): { title: string; values: Record<string, string> }[] {
    const titlePrefix = prefix ? `${prefix} ` : '';
    const cameraPorts = this.countCameraPorts(detail);
    const iotPorts = this.countIotPorts(detail);
    const scanPolicy = detail.scan_policy as Record<string, unknown> | undefined;
    const portScan = scanPolicy?.port_scan as Record<string, unknown> | undefined;
    const outcomes = portScan?.outcomes as Record<string, unknown> | undefined;
    const serviceDetection = (portScan?.service_detection ?? scanPolicy?.service_detection ?? detail.service_detection) as Record<string, unknown> | undefined;
    const httpProbe = detail.http_probe as Record<string, unknown> | undefined;

    return [
      {
        title: `${titlePrefix}General Information`.trim(),
        values: {
          IP: detail.ip || '-',
          Country: detail.country ?? '-',
          City: detail.city ?? '-',
          Organization: detail.organization ?? '-',
          ISP: detail.isp ?? '-',
          ASN: detail.asn ?? '-',
          Hosting: detail.hosting_type ?? '-',
          'Cloud Provider': detail.cloud_provider ?? '-',
          'Cloud Region': detail.cloud_region ?? '-',
          'Cloud Service': detail.cloud_service ?? '-',
          'Web Server': detail.web_server ?? '-',
          Title: detail.title ?? '-',
          'Camera Detected': cameraPorts > 0 || !!detail.is_camera || (detail.cameras?.length ?? 0) > 0 ? 'Yes' : 'No',
          'Camera Ports': cameraPorts ? String(cameraPorts) : '-',
          'IoT Ports': iotPorts ? String(iotPorts) : '-',
        }
      },
      {
        title: `${titlePrefix}Scan Quality`.trim(),
        values: {
          Status: this.normalizeReportValue(detail.scan_status ?? detail.status),
          'Coverage Complete': this.formatReportBoolean(portScan?.coverage_complete ?? scanPolicy?.coverage_complete),
          Conclusive: this.formatReportBoolean(portScan?.conclusive ?? scanPolicy?.conclusive),
          'Ports Attempted': this.normalizeReportValue(portScan?.attempted ?? scanPolicy?.ports_attempted),
          'Ports Completed': this.normalizeReportValue(portScan?.completed ?? scanPolicy?.ports_completed),
          'Unknown Outcomes': this.normalizeReportValue(outcomes?.unknown),
          'Service Detection': this.normalizeReportValue(serviceDetection?.completed === undefined ? serviceDetection?.status : (serviceDetection?.completed ? 'Complete' : 'Partial')),
          'HTTP Probe': this.normalizeReportValue(httpProbe?.status)
        }
      },
      {
        title: `${titlePrefix}Exposure Summary`.trim(),
        values: {
          'Open Ports': this.joinValues(detail.open_ports),
          Technologies: this.joinValues(detail.web_technologies),
          Hostnames: this.joinValues(detail.hostnames),
          Vulnerabilities: this.joinValues((detail.vulnerabilities as unknown[] | undefined)?.map(item => this.formatReportVulnerability(item))),
          Misconfigurations: this.joinValues(detail.misconfigurations),
          Cameras: String(detail.cameras?.length ?? 0),
          'Camera Ports': cameraPorts ? String(cameraPorts) : '-',
          'IoT Ports': iotPorts ? String(iotPorts) : '-',
          'Camera Paths': this.joinValues(detail.camera_paths as unknown[] | undefined)
        }
      },
      {
        title: `${titlePrefix}Security & CDN`.trim(),
        values: {
          CDN: this.normalizeReportValue(detail.cdn),
          WAF: this.normalizeReportValue(detail.waf),
          'Load Balancer': this.normalizeReportValue(detail.load_balancer),
          HSTS: detail.hsts ? 'Yes' : 'No',
          Flags: this.joinValues(this.securityItems(detail.security))
        }
      },
      {
        title: `${titlePrefix}HTTP Headers`.trim(),
        values: this.toStringRecord(detail.http_headers)
      },
      {
        title: `${titlePrefix}Cache Headers`.trim(),
        values: this.toStringRecord(detail.cache_headers)
      },
      {
        title: `${titlePrefix}Allowed Methods`.trim(),
        values: {
          Methods: this.joinValues(detail.allowed_methods)
        }
      },
      {
        title: `${titlePrefix}Detected Cameras`.trim(),
        values: (detail.cameras ?? []).slice(0, 20).reduce<Record<string, string>>((acc, camera, index) => {
          acc[`Camera ${index + 1}`] = [
            detail.ip || 'Unknown IP',
            camera.port ? `:${camera.port}` : '',
            camera.brand ?? camera.model_hint ?? camera.model ?? 'Unknown',
            camera.service ? `(${camera.service})` : ''
          ].join(' ').trim();
          return acc;
        }, {})
      },
      ...this.buildPortDetailTables(detail, prefix)
    ].filter(table => Object.values(table.values).some(value => Boolean((value ?? '').trim()) && value.trim() !== '-'));
  }

  private buildPortDetailTables(detail: IpDetail, prefix = ''): { title: string; values: Record<string, string> }[] {
    const titlePrefix = prefix ? `${prefix} ` : '';

    return (detail.ports ?? []).slice(0, 12).map((port, index) => ({
      title: `${titlePrefix}Port ${port.port || index + 1} Details`.trim(),
      values: {
        Port: port.port ? String(port.port) : '-',
        Protocol: port.protocol ?? port.proto ?? '-',
        Service: port.service ?? '-',
        State: port.state ?? '-',
        'Is Camera': Boolean(port.is_camera) || port.device_type === 'camera' ? 'Yes' : 'No',
        'Is IoT': port.is_iot ? 'Yes' : 'No',
        'Device Type': this.normalizeReportValue(port.device_type),
        'Device Category': this.normalizeReportValue(port.device_category),
        'Device Vendor': this.normalizeReportValue(port.device_vendor),
        'Device Family': this.normalizeReportValue(port.device_family),
        'Device Model': this.normalizeReportValue(port.device_model),
        'Device Version': this.normalizeReportValue(port.device_version),
        'Device Tags': this.joinValues(port.device_tags),
        'Device Confidence': this.normalizeReportValue(port.device_confidence),
        'Fingerprint Source': this.normalizeReportValue(port.fingerprint_source),
        'Fingerprint Match': this.normalizeReportValue(port.fingerprint_match),
        'Protocol Verified': port.protocol_verified === undefined ? '-' : (port.protocol_verified ? 'Yes' : 'No'),
        CPE: this.normalizeReportValue(port.cpe),
        Product: this.normalizeReportValue(port.product),
        Version: this.normalizeReportValue(port.version),
        Vendor: this.normalizeReportValue(port.vendor),
        'Risk Flags': this.joinValues(port.risk_flags),
        Misconfigurations: this.joinValues(port.misconfigurations),
        Banner: this.truncateReportText(port.banner),
        'HTTP Server': this.normalizeReportValue(port.http?.server),
        'HTTP Title': this.normalizeReportValue(port.http?.title),
        'TLS Version': this.normalizeReportValue(port.tls?.version),
        'TLS Cipher': this.normalizeReportValue(port.tls?.cipher),
        'TLS Supported Versions': this.joinValues(port.tls?.supported_versions),
        'TLS Ciphers By Version': this.normalizeReportValue(port.tls?.ciphers_by_version),
        'Certificate CN': this.normalizeReportValue(port.tls?.cert_cn),
        'Certificate SAN': this.normalizeReportValue(port.tls?.san),
        'Certificate Issuer': this.normalizeReportValue(port.tls?.issuer),
        'Certificate Subject': this.normalizeReportValue(port.tls?.subject),
        'Certificate Serial': this.normalizeReportValue(port.tls?.serial_number),
        'Certificate Policies': this.joinValues(port.tls?.certificate_policies),
        'CA Issuers': this.joinValues(port.tls?.ca_issuers),
        'CRL Distribution Points': this.joinValues(port.tls?.crl_distribution_points),
        'SCTs': this.normalizeReportValue(port.tls?.scts),
        'Public Key': this.normalizeReportValue(port.tls?.public_key_algorithm
          ? `${port.tls.public_key_algorithm}${port.tls?.public_key_size ? ` (${port.tls.public_key_size} bit)` : ''}`
          : ''),
        'Signature Algorithm': this.normalizeReportValue(port.tls?.signature_algorithm),
        'Key Usage': this.joinValues(port.tls?.key_usage),
        'Extended Key Usage': this.joinValues(port.tls?.extended_key_usage),
        'Subject Key ID': this.normalizeReportValue(port.tls?.subject_key_identifier),
        'Authority Key ID': this.normalizeReportValue(port.tls?.authority_key_identifier),
        'SHA-256 Fingerprint': this.normalizeReportValue(port.tls?.fingerprint_sha256),
        'TLS Risk Flags': this.joinValues(port.tls?.risk_flags),
        'Weak Protocols': this.joinValues(port.tls?.weak_protocols),
        'Self Signed': port.tls?.is_self_signed === undefined ? '-' : (port.tls?.is_self_signed ? 'Yes' : 'No'),
        'Certificate CA': port.tls?.is_ca === undefined ? '-' : (port.tls?.is_ca ? 'Yes' : 'No'),
        'Certificate Expiry': this.normalizeReportValue(port.tls?.not_after ?? port.tls?.cert_expires),
        'Certificate Not Before': this.normalizeReportValue(port.tls?.not_before),
        'Discovered Paths': this.joinValues(port.discovered_paths),
      }
    })).filter(table => Object.values(table.values).some(value => Boolean((value || '').trim()) && value.trim() !== '-'));
  }

  private buildRawJsonTables(source: unknown, title: string): GraphReportTableRow[] {
    if (source === null || source === undefined) {
      return [];
    }

    let json: string;
    try {
      json = JSON.stringify(source, null, 2);
    }
    catch {
      json = String(source);
    }

    if (!json.trim()) {
      return [];
    }

    return [{
      title: title.trim(),
      values: { JSON: json },
      excludeFromPdf: true
    }];
  }

  private truncateReportText(value: unknown, maxLength = 1200): string {
    const normalized = this.normalizeReportValue(value);
    if (!normalized || normalized === '-') {
      return '-';
    }
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
  }

  private normalizeReportValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map(item => this.normalizeReportValue(item)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, nested]) => {
          const normalized = this.normalizeReportValue(nested);
          return normalized ? `${key}: ${normalized}` : '';
        })
        .filter(Boolean)
        .join(', ');
    }
    return String(value).trim();
  }

  private formatReportVulnerability(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (value && typeof value === 'object') {
      const vulnerability = value as VulnerabilityFinding;
      const cve = typeof vulnerability.cve === 'string' ? vulnerability.cve.trim() : '';
      const cvss = vulnerability.cvss !== null && vulnerability.cvss !== undefined ? `CVSS ${vulnerability.cvss}` : '';
      return [cve, cvss].filter(Boolean).join(' • ');
    }
    return '';
  }

  private formatReportBoolean(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return this.normalizeReportValue(value);
  }

  private securityItems(sec: string[] | Record<string, boolean> | undefined | null): string[] {
    if (!sec) {
      return [];
    }
    if (Array.isArray(sec)) {
      return sec;
    }
    return Object.entries(sec).filter(([, value]) => value).map(([key]) => key);
  }

  private countCameraPorts(detail: IpDetail | null | undefined): number {
    return (detail?.ports ?? []).filter((port) => port && ((port.is_camera ?? false) || port.device_type === 'camera')).length;
  }

  private countIotPorts(detail: IpDetail | null | undefined): number {
    return (detail?.ports ?? []).filter((port) => port?.is_iot).length;
  }
}
