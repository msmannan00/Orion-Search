import { CommonModule } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppService } from '../../../../services/core/app/app.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { search_filter_labels } from '../../../../shared/constants/shared-enums';
import { LicenseName } from '../../../../shared/model/licenses/license.rules';
import { IocCategory, TenantStatus, TenantStatusValues } from '../../../../shared/model/tenant/tenant.model';
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { UiDropdownComponent, UiDropdownOption } from '../../../../shared/partials/ui-dropdown/ui-dropdown.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ApiService } from '../../../../shared/services/api.service';
import { TranslationService } from '../../../../shared/services/translation.service';
import type { ManagedTenant, TenantUpdateResponse } from './model/view-tenant.model';
import { TenantIocDrawerContentComponent } from './tenant-ioc-drawer-content/tenant-ioc-drawer-content.component';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';

export type { ManagedTenant,TenantUpdateResponse } from './model/view-tenant.model';






@Component({
  selector: 'app-view-tenant',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslatePipe, UiDropdownComponent, TenantIocDrawerContentComponent, ConfirmationPopupComponent],
  styleUrls: ['./view-tenant.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './view-tenant.component.html',
})
export class ViewTenantComponent implements OnInit {
  private isIocSelectorClosing = false;

  protected readonly JSON = JSON;

  tenants: ManagedTenant[] = [];
  tenantSearch = '';
  licenseList = Object.values(LicenseName).filter((license) => license !== LicenseName.FEEDER);
  isLoading = true;
  selectedTenantId: string | null = null;
  TenantStatus = TenantStatusValues;
  isIocSelectorOpen = false;
  isIocSelectorDrawerOpen = false;
  activeIocTenant: ManagedTenant | null = null;
  iocDraft: IocCategory[] = [];
  tenantToDelete: ManagedTenant | null = null;

  constructor(public apiService: ApiService, protected licenseService: LicenseService, private appService: AppService, private translationService: TranslationService) {
  }

  get tenantLicenseOptions(): UiDropdownOption[] {
    return this.licenseList
      .filter(license => this.licenseService.getLicenseLabel(license) !== 'maintainer')
      .map(license => ({ key: license, label: this.licenseService.getLicenseLabel(license) }));
  }

  get filteredTenants(): ManagedTenant[] {
    const search = this.tenantSearch.trim().toLowerCase();
    if (!search) {
      return this.tenants;
    }
    return this.tenants.filter((tenant) => [
      tenant.companyName,
      tenant.company,
      tenant.name,
      tenant.email,
      tenant.phone,
      tenant.country,
      tenant.city,
      tenant.status,
      tenant.subscription ? 'paid' : 'free',
      tenant.verified ? 'verified' : 'not verified',
      this.getTenantLicensesLabel(tenant)
    ].some(value => String(value ?? '').toLowerCase().includes(search)));
  }

