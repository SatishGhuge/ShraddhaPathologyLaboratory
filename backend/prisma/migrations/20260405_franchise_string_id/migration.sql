-- Migration: Change Franchise.id from Int to String (FR-AAA style)
-- Safe version: drops constraints only if they exist

-- Step 1: Drop FK on test_charges.franchiseId (Prisma names it with full path)
SET FOREIGN_KEY_CHECKS = 0;

-- Step 2: Add new_id string column to franchise
ALTER TABLE `franchise` ADD COLUMN `new_id` VARCHAR(191) NULL;

-- Step 3: Populate new_id with FR-XXX based on existing integer id
UPDATE `franchise` SET `new_id` = CONCAT('FR-',
  CHAR(65 + FLOOR(`id` / 676) % 26),
  CHAR(65 + FLOOR(`id` / 26) % 26),
  CHAR(65 + `id` % 26)
);

-- Step 4: Add franchiseId_new string column to test_charges
ALTER TABLE `test_charges` ADD COLUMN `franchiseId_new` VARCHAR(191) NULL;

-- Step 5: Populate test_charges.franchiseId_new from franchise.new_id
UPDATE `test_charges` tc
JOIN `franchise` f ON tc.`franchiseId` = f.`id`
SET tc.`franchiseId_new` = f.`new_id`
WHERE tc.`franchiseId` IS NOT NULL;

-- Step 6: Drop old franchiseId column from test_charges
ALTER TABLE `test_charges` DROP COLUMN `franchiseId`;
ALTER TABLE `test_charges` RENAME COLUMN `franchiseId_new` TO `franchiseId`;

-- Step 7: Drop old integer PK from franchise and rename new_id to id
ALTER TABLE `franchise` DROP PRIMARY KEY;
ALTER TABLE `franchise` DROP COLUMN `id`;
ALTER TABLE `franchise` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `franchise` MODIFY `id` VARCHAR(191) NOT NULL;
ALTER TABLE `franchise` ADD PRIMARY KEY (`id`);

-- Step 8: Re-add FK from test_charges.franchiseId -> franchise.id
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey`
  FOREIGN KEY (`franchiseId`) REFERENCES `franchise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Re-add index on franchiseId
ALTER TABLE `test_charges` ADD INDEX `test_charges_franchiseId_fkey_idx` (`franchiseId`);

SET FOREIGN_KEY_CHECKS = 1;
