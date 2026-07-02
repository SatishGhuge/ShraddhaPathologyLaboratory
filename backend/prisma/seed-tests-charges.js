import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed for Tests, Departments, and Charges...');

  try {
    // Step 1: Create/Ensure Departments
    console.log('\n📦 Creating Departments...');
    const departments = [
      { name: 'Hematology', code: 'HEM' },
      { name: 'Biochemistry', code: 'BIO' },
      { name: 'Microbiology', code: 'MIC' },
      { name: 'Serology', code: 'SER' },
      { name: 'Pathology', code: 'PATH' }
    ];

    const deptMap = {};
    for (const dept of departments) {
      let existingDept = await prisma.department.findUnique({
        where: { name: dept.name }
      });

      if (!existingDept) {
        existingDept = await prisma.department.create({
          data: {
            name: dept.name,
            code: dept.code,
            sortOrder: departments.indexOf(dept) + 1,
            isActive: true
          }
        });
        console.log(`  ✅ Created Department: ${dept.name}`);
      } else {
        console.log(`  ⏭️  Department already exists: ${dept.name}`);
      }
      deptMap[dept.code] = existingDept.id;
    }

    // Step 2: Create 20 Tests with Short Names
    console.log('\n🧪 Creating 20 Tests with Charges...');
    const testsData = [
      // Hematology Tests (5)
      { name: 'Complete Blood Count', shortName: 'CBC', code: 'CBC001', dept: 'HEM', b2cCharge: 200, b2bCharge: 150 },
      { name: 'Blood Group Test', shortName: 'BG', code: 'BG001', dept: 'HEM', b2cCharge: 150, b2bCharge: 120 },
      { name: 'Haemoglobin Test', shortName: 'HB', code: 'HB001', dept: 'HEM', b2cCharge: 100, b2bCharge: 80 },
      { name: 'WBC Count', shortName: 'WBC', code: 'WBC001', dept: 'HEM', b2cCharge: 180, b2bCharge: 140 },
      { name: 'Platelet Count', shortName: 'PLT', code: 'PLT001', dept: 'HEM', b2cCharge: 150, b2bCharge: 120 },

      // Biochemistry Tests (5)
      { name: 'Fasting Blood Sugar', shortName: 'FBS', code: 'FBS001', dept: 'BIO', b2cCharge: 150, b2bCharge: 120 },
      { name: 'Post Prandial Blood Sugar', shortName: 'PPBS', code: 'PPBS001', dept: 'BIO', b2cCharge: 150, b2bCharge: 120 },
      { name: 'Liver Function Test', shortName: 'LFT', code: 'LFT001', dept: 'BIO', b2cCharge: 400, b2bCharge: 300 },
      { name: 'Kidney Function Test', shortName: 'KFT', code: 'KFT001', dept: 'BIO', b2cCharge: 400, b2bCharge: 300 },
      { name: 'Lipid Profile', shortName: 'LP', code: 'LP001', dept: 'BIO', b2cCharge: 350, b2bCharge: 270 },

      // Microbiology Tests (5)
      { name: 'Blood Culture', shortName: 'BC', code: 'BC001', dept: 'MIC', b2cCharge: 500, b2bCharge: 400 },
      { name: 'Urine Culture', shortName: 'UC', code: 'UC001', dept: 'MIC', b2cCharge: 400, b2bCharge: 320 },
      { name: 'Stool Culture', shortName: 'SC', code: 'SC001', dept: 'MIC', b2cCharge: 450, b2bCharge: 360 },
      { name: 'Tuberculosis Test', shortName: 'TB', code: 'TB001', dept: 'MIC', b2cCharge: 600, b2bCharge: 480 },
      { name: 'COVID-19 RT-PCR', shortName: 'COVID', code: 'COVID001', dept: 'MIC', b2cCharge: 500, b2bCharge: 400 },

      // Serology Tests (3)
      { name: 'HIV Test', shortName: 'HIV', code: 'HIV001', dept: 'SER', b2cCharge: 300, b2bCharge: 250 },
      { name: 'Hepatitis B Test', shortName: 'HBsAg', code: 'HBSAG001', dept: 'SER', b2cCharge: 250, b2bCharge: 200 },
      { name: 'Hepatitis C Test', shortName: 'HCV', code: 'HCV001', dept: 'SER', b2cCharge: 250, b2bCharge: 200 },

      // Pathology Tests (2)
      { name: 'Thyroid Profile', shortName: 'TP', code: 'TP001', dept: 'PATH', b2cCharge: 400, b2bCharge: 320 },
      { name: 'Rheumatoid Factor', shortName: 'RF', code: 'RF001', dept: 'PATH', b2cCharge: 350, b2bCharge: 280 }
    ];

    const createdTests = [];
    for (const testData of testsData) {
      let existingTest = await prisma.test.findUnique({
        where: { testCode: testData.code }
      });

      if (!existingTest) {
        existingTest = await prisma.test.create({
          data: {
            name: testData.name,
            shortName: testData.shortName,
            testCode: testData.code,
            departmentId: deptMap[testData.dept],
            sampleType: 'Blood',
            speciality: 'Regular',
            sortOrder: testsData.indexOf(testData) + 1,
            isActive: true,
            isDeleted: false
          }
        });
        console.log(`  ✅ Created Test: ${testData.name} (${testData.shortName})`);
      } else {
        console.log(`  ⏭️  Test already exists: ${testData.name}`);
      }
      createdTests.push({
        ...existingTest,
        b2cCharge: testData.b2cCharge,
        b2bCharge: testData.b2bCharge
      });
    }

    // Step 3: Create Default Charges for all tests
    console.log('\n💰 Creating Default Charges...');
    let chargesCreated = 0;
    for (const test of createdTests) {
      // Check if charge already exists for this test (default: organizationId = null)
      const existingCharge = await prisma.testCharge.findFirst({
        where: {
          testId: test.id,
          organizationId: null
        }
      });

      if (!existingCharge) {
        await prisma.testCharge.create({
          data: {
            testId: test.id,
            organizationId: null,
            b2cCharge: test.b2cCharge,
            b2bCharge: test.b2bCharge,
            discountPercent: 0,
            specialPrice: null,
            isActive: true
          }
        });
        chargesCreated++;
        console.log(`  ✅ Created Charge for: ${test.name} (B2C: ₹${test.b2cCharge}, B2B: ₹${test.b2bCharge})`);
      } else {
        console.log(`  ⏭️  Charge already exists for: ${test.name}`);
      }
    }

    console.log('\n✅ Seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Tests: ${testsData.length}`);
    console.log(`   - Charges Created: ${chargesCreated}`);
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
