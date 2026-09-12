import { Observable, Subscription } from 'rxjs';
import type * as Leaflet from 'leaflet';
import { LeafletComponentRenderer } from '../map-utils/leaflet-component-renderer';
import { MarkerAnimator } from '../map-utils/marker-animator';
import { distributionCell, escapeTooltipText, getResponseStatus, isPendingStatus, moderateSampleRatio, normalizeEntityId, orderDistributionCells, sampleBucketKey, stableHash, viewportSampleRatio } from '../map-utils/renderer-utils';
import { TrackingEntityType, TrackingSidebarBridge } from '../../models/geo-fencing.models';
import { getOwnProperty, isFiniteNumber, Nullable } from '../../../../shared/utils/type-guards.util';
import { DistributionCellItems, EntityMarker, EntityRendererBaseConfig, RenderedMarkerIcon } from '../model/satellite-intel.model';

export abstract class BaseEntityMapRenderer<T extends { latitude?: number | null; longitude?: number | null }> {
  private renderKey = '';
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private renderVersion = 0;
  private markerTargets = new Map<string, string>();

  protected cluster: Nullable<Leaflet.LayerGroup> = null;
  protected markers = new Map<string, EntityMarker>();
  protected detailSub?: Subscription;
  protected markerZoomBucket = 0;
  protected renderedCount = 0;
  protected readonly animationDurationMs = 8000;
  protected readonly animator = new MarkerAnimator<EntityMarker>(this.animationDurationMs);
  protected readonly sparseAreaThreshold = 15;
  protected readonly crowdedAreaThreshold = 100;
  protected readonly minimumSampledPerArea = 12;
  protected readonly L: typeof Leaflet;
  protected readonly map: Leaflet.Map;
  protected readonly sidebar: TrackingSidebarBridge;
  protected readonly componentRenderer: LeafletComponentRenderer;
  protected readonly getData: () => T[];

  protected abstract readonly entityType: TrackingEntityType;

  protected abstract readonly chunkSize: number;

  protected abstract readonly maxAnimated: number;

  protected abstract readonly boundsPad: number;

  protected abstract readonly pinsLoadingEntity: boolean;

  constructor(config: EntityRendererBaseConfig & { getData: () => T[] }) {
    this.L = config.L;
    this.map = config.map;
    this.sidebar = config.sidebar;
    this.componentRenderer = config.componentRenderer;
    this.getData = config.getData;
  }

  protected abstract getEntityId(entity: T): unknown;

  protected abstract getViewportLimit(zoom: number): number;

  protected abstract getMotionKey(entity: T): string;

  protected abstract projectPosition(entity: T, seconds: number): { lat: number; lon: number } | null;

  protected abstract getMovementRotation(marker: EntityMarker, entity: T): number;

  protected abstract renderIcon(entity: T, isSelected: boolean, isLoading: boolean, rotationDegrees?: number): RenderedMarkerIcon;

  protected abstract shouldAnimateMarker(entity: T): boolean;

  protected abstract pollDetails(seed: T): Observable<unknown>;

  protected abstract extractDetails(res: unknown): T | null;

  protected abstract onDetailsLoaded(entity: T): void;

  protected abstract shouldUpdateMarkerRotation(isSelected: boolean, isLoading: boolean): boolean;

  protected abstract afterMarkerMotion(entity: T, entityId: string | null): void;

  clearTrack(): void {
    // hook: overridden by renderers that draw a selected track
  }

  init(): void {
    if (!this.L || !this.map || this.cluster) {
      return;
    }
    this.cluster = this.L.layerGroup().addTo(this.map);
  }

  render(): void {
    if (!this.cluster) {
      return;
    }

    const renderKey = this.getRenderKey();
    if (renderKey === this.renderKey) {
      return;
    }
    this.renderKey = renderKey;

    const items = this.sampleAndLimit().filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
    this.renderedCount = items.length;
    if (items.length > this.maxAnimated) {
      this.animator.cancelAll();
    }

    const visibleIds = new Set(items.map(item => this.getMarkerId(item)));
    for (const [markerId, marker] of Array.from(this.markers.entries())) {
      if (visibleIds.has(markerId)) {
        continue;
      }
      this.animator.stop(markerId);
      this.destroyMarkerIcon(marker);
      this.cluster.removeLayer(marker);
      this.markers.delete(markerId);
      this.markerTargets.delete(markerId);
    }

    this.cancelRender();
    this.renderMarkersInChunks(items, ++this.renderVersion);
  }

  resetRenderKey(): void {
    this.renderKey = '';
  }

