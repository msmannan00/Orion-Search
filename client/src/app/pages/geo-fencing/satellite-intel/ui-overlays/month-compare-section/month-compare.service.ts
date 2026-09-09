import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { SatelliteAnomalyResponse, SatelliteCompareMonth, SatelliteCompareResponse, SatelliteImageResponse } from '../../model/satellite-intel-api.models';
import { ApiService } from '../../../../../shared/services/api.service';
import { SatelliteIntelService } from '../../satellite-intel-service';

@Injectable({ providedIn: 'root' })
export class MonthCompareService {
  constructor(private api: ApiService, private satelliteIntelService: SatelliteIntelService) {}

  runCompare(lat: number, lon: number, delta = 0.05, imageType = 'true_colour', month = ''): Observable<SatelliteCompareResponse> {
    const monthKey = this.normalizeMonthKey(month);
    if (monthKey) {
      return this.runTimedCompare(lat, lon, delta, imageType, monthKey);
    }

    return this.satelliteIntelService.createPolledRequest(() => this.api.post<SatelliteCompareResponse>('satellite/compare', { lat, lon, delta, image_type: imageType }),
      (res) => this.getPollStatus(res),
      3000,
      { trackState: true },).pipe(switchMap((response) => {
      if (this.satelliteIntelService.isPendingResponse(response)) {
        return of(response);
      }

      const result = response?.result;
      const yearAgoMonth = this.getYearAgoMonthKey(result?.months?.[0]?.month_key);
      return this.satelliteIntelService.createPolledRequest(() => this.api.post<SatelliteImageResponse>('satellite/sentinel/image', {
        lat,
        lon,
        delta,
        image_type: imageType,
        month: yearAgoMonth,
        size: 512,
      }),
      (res) => this.getPollStatus(res),
      3000,)
        .pipe(filter((imageResponse) => !this.satelliteIntelService.isPendingResponse(imageResponse)),
          map((imageResponse) => this.withYearAgoImage(response, imageResponse, yearAgoMonth)),
          catchError(() => of(response)),);
    }),);
  }

  runAnomalyScan(lat: number, lon: number, delta = 0.05, shClientId?: string, shClientSecret?: string): Observable<SatelliteAnomalyResponse> {
    const payload: Record<string, unknown> = { lat, lon, delta };
    if (shClientId) {
      payload.sh_client_id = shClientId;
    }
    if (shClientSecret) {
      payload.sh_client_secret = shClientSecret;
    }
    return this.satelliteIntelService.createPolledRequest(() => this.api.post<SatelliteAnomalyResponse>('satellite/anomaly', payload),
      (res) => this.getPollStatus(res),
      4000,
      { trackState: true },);
  }

  private getPollStatus(res: SatelliteAnomalyResponse | SatelliteCompareResponse | SatelliteImageResponse): string | undefined {
    return res?.result?.status ?? res?.status;
  }

  private runTimedCompare(lat: number, lon: number, delta: number, imageType: string, monthKey: string): Observable<SatelliteCompareResponse> {
    const monthKeys = [
      monthKey,
      this.shiftMonthKey(monthKey, -1),
      this.shiftMonthKey(monthKey, -2),
      this.shiftMonthKey(monthKey, -12),
    ];
    const requests = monthKeys.map((key, index) => this.fetchMonthImage(lat, lon, delta, imageType, key).pipe(map((response) => this.toCompareMonth(response, key, index === 3))));
    return forkJoin(requests).pipe(map((months) => ({
      status: 'success',
      result: {
        status: 'success',
        lat,
        lon,
        delta,
        image_type: imageType,
        months: months.filter((month): month is SatelliteCompareMonth => month !== null),
      },
    })));
  }

  private fetchMonthImage(lat: number, lon: number, delta: number, imageType: string, monthKey: string): Observable<SatelliteImageResponse> {
    return this.satelliteIntelService.createPolledRequest(() => this.api.post<SatelliteImageResponse>('satellite/sentinel/image', {
      lat,
      lon,
      delta,
      image_type: imageType,
      month: monthKey,
      size: 512,
    }),
    (res) => this.getPollStatus(res),
    3000,).pipe(filter((response) => !this.satelliteIntelService.isPendingResponse(response)),
      catchError(() => of({ status: 'error' } as SatelliteImageResponse)),);
  }

  private toCompareMonth(response: SatelliteImageResponse, monthKey: string, isYearAgo: boolean): SatelliteCompareMonth | null {
    const imageResult = response?.result;
    const imageUrl = imageResult?.image_url ?? imageResult?.data_url ?? this.toDataUrl(imageResult);
    if (!imageUrl) {
      return null;
    }

    return {
      month_key: isYearAgo ? `${monthKey}-year-ago` : monthKey,
      label: `${this.formatMonthLabel(monthKey)}${isYearAgo ? ' (1 year ago)' : ''}`,
      image_url: imageUrl,
    };
  }

  private withYearAgoImage(response: SatelliteCompareResponse, imageResponse: SatelliteImageResponse, monthKey: string): SatelliteCompareResponse {
    const result = response?.result;
    const imageResult = imageResponse?.result;
    const imageUrl = imageResult?.image_url ?? imageResult?.data_url ?? this.toDataUrl(imageResult);
    if (!result || !imageUrl) {
      return response;
    }

    const yearAgoImage: SatelliteCompareMonth = {
      month_key: `${monthKey}-year-ago`,
      label: `${this.formatMonthLabel(monthKey)} (1 year ago)`,
      image_url: imageUrl,
    };
    const months = Array.isArray(result.months) ? result.months : [];
    return {
      ...response,
      result: {
        ...result,
        months: [ ...months, yearAgoImage ],
      },
    };
  }

  private toDataUrl(imageResult: SatelliteImageResponse['result']): string {
    const imageBase64 = imageResult?.image_base64 ?? imageResult?.image_b64;
    if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
      return '';
    }
    return `data:${imageResult?.mime_type ?? imageResult?.content_type ?? 'image/png'};base64,${imageBase64}`;
  }

  private getYearAgoMonthKey(monthKey?: string): string {
    const match = typeof monthKey === 'string' ? /^(\d{4})-(\d{2})$/.exec(monthKey) : null;
    if (match) {
      return `${Number(match[1]) - 1}-${match[2]}`;
    }

    const date = new Date();
    return `${date.getFullYear() - 1}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private normalizeMonthKey(monthKey: string): string {
    return /^\d{4}-\d{2}$/.test(monthKey.trim()) ? monthKey.trim() : '';
  }

  private shiftMonthKey(monthKey: string, offset: number): string {
    const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
    if (!match) {
      return monthKey;
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatMonthLabel(monthKey: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
    if (!match) {
      return monthKey;
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}
