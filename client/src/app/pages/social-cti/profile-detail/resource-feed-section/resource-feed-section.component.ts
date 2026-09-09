import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { applyImageFallback } from '../../utils/image-fallback.util';
import { asRecord, formatKeyLabel, initialOf, leftoverEntries, pickCount, pickFlag, pickList, pickText, pickTime, toggleKey } from '../../utils/resource-view.util';
import { SocialConnectionsPopupComponent } from '../connections-popup/social-connections-popup.component';
import type { feed_item_view } from './model/resource-feed-section.model';
export type { feed_item_view } from './model/resource-feed-section.model';




const MEDIA_TYPES = new Set(['image', 'images', 'photo', 'picture', 'video', 'reel', 'reels', 'short', 'shorts', 'clip', 'album', 'carousel', 'gif', 'pin', 'media', 'story']);
const VIDEO_TYPES = new Set(['video', 'reel', 'reels', 'short', 'shorts', 'clip']);
const PERSON_TYPES = new Set(['followers', 'following', 'friends', 'members', 'organizations', 'user', 'users', 'person', 'people', 'friend', 'page', 'profile', 'account', 'member', 'organization']);

const CLAIMED_KEYS = new Set([
  'type', 'resource_id', 'post_id', 'id', 'url', 'short_url', 'parent_url', 'title', 'title_text', 'caption', 'description', 'text', 'body', 'content', 'content_text', 'author', 'author_name', 'display_name', 'username', 'handle', 'screen_name', 'acct',
  'avatar', 'author_avatar', 'user_avatar', 'profile_image', 'datetime', 'created_at', 'published_at', 'published_text', 'edited_at', 'media_type', 'post_type', 'content_type', 'media_url', 'thumbnail_url', 'thumbnail', 'image_url', 'image_urls', 'media_urls', 'video_url', 'is_video',
  'duration', 'duration_text', 'video_duration', 'likes', 'likes_count', 'like_count', 'favorites', 'favorite_count', 'shares', 'shares_count', 'repost_count', 'reposts', 'retweets', 'reblogs_count', 'views', 'views_count', 'view_count', 'views_text',
  'comments', 'comments_count', 'comment_count', 'replies', 'replies_count', 'reply_count', 'quote_count', 'quotes', 'bookmark_count', 'bookmarks', 'hate_speech', 'is_reply', 'reply_to', 'in_reply_to', 'is_repost', 'is_retweet', 'is_quote', 'quoted_url', 'is_pinned', 'pinned',
  'sensitive', 'is_sensitive', 'spoiler', 'content_warning', 'is_verified', 'verified', 'hashtags', 'tags', 'mentions', 'language', 'location', 'repo', 'repo_url', 'branch', 'commit_count', 'commits', 'event',
]);

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u00c0-\uffff]+/g, '');
}

