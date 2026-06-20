-- Add barcode_status column to patient_tests table
ALTER TABLE `patient_tests` ADD COLUMN `barcode_status` VARCHAR(191) NOT NULL DEFAULT 'Unprinted' AFTER `status`;

-- Create index for barcode_status for faster queries
CREATE INDEX `patient_tests_barcode_status_idx` ON `patient_tests` (`barcode_status`);
