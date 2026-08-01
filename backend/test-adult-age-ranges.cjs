const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function
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

  const patientGender = patient.gender?.toLowerCase();
  
  let exactAgeInDays = patient.ageDays ?? 0;
  let exactAgeInMonths = patient.ageMonths ?? 0;
  let exactAgeInYears = patient.ageYears ?? 0;

  console.log(`\n📍 Patient: ${patient.firstName} (${exactAgeInYears}Y ${exactAgeInMonths}M ${exactAgeInDays}D, ${patientGender})`);
  console.log(`   Parameter: ${parameter.parameterName}`);
  console.log(`   Range Type: ${parameter.rangeType}`);

  // Handle complex age ranges from database
  if (parameter.ageRanges) {
    try {
      const ageRanges = JSON.parse(parameter.ageRanges);
      
      for (const range of ageRanges) {
        if (!range.enabled) continue;
        
        const rangeGender = range.gender?.toLowerCase();
        if (rangeGender && rangeGender !== 'both' && rangeGender !== patientGender) continue;
        
        let ageMatches = false;
        
        if (range.label?.includes('Between') && range.from !== null && range.to !== null) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          ageMatches = ageToCheck >= range.from && ageToCheck <= range.to;
          
          if (ageMatches && range.timeUnit === 'Month(s)' && exactAgeInYears > 0) {
            ageMatches = false;
          }
          if (ageMatches && range.timeUnit === 'Day(s)' && (exactAgeInYears > 0 || exactAgeInMonths > 0)) {
            ageMatches = false;
          }
          
          if (ageMatches) {
            console.log(`   ✅ MATCHED: "${range.label}" → ${range.ll} - ${range.ul}`);
            return `${range.ll} - ${range.ul}`;
          }
        }
      }
    } catch (error) {
      console.error('Error parsing age ranges:', error);
    }
  }

  // ✅ FALLBACK: Check BySex ranges - GENDER-BASED
  console.log(`   Checking BySex/ByGenderAndAge ranges...`);
  console.log(`   - rangeType: "${parameter.rangeType}"`);
  console.log(`   - patientGender: "${patientGender}"`);
  console.log(`   - exactAgeInYears: ${exactAgeInYears}`);
  console.log(`   - childActive: ${parameter.childActive}, Female Active: ${parameter.femaleActive}, Male Active: ${parameter.maleActive}`);
  
  if (parameter.rangeType === 'BySex' || parameter.rangeType === 'ByGenderAndAge') {
    // Child range (age < 18)
    if (exactAgeInYears < 18 && parameter.childActive && 
        parameter.childLowValue !== null && parameter.childHighValue !== null) {
      console.log(`   ✅ MATCHED: Child range (age < 18) → ${parameter.childLowValue} - ${parameter.childHighValue}`);
      return `${parameter.childLowValue} - ${parameter.childHighValue}`;
    }
    
    // Adult range (age >= 18) - GENDER BASED
    if (exactAgeInYears >= 18) {
      console.log(`   Adult range (age >= 18), checking by gender...`);
      
      if (patientGender === 'female' && parameter.femaleActive && 
          parameter.femaleLowValue !== null && parameter.femaleHighValue !== null) {
        console.log(`   ✅ MATCHED: Female range → ${parameter.femaleLowValue} - ${parameter.femaleHighValue}`);
        return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
      }
      
      if (patientGender === 'male' && parameter.maleActive && 
          parameter.maleLowValue !== null && parameter.maleHighValue !== null) {
        console.log(`   ✅ MATCHED: Male range → ${parameter.maleLowValue} - ${parameter.maleHighValue}`);
        return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
      }
      
      // If gender is not matched, show what's available
      console.log(`   ⚠️  Gender "${patientGender}" didn't match any active range`);
      console.log(`       Female active: ${parameter.femaleActive}, Male active: ${parameter.maleActive}`);
    }
  }

  console.log(`   ❌ NO MATCH - returning empty`);
  return '';
}

async function test() {
  try {
    console.log('\n========================================');
    console.log('  Adult Age Testing (23 years)');
    console.log('========================================\n');

    // Get a parameter with BySex ranges
    const parameter = await prisma.testParameter.findFirst({
      where: { 
        rangeType: 'BySex'
      },
      orderBy: { id: 'asc' }
    });

    if (!parameter) {
      console.log('❌ BySex parameter not found');
      return;
    }

    console.log(`🧪 Parameter: ${parameter.parameterName}`);
    console.log(`   Type: ${parameter.rangeType}`);
    console.log(`   Child Active: ${parameter.childActive} (${parameter.childLowValue} - ${parameter.childHighValue})`);
    console.log(`   Female Active: ${parameter.femaleActive} (${parameter.femaleLowValue} - ${parameter.femaleHighValue})`);
    console.log(`   Male Active: ${parameter.maleActive} (${parameter.maleLowValue} - ${parameter.maleHighValue})`);

    // Test cases: 23-year-old with 0 months 0 days (manually entered)
    const testPatients = [
      { firstName: '23Y Male', ageYears: 23, ageMonths: 0, ageDays: 0, gender: 'Male' },
      { firstName: '23Y Female', ageYears: 23, ageMonths: 0, ageDays: 0, gender: 'Female' },
      { firstName: '35Y Male', ageYears: 35, ageMonths: 0, ageDays: 0, gender: 'Male' },
      { firstName: '35Y Female', ageYears: 35, ageMonths: 0, ageDays: 0, gender: 'Female' },
    ];

    console.log(`\n\n🧬 TESTING ADULT PATIENTS (Manual Age Entry):`);
    console.log(`========================================\n`);

    const results = [];
    for (const testPatient of testPatients) {
      const result = getNormalRange(parameter, testPatient);
      results.push({
        patient: testPatient.firstName,
        age: `${testPatient.ageYears}Y ${testPatient.ageMonths}M ${testPatient.ageDays}D`,
        gender: testPatient.gender,
        range: result || '(no match)',
      });
    }

    console.log(`\n\n📊 RESULTS SUMMARY:`);
    console.log(`========================================\n`);
    console.table(results);

    console.log(`\n✅ Testing completed!\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
