/* ===============================================
 * TEST HELPER UTILITIES
 * ===============================================
 * 
 * Helper functions for test and category operations
 * 
 * Author: Shraddha Development Team
 * Last Updated: March 2026
 * =============================================== */

/**
 * Validate test data before creation/update
 * @param {Object} testData - Test data to validate
 * @returns {Object} - Validation result with success flag and errors
 */
export const validateTestData = (testData) => {
  const errors = [];
  
  // Required fields validation
  if (!testData.name || testData.name.trim() === '') {
    errors.push('Test name is required');
  }
  
  if (!testData.departmentId) {
    errors.push('Department is required');
  }
  
  if (!testData.shortName || testData.shortName.trim() === '') {
    errors.push('Test short name is required');
  }
  
  // Numeric field validation
  if (testData.sortOrder && isNaN(parseInt(testData.sortOrder))) {
    errors.push('Sort order must be a valid number');
  }
  
  if (testData.costForLab && isNaN(parseFloat(testData.costForLab))) {
    errors.push('Cost for lab must be a valid number');
  }
  
  if (testData.lineHeight && isNaN(parseFloat(testData.lineHeight))) {
    errors.push('Line height must be a valid number');
  }
  
  return {
    success: errors.length === 0,
    errors
  };
};

/**
 * Validate category data
 * @param {Array} categories - Categories array to validate
 * @returns {Object} - Validation result
 */
export const validateCategoryData = (categories) => {
  const errors = [];
  
  if (!Array.isArray(categories)) {
    return {
      success: false,
      errors: ['Categories must be an array']
    };
  }
  
  categories.forEach((category, categoryIndex) => {
    // Validate category name if it's marked as a category
    if (category.isCategory && (!category.categoryDescription && !category.name)) {
      errors.push(`Category ${categoryIndex + 1}: Category name is required when "Is Category" is checked`);
    }
    
    // Validate parameters
    if (category.parameters && Array.isArray(category.parameters)) {
      category.parameters.forEach((param, paramIndex) => {
        if (param.parameterName && param.parameterName.trim() !== '') {
          // Validate numeric fields
          if (param.lowPanic && isNaN(parseFloat(param.lowPanic))) {
            errors.push(`Category ${categoryIndex + 1}, Parameter ${paramIndex + 1}: Low panic value must be a number`);
          }
          
          if (param.highPanic && isNaN(parseFloat(param.highPanic))) {
            errors.push(`Category ${categoryIndex + 1}, Parameter ${paramIndex + 1}: High panic value must be a number`);
          }
          
          if (param.decimal && isNaN(parseInt(param.decimal))) {
            errors.push(`Category ${categoryIndex + 1}, Parameter ${paramIndex + 1}: Decimal places must be a number`);
          }
          
          // Validate normal ranges
          if (param.normalRanges && Array.isArray(param.normalRanges)) {
            param.normalRanges.forEach((range, rangeIndex) => {
              if (range.isActive) {
                if (range.lowValue && isNaN(parseFloat(range.lowValue))) {
                  errors.push(`Category ${categoryIndex + 1}, Parameter ${paramIndex + 1}, ${range.gender} range: Low value must be a number`);
                }
                
                if (range.highValue && isNaN(parseFloat(range.highValue))) {
                  errors.push(`Category ${categoryIndex + 1}, Parameter ${paramIndex + 1}, ${range.gender} range: High value must be a number`);
                }
              }
            });
          }
        }
      });
    }
  });
  
  return {
    success: errors.length === 0,
    errors
  };
};

/**
 * Process categories for database storage
 * @param {Array} categories - Raw categories from frontend
 * @returns {Array} - Processed categories ready for database
 */
