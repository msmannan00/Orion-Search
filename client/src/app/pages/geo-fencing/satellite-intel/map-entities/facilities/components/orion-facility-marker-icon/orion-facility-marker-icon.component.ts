import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';

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
    const colors: Record<string, string> = {
      hydro: 'bg-[#2563eb]',
      solar: 'bg-[#facc15]',
      wind: 'bg-[#16a34a]',
      gas: 'bg-[#f59e0b]',
      coal: 'bg-[#111827]',
      oil: 'bg-[#f97316]',
      nuclear: 'bg-[#dc2626]',
      geothermal: 'bg-[#ec4899]',
      biomass: 'bg-[#84cc16]',
      waste: 'bg-[#8b5cf6]',
      storage: 'bg-[#06b6d4]',
      cogeneration: 'bg-[#14b8a6]',
      petcoke: 'bg-[#78716c]',
      wave_and_tidal: 'bg-[#0ea5e9]',
      airport: 'bg-[#9333ea]',
      port: 'bg-[#0d9488]',
      warehouse: 'bg-[#92400e]',
      industrial: 'bg-[#6b7280]',
      military: 'bg-[#d71c1c]',
      other: 'bg-[#a3a3a3]',
    };
    return colors[this.type] || colors.other;
  }
}
