-- Create organizations table
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL UNIQUE,
  `code` VARCHAR(191) NULL,
  `location` VARCHAR(191) NULL,
  `address` LONGTEXT NULL,
  `mobile` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `date` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create index on name for faster lookups
CREATE INDEX `idx_organization_name` ON `organizations`(`name`);
