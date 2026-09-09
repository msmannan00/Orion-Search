import { Component, effect, OnDestroy, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppService } from '../../../services/core/app/app.service';
import { Router } from '@angular/router';
import { HomeSearchComponent } from "../../homepage/home-search/home-search.component";
import { ALERT_CATEGORY_NAMES, AlertCategorySummary, createAlertCategorySummary } from '../../../shared/partials/alert-notification/model/alert.notification.model';
import { AlertModel } from '../../../shared/model/company-profile/node.model';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { ApiService } from '../../../shared/services/api.service';
import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { ConfirmationPopupComponent } from "../../../shared/partials/confirmation-popup/confirmation-popup.component";
import { AlertScanLoadingComponent } from "./alert-scan-loading/alert-scan-loading.component";
import { AlertService } from './services/alerts.service';
import { AuthService } from '../../../services/authetication/auth.service';
import { HomepageComponent } from "../../homepage/homepage.component";
import { LicenseService } from '../../../services/licenses/licenses.service';
import { MessagePopupComponent } from "../../../shared/partials/message-popup/message-popup.component";
import { countFilterValues } from '../../../shared/utils/filter-values.util';
import { Subscription } from 'rxjs';
import { ExportChoiceModalComponent } from '../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { buildStandardExportOptions } from '../../../shared/model/report/export-choice.model';
import { AlertExportService } from '../../../shared/partials/alert-notification/services/alert-export.service';
import { SidebarHomepageService } from '../../../services/dashboard/sidebar.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';

