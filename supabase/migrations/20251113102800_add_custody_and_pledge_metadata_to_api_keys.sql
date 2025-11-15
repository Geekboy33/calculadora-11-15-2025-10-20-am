/*
  # Add Custody Account and Pledge Metadata to API Keys
  
  ## Changes
  
  Adds metadata fields to api_keys table to store associated:
  - Custody account information
  - Pledge information
  
  This allows storing context when generating API keys without requiring foreign keys.
  
  ## New Columns
  
  ### `api_keys` table additions:
  - `associated_custody_account` (jsonb, nullable) - Custody account data
  - `associated_pledge` (jsonb, nullable) - Pledge data
  
  ## Security
  - Maintains existing RLS policies
*/

-- Add associated_custody_account column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'associated_custody_account'
  ) THEN
    ALTER TABLE api_keys 
    ADD COLUMN associated_custody_account jsonb DEFAULT NULL;
  END IF;
END $$;

-- Add associated_pledge column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'associated_pledge'
  ) THEN
    ALTER TABLE api_keys 
    ADD COLUMN associated_pledge jsonb DEFAULT NULL;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN api_keys.associated_custody_account IS 'Optional: Associated custody account information for this API key';
COMMENT ON COLUMN api_keys.associated_pledge IS 'Optional: Associated pledge information for this API key';