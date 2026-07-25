import prisma from '../config/database.js';

async function testBarcodeData() {
  try {
    console.log('🔍 Testing barcode data extraction...\n');

    // Get a patient test with data
    const patientTest = await prisma.patientTest.findFirst({
      where: {
        status: { not: 'Excluded' }
      },
      include: {
        patient: {
          select: {
            patientId: true,
            firstName: true,
            lastName: true,
            age: true,
            gender: true
          }
        },
        test: {
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
          }
        }
      }
    });

    if (!patientTest) {
      console.log('❌ No patient tests found');
      process.exit(1);
    }

    console.log('✅ Found PatientTest:', patientTest.id);
    console.log('\n📊 PatientTest Data Structure:');
    console.log(JSON.stringify(patientTest, null, 2));

    console.log('\n✅ Key Fields for Barcode:');
    console.log('  visitId:', patientTest.visitId);
    console.log('  test.sampleTypeId:', patientTest.test?.sampleTypeId);
    console.log('  test.sample_type.Sample_Type:', patientTest.test?.sample_type?.Sample_Type);
    console.log('  test.shortName:', patientTest.test?.shortName);

    console.log('\n✅ Expected Barcode Format:');
    const barcodeValue = `${patientTest.visitId}-${patientTest.test?.sampleTypeId || 'unknown'}`;
    console.log('  barcodeValue:', barcodeValue);

    console.log('\n✅ All required fields present:');
    console.log('  visitId:', !!patientTest.visitId);
    console.log('  test.sampleTypeId:', !!patientTest.test?.sampleTypeId);
    console.log('  test.sample_type:', !!patientTest.test?.sample_type);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBarcodeData();
