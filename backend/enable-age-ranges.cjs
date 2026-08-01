const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableAgeRanges() {
  try {
    console.log('🔧 Enabling age ranges for RED BLOOD CELL COUNT...\n');
    
    // Find the RED BLOOD CELL COUNT parameter
    const parameter = await prisma.testParameter.findFirst({
      where: {
        parameterName: { contains: 'RED BLOOD CELL' }
      }
    });
    
    if (!parameter) {
      console.log('❌ Parameter not found');
      return;
    }
    
    console.log('✅ Parameter found:', parameter.parameterName);
    
    if (!parameter.ageRanges) {
      console.log('❌ No ageRanges JSON found');
      return;
    }
    
    // Parse and enable the ranges
    const ageRanges = JSON.parse(parameter.ageRanges);
    
    console.log('\n📋 Current state:');
    ageRanges.forEach((range, idx) => {
      console.log(`  Range ${idx + 1}: "${range.label}" - enabled=${range.enabled}`);
    });
    
    // Enable the "Between Male" range (index 4 - the one that matches 1-3 months with Both gender)
    console.log('\n🔄 Enabling ranges...');
    let enabledCount = 0;
    
    ageRanges.forEach((range, idx) => {
      // Enable ranges that have valid ll/ul values and are for 1-3 months age
      if ((range.label?.includes('Between') || range.label?.includes('More Than') || range.label?.includes('Less Than')) &&
          range.ll !== null && range.ul !== null &&
          range.enabled === false) {
        
        // For this demo, enable the "Between Male" range specifically
        if (idx === 4) { // "Between Male" range
          range.enabled = true;
          enabledCount++;
          console.log(`  ✅ Enabled Range ${idx + 1}: "${range.label}"`);
        }
      }
    });
    
    if (enabledCount === 0) {
      console.log('  ⚠️  No ranges were enabled (already enabled or no valid ranges found)');
    }
    
    // Update the parameter
    const updated = await prisma.testParameter.update({
      where: { id: parameter.id },
      data: {
        ageRanges: JSON.stringify(ageRanges)
      }
    });
    
    console.log('\n✅ Parameter updated successfully!');
    console.log('\n📋 New state:');
    const newRanges = JSON.parse(updated.ageRanges);
    newRanges.forEach((range, idx) => {
      console.log(`  Range ${idx + 1}: "${range.label}" - enabled=${range.enabled}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

enableAgeRanges();
