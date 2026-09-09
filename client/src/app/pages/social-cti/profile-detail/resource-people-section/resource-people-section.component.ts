import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { applyImageFallback } from '../../utils/image-fallback.util';
import { asRecord, formatKeyLabel, initialOf, leftoverEntries, pickCount, pickFlag, pickList, pickText, pickTime, toggleKey } from '../../utils/resource-view.util';
import type { people_item_view } from './model/resource-people-section.model';
export type { people_item_view } from './model/resource-people-section.model';




const CLAIMED_KEYS = new Set([
  'type', 'resource_id', 'url', 'parent_url', 'title', 'name', 'display_name', 'full_name', 'caption', 'description', 'bio', 'about', 'note', 'author', 'author_name', 'username', 'login', 'handle', 'screen_name', 'acct',
  'datetime', 'created_at', 'joined_at', 'joined', 'media_type', 'media_url', 'thumbnail_url', 'avatar', 'avatar_url', 'author_avatar', 'user_avatar', 'profile_image', 'likes', 'shares', 'views',
  'followers', 'followers_count', 'follower_count', 'total_followers', 'following', 'following_count', 'total_following', 'posts', 'post_count', 'statuses_count', 'public_repos', 'repositories', 'total_posts',
  'location', 'company', 'website', 'blog', 'homepage', 'is_verified', 'verified', 'is_bot', 'bot', 'is_private', 'locked', 'is_locked', 'tags', 'roles', 'badges', 'user_id', 'id',
]);

@Component({
  selector: 'app-social-resource-people',
  templateUrl: './resource-people-section.component.html',
  standalone: true,
  imports: [DatePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialResourcePeopleSectionComponent {
  private readonly expandedKeys = signal<Set<string>>(new Set<string>());

  items = input.required<unknown[]>();
  readonly onImageError = applyImageFallback;
  readonly formatKeyLabel = formatKeyLabel;
  views = computed<people_item_view[]>(() => this.items().map((item, index) => this.toView(item, index)));

  isExpanded(view: people_item_view): boolean {
    return this.expandedKeys().has(view.key);
  }

  toggle(view: people_item_view): void {
    this.expandedKeys.update(current => toggleKey(current, view.key));
  }

  private toView(item: unknown, index: number): people_item_view {
    const record = asRecord(item);
    const handle = pickText(record, 'handle', 'screen_name', 'acct', 'username', 'login', 'author');
    const name = pickText(record, 'title', 'display_name', 'name', 'full_name', 'author_name') || handle || 'Unknown';
    const mediaType = pickText(record, 'media_type').toLowerCase();
    const isBot = pickFlag(record, 'is_bot', 'bot') || mediaType === 'bot';
    const flags = [
      isBot ? 'Bot' : '',
      pickFlag(record, 'is_private', 'locked', 'is_locked') ? 'Private' : '',
    ].filter(Boolean);

    return {
      key: pickText(record, 'resource_id', 'url', 'user_id', 'id') || `person-${index}`,
      name,
      handle: handle && handle.toLowerCase() !== name.toLowerCase() ? handle : '',
      url: pickText(record, 'url', 'media_url'),
      avatar: pickText(record, 'thumbnail_url', 'avatar', 'avatar_url', 'author_avatar', 'user_avatar', 'profile_image'),
      initial: initialOf(name),
      bio: pickText(record, 'caption', 'description', 'bio', 'about', 'note'),
      kind: mediaType && mediaType !== 'user' && mediaType !== 'bot' ? mediaType : '',
      verified: pickFlag(record, 'is_verified', 'verified'),
      flags,
      followers: pickCount(record, 'followers', 'followers_count', 'follower_count', 'total_followers'),
      posts: pickCount(record, 'posts', 'post_count', 'statuses_count', 'public_repos', 'repositories', 'total_posts'),
      location: pickText(record, 'location'),
      company: pickText(record, 'company'),
      website: pickText(record, 'website', 'blog', 'homepage'),
      joined: pickTime(record, 'datetime', 'created_at', 'joined_at', 'joined'),
      tags: pickList(record, 'tags', 'roles', 'badges').slice(0, 6),
      extra: leftoverEntries(record, CLAIMED_KEYS),
    };
  }
}
