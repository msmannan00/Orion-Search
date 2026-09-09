import { ComponentRef } from '@angular/core';
import { OrionSatelliteFeature } from '../../../models/geo-fencing.models';
import { LeafletComponentRenderer } from '../../map-utils/leaflet-component-renderer';
import { stableHash } from '../../map-utils/renderer-utils';
import { OrionFacilityMarkerIconComponent } from './components/orion-facility-marker-icon/orion-facility-marker-icon.component';
import { OrionFacilityPopupComponent } from './components/orion-facility-popup/orion-facility-popup.component';
import type * as Leaflet from 'leaflet';
import { OrionFacilitiesMapRendererConfig } from '../../model/satellite-intel.model';
import type { Augmented, Nullable, Nullish } from '../../../../../shared/utils/type-guards.util';
import { getOwnProperty } from '../../../../../shared/utils/type-guards.util';


type OrionFacilityMarker = Augmented<Leaflet.Marker, {
  __orionFacilityIconRef: Nullable<ComponentRef<OrionFacilityMarkerIconComponent>>;
  __orionFacilityPopupRef: Nullable<ComponentRef<OrionFacilityPopupComponent>>;
  orionFeature: OrionSatelliteFeature;
}>;


export class OrionFacilitiesMapRenderer {
  private layer: Nullable<Leaflet.LayerGroup> = null;
  private renderKey = '';
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private renderVersion = 0;
  private markers = new Map<string, OrionFacilityMarker>();
  private markerSignatures = new Map<string, string>();
  private readonly L: typeof Leaflet;
  private readonly map: Leaflet.Map;
  private readonly componentRenderer: LeafletComponentRenderer;
  private readonly getData: () => OrionSatelliteFeature[];
  private readonly getFocusedFeature: () => OrionSatelliteFeature | null;
  private readonly onFeatureSelected: (feature: OrionSatelliteFeature) => void;

  constructor(config: OrionFacilitiesMapRendererConfig) {
    this.L = config.L;
    this.map = config.map;
    this.componentRenderer = config.componentRenderer;
    this.getData = config.getData;
    this.getFocusedFeature = config.getFocusedFeature;
    this.onFeatureSelected = config.onFeatureSelected;
  }

  init(): void {
    if (!this.L || !this.map || this.layer) {
      return;
    }
    this.layer = this.L.layerGroup().addTo(this.map);
  }

  render(resetRenderKey = false): void {
    if (!this.layer || !this.L) {
      return;
    }
    const layer = this.layer;

    if (resetRenderKey) {
      this.resetRenderKey();
    }

    const renderKey = this.getRenderKey();
    if (renderKey === this.renderKey) {
      return;
    }
    this.renderKey = renderKey;

    const features = this.getRenderableFeatures();
    const visibleIds = new Set<string>();
    const markersToAdd: OrionFacilityMarker[] = [];

    features.forEach((feature) => {
      const featureId = String(feature?.id || '').trim();
      if (!featureId) {
        return;
      }

      visibleIds.add(featureId);
      const nextSignature = this.getFeatureSignature(feature);
      const existing = this.markers.get(featureId);
      const previousSignature = this.markerSignatures.get(featureId);

      if (!existing) {
        const marker = this.createMarker(feature);
        this.markers.set(featureId, marker);
        this.markerSignatures.set(featureId, nextSignature);
        markersToAdd.push(marker);
        return;
      }

      if (previousSignature !== nextSignature) {
        layer.removeLayer(existing);
        this.destroyMarkerComponents(existing);
        const marker = this.createMarker(feature);
        this.markers.set(featureId, marker);
        this.markerSignatures.set(featureId, nextSignature);
        markersToAdd.push(marker);
      }
    });

    Array.from(this.markers.entries()).forEach(([featureId, marker]) => {
      if (visibleIds.has(featureId)) {
        return;
      }
      layer.removeLayer(marker);
      this.destroyMarkerComponents(marker);
      this.markers.delete(featureId);
      this.markerSignatures.delete(featureId);
    });

    if (markersToAdd.length > 0) {
      markersToAdd.forEach(marker => layer.addLayer(marker));
    }
  }

