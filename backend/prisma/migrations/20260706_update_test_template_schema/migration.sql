-- Change templateName from Text to VarChar(255) and add unique constraint
ALTER TABLE `test_templates` MODIFY COLUMN `templateName` VARCHAR(255) NOT NULL;

-- Add unique constraint on (testId, templateName)
ALTER TABLE `test_templates` ADD UNIQUE KEY `test_templates_testId_templateName_key` (`testId`, `templateName`);
