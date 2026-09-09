import { DefacementGroupCallbackItem } from '../../../../shared/model/results/defacement/defacement.callback.model';
import { RankedResultItem } from '../../../../shared/model/results/consolidated/ranked.callback.model';

export interface DashboardSearchResponse {
  Result?: RankedResultItem[];
  cards_data?: unknown[];
  Defacement_Groups?: DefacementGroupCallbackItem[];
  Total_Groups?: number;
  Page_Count?: number;
}
