-- Seed: ENBD (Emirates NBD) Bank Configuration
-- Description: Initial configuration for Emirates NBD settlements

INSERT INTO bank_destinations (
  bank_code,
  bank_name,
  bank_address,
  beneficiary_name,
  swift_code,
  iban_aed,
  iban_usd,
  iban_eur,
  is_active
) VALUES (
  'ENBD',
  'EMIRATES NBD',
  'DUBAI, UNITED ARAB EMIRATES',
  'TRADEMORE VALUE CAPITAL FZE',
  'EBILAEADXXX',
  'AE610260001015381452401',
  'AE690260001025381452402',
  'AE420260001025381452403',
  true
) ON CONFLICT (bank_code) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  bank_address = EXCLUDED.bank_address,
  beneficiary_name = EXCLUDED.beneficiary_name,
  swift_code = EXCLUDED.swift_code,
  iban_aed = EXCLUDED.iban_aed,
  iban_usd = EXCLUDED.iban_usd,
  iban_eur = EXCLUDED.iban_eur,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

