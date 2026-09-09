import { initCallbackModel } from '../callback.init';
export class ChatResultItem {
  m_content?: string;
  m_platform?: string;
  m_caption?: string;
  m_summary!: string[];
  m_date?: string;
  m_message_id?: string;
  m_channel_url?: string;
  m_message_sharable_link?: string;
  m_views?: string;
  m_file_name!: string[];
  m_sender_name?: string;
  m_sender_username?: string;
  m_media_caption?: string;
  m_file_path?: string;
  m_channel_name?: string;
  m_weblink!: string[];
  m_network?: string;
  m_ref_html?: string;
  m_content_type?: string | string[];
  m_hash?: string;
  m_post_likes?: string;
  m_post_shares?: string;
  m_post_comments_count?: string;
  m_post_tags!: string[];
  m_post_views?: string;
  m_post_expiry?: string;
  m_comment_count?: string;
  m_likes?: string;
  m_retweets?: string;
  m_commenters!: string[];

  [key: string]: unknown;

  constructor(init?: Partial<ChatResultItem>) {
    Object.assign(this, init);
  }
}
export class ChatCallbackModel {
  Result: ChatResultItem[] = [];
  Page_Count!: number;

  constructor(init?: Partial<ChatCallbackModel>) {
    if (init) {
      initCallbackModel(this, init, r => new ChatResultItem(r));
    }
  }
}
