import type { db_social_model, social_profile } from '../models/social.models';
import type { SocialGraphAccount, SocialGraphLink, SocialGraphPerson, SocialGraphRelation, SocialGraphUser, SocialGraphView, SocialGraphViewEdge, SocialGraphViewNode, SocialGraphViewState, SocialGraphVisEdge, SocialGraphVisNode, SocialGraphVisualOptions, SocialUserGraphData } from '../models/social-user-graph.models';
import { categoryFor } from '../constants/resource-category.constants';
import { COUNTED_RELATIONS, DARKWEB_SENDER_KEYS, FOCUS_RING_SCALE, KIND_COLORS, NODE_FILL, NODE_FOCUS, NODE_ROOT, NODE_SCAN, RELATION_BY_TYPE, RELATION_COLORS, RELATION_LABELS, RING_PX, SHARED_PAGE_KEY } from '../constants/social-graph.constants';
import { asRecord, pickCount, pickList, pickText } from './resource-view.util';
import { toUsername } from './username.util';
import { buildSocialProfileUrl } from './profile-url.util';
import { postUrlsOf } from './social-profile.util';
import { bootstrapIconRegistry } from '../../../shared/icons/bootstrap-icon-registry';
import type { person_view } from './model/social-user-graph.model';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';

export type { person_view } from './model/social-user-graph.model';




export function normalizeHandle(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) {
    return '';
  }
  return toUsername(text).trim().replace(/^@+/, '').replace(/\/+$/, '').toLowerCase();
}

export function parseHandleList(values: string[]): string[] {
  return Array.from(new Set(values.flatMap(value => String(value ?? '').split(/[,\s]+/)).map(normalizeHandle).filter(Boolean)));
}

function personNodeId(person: SocialGraphPerson): string {
  return person.owner ? `user:${person.owner}` : `person:${person.handle}`;
}

function handleFromUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return '';
  }
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('id');
    if (id) {
      return normalizeHandle(id);
    }
    return normalizeHandle(parsed.pathname.split('/').filter(Boolean).pop() ?? '');
  }
  catch {
    return '';
  }
}

export function isChannelHandle(handle: string): boolean {
  return handle.startsWith('#');
}

export function handleLabel(handle: string): string {
  return isChannelHandle(handle) ? handle : `@${handle}`;
}

export function relationVerb(relation: SocialGraphRelation): string {
  const verbs: Record<SocialGraphRelation, string> = { follower: 'follows', following: 'is followed by', friend: 'is a friend of', connection: 'commented on', organization: 'is a member of', contact: 'is a contact of', same_handle: 'shares a handle with', channel: 'is a channel used by', mention: 'appears alongside' };
  return getOwnProperty(verbs, relation);
}

export function linkLabel(link: SocialGraphLink): string {
  return `@${link.from} ${relationVerb(link.relation)} @${link.to}${link.platform ? ` · ${link.platform}` : ''}`;
}

function relationFor(type: unknown): SocialGraphRelation | null {
  const key = String(type ?? '').toLowerCase();
  if (getOwnProperty(RELATION_BY_TYPE, key)) {
    return getOwnProperty(RELATION_BY_TYPE, key);
  }
  return categoryFor('', key) === 'people' ? 'contact' : null;
}

function describePerson(item: unknown): person_view {
  const record = asRecord(item);
  const rawHandle = pickText(record, 'handle', 'screen_name', 'acct', 'username', 'login', 'author');
  const url = pickText(record, 'url', 'media_url', 'profile_url');
  const looksLikeHandle = !!rawHandle && !/\s/.test(rawHandle.trim());
  const handle = looksLikeHandle ? normalizeHandle(rawHandle) : (handleFromUrl(url) || normalizeHandle(rawHandle) || normalizeHandle(url));
  const name = pickText(record, 'title', 'display_name', 'name', 'full_name', 'author_name') || rawHandle || handle;
  return {
    handle,
    name,
    avatar: pickText(record, 'thumbnail_url', 'avatar', 'avatar_url', 'author_avatar', 'user_avatar', 'profile_image'),
    url,
    bio: pickText(record, 'caption', 'description', 'bio', 'about', 'note'),
    followers: pickCount(record, 'followers', 'followers_count', 'follower_count', 'total_followers'),
    location: pickText(record, 'location'),
  };
}

function platformOf(profile: social_profile): string {
  return String(profile?.meta?.platform ?? '').trim();
}

