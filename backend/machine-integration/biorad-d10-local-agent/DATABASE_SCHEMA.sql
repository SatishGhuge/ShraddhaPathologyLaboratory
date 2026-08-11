-- ============================================================================
-- BIO-RAD D-10 LOCAL AGENT - DATABASE SCHEMA
-- ============================================================================
-- Shared offline queue with Sysmex Local Agent
-- Both machines write to the same pending_results table for unified retry logic

USE lab_agent_db;

-- ============================================================================
-- PENDING RESULTS TABLE (Shared with Sysmex)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_results (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Sample identification
  sample_id VARCHAR(100) NOT NULL,
  visit_id VARCHAR(100),
  machine_name VARCHAR(100),
  
  -- Raw ASTM transmission (for audit/debugging)
  raw_astm LONGTEXT NOT NULL,
  
  -- Parsed JSON data structure (stores complete payload)
  data_json JSON NOT NULL,
  
  -- Synchronization status: PENDING → OFFLINE_QUEUED → SYNCED / FAILED
  status ENUM('PENDING', 'OFFLINE_QUEUED', 'SYNCED', 'FAILED') DEFAULT 'PENDING',
  
  -- Retry tracking
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP NULL DEFAULT NULL,
  error_message VARCHAR(500),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP NULL DEFAULT NULL,
  
  -- Indexes for performance
  INDEX idx_status (status),
  INDEX idx_sample_id (sample_id),
  INDEX idx_visit_id (visit_id),
  INDEX idx_machine_name (machine_name),
  INDEX idx_created_at (created_at),
  INDEX idx_status_created (status, created_at),
  INDEX idx_status_retry (status, retry_count),
  INDEX idx_retry_backoff (status, last_retry_at)
);

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. SHARED QUEUE
--    - This table is shared between Sysmex (port 5100) and Bio-Rad D-10 (port 5200)
--    - Both machines run on separate local agent PCs with separate MySQL instances
--    - Each machine has its OWN lab_agent_db database on its local PC
--    - Results sync independently to the central VPS backend
--
-- 2. DATA STRUCTURE
--    - data_json stores parsed results as JSON
--    - For Bio-Rad: { "visitId", "sampleId", "results": [{ "testCode": "A1C", "parameters": {} }] }
--
-- 3. STATUS FLOW
--    PENDING → SYNCED (successful on first try)
--    PENDING → OFFLINE_QUEUED → SYNCED (network retry)
--    PENDING → OFFLINE_QUEUED → ... → FAILED (after 10 max retries)
--
-- 4. RETRY LOGIC
--    - Fetched every 30 seconds
--    - Max 10 retries per record (no exponential backoff)
--    - VPS health check prevents retry_count increment on network outage
--
-- ============================================================================
