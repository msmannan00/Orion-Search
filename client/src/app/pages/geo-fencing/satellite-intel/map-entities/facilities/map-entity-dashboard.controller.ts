import { OrionSatelliteDashboardFilter, OrionSatelliteFeature, OrionSatelliteFeatureType, ORION_POWER_FILTERS, SatelliteTrackingViewport } from '../../../models/geo-fencing.models';
import { SatelliteFacilitiesService } from './facilities.service';

export class SatelliteMapEntityDashboardController {
  private mapEntityChunkQueue: OrionSatelliteFeature[][] = [];
  private mapEntityFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private isMapEntityFlushing = false;
  private streamFinished = false;
  private dashboardTypeFilterCache: OrionSatelliteDashboardFilter[] = ORION_POWER_FILTERS.map((option) => ({
    key: option.key,
    label: option.label,
    color: option.color,
    count: 0,
  }));
  private visibleDashboardTypeFilterCache: OrionSatelliteDashboardFilter[] = [];
  private visiblePowerCountCache = 0;
  private readonly mapEntityFlushIntervalMs = 80;
  private readonly mapEntityBatchSize = 1000;
  private viewport: SatelliteTrackingViewport | null = null;
  private mapEntitiesVisible = true;

  dashboardSearch = '';
  dashboardSearchResults: OrionSatelliteFeature[] = [];
  wriData: OrionSatelliteFeature[] = [];
  mergedData: OrionSatelliteFeature[] = [];
  filteredData: OrionSatelliteFeature[] = [];
  filteredWriData: OrionSatelliteFeature[] = [];
  filteredFacilitiesMapData: OrionSatelliteFeature[] = [];
  scopedWriDataCount = 0;
  selectedFilters: OrionSatelliteFeatureType[] = [];
  isLoading = false;

  constructor(private facilitiesService: SatelliteFacilitiesService, private getFacilitiesVisible: () => boolean, private getFacilitiesMapData: () => OrionSatelliteFeature[]) {}

  get dashboardTypeFilters(): OrionSatelliteDashboardFilter[] {
    return this.dashboardTypeFilterCache;
  }

  get visibleDashboardTypeFilters(): OrionSatelliteDashboardFilter[] {
    return this.visibleDashboardTypeFilterCache;
  }

  get visiblePowerCount(): number {
    return this.visiblePowerCountCache;
  }

  async load(): Promise<void> {
    this.resetStreamState();
    this.isLoading = true;
    this.selectedFilters = [];
    this.wriData = [];
    this.refresh();

    const onChunk = (chunk: OrionSatelliteFeature[]) => {
      this.mapEntityChunkQueue.push(chunk);
      this.scheduleFlush();
    };
    const onComplete = () => {
      this.streamFinished = true;
      this.scheduleFlush();
    };
    const onError = () => {
      this.isLoading = false;
      this.resetStreamState();
    };
    await this.facilitiesService.streamMapEntities(100, onChunk, onComplete, onError);
  }

  refresh(): void {
    this.mergedData = this.getFacilitiesVisible()
      ? [...this.wriData, ...this.getFacilitiesMapData()]
      : [...this.wriData];

    const scopedData = this.getViewportData(this.mergedData);
    this.filteredData = scopedData.filter((feature) => this.selectedFilters.includes(feature.type));
    this.filteredWriData = this.mapEntitiesVisible ? this.filteredData.filter((feature) => feature.source === 'WRI') : [];
    this.filteredFacilitiesMapData = this.mapEntitiesVisible ? this.filteredData.filter((feature) => feature.source === 'OSM') : [];
    this.scopedWriDataCount = scopedData.filter((feature) => feature.source === 'WRI').length;
    this.refreshStats(scopedData);
    this.refreshVisibleTypeFilters();
    this.updateSearchResults(this.dashboardSearch.trim().toLowerCase());
  }

  setViewport(viewport: SatelliteTrackingViewport | null): void {
    this.viewport = viewport;
    this.refresh();
  }

  showMapEntities(): void {
    this.mapEntitiesVisible = true;
    if (!this.selectedFilters.length) {
      this.selectedFilters = this.dashboardTypeFilterCache.map((option) => option.key);
    }
    this.refresh();
  }

  clearMapEntities(): void {
    this.mapEntitiesVisible = false;
    this.selectedFilters = [];
    this.refresh();
  }

