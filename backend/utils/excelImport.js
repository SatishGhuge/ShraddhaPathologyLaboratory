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
          const machineName = row[6]?.toString().trim() || null;
          const group = row[7]?.toString().trim() || null;
          const reportHeader = row[8]?.toString().trim() || null;
          const preparationType = row[9]?.toString().trim() || null;
          const isNABL = row[10]?.toString().toLowerCase() === 'yes';
          const profileTest = row[11]?.toString().toLowerCase() === 'yes' ? 1 : 0;
          const isHeader = row[12]?.toString().toLowerCase() === 'yes';
          const showTestName = row[13]?.toString().toLowerCase() === 'yes';
          const lineHeight = parseFloat(row[14]) || 1.4;
          const attachFile = row[15]?.toString().toLowerCase() === 'yes' ? 1 : 0;
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

          // Find or validate department
          const department = await prisma.department.findFirst({
            where: { name: departmentName }
          });

          if (!department) {
            errors.push(`Row ${rowIndex}: Department "${departmentName}" not found`);
            continue;
          }

          // Find sample type (optional)
          let sampleTypeId = null;
          if (sampleTypeName) {
            const sampleType = await prisma.sample_type.findFirst({
              where: { Sample_Type: sampleTypeName }
            });
            if (sampleType) {
              sampleTypeId = sampleType.id;
            } else {
              warnings.push(`Row ${rowIndex}: Sample type "${sampleTypeName}" not found, skipping`);
            }
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
                machineName: machineName || existingTest.machineName,
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
                machineName,
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
          const isNABL = row[21]?.toString().toLowerCase() === 'yes';
          const isActive = row[22]?.toString().toLowerCase() === 'yes';
          const parameterSortOrder = parseInt(row[23]) || null;

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

      for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || !row[1]) continue;

        try {
          const testName = row[1]?.toString().trim();
          const categoryName = row[2]?.toString().trim();
          const categoryId = row[3]?.toString().trim() || null;
          const isCategory = row[4]?.toString().toLowerCase() === 'yes';
          const testMethod = row[5]?.toString().trim() || null;
          const sortOrder = parseInt(row[6]) || null;

          if (!testName || !categoryName) continue;

          const testId = testMap.get(testName);
          if (!testId) {
            errors.push(`Categories Row ${rowIndex}: Test "${testName}" not found`);
            continue;
          }

          // Check if category exists
          const existingCat = await prisma.testCategory.findFirst({
            where: {
              AND: [
                { categoryName: categoryName },
                { testId }
              ]
            }
          });

          if (existingCat) {
            // Update
            await prisma.testCategory.update({
              where: { id: existingCat.id },
              data: {
                categoryId,
                isCategory,
                testMethod,
                sortOrder,
                updatedAt: new Date()
              }
            });
            updated.categories++;
          } else {
            // Need at least one parameter for category
            const params = await prisma.testParameter.findFirst({
              where: { testId }
            });

            if (params) {
              await prisma.testCategory.create({
                data: {
                  testId,
                  testParameterId: params.id,
                  categoryName,
                  categoryId,
                  isCategory,
                  testMethod,
                  sortOrder
                }
              });
              created.categories++;
            } else {
              warnings.push(`Categories Row ${rowIndex}: No parameters found for test "${testName}", skipping category`);
            }
          }

        } catch (error) {
          errors.push(`Categories Row ${rowIndex}: ${error.message}`);
        }
      }
    }

    console.log('✅ Import complete');

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
