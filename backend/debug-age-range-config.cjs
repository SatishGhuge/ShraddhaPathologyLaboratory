const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    const parameter = await prisma.testParameter.findFirst({
      where: { parameterName: { contains: 'RED BLOOD CELL' } }
    });

    if (!parameter || !parameter.ageRanges) {
      console.log('Parameter not found');
      return;
    }

    const ageRanges = JSON.parse(parameter.ageRanges);
    
    console.log('\n🔍 Age Range Configuration for RED BLOOD CELL COUNT:\n');
    ageRanges.forEach((range, idx) => {
      console.log(`Range ${idx + 1}: "${range.label}"`);
      console.log(`  Gender: ${range.gender}`);
      console.log(`  Enabled: ${range.enabled}`);
      console.log(`  TimeUnit: "${range.timeUnit}"`);
      console.log(`  From: ${range.from}, To: ${range.to}`);
      console.log(`  LL: ${range.ll}, UL: ${range.ul}`);
      console.log('');
    });

    console.log('\n⚠️  ISSUE IDENTIFIED:');
    console.log('   The "Between Male" range has timeUnit="Month(s)"');
    console.log('   This means it checks: ageMonths >= 1 && ageMonths <= 3');
    console.log('   But it should check: ageYears == 0 && ageMonths >= 1 && ageMonths <= 3');
    console.log('');
    console.log('   For a 2-month-old: ageMonths=2 ✅ matches');
    console.log('   For an 8-year-old: ageMonths=3 ✅ matches (WRONG!)');
    console.log('   For a 65-year-old: ageMonths=2 ✅ matches (WRONG!)');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
