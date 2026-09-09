import { AppSettingsModel } from '../../../../shared/model/app/config';

export interface SystemSettingsResponse {
  settings?: Partial<AppSettingsModel>;
}
