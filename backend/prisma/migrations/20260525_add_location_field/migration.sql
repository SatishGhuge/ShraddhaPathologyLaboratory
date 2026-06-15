-- Add location field to Patient table
ALTER TABLE `patients` ADD COLUMN `location` VARCHAR(255) NULL DEFAULT NULL;

-- Add index for location queries
CREATE INDEX `idx_patient_location` ON `patients`(`location`);
