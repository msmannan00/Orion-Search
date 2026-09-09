import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { DashboardResultsGeneralComponent } from '../dashboard-results/dashboard-results-general-grid/dashboard-results-general.component';
import { PaginationComponent } from '../../../shared/partials/pagination/pagination.component';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { Category } from '../../../shared/constants/pages';
import { combineLatest, distinctUntilChanged } from 'rxjs';
import { ResultComponent } from '../../../shared/partials/result/result.component';
import { apt_intel_filters, defacement_filters, exploit_filters, feed_filters, general_filters, leak_filters, social_filters, threat_intel_apt_filters, threat_intel_malware_filters } from '../../../shared/constants/filters';
import { AppService } from '../../../services/core/app/app.service';
import { DashboardResultExploitComponent } from '../dashboard-results/dashboard-result-exploit/dashboard-result-exploit.component';
import { DashboardResultSocialComponent } from '../dashboard-results/dashboard-result-social/dashboard-result-social.component';
import { DashboardResultChatComponent } from '../dashboard-results/dashboard-result-chat/dashboard-result-chat.component';
import { DashboardResultAptComponent } from '../dashboard-results/dashboard-result-apt/dashboard-result-apt.component';
import { ConsolidatedParamModel } from '../../../shared/model/results/consolidated/consolidated.param.model';
import { SortType } from '../../../shared/constants/shared-enums';
import { HelperService } from '../../../shared/services/helper.service';
import { DashboardResultDefacementComponent } from '../dashboard-results/dashboard-result-defacement/dashboard-result-defacement.component';
import { ScrollService } from '../../../shared/services/scroll.service';
import { CrossSearchCardComponent } from '../../../shared/partials/onion-search-engine/cross-search-card.component';
import { DefacementGroupCallbackItem } from '../../../shared/model/results/defacement/defacement.callback.model';
import { FilterModel } from '../../../shared/model/filter/filter.model';
import { ApiService } from '../../../shared/services/api.service';
import { applyMalpediaFilterOptions, applyMalwareBazaarFilterOptions, getDashboardFilterModel, isMalpediaRoute, isMalwareBazaarRoute, MALPEDIA_FILTER_OPTIONS_ENDPOINT, MalpediaFilterOptionsResponse, MALWARE_BAZAAR_FILTER_OPTIONS_ENDPOINT, MalwareBazaarFilterOptionsResponse } from '../dashboard-filter.utils';
import { RankedResultItem } from '../../../shared/model/results/consolidated/ranked.callback.model';
import type { GeneralResultItem } from '../../../shared/model/results/general/general.callback.model';
import type { LeakResultItem } from '../../../shared/model/results/leak/leak.callback.model';
import type { AptIntelResultItem } from '../../../shared/model/results/apt-intel/apt-intel.callback.model';
import type { ExploitResultItem } from '../../../shared/model/results/exploit/exploit.callback.model';
import type { SocialResultItem } from '../../../shared/model/results/social/social.callback.model';
import type { ChatResultItem } from '../../../shared/model/results/chat/chat.callback.model';
import type { DefacementResultItem } from '../../../shared/model/results/defacement/defacement.callback.model';
import { asUnknownRecord } from '../../../shared/utils/type-guards.util';
import type { DashboardSearchResponse } from './model/dashboard-result-container.model';
export type { DashboardSearchResponse } from './model/dashboard-result-container.model';




@Component({
  selector: 'app-dashboard-result-container',
  imports: [
    PaginationComponent,
    DashboardResultsGeneralComponent,
    ResultComponent,
    CrossSearchCardComponent,
    DashboardResultExploitComponent,
    DashboardResultAptComponent,
    DashboardResultSocialComponent,
    DashboardResultChatComponent,
    DashboardResultDefacementComponent],
  templateUrl: './dashboard-result-container.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-result-container.component.scss'],
})
export class DashboardResultContainer implements OnInit, AfterViewInit, AfterViewChecked {
  private pendingScrollRestore = false;
  private malpediaFilterOptionsLoaded = false;
  private malwareBazaarFilterOptionsLoaded = false;

