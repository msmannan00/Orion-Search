import { CommonModule } from '@angular/common';
import { Component, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IpDetail } from '../../../../shared/model/network-intel/network-intel.model';
import { NetworkIntelScanService } from '../../../../shared/services/network-intel/network-intel-scan.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { asUnknownRecord, getOwnProperty } from '../../../../shared/utils/type-guards.util';

@Component({
  selector: 'app-ip-detail',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ip-detail.component.html',
})
export class IpDetailComponent {
  private readonly renderedTopLevelKeys = new Set([ 'ip',  'status', 'ip_info', 'hostnames', 'country', 'city', 'organization', 'isp', 'asn', 'cloud_provider', 'cloud_region', 'cloud_service', 'hosting_type', 'web_technologies', 'vulnerabilities', 'misconfigurations', 'security', 'cdn', 'waf', 'paas', 'amazon_s3', 'load_balancer', 'hsts', 'web_server', 'favicon_hash', 'allowed_methods', 'cookies', 'title', 'http_headers', 'cache_headers', 'link_headers', 'camera_paths', 'cameras', 'is_camera', 'ports', 'open_ports', ]);

  readonly detailInput = input<IpDetail | undefined>(undefined, { alias: 'detail' });
  detail!: IpDetail;

  constructor(public ui: NetworkIntelScanService, private sanitizer: DomSanitizer) {
    effect(() => {
      const detail = this.detailInput();
      if (detail !== undefined) {
        this.detail = detail;
      }
    });
  }

  get cameraPortCount(): number {
    return (this.detail?.ports ?? []).filter((port) => port && ((port.is_camera ?? false) || port.device_type === 'camera')).length;
  }

  get iotPortCount(): number {
    return (this.detail?.ports ?? []).filter((port) => port?.is_iot).length;
  }

  get hasCameraSignals(): boolean {
    return !!this.detail?.is_camera || this.cameraPortCount > 0 || (this.detail?.cameras?.length ?? 0) > 0;
  }

  get extraDetailEntries(): [string, string][] {
    return this.buildRenderableEntries(this.detail, (key) => !this.renderedTopLevelKeys.has(key));
  }

  get generalInfoExtraEntries(): [string, string][] {
    return this.buildRenderableEntries(this.detail?.ip_info, (key, value) => !this.isDuplicateGeneralInfoField(key, value));
  }

  get securityFlags(): string[] {
    const items = this.ui.securityItems(this.detail?.security);
    if (!this.detail?.hsts) {
      return items;
    }

    return items.filter(item => {
      const normalized = String(item).trim().toLowerCase().replace(/[\s_-]+/g, '');
      return normalized !== 'hsts' && normalized !== 'stricttransportsecurity';
    });
  }

  formatVulnerability(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (value && typeof value === 'object') {
      const record = asUnknownRecord(value);
      const cve = typeof record.cve === 'string' ? record.cve.trim() : '';
      const rawCvss = record.cvss;
      const cvssValue = typeof rawCvss === 'string' || typeof rawCvss === 'number' ? String(rawCvss).trim() : '';
      const cvss = cvssValue ? `CVSS ${cvssValue}` : '';

      return [cve, cvss].filter(Boolean).join(' • ');
    }

    return '';
  }

  renderHeaderEntries(source: Record<string, unknown> | undefined | null): [string, string][] {
    return this.ui.safeEntries(source)
      .map(([key, value]) => [key.trim(), this.formatDisplayValue(value)] as [string, string])
      .filter(([key, value]) => Boolean(key && value));
  }

  formatDisplayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map(item => this.formatDisplayValue(item)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, nestedValue]) => `${key}: ${this.formatDisplayValue(nestedValue)}`.trim())
        .filter(item => !item.endsWith(':'))
        .join(', ');
    }
    return String(value).trim();
  }

  getCameraIframeUrl(ip: string, port: string | number): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`http://${ip}:${port}`);
  }

  private hasRenderableValue(value: unknown): boolean {
    return this.ui.hasRenderableValue(value);
  }

  private buildRenderableEntries(source: Record<string, unknown> | undefined | null, includeEntry: (key: string, value: unknown) => boolean): [string, string][] {
    return this.ui.safeEntries(source)
      .filter(([key, value]) => includeEntry(key, value) && this.hasRenderableValue(value))
      .map(([key, value]) => [this.formatLabel(key), this.formatDisplayValue(value)] as [string, string])
      .filter(([, value]) => Boolean(value));
  }

  private formatLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private isDuplicateGeneralInfoField(key: string, value: unknown): boolean {
    const duplicateFields: Record<string, unknown> = {
      country: this.detail?.country,
      city: this.detail?.city,
      org: this.detail?.organization,
      isp: this.detail?.isp,
      as: this.detail?.asn,
    };

    return key in duplicateFields && this.formatDisplayValue(getOwnProperty(duplicateFields, key)) === this.formatDisplayValue(value);
  }
}
