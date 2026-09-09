import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { FilterModel } from '../../../shared/model/filter/filter.model';
import { GeoCameraResponse } from '../../../shared/model/network-intel/network-intel-api.models';
import { FiltersComponent } from '../../../shared/partials/filters/filters.component';
import { threat_lens_filters } from '../../../shared/constants/filters';
import { SidebarService } from '../../../shared/services/sidebar.service';
import { NetworkIntelScanService } from '../../../shared/services/network-intel/network-intel-scan.service';
import { ThreatCountryCount, ThreatLensCategoryModelKey, ThreatLensFeedItem, ThreatLensLegendItem, ThreatLensMapData, ThreatLensRequestPayload, } from '../models/geo-fencing.models';
import { IpDetailPopupComponent } from './ui-overlays/ip-detail-popup/ip-detail-popup.component';
import { ArcReportPopupComponent } from './ui-overlays/arc-report-popup/arc-report-popup.component';
import { ThreatLensFeedPanelComponent } from './ui-overlays/feed-panel/threat-lens-feed-panel.component';
import { ThreatLensTopicSearchPanelComponent } from './ui-overlays/topic-search-panel/threat-lens-topic-search-panel.component';
import { ThreatLensCategoryLayersComponent } from './ui-overlays/category-layers/threat-lens-category-layers.component';
import { ThreatLensMapRendererComponent } from './map-renderer/threat-lens-map-renderer.component';
import { ThreatLensArcBatchStatus, ThreatLensArcRangeOption, ThreatLensArcSelection, ThreatLensCoordinates, ThreatLensCountryBoundary, ThreatLensCountrySelection, ThreatLensIpViewportScanRequest } from './models/threat-lens-map.types';
import { ThreatLensService } from './threat-lens.service';
import { ThreatLensGeoUtils } from './map-utils/threat-lens-geo.utils';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { MapLoadingBadgesComponent } from '../../../shared/partials/map-loading-badges/map-loading-badges.component';

@Component({
  selector: 'app-threat-lens',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FiltersComponent,
    ThreatLensFeedPanelComponent,
    ThreatLensTopicSearchPanelComponent,
    ThreatLensCategoryLayersComponent,
    IpDetailPopupComponent,
    ArcReportPopupComponent,
    ThreatLensMapRendererComponent,
    MapLoadingBadgesComponent,
    TooltipDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './threat-lens.html',
})
export class ThreatLensComponent implements OnDestroy {
  @ViewChild(ThreatLensMapRendererComponent) private mapRenderer?: ThreatLensMapRendererComponent;
  private loadRequestId = 0;
  private destroyed = false;
  private activeArcCountryFilterKey = '';
  private ipScanSub?: Subscription;
  private ipScanWatchInterval: ReturnType<typeof setInterval> | null = null;
  private hasStartedDefaultIpScan = false;
  private lastAutomaticIpScanKey = '';
  private selectedCountryIpScanRequest: ThreatLensIpViewportScanRequest | null = null;
  private readonly defaultIpScanCoordinates = '20, 0';
  private readonly defaultIpScanCenter: ThreatLensCoordinates = { lat: 20, lon: 0 };
  private readonly defaultIpScanRadiusKm = 12000;
  private readonly defaultIpScanMaxIps = 500;
  private readonly arcRangeMax = 3000;
  private readonly defaultArcCategoryKey: ThreatLensCategoryModelKey = 'news_model';
  private detailOverlayOpenNotified = false;

  protected readonly filterModel: FilterModel = threat_lens_filters;

  isFilterOpen$: Observable<boolean>;
  searchTerm = '';
  currentQuery = '';
  currentTopicQuery = '';
  selectedCountryName = '';
  statusMessage = 'Loading threat lens results...';
  isLoading = true;
  arcBatchSize = 50;
  selectedArcCategoryKey: ThreatLensCategoryModelKey = this.defaultArcCategoryKey;
  selectedArcRangeIndex = 0;
  arcRangeOptions: ThreatLensArcRangeOption[] = [];
  arcBatchStatus: ThreatLensArcBatchStatus | null = null;
  topCountries: ThreatCountryCount[] = [];
  arcCount = 0;
  categoryLegend: ThreatLensLegendItem[] = [];
  feedItems: ThreatLensFeedItem[] = [];
  isSearchPanelCollapsed = false;
  hasIpScanResult = false;
  selectedIp = '';
  selectedArc: ThreatLensArcSelection | null = null;

