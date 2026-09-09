import { Subscription } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { SatelliteAnomalyResponse, SatelliteCompareResponse } from '../model/satellite-intel-api.models';
import { SatelliteIntelViewport } from '../../enums/geo-fencing.enums';
import { SatelliteIntelService } from '../satellite-intel-service';
import { MonthCompareService } from '../ui-overlays/month-compare-section/month-compare.service';

export class SatelliteScanState {
  private sub?: Subscription;
  private requestPending = false;

  hasSearched = false;
  anomalyResult: SatelliteAnomalyResponse['result'] | null = null;
  compareResult: SatelliteCompareResponse['result'] | null = null;

  constructor(private satelliteService: SatelliteIntelService, private monthCompareService: MonthCompareService) {}

  destroy(): void {
    this.sub?.unsubscribe();
  }

  markSearched(): void {
    this.hasSearched = true;
  }

  isScanning(errorMessage: string | null | undefined): boolean {
    return this.requestPending && !errorMessage;
  }

  resetRequestState(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.satelliteService.resetState();
    this.requestPending = false;
  }

  runCompare(viewport: SatelliteIntelViewport, imageType: string, month = ''): void {
    this.compareResult = null;
    this.anomalyResult = null;
    this.hasSearched = true;
    this.runCombinedCompareRequest(viewport, imageType, month);
  }

  private runCombinedCompareRequest(viewport: SatelliteIntelViewport, imageType: string, month: string): void {
    this.sub?.unsubscribe();
    this.satelliteService.resetState();
    this.requestPending = true;

    const request$ = this.monthCompareService.runCompare(viewport.lat, viewport.lon, viewport.delta, imageType, month)
      .pipe(filter((response) => !this.satelliteService.isPendingResponse(response)),
        take(1),
        map((response) => response.result ?? null),
        switchMap((compareResult) => this.monthCompareService.runAnomalyScan(viewport.lat, viewport.lon, viewport.delta)
          .pipe(filter((response) => !this.satelliteService.isPendingResponse(response)),
            take(1),
            map((response) => ({
              compareResult,
              anomalyResult: response.result ?? null,
            })),),),);

    this.sub = request$.subscribe({
      next: ({ compareResult, anomalyResult }) => {
        this.compareResult = compareResult;
        this.anomalyResult = anomalyResult;
        this.finishSatelliteRequest();
      },
      error: () => {
        this.finishSatelliteRequest();
      },
    });
  }

  private finishSatelliteRequest(): void {
    this.requestPending = false;
  }
}
