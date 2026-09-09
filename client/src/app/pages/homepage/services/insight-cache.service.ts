import { Injectable } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { retry, shareReplay } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { AppService } from '../../../services/core/app/app.service';

@Injectable({ providedIn: 'root' })
export class InsightCacheService {
  private insight$?: Observable<unknown>;
  private warmed = false;

  constructor(private apiService: ApiService, private appService: AppService) {}

  getInsight(): Observable<unknown> {
    this.insight$ ??= this.apiService.get<unknown>('insight').pipe(retry({ delay: (error) => this.appService.backendWarmingUp() ? timer(5000) : throwError(() => error) }), shareReplay(1));
    return this.insight$;
  }

  warmInsight(): void {
    if (this.warmed) {
      return;
    }
    this.warmed = true;
    this.getInsight().subscribe({
      error: () => {
        this.warmed = false;
      }
    });
  }
}
