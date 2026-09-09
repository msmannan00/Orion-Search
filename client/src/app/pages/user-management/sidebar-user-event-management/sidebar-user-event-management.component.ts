import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { AppService } from '../../../services/core/app/app.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { event_management_filters } from '../../../shared/constants/filters';
import { EmptyQueryComponent } from '../../../shared/partials/empty-query/empty-query.component';
import { EmptyResultComponent } from '../../../shared/partials/empty-result/empty-result.component';
import { FiltersComponent } from '../../../shared/partials/filters/filters.component';
import { IocSearchComponent } from '../../../shared/partials/ioc-search/ioc-search.component';
import { LoadingFormComponent } from '../../../shared/partials/loading-form/loading-form.component';
import { PaginationComponent } from '../../../shared/partials/pagination/pagination.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AiToolRoutingService } from '../../../shared/services/ai-tool-routing.service';
import { ApiService } from '../../../shared/services/api.service';
import { SidebarService } from '../../../shared/services/sidebar.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { ValuePresentationBase } from '../../../shared/utils/value-presentation.base';
import { DOMAIN_NAME_PATTERN, EMAIL_ADDRESS_PATTERN, IPV4_ADDRESS_PATTERN } from '../../../shared/utils/network-validation.util';
import type { SiemEventRecord, SiemSearchResponse } from './model/sidebar-user-event-management.model';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';

export type { SiemEventRecord,SiemSearchResponse } from './model/sidebar-user-event-management.model';






@Component({
  selector: 'app-sidebar-user-event-management',
  standalone: true,
  imports: [CommonModule, PaginationComponent, FiltersComponent, EmptyQueryComponent, EmptyResultComponent, LoadingFormComponent, IocSearchComponent, TranslatePipe],
  templateUrl: './sidebar-user-event-management.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./sidebar-user-event-management.component.css'],
})
export class SidebarUserEventManagementComponent extends ValuePresentationBase implements OnInit, AfterViewInit {
  readonly searchBuilderTags = ['all', 'domain', 'email', 'ip'];
  readonly searchBuilderValueValidators: RegExp[] = [EMAIL_ADDRESS_PATTERN, DOMAIN_NAME_PATTERN, IPV4_ADDRESS_PATTERN];
  readonly searchBuilderTagValidators: Record<string, RegExp> = { email: EMAIL_ADDRESS_PATTERN, domain: DOMAIN_NAME_PATTERN, ip: IPV4_ADDRESS_PATTERN };
  query = '';
  displayQuery = '';
  loading = false;
  queryTriggered = false;
  errorMessage = '';
  expandedResultIndex: number | null = null;
  responseData: SiemSearchResponse | null = null;
  readonly batchSize = 500;
  readonly emptyQueryBatchSize = 100;
  currentPage = 1;
  readonly filterModel = event_management_filters;
  readonly isFilterOpen$: Observable<boolean>;
  sidebarReady = false;
  trackByIndex = (index: number) => index;

  constructor(private apiService: ApiService, private appService: AppService, private licenseService: LicenseService, private router: Router, private dashboardService: DashboardService, public sidebarService: SidebarService, protected aiToolRoutingService: AiToolRoutingService, private translationService: TranslationService) {
    super();
    this.isFilterOpen$ = this.sidebarService.sidebarState$;
  }

  get searchBuilderLabels(): Record<string, string> {
    this.translationService.version();
    return Object.fromEntries(Object.entries({ all: 'All', domain: 'Domain', email: 'Email', ip: 'IP Address', event_type: 'Event Type', source: 'Source', host: 'Host', user: 'User' })
      .map(([key, label]) => [key, this.translationService.translate(label)]));
  }

