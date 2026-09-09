import { AnimatedArcDescriptor, ThreatLensCategoryModelKey } from '../../models/geo-fencing.models';

export type LngLat = [number, number];

export interface ArcPair {
  countryAKey: string;
  countryBKey: string;
  weight: number;
}

export type ArcPoint2D = [number, number];

export type ThreatLensFeedPanelType = 'news' | 'archive';

export interface ThreatLensScreenPoint {
  x: number;
  y: number;
}

export interface ThreatLensCoordinates {
  lat: number;
  lon: number;
}

export interface EsriExtent {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  center?: EsriGeometry;
}

export interface EsriGeometry {
  type?: string;
  longitude?: number;
  latitude?: number;
  x?: number;
  y?: number;
  lat?: number;
  lon?: number;
  xmin?: number;
  ymin?: number;
  xmax?: number;
  ymax?: number;
  rings?: unknown[][];
  paths?: unknown[][];
  extent?: EsriExtent;
  centroid?: EsriGeometry;
  labelPoint?: EsriGeometry;
  spatialReference?: Record<string, unknown>;
  clone?: () => EsriGeometry;
  [key: string]: unknown;
}

export interface EsriSymbol {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  color?: unknown;
  outline?: EsriSymbol;
  opacity?: number;
  clone?: () => EsriSymbol;
  [key: string]: unknown;
}

export interface EsriHandle {
  remove: () => void;
}

export interface EsriCollection<T> {
  readonly length: number;
  toArray: () => T[];
  forEach: (callback: (value: T, index: number) => void) => void;
  map: <U>(callback: (value: T, index: number) => U) => U[];
  filter: (callback: (value: T, index: number) => boolean) => T[];
  find: (callback: (value: T, index: number) => boolean) => T | undefined;
}

export interface EsriGraphicsLayer {
  graphics: EsriCollection<ThreatLensMapGraphic>;
  add: (graphic: ThreatLensMapGraphic) => ThreatLensMapGraphic;
  addMany: (graphics: ThreatLensMapGraphic[]) => ThreatLensMapGraphic[];
  remove: (graphic: ThreatLensMapGraphic) => ThreatLensMapGraphic;
  removeAll: () => void;
  [key: string]: unknown;
}

export interface EsriFeatureLayer extends EsriGraphicsLayer {
  createQuery: () => EsriQuery;
  queryFeatures: (query: EsriQuery) => Promise<{ features: ThreatLensMapGraphic[] }>;
}

export interface EsriQuery {
  where?: string;
  returnGeometry?: boolean;
  outFields?: string[];
}

export interface EsriLayerView {
  highlight: (graphic: ThreatLensMapGraphic) => EsriHandle;
}

export interface EsriHitTestResult {
  graphic: ThreatLensMapGraphic;
}

export interface EsriViewPointerEvent {
  x?: number;
  y?: number;
  clientX?: number;
  clientY?: number;
  native?: MouseEvent | TouchEvent;
  touches?: TouchList;
  [key: string]: unknown;
}

export interface EsriMapLike {
  basemap: string | { id?: string };
  [key: string]: unknown;
}

