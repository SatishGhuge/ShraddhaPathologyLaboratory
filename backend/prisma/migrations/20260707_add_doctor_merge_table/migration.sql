-- CreateTable doctor_merges
CREATE TABLE `doctor_merges` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `sourceDoctorId` INT NOT NULL,
    `targetDoctorId` INT NOT NULL,
    `sourceDoctorName` VARCHAR(191) NOT NULL,
    `targetDoctorName` VARCHAR(191) NOT NULL,
    `recordsUpdated` INT NOT NULL DEFAULT 0,
    `chargesUpdated` INT NOT NULL DEFAULT 0,
    `mergedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mergedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `doctor_merges_sourceDoctorId_idx` ON `doctor_merges`(`sourceDoctorId`);

-- CreateIndex
CREATE INDEX `doctor_merges_targetDoctorId_idx` ON `doctor_merges`(`targetDoctorId`);

-- CreateIndex
CREATE INDEX `doctor_merges_mergedAt_idx` ON `doctor_merges`(`mergedAt`);

-- AddForeignKey
ALTER TABLE `doctor_merges` ADD CONSTRAINT `doctor_merges_sourceDoctorId_fkey` FOREIGN KEY (`sourceDoctorId`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doctor_merges` ADD CONSTRAINT `doctor_merges_targetDoctorId_fkey` FOREIGN KEY (`targetDoctorId`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
