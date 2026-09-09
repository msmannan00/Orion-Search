import { Injectable, ElementRef } from '@angular/core';
import { DashboardService } from '../../../../services/dashboard/dashboard.service';
import { AppService } from '../../../../services/core/app/app.service';
@Injectable({ providedIn: 'root' })
export class HomeSearchService {
  showFiltersOverlay = false;

  constructor(private dashboardService: DashboardService, private appService: AppService) { }

  setMatchType(type: string) {
    this.dashboardService.selectedFilters.set({
      ...this.dashboardService.selectedFilters(),
      matchtype: type
    });
    this.appService.set('matchType', type);
  }

  closeOverlay() {
    this.showFiltersOverlay = false;
  }

  toggleAdvanceSettings() {
    const cfg = this.appService.configData();
    this.appService.set('advance_setting_toggle', !cfg.localSettings.advance_setting_toggle);
    this.showFiltersOverlay = true;
  }

  toggleAdvancedTools(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const cfg = this.appService.configData();
    cfg.localSettings.enable_advanced_tools =
            !cfg.localSettings.enable_advanced_tools;
    this.appService.set('enable_advanced_tools', cfg.localSettings.enable_advanced_tools);
    this.appService.configData.set(cfg);
  }

  handleSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement)?.value?.trim();
    if (value && window.innerWidth < 460) {
      this.closeOverlay();
    }
  }

  handleDocumentClick(event: MouseEvent, filtersWrapper?: ElementRef, searchInput?: ElementRef) {
    const eventTargetElement = event.target;
    if (!(eventTargetElement instanceof Node)) {
      return;
    }
    const clickedInsideFilter = filtersWrapper?.nativeElement.contains(eventTargetElement);
    const clickedInput = searchInput?.nativeElement.contains(eventTargetElement);
    if (!clickedInsideFilter && !clickedInput) {
      this.closeOverlay();
    }
  }
}
