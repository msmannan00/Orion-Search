import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { applyImageFallback } from '../../utils/image-fallback.util';
import { asRecord, formatBytes, formatKeyLabel, initialOf, leftoverEntries, pickCount, pickFlag, pickList, pickText, pickTime, toggleKey } from '../../utils/resource-view.util';
import type { work_item_view } from './model/resource-work-section.model';
export type { work_item_view } from './model/resource-work-section.model';




const LANGUAGE_COLORS: Record<string, string> = {
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python: '#3572A5',
  java: '#b07219',
  kotlin: '#A97BFF',
  dart: '#00B4AB',
  go: '#00ADD8',
  rust: '#dea584',
  ruby: '#701516',
  php: '#4F5D95',
  'c++': '#f34b7d',
  c: '#555555',
  'c#': '#178600',
  swift: '#F05138',
  shell: '#89e051',
  html: '#e34c26',
  css: '#563d7c',
  scss: '#c6538c',
  vue: '#41b883',
  solidity: '#AA6746',
  'jupyter notebook': '#DA5B0B',
  dockerfile: '#384d54',
  lua: '#000080',
  r: '#198CE7',
  scala: '#c22d40',
  perl: '#0298c3',
  haskell: '#5e5086',
  elixir: '#6e4a7e',
  objectivec: '#438eff',
  'objective-c': '#438eff',
};

const CLAIMED_KEYS = new Set([
  'type', 'resource_id', 'url', 'parent_url', 'title', 'name', 'full_name', 'caption', 'description', 'status_description', 'author', 'owner_login', 'owner_avatar', 'hub_user', 'namespace',
  'datetime', 'created_at', 'updated_at', 'last_updated', 'last_modified', 'pushed_at', 'date_registered', 'media_type', 'media_url', 'thumbnail_url', 'language', 'topics', 'topics_count', 'tags',
  'visibility', 'is_fork', 'is_archived', 'is_template', 'is_private', 'is_disabled', 'is_mirror', 'is_automated', 'likes', 'shares', 'views', 'stars', 'star_count', 'forks', 'watchers', 'subscribers',
  'open_issues', 'pull_count', 'downloads', 'download_count', 'default_branch', 'license', 'license_name', 'license_key', 'license_url', 'size_kb', 'size', 'storage_size', 'total_tag_size', 'homepage',
  'parent_repo', 'source_repo', 'latest_tag', 'tags_count', 'architectures', 'operating_systems', 'status', 'api_url', 'node_id', 'owner_id', 'owner_type', 'network', 'clone_url', 'ssh_url', 'git_url', 'svn_url',
]);

@Component({
  selector: 'app-social-resource-work',
  templateUrl: './resource-work-section.component.html',
  standalone: true,
  imports: [DatePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialResourceWorkSectionComponent {
  private readonly expandedKeys = signal<Set<string>>(new Set<string>());

  items = input.required<unknown[]>();
  readonly onImageError = applyImageFallback;
  readonly formatKeyLabel = formatKeyLabel;
  views = computed<work_item_view[]>(() => this.items().map((item, index) => this.toView(item, index)));

  isExpanded(view: work_item_view): boolean {
    return this.expandedKeys().has(view.key);
  }

  toggle(view: work_item_view): void {
    this.expandedKeys.update(current => toggleKey(current, view.key));
  }

  languageColor(language: string): string {
    return LANGUAGE_COLORS[language.toLowerCase()] ?? '#8b98a5';
  }

  private toView(item: unknown, index: number): work_item_view {
    const record = asRecord(item);
    const fullName = pickText(record, 'full_name', 'resource_id');
    const name = pickText(record, 'title', 'name') ?? fullName.split('/').pop() ?? 'Untitled';
    const owner = fullName.includes('/') ? fullName.split('/')[0] : pickText(record, 'owner_login', 'hub_user', 'namespace', 'author');
    const visibility = pickText(record, 'visibility') || (pickFlag(record, 'is_private') ? 'Private' : '');
    const labels = [
      visibility,
      pickFlag(record, 'is_fork') ? 'Fork' : '',
      pickFlag(record, 'is_archived') && !/archive/i.test(visibility) ? 'Archived' : '',
      pickFlag(record, 'is_template') && !/template/i.test(visibility) ? 'Template' : '',
      pickFlag(record, 'is_mirror') ? 'Mirror' : '',
      pickFlag(record, 'is_disabled') ? 'Disabled' : '',
      pickFlag(record, 'is_automated') ? 'Automated' : '',
    ].filter(Boolean);
    const forkSource = pickText(record, 'parent_repo', 'source_repo');
    const sizeKb = pickText(record, 'size_kb');

    return {
      key: fullName || pickText(record, 'url') || `work-${index}`,
      name,
      owner,
      ownerAvatar: pickText(record, 'owner_avatar'),
      initial: initialOf(owner || name),
      url: pickText(record, 'url', 'media_url'),
      homepage: pickText(record, 'homepage'),
      description: pickText(record, 'caption', 'description', 'status_description'),
      language: pickText(record, 'language'),
      stars: pickCount(record, 'stars', 'star_count', 'likes'),
      forks: pickCount(record, 'forks', 'shares'),
      watchers: pickCount(record, 'watchers', 'subscribers'),
      issues: pickCount(record, 'open_issues'),
      pulls: pickCount(record, 'pull_count'),
      downloads: pickCount(record, 'downloads', 'download_count', 'views'),
      branch: pickText(record, 'default_branch'),
      license: pickText(record, 'license_name', 'license'),
      size: sizeKb ? formatBytes(sizeKb, 'kb') : formatBytes(pickText(record, 'storage_size', 'total_tag_size', 'size')),
      forkSource,
      forkSourceUrl: forkSource.includes('/') && !/^https?:/i.test(forkSource) ? `https://github.com/${forkSource}` : (/^https?:/i.test(forkSource) ? forkSource : ''),
      latestTag: pickText(record, 'latest_tag'),
      tagsCount: pickCount(record, 'tags_count'),
      platforms: [...pickList(record, 'operating_systems'), ...pickList(record, 'architectures')].slice(0, 6),
      topics: pickList(record, 'topics', 'tags').slice(0, 8),
      labels,
      status: pickText(record, 'status').toLowerCase() === 'active' ? '' : pickText(record, 'status'),
      created: pickTime(record, 'created_at', 'date_registered'),
      updated: pickTime(record, 'updated_at', 'last_updated', 'last_modified', 'datetime'),
      pushed: pickTime(record, 'pushed_at'),
      extra: leftoverEntries(record, CLAIMED_KEYS),
    };
  }
}
