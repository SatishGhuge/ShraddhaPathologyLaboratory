-- AlterTable
ALTER TABLE `patient_tests` ADD COLUMN `isExcluded` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `codeName` VARCHAR(191) NOT NULL,
    `roleLanding` VARCHAR(191) NOT NULL DEFAULT 'dashboard',
    `viewFinancialDays` INTEGER NOT NULL DEFAULT 30,
    `discountPermissible` BOOLEAN NOT NULL DEFAULT false,
    `showB2B` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    UNIQUE INDEX `roles_codeName_key`(`codeName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
