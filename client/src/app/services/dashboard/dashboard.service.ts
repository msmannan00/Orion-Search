import { Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { ChatCallbackModel } from '../../shared/model/results/chat/chat.callback.model';
import { ConsolidatedCallbackModel } from '../../shared/model/results/consolidated/consolidated.callback.model';
import { ConsolidatedParamModel } from '../../shared/model/results/consolidated/consolidated.param.model';
import { RankedCallbackModel } from '../../shared/model/results/consolidated/ranked.callback.model';
import { StealerLogCallbackModel } from '../../shared/model/results/credentials/credential.callback.model';
import { DefacementCallbackModel } from '../../shared/model/results/defacement/defacement.callback.model';
import { ExploitCallbackModel } from '../../shared/model/results/exploit/exploit.callback.model';
import { GeneralCallbackModel } from '../../shared/model/results/general/general.callback.model';
import { LeakCallbackModel } from '../../shared/model/results/leak/leak.callback.model';
import { SocialCallbackModel } from '../../shared/model/results/social/social.callback.model';
import { PasswordSchemaFilter } from '../../shared/model/stealerlogs-filter/stealerlogs-filters';
import { ReportFeedbackModel } from '../../shared/partials/report-interactions/models/report-feedback.model';
import { ApiService } from '../../shared/services/api.service';
import { HelperService } from '../../shared/services/helper.service';
import { asUnknownRecord, getOwnProperty, setOwnProperty, UnknownRecord } from '../../shared/utils/type-guards.util';
import { AppService } from '../core/app/app.service';
import type { RankedApiResponse } from './model/dashboard.model';
export type { RankedApiResponse } from './model/dashboard.model';


type FeedbackAction = 'recommended' | 'trust' | 'untrust';


@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private cancelRequest$ = new Subject<void>();

  m_current_route = "";
  rankedResult: RankedCallbackModel = new RankedCallbackModel();
  consolidatedParamModel: ConsolidatedParamModel = new ConsolidatedParamModel();
  generalCallbackModel: GeneralCallbackModel = new GeneralCallbackModel();
  chatCallbackModel: ChatCallbackModel = new ChatCallbackModel();
  defacementCallbackModel: DefacementCallbackModel = new DefacementCallbackModel();
  exploitCallbackModel: ExploitCallbackModel = new ExploitCallbackModel();
  leakCallbackModel: LeakCallbackModel = new LeakCallbackModel();
  stealerlogCallbackModel: StealerLogCallbackModel = new StealerLogCallbackModel();
  consolidatedCallbackModel: ConsolidatedCallbackModel = new ConsolidatedCallbackModel();
  socialCallbackModel: SocialCallbackModel = new SocialCallbackModel();
  showSubscription = signal<boolean>(false);
  selectedFilters = signal<Record<string, string | null>>({});
  passwordSchemeFilter: PasswordSchemaFilter = { minLength: null, maxLength: null, hasAlphabets: false, hasNumbers: false, hasSpecialChars: false };

  constructor(private router: Router, private route: ActivatedRoute, private helperService: HelperService, private apiService: ApiService, private app_service: AppService) {
    this.initializeSideFilters();
  }

  fetchSearchResults<T extends {
        Result?: unknown[];
        cards_data?: unknown[];
    }>(apiEndpoint: string, paramModel: unknown, semantic = "", syncUrl = true): Observable<{
        success: boolean;
        isEmpty: boolean;
        data: T | null;
    }> {
    const route: string = this.router.url.split('?')[0];
    this.m_current_route = String(route);
    this.cancelOngoingRequest();
    const requestParams: UnknownRecord = { ...asUnknownRecord(paramModel), page: this.consolidatedParamModel.page };
    let baseParams: UnknownRecord = { ...requestParams, ...this.selectedFilters() };
    if (apiEndpoint === 'search/defacement') {
      baseParams.category = requestParams.category ?? 'all';
      baseParams.content = baseParams.content ?? requestParams.content ?? 'all';
    }
    if (apiEndpoint === 'search/exploit' || apiEndpoint === 'search/apt-intel') {
      const resultCount = Number(baseParams.platform_result_count ?? 0);
      baseParams.platform_result_count = Math.max(Number.isFinite(resultCount) ? resultCount : 0, 100);
    }
    const entityCategories = this.app_service.configData().localSettings.entityfilterCategories;
    if (semantic) {
      baseParams.matchtype = semantic;
    }
    else {
      baseParams.matchtype = this.app_service.configData().localSettings.matchType;
    }
    baseParams = this.helperService.removeEmptyOrNullValues(baseParams);
    baseParams.must = this.app_service.configData().localSettings.entityFilterCondition;
    if (syncUrl) {
      this.syncQueryParamsToUrl(baseParams);
    }
    if (entityCategories) {
      baseParams.entity_filter = Object.fromEntries(Object.entries(entityCategories).filter(([, v]) => Array.isArray(v) ? v.length > 0 : true));
    }
    const passwordScheme = this.passwordSchemeFilter;
    if (passwordScheme && Object.values(passwordScheme).some(v => v !== null && v !== false)) {
      baseParams.password_schema = passwordScheme;
    }
    this.passwordSchemeFilter = {
      minLength: null,
      maxLength: null,
      hasAlphabets: false,
      hasNumbers: false,
      hasSpecialChars: false
    };
    return this.apiService.post<T>(apiEndpoint, baseParams).pipe(takeUntil(this.cancelRequest$), map((response: T) => ({
      success: true,
      isEmpty: response.Result?.length === 0 || response.cards_data?.length === 0,
      data: response
    })), catchError(() => {
      return of({ success: false, isEmpty: false, data: null });
    }));
  }

  fetchConsolidatedRankededResults(apiEndpoint: string, paramModel: unknown): Observable<{
        success: boolean;
        isEmpty: boolean;
        data: RankedCallbackModel | null;
    }> {
    const { entityCategories, mergedParams } = this.beginRequestWithMergedParams(paramModel);
    let baseParams: UnknownRecord = mergedParams;
    baseParams = this.applyEntityFilter(baseParams, entityCategories);
    baseParams = this.helperService.removeEmptyOrNullValues(baseParams);
    baseParams.must = this.app_service.configData().localSettings.entityFilterCondition;
    let match_type = this.app_service.configData().localSettings.matchType;
    baseParams.matchtype = match_type ? match_type : this.app_service.configData().localSettings.matchType;
    this.syncQueryParamsToUrl(baseParams);
    return this.apiService.post<RankedApiResponse>(apiEndpoint, baseParams).pipe(takeUntil(this.cancelRequest$), map((response) => {
      const hasAnyResults = Array.isArray(response.Result) && response.Result.length > 0;
      return {
        success: true,
        isEmpty: !hasAnyResults,
        data: hasAnyResults ? new RankedCallbackModel({
          result: response.Result,
          pageCount: response.Page_Count,
          totalHits: response.Total_Hits
        }) : null
      };
    }), catchError(() => of({ success: false, isEmpty: false, data: null })));
  }

  fetchConsolidatedGroupedResults(apiEndpoint: string, paramModel: unknown): Observable<{
        success: boolean;
        isEmpty: boolean;
        data: ConsolidatedCallbackModel | null;
    }> {
    const { entityCategories, mergedParams } = this.beginRequestWithMergedParams(paramModel);
    let payload: UnknownRecord = mergedParams;
    payload = this.applyEntityFilter(payload, entityCategories);
    payload = this.helperService.removeEmptyOrNullValues(payload);
    payload.must = this.app_service.configData().localSettings.entityFilterCondition;
    this.syncQueryParamsToUrl(payload);
    return this.apiService.post<ConsolidatedCallbackModel>(apiEndpoint, payload).pipe(takeUntil(this.cancelRequest$), map((response: ConsolidatedCallbackModel) => {
      const hasAnyResults = [
        response?.leak_model?.Result?.length,
        response?.exploit_model?.Result?.length,
        response?.apt_model?.Result?.length,
        response?.malware_model?.Result?.length,
        response?.chat_model?.Result?.length,
        response?.generic_model?.Result?.length,
        response?.defacement_model?.Result?.length,
      ].some(Boolean);
      return {
        success: true,
        isEmpty: !hasAnyResults,
        data: response
      };
    }), catchError(() => of({ success: false, isEmpty: false, data: null })));
  }

  loadDocumentFeedback(docId: string, feedbackModel: ReportFeedbackModel): void {
    if (!docId) {
      this.patchReportFeedbackModel(feedbackModel, new ReportFeedbackModel());
      return;
    }
    this.apiService.get<ReportFeedbackModel>(`feedback/${docId}`).subscribe({
      next: (response) => {
        this.patchReportFeedbackModel(feedbackModel, new ReportFeedbackModel(response));
      },
      error: () => {
        this.patchReportFeedbackModel(feedbackModel, new ReportFeedbackModel({ doc_id: docId }));
      },
    });
  }

  submitFeedbackAction(action: FeedbackAction, docId: string, feedbackModel: ReportFeedbackModel, setLoadingKey?: (value: 'recommended_count' | 'trust_count' | 'untrust_count' | '') => void): void {
    if (!docId) {
      return;
    }
    const loadingMap = {
      recommended: 'recommended_count',
      trust: 'trust_count',
      untrust: 'untrust_count',
    } as const;
    const previousState = new ReportFeedbackModel(feedbackModel);
    setLoadingKey?.(getOwnProperty(loadingMap, action));
    this.apiService.post<ReportFeedbackModel>(`feedback/${action}/${docId}`, {}).subscribe({
      next: (response) => {
        this.patchReportFeedbackModel(feedbackModel, new ReportFeedbackModel(response));
        setLoadingKey?.('');
      },
      error: () => {
        this.patchReportFeedbackModel(feedbackModel, previousState);
        setLoadingKey?.('');
      },
    });
  }

  saveDocumentFeedbackComment(docId: string, comment: string, feedbackModel: ReportFeedbackModel, handlers?: { setSaving?: (value: boolean) => void; setError?: (value: string) => void }): void {
    if (!docId || !comment.trim()) {
      return;
    }
    handlers?.setError?.('');
    handlers?.setSaving?.(true);
    this.apiService.post<ReportFeedbackModel>(`feedback/comment/${docId}`, { comment }).subscribe({
      next: (response) => {
        this.patchReportFeedbackModel(feedbackModel, new ReportFeedbackModel(response));
        handlers?.setSaving?.(false);
      },
      error: (error) => {
        handlers?.setError?.(error?.error?.detail ?? error?.error?.message ?? 'Unable to save comment.');
        handlers?.setSaving?.(false);
      },
    });
  }

  deleteDocumentFeedbackComment(docId: string, commentCreatedAt: string, feedbackModel: ReportFeedbackModel, handlers?: { setSaving?: (value: boolean) => void; setError?: (value: string) => void }): void {
    if (!docId || !commentCreatedAt) {
      return;
    }
    handlers?.setError?.('');
    handlers?.setSaving?.(true);
    this.apiService.delete<ReportFeedbackModel>(`feedback/comment/${docId}/${encodeURIComponent(commentCreatedAt)}`).subscribe({
      next: (response) => {
        this.patchReportFeedbackModel(feedbackModel, new ReportFeedbackModel(response));
        handlers?.setSaving?.(false);
      },
      error: (error) => {
        handlers?.setError?.(error?.error?.detail ?? error?.error?.message ?? 'Unable to delete comment.');
        handlers?.setSaving?.(false);
      },
    });
  }

  private initializeSideFilters() {
    const allowedKeys = [
      "source",
      "daterange",
      "status",
      "network",
      "index",
      "content_type",
      "safe",
      "content",
      "mitre",
      "platform",
      "platform_result_count",
      "m_cve",
      "m_cwe",
      "m_product",
      "m_severity",
      "m_risk",
      "m_remote_type",
      "m_platform",
      "m_tags",
      "family",
      "m_country",
      "m_reporter"
    ];
    const params = new URLSearchParams(window.location.search);
    const selected: Record<string, string | null> = {};
    params.forEach((value, key) => {
      if (allowedKeys.includes(key)) {
        setOwnProperty(selected, key, value === 'all' || value === '' ? null : value);
      }
    });
    this.selectedFilters.set(selected);
  }

  resetParams() {
    this.consolidatedParamModel.reset();
    this.selectedFilters.set({});
    this.m_current_route = "";
  }

  clearResultCaches(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('dashboard-results-cache|')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
  }

  private cancelOngoingRequest() {
    return;
  }

  private beginRequestWithMergedParams(paramModel: unknown): {
        entityCategories: UnknownRecord;
        mergedParams: UnknownRecord;
    } {
    this.cancelOngoingRequest();
    const route: string = this.router.url.split('?')[0];
    this.m_current_route = String(route);
    const entityCategories = asUnknownRecord(this.app_service.configData().localSettings.entityfilterCategories);
    const mergedParams: UnknownRecord = { ...asUnknownRecord(paramModel), ...this.selectedFilters() };
    return { entityCategories, mergedParams };
  }

  private applyEntityFilter(params: UnknownRecord, entityCategories: UnknownRecord): UnknownRecord {
    if (Object.keys(entityCategories).length > 0) {
      params.entity_filter = Object.fromEntries(Object.entries(entityCategories).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : true)));
    }
    return params;
  }

  private patchReportFeedbackModel(target: ReportFeedbackModel, source: ReportFeedbackModel): void {
    target.doc_id = source.doc_id;
    target.recommended_count = source.recommended_count;
    target.trust_count = source.trust_count;
    target.untrust_count = source.untrust_count;
    target.comments = source.comments;
    target.reactions = source.reactions;
    target.current_user_reaction = source.current_user_reaction;
    target.can_react = source.can_react;
    target.created_at = source.created_at;
    target.updated_at = source.updated_at;
  }

  private syncQueryParamsToUrl(params: UnknownRecord): void {
    const queryParamsForNav = { ...params };
    delete queryParamsForNav.entity_filter;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParamsForNav,
      replaceUrl: true
    }).then();
  }

  clearCallback(): void {
    this.rankedResult = new RankedCallbackModel();
    this.generalCallbackModel = new GeneralCallbackModel();
    this.chatCallbackModel = new ChatCallbackModel();
    this.defacementCallbackModel = new DefacementCallbackModel();
    this.exploitCallbackModel = new ExploitCallbackModel();
    this.leakCallbackModel = new LeakCallbackModel();
    this.stealerlogCallbackModel = new StealerLogCallbackModel();
    this.consolidatedCallbackModel = new ConsolidatedCallbackModel();
    this.socialCallbackModel = new SocialCallbackModel();
  }
}
