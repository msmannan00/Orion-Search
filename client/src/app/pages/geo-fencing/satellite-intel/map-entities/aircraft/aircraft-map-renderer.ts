import { ComponentRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { SatelliteLiveAircraft } from '../../model/satellite-intel-api.models';
import { SatelliteAircraftTrackingService } from './aircraft-tracking.service';
import { AircraftMarkerIconComponent } from './components/aircraft-marker-icon/aircraft-marker-icon.component';
import { LeafletComponentRenderer } from '../../map-utils/leaflet-component-renderer';
import { MarkerAnimator } from '../../map-utils/marker-animator';
import { distributionCell, escapeTooltipText, getBearingDegrees, getMarkerBaseSize, getResponseStatus, isPendingStatus, moderateSampleRatio, normalizeEntityId, orderDistributionCells, sampleBucketKey, stableHash, viewportSampleRatio } from '../../map-utils/renderer-utils';
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
  private detailSub?: Subscription;
  private markerZoomBucket = 0;
  private renderedAircraftCount = 0;
  private readonly animationDurationMs = 8000;
  private readonly animator = new MarkerAnimator<AircraftMarker>(this.animationDurationMs);
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
      this.animator.cancelAll();
    }

    const visibleIds = new Set(aircraft.map(item => this.getMarkerId(item)));
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
    if (isSameMotion && this.animator.has(markerId)) {
      return;
    }
    this.markerTargets.set(markerId, motionKey);

    const current = marker.getLatLng?.();
    const startLat = isSameMotion && Number.isFinite(current?.lat) ? current.lat : lat;
    const startLon = isSameMotion && Number.isFinite(current?.lng) ? current.lng : lon;
    const projectionSource = isSameMotion ? { ...aircraft, latitude: startLat, longitude: startLon } : aircraft;

    this.animator.stop(markerId);
    if (!this.shouldAnimateMarker(aircraft)) {
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
    const sampleRatio = viewportSampleRatio(zoom);
    const buckets = new Map<string, SatelliteLiveAircraft[]>();
    aircraft.forEach(item => {
      const bucketKey = sampleBucketKey(this.map, item.latitude, item.longitude, zoom);
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
      return Math.max(this.minimumSampledAircraftPerArea, Math.ceil(count * moderateSampleRatio(sampleRatio)));
    }

    return Math.max(this.minimumSampledAircraftPerArea, Math.ceil(count * sampleRatio));
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

      const bucketKey = sampleBucketKey(this.map, item.latitude, item.longitude, zoom);
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
      const bucketKey = sampleBucketKey(this.map, item.latitude, item.longitude, zoom);
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
      const cellRef = distributionCell(this.map, item.latitude, item.longitude, zoom);
      const cell = cells.get(cellRef.key) ?? { ...cellRef, items: [] };
      cell.items.push(item);
      cells.set(cellRef.key, cell);
    });

    const orderedCells = orderDistributionCells(Array.from(cells.values()).map(cell => ({
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
