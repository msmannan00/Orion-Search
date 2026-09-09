import { AfterViewInit, Component, ElementRef, OnInit, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { SlicePipe, CommonModule } from '@angular/common';
import { ScrollService } from '../../../../shared/services/scroll.service';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { SocialResultItem } from '../../../../shared/model/results/social/social.callback.model';
import { RemoveEmojisPipe } from '../../../../shared/pipes/remove-emojis-pipe.pipe';
import { AuthService } from '../../../../services/authetication/auth.service';
import { ProxyController } from '../../../../shared/services/proxy-controller';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { SocialThreadComment } from './model/dashboard-result-social.model';
import { getOwnProperty } from '../../../../shared/utils/type-guards.util';

export type { SocialThreadComment } from './model/dashboard-result-social.model';




@Component({
  selector: 'app-dashboard-result-social',
  standalone: true,
  imports: [
    SlicePipe,
    RouterLink,
    TooltipDirective,
    CommonModule,
    RemoveEmojisPipe, TranslatePipe],
  templateUrl: './dashboard-result-social.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-result-social.component.css'],
})
export class DashboardResultSocialComponent implements OnInit, AfterViewInit {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly proxied_resource = inject(ProxyController);

  currentUrl = '';
  queryParams: Params = {};
  isCollapsed = true;
  isConsolidatedView = false;
  readonly searchResults = input<SocialResultItem[]>([]);
  readonly isExpandAble = input<boolean>(false);

  constructor(protected authService: AuthService, private router: Router, private route: ActivatedRoute, protected scrollService: ScrollService) {
  }

  ngAfterViewInit() {
    this.scrollService.scrollToSavedPosition();
  }

  getContentLines(item: SocialResultItem): string[] {
    return item?.m_content
      ? item.m_content
        .split('\n')
        .filter((line: string) => line.trim() && (line.match(/ /g) ?? []).length > 5)
      : [];
  }

  getContentTypes(item: SocialResultItem): string[] {
    if (Array.isArray(item.m_content_type)) {
      return item.m_content_type;
    }
    return item.m_content_type ? [item.m_content_type] : [];
  }

  getDisplaySections(item: SocialResultItem): string[] {
    const contentLines = this.getContentLines(item).slice(1, 5);
    const commentLines = this.getThreadComments(item).map(comment => comment.text).filter(Boolean);
    return [...contentLines, ...commentLines];
  }

  hasCodeType(item: SocialResultItem): boolean {
    return Array.isArray(item.m_content_type)
      ? item.m_content_type.some((t: string) => t.includes('code'))
      : (typeof item.m_content_type === 'string' && item.m_content_type.includes('code'));
  }

  getMessageDate(item: SocialResultItem): string {
    const rawDate = item?.m_date;
    if (!rawDate) {
      return '';
    }
    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return String(rawDate);
    }
    return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getThreadComments(item: SocialResultItem): SocialThreadComment[] {
    const rawItem: Record<string, unknown> = item;
    const sources = [
      rawItem.m_comments,
      rawItem.m_post_comments,
      rawItem.m_post_comments_list,
      rawItem.m_post_comment_list,
      rawItem.m_comment,
      rawItem.m_comment_list,
      rawItem.m_comments_list,
      rawItem.comments,
      rawItem.comment_items,
      rawItem.comment_details,
      rawItem.comments_list,
      rawItem.post_comments_list,
      rawItem.m_replies,
      rawItem.replies,
      rawItem.m_thread_comments,
      rawItem.thread_comments
    ];
    return sources.flatMap(source => this.normalizeComments(source)).slice(0, 3);
  }

  getCommentCount(item: SocialResultItem): string {
    const rawItem: Record<string, unknown> = item;
    return String(item.m_comment_count ?? item.m_post_comments_count ?? item.m_comments_count ?? rawItem.comment_count ?? rawItem.comments_count ?? '');
  }

  getResultDisplayLimit(): number {
    return this.isExpandAble() && this.isCollapsed ? 2 : 30;
  }

  toggleCollapsed(): void {
    const previousLimit = this.getResultDisplayLimit();
    const isExpanding = this.isCollapsed;
    this.isCollapsed = !this.isCollapsed;
    this.scrollToResultIndex(isExpanding ? previousLimit : 0);
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

  private normalizeComments(value: unknown): SocialThreadComment[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.flatMap(item => this.normalizeComments(item));
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          return this.normalizeComments(JSON.parse(trimmed));
        }
        catch {
          return [{ text: trimmed }];
        }
      }
      return trimmed.split('\n').map(text => text.trim()).filter(Boolean).map(text => ({ text }));
    }
    if (typeof value === 'object') {
      const comment = value as Record<string, unknown>;
      const text = comment.text ?? comment.comment ?? comment.comment_text ?? comment.m_comment_text ?? comment.m_comment ?? comment.m_text ?? comment.content ?? comment.comment_content ?? comment.m_content ?? comment.message ?? comment.body ?? comment.m_body ?? comment.comment_body ?? comment.reply ?? comment.reply_content ?? comment.description;
      if (!text) {
        const nestedKeys = ['m_comments', 'm_post_comments', 'm_post_comments_list', 'm_post_comment_list', 'm_comments_list', 'comments', 'comment_items', 'comment_details', 'comments_list', 'post_comments_list', 'm_replies', 'replies', 'm_thread_comments', 'thread_comments'];
        const nestedComments = nestedKeys.flatMap(key => this.normalizeComments(getOwnProperty(comment, key)));
        if (nestedComments.length) {
          return nestedComments;
        }
        const keys = Object.keys(comment);
        if (keys.length && keys.every(key => /^\d+$/.test(key))) {
          return Object.values(comment).flatMap(item => this.normalizeComments(item));
        }
        return [];
      }
      return [{
        sender: String(comment.sender_name ?? comment.m_sender_name ?? comment.author ?? comment.m_author ?? comment.comment_author ?? comment.username ?? comment.user ?? comment.name ?? comment.from ?? ''),
        date: String(comment.m_date ?? comment.date ?? comment.datetime ?? comment.created_at ?? comment.timestamp ?? comment.time ?? comment.m_time ?? ''),
        likes: String(comment.likes ?? comment.m_likes ?? comment.like_count ?? ''),
        text: String(text)
      }];
    }
    return [];
  }

  ngOnInit() {
    this.currentUrl = this.router.url.split('?')[0];
    this.isConsolidatedView = this.currentUrl.includes('/consolidated/');
    if (this.currentUrl.includes('consolidated')) {
      this.currentUrl = this.currentUrl.replace('/all', '/social');
    }
    else if (this.currentUrl.includes('discussion')) {
      this.currentUrl = this.currentUrl + '/social';
    }
    this.route.queryParams.subscribe(params => {
      this.queryParams = {
        ...params,
        ci: 'social'
      };
    });
  }

  openExternalUrl(url?: string | null) {
    if (!this.authService.getIsMobileDemo() || !url) {
      return;
    }

    this.proxied_resource.open(url);
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
}
