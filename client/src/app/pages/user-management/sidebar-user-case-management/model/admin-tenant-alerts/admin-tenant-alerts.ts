import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LicenseService } from '../../../../../services/licenses/licenses.service';
import { SidebarHomepageService } from '../../../../../services/dashboard/sidebar.service';
import { ApiService } from '../../../../../shared/services/api.service';
import { ALERT_CATEGORY_NAMES, AlertCategorySummary, createAlertCategorySummary } from '../../../../../shared/partials/alert-notification/model/alert.notification.model';
import { AlertModel, AlertSummary } from '../../../../../shared/model/company-profile/node.model';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../../shared/services/translation.service';
import { ExportChoiceModalComponent } from '../../../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { buildStandardExportOptions } from '../../../../../shared/model/report/export-choice.model';
import { AlertExportService } from '../../../../../shared/partials/alert-notification/services/alert-export.service';
import { MessageNotificationService } from '../../../../../services/message_notification/message-notification.service';
import { UiDropdownComponent, UiDropdownOption } from '../../../../../shared/partials/ui-dropdown/ui-dropdown.component';
import { AdminTenantAlertGroup, AdminTenantAlertsPage, AdminTenantAlertsResponse } from './admin-tenant-alerts.model';
import { getOwnProperty } from '../../../../../shared/utils/type-guards.util';


const ALL_TENANTS_OPTION = 'all';

@Component({
  selector: 'app-admin-tenant-alerts',
  imports: [CommonModule, ExportChoiceModalComponent, TranslatePipe, UiDropdownComponent],
  host: { class: 'block mb-[100px]' },
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './admin-tenant-alerts.html'
})
export class AdminTenantAlerts implements OnInit {
  tenantAlertGroups: AdminTenantAlertGroup[] = [];
  selectedTenantIds: string[] = [ALL_TENANTS_OPTION];
  isLoading = false;
  isExportChoiceOpen = false;
  isExportingTenantAlerts = false;
  selectedExportGroup: AdminTenantAlertGroup | null = null;
  readonly tenantAlertExportOptions = buildStandardExportOptions('case-admin-alert-tenant-export-option', 'report', 'Download all alerts for this tenant.');

  constructor(private apiService: ApiService, private sidebarHomepageService: SidebarHomepageService, private licenseService: LicenseService, private router: Router, private alertExportService: AlertExportService, private messageNotificationService: MessageNotificationService, private translationService: TranslationService) { }

  ngOnInit(): void {
    if (this.licenseService.canViewTenantAlerts()) {
      this.loadTenantAlerts();
    }
  }

