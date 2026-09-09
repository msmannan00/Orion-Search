import { Component, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppService } from '../../../services/core/app/app.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { filter_mapping } from '../../../shared/constants/filters';
import { countFilterValues } from '../../../shared/utils/filter-values.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-selected-filter-bar',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './selected-filter-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./selected-filter-bar.component.css'],
})
export class SelectedFilterBarComponent implements OnInit {
  protected readonly filter_mapping = filter_mapping;

  categories: Record<string, string[]> = {};
  isFilterBarExpanded = false;
  maxVisibleTags = 8;
  Object: unknown;
  readonly showSorting = input.required<boolean>();
  readonly clearAll = output<undefined>();
  readonly searchFiltersChange = output<undefined>();

  get selectedFilters() {
    return this.dashboardService.selectedFilters();
  }

  isLightTheme(): boolean {
    return document.body.classList.contains('light-theme');
  }

  constructor(protected app_service: AppService, protected dashboardService: DashboardService) {
  }

  isConsolidatedRoute(): boolean {
    return true;
  }

  ngOnInit(): void {
    this.categories = this.app_service.configData().localSettings.entityfilterCategories;
  }

  clearMatchType(): void {
    this.dashboardService.selectedFilters.update((filters) => {
      const updated = { ...filters };
      delete updated.matchtype;
      return updated;
    });
    this.app_service.set('matchType', "or");

    this.clearAll.emit(undefined);
  }

  clearFilters(scope: 'sidebar' | 'entity' | 'all'): void {
    if (scope === 'sidebar' || scope === 'all') {
      this.dashboardService.selectedFilters.set({});
    }
    if (scope === 'entity' || scope === 'all') {
      if (this.isConsolidatedRoute()) {
        this.app_service.set('entityfilterCategories', {});
      }
    }
    if (scope=='all'){
      this.app_service.set('matchType', "or");
    }

    this.clearAll.emit(undefined);
  }

  removeEntityTypeFilterTag(tagToRemoveId: string) {
    const categories = { ...this.app_service.configData().localSettings.entityfilterCategories };
    for (const key in categories) {
      const value = getOwnProperty(categories, key);
      if (Array.isArray(value)) {
        setOwnProperty(categories, key, value.filter(tag => tag !== tagToRemoveId));
      }
      else if (value === tagToRemoveId) {
        Reflect.deleteProperty(categories, key);
      }
    }
    this.app_service.set('entityfilterCategories', categories);

    this.searchFiltersChange.emit(undefined);
  }

  toggleFilterBarCollapse(): void {
    this.isFilterBarExpanded = !this.isFilterBarExpanded;
  }

  sidebarFilters() {
    return Object.keys(this.dashboardService.selectedFilters());
  }

  sidebarFilterCount(all = false): number {
    if (all) {
      return Object.entries(this.dashboardService.selectedFilters())
        .filter(([key, value]) => key !== 'matchtype' || value !== 'or')
        .length;
    }
    else {
      return Object.entries(this.dashboardService.selectedFilters())
        .filter(([key, value]) => key !== 'matchtype' && value !== null)
        .length;
    }
  }

  entityFiltersCount(): number {
    const categories = this.app_service.configData().localSettings.entityfilterCategories;
    return countFilterValues(categories);
  }

  getVisibleTags(): string[] {
    const allTags = Object.values(this.app_service.configData().localSettings.entityfilterCategories).flat();
    return allTags.slice(0, this.maxVisibleTags);
  }

  getHiddenTagCount(): number {
    const categories = this.app_service.configData().localSettings.entityfilterCategories;
    const totalTags = countFilterValues(categories);
    return Math.max(0, totalTags - this.maxVisibleTags);
  }
}
