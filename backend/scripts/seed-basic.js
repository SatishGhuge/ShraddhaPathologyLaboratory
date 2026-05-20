import dotenv from 'dotenv';
import prisma from '../config/database.js';

dotenv.config();

async function main() {
  console.log('🌱 Starting basic database seeding...\n');

  try {
    // 1. Create Departments
    console.log('📁 Creating departments...');
    const departments = [
      { name: 'HAEMATOLOGY', code: 'HEM', sortOrder: 1 },
      { name: 'BIOCHEMISTRY', code: 'BIO', sortOrder: 2 },
      { name: 'MICROBIOLOGY', code: 'MIC', sortOrder: 3 },
      { name: 'RADIOLOGY', code: 'RAD', sortOrder: 4 },
      { name: 'PATHOLOGY', code: 'PATH', sortOrder: 5 },
    ];

    for (const dept of departments) {
      await prisma.department.upsert({
        where: { name: dept.name },
        update: {},
        create: dept
      });
    }
    console.log('✅ Created 5 departments\n');

    // 2. Create Tests with Charges
    console.log('🧪 Creating tests...');
    const haematology = await prisma.department.findUnique({ where: { name: 'HAEMATOLOGY' } });
    const biochemistry = await prisma.department.findUnique({ where: { name: 'BIOCHEMISTRY' } });
    
    const tests = [
      { name: 'COMPLETE BLOOD COUNT', shortName: 'CBC', departmentId: haematology.id, sampleType: 'EDTA Blood', b2c: 300, b2b: 250 },
      { name: 'PLATELET COUNT', shortName: 'PLT', departmentId: haematology.id, sampleType: 'EDTA Blood', b2c: 150, b2b: 120 },
      { name: 'ESR', shortName: 'ESR', departmentId: haematology.id, sampleType: 'EDTA Blood', b2c: 100, b2b: 80 },
      { name: 'HEMOGLOBIN', shortName: 'HB', departmentId: haematology.id, sampleType: 'EDTA Blood', b2c: 80, b2b: 60 },
      { name: 'BLOOD SUGAR FASTING', shortName: 'BSF', departmentId: biochemistry.id, sampleType: 'Fluoride Plasma', b2c: 120, b2b: 100 },
      { name: 'BLOOD SUGAR PP', shortName: 'BSPP', departmentId: biochemistry.id, sampleType: 'Fluoride Plasma', b2c: 120, b2b: 100 },
      { name: 'HbA1c', shortName: 'HbA1c', departmentId: biochemistry.id, sampleType: 'EDTA Blood', b2c: 500, b2b: 400 },
      { name: 'LIPID PROFILE', shortName: 'LP', departmentId: biochemistry.id, sampleType: 'Serum', b2c: 600, b2b: 500 },
      { name: 'LIVER FUNCTION TEST', shortName: 'LFT', departmentId: biochemistry.id, sampleType: 'Serum', b2c: 700, b2b: 600 },
      { name: 'KIDNEY FUNCTION TEST', shortName: 'KFT', departmentId: biochemistry.id, sampleType: 'Serum', b2c: 600, b2b: 500 },
    ];

    for (const testData of tests) {
      const { b2c, b2b, ...testInfo } = testData;
      
      // Create test
      const test = await prisma.test.upsert({
        where: { 
          name_departmentId: { 
            name: testInfo.name, 
            departmentId: testInfo.departmentId 
          } 
        },
        update: {},
        create: testInfo
      });

      // Create default test charge
      await prisma.testCharge.create({
        data: {
          testId: test.id,
          b2cCharge: b2c,
          b2bCharge: b2b,
          isActive: true
        }
      }).catch(() => {
        // Charge might already exist, skip
      });
    }
    console.log('✅ Created 10 tests with charges\n');

    // 3. Create Packages
    console.log('📦 Creating packages...');
    const packages = [
      { 
        name: 'Basic Health Checkup', 
        code: 'BHC', 
        departmentId: haematology.id, 
        b2cCharge: 800, 
        b2bCharge: 650,
        tests: ['COMPLETE BLOOD COUNT', 'ESR', 'BLOOD SUGAR FASTING']
      },
      { 
        name: 'Diabetes Package', 
        code: 'DIA', 
        departmentId: biochemistry.id, 
        b2cCharge: 1200, 
        b2bCharge: 1000,
        tests: ['BLOOD SUGAR FASTING', 'BLOOD SUGAR PP', 'HbA1c']
      },
      { 
        name: 'Executive Health Checkup', 
        code: 'EHC', 
        departmentId: biochemistry.id, 
        b2cCharge: 2500, 
        b2bCharge: 2000,
        tests: ['COMPLETE BLOOD COUNT', 'LIPID PROFILE', 'LIVER FUNCTION TEST', 'KIDNEY FUNCTION TEST', 'BLOOD SUGAR FASTING']
      },
    ];

    for (const pkgData of packages) {
      const { tests: testNames, ...pkgInfo } = pkgData;
      
      // Create package (check if exists first)
      let pkg = await prisma.package.findFirst({
        where: { name: pkgInfo.name }
      });
      
      if (!pkg) {
        pkg = await prisma.package.create({
          data: pkgInfo
        });
      }

      // Link tests to package
      for (const testName of testNames) {
        const test = await prisma.test.findFirst({
          where: { name: testName }
        });
        
        if (test) {
          await prisma.packageTest.upsert({
            where: {
              packageId_testId: {
                packageId: pkg.id,
                testId: test.id
              }
            },
            update: {},
            create: {
              packageId: pkg.id,
              testId: test.id
            }
          });
        }
      }
    }
    console.log('✅ Created 3 packages with test links\n');

    // 4. Create Doctors
    console.log('👨‍⚕️ Creating doctors...');
    const doctors = [
      { name: 'Dr. Rajesh Sharma', degree: 'MBBS, MD', mobile: '9876543210', specialty: 'General Physician', type: 'Doctor' },
      { name: 'Dr. Priya Verma', degree: 'MBBS, MS', mobile: '9876543211', specialty: 'Surgeon', type: 'Doctor' },
      { name: 'Dr. Anil Kumar', degree: 'MBBS, DM', mobile: '9876543212', specialty: 'Cardiologist', type: 'Doctor' },
      { name: 'Dr. Sunita Patel', degree: 'MBBS, MD', mobile: '9876543213', specialty: 'Pathologist', type: 'Doctor' },
      { name: 'Dr. Amit Singh', degree: 'MBBS, MD', mobile: '9876543214', specialty: 'Radiologist', type: 'Doctor' },
    ];

    await prisma.doctor.createMany({
      data: doctors,
      skipDuplicates: true
    });
    console.log('✅ Created 5 doctors\n');

    // 5. Create Corporates
    console.log('🏢 Creating corporates...');
    const corporates = [
      { name: 'TCS' },
      { name: 'Wipro' },
      { name: 'Infosys' },
      { name: 'HCL Technologies' },
      { name: 'Tech Mahindra' },
      { name: 'Cognizant' },
      { name: 'Accenture' },
      { name: 'IBM India' },
    ];

    await prisma.corporate.createMany({
      data: corporates,
      skipDuplicates: true
    });
    console.log('✅ Created 8 corporates\n');

    // 6. Create Units
    console.log('📏 Creating units...');
    const units = [
      { symbol: 'mg/dL' },
      { symbol: 'g/dL' },
      { symbol: 'mmol/L' },
      { symbol: 'IU/L' },
      { symbol: 'U/L' },
      { symbol: 'mg/L' },
      { symbol: 'µg/dL' },
      { symbol: 'pg/mL' },
      { symbol: 'fL' },
      { symbol: '%' },
      { symbol: 'cells/µL' },
      { symbol: 'K/µL' },
      { symbol: 'mm/hr' },
      { symbol: 'lakhs/cumm' },
    ];

    await prisma.unit.createMany({
      data: units,
      skipDuplicates: true
    });
    console.log('✅ Created 14 units\n');

    // 7. Create Sample Types
    console.log('🧪 Creating sample types...');
    const sampleTypes = [
      { Sample_Type: 'EDTA Blood', Sample_Color: 'Purple' },
      { Sample_Type: 'Serum', Sample_Color: 'Red' },
      { Sample_Type: 'Plasma', Sample_Color: 'Green' },
      { Sample_Type: 'Fluoride Plasma', Sample_Color: 'Grey' },
      { Sample_Type: 'Urine', Sample_Color: 'Yellow' },
      { Sample_Type: 'Stool', Sample_Color: 'Brown' },
      { Sample_Type: 'CSF', Sample_Color: 'Clear' },
      { Sample_Type: 'Sputum', Sample_Color: 'White' },
    ];

    await prisma.sample_type.createMany({
      data: sampleTypes,
      skipDuplicates: true
    });
    console.log('✅ Created 8 sample types\n');

    console.log('🎉 Basic seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 5 Departments');
    console.log('   - 10 Tests with default charges');
    console.log('   - 3 Packages with test links');
    console.log('   - 5 Doctors');
    console.log('   - 8 Corporates');
    console.log('   - 14 Units');
    console.log('   - 8 Sample Types');
    console.log('\n💡 Next steps:');
    console.log('   - Create franchises and centers via UI (they need String IDs)');
    console.log('   - Add test parameters via UI');
    console.log('   - Configure test charges for specific franchises/centers');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
