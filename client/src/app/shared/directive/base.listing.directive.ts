import { Directive, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, take } from 'rxjs';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { ScrollService } from '../services/scroll.service';
import { FilterModel } from '../model/filter/filter.model';
import type { BaseListResponse, ListService } from './model/base.listing.model';
import { getOwnProperty, setOwnProperty } from '../utils/type-guards.util';

export type { BaseListResponse, ListService } from './model/base.listing.model';



@Directive()
export abstract class BaseListingComponent<T extends BaseListResponse> implements OnInit {
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  protected dashboard = inject(DashboardService);
  protected scrollService = inject(ScrollService);
  protected destroyRef = inject(DestroyRef);

  selectedFilters: Record<string, string | null> = {};
  totalPages = 0;
  searchQuery = '';
  isLoading = signal(false);

  abstract filterModel: FilterModel;

  protected abstract data$: Observable<T | null>;

  protected abstract service: ListService;

  abstract isFilterOpen$: Observable<boolean>;

  abstract openSidebar(): void;

  abstract closeSidebar(): void;

  ngOnInit(): void {
    this.data$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      if (data) {
        this.totalPages = Math.ceil(data.total_count / 100);
        this.isLoading.set(false);
      }
    });
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      this.initializeFilters(params);
      const page = parseInt(params.page, 10) || 1;
      this.service.setCurrentPage(page);
      const mergedFilters = { ...this.dashboard.selectedFilters(), ...this.selectedFilters };
      this.selectedFilters = mergedFilters;
      this.isLoading.set(true);
      this.service.reload({ ...mergedFilters, q: this.searchQuery || null, page });
    });
  }

  private initializeFilters(params: Params): void {
    const baseFilters = this.filterModel.filters;
    const initialSelected: Record<string, string> = {};
    Object.keys(baseFilters).forEach(key => {
      const value = getOwnProperty(params, key);
      if (value && getOwnProperty(baseFilters, key).options.includes(value)) {
        getOwnProperty(baseFilters, key).selected = value;
        setOwnProperty(initialSelected, key, value);
      }
    });
    this.selectedFilters = initialSelected;
    this.searchQuery = params.q ?? '';
  }

  onPageChange(page: number): void {
    this.isLoading.set(true);
    this.service.setCurrentPage(page);
    const queryParams = { ...this.selectedFilters, q: this.searchQuery || null, page };
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
    this.service.reload(queryParams);
  }

  applyFilters(filters: Record<string, string | null>): void {
    this.selectedFilters = filters;
    this.scrollService.clearSavedPosition();
    this.scrollService.scrollReportToTop();
    this.reload();
  }

  onSearchSubmit(): void {
    this.scrollService.clearSavedPosition();
    this.scrollService.scrollReportToTop();
    this.reload();
  }

  resetFilters(): void {
    this.selectedFilters = {};
    Object.keys(this.filterModel.filters).forEach(key => delete getOwnProperty(this.filterModel.filters, key).selected);
    const currentUrl = this.router.url.split('?')[0];
    this.router.navigateByUrl(currentUrl, { replaceUrl: true }).then(() => {
      this.reload();
    });
  }

  protected reload(): void {
    this.isLoading.set(true);
    const queryParams = { ...this.selectedFilters, q: this.searchQuery || null, page: 1 };
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
    this.service.reload(queryParams);
  }
}
