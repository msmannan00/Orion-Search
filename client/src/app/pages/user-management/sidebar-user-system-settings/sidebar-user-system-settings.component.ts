import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../shared/services/api.service';
import { FormsModule } from '@angular/forms';
import { AppService } from '../../../services/core/app/app.service';
import { AppSettingsModel, ConfigSettings } from '../../../shared/model/app/config';
import { MessageNotificationService } from '../../../services/message_notification/message-notification.service';
import { SmtpSettingsBlockComponent } from '../../../shared/partials/smtp-settings-block/smtp-settings-block.component';
import { AlertWebhookSettingsBlockComponent } from '../../../shared/partials/alert-webhook-settings-block/alert-webhook-settings-block.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { LANGUAGE_OPTIONS } from '../../../shared/constants/shared-enums';
import { LanguageOption } from '../../../shared/constants/model/shared-enums.model';
import { ActivatedRoute } from '@angular/router';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { TenantBrandingSettingsComponent } from './tenant-branding-settings/tenant-branding-settings.component';
import { AlertConnectorSettingsResponse, AlertWebhookSettingsForm } from '../../../shared/partials/alert-webhook-settings-block/model/alert-webhook-settings.model';
import type { SystemSettingsResponse } from './model/sidebar-user-system-settings.model';
import { getOwnProperty, setOwnProperty } from '../../../shared/utils/type-guards.util';

export type { SystemSettingsResponse } from './model/sidebar-user-system-settings.model';


const DEFAULT_APP_NAME = 'Orion Intelligence';
type SystemSettingsTab = 'branding' | 'platform';
type SystemImageKey = 'auth_dashboard_icon' | 'logo_url' | 'logo_wide_light' | 'logo_wide_dark';
type SystemImageResponse = Partial<Pick<AppSettingsModel, SystemImageKey>>;
type AppSettingsWire = Partial<Record<keyof AppSettingsModel, string | boolean>>;
interface UpdateSettingsResponse { settings?: AppSettingsWire; appSettings?: AppSettingsWire }


