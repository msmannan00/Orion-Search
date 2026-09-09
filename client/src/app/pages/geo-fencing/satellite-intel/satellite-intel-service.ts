import { Injectable, signal } from '@angular/core';
import { defer, EMPTY, Observable, throwError, timer } from 'rxjs';
import { catchError, expand, switchMap, takeWhile, tap } from 'rxjs/operators';
import { asUnknownRecord } from '../../../shared/utils/type-guards.util';
import type { SatelliteResponseRecord } from './model/satellite-intel-service.model';
import { SatellitePollingOptions } from './model/satellite-intel-service.model';
export type { SatelliteResponseRecord } from './model/satellite-intel-service.model';





@Injectable({ providedIn: 'root' })
export class SatelliteIntelService {
  onError = signal<{ message: string } | null>(null);

  resetState(): void {
    this.onError.set(null);
  }

  createPolledRequest<T>( call: () => Observable<T>, getStatus: (value: T) => string | undefined, delayMs = 3000, options: SatellitePollingOptions = {}, ): Observable<T> {
    return defer(() => {
      const trackState = options.trackState === true;
      if (trackState) {
        this.onError.set(null);
      }

      return call().pipe(expand((value: T) => {
        if (this.isPendingOrBusy(getStatus(value))) {
          return timer(delayMs).pipe(switchMap(() => call()));
        }
        return EMPTY;
      }),
      takeWhile((value: T) => this.isPendingOrBusy(getStatus(value)), true),
      tap((value) => {
        const responseError = this.getResponseError(value);
        if (trackState && responseError) {
          this.onError.set(responseError);
          throw new Error(responseError.message);
        }
      }),
      catchError((error) => {
        const normalized = this.normalizeClientError(error);
        if (trackState) {
          this.onError.set(normalized);
        }
        return throwError(() => normalized);
      }),);
    });
  }

  isPendingResponse(value: unknown): boolean {
    return this.isPendingOrBusy(this.getResponseStatus(value));
  }

  getResponseResult(value: unknown): unknown {
    const response = this.asResponse(value);
    return response.result ?? value;
  }

  private isPendingOrBusy(status: string | undefined): boolean {
    return status === 'pending' || status === 'busy';
  }

  private getResponseStatus(value: unknown): string | undefined {
    const response = this.asResponse(value);
    return response.result?.status ?? response.status;
  }

  private getResponseError(value: unknown): { message: string } | null {
    if (this.getResponseStatus(value) !== 'error') {
      return null;
    }

    const response = this.asResponse(value);
    return {
      message: response.result?.error_message ?? response.result?.message ?? response.message ?? 'Request failed',
    };
  }

  private normalizeClientError(error: unknown): { message: string } {
    const response = this.asResponse(error);
    const nestedError = asUnknownRecord(response.error);
    return {
      message: String(nestedError.detail ?? nestedError.message ?? response.message ?? response.statusText ?? 'Request failed'),
    };
  }

  private asResponse(value: unknown): SatelliteResponseRecord {
    return asUnknownRecord(value);
  }
}
