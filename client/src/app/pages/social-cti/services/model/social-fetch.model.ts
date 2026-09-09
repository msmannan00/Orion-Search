import { social_phone_lookup_result, social_wanted } from '../../models/social.models';

export interface SocialSearchResponse<T> {
  Result?: T[];
  result?: { Result?: T[] };
  data?: { Result?: T[] };
}

export interface WantedSearchResponse {
  cards_data?: social_wanted[];
  data?: { cards_data?: social_wanted[] };
  result?: { cards_data?: social_wanted[] } | social_wanted[];
}

export interface PhoneLookupResponse extends Record<string, unknown> {
  status?: string;
  message?: string;
  error_message?: string;
  result?: social_phone_lookup_result;
}
