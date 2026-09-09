import { AfterViewInit, Component, OnDestroy, OnInit, effect, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ScrollService } from '../../../../shared/services/scroll.service';
import { DefacementGroup, DefacementGroupCallbackItem, DefacementRecord, DefacementResultItem, DefacementRisk, DefacementSummary } from '../../../../shared/model/results/defacement/defacement.callback.model';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { RecordSidebarComponent } from '../../../../shared/partials/record-sidebar/record-sidebar.component';
import { RecordSidebarItem } from '../../../../shared/partials/record-sidebar/model/record-sidebar.model';

const STAGGER_RENDER_BATCH_SIZE = 10;
const STAGGER_RENDER_DELAY_MS = 16;
const RECORD_SIDEBAR_CLOSE_MS = 300;

@Component({
  selector: 'app-dashboard-result-defacement',
  standalone: true, imports: [NgClass, DatePipe, TooltipDirective, TranslatePipe, RecordSidebarComponent],
  templateUrl: './dashboard-result-defacement.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-result-defacement.component.css'],
})
export class DashboardResultDefacementComponent implements OnInit, AfterViewInit, OnDestroy {
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private recordSidebarCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private renderKey = '';
  private renderTargetCount = 0;

  readonly searchResultsInput = input<DefacementResultItem[]>([], { alias: 'searchResults' });
  readonly groupedResultsInput = input<DefacementGroupCallbackItem[]>([], { alias: 'groupedResults' });
  readonly searchQueryInput = input<string>('', { alias: 'searchQuery' });
  currentUrl = '';
  queryParams: { ci: string; } | undefined;
  expandedGroupKey: string | null = null;
  isRecordSidebarVisible = false;
  visibleGroupCount = signal(0);
  searchResults: DefacementResultItem[] = [];
  groupedResults: DefacementGroupCallbackItem[] = [];

  constructor(private router: Router, private route: ActivatedRoute, protected scrollService: ScrollService) {
    effect(() => {
      this.searchResults = this.searchResultsInput();
      this.groupedResults = this.groupedResultsInput();
      const groups = this.getDefacementGroups();
      this.startStaggeredRender(groups.length, this.buildRenderKey(groups));
    });
  }

  ngOnInit() {
    this.currentUrl = this.router.url.split('?')[0];
    if (this.currentUrl.includes('consolidated')) {
      this.currentUrl = this.currentUrl.replace("/all", "/defacement");
    }
    this.route.queryParams.subscribe(() => {
      this.queryParams = { ci: 'defacement' };
    });
  }

  ngAfterViewInit() {
    this.scrollService.scrollToSavedPosition();
  }

  ngOnDestroy() {
    this.clearRenderTimer();
    this.clearRecordSidebarCloseTimer();
  }

  getVisibleResults(): DefacementResultItem[] {
    return this.searchResults.slice(0, 1000);
  }

  getGridPlaceholders(groups: DefacementGroup[]): number[] {
    const remainder = groups.length % 3;
    const count = remainder === 0 ? 0 : 3 - remainder;
    return Array.from({ length: count }, (_, index) => index);
  }

  getDefacementGroups(): DefacementGroup[] {
    if (this.groupedResults.length) {
      return this.groupedResults.map(group => {
        const records = (group.records || []).map(item => this.toDefacementRecord(item));
        const latestSeen = group.latest_seen ?? records.reduce<string | null>((latest, record) => this.getLatestDate(latest, record.leakDate), null);
        const affectedSites = group.affected_sites ?? this.countUnique(records.map(record => this.getSiteLabel(record.item)));
        const ipCount = group.ip_count ?? this.countUnique(records.flatMap(record => record.item.m_ip || []));
        const servers = group.servers?.length ? group.servers : this.uniqueValues(records.flatMap(record => record.item.m_web_server || [])).slice(0, 6);

        return {
          key: group.key || this.normalizeGroupKey(group.title),
          title: group.title || 'Unknown actor',
          subtitle: group.subtitle ?? 'Actor / campaign',
          risk: this.getDefacementRisk(records.length, ipCount),
          records,
          affectedSites,
          ipCount,
          servers,
          latestSeen
        };
      }).sort((a, b) => this.dateTime(b.latestSeen) - this.dateTime(a.latestSeen));
    }

    const groups = new Map<string, DefacementGroup>();
    this.getVisibleResults().forEach(item => {
      const actor = this.getActorLabel(item);
      const key = this.normalizeGroupKey(actor || this.getSiteLabel(item));
      const record = this.toDefacementRecord(item);
      const group = groups.get(key) ?? {
        key,
        title: actor || this.getSiteLabel(item),
        subtitle: actor ? 'Campaign / actor cluster' : 'Affected asset cluster',
        risk: 'Medium',
        records: [],
        affectedSites: 0,
        ipCount: 0,
        servers: [],
        latestSeen: null
      };

      group.records.push(record);
      group.affectedSites = this.countUnique(group.records.map(r => this.getSiteLabel(r.item)));
      group.ipCount = this.countUnique(group.records.flatMap(r => r.item.m_ip || []));
      group.servers = this.uniqueValues(group.records.flatMap(r => r.item.m_web_server || [])).slice(0, 4);
      group.latestSeen = this.getLatestDate(group.latestSeen, record.leakDate);
      group.risk = this.getDefacementRisk(group.records.length, group.ipCount);
      groups.set(key, group);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const riskDelta = this.riskWeight(b.risk) - this.riskWeight(a.risk);
      if (riskDelta !== 0) {
        return riskDelta;
      }
      return this.dateTime(b.latestSeen) - this.dateTime(a.latestSeen);
    });
  }

