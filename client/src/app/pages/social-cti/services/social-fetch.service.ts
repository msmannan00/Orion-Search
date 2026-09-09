import { Injectable } from '@angular/core';
import { EMPTY, Observable, of, throwError, timer } from 'rxjs';
import { catchError, expand, filter, map, scan, switchMap, take } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { social_online_presence_hit, social_phone_lookup_result, social_stealer_log, social_wanted } from '../models/social.models';
import { ApiEnvelope } from '../models/social-usability.models';
import type { PhoneLookupResponse, SocialSearchResponse, WantedSearchResponse } from './model/social-fetch.model';
export type { PhoneLookupResponse, SocialSearchResponse, WantedSearchResponse } from './model/social-fetch.model';

const CRAWL_IDLE_RETRIES = 15;
const EMPTY_CRAWL: { items?: unknown[]; error?: string; idle?: boolean; next_cursor?: string; has_more?: boolean; login_url?: string } = { idle: true };







@Injectable({ providedIn: 'root' })
export class SocialFetchService {
  constructor(private api: ApiService) {}

  crawlProfile(platform: string, username: string, url: string, type: string, command = 'crawl', cursor = ''): Observable<{ items?: unknown[]; error?: string; idle?: boolean; next_cursor?: string; has_more?: boolean; login_url?: string }> {
    return timer(0, 3000).pipe(switchMap(() => this.api.post<{ result?: { profile?: unknown; items?: unknown[]; next_cursor?: string; has_more?: boolean }; error?: string; status?: string; login_url?: string }>('social/profile', { platform, username, url, type, command, cursor })),
      map(response => ({
        pending: response?.status === 'pending',
        idle: response?.status === 'idle',
        items: (response?.result?.items ?? (response?.result?.profile ? [response.result.profile] : [])),
        next_cursor: response?.result?.next_cursor,
        has_more: response?.result?.has_more,
        error: response?.error,
        login_url: response?.login_url,
      })),
      scan((state: { result: typeof EMPTY_CRAWL; idles: number; done: boolean }, result) => {
        if (result.pending) {
          return { ...state, done: false };
        }
        if (result.idle) {
          const idles = state.idles + 1;
          return { result: { idle: true }, idles, done: idles >= CRAWL_IDLE_RETRIES };
        }
        return { result: { items: result.items, next_cursor: result.next_cursor, has_more: result.has_more, error: result.error, login_url: result.login_url }, idles: state.idles, done: true };
      }, { result: EMPTY_CRAWL, idles: 0, done: false }),
      filter(state => state.done),
      take(1),
      map(state => state.result),
      catchError(() => of<{ items?: unknown[]; error?: string; idle?: boolean; next_cursor?: string; has_more?: boolean; login_url?: string }>({ items: [], error: 'crawl_failed' })));
  }

  cancelProfileCrawl(platform: string, username: string, type: string): Observable<unknown> {
    return this.api.post('social/profile', { platform, username, url: '', type, command: 'cancel' }).pipe(catchError(() => of(null)));
  }

  searchConnections(platform: string, username: string, query: string, postUrl = ''): Observable<unknown[]> {
    return this.api.post<ApiEnvelope<{ items?: unknown[] }>>('social/connections', { platform, username, query, post_url: postUrl })
      .pipe(map(response => response?.result?.items ?? []), catchError(() => of<unknown[]>([])));
  }

  fetchStealerLogsByIdentity(query: string): Observable<social_stealer_log[]> {
    return this.fetchStealerLogsByUsername(query);
  }

  fetchPlatformStealerLogs(username: string): Observable<social_stealer_log[]> {
    return this.fetchStealerLogsByUsername(username);
  }

  private fetchStealerLogsByUsername(username: string): Observable<social_stealer_log[]> {
    const normalizedUsername = username.trim().replace(/^@+/, '');
    if (!normalizedUsername) {
      return of([]);
    }
    const payload = { daterange: '', q: '', url: '', user: normalizedUsername, ioc: `m_username:${normalizedUsername}`, type: 'c', page: 1, category: '', fullsearch: false };
    return this.api.post<SocialSearchResponse<social_stealer_log>>('search/stealer/ioc', payload).pipe(map(response => response?.Result ?? response?.result?.Result ?? response?.data?.Result ?? []),
      catchError(() => throwError(() => new Error('Failed to fetch stealer logs'))));
  }

  fetchWantedList(query: string): Observable<social_wanted[]> {
    return this.api.post<WantedSearchResponse>('dynamic/wanted', { text: { query } }).pipe(map(response => response.cards_data ?? response.data?.cards_data ?? (Array.isArray(response.result) ? response.result : response.result?.cards_data) ?? []),
      catchError(() => throwError(() => new Error('Failed to fetch wanted list'))));
  }

  fetchPhoneLookup(query: string): Observable<social_phone_lookup_result> {
    const request = () => this.api.post<PhoneLookupResponse>('phone/universal_search', { text: { query } });
    return request().pipe(expand(response => response?.status === 'pending' || response?.status === 'processing' ? timer(3000).pipe(switchMap(() => request())) : EMPTY),
      filter(response => response?.status !== 'pending' && response?.status !== 'processing'),
      take(1),
      map(response => {
        if (response?.status === 'error') {
          throw new Error(response?.message ?? response?.error_message ?? 'Phone lookup failed');
        }
        return response?.result ?? response;
      }),
      catchError(() => throwError(() => new Error('Failed to fetch phone intelligence'))));
  }

  fetchDarkwebReport(username: string, limit?: number): Observable<Record<string, unknown>[]> {
    return this.api.post<SocialSearchResponse<Record<string, unknown>>>('search/social', { q: username, category: 'all', network: 'all', page: 1, ...(limit ? { platform_result_count: Math.max(1, Math.min(limit, 100)) } : {}) })
      .pipe(map(response => (response?.Result ?? response?.data?.Result ?? response?.result?.Result ?? [])),
        catchError(() => of<Record<string, unknown>[]>([])));
  }

  fetchProfileMetadataTokens(tokens: string[], username: string, platform?: string): Observable<social_online_presence_hit[]> {
    const payload: { tokens: string[]; username: string; platform?: string } = { tokens, username };
    if (platform) {
      payload.platform = platform;
    }
    return timer(1000, 2000).pipe(switchMap(() => this.api.post<ApiEnvelope<{ results?: social_online_presence_hit[] }>>('social/metadata', payload)),
      filter(response => !!response && 'result' in response),
      take(1),
      map(response => response.result?.results ?? []));
  }
}
