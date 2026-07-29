import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySetup() {
  try {
    console.log('\n📊 VERIFYING OUTSOURCING TEST SETUP\n');

    // 1. Check Outsourcing Lab
    console.log('1️⃣ Checking Outsourcing Lab...');
    const lab = await prisma.outsourcingLab.findFirst({
      where: { labName: 'PathLab Delhi' }
    });
    if (lab) {
      console.log(`   ✅ Lab found: ${lab.labName} (ID: ${lab.id})`);
    } else {
      console.log(`   ❌ Lab NOT found`);
    }

    // 2. Check Test
    console.log('\n2️⃣ Checking Test...');
    const test = await prisma.test.findFirst({
      where: { name: { contains: 'Hemoglobin' } }
    });
    if (test) {
      console.log(`   ✅ Test found: ${test.name} (ID: ${test.id})`);
    } else {
      console.log(`   ❌ Test NOT found`);
    }

    // 3. Check OutsourcingLabTest
    console.log('\n3️⃣ Checking OutsourcingLabTest...');
    if (lab && test) {
      const labTest = await prisma.outsourcingLabTest.findFirst({
        where: { outsourcingLabId: lab.id, testId: test.id }
      });
      if (labTest) {
        console.log(`   ✅ Lab-Test mapping found: Charge ₹${labTest.charge}`);
      } else {
        console.log(`   ❌ Lab-Test mapping NOT found`);
      }
    }

    // 4. Check TestCharge
    console.log('\n4️⃣ Checking TestCharge...');
    if (test) {
      const charge = await prisma.testCharge.findFirst({
        where: { testId: test.id, organizationId: null }
      });
      if (charge) {
        console.log(`   ✅ TestCharge found: B2C ₹${charge.b2cCharge}, B2B ₹${charge.b2bCharge}`);
      } else {
        console.log(`   ❌ TestCharge NOT found`);
      }
    }

    // 5. Check Patient
    console.log('\n5️⃣ Checking Test Patient...');
    const patient = await prisma.patient.findUnique({
      where: { patientId: 'TEST_OUTSOURCING_001' }
    });
    if (patient) {
      console.log(`   ✅ Patient found: ${patient.firstName} ${patient.lastName}`);
    } else {
      console.log(`   ❌ Patient NOT found`);
    }

    // 6. Check PatientTest
    console.log('\n6️⃣ Checking PatientTest...');
    if (patient && test) {
      const patientTest = await prisma.patientTest.findFirst({
        where: { patientId: patient.patientId, testId: test.id }
      });
      if (patientTest) {
        console.log(`   ✅ PatientTest found: ID ${patientTest.id}`);
        console.log(`      - isOutsourced: ${patientTest.isOutsourced ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`      - outsourcedTo: ${patientTest.outsourcedTo || '❌ NULL'}`);
        console.log(`      - status: ${patientTest.status}`);
        console.log(`      - charge: ₹${patientTest.charge}`);
      } else {
        console.log(`   ❌ PatientTest NOT found`);
      }
    }

    console.log('\n✅ VERIFICATION COMPLETE\n');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifySetup();
