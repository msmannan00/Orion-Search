import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector:    'app-ship-marker-icon',
  standalone:  true,
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ship-marker-icon.component.html',
})
export class ShipMarkerIconComponent {
  strokeColor = '#0ea5e9';
  rotationDegrees = 0;
  isLoading = false;
  isSelected = false;

  get rotationTransform(): string {
    return `rotate(${this.rotationDegrees} 12 12)`;
  }
}
