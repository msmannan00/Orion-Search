import { UnknownRecord } from '../../../../../shared/utils/type-guards.util';

export interface GeneralReportItem extends UnknownRecord {
  m_title?: string;
  m_screenshot?: string;
  m_content?: string;
  m_section?: string[];
  m_url?: string;
  m_source_url?: string;
  m_base_url?: string;
  m_important_content?: string;
  m_date?: string;
  m_published_date?: string;
  m_first_seen?: string;
  m_creation_date?: string;
  m_update_date?: string;
  m_hash?: string;
  _id?: string;
  m_ref_html?: string | null;
  m_last_crawled_at?: string | null;
  m_network?: string;
  m_platform?: string;
  m_content_type?: string[];
  m_crawl_status?: string | null;
  m_code_snippet?: string;
}
