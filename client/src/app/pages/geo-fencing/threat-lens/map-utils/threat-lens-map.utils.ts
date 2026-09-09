import { ArcPair, ArcPoint2D, EsriGeometry, EsriGeometryEngine, EsriWebMercatorUtils, LngLat, ThreatLensMapGraphic } from '../models/threat-lens-map.types';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';


function buildCountryFeatureIndex(features: ThreatLensMapGraphic[], countryNameFields: string[], normalizeCountryLabel: (value: string) => string, toCountryKey: (value: string) => string, countryCodeFields: string[] = []): Map<string, ThreatLensMapGraphic> {
  const selected = new Map<string, { feature: ThreatLensMapGraphic; priority: number; area: number }>();
  const priorityByField: Record<string, number> = {
    COUNTRY: 1,
    NAME: 2,
    ADMIN: 3,
    SOVEREIGNT: 4,
    COUNTRYAFF: 5,
  };

  for (const feature of features) {
    const attributes = feature?.attributes ?? {};
    const area = Number(attributes.Shape__Area ?? 0);
    const candidateFields = [
      ...countryCodeFields,
      ...countryNameFields,
    ];

    for (const fieldName of candidateFields) {
      const rawValue = getOwnProperty(attributes, fieldName);
      if (typeof rawValue !== 'string' || !rawValue.trim()) {
        continue;
      }

      const alias = normalizeCountryLabel(rawValue);
      const key = toCountryKey(alias);
      if (!key) {
        continue;
      }

      const current = selected.get(key);
      const priority = getOwnProperty(priorityByField, fieldName) ?? 10;
      if (!current || priority < current.priority || (priority === current.priority && area > current.area)) {
        selected.set(key, { feature, priority, area });
      }
    }
  }

  const index = new Map<string, ThreatLensMapGraphic>();
  for (const [key, value] of selected.entries()) {
    index.set(key, value.feature);
  }

  return index;
}

function collectArcPairs(documentCountryGroups: string[][], toCountryKey: (value: string) => string, countryFeatureIndex: Map<string, ThreatLensMapGraphic>, maxArcCount: number, minArcWeight: number): ArcPair[] {
  const pairCount = new Map<string, number>();

  for (const group of documentCountryGroups) {
    const uniqueKeys = Array.from(new Set(group
      .map((country) => toCountryKey(country))
      .filter((key) => key && countryFeatureIndex.has(key))));

    if (uniqueKeys.length < 2) {
      continue;
    }

    for (let i = 0; i < uniqueKeys.length - 1; i += 1) {
      for (let j = i + 1; j < uniqueKeys.length; j += 1) {
        const pairKey = [getOwnProperty(uniqueKeys, i), getOwnProperty(uniqueKeys, j)].sort().join('||');
        pairCount.set(pairKey, (pairCount.get(pairKey) ?? 0) + 1);
      }
    }
  }

  const sortedPairs = Array.from(pairCount.entries())
    .sort((a, b) => b[1] - a[1]);

  const filtered = sortedPairs.filter(([, weight]) => weight >= minArcWeight);
  const pairs = (filtered.length ? filtered : sortedPairs).slice(0, maxArcCount);

  return pairs.map(([pairKey, weight]) => {
    const [countryAKey, countryBKey] = pairKey.split('||');
    return { countryAKey, countryBKey, weight };
  });
}

function getFeatureAnchor(feature: ThreatLensMapGraphic | null, geometryEngine: EsriGeometryEngine, webMercatorUtils: EsriWebMercatorUtils): LngLat | null {
  const geometry = feature?.geometry;
  if (!geometry) {
    return null;
  }

  let anchor: LngLat | null = null;

  if (geometryEngine?.labelPoint) {
    try {
      anchor = toValidLngLat(geometryEngine.labelPoint(geometry), webMercatorUtils);
    }
    catch {
      anchor = null;
    }
  }

  if (!anchor && geometryEngine?.centroid) {
    try {
      anchor = toValidLngLat(geometryEngine.centroid(geometry), webMercatorUtils);
    }
    catch {
      anchor = null;
    }
  }

  if (anchor && isAnchorInsideGeometry(anchor, geometry, webMercatorUtils)) {
    return anchor;
  }

  const ringAnchor = getLargestRingAnchor(geometry, webMercatorUtils);
  if (ringAnchor) {
    return ringAnchor;
  }

  if (anchor) {
    return null;
  }

  return null;
}