  setMarkerZoomBucket(bucket: number): void {
    if (bucket === this.markerZoomBucket) {
      return;
    }
    this.markerZoomBucket = bucket;
    this.resetRenderKey();
    this.render();
  }

  refreshSelectionState(): void {
    this.resetRenderKey();
    this.render();
  }

  destroy(): void {
    this.detailSub?.unsubscribe();
    this.cancelRender();
    this.animator.cancelAll();
    this.clearTrack();
    if (this.cluster) {
      this.map?.removeLayer(this.cluster);
      this.cluster = null;
    }
    Array.from(this.markers.values()).forEach((marker) => {
      this.destroyMarkerIcon(marker);
    });
    this.markers.clear();
    this.markerTargets.clear();
  }

  private cancelRender(): void {
    this.renderVersion += 1;
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }

  private renderMarkersInChunks(items: T[], renderVersion: number, startIndex = 0): void {
    if (!this.cluster || renderVersion !== this.renderVersion) {
      return;
    }

    const endIndex = Math.min(startIndex + this.chunkSize, items.length);
    for (let index = startIndex; index < endIndex; index += 1) {
      this.upsertMarker(getOwnProperty(items, index));
    }

    if (endIndex < items.length) {
      this.renderTimer = setTimeout(() => {
        this.renderMarkersInChunks(items, renderVersion, endIndex);
      }, 0);
    }
    else {
      this.renderTimer = null;
    }
  }

  protected getMarkerId(entity: T): string {
    return normalizeEntityId(this.getEntityId(entity)) ?? `${entity.latitude}:${entity.longitude}`;
  }

  private upsertMarker(entity: T): void {
    if (!this.cluster) {
      return;
    }
    const markerId = this.getMarkerId(entity);
    const entityId = normalizeEntityId(this.getEntityId(entity));
    const isSelected = this.isSelected(entityId);
    const isLoading = this.isLoading(entityId);
    const iconState = `${this.markerZoomBucket}:${isSelected ? 1 : 0}:${isLoading ? 1 : 0}`;
    const existing = this.markers.get(markerId);
    if (!existing) {
      const marker = this.createMarker(entity);
      if (!marker) {
        return;
      }
      marker.__orionIconState = iconState;
      this.markers.set(markerId, marker);
      this.cluster.addLayer(marker);
      this.updateMarkerMotion(markerId, marker, entity);
      this.afterMarkerMotion(entity, entityId);
      return;
    }

    this.updateMarkerMotion(markerId, existing, entity);
    this.afterMarkerMotion(entity, entityId);

    const rotationDegrees = this.getMovementRotation(existing, entity);
    if (existing.__orionIconState !== iconState) {
      const renderedIcon = this.renderIcon(entity, isSelected, isLoading, rotationDegrees);
      this.destroyMarkerIcon(existing);
      existing.setIcon(renderedIcon.icon);
      existing.__orionIconRef = renderedIcon.componentRef;
      existing.__orionIconState = iconState;
      return;
    }

    if (!this.shouldUpdateMarkerRotation(isSelected, isLoading)) {
      return;
    }

    this.updateMarkerRotation(existing, rotationDegrees);
  }

  private updateMarkerMotion(markerId: string, marker: EntityMarker, entity: T): void {
    const lat = entity.latitude;
    const lon = entity.longitude;
    if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
      return;
    }
    const motionKey = this.getMotionKey(entity);

    const isSameMotion = this.markerTargets.get(markerId) === motionKey;
    if (isSameMotion && this.animator.has(markerId)) {
      return;
    }
    this.markerTargets.set(markerId, motionKey);

    const current = marker.getLatLng?.();
    const startLat = isSameMotion && Number.isFinite(current?.lat) ? current.lat : lat;
    const startLon = isSameMotion && Number.isFinite(current?.lng) ? current.lng : lon;
    const projectionSource = isSameMotion ? { ...entity, latitude: startLat, longitude: startLon } : entity;

    this.animator.stop(markerId);
    if (!this.shouldAnimateMarker(entity)) {
      marker.setLatLng([lat, lon]);
      return;
    }

    marker.setLatLng([startLat, startLon]);
    const projected = this.projectPosition(projectionSource, this.animationDurationMs / 1000);
    if (!projected) {
      return;
    }

