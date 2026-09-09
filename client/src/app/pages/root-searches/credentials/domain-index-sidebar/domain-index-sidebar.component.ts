import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { StealerLogCallbackModel, StealerLogResultItem } from '../../../../shared/model/results/credentials/credential.callback.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { isIpv4Address } from '../../../../shared/utils/network-validation.util';

@Component({
  selector: 'app-domain-index-sidebar',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './domain-index-sidebar.component.html',
})
export class DomainIndexSidebarComponent {
  private uniqueDomains: string[] = [];

  domainSidebarSearch = '';
  domainIndexExpanded = false;

  @Input() set stealerData(value: StealerLogCallbackModel | null) {
    this.uniqueDomains = this.collectUniqueDomains(value?.Result ?? []);
  }

  get uniqueDomainCount(): number {
    return this.uniqueDomains.length;
  }

  get filteredUniqueDomains(): string[] {
    const search = this.domainSidebarSearch.trim().toLowerCase();
    if (!search) {
      return this.uniqueDomains;
    }
    return this.uniqueDomains.filter(domain => domain.includes(search));
  }

  toggleDomainIndex(): void {
    this.domainIndexExpanded = !this.domainIndexExpanded;
  }

  private collectUniqueDomains(records: StealerLogResultItem[]): string[] {
    const domains = new Set<string>();
    records.forEach(item => {
      this.normalizeDomainValues(item?.source_domain).forEach(domain => domains.add(domain));
      this.normalizeDomainValues(item?.domain).forEach(domain => domains.add(domain));
    });
    return Array.from(domains).sort((a, b) => a.localeCompare(b));
  }

  private normalizeDomainValues(value: unknown): string[] {
    const values = Array.isArray(value) ? value : [value];
    return Array.from(new Set(values.map(item => this.normalizeDomain(item)).filter(Boolean)));
  }

  private normalizeDomain(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    let domain = String(value).trim().toLowerCase();
    if (!domain || domain === '-') {
      return '';
    }
    domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    domain = domain.replace(/^[^@/\s]+@/, '');
    domain = domain.split(/[/?#]/)[0] ?? '';
    domain = domain.split(':')[0] ?? '';
    domain = domain.replace(/^\.+|\.+$/g, '').replace(/^www\./, '');
    if (!domain || !domain.includes('.') || /\s/.test(domain) || isIpv4Address(domain)) {
      return '';
    }
    return domain;
  }
}
