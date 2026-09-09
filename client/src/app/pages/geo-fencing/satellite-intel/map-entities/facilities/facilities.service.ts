import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api.service';
import { SatelliteFacilitiesResponse, SatelliteFacilityFeature } from '../../model/satellite-intel-api.models';
import { OrionSatelliteFeature, OrionSatelliteFeatureType } from '../../../models/geo-fencing.models';
import { SatelliteIntelService } from '../../satellite-intel-service';
import { asUnknownRecord, getOwnProperty, isUnknownRecord } from '../../../../../shared/utils/type-guards.util';
import type { StreamedMapEntity } from './model/facilities.model';
export type { StreamedMapEntity } from './model/facilities.model';




@Injectable({ providedIn: 'root' })
export class SatelliteFacilitiesService {
  constructor(private api: ApiService, private satelliteIntelService: SatelliteIntelService) {}

  fetchNearby(lat: number, lon: number, radiusKm = 5): Observable<SatelliteFacilitiesResponse> {
    return this.satelliteIntelService.createPolledRequest(() => this.api.post<SatelliteFacilitiesResponse>('satellite/facilities', { lat, lon, radius_km: radiusKm }), (res) => this.getPollStatus(res));
  }

  toMapFeatures(result: SatelliteFacilitiesResponse['result'] | null | undefined): OrionSatelliteFeature[] {
    const features = Array.isArray(result?.features) ? result.features : [];
    return features
      .map((feature, index) => this.toFeature(feature, index))
      .filter((feature): feature is OrionSatelliteFeature => feature !== null);
  }

  getTypeEntries(data: SatelliteFacilitiesResponse['result'] | null): [string, number][] {
    return Object.entries(data?.type_counts ?? {}).sort((a, b) => b[1] - a[1]);
  }

  async streamMapEntities(size: number, onChunk: (items: OrionSatelliteFeature[]) => void, onComplete?: () => void, onError?: (error: unknown) => void): Promise<void> {
    try {
      const response = await fetch('/api/search/map-entities/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ size }),
        credentials: 'include',
      });

      if (!response.body) {
        onError?.(new Error('No response body'));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const chunk: unknown = JSON.parse(line);
          if (!Array.isArray(chunk)) {
            continue;
          }
          const mapped = chunk
            .filter(isUnknownRecord)
            .map((item, index: number) => this.toStreamedMapEntityFeature(item as StreamedMapEntity, index))
            .filter((item: OrionSatelliteFeature | null): item is OrionSatelliteFeature => item !== null);

          onChunk(mapped);
        }
      }

