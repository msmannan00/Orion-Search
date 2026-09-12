import { TrackingEntityType } from '../../models/geo-fencing.models';
import type { Map as LeafletMap } from 'leaflet';
import { asUnknownRecord, getOwnProperty, isFiniteNumber } from '../../../../shared/utils/type-guards.util';

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

export function screenCellFor(map: Pick<LeafletMap, 'latLngToContainerPoint'> | null | undefined, latitude: number | null | undefined, longitude: number | null | undefined, gridSize: number): { row: number; col: number } | null {
  if (!map?.latLngToContainerPoint || typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const point = map.latLngToContainerPoint([latitude, longitude]);
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    return null;
  }

  return {
    row: Math.floor(point.y / gridSize),
    col: Math.floor(point.x / gridSize),
  };
}

export function takeEvenlySpacedCells<T>(cells: T[], count: number): T[] {
  if (count <= 0) {
    return [];
  }
  if (count >= cells.length) {
    return cells;
  }

  const selected: T[] = [];
  const step = cells.length / count;
  for (let index = 0; index < count; index += 1) {
    selected.push(cells[Math.min(cells.length - 1, Math.floor((index + 0.5) * step))]);
  }
  return selected;
}

export function orderDistributionCells<T extends { row: number; col: number }>(cells: T[], limit: number): T[] {
  if (cells.length <= limit) {
    return cells.slice().sort((left, right) => left.row - right.row || left.col - right.col);
  }

  const rowGroups = new Map<number, T[]>();
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

  return quotas.flatMap(quota => takeEvenlySpacedCells(quota.cells, quota.quota));
}

export function sampleScreenGridSize(zoom: number): number {
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

export function distributionScreenGridSize(zoom: number): number {
  return Math.max(32, Math.round(sampleScreenGridSize(zoom) / 3));
}

export function sampleGridSize(zoom: number): number {
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

export function distributionGridSize(zoom: number): number {
  return Math.max(0.25, sampleGridSize(zoom) / 4);
}

export function viewportSampleRatio(zoom: number): number {
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

export function moderateSampleRatio(sampleRatio: number): number {
  return Math.max(sampleRatio, 0.264);
}

export function sampleBucketKey(map: Pick<LeafletMap, 'latLngToContainerPoint'> | null | undefined, latitude: number | null | undefined, longitude: number | null | undefined, zoom: number): string {
  const screenGridSize = sampleScreenGridSize(zoom);
  const screenCell = screenCellFor(map, latitude, longitude, screenGridSize);
  if (screenCell) {
    return `screen:${screenGridSize}:${screenCell.row}:${screenCell.col}`;
  }

  if (isFiniteNumber(latitude) && isFiniteNumber(longitude)) {
    const gridSize = sampleGridSize(zoom);
    const latBucket = Math.floor((latitude + 90) / gridSize);
    const lonBucket = Math.floor((longitude + 180) / gridSize);
    return `grid:${gridSize}:${latBucket}:${lonBucket}`;
  }

  return 'grid:unknown';
}

export function distributionCell(map: Pick<LeafletMap, 'latLngToContainerPoint'> | null | undefined, latitude: number | null | undefined, longitude: number | null | undefined, zoom: number): { key: string; row: number; col: number } {
  const screenGridSize = distributionScreenGridSize(zoom);
  const screenCell = screenCellFor(map, latitude, longitude, screenGridSize);
  if (screenCell) {
    return { key: `screen-cell:${screenGridSize}:${screenCell.row}:${screenCell.col}`, row: screenCell.row, col: screenCell.col };
  }

  if (isFiniteNumber(latitude) && isFiniteNumber(longitude)) {
    const gridSize = distributionGridSize(zoom);
    const row = Math.floor((latitude + 90) / gridSize);
    const col = Math.floor((longitude + 180) / gridSize);
    return { key: `cell:${gridSize}:${row}:${col}`, row, col };
  }

  return { key: 'cell:unknown', row: 0, col: 0 };
}