  setSearchQuery(query: string): void {
    this.dashboardSearch = query;
    this.updateSearchResults(query.trim().toLowerCase());
  }

  clearSearch(): void {
    this.dashboardSearch = '';
    this.dashboardSearchResults = [];
  }

  selectSearchResult(feature: OrionSatelliteFeature): void {
    this.dashboardSearch = feature.name;
    this.dashboardSearchResults = [];
  }

  toggleFilter(type: OrionSatelliteFeatureType): void {
    this.mapEntitiesVisible = true;
    this.selectedFilters = this.selectedFilters.includes(type)
      ? this.selectedFilters.filter((entry) => entry !== type)
      : [...this.selectedFilters, type];
    this.refresh();
  }

  selectAllFilters(): void {
    this.mapEntitiesVisible = true;
    this.selectedFilters = this.dashboardTypeFilterCache.map((option) => option.key);
    this.refresh();
  }

  clearFilters(): void {
    this.mapEntitiesVisible = true;
    this.selectedFilters = [];
    this.refresh();
  }

  destroy(): void {
    this.resetStreamState();
  }

  private scheduleFlush(): void {
    if (this.mapEntityFlushTimer) {
      return;
    }
    this.mapEntityFlushTimer = setTimeout(() => {
      this.mapEntityFlushTimer = null;
      this.flushQueue();
    }, this.mapEntityFlushIntervalMs);
  }

  private flushQueue(): void {
    if (this.isMapEntityFlushing) {
      return;
    }

    this.isMapEntityFlushing = true;
    try {
      let added = 0;
      while (this.mapEntityChunkQueue.length && added < this.mapEntityBatchSize) {
        const chunk = this.mapEntityChunkQueue.shift();
        if (!chunk?.length) {
          continue;
        }
        this.wriData.push(...chunk);
        added += chunk.length;
      }

      if (added > 0) {
        this.refresh();
      }

      if (this.mapEntityChunkQueue.length > 0) {
        this.scheduleFlush();
      }
      else if (this.streamFinished) {
        this.isLoading = false;
        this.resetStreamState(false);
      }
    }
    finally {
      this.isMapEntityFlushing = false;
    }
  }

  private resetStreamState(resetLoading = true): void {
    this.mapEntityChunkQueue = [];
    if (this.mapEntityFlushTimer) {
      clearTimeout(this.mapEntityFlushTimer);
      this.mapEntityFlushTimer = null;
    }
    this.isMapEntityFlushing = false;
    this.streamFinished = false;
    if (resetLoading) {
      this.isLoading = false;
    }
  }

  private refreshStats(data: OrionSatelliteFeature[]): void {
    const counts = new Map<OrionSatelliteFeatureType, number>();
    for (const feature of data) {
      counts.set(feature.type, (counts.get(feature.type) ?? 0) + 1);
    }

    this.dashboardTypeFilterCache = ORION_POWER_FILTERS.map((option) => ({
      key: option.key,
      label: option.label,
      color: option.color,
      count: counts.get(option.key) ?? 0,
    }));

    this.visiblePowerCountCache = this.filteredData.filter((feature) => feature.source === 'WRI').length;
  }

  private getViewportData(data: OrionSatelliteFeature[]): OrionSatelliteFeature[] {
    const viewport = this.viewport;
    if (!viewport) {
      return data;
    }
    return data.filter((feature) => this.isFeatureInsideViewport(feature, viewport));
  }

  private isFeatureInsideViewport(feature: OrionSatelliteFeature, viewport: SatelliteTrackingViewport): boolean {
    const coordinates = feature.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return false;
    }

    const [lon, lat] = coordinates;
    const lonDistance = Math.min(Math.abs(lon - viewport.lon), 360 - Math.abs(lon - viewport.lon));
    return Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat - viewport.lat) <= viewport.delta &&
      lonDistance <= viewport.delta;
  }

  private refreshVisibleTypeFilters(): void {
    const selected = new Set(this.selectedFilters);
    this.visibleDashboardTypeFilterCache = this.dashboardTypeFilterCache.filter((option) => selected.has(option.key));
  }

  private updateSearchResults(query: string): void {
    if (!query.trim()) {
      this.dashboardSearchResults = [];
      return;
    }
    this.dashboardSearchResults = this.filteredData
      .filter(feature => feature.name.toLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 8);
  }
}
