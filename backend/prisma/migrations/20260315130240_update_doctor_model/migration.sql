-- AlterTable
ALTER TABLE `doctors` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `allowBalance` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `compliment` DOUBLE NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'Doctor';
