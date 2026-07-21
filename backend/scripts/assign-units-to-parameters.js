import prisma from '../config/database.js';

async function assignUnitsToParameters() {
  try {
    console.log('🔧 Assigning Units to Test Parameters...\n');

    // Define unit mappings based on parameter names
    const unitMappings = [
      {
        name_contains: 'Glucose',
        unitSymbol: 'mg/dl',
        description: 'Blood glucose tests'
      },
      {
        name_contains: 'Albumin',
        unitSymbol: 'gm/dl',
        description: 'Albumin tests'
      },
      {
        name_contains: '%',
        unitSymbol: '%',
        description: 'Percentage values'
      },
      {
        name_contains: 'cumm',
        unitSymbol: 'lac/cumm',
        description: 'Cell count tests'
      }
    ];

    let totalUpdated = 0;

    for (const mapping of unitMappings) {
      // Find unit by symbol
      const unit = await prisma.unit.findUnique({
        where: { symbol: mapping.unitSymbol }
      });

      if (!unit) {
        console.log(`⚠️  Unit "${mapping.unitSymbol}" not found in database. Skipping ${mapping.description}`);
        continue;
      }

      // Find parameters matching the name pattern
      const paramsToUpdate = await prisma.testParameter.findMany({
        where: {
          parameterName: {
            contains: mapping.name_contains
          },
          unitId: null  // Only update parameters that don't have a unit
        },
        select: {
          id: true,
          parameterName: true
        }
      });

      if (paramsToUpdate.length === 0) {
        console.log(`ℹ️  No parameters matching "${mapping.name_contains}" need units`);
        continue;
      }

      // Update all matching parameters
      const result = await prisma.testParameter.updateMany({
        where: {
          parameterName: {
            contains: mapping.name_contains
          },
          unitId: null
        },
        data: {
          unitId: unit.id
        }
      });

      console.log(`✅ ${result.count} parameters updated for: ${mapping.description}`);
      console.log(`   Pattern: "${mapping.name_contains}" → Unit: "${mapping.unitSymbol}"`);
      paramsToUpdate.slice(0, 3).forEach(p => {
        console.log(`      - ${p.parameterName}`);
      });
      if (paramsToUpdate.length > 3) {
        console.log(`      ... and ${paramsToUpdate.length - 3} more`);
      }

      totalUpdated += result.count;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total parameters updated: ${totalUpdated}`);

    // Show final status
    const paramsWithUnits = await prisma.testParameter.count({
      where: { unitId: { not: null } }
    });
    const paramsWithoutUnits = await prisma.testParameter.count({
      where: { unitId: null }
    });

    console.log(`\n📈 Final Database State:`);
    console.log(`   Parameters WITH units: ${paramsWithUnits}`);
    console.log(`   Parameters WITHOUT units: ${paramsWithoutUnits}`);

    if (paramsWithoutUnits > 0) {
      console.log(`\n⚠️  ${paramsWithoutUnits} parameters still don't have units assigned`);
      console.log('   They will show empty in the UNITS column\n');

      const unitslessParams = await prisma.testParameter.findMany({
        where: { unitId: null },
        select: { id: true, parameterName: true, testId: true },
        take: 10
      });

      console.log('   Sample parameters without units:');
      unitslessParams.forEach(p => {
        console.log(`      - ID ${p.id}: ${p.parameterName}`);
      });

      if (unitslessParams.length === 10) {
        console.log('      ... and more');
      }
    }

  } catch (error) {
    console.error('❌ Error assigning units:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignUnitsToParameters();
