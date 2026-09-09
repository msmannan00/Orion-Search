import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { IconService } from '../../../shared/partials/social-icon/services/icon.service';
import { SocialFetchService } from './social-fetch.service';
import type { db_social_model } from '../models/social.models';
import type { ApiEnvelope } from '../models/social-usability.models';
import { parseHandleList } from '../utils/social-user-graph.util';

const DARKWEB_RESULTS_PER_USER = 100;
const GRAPH_CONTACT_LIMIT = 200;

@Injectable({ providedIn: 'root' })
export class SocialUserGraphService {
  private readonly api = inject(ApiService);
  private readonly iconService = inject(IconService);
  private readonly fetchService = inject(SocialFetchService);
  private readonly reportCache = new Map<string, Record<string, unknown>[]>();

  loadDocuments(usernames: string[]): Observable<db_social_model[]> {
    return this.api.post<ApiEnvelope<db_social_model[]>>('social/graph/data', { usernames: parseHandleList(usernames), limit: GRAPH_CONTACT_LIMIT }).pipe(map(response => Array.isArray(response?.result) ? response.result : []),
      catchError(() => of<db_social_model[]>([])));
  }

  loadReports(usernames: string[], force = false): Observable<ReadonlyMap<string, Record<string, unknown>[]>> {
    const roots = parseHandleList(usernames);
    const pending = roots.filter(root => force || !this.reportCache.has(root));
    const collect = (): ReadonlyMap<string, Record<string, unknown>[]> => new Map(roots.map(root => [root, this.reportCache.get(root) ?? []] as const));
    if (!pending.length) {
      return of(collect());
    }
    return forkJoin(pending.map(root => this.fetchService.fetchDarkwebReport(root, DARKWEB_RESULTS_PER_USER).pipe(tap(docs => this.reportCache.set(root, docs))))).pipe(map(() => collect()));
  }

  resolvePlatformIcons(platforms: string[]): Promise<Map<string, string>> {
    return Promise.all(platforms.map(platform => this.iconService.getWhiteIconDataUrl(platform, { type: 'graph' }).then(url => [platform.toLowerCase(), url] as const)))
      .then(entries => new Map(entries));
  }

  platformColors(platforms: string[]): Map<string, string> {
    return new Map(platforms.map(platform => [platform.toLowerCase(), this.iconService.getPlatformBrandColor(platform)] as const));
  }
}