function textOf(value: unknown): string {
  if (Array.isArray(value)) {
    return textOf(value[0]);
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function darkwebPlatform(record: ReturnType<typeof asRecord>): string {
  const raw = textOf(record.m_network) || textOf(record.m_platform) || 'darkweb';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function darkwebDocKey(record: ReturnType<typeof asRecord>): string {
  return textOf(record.m_message_id) || textOf(record._id) || textOf(record.m_message_sharable_link) || textOf(record.m_url) || textOf(record.m_weblink) || `${textOf(record.m_channel_name)}|${textOf(record.m_date)}|${textOf(record.m_title)}`;
}

function darkwebHandles(record: ReturnType<typeof asRecord>): { handle: string; name: string }[] {
  const found: { handle: string; name: string }[] = [];
  const push = (raw: unknown, label?: unknown): void => {
    const text = textOf(raw);
    const handle = normalizeHandle(text);
    if (handle && !found.some(entry => entry.handle === handle)) {
      found.push({ handle, name: (textOf(label) || text).replace(/^@+/, '') });
    }
  };
  const senderKey = DARKWEB_SENDER_KEYS.find(key => textOf(getOwnProperty(record, key)));
  if (senderKey) {
    push(getOwnProperty(record, senderKey), record.m_sender_name);
  }
  push(record.m_forwarded_from);
  pickList(record, 'm_users').forEach(user => {
    push(user);
  });
  for (const comment of Array.isArray(record.m_comments) ? record.m_comments : []) {
    const entry = asRecord(comment);
    push(entry.m_username ?? entry.m_author ?? entry.m_sender_username ?? entry.m_sender_name);
  }
  return found;
}

function firstText(profiles: social_profile[], pick: (profile: social_profile) => string | undefined | null): string {
  return profiles.map(profile => pick(profile) ?? '').find(Boolean) ?? '';
}

function shorten(label: string, max = 24): string {
  return label.length > max ? `${label.slice(0, max - 2)}…` : label;
}

function emptyDocument(owner: string): db_social_model {
  return { user_id: '', profile_username: owner, profiles: [], config: { disallowed: [] }, scan: { progress: 0, cancel_requested: false } };
}

function buildUser(owner: string, document: db_social_model): SocialGraphUser {
  const profiles = (document.profiles ?? []).filter(profile => platformOf(profile));
  return {
    owner,
    name: firstText(profiles, profile => profile.profile_details?.real_name),
    avatar: firstText(profiles, profile => profile.profile_details?.avatar ?? profile.meta?.avatar),
    bio: firstText(profiles, profile => profile.profile_details?.bio),
    location: firstText(profiles, profile => profile.profile_details?.location),
    accounts: [],
  };
}

export function buildSocialUserGraph(usernames: string[], targets: ReadonlyMap<string, db_social_model | null>, documents: db_social_model[], reports: ReadonlyMap<string, Record<string, unknown>[]> = new Map()): SocialUserGraphData {
  const roots = parseHandleList(usernames);
  const rootSet = new Set(roots);
  const documentsByOwner = new Map<string, db_social_model>();
  for (const root of roots) {
    const target = targets.get(root);
    const fallback = documents.find(document => normalizeHandle(document.profile_username) === root) ?? null;
    const resolved = target?.profiles?.length ? target : fallback;
    documentsByOwner.set(root, { ...(resolved ?? emptyDocument(root)), profile_username: root });
  }
  for (const document of documents) {
    const owner = normalizeHandle(document.profile_username);
    if (owner && (document.profiles?.length ?? 0) > 0 && !documentsByOwner.has(owner)) {
      documentsByOwner.set(owner, document);
    }
  }

  const aliasToOwner = new Map<string, string>();
  const aliasesByOwner = new Map<string, string[]>();
  for (const [owner, document] of documentsByOwner) {
    const aliases = Array.from(new Set([owner, ...(document.profiles ?? []).map(profile => normalizeHandle(profile.meta?.username))].filter(Boolean)));
    aliasesByOwner.set(owner, aliases);
    for (const alias of aliases) {
      if (!aliasToOwner.has(alias)) {
        aliasToOwner.set(alias, owner);
      }
    }
  }

  const users = new Map<string, SocialGraphUser>();
  const persons = new Map<string, SocialGraphPerson>();
  const ensurePerson = (handle: string, view?: person_view): SocialGraphPerson => {
    let person = persons.get(handle);
    if (!person) {
      const owner = aliasToOwner.get(handle) ?? null;
      const user = owner ? users.get(owner) : undefined;
      person = { handle, name: view?.name ?? user?.name ?? handle, avatar: view?.avatar ?? user?.avatar ?? '', url: view?.url ?? '', bio: view?.bio ?? user?.bio ?? '', followers: view?.followers ?? '', location: view?.location ?? user?.location ?? '', owner, memberships: [] };
      persons.set(handle, person);
    }
    else if (view) {
      person.name = person.name && person.name !== person.handle ? person.name : (view.name || person.name);
      person.avatar = person.avatar || view.avatar;
      person.url = person.url || view.url;
      person.bio = person.bio || view.bio;
      person.followers = person.followers || view.followers;
      person.location = person.location || view.location;
    }
    return person;
  };

  for (const [owner, document] of documentsByOwner) {
    users.set(owner, buildUser(owner, document));
  }

  const postsByMembership = new Map<string, Set<string>>();
  const postsByGroup = new Map<string, Set<string>>();
  const attachMember = (account: SocialGraphAccount, relation: SocialGraphRelation, handle: string, view: person_view, docKeys: string[]): void => {
    const groupId = `group:${account.id}:${relation}`;
    let group = account.groups.find(entry => entry.id === groupId);
    if (!group) {
      group = { id: groupId, accountId: account.id, owner: account.owner, platform: account.platform, relation, members: [], posts: 0 };
      account.groups.push(group);
    }
    const person = ensurePerson(handle, view);
    let membership = person.memberships.find(entry => entry.groupId === groupId);
    if (!membership) {
      membership = { owner: account.owner, platform: account.platform, platformHandle: account.handle, relation, accountId: account.id, groupId, posts: 0 };
      person.memberships.push(membership);
      group.members.push(handle);
    }
    if (!COUNTED_RELATIONS.has(relation)) {
      return;
    }
    const membershipKey = `${groupId}|${handle}`;
    const membershipPosts = postsByMembership.get(membershipKey) ?? new Set<string>();
    const groupPosts = postsByGroup.get(groupId) ?? new Set<string>();
    docKeys.forEach(key => {
      membershipPosts.add(key);
      groupPosts.add(key);
    });
    postsByMembership.set(membershipKey, membershipPosts);
    postsByGroup.set(groupId, groupPosts);
    membership.posts = Math.max(1, membershipPosts.size);
    group.posts = Math.max(group.posts, groupPosts.size);
  };
  for (const [owner, document] of documentsByOwner) {
    const user = users.get(owner);
    if (!user) {
      continue;
    }
    for (const profile of (document.profiles ?? []).filter(entry => platformOf(entry))) {
      const platform = platformOf(profile);
      const handle = String(profile.meta?.username || owner).replace(/^@+/, '');
      const accountId = `account:${owner}:${platform.toLowerCase()}:${normalizeHandle(handle)}`;
      let account = user.accounts.find(entry => entry.id === accountId);
      if (!account) {
        account = {
          id: accountId,
          owner,
          platform,
          handle,
          name: profile.profile_details?.real_name ?? handle,
          avatar: profile.profile_details?.avatar ?? profile.meta?.avatar ?? '',
          url: buildSocialProfileUrl(platform, handle, profile.meta?.url ?? ''),
          bio: profile.profile_details?.bio ?? '',
          followers: profile.profile_details?.total_followers ?? '',
          location: profile.profile_details?.location ?? '',
          darkweb: false,
          discovered: false,
          groups: [],
        };
        user.accounts.push(account);
      }
      for (const collection of profile.resources ?? []) {
        const relation = relationFor(collection.id);
        if (!relation) {
          continue;
        }
        for (const item of collection.resources ?? []) {
          const view = describePerson(item);
          if (!view.handle || aliasToOwner.get(view.handle) === owner) {
            continue;
          }
          attachMember(account, relation, view.handle, view, relation === 'connection' ? postUrlsOf(item) : []);
        }
      }
    }
  }

  for (const root of roots) {
    const user = users.get(root);
    if (!user) {
      continue;
    }
    for (const doc of reports.get(root) ?? []) {
      const record = asRecord(doc);
      const platform = darkwebPlatform(record);
      const docKey = darkwebDocKey(record);
      let account = user.accounts.find(entry => entry.platform.toLowerCase() === platform.toLowerCase());
      if (!account) {
        account = { id: `account:${root}:${platform.toLowerCase()}:${root}`, owner: root, platform, handle: root, name: root, avatar: '', url: '', bio: '', followers: '', location: '', darkweb: true, discovered: false, groups: [] };
        user.accounts.push(account);
      }
      account.darkweb = true;
      const channel = textOf(record.m_channel_name);
      if (channel) {
        attachMember(account, 'channel', `#${channel.replace(/\s+/g, ' ').toLowerCase()}`, { handle: '', name: channel, avatar: '', url: textOf(record.m_channel_url) || textOf(record.m_source_channel_url), bio: '', followers: '', location: '' }, [docKey]);
      }
      for (const entry of darkwebHandles(record)) {
        if (aliasToOwner.get(entry.handle) === root) {
          continue;
        }
        attachMember(account, 'mention', entry.handle, { handle: entry.handle, name: entry.name, avatar: '', url: '', bio: '', followers: '', location: '' }, [docKey]);
      }
    }
  }

  for (const root of roots) {
    const user = users.get(root);
    const person = persons.get(root);
    if (!user || user.accounts.some(account => !account.darkweb) || !person) {
      continue;
    }
    user.name = user.name || (person.name !== person.handle ? person.name : '');
    user.avatar = user.avatar || person.avatar;
    user.bio = user.bio || person.bio;
    user.location = user.location || person.location;
    for (const membership of person.memberships) {
      const key = membership.platform.toLowerCase();
      if (user.accounts.some(account => account.platform.toLowerCase() === key)) {
        continue;
      }
      user.accounts.push({ id: `account:${root}:${key}:${root}`, owner: root, platform: membership.platform, handle: root, name: person.name || root, avatar: person.avatar, url: person.url, bio: person.bio, followers: person.followers, location: person.location, darkweb: false, discovered: true, groups: [] });
    }
  }

  for (const user of users.values()) {
    for (const account of user.accounts) {
      account.groups = account.groups.filter(group => group.members.length);
      for (const group of account.groups) {
        group.posts = Math.max(group.posts, group.members.length ? 1 : 0);
        group.members.sort((left, right) => {
          const a = persons.get(left);
          const b = persons.get(right);
          if (!a || !b) {
            return left.localeCompare(right);
          }
          const postsA = a.memberships.find(entry => entry.groupId === group.id)?.posts ?? 0;
          const postsB = b.memberships.find(entry => entry.groupId === group.id)?.posts ?? 0;
          return Number(!!b.owner) - Number(!!a.owner) || postsB - postsA || b.memberships.length - a.memberships.length || a.name.localeCompare(b.name);
        });
      }
    }
  }

  const links = new Map<string, SocialGraphLink>();
  const addLink = (from: string, to: string, relation: SocialGraphRelation, platform: string): void => {
    const [first, second] = relation === 'same_handle' ? [from, to].sort() : [from, to];
    const key = `${first}|${second}|${relation}|${platform.toLowerCase()}`;
    if (links.has(key)) {
      return;
    }
    const link: SocialGraphLink = { from: first, to: second, relation, platform, directed: relation !== 'friend' && relation !== 'contact' && relation !== 'same_handle', title: '' };
    link.title = linkLabel(link);
    links.set(key, link);
  };
  for (const root of roots) {
    const rootAliases = new Set(aliasesByOwner.get(root) ?? [root]);
    for (const [owner, aliases] of aliasesByOwner) {
      if (owner !== root && aliases.some(alias => rootAliases.has(alias))) {
        addLink(root, owner, 'same_handle', '');
      }
    }
    for (const alias of rootAliases) {
      for (const membership of persons.get(alias)?.memberships ?? []) {
        if (membership.owner !== root) {
          addLink(root, membership.owner, membership.relation, membership.platform);
        }
      }
    }
  }
  for (const person of persons.values()) {
    if (!person.owner) {
      continue;
    }
    for (const membership of person.memberships) {
      if (rootSet.has(membership.owner) && person.owner !== membership.owner) {
        addLink(person.owner, membership.owner, membership.relation, membership.platform);
      }
    }
  }

  const rootUsers = roots.flatMap(root => {
    const user = users.get(root);
    return user ? [user] : [];
  });
  return {
    roots,
    hasProfiles: rootUsers.some(user => user.accounts.length > 0),
    users,
    persons,
    links: Array.from(links.values()),
  };
}

function distinctPlatforms(person: SocialGraphPerson): number {
  return new Set(person.memberships.map(membership => membership.platform.toLowerCase())).size;
}

function distinctOwners(person: SocialGraphPerson): number {
  return new Set(person.memberships.map(membership => membership.owner)).size;
}

function membershipTitle(person: SocialGraphPerson): string {
  return person.memberships.map(membership => `${RELATION_LABELS[membership.relation]} · ${membership.platform} · @${membership.owner}${membership.posts > 1 ? ` · ${membership.posts} posts` : ''}`).join('\n');
}

function userViewNode(user: SocialGraphUser, kind: 'root' | 'user', expanded: boolean): SocialGraphViewNode {
  const platforms = user.accounts.map(account => account.platform);
  return {
    id: `user:${user.owner}`,
    kind,
    label: `@${user.owner}`,
    title: [user.name && user.name !== user.owner ? `${user.name} (@${user.owner})` : `@${user.owner}`, kind === 'user' ? 'Scanned user · click to expand accounts' : 'Searched user', platforms.length ? `Platforms: ${platforms.join(', ')}` : ''].filter(Boolean).join('\n'),
    owner: user.owner,
    owners: [user.owner],
    platform: '',
    handle: user.owner,
    name: user.name || user.owner,
    avatar: user.avatar,
    url: '',
    relation: null,
    count: user.accounts.length,
    expanded,
    platformCount: platforms.length,
    ownerCount: 1,
    groupId: '',
  };
}

export function buildSocialGraphView(data: SocialUserGraphData | null, state: SocialGraphViewState): SocialGraphView {
  const nodes = new Map<string, SocialGraphViewNode>();
  const edges = new Map<string, SocialGraphViewEdge>();
  const roots = (data?.roots ?? []).map(root => data?.users.get(root)).filter((user): user is SocialGraphUser => !!user);
  if (!data || !roots.length) {
    return { nodes: [], edges: [] };
  }
  const rootSet = new Set(data.roots);
  const addEdge = (edge: SocialGraphViewEdge): void => {
    if (!edges.has(edge.id)) {
      edges.set(edge.id, edge);
    }
  };
  const ensureUser = (user: SocialGraphUser): SocialGraphViewNode => {
    const id = `user:${user.owner}`;
    let node = nodes.get(id);
    if (!node) {
      const isRoot = rootSet.has(user.owner);
      node = userViewNode(user, isRoot ? 'root' : 'user', isRoot || state.expandedUsers.has(user.owner));
      nodes.set(id, node);
    }
    return node;
  };
  const ensurePerson = (person: SocialGraphPerson): SocialGraphViewNode => {
    if (person.owner) {
      const user = data.users.get(person.owner);
      if (user) {
        return ensureUser(user);
      }
    }
    const id = personNodeId(person);
    let node = nodes.get(id);
    if (!node) {
      node = {
        id,
        kind: 'person',
        label: shorten(handleLabel(person.handle)),
        title: [person.name && person.name !== person.handle ? `${person.name} (${handleLabel(person.handle)})` : handleLabel(person.handle), membershipTitle(person)].filter(Boolean).join('\n'),
        owner: '',
        owners: [],
        platform: person.memberships[0]?.platform ?? '',
        handle: person.handle,
        name: person.name,
        avatar: person.avatar,
        url: person.url || (isChannelHandle(person.handle) ? '' : buildSocialProfileUrl(person.memberships[0]?.platform ?? '', person.handle)),
        relation: isChannelHandle(person.handle) ? 'channel' : null,
        count: person.memberships.length,
        expanded: false,
        platformCount: distinctPlatforms(person),
        ownerCount: distinctOwners(person),
        groupId: '',
      };
      nodes.set(id, node);
    }
    return node;
  };

  roots.forEach(root => ensureUser(root));
  const visibleUsers = [...roots, ...Array.from(state.expandedUsers).filter(owner => !rootSet.has(owner)).map(owner => data.users.get(owner)).filter((user): user is SocialGraphUser => !!user)];
  const visibleOwners = new Set(visibleUsers.map(user => user.owner));
  const undirected = new Set<SocialGraphRelation>(['friend', 'contact', 'same_handle']);

  const shared = Array.from(data.persons.values())
    .filter(person => !(person.owner && rootSet.has(person.owner)) && new Set(person.memberships.filter(membership => rootSet.has(membership.owner)).map(membership => membership.owner)).size >= 2)
    .sort((left, right) => distinctOwners(right) - distinctOwners(left) || right.memberships.reduce((sum, membership) => sum + membership.posts, 0) - left.memberships.reduce((sum, membership) => sum + membership.posts, 0) || left.handle.localeCompare(right.handle));

  const parent = new Map<string, string>();
  const accountKey = (owner: string, platform: string): string => `${owner}|${platform.toLowerCase()}`;
  const find = (key: string): string => {
    let current = key;
    while (parent.has(current)) {
      const next = parent.get(current);
      if (next === undefined || next === current) {
        break;
      }
      current = next;
    }
    return current;
  };
  const union = (left: string, right: string): void => {
    if (!parent.has(left) || !parent.has(right)) {
      return;
    }
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) {
      parent.set(rootLeft, rootRight);
    }
  };
  for (const user of visibleUsers) {
    for (const account of user.accounts) {
      parent.set(accountKey(user.owner, account.platform), accountKey(user.owner, account.platform));
    }
  }
  const linkedOwners = new Set<string>();
  const edgeLabels = new Map<string, string[]>();
  const edgeTitles = new Map<string, string[]>();
  const noteRelation = (owner: string, platform: string, label: string, title: string): void => {
    const key = accountKey(owner, platform);
    edgeLabels.set(key, Array.from(new Set([...(edgeLabels.get(key) ?? []), label])));
    edgeTitles.set(key, [...(edgeTitles.get(key) ?? []), title]);
  };
  for (const link of data.links) {
    if (!visibleOwners.has(link.from) || !visibleOwners.has(link.to)) {
      continue;
    }
    linkedOwners.add(`${link.from}|${link.to}`);
    linkedOwners.add(`${link.to}|${link.from}`);
    if (link.relation === 'same_handle') {
      for (const account of data.users.get(link.from)?.accounts ?? []) {
        const other = data.users.get(link.to)?.accounts.find(entry => entry.platform.toLowerCase() === account.platform.toLowerCase());
        if (other && normalizeHandle(other.handle) === normalizeHandle(account.handle)) {
          union(accountKey(link.from, account.platform), accountKey(link.to, account.platform));
          noteRelation(link.from, account.platform, `same handle as @${link.to}`, link.title);
          noteRelation(link.to, account.platform, `same handle as @${link.from}`, link.title);
        }
      }
      continue;
    }
    union(accountKey(link.from, link.platform), accountKey(link.to, link.platform));
    noteRelation(link.from, link.platform, `${relationVerb(link.relation)} @${link.to}`, link.title);
    if (undirected.has(link.relation)) {
      noteRelation(link.to, link.platform, `${relationVerb(link.relation)} @${link.from}`, link.title);
    }
  }
  for (const person of shared) {
    const byPlatform = new Map<string, string[]>();
    for (const membership of person.memberships.filter(entry => visibleOwners.has(entry.owner))) {
      const key = membership.platform.toLowerCase();
      byPlatform.set(key, Array.from(new Set([...(byPlatform.get(key) ?? []), membership.owner])));
    }
    for (const [platform, owners] of byPlatform) {
      for (const owner of owners.slice(1)) {
        union(accountKey(owners[0], platform), accountKey(owner, platform));
      }
    }
  }

  const nodeIdOf = (owner: string, platform: string): string => `platform:${platform.toLowerCase()}:${find(accountKey(owner, platform))}`;
  const accountsByNode = new Map<string, SocialGraphAccount[]>();
  for (const user of visibleUsers) {
    for (const account of user.accounts) {
      const nodeId = nodeIdOf(user.owner, account.platform);
      accountsByNode.set(nodeId, [...(accountsByNode.get(nodeId) ?? []), account]);
    }
  }
  for (const [nodeId, accounts] of accountsByNode) {
    const platform = accounts[0].platform;
    const contactTotal = accounts.reduce((sum, account) => sum + account.groups.reduce((inner, group) => inner + group.members.length, 0), 0);
    nodes.set(nodeId, {
      id: nodeId,
      kind: 'account',
      label: shorten(platform),
      title: [platform, ...accounts.map(account => `@${account.handle} · ${account.owner}${account.discovered ? ' · found as a contact' : ''}${account.darkweb ? ' · darkweb activity' : ''}`), contactTotal ? `${contactTotal} contacts` : 'No contacts fetched'].join('\n'),
      owner: accounts.length === 1 ? accounts[0].owner : '',
      owners: accounts.map(account => account.owner),
      platform,
      handle: accounts.length === 1 ? accounts[0].handle : '',
      name: platform,
      avatar: accounts.length === 1 ? accounts[0].avatar : '',
      url: accounts.length === 1 ? accounts[0].url : '',
      relation: null,
      count: contactTotal,
      expanded: true,
      platformCount: 1,
      ownerCount: accounts.length,
      groupId: '',
    });
  }
  for (const user of visibleUsers) {
    const userNode = ensureUser(user);
    for (const account of user.accounts) {
      const key = accountKey(user.owner, account.platform);
      const labels = edgeLabels.get(key) ?? [];
      const titles = edgeTitles.get(key) ?? [];
      const target = nodeIdOf(user.owner, account.platform);
      addEdge({ id: `${userNode.id}>${target}`, from: userNode.id, to: target, kind: 'account', relation: null, platform: account.platform, directed: true, dashed: false, weight: labels.length, label: labels.length <= 2 ? labels.join(' | ') : `${labels.length} relations`, title: [`@${account.handle} on ${account.platform}`, ...titles].join('\n') });
    }
  }

  const sharedShown = shared.slice(0, (state.groupPages.get(SHARED_PAGE_KEY) ?? 1) * state.chunkSize);
  const viaEdges = new Set<string>();
  for (const person of sharedShown) {
    const personNode = ensurePerson(person);
    const byOwner = new Map<string, typeof person.memberships>();
    for (const membership of person.memberships.filter(entry => rootSet.has(entry.owner))) {
      byOwner.set(membership.owner, [...(byOwner.get(membership.owner) ?? []), membership]);
    }
    for (const [owner, memberships] of byOwner) {
      viaEdges.add(`${person.handle}|${owner}`);
      const labels = Array.from(new Set(memberships.map(membership => `${relationVerb(membership.relation)} · ${membership.platform}`)));
      const posts = memberships.reduce((sum, membership) => sum + membership.posts, 0);
      addEdge({ id: `via:${personNode.id}>user:${owner}`, from: personNode.id, to: `user:${owner}`, kind: 'link', relation: memberships[0].relation, platform: memberships[0].platform, directed: memberships.every(membership => !undirected.has(membership.relation)), dashed: true, weight: posts, label: labels.length <= 2 ? labels.join(' | ') : `${labels.length} relations`, title: memberships.map(membership => `${person.name || person.handle} ${relationVerb(membership.relation)} @${owner} on ${membership.platform}${membership.posts > 1 ? ` · ${membership.posts} posts` : ''}`).join('\n') });
    }
  }
  if (shared.length > sharedShown.length) {
    const remaining = shared.length - sharedShown.length;
    const moreId = `more:${SHARED_PAGE_KEY}`;
    nodes.set(moreId, { id: moreId, kind: 'more', label: `+${Math.min(state.chunkSize, remaining)} shared contacts (${remaining})`, title: `${remaining} more contacts shared between the users in this graph`, owner: '', owners: [], platform: '', handle: '', name: '', avatar: '', url: '', relation: null, count: remaining, expanded: false, platformCount: 1, ownerCount: 0, groupId: SHARED_PAGE_KEY });
    for (const root of roots) {
      addEdge({ id: `${moreId}>user:${root.owner}`, from: moreId, to: `user:${root.owner}`, kind: 'member', relation: null, platform: '', directed: false, dashed: true, weight: 0, label: '', title: '' });
    }
  }

  for (const user of visibleUsers) {
    for (const account of user.accounts) {
      for (const group of account.groups) {
        const expanded = state.expandedGroups.has(group.id);
        nodes.set(group.id, {
          id: group.id,
          kind: 'group',
          label: `${RELATION_LABELS[group.relation]} · ${group.members.length}`,
          title: [`${group.members.length} ${RELATION_LABELS[group.relation].toLowerCase()} of @${account.handle} on ${account.platform}`, group.relation === 'connection' ? `${group.posts} posts with comments` : (COUNTED_RELATIONS.has(group.relation) ? `${group.posts} messages` : ''), `Click to ${expanded ? 'collapse' : 'expand'}`].filter(Boolean).join('\n'),
          owner: user.owner,
          owners: [user.owner],
          platform: account.platform,
          handle: account.handle,
          name: RELATION_LABELS[group.relation],
          avatar: '',
          url: '',
          relation: group.relation,
          count: group.members.length,
          expanded,
          platformCount: 1,
          ownerCount: 1,
          groupId: group.id,
        });
        addEdge({ id: `${nodeIdOf(user.owner, account.platform)}>${group.id}`, from: nodeIdOf(user.owner, account.platform), to: group.id, kind: 'group', relation: group.relation, platform: account.platform, directed: false, dashed: false, weight: 0, label: '', title: '' });
        if (!expanded) {
          continue;
        }
        const page = state.groupPages.get(group.id) ?? 1;
        const shown = group.members.slice(0, page * state.chunkSize);
        const shownSet = new Set(shown);
        const pinned = group.members.filter(handle => state.pinned.has(handle) && !shownSet.has(handle));
        for (const handle of [...shown, ...pinned]) {
          const person = data.persons.get(handle);
          if (!person) {
            continue;
          }
          if (viaEdges.has(`${handle}|${user.owner}`) || (person.owner && linkedOwners.has(`${user.owner}|${person.owner}`))) {
            continue;
          }
          const personNode = ensurePerson(person);
          const posts = person.memberships.find(membership => membership.groupId === group.id)?.posts ?? 0;
          const unit = group.relation === 'connection' ? (posts === 1 ? 'post commented on' : 'posts commented on') : (posts === 1 ? 'message' : 'messages');
          addEdge({ id: `${group.id}>${personNode.id}`, from: group.id, to: personNode.id, kind: 'member', relation: group.relation, platform: account.platform, directed: false, dashed: false, weight: posts, label: posts > 1 ? String(posts) : '', title: [`${person.name || handle} · ${RELATION_LABELS[group.relation]} · ${account.platform}`, posts > 0 ? `${posts} ${unit}` : ''].filter(Boolean).join('\n') });
        }
        const remaining = group.members.length - shown.length - pinned.length;
        if (remaining > 0) {
          const moreId = `more:${group.id}`;
          nodes.set(moreId, {
            id: moreId,
            kind: 'more',
            label: `+${Math.min(state.chunkSize, remaining)} more (${remaining})`,
            title: `Show ${Math.min(state.chunkSize, remaining)} more of ${remaining} remaining`,
            owner: user.owner,
            owners: [user.owner],
            platform: account.platform,
            handle: '',
            name: '',
            avatar: '',
            url: '',
            relation: group.relation,
            count: remaining,
            expanded: false,
            platformCount: 1,
            ownerCount: 1,
            groupId: group.id,
          });
          addEdge({ id: `${group.id}>${moreId}`, from: group.id, to: moreId, kind: 'member', relation: group.relation, platform: account.platform, directed: false, dashed: true, weight: 0, label: '', title: '' });
        }
      }
    }
  }

  return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()) };
}

