import { initCallbackModel } from '../callback.init';
export class DefacementResultItem {
  q!: string;
  m_attacker!: string[];
  m_team!: string;
  m_web_server!: string[];
  m_ioc_type!: string[];
  ioc!: string[];
  m_base_url!: string;
  m_ip!: string[];
  m_location!: string;
  m_content!: string;
  m_date?: string;
  m_source_url!: string[];
  m_hash!: string;
  m_screenshot?: string;
  m_url!: string;
  m_section?: unknown[];
  _id?: string;
  doc_id?: string;
  m_document_id?: string;

  [key: string]: unknown;

  constructor(init?: Partial<DefacementResultItem>) {
    Object.assign(this, init);
  }
}
export interface DefacementGroupCallbackItem {
  key: string;
  title: string;
  subtitle?: string;
  records: DefacementResultItem[];
  record_count?: number;
  affected_sites?: number;
  ip_count?: number;
  servers?: string[];
  latest_seen?: string | null;
}
export type DefacementRisk = 'High' | 'Medium' | 'Low';

export interface DefacementRecord {
  item: DefacementResultItem;
  title: string;
  ipSummary: string;
  webServerSummary: string;
  sourceUrl: string;
  leakDate: string | null;
}

export interface DefacementGroup {
  key: string;
  title: string;
  subtitle: string;
  risk: DefacementRisk;
  records: DefacementRecord[];
  affectedSites: number;
  ipCount: number;
  servers: string[];
  latestSeen: string | null;
}

export interface DefacementSummary {
  campaigns: number;
  records: number;
  affectedSites: number;
  latestSeen: string | null;
}
export class DefacementCallbackModel {
  Result: DefacementResultItem[] = [];
  Defacement_Groups: DefacementGroupCallbackItem[] = [];
  Page_Count!: number;

  constructor(init?: Partial<DefacementCallbackModel>) {
    if (init) {
      initCallbackModel(this, init, r => new DefacementResultItem(r));
      this.Defacement_Groups = init.Defacement_Groups?.map(group => ({
        ...group,
        records: group.records?.map(record => new DefacementResultItem(record)) ?? []
      })) ?? [];
    }
  }
}