  @Input() showFilterButton = true;

  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() detailOverlayOpenChange = new EventEmitter<boolean>();

  constructor( private ngZone: NgZone, private cdr: ChangeDetectorRef, private threatLensService: ThreatLensService, private networkIntelService: NetworkIntelScanService, protected sidebarService: SidebarService, ) {
    this.isFilterOpen$ = this.sidebarService.sidebarState$;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.loadRequestId += 1;
    this.ipScanSub?.unsubscribe();
    this.ipScanSub = undefined;
    this.stopIpScanWatcher();
    this.mapRenderer?.clearIpScanMarkers();
    this.emitDetailOverlayOpenChange(false);
  }

  async onMapReady(): Promise<void> {
    this.mapRenderer?.setArcBatchSize(this.arcBatchSize);
    this.mapRenderer?.setArcCategoryFilter(this.selectedArcCategoryKey);
    this.mapRenderer?.setArcRangeIndex(this.selectedArcRangeIndex);
    await this.loadThreatLensData('');
  }

  onMapError(message: string): void {
    this.setLoading(false);
    this.statusMessage = message || 'Failed to initialize threat lens map.';
  }

  async onSearch(): Promise<void> {
    await this.loadThreatLensData(this.searchTerm.trim());
  }

  async onTopicSearch(topicQuery: string): Promise<void> {
    this.currentTopicQuery = topicQuery.trim();
    await this.loadThreatLensData(this.currentQuery);
  }

  async onTopCountrySelect(country: string): Promise<void> {
    const normalizedCountry = this.threatLensService.normalizeCountryLabel(country);
    this.searchTerm = normalizedCountry;
    await this.loadThreatLensData(normalizedCountry);
  }

  onCountrySelected(selection: ThreatLensCountrySelection): void {
    this.closeArcReportPanel(false);
    this.selectedIp = '';
    this.selectedCountryName = selection.name;
    this.selectedCountryIpScanRequest = selection.ipScanRequest ?? null;
    this.mapRenderer?.clearIpScanMarkers();
    this.statusMessage = selection.name
      ? `${selection.name} selected.`
      : 'Country selected.';
    this.emitDetailOverlayOpenChange(false);
    this.cdr.detectChanges();
  }

  onMapEmptySelection(): void {
    this.closeArcReportPanel(false);
    this.selectedIp = '';
    const hadSelectedCountry = Boolean(this.selectedCountryName || this.selectedCountryIpScanRequest);
    this.selectedCountryName = '';
    this.selectedCountryIpScanRequest = null;
    this.statusMessage = 'No country detected at clicked point.';
    this.emitDetailOverlayOpenChange(false);
    this.cdr.detectChanges();

    if (hadSelectedCountry) {
      this.lastAutomaticIpScanKey = '';
      if (!this.mapRenderer?.requestViewportIpScan()) {
        this.startDefaultIpScan(true);
      }
    }
  }

  onArcCountChange(count: number): void {
    this.arcCount = count;
    this.cdr.detectChanges();
  }

  onArcBatchStatusChange(status: ThreatLensArcBatchStatus | null): void {
    this.arcBatchStatus = status;
    this.arcCount = status?.visibleCount ?? 0;
    this.cdr.detectChanges();
  }

  onArcCategorySelect(categoryKey: ThreatLensCategoryModelKey): void {
    this.selectedArcCategoryKey = categoryKey;
    this.rebuildArcRangeOptions(true);
    this.mapRenderer?.setArcCategoryFilter(categoryKey);
    this.mapRenderer?.setArcRangeIndex(this.selectedArcRangeIndex);
  }

  onArcRangeChange(value: number | string): void {
    const nextIndex = Number(value);
    this.selectedArcRangeIndex = this.arcRangeOptions.some((option) => option.index === nextIndex) ? nextIndex : 0;
    this.mapRenderer?.setArcRangeIndex(this.selectedArcRangeIndex);
  }

  onIpSelected(ip: string): void {
    this.closeArcReportPanel(false);
    this.selectedIp = ip;
    this.cdr.detectChanges();
    this.emitDetailOverlayOpenChange();
  }

  onArcSelected(selection: ThreatLensArcSelection): void {
    this.selectedIp = '';
    this.selectedArc = selection;
    this.statusMessage = `${selection.countryAName} to ${selection.countryBName}: ${selection.categoryLabel.toLowerCase()} reports.`;
    this.cdr.detectChanges();
    this.emitDetailOverlayOpenChange();
  }

