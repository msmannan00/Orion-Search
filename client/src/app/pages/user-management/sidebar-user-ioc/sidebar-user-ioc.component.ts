import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService } from '../../../shared/services/api.service';
import { AppService } from '../../../services/core/app/app.service';
import { search_filter_labels } from '../../../shared/constants/shared-enums';
import { TenantModel } from '../../../shared/model/tenant/tenant.model';
import { TenantIocSelectorComponent } from '../../../shared/partials/tenant-ioc-selector/tenant-ioc-selector.component';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-sidebar-user-ioc',
  imports: [CommonModule, TenantIocSelectorComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-user-ioc.component.html',
})
export class SidebarUserIocComponent implements OnInit {
  onboardingData!: TenantModel;
  categories: Record<string, string[]> = {};
  readonly iocPermissionWarning = "You don't have permission to manage IOCs outside your domain. Ask your network administrator.";

  constructor(protected apiService: ApiService, public appService: AppService) { }

  ngOnInit(): void {
    this.initializeIocs(this.appService.tenantData());
    this.apiService.post<TenantModel>('get/tenant', {}).subscribe({
      next: (tenantData) => {
        this.appService.tenantData.set(tenantData);
        this.initializeIocs(tenantData);
      }
    });
  }

  private initializeIocs(backendData: TenantModel): void {
    const search_filter_keys = Object.keys(search_filter_labels);

    if (backendData?.iocs) {
      this.onboardingData = {
        name: backendData.name,
        privileged_ioc: backendData.privileged_ioc,
        iocs: Array.from(search_filter_keys).map(key => {
          const backendIoc = backendData.iocs.find(i => i.ioc_id === key);
          return {
            ioc_id: key,
            name: getOwnProperty(search_filter_labels, key) || key,
            values: backendIoc ? backendIoc.values : []
          };
        })
      };

      this.setIocLocal();
    }
  }

  isPrivilegedIoc(): boolean {
    const tenantPrivileged = this.appService.tenantData().privileged_ioc;
    return tenantPrivileged === undefined
      ? this.appService.userSessionData().tenant.privilegedIoc !== true
      : !tenantPrivileged;
  }

  update(): void {
    if (this.isPrivilegedIoc()) {
      return;
    }
    const filteredOnboardingData: TenantModel = {
      name: this.onboardingData?.name || '',
      iocs: this.onboardingData?.iocs.filter(ioc => ioc.values && ioc.values.length > 0) || []
    };
    this.setIocLocal();
    this.appService.tenantData.set({ ...this.appService.tenantData(), ...filteredOnboardingData });
    this.apiService.post('update/tenants', filteredOnboardingData).subscribe({
      next: () => void 0,
      error: () => void 0,
    });
  }

  setIocLocal(): void {
    this.categories = {};
    this.onboardingData?.iocs.forEach(ioc => {
      this.categories[ioc.ioc_id] = ioc.values;
    });
    this.appService.set('entityfilterCategories', this.categories);
  }
}
