import type { SocialGraphRelation } from '../models/social-user-graph.models';



export const CONTENT_DATE_KEYS = ['datetime', 'published_at', 'creation_time', 'created_at', 'updated_at'];

export const DARKWEB_SENDER_KEYS = ['m_sender_username', 'm_author', 'm_username', 'm_attacker', 'm_sender_name'];



export const RELATION_BY_TYPE: Record<string, SocialGraphRelation> = { followers: 'follower', following: 'following', friends: 'friend', connections: 'connection', organizations: 'organization' };

export const RELATION_LABELS: Record<SocialGraphRelation, string> = { follower: 'Followers', following: 'Following', friend: 'Friends', connection: 'Commenters', organization: 'Organizations', contact: 'Contacts', same_handle: 'Same handle', channel: 'Channels', mention: 'Mentions' };

export const RELATION_COLORS: Record<SocialGraphRelation, string> = { follower: '#60a5fa', following: '#38bdf8', friend: '#34d399', connection: '#f472b6', organization: '#fbbf24', contact: '#a3a3a3', same_handle: '#f59e0b', channel: '#c084fc', mention: '#fb7185' };

export const COUNTED_RELATIONS: ReadonlySet<SocialGraphRelation> = new Set<SocialGraphRelation>(['connection', 'channel', 'mention']);



export const KIND_COLORS = { root: '#7c3aed', user: '#f59e0b', person: '#64748b', multi: '#0d9488', shared: '#b45309', more: '#475569' } as const;

export const NODE_FILL = '#334155';

export const NODE_FOCUS = '#facc15';

export const NODE_SCAN = '#38bdf8';

export const NODE_ROOT = '#facc15';



export const RING_PX = 2.5;

export const FOCUS_RING_SCALE = 2.5;



export const SHARED_PAGE_KEY = 'shared';
