-- CreateTable
CREATE TABLE `Sample_Type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Sample_Type` VARCHAR(191) NOT NULL,
    `Sample_Color` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Sample_Type_Sample_Type_key`(`Sample_Type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
