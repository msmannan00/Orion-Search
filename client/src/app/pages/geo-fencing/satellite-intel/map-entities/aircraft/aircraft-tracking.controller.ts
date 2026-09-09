import { Observable, Subscription } from 'rxjs';
import { SatelliteLiveAircraft, SatelliteLiveAircraftBBoxResponse } from '../../model/satellite-intel-api.models';
import { MapEntityLoadingBridge, SatelliteTrackingViewport } from '../../../models/geo-fencing.models';
import { SatelliteAircraftTrackingService } from './aircraft-tracking.service';

export class SatelliteAircraftTrackingController {
  private trackSub?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly refreshIntervalMs = 8000;
  private service: SatelliteAircraftTrackingService;
  private loading: MapEntityLoadingBridge;

  enabled = false;
  data: SatelliteLiveAircraft[] = [];
  error: string | null = null;
  isLoading = false;

  constructor(service: SatelliteAircraftTrackingService, loading: MapEntityLoadingBridge) {
    this.service = service;
    this.loading = loading;
  }

  toggle(viewport: SatelliteTrackingViewport, scoped = false): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      if (scoped) {
        this.refresh(viewport, false, true);
      }
      else {
        this.refreshGlobal(false, true);
      }
      return;
    }
    this.stop();
    this.data = [];
    this.error = null;
  }

  refresh(viewport: SatelliteTrackingViewport, showLoading = false, scheduleNext = false): void {
    if (!this.enabled) {
      return;
    }
    this.refreshInBounds(viewport, showLoading, scheduleNext);
  }

  refreshGlobalTracking(scheduleNext = false): void {
    if (!this.enabled) {
      return;
    }
    this.refreshGlobal(false, scheduleNext);
  }

  destroy(): void {
    this.stop();
  }

  clear(): void {
    this.enabled = false;
    this.stop();
    this.data = [];
    this.error = null;
  }

  private stop(): void {
    this.trackSub?.unsubscribe();
    clearTimeout(this.timer);
    this.isLoading = false;
  }

  private refreshInBounds(viewport: SatelliteTrackingViewport, showLoading = false, scheduleNext = false): void {
    this.startTracking(this.service.pollInBounds(viewport.lat, viewport.lon, viewport.delta), {
      spinner: showLoading || this.data.length === 0,
      showLoading,
      scheduleNext,
      loadingMessage: 'Loading aircraft tracking data...',
      label: 'Aircraft tracking',
      reschedule: () => {
        this.refresh(viewport, false, true);
      },
    });
  }

  private refreshGlobal(showLoading = false, scheduleNext = false): void {
    this.startTracking(this.service.pollGlobal(), {
      spinner: true,
      showLoading,
      scheduleNext,
      loadingMessage: 'Loading global aircraft tracking data...',
      label: 'Global aircraft tracking',
      reschedule: () => {
        this.refreshGlobal(false, true);
      },
    });
  }

  private startTracking(request: Observable<SatelliteLiveAircraftBBoxResponse>, options: { spinner: boolean; showLoading: boolean; scheduleNext: boolean; loadingMessage: string; label: string; reschedule: () => void }): void {
    clearTimeout(this.timer);
    this.isLoading = options.spinner;
    const loadingId = options.showLoading ? this.loading.begin('Loading Satellite Intel', options.loadingMessage) : null;

    this.trackSub?.unsubscribe();
    clearTimeout(this.timer);
    this.trackSub = request.subscribe({
      next: (res) => {
        if (!this.enabled) {
          return;
        }
        const payload = (res?.result ?? res) as unknown;
        const aircraft = this.service.extractItems(payload);
        if (aircraft !== null) {
          this.applyResult(aircraft, payload, options.label);
        }
        const feedIssue = this.service.getFeedIssue(payload);
        if (aircraft === null && feedIssue) {
          this.error = `${options.label}: ${feedIssue}`;
        }
      },
      error: (err) => {
        this.error = err?.error?.detail ?? err?.message ?? `${options.label} failed`;
      },
    });
    this.trackSub.add(() => {
      this.isLoading = false;
      if (loadingId !== null) {
        this.loading.end(loadingId);
      }
      if (options.scheduleNext && this.enabled) {
        this.timer = setTimeout(options.reschedule, this.refreshIntervalMs);
      }
    });
  }

  private applyResult(aircraft: SatelliteLiveAircraft[], payload: unknown, label: string): void {
    this.data = aircraft;
    const feedIssue = this.service.getFeedIssue(payload);
    this.error = feedIssue ? `${label}: ${feedIssue}` : null;
  }
}
