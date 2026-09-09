export interface CountryData {
  id: string;
  name: string;
  value: number;
}

export interface CountryInsightReport extends Record<string, unknown> {
  m_country?: string[];
  m_hash?: string;
  m_url?: string;
  m_title?: string;
  m_company_name?: string;
  m_team?: string;
  m_network?: string;
  m_domain?: string[];
}

export interface CountryInsightPageResponse {
  items: CountryInsightReport[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
