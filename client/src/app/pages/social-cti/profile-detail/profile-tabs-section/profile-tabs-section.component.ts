import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { social_online_presence_hit, social_profile } from '../../models/social.models';
import { social_stealer_log } from '../../models/social.models';
import { formatKey, isImageUrl, isUrl } from '../../../../shared/utils/formatters';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import type { FetchTabKey } from '../../enums/social-graph.enums';
import type { FeedUser, FetchTab } from '../../models/social-usability.models';
import { getProfileDetailEntries } from '../../utils/summary-view.util';
import { SocialFetchService } from '../../services/social-fetch.service';
import { take } from 'rxjs/operators';
import { buildSocialProfileUrl } from '../../utils/profile-url.util';
import { applyImageFallback } from '../../utils/image-fallback.util';
import { ExportBrandingService } from '../../../../shared/services/export/export-branding.service';
import { ExportChoiceModalComponent } from '../../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { PROFILE_STEALERLOG_EXPORT_OPTIONS } from '../../../../shared/model/report/export-choice.model';
import { ReportExportService } from '../../../../shared/services/report-export.service';
import { GraphReportPayload } from '../../../../shared/model/report/report-export.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import { SectionStateComponent } from '../../../../shared/partials/section-state/section-state.component';
import { categoryFor, primaryKeysFor } from '../../constants/resource-category.constants';
import { SocialResourceWorkSectionComponent } from '../resource-work-section/resource-work-section.component';
import { SocialResourcePeopleSectionComponent } from '../resource-people-section/resource-people-section.component';
import { SocialResourceFeedSectionComponent } from '../resource-feed-section/resource-feed-section.component';
import { SocialResourceMediaSectionComponent } from '../resource-media-section/resource-media-section.component';
import { asUnknownRecord, getOwnProperty } from '../../../../shared/utils/type-guards.util';
import { getInputValue } from '../../../../shared/utils/event-input.util';
import { ExpandedRowComponent } from '../../../root-searches/credentials/expanded-row/expanded-row.component';
import { CredentialResultItem } from '../../../../shared/model/results/credentials/credential.callback.model';
import { expandFadeRow } from '../../../../shared/animations/row.animations';

