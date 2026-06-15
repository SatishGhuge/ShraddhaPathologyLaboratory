-- Add packageName to patient_tests
ALTER TABLE `patient_tests` ADD COLUMN `packageName` VARCHAR(191) NULL;

-- Add signatures table (was missing from migration history)
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

-- Add signatureId to tests (was missing from migration history)
ALTER TABLE `tests` ADD COLUMN IF NOT EXISTS `signatureId` INTEGER NULL;
ALTER TABLE `tests` ADD COLUMN IF NOT EXISTS `imageSize` VARCHAR(191) NULL DEFAULT '800|600';

-- Add foreign key for signatureId if not exists
ALTER TABLE `tests` ADD CONSTRAINT `tests_signatureId_fkey` 
    FOREIGN KEY (`signatureId`) REFERENCES `signatures`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS `tests_signatureId_fkey` ON `tests`(`signatureId`);
