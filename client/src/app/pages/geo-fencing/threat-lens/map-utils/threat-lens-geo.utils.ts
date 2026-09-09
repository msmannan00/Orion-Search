import { ThreatLensCategoryMapData, ThreatLensCategoryModelKey, ThreatLensLegendItem } from '../../models/geo-fencing.models';
import { ThreatLensCoordinates, ThreatLensCountryBoundary, ThreatLensIpRecord } from '../models/threat-lens-map.types';
import { asUnknownRecord, getOwnProperty, UnknownRecord } from '../../../../shared/utils/type-guards.util';

function getThreatLensDistanceKm(a: ThreatLensCoordinates, b: ThreatLensCoordinates): number {
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + (Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2);
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function normalizeThreatLensLongitude(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function hashThreatLensString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toThreatLensHexColor(color: [number, number, number]): string {
  return `#${color.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function buildThreatLensLegend( categoryData: ThreatLensCategoryMapData[], arcCountByCategory: Map<ThreatLensCategoryModelKey, number>, ): ThreatLensLegendItem[] {
  return categoryData.map((category) => ({
    categoryKey: category.categoryKey,
    label: category.categoryLabel,
    colorHex: toThreatLensHexColor(category.color),
    countryCount: category.countryCounts.length,
    arcCount: arcCountByCategory.get(category.categoryKey) ?? 0,
    totalResults: category.totalResults,
  }));
}

function isThreatLensPointInBoundary(point: ThreatLensCoordinates, boundary: ThreatLensCountryBoundary | null | undefined): boolean {
  if (!boundary?.rings?.length) {
    return true;
  }

  const lon = normalizeThreatLensLongitude(point.lon);
  if (point.lat < boundary.extent.minLat || point.lat > boundary.extent.maxLat || lon < boundary.extent.minLon || lon > boundary.extent.maxLon) {
    return false;
  }

  return boundary.rings.some((ring) => isThreatLensPointInRing(point.lat, lon, ring));
}

function extractThreatLensIpScanRecords(payload: unknown): ThreatLensIpRecord[] {
  const records = new Map<string, ThreatLensIpRecord>();
  const readCoordinate = (source: UnknownRecord, keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = getOwnProperty(source, key);
      if (value === null || value === undefined || value === '') {
        continue;
      }
      const coordinate = Number(value);
      if (Number.isFinite(coordinate)) {
        return coordinate;
      }
    }
    return undefined;
  };
  const sourcesFor = (value: unknown): UnknownRecord[] => {
    const source = asUnknownRecord(value);
    return [source, asUnknownRecord(source.ip_info), asUnknownRecord(source.geo), asUnknownRecord(source.location), asUnknownRecord(source.data)];
  };
  const readCoordinates = (value: unknown): Pick<ThreatLensIpRecord, 'lat' | 'lon'> => {
    const sources = sourcesFor(value);
    for (const source of sources) {
      const lat = readCoordinate(source, ['lat', 'latitude', 'geo_lat']);
      const lon = readCoordinate(source, ['lon', 'lng', 'longitude', 'geo_lon', 'geo_lng']);
      if (lat !== undefined && lon !== undefined && lat >= -90 && lat <= 90) {
        return { lat, lon };
      }
    }
    return {};
  };
  const readString = (value: unknown, keys: string[]): string => {
    const sources = sourcesFor(value);
    for (const source of sources) {
      for (const key of keys) {
        const text = String(getOwnProperty(source, key) ?? '').trim();
        if (text) {
          return text;
        }
      }
    }
    return '';
  };
  const readNumber = (value: unknown, keys: string[]): number | undefined => {
    const sources = sourcesFor(value);
    for (const source of sources) {
      const numericValue = readCoordinate(source, keys);
      if (numericValue !== undefined) {
        return numericValue;
      }
    }
    return undefined;
  };
  const readMetadata = (value: unknown): Partial<ThreatLensIpRecord> => {
    const network = readString(value, ['network', 'cidr', 'ip_range']);
    const accuracyRadius = readNumber(value, ['accuracyRadius', 'accuracy_radius', 'accuracy_km']);
    const distanceKm = readNumber(value, ['distanceKm', 'distance_km']);
    return {
      ...(network ? { network } : {}),
      ...(accuracyRadius !== undefined ? { accuracyRadius } : {}),
      ...(distanceKm !== undefined ? { distanceKm } : {}),
    };
  };
  const addRecord = (value: unknown) => {
    if (typeof value === 'string') {
      const ip = value.trim();
      if (ip && !records.has(ip)) {
        records.set(ip, { ip });
      }
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }

    const source = asUnknownRecord(value);
    const ip = String(source.ip ?? source.ip_address ?? source.host ?? '').trim();
    if (!ip) {
      return;
    }

    records.set(ip, {
      ...(records.get(ip) ?? { ip }),
      ...readCoordinates(value),
      ...readMetadata(value),
    });
  };

  const root = asUnknownRecord(payload);
  const data = asUnknownRecord(root.data);
  const result = asUnknownRecord(root.result);
  [
    root.ip_locations,
    root.candidate_ip_locations,
    root.ips,
    root.ip_addresses,
    data.ip_locations,
    data.candidate_ip_locations,
    data.ips,
    result.ip_locations,
    result.candidate_ip_locations,
    result.ips,
    root.cameras,
    result.cameras,
    data.cameras,
  ].forEach((candidate) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(addRecord);
    }
  });

  return Array.from(records.values()).slice(0, 500);
}

function isThreatLensPointInRing(lat: number, lon: number, ring: ThreatLensCoordinates[]): boolean {
  let inside = false;
  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index, index += 1) {
    const current = getOwnProperty(ring, index);
    const previous = getOwnProperty(ring, previousIndex);
    const currentLon = normalizeThreatLensLongitude(current.lon);
    const previousLon = normalizeThreatLensLongitude(previous.lon);
    const intersects = ((current.lat > lat) !== (previous.lat > lat))
      && (lon < ((previousLon - currentLon) * (lat - current.lat) / ((previous.lat - current.lat) || Number.EPSILON)) + currentLon);
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export const ThreatLensGeoUtils = {
  getThreatLensDistanceKm,
  normalizeThreatLensLongitude,
  hashThreatLensString,
  toThreatLensHexColor,
  buildThreatLensLegend,
  isThreatLensPointInBoundary,
  extractThreatLensIpScanRecords,
};
