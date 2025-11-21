/**
 * DTOs para confirmación de settlement
 */

export interface ConfirmSettlementDTO {
  settlementId: string;
  status: 'COMPLETED' | 'FAILED' | 'SENT';
  enbdTransactionReference?: string;
  failureReason?: string;
  executedBy: string;
}

export interface ConfirmSettlementResponse {
  id: string;
  status: string;
  enbdTransactionReference?: string;
  executedBy: string;
  executedAt: string;
  failureReason?: string;
}

