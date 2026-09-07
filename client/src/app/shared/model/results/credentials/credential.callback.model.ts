import { initCallbackModel } from "../callback.init";


export interface CredentialResultItem {
  [key: string]: unknown;
  _id?: string;
  id?: string;
  raw?: string;
  email?: string[];
  username?: string[];
  user?: unknown;
  password?: unknown;
  domain?: unknown;
  source_domain?: unknown;
  ip?: string[];
  url?: unknown;
  channel?: unknown;
  m_channel?: unknown;
  source_channel?: unknown;
  m_source_channel?: unknown;
  file?: unknown;
  filename?: unknown;
  file_type?: unknown;
  fileType?: unknown;
  type?: unknown;
  timestamp?: string | number;
  date?: string | number;
  created_at?: string | number;
  updated_at?: string | number;
  year?: string | number;
  hash?: unknown;
  m_hash?: unknown;
  m_message_id?: unknown;
  rank_index?: unknown;
  m_rank_index?: unknown;
  index?: unknown;
  m_index?: unknown;
  title?: unknown;
  name?: unknown;
  description?: unknown;
  content?: unknown;
  m_title?: unknown;
  m_name?: unknown;
  m_description?: unknown;
  m_content?: unknown;
  m_important_content?: unknown;
  m_base_url?: unknown;
  m_url?: unknown;
  m_weblink?: unknown;
  m_web_url?: unknown;
  m_domain?: unknown;
  m_root_domain?: unknown;
  m_websites?: unknown;
  m_email?: unknown;
  m_username?: unknown;
  m_user?: unknown;
  m_password?: unknown;
  m_ip?: unknown;
  m_team?: unknown;
  m_date?: string | number;
  m_update_date?: string | number;
  m_year?: string | number;
  m_content_type?: unknown;
  m_source?: unknown;
  m_file?: unknown;
}

export class StealerLogResultItem implements CredentialResultItem {
  type?: string;
  raw?: string;
  channel?: string;
  file?: string;
  timestamp?: string;
  date?: string | number;
  bin?: string;
  email?: string[];
  username?: string[];
  ip?: string[];
  domain?: string | string[];
  source_domain?: string | string[];
  dismissed?: boolean;

  [key: string]: unknown;

  constructor(init?: Partial<StealerLogResultItem>) {
    Object.assign(this, init);
  }
}
export class StealerLogCallbackModel {
  Result!: StealerLogResultItem[];
  Page_Count!: number;
  Total_Hits!: number;

  constructor(init?: Partial<StealerLogCallbackModel>) {
    this.Result = [];
    this.Page_Count = 0;
    this.Total_Hits = 0;
    if (init) {
      initCallbackModel(this, init, r => new StealerLogResultItem(r));
    }
  }
}
