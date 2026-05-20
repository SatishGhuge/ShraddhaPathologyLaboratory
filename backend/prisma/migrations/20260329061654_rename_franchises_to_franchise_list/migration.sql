/*
  Warnings:

  - You are about to drop the `franchises` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `test_charges` DROP FOREIGN KEY `test_charges_franchiseId_fkey`;

-- DropTable
DROP TABLE `franchises`;

-- CreateTable
CREATE TABLE `franchise list` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `franchise list_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchise list`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
