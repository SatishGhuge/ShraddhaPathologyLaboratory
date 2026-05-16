-- AlterTable
ALTER TABLE `patient_tests` ADD COLUMN `sampleReceived` DATETIME(3) NULL,
    ADD COLUMN `sampleTaken` DATETIME(3) NULL;