      onComplete?.();
    }
    catch (error) {
      onError?.(error);
    }
  }

  private getPollStatus(res: SatelliteFacilitiesResponse): string | undefined {
    return res?.result?.status ?? res?.status;
  }

  private toFeature(feature: SatelliteFacilityFeature, index: number): OrionSatelliteFeature | null {
    const coordinates = this.extractCoordinates(feature.geometry);
    if (!coordinates) {
      return null;
    }

    const properties = feature.properties || {};
    const rawKind = this.getRawKind(properties);
    const type = this.detectTypeFromRecord({ ...properties, type: rawKind });

    return {
      id: `osm-${feature.properties?.osm_id ?? index}`,
      name: String(feature.properties?.name || '').trim() || this.defaultLabel(type),
      type,
      rawType: rawKind || type,
      source: 'OSM',
      coordinates,
      color: this.getNearbyFacilityColor(type),
      capacityMw: null,
      properties: {
        ...(feature.properties || {}),
      },
    };
  }

  private normalizeType(rawKind: string): OrionSatelliteFeatureType {
    const value = this.normalizeKindKey(rawKind);
    switch (value) {
      case 'airport':
      case 'aerodrome':
      case 'airfield':
      case 'heliport':
        return 'airport';
      case 'port':
      case 'ports':
      case 'harbour':
      case 'harbours':
      case 'harbor':
      case 'harbors':
      case 'seaport':
      case 'sea_port':
      case 'dock':
      case 'docks':
      case 'marina':
      case 'pier':
      case 'quay':
      case 'jetty':
      case 'wharf':
      case 'shipyard':
      case 'boatyard':
      case 'crane':
      case 'crane_rail':
      case 'ferry':
      case 'ferry_terminal':
      case 'harbour_master':
      case 'port_terminal':
      case 'container_terminal':
      case 'cargo_terminal':
      case 'breakwater':
      case 'dolphin':
      case 'mooring':
      case 'anchorage':
      case 'berth':
        return 'port';
      case 'warehouse':
      case 'depot':
      case 'storage_depot':
        return 'warehouse';
      case 'industrial':
      case 'industry':
      case 'factory':
        return 'industrial';
      case 'military':
      case 'barracks':
      case 'military_base':
        return 'military';
      case 'hydro':
      case 'hydroelectric':
      case 'hydropower':
        return 'hydro';
      case 'solar':
      case 'photovoltaic':
      case 'pv':
        return 'solar';
      case 'wind':
      case 'wind_turbine':
      case 'windfarm':
        return 'wind';
      case 'gas':
      case 'natural_gas':
      case 'lng':
      case 'cng':
        return 'gas';
      case 'coal':
      case 'lignite':
        return 'coal';
      case 'oil':
      case 'diesel':
      case 'petroleum':
      case 'fuel_oil':
        return 'oil';
      case 'nuclear':
      case 'atomic':
        return 'nuclear';
      case 'geothermal':
      case 'geotherm':
        return 'geothermal';
      case 'biomass':
      case 'biogas':
      case 'wood':
      case 'bagasse':
        return 'biomass';
      case 'waste':
      case 'waste_to_energy':
      case 'landfill_gas':
        return 'waste';
      case 'storage':
      case 'battery':
      case 'pumped_hydro':
        return 'storage';
      case 'cogeneration':
      case 'chp':
      case 'combined_heat_power':
        return 'cogeneration';
      case 'petcoke':
        return 'petcoke';
      case 'wave and tidal':
      case 'wave_and_tidal':
      case 'wave':
      case 'tidal':
      case 'tidal_stream':
        return 'wave_and_tidal';
      case 'other':
        return 'other';
      default:
        return value ? 'other' : 'other';
    }
  }

  private extractCoordinates(geometry: SatelliteFacilityFeature['geometry']): [number, number] | null {
    const coords = geometry.coordinates;
    if (!Array.isArray(coords)) {
      return null;
    }
    if (geometry.type === 'Point' && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      return [coords[0], coords[1]];
    }
    if (geometry.type === 'LineString' && Array.isArray(coords[0])) {
      return this.averageCoordinates(coords);
    }
    if (geometry.type === 'MultiLineString' && Array.isArray(coords[0]?.[0])) {
      return this.averageCoordinates(coords.flat());
    }
    if (geometry.type === 'Polygon' && Array.isArray(coords[0]?.[0])) {
      return this.averageCoordinates(coords[0]);
    }
    if (geometry.type === 'MultiPolygon' && Array.isArray(coords[0]?.[0]?.[0])) {
      return this.averageCoordinates(coords[0][0]);
    }
    return null;
  }

  private averageCoordinates(points: unknown[]): [number, number] | null {
    const valid = points.filter((point): point is [number, number] => Array.isArray(point) && typeof point[0] === 'number' && Number.isFinite(point[0]) && typeof point[1] === 'number' && Number.isFinite(point[1]));
    if (!valid.length) {
      return null;
    }
    const total = valid.reduce((sum, point) => ({ lon: sum.lon + point[0], lat: sum.lat + point[1] }), { lon: 0, lat: 0 });
    return [total.lon / valid.length, total.lat / valid.length];
  }

  private defaultLabel(type: OrionSatelliteFeatureType): string {
    return type.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  private getRawKind(properties: Record<string, unknown>): string {
    const rawKind = properties?.kind ??
      properties?.type ??
      properties?.amenity ??
      properties?.man_made ??
      properties?.building ??
      properties?.landuse ??
      properties?.waterway ??
      properties?.['seamark:type'] ??
      properties?.seamark_type ??
      '';
    return String(rawKind).trim().toLowerCase();
  }

  private toStreamedMapEntityFeature(item: StreamedMapEntity, index: number): OrionSatelliteFeature | null {
    const parsedLocation = this.extractLatLon(item);
    const lat = parsedLocation?.lat;
    const lon = parsedLocation?.lon;
    const hasValidCoords = typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon);
    const type = this.detectTypeFromRecord(item);
    const rawType = String(item?.type ?? item?.primary_fuel ?? '').trim();

    if (!item.id && !item._id && !item.name) {
      return null;
    }

    return {
      id: item.id ?? item._id ?? `wri-${index}`,
      name: item.name?.trim() ?? `Facility ${index + 1}`,
      type,
      rawType: rawType || type,
      source: 'WRI',
      coordinates: hasValidCoords ? [lon, lat] : [0, 0],
      color: this.getStreamedMapEntityColor(type),
      capacityMw: typeof item?.capacity_mw === 'number' ? item.capacity_mw : null,
      properties: {
        source: 'WRI',
        country: item?.country,
        type: item?.type,
        capacity_mw: item?.capacity_mw,
        hasValidCoordinates: hasValidCoords,
      },
    };
  }

  private extractLatLon(item: unknown): { lat: number; lon: number } | null {
    const record = asUnknownRecord(item);
    const location = asUnknownRecord(record.location);
    const locationPoint = asUnknownRecord(record.location_point);
    const candidates = [
      { lat: location.lat, lon: location.lon },
      { lat: locationPoint.lat, lon: locationPoint.lon },
      { lat: record.lat, lon: record.lon },
    ];

    for (const candidate of candidates) {
      const scalar = this.toScalarLatLon(candidate.lat, candidate.lon);
      if (scalar) {
        return scalar;
      }

      const coordinatePairs = [
        ...this.extractCoordinatePairs(candidate.lat),
        ...this.extractCoordinatePairs(candidate.lon),
      ];
      const averagedPairs = this.averageLatLon(coordinatePairs);
      if (averagedPairs) {
        return averagedPairs;
      }

      const sequence = this.toLatLonSequence(candidate.lat, candidate.lon);
      if (sequence) {
        return sequence;
      }
    }

    return null;
  }

  private toScalarLatLon(latValue: unknown, lonValue: unknown): { lat: number; lon: number } | null {
    const lat = this.toFiniteNumber(latValue);
    const lon = this.toFiniteNumber(lonValue);
    return lat !== null && lon !== null && this.isValidLatLon(lat, lon) ? { lat, lon } : null;
  }

  private toLatLonSequence(latValue: unknown, lonValue: unknown): { lat: number; lon: number } | null {
    if (!Array.isArray(latValue) || !Array.isArray(lonValue)) {
      return null;
    }

    const count = Math.min(latValue.length, lonValue.length);
    const points: { lat: number; lon: number }[] = [];
    for (let index = 0; index < count; index += 1) {
      const lat = this.toFiniteNumber(getOwnProperty(latValue, index));
      const lon = this.toFiniteNumber(getOwnProperty(lonValue, index));
      if (lat !== null && lon !== null && this.isValidLatLon(lat, lon)) {
        points.push({ lat, lon });
      }
    }

    return this.averageLatLon(points);
  }

  private extractCoordinatePairs(value: unknown): { lat: number; lon: number }[] {
    if (!Array.isArray(value)) {
      return [];
    }

    if (value.length >= 2) {
      const lon = this.toFiniteNumber(value[0]);
      const lat = this.toFiniteNumber(value[1]);
      if (lat !== null && lon !== null && this.isValidLatLon(lat, lon)) {
        return [{ lat, lon }];
      }
    }

    return value.flatMap((entry) => this.extractCoordinatePairs(entry));
  }

  private averageLatLon(points: { lat: number; lon: number }[]): { lat: number; lon: number } | null {
    if (!points.length) {
      return null;
    }

    const total = points.reduce((sum, point) => ({ lat: sum.lat + point.lat, lon: sum.lon + point.lon }), { lat: 0, lon: 0 });
    return {
      lat: total.lat / points.length,
      lon: total.lon / points.length,
    };
  }

  private toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private isValidLatLon(lat: number | null, lon: number | null): boolean {
    return lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  private detectTypeFromRecord(value: unknown): OrionSatelliteFeatureType {
    const record = asUnknownRecord(value);
    const kind = this.normalizeKindKey(String(record.kind ?? record.type ?? record.primary_fuel ?? ''));
    const landuse = this.normalizeKindKey(String(record.landuse ?? ''));
    const building = this.normalizeKindKey(String(record.building ?? ''));
    const manMade = this.normalizeKindKey(String(record.man_made ?? ''));
    const amenity = this.normalizeKindKey(String(record.amenity ?? ''));
    const waterway = this.normalizeKindKey(String(record.waterway ?? ''));
    const seamarkType = this.normalizeKindKey(String(record['seamark:type'] ?? record.seamark_type ?? ''));

    if (kind) {
      const detected = this.normalizeType(kind);
      if (detected !== 'other') {
        return detected;
      }
    }

    if (record.aeroway) {
      const aeroway = this.normalizeKindKey(String(record.aeroway));
      if (['aerodrome', 'airfield', 'airstrip', 'hangar', 'helipad', 'heliport', 'terminal'].includes(aeroway)) {
        return 'airport';
      }
    }

    if (Boolean(record.port) || Boolean(record.harbour) || Boolean(record.harbor)) {
      return 'port';
    }
    if (['port', 'harbour', 'harbor', 'dock', 'marina', 'shipyard'].includes(landuse)) {
      return 'port';
    }
    if (['port', 'harbour', 'harbor', 'dock', 'pier', 'quay', 'jetty', 'wharf', 'shipyard'].includes(building)) {
      return 'port';
    }
    if (['pier', 'quay', 'wharf', 'jetty', 'breakwater', 'dock', 'dolphin', 'mooring', 'crane'].includes(manMade)) {
      return 'port';
    }
    if (['ferry_terminal', 'boat_rental', 'boat_storage'].includes(amenity)) {
      return 'port';
    }
    if (['dock', 'boatyard', 'fuel'].includes(waterway)) {
      return 'port';
    }
    if (['harbour', 'harbor', 'pier', 'bridge', 'berth', 'mooring', 'anchorage', 'ferry_terminal'].includes(seamarkType)) {
      return 'port';
    }

    if (record.military) {
      const military = this.normalizeKindKey(String(record.military));
      if (military && military !== 'no') {
        return 'military';
      }
    }

    if (record.landuse) {
      if (landuse === 'industrial' || landuse === 'power' || landuse === 'brownfield' || landuse === 'quarry') {
        return 'industrial';
      }
      if (['port', 'harbour', 'harbor', 'dock'].includes(landuse)) {
        return 'port';
      }
      if (['warehouse', 'logistics', 'depot'].includes(landuse)) {
        return 'warehouse';
      }
      if (landuse === 'windfarm') {
        return 'wind';
      }
      if (landuse === 'aeroway' || landuse === 'airport') {
        return 'airport';
      }
    }

    if (record.building) {
      if (['warehouse', 'storage', 'depot'].includes(building)) {
        return 'warehouse';
      }
      if (['industrial', 'factory', 'power_plant', 'power_station', 'electricity'].includes(building)) {
        return 'industrial';
      }
      if (['airport_terminal', 'terminal', 'hangar'].includes(building)) {
        return 'airport';
      }
      if (building === 'military base' || building === 'barrack' || building === 'barracks' || building === 'bunker') {
        return 'military';
      }
    }

    if (record.man_made) {
      if (['wind_farm', 'power_station', 'biogas_plant', 'heat_plant', 'solar_panels'].includes(manMade)) {
        return 'industrial';
      }
      if (['radar', 'military'].includes(manMade)) {
        return 'military';
      }
    }

    if (record.power) {
      const power = this.normalizeKindKey(String(record.power));
      if (power === 'plant') {
        return 'industrial';
      }
    }

    return 'other';
  }

  private normalizeKindKey(value: string): string {
    return value.toLowerCase().trim().replace(/[\s-]+/g, '_');
  }

  private getNearbyFacilityColor(type: OrionSatelliteFeatureType): string {
    const colors: Record<OrionSatelliteFeatureType, string> = {
      airport: '#38bdf8',
      port: '#60a5fa',
      warehouse: '#a78bfa',
      industrial: '#f59e0b',
      military: '#ef4444',
      solar: '#facc15',
      wind: '#22c55e',
      hydro: '#0ea5e9',
      gas: '#fb7185',
      coal: '#78716c',
      oil: '#f97316',
      nuclear: '#c084fc',
      geothermal: '#fb923c',
      biomass: '#84cc16',
      waste: '#94a3b8',
      storage: '#2dd4bf',
      cogeneration: '#f43f5e',
      petcoke: '#57534e',
      wave_and_tidal: '#06b6d4',
      other: '#64748b',
    };
    return getOwnProperty(colors, type) || colors.other;
  }

  private getStreamedMapEntityColor(type: OrionSatelliteFeatureType): string {
    const colors: Record<OrionSatelliteFeatureType, string> = {
      hydro: '#2563eb',
      solar: '#facc15',
      wind: '#16a34a',
      gas: '#f59e0b',
      coal: '#111827',
      oil: '#f97316',
      nuclear: '#dc2626',
      geothermal: '#ec4899',
      biomass: '#84cc16',
      waste: '#8b5cf6',
      storage: '#06b6d4',
      cogeneration: '#14b8a6',
      petcoke: '#78716c',
      wave_and_tidal: '#0ea5e9',
      airport: '#9333ea',
      port: '#0d9488',
      warehouse: '#92400e',
      industrial: '#6b7280',
      military: '#d71c1c',
      other: '#a3a3a3',
    };
    return getOwnProperty(colors, type) || colors.other;
  }
}
