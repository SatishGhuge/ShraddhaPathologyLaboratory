-- Complete the franchise string ID migration
-- (partial run already added new_id and franchiseId_new columns)

SET FOREIGN_KEY_CHECKS = 0;

-- Populate new_id if not already done
UPDATE `franchise` SET `new_id` = CONCAT('FR-',
  CHAR(65 + FLOOR(`id` / 676) % 26),
  CHAR(65 + FLOOR(`id` / 26) % 26),
  CHAR(65 + `id` % 26)
) WHERE `new_id` IS NULL;

-- Populate franchiseId_new from franchise.new_id
UPDATE `test_charges` tc
JOIN `franchise` f ON tc.`franchiseId` = f.`id`
SET tc.`franchiseId_new` = f.`new_id`
WHERE tc.`franchiseId` IS NOT NULL AND tc.`franchiseId_new` IS NULL;

-- Drop old int franchiseId from test_charges
ALTER TABLE `test_charges` DROP COLUMN `franchiseId`;
ALTER TABLE `test_charges` RENAME COLUMN `franchiseId_new` TO `franchiseId`;

-- Swap franchise id: drop old int PK, promote new_id
ALTER TABLE `franchise` DROP PRIMARY KEY;
ALTER TABLE `franchise` DROP COLUMN `id`;
ALTER TABLE `franchise` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `franchise` MODIFY `id` VARCHAR(191) NOT NULL;
ALTER TABLE `franchise` ADD PRIMARY KEY (`id`);

-- Re-add FK
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey`
  FOREIGN KEY (`franchiseId`) REFERENCES `franchise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-add index
ALTER TABLE `test_charges` ADD INDEX `test_charges_franchiseId_idx` (`franchiseId`);

SET FOREIGN_KEY_CHECKS = 1;
