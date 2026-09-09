import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, Subject, takeUntil, timeout } from 'rxjs';
import type { social_profile, social_resource, social_resource_collection } from '../models/social.models';
import type { CrawlResultState, CrawlResultView } from '../models/social-usability.models';
import type { FetchTabKey } from '../enums/social-graph.enums';
import { SocialFetchService } from './social-fetch.service';
import { SocialStorageService } from './social-storage.service';
import { buildSocialProfileUrl } from '../utils/profile-url.util';
import { crawlKey, getPlatformCardId, getProfileGroupKey, isSamePlatform, mergeResourcesById, resourceKey, sortByContentDate } from '../utils/social-profile.util';
import { categoryFor } from '../constants/resource-category.constants';
import { getOwnProperty } from '../../../shared/utils/type-guards.util';


@Injectable()
export class SocialLiveSyncService {
  private readonly fetchService = inject(SocialFetchService);
  private readonly storageService = inject(SocialStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly maxSyncItems = 5000;
  private readonly activePlatforms = new Set<string>();
  private readonly stopSignals = new Map<string, Subject<void>>();

  readonly crawlResults = signal<Record<string, CrawlResultState>>({});
  readonly liveStop = new Set<string>();
  readonly stoppedPlatformIds = new Set<string>();
  readonly connectionsLoading = signal<Set<string>>(new Set<string>());
  readonly connectionsByPost = signal<ReadonlyMap<string, social_resource[]>>(new Map());

  private stopSignalFor(key: string): Subject<void> {
    let signal = this.stopSignals.get(key);
    if (!signal) {
      signal = new Subject<void>();
      this.stopSignals.set(key, signal);
    }
    return signal;
  }

  private fireStop(key: string): void {
    this.stopSignals.get(key)?.next();
  }

  stopPlatform(cardId: string): void {
    for (const [key, signal] of this.stopSignals) {
      if (key.startsWith(`${cardId}:`)) {
        signal.next();
      }
    }
  }

  private platformKey(platformData: social_profile): string {
    return (platformData.meta.platform ?? '').toLowerCase();
  }

  isScanning(platformData: social_profile): boolean {
    return this.activePlatforms.has(this.platformKey(platformData));
  }

  async loadConnections(platformData: social_profile, postUrl: string): Promise<void> {
    const url = String(postUrl ?? '');
    if (!url || this.activePlatforms.has(this.platformKey(platformData)) || this.connectionsLoading().has(url)) {
      return;
    }
    this.connectionsLoading.update(current => new Set(current).add(url));
    try {
      await this.startLiveFetch(platformData, 'connections', url);
    }
    finally {
      this.connectionsLoading.update(current => {
        const next = new Set(current);
        next.delete(url);
        return next;
      });
    }
  }

  async syncAllConnections(platformData: social_profile): Promise<void> {
    const platform = this.platformKey(platformData);
    const cardId = getPlatformCardId(platformData);
    const key = crawlKey(platformData, 'connections');
    if (this.activePlatforms.has(platform) || getOwnProperty(this.crawlResults(), key)?.loading) {
      return;
    }
    this.activePlatforms.add(platform);
    const stopKey = key;
    this.liveStop.delete(stopKey);
    this.stoppedPlatformIds.delete(cardId);
    const stopped = () => this.liveStop.has(stopKey) || this.stoppedPlatformIds.has(cardId);
    const existing = (this.findPlatform(platformData)?.resources ?? platformData.resources ?? []).find(entry => entry.id === 'connections');
    const seen = new Set((existing?.resources ?? []).map(item => resourceKey(item)));
    const postUrls = this.collectPostUrls(platformData);
    this.crawlResults.update(current => ({ ...current, [key]: { loading: true, count: seen.size, log: '' } }));
    try {
      for (const postUrl of postUrls) {
        if (stopped()) {
          break;
        }
        let result;
        try {
          result = await firstValueFrom(this.fetchService.crawlProfile(platformData.meta.platform, platformData.meta.username, postUrl, 'connections', 'crawl', '').pipe(takeUntil(this.stopSignalFor(key)), timeout(120000)));
        }
        catch {
          continue;
        }
        if (stopped()) {
          break;
        }
        if (!result || Boolean(result.idle) || Boolean(result.error)) {
          continue;
        }
        const items = ((result.items ?? []) as social_resource[]).slice(0, 50);
        items.forEach(item => seen.add(resourceKey(item)));
        if (items.length) {
          this.storeLive(platformData, 'connections', items);
        }
        const last = items[items.length - 1];
        this.crawlResults.update(current => ({ ...current, [key]: { loading: true, count: seen.size, log: last ? this.resourceLabel(last) : getOwnProperty(current, key)?.log } }));
      }
    }
    finally {
      this.crawlResults.update(current => ({ ...current, [key]: { loading: false, count: seen.size } }));
      this.activePlatforms.delete(platform);
    }
  }

  private collectPostUrls(platformData: social_profile): string[] {
    const platform = platformData.meta.platform;
    const source = this.findPlatform(platformData)?.resources ?? platformData.resources ?? [];
    const seen = new Set<string>();
    const items: { url: string; time: number }[] = [];
    for (const collection of source) {
      const category = categoryFor(platform, String(collection.id));
      if (category !== 'feed' && category !== 'media') {
        continue;
      }
      for (const item of collection.resources ?? []) {
        const record = item as { url?: string; datetime?: string; created_at?: string; published_at?: string };
        const url = String(record.url ?? '');
        if (!url || seen.has(url)) {
          continue;
        }
        seen.add(url);
        const parsed = Date.parse(String(record.datetime ?? record.created_at ?? record.published_at ?? ''));
        items.push({ url, time: Number.isFinite(parsed) ? parsed : 0 });
      }
    }
    return items.sort((a, b) => b.time - a.time).map(item => item.url);
  }

  crawlResultFor(platformData: social_profile, type: FetchTabKey): CrawlResultView {
    const state = this.crawlResults()[crawlKey(platformData, type)] ?? {};
    const collection = (platformData.resources ?? []).find(entry => entry.id === type);
    return { loading: state.loading, error: state.error, items: collection?.resources ? sortByContentDate(collection.resources) : state.items, login_url: state.login_url, count: state.count, log: state.log, lastSynced: collection?.last_synced };
  }

  stopSync(platformData: social_profile, type: FetchTabKey): void {
    const key = crawlKey(platformData, type);
    this.liveStop.add(key);
    this.fireStop(key);
    this.crawlResults.update(current => ({ ...current, [key]: { ...getOwnProperty(current, key), loading: false } }));
    this.setSectionStatus(platformData, type, 'completed');
    this.fetchService.cancelProfileCrawl(platformData.meta.platform, platformData.meta.username, type).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  async startLiveFetch(platformData: social_profile, type: FetchTabKey, urlOverride?: string): Promise<void> {
    const cardId = getPlatformCardId(platformData);
    const key = crawlKey(platformData, type);
    const platform = this.platformKey(platformData);
    if (this.activePlatforms.has(platform) || getOwnProperty(this.crawlResults(), key)?.loading) {
      return;
    }
    this.activePlatforms.add(platform);
    const trackStatus = !urlOverride;
    const stopKey = key;
    this.liveStop.delete(stopKey);
    this.stoppedPlatformIds.delete(cardId);
    const existing = (this.findPlatform(platformData)?.resources ?? platformData.resources ?? []).find(entry => entry.id === type);
    const seen = new Set((existing?.resources ?? []).map(item => resourceKey(item)));
    this.crawlResults.update(current => ({ ...current, [key]: { loading: true, count: seen.size, log: '' } }));
    if (trackStatus) {
      this.setSectionStatus(platformData, type, 'fetching');
    }
    const url = urlOverride ?? buildSocialProfileUrl(platformData.meta.platform, platformData.meta.username, platformData.meta.url);
    const stopped = () => this.liveStop.has(stopKey) || this.stoppedPlatformIds.has(cardId);
    let pendingLoginUrl: string | undefined;
    const runPage = async (cursor: string): Promise<{ items: social_resource[]; next?: string; more: boolean } | 'error' | null> => {
      let result;
      try {
        result = await firstValueFrom(this.fetchService.crawlProfile(platformData.meta.platform, platformData.meta.username, url, type, 'crawl', cursor).pipe(takeUntil(this.stopSignalFor(stopKey))));
      }
      catch {
        return null;
      }
      if (!result || result.idle) {
        return null;
      }
      if (result.error) {
        pendingLoginUrl = result.login_url ? String(result.login_url) : undefined;
        return 'error';
      }
      const items = ((result.items ?? []) as social_resource[]).map(item => type === 'connections' && urlOverride ? { ...item, parent_url: urlOverride } : item);
      return { items, next: result.next_cursor, more: !!result.has_more };
    };

    try {
      let cursor = '';
      let stamped = false;
      while (!stopped()) {
        const page = await runPage(cursor);
        if (page === null) {
          break;
        }
        if (page === 'error') {
          this.crawlResults.update(current => ({ ...current, [key]: { loading: false, error: 'crawl_failed', login_url: pendingLoginUrl } }));
          if (trackStatus) {
            this.setSectionStatus(platformData, type, 'failed');
          }
          return;
        }
        if (stopped()) {
          break;
        }
        page.items.forEach(item => seen.add(resourceKey(item)));
        if (page.items.length) {
          if (type === 'connections' && urlOverride) {
            this.storePostConnections(urlOverride, page.items);
          }
          this.storeLive(platformData, type, page.items);
          if (!stamped) {
            this.markSynced(platformData, type);
            stamped = true;
          }
        }
        const last = page.items[page.items.length - 1];
        this.crawlResults.update(current => ({ ...current, [key]: { loading: true, count: seen.size, log: last ? this.resourceLabel(last) : getOwnProperty(current, key)?.log } }));
        if (seen.size >= this.maxSyncItems) {
          break;
        }
        if (!page.more || !page.next) {
          break;
        }
        cursor = page.next;
      }

      if (trackStatus) {
        this.setSectionStatus(platformData, type, 'completed');
      }
      this.crawlResults.update(current => ({ ...current, [key]: { loading: false, count: seen.size } }));
    }
    finally {
      this.activePlatforms.delete(platform);
    }
  }

  setSectionStatus(platformData: social_profile, section: string, status: string): void {
    let updatedProfiles: social_profile[] | null = null;
    const groupKey = getProfileGroupKey(this.storageService.state.scanResults(), platformData);
    this.storageService.state.scanResults.update(results => {
      const currentProfiles = results.get(groupKey);
      if (!currentProfiles) {
        return results;
      }
      let changed = false;
      const nextProfiles = currentProfiles.map(platform => {
        if (!isSamePlatform(platform, platformData) || getOwnProperty(platform.section_status, section) === status) {
          return platform;
        }
        changed = true;
        return { ...platform, section_status: { ...platform.section_status, [section]: status } };
      });
      if (!changed) {
        return results;
      }
      updatedProfiles = nextProfiles;
      return new Map(results).set(groupKey, nextProfiles);
    });
    if (updatedProfiles) {
      this.storageService.saveProfiles(groupKey, updatedProfiles, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  clearFetchingStatus(platformData: social_profile): void {
    let updatedProfiles: social_profile[] | null = null;
    const groupKey = getProfileGroupKey(this.storageService.state.scanResults(), platformData);
    this.storageService.state.scanResults.update(results => {
      const currentProfiles = results.get(groupKey);
      if (!currentProfiles) {
        return results;
      }
      let changed = false;
      const nextProfiles = currentProfiles.map(platform => {
        if (!isSamePlatform(platform, platformData)) {
          return platform;
        }
        const status = { ...(platform.section_status ?? {}) };
        for (const section of Object.keys(status)) {
          if (getOwnProperty(status, section) === 'fetching') {
            Reflect.deleteProperty(status, section);
            changed = true;
          }
        }
        return changed ? { ...platform, section_status: status } : platform;
      });
      if (!changed) {
        return results;
      }
      updatedProfiles = nextProfiles;
      return new Map(results).set(groupKey, nextProfiles);
    });
    if (updatedProfiles) {
      this.storageService.saveProfiles(groupKey, updatedProfiles, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  private updateProfileResources(platformData: social_profile, type: FetchTabKey, build: (previous: social_resource_collection | undefined) => social_resource_collection): void {
    let updatedProfiles: social_profile[] | null = null;
    const groupKey = getProfileGroupKey(this.storageService.state.scanResults(), platformData);
    this.storageService.state.scanResults.update(results => {
      const currentProfiles = results.get(groupKey);
      if (!currentProfiles) {
        return results;
      }
      updatedProfiles = currentProfiles.map(platform => {
        if (!isSamePlatform(platform, platformData)) {
          return platform;
        }
        const others = (platform.resources ?? []).filter(entry => entry.id !== type);
        const previous = (platform.resources ?? []).find(entry => entry.id === type);
        return { ...platform, resources: [...others, build(previous)] };
      });
      return new Map(results).set(groupKey, updatedProfiles);
    });
    if (updatedProfiles) {
      this.storageService.saveProfiles(groupKey, updatedProfiles, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  private storeLive(platformData: social_profile, type: FetchTabKey, resources: social_resource[]): void {
    this.updateProfileResources(platformData, type, previous => ({ ...previous, id: type, is_parsed: true, resources: mergeResourcesById(previous?.resources ?? [], resources) }));
  }

  private storePostConnections(postUrl: string, resources: social_resource[]): void {
    if (!resources.length) {
      return;
    }
    this.connectionsByPost.update(current => {
      const next = new Map(current);
      next.set(postUrl, mergeResourcesById(next.get(postUrl) ?? [], resources));
      return next;
    });
  }

  private markSynced(platformData: social_profile, type: FetchTabKey): void {
    const stamp = new Date().toISOString();
    this.updateProfileResources(platformData, type, previous => ({ ...previous, id: type, is_parsed: true, resources: previous?.resources ?? [], last_synced: stamp }));
  }

  private resourceLabel(item: social_resource): string {
    const record = item as unknown as Record<string, unknown>;
    const pick = (...keys: string[]): string => {
      for (const key of keys) {
        const value = getOwnProperty(record, key);
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      return '';
    };
    return pick('title', 'caption', 'name', 'real_name', 'display_name', 'author', 'username') || 'item';
  }

  private findPlatform(platformData: social_profile): social_profile | undefined {
    for (const [, profiles] of this.storageService.state.scanResults()) {
      const match = profiles.find(platform => isSamePlatform(platform, platformData));
      if (match) {
        return match;
      }
    }
    return undefined;
  }
}
