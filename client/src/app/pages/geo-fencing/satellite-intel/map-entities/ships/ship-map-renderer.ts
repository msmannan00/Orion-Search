import { Observable } from 'rxjs';
import { SatelliteLiveShip } from '../../model/satellite-intel-api.models';
import { SatelliteShipTrackingService } from './ship-tracking.service';
import { ShipMarkerIconComponent } from './components/ship-marker-icon/ship-marker-icon.component';
import { getBearingDegrees, getMarkerBaseSize, normalizeEntityId } from '../../map-utils/renderer-utils';
import { TrackingEntityType } from '../../../models/geo-fencing.models';
import { asUnknownRecord, isFiniteNumber } from '../../../../../shared/utils/type-guards.util';
import { EntityMarker, EntityRendererBaseConfig, RenderedMarkerIcon } from '../../model/satellite-intel.model';
import { BaseEntityMapRenderer } from '../base-entity-map-renderer';

export class ShipMapRenderer extends BaseEntityMapRenderer<SatelliteLiveShip> {
  private readonly service: SatelliteShipTrackingService;

  protected readonly entityType: TrackingEntityType = 'ship';
  protected readonly chunkSize = 160;
  protected readonly maxAnimated = 80;
  protected readonly boundsPad = 0.18;
  protected readonly pinsLoadingEntity = true;

  constructor(config: EntityRendererBaseConfig & { service: SatelliteShipTrackingService; getData: () => SatelliteLiveShip[] }) {
    super(config);
    this.service = config.service;
  }

  protected getEntityId(ship: SatelliteLiveShip): unknown {
    return ship.mmsi;
  }

  protected shouldUpdateMarkerRotation(): boolean {
    return true;
  }

  protected afterMarkerMotion(): void {
    void 0;
  }

  protected getViewportLimit(zoom: number): number {
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

  protected getMotionKey(ship: SatelliteLiveShip): string {
    return [
      ship.latitude,
      ship.longitude,
      ship.speed ?? '',
      ship.course ?? ship.true_heading ?? '',
    ].join(':');
  }

  protected projectPosition(ship: SatelliteLiveShip, seconds: number): { lat: number; lon: number } | null {
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

  protected shouldAnimateMarker(ship: SatelliteLiveShip): boolean {
    return this.markers.size <= this.maxAnimated || this.isSelected(normalizeEntityId(ship.mmsi));
  }

  protected getMovementRotation(marker: EntityMarker, ship: SatelliteLiveShip): number {
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

  protected renderIcon(ship: SatelliteLiveShip, isSelected: boolean, isLoading: boolean, rotationDegrees = isFiniteNumber(ship.course) ? ship.course : isFiniteNumber(ship.true_heading) ? ship.true_heading : 0): RenderedMarkerIcon {
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

  protected pollDetails(seed: SatelliteLiveShip): Observable<unknown> {
    return this.service.pollByMMSI(seed.mmsi);
  }

  protected onDetailsLoaded(ship: SatelliteLiveShip): void {
    this.sidebar.openData('ship', ship);
  }

  protected extractDetails(res: unknown): SatelliteLiveShip | null {
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
}
