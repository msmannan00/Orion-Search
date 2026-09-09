import type { ComponentRef } from '@angular/core';
import { ConsolidatedParamModel } from '../../../shared/model/results/consolidated/consolidated.param.model';
import { OrionSatelliteFeatureTypeEnum, OrionSatelliteSourceEnum, ThreatLensIpScanModeEnum } from '../enums/geo-fencing.enums';

export type OrionSatelliteFeatureType = `${OrionSatelliteFeatureTypeEnum}`;
export type OrionSatelliteSource = `${OrionSatelliteSourceEnum}`;
export type ThreatLensIpScanMode = `${ThreatLensIpScanModeEnum}`;

export interface SatelliteTrackingViewport {
  lat: number;
  lon: number;
  delta: number;
}

export interface MapEntityLoadingBridge {
  begin: (title: string, message: string) => number;
  end: (id: number) => void;
}

export type TrackingEntityType = 'aircraft' | 'ship';

export interface TrackingEntityState {
  type: TrackingEntityType;
  id: string;
}

export interface TrackingSidebarBridge {
  getActiveEntity: () => TrackingEntityState | null;
  getLoadingEntity: () => TrackingEntityState | null;
  isCurrentRequestToken: (token: number) => boolean;
  openLoading: (type: TrackingEntityType, id: string, seedData: unknown) => number;
  openData: (type: TrackingEntityType, data: unknown) => void;
  openError: (type: TrackingEntityType, id: string, message: string) => void;
}

export interface RenderedLeafletComponent<T> {
  element: HTMLElement;
  componentRef: ComponentRef<T>;
}

export interface OrionSatelliteFeature {
  id: string;
  name: string;
  type: OrionSatelliteFeatureType;
  rawType: string;
  source: OrionSatelliteSource;
  coordinates: [number, number];
  color: string;
  capacityMw?: number | null;
  properties?: Record<string, unknown>;
}

export interface OrionSatelliteFilterOption {
  key: OrionSatelliteFeatureType;
  label: string;
  color: string;
}

export interface OrionSatelliteDashboardFilter extends OrionSatelliteFilterOption {
  count: number;
}

export const ORION_POWER_FILTERS: OrionSatelliteFilterOption[] = [
  { key: OrionSatelliteFeatureTypeEnum.Hydro, label: 'hydro', color: '#2563eb' },
  { key: OrionSatelliteFeatureTypeEnum.Solar, label: 'solar', color: '#facc15' },
  { key: OrionSatelliteFeatureTypeEnum.Wind, label: 'wind', color: '#16a34a' },
  { key: OrionSatelliteFeatureTypeEnum.Gas, label: 'gas', color: '#f59e0b' },
  { key: OrionSatelliteFeatureTypeEnum.Coal, label: 'coal', color: '#111827' },
  { key: OrionSatelliteFeatureTypeEnum.Oil, label: 'oil', color: '#f97316' },
  { key: OrionSatelliteFeatureTypeEnum.Nuclear, label: 'nuclear', color: '#dc2626' },
  { key: OrionSatelliteFeatureTypeEnum.Geothermal, label: 'geothermal', color: '#ec4899' },
  { key: OrionSatelliteFeatureTypeEnum.Biomass, label: 'biomass', color: '#84cc16' },
  { key: OrionSatelliteFeatureTypeEnum.Waste, label: 'waste', color: '#8b5cf6' },
  { key: OrionSatelliteFeatureTypeEnum.Storage, label: 'storage', color: '#06b6d4' },
  { key: OrionSatelliteFeatureTypeEnum.Cogeneration, label: 'cogeneration', color: '#14b8a6' },
  { key: OrionSatelliteFeatureTypeEnum.Petcoke, label: 'petcoke', color: '#78716c' },
  { key: OrionSatelliteFeatureTypeEnum.WaveAndTidal, label: 'wave & tidal', color: '#0ea5e9' },
  { key: OrionSatelliteFeatureTypeEnum.Airport, label: 'airport', color: '#9333ea' },
  { key: OrionSatelliteFeatureTypeEnum.Port, label: 'port', color: '#0d9488' },
  { key: OrionSatelliteFeatureTypeEnum.Warehouse, label: 'warehouse', color: '#92400e' },
  { key: OrionSatelliteFeatureTypeEnum.Industrial, label: 'industrial', color: '#6b7280' },
  { key: OrionSatelliteFeatureTypeEnum.Military, label: 'military', color: '#d71c1c' },
  { key: OrionSatelliteFeatureTypeEnum.Other, label: 'other', color: '#a3a3a3' },
];

