/*
  # Create DAES Pledges Cache Table

  1. New Tables
    - `daes_pledges_cache`
      - `id` (uuid, primary key)
      - `pledge_id` (text, unique)
      - `status` (text)
      - `amount` (numeric)
      - `available` (numeric)
      - `currency` (text)
      - `beneficiary` (text)
      - `expires_at` (timestamptz, nullable)
      - `updated_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `daes_pledges_cache` table
    - Add policy for authenticated users to read all data
    - Add policy for authenticated users to insert/update their own pledges
*/

CREATE TABLE IF NOT EXISTS daes_pledges_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  amount numeric NOT NULL,
  available numeric NOT NULL,
  currency text NOT NULL,
  beneficiary text NOT NULL,
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE daes_pledges_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all pledges
CREATE POLICY "Authenticated users can read all pledges"
  ON daes_pledges_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert pledges
CREATE POLICY "Authenticated users can insert pledges"
  ON daes_pledges_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update pledges
CREATE POLICY "Authenticated users can update pledges"
  ON daes_pledges_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete pledges
CREATE POLICY "Authenticated users can delete pledges"
  ON daes_pledges_cache
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daes_pledges_pledge_id ON daes_pledges_cache(pledge_id);
CREATE INDEX IF NOT EXISTS idx_daes_pledges_status ON daes_pledges_cache(status);
CREATE INDEX IF NOT EXISTS idx_daes_pledges_currency ON daes_pledges_cache(currency);