function isValidLngLat(point: LngLat | null | undefined): point is LngLat {
  if (!point) {
    return false;
  }

  const [lon, lat] = point;
  return Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

function toValidLngLat(point: EsriGeometry | null | undefined, webMercatorUtils: EsriWebMercatorUtils): LngLat | null {
  if (!point) {
    return null;
  }

  const rawLon = Number(point.longitude ?? point.lon ?? point.x);
  const rawLat = Number(point.latitude ?? point.lat ?? point.y);
  if (!Number.isFinite(rawLon) || !Number.isFinite(rawLat)) {
    return null;
  }

  if (Math.abs(rawLon) <= 180 && Math.abs(rawLat) <= 90) {
    return [normalizeLongitude(rawLon), rawLat];
  }

  if (webMercatorUtils?.xyToLngLat) {
    let projectedPoint: LngLat | null;
    try {
      const [lng, lat] = webMercatorUtils.xyToLngLat(rawLon, rawLat);
      projectedPoint = [normalizeLongitude(lng), lat];
    }
    catch {
      projectedPoint = null;
    }
    if (isValidLngLat(projectedPoint)) {
      return projectedPoint;
    }
  }

  const lon = (rawLon / 20037508.34) * 180;
  const lat = (rawLat / 20037508.34) * 180;
  const convertedLat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - (Math.PI / 2));
  const lngLat: LngLat = [normalizeLongitude(lon), convertedLat];
  return isValidLngLat(lngLat) ? lngLat : null;
}

function buildSurfacePath(start: LngLat, end: LngLat): [number, number][][] {
  return splitPath2D(buildSurfacePathPoints(start, end));
}

function extractSurfaceSegment(points: ArcPoint2D[], startProgress: number, endProgress: number): ArcPoint2D[][] {
  if (points.length < 2) {
    return [];
  }

  const start = Math.max(0, Math.min(1, startProgress));
  const end = Math.max(start, Math.min(1, endProgress));
  if (end <= start) {
    return [];
  }

  return splitPath2D(slicePath2D(points, start, end));
}

function getSurfacePointAtProgress(points: ArcPoint2D[], progress: number): ArcPoint2D | null {
  if (!points.length) {
    return null;
  }

  if (points.length === 1) {
    return points[0];
  }

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const position = clampedProgress * (points.length - 1);
  const startIndex = Math.floor(position);
  const endIndex = Math.min(points.length - 1, Math.ceil(position));

  if (startIndex === endIndex) {
    return getOwnProperty(points, startIndex);
  }

  return interpolatePoint2D(getOwnProperty(points, startIndex), getOwnProperty(points, endIndex), position - startIndex);
}

function buildSurfacePathPoints(start: LngLat, end: LngLat): ArcPoint2D[] {
  return buildGreatCirclePoints(start, end);
}

function buildGreatCirclePoints(start: LngLat, end: LngLat): ArcPoint2D[] {
  const steps = 56;
  const startVector = lngLatToCartesian(start);
  const endVector = lngLatToCartesian(end);
  const dot = clamp((startVector[0] * endVector[0]) + (startVector[1] * endVector[1]) + (startVector[2] * endVector[2]), -1, 1);
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const points: ArcPoint2D[] = [];
  let previousLon: number | null = null;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const vector = sinOmega < 1e-6
      ? [
        startVector[0] + ((endVector[0] - startVector[0]) * t),
        startVector[1] + ((endVector[1] - startVector[1]) * t),
        startVector[2] + ((endVector[2] - startVector[2]) * t),
      ]
      : [
        ((Math.sin((1 - t) * omega) / sinOmega) * startVector[0]) + ((Math.sin(t * omega) / sinOmega) * endVector[0]),
        ((Math.sin((1 - t) * omega) / sinOmega) * startVector[1]) + ((Math.sin(t * omega) / sinOmega) * endVector[1]),
        ((Math.sin((1 - t) * omega) / sinOmega) * startVector[2]) + ((Math.sin(t * omega) / sinOmega) * endVector[2]),
      ];

    const normalizedVector = normalizeVector(vector as [number, number, number]);
    const lngLat = cartesianToLngLat(normalizedVector);
    const unwrappedLon: number = previousLon === null ? lngLat[0] : unwrapLongitude(lngLat[0], previousLon);

    points.push([unwrappedLon, lngLat[1]]);
    previousLon = unwrappedLon;
  }

  return points;
}

