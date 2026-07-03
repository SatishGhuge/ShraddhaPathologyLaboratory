-- CreateTable doctor_test_charges
CREATE TABLE `doctor_test_charges` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `testId` INT NOT NULL,
    `doctorId` INT NOT NULL,
    `b2cCharge` DOUBLE NOT NULL,
    `b2bCharge` DOUBLE NOT NULL,
    `discountPercent` DOUBLE DEFAULT 0,
    `specialPrice` DOUBLE,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doctor_test_charges_testId_doctorId_key`(`testId`, `doctorId`),
    INDEX `doctor_test_charges_doctorId_fkey`(`doctorId`),
    CONSTRAINT `doctor_test_charges_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests` (`id`) ON DELETE CASCADE,
    CONSTRAINT `doctor_test_charges_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
