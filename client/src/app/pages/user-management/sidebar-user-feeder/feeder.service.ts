import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FeederCatalogResponse, FeederOwnerUser, FeederScriptItem, FeederScriptListResponse, FeederUploadResponse, } from './model/feeder.model';
import { ApiService } from '../../../shared/services/api.service';

@Injectable({ providedIn: 'root' })
export class FeederService {
  constructor(private apiService: ApiService) {}

  getCatalog(): Observable<FeederCatalogResponse> {
    return this.apiService.get<FeederCatalogResponse>('profile/feeder/catalog');
  }

  getScripts( params: { ruleKey?: string; entryType: 'scripts' | 'values'; page: number; limit: number; } ): Observable<FeederScriptListResponse> {
    const query = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
      entry_type: params.entryType,
    });
    if (params.ruleKey) {
      query.set('rule_key', params.ruleKey);
    }
    return this.apiService.get<FeederScriptListResponse>(`profile/feeder/scripts?${query.toString()}`);
  }

  upload(formData: FormData): Observable<FeederUploadResponse> {
    return this.apiService.post<FeederUploadResponse>('profile/feeder/upload', formData);
  }

  deleteScript(scriptId: string): Observable<{ message?: string }> {
    return this.apiService.post<{ message?: string }>(`profile/feeder/scripts/${scriptId}/delete`, {});
  }

  deleteValue(scriptId: string, value: string): Observable<{ message?: string }> {
    return this.apiService.post<{ message?: string }>(`profile/feeder/scripts/${scriptId}/delete-value`, { value });
  }

  deleteAllValues(scriptId: string): Observable<{ message?: string }> {
    return this.apiService.post<{ message?: string }>(`profile/feeder/scripts/${scriptId}/delete-all-values`, {});
  }

  toggleScript(scriptId: string): Observable<{ message?: string; script?: FeederScriptItem }> {
    return this.apiService.post<{ message?: string; script?: FeederScriptItem }>(`profile/feeder/scripts/${scriptId}/toggle`, {});
  }

  setAllForRule(ruleKey: string, enabled: boolean): Observable<{ message?: string }> {
    const endpoint = enabled ? 'profile/feeder/scripts/enable-all' : 'profile/feeder/scripts/disable-all';
    return this.apiService.post<{ message?: string }>(`${endpoint}?rule_key=${encodeURIComponent(ruleKey)}`, {});
  }

  clearAllForRule(ruleKey: string): Observable<{ message?: string }> {
    return this.apiService.post<{ message?: string }>(`profile/feeder/scripts/clear-all?rule_key=${encodeURIComponent(ruleKey)}`, {});
  }

  getOwnerUsers(): Observable<FeederOwnerUser[]> {
    return this.apiService.get<FeederOwnerUser[]>('profile/feeder/users');
  }

  transferOwner(scriptId: string, userId: string): Observable<{ message?: string }> {
    return this.apiService.post<{ message?: string }>(`profile/feeder/scripts/${scriptId}/owner`, { user_id: userId });
  }
}
