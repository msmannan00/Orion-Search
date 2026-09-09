import { CardData } from '../../../../../shared/model/api/email/search_dynamic_email_callback_model';
import { UnknownRecord } from '../../../../../shared/utils/type-guards.util';

export interface ConsolidatedApiResponse extends UnknownRecord {
  status?: string;
  progress?: number;
  step?: string;
  success?: boolean;
  result?: ConsolidatedApiResponse | CardData[];
  data?: ConsolidatedApiResponse;
  cards_data?: CardData[];
  base_url?: string;
  m_network?: string;
  meta?: import('../../../../../shared/model/security-scan/security.scan.results.model').UrlScanMeta;
  grade?: string;
}
