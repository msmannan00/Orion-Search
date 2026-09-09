import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { AppService } from '../../../../services/core/app/app.service';
import { SidebarHomepageService } from '../../../../services/dashboard/sidebar.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { MessageNotificationService } from '../../../../services/message_notification/message-notification.service';
import { alert_filters } from '../../../../shared/constants/filters';
import { search_filter_labels } from '../../../../shared/constants/shared-enums';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { AlertAllIoc, AlertModel } from '../../../../shared/model/company-profile/node.model';
import { FilterModel } from '../../../../shared/model/filter/filter.model';
import { buildStandardExportOptions } from '../../../../shared/model/report/export-choice.model';
import { CategoryAlerts } from '../../../../shared/partials/alert-notification/model/alert.notification.model';
import { AlertExportService } from '../../../../shared/partials/alert-notification/services/alert-export.service';
import { ConfirmationPopupComponent } from "../../../../shared/partials/confirmation-popup/confirmation-popup.component";
import { EmptyResultComponent } from '../../../../shared/partials/empty-result/empty-result.component';
import { ExportChoiceModalComponent } from '../../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { FiltersComponent } from "../../../../shared/partials/filters/filters.component";
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ApiService } from '../../../../shared/services/api.service';
import { HelperService } from '../../../../shared/services/helper.service';
import { SidebarService } from '../../../../shared/services/sidebar.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import { getOwnProperty, isUnknownRecord } from '../../../../shared/utils/type-guards.util';
import { AddCustomAlertComponent } from "../add-custom-alert/add-custom-alert.component";
import { CategoryAlertDetailDrawerComponent } from './alert-detail-drawer/category-alert-detail-drawer.component';
import type { AlertPageResponse, StixBundle, StixReportObject } from './model/category-alert-report.model';
export type { AlertPageResponse,StixBundle,StixExternalReference,StixReportObject } from './model/category-alert-report.model';










