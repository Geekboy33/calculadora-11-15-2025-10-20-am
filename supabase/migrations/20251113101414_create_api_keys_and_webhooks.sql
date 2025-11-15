/*
  # API Keys and Webhook System for VUSD1 Module
  
  ## Overview
  Creates a secure API key management system for external integrations with the VUSD1 module.
  
  ## New Tables
  
  ### `api_keys`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Owner of the API key
  - `name` (text) - Friendly name for the key
  - `api_key` (text, unique) - Public API key (format: luxliq_live_xxxxx)
  - `api_secret` (text) - Hashed secret key
  - `status` (text) - active, revoked, expired
  - `permissions` (jsonb) - Granular permissions (read_pledges, create_pledges, etc.)
  - `rate_limit` (integer) - Requests per minute
  - `last_used_at` (timestamptz) - Last usage timestamp
  - `expires_at` (timestamptz) - Expiration date (optional)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `api_requests`
  - `id` (uuid, primary key) - Unique identifier
  - `api_key_id` (uuid, foreign key) - API key used
  - `endpoint` (text) - Endpoint called
  - `method` (text) - HTTP method (GET, POST, etc.)
  - `ip_address` (text) - Request IP
  - `user_agent` (text) - User agent string
  - `status_code` (integer) - Response status code
  - `response_time_ms` (integer) - Response time in milliseconds
  - `created_at` (timestamptz) - Request timestamp
  
  ### `webhooks`
  - `id` (uuid, primary key) - Unique identifier
  - `api_key_id` (uuid, foreign key) - Associated API key
  - `url` (text) - Webhook URL
  - `events` (text[]) - Events to trigger on (pledge_created, pledge_released, etc.)
  - `status` (text) - active, inactive
  - `secret` (text) - Webhook signing secret
  - `created_at` (timestamptz) - Creation timestamp
  
  ## Security
  - Enable RLS on all tables
  - Users can only access their own API keys
  - API requests are logged for auditing
  - Secrets are hashed using pgcrypto
  
  ## Indexes
  - Index on api_key for fast lookups
  - Index on api_key_id in api_requests for analytics
  - Index on created_at for time-based queries
*/

-- Enable pgcrypto extension for secure hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  api_key text UNIQUE NOT NULL,
  api_secret text NOT NULL, -- Will store hashed version
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  permissions jsonb NOT NULL DEFAULT '{"read_pledges": true, "create_pledges": false, "update_pledges": false, "delete_pledges": false}'::jsonb,
  rate_limit integer NOT NULL DEFAULT 60, -- requests per minute
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- API Requests Log Table
CREATE TABLE IF NOT EXISTS api_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  ip_address text,
  user_agent text,
  status_code integer NOT NULL,
  response_time_ms integer,
  request_body jsonb,
  response_body jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['pledge_created', 'pledge_released', 'pledge_updated'],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  secret text NOT NULL, -- Webhook signing secret
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_requests_api_key_id ON api_requests(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_api_key_id ON webhooks(api_key_id);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys

-- Users can view their own API keys
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for api_requests

-- Users can view their own API request logs
CREATE POLICY "Users can view own API requests"
  ON api_requests FOR SELECT
  TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

-- Service role can insert API request logs (for edge functions)
CREATE POLICY "Service can insert API requests"
  ON api_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for webhooks

-- Users can view their own webhooks
CREATE POLICY "Users can view own webhooks"
  ON webhooks FOR SELECT
  TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

-- Users can create webhooks for their API keys
CREATE POLICY "Users can create own webhooks"
  ON webhooks FOR INSERT
  TO authenticated
  WITH CHECK (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

-- Users can update their own webhooks
CREATE POLICY "Users can update own webhooks"
  ON webhooks FOR UPDATE
  TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own webhooks
CREATE POLICY "Users can delete own webhooks"
  ON webhooks FOR DELETE
  TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  key_prefix text := 'luxliq_live_';
  random_part text;
BEGIN
  random_part := encode(gen_random_bytes(24), 'hex');
  RETURN key_prefix || random_part;
END;
$$;

-- Function to hash API secret
CREATE OR REPLACE FUNCTION hash_api_secret(secret text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(secret, gen_salt('bf', 10));
END;
$$;

-- Function to verify API secret
CREATE OR REPLACE FUNCTION verify_api_secret(secret text, hashed text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN hashed = crypt(secret, hashed);
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old API request logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_requests()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM api_requests
  WHERE created_at < now() - interval '30 days';
END;
$$;