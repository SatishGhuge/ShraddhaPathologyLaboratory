import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Specimen Types...\n');
  
  const types = await prisma.sample_type.findMany({
    orderBy: { id: 'asc' }
  });

  console.log(`✅ Total Sample Types: ${types.length}\n`);
  
  types.forEach((t, index) => {
    const color = t.Sample_Color ? `(${t.Sample_Color})` : '(no color)';
    console.log(`  ${index + 1}. ${t.Sample_Type} ${color}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
