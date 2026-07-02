-- AlterTable
ALTER TABLE `doctors` MODIFY `sendReportsViaMail` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `organizations` MODIFY `sendReportsViaMail` BOOLEAN NOT NULL DEFAULT false;