@Component({
  selector: 'app-sidebar-user-homepage',
  imports: [CommonModule, FormsModule, HomeSearchComponent, TooltipDirective, ConfirmationPopupComponent, AlertScanLoadingComponent, HomepageComponent, NgOptimizedImage, MessagePopupComponent, ExportChoiceModalComponent, TranslatePipe],
  templateUrl: './sidebar-user-homepage.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SidebarUserHomepageComponent implements OnInit, OnDestroy {
  private scanStatusSub?: Subscription;

  hoveredHomeTool: 'print' | 'flush' | 'settings' | 'scan' | null = null;
  alertCategories: AlertCategorySummary[] = [];
  criticalRisks = 0;
  highRisks = 0;
  mediumRisks = 0;
  lowRisks = 0;
  isConfirmationOpen = signal(false);
  noIocPopup = signal(false);
  showAlertScanLoading = signal(false);
  isExportChoiceOpen = false;
  readonly iocPermissionWarning = "You don't have permission to manage IOCs outside your domain. Ask your network administrator.";
  readonly alertLicenseWarning = "You don't have license to view this";
  readonly alertExportOptions = buildStandardExportOptions('home-alert-export-option', 'report', 'Generate PDF export for alerts.');

  constructor(public appService: AppService, protected alertService: AlertService, public router: Router, private apiService: ApiService, private messageNotificationService: MessageNotificationService, protected authService: AuthService, protected licenseService: LicenseService, private alertExportService: AlertExportService, private sidebarHomepageService: SidebarHomepageService, private translationService: TranslationService) {
    effect(() => {
      if (!this.alertService.isAlertScanLoading()) {
        this.initializeData();
      }
    });
    effect(() => {
      const isLoading = this.alertService.isAlertScanLoading();
      if (!isLoading) {
        this.showAlertScanLoading.set(false);
        return;
      }
      this.showAlertScanLoading.set(true);
    });
  }

  ngOnInit(): void {
    if (this.authService.getIsMobileDemo() && this.router.url.startsWith('/dashboard/profile/homepage')) {
      const queryParams = this.router.parseUrl(this.router.url).queryParams;
      this.router.navigate(['/dashboard/strategic/all'], { queryParams: { ...queryParams, page: 1 }, replaceUrl: true }).then();
      return;
    }
    if (this.isMember() && !this.licenseService.getLicenses().includes('free')) {
      this.checkScanProgress();
      this.initializeData();
    }
  }

  initializeData() {
    const summary = this.appService.userSessionData().alert_summary;
    const categories = this.convertCountsToCategories(summary?.counts_by_type ?? {});
    queueMicrotask(() => {
      this.alertCategories = categories;
      this.countRiskFromSummary(summary?.counts_by_risk);
    });
  }

  checkScanProgress() {
    const stream = this.alertService.autoCheckScanStatus();
    if (!stream) {
      return;
    }
    this.scanStatusSub?.unsubscribe();
    this.scanStatusSub = stream.subscribe(res => {
      this.alertService.isAlertScanLoading.set(!!res.scan_running);
    });
  }

  isAdmin(): boolean {
    return this.licenseService.isAdmin();
  }

  isAnalyst(): boolean {
    return this.licenseService.isAnalyst();
  }

  isDemo(): boolean {
    return this.licenseService.isDemo();
  }

  isMember(): boolean {
    return this.licenseService.isMember();
  }

  convertCountsToCategories(countsByType: Record<string, number>): AlertCategorySummary[] {
    const summaries: AlertCategorySummary[] = Object.entries(countsByType).map(([category, count]) => {
      return createAlertCategorySummary(category, count, this.getRiskLevel.bind(this));
    });
    for (const cat of ALERT_CATEGORY_NAMES) {
      if (!summaries.find(s => s.categoryName === cat)) {
        summaries.push(createAlertCategorySummary(cat, 0, this.getRiskLevel.bind(this)));
      }
    }
    return summaries;
  }

  countRiskFromSummary(riskCounts?: { critical?: number; high?: number; medium?: number; low?: number }) {
    this.criticalRisks = Number(riskCounts?.critical ?? 0);
    this.highRisks = Number(riskCounts?.high ?? 0);
    this.mediumRisks = Number(riskCounts?.medium ?? 0);
    this.lowRisks = Number(riskCounts?.low ?? 0);
  }

  hasReports(): boolean {
    return (this.lowRisks + this.mediumRisks + this.highRisks + this.criticalRisks) > 0;
  }

  getRiskLevel(type: string): string {
    return this.sidebarHomepageService.getRiskLevel(type);
  }

  entityFiltersCount(): number {
    const categories = this.appService.tenantData().iocs;
    return countFilterValues(categories);
  }

  isPrivilegedIoc(): boolean {
    const tenantPrivileged = this.appService.tenantData().privileged_ioc;
    return tenantPrivileged === undefined
      ? this.appService.userSessionData().tenant.privilegedIoc !== true
      : !tenantPrivileged;
  }

  editIocs() {
    this.router.navigate(['/dashboard/profile/ioc']).then();
  }

  openAlertScannerSettings() {
    this.router.navigate(['/dashboard/profile/alert-scanners']).then();
  }

  openAlerts(type: string) {
    const cat = this.alertCategories.find(c => c.categoryName === type);
    if (!cat) {
      return;
    }
    if (!this.licenseService.canViewAlert(type)) {
      this.messageNotificationService.show(this.translationService.translate(this.alertLicenseWarning));
      return;
    }
    this.router.navigate([`/dashboard/profile/alerts/${type}`]).then();
  }

  scanIOCs() {
    if (this.isPrivilegedIoc()) {
      this.messageNotificationService.show(this.translationService.translate(this.iocPermissionWarning));
      return;
    }
    const iocs = this.appService.tenantData().iocs;
    if (!iocs || iocs.length === 0) {
      this.noIocPopup.set(true);
      return;
    }
    this.startManualLoadingDisplay();
    this.alertService.scanIOCs();
  }

  clossNoIocPopup() {
    this.noIocPopup.set(false);
  }

  flushAll() {
    this.isConfirmationOpen.set(true);
  }

  flushAllConfirmation(value: boolean) {
    this.isConfirmationOpen.set(false);
    if (value) {
      this.startManualLoadingDisplay();
      this.alertService.isAlertScanLoading.set(true);
      this.apiService.post('profile/alerts/delete/all', null).subscribe({
        next: () => {
          queueMicrotask(() => {
            this.appService.userSessionData().alerts = [];
            this.appService.userSessionData().alert_summary = {
              unseen_total: 0,
              counts_by_type: {},
              counts_by_risk: { critical: 0, high: 0, medium: 0, low: 0 }
            };
            this.initializeData();
            this.alertService.isAlertScanLoading.set(false);
          });
        },
        error: (err) => {
          this.alertService.isAlertScanLoading.set(false);
          this.messageNotificationService.show(err?.error?.detail ?? this.translationService.translate('Failed to delete'));
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.scanStatusSub?.unsubscribe();
  }

  private startManualLoadingDisplay(): void {
    this.showAlertScanLoading.set(true);
  }

  isLightTheme(): boolean {
    return document.body.classList.contains('light-theme');
  }

  setHomeToolHover(tool: 'print' | 'flush' | 'settings' | 'scan' | null): void {
    this.hoveredHomeTool = tool;
  }

  openExportChoice(): void {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  exportAlerts(type: string): void {
    this.apiService.get<AlertModel[] | { items?: AlertModel[] }>('profile/alerts').subscribe({
      next: (alerts) => {
        const normalizedAlerts: AlertModel[] = Array.isArray(alerts)
          ? alerts
          : (Array.isArray(alerts?.items) ? alerts.items : []);
        if (!normalizedAlerts.length) {
          this.messageNotificationService.show(this.translationService.translate('No alerts available to export right now.'));
          this.closeExportChoice();
          return;
        }
        this.alertExportService.exportByType(normalizedAlerts, type, 'Brand Alerts');
        this.closeExportChoice();
      },
      error: () => {
        this.closeExportChoice();
      }
    });
  }
}
