import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying organizationId field in PatientTest...\n');
  
  try {
    // Get an existing patient
    const patient = await prisma.patient.findFirst();
    
    if (!patient) {
      console.log('⚠️  No patients found in database');
      await prisma.$disconnect();
      return;
    }

    // Get an existing organization
    const org = await prisma.organization.findFirst();
    
    if (!org) {
      console.log('⚠️  No organizations found in database');
      await prisma.$disconnect();
      return;
    }

    console.log('Using patient:', patient.patientId);
    console.log('Using organization:', org.id);

    // Try to create a test record with organizationId
    const testRecord = await prisma.patientTest.create({
      data: {
        patientId: patient.patientId,
        visitId: 'V-TEST-ORG-' + Date.now(),
        testId: 1,
        departmentId: 1,
        organizationId: org.id,
        sample: 'Test',
        charge: 100,
        status: 'REGISTERED'
      }
    });

    console.log('\n✅ organizationId field is working correctly!');
    console.log('   Created test record with organizationId:', testRecord.organizationId);
    
    // Clean up
    await prisma.patientTest.delete({
      where: { id: testRecord.id }
    });
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
