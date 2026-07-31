import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markTestsAsOutsourced() {
  try {
    console.log('🔧 MARKING EXISTING TESTS AS OUTSOURCED\n');

    // Get all outsourcing labs with their tests
    const labs = await prisma.outsourcingLab.findMany({
      include: {
        tests: {
          include: { test: true }
        }
      }
    });

    console.log(`Found ${labs.length} outsourcing lab(s)\n`);

    let totalUpdated = 0;

    for (const lab of labs) {
      console.log(`Lab: ${lab.labName}`);
      
      for (const labTest of lab.tests) {
        // Find all PatientTests with this test
        const patientTests = await prisma.patientTest.findMany({
          where: { testId: labTest.testId }
        });

        if (patientTests.length > 0) {
          // Update all of them
          const updated = await prisma.patientTest.updateMany({
            where: { testId: labTest.testId },
            data: {
              isOutsourced: true,
              outsourcedTo: lab.labName
            }
          });

          console.log(`  ✅ Test: ${labTest.test.name} → Updated ${updated.count} patient test(s)`);
          totalUpdated += updated.count;
        }
      }
    }

    console.log(`\n✅ COMPLETE! Updated ${totalUpdated} patient test records\n`);
    console.log('Now all patient tests for outsourcing labs are marked as outsourced.');
    console.log('You should see "⚠️ OUTSOURCING" badges in the Result page.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

markTestsAsOutsourced();
