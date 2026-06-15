-- Drop linkedTestIds column from tests table (no longer used)
ALTER TABLE `tests` DROP COLUMN IF EXISTS `linkedTestIds`;

-- Add location field to Patient table if not exists
ALTER TABLE `patients` ADD COLUMN IF NOT EXISTS `location` VARCHAR(255) NULL DEFAULT NULL;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS `idx_patient_location` ON `patients`(`location`);
