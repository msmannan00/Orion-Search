import { Component, effect, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { FilterModel } from '../../model/filter/filter.model';
import { last } from 'rxjs';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { DatePickerComponent } from './date-picker/date-picker.component';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { ScrollService } from '../../services/scroll.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UiDropdownComponent, UiDropdownOption } from '../ui-dropdown/ui-dropdown.component';
import { SuggestionService } from './services/suggestions.service';
import { getOwnProperty, setOwnProperty } from '../../utils/type-guards.util';


@Component({
  selector: 'app-filters',
  templateUrl: './filters.component.html',
  standalone: true,
  imports: [FormsModule, NgOptimizedImage, TooltipDirective, DatePickerComponent, TranslatePipe, UiDropdownComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class FiltersComponent implements OnInit {
  private suggestionRequestIds: Record<string, number> = {};

  protected readonly Object = Object;
  protected readonly last = last;

  readonly filterModelInput = input<FilterModel | undefined>(undefined, { alias: 'filterModel' });
  selectedFilters: Record<string, string | null> = {};
  dropdownLoading: Record<string, boolean> = {};
  initialModel!: FilterModel;
  filterModel!: FilterModel;
  readonly isFilterOpen = input.required<boolean | null>();
  readonly dropdownSurface = input<'default' | 'alert'>('default');
  readonly filterChanged = output<Record<string, string | null>>();
  readonly filterReset = output<undefined>();
  readonly filterClose = output<undefined>();

  constructor(protected dashboard: DashboardService, private scrollService: ScrollService, private suggestionService: SuggestionService) {
    effect(() => {
      const currentFilters = this.dashboard.selectedFilters();
      this.selectedFilters = { ...currentFilters };
    });
    effect(() => {
      const filterModel = this.filterModelInput();
      if (filterModel === undefined) {
        return;
      }
      this.filterModel = filterModel;
      this.initialModel = structuredClone(filterModel);
    });
  }

  ngOnInit() {
    if (this.filterModel) {
      this.initialModel = structuredClone(this.filterModel);
    }
  }

  updateFilter( event: { key: string; value: string; } ) {
    this.selectedFilters[event.key] = event.value;
    if (this.filterModel.filters[event.key]) {
      this.filterModel.filters[event.key].selected = event.value;
    }
  }

  onSelectionChange(key: string, value: string | null) {
    setOwnProperty(this.selectedFilters, key, value);
    if (getOwnProperty(this.filterModel.filters, key)) {
      getOwnProperty(this.filterModel.filters, key).selected = value ?? '';
    }
  }

  onDropdownSearch(key: string, query: string) {
    const filter = getOwnProperty(this.filterModel.filters, key);
    if (!filter?.suggestionSource && !filter?.suggestionEndpoint) {
      return;
    }

    const trimmedQuery = query.trim();
    const requestId = (getOwnProperty(this.suggestionRequestIds, key) || 0) + 1;
    setOwnProperty(this.suggestionRequestIds, key, requestId);
    if (!trimmedQuery && filter.options.length) {
      this.dropdownLoading = { ...this.dropdownLoading, [key]: false };
      return;
    }

    this.dropdownLoading = { ...this.dropdownLoading, [key]: true };
    this.suggestionService.loadSuggestion(filter.suggestionSource, key, trimmedQuery, filter.suggestionEndpoint, filter.suggestionParams).subscribe({
      next: values => {
        if (getOwnProperty(this.suggestionRequestIds, key) !== requestId) {
          return;
        }
        this.setDropdownOptions(key, values.map(value => ({ key: value, label: value })));
        this.dropdownLoading = { ...this.dropdownLoading, [key]: false };
      },
      error: () => {
        if (getOwnProperty(this.suggestionRequestIds, key) === requestId) {
          this.dropdownLoading = { ...this.dropdownLoading, [key]: false };
        }
      }
    });
  }

  applyFilters() {
    this.scrollService.clearSavedPosition();
    this.dashboard.selectedFilters.set(this.selectedFilters);
    this.filterChanged.emit({ ...this.selectedFilters });
    this.closeFilter();
  }

  closeFilter() {

    this.filterClose.emit(undefined);
  }

  resetFilters() {
    this.scrollService.clearSavedPosition();
    this.selectedFilters = {};
    this.dashboard.selectedFilters.set({});
    this.filterChanged.emit({});

    this.filterReset.emit(undefined);
    this.closeFilter();
  }

  private setDropdownOptions(key: string, options: UiDropdownOption[]) {
    const filter = getOwnProperty(this.filterModel.filters, key);
    if (!filter) {
      return;
    }
    filter.options = options;
  }
}
