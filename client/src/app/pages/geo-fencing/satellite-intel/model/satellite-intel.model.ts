import { MapEntityLoadingBridge, OrionSatelliteFeature, TrackingSidebarBridge } from '../../models/geo-fencing.models';
import { SatelliteAircraftTrackingService } from '../map-entities/aircraft/aircraft-tracking.service';
import { SatelliteFacilitiesService } from '../map-entities/facilities/facilities.service';
import { SatelliteShipTrackingService } from '../map-entities/ships/ship-tracking.service';
import { SatelliteLiveAircraft, SatelliteLiveShip } from './satellite-intel-api.models';
import { ComponentRef, EnvironmentInjector } from '@angular/core';
import { LeafletComponentRenderer } from '../map-utils/leaflet-component-renderer';
import type * as Leaflet from 'leaflet';
import { Augmented, Nullable } from '../../../../shared/utils/type-guards.util';

export interface SatelliteImageType {
  key:   string;
  label: string;
}

export const SATELLITE_IMAGE_TYPES: SatelliteImageType[] = [
  { key: 'true_colour',  label: 'True Colour'   },
  { key: 'false_colour', label: 'False Colour'  },
  { key: 'ndvi',         label: 'NDVI'          },
  { key: 'swir',         label: 'SWIR'          },
  { key: 'moisture',     label: 'Moisture'      },
  { key: 'sar',          label: 'SAR'           },
];

export interface EntityLoaderConfig {
  aircraftService: SatelliteAircraftTrackingService;
  shipService: SatelliteShipTrackingService;
  facilitiesService: SatelliteFacilitiesService;
  loading: MapEntityLoadingBridge;
}

export interface ShipDetailField { label: string; value: string; mono?: boolean }

export interface AircraftDistributionCell {
  key: string;
  row: number;
  col: number;
  items: SatelliteLiveAircraft[];
}

export interface ShipDistributionCell {
  key: string;
  row: number;
  col: number;
  items: SatelliteLiveShip[];
}

export interface MarkerAnimationFrame<M> {
  marker: M;
  startLat: number;
  startLon: number;
  targetLat: number;
  targetLon: number;
  startedAt: number;
}

export interface EntityRendererConfig {
  L: typeof Leaflet;
  map: Leaflet.Map;
  environmentInjector: EnvironmentInjector;
  aircraftService: SatelliteAircraftTrackingService;
  shipService: SatelliteShipTrackingService;
  sidebar: TrackingSidebarBridge;
  getAircraftData: () => SatelliteLiveAircraft[];
  getShipsData: () => SatelliteLiveShip[];
  getOrionData: () => OrionSatelliteFeature[];
  getFocusedFeature: () => OrionSatelliteFeature | null;
  onFeatureSelected: (feature: OrionSatelliteFeature) => void;
}

export interface OrionFacilitiesMapRendererConfig {
  L: typeof Leaflet;
  map: Leaflet.Map;
  componentRenderer: LeafletComponentRenderer;
  getData: () => OrionSatelliteFeature[];
  getFocusedFeature: () => OrionSatelliteFeature | null;
  onFeatureSelected: (feature: OrionSatelliteFeature) => void;
}

export interface RenderedMarkerIcon {
  icon: Leaflet.DivIcon;
  componentRef: ComponentRef<{ rotationDegrees: number }>;
}

export type EntityMarker = Augmented<Leaflet.Marker, {
  __orionIconRef?: Nullable<ComponentRef<{ rotationDegrees: number }>>;
  __orionIconState?: string;
}>;

export interface EntityRendererBaseConfig {
  L: typeof Leaflet;
  map: Leaflet.Map;
  sidebar: TrackingSidebarBridge;
  componentRenderer: LeafletComponentRenderer;
}

export interface DistributionCellItems<T> {
  key: string;
  row: number;
  col: number;
  items: T[];
}
