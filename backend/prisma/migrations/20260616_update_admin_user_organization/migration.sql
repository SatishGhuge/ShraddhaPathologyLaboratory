-- Update Admin table: Add organizationId and adminName
ALTER TABLE `admins` ADD COLUMN IF NOT EXISTS `organizationId` VARCHAR(191) NULL;
ALTER TABLE `admins` ADD COLUMN IF NOT EXISTS `adminName` VARCHAR(255) NULL;

-- Update User table: Remove center and add organizationId
ALTER TABLE `users` DROP COLUMN IF EXISTS `center`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `organizationId` VARCHAR(191) NULL;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS `admins_organizationId_idx` ON `admins`(`organizationId`);
CREATE INDEX IF NOT EXISTS `users_organizationId_idx` ON `users`(`organizationId`);

-- Add foreign key constraints (drop first if they exist)
ALTER TABLE `admins` DROP FOREIGN KEY IF EXISTS `admins_organizationId_fkey`;
ALTER TABLE `admins` ADD CONSTRAINT `admins_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE;

ALTER TABLE `users` DROP FOREIGN KEY IF EXISTS `users_organizationId_fkey`;
ALTER TABLE `users` ADD CONSTRAINT `users_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE;
