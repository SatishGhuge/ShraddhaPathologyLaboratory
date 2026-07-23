import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listPatients() {
  try {
    console.log('\n📊 ALL PATIENTS IN DATABASE\n');

    const patients = await prisma.patient.findMany({
      select: { patientId: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`Found ${patients.length} recent patients:\n`);
    patients.forEach((p, idx) => {
      const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A';
      console.log(`${idx + 1}. ${p.patientId} - ${p.firstName} ${p.lastName} (${date})`);
    });

    console.log('\n✅ LIST COMPLETE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listPatients();
