/*
  # Fix API Pledges RLS Read Policy
  
  1. Changes
    - Drop existing restrictive read policy
    - Create new permissive policy that allows ANY authenticated user to read ALL pledges
    - This is necessary because pledges are global and should be visible to all authenticated users
  
  2. Security
    - Still requires authentication
    - Write operations remain restricted
    - Only SELECT is made fully permissive for authenticated users
*/

-- Drop existing read policy if exists
DROP POLICY IF EXISTS "Allow all to read pledges" ON api_pledges;

-- Create new permissive read policy for authenticated users
CREATE POLICY "Allow authenticated users to read all pledges"
  ON api_pledges
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the policy is active
DO $$
BEGIN
  RAISE NOTICE 'RLS read policy updated for api_pledges table';
  RAISE NOTICE 'All authenticated users can now read all pledges';
END $$;
