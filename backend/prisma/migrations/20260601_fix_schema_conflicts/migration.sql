-- This migration fixes conflicts from previous migrations
-- The 20260531 migration already removed franchise, corporate, and collection_center
-- So we need to ensure test_charges is in the correct state

-- Step 1: Ensure test_charges table exists with correct schema
-- Drop if exists and recreate
DROP TABLE IF EXISTS `test_charges`;

-- Step 2: Recreate test_charges with only organizationId
CREATE TABLE `test_charges` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `testId` INT NOT NULL,
  `organizationId` VARCHAR(191) NULL,
  `b2cCharge` DOUBLE NOT NULL,
  `b2bCharge` DOUBLE NOT NULL,
  `discountPercent` DOUBLE NULL DEFAULT 0,
  `specialPrice` DOUBLE NULL,
  `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `effectiveTo` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `test_charges_testId_organizationId_key`(`testId`, `organizationId`),
  INDEX `test_charges_organizationId_fkey`(`organizationId`),
  CONSTRAINT `test_charges_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `test_charges_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Ensure linkedTestIds column exists in tests table
ALTER TABLE `tests` ADD COLUMN IF NOT EXISTS `linkedTestIds` TEXT NULL;

-- Step 4: Ensure imageSize column exists in tests table
ALTER TABLE `tests` ADD COLUMN IF NOT EXISTS `imageSize` VARCHAR(191) NULL DEFAULT '800|600';
