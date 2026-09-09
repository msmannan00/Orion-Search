import { UnknownRecord } from '../../../../shared/utils/type-guards.util';

export interface InsightResultItem extends UnknownRecord {
  m_url?: string;
  m_title?: string;
  m_creation_date?: string;
  m_update_date?: string;
  m_date?: string;
  m_clearnet_links?: unknown;
  m_weblink?: unknown;
  m_dumplink?: unknown;
  m_source_url?: unknown;
  m_email?: unknown;
  m_content?: unknown;
  m_highlighted?: unknown;
  m_important_content?: unknown;
  m_meta_description?: unknown;
  m_username?: unknown;
  username?: unknown;
  m_sender_username?: unknown;
  m_actor?: unknown;
  m_threat_actor?: unknown;
  m_family?: unknown;
  m_team?: unknown;
  m_attacker?: unknown;
}
