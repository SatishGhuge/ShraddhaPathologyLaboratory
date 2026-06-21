-- Rename remarks column to patient_history in patient_tests table
ALTER TABLE `patient_tests` 
CHANGE COLUMN `remarks` `patient_history` LONGTEXT;
