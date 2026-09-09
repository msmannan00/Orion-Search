import { AfterViewInit, ChangeDetectorRef, Component, computed, OnInit, signal, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { AppService } from '../../../services/core/app/app.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, switchMap, take, timer } from 'rxjs';
import { TitleCasePipe } from '@angular/common';
import { ResultComponent } from '../../../shared/partials/result/result.component';
import { DashboardResultsGeneralComponent } from '../../intel-panel/dashboard-results/dashboard-results-general-grid/dashboard-results-general.component';
import { ConsolidatedCallbackModel } from '../../../shared/model/results/consolidated/consolidated.callback.model';
import { DashboardResultExploitComponent } from '../../intel-panel/dashboard-results/dashboard-result-exploit/dashboard-result-exploit.component';
import { DashboardResultAptComponent } from '../../intel-panel/dashboard-results/dashboard-result-apt/dashboard-result-apt.component';
import { DashboardResultChatComponent } from '../../intel-panel/dashboard-results/dashboard-result-chat/dashboard-result-chat.component';
import { SortGroupedResultsPipe } from '../../../shared/pipes/sort-grouped-results.pipe';
import { ApiSubCategory, BreachSubCategory, Category, DefacementSubCategory, FeedSubCategory, SocialSubCategory, AptIntelSubCategory } from '../../../shared/constants/pages';
import { SelectionStoreService } from '../../../services/dashboard/selection.service';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { DashboardResultSocialComponent } from '../../intel-panel/dashboard-results/dashboard-result-social/dashboard-result-social.component';
import { ResultInsightsComponent } from "../../intel-panel/result-insights/result-insights.component";
import { consolidated_filters } from '../../../shared/constants/filters';
import { ALLOWED_CONSOLIDATED_RANKED_SINGLETON } from '../../../shared/constants/shared-enums';
import { ThreatResultsComponent } from "./defacement-results/threat-results.component";
import { RankedCallbackModel } from '../../../shared/model/results/consolidated/ranked.callback.model';
import { ConsolidatedScanComponent } from './consolidated-scan/consolidated-scan.component';
import { isDomainName, isEmailAddress } from '../../../shared/utils/network-validation.util';
import { StealerLogCallbackModel } from '../../../shared/model/results/credentials/credential.callback.model';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { ConsolidatedIocComponent } from "./consolidated-ioc/consolidated-ioc.component";
import { scanAnimation } from '../../../shared/animations/scan.animations';
import { DefacementCallbackModel } from '../../../shared/model/results/defacement/defacement.callback.model';
import { applyQueryAndPageFromParams, isRouteChanged } from '../../intel-panel/dashboard-manager.utils';
import { NetworkIntel } from '../network-intel/network-intel';
import { CrossSearchCardComponent } from '../../../shared/partials/onion-search-engine/cross-search-card.component';
import { SatelliteIntel } from "../../geo-fencing/satellite-intel/satellite-intel";
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ExternalConsolidatedFeedService } from './services/external-consolidated-feed.service';
import type { GeneralResultItem } from '../../../shared/model/results/general/general.callback.model';
import type { LeakResultItem } from '../../../shared/model/results/leak/leak.callback.model';
import type { AptIntelResultItem } from '../../../shared/model/results/apt-intel/apt-intel.callback.model';
import type { ExploitResultItem } from '../../../shared/model/results/exploit/exploit.callback.model';
import type { SocialResultItem } from '../../../shared/model/results/social/social.callback.model';
import type { ChatResultItem } from '../../../shared/model/results/chat/chat.callback.model';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-dashboard-consolidated',
  standalone: true,
  imports: [ResultComponent, DashboardResultsGeneralComponent, TitleCasePipe, DashboardResultExploitComponent, DashboardResultAptComponent, DashboardResultChatComponent, SortGroupedResultsPipe, TooltipDirective, DashboardResultSocialComponent, ResultInsightsComponent, ThreatResultsComponent, ConsolidatedScanComponent, ConsolidatedIocComponent, NetworkIntel, CrossSearchCardComponent, SatelliteIntel, TranslatePipe],
  templateUrl: './dashboard-consolidated.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [scanAnimation],
  styleUrls: ['./dashboard-consolidated.component.css'],
})
export class DashboardConsolidatedComponent implements OnInit, AfterViewInit {
  protected readonly Math = Math;
  protected readonly consolidated_filters = consolidated_filters;

