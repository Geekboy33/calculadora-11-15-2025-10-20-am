/**
 * DTOs para creación de settlement
 */

export interface CreateSettlementDTO {
  amount: number;
  currency: string; // 'AED' | 'USD' | 'EUR'
  reference?: string;
  requestedBy: string;
  bankCode?: string; // Opcional, default 'ENBD'
}

export interface CreateSettlementResponse {
  id: string;
  daesReferenceId: string;
  amount: string;
  currency: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  swiftCode: string;
  status: string;
  ledgerDebitId: string;
  createdBy: string;
  createdAt: string;
}

