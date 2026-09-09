import { Component, OnDestroy, effect, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, Subject } from 'rxjs';
import { DnsRecord, WaybackSnapshot } from '../../model/scanners/scanner.models';
import { ScanHelperMethodsService } from './scan-helper-methods-service.service';
import { AppService } from '../../../services/core/app/app.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { isDomainName, isIpv4Address, isIpv6Address } from '../../utils/network-validation.util';

@Component({
  selector: 'app-scan-helper',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './scan-helper-methods.component.html'
})
export class ScanHelperMethods implements OnDestroy {
  private destroy$ = new Subject<void>();
  private subs: Subscription[] = [];

  activeTab: 'subdomains' | 'dns' | 'wayback' = 'subdomains';
  domain = '';
  isValidDomain = true;
  toast = '';
  isLoading = false;
  errorMessage = '';
  progress = 0;
  statusMessage = 'Initializing...';
  subdomains: string[] = [];
  subdomainCount = 0;
  checkLive = false;
  dnsRecords: DnsRecord[] = [];
  waybackSnapshots: WaybackSnapshot[] = [];
  cancelRequested = false;
  showInvalid = false;
  readonly isOpen = input(false);
  readonly close = output<undefined>();
  readonly search = output<string[]>();

  get isLightTheme(): boolean {
    return this.appService.userSessionData()?.user?.theme === 'light-theme';
  }

  constructor(private scanService: ScanHelperMethodsService, private appService: AppService) {
    effect(() => {
      this.progress = this.scanService.progress();
    });
    effect(() => {
      const res = this.scanService.onDone();
      if (!res) {
        return;
      }
      if (this.cancelRequested) {
        this.isLoading = false;
        this.statusMessage = 'Cancelled by user';
        this.progress = 0;
        this.cancelRequested = false;
        return;
      }
      const status = res?.status ?? res?.result?.status ?? 'unknown';
      const progressVal = res?.progress ?? null;
      if (progressVal != null && typeof progressVal === 'number') {
        this.progress = Math.min(99, progressVal);
      }
      if (status === 'pending') {
        this.statusMessage = res?.step === 'queued'
          ? 'Queued...'
          : res?.step
            ? `Processing (${res.step})`
            : 'Pending...';
        return;
      }
      this.isLoading = false;
      if (this.activeTab === 'subdomains') {
        if (this.isCompletedStatus(status)) {
          if (this.checkLive) {
            this.subdomains = res?.result?.live_subdomains ?? res?.live_subdomains ?? [];
            this.subdomainCount = this.subdomains.length;
          }
          else {
            this.subdomains = res?.result?.subdomains ?? res?.subdomains ?? [];
            this.subdomainCount = this.subdomains.length;
          }
          this.search.emit(this.subdomains);
          this.statusMessage = this.subdomainCount > 0
            ? (this.checkLive ? `Found ${this.subdomainCount} live subdomains` : `Found ${this.subdomainCount} subdomains`)
            : 'No records found';
        }
        else {
          this.statusMessage = 'No records found';
        }
      }
      else if (this.activeTab === 'dns') {
        const dnsRecord = res?.result?.result ?? res?.result;
        if (res?.status === 'error' || dnsRecord?.status === 'error') {
          this.errorMessage = dnsRecord?.message ?? res?.error ?? 'Resolution failed';
          this.statusMessage = 'Failed';
        }
        else if (dnsRecord != null && (Boolean(dnsRecord.ip) || Boolean(dnsRecord.hostname) || Boolean(dnsRecord.domains?.length))) {
          const domains = Array.isArray(dnsRecord.domains) ? dnsRecord.domains : [];
          this.dnsRecords = [{
            ip: dnsRecord.ip ?? this.domain.trim(),
            hostname: dnsRecord.hostname ?? '',
            domains,
            error: dnsRecord.error,
          }];
          this.statusMessage = domains.length
            ? `Found ${domains.length} connected domain${domains.length !== 1 ? 's' : ''}`
            : (dnsRecord.hostname ? `Resolved: ${dnsRecord.hostname}` : 'IP Lookup Complete');
        }
        else {
          this.statusMessage = 'No records found';
        }
      }
      else if (this.activeTab === 'wayback') {
        if (this.isCompletedStatus(status)) {
          this.waybackSnapshots = res?.result?.snapshots ?? res?.snapshots ?? [];
          this.statusMessage = this.waybackSnapshots.length > 0
            ? `Found ${this.waybackSnapshots.length} snapshot${this.waybackSnapshots.length !== 1 ? 's' : ''}`
            : 'No records found';
        }
        else {
          this.statusMessage = 'No records found';
        }
      }
    });
    effect(() => {
      const err = this.scanService.onError();
      if (!err) {
        return;
      }
      this.isLoading = false;
      if (this.cancelRequested || err?.message === 'Cancelled by user') {
        this.statusMessage = 'Cancelled by user';
        this.progress = 0;
        this.cancelRequested = false;
      }
      else {
        this.statusMessage = 'No records found';
      }
    });
  }