export interface EsriSceneView {
  zoom: number;
  scale: number;
  width: number;
  height: number;
  center: EsriGeometry;
  interacting: boolean;
  map: EsriMapLike;
  camera?: { position?: EsriGeometry; [key: string]: unknown };
  ui: { components: string[] };
  highlightOptions: Record<string, unknown>;
  destroy: () => void;
  when: () => Promise<void>;
  whenLayerView: (layer: EsriFeatureLayer) => Promise<EsriLayerView>;
  goTo: (target: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  on: (eventName: string, callback: (event: EsriViewPointerEvent) => void | Promise<void>) => EsriHandle;
  watch: <T = unknown>(propertyName: string, callback: (value: T) => void) => EsriHandle;
  hitTest: (event: EsriViewPointerEvent, options?: Record<string, unknown>) => Promise<{ results: EsriHitTestResult[] }>;
  toScreen: (geometry: EsriGeometry) => ThreatLensScreenPoint | null;
  toMap: (point: ThreatLensScreenPoint) => EsriGeometry | null;
  resize: () => void;
  requestRender?: () => void;
  environment?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EsriGeometryEngine {
  labelPoint?: (geometry: EsriGeometry) => EsriGeometry;
  centroid?: (geometry: EsriGeometry) => EsriGeometry;
  contains?: (geometry: EsriGeometry, point: EsriGeometry) => boolean;
  intersects?: (first: EsriGeometry, second: EsriGeometry) => boolean;
  geodesicArea?: (geometry: EsriGeometry, unit?: string) => number;
  planarArea?: (geometry: EsriGeometry, unit?: string) => number;
  [key: string]: unknown;
}

export interface EsriWebMercatorUtils {
  xyToLngLat?: (x: number, y: number) => [number, number];
  webMercatorToGeographic?: (geometry: EsriGeometry) => EsriGeometry;
  geographicToWebMercator?: (geometry: EsriGeometry) => EsriGeometry;
  [key: string]: unknown;
}

export type EsriConstructor<T> = new (options?: Record<string, unknown>) => T;

export interface ThreatLensCountryBoundary {
  rings: ThreatLensCoordinates[][];
  extent: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export interface ThreatLensIpViewportScanRequest {
  center: ThreatLensCoordinates;
  radiusKm: number;
  boundary?: ThreatLensCountryBoundary | null;
}

export interface ThreatLensIpRecord {
  ip: string;
  lat?: number;
  lon?: number;
  network?: string;
  accuracyRadius?: number;
  distanceKm?: number;
}

export interface ThreatLensMapGraphicAttributes {
  role?: string;
  ip?: string;
  count?: number;
  networkCount?: number;
  records?: ThreatLensIpRecord[];
  stackReason?: string;
  network?: string;
  accuracyRadius?: number;
  accuracyMin?: number;
  accuracyMax?: number;
  distanceKm?: number;
  endpoint_color?: number[];
  endpoint_opacity?: number;
  endpoint_id?: string;
  [key: string]: unknown;
}

export interface ThreatLensMapGraphic {
  geometry?: EsriGeometry;
  attributes?: ThreatLensMapGraphicAttributes;
  symbol?: EsriSymbol;
  layer?: EsriFeatureLayer | EsriGraphicsLayer;
  [key: string]: unknown;
}

export interface ThreatLensIpDistributionCellRef {
  key: string;
  row: number;
  col: number;
  centerScore: number;
}

export interface ThreatLensIpDistributionCell extends ThreatLensIpDistributionCellRef {
  items: ThreatLensMapGraphic[];
}

export interface ThreatLensIpPointGroup {
  point: ThreatLensCoordinates;
  records: ThreatLensIpRecord[];
}

export interface ThreatLensIpScreenGroup {
  point: ThreatLensCoordinates;
  records: ThreatLensIpRecord[];
  items: ThreatLensMapGraphic[];
}

export interface ThreatLensIpGroupStats {
  networkCount: number;
  accuracyMin?: number;
  accuracyMax?: number;
}

export interface ThreatLensArcRangeOption {
  index: number;
  label: string;
  start: number;
  end: number;
}

export interface ThreatLensCountrySelection {
  name: string;
  key: string;
  ipScanRequest?: ThreatLensIpViewportScanRequest | null;
}

export interface ThreatLensArcSelection {
  categoryKey: ThreatLensCategoryModelKey;
  categoryLabel: string;
  countryAKey: string;
  countryBKey: string;
  countryAName: string;
  countryBName: string;
  weight: number;
}

export interface ThreatLensArcRenderResult {
  totalArcCount: number;
  arcCountByCategory: Map<ThreatLensCategoryModelKey, number>;
}

export interface ThreatLensArcBatchStatus {
  categoryKey: ThreatLensCategoryModelKey | null;
  categoryLabel: string;
  visibleCount: number;
  categoryArcCount: number;
  start: number;
  end: number;
  batchIndex: number;
  batchCount: number;
  isCategoryLocked: boolean;
}

export interface ArcCategoryBatch {
  categoryKey: ThreatLensCategoryModelKey;
  categoryLabel: string;
  categoryArcCount: number;
  categoryStartIndex: number;
  categoryBatchIndex: number;
  categoryBatchCount: number;
  items: AnimatedArcDescriptor[];
}
