-- Migration: Create bank_settlement_instructions table
-- Version: 002
-- Description: Stores bank settlement instructions

CREATE TABLE IF NOT EXISTS bank_settlement_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daes_reference_id VARCHAR(50) NOT NULL UNIQUE,
  bank_code VARCHAR(20) NOT NULL,
  amount DECIMAL(20, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('AED', 'USD', 'EUR')),
  beneficiary_name VARCHAR(255) NOT NULL,
  beneficiary_iban VARCHAR(34) NOT NULL,
  swift_code VARCHAR(11) NOT NULL,
  reference_text VARCHAR(140),
  ledger_debit_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SENT', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  enbd_transaction_reference VARCHAR(100),
  executed_by VARCHAR(100),
  executed_at TIMESTAMP,
  failure_reason TEXT,
  FOREIGN KEY (bank_code) REFERENCES bank_destinations(bank_code) ON DELETE RESTRICT
);

CREATE INDEX idx_settlement_status ON bank_settlement_instructions(status);
CREATE INDEX idx_settlement_currency ON bank_settlement_instructions(currency);
CREATE INDEX idx_settlement_executed_at ON bank_settlement_instructions(executed_at);
CREATE INDEX idx_settlement_daes_ref ON bank_settlement_instructions(daes_reference_id);
CREATE INDEX idx_settlement_created_at ON bank_settlement_instructions(created_at);
CREATE INDEX idx_settlement_bank_code ON bank_settlement_instructions(bank_code);

COMMENT ON TABLE bank_settlement_instructions IS 'Bank settlement instructions for external bank transfers';
COMMENT ON COLUMN bank_settlement_instructions.daes_reference_id IS 'Unique DAES reference ID (DAES-SET-YYYYMMDD-XXXXXX)';
COMMENT ON COLUMN bank_settlement_instructions.ledger_debit_id IS 'ID of the corresponding ledger debit entry in DAES';
COMMENT ON COLUMN bank_settlement_instructions.enbd_transaction_reference IS 'Bank transaction reference (filled after manual execution)';

