import { ComponentRef } from '@angular/core';
import { SatelliteAnomalyResponse } from '../../model/satellite-intel-api.models';
import { LeafletComponentRenderer } from '../../map-utils/leaflet-component-renderer';
import { AnomalyMapPopupComponent } from './anomaly-map-popup.component';
import type * as Leaflet from 'leaflet';
import type { Nullable } from '../../../../../shared/utils/type-guards.util';

export class AnomalyMapRenderer {
  private layer: Nullable<Leaflet.LayerGroup> = null;
  private popupRef: Nullable<ComponentRef<AnomalyMapPopupComponent>> = null;
  private renderKey = '';

  constructor(private L: typeof Leaflet, private map: Leaflet.Map, private componentRenderer: LeafletComponentRenderer) {}

  init(): void {
    if (!this.L || !this.map || this.layer) {
      return;
    }
    this.layer = this.L.layerGroup().addTo(this.map);
  }

  render(anomalyResult: SatelliteAnomalyResponse['result'] | null): void {
    if (!this.layer) {
      return;
    }

    const renderKey = JSON.stringify(anomalyResult ?? null);
    if (renderKey === this.renderKey) {
      return;
    }
    this.renderKey = renderKey;

    this.clear();
    if (!anomalyResult?.bbox) {
      return;
    }

    const bounds = this.getBounds(anomalyResult.bbox);
    if (!bounds) {
      return;
    }

    const popup = this.componentRenderer.create(AnomalyMapPopupComponent, {
      anomalyResult,
    });
    this.popupRef = popup.componentRef;
    this.L.rectangle(bounds, this.getRectangleOptions(anomalyResult.alert_level))
      .addTo(this.layer)
      .bindPopup(popup.element);
    this.map?.fitBounds(bounds, { padding: [40, 40] });
  }

  destroy(): void {
    this.clear();
    if (this.layer) {
      this.map?.removeLayer(this.layer);
      this.layer = null;
    }
  }

  private clear(): void {
    this.componentRenderer.destroy(this.popupRef);
    this.popupRef = null;
    this.layer?.clearLayers();
  }

  private getBounds(bbox: unknown): [[number, number], [number, number]] | null {
    if (!Array.isArray(bbox) || bbox.length < 4) {
      return null;
    }
    const [mnLo, mnLa, mxLo, mxLa] = bbox.map(Number);
    if (![mnLo, mnLa, mxLo, mxLa].every(Number.isFinite)) {
      return null;
    }
    return [[mnLa, mnLo], [mxLa, mxLo]];
  }

  private getRectangleOptions(alertLevel: string | undefined): Leaflet.PathOptions {
    const colors: Record<string, string> = {
      critical: '#ef4444',
      warning: '#f59e0b',
      nominal: '#22c55e',
      unknown: '#3b82f6',
    };
    const color = colors[alertLevel ?? 'unknown'] || colors.unknown;
    return {
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.08,
      dashArray: '6 4',
    };
  }
}
