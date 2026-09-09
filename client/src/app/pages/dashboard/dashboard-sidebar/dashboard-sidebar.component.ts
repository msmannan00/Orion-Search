import { Component, OnDestroy, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, NgClass, NgOptimizedImage } from '@angular/common';
import { ApiSubCategory, BreachSubCategory, Category, DefacementSubCategory, ExploitSubCategory, FeedSubCategory, SocialSubCategory, TenantSubCategory, ProfileSubCategory } from '../../../shared/constants/pages';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { DashboardSidebarItemsComponent } from './dashboard-sidebar-items/dashboard-sidebar-items.component';
import { SidebarSectionComponent } from './dashboard-collapsed-sidebar/dashboard-sidebar-collapsed.component';
import { GeneralCallbackModel } from '../../../shared/model/results/general/general.callback.model';
import { LeakCallbackModel } from '../../../shared/model/results/leak/leak.callback.model';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { SelectionStoreService } from '../../../services/dashboard/selection.service';
import { AppService } from '../../../services/core/app/app.service';
import { ScrollService } from '../../../shared/services/scroll.service';
import { AuthService } from '../../../services/authetication/auth.service';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { TooltipDirective } from '../../../shared/directive/tooltip-directive.directive';
import { ChatWidgetComponent } from '../../root-searches/ai-workspace/chat-widget/chat-widget.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SidebarShellComponent } from '../../../shared/partials/sidebar-shell/sidebar-shell.component';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [NgOptimizedImage, NgClass, RouterLink, AsyncPipe, DashboardSidebarItemsComponent, SidebarSectionComponent, TooltipDirective, ChatWidgetComponent, TranslatePipe, SidebarShellComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard-sidebar.component.html',
})
export class DashboardSidebarComponent implements OnInit, OnDestroy {
  private readonly resizeHandler = () => {
    this.checkScreenWidth();
  };
  private readonly closeForSubscriptionHandler = () => {
    if (this.sidebar_default) {
      this.onToggleSidebar(this.mobile_menu_status);
    }
  };

  sidebar_default = true;
  min_detected = false;
  mobile_menu_status = false;
  apiCategories = Object.values(ApiSubCategory).filter(category => category !== ApiSubCategory.EMAIL && category !== ApiSubCategory.NATIONAL_IDENTITY);
  exploitCategories = Object.values(ExploitSubCategory);
  aptIntelCategories: string[] = [];
  newsCategories = Object.values(FeedSubCategory);
  leakCategories = Object.values(BreachSubCategory);
  defacementCategories = Object.values(DefacementSubCategory);
  socialCategories = Object.values(SocialSubCategory);
  tenantCategories = Object.values(TenantSubCategory);
  category = Category;
  readonly menuToggle = output<undefined>();

  constructor(protected scrollService: ScrollService, protected dashboardService: DashboardService, protected selectionStore: SelectionStoreService, protected appService: AppService, private router: Router, protected authService: AuthService, protected licenseService: LicenseService) {
  }

