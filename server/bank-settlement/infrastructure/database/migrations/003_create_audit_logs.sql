-- Migration: Create settlement_audit_logs table
-- Version: 003
-- Description: Stores audit trail for all settlement operations

CREATE TABLE IF NOT EXISTS settlement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  performed_by VARCHAR(100) NOT NULL,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (settlement_id) REFERENCES bank_settlement_instructions(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_settlement_id ON settlement_audit_logs(settlement_id);
CREATE INDEX idx_audit_timestamp ON settlement_audit_logs(timestamp);
CREATE INDEX idx_audit_action_type ON settlement_audit_logs(action_type);
CREATE INDEX idx_audit_performed_by ON settlement_audit_logs(performed_by);

COMMENT ON TABLE settlement_audit_logs IS 'Audit trail for all settlement instruction operations';
COMMENT ON COLUMN settlement_audit_logs.action_type IS 'Type of action (CREATE_INSTRUCTION, UPDATE_STATUS, etc.)';
COMMENT ON COLUMN settlement_audit_logs.metadata IS 'Additional action metadata in JSON format';

