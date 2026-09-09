import { AlertNotification } from './alert.notification.model';
import { AlertModel } from '../../../model/company-profile/node.model';

export interface AlertNotificationPage {
  items?: AlertNotification[];
  total?: number;
  page?: number;
  has_more?: boolean;
  counts_by_type?: Record<string, number>;
}

export interface AlertListPage {
  items?: AlertModel[];
}
