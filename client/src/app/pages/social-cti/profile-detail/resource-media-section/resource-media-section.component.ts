import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { applyImageFallback } from '../../utils/image-fallback.util';
import { asRecord, formatKeyLabel, leftoverEntries, pickCount, pickFlag, pickList, pickText, pickTime, toggleKey } from '../../utils/resource-view.util';
import { SocialConnectionsPopupComponent } from '../connections-popup/social-connections-popup.component';
import type { media_item_view } from './model/resource-media-section.model';
export type { media_item_view } from './model/resource-media-section.model';




const VIDEO_TYPES = new Set(['video', 'videos', 'reel', 'reels', 'short', 'shorts', 'clip', 'stream', 'track', 'tracks', 'audio']);
const VERTICAL_TYPES = new Set(['short', 'shorts', 'reel', 'reels', 'story', 'pin', 'pins']);




function reliableYtThumb(url: string): string {
  return typeof url === 'string' ? url.replace(/(i\.ytimg\.com|img\.youtube\.com)\/vi\/([^/]+)\/frame0\.jpg/, '$1/vi/$2/hqdefault.jpg') : url;
}

const CLAIMED_KEYS = new Set([
  'type', 'resource_id', 'video_id', 'entity_id', 'id', 'url', 'short_url', 'embed_url', 'parent_url', 'title', 'title_text', 'caption', 'description', 'author', 'author_name', 'display_name', 'preferred_username', 'channel', 'channel_id', 'channel_title',
  'datetime', 'published_at', 'published_text', 'updated_at', 'created_at', 'media_type', 'photo_type', 'content_type', 'media_url', 'photo_url', 'image_url', 'thumbnail_url', 'thumbnail', 'thumbnail_default', 'thumbnail_max', 'thumbnail_frame', 'thumbnail_source', 'thumbnail_count',
  'likes', 'like_count', 'likes_count', 'views', 'views_text', 'views_count', 'view_count', 'shares', 'comments', 'comment_count', 'comments_count', 'duration', 'duration_text', 'duration_seconds', 'video_duration', 'badges', 'is_live', 'is_premiere', 'is_members_only', 'is_video',
  'rating_count', 'rating_average', 'width', 'height', 'hash', 'request_hash', 'accessibility_text', 'animated_preview', 'metadata_parts', 'hate_speech', 'tags', 'hashtags', 'profile_url',
]);

@Component({
  selector: 'app-social-resource-media',
  templateUrl: './resource-media-section.component.html',
  standalone: true,
  imports: [DatePipe, TranslatePipe, SocialConnectionsPopupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialResourceMediaSectionComponent {
  private readonly expandedKeys = signal<Set<string>>(new Set<string>());

  items = input.required<unknown[]>();
  platform = input('');
  profileUsername = input('');
  connectionsEnabled = input(false);
  connectionsLoading = input<Set<string>>(new Set<string>());
  connectionsByPost = input<ReadonlyMap<string, unknown[]>>(new Map());
  loadConnections = output<string>();
  readonly onImageError = applyImageFallback;
  readonly formatKeyLabel = formatKeyLabel;
  views = computed<media_item_view[]>(() => this.items().map((item, index) => this.toView(item, index)));
  isImageGrid = computed(() => this.views().length > 0 && this.views().every(view => !view.isVideo));
  fillers = computed<number[]>(() => {
    if (!this.isImageGrid()) {
      return [];
    }
    const remainder = this.views().length % 3;
    return remainder ? Array.from({ length: 3 - remainder }, (_, index) => index) : [];
  });

  isConnectionsLoading(view: media_item_view): boolean {
    return !!view.url && this.connectionsLoading().has(view.url);
  }

  onLoadConnections(view: media_item_view, event: Event): void {
    event.stopPropagation();
    if (view.url) {
      this.loadConnections.emit(view.url);
    }
  }

  isExpanded(view: media_item_view): boolean {
    return this.expandedKeys().has(view.key);
  }

  toggle(view: media_item_view): void {
    this.expandedKeys.update(current => toggleKey(current, view.key));
  }

  private toView(item: unknown, index: number): media_item_view {
    const record = asRecord(item);
    const kind = pickText(record, 'photo_type', 'media_type', 'content_type').toLowerCase().replace(/^lockup_content_type_/, '');
    const isVideo = pickFlag(record, 'is_video') || VIDEO_TYPES.has(kind) || VIDEO_TYPES.has(pickText(record, 'type').toLowerCase());
    const isCollection = /playlist|album|set/.test(kind);
    const rawTitle = pickText(record, 'title_text', 'title');
    const title = rawTitle && rawTitle.toLowerCase() !== kind ? rawTitle : '';
    const author = pickText(record, 'author_name', 'channel_title', 'channel', 'display_name', 'author', 'preferred_username');
    const width = pickText(record, 'width');
    const height = pickText(record, 'height');
    const rating = pickText(record, 'rating_average');
    const flags = [
      pickFlag(record, 'is_live') ? 'Live' : '',
      pickFlag(record, 'is_premiere') ? 'Premiere' : '',
      pickFlag(record, 'is_members_only') ? 'Members only' : '',
    ].filter(Boolean);

    return {
      key: pickText(record, 'resource_id', 'video_id', 'id', 'url') || `media-${index}`,
      title,
      caption: pickText(record, 'caption', 'description'),
      author,
      kind,
      isVideo,
      isVertical: VERTICAL_TYPES.has(kind) || VERTICAL_TYPES.has(pickText(record, 'type').toLowerCase()),
      isLive: pickFlag(record, 'is_live'),
      image: reliableYtThumb(isVideo || isCollection ? pickText(record, 'thumbnail_max', 'thumbnail_url', 'thumbnail_source', 'thumbnail_default', 'thumbnail_frame', 'thumbnail', 'image_url') : pickText(record, 'media_url', 'photo_url', 'image_url', 'thumbnail_url', 'thumbnail', 'url')),
      fullImage: reliableYtThumb(pickText(record, 'media_url', 'photo_url', 'image_url', 'thumbnail_max', 'thumbnail_url')),
      url: pickText(record, 'url', 'short_url', 'media_url'),
      duration: pickText(record, 'duration_text', 'duration', 'video_duration'),
      views: pickCount(record, 'views', 'views_count', 'view_count'),
      likes: pickCount(record, 'likes', 'like_count', 'likes_count'),
      comments: pickCount(record, 'comments', 'comment_count', 'comments_count'),
      rating: rating && Number(rating) > 0 ? Number(rating).toFixed(1) : '',
      dimensions: width && height ? `${width}×${height}` : '',
      time: pickTime(record, 'datetime', 'published_at', 'created_at', 'updated_at'),
      timeText: pickText(record, 'published_text'),
      tags: pickList(record, 'tags', 'hashtags').slice(0, 6),
      flags,
      extra: leftoverEntries(record, CLAIMED_KEYS),
    };
  }
}
