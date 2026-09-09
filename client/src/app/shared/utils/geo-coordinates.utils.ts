import { ParsedCoordinates } from './model/geo-coordinates.model';

export function parseCoordinates(value: string): ParsedCoordinates | null {
  const parts = value.trim().split(/[\s,]+/);
  if (parts.length !== 2 || parts.some(part => part.trim() === '')) {
    return null;
  }

  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  return { lat, lon };
}

export function validateCoordinatesInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!parseCoordinates(trimmed)) {
    return 'Enter coordinates as: latitude, longitude - e.g. 31.48, 74.17';
  }
  return null;
}
