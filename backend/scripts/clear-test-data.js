import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  try {
    console.log('🗑️  Starting to clear all test data...\n');

    // Delete in correct order due to foreign key constraints
    
    // 1. Delete test categories (contains parameters, age ranges, range values)
    console.log('1️⃣  Deleting test categories and parameters...');
    const deletedCategories = await prisma.testCategory.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCategories.count} test categories/parameters\n`);

    // 2. Delete test charges
    console.log('2️⃣  Deleting test charges...');
    const deletedCharges = await prisma.testCharge.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCharges.count} test charges\n`);

    // 3. Delete corporate charges
    console.log('3️⃣  Deleting corporate charges...');
    const deletedCorporateCharges = await prisma.corporateCharge.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCorporateCharges.count} corporate charges\n`);

    // 4. Delete package tests
    console.log('4️⃣  Deleting package tests...');
    const deletedPackageTests = await prisma.packageTest.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPackageTests.count} package tests\n`);

    // 5. Finally delete tests
    console.log('5️⃣  Deleting all tests...');
    const deletedTests = await prisma.test.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTests.count} tests\n`);

    console.log('✅ All test data cleared successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Tests: ${deletedTests.count}`);
    console.log(`   - Categories/Parameters: ${deletedCategories.count}`);
    console.log(`   - Test Charges: ${deletedCharges.count}`);
    console.log(`   - Corporate Charges: ${deletedCorporateCharges.count}`);
    console.log(`   - Package Tests: ${deletedPackageTests.count}`);
    console.log('\n✨ You can now add new tests manually!\n');

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearTestData();
