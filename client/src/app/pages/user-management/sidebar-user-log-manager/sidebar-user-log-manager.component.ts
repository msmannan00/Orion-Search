import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { ConfirmationPopupComponent } from '../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { DatePickerComponent } from '../../../shared/partials/filters/date-picker/date-picker.component';
import { SystemLogResponse } from './model/system-log.models';
import { UiDropdownComponent, UiDropdownOption } from '../../../shared/partials/ui-dropdown/ui-dropdown.component';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-sidebar-user-log-manager',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ConfirmationPopupComponent, DatePickerComponent, UiDropdownComponent],
  templateUrl: './sidebar-user-log-manager.component.html',
  styleUrls: ['./sidebar-user-log-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SidebarUserLogManagerComponent implements OnInit {
  logType = '';
  logDateRange = '';
  logDateFilters: Record<string, string | null> = { daterange: null };
  page = 1;
  limit = 100;
  loading = false;
  errorMessage = '';
  isFlushAllConfirmationOpen = false;
  response: SystemLogResponse = { entries: [], total: 0, page: 1, limit: 100, page_count: 0, available_dates: [], files: [] };

  constructor(private apiService: ApiService, private licenseService: LicenseService, private router: Router, private translationService: TranslationService) {
  }

  get typeOptions(): UiDropdownOption[] {
    this.translationService.version();
    return [{ key: '', label: this.translationService.translate('All') }, { key: 'INFO', label: 'INFO' }, { key: 'SUCCESS', label: 'SUCCESS' }, { key: 'WARNING', label: 'WARNING' }, { key: 'ERROR', label: 'ERROR' }, { key: 'CRITICAL', label: 'CRITICAL' }];
  }

  ngOnInit(): void {
    if (!this.licenseService.isAdmin()) {
      this.router.navigate(['/dashboard/profile/account']).then();
      return;
    }
    this.loadLogs();
  }

  loadLogs(): void {
    let params = new HttpParams().set('page', this.page).set('limit', this.limit).set('_ts', String(Date.now()));
    if (this.logType) {
      params = params.set('log_type', this.logType);
    }
    if (this.logDateRange) {
      params = params.set('date_range', this.logDateRange);
    }

    this.loading = true;
    this.errorMessage = '';
    this.apiService.get<SystemLogResponse>('profile/system-logs', { params })
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (response) => {
          this.response = response ?? this.emptyResponse();
        },
        error: (error) => {
          this.errorMessage = error?.error?.detail ?? this.translationService.translate('Failed to load logs');
        }
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadLogs();
  }

  onLogTypeChange(value: string | null): void {
    this.logType = value ?? '';
    this.applyFilters();
  }

  onLogDateRangeChange(event: { key: string; value: string }): void {
    this.logDateRange = event.value;
    this.logDateFilters = { daterange: event.value || null };
    this.applyFilters();
  }

  nextPage(): void {
    if (this.page >= this.response.page_count) {
      return;
    }
    this.page += 1;
    this.loadLogs();
  }

  previousPage(): void {
    if (this.page <= 1) {
      return;
    }
    this.page -= 1;
    this.loadLogs();
  }

  flushLogs(): void {
    this.isFlushAllConfirmationOpen = true;
  }

  confirmFlushLogs(confirmed: boolean): void {
    this.isFlushAllConfirmationOpen = false;
    if (!confirmed) {
      return;
    }
    this.apiService.delete<{ success: boolean; deleted: number }>('profile/system-logs').subscribe({
      next: () => {
        this.logType = '';
        this.logDateRange = '';
        this.logDateFilters = { daterange: null };
        this.page = 1;
        this.response = this.emptyResponse();
      },
      error: (error) => {
        this.errorMessage = error?.error?.detail ?? this.translationService.translate('Failed to flush logs');
      }
    });
  }

  getTypeClass(type: string): string {
    if (type === 'ERROR' || type === 'CRITICAL') {
      return 'border-red-400/30 bg-red-500/10 text-red-300 [body.light-theme_&]:border-red-600/30 [body.light-theme_&]:bg-red-100 [body.light-theme_&]:text-red-800';
    }
    if (type === 'SUCCESS') {
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300 [body.light-theme_&]:border-emerald-600/30 [body.light-theme_&]:bg-emerald-100 [body.light-theme_&]:text-emerald-800';
    }
    if (type === 'WARNING') {
      return 'border-amber-400/30 bg-amber-500/10 text-amber-300 [body.light-theme_&]:border-amber-600/30 [body.light-theme_&]:bg-amber-100 [body.light-theme_&]:text-amber-800';
    }
    return 'border-sky-400/30 bg-sky-500/10 text-sky-300 [body.light-theme_&]:border-sky-600/30 [body.light-theme_&]:bg-sky-100 [body.light-theme_&]:text-sky-800';
  }

  formatBytes(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(unit ? 1 : 0)} ${getOwnProperty(units, unit)}`;
  }

  private emptyResponse(): SystemLogResponse {
    return { entries: [], total: 0, page: 1, limit: this.limit, page_count: 0, available_dates: [], files: [] };
  }
}
