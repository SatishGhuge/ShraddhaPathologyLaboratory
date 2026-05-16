/*
  Warnings:

  - You are about to drop the column `testIds` on the `packages` table. All the data in the column will be lost.
  - You are about to drop the `package_charges` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `package_charges` DROP FOREIGN KEY `package_charges_collectionCenterId_fkey`;

-- DropForeignKey
ALTER TABLE `package_charges` DROP FOREIGN KEY `package_charges_corporateId_fkey`;

-- DropForeignKey
ALTER TABLE `package_charges` DROP FOREIGN KEY `package_charges_franchiseId_fkey`;

-- DropForeignKey
ALTER TABLE `package_charges` DROP FOREIGN KEY `package_charges_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `package_charges` DROP FOREIGN KEY `package_charges_testId_fkey`;

-- Rename columns in patient_tests table to preserve data
ALTER TABLE `patient_tests` CHANGE COLUMN `registrationDate` `visitDate` DATETIME(3) NULL;
ALTER TABLE `patient_tests` CHANGE COLUMN `registrationTime` `visitTime` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `package_charges`;

-- CreateTable
CREATE TABLE `package_tests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `testId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `package_tests_packageId_testId_key`(`packageId`, `testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `package_tests` ADD CONSTRAINT `package_tests_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_tests` ADD CONSTRAINT `package_tests_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
