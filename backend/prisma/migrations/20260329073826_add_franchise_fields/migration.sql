-- AlterTable
ALTER TABLE `franchise list` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `code` VARCHAR(191) NULL,
    ADD COLUMN `date` DATETIME(3) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `mobile` VARCHAR(191) NULL;
