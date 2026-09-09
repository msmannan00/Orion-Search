import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrionSatelliteDashboardFilter, OrionSatelliteFeature, OrionSatelliteFeatureType } from '../../../models/geo-fencing.models';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { SatelliteFacilitiesResponse } from '../../model/satellite-intel-api.models';

@Component({
  selector: 'app-satellite-dashboard-section',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard-section.component.html',
})
export class DashboardSectionComponent {
  @Input() dashboardSearch = '';
  @Input() dashboardSearchResults: OrionSatelliteFeature[] = [];
  @Input() dashboardTypeFilters: OrionSatelliteDashboardFilter[] = [];
  @Input() selectedFilters: OrionSatelliteFeatureType[] = [];
  @Input() visiblePowerCount = 0;
  @Input() wriDataCount = 0;
  @Input() facilitiesData: SatelliteFacilitiesResponse['result'] | null = null;
  @Input() facilityEntries: [string, number][] = [];
  @Input() hasSearched = false;
  @Input() isScanning = false;
  @Input() aircraftTrackingEnabled = false;
  @Input() shipsTrackingEnabled = false;
  @Input() isAircraftLoading = false;
  @Input() isShipsLoading = false;
  @Input() aircraftCount = 0;
  @Input() shipsCount = 0;
  @Input() locationScoped = false;
  @Input() aircraftTrackingError: string | null = null;
  @Input() shipsTrackingError: string | null = null;
  @Input() selectedFeature: OrionSatelliteFeature | null = null;

  @Output() dashboardSearchInput = new EventEmitter<string>();
  @Output() clearDashboardSearch = new EventEmitter<void>();
  @Output() featureFocused = new EventEmitter<OrionSatelliteFeature>();
  @Output() filterToggled = new EventEmitter<OrionSatelliteFeatureType>();
  @Output() selectAllFilters = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() locationOpened = new EventEmitter<void>();
  @Output() locationTargeted = new EventEmitter<void>();
  @Output() locationCleared = new EventEmitter<void>();
  @Output() aircraftTrackingToggled = new EventEmitter<void>();
  @Output() shipTrackingToggled = new EventEmitter<void>();

  isFilterSelected(type: OrionSatelliteFeatureType): boolean {
    return this.selectedFilters.includes(type);
  }

  dotColor(feature: OrionSatelliteFeature | null): string {
    return feature?.color ?? '#6b7280';
  }
}