  onViewportIpScanRequested(request: ThreatLensIpViewportScanRequest): void {
    if (this.destroyed) {
      return;
    }

    const selectedCountryRequest = this.selectedCountryIpScanRequest;
    const effectiveRequest = selectedCountryRequest
      ? {
        ...request,
        center: ThreatLensGeoUtils.isThreatLensPointInBoundary(request.center, selectedCountryRequest.boundary)
          ? request.center
          : selectedCountryRequest.center,
        radiusKm: Math.min(request.radiusKm, selectedCountryRequest.radiusKm),
        boundary: selectedCountryRequest.boundary ?? null,
      }
      : request;
    const center = this.normalizeIpScanCenter(effectiveRequest.center);
    const radiusKm = Math.round(Math.max(25, Math.min(this.defaultIpScanRadiusKm, effectiveRequest.radiusKm)));
    const requestScope = this.selectedCountryIpScanRequest ? `country:${this.toCountryKey(this.selectedCountryName)}` : 'default';
    const requestKey = this.getIpScanRequestKey(center, radiusKm, requestScope);
    if (requestKey === this.lastAutomaticIpScanKey && (this.hasIpScanResult || this.isIpScanRunning)) {
      return;
    }

    this.lastAutomaticIpScanKey = requestKey;
    this.runIpScan(`${center.lat.toFixed(6)}, ${center.lon.toFixed(6)}`,
      center,
      radiusKm,
      this.defaultIpScanMaxIps,
      effectiveRequest.boundary ?? null,);
  }

  get isIpScanRunning(): boolean {
    return this.networkIntelService.isRunning() && !this.networkIntelService.onError();
  }

  get ipScanLoadingBadges(): string[] {
    return this.isIpScanRunning ? ['IP scan loading...'] : [];
  }

  onIpDetailPopupClose(): void {
    this.selectedIp = '';
    this.emitDetailOverlayOpenChange();
  }

  onArcReportPanelClose(): void {
    this.closeArcReportPanel();
    this.cdr.detectChanges();
  }

  resetGlobePosition(): void {
    const reset = this.mapRenderer?.resetGlobePosition();
    if (!reset) {
      this.refreshIpScan();
      return;
    }

    void reset.then(() => {
      this.refreshIpScan();
    });
  }

  resetSelectedCountry(): void {
    this.selectedCountryName = '';
    this.selectedCountryIpScanRequest = null;
    this.mapRenderer?.clearSelections();
    this.statusMessage = 'Country selection cleared.';
    this.cdr.detectChanges();
    this.refreshIpScan();
  }

  private refreshIpScan(): void {
    this.lastAutomaticIpScanKey = '';
    if (!this.mapRenderer?.requestViewportIpScan()) {
      this.startDefaultIpScan(true);
    }
  }

  clearAllSelections(): void {
    const hadSelectedCountry = Boolean(this.selectedCountryName || this.selectedCountryIpScanRequest);
    this.closeArcReportPanel(false);
    this.selectedIp = '';
    this.selectedCountryName = '';
    this.selectedCountryIpScanRequest = null;
    this.selectedArcCategoryKey = this.defaultArcCategoryKey;
    this.rebuildArcRangeOptions(true);
    this.mapRenderer?.setArcCategoryFilter(this.selectedArcCategoryKey);
    this.mapRenderer?.setArcRangeIndex(this.selectedArcRangeIndex);
    this.mapRenderer?.clearSelections();
    this.statusMessage = 'Selections cleared.';
    this.emitDetailOverlayOpenChange(false);
    this.cdr.detectChanges();

    if (hadSelectedCountry) {
      this.lastAutomaticIpScanKey = '';
      if (!this.mapRenderer?.requestViewportIpScan()) {
        this.startDefaultIpScan(true);
      }
    }
  }

  toggleSearchPanel(): void {
    this.isSearchPanelCollapsed = !this.isSearchPanelCollapsed;
  }

