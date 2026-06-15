import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testChargesAPI() {
  console.log('🔍 Testing API Charges Endpoints...\n');

  try {
    // Test 1: Get all charges
    console.log('1️⃣  Testing GET /master/test-charges/all');
    let res = await fetch(`${API_BASE}/master/test-charges/all`, { method: 'GET' });
    let data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Charges found: ${data.data?.length || 0}`);
    console.log(`   First charge:`, data.data?.[0]);

    // Test 2: Get charges for specific organization
    const orgId = 'ORG-AAC'; // alandi
    console.log(`\n2️⃣  Testing GET /master/organizations/${orgId}/charges`);
    res = await fetch(`${API_BASE}/master/organizations/${orgId}/charges`, { method: 'GET' });
    data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Charges found: ${data.data?.length || 0}`);
    console.log(`   All charges for this org:`);
    data.data?.forEach(c => {
      console.log(`      - Test ${c.testId}: B2C=₹${c.b2cCharge}, B2B=₹${c.b2bCharge}`);
    });

    // Test 3: Get charges for different organization
    const orgId2 = 'ORG-AAA'; // Main Lab
    console.log(`\n3️⃣  Testing GET /master/organizations/${orgId2}/charges`);
    res = await fetch(`${API_BASE}/master/organizations/${orgId2}/charges`, { method: 'GET' });
    data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Charges found: ${data.data?.length || 0}`);
    console.log(`   All charges for this org:`);
    data.data?.forEach(c => {
      console.log(`      - Test ${c.testId}: B2C=₹${c.b2cCharge}, B2B=₹${c.b2bCharge}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testChargesAPI();
