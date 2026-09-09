import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { IpDetail } from '../../../../../shared/model/network-intel/network-intel.model';
import { NetworkIntelScanService } from '../../../../../shared/services/network-intel/network-intel-scan.service';
import { IpDetailComponent } from '../../../../root-searches/network-intel/ip-detail/ip-detail.component';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { asUnknownRecord, getOwnProperty } from '../../../../../shared/utils/type-guards.util';

@Component({
  selector: 'app-threat-lens-ip-detail-popup',
  standalone: true,
  imports: [CommonModule, IpDetailComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ip-detail-popup.component.html',
})
export class IpDetailPopupComponent implements OnChanges, OnDestroy {
  private readonly detailPollDelayMs = 4000;
  private readonly finalDetailKeys = ['ip_info', 'hostnames', 'country', 'city', 'organization', 'isp', 'asn', 'cloud_provider', 'web_technologies', 'vulnerabilities', 'security', 'ports', 'open_ports', 'http_headers', 'cameras'];
  private requestId = 0;
  private detailSub?: Subscription;
  private retryTimer?: ReturnType<typeof setTimeout>;

  isLoading = false;
  errorMessage: string | null = null;
  detail: IpDetail | null = null;
  progress = 0;
  currentStep = '';

  @Input() ip = '';

  @Output() close = new EventEmitter<void>();

  constructor(private networkIntelService: NetworkIntelScanService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.ip && this.ip.trim()) {
      this.loadDetail(this.ip.trim());
    }
  }

  ngOnDestroy(): void {
    this.cancelPendingRequest();
  }

  onClose(): void {
    this.cancelPendingRequest();
    this.close.emit();
  }

  private loadDetail(ip: string): void {
    this.cancelPendingRequest();
    const requestId = ++this.requestId;
    this.isLoading = true;
    this.errorMessage = null;
    this.detail = null;
    this.progress = 0;
    this.currentStep = 'Loading IP details...';

    this.fetchDetail(ip, requestId);
  }

  private fetchDetail(ip: string, requestId: number): void {
    this.detailSub?.unsubscribe();
    this.detailSub = this.networkIntelService.fetchShodanIpDetail$(ip, (response) => {
      if (requestId !== this.requestId) {
        return;
      }
      const progress = response.result?.progress ?? response.progress;
      const step = response.result?.step ?? response.step ?? response.result?.status ?? response.status;
      this.progress = this.networkIntelService.getProgressValue(typeof progress === 'number' ? progress : undefined);
      this.currentStep = this.networkIntelService.getLoadingStepLabel(typeof step === 'string' ? step : undefined);
    }).subscribe({
      next: (detail) => {
        if (requestId !== this.requestId) {
          return;
        }
        const payload: Record<string, unknown> = detail && typeof detail === 'object' ? detail : {};
        this.updateLoadingState(payload);

        if (!this.isFinalIpDetail(payload)) {
          this.detail = null;
          this.isLoading = true;
          this.scheduleRetry(ip, requestId);
          return;
        }

        const finalPayload = this.removeIntermediateFields(payload);
        this.detail = { ...finalPayload, ip: String(finalPayload.ip ?? ip) };
        this.isLoading = false;
        this.currentStep = '';
      },
      error: (error) => {
        if (requestId !== this.requestId) {
          return;
        }
        this.errorMessage = error?.message ?? 'Failed to load IP details.';
        this.isLoading = false;
      },
    });
  }

  private scheduleRetry(ip: string, requestId: number): void {
    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      if (requestId === this.requestId) {
        this.fetchDetail(ip, requestId);
      }
    }, this.detailPollDelayMs);
  }

  private cancelPendingRequest(): void {
    this.requestId += 1;
    this.clearRetryTimer();
    this.detailSub?.unsubscribe();
    this.detailSub = undefined;
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  private updateLoadingState(payload: Record<string, unknown>): void {
    const result = asUnknownRecord(payload.result);
    const progress = payload.progress ?? result.progress;
    const step = payload.step ?? result.step ?? payload.status ?? result.status;
    this.progress = this.networkIntelService.getProgressValue(typeof progress === 'number' ? progress : this.progress);
    this.currentStep = this.networkIntelService.getLoadingStepLabel(typeof step === 'string' ? step : undefined);
  }

  private isFinalIpDetail(payload: Record<string, unknown>): boolean {
    const hasIp = this.networkIntelService.hasRenderableValue(payload.ip);
    const hasDetailFields = this.hasDetailFields(payload);

    if (this.isIntermediateResponse(payload)) {
      return hasDetailFields;
    }

    return hasIp || hasDetailFields;
  }

  private hasDetailFields(payload: Record<string, unknown>): boolean {
    return this.finalDetailKeys.some((key) => this.networkIntelService.hasRenderableValue(getOwnProperty(payload, key)));
  }

  private isIntermediateResponse(payload: Record<string, unknown>): boolean {
    const result = asUnknownRecord(payload.result);
    const status = String(payload.status ?? result.status ?? '').toLowerCase();
    const hasJobId = payload.job_id !== undefined || payload.jobId !== undefined || payload.task_id !== undefined || payload.taskId !== undefined;
    const hasProgress = payload.progress !== undefined || result.progress !== undefined;
    const isRunningStatus = ['pending', 'busy', 'queued', 'queue', 'processing', 'running', 'in_progress', 'started', 'scanning'].includes(status);

    return hasJobId || hasProgress || isRunningStatus;
  }

  private removeIntermediateFields(payload: Record<string, unknown>): Record<string, unknown> {
    const hiddenKeys = new Set(['job_id', 'jobId', 'task_id', 'taskId', 'status', 'progress', 'step']);
    return Object.fromEntries(Object.entries(payload).filter(([key]) => !hiddenKeys.has(key)));
  }
}
