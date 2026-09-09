import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../../../../../../shared/pipes/translate.pipe';
import { ShipDetailField } from '../../../../model/satellite-intel.model';
import { getOwnProperty } from '../../../../../../../shared/utils/type-guards.util';



const PRIMARY_SHIP_DETAIL_KEYS = new Set([
  'mmsi',
  'name',
  'ship_name',
  'vessel_name',
  'VesselName',
  'call_sign',
  'callsign',
  'CallSign',
  'destination',
  'Destination',
  'speed',
  'sog',
  'SOG',
  'Speed',
  'course',
  'cog',
  'COG',
  'Course',
  'true_heading',
  'heading',
  'HDG',
  'Heading',
  'nav_status',
  'navigational_status',
  'status_code',
  'ship_type',
  'ShipType',
  'type',
  'latitude',
  'lat',
  'LAT',
  'Latitude',
  'longitude',
  'lon',
  'lng',
  'LON',
  'Longitude',
]);

@Component({
  selector: 'app-ship-details-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ship-details-panel.component.html',
})
export class ShipDetailsPanelComponent {
  @Input() ship: Record<string, unknown> | null = null;

  get fields(): ShipDetailField[] {
    return [
      { label: 'MMSI', value: this.display(this.pick('mmsi')), mono: true },
      { label: 'Name', value: this.display(this.pick('name')) },
      { label: 'Callsign', value: this.display(this.pick('call_sign')) },
      { label: 'Destination', value: this.display(this.pick('destination')) },
      { label: 'Speed', value: this.display(this.pick('speed')) },
      { label: 'Course', value: this.display(this.pick('course')) },
      { label: 'True Heading', value: this.display(this.pick('true_heading')) },
      { label: 'Nav Status', value: this.display(this.pick('nav_status')) },
    ];
  }

  get extraFields(): ShipDetailField[] {
    if (!this.ship) {
      return [];
    }

    return Object.entries(this.ship)
      .filter(([key, value]) => !PRIMARY_SHIP_DETAIL_KEYS.has(key) && this.hasValue(value))
      .flatMap(([key, value]) => this.toExtraFields(key, value));
  }

  get shipType(): string {
    return this.display(this.pick('ship_type'));
  }

  get coordinates(): string {
    const latitude = this.ship?.latitude;
    const longitude = this.ship?.longitude;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return `${Number(latitude).toFixed(3)}, ${Number(longitude).toFixed(3)}`;
    }
    return '-';
  }

  private pick(...keys: string[]): unknown {
    for (const key of keys) {
      const value = getOwnProperty(this.ship, key);
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }
    return null;
  }

  private toExtraFields(key: string, value: unknown): ShipDetailField[] {
    if (Array.isArray(value)) {
      return [{ label: this.formatLabel(key), value: this.display(value), mono: true }];
    }

    if (this.isRecord(value)) {
      return Object.entries(value)
        .filter(([, nestedValue]) => this.hasValue(nestedValue))
        .flatMap(([nestedKey, nestedValue]) => this.toExtraFields(`${key}.${nestedKey}`, nestedValue));
    }

    return [{ label: this.formatLabel(key), value: this.display(value), mono: this.isCodeLike(key) }];
  }

  private hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private isCodeLike(key: string): boolean {
    return ['id', 'mmsi', 'timestamp', 'source', 'msg_type'].some((part) => key.toLowerCase().includes(part));
  }

  private display(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
