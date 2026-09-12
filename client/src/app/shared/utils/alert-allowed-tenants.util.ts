import { AlertAllowedTenantOption } from '../model/tenant/tenant.model';
import { ApiService } from '../services/api.service';
import { UiDropdownOption } from '../partials/ui-dropdown/ui-dropdown.component';

export function buildAlertAllowedOptions(allAlertsOption: string, allLabel: string, tenants: AlertAllowedTenantOption[]): UiDropdownOption[] {
  return [
    { key: allAlertsOption, label: allLabel },
    ...tenants.map(tenant => ({
      key: tenant.id,
      label: tenant.name || tenant.email || tenant.id
    }))
  ];
}

export function loadAlertTenantOptions(apiService: ApiService, assign: (options: AlertAllowedTenantOption[]) => void): void {
  apiService.get<AlertAllowedTenantOption[]>('tenants/alerts/allowed-options').subscribe({
    next: (options) => {
      assign(options || []);
    },
    error: () => {
      assign([]);
    }
  });
}
