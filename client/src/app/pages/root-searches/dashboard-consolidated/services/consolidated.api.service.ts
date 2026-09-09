import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, forkJoin, Observable, of, timer } from 'rxjs';
import { catchError, expand, filter, map, switchMap, takeWhile } from 'rxjs/operators';
import { CardData, SearchDynamicEmailCallbackModel } from '../../../../shared/model/api/email/search_dynamic_email_callback_model';
import { ConsolidatedLiveApiResults, ConsolidatedLiveApis, ConsolidatedScanResults } from '../../../../shared/model/results/consolidated/consolidated.callback.model';
import { ScanNotificationService } from '../../../../shared/services/scan-notification.service';
import type { ConsolidatedApiResponse } from './model/consolidated.api.model';
export type { ConsolidatedApiResponse } from './model/consolidated.api.model';



@Injectable({
  providedIn: 'root'
})
export class ConsolidatedApiService {
  constructor(private http: HttpClient, private scanNotifications: ScanNotificationService) {
  }

  private getLiveApiDetails(input: ConsolidatedLiveApis): {
        apiEndpoint: string;
        payload: Record<string, unknown>;
    } {
    let payload: Record<string, unknown>;
    let endpoint: string;
    switch (input.type) {
      case 'user':
        endpoint = '/api/dynamic/user';
        payload = { text: { username: input.q1, email: input.q2 } };
        break;
      case 'social':
        endpoint = '/api/dynamic/social';
        payload = { text: { username: input.q1 } };
        break;
      case 'cracked':
        endpoint = '/api/dynamic/cracked';
        payload = { text: { playstore: input.q1 } };
        break;
      case 'software':
        endpoint = '/api/dynamic/software';
        payload = { text: { name: input.q1 } };
        break;
      default:
        endpoint = '/api/dynamic/';
        payload = { text: { q1: input.q1, q2: input.q2 } };
        break;
    }
    return { apiEndpoint: endpoint, payload };
  }

  private fetchLiveApiResults(input: ConsolidatedLiveApis): Observable<ConsolidatedApiResponse> {
    const { apiEndpoint, payload } = this.getLiveApiDetails(input);
    return this.http.post<ConsolidatedApiResponse>(apiEndpoint, payload).pipe(expand(res => {
      return this.shouldContinueLivePolling(res)
        ? timer(2000).pipe(switchMap(() => this.http.post<ConsolidatedApiResponse>(apiEndpoint, payload)))
        : EMPTY;
    }), takeWhile(res => {
      return this.shouldContinueLivePolling(res);
    }, true), catchError(error => {
      return new Observable<ConsolidatedApiResponse>(observer => {
        observer.error(error);
      });
    }));
  }

  private shouldContinueLivePolling(res: ConsolidatedApiResponse): boolean {
    const nested = this.getNestedResponse(res.result);
    const isPending = res.status === 'pending' || nested?.status === 'busy' || nested?.status === 'pending';
    const isFailedPending = (res.status === 'pending' || nested?.status === 'pending') &&
            ((nested?.progress ?? res.progress) === 0) &&
            ((nested?.step ?? res.step) === 'failed');
    return isPending && !isFailedPending;
  }

  public runLiveApiSearch(inputs: ConsolidatedLiveApis[]): Observable<ConsolidatedLiveApiResults[]> {
    const searchObservables = inputs.map(input =>
      this.fetchLiveApiResults(input).pipe(map(res => {
        let data: SearchDynamicEmailCallbackModel | null = null;
        const nested = this.getNestedResponse(res.result);
        const responseData = res.data;
        if (Array.isArray(nested?.result)) {
          data = new SearchDynamicEmailCallbackModel({
            cards_data: nested.result
          });
        }
        else if (Array.isArray(res.result)) {
          data = new SearchDynamicEmailCallbackModel({
            cards_data: res.result
          });
        }
        else if (Array.isArray(res.cards_data)) {
          data = new SearchDynamicEmailCallbackModel({
            cards_data: res.cards_data
          });
        }
        else if (Array.isArray(responseData?.cards_data)) {
          data = new SearchDynamicEmailCallbackModel({
            cards_data: responseData.cards_data,
            base_url: responseData.base_url,
            m_network: responseData.m_network,
          });
        }
        else if (Array.isArray(nested?.cards_data)) {
          data = new SearchDynamicEmailCallbackModel({
            cards_data: nested.cards_data
          });
        }
        else if (Array.isArray(responseData?.result)) {
          data = new SearchDynamicEmailCallbackModel({
            cards_data: responseData.result
          });
        }
        else if (res.success && responseData) {
          data = new SearchDynamicEmailCallbackModel({
            cards_data: responseData.cards_data ?? [],
            base_url: responseData.base_url,
            m_network: responseData.m_network,
          });
        }
        return {
          input,
          status: data?.cards_data?.length ? 'success' : 'error',
          resultData: data,
          errorMessage: null,
        } as ConsolidatedLiveApiResults;
      }),
      catchError(() =>
        of({
          input,
          status: 'error',
          resultData: null,
          errorMessage: 'API request failed or data not found.',
        } as ConsolidatedLiveApiResults))));
    return forkJoin(searchObservables);
  }

  public scan(target: string, scanType: 'basic' | 'seo' | 'repo'): Observable<ConsolidatedScanResults> {
    const endpoint = 'urlscan/domain';
    const payloadKey = 'domain';
    const payload = { [payloadKey]: target, scanType };
    return this.scanNotifications
      .runApiScanAsResponse<ConsolidatedApiResponse>({
        apiReference: endpoint,
        payload,
        forceNew: true,
        metadata: {
          title: `${scanType.toUpperCase()} Scan`,
          target,
          section: scanType,
        },
        pollDelayMs: 5000,
      })
      .pipe(map((res) => {
        if (!res || res.status === 'pending' || res.step === 'queued') {
          return null;
        }
        const result = this.getNestedResponse(res.result);
        const meta = result?.meta ?? null;
        const grade = result?.grade ?? '—';
        return {
          domain: target,
          scanType,
          meta,
          grade,
          hasError: false,
          errorMessage: ''
        } as ConsolidatedScanResults;
      }), filter((res): res is ConsolidatedScanResults => res !== null), catchError((err) => {
        return of({
          domain: target,
          scanType,
          meta: null,
          grade: '—',
          hasError: true,
          errorMessage: err?.error?.detail ?? `Failed to scan ${scanType}.`,
        } as ConsolidatedScanResults);
      }));
  }

  public scanDomain(domain: string, scanType: 'basic' | 'seo'): Observable<ConsolidatedScanResults> {
    return this.scan(domain, scanType);
  }

  public scanForRepo(repoPath: string, scanType: 'repo'): Observable<ConsolidatedScanResults> {
    return this.scan(repoPath, scanType);
  }

  private getNestedResponse(value: ConsolidatedApiResponse | CardData[] | undefined): ConsolidatedApiResponse | null {
    return value && !Array.isArray(value) ? value : null;
  }
}
