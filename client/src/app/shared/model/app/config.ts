export class AppSettingsModel {
  version = '1.0.0';
  app_url = '';
  orion_mail_url = '';
  language_allowed = 'en';
  logo_url = '';
  logo_wide_light = '';
  logo_wide_dark = '';
  auth_dashboard_icon='';
  app_name = '';
  meta_info = '';
  home_header_data_sources = '';
  home_header_adversaries = '';
  home_header_pricing = '';
  home_header_pricing_allowed = true;
  home_header_whistle_blowing_allowed = false;
  ai_endpoint_enabled = true;
  backup_schedule = false;
  admin_root_allowed = false;
  smtp_configured = false;
  s_onion = '';

  constructor(data?: Partial<Record<keyof AppSettingsModel, string | boolean>>) {
    if (data) {
      const hasAiEndpointEnabled = data.ai_endpoint_enabled !== undefined;
      this.ai_endpoint_enabled = data.ai_endpoint_enabled === true || data.ai_endpoint_enabled === '1' || (!hasAiEndpointEnabled && this.ai_endpoint_enabled);
      this.backup_schedule = data.backup_schedule === true || data.backup_schedule === '1';
      this.admin_root_allowed = data.admin_root_allowed === true || data.admin_root_allowed === '1' || data.admin_root_allowed === 'true';
      this.version = (data.version as string) || this.version;
      this.app_url = (data.app_url as string) || this.app_url;
      this.orion_mail_url = (data.orion_mail_url as string) || this.orion_mail_url;
      this.language_allowed = (data.language_allowed as string) || this.language_allowed;
      this.logo_url = (data.logo_url as string) || this.logo_url;
      this.logo_wide_light = (data.logo_wide_light as string) || this.logo_wide_light;
      this.logo_wide_dark = (data.logo_wide_dark as string) || this.logo_wide_dark;
      this.auth_dashboard_icon=(data.auth_dashboard_icon as string) || this.auth_dashboard_icon;
      this.smtp_configured = data.smtp_configured === true || data.smtp_configured === '1';
      this.app_name = (data.app_name as string) || this.app_name;
      this.meta_info = (data.meta_info as string) || this.meta_info;
      this.s_onion = (data.s_onion as string) || this.s_onion;
      this.applyMetaInfo(hasAiEndpointEnabled);
    }
  }

  private applyMetaInfo(hasAiEndpointEnabled = false): void {
    try {
      const parsed = this.meta_info ? JSON.parse(this.meta_info) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return;
      }
      this.home_header_data_sources = typeof parsed.S_HOME_HEADER_DATA_SOURCES === 'string' ? parsed.S_HOME_HEADER_DATA_SOURCES : this.home_header_data_sources;
      this.home_header_adversaries = typeof parsed.S_HOME_HEADER_ADVERSARIES === 'string' ? parsed.S_HOME_HEADER_ADVERSARIES : this.home_header_adversaries;
      this.home_header_pricing = typeof parsed.S_HOME_HEADER_PRICING === 'string' ? parsed.S_HOME_HEADER_PRICING : this.home_header_pricing;
      this.home_header_pricing_allowed = typeof parsed.S_HOME_HEADER_PRICING_ALLOWED === 'boolean' ? parsed.S_HOME_HEADER_PRICING_ALLOWED : this.home_header_pricing_allowed;
      this.home_header_whistle_blowing_allowed = typeof parsed.S_HOME_HEADER_WHISTLE_BLOWING_ALLOWED === 'boolean' ? parsed.S_HOME_HEADER_WHISTLE_BLOWING_ALLOWED : this.home_header_whistle_blowing_allowed;
      this.ai_endpoint_enabled = !hasAiEndpointEnabled && typeof parsed.S_AI_ENDPOINT_ENABLED === 'boolean' ? parsed.S_AI_ENDPOINT_ENABLED : this.ai_endpoint_enabled;
    }
    catch {
      return;
    }
  }
}
export class LocalSettingsModel {
  enable_advanced_tools = false;
  advance_setting_toggle = true;
  iocExpanded = true;
  entityfilterCategories: Record<string, string[]> = {};
  entityFilterCondition = true;
  isSidebarOpen = true;
  matchType = "";
  sortType = "";
}
export class ConfigSettings {
  appSettings: AppSettingsModel;
  localSettings: LocalSettingsModel;

  constructor(appSettings?: Partial<AppSettingsModel>, localSettings?: Partial<LocalSettingsModel>) {
    this.appSettings = new AppSettingsModel(appSettings);
    this.localSettings = Object.assign(new LocalSettingsModel(), localSettings);
  }
}
