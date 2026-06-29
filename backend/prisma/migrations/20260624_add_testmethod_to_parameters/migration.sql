-- Add testMethod column to test_parameters table
ALTER TABLE `test_parameters` 
ADD COLUMN `testMethod` VARCHAR(191) NULL AFTER `parameterCode`;
