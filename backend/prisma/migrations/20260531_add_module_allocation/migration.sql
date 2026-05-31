-- Add module allocation columns to users table
ALTER TABLE `users` ADD COLUMN `moduleAllocation` LONGTEXT DEFAULT NULL AFTER `isActive`;
