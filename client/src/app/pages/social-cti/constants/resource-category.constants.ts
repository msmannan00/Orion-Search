import { getOwnProperty } from '../../../shared/utils/type-guards.util';
export type ResourceCategory = 'feed' | 'media' | 'people' | 'work' | 'document' | 'record';

const TYPE_CATEGORY: Record<string, ResourceCategory> = {
  posts: 'feed',
  comments: 'feed',
  answers: 'feed',
  reviews: 'feed',
  streams: 'feed',
  images: 'media',
  videos: 'media',
  shorts: 'media',
  reels: 'media',
  albums: 'media',
  pins: 'media',
  tracks: 'media',
  followers: 'people',
  friends: 'people',
  connections: 'people',
  organizations: 'people',
  repositories: 'work',
  projects: 'work',
  games: 'work',
  products: 'work',
  papers: 'document',
};

const PLATFORM_TYPE_CATEGORY: Record<string, ResourceCategory> = {
  'pinterest:posts': 'media',
};

const CATEGORY_PRIMARY_KEYS: Record<ResourceCategory, string[]> = {
  feed: ['author', 'datetime', 'likes', 'shares', 'views', 'comments_count', 'replies'],
  media: ['datetime', 'duration_text', 'views_text', 'views', 'likes', 'media_type'],
  people: ['author', 'followers', 'location', 'datetime'],
  work: ['stars', 'star_count', 'forks', 'pull_count', 'watchers', 'language', 'topics', 'open_issues', 'updated_at', 'last_updated'],
  document: ['author', 'datetime', 'citations', 'venue', 'publisher'],
  record: ['author', 'datetime'],
};

export function categoryFor(platform: string, type: string): ResourceCategory {
  const platformKey = String(platform ?? '').toLowerCase();
  const typeKey = String(type ?? '').toLowerCase();
  return PLATFORM_TYPE_CATEGORY[`${platformKey}:${typeKey}`] ?? getOwnProperty(TYPE_CATEGORY, typeKey) ?? 'record';
}

const FALLBACK_PRIMARY_KEYS = ['author', 'datetime', 'likes', 'views', 'shares'];

export function primaryKeysFor(category: ResourceCategory): string[] {
  return [...new Set([...(getOwnProperty(CATEGORY_PRIMARY_KEYS, category) ?? []), ...FALLBACK_PRIMARY_KEYS])];
}
