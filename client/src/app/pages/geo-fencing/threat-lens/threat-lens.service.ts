import { Injectable } from '@angular/core';
import { firstValueFrom, from, map, Observable } from 'rxjs';
import { ConsolidatedCallbackModel } from '../../../shared/model/results/consolidated/consolidated.callback.model';
import { ConsolidatedParamModel } from '../../../shared/model/results/consolidated/consolidated.param.model';
import { ApiService } from '../../../shared/services/api.service';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { normalizeCountryLabel, splitCountryValues, toCountryKey } from '../../../shared/utils/country-normalization.util';
import { THREAT_LENS_CATEGORY_CONFIG, ThreatCountryCount, ThreatLensCategoryMapData, ThreatLensCategoryModelKey, ThreatLensDocument, ThreatLensFeedItem, ThreatLensMapData, ThreatLensRequestPayload, } from '../models/geo-fencing.models';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';


const COUNTRY_FIELDS = ['m_country', 'm_country_name', 'm_location', 'country', 'location'];

@Injectable({ providedIn: 'root' })
export class ThreatLensService {
  private readonly maxThreatLensPages = 30;

  constructor(private api: ApiService, private dashboardService: DashboardService) {}

  fetchThreatLensData(payload?: Partial<ThreatLensRequestPayload>): Observable<ConsolidatedCallbackModel> {
    return this.api.post<ConsolidatedCallbackModel>('threat/lens', this.buildThreatLensPayload(payload));
  }

  getThreatLensMapData(payload?: Partial<ThreatLensRequestPayload>, loadAllPages = false): Observable<ThreatLensMapData> {
    if (!loadAllPages) {
      return this.fetchThreatLensData(payload).pipe(map((response) => this.buildMapDataFromResponses([response])));
    }

    return from(this.fetchAllThreatLensData(payload)).pipe(map((responses) => this.buildMapDataFromResponses(responses)));
  }

  _toCountryKey(value: string): string {
    return toCountryKey(value);
  }

  normalizeCountryLabel(rawValue: string): string {
    return normalizeCountryLabel(rawValue);
  }

  private buildThreatLensPayload(payload?: Partial<ThreatLensRequestPayload>): ThreatLensRequestPayload {
    const request = Object.assign(new ConsolidatedParamModel(), this.dashboardService.selectedFilters(), payload) as ThreatLensRequestPayload & Record<string, unknown>;

    if (!String(request.q ?? '').trim()) {
      request.q = '';
    }

    return this.removeEmptyOrDefaultValues(request) as unknown as ThreatLensRequestPayload;
  }

  private removeEmptyOrDefaultValues(params: ThreatLensRequestPayload & Record<string, unknown>): Record<string, unknown> {
    const defaultParams = new ConsolidatedParamModel() as unknown as Record<string, unknown>;
    const cleanedParams: Record<string, unknown> = {};

    for (const key of Object.keys(params)) {
      const value = getOwnProperty(params, key);
      const defaultValue = getOwnProperty(defaultParams, key);
      const isNullOrUndefined = value === null || value === undefined;
      const isEmptyString = typeof value === 'string' && value.trim() === '';
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      const isSameAsDefault = JSON.stringify(value) === JSON.stringify(defaultValue);
      const isAllOption = value === 'all';

      if ((!isNullOrUndefined && !isEmptyString && !isEmptyArray && !isSameAsDefault && !isAllOption) || key === 'q' || key === 'page') {
        setOwnProperty(cleanedParams, key, value);
      }
    }

    return cleanedParams;
  }

  private async fetchAllThreatLensData(payload?: Partial<ThreatLensRequestPayload>): Promise<ConsolidatedCallbackModel[]> {
    const basePayload = this.buildThreatLensPayload(payload);
    const responses: ConsolidatedCallbackModel[] = [];
    const firstResponse = await firstValueFrom(this.fetchThreatLensData({ ...basePayload, page: 1 }));
    responses.push(firstResponse);

    const maxPages = Math.min(this.getThreatLensPageCount(firstResponse), this.maxThreatLensPages);
    for (let page = 2; page <= maxPages; page += 1) {
      responses.push(await firstValueFrom(this.fetchThreatLensData({ ...basePayload, page })));
    }

    return responses;
  }

  private getThreatLensPageCount(response: ConsolidatedCallbackModel): number {
    const normalizedResponse = new ConsolidatedCallbackModel(response);
    const counts = THREAT_LENS_CATEGORY_CONFIG.map((category) => {
      const categoryResponse = normalizedResponse[category.key];
      return Number(categoryResponse?.Page_Count ?? 0);
    });
    const maxCount = Math.max(...counts, 1);
    return Number.isFinite(maxCount) && maxCount > 0 ? Math.ceil(maxCount) : 1;
  }

