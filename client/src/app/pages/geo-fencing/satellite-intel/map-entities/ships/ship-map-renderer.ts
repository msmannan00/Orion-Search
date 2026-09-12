import { ComponentRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { SatelliteLiveShip } from '../../model/satellite-intel-api.models';
import { SatelliteShipTrackingService } from './ship-tracking.service';
import { LeafletComponentRenderer } from '../../map-utils/leaflet-component-renderer';
import { MarkerAnimator } from '../../map-utils/marker-animator';
import { ShipMarkerIconComponent } from './components/ship-marker-icon/ship-marker-icon.component';
import { distributionCell, escapeTooltipText, getBearingDegrees, getMarkerBaseSize, getResponseStatus, isPendingStatus, moderateSampleRatio, normalizeEntityId, orderDistributionCells, sampleBucketKey, stableHash, viewportSampleRatio } from '../../map-utils/renderer-utils';
import { TrackingSidebarBridge } from '../../../models/geo-fencing.models';
import type * as Leaflet from 'leaflet';
import { asUnknownRecord, Augmented, getOwnProperty, isFiniteNumber, Nullable } from '../../../../../shared/utils/type-guards.util';
import { ShipDistributionCell } from '../../model/satellite-intel.model';

type ShipMarker = Augmented<Leaflet.Marker, {
  __orionShipIconRef?: Nullable<ComponentRef<ShipMarkerIconComponent>>;
  __orionShipIconState?: string;
}>;


export class ShipMapRenderer {
  private cluster: Nullable<Leaflet.LayerGroup> = null;
  private renderKey = '';
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private renderVersion = 0;
  private markers = new Map<string, ShipMarker>();
  private markerTargets = new Map<string, string>();
  private detailSub?: Subscription;
  private markerZoomBucket = 0;
  private readonly animationDurationMs = 8000;
  private readonly animator = new MarkerAnimator<ShipMarker>(this.animationDurationMs);
  private readonly sparseShipAreaThreshold = 15;
  private readonly crowdedShipAreaThreshold = 100;
  private readonly minimumSampledShipsPerArea = 12;
  private readonly maxAnimatedShips = 80;
  private readonly L: typeof Leaflet;
  private readonly map: Leaflet.Map;
  private readonly service: SatelliteShipTrackingService;
  private readonly sidebar: TrackingSidebarBridge;
  private readonly componentRenderer: LeafletComponentRenderer;
  private readonly getData: () => SatelliteLiveShip[];

  constructor(config: { L: typeof Leaflet; map: Leaflet.Map; service: SatelliteShipTrackingService; sidebar: TrackingSidebarBridge; componentRenderer: LeafletComponentRenderer; getData: () => SatelliteLiveShip[] }) {
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

    const ships = this.getRenderableShips().filter(ship => Number.isFinite(ship.latitude) && Number.isFinite(ship.longitude));
    if (ships.length > this.maxAnimatedShips) {
      this.animator.cancelAll();
    }
    const visibleIds = new Set(ships.map(ship => this.getMarkerId(ship)));
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
    this.renderMarkersInChunks(ships, ++this.renderVersion);
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

  private renderMarkersInChunks(ships: SatelliteLiveShip[], renderVersion: number, startIndex = 0): void {
    if (!this.cluster || renderVersion !== this.renderVersion) {
      return;
    }

    const chunkSize = 160;
    const endIndex = Math.min(startIndex + chunkSize, ships.length);
    for (let index = startIndex; index < endIndex; index += 1) {
      this.upsertMarker(getOwnProperty(ships, index));
    }

    if (endIndex < ships.length) {
      this.renderTimer = setTimeout(() => {
        this.renderMarkersInChunks(ships, renderVersion, endIndex);
      }, 0);
    }
    else {
      this.renderTimer = null;
    }
  }

  private getMarkerId(ship: SatelliteLiveShip): string {
    return normalizeEntityId(ship.mmsi) ?? `${ship.latitude}:${ship.longitude}`;
  }

  private upsertMarker(ship: SatelliteLiveShip): void {
    if (!this.cluster) {
      return;
    }
    const markerId = this.getMarkerId(ship);
    const existing = this.markers.get(markerId);
    if (!existing) {
      const marker = this.createMarker(ship);
      if (!marker) {
        return;
      }
      const mmsiId = normalizeEntityId(ship.mmsi);
      const isSelected = this.isSelected(mmsiId);
      const isLoading = this.isLoading(mmsiId);
      marker.__orionShipIconState = `${this.markerZoomBucket}:${isSelected ? 1 : 0}:${isLoading ? 1 : 0}`;
      this.markers.set(markerId, marker);
      this.cluster.addLayer(marker);
      this.updateMarkerMotion(markerId, marker, ship);
      return;
    }

    const mmsiId = normalizeEntityId(ship.mmsi);
    const isSelected = this.isSelected(mmsiId);
    const isLoading = this.isLoading(mmsiId);
    const iconState = `${this.markerZoomBucket}:${isSelected ? 1 : 0}:${isLoading ? 1 : 0}`;
    this.updateMarkerMotion(markerId, existing, ship);

    const rotationDegrees = this.getMovementRotation(existing, ship);
    if (existing.__orionShipIconState !== iconState) {
      const renderedIcon = this.createIcon(ship, isSelected, isLoading, rotationDegrees);
      this.destroyMarkerIcon(existing);
      existing.setIcon(renderedIcon.icon);
      existing.__orionShipIconRef = renderedIcon.componentRef;
      existing.__orionShipIconState = iconState;
      return;
    }

    this.updateMarkerRotation(existing, rotationDegrees);
  }

  private updateMarkerMotion(markerId: string, marker: ShipMarker, ship: SatelliteLiveShip): void {
    const lat = ship.latitude;
    const lon = ship.longitude;
    if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
      return;
    }
    const motionKey = [
      lat,
      lon,
      ship.speed ?? '',
      ship.course ?? ship.true_heading ?? '',
    ].join(':');

    const isSameMotion = this.markerTargets.get(markerId) === motionKey;
    if (isSameMotion && this.animator.has(markerId)) {
      return;
    }
    this.markerTargets.set(markerId, motionKey);

    const current = marker.getLatLng?.();
    const startLat = isSameMotion && Number.isFinite(current?.lat) ? current.lat : lat;
    const startLon = isSameMotion && Number.isFinite(current?.lng) ? current.lng : lon;
    const projectionSource = isSameMotion ? { ...ship, latitude: startLat, longitude: startLon } : ship;

    this.animator.stop(markerId);
    if (!this.shouldAnimateMarker(ship)) {
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

  private projectPosition(ship: SatelliteLiveShip, seconds: number): { lat: number; lon: number } | null {
    const lat = ship.latitude;
    const lon = ship.longitude;
    const speed = ship.speed;
    const bearing = ship.course ?? ship.true_heading;
    if (
      !isFiniteNumber(lat) ||
      !isFiniteNumber(lon) ||
      !isFiniteNumber(speed) ||
      !isFiniteNumber(bearing) ||
      speed <= 0
    ) {
      return null;
    }

    const distanceMeters = speed * 0.514444 * seconds;
    const bearingRadians = (bearing * Math.PI) / 180;
    const latRadians = (lat * Math.PI) / 180;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = Math.max(1, metersPerDegreeLat * Math.cos(latRadians));

    return {
      lat: lat + (Math.cos(bearingRadians) * distanceMeters) / metersPerDegreeLat,
      lon: lon + (Math.sin(bearingRadians) * distanceMeters) / metersPerDegreeLon,
    };
  }

  private shouldAnimateMarker(ship: SatelliteLiveShip): boolean {
    const shipId = normalizeEntityId(ship.mmsi);
    return this.markers.size <= this.maxAnimatedShips || this.isSelected(shipId);
  }

  private createMarker(ship: SatelliteLiveShip): Nullable<ShipMarker> {
    const latitude = ship.latitude;
    const longitude = ship.longitude;
    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      return null;
    }
    const mmsiId = normalizeEntityId(ship.mmsi);
    const isSelected = this.isSelected(mmsiId);
    const isLoading = this.isLoading(mmsiId);
    const renderedIcon = this.createIcon(ship, isSelected, isLoading);
    const marker: ShipMarker = this.L.marker([latitude, longitude], {
      icon: renderedIcon.icon,
    });
    marker.__orionShipIconRef = renderedIcon.componentRef;
    if (mmsiId) {
      marker.bindTooltip(escapeTooltipText(mmsiId), {
        direction: 'top',
        offset:    [0, -10],
        opacity:   0.95,
        sticky:    true,
      });
    }
    if (ship.mmsi) {
      marker.on('click', () => {
        this.loadDetails(ship);
      });
    }
    return marker;
  }

  private loadDetails(seed: SatelliteLiveShip): void {
    const markerId = normalizeEntityId(seed.mmsi);
    if (!markerId || !seed.mmsi) {
      return;
    }
    const token = this.sidebar.openLoading('ship', markerId, seed);
    this.detailSub?.unsubscribe();
    this.detailSub = this.service.pollByMMSI(seed.mmsi).subscribe({
      next: (res) => {
        if (!this.sidebar.isCurrentRequestToken(token)) {
          return;
        }
        const ship = this.extractDetails(res);
        const status = getResponseStatus(res);
        if (ship) {
          this.sidebar.openData('ship', ship);
        }
        else if (isPendingStatus(status)) {
          return;
        }
        else {
          this.sidebar.openError('ship', markerId, 'Unable to load ship details');
        }
      },
      error: (err) => {
        if (!this.sidebar.isCurrentRequestToken(token)) {
          return;
        }
        this.sidebar.openError('ship', markerId, err?.error?.detail ?? err?.message ?? 'Ship details request failed');
      },
    });
  }

  private getMovementRotation(marker: ShipMarker, ship: SatelliteLiveShip): number {
    if (isFiniteNumber(ship.course)) {
      return ship.course;
    }
    if (isFiniteNumber(ship.true_heading)) {
      return ship.true_heading;
    }

    const current = marker.getLatLng?.();
    const targetLat = ship.latitude;
    const targetLon = ship.longitude;
    if (
      current &&
      Number.isFinite(current.lat) &&
      Number.isFinite(current.lng) &&
      isFiniteNumber(targetLat) &&
      isFiniteNumber(targetLon)
    ) {
      const bearing = getBearingDegrees(current.lat, current.lng, targetLat, targetLon);
      if (bearing !== null) {
        return bearing;
      }
    }

    return 0;
  }

  private createIcon(ship: SatelliteLiveShip, isSelected: boolean, isLoading: boolean, rotationDegrees = isFiniteNumber(ship.course) ? ship.course : isFiniteNumber(ship.true_heading) ? ship.true_heading : 0): { icon: Leaflet.DivIcon; componentRef: ComponentRef<ShipMarkerIconComponent> } {
    const size = getMarkerBaseSize(this.map, 'ship');
    const half = Math.round(size / 2);
    const rendered = this.componentRenderer.create(ShipMarkerIconComponent, {
      strokeColor: isSelected ? '#dbeafe' : '#0ea5e9',
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

  private destroyMarkerIcon(marker: ShipMarker): void {
    this.componentRenderer.destroy(marker.__orionShipIconRef);
    marker.__orionShipIconRef = null;
  }

  private updateMarkerRotation(marker: ShipMarker, rotationDegrees: number): void {
    const componentRef = marker.__orionShipIconRef;
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

  private getRenderableShips(): SatelliteLiveShip[] {
    const bounds = this.map?.getBounds?.();
    const zoom = this.map?.getZoom?.() ?? 3;
    const visible = this.getData().filter(ship => {
      const latitude = ship.latitude;
      const longitude = ship.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return false;
      }
      if (!bounds) {
        return true;
      }
      return bounds.pad(0.18).contains([latitude, longitude]);
    });
    if (visible.length <= 1200) {
      return visible;
    }
    return this.limitShipsForViewport(this.sampleCrowdedShipAreas(visible, zoom), visible, zoom);
  }

  private sampleCrowdedShipAreas(ships: SatelliteLiveShip[], zoom: number): SatelliteLiveShip[] {
    const sampleRatio = viewportSampleRatio(zoom);
    const buckets = new Map<string, SatelliteLiveShip[]>();
    ships.forEach(ship => {
      const bucketKey = sampleBucketKey(this.map, ship.latitude, ship.longitude, zoom);
      const bucketItems = buckets.get(bucketKey) ?? [];
      bucketItems.push(ship);
      buckets.set(bucketKey, bucketItems);
    });

    const sampled: SatelliteLiveShip[] = [];
    buckets.forEach(bucketItems => {
      if (bucketItems.length <= this.sparseShipAreaThreshold) {
        sampled.push(...bucketItems);
        return;
      }

      const keepCount = this.getShipAreaKeepCount(bucketItems.length, sampleRatio);
      if (keepCount >= bucketItems.length) {
        sampled.push(...bucketItems);
        return;
      }

      sampled.push(...this.takeSpatiallyDistributedShips(bucketItems, keepCount, zoom));
    });

    return sampled;
  }

  private getShipAreaKeepCount(count: number, sampleRatio: number): number {
    if (count <= this.crowdedShipAreaThreshold) {
      return Math.max(this.minimumSampledShipsPerArea, Math.ceil(count * moderateSampleRatio(sampleRatio)));
    }

    return Math.max(this.minimumSampledShipsPerArea, Math.ceil(count * sampleRatio));
  }

  private limitShipsForViewport(ships: SatelliteLiveShip[], sourceShips: SatelliteLiveShip[], zoom: number): SatelliteLiveShip[] {
    const limit = this.getViewportShipLimit(zoom);
    if (ships.length <= limit) {
      return ships;
    }

    const sourceBucketCounts = this.getShipBucketCounts(sourceShips, zoom);
    const activeEntity = this.sidebar.getActiveEntity();
    const loadingEntity = this.sidebar.getLoadingEntity();
    const activeShipId = activeEntity?.type === 'ship' ? activeEntity.id : '';
    const loadingShipId = loadingEntity?.type === 'ship' ? loadingEntity.id : '';
    const activeShip = activeShipId
      ? ships.find(ship => normalizeEntityId(ship.mmsi) === activeShipId) ?? null
      : null;
    const loadingShip = loadingShipId
      ? ships.find(ship => normalizeEntityId(ship.mmsi) === loadingShipId && normalizeEntityId(ship.mmsi) !== activeShipId) ?? null
      : null;
    const preserved: SatelliteLiveShip[] = [];
    const denseCandidates: SatelliteLiveShip[] = [];

    ships.forEach(ship => {
      const shipId = normalizeEntityId(ship.mmsi);
      if (activeShip && shipId === activeShipId) {
        return;
      }
      if (loadingShip && shipId === loadingShipId) {
        return;
      }

      const bucketKey = sampleBucketKey(this.map, ship.latitude, ship.longitude, zoom);
      const sourceBucketCount = sourceBucketCounts.get(bucketKey) ?? 0;
      if (sourceBucketCount <= this.sparseShipAreaThreshold) {
        preserved.push(ship);
        return;
      }

      denseCandidates.push(ship);
    });

    const pinned = [activeShip, loadingShip].filter((ship): ship is SatelliteLiveShip => !!ship);
    const remainingLimit = Math.max(0, limit - preserved.length - pinned.length);
    const limited = this.takeSpatiallyDistributedShips(denseCandidates, remainingLimit, zoom);

    return [...pinned, ...preserved, ...limited];
  }

  private getShipBucketCounts(ships: SatelliteLiveShip[], zoom: number): Map<string, number> {
    const counts = new Map<string, number>();
    ships.forEach(ship => {
      const bucketKey = sampleBucketKey(this.map, ship.latitude, ship.longitude, zoom);
      counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1);
    });
    return counts;
  }

  private takeSpatiallyDistributedShips(ships: SatelliteLiveShip[], limit: number, zoom: number): SatelliteLiveShip[] {
    if (limit <= 0) {
      return [];
    }
    if (ships.length <= limit) {
      return ships;
    }

    const cells = new Map<string, ShipDistributionCell>();
    ships.forEach(ship => {
      const cellRef = distributionCell(this.map, ship.latitude, ship.longitude, zoom);
      const cell = cells.get(cellRef.key) ?? { ...cellRef, items: [] };
      cell.items.push(ship);
      cells.set(cellRef.key, cell);
    });

    const orderedCells = orderDistributionCells(Array.from(cells.values()).map(cell => ({
      ...cell,
      items: cell.items.slice().sort((left, right) => Math.abs(stableHash(this.getStableShipKey(left))) - Math.abs(stableHash(this.getStableShipKey(right)))),
    })), limit);
    const selected: SatelliteLiveShip[] = [];
    let round = 0;

    while (selected.length < limit) {
      let addedThisRound = false;
      for (const cell of orderedCells) {
        const ship = getOwnProperty(cell.items, round);
        if (!ship) {
          continue;
        }
        selected.push(ship);
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

  private getViewportShipLimit(zoom: number): number {
    if (zoom >= 9) {
      return 1400;
    }
    if (zoom >= 8) {
      return 1000;
    }
    if (zoom >= 7) {
      return 760;
    }
    if (zoom >= 6) {
      return 560;
    }
    if (zoom >= 5) {
      return 400;
    }
    if (zoom >= 4) {
      return 300;
    }
    return 220;
  }

  private getStableShipKey(ship: SatelliteLiveShip): string {
    return normalizeEntityId(ship.mmsi) ?? `${ship.latitude}:${ship.longitude}`;
  }

  private extractDetails(res: unknown): SatelliteLiveShip | null {
    const response = asUnknownRecord(res);
    const payload = asUnknownRecord(response.result ?? res);
    const ships = this.service.extractItems(payload);
    if (ships?.length) {
      return ships[0];
    }
    if (Array.isArray(payload.ships) && payload.ships.length > 0) {
      return payload.ships[0] as SatelliteLiveShip;
    }
    if (payload.ship && typeof payload.ship === 'object' && !Array.isArray(payload.ship)) {
      return payload.ship as SatelliteLiveShip;
    }
    if (payload.ships && typeof payload.ships === 'object' && !Array.isArray(payload.ships)) {
      return payload.ships as SatelliteLiveShip;
    }
    if (payload.mmsi != null) {
      return payload as unknown as SatelliteLiveShip;
    }
    if (response.mmsi != null) {
      return response as unknown as SatelliteLiveShip;
    }
    return null;
  }

  private isSelected(id: string | null): boolean {
    const activeEntity = this.sidebar.getActiveEntity();
    return !!id && activeEntity?.type === 'ship' && activeEntity.id === id;
  }

  private isLoading(id: string | null): boolean {
    const loadingEntity = this.sidebar.getLoadingEntity();
    return !!id && loadingEntity?.type === 'ship' && loadingEntity.id === id;
  }
}
