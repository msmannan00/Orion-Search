import { TenantModel, TenantStatus } from '../../../../../shared/model/tenant/tenant.model';

export interface ManagedTenant extends TenantModel {
  status: TenantStatus;
  slug?: string;
  access_url?: string;
  companyName?: string;
  company?: string;
  _saved_privileged_ioc?: boolean;
  ai_endpoint_enabled?: boolean;
  _expanded?: boolean;
  _id?: string;
}

export interface TenantUpdateResponse {
  tenant?: Partial<ManagedTenant>;
}
