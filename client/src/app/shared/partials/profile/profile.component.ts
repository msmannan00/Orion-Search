import { Component, HostListener, AfterViewInit, OnDestroy, signal, effect, output, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage, NgClass } from "@angular/common";
import { AuthService } from '../../../services/authetication/auth.service';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { Router } from '@angular/router';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { AppService } from '../../../services/core/app/app.service';
import { ConfigSettings } from '../../model/app/config';
import { AlertNotificationComponent } from "../alert-notification/alert-notification.component";
import { LicenseService } from '../../../services/licenses/licenses.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LANGUAGE_OPTIONS } from '../../constants/shared-enums';
import { LanguageOption } from '../../constants/model/shared-enums.model';
import { ApiService } from '../../services/api.service';
import { TranslationService } from '../../services/translation.service';
import { ScanNotificationService } from '../../services/scan-notification.service';

type ThemeMode = 'dark-theme' | 'light-theme';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgOptimizedImage, TooltipDirective, NgClass, AlertNotificationComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements AfterViewInit, OnDestroy {
  private scrollContainer: HTMLElement | null = null;
  private scrollHandler = () => {
    this.dropdownOpen.set(false);
    this.languageDropdownOpen.set(false);
  };

  protected readonly Date = Date;

  username = signal<string>('');
  role = signal<string>('');
  isNotificationOpen = signal<boolean>(false);
  isScanNotificationOpen = signal<boolean>(false);
  profile_image = "";
  licences = '';
  dropdownOpen = signal(false);
  languageDropdownOpen = signal(false);
  selectedLanguage = signal('');
  selectedTheme = signal<ThemeMode>('dark-theme');
  languageOptions: LanguageOption[] = LANGUAGE_OPTIONS;
  readonly openPopup = output<undefined>();

  constructor(protected authService: AuthService, public router: Router, public dashboardService: DashboardService, public appService: AppService, protected licenseService: LicenseService, private apiService: ApiService, private translationService: TranslationService, public scanNotificationService: ScanNotificationService) {
    this.username.set(this.appService.userSessionData()?.user?.username);
    this.role.set(this.appService.userSessionData()?.user?.role);
    if(this.licenseService.canUseScanning()){
      this.scanNotificationService.startPendingScans();
    }
    effect(() => {
      if (this.dropdownOpen()) {
        this.onDropdownOpen();
      }
      const data = this.appService.userSessionData();
      this.username.set(data?.user?.username ?? '');
      this.role.set(data?.user?.role ?? '');
      const preferredLanguage = data?.user?.preferences?.language;
      const preferredTheme = data?.user?.theme ?? data?.user?.preferences?.theme;
      this.selectedLanguage.set(this.getCurrentLanguage(typeof preferredLanguage === 'string' ? preferredLanguage : ''));
      this.selectedTheme.set(this.getCurrentTheme(typeof preferredTheme === 'string' ? preferredTheme : undefined));
    });
  }

  ngAfterViewInit(): void {
    this.scrollContainer = document.getElementById('dashboard-container');
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
  }

  ngOnDestroy(): void {
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
    }
  }

  onDropdownOpen() {
    const rawLicenses = this.appService.userSessionData().user.license;
    this.licences = rawLicenses.map(l => this.licenseService.getLicenseLabel(l)).join(', ');
    this.profile_image = this.appService.userSessionData().user.image ?? "";
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

  canViewScanNotifications(): boolean {
    return this.licenseService.canUseScanning();
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.languageDropdownOpen.set(false);
    this.dropdownOpen.update(v => !v);
  }

  toggleLanguageDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen.set(true);
    this.languageDropdownOpen.update(v => !v);
  }

  selectLanguage(language: string, event: Event) {
    event.stopPropagation();
    const selectedLanguage = this.translationService.getSupportedLanguage(language);
    const currentSession = this.appService.userSessionData();
    const preferences = {
      ...(currentSession.user.preferences ?? {}),
      language: selectedLanguage
    };
    this.selectedLanguage.set(selectedLanguage);
    this.appService.userSessionData.update(state => {
      if (!state) {
        return state;
      }
      return {
        ...state,
        user: {
          ...state.user,
          preferences
        }
      };
    });
    this.apiService.post('update/current/user', {
      username: currentSession.user.username,
      preferences
    }).subscribe({
      next: () => void 0,
      error: () => void 0
    });
    this.languageDropdownOpen.set(false);
  }

  canChangeTheme(): boolean {
    return !!this.appService.userSessionData()?.user?.username;
  }

  toggleTheme(event: Event) {
    event.stopPropagation();
    const currentSession = this.appService.userSessionData();
    if (!currentSession?.user) {
      return;
    }
    const selectedTheme: ThemeMode = this.selectedTheme() === 'dark-theme' ? 'light-theme' : 'dark-theme';
    const preferences = {
      ...(currentSession.user.preferences ?? {}),
      theme: selectedTheme
    };
    this.selectedTheme.set(selectedTheme);
    this.appService.userSessionData.update(state => {
      if (!state) {
        return state;
      }
      return {
        ...state,
        user: {
          ...state.user,
          theme: selectedTheme,
          preferences
        }
      };
    });
    this.apiService.post('update/current/user', {
      username: currentSession.user.username,
      preferences
    }).subscribe({
      next: () => void 0,
      error: () => void 0
    });
  }

  auditlog() {
    this.router.navigate(['/dashboard/profile/monitoring'], { queryParams: { tab: 'auditlog' } }).then();
  }

  manageIocs() {
    this.router.navigate(['/dashboard/profile/ioc']).then();
  }

  openAccountSettings() {
    this.router.navigate(['/dashboard/profile/system-settings']).then();
  }

  openOrionMail(): void {
    const mailUrl = this.appService.getConfig().appSettings.orion_mail_url.trim();
    if (!mailUrl) {
      return;
    }
    window.open(mailUrl, '_blank', 'noopener,noreferrer');
    this.dropdownOpen.set(false);
    this.languageDropdownOpen.set(false);
  }

  logout() {
    this.scanNotificationService.stopAll();
    this.dashboardService.resetParams();
    this.dashboardService.clearCallback();
    this.appService.configData.set(new ConfigSettings({}, {}));
    this.authService.logout();
    this.dropdownOpen.set(false);
    this.languageDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  closeDropdown(event: Event) {
    const eventTargetElement = event.target;
    if (!(eventTargetElement instanceof Element) || !eventTargetElement.closest('.profile')) {
      this.dropdownOpen.set(false);
      this.languageDropdownOpen.set(false);
    }
  }

  openNotifications(): void {
    this.isScanNotificationOpen.set(false);
    this.dropdownOpen.set(false);
    this.languageDropdownOpen.set(false);
    this.isNotificationOpen.set(true);
  }

  closeNotifications(): void {
    this.isNotificationOpen.set(false);
  }

  openScanNotifications(): void {
    this.isNotificationOpen.set(false);
    this.dropdownOpen.set(false);
    this.languageDropdownOpen.set(false);
    this.isScanNotificationOpen.set(true);
  }

  closeScanNotifications(): void {
    this.isScanNotificationOpen.set(false);
  }

  getUnseenAlertCount(): number {
    const summary = this.appService.userSessionData().alert_summary;
    if (summary && typeof summary.unseen_total === 'number') {
      return summary.unseen_total;
    }
    const alerts = this.appService.userSessionData().alerts;
    return (Array.isArray(alerts) ? alerts : []).filter(alert => !alert.report_seen).length;
  }

  openSupportPopup() {

    this.openPopup.emit(undefined);
  }

  private getCurrentLanguage(userLanguage: string): string {
    return this.translationService.getSupportedLanguage(userLanguage, this.translationService.getSystemLanguage());
  }

  private getCurrentTheme(userTheme?: string): ThemeMode {
    return userTheme === 'light-theme' ? 'light-theme' : 'dark-theme';
  }
}
