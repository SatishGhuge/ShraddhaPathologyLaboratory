-- CreateTable
CREATE TABLE `admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_username_key`(`username`),
    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_resets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patients` (
    `patientId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `dob` DATETIME(3) NULL,
    `age` INTEGER NULL,
    `gender` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAtLocation` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`patientId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patient_tests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patientId` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `testId` INTEGER NOT NULL,
    `departmentId` INTEGER NOT NULL,
    `sample` VARCHAR(191) NOT NULL,
    `charge` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'REGISTERED',
    `result` TEXT NULL,
    `visitType` VARCHAR(191) NULL,
    `reportMode` VARCHAR(191) NULL,
    `referralDoctor` VARCHAR(191) NULL,
    `registrationDate` DATETIME(3) NULL,
    `registrationTime` VARCHAR(191) NULL,
    `sampleBarcodeNo` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `discountPercent` DOUBLE NOT NULL DEFAULT 0,
    `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    `discountRemark` VARCHAR(191) NULL,
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `balanceAmount` DOUBLE NOT NULL DEFAULT 0,
    `paymentMode` VARCHAR(191) NULL,
    `businessType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NULL,
    `testCode` VARCHAR(191) NULL,
    `departmentId` INTEGER NOT NULL,
    `testParameterId` INTEGER NULL,
    `testCategoryId` INTEGER NULL,
    `sampleType` VARCHAR(191) NULL,
    `testMethod` VARCHAR(191) NULL,
    `machineName` VARCHAR(191) NULL,
    `speciality` VARCHAR(191) NULL DEFAULT 'Regular',
    `group` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,
    `reportHeader` VARCHAR(191) NULL,
    `costForLab` DOUBLE NULL,
    `preparationTime` VARCHAR(191) NULL,
    `preparationType` VARCHAR(191) NULL,
    `instructionPreparation` TEXT NULL,
    `instructionPatient` TEXT NULL,
    `interpretationLabel` VARCHAR(191) NULL,
    `interpretation` TEXT NULL,
    `outsourceLab` VARCHAR(191) NULL,
    `attachFile` VARCHAR(191) NULL DEFAULT 'Yes',
    `profileTest` VARCHAR(191) NULL DEFAULT 'No',
    `isHeader` BOOLEAN NOT NULL DEFAULT true,
    `showTestName` BOOLEAN NOT NULL DEFAULT true,
    `isNABL` BOOLEAN NOT NULL DEFAULT false,
    `lineHeight` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tests_testCode_key`(`testCode`),
    UNIQUE INDEX `tests_name_departmentId_key`(`name`, `departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `departmentId` INTEGER NOT NULL,
    `center` VARCHAR(191) NULL DEFAULT 'All Centers',
    `b2cCharge` DOUBLE NOT NULL DEFAULT 0,
    `b2bCharge` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `testId` INTEGER NOT NULL,
    `b2cCharge` DOUBLE NOT NULL DEFAULT 0,
    `b2bCharge` DOUBLE NOT NULL DEFAULT 0,
    `franchiseId` INTEGER NULL,
    `corporateId` INTEGER NULL,
    `collectionCenterId` INTEGER NULL,
    `discountPercent` DOUBLE NULL DEFAULT 0,
    `specialPrice` DOUBLE NULL,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `package_charges_packageId_testId_franchiseId_corporateId_col_key`(`packageId`, `testId`, `franchiseId`, `corporateId`, `collectionCenterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `testId` INTEGER NOT NULL,
    `b2cCharge` DOUBLE NOT NULL,
    `b2bCharge` DOUBLE NOT NULL,
    `franchiseId` INTEGER NULL,
    `corporateId` INTEGER NULL,
    `collectionCenterId` INTEGER NULL,
    `discountPercent` DOUBLE NULL DEFAULT 0,
    `specialPrice` DOUBLE NULL,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `test_charges_testId_franchiseId_corporateId_collectionCenter_key`(`testId`, `franchiseId`, `corporateId`, `collectionCenterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `doctors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `degree` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `specialty` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `franchises` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `franchises_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_centers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `collection_centers_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `corporates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `corporates_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `corporate_charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `testId` INTEGER NOT NULL,
    `corporateId` INTEGER NOT NULL,
    `charges` DOUBLE NOT NULL DEFAULT 0,
    `b2bCharges` DOUBLE NOT NULL DEFAULT 0,
    `discountPercent` DOUBLE NULL DEFAULT 0,
    `specialPrice` DOUBLE NULL,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `corporate_charges_testId_corporateId_key`(`testId`, `corporateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_parameters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `testId` INTEGER NULL,
    `parameterName` VARCHAR(191) NOT NULL,
    `machineCode` VARCHAR(191) NULL,
    `multiplyBy` VARCHAR(191) NULL,
    `decimal` INTEGER NULL DEFAULT 2,
    `parameterSortOrder` INTEGER NULL,
    `isDescriptive` BOOLEAN NOT NULL DEFAULT false,
    `lowPanic` DOUBLE NULL,
    `highPanic` DOUBLE NULL,
    `isNABL` BOOLEAN NOT NULL DEFAULT false,
    `parameterCode` VARCHAR(191) NULL,
    `hasFormula` BOOLEAN NOT NULL DEFAULT false,
    `formula` TEXT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Numeric',
    `isMandatory` BOOLEAN NOT NULL DEFAULT false,
    `rangeType` VARCHAR(191) NOT NULL DEFAULT 'BySex',
    `units` VARCHAR(191) NULL,
    `displayRangeText` TEXT NULL,
    `rangeText` TEXT NULL,
    `textContent` TEXT NULL,
    `isMultipleOptions` BOOLEAN NOT NULL DEFAULT false,
    `maleLowValue` DOUBLE NULL,
    `maleHighValue` DOUBLE NULL,
    `maleDefaultValue` VARCHAR(191) NULL,
    `maleActive` BOOLEAN NOT NULL DEFAULT true,
    `femaleLowValue` DOUBLE NULL,
    `femaleHighValue` DOUBLE NULL,
    `femaleDefaultValue` VARCHAR(191) NULL,
    `femaleActive` BOOLEAN NOT NULL DEFAULT false,
    `childLowValue` DOUBLE NULL,
    `childHighValue` DOUBLE NULL,
    `childDefaultValue` VARCHAR(191) NULL,
    `childActive` BOOLEAN NOT NULL DEFAULT false,
    `ageRanges` TEXT NULL,
    `rangeValues` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `test_parameters_parameterCode_key`(`parameterCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `testId` INTEGER NOT NULL,
    `testParameterId` INTEGER NOT NULL,
    `categoryName` VARCHAR(191) NULL,
    `isCategory` BOOLEAN NOT NULL DEFAULT false,
    `testMethod` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_symbol_key`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `testId` INTEGER NOT NULL,
    `testCategoryId` INTEGER NULL,
    `templateName` TEXT NOT NULL,
    `parameters` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TestParameters` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TestParameters_AB_unique`(`A`, `B`),
    INDEX `_TestParameters_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_tests` ADD CONSTRAINT `patient_tests_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`patientId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_tests` ADD CONSTRAINT `patient_tests_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_tests` ADD CONSTRAINT `patient_tests_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tests` ADD CONSTRAINT `tests_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tests` ADD CONSTRAINT `tests_testParameterId_fkey` FOREIGN KEY (`testParameterId`) REFERENCES `test_parameters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tests` ADD CONSTRAINT `tests_testCategoryId_fkey` FOREIGN KEY (`testCategoryId`) REFERENCES `test_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_charges` ADD CONSTRAINT `package_charges_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_charges` ADD CONSTRAINT `package_charges_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_charges` ADD CONSTRAINT `package_charges_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_charges` ADD CONSTRAINT `package_charges_corporateId_fkey` FOREIGN KEY (`corporateId`) REFERENCES `corporates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_charges` ADD CONSTRAINT `package_charges_collectionCenterId_fkey` FOREIGN KEY (`collectionCenterId`) REFERENCES `collection_centers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_corporateId_fkey` FOREIGN KEY (`corporateId`) REFERENCES `corporates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_collectionCenterId_fkey` FOREIGN KEY (`collectionCenterId`) REFERENCES `collection_centers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `corporate_charges` ADD CONSTRAINT `corporate_charges_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `corporate_charges` ADD CONSTRAINT `corporate_charges_corporateId_fkey` FOREIGN KEY (`corporateId`) REFERENCES `corporates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_parameters` ADD CONSTRAINT `test_parameters_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_categories` ADD CONSTRAINT `test_categories_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_categories` ADD CONSTRAINT `test_categories_testParameterId_fkey` FOREIGN KEY (`testParameterId`) REFERENCES `test_parameters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_templates` ADD CONSTRAINT `test_templates_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_templates` ADD CONSTRAINT `test_templates_testCategoryId_fkey` FOREIGN KEY (`testCategoryId`) REFERENCES `test_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TestParameters` ADD CONSTRAINT `_TestParameters_A_fkey` FOREIGN KEY (`A`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TestParameters` ADD CONSTRAINT `_TestParameters_B_fkey` FOREIGN KEY (`B`) REFERENCES `test_parameters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
