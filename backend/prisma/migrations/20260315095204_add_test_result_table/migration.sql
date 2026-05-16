-- CreateTable
CREATE TABLE `test_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patientTestId` INTEGER NOT NULL,
    `testParameterId` INTEGER NOT NULL,
    `testCategoryId` INTEGER NULL,
    `numericValue` DOUBLE NULL,
    `textValue` VARCHAR(191) NULL,
    `selectedOption` VARCHAR(191) NULL,
    `isAbnormal` BOOLEAN NOT NULL DEFAULT false,
    `isOutOfRange` BOOLEAN NOT NULL DEFAULT false,
    `isPanic` BOOLEAN NOT NULL DEFAULT false,
    `lowValue` DOUBLE NULL,
    `highValue` DOUBLE NULL,
    `referenceRange` VARCHAR(191) NULL,
    `enteredBy` VARCHAR(191) NULL,
    `verifiedBy` VARCHAR(191) NULL,
    `enteredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,

    INDEX `test_results_patientTestId_idx`(`patientTestId`),
    INDEX `test_results_testParameterId_idx`(`testParameterId`),
    UNIQUE INDEX `test_results_patientTestId_testParameterId_key`(`patientTestId`, `testParameterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_patientTestId_fkey` FOREIGN KEY (`patientTestId`) REFERENCES `patient_tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_testParameterId_fkey` FOREIGN KEY (`testParameterId`) REFERENCES `test_parameters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_testCategoryId_fkey` FOREIGN KEY (`testCategoryId`) REFERENCES `test_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
