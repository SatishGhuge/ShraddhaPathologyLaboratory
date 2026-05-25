-- Add location field to Patient table
ALTER TABLE `Patient` ADD COLUMN `location` VARCHAR(255) NULL DEFAULT NULL;

-- Add index for location queries
CREATE INDEX `idx_patient_location` ON `Patient`(`location`);