  ngOnInit(): void {
    if (!this.canAccessEventManagement()) {
      this.router.navigate(['/dashboard/profile/account']).then();
      return;
    }

    this.triggerSearch('');
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.sidebarReady = true;
    });
  }

  get records(): SiemEventRecord[] {
    return this.responseData?.cards_data ?? [];
  }

  get totalHits(): number {
    return Number(this.responseData?.total_hits ?? 0);
  }

  get pageCount(): number {
    return Number(this.responseData?.page_count ?? 0);
  }

  get currentBatchSize(): number {
    return Number(this.responseData?.batch_size ?? (this.query.trim() ? this.batchSize : this.emptyQueryBatchSize));
  }

  get activeDateRange(): string {
    return this.dashboardService.selectedFilters().daterange ?? '';
  }

  canAccessEventManagement(): boolean {
    return (this.licenseService.isAdmin() || this.licenseService.isMaintainer()) &&
      !!this.appService.userSessionData().tenant.eventManagementEnabled;
  }

  triggerSearch(searchQuery: string): void {
    this.query = searchQuery;
    this.currentPage = 1;
    this.executeSearch();
  }

  clearSidebarFilters(): void {
    this.dashboardService.selectedFilters.set({});
    if (this.query.trim()) {
      this.currentPage = 1;
      this.executeSearch();
    }
  }

  reloadFilters(_: Record<string, string | null>): void {
    void _;
    if (!this.queryTriggered && !this.query.trim()) {
      return;
    }
    this.currentPage = 1;
    this.executeSearch();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.executeSearch();
  }

  getDisplayIndex(index: number): number {
    return ((this.currentPage - 1) * this.currentBatchSize) + index + 1;
  }

  private executeSearch(): void {
    this.loading = true;
    this.queryTriggered = true;
    this.errorMessage = '';
    this.responseData = null;
    this.expandedResultIndex = null;
    const requestSize = this.query.trim() ? this.batchSize : this.emptyQueryBatchSize;
    const offset = (this.currentPage - 1) * requestSize;

    this.apiService.post<SiemSearchResponse>('profile/event-management/siem/search',
      {
        q: this.query,
        from: offset,
        size: requestSize,
        date_range: this.activeDateRange || null
      },)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (response) => {
          this.responseData = response ?? { cards_data: [], total_hits: 0, page_count: 0, batch_size: requestSize };
          this.displayQuery = this.query;
          this.expandedResultIndex = this.records.length === 1 ? 0 : null;
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail ?? this.translationService.translate('Failed to search SIEM events');
          this.displayQuery = this.query;
        }
      });
  }

  toggleResultItem(index: number): void {
    this.expandedResultIndex = this.expandedResultIndex === index ? null : index;
  }

  getResultTitle(item: SiemEventRecord, idx: number): string {
    const raw = this.stringifyPrimitive(item?.raw);
    const compactRaw = raw.length > 90 ? `${raw.slice(0, 87)}...` : raw;
    return this.stringifyPrimitive(item?.event_type ??
      item?.source ??
      item?.host ??
      compactRaw ??
      `Event ${idx + 1}`);
  }

  getRawPreview(item: SiemEventRecord): string {
    const raw = this.stringifyPrimitive(item?.raw);
    if (raw === 'not available') {
      return raw;
    }
    return raw.length > 220 ? `${raw.slice(0, 217)}...` : raw;
  }

  getEventTimestamp(item: SiemEventRecord): string {
    return this.stringifyPrimitive(item?.timestamp ?? item?.ingested_at);
  }

  getExtractedIocs(item: SiemEventRecord): { name: string; values: string[] }[] {
    const normalized: { name: string; values: string[] }[] = [];
    const seen = new Set<string>();
    const labelMap: Record<string, string> = {
      m_domain: 'Domain',
      m_email: 'Email',
      m_ip: 'IP Address',
      m_username: 'Username',
      m_language: 'Language',
      domain: 'Domain',
      email: 'Email',
      ip: 'IP Address'
    };

    const pushEntry = (name: string, values: unknown): void => {
      const list = (Array.isArray(values) ? values : [values])
        .map(value => this.stringifyPrimitive(value))
        .filter(value => value !== 'not available');

      if (!list.length) {
        return;
      }

      const rawKey = name.toLowerCase();
      const friendlyName = getOwnProperty(labelMap, rawKey) || name.replace(/^m_/, '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
      const key = friendlyName.toLowerCase();
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      normalized.push({ name: friendlyName, values: Array.from(new Set(list)) });
    };

    for (const [key, values] of Object.entries(item || {})) {
      if (!String(key).startsWith('m_')) {
        continue;
      }
      pushEntry(key, values);
    }

    return normalized;
  }

  getActorLabel(): string {
    const user = this.appService.userSessionData().user;
    this.translationService.version();
    const access = this.translationService.translate(this.licenseService.isAdmin() ? 'Admin' : 'Maintainer');
    return `${access}: ${user.username}`;
  }
}
