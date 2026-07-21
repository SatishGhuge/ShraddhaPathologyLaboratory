import prisma from '../config/database.js';

async function checkInterpretation() {
  try {
    console.log('🔍 Checking Interpretation in Tests...\n');

    // Get all tests
    const tests = await prisma.test.findMany({
      select: {
        id: true,
        name: true,
        interpretation: true,
        interpretationLabel: true
      },
      take: 20
    });

    console.log(`📊 Total Tests with interpretation data:`);
    console.table(tests.map(t => ({
      id: t.id,
      name: t.name,
      hasInterpretation: t.interpretation ? 'Yes' : 'No',
      interpretationLength: t.interpretation ? t.interpretation.length : 0,
      interpretationLabel: t.interpretationLabel || '(none)',
      preview: t.interpretation ? t.interpretation.substring(0, 50) + '...' : '(empty)'
    })));

    const withInterpretation = tests.filter(t => t.interpretation).length;
    const withoutInterpretation = tests.filter(t => !t.interpretation).length;

    console.log(`\n📈 Statistics:`);
    console.log(`   Tests WITH interpretation: ${withInterpretation}`);
    console.log(`   Tests WITHOUT interpretation: ${withoutInterpretation}`);

    if (withInterpretation > 0) {
      console.log(`\n✅ Sample interpretation:`);
      const sample = tests.find(t => t.interpretation);
      console.log(`   Test: ${sample.name}`);
      console.log(`   Label: ${sample.interpretationLabel || '(no label)'}`);
      console.log(`   Content: ${sample.interpretation.substring(0, 150)}...`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInterpretation();
