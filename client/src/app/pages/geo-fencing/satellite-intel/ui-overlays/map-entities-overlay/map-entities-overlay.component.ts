import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MapLoadingBadgesComponent } from '../../../../../shared/partials/map-loading-badges/map-loading-badges.component';
import { OrionSatelliteFilterOption, TrackingEntityType } from '../../../models/geo-fencing.models';
import { AircraftDetailsPanelComponent } from '../../map-entities/aircraft/components/aircraft-details-panel/aircraft-details-panel.component';
import { FacilityLegendComponent } from '../../map-entities/facilities/components/facility-legend/facility-legend.component';
import { ShipDetailsPanelComponent } from '../../map-entities/ships/components/ship-details-panel/ship-details-panel.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { UnknownRecord } from '../../../../../shared/utils/type-guards.util';

@Component({
  selector:    'app-map-entities-overlay',
  standalone:  true,
  imports:     [CommonModule, AircraftDetailsPanelComponent, ShipDetailsPanelComponent, FacilityLegendComponent, MapLoadingBadgesComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './map-entities-overlay.component.html',
})
export class MapEntitiesOverlayComponent {
  @Input() facilitiesVisible = true;
  @Input() legendConstrained = false;
  @Input() legendFilters: OrionSatelliteFilterOption[] = [];
  @Input() sidebarVisible = false;
  @Input() sidebarLoading = false;
  @Input() sidebarError: string | null = null;
  @Input() selectedEntity: { type: TrackingEntityType; data: UnknownRecord | null } | null = null;
  @Input() isAircraftLoading = false;
  @Input() isShipsLoading = false;
  @Input() isMapEntityLoading = false;
  @Input() errorMessage: string | null = null;
  @Input() isScanning = false;
  @Input() topControlsInset = false;

  @Output() closeSidebar = new EventEmitter<void>();

  get loadingBadges(): string[] {
    const badges: string[] = [];

    if (this.isAircraftLoading) {
      badges.push('Aircraft loading...');
    }
    if (this.isShipsLoading) {
      badges.push('Ships loading...');
    }
    if (this.isMapEntityLoading) {
      badges.push('Facilities loading...');
    }

    return badges;
  }
}
