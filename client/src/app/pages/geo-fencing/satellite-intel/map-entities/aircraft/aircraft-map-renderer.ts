import { ComponentRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { SatelliteLiveAircraft } from '../../model/satellite-intel-api.models';
import { SatelliteAircraftTrackingService } from './aircraft-tracking.service';
import { AircraftMarkerIconComponent } from './components/aircraft-marker-icon/aircraft-marker-icon.component';
import { LeafletComponentRenderer } from '../../map-utils/leaflet-component-renderer';
import { escapeTooltipText, getBearingDegrees, getMarkerBaseSize, getResponseStatus, isPendingStatus, normalizeEntityId, stableHash } from '../../map-utils/renderer-utils';
import { TrackingSidebarBridge } from '../../../models/geo-fencing.models';
import type * as Leaflet from 'leaflet';
import { asUnknownRecord, Augmented, getOwnProperty, isFiniteNumber, isUnknownRecord, Nullable } from '../../../../../shared/utils/type-guards.util';
import { AircraftDistributionCell } from '../../model/satellite-intel.model';

type AircraftMarker = Augmented<Leaflet.Marker, {
  __orionAircraftIconRef?: Nullable<ComponentRef<AircraftMarkerIconComponent>>;
  __orionAircraftIconState?: string;
}>;


export class AircraftMapRenderer {
  private cluster: Nullable<Leaflet.LayerGroup> = null;
  private renderKey = '';
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private renderVersion = 0;
  private markers = new Map<string, AircraftMarker>();
  private markerTargets = new Map<string, string>();
  private trackLine: Nullable<Leaflet.Polyline> = null;
  private animationFrames = new Map<string, { marker: AircraftMarker; startLat: number; startLon: number; targetLat: number; targetLon: number; startedAt: number }>();
  private animationFrame: number | null = null;
  private detailSub?: Subscription;
  private markerZoomBucket = 0;
  private renderedAircraftCount = 0;
  private readonly animationDurationMs = 8000;
  private readonly sparseAircraftAreaThreshold = 15;
  private readonly crowdedAircraftAreaThreshold = 100;
  private readonly minimumSampledAircraftPerArea = 12;
  private readonly maxAnimatedAircraft = 60;
  private readonly L: typeof Leaflet;
  private readonly map: Leaflet.Map;
  private readonly service: SatelliteAircraftTrackingService;
  private readonly sidebar: TrackingSidebarBridge;
  private readonly componentRenderer: LeafletComponentRenderer;
  private readonly getData: () => SatelliteLiveAircraft[];

  constructor(config: { L: typeof Leaflet; map: Leaflet.Map; service: SatelliteAircraftTrackingService; sidebar: TrackingSidebarBridge; componentRenderer: LeafletComponentRenderer; getData: () => SatelliteLiveAircraft[] }) {
    this.L = config.L;
    this.map = config.map;
    this.service = config.service;
    this.sidebar = config.sidebar;
    this.componentRenderer = config.componentRenderer;
    this.getData = config.getData;
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

    const aircraft = this.getRenderableAircraft().filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
    this.renderedAircraftCount = aircraft.length;
    if (aircraft.length > this.maxAnimatedAircraft) {
      this.cancelAllAnimations();
    }

    const visibleIds = new Set(aircraft.map(item => this.getMarkerId(item)));
    for (const [markerId, marker] of Array.from(this.markers.entries())) {
      if (visibleIds.has(markerId)) {
        continue;
      }
      this.stopAnimation(markerId);
      this.destroyMarkerIcon(marker);
      this.cluster.removeLayer(marker);
      this.markers.delete(markerId);
      this.markerTargets.delete(markerId);
    }

    this.cancelRender();
    this.renderMarkersInChunks(aircraft, ++this.renderVersion);
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

  clearTrack(): void {
    if (this.trackLine) {
      this.map?.removeLayer(this.trackLine);
      this.trackLine = null;
    }
  }

  destroy(): void {
    this.detailSub?.unsubscribe();
    this.cancelRender();
    this.cancelAllAnimations();
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

  private renderMarkersInChunks(aircraft: SatelliteLiveAircraft[], renderVersion: number, startIndex = 0): void {
    if (!this.cluster || renderVersion !== this.renderVersion) {
      return;
    }

    const chunkSize = 80;
    const endIndex = Math.min(startIndex + chunkSize, aircraft.length);
    for (let index = startIndex; index < endIndex; index += 1) {
      this.upsertMarker(getOwnProperty(aircraft, index));
    }

    if (endIndex < aircraft.length) {
      this.renderTimer = setTimeout(() => {
        this.renderMarkersInChunks(aircraft, renderVersion, endIndex);
      }, 0);
    }
    else {
      this.renderTimer = null;
    }
  }

  private getMarkerId(aircraft: SatelliteLiveAircraft): string {
    return normalizeEntityId(aircraft.icao24) ?? `${aircraft.latitude}:${aircraft.longitude}`;
  }

  private upsertMarker(aircraft: SatelliteLiveAircraft): void {
    if (!this.cluster) {
      return;
    }
    const markerId = this.getMarkerId(aircraft);
    const existing = this.markers.get(markerId);
    if (!existing) {
      const marker = this.createMarker(aircraft);
      if (!marker) {
        return;
      }
      const icaoId = normalizeEntityId(aircraft.icao24);
      const isSelected = this.isSelected(icaoId);
      const isLoading = this.isLoading(icaoId);
      marker.__orionAircraftIconState = `${this.markerZoomBucket}:${isSelected ? 1 : 0}:${isLoading ? 1 : 0}`;
      this.markers.set(markerId, marker);
      this.cluster.addLayer(marker);
      this.updateMarkerMotion(markerId, marker, aircraft);
      this.extendSelectedTrack(aircraft, icaoId);
      return;
    }

    const icaoId = normalizeEntityId(aircraft.icao24);
    const isSelected = this.isSelected(icaoId);
    const isLoading = this.isLoading(icaoId);
    const iconState = `${this.markerZoomBucket}:${isSelected ? 1 : 0}:${isLoading ? 1 : 0}`;
    this.updateMarkerMotion(markerId, existing, aircraft);
    this.extendSelectedTrack(aircraft, icaoId);

    const rotationDegrees = this.getMovementRotation(existing, aircraft);
    if (existing.__orionAircraftIconState !== iconState) {
      const renderedIcon = this.createIcon(aircraft, isSelected, isLoading, rotationDegrees);
      this.destroyMarkerIcon(existing);
      existing.setIcon(renderedIcon.icon);
      existing.__orionAircraftIconRef = renderedIcon.componentRef;
      existing.__orionAircraftIconState = iconState;
      return;
    }

    if (!this.shouldUpdateMarkerRotation(isSelected, isLoading)) {
      return;
    }

    this.updateMarkerRotation(existing, rotationDegrees);
  }

  private shouldUpdateMarkerRotation(isSelected: boolean, isLoading: boolean): boolean {
    return this.renderedAircraftCount <= this.maxAnimatedAircraft || isSelected || isLoading;
  }

  private updateMarkerMotion(markerId: string, marker: AircraftMarker, aircraft: SatelliteLiveAircraft): void {
    const lat = aircraft.latitude;
    const lon = aircraft.longitude;
    if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
      return;
    }
    const motionKey = [
      lat,
      lon,
      aircraft.velocity ?? '',
      aircraft.true_track ?? '',
      aircraft.on_ground ?? '',
    ].join(':');

    const isSameMotion = this.markerTargets.get(markerId) === motionKey;
    if (isSameMotion && this.animationFrames.has(markerId)) {
      return;
    }
    this.markerTargets.set(markerId, motionKey);

    const current = marker.getLatLng?.();
    const startLat = isSameMotion && Number.isFinite(current?.lat) ? current.lat : lat;
    const startLon = isSameMotion && Number.isFinite(current?.lng) ? current.lng : lon;
    const projectionSource = isSameMotion ? { ...aircraft, latitude: startLat, longitude: startLon } : aircraft;

    this.stopAnimation(markerId);
    if (!this.shouldAnimateMarker(aircraft)) {
      marker.setLatLng([lat, lon]);
      return;
    }

    marker.setLatLng([startLat, startLon]);
    const projected = this.projectPosition(projectionSource, this.animationDurationMs / 1000);
    if (!projected) {
      return;
    }

    this.animateMarker(markerId, marker, projected.lat, projected.lon);
  }

  private projectPosition(aircraft: SatelliteLiveAircraft, seconds: number): { lat: number; lon: number } | null {
    const lat = aircraft.latitude;
    const lon = aircraft.longitude;
    const velocity = aircraft.velocity;
    const bearing = aircraft.true_track;
    if (
      Boolean(aircraft.on_ground) ||
      !isFiniteNumber(lat) ||
      !isFiniteNumber(lon) ||
      !isFiniteNumber(velocity) ||
      !isFiniteNumber(bearing) ||
      velocity <= 0
    ) {
      return null;
    }

    const distanceMeters = velocity * seconds;
    const bearingRadians = (bearing * Math.PI) / 180;
    const latRadians = (lat * Math.PI) / 180;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = Math.max(1, metersPerDegreeLat * Math.cos(latRadians));

    return {
      lat: lat + (Math.cos(bearingRadians) * distanceMeters) / metersPerDegreeLat,
      lon: lon + (Math.sin(bearingRadians) * distanceMeters) / metersPerDegreeLon,
    };
  }

  private shouldAnimateMarker(aircraft: SatelliteLiveAircraft): boolean {
    const icaoId = normalizeEntityId(aircraft.icao24);
    return this.renderedAircraftCount <= this.maxAnimatedAircraft || this.isSelected(icaoId);
  }

  private animateMarker(markerId: string, marker: AircraftMarker, targetLat: number, targetLon: number): void {
    if (typeof window === 'undefined') {
      marker.setLatLng([targetLat, targetLon]);
      return;
    }

    this.stopAnimation(markerId);

    const current = marker.getLatLng();
    const startLat = current.lat;
    const startLon = current.lng;
    const deltaLat = targetLat - startLat;
    const deltaLon = targetLon - startLon;

    if (Math.abs(deltaLat) < 0.000001 && Math.abs(deltaLon) < 0.000001) {
      marker.setLatLng([targetLat, targetLon]);
      return;
    }

    this.animationFrames.set(markerId, {
      marker,
      startLat,
      startLon,
      targetLat,
      targetLon,
      startedAt: window.performance.now(),
    });

    if (this.animationFrame !== null) {
      return;
    }

    const step = (timestamp: number) => {
      for (const [id, animation] of Array.from(this.animationFrames.entries())) {
        const progress = Math.min(1, (timestamp - animation.startedAt) / this.animationDurationMs);
        animation.marker.setLatLng([
          animation.startLat + (animation.targetLat - animation.startLat) * progress,
          animation.startLon + (animation.targetLon - animation.startLon) * progress,
        ]);

        if (progress >= 1) {
          this.animationFrames.delete(id);
        }
      }

      if (this.animationFrames.size > 0) {
        this.animationFrame = window.requestAnimationFrame(step);
        return;
      }

      this.animationFrame = null;
    };

    this.animationFrame = window.requestAnimationFrame(step);
  }

  private stopAnimation(markerId: string): void {
    this.animationFrames.delete(markerId);
    if (this.animationFrames.size === 0 && this.animationFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private cancelAllAnimations(): void {
    this.animationFrames.clear();
    if (this.animationFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private createMarker(aircraft: SatelliteLiveAircraft): Nullable<AircraftMarker> {
    const latitude = aircraft.latitude;
    const longitude = aircraft.longitude;
    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      return null;
    }
    const icaoId = normalizeEntityId(aircraft.icao24);
    const isSelected = this.isSelected(icaoId);
    const isLoading = this.isLoading(icaoId);
    const renderedIcon = this.createIcon(aircraft, isSelected, isLoading);
    const marker: AircraftMarker = this.L.marker([latitude, longitude], {
      icon: renderedIcon.icon,
    });
    marker.__orionAircraftIconRef = renderedIcon.componentRef;
    if (icaoId) {
      marker.bindTooltip(escapeTooltipText(icaoId), {
        direction: 'top',
        offset:    [0, -10],
        opacity:   0.95,
        sticky:    true,
      });
    }
    if (aircraft.icao24) {
      marker.on('click', () => {
        this.loadDetails(aircraft);
      });
    }
    return marker;
  }

  private loadDetails(seed: SatelliteLiveAircraft): void {
    const markerId = normalizeEntityId(seed.icao24);
    if (!markerId || !seed.icao24) {
      return;
    }
    const token = this.sidebar.openLoading('aircraft', markerId, seed);
    this.detailSub?.unsubscribe();
    this.detailSub = this.service.pollByICAO(seed.icao24).subscribe({
      next: (res) => {
        if (!this.sidebar.isCurrentRequestToken(token)) {
          return;
        }
        const aircraft = this.extractDetails(res);
        const status = getResponseStatus(res);
        if (aircraft) {
          this.renderTrack(aircraft);
          this.sidebar.openData('aircraft', aircraft);
        }
        else if (isPendingStatus(status)) {
          return;
        }
        else {
          this.sidebar.openError('aircraft', markerId, 'Unable to load aircraft details');
        }
      },
      error: (err) => {
        if (!this.sidebar.isCurrentRequestToken(token)) {
          return;
        }
        this.sidebar.openError('aircraft', markerId, err?.error?.detail ?? err?.message ?? 'Aircraft details request failed');
      },
    });
  }

  private getMovementRotation(marker: AircraftMarker, aircraft: SatelliteLiveAircraft): number {
    if (isFiniteNumber(aircraft.true_track)) {
      return this.toCssRotation(aircraft.true_track);
    }

    const current = marker.getLatLng?.();
    const targetLat = aircraft.latitude;
    const targetLon = aircraft.longitude;
    if (
      current &&
      Number.isFinite(current.lat) &&
      Number.isFinite(current.lng) &&
      isFiniteNumber(targetLat) &&
      isFiniteNumber(targetLon)
    ) {
      const bearing = getBearingDegrees(current.lat, current.lng, targetLat, targetLon);
      if (bearing !== null) {
        return this.toCssRotation(bearing);
      }
    }

    return this.toCssRotation(aircraft.true_track);
  }

  private toCssRotation(track: number | null | undefined): number {
    return isFiniteNumber(track) ? track : 0;
  }

  private createIcon(aircraft: SatelliteLiveAircraft, isSelected: boolean, isLoading: boolean, rotationDegrees = this.toCssRotation(aircraft.true_track)): { icon: Leaflet.DivIcon; componentRef: ComponentRef<AircraftMarkerIconComponent> } {
    const size = getMarkerBaseSize(this.map, 'aircraft');
    const half = Math.round(size / 2);
    const altitudeFeet = (aircraft.baro_altitude ?? aircraft.geo_altitude ?? 0) * 3.28084;
    const altitudeFill = aircraft.on_ground
      ? '#6b7280'
      : altitudeFeet < 3000
        ? '#f97316'
        : altitudeFeet < 10000
          ? '#facc15'
          : altitudeFeet < 18000
            ? '#22c55e'
            : altitudeFeet < 25000
              ? '#06b6d4'
              : altitudeFeet < 35000
                ? '#2563eb'
                : altitudeFeet < 45000
                  ? '#a855f7'
                  : '#ef4444';
    const iconFill = isSelected ? '#ef4444' : altitudeFill;
    const strokeColor = isSelected ? '#fee2e2' : '#020617';

    const rendered = this.componentRenderer.create(AircraftMarkerIconComponent, {
      iconFill,
      strokeColor,
      rotationDegrees,
      isLoading,
      isSelected,
    });

    return {
      icon: this.L.divIcon({
        html: this.componentRenderer.elementAsHtml(rendered.element),
        className: 'bg-transparent border-0',
        iconSize: [size, size],
        iconAnchor: [half, half],
      }),
      componentRef: rendered.componentRef,
    };
  }

  private destroyMarkerIcon(marker: AircraftMarker): void {
    this.componentRenderer.destroy(marker.__orionAircraftIconRef);
    marker.__orionAircraftIconRef = null;
  }

  private updateMarkerRotation(marker: AircraftMarker, rotationDegrees: number): void {
    const componentRef = marker.__orionAircraftIconRef;
    if (componentRef) {
      componentRef.instance.rotationDegrees = rotationDegrees;
      componentRef.changeDetectorRef.detectChanges();
    }
  }

  private getRenderKey(): string {
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

  private getRenderableAircraft(): SatelliteLiveAircraft[] {
    const bounds = this.map?.getBounds?.();
    const zoom = this.map?.getZoom?.() ?? 3;
    const visible = this.getData().filter(aircraft => {
      const latitude = aircraft.latitude;
      const longitude = aircraft.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return false;
      }
      if (!bounds) {
        return true;
      }
      return bounds.contains([latitude, longitude]);
    });
    if (visible.length <= 1200) {
      return visible;
    }
    return this.limitAircraftForViewport(this.sampleCrowdedAircraftAreas(visible, zoom), visible, zoom);
  }

  private sampleCrowdedAircraftAreas(aircraft: SatelliteLiveAircraft[], zoom: number): SatelliteLiveAircraft[] {
    const sampleRatio = this.getSampleRatio(zoom);
    const buckets = new Map<string, SatelliteLiveAircraft[]>();
    aircraft.forEach(item => {
      const bucketKey = this.getSampleBucketKey(item, zoom);
      const bucketItems = buckets.get(bucketKey) ?? [];
      bucketItems.push(item);
      buckets.set(bucketKey, bucketItems);
    });

    const sampled: SatelliteLiveAircraft[] = [];
    buckets.forEach(bucketItems => {
      if (bucketItems.length <= this.sparseAircraftAreaThreshold) {
        sampled.push(...bucketItems);
        return;
      }

      const keepCount = this.getAircraftAreaKeepCount(bucketItems.length, sampleRatio);
      if (keepCount >= bucketItems.length) {
        sampled.push(...bucketItems);
        return;
      }

      sampled.push(...this.takeSpatiallyDistributedAircraft(bucketItems, keepCount, zoom));
    });

    return sampled;
  }

  private getAircraftAreaKeepCount(count: number, sampleRatio: number): number {
    if (count <= this.crowdedAircraftAreaThreshold) {
      return Math.max(this.minimumSampledAircraftPerArea, Math.ceil(count * this.getModerateAircraftSampleRatio(sampleRatio)));
    }

    return Math.max(this.minimumSampledAircraftPerArea, Math.ceil(count * sampleRatio));
  }

  private getModerateAircraftSampleRatio(sampleRatio: number): number {
    return Math.max(sampleRatio, 0.264);
  }

  private limitAircraftForViewport(aircraft: SatelliteLiveAircraft[], sourceAircraft: SatelliteLiveAircraft[], zoom: number): SatelliteLiveAircraft[] {
    const limit = this.getViewportAircraftLimit(zoom);
    if (aircraft.length <= limit) {
      return aircraft;
    }

    const sourceBucketCounts = this.getAircraftBucketCounts(sourceAircraft, zoom);
    const activeEntity = this.sidebar.getActiveEntity();
    const activeAircraftId = activeEntity?.type === 'aircraft' ? activeEntity.id : '';
    const activeAircraft = activeAircraftId
      ? aircraft.find(item => normalizeEntityId(item.icao24) === activeAircraftId) ?? null
      : null;
    const preserved: SatelliteLiveAircraft[] = [];
    const denseCandidates: SatelliteLiveAircraft[] = [];

    aircraft.forEach(item => {
      const itemId = normalizeEntityId(item.icao24);
      if (activeAircraft && itemId === activeAircraftId) {
        return;
      }

      const bucketKey = this.getSampleBucketKey(item, zoom);
      const sourceBucketCount = sourceBucketCounts.get(bucketKey) ?? 0;
      if (sourceBucketCount <= this.sparseAircraftAreaThreshold) {
        preserved.push(item);
        return;
      }

      denseCandidates.push(item);
    });

    const remainingLimit = Math.max(0, limit - preserved.length - (activeAircraft ? 1 : 0));
    const limited = this.takeSpatiallyDistributedAircraft(denseCandidates, remainingLimit, zoom);

    return activeAircraft ? [activeAircraft, ...preserved, ...limited] : [...preserved, ...limited];
  }

  private getAircraftBucketCounts(aircraft: SatelliteLiveAircraft[], zoom: number): Map<string, number> {
    const counts = new Map<string, number>();
    aircraft.forEach(item => {
      const bucketKey = this.getSampleBucketKey(item, zoom);
      counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
    });
    return counts;
  }

  private takeSpatiallyDistributedAircraft(aircraft: SatelliteLiveAircraft[], limit: number, zoom: number): SatelliteLiveAircraft[] {
    if (limit <= 0) {
      return [];
    }
    if (aircraft.length <= limit) {
      return aircraft;
    }

    const cells = new Map<string, AircraftDistributionCell>();
    aircraft.forEach(item => {
      const cellRef = this.getDistributionCell(item, zoom);
      const cell = cells.get(cellRef.key) ?? { ...cellRef, items: [] };
      cell.items.push(item);
      cells.set(cellRef.key, cell);
    });

    const orderedCells = this.orderDistributionCells(Array.from(cells.values()).map(cell => ({
      ...cell,
      items: cell.items.slice().sort((left, right) => Math.abs(stableHash(this.getStableAircraftKey(left))) - Math.abs(stableHash(this.getStableAircraftKey(right)))),
    })), limit);
    const selected: SatelliteLiveAircraft[] = [];
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

  private orderDistributionCells(cells: AircraftDistributionCell[], limit: number): AircraftDistributionCell[] {
    if (cells.length <= limit) {
      return cells.slice().sort((left, right) => left.row - right.row || left.col - right.col);
    }

    const rowGroups = new Map<number, AircraftDistributionCell[]>();
    cells.forEach(cell => {
      const rowCells = rowGroups.get(cell.row) ?? [];
      rowCells.push(cell);
      rowGroups.set(cell.row, rowCells);
    });

    const quotas = Array.from(rowGroups.entries())
      .map(([row, rowCells]) => {
        const sortedCells = rowCells.slice().sort((left, right) => left.col - right.col);
        const rawQuota = (limit * sortedCells.length) / cells.length;
        return {
          row,
          cells: sortedCells,
          quota: Math.min(sortedCells.length, Math.floor(rawQuota)),
          remainder: rawQuota % 1,
        };
      })
      .sort((left, right) => left.row - right.row);
    let used = quotas.reduce((total, quota) => total + quota.quota, 0);

    quotas
      .slice()
      .sort((left, right) => right.remainder - left.remainder || right.cells.length - left.cells.length)
      .forEach(quota => {
        if (used >= limit || quota.quota >= quota.cells.length) {
          return;
        }
        quota.quota += 1;
        used += 1;
      });

    while (used < limit) {
      const nextQuota = quotas.find(quota => quota.quota < quota.cells.length);
      if (!nextQuota) {
        break;
      }
      nextQuota.quota += 1;
      used += 1;
    }

    return quotas.flatMap(quota => this.takeEvenlySpacedCells(quota.cells, quota.quota));
  }

  private takeEvenlySpacedCells(cells: AircraftDistributionCell[], count: number): AircraftDistributionCell[] {
    if (count <= 0) {
      return [];
    }
    if (count >= cells.length) {
      return cells;
    }

    const selected: AircraftDistributionCell[] = [];
    const step = cells.length / count;
    for (let index = 0; index < count; index += 1) {
      selected.push(cells[Math.min(cells.length - 1, Math.floor((index + 0.5) * step))]);
    }
    return selected;
  }

  private getDistributionCell(aircraft: SatelliteLiveAircraft, zoom: number): { key: string; row: number; col: number } {
    const screenCell = this.getScreenDistributionCell(aircraft, this.getDistributionScreenGridSize(zoom));
    if (screenCell) {
      return screenCell;
    }

    const latitude = aircraft.latitude;
    const longitude = aircraft.longitude;
    if (isFiniteNumber(latitude) && isFiniteNumber(longitude)) {
      const gridSize = this.getDistributionGridSize(zoom);
      const row = Math.floor((latitude + 90) / gridSize);
      const col = Math.floor((longitude + 180) / gridSize);
      return { key: `cell:${gridSize}:${row}:${col}`, row, col };
    }

    return { key: 'cell:unknown', row: 0, col: 0 };
  }

  private getScreenBucketKey(aircraft: SatelliteLiveAircraft, gridSize: number): string | null {
    const cell = this.getScreenCell(aircraft, gridSize);
    return cell ? `screen:${gridSize}:${cell.row}:${cell.col}` : null;
  }

  private getScreenDistributionCell(aircraft: SatelliteLiveAircraft, gridSize: number): { key: string; row: number; col: number } | null {
    const cell = this.getScreenCell(aircraft, gridSize);
    return cell ? { key: `screen-cell:${gridSize}:${cell.row}:${cell.col}`, row: cell.row, col: cell.col } : null;
  }

  private getScreenCell(aircraft: SatelliteLiveAircraft, gridSize: number): { row: number; col: number } | null {
    const latitude = aircraft.latitude;
    const longitude = aircraft.longitude;
    if (!this.map?.latLngToContainerPoint || typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const point = this.map.latLngToContainerPoint([latitude, longitude]);
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
      return null;
    }

    return {
      row: Math.floor(point.y / gridSize),
      col: Math.floor(point.x / gridSize),
    };
  }

  private getSampleScreenGridSize(zoom: number): number {
    if (zoom >= 7) {
      return 96;
    }
    if (zoom >= 6) {
      return 104;
    }
    if (zoom >= 5) {
      return 112;
    }
    if (zoom >= 4) {
      return 120;
    }
    return 128;
  }

  private getDistributionScreenGridSize(zoom: number): number {
    return Math.max(32, Math.round(this.getSampleScreenGridSize(zoom) / 3));
  }

  private getDistributionGridSize(zoom: number): number {
    return Math.max(0.25, this.getSampleGridSize(zoom) / 4);
  }

  private getViewportAircraftLimit(zoom: number): number {
    if (zoom >= 8) {
      return 984;
    }
    if (zoom >= 7) {
      return 840;
    }
    if (zoom >= 6) {
      return 732;
    }
    if (zoom >= 5) {
      return 624;
    }
    if (zoom >= 4) {
      return 516;
    }
    return 432;
  }

  private getSampleRatio(zoom: number): number {
    if (zoom >= 8) {
      return 0.456;
    }
    if (zoom >= 7) {
      return 0.396;
    }
    if (zoom >= 6) {
      return 0.324;
    }
    if (zoom >= 5) {
      return 0.408;
    }
    if (zoom >= 4) {
      return 0.24;
    }
    if (zoom >= 3) {
      return 0.168;
    }
    return 0.168;
  }

  private getSampleBucketKey(aircraft: SatelliteLiveAircraft, zoom: number): string {
    const screenBucketKey = this.getScreenBucketKey(aircraft, this.getSampleScreenGridSize(zoom));
    if (screenBucketKey) {
      return screenBucketKey;
    }

    const latitude = aircraft.latitude;
    const longitude = aircraft.longitude;
    if (isFiniteNumber(latitude) && isFiniteNumber(longitude)) {
      const gridSize = this.getSampleGridSize(zoom);
      const latBucket = Math.floor((latitude + 90) / gridSize);
      const lonBucket = Math.floor((longitude + 180) / gridSize);
      return `grid:${gridSize}:${latBucket}:${lonBucket}`;
    }

    return 'grid:unknown';
  }

  private getSampleGridSize(zoom: number): number {
    if (zoom >= 7) {
      return 1;
    }
    if (zoom >= 6) {
      return 1.5;
    }
    if (zoom >= 5) {
      return 2;
    }
    if (zoom >= 4) {
      return 2.5;
    }
    return 3;
  }

  private getStableAircraftKey(aircraft: SatelliteLiveAircraft): string {
    return normalizeEntityId(aircraft.icao24) ?? `${aircraft.latitude}:${aircraft.longitude}`;
  }

  private extractDetails(res: unknown): SatelliteLiveAircraft | null {
    const response = asUnknownRecord(res);
    const payload = asUnknownRecord(response.result ?? res);
    if (Array.isArray(payload.aircraft) && payload.aircraft.length > 0) {
      return payload.aircraft[0] as SatelliteLiveAircraft;
    }
    if (Array.isArray(payload.aircrafts) && payload.aircrafts.length > 0) {
      return payload.aircrafts[0] as SatelliteLiveAircraft;
    }
    if (isUnknownRecord(payload.aircraft)) {
      return {
        ...payload.aircraft,
        ...(payload.track ? { track: payload.track } : {}),
        ...(payload.path ? { path: payload.path } : {}),
      } as SatelliteLiveAircraft;
    }
    if (payload.icao24 != null) {
      return payload as unknown as SatelliteLiveAircraft;
    }
    if (response.icao24 != null) {
      return response as unknown as SatelliteLiveAircraft;
    }
    return null;
  }

  private renderTrack(aircraft: SatelliteLiveAircraft): void {
    const path = aircraft.track?.path ?? aircraft.path;
    this.clearTrack();
    if (!this.map || !this.L || !Array.isArray(path) || path.length < 2) {
      return;
    }
    const points: Leaflet.LatLngTuple[] = path.flatMap((point): Leaflet.LatLngTuple[] =>
      Array.isArray(point) && typeof point[1] === 'number' && typeof point[2] === 'number' && Number.isFinite(point[1]) && Number.isFinite(point[2])
        ? [[point[1], point[2]]]
        : []);
    if (points.length < 2) {
      return;
    }
    this.trackLine = this.L.polyline(points, {
      color: '#facc15',
      weight: 4,
      opacity: 0.95,
      dashArray: '10 8',
      lineCap: 'butt',
      interactive: false,
    }).addTo(this.map);
    this.trackLine.bringToFront?.();
  }

  private extendSelectedTrack(aircraft: SatelliteLiveAircraft, icaoId: string | null): void {
    const latitude = aircraft.latitude;
    const longitude = aircraft.longitude;
    if (!this.isSelected(icaoId) || !this.trackLine || typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    const points = this.trackLine.getLatLngs?.() || [];
    const last = points[points.length - 1];
    if (!last || Array.isArray(last) || Math.abs(last.lat - latitude) > 0.00001 || Math.abs(last.lng - longitude) > 0.00001) {
      this.trackLine.addLatLng([latitude, longitude]);
      this.trackLine.bringToFront?.();
    }
  }

  private isSelected(id: string | null): boolean {
    const activeEntity = this.sidebar.getActiveEntity();
    return !!id && activeEntity?.type === 'aircraft' && activeEntity.id === id;
  }

  private isLoading(id: string | null): boolean {
    const loadingEntity = this.sidebar.getLoadingEntity();
    return !!id && loadingEntity?.type === 'aircraft' && loadingEntity.id === id;
  }
}
