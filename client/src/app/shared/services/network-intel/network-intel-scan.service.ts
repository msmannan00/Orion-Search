import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom, Observable, Subscription } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';
import { GeoCameraResponse, NetworkIntelScanResponse, ResolveIpResponse } from '../../model/network-intel/network-intel-api.models';
import { IpDetail, IpPortData, ScanTaskResponse, VulnerabilityScanDepth } from '../../model/network-intel/network-intel.model';
import { ScanHelperMethodsService } from '../../partials/scan-helper-methods/scan-helper-methods-service.service';
import { ScanNotificationService } from '../scan-notification.service';
import { SubdomainResponse } from '../../model/scanners/scanner.models';
import { asUnknownRecord } from '../../utils/type-guards.util';
import { isDecimalString, isDomainName, isIpv4Address } from '../../utils/network-validation.util';

@Injectable({ providedIn: 'root' })
export class NetworkIntelScanService extends ScanHelperMethodsService {
  private readonly scanNotifications = inject(ScanNotificationService);

  isRunning = signal(false);

  protected override getPendingStatus<T extends { result?: { status?: string; progress?: number; step?: string } | null; status?: string; progress?: number; step?: string }>(res: T): string | undefined {
    const status = super.getPendingStatus(res);
    const progress = Number(res.result?.progress ?? res.progress);
    const step = String(res.result?.step ?? res.step ?? '').toLowerCase();
    if ((status === 'pending' || status === 'busy') && progress >= 100 && step.includes('done')) {
      return 'done';
    }
    return status;
  }

  resetState(): void {
    this.currentCancel$ = undefined;
    this.progress.set(0);
    this.isRunning.set(false);
    this.onDone.set(null);
    this.onError.set(null);
  }

  protected override beforeTaskStart(): void {
    this.isRunning.set(true);
  }

  protected override afterTaskStop(): void {
    this.isRunning.set(false);
  }

  protected override handleTaskValue<T extends object>(value: T): void {
    const responseError = this.getResponseError(value);
    if (responseError) {
      this.onDone.set(null);
      this.onError.set(responseError);
      return;
    }
    super.handleTaskValue(value);
  }

  scanResolveIp(domain: string): Subscription {
    return this.runTrackedScan<ResolveIpResponse>('netintel/resolve_ip', { domain }, {
      title: 'Host Recon',
      target: domain,
      page_reference: 'network-intel',
      section: 'host-recon',
    });
  }

  scanShodanIp(ip: string): Subscription {
    return this.runTrackedScan<NetworkIntelScanResponse>('netintel/ipscanner', { ip }, {
      title: 'Deep IP Scan',
      target: ip,
      page_reference: 'network-intel',
      section: 'deep-scan',
    });
  }

  scanUrlVulnerability(domain: string, depth: VulnerabilityScanDepth): Subscription {
    return this.runTrackedScan<ScanTaskResponse>('netintel/url_vulnerability_scan', { domain, depth }, {
      title: 'URL Vulnerability Scan',
      target: domain,
      page_reference: 'network-intel',
      section: 'vulnerability-scan',
    });
  }

  async fetchShodanIpDetail(ip: string, onEach?: (response: NetworkIntelScanResponse) => void): Promise<IpDetail> {
    return this.fetchPolledResult(() => this.api.post<NetworkIntelScanResponse>('netintel/ipscanner', { ip }), onEach);
  }

  fetchShodanIpDetail$(ip: string, onEach?: (response: NetworkIntelScanResponse) => void): Observable<IpDetail> {
    return this.scanNotifications.runApiScanAsResponse<NetworkIntelScanResponse>({
      apiReference: 'netintel/ipscanner',
      payload: { ip },
      metadata: { title: 'Deep IP Scan', target: ip, section: 'deep-scan' },
      pollDelayMs: this.pollDelayMs,
    }).pipe(tap(response => onEach?.(response)), map(response => this.unwrapIpDetail(response)));
  }

  scanThreatLensGeoCamera(coordinates: string, radius_km = 25, max_ips = 200): Subscription {
    return this.runTrackedScan<GeoCameraResponse>('netintel/iot_detect', { coordinates, radius_km, max_ips }, {
      title: 'Threat Lens IP Scan',
      target: coordinates,
      page_reference: 'threat-lens',
      section: 'ip-scan',
    }, 250, true);
  }

  scanGeoCamera(coordinates: string, radius_km = 25, max_ips = 200): Subscription {
    return this.runTrackedScan<GeoCameraResponse>('netintel/iot_detect', { coordinates, radius_km, max_ips }, {
      title: 'Geo Camera Scan',
      target: coordinates,
      page_reference: 'network-intel',
      section: 'geo-cameras',
    }, 250);
  }

