-- Add isCustomized column to doctor_test_charges table
ALTER TABLE `doctor_test_charges` ADD COLUMN `isCustomized` BOOLEAN NOT NULL DEFAULT false;
