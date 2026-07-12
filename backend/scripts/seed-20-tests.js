import prisma from '../config/database.js';

/**
 * Seed 20 tests with various charges
 * This script creates 20 laboratory tests across different departments
 * and assigns charges for each test
 */

const tests = [
  // Hematology Tests (7 tests)
  {
    name: 'Complete Blood Count',
    shortName: 'CBC',
    testCode: 'HEM001',
    department: 'Hematology',
    b2cCharge: 200,
    b2bCharge: 150,
    sampleType: 'Blood',
  },
  {
    name: 'Hemoglobin & Hematocrit',
    shortName: 'HB/HCT',
    testCode: 'HEM002',
    department: 'Hematology',
    b2cCharge: 150,
    b2bCharge: 100,
    sampleType: 'Blood',
  },
  {
    name: 'Blood Group & RH Factor',
    shortName: 'BG',
    testCode: 'HEM003',
    department: 'Hematology',
    b2cCharge: 300,
    b2bCharge: 250,
    sampleType: 'Blood',
  },
  {
    name: 'Platelet Count',
    shortName: 'PLT',
    testCode: 'HEM004',
    department: 'Hematology',
    b2cCharge: 100,
    b2bCharge: 75,
    sampleType: 'Blood',
  },
  {
    name: 'Prothrombin Time',
    shortName: 'PT/INR',
    testCode: 'HEM005',
    department: 'Hematology',
    b2cCharge: 250,
    b2bCharge: 200,
    sampleType: 'Blood',
  },
  {
    name: 'Activated Partial Thromboplastin Time',
    shortName: 'APTT',
    testCode: 'HEM006',
    department: 'Hematology',
    b2cCharge: 250,
    b2bCharge: 200,
    sampleType: 'Blood',
  },
  {
    name: 'Reticulocyte Count',
    shortName: 'RET',
    testCode: 'HEM007',
    department: 'Hematology',
    b2cCharge: 180,
    b2bCharge: 130,
    sampleType: 'Blood',
  },

  // Clinical Chemistry Tests (7 tests)
  {
    name: 'Blood Glucose (Fasting)',
    shortName: 'GLU-F',
    testCode: 'CC001',
    department: 'Clinical Chemistry',
    b2cCharge: 100,
    b2bCharge: 75,
    sampleType: 'Serum',
  },
  {
    name: 'Blood Glucose (Random)',
    shortName: 'GLU-R',
    testCode: 'CC002',
    department: 'Clinical Chemistry',
    b2cCharge: 100,
    b2bCharge: 75,
    sampleType: 'Serum',
  },
  {
    name: 'Renal Function Test',
    shortName: 'RFT',
    testCode: 'CC003',
    department: 'Clinical Chemistry',
    b2cCharge: 350,
    b2bCharge: 280,
    sampleType: 'Serum',
  },
  {
    name: 'Liver Function Test',
    shortName: 'LFT',
    testCode: 'CC004',
    department: 'Clinical Chemistry',
    b2cCharge: 400,
    b2bCharge: 320,
    sampleType: 'Serum',
  },
  {
    name: 'Lipid Profile',
    shortName: 'LP',
    testCode: 'CC005',
    department: 'Clinical Chemistry',
    b2cCharge: 500,
    b2bCharge: 400,
    sampleType: 'Serum',
  },
  {
    name: 'Electrolytes Panel',
    shortName: 'ELEC',
    testCode: 'CC006',
    department: 'Clinical Chemistry',
    b2cCharge: 300,
    b2bCharge: 240,
    sampleType: 'Serum',
  },
  {
    name: 'Thyroid Profile',
    shortName: 'TSH/T3/T4',
    testCode: 'CC007',
    department: 'Clinical Chemistry',
    b2cCharge: 800,
    b2bCharge: 650,
    sampleType: 'Serum',
  },

  // Microbiology Tests (4 tests)
  {
    name: 'Blood Culture',
    shortName: 'BCULTURE',
    testCode: 'MB001',
    department: 'Microbiology',
    b2cCharge: 600,
    b2bCharge: 480,
    sampleType: 'Blood',
  },
  {
    name: 'Urine Culture',
    shortName: 'UCULTURE',
    testCode: 'MB002',
    department: 'Microbiology',
    b2cCharge: 400,
    b2bCharge: 320,
    sampleType: 'Urine',
  },
  {
    name: 'Stool Culture',
    shortName: 'SCULTURE',
    testCode: 'MB003',
    department: 'Microbiology',
    b2cCharge: 500,
    b2bCharge: 400,
    sampleType: 'Stool',
  },
  {
    name: 'Wound Culture',
    shortName: 'WCULTURE',
    testCode: 'MB004',
    department: 'Microbiology',
    b2cCharge: 450,
    b2bCharge: 360,
    sampleType: 'Swab',
  },
];

async function seedTests() {
  try {
    console.log('\n📋 Starting 20 Tests with Charges Seed...\n');

    // Get or create departments
    const departments = {};
    const uniqueDepts = ['Hematology', 'Clinical Chemistry', 'Microbiology'];

    for (const deptName of uniqueDepts) {
      const dept = await prisma.department.upsert({
        where: { name: deptName },
        update: { isActive: true },
        create: { name: deptName, code: deptName.substring(0, 3).toUpperCase(), isActive: true },
      });
      departments[deptName] = dept.id;
      console.log(`✅ Department: ${deptName} (ID: ${dept.id})`);
    }

    // Seed tests and charges
    let createdCount = 0;
    const testIds = [];

    for (const testData of tests) {
      try {
        // Create or update test
        const test = await prisma.test.upsert({
          where: { testCode: testData.testCode },
          update: {
            name: testData.name,
            isActive: true,
          },
          create: {
            name: testData.name,
            shortName: testData.shortName,
            testCode: testData.testCode,
            departmentId: departments[testData.department],
            sampleTypeId: null, // Can be added later if needed
            isActive: true,
            isDeleted: false,
          },
        });

        testIds.push(test.id);

        // Create or update charge for this test
        const charge = await prisma.testCharge.upsert({
          where: { testId: test.id },
          update: {
            b2cCharge: testData.b2cCharge,
            b2bCharge: testData.b2bCharge,
            isActive: true,
          },
          create: {
            testId: test.id,
            organizationId: null, // Global charge
            b2cCharge: testData.b2cCharge,
            b2bCharge: testData.b2bCharge,
            discountPercent: 0,
            isActive: true,
          },
        });

        console.log(`  ✅ ${testData.name}`);
        console.log(`     Code: ${testData.testCode} | B2C: ₹${testData.b2cCharge} | B2B: ₹${testData.b2bCharge}`);
        createdCount++;
      } catch (error) {
        console.log(`  ❌ Error creating "${testData.name}": ${error.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Tests Created/Updated: ${createdCount}`);
    console.log(`  ✅ Departments: ${Object.keys(departments).length}`);
    console.log(`  ✅ Total Charges Configured: ${createdCount}`);
    console.log(`\n✨ Test Seeding Complete!\n`);

    return testIds;
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