  private async loadThreatLensData(query: string): Promise<void> {
    if (!this.mapRenderer) {
      return;
    }

    this.closeArcReportPanel();
    const requestId = ++this.loadRequestId;
    const activeQuery = query.trim();
    const activeTopicQuery = this.currentTopicQuery.trim();
    this.currentQuery = activeQuery;
    this.activeArcCountryFilterKey = this.getSearchedCountryKey(activeQuery);

    this.ngZone.run(() => {
      this.setLoading(true);
      this.statusMessage = activeTopicQuery
        ? `Searching threat lens results for topic "${activeTopicQuery}"...`
        : activeQuery
          ? `Searching threat lens results for "${activeQuery}"...`
          : 'Loading complete threat lens dataset...';
    });

    const stats = await this.fetchMapData(activeQuery);
    if (!this.isActiveRequest(requestId)) {
      return;
    }

    if (!stats) {
      this.mapRenderer.renderThreatData([], '');
      this.applyEmptyDataState(activeQuery);
      if (!activeQuery) {
        this.startDefaultIpScan();
      }
      return;
    }

    const { totalArcCount, arcCountByCategory } = this.mapRenderer.renderThreatData(stats.categoryData,
      this.activeArcCountryFilterKey,);

    if (!this.isActiveRequest(requestId)) {
      return;
    }

    this.arcCount = totalArcCount;
    this.categoryLegend = this.orderCategoryLegend(ThreatLensGeoUtils.buildThreatLensLegend(stats.categoryData, arcCountByCategory));
    this.selectedArcCategoryKey = this.resolveSelectedArcCategoryKey();
    this.rebuildArcRangeOptions(true);
    this.mapRenderer?.setArcCategoryFilter(this.selectedArcCategoryKey);
    this.mapRenderer?.setArcRangeIndex(this.selectedArcRangeIndex);
    const hasRenderableArcs = this.categoryLegend.some((item) => item.arcCount > 0);
    this.applyLoadedDataState(stats, hasRenderableArcs ? Math.max(totalArcCount, 1) : 0);

    if (this.activeArcCountryFilterKey) {
      await this.focusCountryByKey(this.activeArcCountryFilterKey);
    }
    else {
      this.startDefaultIpScan();
    }
  }

  private async fetchMapData(activeQuery: string): Promise<ThreatLensMapData | null> {
    try {
      const loadAllPages = true;
      return await firstValueFrom(this.threatLensService.getThreatLensMapData(this.buildSearchPayload(activeQuery), loadAllPages),);
    }
    catch (error) {
      console.error('Failed to load threat lens data', error);
      return null;
    }
  }

  private applyEmptyDataState(activeQuery: string): void {
    this.arcCount = 0;
    this.arcBatchStatus = null;
    this.selectedArcCategoryKey = this.defaultArcCategoryKey;
    this.selectedArcRangeIndex = 0;
    this.arcRangeOptions = [];
    this.ngZone.run(() => {
      this.topCountries = [];
      this.categoryLegend = [];
      this.feedItems = [];
      const activeTopicQuery = this.currentTopicQuery.trim();
      this.statusMessage = activeTopicQuery
        ? `Failed to load threat lens data for topic "${activeTopicQuery}" from /api/threat/lens.`
        : activeQuery
          ? `Failed to load threat lens data for "${activeQuery}" from /api/threat/lens.`
          : 'Failed to load threat lens data from /api/threat/lens.';
      this.setLoading(false);
    });
  }

  private applyLoadedDataState(stats: ThreatLensMapData, totalArcCount: number): void {
    const mostActive = stats.countryCounts[0];

    this.ngZone.run(() => {
      this.feedItems = stats.feedItems;
      this.topCountries = stats.countryCounts.slice(0, 8);

      if (this.activeArcCountryFilterKey && this.mapRenderer?.hasCountryKey(this.activeArcCountryFilterKey)) {
        const activeCountryName = this.mapRenderer.getCountryName(this.activeArcCountryFilterKey);
        this.selectedCountryName = activeCountryName || this.selectedCountryName;
      }

      if (!mostActive) {
        this.statusMessage = 'No country metadata found.';
        this.setLoading(false);
        return;
      }

      this.statusMessage = totalArcCount > 0
        ? ''
        : this.activeArcCountryFilterKey
          ? 'No arc connections found.'
          : 'No multi-country arc co-occurrence found.';
      this.setLoading(false);
    });
  }

  private startDefaultIpScan(force = false): void {
    if ((!force && this.hasStartedDefaultIpScan) || this.destroyed || (!force && this.isIpScanRunning)) {
      return;
    }

    this.hasStartedDefaultIpScan = true;
    if (this.mapRenderer?.requestViewportIpScan()) {
      return;
    }

    this.lastAutomaticIpScanKey = this.getIpScanRequestKey(this.defaultIpScanCenter, this.defaultIpScanRadiusKm, 'default');
    this.runIpScan(this.defaultIpScanCoordinates,
      this.defaultIpScanCenter,
      this.defaultIpScanRadiusKm,
      this.defaultIpScanMaxIps,
      null,);
  }

