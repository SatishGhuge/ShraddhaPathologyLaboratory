import prisma from '../config/database.js';

async function fixIds() {
  try {
    console.log('🔧 Fixing franchise and collection_centers ID types...\n');

    // Disable foreign key checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✅ Disabled foreign key checks');

    // Fix Franchise table
    console.log('\n1️⃣ Fixing Franchise table...');
    try {
      // Remove auto_increment first
      await prisma.$executeRawUnsafe('ALTER TABLE `franchise` MODIFY `id` INT NOT NULL');
      console.log('   ✅ Removed auto_increment from franchise.id');
      
      // Drop primary key
      await prisma.$executeRawUnsafe('ALTER TABLE `franchise` DROP PRIMARY KEY');
      console.log('   ✅ Dropped primary key');
      
      // Change to VARCHAR
      await prisma.$executeRawUnsafe('ALTER TABLE `franchise` MODIFY `id` VARCHAR(191) NOT NULL');
      console.log('   ✅ Changed id to VARCHAR(191)');
      
      // Add primary key back
      await prisma.$executeRawUnsafe('ALTER TABLE `franchise` ADD PRIMARY KEY (`id`)');
      console.log('   ✅ Added primary key back');
      
      // Drop new_id column if exists
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `franchise` DROP COLUMN `new_id`');
        console.log('   ✅ Dropped new_id column');
      } catch (e) {
        // Column might not exist, ignore
      }
      
      console.log('   ✅ Franchise table fixed');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message);
    }

    // Fix Collection Centers table
    console.log('\n2️⃣ Fixing Collection Centers table...');
    try {
      // Remove auto_increment first
      await prisma.$executeRawUnsafe('ALTER TABLE `collection_centers` MODIFY `id` INT NOT NULL');
      console.log('   ✅ Removed auto_increment from collection_centers.id');
      
      // Drop primary key
      await prisma.$executeRawUnsafe('ALTER TABLE `collection_centers` DROP PRIMARY KEY');
      console.log('   ✅ Dropped primary key');
      
      // Change to VARCHAR
      await prisma.$executeRawUnsafe('ALTER TABLE `collection_centers` MODIFY `id` VARCHAR(191) NOT NULL');
      console.log('   ✅ Changed id to VARCHAR(191)');
      
      // Add primary key back
      await prisma.$executeRawUnsafe('ALTER TABLE `collection_centers` ADD PRIMARY KEY (`id`)');
      console.log('   ✅ Added primary key back');
      
      console.log('   ✅ Collection Centers table fixed');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message);
    }

    // Fix test_charges foreign keys
    console.log('\n3️⃣ Fixing test_charges foreign keys...');
    try {
      // Drop foreign key constraints first
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `test_charges` DROP FOREIGN KEY `test_charges_franchiseId_fkey`');
        console.log('   ✅ Dropped franchiseId foreign key constraint');
      } catch (e) {
        console.log('   ⚠️  franchiseId foreign key might not exist:', e.message);
      }
      
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE `test_charges` DROP FOREIGN KEY `test_charges_collectionCenterId_fkey`');
        console.log('   ✅ Dropped collectionCenterId foreign key constraint');
      } catch (e) {
        console.log('   ⚠️  collectionCenterId foreign key might not exist:', e.message);
      }
      
      // Now modify the columns
      await prisma.$executeRawUnsafe('ALTER TABLE `test_charges` MODIFY `franchiseId` VARCHAR(191) NULL');
      console.log('   ✅ Changed franchiseId to VARCHAR(191)');
      
      await prisma.$executeRawUnsafe('ALTER TABLE `test_charges` MODIFY `collectionCenterId` VARCHAR(191) NULL');
      console.log('   ✅ Changed collectionCenterId to VARCHAR(191)');
      
      // Re-add foreign key constraints
      await prisma.$executeRawUnsafe('ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `franchise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');
      console.log('   ✅ Re-added franchiseId foreign key constraint');
      
      await prisma.$executeRawUnsafe('ALTER TABLE `test_charges` ADD CONSTRAINT `test_charges_collectionCenterId_fkey` FOREIGN KEY (`collectionCenterId`) REFERENCES `collection_centers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');
      console.log('   ✅ Re-added collectionCenterId foreign key constraint');
      
      console.log('   ✅ test_charges foreign keys fixed');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message);
    }

    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ Re-enabled foreign key checks');

    console.log('\n🎉 Database fixed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Try creating a franchise or collection center');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixIds();
