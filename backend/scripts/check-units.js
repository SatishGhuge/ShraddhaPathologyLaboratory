import prisma from '../config/database.js';

async function checkUnits() {
  try {
    console.log('🔍 Checking Units in Database...\n');

    // Check if units table is empty
    const unitCount = await prisma.unit.count();
    console.log(`📊 Total Units in Database: ${unitCount}`);

    // Get all units
    const units = await prisma.unit.findMany({
      take: 20
    });
    
    console.log('\n📋 Sample Units:');
    console.table(units);

    // Check test parameters that have units
    const paramsWithUnits = await prisma.testParameter.findMany({
      where: {
        unitId: {
          not: null
        }
      },
      select: {
        id: true,
        parameterName: true,
        unitId: true,
        unit: {
          select: {
            id: true,
            symbol: true
          }
        }
      },
      take: 20
    });

    console.log(`\n✅ Test Parameters with Units (showing first 20):`);
    console.table(paramsWithUnits.map(p => ({
      id: p.id,
      parameterName: p.parameterName,
      unitId: p.unitId,
      unit_symbol: p.unit?.symbol || '(null)'
    })));

    console.log(`\n📊 Total Parameters with Units: ${await prisma.testParameter.count({ where: { unitId: { not: null } } })}`);
    console.log(`📊 Total Parameters without Units: ${await prisma.testParameter.count({ where: { unitId: null } })}`);

    // Check a specific test and its parameters
    const test = await prisma.test.findFirst();
    if (test) {
      console.log(`\n🧪 Sample Test: ${test.name} (ID: ${test.id})`);
      
      const params = await prisma.testParameter.findMany({
        where: { testId: test.id },
        select: {
          id: true,
          parameterName: true,
          unitId: true,
          unit: { select: { symbol: true } }
        },
        take: 5
      });

      console.log(`  Parameters:`);
      console.table(params.map(p => ({
        parameterName: p.parameterName,
        unitId: p.unitId,
        unit_symbol: p.unit?.symbol || '(none)'
      })));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnits();
