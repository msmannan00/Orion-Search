import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, Subject, Subscription, timer } from 'rxjs';
import { expand, finalize, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { DnsResponse, SubdomainResponse, WaybackResponse } from '../../model/scanners/scanner.models';
import { ScanNotificationService } from '../../services/scan-notification.service';
import { ScanTaskError, ScanTaskResponse } from '../../model/network-intel/network-intel.model';
@Injectable({ providedIn: 'root' })
export class ScanHelperMethodsService {
  private readonly baseScanNotifications = inject(ScanNotificationService);

  protected readonly pollDelayMs = 4000;
  protected currentCancel$?: Subject<boolean> = undefined;
  protected api = inject(ApiService);

  progress = signal(0);
  onDone = signal<ScanTaskResponse | null>(null);
  onError = signal<ScanTaskError | null>(null);

  cancelCurrentScan(): void {
    if (this.currentCancel$) {
      this.completeCancelSubject(this.currentCancel$);
      this.currentCancel$ = undefined;
      this.progress.set(0);
      this.onDone.set(null);
      this.onError.set({ message: 'Cancelled by user' });
      this.afterTaskStop();
    }
  }

  protected isPendingOrBusy(status: string | undefined): boolean {
    return ['pending', 'busy', 'queued', 'running', 'started', 'processing', 'scanning', 'in_progress'].includes(String(status ?? '').toLowerCase());
  }

  protected getPendingStatus<T extends { status?: string; progress?: number; step?: string; result?: { status?: string; progress?: number; step?: string } | null }>(res: T): string | undefined {
    return res?.result?.status ?? res?.status;
  }

  protected updateProgress(progress: number | null | undefined): void {
    if (progress != null && typeof progress === 'number') {
      this.progress.set(Math.min(99, progress));
    }
  }

  protected poll<T>(call: () => Observable<T>, getStatus: (v: T) => string | undefined, onEach: (v: T) => void, cancel$: Subject<boolean>, delayMs: number): Observable<T> {
    const request$ = call().pipe(tap(onEach));
    return request$.pipe(expand((v: T) => {
      const status = getStatus(v);
      if (this.isPendingOrBusy(status)) {
        return timer(delayMs).pipe(switchMap(() => call().pipe(tap(onEach))));
      }
      return EMPTY;
    }), takeWhile((v: T) => this.isPendingOrBusy(getStatus(v)), true), takeUntil(cancel$));
  }

  protected runTask<T extends object>(build: (cancel$: Subject<boolean>) => Observable<T>): Subscription {
    this.progress.set(0);
    this.onDone.set(null);
    this.onError.set(null);
    this.beforeTaskStart();
    const cancel$ = new Subject<boolean>();
    this.currentCancel$ = cancel$;
    const obs$ = build(cancel$).pipe(finalize(() => {
      this.progress.set(100);
      this.currentCancel$ = undefined;
      this.afterTaskStop();
    }));
    const sub = new Subscription();
    sub.add(obs$.subscribe({
      next: (value) => {
        this.handleTaskValue(value);
      },
      error: (err: unknown) => {
        this.onError.set({ message: err instanceof Error ? err.message : 'Request failed' });
      },
      complete: () => {
        this.currentCancel$ = undefined;
        this.afterTaskStop();
      }
    }));
    sub.add(() => {
      this.completeCancelSubject(cancel$);
      this.currentCancel$ = undefined;
      this.afterTaskStop();
    });
    return sub;
  }

  protected runPollingScan<T extends object>( call: () => Observable<T>, getStatus: (res: T) => string | undefined, getProgress: (res: T) => number | null | undefined ): Subscription {
    const enhanced = (res: T) => {
      this.updateProgress(getProgress(res));
    };
    const build = (cancel$: Subject<boolean>) => this.poll<T>(call, getStatus, enhanced, cancel$, this.pollDelayMs);
    return this.runTask<T>(build);
  }

  protected createCancelSubject(): Subject<boolean> {
    return new Subject<boolean>();
  }

  protected completeCancelSubject(cancel$: Subject<boolean>): void {
    cancel$.next(true);
    cancel$.complete();
  }

  protected beforeTaskStart(): void {
    return;
  }

  protected afterTaskStop(): void {
    return;
  }

  protected handleTaskValue<T extends object>(value: T): void {
    this.onDone.set(value);
  }

  scanSubdomains(resolved: string, checkLive: boolean): Subscription {
    const call = () => this.baseScanNotifications.runApiScanAsResponse<SubdomainResponse>({
      apiReference: 'urlscan/subdomains',
      payload: { domain: resolved, scanType: 'subdomains', checkLive },
      metadata: { title: 'Subdomain Scan', target: resolved },
      pollDelayMs: this.pollDelayMs,
    });
    const getStatus = (res: SubdomainResponse) => this.getPendingStatus(res);
    const getProgress = (res: SubdomainResponse) => res.progress;
    return this.runPollingScan<SubdomainResponse>(call, getStatus, getProgress);
  }

  scanDns(ip: string): Subscription {
    const call = () => this.baseScanNotifications.runApiScanAsResponse<DnsResponse>({
      apiReference: 'urlscan/dns',
      payload: { domain: ip, scanType: 'dns' },
      metadata: { title: 'DNS Scan', target: ip },
      pollDelayMs: this.pollDelayMs,
      forceNew: true,
    });
    const getStatus = (res: DnsResponse) => res?.status;
    const getProgress = (res: DnsResponse) => res?.progress;
    return this.runPollingScan<DnsResponse>(call, getStatus, getProgress);
  }

  scanWayback(resolved: string): Subscription {
    const call = () => this.baseScanNotifications.runApiScanAsResponse<WaybackResponse>({
      apiReference: 'urlscan/wayback',
      payload: { domain: resolved, scanType: 'wayback' },
      metadata: { title: 'Wayback Scan', target: resolved },
      pollDelayMs: this.pollDelayMs,
    });
    const getStatus = (res: WaybackResponse) => this.getPendingStatus(res);
    const getProgress = (res: WaybackResponse) => res.progress;
    return this.runPollingScan<WaybackResponse>(call, getStatus, getProgress);
  }
}
