export interface CaseAlertTenant {
  username: string;
  email: string;
  password: string;
  companyName: string;
  slug: string;
}

export type TenantSubUser = Pick<CaseAlertTenant, 'username' | 'email' | 'password'>;

export interface AlertMailMessage extends Record<string, unknown> {
  Subject?: unknown;
  subject?: unknown;
}
