import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatResultItem } from '../../../../shared/model/results/chat/chat.callback.model';
import { CommonModule, NgClass, SlicePipe } from '@angular/common';
import { ResultListComponent } from '../../../../shared/partials/result-components/result-list/result-list.component';
import { ResultSectionComponent } from '../../../../shared/partials/result-components/result-section/result-section.component';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { JsonApiViewerComponent } from '../../../../shared/partials/json-api-viewer/json-api-viewer.component';
import { last } from 'rxjs';
import { SocialResultItem } from '../../../../shared/model/results/social/social.callback.model';
import { ReportHeaderComponent } from '../../../../shared/partials/report-header/report-header.component';
import { DashboardService } from '../../../../services/dashboard/dashboard.service';
import { ChatWidgetComponent } from '../../../root-searches/ai-workspace/chat-widget/chat-widget.component';
import { AppService } from '../../../../services/core/app/app.service';
import { ScrollService } from '../../../../shared/services/scroll.service';
import { formatKeyLabel as formatKeyLabelUtil, getDisplayTitle as getDisplayTitleUtil, isHiddenReportMetadataKey, normalizeDisplayUrl as normalizeDisplayUrlUtil } from '../../../../shared/utils/intel-report.util';
import { NetworkIntelScanService } from '../../../../shared/services/network-intel/network-intel-scan.service';
import { ReportInteractionHostComponent } from '../../../../shared/partials/report-interactions/report-interaction-host/report-interaction-host.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';