  protected readonly Math = Math;
  protected readonly general_filters = general_filters;
  protected readonly leak_filters = leak_filters;
  protected readonly feed_filters = feed_filters;
  protected readonly social_filters = social_filters;
  protected readonly defacement_filters = defacement_filters;
  protected readonly exploit_filters = exploit_filters;
  protected readonly apt_intel_filters = apt_intel_filters;
  protected readonly threat_intel_apt_filters = threat_intel_apt_filters;
  protected readonly threat_intel_malware_filters = threat_intel_malware_filters;
  protected readonly Category = Category;
  protected readonly alert = alert;

  public currentResultModel: RankedResultItem[] = [];
  public defacementGroups: DefacementGroupCallbackItem[] = [];
  public totalGroups = 0;
  public maxPages = 1;
  public isResponseLoading = signal(false);
  type: Category = Category.STRATEGIC;
  apiEndpoint = '';

  constructor(protected helperService: HelperService, public appService: AppService, public dashboardService: DashboardService, private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef, private scrollService: ScrollService, private apiService: ApiService) {
    this.type = this.route.snapshot.data.type as Category;
    this.apiEndpoint = this.getApiEndpoint(this.router.url.split('?')[0]);
  }

  get currentParamModel(): ConsolidatedParamModel {
    return this.dashboardService.consolidatedParamModel;
  }

  get currentQuery(): string {
    return this.currentParamModel?.q ?? '';
  }

  get activeFilterModel(): FilterModel {
    const route = this.router.url.split('?')[0];
    if (this.isCompromisedActorsRoute(route)) {
      return this.defacement_filters;
    }
    const type = String(this.type || '').toLowerCase();
    switch (type) {
      case Category.DEFACEMENT.toLowerCase():
        return this.defacement_filters;
      case Category.EXPLOIT.toLowerCase():
        return this.exploit_filters;
      case Category.APT_INTEL.toLowerCase():
        return getDashboardFilterModel(this.type, route, {
          general: this.general_filters,
          threatIntel: this.apt_intel_filters,
          malpedia: this.threat_intel_apt_filters,
          malwareBazaar: this.threat_intel_malware_filters
        });
      case Category.FEED.toLowerCase():
        return this.feed_filters;
      case Category.SOCIAL.toLowerCase():
        return this.social_filters;
      case Category.BREACH.toLowerCase():
        return this.leak_filters;
      default:
        return this.general_filters;
    }
  }

  get shouldShowCrossSearch(): boolean {
    return !this.isResponseLoading()
      && !this.appService.isMobileMode()
      && !!this.currentQuery.trim()
      && !this.isCrossSearchExcludedRoute();
  }

  asGeneralResults(results: RankedResultItem[]): (GeneralResultItem | LeakResultItem)[] {
    return results as unknown as (GeneralResultItem | LeakResultItem)[];
  }

  asAptResults(results: RankedResultItem[]): AptIntelResultItem[] {
    return results as unknown as AptIntelResultItem[];
  }

  asExploitResults(results: RankedResultItem[]): ExploitResultItem[] {
    return results as unknown as ExploitResultItem[];
  }

  asSocialResults(results: RankedResultItem[]): SocialResultItem[] {
    return results as unknown as SocialResultItem[];
  }

  asChatResults(results: RankedResultItem[]): ChatResultItem[] {
    return results as unknown as ChatResultItem[];
  }

  asDefacementResults(results: RankedResultItem[]): DefacementResultItem[] {
    return results as unknown as DefacementResultItem[];
  }

  ngAfterViewInit(): void {
    this.appService.updatePage(this.dashboardService.consolidatedParamModel.page);
  }

  ngAfterViewChecked(): void {
    if (!this.pendingScrollRestore || !Array.isArray(this.currentResultModel) || this.currentResultModel.length === 0) {
      return;
    }
    this.pendingScrollRestore = false;
    this.scrollService.scrollToSavedPosition();
    requestAnimationFrame(() => {
      this.scrollService.scrollToSavedPosition();
    });
  }

