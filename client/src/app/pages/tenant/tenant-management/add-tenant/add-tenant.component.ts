import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LicenseName } from '../../../../shared/model/licenses/license.rules';
import { AlertAllowedTenantOption, TenantTeamModel } from '../../../../shared/model/tenant/tenant.model';
import { ApiService } from '../../../../shared/services/api.service';
import { AppService } from '../../../../services/core/app/app.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { areAllPasswordRequirementsMet, buildUsernameSuggestions, buildUsernameSuggestionText, createEmptyPasswordChecks, evaluatePasswordInput, PasswordChecks, PasswordStrength } from '../../../../shared/utils/auth-form.util';
import { PasswordToggleDirective } from '../../../../shared/directive/password-toggle.directive';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import { UiDropdownComponent, UiDropdownOption } from '../../../../shared/partials/ui-dropdown/ui-dropdown.component';

@Component({
  selector: 'app-add-tenant',
  imports: [FormsModule, NgClass, PasswordToggleDirective, TranslatePipe, UiDropdownComponent],
  templateUrl: './add-tenant.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AddTenantComponent implements OnInit {
  private readonly allAlertsOption = 'all';
  private isClosing = false;

  licenseList = Object.values(LicenseName);
  licenses = ['free', 'osint_basic', 'osint_advanced', 'social_mapper', 'pentester', 'maintainer', 'enterprise'];
  alertTenantOptions: AlertAllowedTenantOption[] = [];
  isAdmin = false;
  model: TenantTeamModel = { username: '', email: '', password: '', role: 'analyst', status: 'active', subscription: false, licenses: [], permissions: [], alerts_allowed_all: false, alerts_allowed_tenant_ids: [] };
  errorText = "";
  usernamePattern = /^[A-Za-z][A-Za-z0-9_-]{7,19}$/;
  usernameSuggestion = "";
  showPasswordMeter = false;
  passwordStrength: PasswordStrength = null;
  passwordChecks: PasswordChecks = createEmptyPasswordChecks();
  currentUnmetCheck: string | null = null;
  confirmPassword = '';
  isOpen = false;
  readonly closs = output<undefined>();
  readonly accountAdded = output<undefined>();

  constructor(public apiService: ApiService, private appService: AppService, protected licenseService: LicenseService, private translationService: TranslationService, private cdr: ChangeDetectorRef) {
  }

  get permissionOptions(): UiDropdownOption[] {
    this.translationService.version();
    const options: UiDropdownOption[] = [
      { key: 'case_management', label: this.translationService.translate('Case Management') },
      { key: 'dismiss_result', label: this.translationService.translate('Dismiss Result') },
    ];
    if (this.isAdmin) {
      options.push({ key: 'monitoring', label: this.translationService.translate('Monitoring') });
    }
    return options;
  }

  get statusOptions(): UiDropdownOption[] {
    this.translationService.version();
    return [
      { key: 'active', label: this.translationService.translate('Active') },
      { key: 'disable', label: this.translationService.translate('Disable') }
    ];
  }

  ngOnInit(): void {
    this.isAdmin = this.appService.userSessionData().user.role === 'admin';
    this.model.role = this.isAdmin ? 'analyst' : 'member';
    if (this.isAdmin) {
      this.loadAlertTenantOptions();
    }
    setTimeout(() => {
      this.isOpen = true;
      this.cdr.detectChanges();
    }, 10);
  }

  onSubmit() {
    this.errorText = '';
    this.usernameSuggestion = '';
    if (!this.model.username) {
      this.errorText = this.translationService.translate('Username is required');
      return;
    }
    if (!this.validateUsername()) {
      return;
    }
    if (!this.model.email && this.model.role != "demo") {
      this.errorText = this.translationService.translate('Email is required');
      return;
    }
    if (!this.model.password || !this.allPasswordRequirementsMet) {
      this.errorText = this.translationService.translate('Password is required');
      return;
    }
    if (this.model.password !== this.confirmPassword) {
      this.errorText = this.translationService.translate('Password and confirm password do not match');
      return;
    }
    if (!this.model.licenses || this.model.licenses.length === 0) {
      this.model.licenses = [LicenseName.FREE];
    }
    this.applyAlertAccessPayload();
    const endpoint = this.isAdmin ? 'tenant/create/user' : 'tenant/create/user';
    this.apiService.post(endpoint, this.model).subscribe({
      next: () => {

        this.accountAdded.emit(undefined);
        this.onClose();
      },
      error: err => {
        this.errorText = err?.error?.detail ?? this.translationService.translate('Failed to create user');
      }
    });
  }

  validateUsername(): boolean {
    if (this.usernamePattern.test(this.model.username)) {
      return true;
    }
    const suggestions = buildUsernameSuggestions(this.model.username, this.usernamePattern);
    this.usernameSuggestion = buildUsernameSuggestionText(suggestions);
    this.errorText = this.translationService.translate('Invalid username');
    return false;
  }

  onClose() {
    if (this.isClosing) {
      return;
    }
    this.isClosing = true;
    this.isOpen = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.closs.emit(undefined);
    }, 300);
  }

  get hasFullLicenseAccess(): boolean {
    return this.appService.userSessionData()?.user?.role === 'admin';
  }

  get tenantLicenses(): string[] {
    return this.appService.userSessionData()?.tenant?.licenses ?? [];
  }

  get visibleTenantLicensesCount(): number {
    if (this.hasFullLicenseAccess) {
      return this.licenseList.filter(license => this.licenseService.getLicenseLabel(license) !== 'maintainer').length;
    }
    return this.licenseList.filter(license => this.tenantLicenses.includes(license) &&
          this.licenseService.getLicenseLabel(license) !== 'maintainer').length;
  }

  get roleOptions(): UiDropdownOption[] {
    this.translationService.version();
    return this.isAdmin
      ? [{ key: 'analyst', label: this.translationService.translate('Analyst') }, { key: 'demo', label: this.translationService.translate('Demo') }]
      : [{ key: 'analyst', label: this.translationService.translate('Analyst') }, { key: 'member', label: this.translationService.translate('Member') }];
  }

  get licenseDropdownOptions(): UiDropdownOption[] {
    return this.licenseList
      .filter(license => (this.hasFullLicenseAccess || this.tenantLicenses.includes(license)) && license !== LicenseName.MAINTAINER)
      .map(license => ({ key: license, label: this.licenseService.getLicenseLabel(license) }));
  }

  setRole(value: string | null): void {
    if (value === 'member' || value === 'analyst' || value === 'demo') {
      this.model.role = value;
    }
  }

  setStatus(value: string | null): void {
    if (value === 'active' || value === 'disable') {
      this.model.status = value;
    }
  }

  get showAlertsAllowed(): boolean {
    return this.isAdmin && (this.model.permissions ?? []).includes('case_management');
  }

  get alertAllowedOptions(): UiDropdownOption[] {
    this.translationService.version();
    return [
      { key: this.allAlertsOption, label: this.translationService.translate('All') },
      ...this.alertTenantOptions.map(tenant => ({
        key: tenant.id,
        label: tenant.name || tenant.email || tenant.id
      }))
    ];
  }

  get selectedAlertAllowedValues(): string[] {
    if (this.model.alerts_allowed_all) {
      return [this.allAlertsOption];
    }
    return this.model.alerts_allowed_tenant_ids ?? [];
  }

  onPermissionChange(permissions: string[]): void {
    this.model.permissions = permissions;
    if (!this.showAlertsAllowed) {
      this.clearAlertAccess();
    }
  }

  onAlertsAllowedChange(values: string[]): void {
    if (values.includes(this.allAlertsOption)) {
      this.model.alerts_allowed_all = true;
      this.model.alerts_allowed_tenant_ids = [];
      return;
    }
    const allowedTenantIds = new Set(this.alertTenantOptions.map(tenant => tenant.id));
    this.model.alerts_allowed_all = false;
    this.model.alerts_allowed_tenant_ids = values.filter(value => allowedTenantIds.has(value));
  }

  private loadAlertTenantOptions(): void {
    this.apiService.get<AlertAllowedTenantOption[]>('tenants/alerts/allowed-options').subscribe({
      next: (options) => {
        this.alertTenantOptions = options || [];
      },
      error: () => {
        this.alertTenantOptions = [];
      }
    });
  }

  private clearAlertAccess(): void {
    this.model.alerts_allowed_all = false;
    this.model.alerts_allowed_tenant_ids = [];
  }

  private applyAlertAccessPayload(): void {
    if (!this.showAlertsAllowed) {
      this.clearAlertAccess();
      return;
    }
    if (this.model.alerts_allowed_all) {
      this.model.alerts_allowed_tenant_ids = [];
      return;
    }
    const allowedTenantIds = new Set(this.alertTenantOptions.map(tenant => tenant.id));
    this.model.alerts_allowed_tenant_ids = (this.model.alerts_allowed_tenant_ids ?? []).filter(id => allowedTenantIds.has(id));
  }

  onLicenseDropdownChange(nextLicenses: string[]): void {
    const currentLicenses = this.model.licenses ?? [];
    const addedLicense = nextLicenses.find(license => !currentLicenses.includes(license));
    if (addedLicense) {
      this.toggleTenantLicense(this.model, addedLicense as LicenseName);
      return;
    }
    this.model.licenses = nextLicenses;
  }

  toggleTenantLicense(tenant: TenantTeamModel, license: LicenseName): void {
    tenant.licenses ??= [];
    const index = tenant.licenses.indexOf(license);
    if (index > -1) {
      tenant.licenses.splice(index, 1);
      return;
    }
    if (license === LicenseName.ENTERPRISE) {
      tenant.licenses = [LicenseName.ENTERPRISE];
      return;
    }
    tenant.licenses = tenant.licenses.filter((l) => l !== LicenseName.ENTERPRISE);
    if (license === LicenseName.FREE) {
      tenant.licenses = [LicenseName.FREE];
      return;
    }
    if (license === LicenseName.OSINT_BASIC) {
      tenant.licenses = tenant.licenses.filter((l) =>
        l !== LicenseName.OSINT_ADVANCED && l !== LicenseName.FREE);
    }
    if (license === LicenseName.OSINT_ADVANCED) {
      tenant.licenses = tenant.licenses.filter((l) =>
        l !== LicenseName.OSINT_BASIC && l !== LicenseName.FREE);
    }
    tenant.licenses = tenant.licenses.filter((l) => l !== LicenseName.FREE);

    tenant.licenses.push(license);
  }

  onPasswordInput(password: string) {
    const evaluation = evaluatePasswordInput(password);
    this.showPasswordMeter = evaluation.showPasswordMeter;
    this.passwordChecks = evaluation.passwordChecks;
    this.currentUnmetCheck = evaluation.currentUnmetCheck;
    this.passwordStrength = evaluation.passwordStrength;
  }

  get allPasswordRequirementsMet(): boolean {
    return areAllPasswordRequirementsMet(this.passwordChecks);
  }
}