  loadTenantAlerts(): void {
    if (!this.licenseService.canViewTenantAlerts()) {
      this.tenantAlertGroups = [];
      return;
    }

    this.isLoading = true;
    this.apiService.get<AdminTenantAlertsResponse[]>('tenants/alerts/summary')
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          this.tenantAlertGroups = (response || []).map(item => ({
            tenant: item.tenant,
            alertSummary: item.alert_summary,
            totalAlerts: this.countTotalAlerts(item.alert_summary),
            categories: this.convertSummaryToCategories(item.alert_summary),
            riskCounts: this.countRiskFromSummary(item.alert_summary)
          }));
          this.selectedTenantIds = this.normalizeSelectedTenantIds(this.selectedTenantIds);
        },
        error: () => {
          this.tenantAlertGroups = [];
          this.selectedTenantIds = [ALL_TENANTS_OPTION];
        }
      });
  }

  get tenantDropdownOptions(): UiDropdownOption[] {
    this.translationService.version();
    return [
      { key: ALL_TENANTS_OPTION, label: this.translationService.translate('All') },
      ...this.tenantAlertGroups
        .flatMap(group => {
          const id = group.tenant.id;
          return id ? [{ key: id, label: group.tenant.name ?? group.tenant.email ?? id }] : [];
        })
    ];
  }

  get visibleTenantAlertGroups(): AdminTenantAlertGroup[] {
    if (!this.selectedTenantIds.length || this.selectedTenantIds.includes(ALL_TENANTS_OPTION)) {
      return this.tenantAlertGroups;
    }

    const selectedIds = new Set(this.selectedTenantIds);
    return this.tenantAlertGroups.filter(group => !!group.tenant.id && selectedIds.has(group.tenant.id));
  }

  onTenantSelectionChange(values: string[]): void {
    this.selectedTenantIds = this.normalizeSelectedTenantIds(values, this.selectedTenantIds);
  }

  openTenantCategoryAlerts(group: AdminTenantAlertGroup, categoryName: string): void {
    const category = group.categories.find(item => item.categoryName === categoryName);
    if (!category || category.iocCount === 0 || !group.tenant.id) {
      return;
    }
    this.router.navigate(['/dashboard/profile/case-management/admin-alerts', group.tenant.id, categoryName]).then();
  }

  getCategoryLabel(categoryName: string): string {
    if (!categoryName) {
      return '-';
    }
    return categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
  }

  getRiskLevel(type: string): string {
    return this.sidebarHomepageService.getRiskLevel(type);
  }

  isCategoryClickable(category: AlertCategorySummary): boolean {
    return category.iocCount > 0;
  }

  openTenantAlertsDownload(group: AdminTenantAlertGroup): void {
    if (group.totalAlerts === 0 || !group.tenant.id || this.isExportingTenantAlerts) {
      return;
    }
    this.selectedExportGroup = group;
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    if (this.isExportingTenantAlerts) {
      return;
    }
    this.isExportChoiceOpen = false;
    this.selectedExportGroup = null;
  }

  exportSelectedTenantAlerts(type: string): void {
    const group = this.selectedExportGroup;
    if (!group?.tenant.id || this.isExportingTenantAlerts) {
      return;
    }

    this.isExportingTenantAlerts = true;
    this.fetchTenantAlertsPage(group.tenant.id, 1, [], (alerts) => {
      this.alertExportService.exportByType(alerts, type, `${group.tenant.name || 'Tenant'} Alerts`);
      this.isExportingTenantAlerts = false;
      this.isExportChoiceOpen = false;
      this.selectedExportGroup = null;
    });
  }

  isExportingGroup(group: AdminTenantAlertGroup): boolean {
    return this.isExportingTenantAlerts && this.selectedExportGroup?.tenant.id === group.tenant.id;
  }

  private convertSummaryToCategories(summary?: AlertSummary): AlertCategorySummary[] {
    const countsByType = summary?.counts_by_type ?? {};
    return ALERT_CATEGORY_NAMES.map(category => createAlertCategorySummary(category, getOwnProperty(countsByType, category) || 0, this.getRiskLevel.bind(this)));
  }

  private countRiskFromSummary(summary?: AlertSummary): { critical: number; high: number; medium: number; low: number } {
    return {
      critical: Number(summary?.counts_by_risk?.critical ?? 0),
      high: Number(summary?.counts_by_risk?.high ?? 0),
      medium: Number(summary?.counts_by_risk?.medium ?? 0),
      low: Number(summary?.counts_by_risk?.low ?? 0)
    };
  }

  private countTotalAlerts(summary?: AlertSummary): number {
    return Object.values(summary?.counts_by_type ?? {}).reduce((total, count) => total + Number(count || 0), 0);
  }

  private normalizeSelectedTenantIds(values: string[], previousValues: string[] = this.selectedTenantIds): string[] {
    const availableTenantIds = new Set(this.tenantAlertGroups.map(group => group.tenant.id).filter((id): id is string => !!id));
    const selectedIds = values.filter(value => value !== ALL_TENANTS_OPTION && availableTenantIds.has(value));

    if (!values.length || !selectedIds.length) {
      return [ALL_TENANTS_OPTION];
    }

    if (values.includes(ALL_TENANTS_OPTION)) {
      return previousValues.includes(ALL_TENANTS_OPTION) ? selectedIds : [ALL_TENANTS_OPTION];
    }

    return selectedIds;
  }

  private fetchTenantAlertsPage(tenantId: string, page: number, accumulated: AlertModel[], done: (alerts: AlertModel[]) => void): void {
    const endpoint = `tenants/${encodeURIComponent(tenantId)}/alerts?paginate=true&page=${page}&limit=20`;
    this.apiService.get<AdminTenantAlertsPage>(endpoint).subscribe({
      next: (response) => {
        const nextAlerts = [...accumulated, ...(response?.items || [])];
        if (response?.has_more) {
          this.fetchTenantAlertsPage(tenantId, page + 1, nextAlerts, done);
          return;
        }
        done(nextAlerts);
      },
      error: (err) => {
        this.isExportingTenantAlerts = false;
        this.messageNotificationService.show(err?.error?.detail ?? this.translationService.translate('Failed to download tenant alerts'));
      }
    });
  }

}
