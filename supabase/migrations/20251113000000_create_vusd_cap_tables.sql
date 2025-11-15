/*
  # VUSD Circulating Cap Module - Database Schema

  1. New Tables
    - `daes_pledges_cache`: Cache of active DAES pledges
      - `pledge_id` (text, primary key) - Unique pledge identifier
      - `status` (text) - ACTIVE, USED, EXPIRED, RELEASED
      - `amount` (numeric) - Total pledge amount
      - `available` (numeric) - Available amount for transfers
      - `currency` (text) - Currency code (USD, EUR, etc)
      - `beneficiary` (text) - Pledge beneficiary
      - `expires_at` (timestamptz, nullable) - Expiration date
      - `updated_at` (timestamptz) - Last update timestamp

    - `treasury_transfers`: Treasury transfers with cap enforcement
      - `id` (bigserial, primary key) - Transfer ID
      - `external_ref` (text, unique) - External reference
      - `amount` (numeric) - Transfer amount
      - `currency` (text) - Currency code
      - `from_account` (text) - Source account
      - `to_account` (text) - Destination account
      - `created_at` (timestamptz) - Creation timestamp

    - `por_publications`: Proof of Reserve publications
      - `id` (bigserial, primary key) - Publication ID
      - `circ_cap` (numeric) - Circulating cap at publication time
      - `pledged_usd` (numeric) - Total pledged USD
      - `por_asof` (timestamptz) - PoR as-of timestamp
      - `tx_id` (text, nullable) - Blockchain transaction ID
      - `created_at` (timestamptz) - Publication timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users only

  3. Indexes
    - Performance indexes on frequently queried columns
*/

-- Create daes_pledges_cache table
CREATE TABLE IF NOT EXISTS daes_pledges_cache (
  pledge_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'RELEASED')),
  amount NUMERIC(38,2) NOT NULL CHECK (amount >= 0),
  available NUMERIC(38,2) NOT NULL CHECK (available >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  beneficiary TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create treasury_transfers table
CREATE TABLE IF NOT EXISTS treasury_transfers (
  id BIGSERIAL PRIMARY KEY,
  external_ref TEXT UNIQUE NOT NULL,
  amount NUMERIC(38,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create por_publications table
CREATE TABLE IF NOT EXISTS por_publications (
  id BIGSERIAL PRIMARY KEY,
  circ_cap NUMERIC(38,2) NOT NULL CHECK (circ_cap >= 0),
  pledged_usd NUMERIC(38,2) NOT NULL CHECK (pledged_usd >= 0),
  por_asof TIMESTAMPTZ NOT NULL,
  tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE daes_pledges_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE por_publications ENABLE ROW LEVEL SECURITY;

-- Create policies for daes_pledges_cache
CREATE POLICY "Users can read active pledges"
  ON daes_pledges_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert pledges"
  ON daes_pledges_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update pledges"
  ON daes_pledges_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for treasury_transfers
CREATE POLICY "Users can read transfers"
  ON treasury_transfers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create transfers"
  ON treasury_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for por_publications
CREATE POLICY "Users can read PoR publications"
  ON por_publications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create PoR publications"
  ON por_publications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_pledges_status_currency
  ON daes_pledges_cache(status, currency)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_pledges_expires_at
  ON daes_pledges_cache(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_from_account_currency
  ON treasury_transfers(from_account, currency);

CREATE INDEX IF NOT EXISTS idx_transfers_created_at
  ON treasury_transfers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_external_ref
  ON treasury_transfers(external_ref);

CREATE INDEX IF NOT EXISTS idx_por_created_at
  ON por_publications(created_at DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daes_pledges_cache
DROP TRIGGER IF EXISTS update_daes_pledges_cache_updated_at ON daes_pledges_cache;
CREATE TRIGGER update_daes_pledges_cache_updated_at
  BEFORE UPDATE ON daes_pledges_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample pledge for testing (optional)
INSERT INTO daes_pledges_cache (
  pledge_id, status, amount, available, currency, beneficiary, updated_at
) VALUES (
  'PLG_SAMPLE_001',
  'ACTIVE',
  1000000.00,
  1000000.00,
  'USD',
  'treasury_vusd',
  NOW()
) ON CONFLICT (pledge_id) DO NOTHING;
