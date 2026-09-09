import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScrollService } from '../../../../shared/services/scroll.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { RecordSidebarComponent } from '../../../../shared/partials/record-sidebar/record-sidebar.component';
import { AptIntelGroup, AptIntelRecord, AptIntelResultItem, AptIntelSummary } from '../../../../shared/model/results/apt-intel/apt-intel.callback.model';
import { RecordSidebarItem } from '../../../../shared/partials/record-sidebar/model/record-sidebar.model';

const STAGGER_RENDER_BATCH_SIZE = 10;
const STAGGER_RENDER_DELAY_MS = 16;
const RECORD_SIDEBAR_CLOSE_MS = 300;

@Component({
  selector: 'app-dashboard-result-apt',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslatePipe, RouterLink, RecordSidebarComponent],
  templateUrl: './dashboard-result-apt.component.html',
  styleUrls: ['./dashboard-result-apt.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class DashboardResultAptComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private recordSidebarCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private renderKey = '';
  private renderTargetCount = 0;

  currentUrl = '';
  queryParams: Record<string, string> = {};
  isCollapsed = true;
  isConsolidatedView = false;
  expandedGroupKey: string | null = null;
  isRecordSidebarVisible = false;
  visibleGroupCount = signal(0);
  readonly searchResults = input<AptIntelResultItem[]>([]);
  readonly isExpandAble = input<boolean>(false);
  readonly directResults = input<boolean>(false);

  constructor(private router: Router, private route: ActivatedRoute, protected scrollService: ScrollService) {
    effect(() => {
      if (this.directResults()) {
        const results = this.getVisibleResults();
        this.startStaggeredRender(results.length, this.buildDirectRenderKey(results));
        return;
      }
      const groups = this.getAptIntelGroups().slice(0, this.getGroupDisplayLimit());
      this.startStaggeredRender(groups.length, this.buildRenderKey(groups));
    });
  }

  ngOnInit(): void {
    this.currentUrl = this.router.url.split('?')[0];
    this.isConsolidatedView = this.currentUrl.includes('/consolidated/');
    this.route.queryParams.subscribe(params => {
      this.queryParams = { ...params };
    });
  }

  ngAfterViewInit(): void {
    this.scrollService.scrollToSavedPosition();
  }

  ngOnDestroy(): void {
    this.clearRenderTimer();
    this.clearRecordSidebarCloseTimer();
  }

  getVisibleResults(): AptIntelResultItem[] {
    const limit = this.isExpandAble() && this.isCollapsed ? 2 : 100;
    return this.searchResults().slice(0, limit);
  }

  getVisibleDirectResults(): AptIntelResultItem[] {
    return this.getVisibleResults().slice(0, this.visibleGroupCount());
  }

  getVisibleGroups(): AptIntelGroup[] {
    const groups = this.getAptIntelGroups().slice(0, this.getGroupDisplayLimit());
    return groups.slice(0, this.visibleGroupCount());
  }

  getGridPlaceholders(results: unknown[]): number[] {
    const remainder = results.length % 3;
    const count = remainder === 0 ? 0 : 3 - remainder;
    return this.isConsolidatedView ? [] : Array.from({ length: count }, (_, index) => index);
  }

  getAptIntelSummary(): AptIntelSummary {
    const results = this.searchResults();
    const latestItem = results.find(item => this.getDateValue(item));
    return {
      total: results.length,
      actorCount: this.getAptIntelGroups().length,
      malwareCount: results.filter(item => this.isMalware(item)).length,
      latestSeen: latestItem ? this.getDateValue(latestItem) : null,
      referenceCount: results.reduce((count, item) => count + this.getReferenceCount(item), 0),
    };
  }

  getAptIntelGroups(): AptIntelGroup[] {
    const groups = new Map<string, AptIntelGroup>();
    this.searchResults().forEach(item => {
      const title = this.getActorGroupTitle(item);
      const key = this.normalizeGroupKey(title);
      const record = this.toAptIntelRecord(item);
      const group = groups.get(key) ?? {
        key,
        title,
        subtitle: this.getGroupSubtitle(item),
        sourceTypes: [],
        records: [],
        latestSeen: null,
        referenceCount: 0,
        artifactCount: 0,
        tags: [],
      };

      group.records.push(record);
      group.latestSeen = this.getLatestDate(group.latestSeen, record.date);
      group.referenceCount += this.getReferenceCount(item);
      group.artifactCount += this.getArtifactCount(item);
      group.sourceTypes = this.uniqueValues([...group.sourceTypes, this.getKindLabel(item)]);
      group.tags = this.uniqueValues([...group.tags, ...this.getTags(item)]).slice(0, 5);
      groups.set(key, group);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const dateDelta = this.dateTime(b.latestSeen) - this.dateTime(a.latestSeen);
      return dateDelta !== 0 ? dateDelta : b.records.length - a.records.length;
    });
  }

  toggleGroup(key: string): void {
    if (this.expandedGroupKey === key && this.isRecordSidebarOpen()) {
      this.closeRecordSidebar();
      return;
    }
    this.expandedGroupKey = key;
    this.openRecordSidebar();
  }

  isGroupExpanded(key: string): boolean {
    return this.expandedGroupKey === key && this.isRecordSidebarOpen();
  }

  isRecordSidebarOpen(): boolean {
    return this.isRecordSidebarVisible;
  }

  openRecordSidebar(): void {
    this.clearRecordSidebarCloseTimer();
    this.isRecordSidebarVisible = true;
  }

  closeRecordSidebar(): void {
    this.isRecordSidebarVisible = false;
    this.clearRecordSidebarCloseTimer();
    this.recordSidebarCloseTimer = setTimeout(() => {
      if (!this.isRecordSidebarVisible) {
        this.expandedGroupKey = null;
      }
      this.recordSidebarCloseTimer = null;
    }, RECORD_SIDEBAR_CLOSE_MS);
  }

  toggleCollapsed(): void {
    const previousLimit = this.directResults() ? this.getDirectResultDisplayLimit() : this.getGroupDisplayLimit();
    const isExpanding = this.isCollapsed;
    this.isCollapsed = !this.isCollapsed;
    if (this.directResults()) {
      const results = this.getVisibleResults();
      this.startStaggeredRender(results.length, this.buildDirectRenderKey(results));
      this.scrollToResultIndex(isExpanding ? previousLimit : 0);
      return;
    }
    const groups = this.getAptIntelGroups().slice(0, this.getGroupDisplayLimit());
    this.startStaggeredRender(groups.length, this.buildRenderKey(groups));
    this.scrollToResultIndex(isExpanding ? previousLimit : 0);
  }

  getSelectedGroup(): AptIntelGroup | null {
    if (!this.expandedGroupKey) {
      return null;
    }
    return this.getAptIntelGroups().find(group => group.key === this.expandedGroupKey) ?? null;
  }

  getSidebarRecords(): AptIntelRecord[] {
    const selectedGroup = this.getSelectedGroup();
    const records = selectedGroup ? selectedGroup.records : this.getAptIntelGroups().flatMap(group => group.records);
    return [...records].sort((a, b) => this.dateTime(b.date) - this.dateTime(a.date));
  }

  getSidebarItems(): RecordSidebarItem[] {
    return this.getSidebarRecords().map((record, index) => ({
      id: record.item.m_hash ?? record.item._id ?? record.item.m_sha256_hash ?? `${this.normalizeGroupKey(record.title)}-${index}`,
      title: record.title,
      subtitle: this.getPrimaryIdentity(record.item),
      kindLabel: this.getKindLabel(record.item),
      date: record.date,
      tags: this.getTags(record.item).slice(0, 3),
      sourceLabel: record.sourceLabel,
      routerLink: this.getReportLink(record.item),
      queryParams: this.getQueryParams(record.item),
      searchText: this.getRecordSearchText(record.item),
      savePositionId: record.item.m_hash ?? record.item._id ?? record.item.m_sha256_hash ?? '',
    }));
  }

  getSidebarSubtitle(): string {
    const selectedGroup = this.getSelectedGroup();
    if (selectedGroup) {
      return `${selectedGroup.records.length} records / ${selectedGroup.title}`;
    }
    return `${this.getSidebarRecords().length} records`;
  }

  getReportLink(item: AptIntelResultItem): string[] {
    const reportId = this.getReportId(item);
    if (this.isDefacement(item)) {
      return ['/dashboard', 'defacement', 'hacked', reportId];
    }
    if (this.currentUrl.includes('/consolidated/')) {
      const category = this.isMalware(item) ? 'malware' : 'apt';
      return [this.currentUrl.replace(/\/consolidated\/[^/]+$/, `/consolidated/${category}`), reportId];
    }
    const category = this.isMalware(item) ? 'malware-bazaar' : 'apt';
    if (this.currentUrl.includes('/apt-intel/')) {
      return [this.currentUrl.replace(/\/apt-intel\/[^/]+$/, `/apt-intel/${category}`), reportId];
    }
    return [this.currentUrl, category, reportId];
  }

  getQueryParams(item: AptIntelResultItem): Record<string, string> {
    return {
      ...this.queryParams,
      ci: this.isDefacement(item) ? 'defacement' : this.isMalware(item) ? 'malware' : 'apt',
    };
  }

  getItemKey(item: AptIntelResultItem, index = 0): string {
    return this.getReportId(item) ?? item.m_url ?? item.m_base_url ?? `${index}`;
  }

  getReportId(item: AptIntelResultItem): string {
    return item.m_hash ?? item._id ?? item.m_sha256_hash ?? item.m_sha1_hash ?? item.m_md5_hash ?? '';
  }

  saveCurrentPosition(item: AptIntelResultItem): void {
    this.scrollService.saveCurrentPosition(this.getReportId(item));
  }

  getKindLabel(item: AptIntelResultItem): string {
    if (this.isDefacement(item)) {
      return 'Defacement';
    }
    return this.isMalware(item) ? 'Malware' : 'APT';
  }

  getTitle(item: AptIntelResultItem): string {
    return item.m_title ?? item.m_team ?? this.toList(item.m_attacker)[0] ?? item.m_family ?? item.m_signature ?? item.m_file_name ?? item.m_url ?? 'Untitled intel';
  }

  getPrimarySource(item: AptIntelResultItem): string {
    return item.m_reporter ?? item.m_source_url ?? item.m_url ?? item.m_base_url ?? '';
  }

  getDateValue(item: AptIntelResultItem): string | null {
    return item.m_date ?? item.m_first_seen ?? item.m_last_seen ?? item.m_update_date ?? item.m_creation_date ?? null;
  }

  getPrimaryIdentity(item: AptIntelResultItem): string {
    if (this.isDefacement(item)) {
      return item.m_team ?? this.toList(item.m_attacker)[0] ?? item.m_url ?? item.m_base_url ?? '-';
    }
    if (this.isMalware(item)) {
      return item.m_sha256_hash ?? item.m_sha1_hash ?? item.m_md5_hash ?? item.m_signature ?? item.m_file_name ?? '-';
    }
    return item.m_family ?? this.toList(item.m_aliases)[0] ?? item.m_country ?? '-';
  }

  getTags(item: AptIntelResultItem): string[] {
    const values = this.isDefacement(item)
      ? [item.m_ioc_type, item.m_web_server, item.m_country, item.m_platform, item.m_ip]
      : this.isMalware(item)
        ? [item.m_file_type, item.m_file_type_mime, item.m_platform, item.m_signature, ...this.toList(item.m_tags)]
        : [item.m_family, item.m_country, item.m_origin_country, item.m_platform, ...this.toList(item.m_aliases)];
    return values
      .flatMap(value => this.toList(value))
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  getReferenceCount(item: AptIntelResultItem): number {
    return (item.m_references ?? []).length + (item.m_sha256_hash ? 1 : 0);
  }

  getArtifactCount(item: AptIntelResultItem): number {
    return [
      item.m_sha256_hash,
      item.m_sha1_hash,
      item.m_md5_hash,
      item.m_file_name,
      item.m_file_type,
      item.m_signature,
      item.m_url,
      item.m_base_url,
      ...this.toList(item.m_ip),
    ].filter(Boolean).length;
  }

  getAccentClass(item: AptIntelResultItem): string {
    if (this.isDefacement(item)) {
      return 'bg-amber-400';
    }
    return this.isMalware(item) ? 'bg-rose-500' : 'bg-sky-400';
  }

  getGroupAccentClass(group: AptIntelGroup): string {
    const first = group.records[0]?.item;
    return first ? this.getAccentClass(first) : 'bg-[var(--color-divider)]';
  }

  getGroupSourceLabel(group: AptIntelGroup): string {
    return group.sourceTypes.join(' / ') || '-';
  }

  getGroupPrimarySource(group: AptIntelGroup): string {
    return group.records.map(record => record.sourceLabel).find(Boolean) ?? '-';
  }

  getGroupProfileLabel(group: AptIntelGroup): string {
    const first = group.records[0]?.item;
    return first ? (first.m_platform ?? first.m_origin_country ?? first.m_country ?? '-') : '-';
  }

  isMalware(item: AptIntelResultItem): boolean {
    return item.rank_index === 'malware_model';
  }

  isDefacement(item: AptIntelResultItem): boolean {
    return item.rank_index === 'defacement_model';
  }

  private getActorGroupTitle(item: AptIntelResultItem): string {
    if (this.isDefacement(item)) {
      return item.m_team ?? this.toList(item.m_attacker)[0] ?? item.m_url ?? item.m_base_url ?? 'Unknown actor';
    }
    if (this.isMalware(item)) {
      return item.m_signature ?? item.m_family ?? item.m_file_name ?? item.m_title ?? 'Unknown malware';
    }
    return item.m_family ?? item.m_title ?? this.toList(item.m_aliases)[0] ?? 'Unknown actor';
  }

  private getGroupSubtitle(item: AptIntelResultItem): string {
    if (this.isDefacement(item)) {
      return 'Defacement actor';
    }
    if (this.isMalware(item)) {
      return 'Malware family';
    }
    return 'APT actor';
  }

  private toAptIntelRecord(item: AptIntelResultItem): AptIntelRecord {
    return {
      item,
      title: this.getTitle(item),
      sourceLabel: this.getPrimarySource(item),
      date: this.getDateValue(item),
    };
  }

  private getRecordSearchText(item: AptIntelResultItem): string {
    return [
      this.getTitle(item),
      this.getKindLabel(item),
      this.getPrimarySource(item),
      this.getPrimaryIdentity(item),
      item.m_team,
      item.m_url,
      item.m_base_url,
      item.m_file_name,
      item.m_signature,
      item.m_sha256_hash,
      item.m_sha1_hash,
      item.m_md5_hash,
      ...this.toList(item.m_attacker),
      ...this.toList(item.m_aliases),
      ...this.toList(item.m_references),
      ...this.toList(item.m_tags),
      ...this.toList(item.m_ip),
      ...this.toList(item.m_web_server),
      ...this.toList(item.m_ioc_type),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  private normalizeGroupKey(value: string): string {
    return String(value || 'unknown').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private getGroupDisplayLimit(): number {
    return this.isExpandAble() && this.isCollapsed ? 2 : 100;
  }

  private getDirectResultDisplayLimit(): number {
    return this.isExpandAble() && this.isCollapsed ? 2 : 100;
  }

  private buildRenderKey(groups: AptIntelGroup[]): string {
    return groups.map(group => `${group.key}:${group.records.length}:${group.latestSeen ?? ''}`).join('|');
  }

  private buildDirectRenderKey(results: AptIntelResultItem[]): string {
    return results.map((item, index) => this.getItemKey(item, index)).join('|');
  }

  private startStaggeredRender(targetCount: number, key: string): void {
    if (this.renderKey === key && this.renderTargetCount === targetCount) {
      return;
    }
    this.clearRenderTimer();
    this.renderKey = key;
    this.renderTargetCount = targetCount;
    this.visibleGroupCount.set(Math.min(targetCount, STAGGER_RENDER_BATCH_SIZE));
    this.revealNextGroupBatch();
  }

  private revealNextGroupBatch(): void {
    if (this.visibleGroupCount() >= this.renderTargetCount) {
      return;
    }
    this.renderTimer = setTimeout(() => {
      this.visibleGroupCount.update(count => Math.min(count + STAGGER_RENDER_BATCH_SIZE, this.renderTargetCount));
      this.revealNextGroupBatch();
    }, STAGGER_RENDER_DELAY_MS);
  }

  private clearRenderTimer(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }

  private clearRecordSidebarCloseTimer(): void {
    if (this.recordSidebarCloseTimer) {
      clearTimeout(this.recordSidebarCloseTimer);
      this.recordSidebarCloseTimer = null;
    }
  }

  private scrollToResultIndex(index: number): void {
    if (index < 0) {
      return;
    }
    setTimeout(() => {
      this.elementRef.nativeElement
        .querySelector<HTMLElement>(`[data-result-index="${index}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  private uniqueValues(values: string[]): string[] {
    return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
  }

  private getLatestDate(current: string | null, next: string | null): string | null {
    if (!current) {
      return next;
    }
    if (!next) {
      return current;
    }
    return this.dateTime(next) > this.dateTime(current) ? next : current;
  }

  private dateTime(value: string | null): number {
    if (!value) {
      return 0;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toList(value?: string | string[] | null): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    return value ? [value] : [];
  }
}
