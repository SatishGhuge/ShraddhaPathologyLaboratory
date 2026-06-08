-- Add organizationId field to patient_tests table
ALTER TABLE `patient_tests` ADD COLUMN `organizationId` VARCHAR(191);

-- Add foreign key constraint
ALTER TABLE `patient_tests` ADD CONSTRAINT `patient_tests_organizationId_fkey` 
FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX `patient_tests_organizationId_fkey` ON `patient_tests`(`organizationId`);
