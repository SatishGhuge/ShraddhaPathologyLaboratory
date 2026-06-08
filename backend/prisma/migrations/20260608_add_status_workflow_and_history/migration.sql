-- Add new columns to patient_tests for status tracking
ALTER TABLE `patient_tests` 
ADD COLUMN `lastUpdatedBy` VARCHAR(191),
ADD COLUMN `lastStatusUpdateAt` DATETIME(3);

-- Update existing status values to new format
UPDATE `patient_tests` 
SET `status` = CASE 
  WHEN `status` = 'REGISTERED' THEN 'Registered'
  WHEN `status` = 'RECEIVED' THEN 'Received'
  WHEN `status` = 'PROVISIONAL' THEN 'Entered'
  WHEN `status` = 'AUTHENTICATED' THEN 'Authorized'
  WHEN `status` = 'DELIVERED' THEN 'Delivered'
  WHEN `status` = 'RETEST' THEN 'Validation'
  WHEN `status` = 'REVERT' THEN 'Rectified'
  WHEN `status` = 'HOLD' THEN 'Validation'
  WHEN `status` = 'REJECTED' THEN 'Validation'
  ELSE 'Registered'
END,
`lastStatusUpdateAt` = NOW();

-- Create test_status_history table for audit trail
CREATE TABLE `test_status_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `patientTestId` INT NOT NULL,
  `previousStatus` VARCHAR(191) NOT NULL,
  `newStatus` VARCHAR(191) NOT NULL,
  `changedBy` VARCHAR(191),
  `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `triggerType` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
  `remarks` LONGTEXT,
  
  PRIMARY KEY (`id`),
  INDEX `test_status_history_patientTestId_idx` (`patientTestId`),
  INDEX `test_status_history_changedAt_idx` (`changedAt`),
  
  CONSTRAINT `test_status_history_patientTestId_fkey` 
    FOREIGN KEY (`patientTestId`) 
    REFERENCES `patient_tests` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add index for status column
CREATE INDEX `patient_tests_status_idx` ON `patient_tests` (`status`);
