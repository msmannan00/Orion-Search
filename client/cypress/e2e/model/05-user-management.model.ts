export interface ManagedUser {
  username: string;
  email: string;
  password: string;
  role: 'Member' | 'Analyst' | 'Demo';
  licenses: string[];
  permissions?: string[];
  alertAllowedTenants?: string[] | 'all';
}

export interface UserManagementTestData extends Record<string, unknown> {
  stealer_ioc_email: string;
  stealer_upgrade_name: string;
  stealer_upgrade_email: string;
}

export interface ManagedUsers extends Record<string, ManagedUser> {
  testing1: ManagedUser;
  testing2: ManagedUser;
  testing3: ManagedUser;
  testing4: ManagedUser;
  testing5: ManagedUser;
  testing6: ManagedUser;
}