export const processCategoriesForStorage = (categories) => {
  if (!categories || !Array.isArray(categories)) {
    return [];
  }
  
  return categories.filter(category => 
    category.categoryDescription || 
    (category.parameters && category.parameters.some(param => param.parameterName))
  ).map(category => ({
    name: category.categoryDescription || category.name || null,
    isCategory: category.isCategory || false,
    testMethod: category.testMethod || null,
    sortOrder: category.sortOrder ? parseInt(category.sortOrder) : null,
    color: category.color || null,
    icon: category.icon || null,
    description: category.description || null,
    categoryType: category.categoryType || null,
    parentId: category.parentId || null,
    parameters: category.parameters ? category.parameters.filter(param => 
      param.parameterName
    ).map(param => ({
      parameterName: param.parameterName,
      machineCode: param.machineCode || null,
      multiplyBy: param.multiplyBy || null,
      decimal: param.decimal || 2,
      sortOrder: param.sortOrder ? parseInt(param.sortOrder) : null,
      isDescriptive: param.isDescriptive || false,
      lowPanic: param.lowPanic ? parseFloat(param.lowPanic) : null,
      highPanic: param.highPanic ? parseFloat(param.highPanic) : null,
      isNABL: param.isNABL || false,
      type: param.type || "Numeric",
      isMandatory: param.isMandatory || false,
      rangeType: param.rangeType || "BySex",
      units: param.units || null,
      displayRangeText: param.displayRangeText || null,
      rangeText: param.rangeText || null,
      textContent: param.textContent || null,
      isMultipleOptions: param.isMultipleOptions || false,
      normalRanges: param.normalRanges ? param.normalRanges.filter(range => 
        range.isActive && (range.lowValue || range.highValue || range.defaultValue)
      ).map(range => ({
        gender: range.gender,
        lowValue: range.lowValue ? parseFloat(range.lowValue) : null,
        highValue: range.highValue ? parseFloat(range.highValue) : null,
        defaultValue: range.defaultValue || null,
        isActive: range.isActive
      })) : [],
      ageRanges: param.ageRanges ? param.ageRanges.filter(ageRange => 
        ageRange.isActive && (ageRange.lowValue || ageRange.highValue || ageRange.defaultValue)
      ).map(ageRange => ({
        label: ageRange.label,
        lowValue: ageRange.lowValue ? parseFloat(ageRange.lowValue) : null,
        highValue: ageRange.highValue ? parseFloat(ageRange.highValue) : null,
        defaultValue: ageRange.defaultValue || null,
        timeUnit: ageRange.timeUnit || "Day(s)",
        isActive: ageRange.isActive
      })) : [],
      rangeValues: param.rangeValues ? param.rangeValues.filter(rangeValue => 
        rangeValue.isActive && (rangeValue.fromValue || rangeValue.toValue || rangeValue.interpretation)
      ).map(rangeValue => ({
        label: rangeValue.label,
        fromValue: rangeValue.fromValue ? parseFloat(rangeValue.fromValue) : null,
        toValue: rangeValue.toValue ? parseFloat(rangeValue.toValue) : null,
        interpretation: rangeValue.interpretation || null,
        gender: rangeValue.gender || null,
        isActive: rangeValue.isActive
      })) : []
    })) : []
  }));
};

/**
 * Reconstruct categories from database format for frontend
 * @param {Array} dbCategories - Categories from database
 * @returns {Array} - Categories formatted for frontend
 */