@Component({
  selector: 'app-sidebar-user-system-settings',
  imports: [FormsModule, CommonModule, SmtpSettingsBlockComponent, TenantBrandingSettingsComponent, AlertWebhookSettingsBlockComponent, TranslatePipe],
  styleUrls: ['./sidebar-user-system-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-user-system-settings.component.html'
})
export class SidebarProfileSystemSettingsComponent implements OnInit {
  private configurationSnapshot = '';
  private mailSnapshot = '';
  private webhookSnapshot = '';

  activeTab: SystemSettingsTab = 'platform';
  configurationError = '';
  mailErrorState = false;
  webhookErrorState = false;
  scheduledBackup = false;
  form = { language: '', version: '', app_name: '0', ai_endpoint_enabled: true, admin_root_allowed: false, s_onion: '', data_sources_url: '', adversaries_url: '', pricing_url: '', documentation_allowed: false, whistle_blowing_allowed: false, accounts_mail_password: '', accounts_mail: '', accounts_smtp_server: '', accounts_smtp_port: '' };
  webhookForm: AlertWebhookSettingsForm = this.createWebhookForm();
  languageOptions: LanguageOption[] = LANGUAGE_OPTIONS;
  onionPattern = /^(?:https:\/\/|http:\/\/)?[a-z2-7]{56}\.onion\/?$/i;
  urlPattern = /^https?:\/\/.+/i;
  emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  smtpServerPattern = /^(?:localhost|[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]|(?=.{1,253}$)(?!.*\.\.)(?!.*(?:^|\.)-)(?!.*-(?:\.|$))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

  constructor(private apiService: ApiService, private route: ActivatedRoute, protected appService: AppService, private licenseService: LicenseService, private messageNotificationService: MessageNotificationService, private translationService: TranslationService) {
  }

  ngOnInit(): void {
    this.activeTab = this.getInitialTab();
    this.scheduledBackup = this.appService.getConfig().appSettings.backup_schedule;
    this.loadSettings();
    this.webhookSnapshot = this.webhookState();
    this.loadAlertConnectorSettings();
  }

  canEditTenantBranding(): boolean {
    const role = this.appService.userSessionData().user.role;
    return role === 'admin' || (role === 'member' && this.licenseService.isMaintainer());
  }

  canManagePlatformSettings(): boolean {
    return this.appService.userSessionData().user.role === 'admin';
  }

  selectTab(tab: SystemSettingsTab): void {
    if ((tab === 'branding' && !this.canEditTenantBranding()) ||
      (tab === 'platform' && !this.canManagePlatformSettings())) {
      return;
    }
    this.activeTab = tab;
    this.loadSettings();
    this.loadAlertConnectorSettings();
  }

  loadSettings() {
    const settings = this.appService.configData()?.appSettings;
    if (!settings) {
      return;
    }
    let metaInfo: Record<string, string | boolean>;
    try {
      metaInfo = settings.meta_info ? JSON.parse(settings.meta_info) : {};
    }
    catch {
      metaInfo = {};
    }
    this.form.language = settings.language_allowed;
    this.form.version = settings.version;
    this.form.app_name = settings.app_name?.trim() || DEFAULT_APP_NAME;
    this.form.ai_endpoint_enabled = settings.ai_endpoint_enabled;
    this.form.admin_root_allowed = settings.admin_root_allowed;
    this.form.s_onion = settings.s_onion;
    this.form.data_sources_url = typeof metaInfo.S_HOME_HEADER_DATA_SOURCES === 'string' ? metaInfo.S_HOME_HEADER_DATA_SOURCES : '';
    this.form.adversaries_url = typeof metaInfo.S_HOME_HEADER_ADVERSARIES === 'string' ? metaInfo.S_HOME_HEADER_ADVERSARIES : '';
    this.form.pricing_url = typeof metaInfo.S_HOME_HEADER_PRICING === 'string' ? metaInfo.S_HOME_HEADER_PRICING : '';
    this.form.documentation_allowed = metaInfo.S_HOME_HEADER_PRICING_ALLOWED === true;
    this.form.whistle_blowing_allowed = metaInfo.S_HOME_HEADER_WHISTLE_BLOWING_ALLOWED === true;
    this.form.accounts_mail_password = typeof metaInfo.ACCOUNTS_MAIL_PASSWORD === 'string' ? metaInfo.ACCOUNTS_MAIL_PASSWORD : '';
    this.form.accounts_mail = typeof metaInfo.ACCOUNTS_MAIL === 'string' ? metaInfo.ACCOUNTS_MAIL : '';
    this.form.accounts_smtp_server = typeof metaInfo.ACCOUNTS_SMTP_SERVER === 'string' ? metaInfo.ACCOUNTS_SMTP_SERVER : '';
    this.form.accounts_smtp_port = typeof metaInfo.ACCOUNTS_SMTP_PORT === 'string' ? metaInfo.ACCOUNTS_SMTP_PORT : '';
    this.configurationError = '';
    this.mailErrorState = false;
    this.webhookErrorState = false;
    this.configurationSnapshot = this.configurationState();
    this.mailSnapshot = this.mailState();
  }

  loadAlertConnectorSettings() {
    this.apiService.get<AlertConnectorSettingsResponse>('alert-connectors/settings').subscribe({
      next: (response) => {
        this.applyAlertConnectorSettings(response);
      },
      error: () => {
        this.webhookErrorState = true;
      }
    });
  }

  isConfigurationDirty(): boolean {
    return this.configurationState() !== this.configurationSnapshot;
  }

  isMailDirty(): boolean {
    return this.mailState() !== this.mailSnapshot;
  }

  isWebhookDirty(): boolean {
    return this.webhookState() !== this.webhookSnapshot;
  }

  updateUserResource(file: File,key: SystemImageKey = 'logo_url') {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiService
      .put<SystemImageResponse>(`system/image?key=${key}`, formData)
      .subscribe({
        next: (res) => {
          const appSettings = this.appService.getConfig().appSettings;
          if (res?.logo_url) {
            appSettings.logo_url = res.logo_url;
          }
          if (res?.logo_wide_light) {
            appSettings.logo_wide_light = res.logo_wide_light;
          }
          if (res?.logo_wide_dark) {
            appSettings.logo_wide_dark = res.logo_wide_dark;
          }
          if(res?.auth_dashboard_icon){
            appSettings.auth_dashboard_icon = res.auth_dashboard_icon;
          }
          if (appSettings.logo_url) {
            this.appService.updateFavicon(appSettings.logo_url);
          }
        },
        error: (err) => {
          const message = err?.error?.detail ?? this.translationService.translate('Failed to upload image');
          this.messageNotificationService.show(message);
        }
      });
  }

  deleteUserResource(key: SystemImageKey = 'logo_url') {
    return this.apiService.delete<unknown>(`system/image?key=${key}`).subscribe(() => {
      const fallbackMap: Record<string, string> = {
        logo_url: '/api/s/static/system/logo_url_default.png',
        logo_wide_light: '/api/s/static/system/logo_wide_light_default.png',
        logo_wide_dark: '/api/s/static/system/logo_wide_dark_default.png',
        auth_dashboard_icon: '/api/s/static/system/auth_dashboard_icon_default.png'
      };
      const fallback = getOwnProperty(fallbackMap, key);
      setOwnProperty(this.appService.getConfig().appSettings, key, fallback);
      if (key === 'logo_url') {
        this.appService.updateFavicon(fallback);
      }
    });
  }

  save(section: 'configuration' | 'mail' | 'webhooks'): boolean {
    if (section === 'configuration') {
      this.configurationError = '';
    }
    else if (section === 'mail') {
      this.mailErrorState = false;
    }
    else {
      this.webhookErrorState = false;
    }
    const configurationFields = [
      { key: 'app_name', label: 'App Name' },
      { key: 'language', label: 'Language' },
      { key: 'data_sources_url', label: 'Data Sources URL' },
      { key: 'adversaries_url', label: 'Adversaries URL' },
      { key: 'pricing_url', label: 'Pricing URL' }
    ] as const;
    const mailFields = [
      { key: 'accounts_mail_password', label: 'Account Mail Password' },
      { key: 'accounts_mail', label: 'Account Mail' },
      { key: 'accounts_smtp_server', label: 'Account SMTP Server' },
      { key: 'accounts_smtp_port', label: 'Account SMTP Port' }
    ] as const;
    const requiredFields = section === 'configuration' ? configurationFields : section === 'mail' ? mailFields : [];
    for (const field of requiredFields) {
      const value = this.form[field.key];
      if (typeof value !== 'string' || !value.trim()) {
        if (section === 'mail') {
          this.mailErrorState = true;
        }
        else {
          const translatedField = this.translationService.translate(field.label);
          this.configurationError = this.translationService.translate('{field} is required').replace('{field}', translatedField);
        }
        return false;
      }
    }
    this.form.app_name = this.form.app_name.trim() || DEFAULT_APP_NAME;
    this.form.language = this.form.language.trim();
    this.form.s_onion = this.form.s_onion.trim();
    this.form.data_sources_url = this.form.data_sources_url.trim();
    this.form.adversaries_url = this.form.adversaries_url.trim();
    this.form.pricing_url = this.form.pricing_url.trim();
    this.form.accounts_mail_password = this.form.accounts_mail_password.trim();
    this.form.accounts_mail = this.form.accounts_mail.trim();
    this.form.accounts_smtp_server = this.form.accounts_smtp_server.trim();
    this.form.accounts_smtp_port = this.form.accounts_smtp_port.trim();
    if (section === 'configuration' && this.form.s_onion && !this.onionPattern.test(this.form.s_onion)) {
      this.messageNotificationService.show(this.translationService.translate('Invalid onion address'));
      return false;
    }
    if (section === 'configuration' && ((this.form.data_sources_url && !this.urlPattern.test(this.form.data_sources_url)) ||
      (this.form.adversaries_url && !this.urlPattern.test(this.form.adversaries_url)) ||
      (this.form.pricing_url && !this.urlPattern.test(this.form.pricing_url)))) {
      this.configurationError = this.translationService.translate('Data Sources URL, Adversaries URL, and Pricing URL must start with http:// or https://');
      return false;
    }
    if (section === 'mail' && !this.emailPattern.test(this.form.accounts_mail)) {
      this.mailErrorState = true;
      return false;
    }
    if (section === 'mail' && !this.smtpServerPattern.test(this.form.accounts_smtp_server)) {
      this.mailErrorState = true;
      return false;
    }
    const smtpPort = Number(this.form.accounts_smtp_port);
    if (section === 'mail' && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
      this.mailErrorState = true;
      return false;
    }
    if (section === 'webhooks') {
      this.saveAlertConnectorSettings();
      return true;
    }
    const settings: Record<string, string> = section === 'configuration'
      ? {
        language: this.form.language,
        app_name: this.form.app_name,
        ai_endpoint_enabled: this.form.ai_endpoint_enabled ? '1' : '0',
        admin_root_allowed: this.form.admin_root_allowed ? '1' : '0',
        s_onion: this.form.s_onion,
        meta_info: JSON.stringify(this.buildMetaInfo('configuration'))
      }
      : {
        meta_info: JSON.stringify(this.buildMetaInfo(section))
      };
    this.apiService.post<SystemSettingsResponse>('public/update', { settings }).subscribe({
      next: (response) => {
        if (response?.settings) {
          this.applySettings(response.settings);
          if (section === 'configuration') {
            this.configurationSnapshot = this.configurationState();
          }
          else {
            this.mailSnapshot = this.mailState();
          }
        }
      },
      error: () => {
        if (section === 'mail') {
          this.mailErrorState = true;
        }
        else {
          this.configurationError = this.translationService.translate('Failed to save configuration');
        }
      }
    });
    return true;
  }

  private buildMetaInfo(section: 'configuration' | 'mail'): Record<string, string | boolean> {
    const metaInfo: Record<string, string | boolean> = {};
    if (section === 'configuration') {
      metaInfo.S_HOME_HEADER_DATA_SOURCES = this.form.data_sources_url;
      metaInfo.S_HOME_HEADER_ADVERSARIES = this.form.adversaries_url;
      metaInfo.S_HOME_HEADER_PRICING = this.form.pricing_url;
      metaInfo.S_HOME_HEADER_PRICING_ALLOWED = this.form.documentation_allowed;
      metaInfo.S_HOME_HEADER_WHISTLE_BLOWING_ALLOWED = this.form.whistle_blowing_allowed;
    }
    if (section === 'mail') {
      metaInfo.ACCOUNTS_MAIL_PASSWORD = this.form.accounts_mail_password;
      metaInfo.ACCOUNTS_MAIL = this.form.accounts_mail;
      metaInfo.ACCOUNTS_SMTP_SERVER = this.form.accounts_smtp_server;
      metaInfo.ACCOUNTS_SMTP_PORT = this.form.accounts_smtp_port;
    }
    return metaInfo;
  }

  private saveAlertConnectorSettings() {
    const payload = {
      slack_client_id: this.webhookForm.slack_client_id,
      slack_client_secret: this.webhookForm.slack_client_secret,
      jira_client_id: this.webhookForm.jira_client_id,
      jira_client_secret: this.webhookForm.jira_client_secret
    };
    this.apiService.post<AlertConnectorSettingsResponse>('alert-connectors/settings', payload).subscribe({
      next: (response) => {
        this.applyAlertConnectorSettings(response);
      },
      error: () => {
        this.webhookErrorState = true;
      }
    });
  }

  private applyAlertConnectorSettings(response: AlertConnectorSettingsResponse) {
    this.webhookForm = {
      slack_client_id: response?.app?.slack_client_id || '',
      slack_client_secret: '',
      slack_configured: response?.app?.slack_configured,
      jira_client_id: response?.app?.jira_client_id || '',
      jira_client_secret: '',
      jira_configured: response?.app?.jira_configured,
      alert_slack_connected: response?.tenant?.slack_connected,
      alert_slack_channel: response?.tenant?.slack_channel || '',
      alert_slack_team: response?.tenant?.slack_team || '',
      alert_jira_connected: response?.tenant?.jira_connected,
      alert_jira_site_url: response?.tenant?.jira_site_url || '',
      alert_jira_site_name: response?.tenant?.jira_site_name || ''
    };
    this.webhookErrorState = false;
    this.webhookSnapshot = this.webhookState();
  }

  updateScheduledBackup(): void {
    const value = this.scheduledBackup;
    this.apiService.post<UpdateSettingsResponse>('public/update', {
      settings: {
        backup_schedule: value ? '1' : '0'
      }
    }).subscribe({
      next: (response) => {
        const current = this.appService.configData();
        const appSettings = new AppSettingsModel({ ...current.appSettings, ...(response?.settings ?? response?.appSettings ?? {}), backup_schedule: value ? '1' : '0' });
        this.appService.configData.set(new ConfigSettings(appSettings, current.localSettings));
        this.messageNotificationService.show(this.translationService.translate('Settings updated successfully'),'success');
      },
      error: () => {
        this.scheduledBackup = !value;
        this.messageNotificationService.show(this.translationService.translate('Failed to update settings'));
      }
    });
  }

  private configurationState(): string {
    return JSON.stringify([
      this.form.app_name,
      this.form.language,
      this.form.s_onion,
      this.form.data_sources_url,
      this.form.adversaries_url,
      this.form.pricing_url,
      this.form.ai_endpoint_enabled,
      this.form.admin_root_allowed,
      this.form.documentation_allowed,
      this.form.whistle_blowing_allowed
    ]);
  }

  private mailState(): string {
    return JSON.stringify([
      this.form.accounts_mail,
      this.form.accounts_mail_password,
      this.form.accounts_smtp_server,
      this.form.accounts_smtp_port
    ]);
  }

  private webhookState(): string {
    return JSON.stringify([
      this.webhookForm.slack_client_id,
      this.webhookForm.slack_client_secret,
      this.webhookForm.jira_client_id,
      this.webhookForm.jira_client_secret
    ]);
  }

  private createWebhookForm(): AlertWebhookSettingsForm {
    return {
      slack_client_id: '',
      slack_client_secret: '',
      slack_configured: false,
      jira_client_id: '',
      jira_client_secret: '',
      jira_configured: false,
      alert_slack_connected: false,
      alert_slack_channel: '',
      alert_slack_team: '',
      alert_jira_connected: false,
      alert_jira_site_url: '',
      alert_jira_site_name: ''
    };
  }

  get displayVersion(): string {
    return (this.form.version || '').replaceAll('_', '.');
  }

  private getInitialTab(): SystemSettingsTab {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (requestedTab === 'branding' && this.canEditTenantBranding()) {
      return 'branding';
    }
    if (requestedTab === 'platform' && this.canManagePlatformSettings()) {
      return 'platform';
    }
    return this.canManagePlatformSettings() ? 'platform' : 'branding';
  }

  private applySettings(settings: Partial<AppSettingsModel>): void {
    const current = this.appService.configData();
    const appSettings = { ...current.appSettings, ...settings };
    this.appService.configData.set(new ConfigSettings(appSettings, current.localSettings));
    const updated = this.appService.configData().appSettings;
    this.appService.updateFavicon(updated.logo_url);
    document.title = updated.app_name?.trim() || DEFAULT_APP_NAME;
  }

  get isAdmin(): boolean {
    return this.appService.userSessionData()?.user?.role === 'admin';
  }
}