  private buildMapDataFromResponses(responses: ConsolidatedCallbackModel[]): ThreatLensMapData {
    const normalizedResponses = responses.map((response) => new ConsolidatedCallbackModel(response));
    const overallCountryCounts = new Map<string, number>();
    const overallCountryNames = new Map<string, string>();
    const categoryDocuments = new Map<ThreatLensCategoryModelKey, ThreatLensDocument[]>();
    const categoryData: ThreatLensCategoryMapData[] = [];
    const feedItems: ThreatLensFeedItem[] = [];
    let totalResults = 0;
    for (const normalizedResponse of normalizedResponses) {
      for (const category of THREAT_LENS_CATEGORY_CONFIG) {
        const documents = this.extractResultItems(normalizedResponse[category.key]);
        const existingDocuments = categoryDocuments.get(category.key) ?? [];
        existingDocuments.push(...documents);
        categoryDocuments.set(category.key, existingDocuments);
      }
    }

    for (const category of THREAT_LENS_CATEGORY_CONFIG) {
      const documents = this.dedupeDocuments(categoryDocuments.get(category.key) ?? []);
      totalResults += documents.length;

      const categoryCountryCounts = new Map<string, number>();
      const categoryCountryNames = new Map<string, string>();
      const documentCountryGroups: string[][] = [];

      for (const document of documents) {
        const seenKeys = new Set<string>();
        const countriesForDoc: string[] = [];

        for (const country of this.extractCountries(document)) {
          const normalized = this.normalizeCountryLabel(country);
          const key = this._toCountryKey(normalized);

          if (!key || seenKeys.has(key)) {
            continue;
          }

          seenKeys.add(key);
          countriesForDoc.push(normalized);
          categoryCountryCounts.set(key, (categoryCountryCounts.get(key) ?? 0) + 1);
          overallCountryCounts.set(key, (overallCountryCounts.get(key) ?? 0) + 1);

          if (!categoryCountryNames.has(key)) {
            categoryCountryNames.set(key, normalized);
          }

          if (!overallCountryNames.has(key)) {
            overallCountryNames.set(key, normalized);
          }
        }

        if (countriesForDoc.length) {
          documentCountryGroups.push(countriesForDoc);
        }

        const feedItem = this.buildFeedItem(category, document, countriesForDoc);
        if (feedItem) {
          feedItems.push(feedItem);
        }
      }

      const rankedCategoryCounts = this.rankCountryCounts(categoryCountryCounts, categoryCountryNames);
      if (!documents.length && !rankedCategoryCounts.length) {
        continue;
      }

      categoryData.push({
        categoryKey: category.key,
        categoryLabel: category.label,
        color: category.color,
        countryCounts: rankedCategoryCounts,
        totalResults: documents.length,
        documentCountryGroups,
      });
    }

    const countryCounts = this.rankCountryCounts(overallCountryCounts, overallCountryNames);
    return {
      countryCounts,
      totalResults,
      maxCount: countryCounts.length ? countryCounts[0].count : 0,
      categoryData,
      feedItems: feedItems.sort((a, b) => b.timestamp - a.timestamp),
    };
  }

  private extractResultItems(model: { Result?: unknown[] } | undefined): ThreatLensDocument[] {
    return Array.isArray(model?.Result)
      ? model.Result.filter((item): item is ThreatLensDocument => typeof item === 'object' && item !== null && !Array.isArray(item))
      : [];
  }