  @ViewChild('domainScan') domainScanComponent!: ConsolidatedScanComponent;
  public consolidatedCallbackModel: ConsolidatedCallbackModel = new ConsolidatedCallbackModel();
  public stealerlogCallbackModel: StealerLogCallbackModel = new StealerLogCallbackModel();
  public groupedResults: Record<string, unknown[]> = {};
  public response: ConsolidatedCallbackModel | null = null;
  public pageCounts: Record<string, number> = {};
  isGrouped = false;
  isIOC = true;
  isNetworkIntel = false;
  isGeoFencing = false;
  query = '';
  isLoading = signal(false);
  isStealerLogLoading = signal(false);
  firstTrigger = true;
  apiCategories = Object.values(ApiSubCategory);
  aptIntelCategories = Object.values(AptIntelSubCategory);
  newsCategories = Object.values(FeedSubCategory);
  socialCategories = Object.values(SocialSubCategory);
  leakCategories = Object.values(BreachSubCategory);
  defacementCategories = Object.values(DefacementSubCategory);
  rankedResult: RankedCallbackModel = new RankedCallbackModel();
  rankedApiTime: unknown;
  showScanCard = computed(() => {
    const isLoading = this.isLoading();
    const isStealerLogLoading = this.isStealerLogLoading();
    const defacementData = this.consolidatedCallbackModel?.defacement_model?.Result ?? [];
    const hasDefacementData = defacementData.length > 0;
    const hasDefacementModel = !!this.consolidatedCallbackModel?.defacement_model;
    const hasStealerLogModel = !!this.stealerlogCallbackModel;
    if (isLoading && isStealerLogLoading) {
      return true;
    }
    if (!isLoading && defacementData.length === 0 && isStealerLogLoading) {
      return true;
    }
    if (isLoading && hasDefacementData && isStealerLogLoading) {
      return true;
    }
    if (!isLoading && !isStealerLogLoading && !hasDefacementModel && !hasStealerLogModel) {
      return false;
    }
    return false;
  });

  constructor(public appService: AppService, public dashboardService: DashboardService, private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef, protected selectionStore: SelectionStoreService, protected licenseService: LicenseService, protected externalConsolidatedFeedService: ExternalConsolidatedFeedService) {
    this.pageCounts = {};
  }

  get defacementResultCount(): number {
    return this.consolidatedCallbackModel.defacement_model?.Result?.length ?? 0;
  }

  get stealerlogResultCount(): number {
    return this.stealerlogCallbackModel?.Result?.length ?? 0;
  }

  get hasDefacementOrStealerResults(): boolean {
    return (this.defacementResultCount + this.stealerlogResultCount) > 0;
  }

  asGeneralResults(results: unknown[]): (GeneralResultItem | LeakResultItem)[] {
    return results as (GeneralResultItem | LeakResultItem)[];
  }

  asAptResults(results: unknown[]): AptIntelResultItem[] {
    return results as AptIntelResultItem[];
  }

  asExploitResults(results: unknown[]): ExploitResultItem[] {
    return results as ExploitResultItem[];
  }

  asSocialResults(results: unknown[]): SocialResultItem[] {
    return results as SocialResultItem[];
  }

  asChatResults(results: unknown[]): ChatResultItem[] {
    return results as ChatResultItem[];
  }

  ngAfterViewInit(): void {
    this.appService.updatePage(this.dashboardService.consolidatedParamModel.page);
    if (isRouteChanged(this.router.url, this.dashboardService.m_current_route)) {
      this.ngOnInit();
    }
  }