  scheduleRender(): void {
    if (this.renderTimer) {
      return;
    }
    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.render();
    }, 80);
  }

  resetRenderKey(): void {
    this.renderVersion += 1;
    this.renderKey = '';
  }

  destroy(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    Array.from(this.markers.values()).forEach((marker) => {
      this.destroyMarkerComponents(marker);
    });
    this.markers.clear();
    this.markerSignatures.clear();
    if (this.layer) {
      this.map?.removeLayer(this.layer);
      this.layer = null;
    }
  }

  private createMarker(feature: OrionSatelliteFeature): OrionFacilityMarker {
    const [lon, lat] = feature.coordinates;
    const markerIcon = this.createIcon(feature);
    const popup = this.componentRenderer.create(OrionFacilityPopupComponent, {
      feature,
    });
    const marker = Object.assign(this.L.marker([lat, lon], {
      icon: markerIcon.icon,
    }), {
      __orionFacilityIconRef: markerIcon.componentRef,
      __orionFacilityPopupRef: popup.componentRef,
      orionFeature: feature,
    });
    marker.bindPopup(popup.element, {
      className: 'orion-popup [&_.leaflet-popup-content-wrapper]:!border-0 [&_.leaflet-popup-content-wrapper]:!bg-transparent [&_.leaflet-popup-content-wrapper]:!p-0 [&_.leaflet-popup-content-wrapper]:!shadow-none [&_.leaflet-popup-content]:!m-0 [&_.leaflet-popup-tip]:!bg-transparent [&_.leaflet-popup-tip]:!shadow-none',
    });
    marker.on('click', () => {
      this.onFeatureSelected(feature);
    });
    return marker;
  }

  private createIcon(feature: OrionSatelliteFeature): { icon: Leaflet.DivIcon; componentRef: ComponentRef<OrionFacilityMarkerIconComponent> } {
    const size = this.getMarkerSize();
    const rendered = this.componentRenderer.create(OrionFacilityMarkerIconComponent, {
      type: feature.type,
      isFocused: this.isFocusedFeature(feature),
    });

    return {
      icon: this.L.divIcon({
        html: this.componentRenderer.elementAsHtml(rendered.element),
        className: 'bg-transparent border-0',
        iconSize: [size, size],
        iconAnchor: [Math.round(size / 2), size],
      }),
      componentRef: rendered.componentRef,
    };
  }

  private getMarkerSize(): number {
    const zoom = this.map?.getZoom?.() ?? 3;
    return 24 + Math.max(0, Math.min(8, Math.round((zoom - 4) * 1.2)));
  }

  private destroyMarkerComponents(marker: OrionFacilityMarker): void {
    this.componentRenderer.destroy(marker.__orionFacilityIconRef);
    this.componentRenderer.destroy(marker.__orionFacilityPopupRef);
    marker.__orionFacilityIconRef = null;
    marker.__orionFacilityPopupRef = null;
  }

  private getRenderableFeatures(): OrionSatelliteFeature[] {
    const bounds = this.map?.getBounds?.();
    const paddedBounds = bounds?.pad(0.18);
    const zoom = this.map?.getZoom?.() ?? 3;
    const visibleFeatures = (this.getData() || []).filter((feature) => {
      if (!this.isValidFeature(feature)) {
        return false;
      }
      const [lon, lat] = feature.coordinates;
      return !(paddedBounds && !paddedBounds.contains([lat, lon]));
    });

    return this.limitFeaturesForZoom(visibleFeatures, zoom, paddedBounds);
  }

  private isValidFeature(feature: OrionSatelliteFeature): boolean {
    if (!feature?.id || !Array.isArray(feature.coordinates) || feature.coordinates.length < 2) {
      return false;
    }

    const [lon, lat] = feature.coordinates;
    return feature.properties?.hasValidCoordinates !== false &&
      Number.isFinite(lon) &&
      Number.isFinite(lat) &&
      lon !== 0 &&
      lat !== 0;
  }

  private limitFeaturesForZoom(features: OrionSatelliteFeature[], zoom: number, bounds: Nullish<Leaflet.LatLngBounds>): OrionSatelliteFeature[] {
    const limit = this.getVisibleLimit(zoom);
    if (!Number.isFinite(limit) || features.length <= limit) {
      return features;
    }

    const focusedId = this.getFocusedFeature()?.id ? String(this.getFocusedFeature()?.id) : '';
    const focusedFeature = focusedId
      ? features.find((feature) => String(feature?.id || '') === focusedId) ?? null
      : null;
    const remainingLimit = Math.max(0, limit - (focusedFeature ? 1 : 0));
    const grid = this.getGridSize(zoom);
    const buckets = new Map<string, { feature: OrionSatelliteFeature; score: number }[]>();

    features.forEach((feature) => {
      if (focusedFeature && String(feature?.id || '') === focusedId) {
        return;
      }

      const bucketKey = this.getGridKey(feature, bounds, grid.cols, grid.rows);
      const bucket = buckets.get(bucketKey) ?? [];
      bucket.push({
        feature,
        score: Math.abs(stableHash(String(feature?.id || `${feature?.coordinates?.[1]}:${feature?.coordinates?.[0]}`))),
      });
      buckets.set(bucketKey, bucket);
    });

    const sortedBuckets = Array.from(buckets.values())
      .map((bucket) => bucket.sort((left, right) => left.score - right.score))
      .sort((left, right) => right.length - left.length);

    const limitedFeatures: OrionSatelliteFeature[] = [];
    let round = 0;
    while (limitedFeatures.length < remainingLimit) {
      let addedThisRound = false;
      for (const bucket of sortedBuckets) {
        const entry = getOwnProperty(bucket, round);
        if (!entry) {
          continue;
        }
        limitedFeatures.push(entry.feature);
        addedThisRound = true;
        if (limitedFeatures.length >= remainingLimit) {
          break;
        }
      }
      if (!addedThisRound) {
        break;
      }
      round += 1;
    }

    return focusedFeature ? [focusedFeature, ...limitedFeatures] : limitedFeatures;
  }

  private getVisibleLimit(zoom: number): number {
    if (zoom >= 11) {
      return Number.POSITIVE_INFINITY;
    }
    if (zoom >= 10) {
      return 8000;
    }
    if (zoom >= 9) {
      return 5200;
    }
    if (zoom >= 8) {
      return 3200;
    }
    if (zoom >= 7) {
      return 1900;
    }
    if (zoom >= 6) {
      return 1100;
    }
    if (zoom >= 5) {
      return 700;
    }
    if (zoom >= 4) {
      return 450;
    }
    return 280;
  }

  private getGridSize(zoom: number): { cols: number; rows: number } {
    if (zoom >= 10) {
      return { cols: 36, rows: 24 };
    }
    if (zoom >= 8) {
      return { cols: 30, rows: 20 };
    }
    if (zoom >= 6) {
      return { cols: 24, rows: 16 };
    }
    if (zoom >= 4) {
      return { cols: 20, rows: 12 };
    }
    return { cols: 16, rows: 10 };
  }

  private getGridKey(feature: OrionSatelliteFeature, bounds: Nullish<Leaflet.LatLngBounds>, cols: number, rows: number): string {
    const [lon, lat] = feature.coordinates;
    const west = bounds?.getWest?.() ?? -180;
    const east = bounds?.getEast?.() ?? 180;
    const south = bounds?.getSouth?.() ?? -85;
    const north = bounds?.getNorth?.() ?? 85;
    const lonSpan = Math.max(0.000001, east - west);
    const latSpan = Math.max(0.000001, north - south);
    const x = Math.max(0, Math.min(cols - 1, Math.floor(((lon - west) / lonSpan) * cols)));
    const y = Math.max(0, Math.min(rows - 1, Math.floor(((north - lat) / latSpan) * rows)));

    return `${x}:${y}`;
  }

  private getRenderKey(): string {
    const zoom = this.map?.getZoom?.() ?? 3;
    const bounds = this.map?.getBounds?.();
    const data = this.getData();
    const focusedId = this.getFocusedFeature()?.id ?? '';
    if (!bounds) {
      return `z:${Math.round(zoom * 2)}|count:${data.length}|v:${this.renderVersion}|focus:${focusedId}`;
    }

    const center = bounds.getCenter();
    return [
      `z:${Math.round(zoom * 2)}`,
      `c:${center.lat.toFixed(1)},${center.lng.toFixed(1)}`,
      `d:${bounds.getNorth().toFixed(1)},${bounds.getEast().toFixed(1)},${bounds.getSouth().toFixed(1)},${bounds.getWest().toFixed(1)}`,
      `count:${data.length}`,
      `v:${this.renderVersion}`,
      `focus:${focusedId}`,
    ].join('|');
  }

  private getFeatureSignature(feature: OrionSatelliteFeature): string {
    const coordinates = Array.isArray(feature?.coordinates) ? feature.coordinates : [null, null];
    return JSON.stringify({
      id: feature?.id ?? null,
      name: feature?.name ?? null,
      source: feature?.source ?? null,
      type: feature?.type ?? null,
      rawType: feature?.rawType ?? null,
      color: feature?.color ?? null,
      capacityMw: feature?.capacityMw ?? null,
      lon: coordinates[0] ?? null,
      lat: coordinates[1] ?? null,
      properties: feature?.properties ?? {},
      focused: this.isFocusedFeature(feature),
    });
  }

  private isFocusedFeature(feature: OrionSatelliteFeature): boolean {
    const focusedId = this.getFocusedFeature()?.id;
    return !!focusedId && String(feature?.id || '') === String(focusedId);
  }
}
