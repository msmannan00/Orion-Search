import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppService } from '../../../services/core/app/app.service';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { LANGUAGE_OPTIONS } from '../../../shared/constants/shared-enums';
import { LanguageOption } from '../../../shared/constants/model/shared-enums.model';
import { PasswordToggleDirective } from '../../../shared/directive/password-toggle.directive';
import { UserDataModel, userMetaData, userSessionData } from '../../../shared/model/company-profile/node.model';
import { PasswordConfirmationPopupComponent } from '../../../shared/partials/password-confirmation-popup/password-confirmation-popup.component';
import { RecoveryKeyPopupComponent } from '../../../shared/partials/recovery-key-popup/recovery-key-popup.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiService } from '../../../shared/services/api.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { areAllPasswordRequirementsMet, createEmptyPasswordChecks, evaluatePasswordInput, PasswordChecks, PasswordStrength } from '../../../shared/utils/auth-form.util';
import { getTenantLocationDisplay } from './sidebar-settings.util';
import { UserImagePickerComponent } from "./user-image-picker/user-image-picker.component";

type SensitiveAction = 'twofa' | 'password' | 'recovery';

@Component({
  selector: 'app-sidebar-profile-settings',
  imports: [FormsModule, CommonModule, UserImagePickerComponent, PasswordToggleDirective, TranslatePipe, RecoveryKeyPopupComponent, PasswordConfirmationPopupComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css']
})
export class AccountSettingsComponent implements OnInit {
  userSessionData: userSessionData;
  twoFactorEnabled = true;
  isDarkMode = true;
  isProfileVisible = true;
  editableUsername = '';
  selectedLanguage = '';
  hasLanguagePreference = false;
  languageOptions: LanguageOption[] = LANGUAGE_OPTIONS;
  isPasswordSectionOpen = false;
  newPassword = '';
  confirmPassword = '';
  passwordStrength: PasswordStrength = null;
  showPasswordMeter = false;
  passwordChecks: PasswordChecks = createEmptyPasswordChecks();
  currentUnmetCheck: string | null = null;
  recoveryKey: string | null = null;
  sensitiveAction: SensitiveAction | null = null;
  confirmationError: string | null = null;

  constructor(protected apiService: ApiService, protected appService: AppService, protected licenseService: LicenseService, private messageNotificationService: MessageNotificationService, private translationService: TranslationService) {
    this.userSessionData = this.appService.userSessionData();
  }

  ngOnInit(): void {
    if (this.userSessionData) {
      this.setItemsFromPreferences();
      this.twoFactorEnabled = this.userSessionData.user.twofa_enabled;
      this.editableUsername = this.userSessionData.user.username || '';
    }
  }

  setItemsFromPreferences() {
    const userTheme = this.userSessionData?.user?.theme;
    const preferenceTheme = this.userSessionData?.user?.preferences?.theme;
    const theme = userTheme ?? preferenceTheme ?? 'dark-theme';
    this.isDarkMode = theme === 'dark-theme';
    this.isProfileVisible = this.userSessionData?.user?.preferences?.profile_visible !== false;
    const languagePreference = this.userSessionData?.user?.preferences?.language;
    const userLanguage = typeof languagePreference === 'string' ? languagePreference : '';
    this.hasLanguagePreference = this.translationService.isSupportedLanguage(userLanguage);
    const systemLanguage = this.translationService.getSystemLanguage();
    this.selectedLanguage = this.hasLanguagePreference ? this.translationService.getSupportedLanguage(userLanguage, systemLanguage) : systemLanguage;
  }

  isTenantProfileVisibilityEnabled(): boolean {
    return this.userSessionData?.tenant?.profileVisibilityEnabled !== false;
  }

  isAdmin(): boolean {
    return this.appService.userSessionData().user.role === 'admin';
  }

  applyTheme() {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(this.isDarkMode ? 'dark-theme' : 'light-theme');
  }

  private getCurrentTheme(): 'dark-theme' | 'light-theme' {
    return this.isDarkMode ? 'dark-theme' : 'light-theme';
  }

  toggleTheme() {
    const theme = this.getCurrentTheme();
    this.appService.userSessionData.update(state => {
      if (!state) {
        return state;
      }
      return {
        ...state,
        user: {
          ...state.user,
          theme,
          preferences: {
            ...(state.user.preferences ?? {}),
            theme
          }
        }
      };
    });
    this.applyTheme();
    this.updateUser();
  }

  requestSensitiveAction(action: SensitiveAction) {
    this.confirmationError = null;
    this.sensitiveAction = action;
  }

  toggleProfileVisibility() {
    if (!this.isTenantProfileVisibilityEnabled()) {
      return;
    }
    const preferences = {
      ...(this.userSessionData.user.preferences ?? {}),
      profile_visible: this.isProfileVisible
    };
    this.userSessionData.user.preferences = preferences;
    this.updateUser();
  }

  changeLanguage() {
    this.selectedLanguage = this.translationService.getSupportedLanguage(this.selectedLanguage, this.translationService.getSystemLanguage());
    this.hasLanguagePreference = true;
    const preferences = {
      ...(this.userSessionData.user.preferences ?? {}),
      language: this.selectedLanguage
    };
    this.userSessionData.user.preferences = preferences;
    this.appService.userSessionData.update(state => {
      if (!state) {
        return state;
      }
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...(state.user.preferences ?? {}),
            language: this.selectedLanguage
          }
        }
      };
    });
    this.updateUser();
  }

  getLocationDisplay(): string {
    return getTenantLocationDisplay(this.userSessionData.tenant);
  }

  updateUser() {
    const route = "update/current/user";
    this.userSessionData.user.username = this.editableUsername.trim() || this.userSessionData.user.username;
    const theme = this.getCurrentTheme();
    const preferences: Record<string, unknown> & {
      theme: 'dark-theme' | 'light-theme';
      profile_visible: boolean;
    } = {
      ...(this.userSessionData.user.preferences ?? {}),
      theme,
      profile_visible: this.isProfileVisible
    };
    if (this.hasLanguagePreference) {
      preferences.language = this.selectedLanguage;
    }
    else {
      delete preferences.language;
    }
    this.userSessionData.user.theme = theme;
    this.userSessionData.user.preferences = preferences;
    const userMeta: userMetaData = {
      username: this.userSessionData.user.username,
      theme,
      preferences,
      demo_tour: this.userSessionData.user.demo_tour
    };
    this.apiService.post(route, userMeta).subscribe({
      next: () => void 0,
      error: () => void 0,
    });
  }

  togglePasswordSection() {
    this.isPasswordSectionOpen = !this.isPasswordSectionOpen;
    if (!this.isPasswordSectionOpen) {
      this.resetPasswordForm();
    }
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

  confirmSensitiveAction(currentPassword: string) {
    if (this.sensitiveAction === 'recovery') {
      this.apiService.post<{ recovery_key: string }>('recovery-key', { current_password: currentPassword }).subscribe({
        next: (response) => {
          this.sensitiveAction = null;
          this.recoveryKey = response.recovery_key;
        },
        error: (err) => this.confirmationError = err?.error?.detail ?? 'Invalid password'
      });
      return;
    }

    const action = this.sensitiveAction;
    const userMeta: userMetaData = {
      username: this.userSessionData.user.username,
      current_password: currentPassword,
      ...(action === 'password' ? { password: this.newPassword } : { twofa_enabled: !this.twoFactorEnabled })
    };
    this.apiService.post<{ message?: string }>('update/current/user', userMeta).subscribe({
      next: () => {
        this.sensitiveAction = null;
        if (action === 'twofa') {
          this.twoFactorEnabled = !this.twoFactorEnabled;
          this.userSessionData.user.twofa_enabled = this.twoFactorEnabled;
        }
        else {
          this.messageNotificationService.show(this.translationService.translate('Password updated successfully'), 'success');
          this.resetPasswordForm();
          this.isPasswordSectionOpen = false;
        }
      },
      error: (err) => this.confirmationError = err?.error?.detail ?? 'Invalid password'
    });
  }

  closeSensitiveAction() {
    this.sensitiveAction = null;
    this.confirmationError = null;
  }

  private resetPasswordForm() {
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordStrength = null;
    this.showPasswordMeter = false;
    this.passwordChecks = createEmptyPasswordChecks();
    this.currentUnmetCheck = null;
  }

  updateUserResource(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiService.put<{ image?: string }>('user/image', formData).subscribe({
      next: (res) => {
        if (res?.image) {
          this.appService.userSessionData().user.image = `/api/s/static/user/${res.image}`;
        }
      },
      error: (err) => {
        const message = err?.error?.detail ?? this.translationService.translate('Failed to upload image');
        this.messageNotificationService.show(message);
      }
    });
  }

  deleteUserResource() {
    return this.apiService.delete<unknown>('user/image').subscribe(() => {
      this.appService.userSessionData().user.image = `/api/s/static/user/default.png`;
    });
  }

  getUserLicensesLabel(user: UserDataModel): string {
    if (!user?.license?.length) {
      return '';
    }
    return user.license.map(l => this.licenseService.getLicenseLabel(l)).join(', ');
  }

  get displayVersion(): string {
    const version = this.appService.getConfig()?.appSettings?.version || '';
    return version.replaceAll('_', '.');
  }
}
