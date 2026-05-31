-- Drop foreign keys and tables for removed entities
ALTER TABLE `test_charges` DROP FOREIGN KEY IF EXISTS `test_charges_franchiseId_fkey`;
ALTER TABLE `test_charges` DROP FOREIGN KEY IF EXISTS `test_charges_corporateId_fkey`;
ALTER TABLE `test_charges` DROP FOREIGN KEY IF EXISTS `test_charges_collectionCenterId_fkey`;

-- Drop old test_charges table and recreate with only organizationId
DROP TABLE IF EXISTS `test_charges`;

-- Drop removed tables
DROP TABLE IF EXISTS `corporate_charges`;
DROP TABLE IF EXISTS `corporates`;
DROP TABLE IF EXISTS `collection_centers`;
DROP TABLE IF EXISTS `franchise`;

-- Recreate test_charges table with only organizationId
CREATE TABLE `test_charges` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `testId` INT NOT NULL,
  `organizationId` VARCHAR(191) NULL,
  `b2cCharge` DOUBLE NOT NULL,
  `b2bCharge` DOUBLE NOT NULL,
  `discountPercent` DOUBLE NULL DEFAULT 0,
  `specialPrice` DOUBLE NULL,
  `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `effectiveTo` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `test_charges_testId_organizationId_key`(`testId`, `organizationId`),
  INDEX `test_charges_organizationId_fkey`(`organizationId`),
  CONSTRAINT `test_charges_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `test_charges_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
