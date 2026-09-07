import { Component, HostListener, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../shared/services/api.service';
import { HttpHeaders } from '@angular/common/http';

import { FormsModule } from '@angular/forms';
import { AlertAllowedTenantOption, User } from '../../../../shared/model/tenant/tenant.model';
import { LicenseName } from '../../../../shared/model/licenses/license.rules';
import { AddTenantComponent } from "../add-tenant/add-tenant.component";
import { ConfirmationPopupComponent } from '../../../../shared/partials/confirmation-popup/confirmation-popup.component';
import { AppService } from '../../../../services/core/app/app.service';
import { TooltipDirective } from '../../../../shared/directive/tooltip-directive.directive';
import { finalize, switchMap, tap } from 'rxjs';
import { NodeResolver } from '../../../../shared/resolvers/session-data-resolver.service';
import { LicenseService } from '../../../../services/licenses/licenses.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../shared/services/translation.service';
import { UiDropdownComponent, UiDropdownOption } from '../../../../shared/partials/ui-dropdown/ui-dropdown.component';

@Component({
  selector: 'app-view-profile',
  imports: [FormsModule, CommonModule, AddTenantComponent, ConfirmationPopupComponent, TooltipDirective, TranslatePipe, UiDropdownComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './manage-profile.component.html',
  styleUrls: ['./manage-profile.component.css'],
})
export class ManageProfileComponent implements OnInit {
  private readonly allAlertsOption = 'all';

  protected readonly JSON = JSON;

  users: User[] = [];
  userSearch = '';
  licenseList = Object.values(LicenseName);
  alertTenantOptions: AlertAllowedTenantOption[] = [];
  isLoading = true;
  selectedUserId: string | null = null;
  expandedUserIndex: number | null = null;
  showAddTenantPopup = false;
  userToDelete: User | null = null;
  isDeleteConfirmationOpen = signal<boolean>(false);

  constructor(public apiService: ApiService, protected appService: AppService, private nodeResolver: NodeResolver, protected licenseService: LicenseService, private translationService: TranslationService) {
  }

  get permissionOptions(): UiDropdownOption[] {
    this.translationService.version();
    const session = this.appService.userSessionData();
    const options: UiDropdownOption[] = [
      { key: 'case_management', label: this.translationService.translate('Case Management') },
      { key: 'dismiss_result', label: this.translationService.translate('Dismiss Result') },
    ];
    if (session.user.role === 'admin' && session.tenant.isDefault) {
      options.push({ key: 'orion_mail', label: this.translationService.translate('Orion Mail') });
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

  get passwordResetOptions(): UiDropdownOption[] {
    this.translationService.version();
    return [
      { key: 'false', label: this.translationService.translate('No password reset') },
      { key: 'true', label: this.translationService.translate('Require password reset') }
    ];
  }

  ngOnInit(): void {
    const headers = new HttpHeaders({});
    if (this.appService.userSessionData().user.role === 'admin') {
      this.loadAlertTenantOptions();
    }
    this.apiService.post<User[]>('users', headers).subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  toggleExpandedUser(index: number): void {
    this.expandedUserIndex = this.expandedUserIndex === index ? null : index;
  }

  updateUser(user: User) {
    if (!user.licenses || user.licenses.length === 0) {
      user.licenses = [LicenseName.FREE];
    }
    const payload = this.buildUserUpdatePayload(user);
    this.isLoading = true;
    this.apiService.post('update/user', payload).pipe(switchMap(() => this.nodeResolver.resolve()), finalize(() => (this.isLoading = false))).subscribe({
      next: () => void 0,
      error: () => void 0
    });
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const eventTargetElement = event.target;
    if (!(eventTargetElement instanceof Element) || !eventTargetElement.closest('.action-menu')) {
      this.selectedUserId = null;
    }
  }

  isLicenseDisabled(): boolean {
    return false;
  }

  canAssignLicense(license: LicenseName): boolean {
    if (license === LicenseName.MAINTAINER) {
      return false;
    }
    if (this.appService.userSessionData().user.role === 'admin') {
      return true;
    }
    return (this.appService.userSessionData().tenant.licenses || []).includes(license);
  }

  get licenseDropdownOptions(): UiDropdownOption[] {
    return this.licenseList
      .filter(license => this.canAssignLicense(license))
      .map(license => ({ key: license, label: this.licenseService.getLicenseLabel(license) }));
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

  get filteredUsers(): User[] {
    const search = this.userSearch.trim().toLowerCase();
    if (!search) {
      return this.users;
    }
    return this.users.filter((user) => [
      user.username,
      user.email,
      user.role,
      user.status,
      user.subscription ? 'paid' : 'free',
      this.getUserLicensesLabel(user),
      this.getUserPermissionsLabel(user)
    ].some(value => String(value || '').toLowerCase().includes(search)));
  }

  setUserStatus(user: User, value: string | null): void {
    if (value === 'active' || value === 'disable') {
      user.status = value;
    }
  }

  getPasswordResetValue(user: User): string {
    return user.password_reset_required ? 'true' : 'false';
  }

  setPasswordResetRequired(user: User, value: string | null): void {
    user.password_reset_required = value === 'true';
  }

  onUserLicenseDropdownChange(user: User, nextLicenses: string[]): void {
    const currentLicenses = user.licenses ?? [];
    const addedLicense = nextLicenses.find(license => !currentLicenses.includes(license));
    if (addedLicense) {
      this.toggleUserLicense(user, addedLicense as LicenseName);
      return;
    }
    user.licenses = nextLicenses;
  }

  showAlertsAllowed(user: User): boolean {
    return this.appService.userSessionData().user.role === 'admin' && (user.permissions ?? []).includes('case_management');
  }

  selectedAlertAllowedValues(user: User): string[] {
    if (user.alerts_allowed_all) {
      return [this.allAlertsOption];
    }
    return user.alerts_allowed_tenant_ids ?? [];
  }

  onUserPermissionChange(user: User, permissions: string[]): void {
    user.permissions = permissions;
    if (!this.showAlertsAllowed(user)) {
      this.clearAlertAccess(user);
    }
  }

  onUserAlertsAllowedChange(user: User, values: string[]): void {
    if (values.includes(this.allAlertsOption)) {
      user.alerts_allowed_all = true;
      user.alerts_allowed_tenant_ids = [];
      return;
    }
    const allowedTenantIds = new Set(this.alertTenantOptions.map(tenant => tenant.id));
    user.alerts_allowed_all = false;
    user.alerts_allowed_tenant_ids = values.filter(value => allowedTenantIds.has(value));
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

  private clearAlertAccess(user: User): void {
    user.alerts_allowed_all = false;
    user.alerts_allowed_tenant_ids = [];
  }

  private applyAlertAccessPayload(user: User): void {
    if (!this.showAlertsAllowed(user)) {
      this.clearAlertAccess(user);
      return;
    }
    if (user.alerts_allowed_all) {
      user.alerts_allowed_tenant_ids = [];
      return;
    }
    const allowedTenantIds = new Set(this.alertTenantOptions.map(tenant => tenant.id));
    user.alerts_allowed_tenant_ids = (user.alerts_allowed_tenant_ids ?? []).filter(id => allowedTenantIds.has(id));
  }

  private buildUserUpdatePayload(user: User): User {
    if (this.appService.userSessionData().user.role !== 'admin') {
      const payload = { ...user };
      delete payload.alerts_allowed_all;
      delete payload.alerts_allowed_tenant_ids;
      return payload;
    }
    this.applyAlertAccessPayload(user);
    return user;
  }

  toggleUserLicense(user: User, license: LicenseName) {
    user.licenses ??= [];
    if (user.licenses.includes(license)) {
      user.licenses = user.licenses.filter((l) => l !== license);
      return;
    }
    if (license === LicenseName.FREE || license === LicenseName.ENTERPRISE) {
      user.licenses = [license];
      return;
    }
    user.licenses = user.licenses.filter((l) => l !== LicenseName.FREE && l !== LicenseName.ENTERPRISE);
    if (license === LicenseName.OSINT_BASIC) {
      user.licenses = user.licenses.filter((l) => l !== LicenseName.OSINT_ADVANCED);
    }
    if (license === LicenseName.OSINT_ADVANCED) {
      user.licenses = user.licenses.filter((l) => l !== LicenseName.OSINT_BASIC);
    }
    user.licenses.push(license);
  }

  deleteUser(user: User) {
    this.userToDelete = user;
    this.isDeleteConfirmationOpen.set(true);
  }

  confirmDeleteUser(value: boolean) {
    this.isDeleteConfirmationOpen.set(false);
    if (!value || !this.userToDelete) {
      this.userToDelete = null;
      return;
    }
    this.isLoading = true;
    this.apiService.post('delete/user', this.userToDelete).pipe(switchMap(() => this.apiService.post<User[]>('users', new HttpHeaders({}))), tap(data => this.users = data), switchMap(() => this.nodeResolver.resolve()), finalize(() => {
      this.isLoading = false;
      this.userToDelete = null;
    })).subscribe();
  }

  getUserLicensesLabel(user: User): string {
    if (!user.licenses || user.licenses.length === 0) {
      return this.translationService.translate('None');
    }
    return user.licenses.map((l) => this.licenseService.getLicenseLabel(l)).join(', ');
  }

  getUserPermissionsLabel(user: User): string {
    if (!user.permissions || user.permissions.length === 0) {
      return this.translationService.translate('None');
    }
    return user.permissions.map(permission => this.getPermissionLabel(permission)).join(', ');
  }

  getPermissionLabel(permission: string): string {
    return this.permissionOptions.find(option => option.key === permission)?.label ?? permission;
  }

  canEditUser(user: User): boolean {
    return !(user.role === 'admin' || user.licenses?.includes('maintainer'));
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'active') {
      return 'bg-emerald-500/10 text-emerald-300 [body.light-theme_&]:bg-emerald-100 [body.light-theme_&]:text-emerald-800';
    }
    return 'bg-rose-500/10 text-rose-300 [body.light-theme_&]:bg-rose-100 [body.light-theme_&]:text-rose-800';
  }

  getSubscriptionBadgeClass(subscription?: boolean): string {
    if (subscription) {
      return 'bg-sky-500/10 text-sky-300 [body.light-theme_&]:bg-sky-100 [body.light-theme_&]:text-sky-800';
    }
    return 'bg-slate-500/10 text-slate-300 [body.light-theme_&]:bg-slate-100 [body.light-theme_&]:text-slate-700';
  }

  isAddUserDisabled(): boolean {
    return this.appService.userSessionData().tenant.quotaExceeded || !this.appService.getConfig().appSettings.smtp_configured;
  }

  getAddUserTooltip(): string {
    if (this.appService.userSessionData().tenant.quotaExceeded) {
      return this.translationService.translate('Access blocked');
    }
    if (!this.appService.getConfig().appSettings.smtp_configured) {
      return this.translationService.translate('SMTP configuration is incomplete');
    }
    return '';
  }

  addtenant() {
    if (this.isAddUserDisabled()) {
      return;
    }
    this.showAddTenantPopup = true;
  }

  clossAddTenant() {
    this.showAddTenantPopup = false;
  }
}
