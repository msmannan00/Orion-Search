import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { DashboardSidebarComponent } from './dashboard-sidebar/dashboard-sidebar.component';
import { DashboardHeaderComponent } from '../../shared/partials/header/dashboard-header/dashboard-header.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ProSubscriptionComponent } from '../../shared/partials/pro-subscription/pro-subscription.component';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { AppService } from '../../services/core/app/app.service';
import { AuthService } from '../../services/authetication/auth.service';
import { filter, Observable } from 'rxjs';
import { DemoTourComponent } from "../demo-tour/demo-tour/demo-tour.component";
import { SidebarService } from '../../shared/services/sidebar.service';
import { ScanNotificationService } from '../../shared/services/scan-notification.service';
import { ConfirmationPopupComponent } from '../../shared/partials/confirmation-popup/confirmation-popup.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardSidebarComponent,
    DashboardHeaderComponent,
    AsyncPipe,
    NgClass,
    RouterOutlet,
    ScrollingModule,
    ProSubscriptionComponent,
    DemoTourComponent,
    ConfirmationPopupComponent
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements AfterViewInit, OnInit {
  private routeAnimationKey: string | null = null;
  @ViewChild('routerOutlet') private routerOutlet?: RouterOutlet;

  isMenuOpen = true;
  demoTourMounted = false;
  dashboardAnimationsReady = false;
  routeFadePhase: 'a' | 'b' | null = null;
  isFilterOpen$: Observable<boolean>;

  constructor(protected dashboardService: DashboardService, private cdr: ChangeDetectorRef, public router: Router, public authService: AuthService, protected appService: AppService, sidebarService: SidebarService, public scanNotificationService: ScanNotificationService) {
    this.isFilterOpen$ = sidebarService.sidebarState$;
  }

  ngOnInit(): void {
    const hasSavedSidebarPreference = typeof window !== 'undefined' && localStorage.getItem('isSidebarOpen') !== null;
    this.isMenuOpen = hasSavedSidebarPreference
      ? this.appService.getConfig().localSettings.isSidebarOpen
      : !this.isCompactViewport();
    this.appService.set('isSidebarOpen', this.isMenuOpen);
    this.redirectMobileDemoDashboardEntry(this.router.url);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.redirectMobileDemoDashboardEntry(event.urlAfterRedirects);
        this.updateRouteFadePhase();
      });
  }

  private updateRouteFadePhase(): void {
    const animationKey = this.routerOutlet ? this.prepareRoute(this.routerOutlet) : null;
    if (animationKey === this.routeAnimationKey) {
      return;
    }
    this.routeAnimationKey = animationKey;
    this.routeFadePhase = this.routeFadePhase === 'a' ? 'b' : 'a';
  }

  private redirectMobileDemoDashboardEntry(url: string): void {
    if (!this.authService.getIsMobileDemo() || url.startsWith('/dashboard/strategic/all')) {
      return;
    }
    if (url === '/dashboard' || url === '/dashboard/home' || url.startsWith('/dashboard/profile')) {
      const queryParams = this.router.parseUrl(url).queryParams;
      this.router.navigate(['/dashboard/strategic/all'], { queryParams: { ...queryParams, page: 1 }, replaceUrl: true }).then();
    }
  }

  toggleNavigation() {
    this.isMenuOpen = !this.isMenuOpen;
    this.appService.set('isSidebarOpen', this.isMenuOpen);
  }

  isCompactViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 900;
  }

  prepareRoute(outlet: RouterOutlet) {
    if (!this.dashboardAnimationsReady) {
      return null;
    }

    return outlet?.activatedRouteData?.animation ?? null;
  }

  isCtiGraph(): boolean {
    return this.router.url.includes('/dashboard/ctigraph') || this.router.url.includes('/dashboard/social-graph') || this.router.url.includes('/dashboard/social-intel') || this.router.url.includes('/dashboard/social-mapper') || this.router.url.includes('/dashboard/ai');
  }

  ngAfterViewInit() {
    this.dashboardAnimationsReady = true;
    this.demoTourMounted = true;
    this.cdr.detectChanges();
  }

  hideSubscription() {
    this.dashboardService.showSubscription.set(false);
  }

  shouldShowDemoTour(): boolean {
    const { user } = this.appService.userSessionData();
    if (this.appService.isMobileMode()) {
      return false;
    }
    return this.authService.isAuthenticated() &&
      !!user.username &&
      !user.demo_tour &&
      !(user.role == 'admin');
  }

  handleDuplicateScanChoice(runNewScan: boolean): void {
    if (runNewScan) {
      this.scanNotificationService.resolveDuplicateScanChoice('new');
      return;
    }
    this.scanNotificationService.resolveDuplicateScanChoice('previous');
  }
}