function escapeSvgText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function iconInner(name: string): string {
  const def = bootstrapIconRegistry[name as keyof typeof bootstrapIconRegistry];
  return def ? `<g transform="translate(4 4) scale(0.5)" fill="#f8fafc">${def.markup}</g>` : '';
}

function textInner(text: string, size = 5.3): string {
  return `<text x="8" y="8.2" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="${size}" font-weight="800" fill="#f8fafc">${escapeSvgText(text)}</text>`;
}

function imageInner(dataUrl: string): string {
  return `<image href="${dataUrl}" x="3.6" y="3.6" width="8.8" height="8.8"/>`;
}

function ringStroke(size: number, viewBox: number, scale = 1): string {
  return (RING_PX * scale * viewBox / (size * 2)).toFixed(2);
}

function circleIconSvg(accent: string, inner: string, size: number, ring = accent, ringScale = 1): string {
  const stroke = ringStroke(size, 16, ringScale);
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="${(8 - Number(stroke) / 2).toFixed(2)}" fill="${NODE_FILL}" stroke="${ring}" stroke-width="${stroke}"/>${inner}</svg>`);
}

function groupBadgeSvg(count: number, accent: string, expanded: boolean, size: number, ringOverride?: string, ringScale = 1): string {
  const ring = ringOverride ?? (expanded ? NODE_FOCUS : accent);
  const stroke = ringStroke(size, 160, ringScale);
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><circle cx="80" cy="80" r="${(80 - Number(stroke) / 2).toFixed(2)}" fill="${NODE_FILL}" stroke="${ring}" stroke-width="${stroke}"/><text x="80" y="82" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="${count >= 1000 ? 34 : 44}" font-weight="800" fill="#f1f5f9">${count}</text></svg>`);
}