@Component({
  selector: 'app-social-resource-feed',
  templateUrl: './resource-feed-section.component.html',
  standalone: true,
  imports: [DatePipe, TranslatePipe, SocialConnectionsPopupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialResourceFeedSectionComponent {
  private readonly expandedKeys = signal<Set<string>>(new Set<string>());
  private readonly expandedBodies = signal<Set<string>>(new Set<string>());
  private readonly revealedWarnings = signal<Set<string>>(new Set<string>());
  private readonly ownAvatar = computed(() => ({ avatar: this.profileAvatar().trim(), names: new Set([this.profileName(), this.profileUsername()].map(normalizeName).filter(Boolean)) }));
  private readonly siblingAvatars = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    this.items().forEach(item => {
      const record = asRecord(item);
      const avatar = pickText(record, 'avatar', 'author_avatar', 'user_avatar', 'profile_image');
      const name = normalizeName(pickText(record, 'author_name', 'display_name', 'author') || pickText(record, 'handle', 'screen_name', 'acct', 'username'));
      if (avatar && name && !map.has(name)) {
        map.set(name, avatar);
      }
    });
    return map;
  });

  items = input.required<unknown[]>();
  platform = input('');
  profileAvatar = input('');
  profileName = input('');
  profileUsername = input('');
  connectionsEnabled = input(false);
  connectionsLoading = input<Set<string>>(new Set<string>());
  connectionsByPost = input<ReadonlyMap<string, unknown[]>>(new Map());
  loadConnections = output<string>();
  readonly onImageError = applyImageFallback;
  readonly formatKeyLabel = formatKeyLabel;
  views = computed<feed_item_view[]>(() => this.items().map((item, index) => this.toView(item, index)));

  isConnectionsLoading(view: feed_item_view): boolean {
    return !!view.url && this.connectionsLoading().has(view.url);
  }

  onLoadConnections(view: feed_item_view, event: Event): void {
    event.stopPropagation();
    if (view.url) {
      this.loadConnections.emit(view.url);
    }
  }

  isExpanded(view: feed_item_view): boolean {
    return this.expandedKeys().has(view.key);
  }

  toggle(view: feed_item_view): void {
    this.expandedKeys.update(current => toggleKey(current, view.key));
  }

  isBodyExpanded(view: feed_item_view): boolean {
    return this.expandedBodies().has(view.key);
  }

  toggleBody(view: feed_item_view): void {
    this.expandedBodies.update(current => toggleKey(current, view.key));
  }

  hasLongBody(view: feed_item_view): boolean {
    return view.body.length > 280 || view.body.split('\n').length > 4;
  }

  isRevealed(view: feed_item_view): boolean {
    return !view.warning || this.revealedWarnings().has(view.key);
  }

  reveal(view: feed_item_view): void {
    this.revealedWarnings.update(current => toggleKey(current, view.key));
  }

  openPost(view: feed_item_view, event: Event): void {
    if (!view.url || (event.target as HTMLElement | null)?.closest('a, button')) {
      return;
    }
    window.open(view.url, '_blank', 'noopener');
  }

  hasEngagement(view: feed_item_view): boolean {
    return !!(view.likes || view.comments || view.shares || view.quotes || view.bookmarks || view.views);
  }

  private ownAvatarFor(record: Record<string, unknown>, author: string, handle: string): string {
    const names = [author, handle].map(normalizeName).filter(Boolean);
    const sibling = names.map(name => this.siblingAvatars().get(name) ?? '').find(Boolean);
    if (sibling) {
      return sibling;
    }
    const own = this.ownAvatar();
    if (!own.avatar) {
      return '';
    }
    const explicit = pickText(record, 'author', 'author_name', 'display_name', 'handle', 'screen_name', 'acct', 'username');
    const parent = normalizeName(pickText(record, 'parent_url').replace(/^https?:\/\/[^/]+\//i, '').replace(/^(@|user\/|u\/|users\/|profile\/|people\/|channel\/|c\/)/i, '').replace(/[/?#].*$/, ''));
    const isOwn = !explicit || names.some(name => own.names.has(name)) || (!!parent && own.names.has(parent));
    return isOwn ? own.avatar : '';
  }

  private toView(item: unknown, index: number): feed_item_view {
    const record = asRecord(item);
    const mediaType = pickText(record, 'media_type', 'post_type', 'content_type').toLowerCase();
    const isVideo = pickFlag(record, 'is_video') || VIDEO_TYPES.has(mediaType) || !!pickText(record, 'video_url');
    const isMediaPost = isVideo || MEDIA_TYPES.has(mediaType) || !!pickText(record, 'image_url') || pickList(record, 'image_urls', 'media_urls').length > 0;
    const thumbnail = pickText(record, 'thumbnail_url', 'thumbnail');
    const isPerson = !isMediaPost && (PERSON_TYPES.has(pickText(record, 'type').toLowerCase()) || PERSON_TYPES.has(mediaType));
    const handle = pickText(record, 'handle', 'screen_name', 'acct', 'username');
    const author = pickText(record, 'author_name', 'display_name', 'author') || handle || 'Unknown';
    const title = pickText(record, 'title', 'title_text');
    const body = pickText(record, 'caption', 'description', 'text', 'body', 'content_text', 'content');
    const hate = record.hate_speech as { is_hate_speech?: boolean; label?: string } | null | undefined;
    const images = [...new Set([...pickList(record, 'image_urls', 'media_urls'), pickText(record, 'image_url'), isMediaPost && !isVideo ? (pickText(record, 'media_url') || thumbnail) : (isPerson ? '' : thumbnail)].filter(Boolean))].slice(0, 4);
    const repo = pickText(record, 'repo');
    const flags = [
      pickFlag(record, 'is_pinned', 'pinned') ? 'Pinned' : '',
      pickFlag(record, 'is_repost', 'is_retweet') ? 'Repost' : '',
      pickFlag(record, 'is_quote') || pickText(record, 'quoted_url') ? 'Quote' : '',
      pickFlag(record, 'is_reply') || pickText(record, 'reply_to', 'in_reply_to') ? 'Reply' : '',
    ].filter(Boolean);
    const warning = pickText(record, 'content_warning', 'spoiler') || (pickFlag(record, 'sensitive', 'is_sensitive') ? 'Sensitive content' : '');

    return {
      key: pickText(record, 'resource_id', 'post_id', 'id', 'url') || `post-${index}`,
      author,
      handle: handle && handle.toLowerCase() !== author.toLowerCase() ? handle : '',
      avatar: pickText(record, 'avatar', 'author_avatar', 'user_avatar', 'profile_image') || (isPerson ? thumbnail : this.ownAvatarFor(record, author, handle)),
      initial: initialOf(author),
      verified: pickFlag(record, 'is_verified', 'verified'),
      time: pickTime(record, 'datetime', 'created_at', 'published_at', 'published_text'),
      edited: !!pickText(record, 'edited_at'),
      kind: mediaType && mediaType !== 'post' && mediaType !== 'text' ? mediaType : '',
      flags,
      replyTo: pickText(record, 'reply_to', 'in_reply_to'),
      title: title && title !== body ? title : '',
      body: body || (title ? '' : pickText(record, 'title')),
      images: isVideo ? [] : images,
      video: isVideo ? pickText(record, 'video_url', 'media_url') : '',
      poster: isVideo ? (thumbnail || pickText(record, 'image_url')) : '',
      duration: [pickText(record, 'duration_text'), pickText(record, 'duration'), pickText(record, 'video_duration')].find(value => value && value !== '0' && Number(value) !== 0) ?? '',
      url: pickText(record, 'url', 'short_url', 'media_url'),
      repo,
      repoUrl: pickText(record, 'repo_url') || (repo.includes('/') ? `https://github.com/${repo}` : ''),
      branch: pickText(record, 'branch'),
      commits: pickCount(record, 'commit_count'),
      tags: pickList(record, 'hashtags', 'tags').map(tag => tag.replace(/^#/, '')).slice(0, 8),
      mentions: pickList(record, 'mentions').map(mention => mention.replace(/^@/, '')).slice(0, 6),
      language: pickText(record, 'language'),
      location: pickText(record, 'location'),
      likes: pickCount(record, 'likes', 'likes_count', 'like_count', 'favorites', 'favorite_count'),
      comments: pickCount(record, 'comments', 'comments_count', 'comment_count', 'replies', 'replies_count', 'reply_count'),
      shares: pickCount(record, 'shares', 'shares_count', 'repost_count', 'reposts', 'retweets', 'reblogs_count'),
      quotes: pickCount(record, 'quote_count', 'quotes'),
      bookmarks: pickCount(record, 'bookmark_count', 'bookmarks'),
      views: pickCount(record, 'views', 'views_count', 'view_count'),
      warning,
      hateSpeech: hate?.is_hate_speech ? (hate.label ?? 'Flagged') : '',
      extra: leftoverEntries(record, CLAIMED_KEYS),
    };
  }
}
