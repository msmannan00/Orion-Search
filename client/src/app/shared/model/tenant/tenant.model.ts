export interface IocCategory {
    ioc_id: string;
    name: string;
    values: string[];
}
export type TenantStatus = 'onboarding' | 'active' | 'disable';
export const TenantStatusValues = {
  ONBOARDING: 'onboarding' as TenantStatus,
  ACTIVE: 'active' as TenantStatus,
  DISABLE: 'disable' as TenantStatus,
};
export interface TenantModel {
    id?: string;
    name: string;
    iocs: IocCategory[];
    phone?: string;
    country?: string;
    city?: string;
    subscription?: boolean;
    postal_code?: string;
    verified?: boolean;
    user_quota?: number;
    status?: TenantStatus;
    licenses?: string[];
    quotaExceeded?: boolean;
    email?: string;
    password_reset_required?: boolean;
    profile_visibility_enabled?: boolean;
    event_management_enabled?: boolean;
    alerts_visible_to_admin?: boolean;
    privileged_ioc?: boolean;
    alert_run_time?: string | null;
    allowed_alert_categories?: string[] | null;
    accounts_mail_password?: string;
    accounts_mail?: string;
    accounts_smtp_server?: string;
    accounts_smtp_port?: string;
    [key: string]: unknown;
}
export interface User {
    username: string;
    email: string;
    role: string;
    status: 'active' | 'disable';
    subscription?: boolean;
    verificationDate: string;
    licenses?: string[] | null;
    permissions?: string[] | null;
    alerts_allowed_all?: boolean;
    alerts_allowed_tenant_ids?: string[] | null;
    password_reset_required?: boolean;
}
export interface TenantTeamModel {
    username: string;
    email: string;
    password: string;
    role: 'member' | 'analyst' | 'demo';
    status: 'active' | 'disable';
    subscription: boolean;
    licenses?: string[] | null;
    permissions?: string[] | null;
    alerts_allowed_all?: boolean;
    alerts_allowed_tenant_ids?: string[] | null;
    quotaExceeded?: boolean;
}
export interface AlertAllowedTenantOption {
    id: string;
    name: string;
    email: string;
}
