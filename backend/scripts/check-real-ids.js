import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealIds() {
  try {
    console.log('\n📊 CHECKING NEW TEST DATA WITH REAL IDs\n');

    // Get John Doe patient
    const patients = await prisma.patient.findMany({
      where: { firstName: 'John', lastName: 'Doe' },
      select: { patientId: true, firstName: true, lastName: true, mobile: true }
    });

    console.log('👤 Patients Named John Doe:');
    if (patients.length === 0) {
      console.log('   ❌ No patients found');
    } else {
      patients.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ID: ${p.patientId} (${p.firstName} ${p.lastName})`);
      });
    }

    // Get their patient tests
    const tests = await prisma.patientTest.findMany({
      where: { patient: { firstName: 'John', lastName: 'Doe' } },
      include: {
        patient: { select: { patientId: true, firstName: true, lastName: true } },
        test: { select: { name: true } }
      }
    });

    console.log('\n🧪 Their Patient Tests:');
    if (tests.length === 0) {
      console.log('   ❌ No tests found');
    } else {
      tests.forEach((t, idx) => {
        console.log(`\n   Test ${idx + 1}:`);
        console.log(`      Patient ID: ${t.patient.patientId}`);
        console.log(`      Visit ID: ${t.visitId}`);
        console.log(`      Test: ${t.test.name}`);
        console.log(`      isOutsourced: ${t.isOutsourced ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`      outsourcedTo: ${t.outsourcedTo || '(none)'}`);
        console.log(`      Status: ${t.status}`);
      });
    }

    console.log('\n✅ CHECK COMPLETE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealIds();