@Component({
  selector: 'app-report-chat',
  templateUrl: './report-chat.component.html',
  styleUrls: ['./report-chat.component.css'],
  standalone: true,
  imports: [
    ResultListComponent,
    ResultSectionComponent,
    SlicePipe,
    CommonModule,
    NgClass,
    JsonApiViewerComponent,
    TooltipDirective,
    ReportHeaderComponent,
    ChatWidgetComponent,
    ReportInteractionHostComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ReportChatComponent implements OnInit, AfterViewInit {
  private readonly commentTabKeys = new Set(['m_comments', 'm_post_comments', 'm_post_comments_list', 'm_post_comment_list', 'm_comment_list', 'm_comments_list', 'comments', 'comment_items', 'comment_details', 'comments_list', 'post_comments_list', 'm_replies', 'replies', 'm_thread_comments', 'thread_comments']);

  protected readonly last = last;

  resultItem: ChatResultItem | SocialResultItem | null = null;
  arrayKeys: string[] = [];
  listItems: string[] = [];
  activeTab = '';
  content = '';
  summary = '';
  isExpandedMetadata = true;

  constructor(protected appService: AppService, private route: ActivatedRoute, public dashboardService: DashboardService, private router: Router, private scrollService: ScrollService, private elementRef: ElementRef<HTMLElement>, private scanHelperMethodsService: NetworkIntelScanService) {
  }

  ngOnInit(): void {
    this.route.data.subscribe(({ reportdata }) => {
      this.resultItem = reportdata;
      this.processResultItem();
      this.scrollToTop();
    });
  }

  ngAfterViewInit(): void {
    this.scrollToTop();
  }

  private scrollToTop(): void {
    this.scrollService.scrollReportToTop();
    this.elementRef.nativeElement.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  langUpdate(result: unknown) {
    this.resultItem = result as ChatResultItem | SocialResultItem;
    this.processResultItem();
    this.syncActiveMetadataTab();
  }

  metaadataToggleContent(): void {
    this.isExpandedMetadata = !this.isExpandedMetadata;
    if (this.router.url.split('?')[0] != this.dashboardService.m_current_route) {
      this.ngOnInit();
    }
  }

  processResultItem() {
    const resultItem = this.resultItem;
    if (resultItem) {
      this.content = resultItem.m_content ?? '';
      this.summary = (resultItem.m_summary?.[0]) || '';
      this.arrayKeys = [];
      const addedKeys = new Set<string>();
      if (resultItem.m_content?.trim()) {
        this.arrayKeys.push('m_content');
        addedKeys.add('m_content');
      }
      if (Array.isArray(resultItem.m_summary) && resultItem.m_summary[0]?.trim()) {
        this.arrayKeys.push('m_summary');
        addedKeys.add('m_summary');
      }
      Object.keys(resultItem).forEach((key) => {
        const value = getOwnProperty(resultItem, key);
        if (Array.isArray(value) &&
                    value.length > 0 &&
                    !isHiddenReportMetadataKey(key) &&
                    !addedKeys.has(key)) {
          this.arrayKeys.push(key);
          addedKeys.add(key);
        }
      });
      if (!this.activeTab) {
        let selectedTab = '';
        if (this.arrayKeys.includes('m_email')) {
          selectedTab = 'm_email';
        }
        else if (this.arrayKeys.includes('m_entity')) {
          selectedTab = 'm_entity';
        }
        else if (this.arrayKeys.includes('m_content_type')) {
          selectedTab = 'm_content_type';
        }
        else if (this.arrayKeys.length > 0) {
          selectedTab = this.arrayKeys[0] ?? '';
        }
        if (selectedTab) {
          this.setActiveTab(selectedTab);
          const index = this.arrayKeys.indexOf(selectedTab);
          if (index > 0) {
            this.arrayKeys.splice(index, 1);
            this.arrayKeys.unshift(selectedTab);
          }
        }
      }
    }
  }

  private syncActiveMetadataTab(): void {
    if (!this.arrayKeys.length) {
      this.activeTab = '';
      this.listItems = [];
      return;
    }
    if (!this.activeTab || !this.arrayKeys.includes(this.activeTab)) {
      this.activeTab = this.arrayKeys[0];
    }
    if (this.activeTab === 'm_content' || this.activeTab === 'm_summary') {
      this.listItems = [];
      return;
    }
    if (this.resultItem && Array.isArray(this.resultItem[this.activeTab])) {
      this.listItems = this.getMetadataListItems(this.activeTab);
    }
    else {
      this.listItems = [];
    }
  }

  setActiveTab(tab: string) {
    if (this.activeTab === tab) {
      this.activeTab = '';
      this.listItems = [];
      return;
    }
    this.activeTab = tab;
    if (tab === 'm_content' || tab === 'm_summary') {
      this.listItems = [];
    }
    else if (this.resultItem && Array.isArray(getOwnProperty(this.resultItem, tab))) {
      this.listItems = this.getMetadataListItems(tab);
    }
    else {
      this.listItems = [];
    }
  }

  getContentLines(item: ChatResultItem | SocialResultItem | null): string[] {
    return item?.m_content
      ? item.m_content
        .split('\n')
        .filter((line: string) => line.trim() && (line.match(/ /g) ?? []).length > 5)
      : [];
  }

  getContentWithoutEmptyLines(content: string | undefined): string {
    if (!content) {
      return "";
    }
    return (content || '')
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');
  }

  hasCodeType(obj: ChatResultItem | SocialResultItem | null): boolean {
    const t = obj?.m_content_type;
    return Array.isArray(t) ? t.some((x: string) => x?.includes('code')) : (typeof t === 'string' && t.includes('code'));
  }

  formatKeyLabel(key: string): string {
    return formatKeyLabelUtil(key);
  }

  getMetadataCount(key: string): number {
    if (key === 'm_content') {
      return this.content ? 1 : 0;
    }
    if (key === 'm_summary') {
      return this.summary ? 1 : 0;
    }
    const value = getOwnProperty(this.resultItem, key);
    return Array.isArray(value) ? value.length : value ? 1 : 0;
  }

  private getMetadataListItems(tab: string): string[] {
    if (!this.resultItem) {
      return [];
    }
    const value = getOwnProperty(this.resultItem, tab);
    if (this.commentTabKeys.has(tab)) {
      return this.normalizeCommentValues(value).slice(0, 100);
    }
    return Array.isArray(value) ? value.map(item => this.toDisplayValue(item)).filter(Boolean).slice(0, 100) : [];
  }

  private normalizeCommentValues(value: unknown): string[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.flatMap(item => this.normalizeCommentValues(item));
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          return this.normalizeCommentValues(JSON.parse(trimmed));
        }
        catch {
          return [trimmed];
        }
      }
      return [trimmed];
    }
    if (typeof value === 'object') {
      const comment = value as Record<string, unknown>;
      const text = comment.text ?? comment.comment ?? comment.comment_text ?? comment.m_comment_text ?? comment.m_comment ?? comment.m_text ?? comment.content ?? comment.comment_content ?? comment.m_content ?? comment.message ?? comment.body ?? comment.m_body ?? comment.comment_body ?? comment.reply ?? comment.reply_content ?? comment.description;
      if (text) {
        const meta = [
          comment.sender_name ?? comment.m_sender_name ?? comment.author ?? comment.m_author ?? comment.comment_author ?? comment.username ?? comment.user ?? comment.name ?? comment.from,
          comment.m_date ?? comment.date ?? comment.datetime ?? comment.created_at ?? comment.timestamp ?? comment.time ?? comment.m_time
        ].map(item => this.toDisplayValue(item)).filter(Boolean).join(' - ');
        const displayText = this.toDisplayValue(text);
        return [meta ? `${meta}: ${displayText}` : displayText];
      }
      return Array.from(this.commentTabKeys).flatMap(key => this.normalizeCommentValues(getOwnProperty(comment, key)));
    }
    return [String(value)];
  }

  private toDisplayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  getDisplayChannelTitle(name?: string | null, fallbackUrl?: string | null): string {
    return getDisplayTitleUtil(name, fallbackUrl, 'Untitled Channel');
  }

  normalizeDisplayUrl(url?: string | null): string {
    return normalizeDisplayUrlUtil(url, '-');
  }

  getDisplayMessageDate(item: ChatResultItem | SocialResultItem | null): string {
    const rawItem = item as Record<string, unknown> | null;
    const value = this.getFirstRenderableValue(rawItem?.m_date,
      rawItem?.m_message_date,
      rawItem?.message_date,
      rawItem?.date,
      rawItem?.created_at,
      rawItem?.m_created_at,
      rawItem?.m_creation_date,
      rawItem?.m_update_date,
      rawItem?.m_time);
    return this.formatDateValue(value);
  }

  getDisplayMessageId(item: ChatResultItem | SocialResultItem | null): string {
    const rawItem = item as Record<string, unknown> | null;
    const messageId = String(rawItem?.m_message_id ?? '').trim();
    if (!messageId || this.isSlugLikeMessageId(messageId, String(rawItem?.m_platform ?? ''))) {
      return '';
    }
    return messageId;
  }

  hasValue(value: unknown): boolean {
    return this.scanHelperMethodsService.hasRenderableValue(value);
  }

  get reportDocId(): string {
    return String(this.resultItem?.m_hash ?? this.resultItem?._id ?? '');
  }

  private getFirstRenderableValue(...values: unknown[]): unknown {
    return values.find(value => this.hasValue(value));
  }

  private formatDateValue(value: unknown): string {
    if (!this.hasValue(value)) {
      return '';
    }
    const rawValue = Array.isArray(value) ? value[0] : value;
    const rawDate = String(rawValue ?? '').trim();
    if (!rawDate) {
      return '';
    }
    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return rawDate;
    }
    return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  private isSlugLikeMessageId(value: string, platform?: string): boolean {
    const normalizedPlatform = String(platform ?? '').toLowerCase();
    const hasPercentEncoding = /%[0-9a-f]{2}/i.test(value);
    const decodedValue = this.decodeURIComponentSafe(value);
    const hasSlugSeparator = /[-_/]/.test(decodedValue);
    return (normalizedPlatform === 'forum' && (hasPercentEncoding || (decodedValue.length > 80 && hasSlugSeparator))) ||
      (hasPercentEncoding && decodedValue.length > 80);
  }

  private decodeURIComponentSafe(value: string): string {
    try {
      return decodeURIComponent(value);
    }
    catch {
      return value;
    }
  }
}
