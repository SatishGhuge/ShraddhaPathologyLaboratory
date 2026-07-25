const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Checking database for sample types...\n');
    
    // Find Fluoride Plasma-F sample type
    const sampleType = await prisma.sample_type.findFirst({
      where: {
        Sample_Type: {
          contains: 'Fluoride'
        }
      }
    });
    
    if (sampleType) {
      console.log('✅ Found Sample Type:');
      console.log('   ID:', sampleType.id);
      console.log('   Sample_Type:', sampleType.Sample_Type);
      console.log('   Sample_Color:', sampleType.Sample_Color);
      console.log('');
    } else {
      console.log('⚠️  No sample type with "Fluoride" found\n');
    }
    
    // Find tests using this sample type
    if (sampleType) {
      console.log('🔍 Finding tests with this sample type...\n');
      const tests = await prisma.test.findMany({
        where: {
          sampleTypeId: sampleType.id
        },
        select: {
          id: true,
          name: true,
          shortName: true,
          sampleTypeId: true,
          sample_type: {
            select: {
              id: true,
              Sample_Type: true,
              Sample_Color: true
            }
          }
        },
        take: 5
      });
      
      if (tests.length > 0) {
        console.log('✅ Found Tests using this sample type:');
        tests.forEach(test => {
          console.log('   - Test ID:', test.id, ', Name:', test.name, ', SampleTypeId:', test.sampleTypeId);
        });
        console.log('');
      }
      
      // Find a patient test with this sample type
      console.log('🔍 Finding patient tests with this sample type...\n');
      const patientTests = await prisma.patientTest.findMany({
        where: {
          test: {
            sampleTypeId: sampleType.id
          }
        },
        include: {
          test: {
            select: {
              id: true,
              name: true,
              shortName: true,
              sampleTypeId: true,
              sample_type: {
                select: {
                  id: true,
                  Sample_Type: true
                }
              }
            }
          }
        },
        take: 3
      });
      
      if (patientTests.length > 0) {
        console.log('✅ Found Patient Tests with Fluoride Plasma-F:');
        patientTests.forEach(pt => {
          console.log('   - VisitId:', pt.visitId);
          console.log('     PatientTestId:', pt.id);
          console.log('     Test Name:', pt.test.name);
          console.log('     Sample Type ID:', pt.test.sampleTypeId);
          console.log('     Sample Type Name:', pt.test.sample_type?.Sample_Type);
          console.log('     ✅ Expected Barcode: ' + pt.visitId + '-' + pt.test.sampleTypeId);
          console.log('');
        });
      } else {
        console.log('⚠️  No patient tests found with this sample type\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
