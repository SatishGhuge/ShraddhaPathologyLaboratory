-- Normalize all status values to proper format (FirstLetter Capitalization)
-- This ensures consistency across the system

-- Update any uppercase status values to proper case
UPDATE `patient_tests` 
SET `status` = CASE 
  WHEN `status` = 'REGISTERED' THEN 'Registered'
  WHEN `status` = 'RECEIVED' THEN 'Received'
  WHEN `status` = 'PROVISIONAL' THEN 'Entered'
  WHEN `status` = 'ENTERED' THEN 'Entered'
  WHEN `status` = 'AUTHENTICATED' THEN 'Authorized'
  WHEN `status` = 'AUTHORIZED' THEN 'Authorized'
  WHEN `status` = 'VALIDATION' THEN 'Validation'
  WHEN `status` = 'VALIDATED' THEN 'Validation'
  WHEN `status` = 'DELIVERED' THEN 'Delivered'
  WHEN `status` = 'RETEST' THEN 'Rectified'
  WHEN `status` = 'RECTIFIED' THEN 'Rectified'
  WHEN `status` = 'REVERT' THEN 'Rectified'
  WHEN `status` = 'HOLD' THEN 'Validation'
  WHEN `status` = 'REJECTED' THEN 'Validation'
  ELSE `status`
END
WHERE `status` IN ('REGISTERED', 'RECEIVED', 'PROVISIONAL', 'ENTERED', 'AUTHENTICATED', 'AUTHORIZED', 'VALIDATION', 'VALIDATED', 'DELIVERED', 'RETEST', 'RECTIFIED', 'REVERT', 'HOLD', 'REJECTED');