  ngOnInit(): void {
    const headers = new HttpHeaders({});
    this.apiService.post<ManagedTenant[]>('tenants/get', headers).subscribe({
      next: (data) => {
        this.tenants = (data || []).map((tenant) => ({
          ...tenant,
          verified: tenant.verified ?? false,
          privileged_ioc: tenant.privileged_ioc ?? false,
          _saved_privileged_ioc: tenant.privileged_ioc ?? false,
          ai_endpoint_enabled: tenant.ai_endpoint_enabled ?? false,
          user_quota: tenant.user_quota ?? 0,
          status: tenant.status === TenantStatusValues.ONBOARDING ||
                        tenant.status === TenantStatusValues.ACTIVE ||
                        tenant.status === TenantStatusValues.DISABLE
            ? tenant.status
            : TenantStatusValues.ACTIVE,
          licenses: tenant.licenses?.length
            ? tenant.licenses.filter((license) => license !== LicenseName.FEEDER)
            : [LicenseName.FREE],
        }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  getStatusLabel(status: TenantStatus): string {
    this.translationService.version();
    switch (status) {
      case TenantStatusValues.ONBOARDING:
        return this.translationService.translate('Disable');
      case TenantStatusValues.ACTIVE:
        return this.translationService.translate('Active');
      case TenantStatusValues.DISABLE:
        return this.translationService.translate('Disable');
      default:
        return '';
    }
  }

  isAdmin(): boolean {
    return this.licenseService.isAdmin();
  }

  canEditTenantAiEndpoint(): boolean {
    return this.isAdmin() && this.appService.configData().appSettings.ai_endpoint_enabled;
  }

  openTenant(tenant: ManagedTenant): void {
    if (tenant.access_url) {
      window.open(tenant.access_url, '_blank', 'noopener,noreferrer');
      return;
    }
    const url = new URL(window.location.origin);
    url.hostname = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      ? `${tenant.slug}.localhost`
      : `${tenant.slug}.${url.hostname}`;
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  updateTenant(tenant: ManagedTenant): void {
    if (!tenant.licenses || tenant.licenses.length === 0) {
      tenant.licenses = [LicenseName.FREE];
    }
    const payload = { ...tenant };
    if (!this.canEditTenantAiEndpoint()) {
      delete payload.ai_endpoint_enabled;
    }
    this.isLoading = true;
    this.apiService.post<TenantUpdateResponse>('update/tenants', payload).subscribe({
      next: (res) => {
        if (res?.tenant) {
          tenant.iocs = res.tenant.iocs ?? tenant.iocs;
          tenant.privileged_ioc = res.tenant.privileged_ioc ?? tenant.privileged_ioc;
          tenant._saved_privileged_ioc = tenant.privileged_ioc ?? false;
          tenant.ai_endpoint_enabled = res.tenant.ai_endpoint_enabled ?? tenant.ai_endpoint_enabled ?? false;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  openDeleteConfirmation(tenant: ManagedTenant, event?: Event): void {
    event?.stopPropagation();
    this.tenantToDelete = tenant;
  }

  confirmDeleteTenant(confirmed: boolean): void {
    const tenant = this.tenantToDelete;
    this.tenantToDelete = null;
    if (!confirmed || !tenant) {
      return;
    }
    this.isLoading = true;
    this.apiService.delete<unknown>(`tenants/${tenant.id}`).subscribe({
      next: () => {
        this.tenants = this.tenants.filter(item => item.id !== tenant.id);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const eventTargetElement = event.target;
    if (!(eventTargetElement instanceof Element) || !eventTargetElement.closest('.action-menu')) {
      this.selectedTenantId = null;
    }
  }

  toggleTenantLicense(tenant: ManagedTenant, license: LicenseName): void {
    tenant.licenses ??= [];
    const index = tenant.licenses.indexOf(license);
    if (index > -1) {
      tenant.licenses.splice(index, 1);
    }
    else {
      tenant.licenses.push(license);
    }
  }

  onTenantLicenseDropdownChange(tenant: ManagedTenant, licenses: string[]): void {
    tenant.licenses = licenses;
  }

  canManageTenantIocs(tenant: ManagedTenant): boolean {
    return this.isAdmin() && tenant?.privileged_ioc !== true && tenant?._saved_privileged_ioc !== true;
  }

  getTenantIocCount(tenant: ManagedTenant): number {
    return (tenant?.iocs || []).reduce((total: number, ioc: IocCategory) => total + (ioc.values?.length || 0), 0);
  }

  getTenantIocPreview(tenant: ManagedTenant): string[] {
    const preview: string[] = [];
    for (const ioc of tenant?.iocs || []) {
      for (const value of ioc.values || []) {
        const normalized = String(value).trim();
        if (normalized) {
          preview.push(normalized);
        }
        if (preview.length === 5) {
          return preview;
        }
      }
    }
    return preview;
  }

  openIocSelector(tenant: ManagedTenant, event?: Event): void {
    event?.stopPropagation();
    if (!this.canManageTenantIocs(tenant)) {
      return;
    }
    this.activeIocTenant = tenant;
    this.iocDraft = this.buildIocDraft(tenant.iocs || []);
    this.isIocSelectorClosing = false;
    this.isIocSelectorOpen = true;
    setTimeout(() => {
      this.isIocSelectorDrawerOpen = true;
    }, 10);
  }

  closeIocSelector(): void {
    if (this.isIocSelectorClosing) {
      return;
    }
    this.isIocSelectorClosing = true;
    this.isIocSelectorDrawerOpen = false;
    setTimeout(() => {
      this.isIocSelectorOpen = false;
      this.activeIocTenant = null;
      this.iocDraft = [];
      this.isIocSelectorClosing = false;
    }, 300);
  }

  buildIocDraft(existingIocs: IocCategory[]): IocCategory[] {
    const existingById = new Map<string, IocCategory>();
    for (const ioc of existingIocs || []) {
      existingById.set(ioc.ioc_id, ioc);
    }
    const keys = [...Object.keys(search_filter_labels)];
    for (const ioc of existingIocs || []) {
      if (ioc.ioc_id && !keys.includes(ioc.ioc_id)) {
        keys.push(ioc.ioc_id);
      }
    }
    return keys.map(key => {
      const existing = existingById.get(key);
      return {
        ioc_id: key,
        name: getOwnProperty(search_filter_labels, key) ?? existing?.name ?? key,
        values: [...new Set((existing?.values ?? []).map(value => String(value).trim()).filter(Boolean))]
      };
    });
  }

  saveIocSelector(): void {
    if (!this.activeIocTenant) {
      return;
    }
    const activeTenant = this.activeIocTenant;
    const selectedIocs = this.iocDraft.filter(ioc => ioc.values?.length > 0);
    const payload = {
      ...activeTenant,
      iocs: selectedIocs
    };
    if (!this.canEditTenantAiEndpoint()) {
      delete payload.ai_endpoint_enabled;
    }
    this.isLoading = true;
    this.apiService.post<TenantUpdateResponse>('update/tenants', payload).subscribe({
      next: (res) => {
        activeTenant.iocs = res?.tenant?.iocs ?? selectedIocs;
        activeTenant.privileged_ioc = res?.tenant?.privileged_ioc ?? activeTenant.privileged_ioc;
        activeTenant._saved_privileged_ioc = activeTenant.privileged_ioc ?? false;
        this.isLoading = false;
        this.closeIocSelector();
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  getTenantLicensesLabel(tenant: ManagedTenant): string {
    if (!tenant.licenses || tenant.licenses.length === 0) {
      return this.translationService.translate('None');
    }
    return tenant.licenses
      .map(l => this.licenseService.getLicenseLabel(l as LicenseName))
      .join(', ');
  }

  getTenantStatusBadgeClass(status: TenantStatus): string {
    if (status === TenantStatusValues.ACTIVE) {
      return 'bg-emerald-500/10 text-emerald-300 [body.light-theme_&]:bg-emerald-100 [body.light-theme_&]:text-emerald-800';
    }
    return 'bg-amber-500/10 text-amber-300 [body.light-theme_&]:bg-amber-100 [body.light-theme_&]:text-amber-800';
  }

  getSubscriptionBadgeClass(subscription?: boolean): string {
    if (subscription) {
      return 'bg-sky-500/10 text-sky-300 [body.light-theme_&]:bg-sky-100 [body.light-theme_&]:text-sky-800';
    }
    return 'bg-slate-500/10 text-slate-300 [body.light-theme_&]:bg-slate-100 [body.light-theme_&]:text-slate-700';
  }

  getVerifiedBadgeClass(verified?: boolean): string {
    if (verified) {
      return 'bg-sky-500/10 text-sky-300 [body.light-theme_&]:bg-sky-100 [body.light-theme_&]:text-sky-800';
    }
    return 'bg-amber-500/10 text-amber-300 [body.light-theme_&]:bg-amber-100 [body.light-theme_&]:text-amber-800';
  }
}
