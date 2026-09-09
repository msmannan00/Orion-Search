import { FilterModel } from '../../../shared/model/filter/filter.model';

export interface MalpediaFilterOptionsResponse {
  families?: string[];
  countries?: string[];
}

export interface MalwareBazaarFilterOptionsResponse {
  countries?: string[];
  content_types?: string[];
  reporters?: string[];
}

export interface DashboardFilterModels {
  general: FilterModel;
  threatIntel: FilterModel;
  malpedia: FilterModel;
  malwareBazaar: FilterModel;
}
