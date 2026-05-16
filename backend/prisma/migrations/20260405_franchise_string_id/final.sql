SET FOREIGN_KEY_CHECKS = 0;

-- Populate new_id on franchise
UPDATE `franchise` SET `new_id` = CONCAT('FR-',
  CHAR(65 + FLOOR(`id` / 676) % 26),
  CHAR(65 + FLOOR(`id` / 26) % 26),
  CHAR(65 + `id` % 26)
) WHERE `new_id` IS NULL;

-- Remove AUTO_INCREMENT before dropping PK
ALTER TABLE `franchise` MODIFY `id` INT(11) NOT NULL;

-- Drop old int PK and column
ALTER TABLE `franchise` DROP PRIMARY KEY;
ALTER TABLE `franchise` DROP COLUMN `id`;

-- Promote new_id to id and set as PK
ALTER TABLE `franchise` CHANGE `new_id` `id` VARCHAR(191) NOT NULL;
ALTER TABLE `franchise` ADD PRIMARY KEY (`id`);

-- Add FK from test_charges.franchiseId -> franchise.id
ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey`
  FOREIGN KEY (`franchiseId`) REFERENCES `franchise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-add unique index on test_charges
ALTER TABLE `test_charges` ADD UNIQUE INDEX `test_charges_testId_franchiseId_corporateId_collectionCenter_key`
  (`testId`, `franchiseId`, `corporateId`, `collectionCenterId`);

SET FOREIGN_KEY_CHECKS = 1;
