import type { Edge, Node } from 'vis-network';
import type { Augmented } from '../../../shared/utils/type-guards.util';

export type SocialGraphNodeKind = 'root' | 'user' | 'account' | 'group' | 'person' | 'more';

export type SocialGraphRelation = 'follower' | 'following' | 'friend' | 'connection' | 'organization' | 'contact' | 'same_handle' | 'channel' | 'mention';

export type SocialGraphEdgeKind = 'account' | 'group' | 'member' | 'link';

export interface SocialGraphMembership {
  owner: string;
  platform: string;
  platformHandle: string;
  relation: SocialGraphRelation;
  accountId: string;
  groupId: string;
  posts: number;
}

export interface SocialGraphPerson {
  handle: string;
  name: string;
  avatar: string;
  url: string;
  bio: string;
  followers: string;
  location: string;
  owner: string | null;
  memberships: SocialGraphMembership[];
}

export interface SocialGraphGroup {
  id: string;
  accountId: string;
  owner: string;
  platform: string;
  relation: SocialGraphRelation;
  members: string[];
  posts: number;
}

export interface SocialGraphAccount {
  id: string;
  owner: string;
  platform: string;
  handle: string;
  name: string;
  avatar: string;
  url: string;
  bio: string;
  followers: string;
  location: string;
  darkweb: boolean;
  discovered: boolean;
  groups: SocialGraphGroup[];
}

export interface SocialGraphUser {
  owner: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  accounts: SocialGraphAccount[];
}

export interface SocialGraphLink {
  from: string;
  to: string;
  relation: SocialGraphRelation;
  platform: string;
  directed: boolean;
  title: string;
}

export interface SocialUserGraphData {
  roots: string[];
  hasProfiles: boolean;
  users: ReadonlyMap<string, SocialGraphUser>;
  persons: ReadonlyMap<string, SocialGraphPerson>;
  links: SocialGraphLink[];
}

export interface SocialGraphViewState {
  expandedUsers: ReadonlySet<string>;
  expandedGroups: ReadonlySet<string>;
  groupPages: ReadonlyMap<string, number>;
  pinned: ReadonlySet<string>;
  chunkSize: number;
}

export interface SocialGraphViewNode {
  id: string;
  kind: SocialGraphNodeKind;
  label: string;
  title: string;
  owner: string;
  owners: string[];
  platform: string;
  handle: string;
  name: string;
  avatar: string;
  url: string;
  relation: SocialGraphRelation | null;
  count: number;
  expanded: boolean;
  platformCount: number;
  ownerCount: number;
  groupId: string;
}

export interface SocialGraphViewEdge {
  id: string;
  from: string;
  to: string;
  kind: SocialGraphEdgeKind;
  relation: SocialGraphRelation | null;
  platform: string;
  directed: boolean;
  dashed: boolean;
  weight: number;
  label: string;
  title: string;
}

export interface SocialGraphView {
  nodes: SocialGraphViewNode[];
  edges: SocialGraphViewEdge[];
}

export interface SocialGraphVisualOptions {
  dark: boolean;
  labelColor: string;
  icons: ReadonlyMap<string, string>;
  colors: ReadonlyMap<string, string>;
  highlighted: ReadonlySet<string>;
  scanning: ReadonlySet<string>;
}

export type SocialGraphVisNode = Augmented<Node, { id: string }>;

export type SocialGraphVisEdge = Augmented<Edge, { id: string }>;
