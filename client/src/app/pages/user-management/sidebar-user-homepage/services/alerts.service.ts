import { Injectable, OnDestroy, signal } from '@angular/core';
import { EMPTY, catchError, finalize, switchMap, takeWhile, tap, timer } from 'rxjs';
import { ApiService } from '../../../../shared/services/api.service';
import { AppService } from '../../../../services/core/app/app.service';
import { Subscription } from 'rxjs';
import { AlertSummary } from '../../../../shared/model/company-profile/node.model';
import type { AlertScanStatus } from './model/alerts.model';
export type { AlertScanStatus } from './model/alerts.model';



@Injectable({
  providedIn: 'root'
})
export class AlertService implements OnDestroy {
  private readonly pendingScanStorageKey = 'orion_alert_scan_pending';
  private isCheckingStatus = false;
  private hasAutoCheckedOnce = false;
  private scanStartSub?: Subscription;
  private scanStatusSub?: Subscription;

  isAlertScanLoading = signal<boolean>(false);

  constructor(protected apiService: ApiService, private appService: AppService) {
    this.isAlertScanLoading.set(this.getPendingScanFlag());
  }

  scanIOCs() {
    this.isAlertScanLoading.set(true);
    this.setPendingScanFlag(true);
    this.scanStartSub?.unsubscribe();
    this.scanStatusSub?.unsubscribe();
    this.isCheckingStatus = false;
    this.scanStartSub = this.apiService.post<AlertScanStatus>('profile/alert/scan', null).subscribe({
      next: () => {
        const stream = this.autoCheckScanStatus();
        if (!stream) {
          return;
        }
        this.scanStatusSub = stream.subscribe({
          next: (res) => {
            if (!res?.scan_running) {
              this.getLatestAlerts();
            }
          },
          error: () => {
            this.isAlertScanLoading.set(false);
            this.setPendingScanFlag(false);
          }
        });
      },
      error: () => {
        this.isAlertScanLoading.set(false);
        this.setPendingScanFlag(false);
      },
    });
  }

  cancelScanIOCs() {
    this.isAlertScanLoading.set(false);
    this.setPendingScanFlag(false);
    this.scanStatusSub?.unsubscribe();
    this.isCheckingStatus = false;
    this.apiService.post<unknown>('profile/alert/scan/cancel', null).subscribe({
      next: () => {
        this.isAlertScanLoading.set(false);
        this.setPendingScanFlag(false);
      },
      error: () => {
        this.isAlertScanLoading.set(false);
        this.setPendingScanFlag(false);
      },
    });
  }

  getLatestAlerts() {
    this.apiService.get<AlertSummary>('get/tenant/alert/summary').subscribe({
      next: response => {
        this.appService.userSessionData.update(data => ({
          ...data,
          alert_summary: response
        }));
        this.isAlertScanLoading.set(false);
        this.setPendingScanFlag(false);
      },
      error: err => {
        if (err.status === 202) {
          this.isAlertScanLoading.set(true);
          this.setPendingScanFlag(true);
        }
        else {
          this.isAlertScanLoading.set(false);
          this.setPendingScanFlag(false);
        }
      }
    });
  }

  getScanStatus() {
    return this.apiService.post<AlertScanStatus>('profile/alert/scan/status', {}).pipe(tap(res => {
      this.isAlertScanLoading.set(!!res?.scan_running);
      this.setPendingScanFlag(!!res?.scan_running);
      if (this.hasAutoCheckedOnce && res?.scan_running === false) {
        this.getLatestAlerts();
      }
      this.hasAutoCheckedOnce = true;
    }));
  }

  autoCheckScanStatus(intervalMs = 10000) {
    if (this.isCheckingStatus) {
      return;
    }
    this.isCheckingStatus = true;
    return timer(0, intervalMs).pipe(switchMap(() => this.getScanStatus()),
      takeWhile((res) => res?.scan_running === true, true),
      tap((res) => {
        if (!res?.scan_running) {
          this.isAlertScanLoading.set(false);
          this.setPendingScanFlag(false);
        }
      }),
      catchError(() => {
        this.isAlertScanLoading.set(false);
        this.setPendingScanFlag(false);
        return EMPTY;
      }),
      finalize(() => {
        this.isCheckingStatus = false;
      }));
  }

  private getPendingScanFlag(): boolean {
    return localStorage.getItem(this.pendingScanStorageKey) === '1';
  }

  private setPendingScanFlag(value: boolean): void {
    if (value) {
      localStorage.setItem(this.pendingScanStorageKey, '1');
      return;
    }
    localStorage.removeItem(this.pendingScanStorageKey);
  }

  ngOnDestroy(): void {
    this.scanStartSub?.unsubscribe();
    this.scanStatusSub?.unsubscribe();
    this.isCheckingStatus = false;
  }
}