  ngOnInit(): void {
    this.consolidatedCallbackModel = {
      ...this.dashboardService.consolidatedCallbackModel
    };
    this.populateGroupedResults();
    combineLatest([this.route.queryParams, this.route.url])
      .pipe(take(1))
      .subscribe(([params, urlSegments]) => {
        this.query = applyQueryAndPageFromParams(params, this.dashboardService.consolidatedParamModel);
        this.dashboardService.consolidatedParamModel.category = urlSegments.length
          ? urlSegments[urlSegments.length - 1].path
          : 'all';
        if (this.firstTrigger && Object.keys(this.groupedResults).length > 0) {
          this.query = this.dashboardService.consolidatedParamModel.q;
        }
        else {
          this.cdr.detectChanges();
          this.fetchSearchResults();
        }
        this.firstTrigger = false;
      });
    this.route.queryParams.subscribe(params => {
      const tab = params.tab;
      if (tab) {
        this.onToggleMenu(tab);
      }
    });
  }

  fetchSearchResults(): void {
    if (this.domainScanComponent) {
      this.domainScanComponent.clearResults();
    }
    if (!this.isGrouped) {
      return;
    }
    if (this.licenseService.canUseScanning() && this.domainScanComponent) {
      this.domainScanComponent.runScan(this.dashboardService.consolidatedParamModel.q);
    }
    if (this.isLoading()) {
      return;
    }
    this.isLoading.set(true);
    if (!this.dashboardService.consolidatedParamModel.q) {
      this.isStealerLogLoading.set(false);
      this.dashboardService.consolidatedParamModel.q = '';
      this.dashboardService.consolidatedParamModel.ioc='';
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: this.getActiveConsolidatedTab() },
        queryParamsHandling: '',
        replaceUrl: true,
      }).then();
    }
    const cleanedParams: Record<string, unknown> = {};
    Object.entries(this.dashboardService.consolidatedParamModel).forEach(([key, value]) => {
      if (value != null && value !== '') {
        setOwnProperty(cleanedParams, key, value);
      }
    });
    cleanedParams.tab = this.getActiveConsolidatedTab();
    this.router.navigate([], {
      queryParams: cleanedParams, queryParamsHandling: 'merge', replaceUrl: true, relativeTo: this.route
    }).then(() => {
      this.cdr.detectChanges();
    });
    const category = this.route.snapshot.routeConfig?.path;
    if (category && ALLOWED_CONSOLIDATED_RANKED_SINGLETON.has(category)) {
      this.isGrouped = true;
      this.dashboardService.consolidatedParamModel.category = category;
    }
    if (this.checkMember()) {
      this.dashboardService.consolidatedParamModel.profile = true;
    }
    this.isLoading.set(true);
    this.consolidatedCallbackModel.defacement_model = new DefacementCallbackModel();
    this.stealerlogCallbackModel = new StealerLogCallbackModel();
    this.externalConsolidatedFeedService.resetActorMalware();
    this.dashboardService.fetchConsolidatedGroupedResults('search/consolidated', this.dashboardService.consolidatedParamModel).pipe(switchMap(response => timer(0).pipe(map(() => response)))).subscribe(response => {
      if (response.success && response.data) {
        this.response = response.data;
        this.consolidatedCallbackModel = response.data;
        this.dashboardService.consolidatedCallbackModel = this.consolidatedCallbackModel;
        this.populateGroupedResults();
      }
      else {
        this.consolidatedCallbackModel = new ConsolidatedCallbackModel();
        this.groupedResults = {};
        this.externalConsolidatedFeedService.syncActorMalware(this.groupedResults, this.pageCounts);
      }
      this.isLoading.set(false);
    });
    this.externalConsolidatedFeedService.fetchActorMalware(this.dashboardService.consolidatedParamModel, this.dashboardService.selectedFilters());
    if (this.isEmailOrUrl(this.dashboardService.consolidatedParamModel.q)) {
      this.isStealerLogLoading.set(true);
      const stealerLogParams = {
        ...this.dashboardService.consolidatedParamModel,
        url: this.dashboardService.consolidatedParamModel.q,
        ioc: `m_search_all:${this.dashboardService.consolidatedParamModel.q}`,
        category: 'credential',
      };
      this.dashboardService.fetchSearchResults<StealerLogCallbackModel>('search/stealer/ioc', stealerLogParams, '', false)
        .pipe(switchMap(response => timer(300).pipe(map(() => response))))
        .subscribe(response => {
          if (response.success && response.data) {
            const seen = new Set<string>();
            response.data.Result = response.data.Result.filter((item) => {
              const raw = item?.raw;
              if (!raw) {
                return true;
              }
              if (seen.has(raw)) {
                return false;
              }
              seen.add(raw);
              return true;
            });
            this.stealerlogCallbackModel = response.data;
            this.dashboardService.stealerlogCallbackModel = response.data;
          }
          this.isStealerLogLoading.set(false);
        });
    }
  }

  resetFilters(): void {
    this.fetchSearchResults();
  }

  reloadFilters(): void {
    this.dashboardService.consolidatedParamModel.page = 1;
    this.fetchSearchResults();
  }

  fetchRanked() {
    if (this.checkMember() && !this.hasIOCs()) {
      return;
    }
    this.isLoading.set(true);
    this.rankedResult = new RankedCallbackModel();
    const startTime = performance.now();
    this.defacementCategories = Object.values(DefacementSubCategory);
    this.consolidatedCallbackModel.defacement_model = new DefacementCallbackModel();
    this.stealerlogCallbackModel = new StealerLogCallbackModel();
    this.dashboardService
      .fetchConsolidatedRankededResults('search/consolidated/ranked', this.dashboardService.consolidatedParamModel)
      .pipe(switchMap(response => timer(500).pipe(map(() => response))))
      .subscribe(response => {
        const endTime = performance.now();
        this.rankedApiTime = Math.round(endTime - startTime);
        if (response.success && response.data) {
          this.rankedResult = response.data;
        }
        this.isLoading.set(false);
      });
  }

  populateGroupedResults(): void {
    this.groupedResults = {};
    this.pageCounts = {};
    const models: (keyof ConsolidatedCallbackModel)[] = [
      'leak_model',
      'chat_model',
      'defacement_model',
      'generic_model',
      'exploit_model',
      'apt_model',
      'malware_model',
      'social_model',
      'stealer_model',
      'tracking_model',
      'news_model',
    ];
    models.forEach(model => {
      setOwnProperty(this.groupedResults, model, getOwnProperty(this.consolidatedCallbackModel, model)?.Result ?? []);
      setOwnProperty(this.pageCounts, model, getOwnProperty(this.consolidatedCallbackModel, model)?.Page_Count ?? 0);
    });
    this.externalConsolidatedFeedService.syncActorMalware(this.groupedResults, this.pageCounts);
  }

  onUpdateQuery(query: string) {
    this.dashboardService.consolidatedParamModel.q = query;
    this.dashboardService.consolidatedParamModel.category = this.route.snapshot.routeConfig?.path ?? 'all';
    this.dashboardService.consolidatedParamModel.url = '';
    this.dashboardService.consolidatedParamModel.user = '';
    this.dashboardService.consolidatedParamModel.ioc = '';
    this.query = query;
  }

  getTotalResultCount(): number {
    const rankedCount = this.rankedResult.pageCount;
    if (this.isGrouped) {
      return this.externalConsolidatedFeedService.getMergedResultCount(this.groupedResults);
    }
    else {
      return rankedCount;
    }
  }

  onSectionSelected(section: Category) {
    this.selectionStore.setSelectedSection(section);
    let firstSubcategory: string | undefined;
    let second_category = "all";
    switch (section) {
      case Category.STRATEGIC:
        firstSubcategory = 'All';
        break;
      case Category.BREACH:
        firstSubcategory = this.leakCategories[0];
        break;
      case Category.API:
        firstSubcategory = this.apiCategories[0];
        break;
      case Category.DEFACEMENT:
        firstSubcategory = this.defacementCategories[0];
        break;
      case Category.APT_INTEL:
        firstSubcategory = this.aptIntelCategories[0];
        break;
      case Category.FEED:
        firstSubcategory = this.newsCategories[0];
        break;
      case Category.SOCIAL:
        firstSubcategory = this.socialCategories[0];
        second_category = this.socialCategories[0].toLowerCase();
        break;
    }
    if (firstSubcategory) {
      this.selectionStore.setSelectedOption(firstSubcategory);
    }
    const sectionRoute = section === Category.APT_INTEL ? 'apt-intel' : section.toLowerCase();
    const routePrefix = '/dashboard/' + sectionRoute + '/' + second_category;
    this.router.navigate([routePrefix], {
      queryParams: { page: 1 }, queryParamsHandling: 'merge'
    }).then();
  }

  getCategoryFromKey(key: string): Category {
    switch (key) {
      case 'leak_model':
        return Category.BREACH;
      case 'exploit_model':
        return Category.EXPLOIT;
      case 'apt_model':
      case 'malware_model':
        return Category.APT_INTEL;
      case 'defacement_model':
        return Category.DEFACEMENT;
      case 'chat_model':
        return Category.SOCIAL;
      case 'generic_model':
        return Category.STRATEGIC;
      case 'social_model':
        return Category.SOCIAL;
      default:
        return Category.BREACH;
    }
  }

  onToggleMenu(tab: string, clearQuery = false): void {
    if (clearQuery) {
      this.query = '';
      this.dashboardService.consolidatedParamModel.q = '';
    }
    this.dashboardService.consolidatedParamModel.tab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: clearQuery ? { tab, q: null } : { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    }).then();
    const skipConsolidatedBackFetchOnce = sessionStorage.getItem('skipConsolidatedBackFetchOnce') === '1';
    if (tab == "Deep Search") {
      this.isNetworkIntel = false;
      this.isGrouped = true;
      this.isIOC = false;
      this.isGeoFencing = false;
      this.restoreDeepSearchQuery();
      if (skipConsolidatedBackFetchOnce) {
        sessionStorage.removeItem('skipConsolidatedBackFetchOnce');
        return;
      }
      this.fetchSearchResults();
    }
    else if (tab == "Ranked") {
      this.isNetworkIntel = false;
      this.isGrouped = false;
      this.isIOC = false;
      this.isGeoFencing = false;
      this.fetchRanked();
    }
    else if (tab == "IOCs") {
      this.isNetworkIntel = false;
      this.isIOC = true;
      this.isGrouped = false;
      this.isGeoFencing = false;
    }
    else if (tab == "Network Intelligence") {
      this.isNetworkIntel = true;
      this.isIOC = false;
      this.isGrouped = false;
      this.isGeoFencing = false;
    }
    else if (tab == "Geo Fencing") {
      this.isNetworkIntel = false;
      this.isIOC = false;
      this.isGrouped = false;
      this.isGeoFencing = true;
    }
  }

  private getActiveConsolidatedTab(): string {
    if (this.isNetworkIntel) {
      return 'Network Intelligence';
    }
    if (this.isGeoFencing) {
      return 'Geo Fencing';
    }
    if (this.isGrouped || !this.isIOC) {
      return 'Deep Search';
    }
    return 'IOCs';
  }

  private restoreDeepSearchQuery(): void {
    const snapshotParams = this.route.snapshot.queryParams;
    const querySource = this.dashboardService.consolidatedParamModel.q || this.query || snapshotParams.q;
    if (!querySource) {
      return;
    }
    this.query = querySource;
    this.dashboardService.consolidatedParamModel.q = querySource;
    this.dashboardService.consolidatedParamModel.url = '';
    this.dashboardService.consolidatedParamModel.user = '';
    this.dashboardService.consolidatedParamModel.ioc = '';
  }

  checkMember(): boolean {
    return this.appService.userSessionData().user.role === 'member';
  }

  hasIOCs(): boolean {
    const categories = this.appService.configData().localSettings.entityfilterCategories;
    return Object.values(categories).some((arr) => Array.isArray(arr) && arr.length > 0);
  }

  isEmailOrUrl(query: string): boolean {
    if (!query) {
      return false;
    }
    if (isEmailAddress(query)) {
      return true;
    }
    try {
      const candidate = query.startsWith('http://') || query.startsWith('https://') ? query : `https://${query}`;
      const url = new URL(candidate);
      return (url.protocol === 'http:' || url.protocol === 'https:') && isDomainName(url.hostname);
    }
    catch {
      return false;
    }
  }
}
