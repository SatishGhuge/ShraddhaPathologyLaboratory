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

  const patientGender = patient.gender?.toLowerCase();
  
  let exactAgeInDays = patient.ageDays ?? 0;
  let exactAgeInMonths = patient.ageMonths ?? 0;
  let exactAgeInYears = patient.ageYears ?? 0;

  console.log(`\n📍 Testing patient: ${patient.firstName} (${exactAgeInYears}Y ${exactAgeInMonths}M ${exactAgeInDays}D, ${patientGender})`);
  console.log(`   Parameter: ${parameter.parameterName}`);

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
          
          // ✅ IMPORTANT: For Month/Day ranges, also ensure patient hasn't aged beyond that unit
          // e.g., for "Between 1-3 months", ensure patient is 0 years old
          // e.g., for "Between 1-3 days", ensure patient is 0 months and 0 years old
          if (ageMatches && range.timeUnit === 'Month(s)' && exactAgeInYears > 0) {
            console.log(`      ⚠️ Age check passed but patient is too old for this range (${exactAgeInYears} years > 0 years)`);
            ageMatches = false;
          }
          if (ageMatches && range.timeUnit === 'Day(s)' && (exactAgeInYears > 0 || exactAgeInMonths > 0)) {
            console.log(`      ⚠️ Age check passed but patient is too old for this range (${exactAgeInYears}Y ${exactAgeInMonths}M > 0Y 0M)`);
            ageMatches = false;
          }
          
          if (ageMatches) {
            console.log(`      ✅ Age Check: "Between" - ageToCheck(${range.timeUnit})=${ageToCheck} in [${range.from}, ${range.to}] = MATCH`);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing age ranges:', error);
    }
  }

  // Fallback to simple ranges
  if (parameter.rangeType === 'BySex' || parameter.rangeType === 'ByGenderAndAge') {
    if (exactAgeInYears < 18 && parameter.childActive && 
        parameter.childLowValue !== null && parameter.childHighValue !== null) {
      console.log(`   ✅ MATCHED: Child range (age < 18)`);
      console.log(`      → Range: ${parameter.childLowValue} - ${parameter.childHighValue}`);
      return `${parameter.childLowValue} - ${parameter.childHighValue}`;
    }
    
    if (exactAgeInYears >= 18) {
      if (patientGender === 'female' && parameter.femaleActive && 
          parameter.femaleLowValue !== null && parameter.femaleHighValue !== null) {
        console.log(`   ✅ MATCHED: Adult Female range (age >= 18)`);
        console.log(`      → Range: ${parameter.femaleLowValue} - ${parameter.femaleHighValue}`);
        return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
      }
      
      if (patientGender === 'male' && parameter.maleActive && 
          parameter.maleLowValue !== null && parameter.maleHighValue !== null) {
        console.log(`   ✅ MATCHED: Adult Male range (age >= 18)`);
        console.log(`      → Range: ${parameter.maleLowValue} - ${parameter.maleHighValue}`);
        return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
      }
    }
  }

  console.log(`   ❌ NO MATCH - returning empty`);
  return '';
}

async function test() {
  try {
    console.log('\n========================================');
    console.log('  Age-Based Reference Range Testing');
    console.log('========================================');

    // Get a parameter with age ranges (RED BLOOD CELL COUNT)
    const parameter = await prisma.testParameter.findFirst({
      where: { parameterName: { contains: 'RED BLOOD CELL' } }
    });

    if (!parameter) {
      console.log('❌ Parameter not found');
      return;
    }

    // Create test patients with different ages
    const testPatients = [
      { name: 'Baby Boy', ageYears: 0, ageMonths: 2, ageDays: 15, gender: 'Male' },
      { name: 'Toddler Girl', ageYears: 2, ageMonths: 6, ageDays: 10, gender: 'Female' },
      { name: 'Child Boy', ageYears: 8, ageMonths: 3, ageDays: 5, gender: 'Male' },
      { name: 'Teen Girl', ageYears: 15, ageMonths: 11, ageDays: 20, gender: 'Female' },
      { name: 'Adult Male', ageYears: 25, ageMonths: 4, ageDays: 12, gender: 'Male' },
      { name: 'Adult Female', ageYears: 30, ageMonths: 7, ageDays: 8, gender: 'Female' },
      { name: 'Senior Male', ageYears: 65, ageMonths: 2, ageDays: 0, gender: 'Male' },
      { name: 'Senior Female', ageYears: 72, ageMonths: 10, ageDays: 15, gender: 'Female' },
    ];

    console.log(`\n🧪 Parameter: ${parameter.parameterName}`);
    console.log(`   Type: ${parameter.rangeType}`);
    console.log(`   Child Active: ${parameter.childActive}`);
    console.log(`   Female Active: ${parameter.femaleActive}`);
    console.log(`   Male Active: ${parameter.maleActive}`);

    if (parameter.ageRanges) {
      const ageRanges = JSON.parse(parameter.ageRanges);
      console.log(`\n   Age Ranges (${ageRanges.length} total):`);
      ageRanges.forEach((r, idx) => {
        if (r.enabled) {
          console.log(`     ${idx + 1}. "${r.label}" (${r.gender}) - ${r.from}-${r.to} ${r.timeUnit} → ${r.ll}-${r.ul}`);
        }
      });
    }

    console.log(`\n\n🧬 TESTING WITH DIFFERENT AGE GROUPS:`);
    console.log(`========================================\n`);

    const results = [];
    for (const testPatient of testPatients) {
      const result = getNormalRange(parameter, testPatient);
      results.push({
        name: testPatient.name,
        age: `${testPatient.ageYears}Y`,
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
