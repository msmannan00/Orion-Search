import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Job } from '../models/social.models';
import { ScanEvent } from '../models/social-usability.models';
import { SocialScanService } from './social-scan.service';
import { SocialStorageService } from './social-storage.service';

@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly scanService = inject(SocialScanService);
  private readonly storageService = inject(SocialStorageService);
  private readonly scanCancelSubjects = new Map<string, Subject<void>>();

  initiateScan(rawUsername: string, destroyRef: DestroyRef): boolean {
    const username = rawUsername.trim().replace(/^@+/, '').toLowerCase();
    if (!username) {
      return false;
    }
    if (this.storageService.state.jobs().some(job => job.id === username && (job.status === 'in_progress' || job.status === 'queued'))) {
      return false;
    }

    const shouldQueue = this.hasRunningJob();
    const job: Job = {
      id: username,
      status: shouldQueue ? 'queued' : 'in_progress',
      progress: shouldQueue ? 0 : 5,
      step: shouldQueue ? 'Queued' : 'Starting',
    };
    this.storageService.state.jobs.update(jobs => [job, ...jobs.filter(currentJob => currentJob.id !== username)]);
    if (!shouldQueue) {
      this.runScan(job, this.scanService.performScan(job.id), destroyRef);
    }
    return true;
  }

  initiateImageScan(base64Image: string, fileName: string, destroyRef: DestroyRef): void {
    const job: Job = {
      id: `Image Scan: ${fileName} #${self.crypto.randomUUID().substring(0, 4)}`,
      status: 'in_progress',
      progress: 5,
      step: `Scanning ${fileName}`,
    };
    this.storageService.state.jobs.update(jobs => [job, ...jobs]);
    this.runScan(job, this.scanService.performImageScan(base64Image, job.id), destroyRef);
  }

  cancelScan(jobId: string, destroyRef: DestroyRef): void {
    const cancelledJob = this.storageService.state.jobs().find(job => job.id === jobId);
    this.cancelScanRequest(jobId);
    this.storageService.state.jobs.update(jobs => jobs.filter(job => job.id !== jobId));
    if (cancelledJob?.status === 'in_progress') {
      this.scanService.cancelScan().pipe(takeUntilDestroyed(destroyRef)).subscribe({ error: () => void 0 });
      this.startNextQueuedScan(destroyRef);
    }
  }

  resumeIncompleteScans(destroyRef: DestroyRef): void {
    const inProgressJobs = this.storageService.state.jobs().filter(job => job.status === 'in_progress');
    if (inProgressJobs.length > 1) {
      const [activeJob, ...extraJobs] = inProgressJobs;
      const queuedIds = new Set(extraJobs.map(job => job.id));
      this.storageService.state.jobs.update(jobs => jobs.map(job => {
        if (job.id === activeJob.id || !queuedIds.has(job.id)) {
          return job;
        }
        return { ...job, status: 'queued', progress: 0, step: 'Queued' };
      }));
    }

    const activeJob = this.storageService.state.jobs().find(job => job.status === 'in_progress');
    if (activeJob && !this.scanCancelSubjects.has(activeJob.id)) {
      this.runScan(activeJob, this.scanService.resumeScan(activeJob.id), destroyRef);
      return;
    }
    this.startNextQueuedScan(destroyRef);
  }

  private hasRunningJob(): boolean {
    return this.storageService.state.jobs().some(job => job.status === 'in_progress');
  }

  private startNextQueuedScan(destroyRef: DestroyRef): void {
    if (this.hasRunningJob()) {
      return;
    }
    const nextJob = this.storageService.state.jobs().find(job => job.status === 'queued');
    if (!nextJob) {
      return;
    }
    this.storageService.state.jobs.update(jobs => jobs.map(job => job.id === nextJob.id
      ? { ...job, status: 'in_progress', progress: Math.max(job.progress, 5), step: 'Starting' }
      : job));
    this.runScan(nextJob, this.scanService.performScan(nextJob.id), destroyRef);
  }

  private runScan(job: Job, scan$: Observable<ScanEvent>, destroyRef: DestroyRef): void {
    const cancel$ = new Subject<void>();
    this.scanCancelSubjects.set(job.id, cancel$);
    scan$.pipe(takeUntil(cancel$), takeUntilDestroyed(destroyRef)).subscribe({
      next: event => {
        this.setScanEvent(job, event, destroyRef);
      },
      error: (error) => {
        this.setScanFailed(job, destroyRef, error instanceof Error ? error.message : '');
      },
      complete: () => this.scanCancelSubjects.delete(job.id),
    });
  }

  private setScanEvent(job: Job, event: ScanEvent, destroyRef: DestroyRef): void {
    if (event.type === 'progress') {
      this.storageService.state.jobs.update(jobs => jobs.map(currentJob => currentJob.id === job.id
        ? { ...currentJob, ...event.payload }
        : currentJob));
      return;
    }

    this.storageService.setScanProfiles(job.id, event.payload);
    this.storageService.state.activeUsername.set(job.id);
    this.storageService.state.jobs.update(jobs => jobs.map(currentJob => currentJob.id === job.id
      ? { ...currentJob, status: 'completed', progress: 100, step: 'Completed' }
      : currentJob));
    this.startNextQueuedScan(destroyRef);
  }

  private setScanFailed(job: Job, destroyRef: DestroyRef, reason = ''): void {
    this.storageService.state.jobs.update(jobs => jobs.map(currentJob => currentJob.id === job.id
      ? { ...currentJob, status: 'failed', step: reason === 'Scan cancelled' ? reason : 'Scan failed' }
      : currentJob));
    this.scanCancelSubjects.delete(job.id);
    this.startNextQueuedScan(destroyRef);
  }

  private cancelScanRequest(jobId: string): void {
    const cancel$ = this.scanCancelSubjects.get(jobId);
    cancel$?.next();
    cancel$?.complete();
    this.scanCancelSubjects.delete(jobId);
  }
}
