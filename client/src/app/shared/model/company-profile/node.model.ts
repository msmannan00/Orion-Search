export interface userSessionData {
    user: UserDataModel;
    tenant: TenantDataModel;
    alerts: AlertModel[];
    alert_summary?: AlertSummary;
}

export interface AlertSummary {
    unseen_total: number;
    counts_by_type: Record<string, number>;
    counts_by_risk: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}
export interface UserDataModel {
    email: string;
    theme?: 'dark-theme' | 'light-theme';
    twofa_enabled: boolean;
    username: string;
    role: string;
    status: string;
    subscription: boolean;
    verificationDate: string;
    password_reset_required?: boolean;
    password_reset_token?: string | null;
    license: string[];
    permissions?: string[];
    image?: string;
    preferences?: Record<string, unknown>;
    demo_tour: boolean;
}
export interface TenantDataModel {
    id: string;
    name: string;
    phone: string;
    country: string;
    city: string;
    postalCode: string;
    hasOnboarding: boolean;
    isDefault: boolean;
    taxId: string;
    userId: string;
    licenses: string[];
    assignedQuota: string;
    quotaExceeded: boolean;
    image?: string;
    profileVisibilityEnabled?: boolean;
    eventManagementEnabled?: boolean;
    alertsVisibleToAdmin?: boolean;
    privilegedIoc?: boolean;
    alertRunTime?: string | null;
    allowedAlertCategories?: string[] | null;
    accountsMailPassword?: string;
    accountsMail?: string;
    accountsSmtpServer?: string;
    accountsSmtpPort?: string;
}
export interface userMetaData {
    username: string;
    twofa_enabled?: boolean;
    password?: string;
    current_password?: string;
    theme?: 'dark-theme' | 'light-theme';
    preferences?: Record<string, unknown> & {
        theme?: 'dark-theme' | 'light-theme';
        profile_visible?: boolean;
    };
    demo_tour?:boolean;
}
export interface AlertAllIoc {
    name: string;
    values: string[];
}
export interface AlertModel {
    alert_id?: string;
    report_seen?: boolean;
    custom_alert?: boolean;
    type?: string;
    ioc_type?: string;
    ioc_value?: string;
    data_hash?: string;
    title?: string;
    description?: string;
    url?: string;
    source?: string;
    risk?: string;
    all_ioc?: AlertAllIoc[];
    licenses?: string[];
    content_types?: string[];
    raw_findings?: Record<string, unknown>;
    status?: 'ignore' | 'active';
    first_seen?: Date;
    last_seen?: Date;
}
