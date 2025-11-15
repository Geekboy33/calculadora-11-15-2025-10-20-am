/*
  # Performance Optimization - Additional Indexes

  1. New Indexes
    - Add composite indexes for frequent query patterns
    - Add indexes for foreign keys
    - Add indexes for timestamp-based queries
    - Add partial indexes for status-based queries

  2. Performance Improvements
    - Speed up balance lookups by user and file hash
    - Optimize transaction history queries
    - Improve processing state queries
    - Accelerate ledger account searches

  3. Notes
    - All indexes use IF NOT EXISTS to prevent errors
    - Indexes are optimized for read-heavy workloads
    - Composite indexes follow query patterns from the application
*/

-- =====================================================
-- CURRENCY BALANCES OPTIMIZATIONS
-- =====================================================

-- Composite index for common lookup pattern
CREATE INDEX IF NOT EXISTS idx_currency_balances_user_status
  ON currency_balances(user_id, status, last_updated DESC);

-- Index for currency-based filtering
CREATE INDEX IF NOT EXISTS idx_currency_balances_currency
  ON currency_balances(currency)
  WHERE status = 'completed';

-- Index for amount-based sorting
CREATE INDEX IF NOT EXISTS idx_currency_balances_amount
  ON currency_balances(total_amount DESC)
  WHERE status = 'completed';

-- =====================================================
-- PROCESSING STATE OPTIMIZATIONS
-- =====================================================

-- Composite index for active processing lookup
CREATE INDEX IF NOT EXISTS idx_processing_state_user_active
  ON processing_state(user_id, last_update_time DESC)
  WHERE status IN ('processing', 'paused');

-- Index for file hash lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_processing_state_file_hash
  ON processing_state(file_hash, user_id)
  WHERE status IN ('processing', 'paused');

-- Index for sync status monitoring
CREATE INDEX IF NOT EXISTS idx_processing_state_sync_status
  ON processing_state(sync_status, last_sync_time DESC)
  WHERE sync_status IN ('syncing', 'error');

-- =====================================================
-- TRANSACTIONS HISTORY OPTIMIZATIONS
-- =====================================================

-- Composite index for user transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_history_user_time
  ON transactions_history(user_id, created_at DESC);

-- Index for file-based transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_history_file
  ON transactions_history(file_hash, transaction_type);

-- Index for currency-based filtering
CREATE INDEX IF NOT EXISTS idx_transactions_history_currency
  ON transactions_history(currency, amount DESC)
  WHERE amount > 0;

-- =====================================================
-- LEDGER ACCOUNTS OPTIMIZATIONS
-- =====================================================

-- Composite index for user account lookups
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_user_currency
  ON ledger_accounts(user_id, currency, updated_at DESC);

-- Index for balance-based sorting
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_balance
  ON ledger_accounts(balance DESC)
  WHERE balance > 0;

-- Index for account number searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_account_number
  ON ledger_accounts(LOWER(account_number));

-- =====================================================
-- DAES PLEDGES OPTIMIZATIONS
-- =====================================================

-- Composite index for user pledge lookups
CREATE INDEX IF NOT EXISTS idx_daes_pledges_user_status
  ON daes_pledges_cache(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for custody account linkage
CREATE INDEX IF NOT EXISTS idx_daes_pledges_custody_account
  ON daes_pledges_cache(custody_account_id)
  WHERE custody_account_id IS NOT NULL AND deleted_at IS NULL;

-- Index for amount-based filtering
CREATE INDEX IF NOT EXISTS idx_daes_pledges_amount
  ON daes_pledges_cache(pledged_amount DESC)
  WHERE deleted_at IS NULL;

-- =====================================================
-- VUSD CAP OPTIMIZATIONS
-- =====================================================

-- Composite index for cap version lookups
CREATE INDEX IF NOT EXISTS idx_vusd_cap_versions_active
  ON vusd_cap_versions(is_active, created_at DESC)
  WHERE is_active = true;

-- Index for cap allocations by version
CREATE INDEX IF NOT EXISTS idx_vusd_cap_allocations_version
  ON vusd_cap_allocations(version_id, percentage DESC);

-- Index for allocation token searches
CREATE INDEX IF NOT EXISTS idx_vusd_cap_allocations_token
  ON vusd_cap_allocations(LOWER(token_mint));

-- =====================================================
-- API VUSD1 OPTIMIZATIONS
-- =====================================================

-- Composite index for custody account lookups
CREATE INDEX IF NOT EXISTS idx_custody_accounts_user_currency
  ON api_vusd1_custody_accounts(user_id, currency, created_at DESC);

-- Index for account number uniqueness and searches
CREATE INDEX IF NOT EXISTS idx_custody_accounts_account_number
  ON api_vusd1_custody_accounts(LOWER(account_number))
  WHERE deleted_at IS NULL;

-- Composite index for pledge lookups
CREATE INDEX IF NOT EXISTS idx_custody_pledges_account_status
  ON api_vusd1_pledges(custody_account_id, status, created_at DESC);

-- Index for pledge amount filtering
CREATE INDEX IF NOT EXISTS idx_custody_pledges_amount
  ON api_vusd1_pledges(pledged_amount DESC)
  WHERE status = 'active';

-- =====================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

ANALYZE currency_balances;
ANALYZE processing_state;
ANALYZE transactions_history;
ANALYZE ledger_accounts;
ANALYZE daes_pledges_cache;
ANALYZE vusd_cap_versions;
ANALYZE vusd_cap_allocations;
ANALYZE api_vusd1_custody_accounts;
ANALYZE api_vusd1_pledges;

-- =====================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_currency_balances_user_status IS 'Optimizes user balance queries with status filtering';
COMMENT ON INDEX idx_processing_state_user_active IS 'Speeds up active processing lookups per user';
COMMENT ON INDEX idx_transactions_history_user_time IS 'Accelerates user transaction history queries';
COMMENT ON INDEX idx_ledger_accounts_user_currency IS 'Improves multi-currency account lookups';
COMMENT ON INDEX idx_daes_pledges_user_status IS 'Optimizes pledge queries excluding deleted records';
COMMENT ON INDEX idx_custody_accounts_user_currency IS 'Speeds up custody account lookups by currency';
