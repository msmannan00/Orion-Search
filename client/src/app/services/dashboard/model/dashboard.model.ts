import { RankedResultItem } from '../../../shared/model/results/consolidated/ranked.callback.model';
import { UnknownRecord } from '../../../shared/utils/type-guards.util';

export interface RankedApiResponse extends UnknownRecord {
  Result?: RankedResultItem[];
  Page_Count?: number;
  Total_Hits?: number;
}
