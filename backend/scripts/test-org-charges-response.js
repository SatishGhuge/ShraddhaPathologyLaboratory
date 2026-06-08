import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing Organization Charges Response Structure...\n');
  
  try {
    // Test with alandi organization (ORG-AAC)
    const orgId = 'ORG-AAC';
    
    console.log(`📋 Fetching charges for organization: ${orgId}\n`);
    
    const charges = await prisma.testCharge.findMany({
      where: {
        organizationId: orgId
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true,
            departmentId: true,
            department: {
              select: {
                name: true
              }
            }
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
      orderBy: [
        { organizationId: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    console.log(`✅ Found ${charges.length} charges\n`);
    
    if (charges.length > 0) {
      console.log('📊 First charge structure:');
      const firstCharge = charges[0];
      console.log(JSON.stringify(firstCharge, null, 2));
      
      console.log('\n✅ Verifying key fields:');
      console.log(`   ✓ testId: ${firstCharge.testId} (type: ${typeof firstCharge.testId})`);
      console.log(`   ✓ b2cCharge: ${firstCharge.b2cCharge}`);
      console.log(`   ✓ b2bCharge: ${firstCharge.b2bCharge}`);
      console.log(`   ✓ test.id: ${firstCharge.test?.id}`);
      console.log(`   ✓ test.name: ${firstCharge.test?.name}`);
      
      console.log('\n📊 All charges:');
      charges.forEach(charge => {
        console.log(`   - Test ID ${charge.testId} (${charge.test?.name}): B2C=₹${charge.b2cCharge}, B2B=₹${charge.b2bCharge}`);
      });
    } else {
      console.log('⚠️  No charges found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
