export interface LoginSession {
  role?: string;
  password_reset_required?: boolean;
  password_reset_token?: string | null;
}

export interface LoginResponse {
  session?: LoginSession;
  twofa_required?: boolean;
  username?: string;
  temp_token?: string | null;
  provisioning_uri?: string | null;
  twofa_secret?: string | null;
}
