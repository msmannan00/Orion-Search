import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, NgOptimizedImage, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, EMPTY, of, timer } from 'rxjs';
import { catchError, expand, finalize, switchMap, takeWhile } from 'rxjs/operators';
import { EmptyResultComponent } from '../../../shared/partials/empty-result/empty-result.component';
import { EmptyQueryComponent } from '../../../shared/partials/empty-query/empty-query.component';
import { ReportExportService } from '../../../shared/services/report-export.service';
import { GraphReportPayload } from '../../../shared/model/report/report-export.model';
import { ValuePresentationBase } from '../../../shared/utils/value-presentation.base';
import { ChatWidgetComponent } from '../../root-searches/ai-workspace/chat-widget/chat-widget.component';
import { AppService } from '../../../services/core/app/app.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { ScanNotificationService } from '../../../shared/services/scan-notification.service';
import { AiToolRoutingService } from '../../../shared/services/ai-tool-routing.service';
import { ExportChoiceModalComponent } from '../../../shared/partials/export-choice-modal/export-choice-modal.component';
import { DASHBOARD_API_EXPORT_OPTIONS } from '../../../shared/model/report/export-choice.model';
import { isUnknownRecord, UnknownRecord } from '../../../shared/utils/type-guards.util';
import { isDottedIdentifier } from '../../../shared/utils/network-validation.util';
import type { DashboardApiResponse } from './model/dashboard-api.model';
export type { DashboardApiResponse } from './model/dashboard-api.model';




type DashboardApiWireResponse = DashboardApiResponse | DashboardApiResponse[];

