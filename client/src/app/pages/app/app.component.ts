import { Component, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, RouteConfigLoadEnd, RouteConfigLoadStart, Router, RouterOutlet } from '@angular/router';
import { ErrorStoreService } from './services/error-store.service';
import { filter, map, Observable } from 'rxjs';

import { AppService } from '../../services/core/app/app.service';
import { MessageNotificationComponent } from '../../shared/partials/message-notification/message-notification.component';
import { LoaderComponent } from '../../shared/partials/loader/loader.component';
import { TrailNotificationComponent } from '../../shared/partials/trail-notification/trail-notification.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LoadingService } from '../../shared/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MessageNotificationComponent, LoaderComponent, TrailNotificationComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AppComponent {
  private activeRouteConfigLoads = 0;

  protected readonly JSON = JSON;

  currentRoute = signal('');
  error$: Observable<boolean>;
  isVisible = true;

  constructor(private router: Router, private errorStore: ErrorStoreService, protected appService: AppService, private loadingService: LoadingService) {
    window.postMessage({ source: 'orion-app', type: 'register' }, window.location.origin);
    effect(() => {
      const theme = this.appService.userSessionData()?.user?.theme ?? 'dark-theme';
      this.applyTheme(theme);
    });
    this.error$ = this.errorStore.error$;
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), map(() => {
      const path = this.router.parseUrl(this.router.url).root.children.primary?.segments.map(s => s.path).join('/') || '';
      return `/${path}`;
    })).subscribe((path) => {
      this.currentRoute.set(path);
    });
    this.router.events.subscribe((event) => {
      if (event instanceof RouteConfigLoadStart) {
        this.showRouteLoader();
      }
      if (event instanceof RouteConfigLoadEnd) {
        this.hideRouteLoader();
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.hideRouteLoader(true);
      }
    });
  }

  shouldAnimate(): boolean {
    const route = this.currentRoute();
    return ![
      '/login',
      '/signup',
      '/reset',
      '/welcome',
      '/notification',
      '/paymentGateway'
    ].some(path => route.startsWith(path));
  }

  private applyTheme(theme: 'light-theme' | 'dark-theme'): void {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(theme);
  }

  private showRouteLoader(): void {
    this.activeRouteConfigLoads++;
    this.loadingService.setRouteLoading(true);
  }

  private hideRouteLoader(force = false): void {
    if (this.activeRouteConfigLoads === 0) {
      return;
    }
    this.activeRouteConfigLoads = force ? 0 : Math.max(0, this.activeRouteConfigLoads - 1);
    if (this.activeRouteConfigLoads === 0) {
      this.loadingService.setRouteLoading(false);
    }
  }
}
