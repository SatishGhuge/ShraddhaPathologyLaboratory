import { PrismaClient } from '@prisma/client';
import { generatePatientId, generateVisitId } from '../utils/idGenerator.js';

const prisma = new PrismaClient();

async function setupOutsourcingTest() {
  try {
    console.log('🚀 Setting up Outsourcing Lab Test Scenario with REAL IDs...\n');

    // Step 1: Create an Outsourcing Lab
    console.log('Step 1: Creating Outsourcing Lab...');
    const lab = await prisma.outsourcingLab.upsert({
      where: { code: 'PATHLAB_DELHI' },
      update: {},
      create: {
        labName: 'PathLab Delhi',
        code: 'PATHLAB_DELHI',
        mobile: '9876543210',
        address: 'New Delhi, India',
        isActive: true
      }
    });
    console.log(`✅ Lab created: ${lab.labName} (ID: ${lab.id})\n`);

    // Step 2: Get a test (Hemoglobin) - or create if doesn't exist
    console.log('Step 2: Finding/Creating Test (Hemoglobin)...');
    let test = await prisma.test.findFirst({
      where: { 
        name: {
          contains: 'Hemoglobin'
        }
      }
    });

    if (!test) {
      // Create a simple hemoglobin test
      const dept = await prisma.department.findFirst();
      if (!dept) {
        throw new Error('No departments found. Please create a department first.');
      }

      test = await prisma.test.create({
        data: {
          name: 'Hemoglobin',
          shortName: 'HB',
          testCode: 'HB001',
          departmentId: dept.id,
          isActive: true,
          isDeleted: false
        }
      });
      console.log(`✅ Test created: ${test.name}\n`);
    } else {
      console.log(`✅ Test found: ${test.name}\n`);
    }

    // Step 3: Add test to outsourcing lab with charge
    console.log('Step 3: Adding test to Outsourcing Lab...');
    await prisma.outsourcingLabTest.deleteMany({
      where: { outsourcingLabId: lab.id, testId: test.id }
    });

    const labTest = await prisma.outsourcingLabTest.create({
      data: {
        outsourcingLabId: lab.id,
        testId: test.id,
        charge: 500
      }
    });
    console.log(`✅ Test added to lab with charge: ₹500\n`);

    // Step 4: Create/Update TestCharge for patient registration
    console.log('Step 4: Creating TestCharge record...');
    
    const existingCharge = await prisma.testCharge.findFirst({
      where: {
        testId: test.id,
        organizationId: null
      }
    });

    if (existingCharge) {
      await prisma.testCharge.update({
        where: { id: existingCharge.id },
        data: {
          b2cCharge: 500,
          b2bCharge: 500,
          updatedAt: new Date()
        }
      });
      console.log(`✅ TestCharge updated: ₹500\n`);
    } else {
      await prisma.testCharge.create({
        data: {
          testId: test.id,
          organizationId: null,
          b2cCharge: 500,
          b2bCharge: 500,
          effectiveFrom: new Date(),
          isActive: true
        }
      });
      console.log(`✅ TestCharge created: ₹500\n`);
    }

    // Step 5: Generate REAL Patient ID using your format (S + YY + MM + 00001)
    console.log('Step 5: Generating REAL Patient ID (Format: S + YY + MM + 00001)...');
    const patientId = await generatePatientId();
    console.log(`✅ Patient ID generated: ${patientId}\n`);

    // Step 6: Create patient with real patient ID
    console.log('Step 6: Creating Test Patient with REAL ID Format...');
    const patient = await prisma.patient.create({
      data: {
        patientId: patientId,
        title: 'Mr.',
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        gender: 'Male',
        mobile: '9876543210',
        email: 'john.doe@example.com',
        address: '123 Test Street',
        location: 'Delhi',
        registrationType: 'direct',
        isActive: true
      }
    });
    console.log(`✅ Patient created: ${patient.firstName} ${patient.lastName}\n`);
    console.log(`   Patient ID: ${patient.patientId} ✅ REAL FORMAT (S + YY + MM + 5 digits)\n`);

    // Step 7: Generate REAL Visit ID using your format (YYYYMMDD + 0001)
    console.log('Step 7: Generating REAL Visit ID (Format: YYYYMMDD + 0001)...');
    const visitId = await generateVisitId(new Date());
    console.log(`✅ Visit ID generated: ${visitId}\n`);
    console.log(`   Visit ID: ${visitId} ✅ REAL FORMAT (Date + 4 digits)\n`);

    // Step 8: Register patient with the outsourced test
    console.log('Step 8: Registering Patient with Outsourced Test...');
    const patientTest = await prisma.patientTest.create({
      data: {
        patientId: patient.patientId,
        visitId: visitId,
        testId: test.id,
        departmentId: test.departmentId,
        sample: 'Blood',
        charge: 500,
        status: 'Registered',
        reportMode: 'Email',
        referralDoctor: 'SELF',
        visitDate: new Date(),
        visitTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        totalAmount: 500,
        paidAmount: 500,
        balanceAmount: 0,
        paymentMode: 'Cash',
        businessType: 'B2C',
        isOutsourced: true,
        outsourcedTo: lab.labName
      }
    });
    console.log(`✅ Patient registered with outsourced test\n`);
    console.log(`   PatientTest ID: ${patientTest.id}`);
    console.log(`   isOutsourced: ${patientTest.isOutsourced}`);
    console.log(`   outsourcedTo: ${patientTest.outsourcedTo}\n`);

    console.log('✅ Setup Complete!\n');
    console.log('📋 Test Scenario Summary:');
    console.log(`   Lab: ${lab.labName}`);
    console.log(`   Test: ${test.name}`);
    console.log(`   Charge: ₹500`);
    console.log(`   Patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`   Patient ID: ${patient.patientId} ✅ REAL FORMAT`);
    console.log(`   Visit ID: ${visitId} ✅ REAL FORMAT`);
    console.log(`   PatientTest ID: ${patientTest.id}`);
    console.log(`   Status: ${patientTest.status}`);
    console.log(`   isOutsourced: true`);
    console.log('\n🎯 Next Steps:');
    console.log(`1. Go to Result page (/result)`);
    console.log(`2. Look for patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`3. You should see "⚠️ OUTSOURCING" badge in Result column`);
    console.log(`4. Click on the badge to go to import workflow`);
    console.log(`5. Upload your PDF report`);

  } catch (error) {
    console.error('❌ Error setting up test scenario:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupOutsourcingTest();
