import { TrackingEntityType } from '../../models/geo-fencing.models';
import type { Map as LeafletMap } from 'leaflet';
import { asUnknownRecord, getOwnProperty } from '../../../../shared/utils/type-guards.util';

export function normalizeEntityId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

export function escapeTooltipText(value: string): string {
  const encodedEntities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };
  return value.replace(/[&<>"']/g, character => getOwnProperty(encodedEntities, character) ?? character);
}

export function getMarkerBaseSize(map: Pick<LeafletMap, 'getZoom'> | null | undefined, type: TrackingEntityType): number {
  const zoom = map?.getZoom() ?? 3;
  const base = type === 'aircraft' ? 26 : 28;
  const growth = type === 'aircraft' ? 1.8 : 1.6;
  const cap = type === 'aircraft' ? 20 : 8;
  return base + Math.max(0, Math.min(cap, Math.round((zoom - 3) * growth)));
}

export function getBearingDegrees(fromLat: number, fromLon: number, toLat: number, toLon: number): number | null {
  const deltaLat = toLat - fromLat;
  const deltaLon = toLon - fromLon;
  if (Math.abs(deltaLat) < 0.000001 && Math.abs(deltaLon) < 0.000001) {
    return null;
  }
  const fromLatRad = (fromLat * Math.PI) / 180;
  const toLatRad = (toLat * Math.PI) / 180;
  const deltaLonRad = ((toLon - fromLon) * Math.PI) / 180;
  const y = Math.sin(deltaLonRad) * Math.cos(toLatRad);
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLonRad);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function stableHash(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return hash;
}

export function getResponseStatus(res: unknown): string | undefined {
  const response = asUnknownRecord(res);
  const result = asUnknownRecord(response.result);
  const status = result.status ?? response.status;
  return typeof status === 'string' ? status : undefined;
}

export function isPendingStatus(status: string | undefined): boolean {
  return status === 'pending' || status === 'busy';
}
