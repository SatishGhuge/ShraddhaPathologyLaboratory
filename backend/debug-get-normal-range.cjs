const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function from result.controller.js
function getAgeInUnit(years, months, days, timeUnit) {
  switch (timeUnit) {
    case 'Day(s)': return days;
    case 'Month(s)': return months;
    case 'Year(s)': return years;
    default: return years;
  }
}

// Simulate getNormalRange function
function getNormalRange(parameter, patient) {
  if (!parameter || !patient) {
    return parameter?.displayRangeText || parameter?.rangeText || '';
  }

  // For text-type parameters, return textContent only if it has a real value
  if (parameter.type === 'Text' || parameter.isDescriptive) {
    return parameter.textContent || '';
  }

  const patientGender = patient.gender?.toLowerCase();
  
  let exactAgeInDays = patient.ageDays ?? 0;
  let exactAgeInMonths = patient.ageMonths ?? 0;
  let exactAgeInYears = patient.ageYears ?? 0;

  console.log(`\n🔍 getNormalRange called:`);
  console.log(`   Parameter: ${parameter.parameterName}`);
  console.log(`   Patient Age: ${exactAgeInYears}Y ${exactAgeInMonths}M ${exactAgeInDays}D`);
  console.log(`   Patient Gender: ${patientGender}`);

  // Handle complex age ranges from database (for numeric parameters)
  if (parameter.ageRanges) {
    try {
      const ageRanges = JSON.parse(parameter.ageRanges);
      console.log(`\n   🔍 CHECKING ${ageRanges.length} AGE RANGES:`);
      
      // Find matching range based on patient gender and age
      for (const range of ageRanges) {
        console.log(`\n   📋 Range: "${range.label}"`);
        
        if (!range.enabled) {
          console.log(`      ❌ DISABLED - skipping`);
          continue;
        }
        
        const rangeGender = range.gender?.toLowerCase();
        console.log(`      Gender Check: range="${rangeGender}", patient="${patientGender}"`);
        
        if (rangeGender && rangeGender !== 'both' && rangeGender !== patientGender) {
          console.log(`      ❌ GENDER MISMATCH - skipping`);
          continue;
        }
        console.log(`      ✅ GENDER OK`);
        
        let ageMatches = false;
        
        // Handle different range types with time units
        if (range.label?.includes('Between') && range.from !== null && range.to !== null) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          ageMatches = ageToCheck >= range.from && ageToCheck <= range.to;
          console.log(`      Age Check: "Between" - ageToCheck(${range.timeUnit})=${ageToCheck} in [${range.from}, ${range.to}] = ${ageMatches}`);
        }
        
        // Check if range has valid LL and UL
        const hasValidRange = range.ll !== null && range.ul !== null;
        console.log(`      Range Values: LL=${range.ll}, UL=${range.ul}, valid=${hasValidRange}`);
        
        // Return range if age and gender conditions match
        if (ageMatches && hasValidRange) {
          console.log(`      ✅✅✅ MATCH FOUND! RETURNING: ${range.ll} - ${range.ul}`);
          return `${range.ll} - ${range.ul}`;
        }
      }
      console.log(`\n   ❌ NO AGE RANGE MATCHED`);
    } catch (error) {
      console.error('Error parsing age ranges:', error);
    }
  }

  console.log(`   ❌ No matching range found, returning empty`);
  return parameter.displayRangeText || parameter.rangeText || '';
}

async function test() {
  try {
    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { patientId: 'S260700003' }
    });
    
    // Get parameter
    const parameter = await prisma.testParameter.findFirst({
      where: { parameterName: { contains: 'RED BLOOD CELL' } }
    });
    
    if (!patient || !parameter) {
      console.log('❌ Patient or parameter not found');
      return;
    }
    
    console.log('\n=== TEST 1: CURRENT STATE (Range disabled) ===');
    let result = getNormalRange(parameter, patient);
    console.log(`\n📤 Result: "${result}"`);
    
    // Now enable the range and test again
    console.log('\n\n=== TEST 2: AFTER ENABLING RANGE ===');
    if (parameter.ageRanges) {
      const ageRanges = JSON.parse(parameter.ageRanges);
      // Enable the "Between Male" range (index 4)
      if (ageRanges[4]) {
        console.log('\n✅ Enabling Range 5 ("Between Male")');
        ageRanges[4].enabled = true;
        parameter.ageRanges = JSON.stringify(ageRanges);
      }
    }
    
    result = getNormalRange(parameter, patient);
    console.log(`\n📤 Result: "${result}"`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
