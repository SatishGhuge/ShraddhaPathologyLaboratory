import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing Tests API Response Structure...\n');
  
  try {
    const tests = await prisma.test.findMany({
      where: {
        isActive: true,
        isDeleted: false
      },
      include: {
        charges: true,
        department: true
      },
      take: 5
    });

    console.log(`✅ Found ${tests.length} active tests\n`);
    
    if (tests.length > 0) {
      console.log('📊 First test structure:');
      const firstTest = tests[0];
      console.log(JSON.stringify(firstTest, null, 2));
      
      console.log('\n✅ Verifying key fields:');
      console.log(`   ✓ id: ${firstTest.id} (type: ${typeof firstTest.id})`);
      console.log(`   ✓ name: ${firstTest.name}`);
      console.log(`   ✓ charges.length: ${firstTest.charges?.length || 0}`);
      
      if (firstTest.charges && firstTest.charges.length > 0) {
        console.log('\n📊 First charge in test:');
        console.log(JSON.stringify(firstTest.charges[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
