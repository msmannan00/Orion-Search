import { AptIntelResultItem } from '../../../../../shared/model/results/apt-intel/apt-intel.callback.model';

export interface AptIntelFeedResponse {
  Result?: AptIntelResultItem[];
  Total_Hits?: number;
  Total_Groups?: number;
  Page_Count?: number;
}