@Component({
  selector: 'app-dashboard-api',
  imports: [FormsModule, NgOptimizedImage, EmptyResultComponent, EmptyQueryComponent, NgClass, UpperCasePipe, ChatWidgetComponent, TooltipDirective, TranslatePipe, ExportChoiceModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard-api.component.html',
  styleUrls: ['./dashboard-api.component.css']
})
export class DashboardApiComponent extends ValuePresentationBase implements OnInit {
  q1 = '';
  q2 = '';
  displayQ1 = '';
  displayQ2 = '';
  loading = false;
  breachData: UnknownRecord | null = null;
  query_triggered = false;
  apiType: string | null = null;
  progress = 0;
  currentStep = '';
  responseData: DashboardApiWireResponse | null = null;
  txDrilldown = false;
  prevResponseData: DashboardApiWireResponse | null = null;
  prevQ1 = '';
  prevQ2 = '';
  prevDisplayQ1 = '';
  prevDisplayQ2 = '';
  prevBreachData: UnknownRecord | null = null;
  expandedResultIndex: number | null = null;
  cryptoSummaryExpanded = false;
  isExportChoiceOpen = false;
  readonly reportExportOptions = DASHBOARD_API_EXPORT_OPTIONS;
  trackByIndex = (index: number) => index;

  constructor(private route: ActivatedRoute, private http: HttpClient, private graphReportExport: ReportExportService, protected appService: AppService, private scanNotifications: ScanNotificationService, private aiToolRoutingService: AiToolRoutingService) {
    super();
  }

  get aiToolApiName(): string {
    return this.aiToolRoutingService.getTypeForApiType(this.apiType ?? '');
  }

  get aiWelcomeMessage(): string {
    return this.aiToolRoutingService.getMessageForApiType(this.apiType ?? '');
  }

  get cardsData(): DashboardApiResponse[] {
    const r = this.responseData;
    if (!r) {
      return [];
    }
    if (Array.isArray(r)) {
      return r;
    }
    if (Array.isArray(r.cards_data)) {
      return r.cards_data;
    }
    if (Array.isArray(r.result)) {
      return r.result;
    }
    if (Array.isArray(r.data?.cards_data)) {
      return r.data.cards_data;
    }
    if (!Array.isArray(r.result) && Array.isArray(r.result?.cards_data)) {
      return r.result.cards_data;
    }
    return [];
  }

  get cryptoResult(): DashboardApiResponse | null {
    const r = this.responseData;
    if (!r) {
      return null;
    }
    if (!Array.isArray(r) && r.result && !Array.isArray(r.result)) {
      return r.result;
    }
    if (!Array.isArray(r)) {
      return r;
    }
    return null;
  }

  get hasResults(): boolean {
    if (this.apiType === 'crypto') {
      return !!this.cryptoResult;
    }
    return this.genericItems.length > 0;
  }

  get progressValue(): number {
    const p = Number(this.progress);
    if (!Number.isFinite(p)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  get genericItems(): DashboardApiResponse[] {
    if (this.apiType === 'crypto') {
      return [];
    }
    if (
      this.responseData &&
      typeof this.responseData === 'object' &&
      (
        (!Array.isArray(this.responseData) && (
          Array.isArray(this.responseData.cards_data) ||
          Array.isArray(this.responseData.result) ||
          Array.isArray(this.responseData.data?.cards_data) ||
          (!Array.isArray(this.responseData.result) && Array.isArray(this.responseData.result?.cards_data))
        ))
      )
    ) {
      return this.cardsData;
    }
    if (this.cardsData.length > 0) {
      return this.cardsData;
    }
    if (this.responseData && !Array.isArray(this.responseData)) {
      return [this.responseData];
    }
    return [];
  }

  isArrayValue(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  deduplicateWithCount(arr: unknown[]): { value: unknown; count: number }[] {
    if (!Array.isArray(arr)) {
      return [];
    }
    const map = new Map<string, number>();
    arr.forEach(item => {
      const key = String(item);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }

  getGenericTotalFieldCount(): number {
    return this.genericItems.reduce<number>((total, item) => total + this.getVisibleObjectEntries(item).length, 0);
  }

  getVisibleObjectEntries(item: unknown): { key: string; value: unknown }[] {
    return this.getFlattenedObjectEntries(item).filter(entry => !this.isEmptyDisplayValue(entry.value));
  }

  ngOnInit(): void {
    this.apiType = this.route.snapshot.data?.type ? String(this.route.snapshot.data.type) : null;
    this.route.data.subscribe(d => {
      this.apiType = d?.type ? String(d.type) : this.apiType;
    });
    this.route.queryParams.subscribe(params => {
      if (this.apiType === 'user') {
        if (params.username) {
          this.q1 = params.username;
        }
        if (params.email) {
          this.q2 = params.email;
        }
      }
      else if (this.apiType === 'social') {
        if (params.username) {
          this.q1 = params.username;
        }
        if (params.email) {
          this.q2 = params.email;
        }
      }
      else if (this.apiType === 'wanted') {
        if (params.query) {
          this.q1 = params.query;
        }
        this.q2 = '';
      }
      else if (this.apiType === 'national-identity') {
        if (params.cnic) {
          this.q1 = params.cnic;
        }
        this.q2 = '';
      }
      else if (this.apiType === 'cracked') {
        if (params.playstore) {
          this.q1 = params.playstore;
        }
        this.q2 = '';
      }
      else if (this.apiType === 'software') {
        if (params.name) {
          this.q1 = params.name;
        }
        this.q2 = '';
      }
      else if (this.apiType === 'crypto') {
        if (params.text) {
          this.q1 = params.text;
        }
        this.q2 = '';
      }
      else {
        if (params.q1) {
          this.q1 = params.q1;
        }
        if (params.q2) {
          this.q2 = params.q2;
        }
      }
      if (this.q1 || this.q2) {
        this.onSearchSubmit(null);
      }
    });
  }

  openTx(txid: string | null | undefined) {
    const t = (txid ?? '').trim();
    if (!t) {
      return;
    }
    if (this.apiType !== 'crypto') {
      return;
    }
    if (!this.txDrilldown) {
      this.prevResponseData = this.responseData;
      this.prevQ1 = this.q1;
      this.prevQ2 = this.q2;
      this.prevDisplayQ1 = this.displayQ1;
      this.prevDisplayQ2 = this.displayQ2;
      this.prevBreachData = this.breachData;
    }
    this.txDrilldown = true;
    this.q1 = t;
    this.displayQ1 = t;
    this.onSearchSubmit(null);
  }

  openAddr(addr: string | null | undefined) {
    const a = (addr ?? '').trim();
    if (!a) {
      return;
    }
    this.openTx(a);
  }

  backFromTx() {
    this.txDrilldown = false;
    this.responseData = this.prevResponseData;
    this.q1 = this.prevQ1;
    this.q2 = this.prevQ2;
    this.displayQ1 = this.prevDisplayQ1;
    this.displayQ2 = this.prevDisplayQ2;
    this.breachData = this.prevBreachData;
    this.loading = false;
    this.progress = 0;
    this.currentStep = '';
    this.query_triggered = true;
    this.cryptoSummaryExpanded = false;
  }

  onSearchSubmit($event: SubmitEvent | null) {
    if ($event) {
      $event.preventDefault();
    }
    this.loading = true;
    this.responseData = null;
    this.breachData = null;
    this.progress = 0;
    this.currentStep = '';
    this.query_triggered = true;
    this.expandedResultIndex = null;
    this.cryptoSummaryExpanded = false;
    const payload = this.buildApiPayload();
    let endpoint = '/api/dynamic/';
    if (this.apiType === 'user') {
      endpoint = '/api/dynamic/user';
    }
    else if (this.apiType === 'social') {
      endpoint = '/api/dynamic/social';
    }
    else if (this.apiType === 'wanted') {
      endpoint = '/api/dynamic/wanted';
    }
    else if (this.apiType === 'national-identity') {
      endpoint = '/api/dynamic/national-identity';
    }
    else if (this.apiType === 'cracked') {
      endpoint = '/api/dynamic/cracked';
    }
    else if (this.apiType === 'software') {
      endpoint = '/api/dynamic/software';
    }
    else if (this.apiType === 'crypto') {
      endpoint = '/api/crypto/scan';
    }
    this.fetchSearchResults(endpoint, payload)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: res => {
          const response = this.asResponse(res);
          const nestedResponse = this.getNestedResponse(response?.result);
          const pending = this.isPendingResponse(res);
          const failedPending = this.isFailedPendingResponse(res);
          if (pending) {
            const p = nestedResponse?.progress ?? response?.progress;
            if (typeof p === 'number' && !Number.isNaN(p)) {
              this.progress = p;
            }
            const st = nestedResponse?.step ?? response?.step;
            if (typeof st === 'string' && st) {
              this.currentStep = st;
            }
            if (failedPending) {
              return;
            }
            return;
          }
          if (this.isFailedDoneResponse(res)) {
            this.responseData = null;
            this.breachData = null;
            this.expandedResultIndex = null;
            this.displayQ1 = this.q1;
            this.displayQ2 = this.q2;
            return;
          }
          if (this.apiType === 'crypto') {
            this.responseData = res;
            this.expandedResultIndex = null;
          }
          else {
            const normalized = response?.data ?? response?.result ?? res;
            this.responseData = Array.isArray(normalized)
              ? normalized
              : this.asResponse(normalized);
            this.breachData = (this.cardsData && this.cardsData.length > 0) ? this.cardsData[0] : null;
            this.expandedResultIndex = this.genericItems.length === 1 ? 0 : null;
          }
          this.displayQ1 = this.q1;
          this.displayQ2 = this.q2;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  get crackedValid(): boolean {
    try {
      const u = new URL(this.q1);
      return ((u.protocol === 'https:' || u.protocol === 'http:') && u.hostname === 'play.google.com') || isDottedIdentifier(this.q1);
    }
    catch {
      return isDottedIdentifier(this.q1);
    }
  }

  get cryptoTextValid(): boolean {
    const t = (this.q1 || '').trim();
    if (!t) {
      return false;
    }
    const txHashPattern = /^(0x)?[a-fA-F0-9]{64}$/;
    const btcLegacy = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    const btcSegwit = /^bc1[a-z0-9]{39,59}$/;
    const eth = /^0x[a-fA-F0-9]{40}$/;
    return txHashPattern.test(t) || btcLegacy.test(t) || btcSegwit.test(t) || eth.test(t);
  }

  private fetchSearchResults(apiEndpoint: string, paramModel: Record<string, unknown>): Observable<DashboardApiWireResponse | null> {
    const apiReference = apiEndpoint.replace(/^\/api\//, '');
    const trackedReferences = new Set([
      'dynamic/user',
      'dynamic/social',
      'dynamic/cracked',
      'dynamic/software',
      'dynamic/national-identity',
      'crypto/scan',
    ]);
    if (trackedReferences.has(apiReference)) {
      return this.scanNotifications.runScanAsResponse<DashboardApiResponse>({
        apiReference,
        payload: paramModel,
        metadata: {
          title: `${(this.apiType ?? apiReference).replace('-', ' ')} Scan`,
          target: this.q1 || this.q2 || apiReference,
          section: this.apiType ?? apiReference,
        },
        pollDelayMs: 2000,
      }).pipe(catchError(() => of(null)));
    }
    return this.http.post<DashboardApiWireResponse>(apiEndpoint, paramModel).pipe(expand(res => this.shouldContinuePolling(res)
      ? timer(2000).pipe(switchMap(() => this.http.post<DashboardApiWireResponse>(apiEndpoint, paramModel)))
      : EMPTY), takeWhile(res => this.shouldContinuePolling(res), true), catchError(() => of(null)));
  }

  private buildApiPayload(): Record<string, unknown> {
    if (this.apiType === 'user') {
      return { text: { username: this.q1, email: this.q2 } };
    }
    if (this.apiType === 'social') {
      return { text: { username: this.q1, email: this.q2 } };
    }
    if (this.apiType === 'wanted') {
      return { text: { query: this.q1 } };
    }
    if (this.apiType === 'national-identity') {
      return { text: { pak_query: this.q1 } };
    }
    if (this.apiType === 'cracked') {
      return { text: { playstore: this.q1 } };
    }
    if (this.apiType === 'software') {
      return { text: { name: this.q1 } };
    }
    if (this.apiType === 'crypto') {
      const t = (this.q1 || '').trim();
      const isHash = /^(0x)?[a-fA-F0-9]{64}$/.test(t);
      return { text: isHash ? { hash: t } : { wallet: t } };
    }
    return { text: { q1: this.q1, q2: this.q2 } };
  }

  private isPendingResponse(res: DashboardApiWireResponse | null): boolean {
    const response = this.asResponse(res);
    const nested = this.getNestedResponse(response?.result);
    const topStatus = (response?.status ?? '').toLowerCase();
    const nestedStatus = (nested?.status ?? '').toLowerCase();
    return ['pending', 'processing', 'running', 'busy'].includes(topStatus) ||
      ['pending', 'processing', 'running', 'busy'].includes(nestedStatus);
  }

  private isFailedPendingResponse(res: DashboardApiWireResponse | null): boolean {
    const response = this.asResponse(res);
    const nested = this.getNestedResponse(response?.result);
    return (response?.status === 'pending' || nested?.status === 'pending') &&
      ((nested?.progress ?? response?.progress) === 0) &&
      ((nested?.step ?? response?.step) === 'failed');
  }

  private isFailedDoneResponse(res: DashboardApiWireResponse | null): boolean {
    const response = this.asResponse(res);
    const nested = this.getNestedResponse(response?.result);
    const status = (nested?.status ?? response?.status ?? '').toLowerCase();
    const step = (nested?.step ?? response?.step ?? '').toLowerCase();
    return status === 'done' && step === 'failed';
  }

  private shouldContinuePolling(res: DashboardApiWireResponse | null): boolean {
    return this.isPendingResponse(res) && !this.isFailedPendingResponse(res);
  }

  private asResponse(value: DashboardApiWireResponse | null | undefined): DashboardApiResponse | null {
    return !Array.isArray(value) && isUnknownRecord(value) ? value : null;
  }

  private getNestedResponse(value: DashboardApiResponse | DashboardApiResponse[] | undefined): DashboardApiResponse | null {
    return value && !Array.isArray(value) ? value : null;
  }

  toggleResultItem(index: number): void {
    this.expandedResultIndex = this.expandedResultIndex === index ? null : index;
  }

  toggleCryptoSummary(): void {
    this.cryptoSummaryExpanded = !this.cryptoSummaryExpanded;
  }

  openExportChoice(): void {
    this.isExportChoiceOpen = true;
  }

  closeExportChoice(): void {
    this.isExportChoiceOpen = false;
  }

  selectExport(type: string): void {
    if (type === 'report' || type === 'json' || type === 'csv') {
      this.exportPdfReport(type);
    }
    this.closeExportChoice();
  }

  private exportPdfReport(type = 'report'): void {
    if (!this.hasResults) {
      return;
    }

    const query = (this.displayQ1 || this.q1 || 'query').trim();
    const now = new Date().toISOString();
    const apiLabel = (this.apiType ?? 'api').replace(/-/g, ' ');
    const toCompact = (v: unknown): string => {
      const raw = this.isObjectValue(v) || this.isArrayValue(v) ? this.stringifyJson(v) : this.stringifyPrimitive(v);
      return raw.length > 500 ? `${raw.slice(0, 497)}...` : raw;
    };

    if (this.apiType === 'crypto' && this.cryptoResult) {
      const r = this.cryptoResult;
      const values: Record<string, string> = {};
      Object.entries(r || {}).forEach(([k, v]) => {
        values[this.displayFieldLabel(k)] = toCompact(v);
      });

      const payload: GraphReportPayload = {
        graphKind: 'cti',
        title: `Entity Lookup Report - ${this.displayFieldLabel(apiLabel)}`,
        sessionName: `${this.apiType || 'api'}-${query || 'query'}`.slice(0, 80),
        generatedAtIso: now,
        nodes: Object.keys(values).map((k, i) => ({ id: `field-${i + 1}`, label: k, type: 'field' })),
        edges: Object.keys(values).map((k, i) => ({ id: `edge-${i + 1}`, from: query || 'query', to: k, label: 'contains' })),
        summary: {
          api_type: this.displayFieldLabel(apiLabel),
          query,
          status: this.stringifyPrimitive(r?.status),
          network: this.stringifyPrimitive(r?.network ?? r?.detected_network),
          query_type: this.stringifyPrimitive(r?.query_type),
          total_fields: Object.keys(values).length,
          exported_at: now
        },
        tables: [
          {
            title: 'Request Context',
            values: {
              'API Type': this.displayFieldLabel(apiLabel),
              'Query': query || 'not available',
              'Query 2': this.displayQ2 || this.q2 || 'not available',
              'Exported At': new Date(now).toLocaleString()
            }
          },
          { title: 'Crypto Result', values }
        ]
      };
      this.graphReportExport.exportByType(payload, type === 'report' ? 'doc_pdf' : type as 'json' | 'csv');
      return;
    }

    const items = this.genericItems || [];
    const tables = items.slice(0, 40).map((item, idx) => {
      const values: Record<string, string> = {};
      this.getVisibleObjectEntries(item).slice(0, 25).forEach(entry => {
        values[this.displayFieldLabel(entry.key)] = toCompact(entry.value);
      });
      return { title: `Result ${idx + 1}`, values };
    });

    const payload: GraphReportPayload = {
      graphKind: (this.apiType === 'social' || this.apiType === 'wanted' || this.apiType === 'national-identity') ? 'social' : 'cti',
      title: `Entity Lookup Report - ${this.displayFieldLabel(apiLabel)}`,
      sessionName: `${this.apiType ?? 'api'}-${query || 'query'}`.slice(0, 80),
      generatedAtIso: now,
      nodes: items.slice(0, 200).map((item, idx) => ({
        id: `result-${idx + 1}`,
        label: this.stringifyPrimitive(item.m_title ?? item.m_app_name ?? item.title ?? `Result ${idx + 1}`),
        type: 'record'
      })),
      edges: items.slice(0, 200).map((_, idx) => ({
        id: `edge-result-${idx + 1}`,
        from: query || 'query',
        to: `result-${idx + 1}`,
        label: 'matched'
      })),
      summary: {
        api_type: this.displayFieldLabel(apiLabel),
        query,
        total_results: items.length,
        expanded_default: items.length === 1 ? 'yes' : 'no',
        exported_at: now
      },
      tables: [
        {
          title: 'Request Context',
          values: {
            'API Type': this.displayFieldLabel(apiLabel),
            'Query': query || 'not available',
            'Query 2': this.displayQ2 || this.q2 || 'not available',
            'Result Count': String(items.length),
            'Exported At': new Date(now).toLocaleString()
          }
        },
        ...tables
      ]
    };

    this.graphReportExport.exportByType(payload, type === 'report' ? 'doc_pdf' : type as 'json' | 'csv');
  }
}
