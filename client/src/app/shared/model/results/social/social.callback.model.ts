import { initCallbackModel } from '../callback.init';
export class SocialResultItem {
  m_content?: string;
  m_platform?: string;
  m_title?: string;
  m_summary!: string[];
  m_message_id?: string;
  m_message_sharable_link?: string;
  m_weblink!: string[];
  m_content_type?: string | string[];
  m_hash?: string;
  m_views?: string;
  m_channel_name?: string;
  m_channel_url?: string;
  m_sender_name?: string;
  m_sender_username?: string;
  m_date?: string;
  m_network?: string;
  m_post_likes?: string;
  m_post_shares?: string;
  m_post_comments_count?: string;
  m_post_tags!: string[];
  m_post_views?: string;
  m_post_expiry?: string;
  m_comment_count?: string;
  m_comments_count?: string;
  m_comments?: unknown;
  m_post_comments?: unknown;
  m_post_comments_list?: unknown;
  m_likes?: string;
  m_retweets?: string;
  m_commenters!: string[];

  [key: string]: unknown;

  constructor(init?: Partial<SocialResultItem>) {
    this.m_summary = [];
    this.m_weblink = [];
    this.m_post_tags = [];
    this.m_commenters = [];
    Object.assign(this, init);
  }
}
export class SocialCallbackModel {
  Result!: SocialResultItem[];
  Page_Count!: number;

  constructor(init?: Partial<SocialCallbackModel>) {
    this.Result = [];
    this.Page_Count = 0;
    if (init) {
      initCallbackModel(this, init, r => new SocialResultItem(r));
    }
  }
}
