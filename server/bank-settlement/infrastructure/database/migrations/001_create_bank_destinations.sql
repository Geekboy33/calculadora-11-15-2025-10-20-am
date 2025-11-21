-- Migration: Create bank_destinations table
-- Version: 001
-- Description: Stores bank destination configurations for settlements

CREATE TABLE IF NOT EXISTS bank_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code VARCHAR(20) NOT NULL UNIQUE,
  bank_name VARCHAR(255) NOT NULL,
  bank_address TEXT,
  beneficiary_name VARCHAR(255) NOT NULL,
  swift_code VARCHAR(11) NOT NULL CHECK (swift_code ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  iban_aed VARCHAR(34),
  iban_usd VARCHAR(34),
  iban_eur VARCHAR(34),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_destinations_code ON bank_destinations(bank_code);
CREATE INDEX idx_bank_destinations_active ON bank_destinations(is_active);

COMMENT ON TABLE bank_destinations IS 'Bank destination configurations for settlement instructions';
COMMENT ON COLUMN bank_destinations.bank_code IS 'Unique bank identifier code (e.g., ENBD)';
COMMENT ON COLUMN bank_destinations.swift_code IS 'SWIFT/BIC code of the bank';
COMMENT ON COLUMN bank_destinations.iban_aed IS 'IBAN for AED currency transfers';
COMMENT ON COLUMN bank_destinations.iban_usd IS 'IBAN for USD currency transfers';
COMMENT ON COLUMN bank_destinations.iban_eur IS 'IBAN for EUR currency transfers';

