import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { getOwnProperty } from '../../../utils/type-guards.util';

@Injectable({ providedIn: 'root' })
export class SuggestionService {
  private readonly suggestionSources: Record<string, { endpoint: string; fields: Set<string>; }> = { exploit: { endpoint: 'search/exploit/suggestions', fields: new Set(['m_cve', 'm_cwe', 'm_product', 'm_tags']) } };
  private cache?: Record<string, string[]>;

  constructor(private http: HttpClient, private apiService: ApiService) {
  }

  loadSuggestions(): Observable<Record<string, string[]>> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http.get<Record<string, string[]>>('assets/data/entities_data/entity_filter_suggestions.json')
      .pipe(tap(data => this.cache = data));
  }

  loadSuggestion(source: string | undefined, field: string, query: string, endpoint?: string, extraParams?: Record<string, string>): Observable<string[]> {
    if (endpoint) {
      let params = new HttpParams()
        .set('field', field)
        .set('q', query.trim())
        .set('limit', query.trim() ? '25' : '50');
      Object.entries(extraParams ?? {}).forEach(([key, value]) => {
        if (value) {
          params = params.set(key, value);
        }
      });
      return this.apiService.get<{ values: string[] }>(endpoint, { params })
        .pipe(map(response => response.values || []));
    }

    if (!source) {
      return of([]);
    }
    const suggestionSource = getOwnProperty(this.suggestionSources, source);
    if (!suggestionSource?.fields.has(field)) {
      return of([]);
    }
    const params = new HttpParams()
      .set('field', field)
      .set('q', query.trim())
      .set('limit', query.trim() ? '25' : '20');
    return this.apiService.get<{ values: string[] }>(suggestionSource.endpoint, { params })
      .pipe(map(response => response.values || []));
  }
}
