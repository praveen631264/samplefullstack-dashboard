-- =============================================================================
-- Test Orchestrator v2.0 - DDL Schema
-- Database: H2 (dev) / PostgreSQL (production)
-- All timestamps are stored in EST (America/New_York)
-- =============================================================================

-- Sample Events (Corporate Action Events)
CREATE TABLE IF NOT EXISTS sample_events (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id        VARCHAR(255) UNIQUE,
    cusip           VARCHAR(255) NOT NULL,
    event_type      VARCHAR(255),
    principal_rate  DECIMAL(15, 4),
    premium_rate    DECIMAL(15, 4),
    security_called_amount DECIMAL(20, 2),
    security_description   VARCHAR(500),
    payable_date    VARCHAR(255),
    status          VARCHAR(255) NOT NULL,
    remarks         TEXT,
    confidence_score DOUBLE,
    source1_data    TEXT,
    source2_data    TEXT,
    workflow_id     VARCHAR(255),
    created_at      TIMESTAMP
);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
    workflow_id       VARCHAR(255) PRIMARY KEY,
    description       VARCHAR(255),
    status            VARCHAR(255),
    source1_file_name VARCHAR(255),
    source2_file_name VARCHAR(255),
    source1_file_data BLOB,
    source2_file_data BLOB,
    event_id          VARCHAR(255),
    cusip             VARCHAR(255),
    event_type        VARCHAR(255),
    created_at        TIMESTAMP,
    updated_at        TIMESTAMP
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_trails (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_id VARCHAR(255),
    action      VARCHAR(255),
    details     TEXT,
    created_at  TIMESTAMP
);

-- AI Agent Configurations
CREATE TABLE IF NOT EXISTS agent_configs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_name      VARCHAR(255) NOT NULL UNIQUE,
    maker_prompt    TEXT,
    checker_prompt  TEXT,
    compare_prompt  TEXT,
    maker_file_name VARCHAR(255),
    maker_file_data BLOB,
    checker_file_name VARCHAR(255),
    checker_file_data BLOB,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_event_id ON sample_events (event_id);
CREATE INDEX IF NOT EXISTS idx_events_cusip ON sample_events (cusip);
CREATE INDEX IF NOT EXISTS idx_events_status ON sample_events (status);
CREATE INDEX IF NOT EXISTS idx_events_workflow_id ON sample_events (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_executions (status);
CREATE INDEX IF NOT EXISTS idx_audit_workflow_id ON audit_trails (workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_trails (created_at);
CREATE INDEX IF NOT EXISTS idx_agent_name ON agent_configs (agent_name);
