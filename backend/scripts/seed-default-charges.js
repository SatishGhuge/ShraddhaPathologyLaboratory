import prisma from '../config/database.js';

async function seedDefaultCharges() {
  try {
    console.log('🔄 Seeding default charges...');

    // Get all active tests
    const tests = await prisma.test.findMany({
      where: { isActive: true, isDeleted: false },
      take: 100
    });

    console.log(`📊 Found ${tests.length} active tests`);

    if (tests.length === 0) {
      console.log('❌ No tests found. Please create tests first.');
      return;
    }

    // Check if default charges already exist
    const existingCharges = await prisma.testCharge.findMany({
      where: { organizationId: null }
    });

    console.log(`📋 Found ${existingCharges.length} existing default charges`);

    let created = 0;
    let skipped = 0;

    // Create default charges for each test
    for (const test of tests) {
      try {
        // Check if charge already exists
        const existingCharge = await prisma.testCharge.findFirst({
          where: {
            testId: test.id,
            organizationId: null
          }
        });

        if (existingCharge) {
          console.log(`⏭️  Skipping ${test.name} - charge already exists`);
          skipped++;
          continue;
        }

        // Create default charge
        const charge = await prisma.testCharge.create({
          data: {
            testId: test.id,
            organizationId: null, // NULL = default charges
            b2cCharge: 500, // Default B2C charge
            b2bCharge: 400, // Default B2B charge
            discountPercent: 0,
            specialPrice: null,
            isActive: true
          }
        });

        console.log(`✅ Created default charge for: ${test.name} (B2C: 500, B2B: 400)`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating charge for ${test.name}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📋 Total: ${created + skipped}`);
    console.log(`\n✨ Default charges seeded successfully!`);

  } catch (error) {
    console.error('❌ Error seeding default charges:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDefaultCharges();