  ngOnInit(): void {
    combineLatest([this.route.queryParams, this.route.url])
      .pipe(distinctUntilChanged())
      .subscribe(([params, urlSegments]) => {
        const route = this.router.url.split('?')[0];
        if (String(route) !== this.dashboardService.m_current_route) {
          this.currentResultModel = [];
          this.defacementGroups = [];
          this.totalGroups = 0;
        }

        this.dashboardService.consolidatedParamModel.q = params.q ?? '';
        this.dashboardService.consolidatedParamModel.page = params.page ?? '1';
        const routeCategory = urlSegments.length ? urlSegments[urlSegments.length - 1].path : 'all';
        this.apiEndpoint = this.getApiEndpoint(route);
        this.dashboardService.consolidatedParamModel.category = this.getApiCategory(routeCategory);
        this.dashboardService.consolidatedParamModel.content = this.apiEndpoint === 'search/defacement'
          ? this.getDefacementContent(this.dashboardService.consolidatedParamModel.category)
          : 'all';
        this.loadThreatIntelFilterOptions(route);
        const cacheKey = this.buildCacheKey();
        const cachedResult = sessionStorage.getItem(cacheKey);
        if (cachedResult && !this.hasResultData()) {
          try {
            const parsed = JSON.parse(cachedResult) as unknown;
            const parsedCache = asUnknownRecord(parsed);
            this.currentResultModel = Array.isArray(parsed)
              ? parsed as RankedResultItem[]
              : Array.isArray(parsedCache.result) ? parsedCache.result as RankedResultItem[] : [];
            this.defacementGroups = Array.isArray(parsedCache.defacementGroups) ? parsedCache.defacementGroups as DefacementGroupCallbackItem[] : [];
            this.totalGroups = Number(parsedCache.totalGroups ?? 0) || 0;
            this.maxPages = Number(parsedCache.maxPages ?? 1) || 1;
            this.restoreSavedScroll();
          }
          catch {
            sessionStorage.removeItem(cacheKey);
          }
        }

        if (!this.hasResultData()) {
          this.cdr.detectChanges();
          this.fetchSearchResults();
        }
      });
  }

  fetchSearchResults(): void {
    if (this.isResponseLoading()) {
      return;
    }

    if (!this.dashboardService.consolidatedParamModel.q) {
      this.dashboardService.consolidatedParamModel.q = "";
    }

    this.isResponseLoading.set(true);
    this.currentResultModel = [];
    this.defacementGroups = [];
    this.totalGroups = 0;

    this.dashboardService.fetchSearchResults<DashboardSearchResponse>(this.apiEndpoint,
      this.dashboardService.consolidatedParamModel)
      .subscribe((response) => {
        if (response.success && response.data) {
          this.currentResultModel = response.data.Result ?? [];
          this.defacementGroups = this.apiEndpoint === 'search/defacement'
            ? (response.data.Defacement_Groups ?? [])
            : [];
          this.totalGroups = this.apiEndpoint === 'search/apt-intel'
            ? Number(response.data.Total_Groups ?? 0) || 0
            : 0;
          this.maxPages = Number(response.data.Page_Count ?? 1) || 1;
          this.cacheResult({
            result: this.currentResultModel,
            defacementGroups: this.defacementGroups,
            totalGroups: this.totalGroups,
            maxPages: this.maxPages,
          });
          this.restoreSavedScroll();
        }
        this.isResponseLoading.set(false);
      });
  }

  onPageChange(step: number): void {
    this.dashboardService.consolidatedParamModel.page = step;
    this.fetchSearchResults();
  }

  reloadFilters(_: Record<string, string | null>): void {
    void _;
    this.fetchSearchResults();
  }

  onUpdateQuery(query: string): void {
    this.dashboardService.consolidatedParamModel.q = query;
  }

  onToggleSort(sort: SortType): void {
    let key: string;
    let order: 'asc' | 'desc' = 'asc';

    if (this.type === Category.BREACH || this.type === Category.APT_INTEL) {
      key = 'm_date';
    }
    else {
      key = 'm_update_date';
    }

    if (sort === SortType.NEWEST_FIRST) {
      order = 'desc';
    }
    else if (sort === SortType.OLDEST_FIRST) {
      order = 'asc';
    }
    else if (sort === SortType.DEFAULT) {
      this.fetchSearchResults();
      return;
    }

    const results = this.currentResultModel;
    if (results.length > 0) {
      this.currentResultModel = this.helperService.sortByKey<RankedResultItem>(results, key, order);
      this.cdr.detectChanges();
    }
  }

