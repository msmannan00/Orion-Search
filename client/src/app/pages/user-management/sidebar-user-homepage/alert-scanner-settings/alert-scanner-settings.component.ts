import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

import { AppService } from '../../../../services/core/app/app.service';
import { MessageNotificationService } from '../../../../services/message_notification/message-notification.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { ALERT_CATEGORY_NAMES } from '../../../../shared/partials/alert-notification/model/alert.notification.model';
import { TenantModel } from '../../../../shared/model/tenant/tenant.model';
import { ApiService } from '../../../../shared/services/api.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';

@Component({
  selector: 'app-alert-scanner-settings',
  imports: [CommonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './alert-scanner-settings.component.html',
})
export class AlertScannerSettingsComponent implements OnInit {
  private readonly scannerKeys = new Set(ALERT_CATEGORY_NAMES.map(category => this.normalize(category)));
  private tenantData?: TenantModel;

  readonly scannerCategories = ALERT_CATEGORY_NAMES;
  allowedScannerKeys = new Set<string>(ALERT_CATEGORY_NAMES.map(category => this.normalize(category)));
  isReady = signal(false);
  isSaving = signal(false);

  constructor(public appService: AppService, private apiService: ApiService, private router: Router, private messageNotificationService: MessageNotificationService, protected licenseService: LicenseService, private translationService: TranslationService) { }

  ngOnInit(): void {
    this.applyTenantData(this.appService.tenantData());
    this.apiService.post<TenantModel>('get/tenant', {}).subscribe({
      next: (tenantData) => {
        this.appService.tenantData.set(tenantData);
        this.applyTenantData(tenantData);
        this.isReady.set(true);
      }
    });
  }

  backToHome(): void {
    this.router.navigate(['/dashboard/profile/homepage']).then();
  }

  displayName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  scannerLabel(category: string): string {
    return `Scanner key: ${category}`;
  }

  isEnabled(category: string): boolean {
    return this.allowedScannerKeys.has(this.normalize(category));
  }

  toggleScanner(category: string): void {
    if (!this.isReady() || this.isSaving() || !this.licenseService.isMaintainer()) {
      return;
    }

    const previous = new Set(this.allowedScannerKeys);
    const key = this.normalize(category);
    if (this.allowedScannerKeys.has(key)) {
      this.allowedScannerKeys.delete(key);
    }
    else {
      this.allowedScannerKeys.add(key);
    }

    this.saveAllowedScanners(previous);
  }

  private applyTenantData(tenantData: TenantModel): void {
    this.tenantData = tenantData;
    const allowed = tenantData?.allowed_alert_categories;
    const source = Array.isArray(allowed) ? allowed : [...this.scannerCategories];
    this.allowedScannerKeys = new Set(source.map(category => this.normalize(category)).filter(category => this.scannerKeys.has(category)));
  }

  private saveAllowedScanners(previous: Set<string>): void {
    const allowed = this.scannerCategories.filter(category => this.allowedScannerKeys.has(this.normalize(category)));
    const payload = this.buildTenantPayload(allowed);
    this.setAllowedScannersLocal(allowed);
    this.isSaving.set(true);
    this.apiService.post('update/tenants', payload).subscribe({
      next: () => {
        this.isSaving.set(false);
      },
      error: (err) => {
        this.allowedScannerKeys = previous;
        this.setAllowedScannersLocal(this.scannerCategories.filter(category => previous.has(this.normalize(category))));
        this.isSaving.set(false);
        this.messageNotificationService.show(err?.error?.detail ?? this.translationService.translate('Failed to update alert scanners'));
      }
    });
  }

  private buildTenantPayload(allowed: readonly string[]): TenantModel {
    const tenant = this.tenantData ?? this.appService.tenantData();
    return {
      name: tenant.name || '',
      phone: tenant.phone ?? '',
      country: tenant.country ?? '',
      city: tenant.city ?? '',
      postal_code: tenant.postal_code ?? '',
      allowed_alert_categories: [...allowed],
    } as TenantModel;
  }

  private setAllowedScannersLocal(allowed: string[]): void {
    this.appService.tenantData.set({
      ...this.appService.tenantData(),
      allowed_alert_categories: allowed
    });
    this.appService.userSessionData.update(state => ({
      ...state,
      tenant: {
        ...state.tenant,
        allowedAlertCategories: allowed
      }
    }));
  }

  private normalize(category: string): string {
    return (category || '').trim().toLowerCase();
  }
}