  private runIpScan(coordinates: string, center: ThreatLensCoordinates, radiusKm: number, maxIps: number, boundary: ThreatLensCountryBoundary | null = null): void {
    this.ipScanSub?.unsubscribe();
    this.stopIpScanWatcher();
    this.networkIntelService.resetState();
    this.mapRenderer?.clearIpScanMarkers();

    this.ngZone.run(() => {
      this.hasIpScanResult = false;
      this.cdr.detectChanges();
    });

    this.ipScanSub = this.networkIntelService.scanThreatLensGeoCamera(coordinates, radiusKm, maxIps);
    this.watchIpScanResult(center, radiusKm, boundary);
  }

  private getIpScanRequestKey(center: ThreatLensCoordinates, radiusKm: number, scope: string): string {
    return `${scope}:${center.lat.toFixed(2)}:${center.lon.toFixed(2)}:${Math.round(radiusKm / 25)}`;
  }

  private normalizeIpScanCenter(center: ThreatLensCoordinates): ThreatLensCoordinates {
    return {
      lat: Math.round(center.lat * 1000000) / 1000000,
      lon: Math.round(center.lon * 1000000) / 1000000,
    };
  }

  private runCountryIpScan(countryName: string, request: ThreatLensIpViewportScanRequest | null): void {
    if (!request) {
      return;
    }

    const center = this.normalizeIpScanCenter(request.center);
    const radiusKm = Math.round(Math.max(25, Math.min(this.defaultIpScanRadiusKm, request.radiusKm)));
    const requestScope = `country:${this.toCountryKey(countryName)}`;
    const requestKey = this.getIpScanRequestKey(center, radiusKm, requestScope);
    if (requestKey === this.lastAutomaticIpScanKey && (this.hasIpScanResult || this.isIpScanRunning)) {
      return;
    }

    this.lastAutomaticIpScanKey = requestKey;
    this.runIpScan(`${center.lat.toFixed(6)}, ${center.lon.toFixed(6)}`,
      center,
      radiusKm,
      this.defaultIpScanMaxIps,
      request.boundary ?? null,);
  }

  private watchIpScanResult(center: ThreatLensCoordinates, radiusKm: number, boundary: ThreatLensCountryBoundary | null): void {
    const parse = () => {
      const finished = this.parseIpScanResult(center, radiusKm, boundary);
      if (finished) {
        this.stopIpScanWatcher();
      }
    };

    if (this.parseIpScanResult(center, radiusKm, boundary)) {
      return;
    }
    this.ipScanWatchInterval = setInterval(parse, 250);
  }

  private stopIpScanWatcher(): void {
    if (this.ipScanWatchInterval) {
      clearInterval(this.ipScanWatchInterval);
      this.ipScanWatchInterval = null;
    }
  }

  private parseIpScanResult(center: ThreatLensCoordinates, radiusKm: number, boundary: ThreatLensCountryBoundary | null): boolean {
    const error = this.networkIntelService.onError();
    if (error) {
      return true;
    }

    const done = this.networkIntelService.onDone();
    if (!done) {
      return false;
    }

    const payload = (done.result ?? done) as GeoCameraResponse & Record<string, unknown>;
    const rawStatus = String(payload?.status ?? done?.status ?? '').toLowerCase();
    const progress = Number(payload?.progress ?? done?.progress);
    const step = String(payload?.step ?? done?.step ?? '').toLowerCase();
    const status = (rawStatus === 'pending' || rawStatus === 'busy') && progress >= 100 && step.includes('done')
      ? 'done'
      : rawStatus;

    if (status === 'pending' || status === 'busy') {
      return false;
    }

    const records = ThreatLensGeoUtils.extractThreatLensIpScanRecords(payload);
    const hasIpRecords = records.length > 0;
    let renderedMarkers = false;

    if (hasIpRecords) {
      renderedMarkers = this.mapRenderer?.renderIpScanMarkers(records, center, radiusKm, boundary) ?? false;
    }

    this.ngZone.run(() => {
      if (renderedMarkers) {
        this.hasIpScanResult = true;
      }
      else if (hasIpRecords) {
        this.hasIpScanResult = false;
        this.statusMessage = 'IP scan returned IPs without exact coordinates.';
      }
      else {
        this.hasIpScanResult = false;
        this.statusMessage = 'IP scan did not return exact coordinate data.';
      }
      this.cdr.detectChanges();
    });

    return !this.networkIntelService.isRunning();
  }

