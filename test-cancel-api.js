// Test script to verify cancelTest API endpoint
const fetch = require('node-fetch');

async function testCancelAPI() {
  try {
    console.log('\n🧪 Testing Cancel Test API...\n');

    // Step 1: Get a patient with tests
    console.log('Step 1: Fetching patients...');
    const patientsRes = await fetch('http://localhost:5000/api/patients?page=1&limit=5');
    const patientsData = await patientsRes.json();
    
    if (!patientsData.success || !patientsData.data || patientsData.data.length === 0) {
      console.error('❌ No patients found');
      return;
    }

    const patient = patientsData.data[0];
    console.log(`✅ Found patient: ${patient.patientId} - ${patient.firstName} ${patient.lastName}`);
    console.log(`   Tests: ${patient.tests?.length || 0}`);

    if (!patient.tests || patient.tests.length === 0) {
      console.error('❌ Patient has no tests');
      return;
    }

    // Get first test
    const test = patient.tests[0];
    const visitId = test.visitId;
    const testId = test.id;

    console.log(`\n✅ Found test to cancel:`);
    console.log(`   Test ID: ${testId}`);
    console.log(`   Test Name: ${test.test?.name}`);
    console.log(`   Visit ID: ${visitId}`);
    console.log(`   Status: ${test.status}`);
    console.log(`   Charge: ${test.charge}`);

    // Step 2: Call cancel-test endpoint
    console.log(`\nStep 2: Calling POST /api/patients/${visitId}/cancel-test/${testId}...`);
    
    const cancelRes = await fetch(
      `http://localhost:5000/api/patients/${visitId}/cancel-test/${testId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: 'Test cancellation from test script' })
      }
    );

    const cancelData = await cancelRes.json();

    if (!cancelRes.ok) {
      console.error(`❌ API returned ${cancelRes.status}:`, cancelData);
      return;
    }

    if (!cancelData.success) {
      console.error('❌ Cancellation failed:', cancelData.message);
      return;
    }

    console.log('✅ Cancellation successful!');
    console.log('\n📊 Response data:');
    console.log('   Updated Test Status:', cancelData.data.updatedTest.status);
    console.log('   New Gross Amount:', cancelData.data.updatedBill.grossAmount);
    console.log('   New Balance:', cancelData.data.updatedBill.balanceAmount);
    console.log('   Total Paid:', cancelData.data.updatedBill.totalPaid);
    console.log('   Refund Created:', cancelData.data.refund ? 'Yes' : 'No');

    // Step 3: Verify test is now cancelled by fetching patient again
    console.log(`\nStep 3: Verifying cancellation by fetching patient again...`);
    
    const verifyRes = await fetch(`http://localhost:5000/api/patients/${patient.patientId}`);
    const verifyData = await verifyRes.json();

    if (verifyData.success) {
      const cancelledTest = verifyData.data.tests.find(t => t.id === testId);
      if (!cancelledTest) {
        console.log('✅ Cancelled test is now HIDDEN from patient tests list (filtered out)');
        console.log(`   Remaining tests: ${verifyData.data.tests.length}`);
      } else if (cancelledTest.status === 'Cancelled') {
        console.log('✅ Cancelled test still exists but marked as status="Cancelled"');
        console.log(`   Status: ${cancelledTest.status}`);
      }
    }

    console.log('\n🎉 Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCancelAPI();
