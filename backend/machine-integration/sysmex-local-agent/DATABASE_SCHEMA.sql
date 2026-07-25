-- ============================================================================
-- SYSMEX LOCAL AGENT - DATABASE SCHEMA
-- ============================================================================
-- This script creates the required database tables for the Sysmex local agent
-- to store pending results and track synchronization status
--
-- Run this script in your MySQL client:
--   mysql -u root -p lab_agent_db < DATABASE_SCHEMA.sql
-- ============================================================================

-- Create database (if not exists)
-- Uncomment if database doesn't exist
-- CREATE DATABASE IF NOT EXISTS lab_agent_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lab_agent_db;

-- ============================================================================
-- PENDING RESULTS TABLE
-- ============================================================================
-- Stores ASTM results from machines with synchronization status
-- Results are first saved locally, then synced to cloud backend
--
CREATE TABLE IF NOT EXISTS pending_results (
  -- Primary key
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Sample identification
  sample_id VARCHAR(100) NOT NULL,
  
  -- Raw ASTM transmission (for audit/debugging)
  raw_astm LONGTEXT NOT NULL,
  
  -- Parsed JSON data structure
  data_json JSON NOT NULL,
  
  -- Synchronization status
  -- PENDING: Just received from machine, not yet synced
  -- OFFLINE_QUEUED: Sync failed, waiting for retry
  -- SYNCED: Successfully sent to cloud backend
  status ENUM('PENDING', 'OFFLINE_QUEUED', 'SYNCED') DEFAULT 'PENDING',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP NULL DEFAULT NULL,
  
  -- Indexes for performance
  INDEX idx_status (status),
  INDEX idx_sample_id (sample_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status_created (status, created_at)
);

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- View pending results
-- SELECT * FROM pending_results WHERE status = 'PENDING';

-- View results waiting to be synced (offline queue)
-- SELECT * FROM pending_results WHERE status = 'OFFLINE_QUEUED' ORDER BY created_at ASC;

-- View successfully synced results
-- SELECT * FROM pending_results WHERE status = 'SYNCED' ORDER BY synced_at DESC LIMIT 10;

-- Check results for a specific sample
-- SELECT * FROM pending_results WHERE sample_id = 'SAMPLE123';

-- Count results by status
-- SELECT status, COUNT(*) as count FROM pending_results GROUP BY status;

-- Find old results (older than 30 days) for archival
-- SELECT * FROM pending_results WHERE status = 'SYNCED' AND synced_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- ============================================================================
-- OPTIONAL: ARCHIVAL TABLE
-- ============================================================================
-- Uncomment if you want to archive old synced results to save space
--
-- CREATE TABLE IF NOT EXISTS pending_results_archive (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   sample_id VARCHAR(100) NOT NULL,
--   raw_astm LONGTEXT NOT NULL,
--   data_json JSON NOT NULL,
--   status ENUM('PENDING', 'OFFLINE_QUEUED', 'SYNCED'),
--   created_at TIMESTAMP,
--   synced_at TIMESTAMP,
--   archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   INDEX idx_sample_id (sample_id),
--   INDEX idx_archived_at (archived_at)
-- );

-- ============================================================================
-- OPTIONAL: MACHINE STATUS TABLE (for future use)
-- ============================================================================
-- Uncomment if you want to track machine health/status
--
-- CREATE TABLE IF NOT EXISTS machine_status (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   machine_name VARCHAR(100) NOT NULL,
--   last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   total_results_sent INT DEFAULT 0,
--   last_error VARCHAR(255),
--   is_online BOOLEAN DEFAULT TRUE,
--   INDEX idx_machine_name (machine_name),
--   UNIQUE KEY unique_machine (machine_name)
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. CHARACTER SET
--    - Uses utf8mb4 for full Unicode support
--    - Needed for international patient names and special characters
--
-- 2. INDEXES
--    - idx_status: Fast filtering for pending/offline records during retry
--    - idx_sample_id: Quick lookup by sample barcode
--    - idx_created_at: Sort by insertion time
--    - idx_status_created: Composite index for common queries
--
-- 3. DATA RETENTION
--    - SYNCED records are kept for 30 days by default
--    - Consider archiving old records periodically to save disk space
--    - See ARCHIVAL queries above
--
-- 4. JSON STORAGE
--    - data_json stores parsed ASTM results as JSON
--    - Example: {"frameType":"RESULT","visitId":"V-123","parameters":{"WBC":"7.5"}}
--    - This allows flexible querying of individual parameters
--
-- 5. STATUS FLOW
--    PENDING → SYNCED (successful sync on first try)
--    PENDING → OFFLINE_QUEUED → SYNCED (sync failed, then retried successfully)
--
-- ============================================================================
