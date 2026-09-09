import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FiltersComponent } from '../../shared/partials/filters/filters.component';
import { DirectoryListComponent } from './directory-list/directory-list.component';
import { PaginationComponent } from '../../shared/partials/pagination/pagination.component';
import { AsyncPipe, NgClass, NgOptimizedImage } from '@angular/common';
import { FilterModel, FilterOption } from '../../shared/model/filter/filter.model';
import { directory_filters } from '../../shared/constants/filters';
import { SidebarService } from '../../shared/services/sidebar.service';
import { DirectoryService } from './services/directory.service';
import { DirectoryCallbackModel } from './model/directory.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { getOwnProperty, setOwnProperty } from '../../shared/utils/type-guards.util';


@Component({
  selector: 'app-directory',
  templateUrl: './directory.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FiltersComponent,
    DirectoryListComponent,
    PaginationComponent,
    NgOptimizedImage,
    AsyncPipe,
    NgClass, TranslatePipe],
})
export class DirectoryComponent implements OnInit {
  directoryData$: Observable<DirectoryCallbackModel | null>;
  isFilterOpen$: Observable<boolean>;
  filterModel: FilterModel = directory_filters;
  selectedFilters: Record<string, string | null> = {};
  totalPages = 0;
  isLoaded = false;

  constructor(private router: Router, private route: ActivatedRoute, private sidebarService: SidebarService, private directoryService: DirectoryService) {
    this.isFilterOpen$ = this.sidebarService.sidebarState$;
    this.directoryData$ = this.directoryService.directoryData$;
    this.directoryData$.subscribe(data => {
      if (data) {
        this.totalPages = Math.ceil(data.total_count / 100);
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const baseFilters = this.filterModel.filters;
      const newFilters: Record<string, FilterOption> = {};
      const initialSelectedFilters: Record<string, string> = {};
      for (const key of Object.keys(baseFilters)) {
        const base = getOwnProperty(baseFilters, key);
        const paramValue = getOwnProperty(params, key);
        const match = base.options?.find((opt) => opt.key.toLowerCase() === paramValue?.toLowerCase());
        if (paramValue && match) {
          setOwnProperty(newFilters, key, {
            ...base,
            selected: match.key
          });
          setOwnProperty(initialSelectedFilters, key, match.key);
        }
        else {
          setOwnProperty(newFilters, key, { ...base });
        }
      }
      this.filterModel = {
        ...this.filterModel,
        filters: newFilters
      };
      this.selectedFilters = initialSelectedFilters;
      const currentPage = parseInt(params.page, 10) || 1;
      this.directoryService.setCurrentPage(currentPage);
      if (!this.isLoaded) {
        this.reloadDirectory();
      }
      this.isLoaded = true;
    });
  }

  openSidebar() {
    this.sidebarService.openSidebar();
  }

  closeSidebar() {
    this.sidebarService.closeSidebar();
  }

  applyFilters(filters: Record<string, string | null>) {
    this.selectedFilters = filters;
    this.updateQueryParams();
    this.reloadDirectory();
  }

  resetFilters() {
    this.selectedFilters = {};
    Object.keys(this.filterModel.filters).forEach(key => {
      const filter = getOwnProperty(this.filterModel.filters, key);
      if (filter) {
        delete filter.selected;
      }
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: ''
    }).then(() => {
      this.reloadDirectory();
    });
  }

  onPageChange(currentPage: number) {
    this.directoryService.setCurrentPage(currentPage);
    const filteredParams = this.getFilteredParams();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...filteredParams,
        page: currentPage
      },
      queryParamsHandling: 'merge'
    }).then(() => {
      const container = document.getElementById('dashboard-container');
      if (container) {
        container.scrollTo({ top: 0, left: 0 });
      }
      else {
        window.scrollTo({ top: 0, left: 0 });
      }
      this.directoryService.reloadDirectoryData({ ...filteredParams, page: currentPage });
    });
  }

  private updateQueryParams(): void {
    const filteredParams = this.getFilteredParams();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filteredParams,
      queryParamsHandling: 'merge'
    }).then();
  }

  private reloadDirectory(): void {
    const filteredParams = this.getFilteredParams();
    this.directoryService.reloadDirectoryData({
      ...filteredParams,
      page: this.directoryService.getCurrentPage()
    });
  }

  private getFilteredParams(): Record<string, string> {
    return Object.fromEntries(Object.entries(this.selectedFilters).filter(([, value]) => value !== null && value !== '')) as Record<string, string>;
  }
}
