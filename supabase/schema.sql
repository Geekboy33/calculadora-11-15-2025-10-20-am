-- ═══════════════════════════════════════════════════════════════════════════════
-- LEMONMINTED PLATFORM - SUPABASE DATABASE SCHEMA
-- Real-time sync between DCB Treasury (Country A) and LemonMinted (Country B)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- LOCKS TABLE - USD Lock records from DCB Treasury
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lock_id VARCHAR(100) UNIQUE NOT NULL,
    amount_usd DECIMAL(20, 6) NOT NULL,
    beneficiary VARCHAR(100) NOT NULL,
    bank_name VARCHAR(200),
    bank_account VARCHAR(100),
    first_signature VARCHAR(200),
    second_signature VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'minted', 'rejected')),
    blockchain_tx_hash VARCHAR(100),
    blockchain_block BIGINT,
    injection_id VARCHAR(100),
    authorization_code VARCHAR(50),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    minted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Indexes for common queries
    CONSTRAINT locks_amount_positive CHECK (amount_usd > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locks_status ON locks(status);
CREATE INDEX IF NOT EXISTS idx_locks_created_at ON locks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locks_beneficiary ON locks(beneficiary);
CREATE INDEX IF NOT EXISTS idx_locks_lock_id ON locks(lock_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MINTS TABLE - VUSD Minting records
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lock_id VARCHAR(100) NOT NULL REFERENCES locks(lock_id) ON DELETE CASCADE,
    amount_vusd DECIMAL(20, 6) NOT NULL,
    beneficiary VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(100) NOT NULL UNIQUE,
    block_number BIGINT NOT NULL,
    publication_code VARCHAR(50),
    minted_by VARCHAR(100) NOT NULL,
    minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    certificate_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT mints_amount_positive CHECK (amount_vusd > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mints_lock_id ON mints(lock_id);
CREATE INDEX IF NOT EXISTS idx_mints_minted_at ON mints(minted_at DESC);
CREATE INDEX IF NOT EXISTS idx_mints_tx_hash ON mints(tx_hash);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE - Real-time alerts between platforms
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_lock', 'lock_approved', 'vusd_minted', 'alert')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    target_platform VARCHAR(20) NOT NULL CHECK (target_platform IN ('dcb', 'lemonminted', 'both')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_platform);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE NOT read;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE - Track all operations for compliance
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    performed_by VARCHAR(100),
    platform VARCHAR(20),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STATISTICS VIEW - Aggregated statistics
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW platform_statistics AS
SELECT
    COALESCE(SUM(l.amount_usd), 0) as total_locked_usd,
    COALESCE(SUM(m.amount_vusd), 0) as total_minted_vusd,
    COUNT(DISTINCT CASE WHEN l.status = 'pending' THEN l.id END) as pending_locks,
    COUNT(DISTINCT CASE WHEN l.status = 'approved' THEN l.id END) as approved_locks,
    COUNT(DISTINCT CASE WHEN l.status = 'minted' THEN l.id END) as completed_mints,
    COUNT(DISTINCT m.id) as total_mint_transactions
FROM locks l
LEFT JOIN mints m ON l.lock_id = m.lock_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENABLE REALTIME FOR ALL TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE locks;
ALTER PUBLICATION supabase_realtime ADD TABLE mints;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (both platforms)
CREATE POLICY "Enable read access for authenticated users" ON locks
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON locks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON locks
    FOR UPDATE USING (true);

CREATE POLICY "Enable read access for mints" ON mints
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for mints" ON mints
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read notifications" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "Enable insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update notifications" ON notifications
    FOR UPDATE USING (true);

CREATE POLICY "Enable insert audit_log" ON audit_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read audit_log" ON audit_log
    FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER FOR AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (action, table_name, record_id, old_data, new_data, created_at)
    VALUES (
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to locks table
CREATE TRIGGER locks_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON locks
    FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Apply trigger to mints table  
CREATE TRIGGER mints_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON mints
    FOR EACH ROW EXECUTE FUNCTION log_changes();

-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP OLD NOTIFICATIONS (Optional scheduled job)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE read = true 
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
