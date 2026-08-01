import ExcelJS from 'exceljs';
import { prisma } from '../config/database.js';

/**
 * Validate and import tests from Excel workbook
 * Expects 3 sheets: Tests, Parameters, Categories
 */
export const importTestsFromExcel = async (buffer) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const errors = [];
    const warnings = [];
    const created = { tests: 0, parameters: 0, categories: 0 };
    const updated = { tests: 0, parameters: 0, categories: 0 };

    console.log('📤 Starting Excel import...');

    // Get sheets
    const testsSheet = workbook.getWorksheet('Tests');
    const parametersSheet = workbook.getWorksheet('Parameters');
    const categoriesSheet = workbook.getWorksheet('Categories');

    if (!testsSheet) {
      throw new Error('Excel file must contain a "Tests" sheet');
    }

    // ==================== IMPORT TESTS ====================
    console.log('📝 Processing Tests sheet...');

    const testMap = new Map(); // Map test names to IDs for linking

    if (testsSheet) {
      const rows = testsSheet.getSheetValues();
      
      for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || !row[1]) continue; // Skip empty rows

        try {
          const testName = row[1]?.toString().trim();
          const shortName = row[2]?.toString().trim() || null;
          const testCode = row[3]?.toString().trim() || null;
          const departmentName = row[4]?.toString().trim();
          const sampleTypeName = row[5]?.toString().trim() || null;
          const machineNamesRaw = row[6]?.toString().trim() || null; // Multiple machines separated by ;
          const group = row[7]?.toString().trim() || null;
          const reportHeader = row[8]?.toString().trim() || null;
          const preparationType = row[9]?.toString().trim() || null;
          const isNABL = row[10]?.toString().toLowerCase() === 'yes';
          const profileTest = row[11]?.toString().toLowerCase() === 'yes';
          const isHeader = row[12]?.toString().toLowerCase() === 'yes';
          const showTestName = row[13]?.toString().toLowerCase() === 'yes';
          const lineHeight = parseFloat(row[14]) || 1.4;
          const attachFile = row[15]?.toString().toLowerCase() === 'yes';
          const imageSize = row[16]?.toString().trim() || '800|600';
          const outsourceLab = row[17]?.toString().trim() || null;
          const isActive = row[18]?.toString().toLowerCase() === 'yes';
          const instructionPreparation = row[19]?.toString().trim() || null;
          const instructionPatient = row[20]?.toString().trim() || null;
          const interpretationLabel = row[21]?.toString().trim() || null;
          const interpretation = row[22]?.toString().trim() || null;

          // Validate required fields
          if (!testName) {
            errors.push(`Row ${rowIndex}: Test name is required`);
            continue;
          }

          if (!departmentName) {
            errors.push(`Row ${rowIndex}: Department is required for test "${testName}"`);
            continue;
          }

          // Find or create department
          let department = await prisma.department.findFirst({
            where: { name: departmentName }
          });

          if (!department) {
            // Create department if it doesn't exist
            console.log(`➕ Creating department: ${departmentName}`);
            department = await prisma.department.create({
              data: {
                name: departmentName,
                code: departmentName.substring(0, 3).toUpperCase(),
                isActive: true,
                isDeleted: false
              }
            });
            warnings.push(`Row ${rowIndex}: Department "${departmentName}" created automatically`);
          }

          // Find or create sample type (optional)
          let sampleTypeId = null;
          if (sampleTypeName) {
            let sampleType = await prisma.sample_type.findFirst({
              where: { Sample_Type: sampleTypeName }
            });
            
            if (!sampleType) {
              // Create sample type if it doesn't exist
              console.log(`➕ Creating sample type: ${sampleTypeName}`);
              sampleType = await prisma.sample_type.create({
                data: {
                  Sample_Type: sampleTypeName,
                  Sample_Color: '#FFFFFF' // Default white color
                }
              });
              warnings.push(`Row ${rowIndex}: Sample type "${sampleTypeName}" created automatically`);
            }
            sampleTypeId = sampleType.id;
          }

          // Check if test exists
          const existingTest = await prisma.test.findFirst({
            where: {
              AND: [
                { name: testName },
                { departmentId: department.id }
              ]
            }
          });

          let testId;
          if (existingTest) {
            // Update existing test
            await prisma.test.update({
              where: { id: existingTest.id },
              data: {
                shortName: shortName || existingTest.shortName,
                testCode: testCode || existingTest.testCode,
                sampleTypeId: sampleTypeId || existingTest.sampleTypeId,
                group: group || existingTest.group,
                reportHeader: reportHeader || existingTest.reportHeader,
                preparationType: preparationType || existingTest.preparationType,
                isNABL,
                profileTest,
                isHeader,
                showTestName,
                lineHeight,
                attachFile,
                imageSize,
                outsourceLab,
                isActive,
                instructionPreparation,
                instructionPatient,
                interpretationLabel,
                interpretation,
                updatedAt: new Date()
              }
            });
            testId = existingTest.id;
            updated.tests++;
            console.log(`✏️ Updated test: ${testName}`);
          } else {
            // Create new test
            const newTest = await prisma.test.create({
              data: {
                name: testName,
                shortName,
                testCode,
                departmentId: department.id,
                sampleTypeId,
                group,
                reportHeader,
                preparationType,
                isNABL,
                profileTest,
                isHeader,
                showTestName,
                lineHeight,
                attachFile,
                imageSize,
                outsourceLab,
                isActive,
                instructionPreparation,
                instructionPatient,
                interpretationLabel,
                interpretation
              }
            });
            testId = newTest.id;
            created.tests++;
            console.log(`✅ Created test: ${testName}`);
          }

          // Handle machine associations (multiple machines separated by comma)
          if (machineNamesRaw) {
            // Delete existing machine associations for this test
            await prisma.testMachine.deleteMany({
              where: { testId: testId }
            });

            // Parse machine names (comma-separated)
            const machineNames = machineNamesRaw.split(',').map(m => m.trim()).filter(m => m);
            
            for (const machineName of machineNames) {
              // Find or create machine
              let machine = await prisma.machine.findFirst({
                where: { name: machineName }
              });
              
              if (!machine) {
                // Create machine if it doesn't exist
                console.log(`➕ Creating machine: ${machineName}`);
                machine = await prisma.machine.create({
                  data: {
                    name: machineName,
                    isActive: true
                  }
                });
                warnings.push(`Row ${rowIndex}: Machine "${machineName}" created automatically`);
              }
              
              // Link machine to test
              await prisma.testMachine.create({
                data: {
                  testId: testId,
                  machineId: machine.id
                }
              });
            }
            console.log(`✅ Linked ${machineNames.length} machine(s) to test: ${testName}`);
          }

          testMap.set(testName, testId);

        } catch (error) {
          errors.push(`Row ${rowIndex}: ${error.message}`);
        }
      }
    }

    // ==================== IMPORT PARAMETERS ====================
    console.log('📝 Processing Parameters sheet...');

    if (parametersSheet) {
      const rows = parametersSheet.getSheetValues();

      for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || !row[1]) continue;

        try {
          const testName = row[1]?.toString().trim();
          const parameterName = row[2]?.toString().trim();
          const parameterCode = row[3]?.toString().trim() || null;
          const unitSymbol = row[4]?.toString().trim() || null;
          const type = row[5]?.toString().trim() || 'Numeric';
          const decimal = parseInt(row[6]) || 2;
          const isMandatory = row[7]?.toString().toLowerCase() === 'yes';
          const isDescriptive = row[8]?.toString().toLowerCase() === 'yes';
          const testMethod = row[9]?.toString().trim() || null;
          const hasFormula = row[10]?.toString().toLowerCase() === 'yes';
          const formula = row[11]?.toString().trim() || null;
          const lowPanic = parseFloat(row[12]) || null;
          const highPanic = parseFloat(row[13]) || null;
          const rangeType = row[14]?.toString().trim() || 'BySex';
          const maleLowValue = parseFloat(row[15]) || null;
          const maleHighValue = parseFloat(row[16]) || null;
          const femaleLowValue = parseFloat(row[17]) || null;
          const femaleHighValue = parseFloat(row[18]) || null;
          const childLowValue = parseFloat(row[19]) || null;
          const childHighValue = parseFloat(row[20]) || null;
          const ageRangesRaw = row[21]?.toString().trim() || null;
          const rangeValuesRaw = row[22]?.toString().trim() || null;
          const isNABL = row[23]?.toString().toLowerCase() === 'yes';
          const isActive = row[24]?.toString().toLowerCase() === 'yes';
          const parameterSortOrder = parseInt(row[25]) || null;

          // Parse JSON fields safely
          let ageRanges = null;
          let rangeValues = null;
          try {
            if (ageRangesRaw) ageRanges = JSON.parse(ageRangesRaw);
          } catch (e) {
            warnings.push(`Parameters Row ${rowIndex}: Invalid ageRanges JSON for "${parameterName}": ${e.message}`);
          }
          try {
            if (rangeValuesRaw) rangeValues = JSON.parse(rangeValuesRaw);
          } catch (e) {
            warnings.push(`Parameters Row ${rowIndex}: Invalid rangeValues JSON for "${parameterName}": ${e.message}`);
          }

          if (!testName || !parameterName) continue;

          const testId = testMap.get(testName);
          if (!testId) {
            errors.push(`Row ${rowIndex}: Test "${testName}" not found in Tests sheet`);
            continue;
          }

          // Find unit (optional)
          let unitId = null;
          if (unitSymbol) {
            const unit = await prisma.unit.findFirst({
              where: { symbol: unitSymbol }
            });
            if (unit) {
              unitId = unit.id;
            }
          }

          // Check if parameter exists
          const existingParam = await prisma.testParameter.findFirst({
            where: {
              AND: [
                { parameterName: parameterName },
                { testId }
              ]
            }
          });

          if (existingParam) {
            // Update
            await prisma.testParameter.update({
              where: { id: existingParam.id },
              data: {
                parameterCode,
                unitId,
                type,
                decimal,
                isMandatory,
                isDescriptive,
                testMethod,
                hasFormula,
                formula,
                lowPanic,
                highPanic,
                rangeType,
                maleLowValue,
                maleHighValue,
                femaleLowValue,
                femaleHighValue,
                childLowValue,
                childHighValue,
                ageRanges: ageRanges ? JSON.stringify(ageRanges) : null,
                rangeValues: rangeValues ? JSON.stringify(rangeValues) : null,
                isNABL,
                isActive,
                parameterSortOrder,
                updatedAt: new Date()
              }
            });
            updated.parameters++;
          } else {
            // Create
            await prisma.testParameter.create({
              data: {
                testId,
                parameterName,
                parameterCode,
                unitId,
                type,
                decimal,
                isMandatory,
                isDescriptive,
                testMethod,
                hasFormula,
                formula,
                lowPanic,
                highPanic,
                rangeType,
                maleLowValue,
                maleHighValue,
                femaleLowValue,
                femaleHighValue,
                childLowValue,
                childHighValue,
                ageRanges: ageRanges ? JSON.stringify(ageRanges) : null,
                rangeValues: rangeValues ? JSON.stringify(rangeValues) : null,
                isNABL,
                isActive,
                parameterSortOrder
              }
            });
            created.parameters++;
          }

        } catch (error) {
          errors.push(`Parameters Row ${rowIndex}: ${error.message}`);
        }
      }
    }

    // ==================== IMPORT CATEGORIES ====================
    console.log('📝 Processing Categories sheet...');

    if (categoriesSheet) {
      const rows = categoriesSheet.getSheetValues();
      console.log(`📋 Categories sheet has ${rows.length} rows`);
      
      // Log header row to verify column order
      if (rows[1]) {
        console.log('📋 Categories header:', rows[1]);
      }

      for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || !row[1]) {
          console.log(`⏭️ Skipping row ${rowIndex}: no data`);
          continue;
        }

        try {
          const testName = row[1]?.toString().trim();
          const parameterName = row[2]?.toString().trim();
          const categoryName = row[3]?.toString().trim() || null;  // Allow null/empty
          const categoryId = row[4]?.toString().trim() || null;
          const isCategory = row[5]?.toString().toLowerCase() === 'yes';
          const testMethod = row[6]?.toString().trim() || null;
          const sortOrder = parseInt(row[7]) || null;

          console.log(`📋 Row ${rowIndex} data:`, { testName, parameterName, categoryName: categoryName || '(empty)', isCategory, sortOrder });

          // Only testName and parameterName are required
          if (!testName || !parameterName) {
            console.log(`⏭️ Skipping row ${rowIndex}: missing testName or parameterName`);
            continue;
          }

          const testId = testMap.get(testName);
          if (!testId) {
            console.log(`❌ Test "${testName}" not found in testMap`);
            errors.push(`Categories Row ${rowIndex}: Test "${testName}" not found`);
            continue;
          }

          console.log(`✅ Found testId: ${testId} for test: ${testName}`);

          // Find the parameter for this category (required for mapping)
          let paramId = null;
          if (parameterName) {
            console.log(`🔍 Looking for parameter: "${parameterName}" in test ${testId}`);
            const param = await prisma.testParameter.findFirst({
              where: {
                AND: [
                  { parameterName: parameterName },
                  { testId }
                ]
              }
            });

            if (param) {
              paramId = param.id;
              console.log(`✅ Found paramId: ${paramId} for parameter: "${parameterName}"`);
            } else {
              // Log all available parameters for this test
              const allParams = await prisma.testParameter.findMany({
                where: { testId },
                select: { id: true, parameterName: true }
              });
              console.log(`❌ Parameter "${parameterName}" not found. Available parameters for test ${testId}:`, 
                allParams.map(p => p.parameterName).join(', '));
              errors.push(`Categories Row ${rowIndex}: Parameter "${parameterName}" not found for test "${testName}". Available: ${allParams.map(p => p.parameterName).join(', ')}`);
              continue;
            }
          } else {
            // Fallback: use first parameter if no parameter name specified
            console.log(`⚠️ No parameter name specified, using first parameter for test ${testId}`);
            const firstParam = await prisma.testParameter.findFirst({
              where: { testId },
              orderBy: { parameterSortOrder: 'asc' }
            });

            if (!firstParam) {
              console.log(`❌ No parameters found for test "${testName}"`);
              warnings.push(`Categories Row ${rowIndex}: No parameters found for test "${testName}", skipping category`);
              continue;
            }
            paramId = firstParam.id;
            console.log(`✅ Using first parameter with id: ${paramId}`);
          }

          // Check if category exists for this parameter
          // Use testId + testParameterId as the primary key since categoryName can be empty/null
          const existingCat = await prisma.testCategory.findFirst({
            where: {
              AND: [
                { testId },
                { testParameterId: paramId }
              ]
            }
          });

          if (existingCat) {
            // Update
            console.log(`✏️ Updating category for parameter: ${parameterName}`);
            await prisma.testCategory.update({
              where: { id: existingCat.id },
              data: {
                categoryName,  // Can be null/empty
                categoryId,
                isCategory,
                testMethod,
                sortOrder,
                updatedAt: new Date()
              }
            });
            updated.categories++;
            console.log(`✅ Updated category for parameter: ${parameterName}`);
          } else {
            // Create new category
            console.log(`➕ Creating new category for parameter: ${parameterName} with name: "${categoryName || '(unnamed)'}"`);
            await prisma.testCategory.create({
              data: {
                testId,
                testParameterId: paramId,
                categoryName,  // Can be null/empty
                categoryId,
                isCategory,
                testMethod,
                sortOrder
              }
            });
            created.categories++;
            console.log(`✅ Created category for parameter: ${parameterName}`);
          }

        } catch (error) {
          console.error(`❌ Error processing row ${rowIndex}:`, error.message);
          errors.push(`Categories Row ${rowIndex}: ${error.message}`);
        }
      }
    }

    console.log('✅ Import complete');

    // Log detailed summary
    console.log('\n========== IMPORT SUMMARY ==========');
    console.log('Tests:', created.tests, 'created,', updated.tests, 'updated');
    console.log('Parameters:', created.parameters, 'created,', updated.parameters, 'updated');
    console.log('Categories:', created.categories, 'created,', updated.categories, 'updated');
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
    }
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      warnings.forEach((warn, idx) => console.log(`  ${idx + 1}. ${warn}`));
    }
    console.log('===================================\n');

    return {
      success: errors.length === 0,
      created,
      updated,
      errors,
      warnings,
      message: `Import completed. Created: ${JSON.stringify(created)}, Updated: ${JSON.stringify(updated)}`
    };

  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  }
};