  private async focusCountryByKey(countryKey: string): Promise<void> {
    const selection = await this.mapRenderer?.focusCountryByKey(countryKey);
    if (!selection) {
      return;
    }

    this.ngZone.run(() => {
      this.selectedCountryName = selection.name;
      this.selectedCountryIpScanRequest = selection.ipScanRequest ?? null;
      this.cdr.detectChanges();
    });
    if (!this.mapRenderer?.requestViewportIpScan()) {
      this.runCountryIpScan(selection.name, this.selectedCountryIpScanRequest);
    }
  }

  private buildSearchPayload(query: string): Partial<ThreatLensRequestPayload> {
    const activeTopicQuery = this.currentTopicQuery.trim();
    const payload: Partial<ThreatLensRequestPayload> = { q: activeTopicQuery || query };

    if (activeTopicQuery) {
      payload.matchtype = 'semantic';
    }

    if (!query) {
      return payload;
    }

    const normalizedCountry = this.threatLensService.normalizeCountryLabel(query);
    const countryKey = this.toCountryKey(normalizedCountry);
    if (countryKey && this.mapRenderer?.hasCountryKey(countryKey)) {
      if (!activeTopicQuery) {
        payload.q = '';
      }
      payload.entity_filter = { m_country: [normalizedCountry] };
      payload.must = true;
      payload.fullsearch = false;
    }

    return payload;
  }

  private getSearchedCountryKey(query: string): string {
    if (!query) {
      return '';
    }

    const normalizedCountry = this.threatLensService.normalizeCountryLabel(query);
    const countryKey = this.toCountryKey(normalizedCountry);
    return countryKey && this.mapRenderer?.hasCountryKey(countryKey) ? countryKey : '';
  }

  private rebuildArcRangeOptions(selectFirst = false): void {
    const rangeOptions: ThreatLensArcRangeOption[] = [];
    for (let start = 1; start <= this.arcRangeMax; start += this.arcBatchSize) {
      const end = start + this.arcBatchSize - 1;
      rangeOptions.push({
        index: rangeOptions.length,
        label: `${start} to ${end}`,
        start,
        end,
      });
    }

    this.arcRangeOptions = rangeOptions;
    this.selectedArcRangeIndex = selectFirst
      ? 0
      : Math.max(0, Math.min(this.selectedArcRangeIndex, rangeOptions.length - 1));
  }

  private resolveSelectedArcCategoryKey(): ThreatLensCategoryModelKey {
    if (this.categoryLegend.some((item) => item.categoryKey === this.selectedArcCategoryKey)) {
      return this.selectedArcCategoryKey;
    }

    if (this.categoryLegend.some((item) => item.categoryKey === this.defaultArcCategoryKey)) {
      return this.defaultArcCategoryKey;
    }

    return this.categoryLegend[0]?.categoryKey ?? this.defaultArcCategoryKey;
  }

  private orderCategoryLegend(items: ThreatLensLegendItem[]): ThreatLensLegendItem[] {
    return items
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        if (left.item.categoryKey === this.defaultArcCategoryKey) {
          return -1;
        }
        if (right.item.categoryKey === this.defaultArcCategoryKey) {
          return 1;
        }
        return left.index - right.index;
      })
      .map(({ item }) => item);
  }

  private closeArcReportPanel(notify = true): void {
    this.selectedArc = null;
    if (notify) {
      this.emitDetailOverlayOpenChange();
    }
  }

  private emitDetailOverlayOpenChange(value = Boolean(this.selectedIp || this.selectedArc)): void {
    if (this.detailOverlayOpenNotified === value) {
      return;
    }

    this.detailOverlayOpenNotified = value;
    this.detailOverlayOpenChange.emit(value);
  }

  private toCountryKey(value: string): string {
    const normalized = this.threatLensService.normalizeCountryLabel(value);
    return this.threatLensService._toCountryKey(normalized);
  }

  private setLoading(value: boolean): void {
    if (this.isLoading === value) {
      return;
    }

    this.isLoading = value;
    this.loadingChange.emit(value);
  }

  private isActiveRequest(requestId: number): boolean {
    return !this.destroyed && requestId === this.loadRequestId;
  }
}