@Component({
  selector: 'app-category-alert-report',
  imports: [CommonModule, FormsModule, AddCustomAlertComponent, FiltersComponent, ConfirmationPopupComponent, TooltipDirective, EmptyResultComponent, ExportChoiceModalComponent, TranslatePipe, CategoryAlertDetailDrawerComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './category-alert-report.component.html',
})
export class CategoryAlertReportComponent implements OnInit {
  private appendTimer: ReturnType<typeof setTimeout> | null = null;
  private alertLookupById = new Map<string, AlertModel>();

  filterModel: FilterModel = structuredClone(alert_filters);
  alerts: CategoryAlerts[] = []
  filteredAlerts: CategoryAlerts[] = []
  visibleFilteredAlerts: CategoryAlerts[] = [];
  readonly serverPageSize: number = 20;
  readonly incrementalDelayMs: number = 90;
  currentPage = 0;
  hasMoreAlerts = false;
  isLoadingMoreAlerts = false;
  isInitialLoading = false;
  activeDateRange: string | null = null;
  activeAlertFilters: Record<string, string | null> = {};
  searchText = '';
  category = '';
  iocTypes: Record<string, string> = { ...search_filter_labels };
  showCustomAlertPopup = false;
  showEditAlertPopup = false;
  isFilterOpen$: Observable<boolean>;
  selectedAlert!: AlertModel;
  isFlushAllConfirmationOpen = signal(false);
  isDeleteAlertConfirmationOpen = signal(false);
  selectedDeleteAlertId = '';
  importedAlert: AlertModel | null = null;
  alertToShowReport: AlertModel | null = null;
  activeDetailAlert: CategoryAlerts | null = null;
  alertExportScope: 'selected' | 'category' = 'selected';
  isExportChoiceOpen = false;
  isAdminTenantAlertReport = false;
  adminTenantId: string | null = null;
  readonly alertExportOptions = buildStandardExportOptions('category-alert-export-option', 'report', 'Generate PDF export for selected alert.');

  constructor( private router: Router, private route: ActivatedRoute, public appService: AppService, public sidebarService: SidebarService, private apiService: ApiService, private messageNotificationService: MessageNotificationService, protected licenseService: LicenseService, private helperService: HelperService, private alertExportService: AlertExportService, private sidebarHomepageService: SidebarHomepageService, private translationService: TranslationService ) {
    this.isFilterOpen$ = this.sidebarService.sidebarState$;
  }

  private decrementUnseenSummary(by = 1): void {
    const summary = this.appService.userSessionData().alert_summary;
    if (!summary) {
      return;
    }
    this.appService.userSessionData().alert_summary = {
      ...summary,
      unseen_total: Math.max(0, Number(summary.unseen_total || 0) - by)
    };
  }

  isLightTheme(): boolean {
    return document.body.classList.contains('light-theme');
  }

  applySearch(value: string): void {
    this.searchText = value;
    this.applyCurrentFilters();
  }

  ngOnInit(): void {
    this.isAdminTenantAlertReport = this.route.snapshot.data.adminTenantAlerts === true;
    this.route.url.pipe(map(segments => {
      if (segments && segments.length > 0) {
        return segments[segments.length - 1].path;
      }
      return '';
    })).subscribe(lastSegment => {
      this.adminTenantId = this.route.snapshot.paramMap.get('tenantId') ?? this.route.snapshot.queryParamMap.get('tenantId');
      this.category = this.route.snapshot.paramMap.get('type') ?? lastSegment;
      this.getLatestAlerts();
    });
  }

  private clearAppendTimer(): void {
    if (this.appendTimer) {
      clearTimeout(this.appendTimer);
      this.appendTimer = null;
    }
  }

  private appendVisibleAlertsIncrementally(items: CategoryAlerts[], reset: boolean): void {
    this.clearAppendTimer();
    this.visibleFilteredAlerts = reset ? [] : [...this.visibleFilteredAlerts];

    if (items.length === 0) {
      this.isLoadingMoreAlerts = false;
      return;
    }

    let index = 0;
    const appendNext = () => {
      if (index >= items.length) {
        this.isLoadingMoreAlerts = false;
        this.appendTimer = null;
        return;
      }

      this.visibleFilteredAlerts = [...this.visibleFilteredAlerts, getOwnProperty(items, index)];
      index += 1;
      this.appendTimer = setTimeout(appendNext, this.incrementalDelayMs);
    };

    appendNext();
  }

  private loadAlertsPage(reset: boolean): void {
    if (!this.category || this.isLoadingMoreAlerts) {
      return;
    }

    const nextPage = reset ? 1 : this.currentPage + 1;
    this.isLoadingMoreAlerts = true;
    if (reset) {
      this.isInitialLoading = true;
    }
    const endpoint = this.getAlertsEndpoint(nextPage);
    if (!endpoint) {
      this.isLoadingMoreAlerts = false;
      this.isInitialLoading = false;
      return;
    }

    this.apiService.get<AlertPageResponse>(endpoint).subscribe({
      next: response => {
        const rawItems: AlertModel[] = response?.items ?? [];
        for (const item of rawItems) {
          if (item?.alert_id) {
            this.alertLookupById.set(item.alert_id, item);
          }
        }
        const convertedItems = this.convertAlertsList(rawItems, this.category);

        this.currentPage = response?.page ?? nextPage;
        this.hasMoreAlerts = !!response?.has_more;
        this.alerts = reset ? convertedItems : [...this.alerts, ...convertedItems];
        this.refreshAlertFilterOptions();
        this.isInitialLoading = false;

        if (Boolean(this.activeDateRange) || Boolean(this.searchText.trim())) {
          this.applyCurrentFilters();
          this.isLoadingMoreAlerts = false;
          return;
        }

        this.filteredAlerts = [...this.alerts];
        this.appendVisibleAlertsIncrementally(convertedItems, reset);
      },
      error: () => {
        this.isLoadingMoreAlerts = false;
        this.isInitialLoading = false;
      }
    });
  }

  canLoadMoreAlerts(): boolean {
    return this.hasMoreAlerts;
  }

  loadMoreAlerts(): void {
    if (!this.canLoadMoreAlerts()) {
      return;
    }
    this.loadAlertsPage(false);
  }

  private getAlertsEndpoint(page: number): string | null {
    if (this.isAdminTenantAlertReport) {
      if (!this.adminTenantId) {
        return null;
      }
      return `tenants/${encodeURIComponent(this.adminTenantId)}/alerts?paginate=true&page=${page}&limit=${this.serverPageSize}&alert_type=${encodeURIComponent(this.category)}`;
    }

    return `profile/alerts?paginate=true&page=${page}&limit=${this.serverPageSize}&alert_type=${encodeURIComponent(this.category)}`;
  }

  flushAll() {
    this.isFlushAllConfirmationOpen.set(true);
  }

  flushAllConfirmation(value: boolean) {
    this.isFlushAllConfirmationOpen.set(false);
    if (value) {
      this.apiService.post(`profile/alerts/delete/${this.category}`, null).subscribe({
        next: () => {
          this.getLatestAlerts();
          void this.router.navigate(["/dashboard"], {});
        },
        error: (err) => {
          this.messageNotificationService.show(err?.error?.detail ?? this.translationService.translate('Failed to delete'))
        },
      });
    }
  }

  showAlertPopup(action: string, id: string) {
    switch (action) {
      case 'edit': {
        const alert = this.alertLookupById.get(id);
        if (alert) {
          this.selectedAlert = alert;
          this.showEditAlertPopup = true;
        }
        break;
      }

      case 'add':
        this.showCustomAlertPopup = true;
        break;

      default:
        break;
    }
  }

  exportAlert(hash: string) {
    let apiUrl = '';
    switch (this.category) {
      case 'breach':
        apiUrl = hash ? `search/breach/stix/${hash}` : `search/breach`;
        break;
      case 'strategic':
        apiUrl = hash ? `search/strategic/stix/${hash}` : `search/strategic`;
        break;
      case 'defacement':
        apiUrl = hash ? `search/defacement/stix/${hash}` : `search/defacement`;
        break;
      case 'exploit':
        apiUrl = hash ? `search/exploit/stix/${hash}` : `search/exploit`;
        break;
      case 'social':
        apiUrl = hash ? `search/social/stix/${hash}` : `search/social`;
        break;
      case 'feed':
        apiUrl = hash ? `search/news/stix/${hash}` : `search/news`;
        break;
      default:
        this.router.navigate(['/']).then();
    }


    this.apiService.get<unknown>(apiUrl).subscribe({
      next: (response) => {
        if (response) {
          this.helperService.downloadstixJson(response);
        }
      }
    });


  }

  canExportstix() {
    const allowedCategories = [
      'breach',
      'strategic',
      'general',
      'defacement',
      'exploit',
      'social',
      'feed'
    ];
    return allowedCategories.includes(this.category);
  }

  canExportCategoryAlerts(): boolean {
    return this.alerts.length > 0 && (this.canExportstix() || this.licenseService.isMaintainer());
  }

  cancleAlertPopup(refresh: boolean) {
    if (refresh) {
      this.getLatestAlerts();
    }
    this.showCustomAlertPopup = false;
    this.showEditAlertPopup = false;
  }

  deleteAlertConfirmation(id: string) {
    this.selectedDeleteAlertId = id;
    this.isDeleteAlertConfirmationOpen.set(true);
  }

  deleteCustomAlert(confirmed: boolean, id: string) {
    this.isDeleteAlertConfirmationOpen.set(false);
    this.selectedDeleteAlertId = '';

    if (!confirmed || !id) {
      return;
    }

    this.apiService.post('alert/delete', id).subscribe({
      next: () => {
        this.messageNotificationService.show(this.translationService.translate('Alert deleted successfully!'), 'success');
        this.getLatestAlerts();
      },
      error: (err) => {
        const mess = err?.error?.detail ?? this.translationService.translate('Failed to delete alert');
        this.messageNotificationService.show(mess)
      },
    });
  }

  getLatestAlerts() {
    this.currentPage = 0;
    this.hasMoreAlerts = false;
    this.isInitialLoading = true;
    this.alertLookupById.clear();
    this.alerts = [];
    this.filteredAlerts = [];
    this.visibleFilteredAlerts = [];
    this.refreshAlertFilterOptions();
    this.loadAlertsPage(true);
  }

  seeDetailReprot(alertId: string) {
    this.alertToShowReport = this.alertLookupById.get(alertId) ?? null;

    if (!this.alertToShowReport) {
      return;
    }
    if (this.alertToShowReport) {
      if (this.isAdminTenantAlertReport) {
        this.openExportChoice();
        return;
      }
      this.alertToShowReport.report_seen = true;
      this.apiService.post('alert/seen', [this.alertToShowReport]).subscribe({
        next: () => {
          this.decrementUnseenSummary(1);
        }
      });
      this.openExportChoice('selected');
    }
  }

  openExportChoice(scope: 'selected' | 'category' = 'selected'): void {
    this.alertExportScope = scope;
    this.isExportChoiceOpen = true;
  }

  openCategoryExportChoice(): void {
    if (!this.canExportCategoryAlerts()) {
      return;
    }
    this.alertToShowReport = null;
    this.openExportChoice('category');
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  exportSelectedAlert(type: string): void {
    if (this.alertExportScope === 'category') {
      this.exportCategoryAlerts(type);
      return;
    }
    if (!this.alertToShowReport) {
      this.closeExportChoice();
      return;
    }
    this.alertExportService.exportByType([this.alertToShowReport], type, 'Brand Alerts');
    this.closeExportChoice();
  }

  private exportCategoryAlerts(type: string): void {
    const endpoint = this.getCategoryExportEndpoint();
    if (!endpoint) {
      this.closeExportChoice();
      return;
    }
    this.apiService.get<AlertModel[] | AlertPageResponse>(endpoint).subscribe({
      next: response => {
        const alerts: AlertModel[] = Array.isArray(response)
          ? response
          : (Array.isArray(response?.items) ? response.items : []);
        if (!alerts.length) {
          this.messageNotificationService.show(this.translationService.translate('No alerts available to export right now.'));
          this.closeExportChoice();
          return;
        }
        this.alertExportService.exportByType(alerts, type, 'Brand Alerts');
        this.closeExportChoice();
      },
      error: () => {
        this.closeExportChoice();
      }
    });
  }

  private getCategoryExportEndpoint(): string | null {
    const alertType = this.category ? `?alert_type=${encodeURIComponent(this.category)}` : '';
    if (this.isAdminTenantAlertReport) {
      if (!this.adminTenantId) {
        return null;
      }
      return `tenants/${encodeURIComponent(this.adminTenantId)}/alerts${alertType}`;
    }

    return `profile/alerts${alertType}`;
  }

  seeDetails(id: string, hash: string) {
    this.licenseService.loadLicenses().subscribe(licenses => {
      const hasEnterprise = licenses.includes('enterprise');

      if (hasEnterprise) {

        const _alert = this.alertLookupById.get(id);
        if (_alert?.type) {
          const value = _alert.ioc_value ?? '-';
          let scanType: string;
          let route: string;

          switch (_alert.type.toLowerCase()) {
            case "advance scanning":
              scanType = "advance";
              route = "/dashboard/scanner/network-scan";
              void this.router.navigate([route], {
                queryParams: { page: 1, domain: encodeURIComponent(value), canType: scanType }
              });
              break;

            case "seo scanning":
              scanType = "seo";
              route = "/dashboard/scanner/network-scan";
              void this.router.navigate([route], {
                queryParams: { page: 1, q: value, scanType, section: 'seo-scan' }
              });
              break;

            case "repo scanning":
              scanType = "repo";
              route = "/dashboard/scanner/network-scan";
              void this.router.navigate([route], {
                queryParams: { page: 1, q: value, scanType, section: 'repository-scan' }
              });
              break;

            case "email-breach": {
              const _username = value.split('@')[0];
              route = "/dashboard/api/email-breach";
              void this.router.navigate([route], {
                queryParams: { username: _username, email: value }
              });
              break;
            }
            case "playstore-scanning":
              route = "/dashboard/api/playstore-scanner";
              void this.router.navigate([route], {
                queryParams: { playstore: value }
              });
              break;
            case "social-scanner":
              route = "/dashboard/api/social-scanner";
              void this.router.navigate([route], {
                queryParams: { username: value }
              });
              break;
            case "stealerlogs": {
              route = "/dashboard/stealerlogs";
              const queryParams: Record<string, string | number | boolean> = {
                q: "",
                page: 1,
                category: "credential",
                fullsearch: true,
                matchtype: "or",
                must: false
              };
              if (this.isDomain(value)) {
                queryParams.domain = value;
              }
              else {
                queryParams.user = value;
              }
              void this.router.navigate([route], { queryParams });
              break;
            }
            default:
              void this.router.navigate([`/dashboard/${this.category}/all/${hash}`]);
              break;
          }


        }
        if (_alert && !this.isAdminTenantAlertReport) {
          _alert.report_seen = true;
          this.apiService.post('alert/seen', [_alert]).subscribe({
            next: () => {
              this.decrementUnseenSummary(1);
            }
          });
        }
      }
      else {
        this.messageNotificationService.show(this.translationService.translate('Please purchase enterprise license to view reports'))
      }
    });

  }

  convertAlertsList(alerts: AlertModel[], targetType: string): CategoryAlerts[] {
    if (!alerts || alerts.length === 0) {
      return [];
    }
    const filteredAlerts = alerts.filter(alert => alert.type === targetType);
    return filteredAlerts.map(alert => this.convertToCategoryAlert(alert));
  }

  convertToCategoryAlert(alert: AlertModel): CategoryAlerts {
    const entity = alert.ioc_value ?? 'N/A';
    const resultDate = this.extractAlertResultDate(alert.all_ioc ?? []);
    const password = this.extractAlertPassword(alert);
    const category = alert.type ?? 'unknown';

    return {
      id: alert.alert_id ?? '',
      seen: alert.report_seen ?? false,
      custom: alert.custom_alert ?? false,
      risk: this.getRiskLevel(category, alert.risk),
      category,
      title: alert.title ?? 'No Title',
      description: alert.description ?? 'No description provided.',
      hash: alert.data_hash ?? 'NO_HASH',
      source: alert.source ?? 'N/A',
      url: alert.url ?? 'N/A',
      entity: entity,
      contentTypes: alert.content_types ?? [],
      rawFindings: alert.raw_findings ?? {},

      allIOC: alert.all_ioc ?? [],
      detectedOn: alert.first_seen ?? new Date(),
      resultDate,
      password,
    };
  }

  private extractAlertPassword(alert: AlertModel): string {
    const fromIoc = this.getFirstAlertIocValue(alert.all_ioc ?? [], ['password', 'm_password']);
    if (fromIoc) {
      return fromIoc;
    }
    if ((alert.type ?? '').toLowerCase() === 'stealerlogs') {
      return this.cleanAlertValue(alert.description ?? '');
    }
    return '';
  }

  private extractAlertResultDate(allIOC: AlertAllIoc[]): Date | null {
    const rawDate = this.getFirstAlertIocValue(allIOC, [
      'm_date',
      'date',
      'timestamp',
      'created_at',
      'm_creation_date',
      'm_published_date',
      'm_first_seen'
    ]);
    if (!rawDate) {
      return null;
    }
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getFirstAlertIocValue(allIOC: AlertAllIoc[], keys: string[]): string {
    const wanted = new Set(keys.map(key => key.toLowerCase()));
    const match = (allIOC || []).find(ioc => wanted.has(String(ioc?.name || '').toLowerCase()));
    const value = match?.values?.find(item => this.cleanAlertValue(item));
    return this.cleanAlertValue(value ?? '');
  }

  private cleanAlertValue(value: unknown): string {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return ['-', 'n/a', 'none', 'null', 'undefined'].includes(text.toLowerCase()) ? '' : text;
  }

  getRiskLevel(type: string, risk?: string): string {
    return this.sidebarHomepageService.getRiskLevel(type, risk);
  }

  getRiskIcon(risk: string): string {
    switch ((risk || '').toLowerCase()) {
      case 'critical':
        return 'bi-exclamation-octagon-fill';
      case 'high':
        return 'bi-exclamation-triangle-fill';
      case 'medium':
        return 'bi-exclamation-circle-fill';
      case 'low':
        return 'bi-info-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }

  getRiskIconColorClass(risk: string): string {
    switch ((risk || '').toLowerCase()) {
      case 'critical':
        return '[&_i]:text-[#ef4444] [body.light-theme_&]:[&_i]:text-red-700';
      case 'high':
        return '[&_i]:text-[#f97316] [body.light-theme_&]:[&_i]:text-orange-700';
      case 'medium':
        return '[&_i]:text-[#f59e0b] [body.light-theme_&]:[&_i]:text-amber-700';
      case 'low':
        return '[&_i]:text-[#60a5fa] [body.light-theme_&]:[&_i]:text-sky-700';
      default:
        return '[body.light-theme_&]:[&_i]:text-sky-700';
    }
  }

  getRiskLabelClass(risk: string): string {
    switch ((risk || '').toLowerCase()) {
      case 'critical':
        return 'border border-[var(--color-border)] bg-[rgb(255_76_76/10%)] text-[#ff4c4c] [body.light-theme_&]:border-[#f3b6bb] [body.light-theme_&]:bg-[#feecec] [body.light-theme_&]:text-[#dc2626]';
      case 'high':
        return 'border border-[var(--color-border)] bg-[rgb(255_179_71/10%)] text-[#ffb347] [body.light-theme_&]:border-[#efcd98] [body.light-theme_&]:bg-[#fff5e8] [body.light-theme_&]:text-[#c66a08]';
      case 'medium':
        return 'border border-[var(--color-border)] bg-[rgb(255_217_102/10%)] text-[#ffd966] [body.light-theme_&]:border-[#e8d694] [body.light-theme_&]:bg-[#fffbe6] [body.light-theme_&]:text-[#a16207]';
      case 'low':
        return 'border border-[var(--color-border)] bg-[rgb(108_207_126/10%)] text-[#6ccf7e] [body.light-theme_&]:border-[#b7dec0] [body.light-theme_&]:bg-[#e8f8ec] [body.light-theme_&]:text-[#166534]';
      default:
        return '';
    }
  }

  getAlertCardDate(alert: CategoryAlerts): Date {
    return alert.resultDate ?? alert.detectedOn;
  }

  getFilteredIocs(allIOC: AlertAllIoc[]): { label: string, count: number }[] {
    if (!allIOC || allIOC.length === 0) {
      return [];
    }

    const mergedIocMap = new Map<string, AlertAllIoc>();

    for (const ioc of allIOC) {
      const existingIoc = mergedIocMap.get(ioc.name);

      if (existingIoc) {
        if (ioc.values.length > existingIoc.values.length) {
          mergedIocMap.set(ioc.name, ioc);
        }
      }
      else {
        mergedIocMap.set(ioc.name, ioc);
      }
    }
    return Array.from(mergedIocMap.values())
      .filter(ioc => Object.prototype.hasOwnProperty.call(this.iocTypes, ioc.name))
      .map(ioc => ({
        label: this.iocTypes[ioc.name],
        count: ioc.values.length
      }))
      .filter(ioc => !!ioc.label && ioc.count > 0);
  }

  countUniqueSources(alerts: CategoryAlerts[]): number {
    const uniqueSources = new Set<string>();
    for (const alert of alerts) {
      if (alert.source) {
        uniqueSources.add(alert.source);
      }
    }
    return uniqueSources.size;
  }

  getLatestDetectedDate(alerts: CategoryAlerts[]): string {
    const validDates = alerts
      .map(alert => alert.detectedOn instanceof Date
        ? alert.detectedOn
        : new Date(alert.detectedOn))
      .filter(date => !isNaN(date.getTime()));

    if (validDates.length === 0) {
      return '-';
    }

    const latestDate = validDates.reduce((latest, current) =>
      current.getTime() > latest.getTime() ? current : latest);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${dayNames[latestDate.getDay()]}, ${latestDate.getDate()} ${monthNames[latestDate.getMonth()]} ${latestDate.getFullYear()}`;
  }

  getTotalUniqueIocValueCount(alerts: CategoryAlerts[]): number {
    if (!alerts || alerts.length === 0) {
      return 0;
    }
    const totalUniqueValues = new Set<string>();

    for (const alert of alerts) {
      const allIOC: AlertAllIoc[] = alert.allIOC || [];

      if (allIOC.length === 0) {
        continue;
      }
      const mergedIocMap = new Map<string, AlertAllIoc>();

      for (const ioc of allIOC) {
        const existingIoc = mergedIocMap.get(ioc.name);

        if (existingIoc && ioc.values.length > existingIoc.values.length) {
          mergedIocMap.set(ioc.name, ioc);
        }
        else if (!existingIoc) {
          mergedIocMap.set(ioc.name, ioc);
        }
      }
      Array.from(mergedIocMap.values())
        .filter(ioc => Object.prototype.hasOwnProperty.call(this.iocTypes, ioc.name))
        .forEach(ioc => {
          ioc.values.forEach(value => {
            if (value) {
              totalUniqueValues.add(value);
            }
          });
        });
    }

    return totalUniqueValues.size;
  }

  getNewAlertCount(): number {
    return this.filteredAlerts.filter(alert => !alert.seen).length;
  }

  applyFilter(filters: Record<string, string | null>) {
    this.activeAlertFilters = { ...filters };
    const range = filters.daterange;
    this.activeDateRange = range ?? null;
    this.applyCurrentFilters();
  }

  private applyCurrentFilters(): void {
    this.clearAppendTimer();
    if (!this.isInitialLoading) {
      this.isLoadingMoreAlerts = false;
    }
    let result = [...this.alerts];

    if (this.activeDateRange) {
      const [startStr, endStr] = this.activeDateRange.split(',');
      const startDate = new Date(startStr);
      const inclusiveEnd = new Date(endStr);
      inclusiveEnd.setHours(23, 59, 59, 999);
      result = result.filter(alert => {
        const lastSeenDate = new Date(alert.detectedOn);
        return lastSeenDate >= startDate && lastSeenDate <= inclusiveEnd;
      });
    }

    const contentTypeFilter = this.normalizeFilterValue(this.activeAlertFilters.content_type);
    if (contentTypeFilter && contentTypeFilter !== 'all') {
      result = result.filter(alert => (alert.contentTypes || []).some(value =>
        this.normalizeFilterValue(value).includes(contentTypeFilter)));
    }

    const riskFilter = this.normalizeFilterValue(this.activeAlertFilters.risk);
    if (riskFilter && riskFilter !== 'all') {
      result = result.filter(alert => this.normalizeFilterValue(alert.risk) === riskFilter);
    }

    const query = this.searchText.trim().toLowerCase();
    if (query) {
      result = result.filter(alert => this.getAlertSearchText(alert).includes(query));
    }

    this.filteredAlerts = result;
    this.visibleFilteredAlerts = [...result];
  }

  private normalizeFilterValue(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private refreshAlertFilterOptions(): void {
    const suggestionEndpoint = this.getAlertFilterOptionsEndpoint();
    const suggestionParams: Record<string, string> | undefined = this.category
      ? { alert_type: this.category }
      : undefined;
    this.filterModel = {
      ...this.filterModel,
      filters: {
        ...this.filterModel.filters,
        content_type: {
          ...this.filterModel.filters.content_type,
          options: this.toDropdownOptions(this.collectContentTypes()),
          suggestionEndpoint,
          suggestionParams
        },
      }
    };
  }

  private getAlertFilterOptionsEndpoint(): string | undefined {
    if (this.isAdminTenantAlertReport) {
      return this.adminTenantId
        ? `tenants/${encodeURIComponent(this.adminTenantId)}/alerts/filter-options`
        : undefined;
    }
    return 'profile/alerts/filter-options';
  }

  private collectContentTypes(): string[] {
    return this.alerts.flatMap(alert => alert.contentTypes || []);
  }

  private toDropdownOptions(values: unknown[]): { key: string; label: string }[] {
    const uniqueValues = Array.from(new Set(values
      .map(value => String(value ?? '').trim())
      .filter(value => value && !['-', 'n/a', 'none', 'null', 'undefined'].includes(value.toLowerCase())))).sort((left, right) => left.localeCompare(right));

    return uniqueValues.map(value => ({ key: value, label: value }));
  }

  private getAlertSearchText(alert: CategoryAlerts): string {
    const iocText = (alert.allIOC || [])
      .flatMap(ioc => [ioc.name, this.iocTypes[ioc.name], ...(ioc.values || [])])
      .join(' ');
    return [
      alert.title,
      alert.description,
      alert.entity,
      alert.source,
      alert.category,
      alert.risk,
      alert.url,
      iocText
    ].join(' ').toLowerCase();
  }

  isDomain(value: string): boolean {
    if (!value) {
      return false;
    }

    value = value.replace(/https?:\/\//, "").replace(/^www\./, "");

    const labels = value.split('.');

    return labels.length > 1 && /^[a-zA-Z0-9-]+$/.test(labels[0]) && labels.slice(1).every(label => /^[a-zA-Z]{2,}$/.test(label));
  }

  onFileUpload(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const jsonData = JSON.parse(reader.result as string);

        if (Array.isArray(jsonData)) {
          this.messageNotificationService.show(this.translationService.translate('Only one STIX bundle is allowed per upload'));
          return;
        }

        this.importedAlert = this.validateAlert(jsonData);
        this.importedAlert.licenses = this.licenseService.getAlertLicenses(this.category || this.importedAlert.type);

        this.apiService.post('alert/add', this.importedAlert).subscribe({
          next: () => {
            this.getLatestAlerts();
            this.messageNotificationService.show(this.translationService.translate('Alert imported successfully!'), 'success');
          },
          error: (err) => {
            const mess = err?.error?.detail ?? this.translationService.translate('Failed to add alert');
            this.messageNotificationService.show(mess);
          },
        });

      }
      catch (error: unknown) {
        this.messageNotificationService.show(error instanceof Error ? error.message : this.translationService.translate('Invalid JSON file'));
      }
    };

    reader.readAsText(file);
  }

  validateAlert(data: unknown): AlertModel {
    if (!isUnknownRecord(data)) {
      throw new Error('Invalid JSON structure');
    }

    const bundle = data as StixBundle;

    if (bundle.type !== 'bundle' || !Array.isArray(bundle.objects)) {
      throw new Error('Uploaded file must be a STIX 2.1 bundle');
    }

    const report = bundle.objects.find((o: StixReportObject) => o.type === 'report');

    if (!report) {
      throw new Error('STIX bundle must contain a report object');
    }

    const requiredReportFields = ['id', 'name', 'created', 'modified'];
    for (const field of requiredReportFields) {
      if (!getOwnProperty(report, field)) {
        throw new Error(`Report missing required field: ${field}`);
      }
    }

    const created = report.created;
    const modified = report.modified;
    if (!created || !modified) {
      throw new Error('Report timestamps are required');
    }
    const firstSeen = new Date(created);
    const lastSeen = new Date(modified);

    if (isNaN(firstSeen.getTime()) || isNaN(lastSeen.getTime())) {
      throw new Error('Invalid report timestamps');
    }

    return {
      type: report.type ?? 'report',

      data_hash: '',
      ioc_type: 'stix-bundle',
      ioc_value: report.name,

      first_seen: firstSeen,
      last_seen: lastSeen,

      status: 'active',

      title: report.name ?? '',
      description: report.description ?? '',

      url:
        report.external_references?.find((r) => r.url)?.url ?? '',

      source:
        report.external_references?.[0]?.source_name ?? 'import',

      all_ioc: bundle.objects as unknown as AlertAllIoc[],
      content_types: report.labels ?? [],
    };
  }

}
