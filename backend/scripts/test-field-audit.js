import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const token = 'your-token-here';

async function testFieldAudit() {
  console.log('\n=== FIELD AUDIT TEST ===\n');
  
  // Test 1: Create a test with all valid fields
  console.log('📝 TEST 1: Create test with valid fields only...');
  const createPayload = {
    name: 'AUDIT_TEST_' + Date.now(),
    shortName: 'AUD',
    testCode: 'AUDIT' + Date.now(),
    departmentId: 1,
    sampleTypeId: 1,
    machineName: 'TestMachine',
    group: 'TestGroup',
    reportHeader: 'Test Report',
    preparationTime: '2',
    preparationType: 'Hours',
    instructionPreparation: 'Prepare well',
    instructionPatient: 'Fast before test',
    interpretationLabel: 'Result Label',
    interpretation: '<p>Test interpretation</p>',
    outsourceLab: 'No',
    attachFile: true,
    profileTest: false,
    isHeader: true,
    showTestName: true,
    isNABL: false,
    lineHeight: 1.4,
    imageSize: '800|600',
    linkedTestIds: [1, 2],
    categories: [
      {
        categoryId: 'cat-1',
        name: 'Category 1',
        isCategory: false,
        testMethod: 'Method1',
        sortOrder: 1,
        parameters: [
          {
            parameterName: 'Parameter 1',
            machineCode: 'P1',
            decimal: 2,
            unitId: 1,
            type: 'Numeric',
            rangeType: 'BySex',
            normalRanges: [
              { gender: 'Male', lowValue: 70, highValue: 100, isActive: true },
              { gender: 'Female', lowValue: 65, highValue: 95, isActive: false },
              { gender: 'Child', lowValue: 60, highValue: 90, isActive: false }
            ]
          }
        ]
      }
    ]
  };

  try {
    const res = await fetch(`${API_URL}/master/tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(createPayload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const testId = data.data.id;
      console.log('✅ Test created with ID:', testId);
      
      // Test 2: Fetch the test and verify fields
      console.log('\n📖 TEST 2: Fetching test and verifying fields...');
      const getRes = await fetch(`${API_URL}/master/tests/${testId}`);
      const getData = await getRes.json();
      
      if (getData.success) {
        const test = getData.data;
        
        console.log('\n🔍 FIELD VERIFICATION:');
        console.log('✓ name:', test.name);
        console.log('✓ shortName:', test.shortName);
        console.log('✓ testCode:', test.testCode);
        console.log('✓ departmentId:', test.departmentId);
        console.log('✓ sampleTypeId:', test.sampleTypeId);
        console.log('✓ attachFile:', test.attachFile, '(type:', typeof test.attachFile + ')');
        console.log('✓ profileTest:', test.profileTest, '(type:', typeof test.profileTest + ')');
        console.log('✓ imageSize:', test.imageSize);
        console.log('✓ lineHeight:', test.lineHeight);
        console.log('✓ linkedTestIds:', test.linkedTestIds);
        console.log('✓ categories:', test.categories?.length || 0, 'categories');
        
        // Verify NO deleted fields
        console.log('\n⚠️ DELETED FIELDS CHECK:');
        console.log('❌ costForLab present?', 'costForLab' in test ? 'YES (ERROR)' : 'NO (OK)');
        console.log('❌ signatureId present?', 'signatureId' in test ? 'YES (ERROR)' : 'NO (OK)');
        console.log('❌ speciality present?', 'speciality' in test ? 'YES (ERROR)' : 'NO (OK)');
        
        // Test 3: Update test
        console.log('\n✏️ TEST 3: Updating test...');
        const updatePayload = {
          name: 'AUDIT_TEST_UPDATED_' + Date.now(),
          lineHeight: 1.8,
          attachFile: false,
          profileTest: true,
          categories: [
            {
              categoryId: 'cat-1',
              name: 'Updated Category',
              isCategory: false,
              testMethod: 'Method2',
              sortOrder: 2,
              parameters: [
                {
                  parameterName: 'Updated Parameter',
                  machineCode: 'UP1',
                  decimal: 3,
                  unitId: 2,
                  type: 'Numeric',
                  rangeType: 'BySex',
                  normalRanges: [
                    { gender: 'Male', lowValue: 80, highValue: 110, isActive: true },
                    { gender: 'Female', lowValue: 75, highValue: 105, isActive: false },
                    { gender: 'Child', lowValue: 70, highValue: 100, isActive: false }
                  ]
                }
              ]
            }
          ]
        };

        const updateRes = await fetch(`${API_URL}/master/tests/${testId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatePayload)
        });

        const updateData = await updateRes.json();
        if (updateRes.ok && updateData.success) {
          console.log('✅ Test updated successfully');
          
          // Verify update
          const verifyRes = await fetch(`${API_URL}/master/tests/${testId}`);
          const verifyData = await verifyRes.json();
          
          if (verifyData.success) {
            const updated = verifyData.data;
            console.log('\n✓ Updated name:', updated.name);
            console.log('✓ Updated attachFile:', updated.attachFile, '(changed to:', updated.attachFile === true ? 'boolean true' : updated.attachFile + ')');
            console.log('✓ Updated profileTest:', updated.profileTest, '(changed to:', updated.profileTest === true ? 'boolean true' : updated.profileTest + ')');
            console.log('✓ Updated lineHeight:', updated.lineHeight);
            console.log('✓ Updated categories:', updated.categories?.length || 0);
          }
        } else {
          console.log('❌ Update failed:', updateData.message);
          console.log('Error:', updateData.error);
        }
      } else {
        console.log('❌ Failed to fetch test:', getData.message);
      }
    } else {
      console.log('❌ Create failed:', data.message);
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

testFieldAudit();
