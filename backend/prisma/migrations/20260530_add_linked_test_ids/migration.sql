-- Add linkedTestIds column to tests table
ALTER TABLE `tests` ADD COLUMN IF NOT EXISTS `linkedTestIds` TEXT NULL;
