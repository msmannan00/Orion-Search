import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FACILITY_TYPE_DOT_CLASSES } from '../../facility-dot-classes.const';

@Component({
  selector:    'app-orion-facility-marker-icon',
  standalone:  true,
  imports:     [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './orion-facility-marker-icon.component.html',
})
export class OrionFacilityMarkerIconComponent {
  type = 'other';
  isFocused = false;

  get colorClass(): string {
    return FACILITY_TYPE_DOT_CLASSES[this.type] || FACILITY_TYPE_DOT_CLASSES.other;
  }
}
