import { prisma } from '../config/database.js';

/**
 * Validation utilities for Excel import
 */

/**
 * Validate test data before import
 */
export const validateTestRow = async (row, rowIndex) => {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!row.name || !row.name.trim()) {
    errors.push(`Row ${rowIndex}: Test name is required`);
    return { errors, warnings };
  }

  if (!row.department || !row.department.trim()) {
    errors.push(`Row ${rowIndex}: Department is required for test "${row.name}"`);
    return { errors, warnings };
  }

  // Validate department exists
  const department = await prisma.department.findFirst({
    where: { name: row.department }
  });

  if (!department) {
    errors.push(`Row ${rowIndex}: Department "${row.department}" does not exist in the system`);
    return { errors, warnings };
  }

  // Validate sample type if provided
  if (row.sampleType && row.sampleType.trim()) {
    const sampleType = await prisma.sample_type.findFirst({
      where: { Sample_Type: row.sampleType }
    });

    if (!sampleType) {
      warnings.push(`Row ${rowIndex}: Sample type "${row.sampleType}" not found, will be skipped`);
    }
  }

  // Validate numeric fields
  if (row.lineHeight && isNaN(parseFloat(row.lineHeight))) {
    errors.push(`Row ${rowIndex}: Line height must be a number`);
  }

  // Validate boolean fields
  const booleanFields = ['isNABL', 'profileTest', 'isHeader', 'showTestName', 'attachFile', 'isActive'];
  booleanFields.forEach(field => {
    if (row[field] && !['yes', 'no', 'true', 'false'].includes(row[field].toLowerCase())) {
      errors.push(`Row ${rowIndex}: ${field} must be "Yes" or "No"`);
    }
  });

  // Check for duplicate test name in same department
  const existingTest = await prisma.test.findFirst({
    where: {
      AND: [
        { name: row.name },
        { departmentId: department.id },
        { isDeleted: false }
      ]
    }
  });

  if (existingTest) {
    warnings.push(`Row ${rowIndex}: Test "${row.name}" already exists in department "${row.department}" - will be updated`);
  }

  return { errors, warnings, department };
};

/**
 * Validate parameter data before import
 */
export const validateParameterRow = async (row, rowIndex, testMap) => {
  const errors = [];
  const warnings = [];

  if (!row.testName || !row.testName.trim()) {
    errors.push(`Row ${rowIndex}: Test name is required`);
    return { errors, warnings };
  }

  if (!row.parameterName || !row.parameterName.trim()) {
    errors.push(`Row ${rowIndex}: Parameter name is required`);
    return { errors, warnings };
  }

  // Validate test exists in map
  const testId = testMap.get(row.testName);
  if (!testId) {
    errors.push(`Row ${rowIndex}: Test "${row.testName}" not found in Tests sheet or failed validation`);
    return { errors, warnings };
  }

  // Validate unit if provided
  if (row.unit && row.unit.trim()) {
    const unit = await prisma.unit.findFirst({
      where: { symbol: row.unit }
    });

    if (!unit) {
      warnings.push(`Row ${rowIndex}: Unit "${row.unit}" not found in system, parameter will not have a unit assigned`);
    }
  }

  // Validate numeric fields
  const numericFields = ['decimal', 'lowPanic', 'highPanic', 'maleLowValue', 'maleHighValue', 'femaleLowValue', 'femaleHighValue', 'childLowValue', 'childHighValue'];
  numericFields.forEach(field => {
    if (row[field] && isNaN(parseFloat(row[field]))) {
      errors.push(`Row ${rowIndex}: ${field} must be a number`);
    }
  });

  // Validate type field
  const validTypes = ['Numeric', 'Text', 'Descriptive', 'MultiSelect'];
  if (row.type && !validTypes.includes(row.type)) {
    errors.push(`Row ${rowIndex}: Type must be one of: ${validTypes.join(', ')}`);
  }

  // Validate range type
  const validRangeTypes = ['BySex', 'ByAge', 'Fixed', 'None'];
  if (row.rangeType && !validRangeTypes.includes(row.rangeType)) {
    errors.push(`Row ${rowIndex}: Range type must be one of: ${validRangeTypes.join(', ')}`);
  }

  // Validate boolean fields
  const booleanFields = ['isMandatory', 'isDescriptive', 'hasFormula', 'isNABL', 'isActive'];
  booleanFields.forEach(field => {
    if (row[field] && !['yes', 'no', 'true', 'false'].includes(row[field].toLowerCase())) {
      errors.push(`Row ${rowIndex}: ${field} must be "Yes" or "No"`);
    }
  });

  return { errors, warnings };
};

