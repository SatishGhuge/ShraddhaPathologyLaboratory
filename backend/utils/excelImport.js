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
          const volume = row[7]?.toString().trim() || null;
          const testMethod = row[8]?.toString().trim() || null;
          const cutOff = row[9]?.toString().trim() || null;
          const schedule = row[10]?.toString().trim() || null;
          const preparationTime = row[11]?.toString().trim() || null;
          const preparationType = row[12]?.toString().trim() || null;
          const temperature = row[13]?.toString().trim() || null;
          const comments = row[14]?.toString().trim() || null;
          const interpretation = row[15]?.toString().trim() || null;
          const attachFile = row[16]?.toString().toLowerCase() === 'yes';
          const imageSize = row[17]?.toString().trim() || '800|600';
          const profileTest = row[18]?.toString().toLowerCase() === 'yes';
          const isNABL = row[19]?.toString().toLowerCase() === 'yes';
          const isActive = row[20]?.toString().toLowerCase() === 'yes';

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
            console.log(`🔍 Looking for sample type: "${sampleTypeName}"`);
            let sampleType = await prisma.sample_type.findFirst({
              where: { Sample_Type: sampleTypeName }
            });
            
            if (!sampleType) {
              // Create sample type if it doesn't exist
              console.log(`➕ Creating sample type: ${sampleTypeName}`);
              sampleType = await prisma.sample_type.create({
                data: {
                  Sample_Type: sampleTypeName,
                  Sample_Color: '#FFFFFF', // Default white color
                  colorName: 'Default' // Default color name
                }
              });
              warnings.push(`Row ${rowIndex}: Sample type "${sampleTypeName}" created automatically`);
            }
            sampleTypeId = sampleType.id;
            console.log(`✅ Sample type ID set: ${sampleTypeId} for "${sampleTypeName}"`);
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
            console.log(`📝 Updating test: ${testName}, sampleTypeId: ${sampleTypeId}`);
            await prisma.test.update({
              where: { id: existingTest.id },
              data: {
                shortName: shortName || existingTest.shortName,
                testCode: testCode || existingTest.testCode,
                sampleTypeId: sampleTypeId !== null ? sampleTypeId : existingTest.sampleTypeId,
                volume: volume !== null ? volume : existingTest.volume,
                testMethod: testMethod || existingTest.testMethod,
                cutOff: cutOff !== null ? cutOff : existingTest.cutOff,
                schedule: schedule !== null ? schedule : existingTest.schedule,
                preparationTime: preparationTime !== null ? preparationTime : existingTest.preparationTime,
                preparationType: preparationType || existingTest.preparationType,
                temperature: temperature !== null ? temperature : existingTest.temperature,
                comments: comments !== null ? comments : existingTest.comments,
                interpretation: interpretation || existingTest.interpretation,
                attachFile,
                imageSize,
                profileTest,
                isNABL,
                isActive,
                updatedAt: new Date()
              }
            });
            testId = existingTest.id;
            updated.tests++;
            console.log(`✏️ Updated test: ${testName}, sampleTypeId saved: ${sampleTypeId}`);
          } else {
            // Create new test
            console.log(`📝 Creating test: ${testName}, sampleTypeId: ${sampleTypeId}`);
            const newTest = await prisma.test.create({
              data: {
                name: testName,
                shortName,
                testCode,
                departmentId: department.id,
                sampleTypeId: sampleTypeId || null,
                volume,
                testMethod,
                cutOff,
                schedule,
                preparationTime,
                preparationType,
                temperature,
                comments,
                interpretation,
                attachFile,
                imageSize,
                profileTest,
                isNABL,
                isActive
              }
            });
            testId = newTest.id;
            created.tests++;
            console.log(`✅ Created test: ${testName}, sampleTypeId saved: ${sampleTypeId}`);
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
          // ✅ FIX: Use correct column indices 
          // Columns: 15=MaleLow, 16=MaleHigh, 17=FemaleLow, 18=FemaleHigh, 19=ChildLow, 20=ChildHigh
          // Array indices (1-based): row[14]=Range Type, row[15]=MaleLow, etc.
          // ✅ FIX: Store as String (not parseFloat) to match database schema
          // ✅ FIX: Use != null check to preserve "0" values
          const maleLowValue = row[15] != null && row[15] !== '' ? row[15]?.toString().trim() : null;
          const maleHighValue = row[16] != null && row[16] !== '' ? row[16]?.toString().trim() : null;
          const femaleLowValue = row[17] != null && row[17] !== '' ? row[17]?.toString().trim() : null;
          const femaleHighValue = row[18] != null && row[18] !== '' ? row[18]?.toString().trim() : null;
          const childLowValue = row[19] != null && row[19] !== '' ? row[19]?.toString().trim() : null;
          const childHighValue = row[20] != null && row[20] !== '' ? row[20]?.toString().trim() : null;
          
          // DEBUG: Log numeric range extraction
          console.log(`🔍 DEBUG excelImport Row ${rowIndex} - Parameter "${parameterName}" ranges:`, {
            extracted: { maleLowValue, maleHighValue, femaleLowValue, femaleHighValue, childLowValue, childHighValue },
            rawValues: { col15: row[15], col16: row[16], col17: row[17], col18: row[18], col19: row[19], col20: row[20] }
          });
          
          const ageRangesRaw = row[21]?.toString().trim() || null;
          const rangeValuesRaw = row[22]?.toString().trim() || null;
          const textContent = row[23]?.toString().trim() || null;
          const maleDisplayText = row[24]?.toString().trim() || null;
          const femaleDisplayText = row[25]?.toString().trim() || null;
          const defaultDisplayText = row[26]?.toString().trim() || null;
          const isMultipleOptions = row[27]?.toString().toLowerCase() === 'yes';
          const displayRangeText = row[28]?.toString().trim() || null;
          const rangeText = row[29]?.toString().trim() || null;
          const isNABL = row[30]?.toString().toLowerCase() === 'yes';
          const isActive = row[31]?.toString().toLowerCase() === 'yes';
          const parameterSortOrder = row[32] ? parseInt(row[32]) : null;

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
                textContent,
                maleDisplayText,
                femaleDisplayText,
                defaultDisplayText,
                isMultipleOptions,
                displayRangeText,
                rangeText,
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
                textContent,
                maleDisplayText,
                femaleDisplayText,
                defaultDisplayText,
                isMultipleOptions,
                displayRangeText,
                rangeText,
                isNABL,
                isActive: true,  // ✅ ALWAYS active when importing
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