  private rankCountryCounts(countryCounts: Map<string, number>, countryNames: Map<string, string>): ThreatCountryCount[] {
    return Array.from(countryCounts.entries())
      .map(([key, count]) => ({
        country: countryNames.get(key) ?? key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private dedupeDocuments(documents: ThreatLensDocument[]): ThreatLensDocument[] {
    const result: ThreatLensDocument[] = [];
    const seen = new Set<string>();

    for (const document of documents) {
      const identity = this.getDocumentIdentity(document);
      if (seen.has(identity)) {
        continue;
      }

      seen.add(identity);
      result.push(document);
    }

    return result;
  }

  private getDocumentIdentity(document: ThreatLensDocument): string {
    const parts = [
      document?.m_hash,
      document?.doc_id,
      document?.id,
      document?.m_url,
      document?.m_title,
      document?.m_creation_date,
    ];

    const identity = parts
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join('|');

    return identity || JSON.stringify(document || {});
  }

  private extractCountries(document: ThreatLensDocument): string[] {
    const countries: string[] = [];

    for (const fieldName of COUNTRY_FIELDS) {
      const value = getOwnProperty(document, fieldName);
      if (Array.isArray(value)) {
        for (const item of value) {
          countries.push(...this.splitCountryString(item));
        }
        continue;
      }

      countries.push(...this.splitCountryString(value));
    }

    return countries.filter(Boolean);
  }

  private splitCountryString(value: unknown): string[] {
    return splitCountryValues(value);
  }

  private buildFeedItem(category: typeof THREAT_LENS_CATEGORY_CONFIG[number], document: ThreatLensDocument, countriesForDoc: string[]): ThreatLensFeedItem | null {
    const { isoDate, timestamp } = this.extractDocumentDate(document);
    const title = this.extractDocumentTitle(document, category.label);
    const summary = this.extractDocumentSummary(document);
    const link = this.extractDocumentLink(document);
    const highlights = this.extractDocumentHighlights(document);
    const id = `${category.key}:${this.getDocumentIdentity(document)}`;

    if (!title && !summary && !highlights.length) {
      return null;
    }

    return {
      id,
      categoryKey: category.key,
      categoryLabel: category.label,
      color: category.color,
      title: title || `${category.label} item`,
      summary,
      highlights,
      link,
      date: isoDate,
      timestamp,
      countryKeys: countriesForDoc.map((country) => this._toCountryKey(country)).filter(Boolean),
    };
  }

  private extractDocumentDate(document: ThreatLensDocument): { isoDate: string; timestamp: number } {
    const candidates = [
      document?.m_date,
      document?.m_creation_date,
      document?.m_update_date,
    ];

    for (const candidate of candidates) {
      const value = String(candidate ?? '').trim();
      if (!value) {
        continue;
      }

      const timestamp = new Date(value).getTime();
      if (!Number.isNaN(timestamp)) {
        return { isoDate: new Date(timestamp).toISOString(), timestamp };
      }
    }

    return { isoDate: '', timestamp: 0 };
  }

  private extractDocumentTitle(document: ThreatLensDocument, fallbackLabel: string): string {
    const candidates = [
      document?.m_title,
      document?.m_name,
      document?.m_caption,
      document?.m_media_caption,
      document?.m_sender_name,
      document?.m_channel_name,
      document?.m_team,
      document?.q,
      document?.m_url,
    ];

    for (const candidate of candidates) {
      const value = this.cleanText(candidate);
      if (value) {
        return value;
      }
    }

    return `${fallbackLabel} item`;
  }

  private extractDocumentSummary(document: ThreatLensDocument): string {
    const candidates = [
      document?.m_important_content,
      Array.isArray(document?.m_summary) ? document.m_summary.join(' ') : '',
      document?.m_content,
      document?.m_highlighted,
      document?.m_caption,
      document?.m_media_caption,
    ];

    for (const candidate of candidates) {
      const value = this.cleanText(candidate);
      if (value) {
        return value;
      }
    }

    return '';
  }

  private extractDocumentLink(document: ThreatLensDocument): string {
    const candidates = [
      document?.m_url,
      document?.m_message_sharable_link,
      document?.m_channel_url,
      document?.m_base_url,
      Array.isArray(document?.m_source_url) ? document.m_source_url[0] : '',
      Array.isArray(document?.m_weblink) ? document.m_weblink[0] : '',
    ];

    for (const candidate of candidates) {
      const value = this.toSafeHttpUrl(String(candidate ?? '').trim());
      if (value) {
        return value;
      }
    }

    return '';
  }

  private toSafeHttpUrl(value: string): string {
    if (!value) {
      return '';
    }

    try {
      const url = new URL(value);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
    }
    catch {
      return '';
    }

    return '';
  }

  private extractDocumentHighlights(document: ThreatLensDocument): string[] {
    const entries = [
      document?.m_platform,
      document?.m_remote_type,
      document?.m_risk,
      document?.m_channel_name,
      document?.m_sender_username,
      document?.m_attacker,
      document?.m_team,
      document?.ioc,
      document?.m_cve,
      document?.m_content_type,
      document?.m_country_name,
      document?.m_location,
    ];

    const values = entries
      .flatMap((entry) => Array.isArray(entry) ? entry : [entry])
      .map((entry) => this.cleanText(entry))
      .filter(Boolean);

    return Array.from(new Set(values)).slice(0, 4);
  }

  private cleanText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
