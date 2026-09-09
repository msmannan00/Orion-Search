import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of, timer } from 'rxjs';
import { debounceTime, exhaustMap, map, switchMap, takeUntil } from 'rxjs/operators';
import type { social_profile } from '../models/social.models';
import { formatFollowers } from '../../../shared/utils/formatters';
import { SocialIconComponent } from '../../../shared/partials/social-icon/social-icon.component';
import { SocialFetchService } from '../services/social-fetch.service';
import { SocialStorageService } from '../services/social-storage.service';
import { getProfileDetailEntries } from '../utils/summary-view.util';
import { buildSocialProfileUrl } from '../utils/profile-url.util';
import { crawlKey, getPlatformCardId as cardId, getProfileGroupKey, isSamePlatform } from '../utils/social-profile.util';
import { SocialLiveSyncService } from '../services/social-live-sync.service';
import { StealerlogSectionComponent } from '../stealerlog-section/stealerlog-section.component';
import { WantedListSectionComponent } from '../wanted-list-section/wanted-list-section.component';
import { PhoneLookupSectionComponent } from '../phone-lookup-section/phone-lookup-section.component';
import type { FetchStateKey, FetchTabKey, SocialResultSource } from '../enums/social-graph.enums';
import type { CrawlResultView, FeedUser, FetchTab } from '../models/social-usability.models';
import type { ExtensionState } from '../../../shared/model/extension/extension.model';
import { toUsername } from '../utils/username.util';
import { SocialDefaultListSectionComponent } from './default-list-section.component';
import { SocialProfileTabsSectionComponent } from '../profile-detail/profile-tabs-section/profile-tabs-section.component';
import { SocialExtensionManagerComponent } from '../../../shared/partials/extension-manager/extension-manager.component';
import { SocialExtensionService } from '../../../shared/services/social-extension.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { getInputValue } from '../../../shared/utils/event-input.util';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';



