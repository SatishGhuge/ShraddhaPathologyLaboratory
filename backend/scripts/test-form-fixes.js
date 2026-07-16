import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Test data with all fields filled
const testData = {
  name: 'TEST_FORM_FIX_VERIFICATION',
  shortName: 'TFIV',
  testCode: 'TFIV001',
  departmentId: 1, // Adjust based on your database
  sampleTypeId: 1, // Adjust based on your database
  machineName: 'Machine A',
  group: 'Biochemistry',
  reportHeader: 'Biochemistry Report',
  preparationTime: '8 hours',
  preparationType: 'Fasting',
  instructionPreparation: 'Patient should fast for 8 hours',
  instructionPatient: 'Please be seated for 5 minutes before collection',
  interpretationLabel: 'Results Interpretation',
  interpretation: '<p>Normal range: 70-100 mg/dL</p>',
  outsourceLab: 'XYZ Labs',
  attachFile: true, // Testing attachFile boolean
  imageSize: '1024|768',
  profileTest: true, // Testing profileTest boolean
  isHeader: true,
  showTestName: true,
  isNABL: true,
  lineHeight: 1.5,
  categories: [
    {
      categoryId: 'cat_001',
      name: 'Chemistry',
      isCategory: true,
      sortOrder: 1,
      testMethod: 'Colorimetric',
      parameters: [
        {
          parameterName: 'Glucose',
          machineCode: 'GLU001',
          multiplyBy: '1',
          decimal: 2,
          sortOrder: 1,
          isDescriptive: false,
          lowPanic: 40,
          highPanic: 400,
          isNABL: true,
          parameterCode: 'GLU',
          hasFormula: false,
          formula: null,
          type: 'Numeric',
          isMandatory: true,
          rangeType: 'BySex',
          unitId: 1, // Assuming unit ID 1 exists
          displayRangeText: 'mg/dL',
          rangeText: '70-100',
          textContent: null,
          isMultipleOptions: false,
          normalRanges: [
            {
              gender: 'Male',
              lowValue: 70,
              highValue: 100,
              defaultValue: '85',
              isActive: true
            },
            {
              gender: 'Female',
              lowValue: 70,
              highValue: 100,
              defaultValue: '85',
              isActive: true
            },
            {
              gender: 'Child',
              lowValue: 60,
              highValue: 100,
              defaultValue: '80',
              isActive: true
            }
          ],
          ageRanges: [],
          rangeValues: []
        }
      ]
    }
  ]
};

async function runTests() {
  try {
    console.log('🚀 Starting test form fixes verification...\n');

    // Step 1: Create a test with all fields
    console.log('📝 Step 1: Creating test with all fields filled...');
    console.log('Test Data:', JSON.stringify(testData, null, 2));
    
    const createRes = await axios.post(`${API_BASE}/master/tests`, testData);
    const createdTest = createRes.data.data;
    const testId = createdTest.id;

    console.log(`✅ Test created successfully with ID: ${testId}\n`);
    console.log('Created Test Data:');
    console.log(`- Name: ${createdTest.name}`);
    console.log(`- attachFile: ${createdTest.attachFile} (type: ${typeof createdTest.attachFile})`);
    console.log(`- profileTest: ${createdTest.profileTest} (type: ${typeof createdTest.profileTest})`);
    console.log(`- Categories: ${createdTest.categories?.length || 0}`);
    if (createdTest.categories?.length > 0 && createdTest.categories[0].parameters?.length > 0) {
      const param = createdTest.categories[0].parameters[0];
      console.log(`- First Parameter: ${param.parameterName}`);
      console.log(`  - unitId: ${param.unitId}`);
      console.log(`  - unit: ${JSON.stringify(param.unit)}`);
    }

    // Step 2: Fetch the test back (simulating edit mode)
    console.log('\n📖 Step 2: Fetching test for edit mode...');
    
    const fetchRes = await axios.get(`${API_BASE}/master/tests/${testId}`);
    const fetchedTest = fetchRes.data.data;

    console.log('✅ Test fetched successfully\n');
    console.log('Fetched Test Data (what frontend receives):');
    console.log(`- ID: ${fetchedTest.id}`);
    console.log(`- Name: ${fetchedTest.name}`);
    console.log(`- attachFile: ${fetchedTest.attachFile} (type: ${typeof fetchedTest.attachFile})`);
    console.log(`- profileTest: ${fetchedTest.profileTest} (type: ${typeof fetchedTest.profileTest})`);
    console.log(`- sampleTypeId: ${fetchedTest.sampleTypeId}`);
    console.log(`- linkedTestIds: ${JSON.stringify(fetchedTest.linkedTestIds)}`);

    // Step 3: Verify all fields match
    console.log('\n🔍 Step 3: Verifying field persistence...\n');

    let allPassed = true;

    // Check attachFile
    const attachFileMatches = fetchedTest.attachFile === true;
    console.log(`${attachFileMatches ? '✅' : '❌'} attachFile: ${fetchedTest.attachFile} (expected: true, type: ${typeof fetchedTest.attachFile})`);
    if (!attachFileMatches) allPassed = false;

    // Check profileTest
    const profileTestMatches = fetchedTest.profileTest === true;
    console.log(`${profileTestMatches ? '✅' : '❌'} profileTest: ${fetchedTest.profileTest} (expected: true, type: ${typeof fetchedTest.profileTest})`);
    if (!profileTestMatches) allPassed = false;

    // Check basic fields
    console.log(`${fetchedTest.name === testData.name ? '✅' : '❌'} name: ${fetchedTest.name}`);
    console.log(`${fetchedTest.shortName === testData.shortName ? '✅' : '❌'} shortName: ${fetchedTest.shortName}`);
    console.log(`${fetchedTest.testCode === testData.testCode ? '✅' : '❌'} testCode: ${fetchedTest.testCode}`);
    console.log(`${fetchedTest.machineName === testData.machineName ? '✅' : '❌'} machineName: ${fetchedTest.machineName}`);

    // Check categories and parameters
    console.log(`\n📋 Categories & Parameters:`);
    if (fetchedTest.categories && fetchedTest.categories.length > 0) {
      const category = fetchedTest.categories[0];
      console.log(`${category.categoryName ? '✅' : '❌'} Category name: ${category.categoryName || 'N/A'}`);
      
      if (category.parameters && category.parameters.length > 0) {
        const param = category.parameters[0];
        console.log(`✅ Parameter found: ${param.parameterName}`);
        console.log(`  - unitId: ${param.unitId}`);
        console.log(`  - unit object: ${JSON.stringify(param.unit)}`);
        
        const unitMatch = param.unitId || (param.unit && param.unit.id);
        console.log(`  ${unitMatch ? '✅' : '❌'} Unit information is present`);
        if (!unitMatch) allPassed = false;
      } else {
        console.log('❌ No parameters found in category');
        allPassed = false;
      }
    } else {
      console.log('❌ No categories found');
      allPassed = false;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED! All fixes are working correctly.');
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review the issues above.');
    }
    console.log('='.repeat(60));

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Test failed with error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

runTests();
