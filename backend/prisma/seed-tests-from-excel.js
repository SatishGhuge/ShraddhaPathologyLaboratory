import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestsAndParameters() {
  try {
    console.log('Starting seed: Tests and Parameters from Excel...\n');

    // ============================================
    // STEP 1: Seed Departments (if not exists)
    // ============================================
    console.log('📋 Seeding Departments...');
    const departments = [
      { name: 'BIOCHEMISTRY', code: 'BIO' },
      { name: 'HEAMATOLOGY', code: 'HEM' },
      { name: 'SEROLOGY', code: 'SER' },
      { name: 'GLUCOSE', code: 'GLU' }
    ];

    const createdDepts = {};
    for (const dept of departments) {
      const existing = await prisma.department.findUnique({
        where: { name: dept.name }
      });
      
      if (existing) {
        createdDepts[dept.name] = existing;
        console.log(`  ✓ ${dept.name} (already exists)`);
      } else {
        const created = await prisma.department.create({
          data: {
            name: dept.name,
            code: dept.code,
            isActive: true
          }
        });
        createdDepts[dept.name] = created;
        console.log(`  ✓ ${dept.name} created`);
      }
    }

    // ============================================
    // STEP 2: Seed Sample Types (if not exists)
    // ============================================
    console.log('\n🧪 Seeding Sample Types...');
    const sampleTypes = [
      { name: 'Whole Blood-EDTA', color: 'Purple' }
    ];

    const createdSampleTypes = {};
    for (const stype of sampleTypes) {
      const existing = await prisma.sample_type.findUnique({
        where: { Sample_Type: stype.name }
      });
      
      if (existing) {
        createdSampleTypes[stype.name] = existing;
        console.log(`  ✓ ${stype.name} (already exists)`);
      } else {
        const created = await prisma.sample_type.create({
          data: {
            Sample_Type: stype.name,
            Sample_Color: stype.color
          }
        });
        createdSampleTypes[stype.name] = created;
        console.log(`  ✓ ${stype.name} created`);
      }
    }

    // ============================================
    // STEP 3: Seed Tests
    // ============================================
    console.log('\n✅ Seeding Tests...');
    const tests = [
      {
        name: 'ACID PHOSPHATASE',
        shortName: '1',
        testCode: null,
        departmentId: createdDepts['BIOCHEMISTRY'].id,
        sampleTypeId: null,
        isActive: true,
        isNABL: false,
        profileTest: false,
        isHeader: true,
        showTestName: true,
        lineHeight: 1.4,
        attachFile: false,
        imageSize: '800|600'
      },
      {
        name: 'COMPLETE BLOOD COUNT',
        shortName: 'CBC',
        testCode: 'CBC',
        departmentId: createdDepts['HEAMATOLOGY'].id,
        sampleTypeId: null,
        isActive: true,
        isNABL: false,
        profileTest: false,
        isHeader: true,
        showTestName: true,
        lineHeight: 1.4,
        attachFile: true,
        imageSize: '800|600'
      },
      {
        name: 'DIRECT COOMBS TEST ( DCT )',
        shortName: 'DCT',
        testCode: null,
        departmentId: createdDepts['SEROLOGY'].id,
        sampleTypeId: null,
        isActive: true,
        isNABL: true,
        profileTest: false,
        isHeader: true,
        showTestName: true,
        lineHeight: 1.4,
        attachFile: false,
        imageSize: '800|600',
        interpretationLabel: 'Interpretation:',
        interpretation: '<p>1.The test indicates in vivo coating of RBCs with IgG or complement component C3d.<br>2. Negative DCT indicates absence of detectable IgG or C3d in serum or plasma.<br>3. Positive DCT indicates presence of detectable IgG or C3d in serum or plasma and is seen in following conditions :<br>a. Autoimmune hemolytic anemia. b. Hemolytic reaction of blood transfusion.<br>c. Drug induced hemolytic anemia. d. Hemolytic disease of the newborn.<br>4.Rarely DCT may be negative in autoimmune hemolytic anemia .<br>5. Positive DCT can be seen in apparently healthy individuals.</p>'
      },
      {
        name: 'HEMOGLOBIN',
        shortName: 'HB',
        testCode: null,
        departmentId: createdDepts['HEAMATOLOGY'].id,
        sampleTypeId: null,
        isActive: true,
        isNABL: true,
        profileTest: false,
        isHeader: true,
        showTestName: true,
        lineHeight: 1.4,
        attachFile: true,
        imageSize: '800|600'
      },
      {
        name: 'HEMOGRAM',
        shortName: 'HMG',
        testCode: '001',
        departmentId: createdDepts['HEAMATOLOGY'].id,
        sampleTypeId: createdSampleTypes['Whole Blood-EDTA']?.id || null,
        isActive: true,
        isNABL: true,
        profileTest: false,
        isHeader: true,
        showTestName: true,
        lineHeight: 1.4,
        attachFile: true,
        imageSize: '800|600',
        interpretation: '<ul><li>Hematological parameters have physiological variations according to age, sex, time of day, exercise, temperature, stress, menstruation as well as due to drugs and storage of blood. Clinical Diagnosis should not be made on the finds of a single test result, but should integrate both, clinical and laboratory data. Please correlate with clinical condition. Mentzer index is to be correlated with age, sex, clinical and therapeutic history.</li></ul>'
      },
      {
        name: 'PLATELET COUNT',
        shortName: 'PLT',
        testCode: null,
        departmentId: createdDepts['HEAMATOLOGY'].id,
        sampleTypeId: null,
        isActive: true,
        isNABL: false,
        profileTest: false,
        isHeader: true,
        showTestName: true,
        lineHeight: 1.4,
        attachFile: false,
        imageSize: '800|600'
      },
      {
        name: 'STOOL CULTURE',
        shortName: 'StoolC/S',
        testCode: null,
        departmentId: createdDepts['GLUCOSE'].id,
        sampleTypeId: null,
        isActive: true,
        isNABL: false,
        profileTest: false,
        isHeader: true,
        showTestName: true,
        lineHeight: 1.4,
        attachFile: true,
        imageSize: '800|600'
      }
    ];

    const createdTests = {};
    for (const test of tests) {
      const existing = await prisma.test.findUnique({
        where: { 
          name_departmentId: { 
            name: test.name, 
            departmentId: test.departmentId 
          } 
        }
      });
      
      if (existing) {
        createdTests[test.name] = existing;
        console.log(`  ✓ ${test.name} (already exists)`);
      } else {
        const created = await prisma.test.create({
          data: test
        });
        createdTests[test.name] = created;
        console.log(`  ✓ ${test.name} created`);
      }
    }

    // ============================================
    // STEP 4: Seed Test Parameters
    // ============================================
    console.log('\n📊 Seeding Test Parameters...');
    
    const parameters = [
      {
        testName: 'ACID PHOSPHATASE',
        parameterName: 'ACP',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        isNABL: false,
        isActive: true
      },
      {
        testName: 'COMPLETE BLOOD COUNT',
        parameterName: 'Total WBC Count',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: false,
        isActive: true,
        sortOrder: 1
      },
      {
        testName: 'COMPLETE BLOOD COUNT',
        parameterName: 'Platelet Count',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        maleLowValue: 1.5,
        maleHighValue: 4.5,
        femaleLowValue: 1.5,
        femaleHighValue: 4.5,
        childLowValue: 1.5,
        childHighValue: 4.5,
        maleActive: true,
        femaleActive: true,
        childActive: true,
        isNABL: false,
        isActive: true,
        sortOrder: 2
      },
      {
        testName: 'COMPLETE BLOOD COUNT',
        parameterName: 'Absolute Neutrophils Count',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        maleLowValue: 2000,
        maleHighValue: 7000,
        femaleLowValue: 2000,
        femaleHighValue: 7000,
        childLowValue: 2000,
        childHighValue: 7000,
        maleActive: true,
        femaleActive: true,
        childActive: true,
        isNABL: false,
        isActive: true,
        sortOrder: 3
      },
      {
        testName: 'COMPLETE BLOOD COUNT',
        parameterName: 'Absolute Lymphocyte Count',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        maleLowValue: 1000,
        maleHighValue: 3000,
        femaleLowValue: 1000,
        femaleHighValue: 3000,
        childLowValue: 1000,
        childHighValue: 3000,
        maleActive: true,
        femaleActive: true,
        childActive: true,
        isNABL: false,
        isActive: true,
        sortOrder: 4
      },
      {
        testName: 'DIRECT COOMBS TEST ( DCT )',
        parameterName: 'DIRECT COOMBS TEST',
        parameterCode: null,
        unitId: null,
        type: 'Text',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        testMethod: 'Gel Technique',
        rangeType: 'BySex',
        isNABL: true,
        isActive: true,
        sortOrder: 1
      },
      {
        testName: 'HEMOGLOBIN',
        parameterName: 'HEMOGLOBIN',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 1
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'HEMOGLOBIN',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 1
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'PCV (PACKED CELL VOLUME)',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 2
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'RED BLOOD CELL COUNT',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 3
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'TOTAL LEUCOCYTE (WBC) COUNT',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 10
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'MCV',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 5
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'MCH',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 6
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'MCHC',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 7
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'RDW',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        testMethod: 'Sheath flow DC Detection',
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 8
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'MENTZER INDEX',
        parameterCode: null,
        unitId: null,
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
        sortOrder: 9
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'NEUTROPHILS',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 12
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'LYMPHOCYTES',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 13
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'EOSINOPHILS',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 14
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'MONOCYTES',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 15
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'BASOPHILS',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 16
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'BLASTOID/BLAST CELLS',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        isNABL: true,
        isActive: true,
        sortOrder: 17
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'nRBCs',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        isNABL: true,
        isActive: true,
        sortOrder: 18
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'ABSOLUTE NEUTROPHILS',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 1
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'ABSOLUTE LYMPHOCYTES',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 2
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'ABSOLUTE EOSINOPHILS',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 3
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'ABSOLUTE MONOCYTES',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 4
      },
      {
        testName: 'HEMOGRAM',
        parameterName: 'ABSOLUTE BASOPHILS',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: true,
        isActive: true,
        sortOrder: 5
      },
      {
        testName: 'PLATELET COUNT',
        parameterName: 'PLATELET COUNT',
        parameterCode: null,
        unitId: null,
        type: 'Numeric',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByAge',
        isNABL: false,
        isActive: true
      },
      {
        testName: 'STOOL CULTURE',
        parameterName: 'Gram Stain',
        parameterCode: null,
        unitId: null,
        type: 'Text',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'ByRange',
        isNABL: false,
        isActive: true
      },
      {
        testName: 'STOOL CULTURE',
        parameterName: 'Culture Media Used',
        parameterCode: null,
        unitId: null,
        type: 'Text',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        isNABL: false,
        isActive: true
      },
      {
        testName: 'STOOL CULTURE',
        parameterName: 'Isolated Organism',
        parameterCode: null,
        unitId: null,
        type: 'Text',
        decimal: 2,
        isMandatory: false,
        isDescriptive: false,
        rangeType: 'BySex',
        isNABL: false,
        isActive: true
      }
    ];

    let paramCount = 0;
    for (const param of parameters) {
      const test = createdTests[param.testName];
      if (!test) {
        console.log(`  ✗ Test not found for parameter: ${param.parameterName}`);
        continue;
      }

      // Check if parameter already exists for this test
      const existing = await prisma.testParameter.findFirst({
        where: {
          parameterName: param.parameterName,
          testId: test.id
        }
      });

      if (!existing) {
        await prisma.testParameter.create({
          data: {
            parameterName: param.parameterName,
            parameterCode: param.parameterCode,
            unitId: param.unitId,
            type: param.type,
            decimal: param.decimal,
            isMandatory: param.isMandatory,
            isDescriptive: param.isDescriptive,
            testMethod: param.testMethod,
            hasFormula: param.hasFormula || false,
            formula: param.formula,
            rangeType: param.rangeType,
            maleLowValue: param.maleLowValue,
            maleHighValue: param.maleHighValue,
            maleActive: param.maleActive !== undefined ? param.maleActive : true,
            femaleLowValue: param.femaleLowValue,
            femaleHighValue: param.femaleHighValue,
            femaleActive: param.femaleActive !== undefined ? param.femaleActive : false,
            childLowValue: param.childLowValue,
            childHighValue: param.childHighValue,
            childActive: param.childActive !== undefined ? param.childActive : false,
            isNABL: param.isNABL,
            isActive: param.isActive,
            parameterSortOrder: param.sortOrder,
            testId: test.id
          }
        });
        paramCount++;
        console.log(`  ✓ ${param.testName} > ${param.parameterName}`);
      } else {
        console.log(`  ✓ ${param.testName} > ${param.parameterName} (already exists)`);
      }
    }

    console.log(`\n✅ Seeding completed!`);
    console.log(`   • Departments: ${Object.keys(createdDepts).length}`);
    console.log(`   • Sample Types: ${Object.keys(createdSampleTypes).length}`);
    console.log(`   • Tests: ${Object.keys(createdTests).length}`);
    console.log(`   • Parameters: ${paramCount}`);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTestsAndParameters();
