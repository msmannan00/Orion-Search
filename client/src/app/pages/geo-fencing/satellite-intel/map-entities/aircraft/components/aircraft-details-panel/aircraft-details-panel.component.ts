import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../../../../../../shared/pipes/translate.pipe';
import { getOwnProperty } from '../../../../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-aircraft-details-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './aircraft-details-panel.component.html',
})
export class AircraftDetailsPanelComponent {
  @Input() aircraft: Record<string, unknown> | null = null;

  get fields(): { label: string; value: string; mono?: boolean }[] {
    return [
      { label: 'ICAO24', value: this.display(this.pick('icao24')), mono: true },
      { label: 'Callsign', value: this.display(this.pick('callsign')) },
      { label: 'Origin Country', value: this.display(this.pick('origin_country')) },
      { label: 'On Ground', value: this.display(this.pick('on_ground')) },
      { label: 'Altitude', value: this.display(this.pick('baro_altitude', 'geo_altitude')) },
      { label: 'Velocity', value: this.display(this.pick('velocity')) },
      { label: 'Heading', value: this.display(this.pick('true_track')) },
      { label: 'Vertical Rate', value: this.display(this.pick('vertical_rate')) },
      { label: 'Geo Altitude', value: this.display(this.pick('geo_altitude', 'geo_altitude_ft')) },
      { label: 'Baro Altitude Ft', value: this.display(this.pick('baro_altitude_ft')) },
      { label: 'Geo Altitude Ft', value: this.display(this.pick('geo_altitude_ft')) },
      { label: 'Velocity Knots', value: this.display(this.pick('velocity_knots')) },
      { label: 'Squawk', value: this.display(this.pick('squawk')) },
      { label: 'SPI', value: this.display(this.pick('spi')) },
      { label: 'Sensors', value: this.display(this.pick('sensors')) },
      { label: 'Last Position', value: this.display(this.pick('time_position')) },
      { label: 'Last Contact', value: this.display(this.pick('last_contact')) },
      { label: 'Position Source', value: this.display(this.pick('position_source_label', 'position_source')) },
      { label: 'Position Source Code', value: this.display(this.pick('position_source')) },
      { label: 'Category', value: this.display(this.pick('category_label', 'category')) },
      { label: 'Category Code', value: this.display(this.pick('category')) },
      { label: 'Registration', value: this.display(this.pick('registration', 'r')) },
      { label: 'Aircraft Type', value: this.display(this.pick('aircraft_type', 't')) },
      { label: 'Operator', value: this.display(this.pick('operator')) },
      { label: 'Source', value: this.display(this.pick('source')) },
      { label: 'Latitude', value: this.display(this.pick('latitude')) },
      { label: 'Longitude', value: this.display(this.pick('longitude')) },
    ];
  }

  get description(): string {
    return this.display(this.pick('description', 'desc'));
  }

  get coordinates(): string {
    const latitude = this.aircraft?.latitude;
    const longitude = this.aircraft?.longitude;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return `${Number(latitude).toFixed(3)}, ${Number(longitude).toFixed(3)}`;
    }
    return '-';
  }

  private pick(...keys: string[]): unknown {
    for (const key of keys) {
      const value = getOwnProperty(this.aircraft, key);
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }
    return null;
  }

  private display(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }
}
