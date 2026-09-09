import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { search_filter_labels } from '../../../shared/constants/shared-enums';
import { AppService } from '../../../services/core/app/app.service';
import { FilterCategory } from '../../../shared/model/filter/filter.model';
import { searchFilterAnimation } from '../../../shared/animations/search.filter.animation';
import { SuggestionService } from '../../../shared/partials/filters/services/suggestions.service';
import { HelperService } from '../../../shared/services/helper.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-search-filters',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslatePipe],
  templateUrl: './search-filters.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [searchFilterAnimation],
})
export class SearchFiltersComponent implements OnInit {
  protected readonly search_filter_labels = search_filter_labels;

  @ViewChild('categoryScroll', { static: true }) categoryScroll!: ElementRef;
  filteredCategories: FilterCategory[] = [];
  categories: Record<string, string[]> = {};
  suggestionsMap: Record<string, string[]> = {};
  filteredSuggestions: string[] = [];
  showSuggestions = false;
  selectedCategoryId = '';
  entitySearch = '';
  newValue = '';
  showLeftFade = false;
  showRightFade = false;
  readonly showSorting = input.required<boolean>();
  readonly homePage = input<boolean>(false);
  readonly checkDomain = output<undefined>();
  readonly searchFiltersChange = output<undefined>();

  constructor(public helperService: HelperService, public app_service: AppService, private suggestionService: SuggestionService) {
  }

  get selectedCategoryTags() {
    return this.categories[this.selectedCategoryId] ?? [];
  }

  ngOnInit(): void {
    this.suggestionService.loadSuggestions().subscribe(data => {
      this.suggestionsMap = data;
    });
    const defaultCategories: Record<string, string[]> = {};
    for (const key of Object.keys(search_filter_labels)) {
      setOwnProperty(defaultCategories, key, []);
    }
    this.initializeFilterCategories(defaultCategories);
    this.categories = this.app_service.configData().localSettings.entityfilterCategories;
    this.initCategories("");
  }

  initializeFilterCategories(defaultCategories: Record<string, string[]>): void {
    const currentCategories = this.app_service.configData().localSettings.entityfilterCategories;
    if (!currentCategories || Object.keys(currentCategories).length === 0) {
      this.app_service.set('entityfilterCategories', defaultCategories);
    }
  }

  scrollLeft() {
    this.categoryScroll.nativeElement.scrollBy({ left: -150, behavior: 'smooth' });
  }

  scrollRight() {
    this.categoryScroll.nativeElement.scrollBy({ left: 150, behavior: 'smooth' });
  }

  addTag() {
    let trimmed = this.newValue.trim();
    const allTags = Object.values(this.categories).flat();
    const alreadyExists = allTags.some(tag => tag.toLowerCase() === trimmed.toLowerCase());
    if (trimmed && !alreadyExists) {
      if ((this.selectedCategoryId == "m_domain" || this.selectedCategoryId == "m_search_all") && (trimmed.startsWith("www") || trimmed.includes("http"))) {
        trimmed = this.helperService.extractDomain(trimmed);
      }
      this.categories[this.selectedCategoryId] = [...this.selectedCategoryTags, trimmed];
      this.updateService();
    }
    this.newValue = '';
    this.filteredSuggestions = [];
    this.showSuggestions = false;
    if (this.checkDomain) {

      this.checkDomain.emit(undefined);
    }
  }

  getTags(key: string): string[] {
    const value = getOwnProperty(this.app_service.getConfig().localSettings.entityfilterCategories, key);
    return value ?? [];
  }

  removeTag(event: MouseEvent, categoryId: string, tag: string): void {
    event.stopPropagation();
    event.preventDefault();
    const value = getOwnProperty(this.app_service.getConfig().localSettings.entityfilterCategories, categoryId);
    if (Array.isArray(value)) {
      setOwnProperty(this.app_service.getConfig().localSettings.entityfilterCategories, categoryId, value.filter(t => t !== tag));
    }
    else if (value === tag) {
      Reflect.deleteProperty(this.app_service.getConfig().localSettings.entityfilterCategories, categoryId);
    }
    this.app_service.set('entityfilterCategories', this.app_service.getConfig().localSettings.entityfilterCategories);

    this.searchFiltersChange.emit(undefined);
  }

  clearSelection() {
    Object.keys(this.categories).forEach(key => setOwnProperty(this.categories, key, []));
    this.updateService();
  }

  private updateService() {
    this.app_service.set('entityfilterCategories', this.categories);
  }

  onEntityFilterToggle(newValue: boolean): void {
    this.app_service.set('entityFilterCondition', newValue);
  }

  hasAnyTags(): boolean {
    return Object.values(this.categories).some(tags => tags.length > 0);
  }

  onCategoryClick(categoryId: string): void {
    this.selectedCategoryId = categoryId;
  }

  initCategories(query: string): void {
    const queryLower = query.toLowerCase();
    const isDefaultSelection = !this.selectedCategoryId;
    if (queryLower === '') {
      const allKeys = Object.keys(this.categories);
      const sortedKeys = allKeys
        .filter(k => k !== 'm_search_all')
        .sort((a, b) => this.getTags(b).length - this.getTags(a).length);
      if (isDefaultSelection) {
        this.selectedCategoryId = 'm_search_all';
      }
      const finalSortedKeys = ['m_search_all', ...sortedKeys.filter(k => k !== this.selectedCategoryId)];
      if (this.selectedCategoryId !== 'm_search_all') {
        finalSortedKeys.splice(1, 0, this.selectedCategoryId);
      }
      this.filteredCategories = finalSortedKeys.map(key => ({
        id: key,
        name: key === 'm_search_all' ? 'Search All' : (getOwnProperty(search_filter_labels, key) || key),
        tags: this.getTags(key).map(val => ({
          id: `${key}-${val}`,
          value: val,
          type: key
        }))
      }));
    }
    else {
      const matchedKeys = Object.keys(this.categories).filter(categoryKey => (getOwnProperty(search_filter_labels, categoryKey) || categoryKey).toLowerCase().includes(queryLower));
      const rest = matchedKeys.filter(k => k !== 'm_search_all' && k !== this.selectedCategoryId);
      const sortedRest = rest.sort((a, b) => this.getTags(b).length - this.getTags(a).length);
      if (isDefaultSelection) {
        this.selectedCategoryId = matchedKeys.includes('m_search_all') ? 'm_search_all' : matchedKeys[0] || '';
      }
      const finalSortedKeys = ['Search All', ...sortedRest];
      if (this.selectedCategoryId && this.selectedCategoryId !== 'm_search_all') {
        finalSortedKeys.splice(1, 0, this.selectedCategoryId);
      }
      this.filteredCategories = finalSortedKeys.map(key => ({
        id: key,
        name: getOwnProperty(search_filter_labels, key) || key,
        tags: this.getTags(key).map(val => ({
          id: `${key}-${val}`,
          value: val,
          type: key
        }))
      }));
    }
  }

  onFilterInputChange(): void {
    const input = this.newValue.trim().toLowerCase();
    const list = this.suggestionsMap[this.selectedCategoryId] || [];
    if (input.length > 0 && list.length > 0) {
      this.filteredSuggestions = list.filter(item => item.toLowerCase().startsWith(input));
      this.showSuggestions = this.filteredSuggestions.length > 0;
    }
    else {
      this.filteredSuggestions = [];
      this.showSuggestions = false;
    }
  }

  onSuggestionClick(event: MouseEvent, value: string): void {
    this.newValue = value;
    this.addTag();
    event.stopPropagation();
    event.preventDefault();
  }

  toTestId(value: string): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
