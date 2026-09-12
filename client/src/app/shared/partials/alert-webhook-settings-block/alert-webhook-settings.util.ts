import { AlertConnectorSettingsResponse, AlertWebhookSettingsForm } from './model/alert-webhook-settings.model';

export function createWebhookForm(): AlertWebhookSettingsForm {
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

export function mapAlertConnectorSettings(response: AlertConnectorSettingsResponse): AlertWebhookSettingsForm {
  return {
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
}
