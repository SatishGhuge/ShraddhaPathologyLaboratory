import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestCharges() {
  try {
    console.log('💰 Seeding test charges...\n');

    // Get all tests
    const tests = await prisma.test.findMany({
      where: { isActive: true, isDeleted: false }
    });

    if (tests.length === 0) {
      console.log('⚠️  No tests found. Please seed tests first.');
      await prisma.$disconnect();
      return;
    }

    // Get all organizations
    const organizations = await prisma.organization.findMany({
      where: { isActive: true }
    });

    if (organizations.length === 0) {
      console.log('⚠️  No organizations found. Please seed organizations first.');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${tests.length} tests and ${organizations.length} organizations\n`);

    let chargesCreated = 0;

    // Create charges for each test and organization combination
    for (const test of tests) {
      for (const org of organizations) {
        try {
          // First try to find existing charge
          const existing = await prisma.testCharge.findFirst({
            where: {
              testId: test.id,
              organizationId: org.id
            }
          });

          let charge;
          if (existing) {
            charge = await prisma.testCharge.update({
              where: { id: existing.id },
              data: { isActive: true }
            });
          } else {
            charge = await prisma.testCharge.create({
              data: {
                testId: test.id,
                organizationId: org.id,
                b2cCharge: Math.floor(Math.random() * 500) + 100, // Random 100-600
                b2bCharge: Math.floor(Math.random() * 400) + 50,  // Random 50-450
                discountPercent: 0,
                isActive: true
              }
            });
          }

          console.log(`✅ Charge created: ${test.name} → ${org.name}`);
          console.log(`   B2C: ₹${charge.b2cCharge}, B2B: ₹${charge.b2bCharge}`);
          chargesCreated++;
        } catch (error) {
          console.error(`❌ Error creating charge for ${test.name} → ${org.name}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Test charges seeding completed!`);
    console.log(`📊 Total charges created: ${chargesCreated}`);

  } catch (error) {
    console.error('❌ Error seeding test charges:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestCharges();
