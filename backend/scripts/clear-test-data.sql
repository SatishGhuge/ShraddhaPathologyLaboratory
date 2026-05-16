-- ============================================
-- Clear All Test Data - SQL Script
-- ============================================
-- This script deletes all test data from the database
-- Run this in MySQL Workbench or command line
-- ============================================

-- Show current counts before deletion
SELECT 'Current Data Counts:' as '';
SELECT COUNT(*) as 'Tests' FROM tests;
SELECT COUNT(*) as 'Test Categories/Parameters' FROM test_categories;
SELECT COUNT(*) as 'Test Charges' FROM test_charges;
SELECT COUNT(*) as 'Corporate Charges' FROM corporate_charges;
SELECT COUNT(*) as 'Package Tests' FROM package_tests;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all test categories and parameters (includes age ranges, range values)
DELETE FROM test_categories;
SELECT 'Deleted all test categories and parameters' as 'Status';

-- Delete all test charges
DELETE FROM test_charges;
SELECT 'Deleted all test charges' as 'Status';

-- Delete all corporate charges
DELETE FROM corporate_charges;
SELECT 'Deleted all corporate charges' as 'Status';

-- Delete all package tests
DELETE FROM package_tests;
SELECT 'Deleted all package tests' as 'Status';

-- Delete all tests
DELETE FROM tests;
SELECT 'Deleted all tests' as 'Status';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Show counts after deletion (should all be 0)
SELECT 'Data After Deletion:' as '';
SELECT COUNT(*) as 'Tests' FROM tests;
SELECT COUNT(*) as 'Test Categories/Parameters' FROM test_categories;
SELECT COUNT(*) as 'Test Charges' FROM test_charges;
SELECT COUNT(*) as 'Corporate Charges' FROM corporate_charges;
SELECT COUNT(*) as 'Package Tests' FROM package_tests;

SELECT 'All test data has been deleted successfully!' as 'Result';