export const reconstructCategoriesForFrontend = (dbCategories) => {
  if (!dbCategories || !Array.isArray(dbCategories)) {
    return [];
  }
  
  const categoriesMap = new Map();
  
  dbCategories.forEach(cat => {
    const categoryKey = cat.categoryName || 'Default';
    
    if (!categoriesMap.has(categoryKey)) {
      categoriesMap.set(categoryKey, {
        name: cat.categoryName,
        categoryDescription: cat.categoryName,
        isCategory: cat.isCategory,
        testMethod: cat.testMethod,
        sortOrder: cat.sortOrder,
        color: cat.color,
        icon: cat.icon,
        description: cat.description,
        categoryType: cat.categoryType,
        parentId: cat.parentId,
        parameters: []
      });
    }
    
    if (cat.parameterName) {
      const parameter = {
        parameterName: cat.parameterName,
        machineCode: cat.machineCode,
        multiplyBy: cat.multiplyBy,
        decimal: cat.decimal,
        sortOrder: cat.parameterSortOrder,
        isDescriptive: cat.isDescriptive,
        lowPanic: cat.lowPanic,
        highPanic: cat.highPanic,
        isNABL: cat.isNABL,
        type: cat.type,
        isMandatory: cat.isMandatory,
        rangeType: cat.rangeType,
        units: cat.units,
        displayRangeText: cat.displayRangeText,
        rangeText: cat.rangeText,
        textContent: cat.textContent,
        isMultipleOptions: cat.isMultipleOptions,
        normalRanges: [
          {
            gender: 'Male',
            lowValue: cat.maleLowValue,
            highValue: cat.maleHighValue,
            defaultValue: cat.maleDefaultValue,
            isActive: cat.maleActive
          },
          {
            gender: 'Female',
            lowValue: cat.femaleLowValue,
            highValue: cat.femaleHighValue,
            defaultValue: cat.femaleDefaultValue,
            isActive: cat.femaleActive
          },
          {
            gender: 'Child',
            lowValue: cat.childLowValue,
            highValue: cat.childHighValue,
            defaultValue: cat.childDefaultValue,
            isActive: cat.childActive
          }
        ],
        ageRanges: (() => {
          try {
            return cat.ageRanges ? JSON.parse(cat.ageRanges) : [];
          } catch (e) {
            console.warn('Failed to parse ageRanges:', cat.ageRanges, e);
            return [];
          }
        })(),
        rangeValues: (() => {
          try {
            return cat.rangeValues ? JSON.parse(cat.rangeValues) : [];
          } catch (e) {
            console.warn('Failed to parse rangeValues:', cat.rangeValues, e);
            return [];
          }
        })()
      };
      
      categoriesMap.get(categoryKey).parameters.push(parameter);
    }
  });
  
  // Convert map to array and ensure categories without parameters have at least one empty parameter
  const categoriesArray = Array.from(categoriesMap.values());
  categoriesArray.forEach(category => {
    if (category.parameters.length === 0) {
      // Add default empty parameter for categories without parameters
      category.parameters.push({
        parameterName: "",
        machineCode: "",
        multiplyBy: "",
        decimal: 2,
        sortOrder: "",
        isDescriptive: false,
        lowPanic: "",
        highPanic: "",
        isNABL: false,
        type: "Numeric",
        isMandatory: false,
        rangeType: "BySex",
        units: "",
        displayRangeText: "",
        rangeText: "",
        textContent: "",
        isMultipleOptions: false,
        normalRanges: [
          { gender: "Male", lowValue: "", highValue: "", defaultValue: "", isActive: true },
          { gender: "Female", lowValue: "", highValue: "", defaultValue: "", isActive: false },
          { gender: "Child", lowValue: "", highValue: "", defaultValue: "", isActive: false }
        ],
        ageRanges: [],
        rangeValues: []
      });
    }
  });
  
  return categoriesArray;
};

/**
 * Generate test code automatically
 * @param {string} testName - Test name
 * @param {string} departmentCode - Department code
 * @returns {string} - Generated test code
 */
export const generateTestCode = (testName, departmentCode) => {
  if (!testName) return '';
  
  // Extract first 3 characters from test name (uppercase)
  const nameCode = testName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
  
  // Use department code or default
  const deptCode = departmentCode ? departmentCode.substring(0, 2).toUpperCase() : 'GEN';
  
  // Generate random number
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${deptCode}${nameCode}${randomNum}`;
};

/**
 * Format test data for display
 * @param {Object} test - Test object from database
 * @returns {Object} - Formatted test data
 */
export const formatTestForDisplay = (test) => {
  if (!test) return null;
  
  return {
    ...test,
    costForLab: test.costForLab ? parseFloat(test.costForLab).toFixed(2) : '0.00',
    lineHeight: test.lineHeight ? parseFloat(test.lineHeight).toFixed(1) : '1.0',
    categoriesCount: test.categories ? test.categories.length : 0,
    parametersCount: test.categories ? 
      test.categories.reduce((total, cat) => total + (cat.parameters?.length || 0), 0) : 0
  };
};