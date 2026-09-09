import type { SocialGraphNodeKind, SocialGraphRelation } from '../../models/social-user-graph.models';

export interface membership_view {
  platform: string;
  relation: string;
  owner: string;
  groupId: string;
  posts: number;
}

export interface account_view {
  id: string;
  nodeId: string;
  owner: string;
  platform: string;
  handle: string;
  url: string;
  contacts: number;
  discovered: boolean;
}

export interface group_view {
  id: string;
  relation: SocialGraphRelation;
  label: string;
  count: number;
  posts: number;
  expanded: boolean;
}

export interface link_view {
  label: string;
  title: string;
}

export interface find_match {
  nodeId: string;
  handle: string;
  name: string;
}

export interface context_menu_view {
  action: 'remove' | 'scan';
  handle: string;
  nodeId: string;
  left: number;
  top: number;
}

export interface detail_view {
  nodeId: string;
  kind: SocialGraphNodeKind;
  title: string;
  handle: string;
  platform: string;
  owner: string;
  avatar: string;
  bio: string;
  followers: string;
  location: string;
  url: string;
  expanded: boolean;
  connected: boolean;
  scanned: boolean;
  scanQuery: string;
  addable: boolean;
  memberships: membership_view[];
  accounts: account_view[];
  groups: group_view[];
  links: link_view[];
}
