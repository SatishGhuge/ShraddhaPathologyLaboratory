import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Units Seeded...\n');
  
  try {
    const units = await prisma.unit.findMany();
    
    console.log(`✅ Total Units in Database: ${units.length}\n`);
    
    if (units.length > 0) {
      console.log('📋 Sample Units:');
      units.slice(0, 10).forEach((unit, idx) => {
        console.log(`   ${idx + 1}. ${unit.unitName}`);
      });
      if (units.length > 10) {
        console.log(`   ... and ${units.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
