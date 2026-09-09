import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { OrionSatelliteFeature } from '../../../../../models/geo-fencing.models';
import { TranslatePipe } from '../../../../../../../shared/pipes/translate.pipe';

@Component({
  selector:    'app-orion-facility-popup',
  standalone:  true,
  imports:     [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './orion-facility-popup.component.html',
})
export class OrionFacilityPopupComponent {
  private currentFeature: OrionSatelliteFeature | null = null;

  rows: { label: string; value: string; stacked: boolean }[] = [];

  set feature(value: OrionSatelliteFeature | null) {
    this.currentFeature = value;
    this.rows = this.buildRows(value);
  }

  get feature(): OrionSatelliteFeature | null {
    return this.currentFeature;
  }

  get title(): string {
    const name = this.feature?.name?.trim();
    return name ?? 'Feature';
  }

  private buildRows(feature: OrionSatelliteFeature | null): { label: string; value: string; stacked: boolean }[] {
    if (!feature) {
      return [];
    }

    const properties = feature.properties && typeof feature.properties === 'object' ? feature.properties : {};
    const rows = [
      this.createRow('Country', properties.country),
      this.createRow('Fuel', properties.fuel ?? properties.primary_fuel),
      this.createRow('Capacity', this.formatCapacityValue(properties.capacity_mw ?? feature.capacityMw)),
      this.createRow('Source', properties.source ?? feature.source),
    ].filter((row): row is { label: string; value: string; stacked: boolean } => row !== null);

    Object.entries(properties).forEach(([key, rawValue]) => {
      if ([ 'name', 'country', 'fuel', 'primary_fuel', 'capacity_mw', 'source' ].includes(key)) {
        return;
      }
      const row = this.createRow(this.humanizeFieldLabel(key), rawValue);
      if (row) {
        rows.push(row);
      }
    });

    const [lon, lat] = feature.coordinates;
    rows.push({
      label: 'Coordinates',
      value: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      stacked: true,
    });

    return rows;
  }

  private createRow(label: string, value: unknown, stacked = false): { label: string; value: string; stacked: boolean } | null {
    const formatted = this.formatPopupValue(value);
    return formatted ? { label, value: formatted, stacked } : null;
  }

  private humanizeFieldLabel(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  }

  private formatPopupValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return JSON.stringify(value);
  }

  private formatCapacityValue(value: unknown): string {
    if (typeof value !== 'number') {
      return this.formatPopupValue(value);
    }
    return `${value} MW`;
  }
}
