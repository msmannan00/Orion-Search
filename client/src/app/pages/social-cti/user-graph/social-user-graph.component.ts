import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { DataSet } from 'vis-data';
import { Network, type Options } from 'vis-network';
import { SocialIconComponent } from '../../../shared/partials/social-icon/social-icon.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ensureStylesheet } from '../../../shared/utils/ensure-stylesheet.util';
import { getInputValue } from '../../../shared/utils/event-input.util';
import type { Nullable } from '../../../shared/utils/type-guards.util';
import { RELATION_COLORS, RELATION_LABELS } from '../constants/social-graph.constants';
import type { SocialGraphAccount, SocialGraphView, SocialGraphVisEdge, SocialGraphVisNode, SocialGraphVisualOptions, SocialUserGraphData } from '../models/social-user-graph.models';
import type { db_social_model } from '../models/social.models';
import { SocialStorageService } from '../services/social-storage.service';
import { SocialUserGraphService } from '../services/social-user-graph.service';
import { SocialService } from '../services/social.service';
import { applyImageFallback } from '../utils/image-fallback.util';
import { buildSocialGraphView, buildSocialUserGraph, handleLabel, isChannelHandle, linkLabel, normalizeHandle, parseHandleList, relationVerb, toVisEdge, toVisNode } from '../utils/social-user-graph.util';
import type { account_view, context_menu_view, detail_view, find_match, membership_view } from './model/social-user-graph.model';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';

export type { account_view,context_menu_view,detail_view,find_match,group_view,link_view,membership_view } from './model/social-user-graph.model';


const MAX_SCANNED_USERS = 1000;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const VIEW_MARGIN = 80;















