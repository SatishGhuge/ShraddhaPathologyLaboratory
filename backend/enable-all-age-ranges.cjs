const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableAllAgeRanges() {
  try {
    console.log('🔧 Enabling age ranges for all parameters with 1-3 months "Between" ranges...\n');
    
    // Find all parameters with ageRanges JSON
    const parameters = await prisma.testParameter.findMany({
      where: {
        ageRanges: { not: null }
      }
    });
    
    console.log(`📋 Found ${parameters.length} parameters with ageRanges\n`);
    
    let totalUpdated = 0;
    
    for (const param of parameters) {
      try {
        const ageRanges = JSON.parse(param.ageRanges);
        let hasChanges = false;
        
        // Look for "Between Male" or "Between Both" ranges for 1-3 months
        ageRanges.forEach((range, idx) => {
          if ((range.label?.includes('Between Male') || range.label?.includes('Between Both') || 
               (range.label?.includes('Between') && range.gender === 'Both')) &&
              range.from === 1 && range.to === 3 &&
              range.timeUnit === 'Month(s)' &&
              range.ll !== null && range.ul !== null &&
              range.enabled === false) {
            
            range.enabled = true;
            hasChanges = true;
            console.log(`✅ ${param.parameterName}`);
            console.log(`   Range: "${range.label}" (${range.from}-${range.to} ${range.timeUnit})`);
            console.log(`   LL: ${range.ll}, UL: ${range.ul}\n`);
          }
        });
        
        if (hasChanges) {
          await prisma.testParameter.update({
            where: { id: param.id },
            data: {
              ageRanges: JSON.stringify(ageRanges)
            }
          });
          totalUpdated++;
        }
      } catch (e) {
        console.warn(`⚠️  Could not parse ageRanges for parameter ${param.id}: ${e.message}`);
      }
    }
    
    console.log(`\n✅ Successfully enabled age ranges for ${totalUpdated} parameters!`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

enableAllAgeRanges();
