const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParameter() {
  try {
    console.log('🔍 Searching for RED BLOOD CELL COUNT parameter...\n');
    
    // Find the parameter
    const parameter = await prisma.testParameter.findFirst({
      where: {
        parameterName: { contains: 'RED BLOOD CELL' }
      }
    });
    
    if (!parameter) {
      console.log('❌ Parameter not found');
      const params = await prisma.testParameter.findMany({
        take: 10,
        select: { id: true, parameterName: true }
      });
      console.log('\n📋 First 10 parameters in database:');
      params.forEach(p => console.log(`  ${p.id}: ${p.parameterName}`));
      return;
    }
    
    console.log('✅ PARAMETER FOUND:');
    console.log('  ID:', parameter.id);
    console.log('  Name:', parameter.parameterName);
    console.log('  Type:', parameter.type);
    console.log('  Range Type:', parameter.rangeType);
    console.log('  Child Active:', parameter.childActive);
    console.log('  Child Low:', parameter.childLowValue, 'High:', parameter.childHighValue);
    console.log('  Female Active:', parameter.femaleActive);
    console.log('  Female Low:', parameter.femaleLowValue, 'High:', parameter.femaleHighValue);
    console.log('  Male Active:', parameter.maleActive);
    console.log('  Male Low:', parameter.maleLowValue, 'High:', parameter.maleHighValue);
    console.log('  Display Range Text:', parameter.displayRangeText);
    console.log('  Range Text:', parameter.rangeText);
    console.log('\n📋 AGE RANGES JSON:');
    
    if (parameter.ageRanges) {
      try {
        const ageRanges = JSON.parse(parameter.ageRanges);
        console.log('  Total ranges:', ageRanges.length);
        ageRanges.forEach((range, idx) => {
          console.log(`\n  Range ${idx + 1}:`);
          console.log(`    Label: "${range.label}"`);
          console.log(`    Gender: "${range.gender}"`);
          console.log(`    Enabled: ${range.enabled}`);
          console.log(`    TimeUnit: "${range.timeUnit}"`);
          console.log(`    From: ${range.from}, To: ${range.to}`);
          console.log(`    LL: ${range.ll}, UL: ${range.ul}`);
        });
      } catch (e) {
        console.log('  ❌ Error parsing ageRanges:', e.message);
        console.log('  Raw:', parameter.ageRanges.substring(0, 200));
      }
    } else {
      console.log('  ⚠️  ageRanges is NULL or empty');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkParameter();
