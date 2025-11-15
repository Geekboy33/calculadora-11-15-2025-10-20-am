/*
  # API VUSD1 - Sistema de Pledges, Payouts y Attestations
  
  1. Nuevas Tablas
    - `api_pledges` - Pledges/Lockbox de USD off-chain para VUSD
    - `api_payouts` - Retiros VUSD→USD que consumen pledges
    - `api_events` - Log de eventos de auditoría
    - `api_idempotency_keys` - Control de idempotencia para operaciones POST
    - `api_attestations` - Attestations firmadas de reservas
    - `api_webhooks_queue` - Cola de webhooks pendientes con reintentos
    
  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas permisivas para desarrollo (ajustar en producción)
    - Índices para performance
    
  3. Características
    - Trazabilidad completa (who, when, what, hash, signature)
    - Soporte para webhooks HMAC
    - Sistema de reintentos exponenciales
    - Reconciliación diaria
*/

-- =====================================================
-- TABLA: api_pledges
-- Pledges/Lockbox de USD off-chain para calcular circulating_cap
-- =====================================================
CREATE TABLE IF NOT EXISTS api_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONSUMED')),
  amount DECIMAL(20,2) NOT NULL CHECK (amount > 0),
  available DECIMAL(20,2) NOT NULL CHECK (available >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  beneficiary TEXT NOT NULL,
  external_ref TEXT,
  segregation_priority INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  document_hash TEXT,
  hmac_signature TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Índices para api_pledges
CREATE INDEX IF NOT EXISTS idx_api_pledges_status ON api_pledges(status);
CREATE INDEX IF NOT EXISTS idx_api_pledges_currency ON api_pledges(currency);
CREATE INDEX IF NOT EXISTS idx_api_pledges_beneficiary ON api_pledges(beneficiary);
CREATE INDEX IF NOT EXISTS idx_api_pledges_external_ref ON api_pledges(external_ref);
CREATE INDEX IF NOT EXISTS idx_api_pledges_created_at ON api_pledges(created_at DESC);

-- =====================================================
-- TABLA: api_payouts
-- Payouts/retiros VUSD→USD que consumen pledges
-- =====================================================
CREATE TABLE IF NOT EXISTS api_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id TEXT UNIQUE NOT NULL,
  pledge_id TEXT NOT NULL REFERENCES api_pledges(pledge_id),
  external_ref TEXT UNIQUE NOT NULL,
  amount DECIMAL(20,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  destination_account TEXT NOT NULL,
  destination_details JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para api_payouts
CREATE INDEX IF NOT EXISTS idx_api_payouts_status ON api_payouts(status);
CREATE INDEX IF NOT EXISTS idx_api_payouts_pledge_id ON api_payouts(pledge_id);
CREATE INDEX IF NOT EXISTS idx_api_payouts_external_ref ON api_payouts(external_ref);
CREATE INDEX IF NOT EXISTS idx_api_payouts_created_at ON api_payouts(created_at DESC);

-- =====================================================
-- TABLA: api_events
-- Log de auditoría de todos los eventos del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS api_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'PLEDGE_CREATED', 'PLEDGE_ADJUSTED', 'PLEDGE_RELEASED', 'PLEDGE_EXPIRED',
    'PAYOUT_CREATED', 'PAYOUT_COMPLETED', 'PAYOUT_FAILED',
    'WEBHOOK_SENT', 'WEBHOOK_RETRY', 'WEBHOOK_FAILED',
    'ATTESTATION_CREATED', 'RECONCILIATION_GENERATED'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PLEDGE', 'PAYOUT', 'WEBHOOK', 'ATTESTATION', 'RECONCILIATION')),
  entity_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature TEXT,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para api_events
CREATE INDEX IF NOT EXISTS idx_api_events_event_type ON api_events(event_type);
CREATE INDEX IF NOT EXISTS idx_api_events_entity_type ON api_events(entity_type);
CREATE INDEX IF NOT EXISTS idx_api_events_entity_id ON api_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_api_events_created_at ON api_events(created_at DESC);

-- =====================================================
-- TABLA: api_idempotency_keys
-- Control de idempotencia para operaciones POST
-- =====================================================
CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

-- Índice para api_idempotency_keys
CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_key ON api_idempotency_keys(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_expires_at ON api_idempotency_keys(expires_at);

-- =====================================================
-- TABLA: api_attestations
-- Attestations firmadas de reservas
-- =====================================================
CREATE TABLE IF NOT EXISTS api_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attestation_id TEXT UNIQUE NOT NULL,
  as_of_date DATE NOT NULL,
  circulating_cap DECIMAL(20,2) NOT NULL CHECK (circulating_cap >= 0),
  pledged_usd DECIMAL(20,2) NOT NULL CHECK (pledged_usd >= 0),
  unpledged_usd DECIMAL(20,2) NOT NULL CHECK (unpledged_usd >= 0),
  total_reserves DECIMAL(20,2) NOT NULL CHECK (total_reserves >= 0),
  document_hash TEXT NOT NULL,
  document_url TEXT,
  signature TEXT NOT NULL,
  signing_key_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

-- Índices para api_attestations
CREATE INDEX IF NOT EXISTS idx_api_attestations_as_of_date ON api_attestations(as_of_date DESC);
CREATE INDEX IF NOT EXISTS idx_api_attestations_created_at ON api_attestations(created_at DESC);

-- =====================================================
-- TABLA: api_webhooks_queue
-- Cola de webhooks pendientes con reintentos
-- =====================================================
CREATE TABLE IF NOT EXISTS api_webhooks_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  hmac_signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'EXPIRED')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 10,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT now(),
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

-- Índices para api_webhooks_queue
CREATE INDEX IF NOT EXISTS idx_api_webhooks_status ON api_webhooks_queue(status);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_next_retry ON api_webhooks_queue(next_retry_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_api_webhooks_created_at ON api_webhooks_queue(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- Políticas permisivas para desarrollo (ajustar en producción)
-- =====================================================

-- api_pledges policies
ALTER TABLE api_pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read pledges"
  ON api_pledges FOR SELECT USING (true);

CREATE POLICY "Allow all to insert pledges"
  ON api_pledges FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to update pledges"
  ON api_pledges FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all to delete pledges"
  ON api_pledges FOR DELETE USING (true);

-- api_payouts policies
ALTER TABLE api_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read payouts"
  ON api_payouts FOR SELECT USING (true);

CREATE POLICY "Allow all to insert payouts"
  ON api_payouts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to update payouts"
  ON api_payouts FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all to delete payouts"
  ON api_payouts FOR DELETE USING (true);

-- api_events policies
ALTER TABLE api_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read events"
  ON api_events FOR SELECT USING (true);

CREATE POLICY "Allow all to insert events"
  ON api_events FOR INSERT WITH CHECK (true);

-- api_idempotency_keys policies
ALTER TABLE api_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read idempotency keys"
  ON api_idempotency_keys FOR SELECT USING (true);

CREATE POLICY "Allow all to insert idempotency keys"
  ON api_idempotency_keys FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to update idempotency keys"
  ON api_idempotency_keys FOR UPDATE USING (true) WITH CHECK (true);

-- api_attestations policies
ALTER TABLE api_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read attestations"
  ON api_attestations FOR SELECT USING (true);

CREATE POLICY "Allow all to insert attestations"
  ON api_attestations FOR INSERT WITH CHECK (true);

-- api_webhooks_queue policies
ALTER TABLE api_webhooks_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read webhooks"
  ON api_webhooks_queue FOR SELECT USING (true);

CREATE POLICY "Allow all to insert webhooks"
  ON api_webhooks_queue FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all to update webhooks"
  ON api_webhooks_queue FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all to delete webhooks"
  ON api_webhooks_queue FOR DELETE USING (true);

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función para calcular circulating_cap (suma de available de pledges activos)
CREATE OR REPLACE FUNCTION calculate_circulating_cap()
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(available) 
     FROM api_pledges 
     WHERE status = 'ACTIVE' 
     AND currency = 'USD'),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Función para calcular total pledged USD
CREATE OR REPLACE FUNCTION calculate_pledged_usd()
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) 
     FROM api_pledges 
     WHERE status = 'ACTIVE' 
     AND currency = 'USD'),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas relevantes
DROP TRIGGER IF EXISTS update_api_pledges_updated_at ON api_pledges;
CREATE TRIGGER update_api_pledges_updated_at
  BEFORE UPDATE ON api_pledges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_payouts_updated_at ON api_payouts;
CREATE TRIGGER update_api_payouts_updated_at
  BEFORE UPDATE ON api_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