  private hasResultData(): boolean {
    return Array.isArray(this.currentResultModel) && this.currentResultModel.length > 0;
  }

  getResultCount(): number {
    if (this.apiEndpoint !== 'search/apt-intel') {
      return Math.ceil(this.currentResultModel?.length ?? 0);
    }
    return this.totalGroups;
  }

  private buildCacheKey(): string {
    const filterKey = JSON.stringify(Object.entries(this.dashboardService.selectedFilters()).sort(([left], [right]) => left.localeCompare(right)));
    return [
      'dashboard-results-cache',
      this.type,
      this.apiEndpoint,
      filterKey,
      this.dashboardService.consolidatedParamModel.category || 'all',
      this.dashboardService.consolidatedParamModel.page || '1',
      this.dashboardService.consolidatedParamModel.q || '',
      this.apiEndpoint === 'search/apt-intel' ? 'group-limit-100' : ''
    ].join('|');
  }

  private cacheResult(payload: unknown): void {
    try {
      sessionStorage.setItem(this.buildCacheKey(), JSON.stringify(payload));
    }
    catch {
      this.dashboardService.clearResultCaches();
    }
  }

  private getDefacementContent(category: string): string {
    const normalizedCategory = String(category || 'all').toLowerCase();
    return [
      'hacked',
      'malicious_redirect',
      'malware_url',
      'open_directory',
      'phishing',
      'phishing_domain',
      'scam',
      'spam_url',
      'typosquatting',
      'databases'
    ].includes(normalizedCategory)
      ? normalizedCategory
      : 'all';
  }

  private loadThreatIntelFilterOptions(route: string): void {
    if (this.type !== Category.APT_INTEL) {
      return;
    }

    if (isMalpediaRoute(this.type, route) && !this.malpediaFilterOptionsLoaded) {
      this.malpediaFilterOptionsLoaded = true;
      this.apiService.get<MalpediaFilterOptionsResponse>(MALPEDIA_FILTER_OPTIONS_ENDPOINT).subscribe({
        next: (response) => {
          applyMalpediaFilterOptions(this.threat_intel_apt_filters, response || {});
        },
        error: () => {
          this.malpediaFilterOptionsLoaded = false;
        }
      });
    }

    if (isMalwareBazaarRoute(this.type, route) && !this.malwareBazaarFilterOptionsLoaded) {
      this.malwareBazaarFilterOptionsLoaded = true;
      this.apiService.get<MalwareBazaarFilterOptionsResponse>(MALWARE_BAZAAR_FILTER_OPTIONS_ENDPOINT).subscribe({
        next: (response) => {
          applyMalwareBazaarFilterOptions(this.threat_intel_malware_filters, response || {});
        },
        error: () => {
          this.malwareBazaarFilterOptionsLoaded = false;
        }
      });
    }
  }

  private restoreSavedScroll(): void {
    this.cdr.detectChanges();
    this.pendingScrollRestore = true;
  }

  private getApiEndpoint(route: string): string {
    if (this.isCompromisedActorsRoute(route)) {
      return 'search/defacement';
    }

    return this.type.toLowerCase() === Category.STRATEGIC.toLowerCase() ? 'search/strategic' : this.type.toLowerCase() === Category.SOCIAL.toLowerCase() ? 'search/social' : this.type.toLowerCase() === Category.EXPLOIT.toLowerCase() ? 'search/exploit' : this.type.toLowerCase() === Category.APT_INTEL.toLowerCase() ? 'search/apt-intel' : this.type.toLowerCase() === Category.DEFACEMENT.toLowerCase() ? 'search/defacement' : 'search/breach';
  }

  private getApiCategory(category: string): string {
    return category === 'compromised-actors' ? 'hacked' : category;
  }

  private isCompromisedActorsRoute(route: string): boolean {
    return route.endsWith('/apt-intel/compromised-actors') || route.endsWith('/threat-intel/compromised-actors');
  }

  private isCrossSearchExcludedRoute(): boolean {
    const route = this.router.url.toLowerCase();
    return this.apiEndpoint === 'search/defacement'
      || this.apiEndpoint === 'search/exploit'
      || this.apiEndpoint === 'search/apt-intel'
      || route.includes('/defacement');
  }
}
