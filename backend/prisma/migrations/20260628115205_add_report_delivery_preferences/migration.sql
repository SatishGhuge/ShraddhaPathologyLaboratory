-- AlterTable
ALTER TABLE `doctors` ADD COLUMN `sendReportsViaMail` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `sendReportsViaWhatsApp` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `organizations` ADD COLUMN `sendReportsViaMail` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `sendReportsViaWhatsApp` BOOLEAN NOT NULL DEFAULT false;
