import { Injectable } from '@angular/core';
import { LicenseName } from '../../shared/model/licenses/license.rules';
import { license_rules } from '../../shared/constants/shared-enums';
import { Observable, of } from 'rxjs';
import { SubscriptionService } from '../dashboard/subscription.service';
import { Router } from '@angular/router';
import { DashboardService } from '../dashboard/dashboard.service';
import { AppService } from '../core/app/app.service';
import { AuthService } from '../authetication/auth.service';
import type { CombinedRule } from './model/licenses.model';
export type { CombinedRule } from './model/licenses.model';



type AlertLicenseTarget = string | {
    licenses?: string[] | null;
    type?: string | null;
    categoryName?: string | null;
};

const SCANNING_ALERT_TYPES = new Set([
  'advanced scanning',
  'playstore-scanning',
  'social-scanner',
  'email-breach',
  'software-scanning',
  'vulnerability-scanning',
  'repo scanning',
  'seo scanning'
]);

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  constructor(protected dashboardService: DashboardService, private appService: AppService, private subscriptionService: SubscriptionService, private router: Router, private authService: AuthService) { }

  private getUserRole(): string {
    return this.appService.userSessionData().user.role;
  }

  getLicenses(): string[] {
    return this.appService.userSessionData().user.license ?? [];
  }

  private normalizeAlertType(type: string): string {
    const normalizedType = (type || '').trim().toLowerCase();
    if (normalizedType === 'stealerlogs') {
      return 'stealer_logs';
    }
    return normalizedType;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  isAnalyst(): boolean {
    return this.getUserRole() === 'analyst';
  }

  isDemo(): boolean {
    return this.getUserRole() === 'demo';
  }

  isMember(): boolean {
    return this.getUserRole() === 'member';
  }

  loadLicenses(): Observable<string[]> {
    return of(this.appService.userSessionData().user.license);
  }

  private getCombinedRule(licenses: string[] = this.getLicenses()): CombinedRule {
    const userLicenses = licenses;
    const combined: CombinedRule = {
      modules: new Set<string>(),
      cti_graph: false,
      mapping: false,
      scanning: false,
      maintainer: false
    };
    for (const lic of userLicenses) {
      const rule = license_rules[lic as LicenseName];
      if (!rule) {
        continue;
      }
      if (rule.modules === 'all') {
        combined.modules = 'all';
      }
      else if (combined.modules !== 'all') {
        for (const m of rule.modules) {
          combined.modules.add(m);
        }
      }
      combined.cti_graph ||= !!rule.cti_graph;
      combined.mapping ||= !!rule.mapping;
      combined.scanning ||= !!rule.scanning;
      combined.maintainer ||= !!rule.maintainer;
    }
    return combined;
  }

  private getAlertAccessLicenses(): string[] {
    return Array.from(new Set([
      ...this.getLicenses(),
      ...(this.appService.userSessionData().tenant.licenses || [])
    ]));
  }

  demoSubscription(moduleName: string) {
    if (!this.canAccess(moduleName)) {
      this.dashboardService.showSubscription.set(true);
      if (this.authService.getIsMobileDemo()) {
        this.router.navigate(['/dashboard/strategic/all'], { queryParams: { page: 1 } }).then();
        return;
      }
      this.router.navigate(['/']).then();
    }
  }

  canAccess(moduleName: string): boolean {
    if (moduleName === 'Stealerlogs') {
      moduleName = 'stealer_logs';
    }
    if (moduleName === 'Strategic') {
      moduleName = 'general';
    }
    if (moduleName === 'APT Intel') {
      moduleName = 'general';
    }
    const key = moduleName.toLowerCase();
    if (this.subscriptionService.isDemo() && [
      'profile',
      'homepage',
      'account',
      'users',
      'auditlog',
      'tenant',
      'system-settings'
    ].includes(key)) {
      return true;
    }
    const rule = this.getCombinedRule();
    const access = rule.modules === 'all' || rule.modules.has(key);
    return !(this.subscriptionService.isDemo() && !access);
  }

  canUseModule(moduleName: string): boolean {
    const rule = this.getCombinedRule();
    if (this.getLicenses().includes(moduleName)) {
      return true;
    }
    if (this.subscriptionService.isDemo() || this.appService.userSessionData().user.role == "admin") {
      return true;
    }
    else {
      return (rule.modules === 'all' || rule.modules.has(moduleName));
    }
  }

  canUseAlertType(type?: string | null): boolean {
    const rawType = (type ?? '').trim().toLowerCase();
    if (!rawType) {
      return false;
    }
    if (this.isAdmin() || this.isDemo()) {
      return true;
    }
    const rule = this.getCombinedRule(this.getAlertAccessLicenses());
    if (SCANNING_ALERT_TYPES.has(rawType)) {
      return rule.scanning;
    }
    const alertType = this.normalizeAlertType(rawType);
    return rule.modules === 'all' || rule.modules.has(alertType);
  }

  getAlertLicenses(type?: string | null): string[] {
    const rawType = (type ?? '').trim().toLowerCase();
    const alertType = this.normalizeAlertType(rawType);
    const isScanningAlert = SCANNING_ALERT_TYPES.has(rawType);
    return Object.entries(license_rules)
      .filter(([, rule]) => {
        if (rule?.modules === 'all') {
          return true;
        }
        if (Array.isArray(rule?.modules) && rule.modules.includes(alertType)) {
          return true;
        }
        return isScanningAlert && !!rule?.scanning;
      })
      .map(([license]) => license);
  }

  canViewAlert(target: AlertLicenseTarget | null | undefined): boolean {
    if (this.isAdmin() || this.isDemo()) {
      return true;
    }
    const type = typeof target === 'string'
      ? target
      : (target?.type ?? target?.categoryName ?? '');
    const alertLicenses = typeof target === 'string'
      ? []
      : (target?.licenses ?? []);
    if (alertLicenses.length > 0 && this.getAlertAccessLicenses().some(license => alertLicenses.includes(license))) {
      return true;
    }
    return this.canUseAlertType(type);
  }

  canUseActorsAndMalware(): boolean {
    const licenses = this.getLicenses();
    return licenses.includes(LicenseName.OSINT_BASIC)
      || licenses.includes(LicenseName.OSINT_ADVANCED)
      || licenses.includes(LicenseName.ENTERPRISE);
  }

  canUseCtiGraph(): boolean {
    return this.getCombinedRule().cti_graph;
  }

  canUseMapping(): boolean {
    return this.getCombinedRule().mapping;
  }

  canUseScanning(): boolean {
    if (this.subscriptionService.isDemo()) {
      return true;
    }
    else {
      return this.getCombinedRule().scanning;
    }
  }

  isMaintainer(): boolean {
    return this.getCombinedRule().maintainer;
  }

  canViewTenantAlerts(): boolean {
    const permissions = this.appService.userSessionData().user.permissions ?? [];
    return this.isAdmin() || (this.isAnalyst() && permissions.includes('case_management') && this.appService.userSessionData().tenant.isDefault);
  }

  canUseOrionMail(): boolean {
    const session = this.appService.userSessionData();
    return session.tenant.isDefault && (this.isAdmin() || (session.user.permissions ?? []).includes('orion_mail'));
  }

  canDismissResults(): boolean {
    const permissions = this.appService.userSessionData().user.permissions ?? [];
    return this.isAdmin() || this.isMaintainer() || permissions.includes('dismiss_result');
  }

  canReviewTakedowns(): boolean {
    const tenant = this.appService.userSessionData().tenant;
    const isRootTenant = tenant.isDefault;
    return this.isAdmin() && isRootTenant;
  }

  getLicenseLabel(license: LicenseName | string): string {
    switch (license) {
      case LicenseName.MAINTAINER:
        return 'Maintainer';
      case LicenseName.FREE:
        return 'Free';
      case LicenseName.FEEDER:
        return 'Feeder';
      case LicenseName.OSINT_BASIC:
        return 'OSINT Basic';
      case LicenseName.OSINT_ADVANCED:
        return 'OSINT Advanced';
      case LicenseName.SOCIAL_MAPPER:
        return 'Social Mapper';
      case LicenseName.PENTESTER:
        return 'Pentester';
      case LicenseName.ENTERPRISE:
        return 'Enterprise';
      default:
        return license;
    }
  }
}
