import { UrlScanThreatItem } from '../../../../../shared/model/security-scan/security.scan.results.model';

export interface NetworkIntelSeoRepoScanCategory {
  name: string;
  total: number;
  items: UrlScanThreatItem[];
}
