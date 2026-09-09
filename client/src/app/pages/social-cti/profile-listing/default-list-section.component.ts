import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { social_profile } from '../models/social.models';
import { formatFollowers, formatKey } from '../../../shared/utils/formatters';
import { SocialIconComponent } from '../../../shared/partials/social-icon/social-icon.component';
import type { FetchTabKey } from '../enums/social-graph.enums';
import type { FeedUser, SocialPlatformCapabilityMap } from '../models/social-usability.models';
import { getMetadataEntries } from '../utils/summary-view.util';
import socialPlatformCapabilities from '../../../../assets/data/social-graph/platform-capabilities.json';
import { buildSocialProfileUrl } from '../utils/profile-url.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { asUnknownRecord, getOwnProperty } from '../../../shared/utils/type-guards.util';

const DEDUPE_MIN_LENGTH = 12;
const METADATA_PRIORITY = ['real_name', 'description', 'bio', 'location', 'country', 'joined_date', 'total_followers', 'total_posts', 'total_views', 'status', 'url', 'profile_url'];

@Component({
  selector: 'app-social-default-list-section',
  templateUrl: './default-list-section.component.html',
  standalone: true,
  imports: [SocialIconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialDefaultListSectionComponent {
  private readonly platformCapabilities = socialPlatformCapabilities as SocialPlatformCapabilityMap;
  private readonly expandedBios = signal<ReadonlySet<string>>(new Set<string>());
  private readonly expandedMetadata = signal<ReadonlySet<string>>(new Set<string>());

  user = input.required<FeedUser>();
  highlightedNodeId = input<string | null>(null);
  profileOverview = output<social_profile>();
  connectionsOverview = output<social_profile>();
  profileTab = output<{ platformData: social_profile; tabKey: FetchTabKey }>();
  copyValue = output<unknown>();
  readonly formatKey = formatKey;
  readonly missingStatValue = 'Not fetched';
  readonly metadataPreviewCount = 6;

  getPlatformCardId(platformData: social_profile): string {
    return `platform-${platformData.meta.username}|${platformData.meta.platform}|${platformData.meta.username}`;
  }

  getPlatformTrackKey(_index: number, platformData: social_profile): string {
    return this.getPlatformCardId(platformData);
  }

  isPriorityPlatform(platformName?: string): boolean {
    return !!platformName && !!getOwnProperty(this.platformCapabilities, platformName);
  }

  isFetchTabAllowed(platformData: social_profile, tabKey: FetchTabKey): boolean {
    const globalCapability = this.platformCapabilities.__all__;
    const capability = this.platformCapabilities[platformData.meta.platform];
    if (Boolean(globalCapability?.disallow?.includes(tabKey)) || Boolean(capability?.disallow?.includes(tabKey))) {
      return false;
    }
    if (tabKey === 'followers') {
      return this.isPriorityPlatform(platformData.meta.platform) || !!globalCapability?.allow?.includes(tabKey) || !!capability?.allow?.includes(tabKey);
    }
    if (tabKey === 'videos' || tabKey === 'shorts') {
      return !!globalCapability?.allow?.includes(tabKey) || !!capability?.allow?.includes(tabKey);
    }
    return true;
  }

  getFollowers(_platformData: social_profile): string[] {
    void _platformData;
    return [];
  }

  getFollowerPreview(platformData: social_profile): string[] {
    return this.getFollowers(platformData).slice(0, 3);
  }

  getProfileBio(platformData: social_profile): string {
    const details = asUnknownRecord(platformData.profile_details);
    const bio = platformData.profile_details?.bio
      ?? details.m_content
      ?? platformData.meta.description
      ?? '';
    return typeof bio === 'string' ? bio : String(bio);
  }

  hasLongBio(bio: string): boolean {
    return bio.length > 280 || bio.split('\n').length > 4;
  }

  isBioExpanded(platformData: social_profile): boolean {
    return this.expandedBios().has(this.getPlatformCardId(platformData));
  }

  toggleBio(platformData: social_profile): void {
    const cardId = this.getPlatformCardId(platformData);
    const expanded = new Set(this.expandedBios());
    if (!expanded.delete(cardId)) {
      expanded.add(cardId);
    }
    this.expandedBios.set(expanded);
  }

  getPlatformTimestamp(platformData: social_profile): string {
    const metadata = asUnknownRecord(platformData.meta);
    const details = asUnknownRecord(platformData.profile_details);
    const timestamp = platformData.meta.timestamp ?? details.m_date ?? metadata.timestamp ?? metadata.Timestamp ?? metadata.m_date;
    return timestamp ? String(timestamp) : '';
  }

  getProfileUrl(platformData: social_profile, username: string): string {
    return buildSocialProfileUrl(platformData.meta.platform, username, platformData.meta.url);
  }

  getFilteredMetadataEntries(platformData: social_profile): { key: string; value: unknown; }[] {
    const entries = getMetadataEntries({
      ...asUnknownRecord(platformData.meta),
      ...asUnknownRecord(platformData.profile_details),
    })
      .filter(entry => entry.key.toLowerCase().replace(/[\s_-]+/g, '') !== 'timestamp')
      .filter(entry => entry.value !== null && entry.value !== undefined && entry.value !== '')
      .filter(entry => typeof entry.value !== 'object');
    const keys = new Set(entries.map(entry => entry.key.toLowerCase()));
    const seen = new Set<string>();
    const deduped = entries.filter(entry => {
      const key = entry.key.toLowerCase();
      if (key.endsWith('_text') && keys.has(key.slice(0, -5))) {
        return false;
      }
      const fingerprint = this.formatMetadataValue(entry.value).trim().toLowerCase();
      if (fingerprint.length < DEDUPE_MIN_LENGTH) {
        return true;
      }
      if (seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);
      return true;
    });
    return deduped.sort((first, second) => this.metadataRank(first.key) - this.metadataRank(second.key));
  }

  private metadataRank(key: string): number {
    const rank = METADATA_PRIORITY.indexOf(key.toLowerCase());
    return rank === -1 ? METADATA_PRIORITY.length : rank;
  }

  getVisibleMetadataEntries(platformData: social_profile, entries: { key: string; value: unknown; }[]): { key: string; value: unknown; }[] {
    return this.isMetadataExpanded(platformData) ? entries : entries.slice(0, this.metadataPreviewCount);
  }

  isMetadataExpanded(platformData: social_profile): boolean {
    return this.expandedMetadata().has(this.getPlatformCardId(platformData));
  }

  toggleMetadata(platformData: social_profile): void {
    const cardId = this.getPlatformCardId(platformData);
    const expanded = new Set(this.expandedMetadata());
    if (!expanded.delete(cardId)) {
      expanded.add(cardId);
    }
    this.expandedMetadata.set(expanded);
  }

  formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  getStatValue(platformData: social_profile, key: keyof NonNullable<social_profile['profile_details']>): string {
    const profileValue = getOwnProperty(platformData.profile_details, key);
    const metadataValue = undefined;
    const rawValue = profileValue ?? metadataValue ?? this.getFallbackStatValue(platformData, key);
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return this.missingStatValue;
    }
    const numericValue = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).replace(/,/g, ''));
    return Number.isFinite(numericValue) ? formatFollowers(numericValue) : String(rawValue);
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }

  trackByUsername(_index: number, username: string): string {
    return username;
  }

  private getFallbackStatValue(platformData: social_profile, key: keyof NonNullable<social_profile['profile_details']>): unknown {
    const metadata = {
      ...asUnknownRecord(platformData.meta),
      ...asUnknownRecord(platformData.profile_details),
    };
    switch (key) {
      case 'total_posts':
        return this.firstStatValue(metadata.totalPosts, metadata.posts_count, metadata.m_post_count, this.getPostCollectionCount(platformData));
      case 'total_followers':
        return this.firstStatValue(Number(platformData.profile_details?.total_followers ?? 0), metadata.followers, metadata.followers_count, metadata.m_followers, this.extractSocialCount(metadata.m_group_info));
      case 'total_likes':
        return this.firstStatValue(metadata.totalLikes, metadata.likes, metadata.m_likes, metadata.m_post_likes);
      default:
        return null;
    }
  }

  private firstStatValue(...values: unknown[]): unknown {
    return values.find(value => value !== null && value !== undefined && value !== '') ?? null;
  }

  private getPostCollectionCount(_platformData: social_profile): number | null {
    void _platformData;
    return null;
  }

  private extractSocialCount(value: unknown): string | null {
    const text = typeof value === 'string' ? value : '';
    return (/([\d,.]+[kmb]?)(?=\s*(subscribers|followers))/i.exec(text))?.[1] ?? null;
  }
}
