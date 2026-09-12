import { Observable } from 'rxjs';
import type * as Leaflet from 'leaflet';
import { SatelliteLiveAircraft } from '../../model/satellite-intel-api.models';
import { SatelliteAircraftTrackingService } from './aircraft-tracking.service';
import { AircraftMarkerIconComponent } from './components/aircraft-marker-icon/aircraft-marker-icon.component';
import { getBearingDegrees, getMarkerBaseSize, normalizeEntityId } from '../../map-utils/renderer-utils';
import { TrackingEntityType } from '../../../models/geo-fencing.models';
import { asUnknownRecord, isFiniteNumber, isUnknownRecord, Nullable } from '../../../../../shared/utils/type-guards.util';
import { EntityMarker, EntityRendererBaseConfig, RenderedMarkerIcon } from '../../model/satellite-intel.model';
import { BaseEntityMapRenderer } from '../base-entity-map-renderer';

export class AircraftMapRenderer extends BaseEntityMapRenderer<SatelliteLiveAircraft> {
  private readonly service: SatelliteAircraftTrackingService;
  private trackLine: Nullable<Leaflet.Polyline> = null;

  protected readonly entityType: TrackingEntityType = 'aircraft';
  protected readonly chunkSize = 80;
  protected readonly maxAnimated = 60;
  protected readonly boundsPad = 0;
  protected readonly pinsLoadingEntity = false;

  constructor(config: EntityRendererBaseConfig & { service: SatelliteAircraftTrackingService; getData: () => SatelliteLiveAircraft[] }) {
    super(config);
    this.service = config.service;
  }

  override clearTrack(): void {
    if (this.trackLine) {
      this.map?.removeLayer(this.trackLine);
      this.trackLine = null;
    }
  }

  protected getEntityId(aircraft: SatelliteLiveAircraft): unknown {
    return aircraft.icao24;
  }

  protected getViewportLimit(zoom: number): number {
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

  protected getMotionKey(aircraft: SatelliteLiveAircraft): string {
    return [
      aircraft.latitude,
      aircraft.longitude,
      aircraft.velocity ?? '',
      aircraft.true_track ?? '',
      aircraft.on_ground ?? '',
    ].join(':');
  }

  protected projectPosition(aircraft: SatelliteLiveAircraft, seconds: number): { lat: number; lon: number } | null {
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

  protected shouldAnimateMarker(aircraft: SatelliteLiveAircraft): boolean {
    return this.renderedCount <= this.maxAnimated || this.isSelected(normalizeEntityId(aircraft.icao24));
  }

  protected override shouldUpdateMarkerRotation(isSelected: boolean, isLoading: boolean): boolean {
    return this.renderedCount <= this.maxAnimated || isSelected || isLoading;
  }

  protected override afterMarkerMotion(aircraft: SatelliteLiveAircraft, entityId: string | null): void {
    this.extendSelectedTrack(aircraft, entityId);
  }

  protected getMovementRotation(marker: EntityMarker, aircraft: SatelliteLiveAircraft): number {
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

  protected renderIcon(aircraft: SatelliteLiveAircraft, isSelected: boolean, isLoading: boolean, rotationDegrees = this.toCssRotation(aircraft.true_track)): RenderedMarkerIcon {
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

  protected pollDetails(seed: SatelliteLiveAircraft): Observable<unknown> {
    return this.service.pollByICAO(seed.icao24);
  }

  protected onDetailsLoaded(aircraft: SatelliteLiveAircraft): void {
    this.renderTrack(aircraft);
    this.sidebar.openData('aircraft', aircraft);
  }

  protected extractDetails(res: unknown): SatelliteLiveAircraft | null {
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
}
