-- Add testMethod column to test_parameters table if it doesn't exist
ALTER TABLE `test_parameters` 
ADD COLUMN `testMethod` VARCHAR(191) NULL AFTER `parameterCode`;
