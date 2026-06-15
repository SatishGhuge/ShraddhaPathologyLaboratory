-- AlterTable: Add fields to collection_centers (already applied to DB)
ALTER TABLE `collection_centers` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `code` VARCHAR(191) NULL,
    ADD COLUMN `date` DATETIME(3) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `mobile` VARCHAR(191) NULL;
