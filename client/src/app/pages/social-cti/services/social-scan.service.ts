import { Injectable } from '@angular/core';
import { Observable, concat, of, timer } from 'rxjs';
import { map, switchMap, takeWhile } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { ScanEvent, ScanStatusResponse } from '../models/social-usability.models';
@Injectable({ providedIn: 'root' })
export class SocialScanService {
  constructor(private api: ApiService) {}

  performScan(username: string): Observable<ScanEvent> {
    return this.track(username, () => this.api.post<ScanStatusResponse>('social/recon', { query: username }), 'Submitting job to API...');
  }

  performImageScan(base64Image: string, profileUsername: string): Observable<ScanEvent> {
    return this.track(profileUsername, () => this.api.post<ScanStatusResponse>('social/recon/image', { image_base64: base64Image, profile_username: profileUsername }), 'Submitting image to API...');
  }

  resumeScan(username: string): Observable<ScanEvent> {
    return this.track(username, null, 'Resuming');
  }

  cancelScan(): Observable<unknown> {
    return this.api.post('social/recon/cancel', {});
  }

  private track(username: string, start: (() => Observable<ScanStatusResponse>) | null, startStep: string): Observable<ScanEvent> {
    const status$ = timer(1000, 2000).pipe(switchMap(() => this.api.post<ScanStatusResponse>('social/recon/status', { query: username })));
    const updates$ = (start ? concat(start(), status$) : status$).pipe(map(response => this.toScanEvent(response)), takeWhile(event => event.type !== 'complete', true));
    return concat(of<ScanEvent>({ type: 'progress', payload: { progress: 5, step: startStep } }), updates$);
  }

  private toScanEvent(response: ScanStatusResponse | null): ScanEvent {
    if (response && 'result' in response) {
      return { type: 'complete', payload: Array.isArray(response.result) ? response.result : [] };
    }
    if (response?.status === 'pending') {
      return { type: 'progress', payload: { progress: response.progress ?? 5, step: response.step ?? 'Scanning' } };
    }
    throw new Error(String(response?.message ?? (response?.status === 'cancelled' ? 'Scan cancelled' : 'Scan failed')));
  }
}
