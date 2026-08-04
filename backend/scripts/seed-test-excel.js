import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// COMPREHENSIVE SEED DATA FROM EXCEL
// ============================================

const seedData = {
  departments: [
    { name: 'BIOCHEMISTRY', code: 'BIO' },
    { name: 'HEAMATOLOGY', code: 'HEM' },
    { name: 'SEROLOGY', code: 'SER' },
    { name: 'GLUCOSE', code: 'GLU' }
  ],

  sampleTypes: [
    { name: 'Whole Blood-EDTA', color: 'Purple' }
  ],

  // TESTS with all parameters embedded
  tests: [
    {
      name: 'ACID PHOSPHATASE',
      shortName: '1',
      testCode: null,
      departmentName: 'BIOCHEMISTRY',
      sampleTypeName: null,
      isActive: true,
      isNABL: false,
      profileTest: false,
      isHeader: true,
      showTestName: true,
      lineHeight: 1.4,
      attachFile: false,
      imageSize: '800|600',
      parameters: [
        {
          parameterName: 'ACP',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: false,
          isActive: true,
          sortOrder: 1,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'ACP', isCategory: false, sortOrder: 1, testMethod: null }
          ]
        }
      ]
    },
    {
      name: 'COMPLETE BLOOD COUNT',
      shortName: 'CBC',
      testCode: 'CBC',
      departmentName: 'HEAMATOLOGY',
      sampleTypeName: null,
      isActive: true,
      isNABL: false,
      profileTest: false,
      isHeader: true,
      showTestName: true,
      lineHeight: 1.4,
      attachFile: true,
      imageSize: '800|600',
      parameters: [
        {
          parameterName: 'Total WBC Count',
          parameterCode: null,
          unit: 'gm/dL',
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: false,
          isActive: true,
          sortOrder: 1,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'Total WBC Count', isCategory: true, sortOrder: 3, testMethod: null }
          ]
        },
        {
          parameterName: 'Platelet Count',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: false,
          isActive: true,
          sortOrder: 2,
          childActive: true,
          childLowValue: 1.5,
          childHighValue: 4.5,
          maleActive: true,
          maleLowValue: 1.5,
          maleHighValue: 4.5,
          femaleActive: true,
          femaleLowValue: 1.5,
          femaleHighValue: 4.5,
          categories: [
            { categoryName: 'Platelet Count', isCategory: false, sortOrder: 8, testMethod: null }
          ]
        },
        {
          parameterName: 'Absolute Neutrophils Count',
          parameterCode: null,
          unit: '/uL',
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: false,
          isActive: true,
          sortOrder: 3,
          childActive: true,
          childLowValue: 2000,
          childHighValue: 7000,
          maleActive: true,
          maleLowValue: 2000,
          maleHighValue: 7000,
          femaleActive: true,
          femaleLowValue: 2000,
          femaleHighValue: 7000,
          categories: [
            { categoryName: 'Absolute Neutrophils Count', isCategory: true, sortOrder: 10, testMethod: null }
          ]
        },
        {
          parameterName: 'Absolute Lymphocyte Count',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: false,
          isActive: true,
          sortOrder: 4,
          childActive: true,
          childLowValue: 1000,
          childHighValue: 3000,
          maleActive: true,
          maleLowValue: 1000,
          maleHighValue: 3000,
          femaleActive: true,
          femaleLowValue: 1000,
          femaleHighValue: 3000,
          categories: [
            { categoryName: 'Absolute Lymphocyte Count', isCategory: true, sortOrder: null, testMethod: null }
          ]
        }
      ]
    },
    {
      name: 'DIRECT COOMBS TEST ( DCT )',
      shortName: 'DCT',
      testCode: null,
      departmentName: 'SEROLOGY',
      sampleTypeName: null,
      isActive: true,
      isNABL: true,
      profileTest: false,
      isHeader: true,
      showTestName: true,
      lineHeight: 1.4,
      attachFile: false,
      imageSize: '800|600',
      interpretationLabel: 'Interpretation:',
      interpretation: '<p>1.The test indicates in vivo coating of RBCs with IgG or complement component C3d.<br>2. Negative DCT indicates absence of detectable IgG or C3d in serum or plasma.<br>3. Positive DCT indicates presence of detectable IgG or C3d in serum or plasma and is seen in following conditions :<br>a. Autoimmune hemolytic anemia. b. Hemolytic reaction of blood transfusion.<br>c. Drug induced hemolytic anemia. d. Hemolytic disease of the newborn.<br>4.Rarely DCT may be negative in autoimmune hemolytic anemia .<br>5. Positive DCT can be seen in apparently healthy individuals.</p>',
      parameters: [
        {
          parameterName: 'DIRECT COOMBS TEST',
          parameterCode: null,
          unit: null,
          type: 'Text',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          testMethod: 'Gel Technique',
          rangeType: 'BySex',
          isNABL: true,
          isActive: true,
          sortOrder: 1,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'DIRECT COOMBS TEST', isCategory: true, sortOrder: 1, testMethod: 'Gel Technique' }
          ]
        }
      ]
    },
    {
      name: 'HEMOGRAM',
      shortName: 'HMG',
      testCode: '001',
      departmentName: 'HEAMATOLOGY',
      sampleTypeName: 'Whole Blood-EDTA',
      isActive: true,
      isNABL: true,
      profileTest: false,
      isHeader: true,
      showTestName: true,
      lineHeight: 1.4,
      attachFile: true,
      imageSize: '800|600',
      interpretation: '<ul><li>Hematological parameters have physiological variations according to age, sex, time of day, exercise, temperature, stress, menstruation as well as due to drugs and storage of blood. Clinical Diagnosis should not be made on the finds of a single test result, but should integrate both, clinical and laboratory data. Please correlate with clinical condition. Mentzer index is to be correlated with age, sex, clinical and therapeutic history.</li></ul>',
      parameters: [
        {
          parameterName: 'HEMOGLOBIN',
          parameterCode: null,
          unit: 'g/dL',
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          testMethod: 'Cyanmethemoglobin optical detection',
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 1,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'HEMOGLOBIN', isCategory: true, sortOrder: 1, testMethod: 'Cyanmethemoglobin optical detection' }
          ]
        },
        {
          parameterName: 'PCV (PACKED CELL VOLUME)',
          parameterCode: null,
          unit: '%',
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          testMethod: 'Sheath floe DC Detection',
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 2,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'PCV', isCategory: true, sortOrder: 2, testMethod: 'Sheath floe DC Detection' }
          ]
        },
        {
          parameterName: 'RED BLOOD CELL COUNT',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 3,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'RED BLOOD CELL COUNT', isCategory: true, sortOrder: 3, testMethod: null }
          ]
        },
        {
          parameterName: 'TOTAL LEUCOCYTE (WBC) COUNT',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          testMethod: 'Flow cytometry',
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 10,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'TOTAL LEUCOCYTE (WBC) COUNT', isCategory: true, sortOrder: 1, testMethod: 'Flow cytometry' }
          ]
        },
        {
          parameterName: 'MCV',
          parameterCode: null,
          unit: 'g/dL',
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 5,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'RBC INDICES', isCategory: true, sortOrder: 2, testMethod: 'Calculated' }
          ]
        },
        {
          parameterName: 'MCH',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 6,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'RBC INDICES', isCategory: true, sortOrder: 2, testMethod: 'Calculated' }
          ]
        },
        {
          parameterName: 'MCHC',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 7,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'RBC INDICES', isCategory: true, sortOrder: 2, testMethod: 'Calculated' }
          ]
        },
        {
          parameterName: 'RDW',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          testMethod: 'Sheath flow DC Detection',
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 8,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'RBC INDICES', isCategory: true, sortOrder: 2, testMethod: 'Calculated' }
          ]
        },
        {
          parameterName: 'MENTZER INDEX',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          testMethod: 'Calculated',
          hasFormula: true,
          formula: '{MCV}/{RED BLOOD CELL COUNT}',
          rangeType: 'BySex',
          isNABL: true,
          isActive: true,
          sortOrder: 9,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'MENTZER INDEX', isCategory: false, sortOrder: 4, testMethod: 'Calculated' }
          ]
        },
        {
          parameterName: 'NEUTROPHILS',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 12,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'DIFFERENTIAL WBC COUNT', isCategory: true, sortOrder: 4, testMethod: 'Flow cytometry' }
          ]
        },
        {
          parameterName: 'LYMPHOCYTES',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 13,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'DIFFERENTIAL WBC COUNT', isCategory: true, sortOrder: 4, testMethod: 'Flow cytometry' }
          ]
        },
        {
          parameterName: 'EOSINOPHILS',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 14,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'DIFFERENTIAL WBC COUNT', isCategory: true, sortOrder: 4, testMethod: 'Flow cytometry' }
          ]
        },
        {
          parameterName: 'MONOCYTES',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 15,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'DIFFERENTIAL WBC COUNT', isCategory: true, sortOrder: 4, testMethod: 'Flow cytometry' }
          ]
        },
        {
          parameterName: 'BASOPHILS',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: true,
          isActive: true,
          sortOrder: 16,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'DIFFERENTIAL WBC COUNT', isCategory: true, sortOrder: 4, testMethod: 'Flow cytometry' }
          ]
        },
        {
          parameterName: 'BLASTOID/BLAST CELLS',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: true,
          isActive: true,
          sortOrder: 17,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'BLASTOID/BLAST CELLS', isCategory: false, sortOrder: 6, testMethod: null }
          ]
        },
        {
          parameterName: 'nRBCs',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: true,
          isActive: true,
          sortOrder: 18,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'nRBCs', isCategory: false, sortOrder: 7, testMethod: null }
          ]
        }
      ]
    },
    {
      name: 'PLATELET COUNT',
      shortName: 'PLT',
      testCode: null,
      departmentName: 'HEAMATOLOGY',
      sampleTypeName: null,
      isActive: true,
      isNABL: false,
      profileTest: false,
      isHeader: true,
      showTestName: true,
      lineHeight: 1.4,
      attachFile: false,
      imageSize: '800|600',
      parameters: [
        {
          parameterName: 'PLATELET COUNT',
          parameterCode: null,
          unit: null,
          type: 'Numeric',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByAge',
          isNABL: false,
          isActive: true,
          sortOrder: 1,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'PLATELET COUNT', isCategory: false, sortOrder: 1, testMethod: null }
          ]
        }
      ]
    },
    {
      name: 'STOOL CULTURE',
      shortName: 'StoolC/S',
      testCode: null,
      departmentName: 'GLUCOSE',
      sampleTypeName: null,
      isActive: true,
      isNABL: false,
      profileTest: false,
      isHeader: true,
      showTestName: true,
      lineHeight: 1.4,
      attachFile: true,
      imageSize: '800|600',
      parameters: [
        {
          parameterName: 'Gram Stain',
          parameterCode: null,
          unit: null,
          type: 'Text',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'ByRange',
          isNABL: false,
          isActive: true,
          sortOrder: 1,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'Gram Stain', isCategory: true, sortOrder: 1, testMethod: null }
          ]
        },
        {
          parameterName: 'Culture Media Used',
          parameterCode: null,
          unit: null,
          type: 'Text',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: false,
          isActive: true,
          sortOrder: 2,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'Culture Media Used', isCategory: false, sortOrder: 2, testMethod: null }
          ]
        },
        {
          parameterName: 'Isolated Organism',
          parameterCode: null,
          unit: null,
          type: 'Text',
          decimal: 2,
          isMandatory: false,
          isDescriptive: false,
          rangeType: 'BySex',
          isNABL: false,
          isActive: true,
          sortOrder: 3,
          childActive: false,
          childLowValue: null,
          childHighValue: null,
          maleActive: false,
          maleLowValue: null,
          maleHighValue: null,
          femaleActive: false,
          femaleLowValue: null,
          femaleHighValue: null,
          categories: [
            { categoryName: 'Isolated Organism', isCategory: false, sortOrder: 3, testMethod: null }
          ]
        }
      ]
    }
  ]
};