@Component({
  selector: 'app-social-profile-tabs-section',
  templateUrl: './profile-tabs-section.component.html',
  standalone: true,
  imports: [TooltipDirective, ExportChoiceModalComponent, SectionStateComponent, SocialResourceWorkSectionComponent, SocialResourcePeopleSectionComponent, SocialResourceFeedSectionComponent, SocialResourceMediaSectionComponent, DatePipe, TranslatePipe, NgTemplateOutlet, ExpandedRowComponent],
  animations: [expandFadeRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProfileTabsSectionComponent {
  private readonly exportBranding = inject(ExportBrandingService);
  private readonly reportExportService = inject(ReportExportService);
  private readonly translationService = inject(TranslationService);
  private readonly stealerLogExportColumns = [ 'tenant_name', 'recordType', 'recordIndex', 'searchQuery', 'email', 'username', 'domain', 'source', 'hash', 'title', 'url', 'rank', 'date', 'team', 'summary' ] as const;
  private failedProfileImages = signal<Set<string>>(new Set<string>());
  private readonly expandedCrawlDescriptions = signal<Set<string>>(new Set<string>());
  private readonly expandedCrawlProperties = signal<Set<string>>(new Set<string>());
  private readonly expandedStealerRows = signal<Set<number>>(new Set<number>());
  private readonly stealerItemCache = new WeakMap<social_stealer_log, CredentialResultItem>();
  private readonly contentTabKeys: FetchTabKey[] = ['details', 'onlinePresence', 'stealerLogs'];
  private readonly displayLimit = signal(50);
  private readonly resetDisplayLimit = effect(() => {
    this.activeTab(); this.displayLimit.set(50);
  });
  private readonly forceStale = false;
  private readonly fetchService = inject(SocialFetchService);
  private darkwebFetchedFor = '';
  private readonly darkwebFetchEffect = effect(() => {
    if (!this.isDarkweb()) {
      return;
    }
    const username = this.platformData()?.meta?.username ?? '';
    if (!username || this.darkwebFetchedFor === username) {
      return;
    }
    this.darkwebFetchedFor = username;
    this.darkwebLoaded.set(false);
    this.fetchService.fetchDarkwebReport(username).pipe(take(1)).subscribe(rows => {
      this.darkwebReport.set(rows);
      this.darkwebLoaded.set(true);
    });
  });
  private readonly darkwebEntryBlocked = new Set(['m_embedding', '_id', '_score', '_rank', '_index', 'rank_index', 'm_hash', 'm_hash_id', 'm_scrap_file', 'm_cluster_id', 'm_document_id']);
  private readonly metaDetailKeys = ['platform', 'username', 'url', 'status', 'entity_type', 'target_type', 'description'];

  user = input.required<FeedUser>();
  platformData = input.required<social_profile>();
  fetchTabs = input.required<FetchTab[]>();
  activeTab = input.required<FetchTabKey>();
  loadingStates = input<Partial<Record<FetchTabKey, boolean>>>({});
  onlinePresenceSearchTerm = input('');
  connectionsLoading = input<Set<string>>(new Set<string>());
  connectionsByPost = input<ReadonlyMap<string, unknown[]>>(new Map());
  crawlResult = input<{ loading?: boolean; items?: unknown[]; error?: string; login_url?: string; count?: number; log?: string; lastSynced?: string }>({});
  tabSelected = output<FetchTabKey>();
  refetchTab = output<FetchTabKey>();
  syncAll = output<FetchTabKey>();
  stopSync = output<FetchTabKey>();
  loadConnections = output<string>();
  syncAllConnections = output();
  connectionSearch = output<string>();
  onlinePresenceSearchTermChanged = output<string>();
  onlinePresenceSearch = output();
  readonly isUrl = isUrl;
  readonly onImageError = applyImageFallback;
  readonly isImageUrl = isImageUrl;
  readonly formatKey = formatKey;
  readonly stealerLogExportOptions = PROFILE_STEALERLOG_EXPORT_OPTIONS;
  readonly selectedStealerLogPlatform = signal<social_profile | null>(null);
  connectionSearchResults = input<unknown[] | null>(null);
  readonly isDarkweb = computed(() => {
    const platform = String(this.platformData()?.meta?.platform ?? '').toLowerCase();
    const kind = `${this.platformData()?.meta?.entity_type ?? ''} ${this.platformData()?.meta?.target_type ?? ''}`.toLowerCase();
    return ['forum', 'telegram', 'discord', 'chat', 'darkweb', 'dark_web', 'onion', 'paste', 'leak'].some(key => platform.includes(key)) || kind.includes('dark') || kind.includes('forum');
  });
  readonly darkwebReport = signal<Record<string, unknown>[]>([]);
  readonly darkwebLoaded = signal(false);
  readonly detailEntries = computed<{ key: string; value: unknown }[]>(() => {
    const platform = this.platformData();
    const meta = (platform?.meta ?? {}) as Record<string, unknown>;
    const normalize = (value: unknown): string => String(value).trim().toLowerCase();
    const seenValues = new Set<string>();
    const entries: { key: string; value: unknown }[] = [];
    for (const key of this.metaDetailKeys) {
      const value = getOwnProperty(meta, key);
      if (value === null || value === undefined || String(value).trim() === '') {
        continue;
      }
      entries.push({ key, value });
      seenValues.add(normalize(value));
    }
    for (const item of getProfileDetailEntries(platform)) {
      if (['img_src', 'm_img_src'].includes(item.key.toLowerCase())) {
        continue;
      }
      if (typeof item.value === 'string' && seenValues.has(normalize(item.value))) {
        continue;
      }
      entries.push(item);
    }
    return entries;
  });
  readonly hasProfileData = computed(() => this.platformData()?.profile_details?.is_parsed === true);
  readonly darkwebSections = computed<{ title: string; date: string; entries: { key: string; value: unknown }[] }[]>(() =>
    this.darkwebReport().map((doc, index) => {
      const entries = Object.entries(doc ?? {})
        .filter(([key, value]) => !this.darkwebEntryBlocked.has(key.toLowerCase()) && value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0))
        .map(([key, value]) => ({ key, value }));
      const label = String(doc?.m_channel_name ?? doc?.m_title ?? doc?.m_platform ?? `Record ${index + 1}`);
      const stamp = doc?.m_date ?? doc?.m_creation_date ?? '';
      return { title: label, date: stamp ? String(stamp).slice(0, 19).replace('T', ' ') : '', entries };
    }).filter(section => section.entries.length));
  resourceCategory = computed(() => categoryFor(this.platformData().meta.platform, this.activeTab()));
  hasResourcePresenter = computed(() => ['work', 'people', 'feed', 'media'].includes(this.resourceCategory()));
  readonly displayedItems = computed<unknown[]>(() => {
    const results = this.connectionSearchResults();
    if (results) {
      return results;
    }
    return (this.crawlResult().items ?? []).slice(0, this.displayLimit());
  });
  readonly canLoadMoreDb = computed(() => this.connectionSearchResults() === null && (this.crawlResult().items?.length ?? 0) > this.displayLimit());
  readonly isStale = computed(() => {
    if (this.forceStale) {
      return true;
    }
    const result = this.crawlResult();
    if (!(result.items?.length)) {
      return false;
    }
    const last = result.lastSynced;
    if (!last) {
      return true;
    }
    const parsed = Date.parse(last);
    return !Number.isFinite(parsed) || (Date.now() - parsed) > 86400000;
  });

  scrollToActiveConnectionPost(): void {
    const element = document.querySelector('.ui-connection-beam');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  showMoreFromDb(): void {
    this.displayLimit.update(current => current + 50);
  }

  onConnectionSearch(event: Event): void {
    this.connectionSearch.emit(getInputValue(event));
  }

  syncAllNow(): void {
    this.syncAll.emit(this.activeTab());
  }

  stopSyncNow(): void {
    this.stopSync.emit(this.activeTab());
  }

  syncAllConnectionsNow(): void {
    this.syncAllConnections.emit();
  }

  openLogin(url: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    this.refetchTab.emit(this.activeTab());
  }

  getTabLabel(tabKey: FetchTabKey): string {
    return this.fetchTabs().find(tab => tab.key === tabKey)?.label ?? tabKey;
  }

  isTabLoading(tabKey: FetchTabKey): boolean {
    return !!getOwnProperty(this.loadingStates(), tabKey);
  }

  isSectionLoading(tabKey: FetchTabKey): boolean {
    return this.isCrawlContentTab(tabKey) && this.activeTab() === tabKey
      ? !!this.crawlResult().loading
      : this.isTabLoading(tabKey);
  }

  isCrawlContentTab(tabKey: FetchTabKey): boolean {
    return !this.contentTabKeys.includes(tabKey);
  }

  crawlItemTitle(item: unknown): string {
    const record = item as Record<string, unknown>;
    return String(record?.title ?? record?.caption ?? record?.url ?? '');
  }

  crawlItemUrl(item: unknown): string {
    const record = item as Record<string, unknown>;
    return String(record?.url ?? '');
  }

  crawlItemCaption(item: unknown): string {
    const record = this.crawlItemRecord(item);
    return String(record.caption ?? record.description ?? '');
  }

  crawlItemImageUrl(item: unknown): string {
    const record = this.crawlItemRecord(item);
    const value = record.thumbnail_url ?? record.avatar ?? record.avatar_url ?? record.image_url;
    return this.isUrl(value) ? String(value) : '';
  }

  crawlItemHighlights(item: unknown): { key: string; value: unknown }[] {
    const record = this.crawlItemRecord(item);
    return primaryKeysFor(this.resourceCategory())
      .filter(key => this.hasCrawlItemValue(getOwnProperty(record, key)))
      .slice(0, 6)
      .map(key => ({ key, value: getOwnProperty(record, key) }));
  }

  crawlItemEntries(item: unknown): { key: string; value: unknown }[] {
    const record = this.crawlItemRecord(item);
    const headerKeys = new Set(['title', 'url', 'thumbnail_url', 'caption', 'description', 'type', 'media_type']);
    const highlighted = new Set(this.crawlItemHighlights(item).map(entry => entry.key));
    return Object.entries(record)
      .filter(([key, value]) => !headerKeys.has(key) && !highlighted.has(key) && this.hasCrawlItemValue(value))
      .map(([key, value]) => ({ key, value }));
  }

  isCrawlPropertiesExpanded(index: number, item: unknown): boolean {
    return this.expandedCrawlProperties().has(this.crawlDescriptionKey(index, item));
  }

  private toggledSet(current: Set<string>, key: string): Set<string> {
    const next = new Set(current);
    if (next.has(key)) {
      next.delete(key);
    }
    else {
      next.add(key);
    }
    return next;
  }

  toggleCrawlProperties(index: number, item: unknown): void {
    const key = this.crawlDescriptionKey(index, item);
    this.expandedCrawlProperties.update(current => {
      return this.toggledSet(current, key);
    });
  }

  crawlItemTrackKey(index: number, item: unknown): string {
    const record = this.crawlItemRecord(item);
    return String(record.resource_id ?? record.id ?? record.node_id ?? record.url ?? record.title ?? index);
  }

  shouldShowCrawlDescriptionToggle(item: unknown): boolean {
    const caption = this.crawlItemCaption(item);
    return caption.length > 180 || caption.split('\n').length > 3;
  }

  isCrawlDescriptionExpanded(index: number, item: unknown): boolean {
    return this.expandedCrawlDescriptions().has(this.crawlDescriptionKey(index, item));
  }

  toggleCrawlDescription(index: number, item: unknown): void {
    const key = this.crawlDescriptionKey(index, item);
    this.expandedCrawlDescriptions.update(current => {
      return this.toggledSet(current, key);
    });
  }

  onOnlinePresenceInput(event: Event): void {
    this.onlinePresenceSearchTermChanged.emit(getInputValue(event));
  }

  getProfileImageUrl(platformData: social_profile): string {
    return this.getFirstMetadataValue(platformData, [
      'avatar',
      'avatar_url',
      'avatarUrl',
      'AvatarUrl',
      'profile_image',
      'profileImage',
      'profile_image_url',
      'picture',
      'picture_url',
      'image_url',
      'img_src',
      'm_img_src',
    ]);
  }

  isProfileImageFailed(platformData: social_profile): boolean {
    const imageUrl = this.getProfileImageUrl(platformData);
    return !!imageUrl && this.failedProfileImages().has(imageUrl);
  }

  markProfileImageFailed(platformData: social_profile): void {
    const imageUrl = this.getProfileImageUrl(platformData);
    if (!imageUrl) {
      return;
    }
    this.failedProfileImages.update(current => {
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
  }

  getCoverImageUrl(platformData: social_profile): string {
    return this.getFirstMetadataValue(platformData, ['m_coverpage', 'coverpage', 'image_bg', 'cover_image', 'coverImage', 'banner', 'banner_image']);
  }

  getDisplayUrl(value: unknown): string {
    return this.formatMetadataValue(value);
  }

  getProfileDetailEntries(platformData: social_profile): { key: string; value: unknown; }[] {
    return getProfileDetailEntries(platformData);
  }

  getVisibleProfileDetailEntries(platformData: social_profile): { key: string; value: unknown; }[] {
    return this.getProfileDetailEntries(platformData).filter(item => !['img_src', 'm_img_src'].includes(item.key.toLowerCase()));
  }

  formatProfileDetailKey(key: string): string {
    return formatKey(key.replace(/^m_/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
  }

  formatProfileDetailValue(key: string, value: unknown): string {
    if (typeof value === 'string' && this.isProfileDateKey(key)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
    return this.formatMetadataValue(value);
  }

  formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.map(entry => this.formatMetadataValue(entry)).filter(entry => entry !== '').join(', ');
    }
    if (typeof value === 'object') {
      const record = asUnknownRecord(value);
      if (typeof record.is_hate_speech === 'boolean') {
        return record.is_hate_speech ? 'Yes' : 'No';
      }
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
    void navigator.clipboard?.writeText(this.formatMetadataValue(text));
  }

  isNumeric(value: unknown): boolean {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    if (typeof value === 'number') {
      return true;
    }
    const s = String(value);
    return !isNaN(Number(s.replace(/,/g, ''))) && s.trim() !== '';
  }

  getOnlinePresence(platformData: social_profile): social_online_presence_hit[] | null {
    return platformData.online_presence ?? null;
  }

  getOnlinePresenceResults(platformData: social_profile): social_online_presence_hit[] {
    return platformData.online_presence ?? [];
  }

  getStealerLogs(platformData: social_profile): social_stealer_log[] {
    return platformData.stealer_logs ?? [];
  }

  getPlatformStealerDomain(platformData: social_profile): string {
    return platformData.meta.url || platformData.meta.platform;
  }

  getStealerRecordHost(record: social_stealer_log): string {
    return String(record?.source_domain ?? record?.m_source_domain ?? record?.domain ?? record?.m_domain ?? record?.ip ?? record?.m_ip ?? record?.url ?? record?.m_url ?? record?.host ?? record?.m_host ?? record?.raw ?? '-');
  }

  getStealerRecordIdentity(record: social_stealer_log): string {
    return String(record?.email ?? record?.m_email ?? record?.username ?? record?.m_username ?? record?.user ?? record?.m_user ?? record?.login ?? record?.m_login ?? record?.credential ?? record?.m_credential ?? record?.raw ?? '-');
  }

  getStealerRecordDate(record: social_stealer_log): string {
    return String(record?.date ?? record?.m_date ?? record?.timestamp ?? record?.m_timestamp ?? record?.created_at ?? record?.m_created_at ?? record?.updated_at ?? record?.m_updated_at ?? '-');
  }

  getStealerRecordTrackKey(index: number, record: social_stealer_log): string {
    return `${this.getStealerRecordHost(record)}|${this.getStealerRecordIdentity(record)}|${this.getStealerRecordDate(record)}|${index}`;
  }

  getStealerSearchQuery(platformData: social_profile): string {
    return `${platformData.meta.username} ${this.getPlatformStealerDomain(platformData)}`.trim();
  }

  isStealerRowExpanded(index: number): boolean {
    return this.expandedStealerRows().has(index);
  }

  toggleStealerRow(index: number): void {
    this.expandedStealerRows.update(current => {
      const next = new Set<number>();
      if (!current.has(index)) {
        next.add(index);
      }
      return next;
    });
  }

  onStealerRowKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleStealerRow(index);
    }
  }

  toStealerItem(record: social_stealer_log): CredentialResultItem {
    const cached = this.stealerItemCache.get(record);
    if (cached) {
      return cached;
    }
    const toArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.map(entry => String(entry)).filter(entry => entry && entry.toLowerCase() !== 'null');
      }
      return value === undefined || value === null || value === '' ? [] : [String(value)];
    };
    const pick = (...keys: string[]): unknown => {
      for (const key of keys) {
        const value = getOwnProperty(record, key);
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
      return undefined;
    };
    const converted = {
      ...record,
      email: toArray(pick('email', 'm_email')),
      username: toArray(pick('username', 'm_username', 'user', 'm_user', 'login', 'm_login')),
      ip: toArray(pick('ip', 'm_ip')),
      domain: pick('domain', 'm_domain'),
      source_domain: pick('source_domain', 'm_source_domain'),
      password: pick('password', 'm_password'),
      channel: pick('channel', 'm_channel', 'source_channel', 'm_source_channel', 'file', 'filename'),
      date: pick('date', 'm_date', 'timestamp', 'created_at', 'updated_at'),
      raw: pick('raw'),
    } as unknown as CredentialResultItem;
    this.stealerItemCache.set(record, converted);
    return converted;
  }

  openStealerLogExportChoice(event: Event, platformData: social_profile): void {
    event.stopPropagation();
    this.selectedStealerLogPlatform.set(platformData);
  }

  closeStealerLogExportChoice(): void {
    this.selectedStealerLogPlatform.set(null);
  }

  selectStealerLogExport(type: string): void {
    const platformData = this.selectedStealerLogPlatform();
    if ((type === 'csv' || type === 'json' || type === 'report') && platformData) {
      this.exportStealerLogs(platformData, type);
    }
    this.closeStealerLogExportChoice();
  }

  private buildStealerLogRows(platformData: social_profile): Record<string, string>[] {
    return this.getStealerLogs(platformData).map((item, index) => ({
      tenant_name: this.exportBranding.getTenantName(),
      recordType: 'stealer',
      recordIndex: String(index + 1),
      searchQuery: `${platformData.meta.username} ${this.getPlatformStealerDomain(platformData)}`.trim(),
      email: String(item?.email ?? item?.m_email ?? '-'),
      username: String(item?.username ?? item?.m_username ?? '-'),
      domain: String(item?.domain ?? item?.m_domain ?? '-'),
      source: String(this.exportBranding.replaceSystemBrand(String(item?.channel ?? item?.filename ?? item?.file ?? item?.m_source ?? item?.m_scrap_file ?? '-'))),
      hash: String(item?.m_hash ?? '-'),
      title: '-',
      url: String(item?.url ?? item?.m_url ?? '-'),
      rank: '-',
      date: String(item?.date ?? item?.m_date ?? '-'),
      team: '-',
      summary: '-'
    }));
  }

  private exportStealerLogs(platformData: social_profile, type: 'csv' | 'json' | 'report'): void {
    const rows = this.buildStealerLogRows(platformData);
    const query = `${platformData.meta.username} ${this.getPlatformStealerDomain(platformData)}`.trim();
    const payload: GraphReportPayload = {
      graphKind: 'social',
      title: this.translationService.translate('Stealer Logs Export'),
      sessionName: query || 'profile-stealerlogs',
      generatedAtIso: new Date().toISOString(),
      nodes: [],
      edges: [],
      summary: {
        search_query: query || '-',
        total_records: rows.length
      },
      tables: [{ title: this.translationService.translate('Stealer Logs'), values: {}, columns: [...this.stealerLogExportColumns], rows }]
    };
    this.reportExportService.exportByType(payload, type === 'report' ? 'doc_pdf' : type);
  }

  getProfileUrl(platformData: social_profile, username: string): string {
    return buildSocialProfileUrl(platformData.meta.platform, username, platformData.meta.url);
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }

  trackByUsername(_index: number, username: string): string {
    return username;
  }

  private getFirstMetadataValue(platformData: social_profile, keys: string[]): string {
    const sources = [platformData.profile_details, platformData.meta];
    for (const source of sources) {
      const value = this.getFirstValueFromSource(source, keys);
      if (value) {
        return value;
      }
    }
    return '';
  }

  private getFirstValueFromSource(source: unknown, keys: string[]): string {
    if (!source) {
      return '';
    }
    if (Array.isArray(source)) {
      for (const item of source) {
        const value = this.getFirstValueFromSource(item, keys);
        if (value) {
          return value;
        }
      }
      return '';
    }
    const sourceRecord = asUnknownRecord(source);
    for (const key of keys) {
      const value = getOwnProperty(sourceRecord, key);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return this.getFirstValueFromSource(sourceRecord.result ?? sourceRecord.profile ?? sourceRecord.data, keys);
  }

  private isProfileDateKey(key: string): boolean {
    const normalizedKey = key.replace(/^m_/i, '').replace(/[_\s-]/g, '').toLowerCase();
    return ['createdat', 'updatedat', 'date', 'datetime', 'timestamp'].includes(normalizedKey);
  }

  private crawlItemRecord(item: unknown): Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item)
      ? item as Record<string, unknown>
      : { value: item };
  }

  private crawlDescriptionKey(index: number, item: unknown): string {
    return `${this.activeTab()}:${this.crawlItemTrackKey(index, item)}`;
  }

  private hasCrawlItemValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }
}