export const THREAT_LENS_CATEGORY_CONFIG = [
  { key: 'leak_model', label: 'Leak', color: [244, 114, 182] as [number, number, number] },
  { key: 'tracking_model', label: 'Tracking', color: [250, 204, 21] as [number, number, number] },
  { key: 'news_model', label: 'News', color: [34, 211, 238] as [number, number, number] },
  { key: 'exploit_model', label: 'Exploit', color: [251, 146, 60] as [number, number, number] },
  { key: 'defacement_model', label: 'Defacement', color: [248, 113, 113] as [number, number, number] },
  { key: 'chat_model', label: 'Chat', color: [167, 139, 250] as [number, number, number] },
  { key: 'social_model', label: 'Social', color: [74, 222, 128] as [number, number, number] },
  { key: 'generic_model', label: 'Generic', color: [148, 163, 184] as [number, number, number] },
] as const;

export type ThreatLensCategoryModelKey = typeof THREAT_LENS_CATEGORY_CONFIG[number]['key'];
export type ThreatLensRequestPayload = ConsolidatedParamModel;

export interface ThreatCountryCount {
  country: string;
  count: number;
}

export interface ThreatLensCategoryMapData {
  categoryKey: ThreatLensCategoryModelKey;
  categoryLabel: string;
  color: [number, number, number];
  countryCounts: ThreatCountryCount[];
  totalResults: number;
  documentCountryGroups: string[][];
}

export interface ThreatLensFeedItem {
  id: string;
  categoryKey: ThreatLensCategoryModelKey;
  categoryLabel: string;
  color: [number, number, number];
  title: string;
  summary: string;
  highlights: string[];
  link: string;
  date: string;
  timestamp: number;
  countryKeys: string[];
}

export interface ThreatLensDocument {
  [key: string]: unknown;
  m_hash?: unknown;
  doc_id?: unknown;
  id?: unknown;
  m_url?: unknown;
  m_title?: unknown;
  m_creation_date?: unknown;
  m_date?: unknown;
  m_update_date?: unknown;
  m_name?: unknown;
  m_caption?: unknown;
  m_media_caption?: unknown;
  m_sender_name?: unknown;
  m_channel_name?: unknown;
  m_team?: unknown;
  q?: unknown;
  m_important_content?: unknown;
  m_summary?: unknown;
  m_content?: unknown;
  m_highlighted?: unknown;
  m_message_sharable_link?: unknown;
  m_channel_url?: unknown;
  m_base_url?: unknown;
  m_source_url?: unknown;
  m_weblink?: unknown;
  m_platform?: unknown;
  m_remote_type?: unknown;
  m_risk?: unknown;
  m_sender_username?: unknown;
  m_attacker?: unknown;
  ioc?: unknown;
  m_cve?: unknown;
  m_content_type?: unknown;
  m_country_name?: unknown;
  m_location?: unknown;
}

export interface ThreatLensMapData {
  countryCounts: ThreatCountryCount[];
  totalResults: number;
  maxCount: number;
  categoryData: ThreatLensCategoryMapData[];
  feedItems: ThreatLensFeedItem[];
}

export interface ThreatLensLegendItem {
  categoryKey: ThreatLensCategoryModelKey;
  label: string;
  colorHex: string;
  countryCount: number;
  arcCount: number;
  totalResults: number;
}

export interface AnimatedArcDescriptor {
  categoryKey: ThreatLensCategoryModelKey;
  categoryLabel: string;
  color: [number, number, number];
  weight: number;
  arcPoints: [number, number][];
  surfacePaths: [number, number][][];
  countryAKey: string;
  countryBKey: string;
  countryAName: string;
  countryBName: string;
  animationOffset: number;
  animationDuration: number;
}

export type ThreatLensFeedRange = '1d' | '7d' | 'all';

export type ThreatLensDisplayFeedItem = ThreatLensFeedItem & {
  displayDate: string;
  colorHex: string;
};

export interface ThreatLensFeedRangeOption {
  key: ThreatLensFeedRange;
  label: string;
}

export interface ArcDrawState<TGraphic = unknown> {
  arc: AnimatedArcDescriptor;
  graphic: TGraphic;
  completed: boolean;
}