/**
 * Validate category data before import
 */
export const validateCategoryRow = async (row, rowIndex, testMap) => {
  const errors = [];
  const warnings = [];

  if (!row.testName || !row.testName.trim()) {
    errors.push(`Row ${rowIndex}: Test name is required`);
    return { errors, warnings };
  }

  if (!row.categoryName || !row.categoryName.trim()) {
    errors.push(`Row ${rowIndex}: Category name is required`);
    return { errors, warnings };
  }

  // Validate test exists
  const testId = testMap.get(row.testName);
  if (!testId) {
    errors.push(`Row ${rowIndex}: Test "${row.testName}" not found in Tests sheet`);
    return { errors, warnings };
  }

  // Check if test has parameters (required for category)
  const parameterCount = await prisma.testParameter.count({
    where: { testId }
  });

  if (parameterCount === 0) {
    errors.push(`Row ${rowIndex}: Test "${row.testName}" has no parameters - cannot create category without parameters`);
  }

  // Validate boolean field
  if (row.isCategory && !['yes', 'no', 'true', 'false'].includes(row.isCategory.toLowerCase())) {
    errors.push(`Row ${rowIndex}: isCategory must be "Yes" or "No"`);
  }

  return { errors, warnings };
};

/**
 * Pre-validate entire Excel file before processing
 */
export const validateExcelFile = async (testsSheet, parametersSheet, categoriesSheet) => {
  const validationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      testCount: 0,
      parameterCount: 0,
      categoryCount: 0
    }
  };

  try {
    // Count rows
    if (testsSheet) {
      const testRows = testsSheet.getSheetValues();
      validationResult.stats.testCount = Math.max(0, testRows.length - 2); // Subtract header and empty
    }

    if (parametersSheet) {
      const paramRows = parametersSheet.getSheetValues();
      validationResult.stats.parameterCount = Math.max(0, paramRows.length - 2);
    }

    if (categoriesSheet) {
      const catRows = categoriesSheet.getSheetValues();
      validationResult.stats.categoryCount = Math.max(0, catRows.length - 2);
    }

    // Validate sheets exist
    if (!testsSheet) {
      validationResult.isValid = false;
      validationResult.errors.push('Excel file must contain a "Tests" sheet');
    }

    // Validate column headers
    if (testsSheet) {
      const headers = testsSheet.getRow(1).values;
      const requiredHeaders = ['Test Name', 'Short Name', 'Test Code', 'Department'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        validationResult.isValid = false;
        validationResult.errors.push(`Tests sheet missing required columns: ${missingHeaders.join(', ')}`);
      }
    }

    if (parametersSheet) {
      const headers = parametersSheet.getRow(1).values;
      const requiredHeaders = ['Test Name', 'Parameter Name', 'Unit', 'Type'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        validationResult.errors.push(`Parameters sheet missing required columns: ${missingHeaders.join(', ')}`);
      }
    }

    if (categoriesSheet) {
      const headers = categoriesSheet.getRow(1).values;
      const requiredHeaders = ['Test Name', 'Category Name'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        validationResult.errors.push(`Categories sheet missing required columns: ${missingHeaders.join(', ')}`);
      }
    }

    if (validationResult.errors.length > 0) {
      validationResult.isValid = false;
    }

    return validationResult;

  } catch (error) {
    validationResult.isValid = false;
    validationResult.errors.push(`Validation error: ${error.message}`);
    return validationResult;
  }
};
