-- Remove B2B and B2C columns and special price, then add discount columns
ALTER TABLE `doctor_test_charges` 
DROP COLUMN `b2cCharge`,
DROP COLUMN `b2bCharge`,
DROP COLUMN `specialPrice`,
ADD COLUMN `discountR` DOUBLE DEFAULT 0 AFTER `discountPercent`,
ADD COLUMN `discountS` DOUBLE DEFAULT 0 AFTER `discountR`;
