-- =============================================================================
-- Test Orchestrator v2.0 - DML Seed Data
-- Initial sample data for development/testing
-- =============================================================================

-- Sample Events (only inserted if table is empty)
INSERT INTO sample_events (event_id, cusip, event_type, principal_rate, premium_rate, status, remarks, created_at)
SELECT 'EVT0001', 'CU0000001', 'Sample Data Point', 100.00, 102.00, 'Verified', 'Initial sample data', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM sample_events WHERE event_id = 'EVT0001');

INSERT INTO sample_events (event_id, cusip, event_type, principal_rate, status, remarks, created_at)
SELECT 'EVT0002', 'CU0000002', 'Test Record', 50.00, 'Created', 'Pending verification in test flow', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM sample_events WHERE event_id = 'EVT0002');
