-- Manual fix for franchise and collection_centers ID types
-- Run this in MySQL/phpMyAdmin

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Fix Franchise table
-- Step 1: Remove auto_increment
ALTER TABLE `franchise` MODIFY `id` INT NOT NULL;
-- Step 2: Drop primary key
ALTER TABLE `franchise` DROP PRIMARY KEY;
-- Step 3: Change to VARCHAR
ALTER TABLE `franchise` MODIFY `id` VARCHAR(191) NOT NULL;
-- Step 4: Add primary key back
ALTER TABLE `franchise` ADD PRIMARY KEY (`id`);
-- Step 5: Drop new_id column if exists
ALTER TABLE `franchise` DROP COLUMN IF EXISTS `new_id`;

-- Fix Collection Centers table
-- Step 1: Remove auto_increment
ALTER TABLE `collection_centers` MODIFY `id` INT NOT NULL;
-- Step 2: Drop primary key
ALTER TABLE `collection_centers` DROP PRIMARY KEY;
-- Step 3: Change to VARCHAR
ALTER TABLE `collection_centers` MODIFY `id` VARCHAR(191) NOT NULL;
-- Step 4: Add primary key back
ALTER TABLE `collection_centers` ADD PRIMARY KEY (`id`);

-- Fix test_charges foreign keys
-- Step 1: Drop foreign key constraints
ALTER TABLE `test_charges` DROP FOREIGN KEY `test_charges_franchiseId_fkey`;
ALTER TABLE `test_charges` DROP FOREIGN KEY `test_charges_collectionCenterId_fkey`;

-- Step 2: Modify columns to VARCHAR
ALTER TABLE `test_charges` MODIFY `franchiseId` VARCHAR(191) NULL;
ALTER TABLE `test_charges` MODIFY `collectionCenterId` VARCHAR(191) NULL;

-- Step 3: Re-add foreign key constraints
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_collectionCenterId_fkey` FOREIGN KEY (`collectionCenterId`) REFERENCES `collection_centers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Database fixed successfully!' as status;
