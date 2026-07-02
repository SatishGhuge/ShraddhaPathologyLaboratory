-- AlterTable
ALTER TABLE `patient_tests` ADD COLUMN `barcode_status` VARCHAR(191) NOT NULL DEFAULT 'Unprinted',
    MODIFY `patient_history` TEXT NULL;

-- CreateTable
CREATE TABLE `payment_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `visitId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `paymentMode` VARCHAR(191) NOT NULL,
    `paymentAmount` DOUBLE NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_transactions_visitId_idx`(`visitId`),
    INDEX `payment_transactions_patientId_idx`(`patientId`),
    INDEX `payment_transactions_paymentMode_idx`(`paymentMode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `patient_tests_barcode_status_idx` ON `patient_tests`(`barcode_status`);
