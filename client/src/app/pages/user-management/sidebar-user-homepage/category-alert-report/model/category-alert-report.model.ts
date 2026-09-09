import { AlertModel } from '../../../../../shared/model/company-profile/node.model';
import { UnknownRecord } from '../../../../../shared/utils/type-guards.util';

export interface AlertPageResponse {
  items?: AlertModel[];
  page?: number;
  has_more?: boolean;
}

export interface StixExternalReference extends UnknownRecord {
  url?: string;
  source_name?: string;
}

export interface StixReportObject extends UnknownRecord {
  type?: string;
  id?: string;
  name?: string;
  description?: string;
  created?: string;
  modified?: string;
  external_references?: StixExternalReference[];
  labels?: string[];
}

export interface StixBundle extends UnknownRecord {
  type?: string;
  objects?: StixReportObject[];
}