  ngOnInit() {
    const hasSavedSidebarPreference = typeof window !== 'undefined' && localStorage.getItem('isSidebarOpen') !== null;
    this.sidebar_default = hasSavedSidebarPreference
      ? this.appService.getConfig().localSettings.isSidebarOpen
      : !(typeof window !== 'undefined' && window.innerWidth <= 900);
    if (typeof window !== 'undefined' && window.innerWidth < 800) {
      this.min_detected = hasSavedSidebarPreference;
    }
    this.handleProfileRoute(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.handleProfileRoute(e.urlAfterRedirects);
      });
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('close-dashboard-sidebar', this.closeForSubscriptionHandler);
    this.checkScreenWidth();
  }

  private handleProfileRoute(url: string) {
    if (url.startsWith('/dashboard/profile/consolidated/') ||
      url.startsWith('/dashboard/profile/homepage') ||
      url.startsWith('/dashboard/profile/take-down') ||
      url.startsWith('/dashboard/profile/alerts/general') ||
      url.startsWith('/dashboard/profile/alerts')) {
      this.selectionStore.setSelectedSection('Profile');
      const selectedOption = url.startsWith('/dashboard/profile/take-down') ? ProfileSubCategory.TAKEDOWN : 'Homepage';
      this.selectionStore.setSelectedOption(selectedOption);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('close-dashboard-sidebar', this.closeForSubscriptionHandler);
  }

  checkScreenWidth() {
    const shouldStartCollapsed = window.innerWidth < 800;
    if (shouldStartCollapsed && !this.min_detected && this.sidebar_default) {
      this.min_detected = true;
      this.onToggleSidebar();
    }
    else if (!shouldStartCollapsed) {
      this.min_detected = false;
    }
  }

  onSectionSelected(section: Category) {
    if (this.selectionStore.getSelectedSection() === section) {
      this.selectionStore.setSelectedSection('Profile');
      this.selectionStore.setSelectedOption('Dashboard');
      this.router.navigateByUrl('/').then();
    }
    else {
      if (section !== Category.PROFILE) {
        this.dashboardService.clearResultCaches();
      }
      this.dashboardService.resetParams();
      this.selectionStore.setSelectedSection(section);
      let firstSubcategory: string | undefined;
      switch (section) {
        case Category.STRATEGIC:
          firstSubcategory = 'All';
          break;
        case Category.BREACH:
          firstSubcategory = this.leakCategories[0];
          break;
        case Category.API:
          firstSubcategory = this.apiCategories[0];
          break;
        case Category.DEFACEMENT:
          firstSubcategory = this.defacementCategories[0];
          break;
        case Category.SOCIAL:
          firstSubcategory = this.socialCategories[0];
          break;
        case Category.APT_INTEL:
          firstSubcategory = this.aptIntelCategories[0];
          break;
        case Category.FEED:
          firstSubcategory = this.newsCategories[0];
          break;
        case Category.TENANT:
          firstSubcategory = this.tenantCategories[0];
          break;
        case Category.PROFILE:
          firstSubcategory = this.getProfileCategories()[0];
          break;
      }
      if (firstSubcategory) {
        this.selectionStore.setSelectedOption(firstSubcategory);
      }
      if (!firstSubcategory && window.innerWidth <= 900 && this.sidebar_default) {
        this.onToggleSidebar();
      }
    }
    this.scrollService.clearSavedPosition();
    this.scrollService.scrollReportToTop();
  }

  onResetCallback() {
    this.dashboardService.generalCallbackModel = new GeneralCallbackModel();
    this.dashboardService.leakCallbackModel = new LeakCallbackModel();
  }

  onOptionSelected(option: string) {
    if (this.selectionStore.getSelectedSection() !== Category.PROFILE) {
      this.dashboardService.clearResultCaches();
    }
    this.dashboardService.resetParams();
    this.onResetCallback();
    this.selectionStore.setSelectedOption(option);
    if (window.innerWidth <= 900 && this.sidebar_default) {
      this.onToggleSidebar();
    }
    this.scrollService.clearSavedPosition();
    this.scrollService.scrollReportToTop();
  }

  onToggleSidebar(mobile_menu_status = false) {
    this.menuToggle.emit(undefined);
    this.sidebar_default = !this.sidebar_default;
    this.mobile_menu_status = mobile_menu_status;
  }

  requestStandaloneSubscription(event: Event, accessAllowed: boolean) {
    if (!accessAllowed) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (accessAllowed) {
      return;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 900) {
      window.dispatchEvent(new CustomEvent('close-dashboard-sidebar'));
    }
    this.dashboardService.showSubscription.set(true);
    if (this.authService.getIsMobileDemo()) {
      this.router.navigate(['/dashboard/strategic/all'], { queryParams: { page: 1 } }).then();
      return;
    }
    this.router.navigate(['/']).then();
  }

  getProfileCategories(): string[] {
    const categories = Object.values(ProfileSubCategory);
    const canAccessFeeder = this.appService.userSessionData().tenant.isDefault && this.licenseService.getLicenses().some(license => ['feeder', 'enterprise'].includes(license));
    const canAccessCaseManagement = this.isAdmin() || this.licenseService.isMaintainer() || ((this.isAnalyst() || this.isMember()) && (this.appService.userSessionData().user.permissions ?? []).includes('case_management'));
    const isMobileDemo = this.appService.isMobileMode();

    if (this.isAdmin()) {
      return categories.filter(c => c !== ProfileSubCategory.IOC &&
        c !== ProfileSubCategory.EVENT_MANAGEMENT &&
        c !== ProfileSubCategory.LOG_MANAGER &&
        c !== ProfileSubCategory.AUDITLOG &&
        c !== ProfileSubCategory.STATISTICS &&
        c !== ProfileSubCategory.TENANT_SETTINGS &&
        (!isMobileDemo || c !== ProfileSubCategory.FEEDER) &&
        (!isMobileDemo || c !== ProfileSubCategory.ACCOUNT) &&
        (canAccessFeeder || c !== ProfileSubCategory.FEEDER) &&
        (this.licenseService.canReviewTakedowns() || c !== ProfileSubCategory.TAKEDOWN) &&
        (canAccessCaseManagement || c !== ProfileSubCategory.CASE_MANAGEMENT));
    }
    if (this.isMember() && this.licenseService.getLicenses().includes('maintainer')) {
      return categories.filter(c => c !== ProfileSubCategory.TENANT &&
        c !== ProfileSubCategory.BACKUP_RESTORE &&
        c !== ProfileSubCategory.TAKEDOWN &&
        c !== ProfileSubCategory.EVENT_MANAGEMENT &&
        c !== ProfileSubCategory.LOG_MANAGER &&
        c !== ProfileSubCategory.AUDITLOG &&
        (!isMobileDemo || c !== ProfileSubCategory.FEEDER) &&
        (!isMobileDemo || c !== ProfileSubCategory.ACCOUNT) &&
        (canAccessFeeder || c !== ProfileSubCategory.FEEDER) &&
        (canAccessCaseManagement || c !== ProfileSubCategory.CASE_MANAGEMENT));
    }
    if (this.isAnalyst()) {
      return categories.filter(c => c !== ProfileSubCategory.TENANT &&
        c !== ProfileSubCategory.SYSTEM_SETTINGS &&
        c !== ProfileSubCategory.BACKUP_RESTORE &&
        c !== ProfileSubCategory.TAKEDOWN &&
        c !== ProfileSubCategory.MONITORING &&
        c !== ProfileSubCategory.EVENT_MANAGEMENT &&
        c !== ProfileSubCategory.LOG_MANAGER &&
        c !== ProfileSubCategory.USERS &&
        c !== ProfileSubCategory.AUDITLOG &&
        c !== ProfileSubCategory.IOC &&
        (canAccessFeeder || c !== ProfileSubCategory.FEEDER) &&
        (canAccessCaseManagement || c !== ProfileSubCategory.CASE_MANAGEMENT) &&
        c !== ProfileSubCategory.STATISTICS &&
        c !== ProfileSubCategory.TENANT_SETTINGS);
    }
    return categories.filter(c => c !== ProfileSubCategory.TENANT &&
      c !== ProfileSubCategory.SYSTEM_SETTINGS &&
      c !== ProfileSubCategory.BACKUP_RESTORE &&
      c !== ProfileSubCategory.TAKEDOWN &&
      c !== ProfileSubCategory.MONITORING &&
      c !== ProfileSubCategory.EVENT_MANAGEMENT &&
      c !== ProfileSubCategory.LOG_MANAGER &&
      (!isMobileDemo || c !== ProfileSubCategory.FEEDER) &&
      (!isMobileDemo || c !== ProfileSubCategory.ACCOUNT) &&
      (canAccessFeeder || c !== ProfileSubCategory.FEEDER) &&
      c !== ProfileSubCategory.USERS &&
      c !== ProfileSubCategory.AUDITLOG &&
      c !== ProfileSubCategory.IOC &&
      (canAccessCaseManagement || c !== ProfileSubCategory.CASE_MANAGEMENT) &&
      c !== ProfileSubCategory.STATISTICS &&
      c !== ProfileSubCategory.TENANT_SETTINGS);
  }

  isAdmin(): boolean {
    return this.licenseService.isAdmin();
  }

  isDemo(): boolean {
    return this.licenseService.isDemo();
  }

  isMember(): boolean {
    return this.licenseService.isMember();
  }

  isAnalyst(): boolean {
    return this.licenseService.isAnalyst();
  }
}
