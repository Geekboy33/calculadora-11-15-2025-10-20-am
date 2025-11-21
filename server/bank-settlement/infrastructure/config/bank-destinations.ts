/**
 * Bank Destinations Configuration
 * Configuración estática de bancos destino (puede moverse a DB después)
 */

import { BankDestinationConfig } from '../../domain/entities/BankDestinationConfig';

export const BANK_DESTINATIONS = {
  ENBD: {
    id: crypto.randomUUID(),
    bankCode: 'ENBD',
    bankName: 'EMIRATES NBD',
    bankAddress: 'DUBAI, UNITED ARAB EMIRATES',
    beneficiaryName: 'TRADEMORE VALUE CAPITAL FZE',
    swiftCode: 'EBILAEADXXX',
    ibanByCurrency: {
      AED: 'AE610260001015381452401',
      USD: 'AE690260001025381452402',
      EUR: 'AE420260001025381452403'
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

export function getENBDConfig(): BankDestinationConfig {
  return BankDestinationConfig.create(BANK_DESTINATIONS.ENBD);
}

export function getBankConfigByCode(bankCode: string): BankDestinationConfig | null {
  const config = BANK_DESTINATIONS[bankCode as keyof typeof BANK_DESTINATIONS];
  return config ? BankDestinationConfig.create(config) : null;
}