  scanGeoCameraByRanges(ip_ranges: string[], max_ips = 200): Subscription {
    return this.runTrackedScan<GeoCameraResponse>('netintel/camera_detect_ranges', { ip_ranges, max_ips }, {
      title: 'Geo Camera Range Scan',
      target: ip_ranges.slice(0, 3).join(', '),
      page_reference: 'network-intel',
      section: 'geo-cameras',
    });
  }

  override scanSubdomains(resolved: string, checkLive: boolean): Subscription {
    return this.runTrackedScan<SubdomainResponse>('urlscan/subdomains', { domain: resolved, scanType: 'subdomains', checkLive }, {
      title: 'Subdomain Scan',
      target: resolved,
      page_reference: 'network-intel',
      section: 'vulnerability-scan',
    });
  }

  hasRenderableValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  }

  isEmbeddedInConsolidated(url: string): boolean {
    return url.includes('/consolidated');
  }

  getProgressValue(progress: number | null | undefined): number {
    return Math.max(6, Math.min(100, Math.round(progress ?? 0)));
  }

  getLoadingStepLabel(step: string | null | undefined): string {
    const raw = (step ?? '').trim();
    if (!raw) {
      return 'Scanning in progress...';
    }
    const normalized = raw.toLowerCase();
    if (normalized === 'queued' || normalized.includes('queue')) {
      return 'Queued: waiting for scanner availability...';
    }
    return raw;
  }

  shouldShowLoadingSkeleton(hasSearched: boolean, result: unknown, errorMessage: string | null | undefined, isScanning: boolean, progress: number | null | undefined): boolean {
    return hasSearched && !result && !errorMessage && (isScanning || (progress ?? 0) > 0);
  }

  validateDnsInput(value: string): string | null {
    const trimmed = this.getTrimmedInputOrNull(value);
    if (!trimmed) {
      return null;
    }
    if (this.getInputKind(trimmed) === 'ip') {
      return `"${trimmed}" is an IP address — enter a domain like netflix.com`;
    }
    if (!this.isValidDomain(trimmed)) {
      return 'Enter a valid domain name e.g. netflix.com';
    }
    return null;
  }

  validateShodanInput(value: string): string | null {
    const trimmed = this.getTrimmedInputOrNull(value);
    if (!trimmed) {
      return null;
    }
    const inputKind = this.getInputKind(trimmed);
    if (inputKind !== 'ip') {
      if (inputKind === 'domain') {
        return `"${trimmed}" is a domain — use Host Recon to resolve it first, then scan an IP`;
      }
      return 'Enter a valid IPv4 address e.g. 52.18.185.222';
    }
    return null;
  }

  validateVulnerabilityInput(value: string): string | null {
    const trimmed = this.getTrimmedInputOrNull(value);
    if (!trimmed) {
      return null;
    }
    const inputKind = this.getInputKind(trimmed);
    if (inputKind === 'domain') {
      return null;
    }
    if (inputKind === 'ip') {
      return `"${trimmed}" is an IP address. Enter a domain like bbc.com`;
    }
    if (inputKind === 'coordinates') {
      return `"${trimmed}" looks like coordinates. Enter a domain like bbc.com`;
    }
    return 'Enter a valid domain e.g. bbc.com';
  }

  validateGithubRepositoryInput(value: string): string | null {
    const trimmed = this.getTrimmedInputOrNull(value);
    if (!trimmed) {
      return null;
    }
    try {
      const url = new URL((/^https?:\/\//i.exec(trimmed)) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`);
      const host = url.hostname.toLowerCase();
      const pathParts = url.pathname.split('/').filter(Boolean);
      if ((host === 'github.com' || host === 'www.github.com') && pathParts.length >= 2) {
        return null;
      }
    }
    catch {
      return 'Enter a valid GitHub repository URL';
    }
    return 'Enter a valid GitHub repository URL';
  }

  validateGeoCoordinatesInput(value: string): string | null {
    const trimmed = this.getTrimmedInputOrNull(value);
    if (!trimmed) {
      return null;
    }
    const inputKind = this.getInputKind(trimmed);
    if (inputKind === 'ip') {
      return `"${trimmed}" is an IP address — enter coordinates like 31.48, 74.17`;
    }
    if (inputKind === 'domain') {
      return `"${trimmed}" is a domain — enter coordinates like 31.48, 74.17`;
    }
    if (!this.isValidCoordinates(trimmed)) {
      return 'Enter coordinates as: latitude, longitude — e.g. 31.48, 74.17';
    }
    return null;
  }

  validateIpRanges(value: string): { error: string | null; parsedRanges: { value: string; valid: boolean }[] } {
    const lines = value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      return { error: null, parsedRanges: [] };
    }

    const parsedRanges = lines.map(line => {
      return { value: line, valid: this.isValidIpRangeEntry(line) };
    });
    const invalid = parsedRanges.find(rangeItem => !rangeItem.valid);
    return {
      error: invalid ? 'Invalid format: use CIDR (x.x.x.x/n)' : null,
      parsedRanges
    };
  }

  safeEntries(obj: Record<string, unknown> | undefined | null): [string, unknown][] {
    if (!obj) {
      return [];
    }
    return Object.entries(obj).filter(([key, value]) => {
      if (!key?.trim()) {
        return false;
      }
      if (value === null || value === undefined || value === false) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      return true;
    });
  }

  hasItems(arr: unknown[] | undefined | null): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  renderablePorts(ports: IpPortData[] | undefined | null): IpPortData[] {
    return (ports ?? []).filter(port => this.hasPortDetail(port));
  }

  securityItems(sec: string[] | Record<string, boolean> | undefined | null): string[] {
    if (!sec) {
      return [];
    }
    if (Array.isArray(sec)) {
      return sec;
    }
    return Object.entries(sec).filter(([, value]) => value).map(([key]) => key);
  }

  private getResponseError(value: unknown): { message: string } | null {
    const response = asUnknownRecord(value);
    const result = asUnknownRecord(response.result);
    const status = String(result.status ?? response.status ?? '');
    if (status !== 'error') {
      return null;
    }
    return { message: String(result.message ?? response.message ?? 'Request failed') };
  }

  private runTrackedScan<T extends object>( apiReference: string, payload: Record<string, unknown>, metadata: Record<string, unknown>, pollDelayMs = this.pollDelayMs, reusePrevious = false, ): Subscription {
    return this.runTask<T>((cancel$) => this.scanNotifications.runApiScanAsResponse<T>({
      apiReference,
      payload,
      metadata,
      pollDelayMs,
      reusePrevious,
    }).pipe(tap((response: T) => {
      const record = asUnknownRecord(response);
      const result = asUnknownRecord(record.result);
      const progress = result.progress ?? record.progress;
      this.updateProgress(typeof progress === 'number' ? progress : null);
    }),
    takeUntil(cancel$),));
  }

  private async fetchPolledResult<T extends ScanTaskResponse>(call: () => Observable<T>, onEach?: (response: T) => void): Promise<IpDetail> {
    const cancel$ = this.createCancelSubject();
    try {
      const response = await lastValueFrom(this.poll<T>(call, (value) => this.getPendingStatus(value), (value) => onEach?.(value), cancel$, this.pollDelayMs));
      return this.unwrapIpDetail(response);
    }
    finally {
      this.completeCancelSubject(cancel$);
    }
  }

  private unwrapIpDetail<T extends ScanTaskResponse>(response: T): IpDetail {
    const responseError = this.getResponseError(response);
    if (responseError) {
      throw new Error(responseError.message);
    }
    const payload = response.result ?? response;
    if (!payload.ip) {
      throw new Error('IP scan returned no IP details');
    }
    return { ...payload, ip: payload.ip };
  }

  private isValidDomain(value: string): boolean {
    return !isIpv4Address(value) && isDomainName(value);
  }

  private isValidIp(value: string): boolean {
    return isIpv4Address(value);
  }

  private isValidIpRangeEntry(value: string): boolean {
    const cidrParts = value.split('/');
    if (cidrParts.length === 2) {
      const [address, prefix] = cidrParts;
      const prefixLength = Number(prefix);
      return isIpv4Address(address)
        && isDecimalString(prefix)
        && String(prefixLength) === prefix
        && prefixLength >= 0
        && prefixLength <= 32;
    }

    const rangeParts = value.split('-');
    if (rangeParts.length === 2) {
      return rangeParts.every(isIpv4Address);
    }
    return isIpv4Address(value);
  }

  private isValidCoordinates(value: string): boolean {
    const parts = value.trim().split(/[\s,]+/);
    if (parts.length !== 2 || parts.some(part => part.trim() === '')) {
      return false;
    }
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  private getTrimmedInputOrNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed || null;
  }

  private getInputKind(value: string): 'ip' | 'domain' | 'coordinates' | 'other' {
    if (this.isValidIp(value)) {
      return 'ip';
    }
    if (this.isValidDomain(value)) {
      return 'domain';
    }
    if (this.isValidCoordinates(value) || value.includes(',')) {
      return 'coordinates';
    }
    return 'other';
  }

  private hasPortDetail(port: IpPortData | null | undefined): boolean {
    if (!port) {
      return false;
    }
    const values = [port.port, port.protocol, port.proto, port.service, port.state, port.banner, port.http, port.tls];

    return values.some(Boolean) || (Array.isArray(port.risk_flags) && port.risk_flags.length > 0);
  }
}
