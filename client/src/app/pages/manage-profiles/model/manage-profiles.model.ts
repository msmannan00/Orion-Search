export interface PlatformEntry {
  platform: string;
  base: string;
}

export interface SessionEntry {
  id: string;
  capturedAt: string;
  username?: string;
  verified?: boolean;
  verifyError?: string;
  verifiedAt?: string | null;
}

export type SocialPlatform = string;
export type SocialAgeGroup = '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type SocialGender = 'male' | 'female' | 'unspecified';
export type SocialConnectionStatus = 'pending' | 'connected' | 'failed' | 'disconnected';
export type SocialAssignmentStatus = 'assigned' | 'unassigned';
export type SocialProfilePurpose = 'posting' | 'ad_monitoring' | 'hate_speech_monitoring';

export interface SocialPersona {
  persona_id: string;
  name: string;
  age_group: SocialAgeGroup;
  gender: SocialGender;
  country?: string | null;
  city?: string | null;
  interests: string[];
  adult_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialProfile {
  profile_id: string;
  platform: SocialPlatform;
  profile_name?: string | null;
  profile_username?: string | null;
  session_id?: string | null;
  purposes: SocialProfilePurpose[];
  assigned_persona_id?: string | null;
  connection_status: SocialConnectionStatus;
  assignment_status: SocialAssignmentStatus;
  last_session_check?: string | null;
  login_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPersonaListResponse {
  personas: SocialPersona[];
}

export interface SocialProfileListResponse {
  profiles: SocialProfile[];
}

export interface SocialPersonaCreateRequest {
  name: string;
  age_group: SocialAgeGroup;
  gender: SocialGender;
  country?: string | null;
  city?: string | null;
  interests: string[];
}

export type SocialPersonaUpdateRequest = Partial<SocialPersonaCreateRequest>;

export interface SocialProfileConnectRequest {
  platform: SocialPlatform;
  session_id?: string | null;
  profile_name?: string | null;
  profile_username?: string | null;
  purposes: SocialProfilePurpose[];
}

export interface SocialProfileUpdateRequest {
  profile_name?: string | null;
  profile_username?: string | null;
  connection_status?: SocialConnectionStatus | null;
  session_id?: string | null;
  purposes?: SocialProfilePurpose[] | null;
}

export interface SocialProfileAssignmentRequest {
  persona_id: string;
  profile_id: string;
}

export interface SocialProfileAssignmentResponse {
  message: string;
  profile: SocialProfile;
}

export interface SocialDetectedAd {
  url: string;
  author: string;
  content_text: string;
  metadata: string;
  likes: string;
  shares: string;
  views: string;
  detected_at: string;
}

export interface SocialAdDetectionResult {
  profile_id: string;
  date_time: string;
  total_detected_ads: number;
  ads: SocialDetectedAd[];
  error: boolean;
  error_reason: string;
  session_expired: boolean;
}

export interface SocialPostResult {
  profile_id: string;
  date_time: string;
  post_url: string;
  error: boolean;
  error_reason: string;
  session_expired: boolean;
}

export interface SocialProfileResultsResponse {
  profile_id: string;
  ad_detection_results: SocialAdDetectionResult[];
  post_results: SocialPostResult[];
  hate_speech_results: unknown[];
}
