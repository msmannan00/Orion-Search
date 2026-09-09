import { UnknownRecord } from '../../../../shared/utils/type-guards.util';

export interface DashboardCryptoStatus extends UnknownRecord {
  confirmed?: boolean;
  block_height?: string | number;
  confirmations?: string | number;
}

export interface DashboardCryptoAmounts extends UnknownRecord {
  total_input_btc?: string | number;
  total_output_btc?: string | number;
  fee_btc?: string | number;
}

export interface DashboardCryptoTransactionDetails extends UnknownRecord {
  size?: string | number;
  weight?: string | number;
}

export interface DashboardCryptoTransfer extends UnknownRecord {
  address?: string;
  value_btc?: string | number;
  txid?: string;
}

export interface DashboardCryptoBalance extends UnknownRecord {
  confirmed?: string | number;
  unconfirmed?: string | number;
}

export interface DashboardCryptoTransactionCount extends UnknownRecord {
  total?: string | number;
  received?: string | number;
  sent?: string | number;
}

export interface DashboardCryptoRiskAssessment extends UnknownRecord {
  risk_factors?: string[];
  risk_level?: string;
}

export interface DashboardApiResponse extends UnknownRecord {
  status?: string;
  progress?: number;
  step?: string;
  cards_data?: DashboardApiResponse[];
  data?: DashboardApiResponse;
  result?: DashboardApiResponse | DashboardApiResponse[];
  network?: string;
  detected_network?: string;
  query_type?: string;
  txid?: string;
  status_info?: DashboardCryptoStatus;
  amounts?: DashboardCryptoAmounts;
  transaction_details?: DashboardCryptoTransactionDetails;
  inputs?: DashboardCryptoTransfer[];
  outputs?: DashboardCryptoTransfer[];
  recent_transactions?: DashboardCryptoTransfer[];
  address?: string;
  balance?: DashboardCryptoBalance;
  transaction_count?: DashboardCryptoTransactionCount;
  total_received?: string | number;
  total_sent?: string | number;
  risk_assessment?: DashboardCryptoRiskAssessment;
  m_title?: string;
  m_app_name?: string;
  title?: string;
}