async function seedCompleteData() {
  try {
    console.log('Starting comprehensive seed from Excel...\n');

    // ============================================
    // STEP 1: Seed Departments
    // ============================================
    console.log('📋 Seeding Departments...');
    const departments = {};
    for (const dept of seedData.departments) {
      const existing = await prisma.department.findUnique({
        where: { name: dept.name }
      });
      if (existing) {
        departments[dept.name] = existing;
      } else {
        const created = await prisma.department.create({
          data: { name: dept.name, code: dept.code, isActive: true }
        });
        departments[dept.name] = created;
      }
      console.log(`  ✓ ${dept.name}`);
    }

    // ============================================
    // STEP 2: Seed Sample Types
    // ============================================
    console.log('\n🧪 Seeding Sample Types...');
    const sampleTypes = {};
    for (const st of seedData.sampleTypes) {
      const existing = await prisma.sample_type.findUnique({
        where: { Sample_Type: st.name }
      });
      if (existing) {
        sampleTypes[st.name] = existing;
      } else {
        const created = await prisma.sample_type.create({
          data: { Sample_Type: st.name, Sample_Color: st.color }
        });
        sampleTypes[st.name] = created;
      }
      console.log(`  ✓ ${st.name}`);
    }

    // ============================================
    // STEP 3: Seed Tests with Parameters & Categories
    // ============================================
    console.log('\n✅ Seeding Tests with Parameters & Categories...');
    
    let totalParams = 0;
    let totalCats = 0;

    for (const testData of seedData.tests) {
      const dept = departments[testData.departmentName];
      if (!dept) {
        console.log(`  ✗ Department not found: ${testData.departmentName}`);
        continue;
      }

      const sampleType = testData.sampleTypeName ? sampleTypes[testData.sampleTypeName] : null;

      // Create or get test
      const testObj = await prisma.test.upsert({
        where: {
          name_departmentId: {
            name: testData.name,
            departmentId: dept.id
          }
        },
        update: {},
        create: {
          name: testData.name,
          shortName: testData.shortName,
          testCode: testData.testCode,
          departmentId: dept.id,
          sampleTypeId: sampleType?.id,
          isActive: testData.isActive,
          isNABL: testData.isNABL,
          profileTest: testData.profileTest,
          isHeader: testData.isHeader,
          showTestName: testData.showTestName,
          lineHeight: testData.lineHeight,
          attachFile: testData.attachFile,
          imageSize: testData.imageSize,
          interpretationLabel: testData.interpretationLabel,
          interpretation: testData.interpretation
        }
      });

      console.log(`\n  📌 Test: ${testData.name}`);

      // Create parameters
      for (const paramData of testData.parameters) {
        const param = await prisma.testParameter.upsert({
          where: {
            parameterCode: paramData.parameterCode || `${testObj.id}_${paramData.parameterName}`
          },
          update: {
            parameterName: paramData.parameterName,
            type: paramData.type,
            decimal: paramData.decimal,
            rangeType: paramData.rangeType,
            maleLowValue: paramData.maleLowValue,
            maleHighValue: paramData.maleHighValue,
            maleActive: paramData.maleActive,
            femaleLowValue: paramData.femaleLowValue,
            femaleHighValue: paramData.femaleHighValue,
            femaleActive: paramData.femaleActive,
            childLowValue: paramData.childLowValue,
            childHighValue: paramData.childHighValue,
            childActive: paramData.childActive,
            testId: testObj.id,
            isActive: paramData.isActive,
            isNABL: paramData.isNABL,
            parameterSortOrder: paramData.sortOrder,
            testMethod: paramData.testMethod
          },
          create: {
            parameterName: paramData.parameterName,
            parameterCode: paramData.parameterCode || `${testObj.id}_${paramData.parameterName}`,
            type: paramData.type,
            decimal: paramData.decimal,
            isMandatory: paramData.isMandatory,
            isDescriptive: paramData.isDescriptive,
            rangeType: paramData.rangeType,
            maleLowValue: paramData.maleLowValue,
            maleHighValue: paramData.maleHighValue,
            maleActive: paramData.maleActive,
            femaleLowValue: paramData.femaleLowValue,
            femaleHighValue: paramData.femaleHighValue,
            femaleActive: paramData.femaleActive,
            childLowValue: paramData.childLowValue,
            childHighValue: paramData.childHighValue,
            childActive: paramData.childActive,
            testId: testObj.id,
            isActive: paramData.isActive,
            isNABL: paramData.isNABL,
            parameterSortOrder: paramData.sortOrder,
            testMethod: paramData.testMethod
          }
        });

        console.log(`     ✓ Parameter: ${paramData.parameterName}`);
        console.log(`       Range: ${paramData.rangeType}`);
        if (paramData.rangeType === 'BySex') {
          console.log(`       Male: ${paramData.maleActive ? `${paramData.maleLowValue}-${paramData.maleHighValue}` : 'disabled'}`);
          console.log(`       Female: ${paramData.femaleActive ? `${paramData.femaleLowValue}-${paramData.femaleHighValue}` : 'disabled'}`);
          if (paramData.childActive) {
            console.log(`       Child: ${paramData.childLowValue}-${paramData.childHighValue}`);
          }
        }
        totalParams++;

        // Create categories
        for (const catData of paramData.categories) {
          const existingCat = await prisma.testCategory.findFirst({
            where: {
              testId: testObj.id,
              testParameterId: param.id,
              categoryName: catData.categoryName
            }
          });

          if (!existingCat) {
            await prisma.testCategory.create({
              data: {
                testId: testObj.id,
                testParameterId: param.id,
                categoryName: catData.categoryName,
                isCategory: catData.isCategory,
                sortOrder: catData.sortOrder,
                testMethod: catData.testMethod
              }
            });
          }
          totalCats++;
        }

        // Create junction link
        await prisma.testparameters.upsert({
          where: {
            A_B: {
              A: testObj.id,
              B: param.id
            }
          },
          update: {},
          create: {
            A: testObj.id,
            B: param.id
          }
        });
      }
    }

    console.log(`\n\n✅ Seeding Completed!`);
    console.log(`   • Departments: ${Object.keys(departments).length}`);
    console.log(`   • Sample Types: ${Object.keys(sampleTypes).length}`);
    console.log(`   • Tests: ${seedData.tests.length}`);
    console.log(`   • Parameters: ${totalParams}`);
    console.log(`   • Categories: ${totalCats}`);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedCompleteData();