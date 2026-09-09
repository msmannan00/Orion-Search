import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subscription, catchError, switchMap, timer } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private destroyRef = inject(DestroyRef);
  private refreshTokenSubscription: Subscription | null = null;
  private readonly FIRST_REFRESH_DELAY = 120000;
  private readonly REFRESH_INTERVAL = 120000;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopTokenRefresh();
    });
  }

  startTokenRefresh(refreshAction: () => Observable<void>): void {
    if (!this.refreshTokenSubscription || this.refreshTokenSubscription.closed) {
      this.refreshTokenSubscription = timer(this.FIRST_REFRESH_DELAY, this.REFRESH_INTERVAL)
        .pipe(switchMap(() => refreshAction().pipe(catchError(() => EMPTY))),
          takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  stopTokenRefresh(): void {
    if (this.refreshTokenSubscription) {
      this.refreshTokenSubscription.unsubscribe();
      this.refreshTokenSubscription = null;
    }
  }
}
