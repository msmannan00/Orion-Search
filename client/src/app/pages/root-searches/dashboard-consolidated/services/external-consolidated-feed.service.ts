import { Injectable, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppService } from '../../../../services/core/app/app.service';
import { ApiService } from '../../../../shared/services/api.service';
import { HelperService } from '../../../../shared/services/helper.service';
import { ConsolidatedParamModel } from '../../../../shared/model/results/consolidated/consolidated.param.model';
import { AptIntelResultItem } from '../../../../shared/model/results/apt-intel/apt-intel.callback.model';
import type { AptIntelFeedResponse } from './model/external-consolidated-feed.model';
export type { AptIntelFeedResponse } from './model/external-consolidated-feed.model';




@Injectable({ providedIn: 'root' })
export class ExternalConsolidatedFeedService {
  private localActorMalwareResults: AptIntelResultItem[] = [];
  private localActorMalwareResultCount = 0;
  private externalActorMalwareResults: AptIntelResultItem[] = [];
  private externalActorMalwareResultCount = 0;

  readonly actorMalwareResults = signal<AptIntelResultItem[]>([]);
  readonly actorMalwareResultCount = signal(0);

  constructor(private apiService: ApiService, private appService: AppService, private helperService: HelperService) {
  }

  resetActorMalware(): void {
    this.localActorMalwareResults = [];
    this.localActorMalwareResultCount = 0;
    this.externalActorMalwareResults = [];
    this.externalActorMalwareResultCount = 0;
    this.updateActorMalwareResults();
  }

  syncActorMalware(groupedResults: Record<string, unknown[]>, pageCounts: Record<string, number>): void {
    this.localActorMalwareResults = [
      ...((groupedResults.apt_model || []) as AptIntelResultItem[]),
      ...((groupedResults.malware_model || []) as AptIntelResultItem[]),
    ];
    this.localActorMalwareResultCount = (pageCounts.apt_model || 0) + (pageCounts.malware_model || 0);
    this.updateActorMalwareResults();
  }

  fetchActorMalware(paramModel: ConsolidatedParamModel, selectedFilters: Record<string, string | null>): void {
    const localSettings = this.appService.configData().localSettings;
    const entityCategories = localSettings.entityfilterCategories;
    const resultCount = Number(selectedFilters.platform_result_count ?? 0);
    let payload: Record<string, unknown> = {
      ...paramModel,
      ...selectedFilters,
      page: 1,
      category: 'all',
      platform_result_count: Math.max(Number.isFinite(resultCount) ? resultCount : 0, 100),
      matchtype: paramModel.matchtype || localSettings.matchType,
      must: localSettings.entityFilterCondition,
    };

    if (entityCategories) {
      payload.entity_filter = Object.fromEntries(Object.entries(entityCategories).filter(([, value]) => Array.isArray(value) ? value.length > 0 : true));
    }

    payload = this.helperService.removeEmptyOrNullValues(payload);

    this.apiService.post<AptIntelFeedResponse>('search/apt-intel', payload).pipe(map(response => {
      const results = response?.Result ?? [];
      const total = Number(response?.Total_Hits ?? response?.Total_Groups ?? results.length) || results.length;
      return { results, total };
    }), catchError(() => of({ results: [], total: 0 }))).subscribe(response => {
      this.externalActorMalwareResults = response.results;
      this.externalActorMalwareResultCount = response.total;
      this.updateActorMalwareResults();
    });
  }

  getMergedResultCount(groupedResults: Record<string, unknown[]>): number {
    const groupedCount = Object.values(groupedResults).reduce((sum, list) => sum + list.length, 0);
    return groupedCount + Math.max(this.actorMalwareResults().length - this.localActorMalwareResults.length, 0);
  }

  private updateActorMalwareResults(): void {
    const results = this.uniqueActorMalwareResults([
      ...this.localActorMalwareResults,
      ...this.externalActorMalwareResults,
    ]);
    this.actorMalwareResults.set(results);
    this.actorMalwareResultCount.set(this.localActorMalwareResultCount || this.externalActorMalwareResultCount || results.length);
  }

  private uniqueActorMalwareResults(results: AptIntelResultItem[]): AptIntelResultItem[] {
    const seen = new Set<string>();
    return results.filter((item, index) => {
      const key = item.m_hash ?? item._id ?? item.m_sha256_hash ?? item.m_sha1_hash ?? item.m_md5_hash ?? item.m_url ?? item.m_base_url ?? `${index}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
