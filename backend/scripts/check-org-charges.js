import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Organization Charges in Database...\n');

  try {
    // Get all organizations
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    console.log(`📋 Found ${orgs.length} organizations:\n`);

    for (const org of orgs) {
      console.log(`\n🏢 Organization: ${org.name} (${org.id})`);
      
      // Get charges for this organization
      const charges = await prisma.testCharge.findMany({
        where: { organizationId: org.id },
        include: {
          test: { select: { id: true, name: true } }
        }
      });

      if (charges.length === 0) {
        console.log('   ⚠️  No custom charges found');
      } else {
        console.log(`   ✅ Found ${charges.length} custom charges:`);
        charges.forEach(c => {
          console.log(`      - Test ID ${c.testId} (${c.test?.name}): B2C=₹${c.b2cCharge}, B2B=₹${c.b2bCharge}`);
        });
      }
    }

    // Also check default charges (organizationId = null)
    console.log('\n\n📌 Default Charges (organizationId = null)');
    const defaultCharges = await prisma.testCharge.findMany({
      where: { organizationId: null },
      include: { test: { select: { id: true, name: true } } }
    });

    if (defaultCharges.length === 0) {
      console.log('   ⚠️  No default charges found');
    } else {
      console.log(`   ✅ Found ${defaultCharges.length} default charges:`);
      defaultCharges.slice(0, 10).forEach(c => {
        console.log(`      - Test ID ${c.testId} (${c.test?.name}): B2C=₹${c.b2cCharge}, B2B=₹${c.b2bCharge}`);
      });
      if (defaultCharges.length > 10) {
        console.log(`      ... and ${defaultCharges.length - 10} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
