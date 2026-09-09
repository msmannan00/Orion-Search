import { UnknownRecord } from '../../../../shared/utils/type-guards.util';

export interface PhoneLookupKnowledgeGraph extends UnknownRecord {
  description?: string;
  detailed_desc?: string;
}

export interface PhoneLookupWebFootprint extends UnknownRecord {
  link?: string;
  title?: string;
  snippet?: string;
}

export interface PhoneLookupResult extends UnknownRecord {
  name?: string;
  formatted_address?: string;
  rating?: string | number;
  user_ratings_total?: string | number;
  website?: string;
  phone_numbers?: (string | number)[];
  knowledge_graph?: PhoneLookupKnowledgeGraph;
  emails?: string[];
  web_footprints?: PhoneLookupWebFootprint[];
}

export interface PhoneLookupResponse extends UnknownRecord {
  status?: string;
  progress?: number;
  step?: string;
  message?: string;
  error_message?: string;
  result?: PhoneLookupResult;
}
