import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 COMPLETE ORGANIZATION CHARGES VERIFICATION\n');
  console.log('=' .repeat(70));
  
  try {
    // Get all organizations
    console.log('\n📋 ORGANIZATIONS:');
    const orgs = await prisma.organization.findMany();
    if (orgs.length === 0) {
      console.log('   ⚠️  No organizations found');
      return;
    }
    orgs.forEach(org => console.log(`   ✓ ${org.name} (${org.id})`));
    
    // Get all tests
    console.log('\n📚 TESTS (Active):');
    const tests = await prisma.test.findMany({
      where: { isActive: true, isDeleted: false }
    });
    if (tests.length === 0) {
      console.log('   ⚠️  No tests found');
      return;
    }
    tests.forEach(test => console.log(`   ✓ ${test.id}. ${test.name}`));
    
    // Check charges for each organization
    console.log('\n💰 CHARGES BY ORGANIZATION:');
    console.log('=' .repeat(70));
    
    for (const org of orgs) {
      console.log(`\n🏢 ${org.name} (${org.id}):`);
      
      const charges = await prisma.testCharge.findMany({
        where: { organizationId: org.id },
        include: { test: { select: { id: true, name: true } } }
      });
      
      if (charges.length === 0) {
        console.log('   ⚠️  No charges configured');
      } else {
        charges.forEach(charge => {
          console.log(`   ✓ Test ${charge.testId} (${charge.test.name}): B2C=₹${charge.b2cCharge}, B2B=₹${charge.b2bCharge}`);
        });
      }
    }
    
    // Check default charges
    console.log(`\n📌 DEFAULT CHARGES (organizationId = null):`);
    const defaultCharges = await prisma.testCharge.findMany({
      where: { organizationId: null },
      include: { test: { select: { id: true, name: true } } }
    });
    
    if (defaultCharges.length === 0) {
      console.log('   ⚠️  No default charges configured');
    } else {
      defaultCharges.forEach(charge => {
        console.log(`   ✓ Test ${charge.testId} (${charge.test.name}): B2C=₹${charge.b2cCharge}, B2B=₹${charge.b2bCharge}`);
      });
    }
    
    // Summary statistics
    console.log('\n📊 SUMMARY:');
    console.log('=' .repeat(70));
    console.log(`   Total Organizations: ${orgs.length}`);
    console.log(`   Total Active Tests: ${tests.length}`);
    
    const totalCharges = await prisma.testCharge.count();
    console.log(`   Total Charge Records: ${totalCharges}`);
    
    const orgCharges = await prisma.testCharge.count({
      where: { organizationId: { not: null } }
    });
    console.log(`   Organization-specific Charges: ${orgCharges}`);
    
    const defaultCount = await prisma.testCharge.count({
      where: { organizationId: null }
    });
    console.log(`   Default Charges: ${defaultCount}`);
    
    console.log('\n✅ VERIFICATION COMPLETE\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