function splitPath2D(points: ArcPoint2D[]): ArcPoint2D[][] {
  if (!points.length) {
    return [];
  }

  const paths: ArcPoint2D[][] = [];
  let currentPath: ArcPoint2D[] = [[normalizeLongitude(points[0][0]), points[0][1]]];

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const next = getOwnProperty(points, i);
    const lonDelta = next[0] - previous[0];

    if (Math.abs(lonDelta) > 180) {
      const boundary = lonDelta > 0 ? 180 : -180;
      const t = (boundary - previous[0]) / lonDelta;
      const crossingLat = previous[1] + ((next[1] - previous[1]) * t);
      currentPath.push([boundary, crossingLat]);
      paths.push(currentPath);

      currentPath = [
        [boundary === 180 ? -180 : 180, crossingLat],
        [normalizeLongitude(next[0]), next[1]],
      ];
      continue;
    }

    currentPath.push([normalizeLongitude(next[0]), next[1]]);
  }

  paths.push(currentPath);
  return paths.filter((path) => path.length >= 2);
}

function slicePath2D(points: ArcPoint2D[], startProgress: number, endProgress: number): ArcPoint2D[] {
  const maxIndex = points.length - 1;
  const startPosition = startProgress * maxIndex;
  const endPosition = endProgress * maxIndex;
  const startIndex = Math.floor(startPosition);
  const endIndex = Math.ceil(endPosition);
  const segment: ArcPoint2D[] = [interpolatePoint2D(getOwnProperty(points, startIndex), points[Math.min(maxIndex, startIndex + 1)], startPosition - startIndex)];

  for (let index = startIndex + 1; index <= endIndex - 1 && index < points.length; index += 1) {
    segment.push(getOwnProperty(points, index));
  }

  segment.push(interpolatePoint2D(points[Math.max(0, endIndex - 1)], points[Math.min(maxIndex, endIndex)], endPosition - Math.max(0, endIndex - 1)));
  return dedupeSequentialPoints2D(segment);
}

function interpolatePoint2D(start: ArcPoint2D, end: ArcPoint2D, t: number): ArcPoint2D {
  const ratio = Math.max(0, Math.min(1, t));
  return [
    start[0] + ((end[0] - start[0]) * ratio),
    start[1] + ((end[1] - start[1]) * ratio),
  ];
}

function dedupeSequentialPoints2D(points: ArcPoint2D[]): ArcPoint2D[] {
  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = points[index - 1];
    return previous[0] !== point[0] || previous[1] !== point[1];
  });
}

function lngLatToCartesian([lon, lat]: LngLat): [number, number, number] {
  const lonRad = toRadians(lon);
  const latRad = toRadians(lat);
  const cosLat = Math.cos(latRad);

  return [
    cosLat * Math.cos(lonRad),
    cosLat * Math.sin(lonRad),
    Math.sin(latRad),
  ];
}

function cartesianToLngLat([x, y, z]: [number, number, number]): LngLat {
  const lon = (Math.atan2(y, x) * 180) / Math.PI;
  const lat = (Math.atan2(z, Math.sqrt((x * x) + (y * y))) * 180) / Math.PI;
  return [lon, lat];
}

function normalizeVector([x, y, z]: [number, number, number]): [number, number, number] {
  const magnitude = Math.sqrt((x * x) + (y * y) + (z * z)) || 1;
  return [x / magnitude, y / magnitude, z / magnitude];
}

