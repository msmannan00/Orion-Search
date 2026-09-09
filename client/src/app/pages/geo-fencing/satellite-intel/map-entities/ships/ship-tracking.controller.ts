import { Subscription } from 'rxjs';
import { SatelliteLiveShip } from '../../model/satellite-intel-api.models';
import { MapEntityLoadingBridge, SatelliteTrackingViewport } from '../../../models/geo-fencing.models';
import { SatelliteShipTrackingService } from './ship-tracking.service';
import { isFiniteNumber } from '../../../../../shared/utils/type-guards.util';

export class SatelliteShipTrackingController {
  private trackSub?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  private viewportKey = '';
  private scoped = false;
  private readonly refreshIntervalMs = 8000;
  private service: SatelliteShipTrackingService;
  private loading: MapEntityLoadingBridge;

  enabled = false;
  data: SatelliteLiveShip[] = [];
  error: string | null = null;
  isLoading = false;

  constructor(service: SatelliteShipTrackingService, loading: MapEntityLoadingBridge) {
    this.service = service;
    this.loading = loading;
  }

  toggle(viewport: SatelliteTrackingViewport, scoped = false): void {
    this.enabled = !this.enabled;
    this.scoped = scoped;
    if (this.enabled) {
      this.refresh(viewport, false, true, scoped);
      return;
    }
    this.stop();
    this.data = [];
    this.error = null;
  }

  refresh(viewport: SatelliteTrackingViewport, showLoading = false, scheduleNext = false, scoped = this.scoped): void {
    if (!this.enabled) {
      return;
    }
    this.scoped = scoped;
    if (!this.scoped) {
      this.refreshGlobal(showLoading, scheduleNext);
      return;
    }
    this.refreshInBounds(viewport, showLoading, scheduleNext);
  }

  scheduleViewportRefresh(viewport: SatelliteTrackingViewport, delayMs = 500): void {
    if (!this.enabled || !this.scoped || this.getViewportKey(viewport) === this.viewportKey) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.refresh(viewport, false, true);
    }, delayMs);
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
    this.viewportKey = '';
    this.scoped = false;
    this.isLoading = false;
  }

  private refreshGlobal(showLoading = false, scheduleNext = false): void {
    clearTimeout(this.timer);
    const showSpinner = showLoading || this.data.length === 0;
    this.isLoading = showSpinner;
    const loadingId = showLoading ? this.loading.begin('Loading Satellite Intel', 'Loading global ship tracking data...') : null;

    this.trackSub?.unsubscribe();
    clearTimeout(this.timer);
    this.trackSub = this.service.pollGlobal().subscribe({
      next: (res) => {
        if (!this.enabled) {
          return;
        }
        const payload = (res?.result ?? res) as unknown;
        const ships = this.service.extractItems(payload);
        if (ships !== null) {
          this.applyResult(ships, payload, 'Global ship tracking');
        }
        const feedIssue = this.service.getFeedIssue(payload);
        if (ships === null && feedIssue) {
          this.error = `Global ship tracking: ${feedIssue}`;
        }
      },
      error: (err) => {
        this.error = err?.error?.detail ?? err?.message ?? 'Global ship tracking failed';
      },
    });
    this.trackSub.add(() => {
      this.isLoading = false;
      if (loadingId !== null) {
        this.loading.end(loadingId);
      }
      if (scheduleNext && this.enabled && !this.scoped) {
        this.timer = setTimeout(() => {
          this.refreshGlobal(false, true);
        }, this.refreshIntervalMs);
      }
    });
  }

  private refreshInBounds(viewport: SatelliteTrackingViewport, showLoading = false, scheduleNext = false): void {
    clearTimeout(this.timer);
    const nextViewportKey = this.getViewportKey(viewport);
    const isInitialLoad = !this.viewportKey;
    const viewportChanged = this.viewportKey !== nextViewportKey;
    this.viewportKey = nextViewportKey;
    if (viewportChanged && showLoading) {
      this.data = [];
    }
    const showSpinner = showLoading || (isInitialLoad && this.data.length === 0);
    this.isLoading = showSpinner;
    const loadingId = showLoading ? this.loading.begin('Loading Satellite Intel', 'Loading ship tracking data...') : null;

    this.trackSub?.unsubscribe();
    clearTimeout(this.timer);
    this.trackSub = this.service.pollInBounds(viewport.lat, viewport.lon, viewport.delta).subscribe({
      next: (res) => {
        if (!this.enabled) {
          return;
        }
        const payload = (res?.result ?? res) as unknown;
        const ships = this.service.extractItems(payload);
        if (ships !== null) {
          this.applyResult(this.filterShipsToViewport(ships, viewport), payload, 'Ship tracking', !viewportChanged);
        }
        const feedIssue = this.service.getFeedIssue(payload);
        if (ships === null && feedIssue) {
          this.error = `Ship tracking: ${feedIssue}`;
        }
      },
      error: (err) => {
        this.error = err?.error?.detail ?? err?.message ?? 'Ship tracking failed';
      },
    });
    this.trackSub.add(() => {
      this.isLoading = false;
      if (loadingId !== null) {
        this.loading.end(loadingId);
      }
      if (scheduleNext && this.enabled) {
        this.timer = setTimeout(() => {
          this.refresh(viewport, false, true);
        }, this.refreshIntervalMs);
      }
    });
  }

  private applyResult(ships: SatelliteLiveShip[], payload: unknown, label: string, keepLastAllowed = true): void {
    const feedIssue = this.service.getFeedIssue(payload);
    if (ships.length > 0) {
      if (feedIssue && keepLastAllowed && this.shouldKeepLastShips() && ships.length < this.data.length) {
        this.error = `${label}: ${feedIssue}; showing last known ${this.data.length} ships`;
        return;
      }
      this.data = ships;
      this.error = feedIssue ? `${label}: ${feedIssue}` : null;
      return;
    }

    if (feedIssue) {
      if (keepLastAllowed && this.shouldKeepLastShips()) {
        this.error = `${label}: ${feedIssue}; showing last known ${this.data.length} ships`;
        return;
      }
      this.error = `${label}: ${feedIssue}`;
      return;
    }

    if (keepLastAllowed && this.shouldKeepLastShips()) {
      this.error = `${label}: live feed returned 0 ships; showing last known ${this.data.length}`;
      return;
    }

    this.data = [];
    this.error = `${label}: no ships found in this map area`;
  }

  private shouldKeepLastShips(): boolean {
    return this.enabled && this.data.length > 0;
  }

  private filterShipsToViewport(ships: SatelliteLiveShip[], viewport: SatelliteTrackingViewport): SatelliteLiveShip[] {
    return ships.filter((ship) => {
      const latitude = ship.latitude;
      const longitude = ship.longitude;
      if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
        return false;
      }
      const lonDistance = Math.min(Math.abs(longitude - viewport.lon), 360 - Math.abs(longitude - viewport.lon));
      return Math.abs(latitude - viewport.lat) <= viewport.delta && lonDistance <= viewport.delta;
    });
  }

  private getViewportKey(viewport: SatelliteTrackingViewport): string {
    return this.service.getBoundsRequestKey(viewport.lat, viewport.lon, viewport.delta);
  }
}
