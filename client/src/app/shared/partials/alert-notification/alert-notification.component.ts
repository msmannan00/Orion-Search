import { Component, OnChanges, SimpleChanges, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { AppService } from '../../../services/core/app/app.service';
import { AlertNotification } from './model/alert.notification.model';
import { AlertModel } from '../../model/company-profile/node.model';
import { ApiService } from '../../services/api.service';
import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { overlayAnimation, sidebarAnimation } from '../../animations/sidebar.animations';
import { ExportChoiceModalComponent } from '../export-choice-modal/export-choice-modal.component';
import { ALERT_REPORT_EXPORT_OPTIONS } from '../../model/report/export-choice.model';
import { AlertExportService } from './services/alert-export.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ScanNotificationService } from '../../services/scan-notification.service';
import { ScanJob } from '../../model/scan-jobs/scan-job.model';
import { ConfirmationPopupComponent } from '../confirmation-popup/confirmation-popup.component';
import { Router } from '@angular/router';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { asUnknownRecord } from '../../utils/type-guards.util';
import type { AlertListPage, AlertNotificationPage } from './model/alert-notification.model';
export type { AlertListPage, AlertNotificationPage } from './model/alert-notification.model';


type NotificationMode = 'alerts' | 'scans';
type ScanActionMode = 'single-delete' | 'delete-all' | 'mark-seen-completed';



@Component({
  selector: 'app-alert-notification',
  imports: [CommonModule, NgClass, ExportChoiceModalComponent, ConfirmationPopupComponent, TranslatePipe],
  templateUrl: './alert-notification.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [sidebarAnimation, overlayAnimation],
})
export class AlertNotificationComponent implements OnChanges {
  private appendTimer: ReturnType<typeof setTimeout> | null = null;
  private relativeTimeReferenceMs = Date.now();

  alertNotifications: AlertNotification[] = [];
  readonly batchSize: number = 20;
  readonly incrementalDelayMs: number = 120;
  readonly incrementalChunkSize: number = 1;
  currentPage = 0;
  totalCount = 0;
  hasMore = false;
  countsByType: Record<string, number> = {};
  isLoadingMore = false;
  isLoadMoreTriggered = false;
  isFetchingDetail = false;
  alertToShowReport: AlertModel | null = null;
  isExportChoiceOpen = false;
  isScanDeleteConfirmationOpen = false;
  isScanDeleting = false;
  scanDeleteTarget: ScanJob | null = null;
  scanDeleteMode: ScanActionMode | null = null;
  readonly alertExportOptions = ALERT_REPORT_EXPORT_OPTIONS;
  readonly alertLicenseWarning = "You don't have license to view this";
  readonly isNotificationOpen = input.required<boolean | null>();
  readonly notificationMode = input<NotificationMode>('alerts');
  readonly closeNotification = output<undefined>();

  constructor(public appService: AppService, public apiService: ApiService, private messageNotificationService: MessageNotificationService, private alertExportService: AlertExportService, public scanNotificationService: ScanNotificationService, private router: Router, private licenseService: LicenseService) {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isNotificationOpen) {
      const value = changes.isNotificationOpen.currentValue;
      if (value === true) {
        this.relativeTimeReferenceMs = Date.now();
      }
      if (value === true && this.isAlertMode() && this.alertNotifications.length === 0) {
        this.fetchNotifications(true);
      }
      if (value === true && this.isScanMode()) {
        this.scanNotificationService.openPanel();
      }
      if (value === false && this.isScanMode()) {
        this.scanNotificationService.closePanel();
      }
    }
  }

  isAlertMode(): boolean {
    return this.notificationMode() === 'alerts';
  }

  isScanMode(): boolean {
    return this.notificationMode() === 'scans';
  }

  canLoadMore(): boolean {
    if (this.isScanMode()) {
      return this.scanNotificationService.hasMore();
    }
    return this.hasMore || this.alertNotifications.length < this.totalCount;
  }

  private fetchNotifications(reset: boolean, attempt = 1): void {
    if (this.isLoadingMore) {
      return;
    }

    this.clearAppendTimer();
    const nextPage = reset ? 1 : this.currentPage + 1;
    this.isLoadingMore = true;
    this.apiService.get<AlertNotificationPage>(`profile/alerts?paginate=true&compact=true&unseen_only=true&include_counts=true&page=${nextPage}&limit=${this.batchSize}`).subscribe({
      next: response => {
        const items = (response.items ?? []).map((n: AlertNotification) => ({
          ...n,
          lastSeen: n?.lastSeen ? new Date(n.lastSeen) : n?.lastSeen
        }));
        if (reset && nextPage === 1 && items.length === 0 && attempt < 3) {
          this.isLoadingMore = false;
          this.isLoadMoreTriggered = false;
          setTimeout(() => {
            this.fetchNotifications(true, attempt + 1);
          }, 800);
          return;
        }
        this.totalCount = response?.total ?? 0;
        this.currentPage = response?.page ?? nextPage;
        this.hasMore = !!response?.has_more;
        this.countsByType = response?.counts_by_type ?? {};
        this.isLoadingMore = false;
        this.isLoadMoreTriggered = false;
        this.appendNotificationsIncrementally(items, reset);
      },
      error: () => {
        this.isLoadingMore = false;
        this.isLoadMoreTriggered = false;
      }
    });
  }

  loadMoreNotifications(): void {
    if (!this.canLoadMore()) {
      return;
    }
    if (this.isScanMode()) {
      this.scanNotificationService.loadMore();
      return;
    }
    this.isLoadMoreTriggered = true;
    this.fetchNotifications(false);
  }

  private clearAppendTimer(): void {
    if (this.appendTimer) {
      clearTimeout(this.appendTimer);
      this.appendTimer = null;
    }
  }

  private appendNotificationsIncrementally(items: AlertNotification[], reset: boolean): void {
    this.alertNotifications = reset ? [] : [...this.alertNotifications];

    if (items.length === 0) {
      return;
    }

    let index = 0;
    const appendNext = () => {
      if (index >= items.length) {
        this.appendTimer = null;
        return;
      }

      const nextChunk = items.slice(index, index + this.incrementalChunkSize);
      this.alertNotifications = [...this.alertNotifications, ...nextChunk];
      index += this.incrementalChunkSize;
      this.appendTimer = setTimeout(() => {
        requestAnimationFrame(appendNext);
      }, this.incrementalDelayMs);
    };

    requestAnimationFrame(appendNext);
  }

  timeAgo(date: Date | string | null | undefined): string {
    if (!date) {
      return '';
    }
    const d = new Date(date instanceof Date ? date : `${date}Z`);
    const seconds = Math.floor((this.relativeTimeReferenceMs - d.getTime()) / 1000);
    const formatter = new Intl.RelativeTimeFormat(document.documentElement.lang || 'en', { numeric: 'always' });
    if (seconds < 60) {
      return formatter.format(-seconds, 'second');
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return formatter.format(-minutes, 'minute');
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return formatter.format(-hours, 'hour');
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
      return formatter.format(-days, 'day');
    }
    const months = Math.floor(days / 30);
    if (months < 12) {
      return formatter.format(-months, 'month');
    }
    const years = Math.floor(months / 12);
    return formatter.format(-years, 'year');
  }

  seeDetails(_category: string, hash: string) {
    const notification = this.alertNotifications.find(n => n.hash === hash) ?? { categoryName: _category };
    if (!this.licenseService.canViewAlert(notification)) {
      this.messageNotificationService.show(this.alertLicenseWarning);
      return;
    }
    this.isFetchingDetail = true;
    this.apiService.get<AlertModel[] | AlertListPage>('profile/alerts').subscribe({
      next: response => {
        const alerts: AlertModel[] = Array.isArray(response)
          ? response
          : (Array.isArray(response?.items) ? response.items : []);
        this.appService.userSessionData().alerts = alerts;
        const selectedAlert = alerts.find(a => a.data_hash === hash) ?? null;
        if (!selectedAlert) {
          this.isFetchingDetail = false;
          this.messageNotificationService.show(this.alertLicenseWarning);
          return;
        }
        if (!this.licenseService.canViewAlert(selectedAlert)) {
          this.isFetchingDetail = false;
          this.messageNotificationService.show(this.alertLicenseWarning);
          return;
        }

        this.alertToShowReport = selectedAlert;
        this.alertToShowReport.report_seen = true;
        this.apiService.post('alert/seen', [this.alertToShowReport]).subscribe({
          next: () => {
            this.decrementUnseenSummary(1);
            this.fetchNotifications(true);
            this.isFetchingDetail = false;
            this.openExportChoice();
          },
          error: () => {
            this.isFetchingDetail = false;
          },
        });
      },
      error: () => {
        this.isFetchingDetail = false;
      },
    });
  }

  openExportChoice(): void {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  exportSelectedNotification(type: string): void {
    this.exportSelectedAlert(type);
  }

  exportSelectedAlert(type: string): void {
    if (!this.alertToShowReport) {
      this.closeExportChoice();
      return;
    }
    this.alertExportService.exportByType([this.alertToShowReport], type, 'Brand Alerts');
    this.closeExportChoice();
  }

  openScanReport(job: ScanJob): void {
    if (!this.isScanReportAvailable(job)) {
      return;
    }
    this.scanNotificationService.markSeen(job);
    const reportUrl = this.router.serializeUrl(this.router.createUrlTree(['/dashboard/scan-report', job.scan_id]));
    const absoluteUrl = `${window.location.origin}${reportUrl}`;
    const openedWindow = window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
    if (openedWindow) {
      openedWindow.opener = null;
    }
  }

  requestDeleteScan(job: ScanJob, event?: Event): void {
    event?.stopPropagation();
    if (this.isScanPending(job)) {
      return;
    }
    this.scanDeleteTarget = job;
    this.scanDeleteMode = 'single-delete';
    this.isScanDeleteConfirmationOpen = true;
  }

  stopScan(job: ScanJob, event?: Event): void {
    event?.stopPropagation();
    this.scanNotificationService.deleteScan(job).subscribe({
      error: err => {
        this.messageNotificationService.show(err?.error?.detail ?? 'Failed to stop scan');
      },
    });
  }

  requestClearAllScans(): void {
    if (!this.scanNotificationService.jobs().length) {
      return;
    }
    this.scanDeleteTarget = null;
    this.scanDeleteMode = 'mark-seen-completed';
    this.isScanDeleteConfirmationOpen = true;
  }

  requestDeleteAllScans(): void {
    if (!this.scanNotificationService.jobs().length) {
      return;
    }
    this.scanDeleteTarget = null;
    this.scanDeleteMode = 'delete-all';
    this.isScanDeleteConfirmationOpen = true;
  }

  scanDeleteConfirmationMessage(): string {
    if (this.scanDeleteMode === 'mark-seen-completed') {
      return 'Are you sure you want to mark all notifications as seen?';
    }
    if (this.scanDeleteMode === 'delete-all') {
      return 'Are you sure you want to delete all scan notifications?';
    }
    return 'Are you sure you want to delete this scan notification?';
  }

  handleScanDeleteConfirmation(confirmed: boolean): void {
    if (!confirmed || !this.scanDeleteMode) {
      this.closeScanDeleteConfirmation();
      return;
    }
    if (this.scanDeleteMode === 'single-delete' && this.scanDeleteTarget) {
      this.isScanDeleting = true;
      this.scanNotificationService.deleteScan(this.scanDeleteTarget).subscribe({
        next: () => {
          this.messageNotificationService.show('Scan deleted successfully!', 'success');
          this.closeScanDeleteConfirmation();
        },
        error: err => {
          this.messageNotificationService.show(err?.error?.detail ?? 'Failed to delete scan');
          this.closeScanDeleteConfirmation();
        },
      });
      return;
    }

    this.isScanDeleting = true;
    if (this.scanDeleteMode === 'mark-seen-completed') {
      this.scanNotificationService.markCompletedScansSeen().subscribe({
        next: () => {
          this.messageNotificationService.show('Scans marked as seen!', 'success');
          this.closeScanDeleteConfirmation();
        },
        error: err => {
          this.messageNotificationService.show(err?.error?.detail ?? 'Failed to clear scans');
          this.closeScanDeleteConfirmation();
        },
      });
      return;
    }

    this.scanNotificationService.deleteAllScans().subscribe({
      next: response => {
        const deleted = Number(asUnknownRecord(response).deleted ?? 0);
        if (deleted > 0) {
          this.messageNotificationService.show('Scans deleted successfully!', 'success');
        }
        else {
          this.messageNotificationService.show('No scans to delete');
        }
        this.closeScanDeleteConfirmation();
      },
      error: err => {
        this.messageNotificationService.show(err?.error?.detail ?? 'Failed to delete scans');
        this.closeScanDeleteConfirmation();
      },
    });
  }

  private closeScanDeleteConfirmation(): void {
    this.isScanDeleteConfirmationOpen = false;
    this.isScanDeleting = false;
    this.scanDeleteTarget = null;
    this.scanDeleteMode = null;
  }

  statusLabel(job: ScanJob): string {
    const status = this.scanNotificationService.getStatus(job);
    if (status === 'done') {
      return 'Completed';
    }
    if (status === 'partial') {
      return 'Partial';
    }
    if (status === 'error') {
      return 'Failed';
    }
    if (status === 'queued') {
      return 'Queued';
    }
    if (status === 'running') {
      return 'Running';
    }
    return status || 'Unknown';
  }

  isScanCompleted(job: ScanJob): boolean {
    const status = this.scanNotificationService.getStatus(job);
    return status === 'done';
  }

  isScanPartial(job: ScanJob): boolean {
    return this.scanNotificationService.getStatus(job) === 'partial';
  }

  isScanReportAvailable(job: ScanJob): boolean {
    const status = this.scanNotificationService.getStatus(job);
    return status === 'done' || status === 'partial';
  }

  isScanPending(job: ScanJob): boolean {
    const status = this.scanNotificationService.getStatus(job);
    return status === 'running' || status === 'queued';
  }

  isScanFailed(job: ScanJob): boolean {
    return this.scanNotificationService.getStatus(job) === 'error';
  }

  isNetworkScan(job: ScanJob): boolean {
    const reference = String(job.api_reference ?? '').replace(/^\/?api\//, '');
    return reference.startsWith('netintel/') || reference.startsWith('urlscan/');
  }

  getProgress(job: ScanJob): number {
    return this.scanNotificationService.getProgress(job);
  }

  getScanStep(job: ScanJob): string {
    return this.scanNotificationService.getStep(job);
  }

  close() {
    if (this.isScanMode()) {
      this.scanNotificationService.closePanel();
    }

    this.closeNotification.emit(undefined);
  }

  clearAll() {
    this.apiService.get<AlertModel[] | AlertListPage>('profile/alerts').subscribe({
      next: (alerts) => {
        const allAlerts: AlertModel[] = Array.isArray(alerts)
          ? alerts
          : (Array.isArray(alerts?.items) ? alerts.items : []);
        if (allAlerts.length === 0) {
          this.fetchNotifications(true);
          return;
        }
        allAlerts.forEach(alert => {
          alert.report_seen = true;
        });
        this.apiService.post('alert/seen', allAlerts).subscribe({
          next: () => {
            const summary = this.appService.userSessionData().alert_summary;
            if (summary) {
              this.appService.userSessionData().alert_summary = {
                ...summary,
                unseen_total: 0
              };
            }
            this.getLatestAlerts();
            this.messageNotificationService.show("Clear all alerts successfully!", 'success');
            this.close();
          },
          error: (err) => {
            const mess = err?.error?.detail ?? 'Clear all alerts failed';
            this.messageNotificationService.show(mess);
          },
        });
      }
    });
  }

  getLatestAlerts() {
    this.apiService.get<AlertModel[] | AlertListPage>('profile/alerts').subscribe({
      next: response => {
        this.appService.userSessionData().alerts = Array.isArray(response)
          ? response
          : (Array.isArray(response?.items) ? response.items : []);
        this.fetchNotifications(true);
      }
    });
  }

  isLightTheme(): boolean {
    return document.body.classList.contains('light-theme');
  }
}
