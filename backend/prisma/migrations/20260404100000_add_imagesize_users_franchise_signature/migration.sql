-- Step 1: Add imageSize column to tests table (if not exists)
ALTER TABLE `tests` ADD COLUMN IF NOT EXISTS `imageSize` VARCHAR(191) NULL DEFAULT '800|600';

-- Step 2: Create users table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `center` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `password` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Create signatures table
CREATE TABLE IF NOT EXISTS `signatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `specialty` VARCHAR(191) NOT NULL,
    `doctorName` VARCHAR(191) NULL,
    `signatureText` TEXT NULL,
    `signatureImage` TEXT NULL,
    `activeFrom` DATETIME(3) NULL,
    `expiredOn` DATETIME(3) NULL,
    `width` INTEGER NULL DEFAULT 150,
    `height` INTEGER NULL DEFAULT 80,
    `sortOrder` INTEGER NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 4: Add signatureId column to tests table (if not exists)
ALTER TABLE `tests` ADD COLUMN IF NOT EXISTS `signatureId` INTEGER NULL;

-- Step 5: Drop existing foreign key if it exists, then add it
ALTER TABLE `tests` DROP FOREIGN KEY IF EXISTS `tests_signatureId_fkey`;
ALTER TABLE `tests` ADD CONSTRAINT `tests_signatureId_fkey`
    FOREIGN KEY (`signatureId`) REFERENCES `signatures`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Drop old foreign key on test_charges referencing "franchise list"
ALTER TABLE `test_charges` DROP FOREIGN KEY `test_charges_franchiseId_fkey`;

-- Step 7: Rename "franchise list" table to "franchise"
RENAME TABLE `franchise list` TO `franchise`;

-- Step 8: Re-add foreign key pointing to renamed "franchise" table
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey`
    FOREIGN KEY (`franchiseId`) REFERENCES `franchise`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