function nodeAcronym(node: SocialGraphViewNode): string {
  return (node.name || node.handle || '?').replace(/^@+/, '').split(/[\s._-]+/).map(part => part.charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
}

function personAccent(node: SocialGraphViewNode, dark: boolean): string {
  if (node.ownerCount > 1) {
    return KIND_COLORS.shared;
  }
  if (node.platformCount > 1) {
    return KIND_COLORS.multi;
  }
  return dark ? '#94a3b8' : '#64748b';
}

function readablePlatformColor(color: string | undefined, dark: boolean): string | undefined {
  if (!color || !dark) {
    return color;
  }
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) {
    return color;
  }
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 255000;
  return luminance < 0.18 ? '#94a3b8' : color;
}

export function toVisNode(node: SocialGraphViewNode, options: SocialGraphVisualOptions): SocialGraphVisNode {
  const highlighted = options.highlighted.has(node.id);
  const scanning = options.scanning.has(node.id);
  const ring = highlighted ? NODE_FOCUS : (scanning ? NODE_SCAN : undefined);
  const ringScale = highlighted ? FOCUS_RING_SCALE : 1;
  const emphasis = (visNode: SocialGraphVisNode): SocialGraphVisNode => {
    const label = scanning && visNode.label ? `${visNode.label} · scanning` : visNode.label;
    return highlighted ? { ...visNode, label, shadow: { enabled: true, color: 'rgba(250, 204, 21, 0.45)', size: 16, x: 0, y: 0 } } : { ...visNode, label };
  };
  const font = { color: options.labelColor, size: 14, face: 'Inter, sans-serif', strokeWidth: 0 };
  const base: SocialGraphVisNode = { id: node.id, label: node.label, title: node.title, shape: 'circularImage', borderWidth: 0, borderWidthSelected: 0, size: 26, font, color: { border: 'transparent', background: NODE_FILL, highlight: { border: NODE_FOCUS, background: NODE_FILL }, hover: { border: '#a5b4fc', background: NODE_FILL } } };
  if (node.kind === 'root') {
    return emphasis({ ...base, image: circleIconSvg(NODE_ROOT, iconInner('bi-person-fill'), 44, ring ?? NODE_ROOT, ringScale), size: 44, font: { ...font, size: 16, bold: { color: options.labelColor, size: 16, face: 'Inter, sans-serif', mod: 'bold' } } });
  }
  if (node.kind === 'user') {
    return emphasis({ ...base, image: circleIconSvg(KIND_COLORS.user, iconInner('bi-person-badge-fill'), node.expanded ? 38 : 34, ring ?? (node.expanded ? NODE_FOCUS : KIND_COLORS.user), ringScale), size: node.expanded ? 38 : 34 });
  }
  if (node.kind === 'account') {
    const accent = readablePlatformColor(options.colors.get(node.platform.toLowerCase()), options.dark) ?? '#818cf8';
    const icon = options.icons.get(node.platform.toLowerCase());
    return emphasis({ ...base, image: circleIconSvg(accent, icon ? imageInner(icon) : textInner(node.platform.slice(0, 2).toUpperCase()), 36, ring, ringScale), size: 36 });
  }
  if (node.kind === 'group') {
    const accent = RELATION_COLORS[node.relation ?? 'contact'];
    return emphasis({ ...base, image: groupBadgeSvg(node.count, accent, node.expanded, node.expanded ? 44 : 40, ring, ringScale), size: node.expanded ? 44 : 40, font: { ...font, size: 12 } });
  }
  if (node.kind === 'more') {
    return { ...base, label: '', image: circleIconSvg('#94a3b8', textInner(`+${node.count}`, 4.6), 22), size: 22 };
  }
  if (node.relation === 'channel') {
    return emphasis({ ...base, image: circleIconSvg(RELATION_COLORS.channel, iconInner('bi-broadcast-pin'), 26 + Math.min(node.count, 5) * 2, ring, ringScale), size: 26 + Math.min(node.count, 5) * 2, font: { ...font, size: 12 } });
  }
  const accent = personAccent(node, options.dark);
  return emphasis({ ...base, image: circleIconSvg(accent, node.count > 1 ? textInner(nodeAcronym(node)) : iconInner('bi-person'), 24 + Math.min(node.count, 5) * 2, ring, ringScale), size: 24 + Math.min(node.count, 5) * 2, font: { ...font, size: 12 } });
}