@Component({
  selector: 'app-social-profile-listing',
  templateUrl: './profile-listing.component.html',
  styleUrls: ['./profile-listing.component.css'],
  standalone: true,
  imports: [NgClass, SocialIconComponent, StealerlogSectionComponent, WantedListSectionComponent, PhoneLookupSectionComponent, SocialDefaultListSectionComponent, SocialProfileTabsSectionComponent, SocialExtensionManagerComponent, TranslatePipe],
  providers: [SocialLiveSyncService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProfileListingComponent {
  private readonly detailsTab: FetchTab = { key: 'details', label: 'Details', icon: 'bi bi-person-badge' };
  private readonly connectionsTab: FetchTab = { key: 'connections', label: 'Connections', icon: 'bi bi-people' };
  private readonly onlinePresenceTab: FetchTab = { key: 'onlinePresence', label: 'Online Presence', icon: 'bi bi-globe2' };
  private readonly stealerLogsTab: FetchTab = { key: 'stealerLogs', label: 'Stealer Logs', icon: 'bi bi-shield-exclamation' };
  private readonly profileFetchTabs: FetchTab[] = [this.detailsTab, this.onlinePresenceTab, this.stealerLogsTab];
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fetchService = inject(SocialFetchService);
  private readonly extensionService = inject(SocialExtensionService);
  private readonly storageService = inject(SocialStorageService);
  private readonly liveSync = inject(SocialLiveSyncService);
  private readonly fetchCancelSubjects = new Map<string, Subject<void>>();
  private appliedProfileQuery = signal(false);
  private readonly loadingByRequestKey = signal<Record<string, boolean | undefined>>({});
  private readonly loadingPlatformIds = computed(() => {
    const platformIds = new Set<string>();
    const addFrom = (key: string) => {
      const parts = key.split(':');
      const platformId = parts[0].startsWith('platform-')
        ? parts[0]
        : parts[1]?.startsWith('platform-') ? parts[1] : undefined;
      if (platformId) {
        platformIds.add(platformId);
      }
    };
    for (const [key, state] of Object.entries(this.liveSync.crawlResults())) {
      if (state?.loading) {
        addFrom(key);
      }
    }
    for (const [key, isLoading] of Object.entries(this.loadingByRequestKey())) {
      if (isLoading) {
        addFrom(key);
      }
    }
    for (const [, profiles] of this.storageService.state.scanResults()) {
      for (const platform of profiles) {
        if (Object.values(platform.section_status ?? {}).some(status => status === 'fetching')) {
          platformIds.add(this.getPlatformCardId(platform));
        }
      }
    }
    return platformIds;
  });
  private readonly loadingUsernames = computed(() => {
    const usernames = new Set<string>();
    const loadingIds = this.loadingPlatformIds();
    for (const [username, profiles] of this.storageService.state.scanResults()) {
      const loading = profiles.some(platform =>
        loadingIds.has(this.getPlatformCardId(platform))
        || Object.values(platform.section_status ?? {}).some(status => status === 'fetching'));
      if (loading) {
        usernames.add(username);
      }
    }
    return usernames;
  });
  private extensionOpened = false;
  private readonly connectionSearchResults = signal<Record<string, unknown[] | null>>({});
  private readonly connectionSearch$ = new Subject<{ platformData: social_profile; term: string }>();

  readonly scanResults = this.storageService.state.scanResults;
  readonly extensionState = signal<ExtensionState>('checking');
  isInitialLoading = input(false);
  sidebarPlatformClicked = output<string>();
  profileOverviewLabelChanged = output<string | null>();
  manageProfilesRequested = output<FeedUser>();
  scanInProgress = output();
  highlightedNodeId = input<string | null>(null);
  activeTabs = signal<Record<string, FetchTabKey | null>>({});
  profileOverviewIds = signal<Set<string>>(new Set<string>());
  activeResultSources = input<Record<string, SocialResultSource>>({});
  platformSearchTerm = signal('');
  readonly missingStatValue = 'Not fetched';
  onlinePresenceSearchTerms = signal<Record<string, string>>({});
  activeUsers = computed<FeedUser[]>(() => {
    return Array.from(this.scanResults().entries())
      .map(([username, platforms]) => {
        const allPlatforms = [...platforms].sort((a, b) => this.comparePlatforms(a, b));
        const visiblePlatforms = this.getVisiblePlatforms(username, platforms).sort((a, b) => this.comparePlatforms(a, b));
        const activeResultSource = this.getActiveResultSource(username, visiblePlatforms);
        return {
          username,
          allPlatforms,
          platforms: visiblePlatforms.filter(platform => this.getResultSource(platform) === activeResultSource)
        };
      })
      .filter(user => user.allPlatforms.length > 0);
  });
  hasResults = computed(() => this.activeUsers().length > 0);
  activeUser = computed(() => {
    const users = this.activeUsers();
    const activeUsername = this.storageService.activeUsername();
    if (activeUsername) {
      const matchingUser = users.find(user => user.username.toLowerCase() === activeUsername.toLowerCase());
      if (matchingUser) {
        return matchingUser;
      }
    }
    return users[0] ?? null;
  });
  activeProfilePlatform = computed(() => {
    const [platformId] = Array.from(this.profileOverviewIds());
    return platformId ? this.getPlatformById(platformId) ?? null : null;
  });

  constructor() {
    this.startExtensionHeartbeat();
    this.connectionSearch$.pipe(debounceTime(250), switchMap(({ platformData, term }) => {
      const key = this.getPlatformCardId(platformData);
      const query = term.trim();
      if (!query) {
        return of({ key, items: null as unknown[] | null });
      }
      return this.fetchService.searchConnections(platformData.meta.platform, platformData.meta.username, query).pipe(map(items => ({ key, items: items })));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(({ key, items }) => {
      this.connectionSearchResults.update(current => ({ ...current, [key]: items }));
    });
    effect(() => {
      this.storageService.state.loadingUsernames.set(this.loadingUsernames());
    });
    effect(() => {
      this.storageService.state.scanResults();
      this.extensionState();
      queueMicrotask(() => {
        this.resumeInFlightSections();
      });
    });
    effect(() => {
      this.activeUsers();
      this.isInitialLoading();
      queueMicrotask(() => {
        this.openProfileOverviewFromQuery();
      });
    });
  }

  setActiveTab(platformId: string, tabKey: FetchTabKey, platformData?: social_profile): void {
    this.liveSync.stoppedPlatformIds.delete(platformId);
    this.activeTabs.update(current => ({ ...current, [platformId]: tabKey }));
    if (platformData) {
      this.fetchTabData(platformData, tabKey);
    }
  }

  openProfileOverviewTab(platformId: string, tabKey: FetchTabKey, platformData?: social_profile): void {
    this.profileOverviewIds.set(new Set<string>([platformId]));
    this.setActiveTab(platformId, platformData ? this.getAllowedTabKey(tabKey) : tabKey, platformData);
    if (platformData) {
      this.setProfileQuery(platformData);
      this.emitProfileOverviewLabel(platformData);
    }
  }

  openConnectionsOverview(platformId: string, platformData?: social_profile): void {
    if (platformData && !this.isFetchTabAllowed('connections')) {
      return;
    }
    this.openProfileOverviewTab(platformId, 'connections', platformData);
  }

  openManageProfiles(user: FeedUser): void {
    this.manageProfilesRequested.emit(user);
  }

  getActiveTab(platformId: string): FetchTabKey {
    return getOwnProperty(this.activeTabs(), platformId) ?? 'details';
  }

  getActiveTabForPlatform(platformData: social_profile): FetchTabKey {
    return this.getAllowedTabKey(this.getActiveTab(this.getPlatformCardId(platformData)));
  }

  getFetchTabs(): FetchTab[] {
    const active = this.activeProfilePlatform();
    if (active && this.getResultSource(active) === 'darkweb') {
      return [this.detailsTab, this.onlinePresenceTab];
    }
    const appended = new Set(['following', 'connections', 'onlinePresence', 'stealerLogs']);
    const types = (this.activeProfilePlatform()?.profile_details?.crawl_type ?? []).filter(type => !appended.has(type));
    if (!types.length) {
      return this.profileFetchTabs;
    }
    const crawlTabs: FetchTab[] = types.map(type => ({ key: type as FetchTabKey, label: type.charAt(0).toUpperCase() + type.slice(1), icon: type === 'details' ? 'bi bi-person-badge' : 'bi bi-collection' }));


    const withDetails = crawlTabs.some(tab => tab.key === 'details') ? crawlTabs : [this.detailsTab, ...crawlTabs];
    return [...withDetails, this.connectionsTab, this.onlinePresenceTab, this.stealerLogsTab];
  }

  crawlResultFor(platformData: social_profile, type: FetchTabKey): CrawlResultView {
    return this.liveSync.crawlResultFor(platformData, type);
  }

  stopPlatformFetches(platformData: social_profile): void {
    const cardId = this.getPlatformCardId(platformData);
    this.liveSync.stoppedPlatformIds.add(cardId);
    this.liveSync.stopPlatform(cardId);
    for (const [key, cancel$] of Array.from(this.fetchCancelSubjects)) {
      if (key.includes(cardId)) {
        cancel$.next();
        cancel$.complete();
        this.fetchCancelSubjects.delete(key);
        this.cancelServerCrawl(platformData, key);
      }
    }
    this.liveSync.crawlResults.update(current => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${cardId}:`) && getOwnProperty(next, key)?.loading) {
          setOwnProperty(next, key, { ...getOwnProperty(next, key), loading: false });
        }
      }
      return next;
    });
    this.loadingByRequestKey.update(current => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (key.includes(cardId)) {
          Reflect.deleteProperty(next, key);
        }
      }
      return next;
    });
    this.liveSync.clearFetchingStatus(platformData);
  }

  stopUserFetches(username: string): void {
    for (const platform of this.storageService.state.scanResults().get(username) ?? []) {
      this.stopPlatformFetches(platform);
    }
  }

  private cancelServerCrawl(platformData: social_profile, key: string): void {
    const crawlType = this.crawlTypeForCancelKey(key);
    if (!crawlType) {
      return;
    }
    this.fetchService.cancelProfileCrawl(platformData.meta.platform, platformData.meta.username, crawlType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private crawlTypeForCancelKey(key: string): string | null {
    if (key.startsWith('platform-')) {
      return key.slice(key.lastIndexOf(':') + 1) || null;
    }
    return key.slice(0, key.indexOf(':')) === 'profile' ? 'details' : null;
  }

  isFetchTabAllowed(tabKey: FetchTabKey): boolean {
    return this.profileFetchTabs.some(tab => tab.key === tabKey);
  }

  isPlatformLoading(platformData: social_profile): boolean {
    return this.loadingPlatformIds().has(this.getPlatformCardId(platformData));
  }

  isTabLoading(platformData: social_profile, tabKey: FetchTabKey): boolean {
    const stateKey = tabKey === 'details'
      ? 'profile'
      : tabKey === 'images'
        ? 'platformImages'
        : tabKey === 'connections'
          ? 'posts'
          : tabKey;
    return !!this.loadingByRequestKey()[this.getRequestKey(stateKey, platformData)];
  }

  private fetchTabData(platformData: social_profile, tabKey: FetchTabKey): void {
    if (tabKey !== 'stealerLogs' && this.hasTabData(platformData, tabKey) && !this.isTabLoading(platformData, tabKey)) {
      return;
    }
    this.refetchTabData(platformData, tabKey);
  }

  private startExtensionHeartbeat(): void {
    let indeterminateMisses = 0;
    timer(0, 3000).pipe(exhaustMap(() => this.extensionService.detect()), takeUntilDestroyed(this.destroyRef)).subscribe(state => {



      if (state === 'checking') {
        indeterminateMisses += 1;
        const previous = this.extensionState();
        if ((previous === 'ready' || previous === 'update' || previous === 'signin') && indeterminateMisses < 3) {
          return;
        }
        this.extensionState.set(indeterminateMisses >= 3 ? 'install' : 'checking');
        return;
      }
      indeterminateMisses = 0;


      this.extensionState.set(state);

      if (state === 'signin' && !this.extensionOpened) {
        this.extensionOpened = true;
        this.extensionService.openExtension();
      }
      else if (state !== 'signin') {
        this.extensionOpened = false;
      }
    });
  }

  refetchTabData(platformData: social_profile, tabKey: FetchTabKey): void {
    if (this.getResultSource(platformData) === 'darkweb' && tabKey === 'details') {
      return;
    }
    this.liveSync.stoppedPlatformIds.delete(this.getPlatformCardId(platformData));
    switch (tabKey) {
      case 'details':
        this.fetchProfileDetails(platformData);
        break;
      case 'onlinePresence':
        this.searchOnlinePresence(platformData);
        break;
      case 'stealerLogs':
        this.fetchStealerLogs(platformData);
        break;
    }
  }

  onProfileTabSelected(platformData: social_profile, tabKey: FetchTabKey): void {
    this.setActiveTab(this.getPlatformCardId(platformData), tabKey);
    if (tabKey === 'details' || tabKey === 'onlinePresence' || tabKey === 'stealerLogs') {
      this.fetchTabData(platformData, tabKey);
    }
  }

  onProfileTabRefetch(platformData: social_profile, tabKey: FetchTabKey): void {
    if (tabKey === 'details' || tabKey === 'onlinePresence' || tabKey === 'stealerLogs') {
      this.refetchTabData(platformData, tabKey);
    }
  }

  onProfileTabSyncAll(platformData: social_profile, tabKey: FetchTabKey): void {
    if (this.isExtensionReady()) {
      if (this.liveSync.isScanning(platformData)) {
        this.scanInProgress.emit();
      }
      void this.liveSync.startLiveFetch(platformData, tabKey);
    }
  }

  onProfileTabStopSync(platformData: social_profile, tabKey: FetchTabKey): void {
    this.liveSync.stopSync(platformData, tabKey);
  }

  onProfileTabLoadConnections(platformData: social_profile, postUrl: string): void {
    if (this.isExtensionReady() && postUrl) {
      if (this.liveSync.isScanning(platformData)) {
        this.scanInProgress.emit();
      }
      void this.liveSync.loadConnections(platformData, postUrl);
    }
  }

  onProfileTabSyncAllConnections(platformData: social_profile): void {
    if (this.isExtensionReady()) {
      if (this.liveSync.isScanning(platformData)) {
        this.scanInProgress.emit();
      }
      void this.liveSync.syncAllConnections(platformData);
    }
  }

  onProfileConnectionSearch(platformData: social_profile, term: string): void {
    this.connectionSearch$.next({ platformData, term });
  }

  getConnectionSearchResults(platformData: social_profile): unknown[] | null {
    return this.connectionSearchResults()[this.getPlatformCardId(platformData)] ?? null;
  }

  connectionsLoading(): Set<string> {
    return this.liveSync.connectionsLoading();
  }

  connectionsByPost(): ReadonlyMap<string, unknown[]> {
    return this.liveSync.connectionsByPost();
  }

  onProfileOnlinePresenceTermChanged(platformData: social_profile, term: string): void {
    const key = this.getPlatformCardId(platformData);
    this.onlinePresenceSearchTerms.update(current => ({ ...current, [key]: term }));
  }

  onDefaultProfileOverview(platformData: social_profile): void {
    this.toggleProfileOverview(this.getPlatformCardId(platformData), platformData);
  }

  onDefaultConnectionsOverview(platformData: social_profile): void {
    this.openConnectionsOverview(this.getPlatformCardId(platformData), platformData);
  }

  onDefaultProfileTab(event: { platformData: social_profile; tabKey: FetchTabKey }): void {
    this.openProfileOverviewTab(this.getPlatformCardId(event.platformData), event.tabKey, event.platformData);
  }

  getLoadingStates(platformData: social_profile): Partial<Record<FetchTabKey, boolean>> {
    return this.getFetchTabs().reduce<Partial<Record<FetchTabKey, boolean>>>((currentStates, tab) => {
      currentStates[tab.key] = this.isSectionBusy(platformData, tab.key);
      return currentStates;
    }, {});
  }

  private isSectionBusy(platformData: social_profile, tabKey: FetchTabKey): boolean {
    if (tabKey === 'connections') {
      return false;
    }
    if (tabKey === 'details' || tabKey === 'onlinePresence' || tabKey === 'stealerLogs') {
      return this.isTabLoading(platformData, tabKey);
    }
    if (this.liveSync.crawlResults()[crawlKey(platformData, tabKey)]?.loading) {
      return true;
    }
    return getOwnProperty(platformData.section_status, tabKey) === 'fetching';
  }

  private hasTabData(platformData: social_profile, tabKey: FetchTabKey): boolean {
    switch (tabKey) {
      case 'details':
        return platformData.profile_details?.is_parsed === true;
      case 'onlinePresence':
        return !!platformData.online_presence;
      case 'stealerLogs':
        return this.getStealerLogs(platformData).length > 0;
      default:
        return false;
    }
  }

  formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      }
      catch {
        return String(value);
      }
    }
    return String(value);
  }

  copyToClipboard(text: unknown): void {
    const str = this.formatMetadataValue(text);
    void navigator.clipboard?.writeText(str);
  }

  getStealerLogs(platformData: social_profile): unknown[] {
    return platformData.stealer_logs ?? [];
  }

  getOnlinePresenceSearchTerm(platformData: social_profile): string {
    const key = this.getPlatformCardId(platformData);
    return getOwnProperty(this.onlinePresenceSearchTerms(), key) ?? '';
  }

  searchOnlinePresence(platformData: social_profile): void {
    this.fetchOnlinePresence(platformData, this.getOnlinePresenceSearchTerm(platformData).trim());
  }

  isExtensionReady(): boolean {
    return this.extensionState() === 'ready' || this.extensionState() === 'update';
  }

  extensionUpdateUrl(): string {
    return this.extensionService.downloadUrl();
  }

  private fetchProfileDetails(platformData: social_profile): void {
    if (!this.isExtensionReady()) {
      return;
    }
    this.cancelFetch(platformData, 'profile');
    const profileUrl = buildSocialProfileUrl(platformData.meta.platform, platformData.meta.username, platformData.meta.url);
    const detailsKey = crawlKey(platformData, 'details');
    this.fetchData(platformData, 'profile', this.fetchService.crawlProfile(platformData.meta.platform, platformData.meta.username, profileUrl, 'details').pipe(map(result => {
      const profile = (result.items ?? [])[0] as Record<string, unknown> | undefined;
      const hasProfile = !result.idle && !result.error && !!profile && Object.keys(profile).length > 0;
      this.liveSync.crawlResults.update(current => ({ ...current, [detailsKey]: { loading: false, error: hasProfile ? undefined : (result.error ?? 'crawl_failed'), login_url: hasProfile ? undefined : result.login_url } }));
      return hasProfile ? { profile } : { failed: true };
    })));
  }

  private fetchOnlinePresence(platformData: social_profile, token: string): void {
    this.cancelFetch(platformData, 'onlinePresence');
    const tokens = [...new Set([token, platformData.meta.platform ?? '']
      .join(' ')
      .split(/[,\s]+/)
      .map(entry => entry.trim().toLowerCase())
      .filter(Boolean))];
    const username = (platformData.meta.username || '').replace(/^@+/, '');
    this.fetchData(platformData, 'onlinePresence', this.fetchService.fetchProfileMetadataTokens(tokens.length > 0 ? tokens : [platformData.meta.platform], username).pipe(map(onlinePresence => ({ onlinePresence }))));
  }

  private fetchStealerLogs(platformData: social_profile): void {
    this.cancelFetch(platformData, 'stealerLogs');
    const username = platformData.meta.username;
    this.fetchData(platformData, 'stealerLogs', this.fetchService.fetchPlatformStealerLogs(username).pipe(map(stealerLogs => ({ stealerLogs }))));
  }

  private fetchData(platformResult: social_profile, stateKey: FetchStateKey, request$: Observable<unknown>): void {
    const requestKey = this.getRequestKey(stateKey, platformResult);
    if (this.fetchCancelSubjects.has(requestKey)) {
      return;
    }
    const cancel$ = new Subject<void>();
    this.fetchCancelSubjects.set(requestKey, cancel$);
    this.setLoading(requestKey, true);
    const section = this.sectionOf(stateKey);
    this.liveSync.setSectionStatus(platformResult, section, 'fetching');
    let failed = false;
    request$.pipe(takeUntil(cancel$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if ((response as { failed?: boolean } | null)?.failed) {
          failed = true;
          return;
        }
        this.setFetchedPlatformData(platformResult, stateKey, response);
      },
      error: () => {
        this.liveSync.setSectionStatus(platformResult, section, 'failed'); this.finishFetch(requestKey);
      },
      complete: () => {
        if (!this.liveSync.stoppedPlatformIds.has(this.getPlatformCardId(platformResult))) {
          this.liveSync.setSectionStatus(platformResult, section, failed ? 'failed' : 'completed');
        }
        this.finishFetch(requestKey);
      },
    });
  }

  cancelAllFetchesForUser(username: string): void {
    const prefix = `platform-${username}|`;
    for (const [requestKey, cancel$] of this.fetchCancelSubjects) {
      if (!requestKey.includes(prefix)) {
        continue;
      }
      cancel$.next();
      cancel$.complete();
      this.fetchCancelSubjects.delete(requestKey);
      this.setLoading(requestKey, false);
    }
  }

  private cancelFetch(platformData: social_profile, stateKey: FetchStateKey): void {
    const requestKey = this.getRequestKey(stateKey, platformData);
    const cancel$ = this.fetchCancelSubjects.get(requestKey);
    if (!cancel$) {
      return;
    }
    cancel$.next();
    cancel$.complete();
    this.fetchCancelSubjects.delete(requestKey);
    this.setLoading(requestKey, false);
  }

  private sectionOf(stateKey: FetchStateKey): string {
    return stateKey === 'profile' ? 'details' : stateKey;
  }

  private isSectionLoadingInMemory(platformData: social_profile, section: string): boolean {
    if (section === 'details' || section === 'onlinePresence' || section === 'stealerLogs') {
      const stateKey = (section === 'details' ? 'profile' : section) as FetchStateKey;
      return !!this.loadingByRequestKey()[this.getRequestKey(stateKey, platformData)];
    }
    return !!this.liveSync.crawlResults()[crawlKey(platformData, section as FetchTabKey)]?.loading;
  }

  private resumeInFlightSections(): void {
    if (!this.isExtensionReady()) {
      return;
    }
    this.loadOpenProfileOnceReady();
    for (const [, profiles] of this.storageService.state.scanResults()) {
      for (const platform of profiles) {
        if (this.liveSync.stoppedPlatformIds.has(this.getPlatformCardId(platform))) {
          continue;
        }
        for (const [section, status] of Object.entries(platform.section_status ?? {})) {
          if (status !== 'fetching' || this.isSectionLoadingInMemory(platform, section)) {
            continue;
          }
          if (section === 'details' || section === 'onlinePresence' || section === 'stealerLogs') {
            this.refetchTabData(platform, section);
          }
          else {
            void this.liveSync.startLiveFetch(platform, section as FetchTabKey);
          }
        }
      }
    }
  }

  private loadOpenProfileOnceReady(): void {
    const platformData = this.activeProfilePlatform();
    if (!platformData || platformData.profile_details?.is_parsed === true || this.liveSync.stoppedPlatformIds.has(this.getPlatformCardId(platformData))) {
      return;
    }
    const detailsStatus = platformData.section_status?.details;
    if (this.isTabLoading(platformData, 'details') || detailsStatus === 'failed' || detailsStatus === 'completed') {
      return;
    }
    this.fetchProfileDetails(platformData);
  }

  private setFetchedPlatformData(platformResult: social_profile, stateKey: FetchStateKey, response: unknown): void {
    if (!response || typeof response !== 'object') {
      return;
    }
    const responseRecord = response as Record<string, unknown>;
    const dataKey = Object.keys(responseRecord)[0];
    const data = dataKey ? getOwnProperty(responseRecord, dataKey) : null;
    const hasData = !!data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0);
    let updatedProfiles: social_profile[] | null = null;

    this.storageService.state.scanResults.update(results => {
      const currentProfiles = results.get(getProfileGroupKey(this.storageService.state.scanResults(), platformResult));
      if (!currentProfiles) {
        return results;
      }
      updatedProfiles = currentProfiles.map(platform => isSamePlatform(platform, platformResult)
        ? { ...platform, ...this.buildFetchedPlatformData(stateKey, data, hasData, platform.profile_details), section_status: { ...platform.section_status, [this.sectionOf(stateKey)]: 'completed' } }
        : platform);
      return new Map(results).set(getProfileGroupKey(this.storageService.state.scanResults(), platformResult), updatedProfiles);
    });

    if (updatedProfiles) {
      this.storageService.saveProfiles(getProfileGroupKey(this.storageService.state.scanResults(), platformResult), updatedProfiles, true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  private buildFetchedPlatformData(stateKey: FetchStateKey, data: unknown, hasData: boolean, previous?: social_profile['profile_details']): Partial<social_profile> {
    const propertyMap: Partial<Record<FetchStateKey, keyof social_profile>> = {
      profile: 'profile_details',
      onlinePresence: 'online_presence',
      stealerLogs: 'stealer_logs',
    };
    const propertyName = getOwnProperty(propertyMap, stateKey);
    if (!propertyName) {
      return {};
    }

    const value = stateKey === 'profile' && hasData && data && typeof data === 'object' ? { ...previous, ...(data as Record<string, unknown>), is_parsed: true } : data;
    return { [propertyName]: hasData ? value : null };
  }

  private getRequestKey(stateKey: FetchStateKey, platformData: social_profile): string {
    return `${stateKey}:${this.getPlatformCardId(platformData)}`;
  }

  private setLoading(requestKey: string, isLoading: boolean): void {
    this.loadingByRequestKey.update(current => {
      const next = { ...current };
      if (isLoading) {
        setOwnProperty(next, requestKey, true);
      }
      else {
        Reflect.deleteProperty(next, requestKey);
      }
      return next;
    });
  }

  private finishFetch(requestKey: string): void {
    this.fetchCancelSubjects.delete(requestKey);
    this.setLoading(requestKey, false);
  }

  getPlatformCardId(platformData: social_profile): string {
    return cardId(platformData);
  }

  getPlatformTrackKey(_index: number, platformData: social_profile): string {
    return this.getPlatformCardId(platformData);
  }

  getUsernameInitial(username: string): string {
    return (/\p{L}/u.exec(username))?.[0].toLocaleUpperCase() ?? '?';
  }

  getDisplayUsername(username: string): string {
    return toUsername(username);
  }

  onPlatformSearchInput(event: Event): void {
    this.platformSearchTerm.set(getInputValue(event));
  }

  getSidebarPlatforms(user: FeedUser): social_profile[] {
    const term = this.platformSearchTerm().trim().toLowerCase();
    if (!term) {
      return user.platforms;
    }
    return user.platforms.filter(platform => {
      return platform.meta.platform.toLowerCase().includes(term)
        || platform.meta.username.toLowerCase().includes(term);
    });
  }

  getResultSource(platformData: social_profile): SocialResultSource {
    const platform = String(platformData?.meta?.platform ?? '').toLowerCase();
    const kind = `${platformData?.meta?.entity_type ?? ''} ${platformData?.meta?.target_type ?? ''}`.toLowerCase();
    const darkweb = ['forum', 'telegram', 'discord', 'chat', 'darkweb', 'dark_web', 'onion', 'paste', 'leak'];
    return darkweb.some(key => platform.includes(key)) || kind.includes('dark') || kind.includes('forum') ? 'darkweb' : 'normal';
  }

  getStatValue(platformData: social_profile, key: keyof NonNullable<social_profile['profile_details']>): string {
    const profileValue = getOwnProperty(platformData.profile_details, key);
    const rawValue = profileValue ?? this.getFallbackStatValue(platformData, key);
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return this.missingStatValue;
    }
    const numericValue = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).replace(/,/g, ''));
    return Number.isFinite(numericValue) ? formatFollowers(numericValue) : String(rawValue);
  }

  getProfileDetailEntries(platformData: social_profile): { key: string; value: unknown; }[] {
    return getProfileDetailEntries(platformData);
  }

  private getFallbackStatValue(platformData: social_profile, key: keyof NonNullable<social_profile['profile_details']>): string | number | null {
    switch (key) {
      case 'total_posts':
        return this.firstStatValue(platformData.profile_details?.total_posts);
      case 'total_followers':
        return this.firstStatValue(Number(platformData.profile_details?.total_followers ?? 0));
      case 'total_likes':
        return this.firstStatValue(platformData.profile_details?.total_likes);
      default:
        return null;
    }
  }

  private firstStatValue(...values: (string | number | null | undefined)[]): string | number | null {
    return values.find(value => value !== null && value !== undefined && value !== '') ?? null;
  }

  toggleProfileOverview(platformId: string, platformData?: social_profile): void {
    if (this.profileOverviewIds().has(platformId)) {
      this.profileOverviewIds.set(new Set<string>());
      this.clearProfileQuery();
      this.profileOverviewLabelChanged.emit(null);
      return;
    }
    this.profileOverviewIds.set(new Set<string>([platformId]));
    this.setActiveTab(platformId, 'details', platformData);
    if (platformData) {
      this.setProfileQuery(platformData);
      this.emitProfileOverviewLabel(platformData);
    }
  }

  clearProfileOverview(): void {
    this.profileOverviewIds.set(new Set<string>());
    this.clearProfileQuery();
    this.profileOverviewLabelChanged.emit(null);
  }

  isProfileOverviewActive(platformId: string): boolean {
    return this.profileOverviewIds().has(platformId);
  }

  hasOpenProfileOverview(): boolean {
    return this.profileOverviewIds().size > 0;
  }

  isProfileQueryLoading(): boolean {
    return !!this.route.snapshot.queryParamMap.get('profile')
      && !!this.route.snapshot.queryParamMap.get('platform')
      && !this.appliedProfileQuery();
  }

  showLoadingSkeleton(): boolean {
    return this.isInitialLoading() || this.isProfileQueryLoading();
  }

  handleSidebarPlatformClick(platformId: string): void {
    if (this.profileOverviewIds().size > 0) {
      const platform = this.getPlatformById(platformId);
      this.setActiveTab(platformId, 'details', platform);
      this.profileOverviewIds.set(new Set([platformId]));
      if (platform) {
        this.setProfileQuery(platform);
        this.emitProfileOverviewLabel(platform);
      }
      return;
    }
    this.sidebarPlatformClicked.emit(platformId);
  }

  private openProfileOverviewFromQuery(): void {
    if (this.appliedProfileQuery()) {
      return;
    }
    const profile = this.route.snapshot.queryParamMap.get('profile');
    const platform = this.route.snapshot.queryParamMap.get('platform');
    if (!profile || !platform) {
      this.appliedProfileQuery.set(true);
      return;
    }
    const normalize = (value: string | null | undefined): string => (value ?? '').trim().replace(/^@+/, '').toLowerCase();
    const wantedProfile = normalize(profile);
    const wantedPlatform = platform.toLowerCase();
    for (const user of this.activeUsers()) {
      const match = user.allPlatforms.find(item => (item.meta.platform || '').toLowerCase() === wantedPlatform && normalize(item.meta.username) === wantedProfile);
      if (match) {
        const platformId = this.getPlatformCardId(match);
        this.storageService.state.activeUsername.set(user.username);
        this.profileOverviewIds.set(new Set([platformId]));
        this.setActiveTab(platformId, 'details');
        if (!match.profile_details?.is_parsed) {
          this.refetchTabData(match, 'details');
        }
        this.emitProfileOverviewLabel(match);
        this.appliedProfileQuery.set(true);
        return;
      }
    }
    if (this.isInitialLoading()) {
      return;
    }
    const ownerKey = Array.from(this.storageService.state.scanResults().keys()).find(key => normalize(key) === wantedProfile) ?? profile;
    const duplicate = (this.storageService.state.scanResults().get(ownerKey) ?? []).find(item => (item.meta.platform || '').toLowerCase() === wantedPlatform && normalize(item.meta.username) === wantedProfile);
    const built: social_profile = duplicate ?? { id: `${platform}:${ownerKey}`, meta: { platform, username: ownerKey, url: '' } };
    const platformId = this.getPlatformCardId(built);
    if (!duplicate) {
      this.storageService.state.scanResults.update(current => {
        const existing = current.get(ownerKey) ?? [];
        return new Map(current).set(ownerKey, [...existing, built]);
      });
    }
    this.storageService.state.activeUsername.set(ownerKey);
    this.profileOverviewIds.set(new Set([platformId]));
    this.setActiveTab(platformId, 'details');
    this.refetchTabData(built, 'details');
    this.emitProfileOverviewLabel(built);
    this.appliedProfileQuery.set(true);
  }

  private setProfileQuery(platformData: social_profile): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { profile: platformData.meta.username, platform: platformData.meta.platform },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private clearProfileQuery(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { profile: null, platform: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private emitProfileOverviewLabel(platformData: social_profile): void {
    this.profileOverviewLabelChanged.emit(`${platformData.meta.platform} / ${platformData.meta.username}`);
  }

  private getPlatformById(platformId: string): social_profile | undefined {
    for (const user of this.activeUsers()) {
      const platform = user.platforms.find(current => this.getPlatformCardId(current) === platformId);
      if (platform) {
        return platform;
      }
    }
    return undefined;
  }

  private comparePlatforms(a: social_profile, b: social_profile): number {
    return (a.meta.platform ?? '').localeCompare(b.meta.platform ?? '');
  }

  private getVisiblePlatforms(ownerUsername: string, platforms: social_profile[]): social_profile[] {
    return platforms.filter(platform => this.storageService.isSelected(ownerUsername, platform));
  }

  private getActiveResultSource(username: string, platforms: social_profile[]): SocialResultSource {
    const preferred = getOwnProperty(this.activeResultSources(), username) ?? 'normal';
    if (platforms.some(platform => this.getResultSource(platform) === preferred)) {
      return preferred;
    }
    return platforms.some(platform => this.getResultSource(platform) === 'normal') ? 'normal' : 'darkweb';
  }

  private getAllowedTabKey(tabKey: FetchTabKey): FetchTabKey {
    return this.getFetchTabs().some(tab => tab.key === tabKey) ? tabKey : 'details';
  }
}
