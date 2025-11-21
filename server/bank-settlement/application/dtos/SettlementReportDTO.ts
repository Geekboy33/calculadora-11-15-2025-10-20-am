/**
 * DTOs para reportes de settlement
 */

export interface SettlementReportRow {
  daesReferenceId: string;
  currency: string;
  amount: string;
  beneficiaryIban: string;
  enbdTransactionReference?: string;
  status: string;
  executedBy?: string;
  executedAt?: string;
  createdAt: string;
  referenceText?: string;
}

export interface DailySettlementReportDTO {
  date: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  totalAmountByAED?: string;
  totalAmountUSD?: string;
  totalAmountEUR?: string;
  settlements: SettlementReportRow[];
}