@Component({
  selector: 'app-social-user-graph',
  templateUrl: './social-user-graph.component.html',
  standalone: true,
  imports: [SocialIconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialUserGraphComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly graphService = inject(SocialUserGraphService);
  private readonly socialService = inject(SocialService);
  private readonly storageService = inject(SocialStorageService);
  private readonly graphContainer = viewChild<ElementRef<HTMLDivElement>>('graphContainer');
  private readonly isDark = signal(!document.body.classList.contains('light-theme'));
  private readonly labelColor = signal(this.readLabelColor());
  private readonly platformIcons = signal<ReadonlyMap<string, string>>(new Map());
  private readonly platformColors = signal<ReadonlyMap<string, string>>(new Map());
  private readonly reports = signal<ReadonlyMap<string, Record<string, unknown>[]>>(new Map());
  private readonly reportsLoading = signal(false);
  private readonly documentsState = signal<db_social_model[]>([]);
  private readonly documentsLoading = signal(false);
  private runningJobs = '';
  private documentRequest = 0;
  private readonly selectedId = signal<string | null>(null);
  private readonly highlightedId = signal<string | null>(null);
  private readonly pendingScans = signal<Map<string, string>>(new Map<string, string>());
  private readonly themeObserver = new MutationObserver(this.onThemeChanged.bind(this));
  private network: Nullable<Network> = null;
  private nodeSet: Nullable<DataSet<SocialGraphVisNode>> = null;
  private edgeSet: Nullable<DataSet<SocialGraphVisEdge>> = null;
  private pendingFocusId: string | null = null;
  private reportRequest = 0;
  private copiedTimeout: ReturnType<typeof setTimeout> | undefined;
  private noticeTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly resetOnRoots = effect(() => {
    const roots = this.roots();
    untracked(() => {
      this.selectedId.set(null);
      this.panelVisible.set(false);
      this.contextMenu.set(null);
      this.highlightedId.set(null);
      this.expandedUsers.set(new Set<string>());
      this.expandedGroups.set(new Set<string>());
      this.groupPages.set(new Map<string, number>());
      this.pinned.set(new Set<string>());
      this.pendingFocusId = roots.length ? `user:${roots[roots.length - 1]}` : null;
      this.fetchDocuments(roots);
      this.fetchReports(roots);
    });
  });
  private readonly syncPalette = effect(() => {
    const data = this.graph();
    if (!data) {
      return;
    }
    const platforms = Array.from(new Set(Array.from(data.users.values()).flatMap(user => user.accounts.map(account => account.platform))));
    untracked(() => {
      const known = this.platformIcons();
      const fresh = platforms.filter(platform => !known.has(platform.toLowerCase()));
      this.platformColors.set(this.graphService.platformColors(platforms));
      if (fresh.length) {
        void this.graphService.resolvePlatformIcons(fresh).then(icons => {
          this.platformIcons.update(current => new Map([...current, ...icons]));
        });
      }
    });
  });
  private readonly watchScans = effect(() => {
    const pending = this.pendingScans();
    const jobs = this.storageService.state.jobs();
    const running = jobs.filter(job => job.status === 'in_progress' || job.status === 'queued').map(job => job.id);
    const ended = this.runningJobs.split(',').filter(id => id && !running.includes(id));
    this.runningJobs = running.join(',');
    const finished = Array.from(pending.keys()).filter(id => !running.includes(id));
    untracked(() => {
      if (finished.length) {
        this.pendingScans.set(new Map(Array.from(pending.entries()).filter(([id]) => !finished.includes(id))));
        this.showNotice(`Scan finished for ${finished.map(id => `@${String(id)}`).join(', ')}`);
      }
      if (ended.length && this.hasRoots()) {
        this.fetchDocuments(this.roots());
        this.fetchReports(this.roots(), true);
      }
    });
  });
  private readonly syncNetwork = effect(() => {
    const container = this.graphContainer()?.nativeElement;
    const view = this.view();
    const options: SocialGraphVisualOptions = { dark: this.isDark(), labelColor: this.labelColor(), icons: this.platformIcons(), colors: this.platformColors(), highlighted: new Set(this.highlightedId() ? [this.highlightedId() as string] : []), scanning: this.scanningNodeIds() };
    if (!container) {
      return;
    }
    untracked(() => {
      this.renderNetwork(container, view, options);
    });
  });

  usernames = input<string[]>([]);
  loading = input(false);
  usernamesChange = output<string[]>();
  readonly roots = computed(() => parseHandleList(this.usernames()));
  readonly hasRoots = computed(() => this.roots().length > 0);
  readonly rootsLabel = computed(() => this.roots().map(root => `@${root}`).join(', '));
  readonly documents = computed<db_social_model[]>(() => {
    const fetched = this.documentsState();
    if (fetched.length) {
      return fetched.slice(0, MAX_SCANNED_USERS);
    }
    return Array.from(this.storageService.state.scanResults().entries()).slice(0, MAX_SCANNED_USERS).map(([username, profiles]) => ({ user_id: '', profile_username: username, profiles, config: { disallowed: [] }, scan: { progress: 0, cancel_requested: false } }));
  });
  readonly graph = computed<SocialUserGraphData | null>(() => this.hasRoots() ? buildSocialUserGraph(this.roots(), new Map(), this.documents(), this.reports()) : null);
  readonly hasGraph = computed(() => !!this.graph()?.hasProfiles);
  readonly busy = computed(() => this.loading() || this.reportsLoading() || this.documentsLoading());
  readonly layoutProgress = signal(100);
  readonly layoutReady = signal(false);
  readonly copied = signal(false);
  readonly notice = signal('');
  readonly expandedUsers = signal<Set<string>>(new Set<string>());
  readonly expandedGroups = signal<Set<string>>(new Set<string>());
  readonly groupPages = signal<Map<string, number>>(new Map<string, number>());
  readonly pinned = signal<Set<string>>(new Set<string>());
  readonly chunkSize = signal(20);
  readonly panelVisible = signal(false);
  readonly panelLeft = signal(12);
  readonly panelTop = signal(12);
  readonly contextMenu = signal<context_menu_view | null>(null);
  readonly findTerm = signal('');
  readonly findHandle = computed(() => normalizeHandle(this.findTerm()));
  readonly findMatches = computed<find_match[]>(() => {
    const data = this.graph();
    const term = this.findTerm().trim().replace(/^@+/, '').toLowerCase();
    if (!data || !term) {
      return [];
    }
    return data.roots
      .map(root => ({ root, user: data.users.get(root) }))
      .filter(({ root, user }) => root.includes(term) || (user?.name ?? '').toLowerCase().includes(term))
      .map(({ root, user }) => ({ nodeId: `user:${root}`, handle: root, name: user?.name ?? '' }))
      .sort((left, right) => Number(right.handle === term) - Number(left.handle === term) || left.handle.localeCompare(right.handle))
      .slice(0, 8);
  });
  readonly canAddFind = computed(() => {
    const handle = this.findHandle();
    return !!handle && !isChannelHandle(handle) && !this.roots().includes(handle);
  });
  readonly relationColors = RELATION_COLORS;
  readonly onImageError = applyImageFallback;
  readonly handleLabel = handleLabel;
  readonly scanningNodeIds = computed<ReadonlySet<string>>(() => new Set(Array.from(this.pendingScans().entries()).flatMap(([username, nodeId]) => [nodeId, `person:${username}`, `user:${username}`])));
  readonly view = computed<SocialGraphView>(() => buildSocialGraphView(this.graph(), {
    expandedUsers: this.expandedUsers(),
    expandedGroups: this.expandedGroups(),
    groupPages: this.groupPages(),
    pinned: this.pinned(),
    chunkSize: this.chunkSize(),
  }));
  readonly detail = computed<detail_view | null>(() => {
    const id = this.selectedId();
    const data = this.graph();
    if (!id || !data) {
      return null;
    }
    return this.buildDetail(id, data);
  });

  constructor() {
    ensureStylesheet('/assets/libs/vis-network.css', 'vis-network-styles');
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    this.destroyRef.onDestroy(() => {
      this.themeObserver.disconnect();
      clearTimeout(this.copiedTimeout);
      clearTimeout(this.noticeTimeout);
      this.network?.destroy();
      this.network = null;
    });
  }

  onFindInput(event: Event): void {
    this.findTerm.set(getInputValue(event));
  }

  clearFind(): void {
    this.findTerm.set('');
  }

  onFindSubmit(): void {
    const handle = this.findHandle();
    const exact = this.findMatches().find(match => match.handle === handle) ?? this.findMatches()[0];
    if (exact && (exact.handle === handle || !this.canAddFind())) {
      this.pickFind(exact);
      return;
    }
    if (this.canAddFind()) {
      this.findTerm.set('');
      this.addUser(handle);
    }
  }

  pickFind(match: find_match): void {
    this.findTerm.set('');
    this.revealNode(match.nodeId);
  }

  addUser(handle: string): void {
    const normalized = normalizeHandle(handle);
    if (!normalized || isChannelHandle(normalized)) {
      return;
    }
    if (this.roots().includes(normalized)) {
      this.revealNode(`user:${normalized}`);
      return;
    }
    this.usernamesChange.emit([...this.roots(), normalized]);
  }

  removeUser(handle: string): void {
    this.usernamesChange.emit(this.roots().filter(root => root !== handle));
  }

  isRoot(handle: string): boolean {
    return this.roots().includes(handle);
  }

  hidePanel(): void {
    this.panelVisible.set(false);
  }

  runContextMenu(): void {
    const menu = this.contextMenu();
    this.contextMenu.set(null);
    if (!menu) {
      return;
    }
    if (menu.action === 'remove') {
      this.removeUser(menu.handle);
      return;
    }
    this.scanPerson(menu.handle, menu.nodeId);
  }

  focusNode(id: string): void {
    this.selectedId.set(id);
    this.panelVisible.set(true);
    this.panelLeft.set(12);
    this.panelTop.set(12);
    if (this.nodeSet?.get(id)) {
      this.network?.selectNodes([id]);
      this.network?.focus(id, { animation: false });
      return;
    }
    this.pendingFocusId = id;
  }

  revealNode(id: string): void {
    const data = this.graph();
    if (!data) {
      return;
    }
    if (id.startsWith('account:')) {
      const account = this.findAccount(id);
      this.ensureUserExpanded(id.split(':')[1] ?? '');
      const target = account ? this.platformNodeFor(account) : id;
      this.highlightedId.set(target);
      this.focusNode(target);
      return;
    }
    this.highlightedId.set(id.startsWith('more:') ? null : id);
    if (id.startsWith('platform:')) {
      this.focusNode(id);
      return;
    }
    else if (id.startsWith('group:')) {
      this.revealGroup(id);
    }
    else if (!id.startsWith('more:')) {
      const handle = id.startsWith('user:') ? id.slice(5) : id.slice(7);
      const person = data.persons.get(handle);
      for (const membership of person?.memberships ?? []) {
        this.revealGroup(membership.groupId);
      }
      if (person) {
        this.pinned.update(current => new Set(current).add(person.handle));
      }
    }
    this.focusNode(id);
  }

  toggleGroup(id: string): void {
    this.expandedGroups.update(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      }
      else {
        next.add(id);
      }
      return next;
    });
    this.selectedId.set(id);
  }

  showMore(groupId: string): void {
    this.groupPages.update(current => new Map(current).set(groupId, (current.get(groupId) ?? 1) + 1));
  }

  toggleUser(owner: string): void {
    if (this.isRoot(owner)) {
      return;
    }
    this.expandedUsers.update(current => {
      const next = new Set(current);
      if (next.has(owner)) {
        next.delete(owner);
      }
      else {
        next.add(owner);
      }
      return next;
    });
    this.selectedId.set(`user:${owner}`);
  }

  openUrl(url: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  scanPerson(handle: string, nodeId = ''): void {
    const username = normalizeHandle(handle);
    if (!username || isChannelHandle(username)) {
      return;
    }
    const started = this.socialService.initiateScan(username, this.destroyRef);
    if (started) {
      this.pendingScans.update(current => new Map(current).set(username, nodeId));
      this.storageService.state.isHomeMenuCollapsed.set(false);
      this.showNotice(`Scan started for @${username} · progress is in the sidebar`);
    }
    else {
      this.showNotice(`A scan for @${username} is already running`);
    }
  }

  isScanPending(handle: string): boolean {
    return this.pendingScans().has(normalizeHandle(handle));
  }

  isNodeScanning(nodeId: string): boolean {
    return this.scanningNodeIds().has(nodeId);
  }

  copyText(value: string): void {
    if (!value) {
      return;
    }
    void navigator.clipboard?.writeText(value).then(() => {
      this.copied.set(true);
      clearTimeout(this.copiedTimeout);
      this.copiedTimeout = setTimeout(() => {
        this.copied.set(false);
      }, 1500);
    });
  }

  kindLabel(kind: string): string {
    const labels: Record<string, string> = { root: 'Searched user', account: 'Platform account', group: 'Contact group', user: 'Scanned user', person: 'Contact', more: 'More' };
    return getOwnProperty(labels, kind) ?? kind;
  }

  private fetchDocuments(roots: string[]): void {
    const request = ++this.documentRequest;
    if (!roots.length) {
      this.documentsState.set([]);
      this.documentsLoading.set(false);
      return;
    }
    this.documentsLoading.set(true);
    this.graphService.loadDocuments(roots).pipe(finalize(() => {
      if (request === this.documentRequest) {
        this.documentsLoading.set(false);
      }
    }), takeUntilDestroyed(this.destroyRef)).subscribe(documents => {
      if (request === this.documentRequest) {
        this.documentsState.set(documents);
      }
    });
  }

  private fetchReports(roots: string[], force = false): void {
    const request = ++this.reportRequest;
    if (!roots.length) {
      this.reports.set(new Map());
      this.reportsLoading.set(false);
      return;
    }
    this.reportsLoading.set(true);
    this.graphService.loadReports(roots, force).pipe(finalize(() => {
      if (request === this.reportRequest) {
        this.reportsLoading.set(false);
      }
    }), takeUntilDestroyed(this.destroyRef)).subscribe(reports => {
      if (request === this.reportRequest) {
        this.reports.set(reports);
      }
    });
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    clearTimeout(this.noticeTimeout);
    this.noticeTimeout = setTimeout(() => {
      this.notice.set('');
    }, 3500);
  }

  private readLabelColor(): string {
    const bodyColor = getComputedStyle(document.body).getPropertyValue('--color-text1').trim();
    return bodyColor || getComputedStyle(document.documentElement).getPropertyValue('--color-text1').trim() || '#e5e7eb';
  }

  private onThemeChanged(): void {
    this.isDark.set(!document.body.classList.contains('light-theme'));
    this.labelColor.set(this.readLabelColor());
  }

  private ensureUserExpanded(owner: string): void {
    if (owner && !this.isRoot(owner) && !this.expandedUsers().has(owner)) {
      this.expandedUsers.update(current => new Set(current).add(owner));
    }
  }

  private revealGroup(groupId: string): void {
    this.ensureUserExpanded(groupId.split(':')[2] ?? '');
    this.expandedGroups.update(current => new Set(current).add(groupId));
  }

  private findAccount(accountId: string): SocialGraphAccount | undefined {
    for (const user of this.graph()?.users.values() ?? []) {
      const account = user.accounts.find(entry => entry.id === accountId);
      if (account) {
        return account;
      }
    }
    return undefined;
  }

  private platformNodeFor(account: SocialGraphAccount): string {
    return this.view().nodes.find(node => node.kind === 'account' && node.platform.toLowerCase() === account.platform.toLowerCase() && node.owners.includes(account.owner))?.id ?? '';
  }

  private toAccountView(account: SocialGraphAccount): account_view {
    return { id: account.id, nodeId: this.platformNodeFor(account), owner: account.owner, platform: account.platform, handle: account.handle, url: account.url, contacts: account.groups.reduce((sum, group) => sum + group.members.length, 0), discovered: account.discovered };
  }

  private buildDetail(id: string, data: SocialUserGraphData): detail_view | null {
    const empty: detail_view = { nodeId: id, kind: 'person', title: '', handle: '', platform: '', owner: '', avatar: '', bio: '', followers: '', location: '', url: '', expanded: false, connected: true, scanned: false, scanQuery: '', addable: false, memberships: [], accounts: [], groups: [], links: [] };
    const membershipViews = (handle: string): membership_view[] => (data.persons.get(handle)?.memberships ?? []).map(membership => ({ platform: membership.platform, relation: `${relationVerb(membership.relation)} @${membership.platformHandle}`, owner: membership.owner, groupId: membership.groupId, posts: membership.posts }));
    const expanded = this.expandedGroups();
    if (id.startsWith('user:')) {
      const owner = id.slice(5);
      const user = data.users.get(owner);
      if (!user) {
        return null;
      }
      const isRoot = data.roots.includes(owner);
      const scannedAccount = user.accounts.find(account => !account.discovered);
      const links = data.links.filter(link => link.from === owner || link.to === owner).map(link => ({ label: linkLabel(link), title: link.title }));
      return { ...empty, kind: isRoot ? 'root' : 'user', title: user.name || owner, handle: owner, owner, avatar: user.avatar, bio: user.bio, location: user.location, url: scannedAccount ? '' : (user.accounts[0]?.url ?? ''), expanded: isRoot || this.expandedUsers().has(owner), connected: isRoot || links.length > 0 || (data.persons.get(owner)?.memberships.length ?? 0) > 0, scanned: !!scannedAccount, scanQuery: scannedAccount ? '' : owner, addable: !isRoot, memberships: membershipViews(owner), accounts: user.accounts.map(account => this.toAccountView(account)), links };
    }
    if (id.startsWith('platform:')) {
      const node = this.view().nodes.find(entry => entry.id === id);
      const accounts = node ? node.owners.flatMap(owner => (data.users.get(owner)?.accounts ?? []).filter(account => account.platform.toLowerCase() === node.platform.toLowerCase())) : [];
      const first = accounts[0];
      if (!first) {
        return null;
      }
      const single = accounts.length === 1 ? first : null;
      return { ...empty, kind: 'account', title: single ? (single.name || single.handle) : first.platform, handle: single?.handle ?? '', platform: first.platform, owner: single?.owner ?? '', avatar: single?.avatar ?? '', bio: single?.bio ?? '', followers: single?.followers ?? '', location: single?.location ?? '', url: single?.url ?? '', expanded: true, scanned: accounts.some(account => !account.discovered), scanQuery: single?.discovered ? single.owner : '', accounts: accounts.map(account => this.toAccountView(account)), groups: accounts.flatMap(account => account.groups.map(group => ({ id: group.id, relation: group.relation, label: `@${account.owner} · ${RELATION_LABELS[group.relation]}`, count: group.members.length, posts: group.relation === 'connection' ? group.posts : 0, expanded: expanded.has(group.id) }))) };
    }
    if (id.startsWith('group:')) {
      const account = this.findAccount(id.replace(/^group:/, '').replace(/:[^:]+$/, ''));
      const group = account?.groups.find(entry => entry.id === id);
      if (!account || !group) {
        return null;
      }
      return { ...empty, kind: 'group', title: `${RELATION_LABELS[group.relation]} · ${group.members.length}`, handle: account.handle, platform: account.platform, owner: account.owner, expanded: expanded.has(id), scanned: true, groups: [{ id, relation: group.relation, label: RELATION_LABELS[group.relation], count: group.members.length, posts: group.relation === 'connection' ? group.posts : 0, expanded: expanded.has(id) }] };
    }
    if (id.startsWith('person:')) {
      const person = data.persons.get(id.slice(7));
      if (!person) {
        return null;
      }
      const channel = isChannelHandle(person.handle);
      return { ...empty, kind: 'person', title: person.name || person.handle, handle: person.handle, platform: person.memberships[0]?.platform ?? '', avatar: person.avatar, bio: person.bio, followers: person.followers, location: person.location, url: person.url, connected: person.memberships.length > 0, scanned: false, scanQuery: channel ? '' : person.handle, addable: !channel, memberships: membershipViews(person.handle) };
    }
    return null;
  }

  private renderNetwork(container: HTMLDivElement, view: SocialGraphView, options: SocialGraphVisualOptions): void {
    const visNodes = view.nodes.map(node => toVisNode(node, options));
    const visEdges = view.edges.map(edge => toVisEdge(edge, options));
    if (!this.network || !this.nodeSet || !this.edgeSet) {
      this.nodeSet = new DataSet<SocialGraphVisNode>(visNodes);
      this.edgeSet = new DataSet<SocialGraphVisEdge>(visEdges);
      this.network = new Network(container, { nodes: this.nodeSet, edges: this.edgeSet }, this.buildOptions());
      container.addEventListener('contextmenu', event => {
        event.preventDefault();
      });
      this.attachHandlers(this.network);
      this.awaitSettle(true);
      return;
    }
    const existing = new Set(this.nodeSet.getIds().map(String));
    const incomingIds = new Set(visNodes.map(node => node.id));
    const positions = this.network.getPositions();
    const removedEdges = this.edgeSet.getIds().filter(id => !visEdges.some(edge => edge.id === id));
    const removedNodes = this.nodeSet.getIds().filter(id => !incomingIds.has(String(id)));
    if (removedEdges.length) {
      this.edgeSet.remove(removedEdges);
    }
    if (removedNodes.length) {
      this.nodeSet.remove(removedNodes);
    }
    const added = visNodes.filter(node => !existing.has(node.id));
    this.nodeSet.update(visNodes);
    this.edgeSet.update(visEdges);
    for (const node of added) {
      const parentEdge = visEdges.find(edge => (edge.to === node.id && existing.has(String(edge.from))) || (edge.from === node.id && existing.has(String(edge.to))));
      const parentId = parentEdge ? String(parentEdge.to === node.id ? parentEdge.from : parentEdge.to) : '';
      const anchor = parentId ? getOwnProperty(positions, parentId) : undefined;
      if (anchor) {
        this.network.moveNode(node.id, anchor.x + (Math.random() - 0.5) * 140, anchor.y + (Math.random() - 0.5) * 140);
      }
    }
    if (added.length || removedNodes.length) {
      this.awaitSettle(false);
    }
    else {
      this.applyPendingFocus();
    }
  }

  private awaitSettle(initial: boolean): void {
    if (!this.network) {
      return;
    }
    this.layoutReady.set(false);
    if (initial) {
      this.layoutProgress.set(0);
    }
    this.network.once('stabilized', () => {
      this.layoutProgress.set(100);
      this.applyPendingFocus();
      this.layoutReady.set(true);
    });
  }

  private applyPendingFocus(): void {
    const id = this.pendingFocusId;
    if (!id || !this.network || !this.nodeSet?.get(id)) {
      return;
    }
    this.pendingFocusId = null;
    this.network.selectNodes([id]);
    this.network.focus(id, { animation: false });
  }

  private positionPanel(pointer: { x: number; y: number } | undefined, width: number, height: number): { left: number; top: number } {
    const container = this.graphContainer()?.nativeElement;
    const padding = 12;
    const offset = 14;
    const containerWidth = container?.clientWidth ?? window.innerWidth;
    const containerHeight = container?.clientHeight ?? window.innerHeight;
    const maxLeft = Math.max(padding, containerWidth - width - padding);
    const maxTop = Math.max(padding, containerHeight - height - padding);
    const x = pointer?.x ?? padding;
    const y = pointer?.y ?? padding;
    const preferredLeft = x + offset + width <= containerWidth - padding ? x + offset : x - width - offset;
    const preferredTop = y + offset + height <= containerHeight - padding ? y + offset : y - height - offset;
    const clamp = (value: number, max: number): number => Math.max(0, Math.min(4000, Math.round(Math.min(Math.max(value, padding), max) / 2) * 2));
    return { left: clamp(preferredLeft, maxLeft), top: clamp(preferredTop, maxTop) };
  }

  private attachHandlers(network: Network): void {
    network.on('click', params => {
      const event = params as { nodes?: unknown[]; pointer?: { DOM?: { x: number; y: number } } };
      const raw = event.nodes?.[0];
      const id = raw !== undefined && raw !== null ? String(raw) : '';
      this.contextMenu.set(null);
      if (!id) {
        this.selectedId.set(null);
        this.panelVisible.set(false);
        this.highlightedId.set(null);
        return;
      }
      if (id.startsWith('more:')) {
        this.showMore(id.slice(5));
        return;
      }
      if (id.startsWith('group:')) {
        this.toggleGroup(id);
      }
      else if (id.startsWith('user:') && !this.isRoot(id.slice(5))) {
        this.toggleUser(id.slice(5));
      }
      else {
        this.selectedId.set(id);
      }
      const position = this.positionPanel(event.pointer?.DOM, 320, 360);
      this.panelLeft.set(position.left);
      this.panelTop.set(position.top);
      this.panelVisible.set(true);
    });
    network.on('oncontext', params => {
      const event = params as { pointer: { DOM: { x: number; y: number } }; event?: Event };
      event.event?.preventDefault();
      const raw = network.getNodeAt(event.pointer.DOM);
      const id = raw !== undefined && raw !== null ? String(raw) : '';
      const node = id ? this.view().nodes.find(entry => entry.id === id) : undefined;
      const data = this.graph();
      if (!node || !data) {
        this.contextMenu.set(null);
        return;
      }
      const position = this.positionPanel(event.pointer.DOM, 208, 48);
      if (node.kind === 'root') {
        this.contextMenu.set({ action: 'remove', handle: node.owner, nodeId: id, left: position.left, top: position.top });
        return;
      }
      const handle = node.kind === 'user' ? node.owner : node.handle;
      const scanned = node.kind === 'user' && !!data.users.get(node.owner)?.accounts.some(account => !account.discovered);
      if ((node.kind === 'user' || node.kind === 'person') && handle && !isChannelHandle(handle) && !scanned && !this.isScanPending(handle)) {
        this.contextMenu.set({ action: 'scan', handle, nodeId: id, left: position.left, top: position.top });
        return;
      }
      this.contextMenu.set(null);
    });
    network.on('doubleClick', params => {
      const raw = (params as { nodes?: unknown[] }).nodes?.[0];
      const id = raw !== undefined && raw !== null ? String(raw) : '';
      const node = this.view().nodes.find(entry => entry.id === id);
      if (node?.kind === 'user') {
        this.addUser(node.owner);
        return;
      }
      if (node?.kind === 'person' && node.handle && !isChannelHandle(node.handle)) {
        this.addUser(node.handle);
        return;
      }
      this.openUrl(node?.url ?? '');
    });
    network.on('dragStart', () => {
      this.panelVisible.set(false);
      this.contextMenu.set(null);
    });
    network.on('zoom', params => {
      this.panelVisible.set(false);
      this.contextMenu.set(null);
      const scale = (params as { scale?: number }).scale ?? network.getScale();
      if (scale < MIN_ZOOM || scale > MAX_ZOOM) {
        network.moveTo({ scale: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale)) });
      }
      this.keepNodesInView(network);
    });
    network.on('dragEnd', params => {
      if (!(params as { nodes?: unknown[] }).nodes?.length) {
        this.keepNodesInView(network);
      }
    });
    network.on('stabilizationProgress', params => {
      const progress = params as { iterations: number; total: number };
      this.layoutProgress.set(progress.total ? Math.min(99, Math.round(progress.iterations / progress.total * 100)) : 0);
    });
    network.on('stabilizationIterationsDone', () => {
      this.layoutProgress.set(100);
    });
  }

  private keepNodesInView(network: Network): void {
    const container = this.graphContainer()?.nativeElement;
    const points = Object.values(network.getPositions()).map(position => network.canvasToDOM(position));
    if (!container || !points.length) {
      return;
    }
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const width = container.clientWidth;
    const height = container.clientHeight;
    const shiftX = Math.max(...xs) < VIEW_MARGIN ? VIEW_MARGIN - Math.max(...xs) : (Math.min(...xs) > width - VIEW_MARGIN ? width - VIEW_MARGIN - Math.min(...xs) : 0);
    const shiftY = Math.max(...ys) < VIEW_MARGIN ? VIEW_MARGIN - Math.max(...ys) : (Math.min(...ys) > height - VIEW_MARGIN ? height - VIEW_MARGIN - Math.min(...ys) : 0);
    if (!shiftX && !shiftY) {
      return;
    }
    const scale = network.getScale();
    const center = network.getViewPosition();
    network.moveTo({ position: { x: center.x - shiftX / scale, y: center.y - shiftY / scale }, animation: { duration: 200, easingFunction: 'easeOutQuad' } });
  }

  private buildOptions(): Options {
    return {
      autoResize: true,
      physics: {
        solver: 'forceAtlas2Based',
        stabilization: { iterations: 400, fit: true, updateInterval: 25 },
        forceAtlas2Based: { gravitationalConstant: -80, centralGravity: 0.004, springLength: 170, springConstant: 0.08, avoidOverlap: 1, damping: 0.6 },
        maxVelocity: 80,
        minVelocity: 0.75,
        timestep: 0.8,
      },
      edges: {
        smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
        selectionWidth: 2,
        hoverWidth: 1.5,
      },
      nodes: {
        shapeProperties: { useBorderWithImage: true },
        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10, x: 5, y: 5 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        hideEdgesOnDrag: false,
        multiselect: false,
        navigationButtons: false,
        keyboard: false,
        selectConnectedEdges: false,
        zoomView: true,
        dragView: true,
      },
      layout: { improvedLayout: true, randomSeed: 42 },
    };
  }
}
