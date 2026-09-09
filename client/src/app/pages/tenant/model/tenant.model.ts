import { AlertModel } from '../../../shared/model/company-profile/node.model';
import { TenantModel } from '../../../shared/model/tenant/tenant.model';

export interface TenantOnboardingUpdateResponse {
  tenant?: TenantModel;
  alerts?: AlertModel[];
}