  getRenderedDefacementGroups(): DefacementGroup[] {
    const groups = this.getDefacementGroups();
    return groups.slice(0, this.visibleGroupCount());
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

  getSelectedGroup(): DefacementGroup | null {
    if (!this.expandedGroupKey) {
      return null;
    }

    return this.getDefacementGroups().find(group => group.key === this.expandedGroupKey) ?? null;
  }

  getSidebarRecords(): DefacementRecord[] {
    const selectedGroup = this.getSelectedGroup();
    const records = selectedGroup ? selectedGroup.records : this.getDefacementGroups().flatMap(group => group.records);
    return [...records].sort((a, b) => this.dateTime(b.leakDate) - this.dateTime(a.leakDate)).slice(0, 1000);
  }

  getSidebarItems(): RecordSidebarItem[] {
    return this.getSidebarRecords().map((record, index) => ({
      id: record.item.m_hash || record.sourceUrl || `${this.normalizeGroupKey(record.title)}-${index}`,
      title: record.title,
      subtitle: this.getActorLabel(record.item) || 'Unknown actor',
      kindLabel: record.item.m_ioc_type?.[0],
      date: record.leakDate,
      tags: [record.ipSummary, record.webServerSummary].filter(value => value && value !== '-'),
      sourceLabel: record.sourceUrl,
      routerLink: [this.currentUrl, record.item.m_hash],
      queryParams: this.queryParams,
      searchText: this.getRecordSearchText(record.item),
      savePositionId: record.item.m_hash,
    }));
  }

  getSidebarSubtitle(): string {
    const selectedGroup = this.getSelectedGroup();
    if (selectedGroup) {
      return `${selectedGroup.records.length} records / ${selectedGroup.title}`;
    }
    const suffix = this.searchQueryInput() ? ` / ${this.searchQueryInput()}` : '';
    return `${this.getSidebarRecords().length} records${suffix}`;
  }

  getActorLabel(item: DefacementResultItem): string {
    const attackers = item.m_attacker?.filter(Boolean) || [];
    if (attackers.length) {
      return attackers.join(', ');
    }
    return item.m_team || '';
  }

  getSiteLabel(item: DefacementResultItem): string {
    return (item.m_url || item.m_base_url || item.m_source_url?.[0] || '-').replace('https://', '').replace('http://', '');
  }

  getFirstSourceUrl(item: DefacementResultItem): string {
    return item.m_source_url?.[0] || '';
  }

  getDefacementRisk(records: number, ipCount: number): DefacementRisk {
    if (records >= 5 || ipCount >= 5) {
      return 'High';
    }
    if (records >= 2 || ipCount >= 2) {
      return 'Medium';
    }
    return 'Low';
  }

  getDefacementSummary(groups: DefacementGroup[]): DefacementSummary {
    const records = groups.flatMap(group => group.records.map(record => record.item));

    return {
      campaigns: groups.length,
      records: records.length,
      affectedSites: this.countUnique(records.map(item => this.getSiteLabel(item))),
      latestSeen: records.reduce<string | null>((latest, item) => this.getLatestDate(latest, item.m_date ?? null), null)
    };
  }

  getPrimarySite(group: DefacementGroup): string {
    return group.records[0]?.title || '-';
  }

  private toDefacementRecord(item: DefacementResultItem): DefacementRecord {
    return {
      item,
      title: this.getSiteLabel(item),
      ipSummary: item.m_ip?.length ? item.m_ip.join(', ') : '-',
      webServerSummary: item.m_web_server?.length ? item.m_web_server.join(', ') : '-',
      sourceUrl: this.getFirstSourceUrl(item),
      leakDate: item.m_date ?? null
    };
  }

  private normalizeGroupKey(value: string): string {
    return String(value || 'unknown').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private buildRenderKey(groups: DefacementGroup[]): string {
    return groups.map(group => `${group.key}:${group.records.length}:${group.latestSeen ?? ''}`).join('|');
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

  private uniqueValues(values: string[]): string[] {
    return Array.from(new Set(values.filter(value => !!String(value || '').trim())));
  }

  private countUnique(values: string[]): number {
    return this.uniqueValues(values).length;
  }

  private getRecordSearchText(item: DefacementResultItem): string {
    return [
      this.getSiteLabel(item),
      this.getActorLabel(item),
      item.m_team,
      ...(item.m_ip || []),
      ...(item.m_web_server || []),
      ...(item.m_source_url || []),
      ...(item.m_ioc_type || []),
    ].filter(Boolean).join(' ').toLowerCase();
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

  private riskWeight(risk: DefacementRisk): number {
    switch (risk) {
      case 'High':
        return 3;
      case 'Medium':
        return 2;
      case 'Low':
        return 1;
      default:
        return 0;
    }
  }
}