export function toVisEdge(edge: SocialGraphViewEdge, options: SocialGraphVisualOptions): SocialGraphVisEdge {
  const platformColor = readablePlatformColor(options.colors.get(edge.platform.toLowerCase()), options.dark);
  const relationColor = edge.relation ? RELATION_COLORS[edge.relation] : '#94a3b8';
  const defaultColor = options.dark ? 'rgba(148, 163, 184, 0.55)' : 'rgba(71, 85, 105, 0.65)';
  const color = edge.kind === 'account' ? (platformColor ?? '#818cf8') : (edge.kind === 'link' ? KIND_COLORS.user : (edge.kind === 'member' ? `${relationColor}99` : defaultColor));
  const width = edge.kind === 'account' ? 2 : (edge.weight > 1 ? Math.min(1.5 + (edge.weight - 1) * 0.6, 5) : 1.5);
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    title: edge.title || undefined,
    label: edge.label || undefined,
    dashes: edge.dashed,
    width,
    arrows: { to: { enabled: edge.directed, scaleFactor: 0.65 } },
    color: { color, highlight: '#a78bfa', hover: '#d1d5db' },
    font: { color: options.labelColor, size: 11, face: 'Inter, sans-serif', strokeWidth: 0, align: 'middle', background: options.dark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)' },
  };
}