    this.animator.animate(markerId, marker, projected.lat, projected.lon);
  }

  protected createMarker(entity: T): Nullable<EntityMarker> {
    const latitude = entity.latitude;
    const longitude = entity.longitude;
    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      return null;
    }
    const entityId = normalizeEntityId(this.getEntityId(entity));
    const isSelected = this.isSelected(entityId);
    const isLoading = this.isLoading(entityId);
    const renderedIcon = this.renderIcon(entity, isSelected, isLoading);
    const marker: EntityMarker = this.L.marker([latitude, longitude], {
      icon: renderedIcon.icon,
    });
    marker.__orionIconRef = renderedIcon.componentRef;
    if (entityId) {
      marker.bindTooltip(escapeTooltipText(entityId), {
        direction: 'top',
        offset:    [0, -10],
        opacity:   0.95,
        sticky:    true,
      });
    }
    if (this.getEntityId(entity)) {
      marker.on('click', () => {
        this.loadDetails(entity);
      });
    }
    return marker;
  }

  protected loadDetails(seed: T): void {
    const rawId = this.getEntityId(seed);
    const markerId = normalizeEntityId(rawId);
    if (!markerId || !rawId) {
      return;
    }
    const label = this.entityType.charAt(0).toUpperCase() + this.entityType.slice(1);
    const token = this.sidebar.openLoading(this.entityType, markerId, seed);
    this.detailSub?.unsubscribe();
    this.detailSub = this.pollDetails(seed).subscribe({
      next: (res) => {
        if (!this.sidebar.isCurrentRequestToken(token)) {
          return;
        }
        const entity = this.extractDetails(res);
        const status = getResponseStatus(res);
        if (entity) {
          this.onDetailsLoaded(entity);
        }
        else if (isPendingStatus(status)) {
          return;
        }
        else {
          this.sidebar.openError(this.entityType, markerId, `Unable to load ${this.entityType} details`);
        }
      },
      error: (err) => {
        if (!this.sidebar.isCurrentRequestToken(token)) {
          return;
        }
        this.sidebar.openError(this.entityType, markerId, err?.error?.detail ?? err?.message ?? `${label} details request failed`);
      },
    });
  }

  protected destroyMarkerIcon(marker: EntityMarker): void {
    this.componentRenderer.destroy(marker.__orionIconRef);
    marker.__orionIconRef = null;
  }

  protected updateMarkerRotation(marker: EntityMarker, rotationDegrees: number): void {
    const componentRef = marker.__orionIconRef;
    if (componentRef) {
      componentRef.instance.rotationDegrees = rotationDegrees;
      componentRef.changeDetectorRef.detectChanges();
    }
  }

  protected getRenderKey(): string {
    const zoom = this.map?.getZoom?.() ?? 3;
    const bounds = this.map?.getBounds?.();
    const data = this.getData();
    const activeEntity = this.sidebar.getActiveEntity();
    const loadingEntity = this.sidebar.getLoadingEntity();
    if (!bounds) {
      return `z:${Math.round(zoom * 2)}|sel:${activeEntity?.id ?? ''}|load:${loadingEntity?.id ?? ''}|count:${data.length}`;
    }
    const center = bounds.getCenter();
    return [
      `z:${Math.round(zoom * 2)}`,
      `c:${center.lat.toFixed(1)},${center.lng.toFixed(1)}`,
      `d:${bounds.getNorth().toFixed(1)},${bounds.getEast().toFixed(1)},${bounds.getSouth().toFixed(1)},${bounds.getWest().toFixed(1)}`,
      `sel:${activeEntity?.id ?? ''}`,
      `load:${loadingEntity?.id ?? ''}`,
      `count:${data.length}`,
    ].join('|');
  }

  protected collectVisibleItems(): T[] {
    const bounds = this.map?.getBounds?.();
    const padded = bounds && this.boundsPad > 0 ? bounds.pad(this.boundsPad) : bounds;
    return this.getData().filter(item => {
      const latitude = item.latitude;
      const longitude = item.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return false;
      }
      if (!padded) {
        return true;
      }
      return padded.contains([latitude, longitude]);
    });
  }

  protected sampleAndLimit(): T[] {
    const zoom = this.map?.getZoom?.() ?? 3;
    const visible = this.collectVisibleItems();
    if (visible.length <= 1200) {
      return visible;
    }
    return this.limitForViewport(this.sampleCrowdedAreas(visible, zoom), visible, zoom);
  }

  private sampleCrowdedAreas(items: T[], zoom: number): T[] {
    const sampleRatio = viewportSampleRatio(zoom);
    const buckets = new Map<string, T[]>();
    items.forEach(item => {
      const bucketKey = sampleBucketKey(this.map, item.latitude, item.longitude, zoom);
      const bucketItems = buckets.get(bucketKey) ?? [];
      bucketItems.push(item);
      buckets.set(bucketKey, bucketItems);
    });

    const sampled: T[] = [];
    buckets.forEach(bucketItems => {
      if (bucketItems.length <= this.sparseAreaThreshold) {
        sampled.push(...bucketItems);
        return;
      }

      const keepCount = this.getAreaKeepCount(bucketItems.length, sampleRatio);
      if (keepCount >= bucketItems.length) {
        sampled.push(...bucketItems);
        return;
      }

      sampled.push(...this.takeSpatiallyDistributed(bucketItems, keepCount, zoom));
    });

    return sampled;
  }

  private getAreaKeepCount(count: number, sampleRatio: number): number {
    if (count <= this.crowdedAreaThreshold) {
      return Math.max(this.minimumSampledPerArea, Math.ceil(count * moderateSampleRatio(sampleRatio)));
    }

    return Math.max(this.minimumSampledPerArea, Math.ceil(count * sampleRatio));
  }

  private limitForViewport(items: T[], sourceItems: T[], zoom: number): T[] {
    const limit = this.getViewportLimit(zoom);
    if (items.length <= limit) {
      return items;
    }

    const sourceBucketCounts = this.getBucketCounts(sourceItems, zoom);
    const activeEntity = this.sidebar.getActiveEntity();
    const loadingEntity = this.sidebar.getLoadingEntity();
    const activeId = activeEntity?.type === this.entityType ? activeEntity.id : '';
    const loadingId = this.pinsLoadingEntity && loadingEntity?.type === this.entityType ? loadingEntity.id : '';
    const active = activeId
      ? items.find(item => normalizeEntityId(this.getEntityId(item)) === activeId) ?? null
      : null;
    const loading = loadingId
      ? items.find(item => normalizeEntityId(this.getEntityId(item)) === loadingId && normalizeEntityId(this.getEntityId(item)) !== activeId) ?? null
      : null;
    const preserved: T[] = [];
    const denseCandidates: T[] = [];

    items.forEach(item => {
      const itemId = normalizeEntityId(this.getEntityId(item));
      if (active && itemId === activeId) {
        return;
      }
      if (loading && itemId === loadingId) {
        return;
      }

      const bucketKey = sampleBucketKey(this.map, item.latitude, item.longitude, zoom);
      const sourceBucketCount = sourceBucketCounts.get(bucketKey) ?? 0;
      if (sourceBucketCount <= this.sparseAreaThreshold) {
        preserved.push(item);
        return;
      }

      denseCandidates.push(item);
    });

    const pinned = [active, loading].filter((item): item is T => !!item);
    const remainingLimit = Math.max(0, limit - preserved.length - pinned.length);
    const limited = this.takeSpatiallyDistributed(denseCandidates, remainingLimit, zoom);

    return [...pinned, ...preserved, ...limited];
  }

  private getBucketCounts(items: T[], zoom: number): Map<string, number> {
    const counts = new Map<string, number>();
    items.forEach(item => {
      const bucketKey = sampleBucketKey(this.map, item.latitude, item.longitude, zoom);
      counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
    });
    return counts;
  }

  private takeSpatiallyDistributed(items: T[], limit: number, zoom: number): T[] {
    if (limit <= 0) {
      return [];
    }
    if (items.length <= limit) {
      return items;
    }

    const cells = new Map<string, DistributionCellItems<T>>();
    items.forEach(item => {
      const cellRef = distributionCell(this.map, item.latitude, item.longitude, zoom);
      const cell = cells.get(cellRef.key) ?? { ...cellRef, items: [] };
      cell.items.push(item);
      cells.set(cellRef.key, cell);
    });

    const orderedCells = orderDistributionCells(Array.from(cells.values()).map(cell => ({
      ...cell,
      items: cell.items.slice().sort((left, right) => Math.abs(stableHash(this.getMarkerId(left))) - Math.abs(stableHash(this.getMarkerId(right)))),
    })), limit);
    const selected: T[] = [];
    let round = 0;

    while (selected.length < limit) {
      let addedThisRound = false;
      for (const cell of orderedCells) {
        const item = getOwnProperty(cell.items, round);
        if (!item) {
          continue;
        }
        selected.push(item);
        addedThisRound = true;
        if (selected.length >= limit) {
          break;
        }
      }
      if (!addedThisRound) {
        break;
      }
      round += 1;
    }

    return selected;
  }

  protected isSelected(id: string | null): boolean {
    const activeEntity = this.sidebar.getActiveEntity();
    return !!id && activeEntity?.type === this.entityType && activeEntity.id === id;
  }

  protected isLoading(id: string | null): boolean {
    const loadingEntity = this.sidebar.getLoadingEntity();
    return !!id && loadingEntity?.type === this.entityType && loadingEntity.id === id;
  }
}
