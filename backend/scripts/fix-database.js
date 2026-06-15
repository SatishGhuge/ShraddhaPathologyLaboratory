import prisma from '../config/database.js';

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database issues...\n');

    // Check if franchise table exists and has correct structure
    console.log('1️⃣ Checking franchise table...');
    try {
      const franchises = await prisma.$queryRaw`SHOW TABLES LIKE 'franchise'`;
      if (franchises.length > 0) {
        console.log('   ✅ Franchise table exists');
        
        // Check if id is string type
        const columns = await prisma.$queryRaw`DESCRIBE franchise`;
        const idColumn = columns.find(col => col.Field === 'id');
        console.log(`   📋 ID column type: ${idColumn.Type}`);
      } else {
        console.log('   ❌ Franchise table does not exist');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking franchise:', error.message);
    }

    // Check if collection_centers table exists
    console.log('\n2️⃣ Checking collection_centers table...');
    try {
      const centers = await prisma.$queryRaw`SHOW TABLES LIKE 'collection_centers'`;
      if (centers.length > 0) {
        console.log('   ✅ Collection centers table exists');
        
        // Check if id is string type
        const columns = await prisma.$queryRaw`DESCRIBE collection_centers`;
        const idColumn = columns.find(col => col.Field === 'id');
        console.log(`   📋 ID column type: ${idColumn.Type}`);
      } else {
        console.log('   ❌ Collection centers table does not exist');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking collection_centers:', error.message);
    }

    // Check admins table
    console.log('\n3️⃣ Checking admins table...');
    const adminCount = await prisma.admin.count();
    console.log(`   ✅ Admins table exists with ${adminCount} records`);

    // Check users table
    console.log('\n4️⃣ Checking users table...');
    try {
      const userCount = await prisma.user.count();
      console.log(`   ✅ Users table exists with ${userCount} records`);
    } catch (error) {
      console.log('   ⚠️  Error checking users:', error.message);
    }

    console.log('\n✅ Database check completed!');
    console.log('\n📝 Summary:');
    console.log('   - If franchise or collection_centers tables are missing, run: npx prisma db push');
    console.log('   - If ID types are wrong (INT instead of VARCHAR), the migration needs to be fixed');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase();