  private isCompletedStatus(status: string | undefined): boolean {
    return status === 'success' || status === 'done';
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => {
      s.unsubscribe();
    });
    this.scanService.cancelCurrentScan?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  switchTab(tab: 'subdomains' | 'dns' | 'wayback'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.showInvalid = false;
    this.statusMessage = "";
  }

  onEnterKey(): void {
    if (this.domain.trim() && !this.isLoading) {
      this.startScan();
    }
  }

  onClose(): void {
    this.resetState();

    this.close.emit(undefined);
  }

  cancelScan(): void {
    if (!this.isLoading) {
      return;
    }
    this.cancelRequested = true;
    this.isLoading = false;
    this.progress = 0;
    this.statusMessage = 'Cancelled by user';
    this.scanService.cancelCurrentScan?.();
  }

  private resetState(): void {
    this.domain = '';
    this.isValidDomain = true;
    this.toast = '';
    this.isLoading = false;
    this.errorMessage = '';
    this.progress = 0;
    this.statusMessage = 'Initializing...';
    this.subdomains = [];
    this.subdomainCount = 0;
    this.dnsRecords = [];
    this.waybackSnapshots = [];
    this.activeTab = 'subdomains';
    this.cancelRequested = false;
    this.showInvalid = false;
  }

  validateDomain(): void {
    const trimmed = this.domain.trim();
    if (!trimmed) {
      this.isValidDomain = true;
      return;
    }
    if (this.activeTab === 'dns') {
      this.isValidDomain = isIpv4Address(trimmed) || isIpv6Address(trimmed);
    }
    else {
      const domainOnly = trimmed.replace(/^https:\/\//i, '').replace(/^http:\/\//i, '').split('/')[0];
      this.isValidDomain = isDomainName(domainOnly);
    }
  }

  get progressWidthValue(): number {
    const progress = Number(this.progress);
    return Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
  }

  getSubdomainUrl(subdomain: string): string {
    return (/^https?:\/\//i.exec(subdomain)) ? subdomain : `https://${subdomain}`;
  }

  getAllWaybackUrls(): string {
    return this.waybackSnapshots.map(s => s.url).join('\n');
  }

  copy(text: string, message = 'Copied'): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toast = message;
      setTimeout(() => {
        this.toast = '';
      }, 900);
    }).catch(() => {
      this.toast = 'Failed to copy';
      setTimeout(() => {
        this.toast = '';
      }, 1500);
    });
  }

  startScan(): void {
    this.showInvalid = true;
    this.errorMessage = '';
    this.statusMessage = 'Initializing...';
    this.subdomains = [];
    this.subdomainCount = 0;
    this.dnsRecords = [];
    this.waybackSnapshots = [];
    const input = this.domain.trim();
    if (!input) {
      this.errorMessage = this.activeTab === 'dns' ? 'Please enter an IP address' : 'Please enter a domain';
      return;
    }
    this.validateDomain();
    if (!this.isValidDomain) {
      this.errorMessage = this.activeTab === 'dns' ? 'Invalid IP address format' : 'Please enter a valid domain (e.g., example.com)';
      return;
    }
    const resolved = this.resolveRequestedUrl(input);
    this.isLoading = true;
    this.cancelRequested = false;
    this.statusMessage = this.activeTab === 'dns' ? 'Queued...' : 'Initiating scan...';
    if (this.activeTab === 'subdomains') {
      this.subs.push(this.scanService.scanSubdomains(resolved, this.checkLive));
    }
    else if (this.activeTab === 'dns') {
      this.subs.push(this.scanService.scanDns(input));
    }
    else if (this.activeTab === 'wayback') {
      this.subs.push(this.scanService.scanWayback(resolved));
    }
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
}