function unwrapLongitude(lon: number, previousLon: number): number {
  let result = lon;
  while ((result - previousLon) > 180) {
    result -= 360;
  }
  while ((result - previousLon) < -180) {
    result += 360;
  }
  return result;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLongitude(value: number): number {
  let lon = value;
  while (lon > 180) {
    lon -= 360;
  }
  while (lon < -180) {
    lon += 360;
  }
  return lon;
}

function isAnchorInsideGeometry(anchor: LngLat, geometry: EsriGeometry, webMercatorUtils: EsriWebMercatorUtils): boolean {
  return getConvertedRings(geometry, webMercatorUtils)
    .some((ring) => isPointInRing(anchor, ring));
}

function getLargestRingAnchor(geometry: EsriGeometry, webMercatorUtils: EsriWebMercatorUtils): LngLat | null {
  const rings = getConvertedRings(geometry, webMercatorUtils)
    .filter((ring) => ring.length >= 3)
    .sort((a, b) => Math.abs(getRingArea(b)) - Math.abs(getRingArea(a)));

  for (const ring of rings) {
    const centroid = getRingCentroid(ring);
    if (centroid && isPointInRing(centroid, ring)) {
      return centroid;
    }

    const sampled = getSampledPointInRing(ring);
    if (sampled) {
      return sampled;
    }

    const vertex = ring.find((point) => isValidLngLat(point));
    if (vertex) {
      return vertex;
    }
  }

  return null;
}

function getConvertedRings(geometry: EsriGeometry, webMercatorUtils: EsriWebMercatorUtils): LngLat[][] {
  const rings = Array.isArray(geometry?.rings) ? geometry.rings : [];
  return rings
    .map((ring: unknown[]) => Array.isArray(ring)
      ? ring
        .map((point) => toValidLngLat(Array.isArray(point)
          ? { x: Number(point[0]), y: Number(point[1]) }
          : point && typeof point === 'object' ? point as EsriGeometry : null, webMercatorUtils))
        .filter((point): point is LngLat => isValidLngLat(point))
      : [])
    .filter((ring: LngLat[]) => ring.length >= 3);
}

function getRingArea(ring: LngLat[]): number {
  const unwrapped = unwrapRingLongitudes(ring);
  let area = 0;
  for (let index = 0; index < unwrapped.length; index += 1) {
    const current = getOwnProperty(unwrapped, index);
    const next = unwrapped[(index + 1) % unwrapped.length];
    area += (current[0] * next[1]) - (next[0] * current[1]);
  }
  return area / 2;
}

function getRingCentroid(ring: LngLat[]): LngLat | null {
  const unwrapped = unwrapRingLongitudes(ring);
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;

  for (let index = 0; index < unwrapped.length; index += 1) {
    const current = getOwnProperty(unwrapped, index);
    const next = unwrapped[(index + 1) % unwrapped.length];
    const cross = (current[0] * next[1]) - (next[0] * current[1]);
    twiceArea += cross;
    cx += (current[0] + next[0]) * cross;
    cy += (current[1] + next[1]) * cross;
  }

  if (Math.abs(twiceArea) < 1e-9) {
    return null;
  }

  const lon = normalizeLongitude(cx / (3 * twiceArea));
  const lat = cy / (3 * twiceArea);
  const centroid: LngLat = [lon, lat];
  return isValidLngLat(centroid) ? centroid : null;
}

function getSampledPointInRing(ring: LngLat[]): LngLat | null {
  const unwrapped = unwrapRingLongitudes(ring);
  const lons = unwrapped.map(([lon]) => lon);
  const lats = unwrapped.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const samples: LngLat[] = [[centerLon, centerLat]];

  for (const ratio of [0.18, 0.32, 0.46]) {
    const lonOffset = (maxLon - minLon) * ratio;
    const latOffset = (maxLat - minLat) * ratio;
    samples.push([centerLon - lonOffset, centerLat], [centerLon + lonOffset, centerLat], [centerLon, centerLat - latOffset], [centerLon, centerLat + latOffset], [centerLon - lonOffset, centerLat - latOffset], [centerLon + lonOffset, centerLat + latOffset]);
  }

  for (const sample of samples) {
    const normalized: LngLat = [normalizeLongitude(sample[0]), sample[1]];
    if (isValidLngLat(normalized) && isPointInRing(normalized, ring)) {
      return normalized;
    }
  }

  return null;
}

function isPointInRing(point: LngLat, ring: LngLat[]): boolean {
  const unwrapped = unwrapRingLongitudes(ring);
  const baseLon = unwrapped[0]?.[0] ?? point[0];
  const x = unwrapLongitude(point[0], baseLon);
  const y = point[1];
  let inside = false;

  for (let index = 0, previousIndex = unwrapped.length - 1; index < unwrapped.length; previousIndex = index, index += 1) {
    const xi = getOwnProperty(unwrapped, index)[0];
    const yi = getOwnProperty(unwrapped, index)[1];
    const xj = getOwnProperty(unwrapped, previousIndex)[0];
    const yj = getOwnProperty(unwrapped, previousIndex)[1];
    const intersects = ((yi > y) !== (yj > y))
      && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function unwrapRingLongitudes(ring: LngLat[]): LngLat[] {
  const unwrapped: LngLat[] = [];
  let previousLon: number | null = null;

  for (const point of ring) {
    const lon: number = previousLon === null ? point[0] : unwrapLongitude(point[0], previousLon);
    unwrapped.push([lon, point[1]]);
    previousLon = lon;
  }

  return unwrapped;
}

export const ThreatLensMapUtils = {
  buildCountryFeatureIndex,
  collectArcPairs,
  getFeatureAnchor,
  isValidLngLat,
  buildSurfacePath,
  extractSurfaceSegment,
  getSurfacePointAtProgress,
  buildSurfacePathPoints,
};
