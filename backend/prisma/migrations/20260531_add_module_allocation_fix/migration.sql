-- Check if column exists, if not add it
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `moduleAllocation` LONGTEXT DEFAULT NULL;
