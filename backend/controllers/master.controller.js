import prisma from '../config/database.js';
import { sendUserCredentialsEmail, sendFranchiseCredentialsEmail, sendCenterCredentialsEmail, sendStaffCredentialsEmail, sendOrganizationCredentialsEmail, sendAccountUpdateEmail } from '../utils/email.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

// Helper function to generate random password
function generateRandomPassword(length = 10) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Helper function to extract first name from full name
function extractFirstName(fullName) {
  if (!fullName) return 'User';
  return fullName.trim().split(' ')[0];
}

// Helper function to process age ranges and auto-assign gender based on label
function processAgeRangesWithGender(ageRanges, parameterName = '') {
  if (!ageRanges || ageRanges.length === 0) {
    return null;
  }
  
  const processedRanges = ageRanges.map(range => {
    // Auto-assign gender based on label
    let gender = range.gender;
    if (range.label && range.enabled) {
      if (range.label.includes('Male') && !range.label.includes('Female')) {
        gender = 'Male';
      } else if (range.label.includes('Female')) {
        gender = 'Female';
      }
    }
    
    return {
      ...range,
      gender: gender
    };
  });
  
  console.log(`🎯 Processed age ranges for ${parameterName}:`, processedRanges);
  return JSON.stringify(processedRanges);
}

/* ===============================================
 * SHRADDHA PATHOLOGY LABORATORY - MASTER CONTROLLER
 * ===============================================
 * 
 * This controller handles all master data operations:
 * - Tests (Create, Read, Update, Delete)
 * - Categories and Parameters
 * - Departments
 * - Doctors, Franchises, Collection Centers, Corporates
 * - Test Charges and Corporate Charges
 * - Packages
 * 
 * Author: Shraddha Development Team
 * Last Updated: March 2026
 * =============================================== */

/* ===============================================
 * DEPARTMENT OPERATIONS
 * =============================================== */

// Get all active departments with tests and packages
export const getDepartments = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await prisma.department.count({
      where: { isActive: true }
    });

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        group: true,
        isActive: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(departments, total, page, limit));
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments'
    });
  }
};

// Get all departments (including inactive ones for admin)
export const getAllDepartments = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await prisma.department.count();

    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        group: true,
        isActive: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(departments, total, page, limit));
  } catch (error) {
    console.error('Get all departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments'
    });
  }
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        tests: {
          where: { isActive: true }
        },
        packages: {
          where: { isActive: true }
        }
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department'
    });
  }
};

// Create new department
export const createDepartment = async (req, res) => {
  try {
    const { name, code, group } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required'
      });
    }

    // Check if department with same name already exists
    const existingDepartment = await prisma.department.findUnique({
      where: { name }
    });

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        group: group || null,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    console.error('Create department error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create department'
    });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, group, isActive } = req.body;

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const department = await prisma.department.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        code: code || undefined,
        group: group !== undefined ? group : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    console.error('Update department error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update department'
    });
  }
};

// Delete department (soft delete by setting isActive to false)
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if department has active tests
    const activeTests = await prisma.test.count({
      where: { 
        departmentId: parseInt(id),
        isActive: true,
        isDeleted: false
      }
    });

    if (activeTests > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. It has ${activeTests} active tests.`
      });
    }

    // Soft delete - mark as inactive
    await prisma.department.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department'
    });
  }
};

/* ===============================================
 * TEST OPERATIONS
 * =============================================== */

// Get test by ID with TestParameter support
export const getTestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const test = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            group: true
          }
        },
        categories: {
          include: {
            testParameter: true
          },
          orderBy: { categoryName: 'asc' }
        }
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Reconstruct categories with parameters from TestParameter table
    // Group parameters by categoryId (unique identifier)
    const categoriesMap = new Map();
    
    test.categories.forEach((cat) => {
      // Use categoryId as key to group parameters properly
      const categoryKey = cat.categoryId || cat.categoryName || 'Default';
      
      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, {
          categoryId: cat.categoryId,
          name: cat.categoryName,
          isCategory: cat.isCategory,
          testMethod: cat.testMethod,
          sortOrder: cat.sortOrder,
          parameters: []
        });
      }
      
      // Get parameter data from testParameter relation
      if (cat.testParameter) {
        const param = cat.testParameter;
        const parameter = {
          parameterName: param.parameterName,
          machineCode: param.machineCode,
          multiplyBy: param.multiplyBy,
          decimal: param.decimal ? Number(param.decimal) : undefined,
          sortOrder: param.parameterSortOrder,
          isDescriptive: param.isDescriptive,
          lowPanic: param.lowPanic,
          highPanic: param.highPanic,
          isNABL: param.isNABL,
          parameterCode: param.parameterCode,
          hasFormula: param.hasFormula,
          formula: param.formula,
          type: param.type,
          isMandatory: param.isMandatory,
          rangeType: param.rangeType,
          units: param.units,
          displayRangeText: param.displayRangeText,
          rangeText: param.rangeText,
          textContent: param.textContent,
          isMultipleOptions: param.isMultipleOptions,
          testMethod: param.testMethod || "",
          normalRanges: [
            {
              gender: 'Male',
              lowValue: param.maleLowValue,
              highValue: param.maleHighValue,
              defaultValue: param.maleDefaultValue,
              isActive: param.maleActive
            },
            {
              gender: 'Female',
              lowValue: param.femaleLowValue,
              highValue: param.femaleHighValue,
              defaultValue: param.femaleDefaultValue,
              isActive: param.femaleActive
            },
            {
              gender: 'Child',
              lowValue: param.childLowValue,
              highValue: param.childHighValue,
              defaultValue: param.childDefaultValue,
              isActive: param.childActive
            }
          ],
          ageRanges: (() => {
            try {
              return param.ageRanges ? JSON.parse(param.ageRanges) : [];
            } catch (e) {
              console.warn('Failed to parse ageRanges:', param.ageRanges, e);
              return [];
            }
          })(),
          rangeValues: (() => {
            try {
              return param.rangeValues ? JSON.parse(param.rangeValues) : [];
            } catch (e) {
              console.warn('Failed to parse rangeValues:', param.rangeValues, e);
              return [];
            }
          })()
        };
        
        categoriesMap.get(categoryKey).parameters.push(parameter);
      }
    });

    // Convert map to array
    const categoriesArray = Array.from(categoriesMap.values());

    // Ensure categories without parameters have at least one empty parameter
    categoriesArray.forEach(category => {
      if (category.parameters.length === 0) {
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
          parameterCode: "",
          hasFormula: false,
          formula: "",
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

    test.categories = categoriesArray;

    // Parse linkedTestIds from JSON string
    test.linkedTestIds = (() => {
      try { return test.linkedTestIds ? JSON.parse(test.linkedTestIds) : []; }
      catch (e) { return []; }
    })();

    // Fetch charges for this test
    const charges = await prisma.testCharge.findMany({
      where: { testId: parseInt(id) },
      select: {
        id: true,
        b2cCharge: true,
        b2bCharge: true,
        discountPercent: true,
        specialPrice: true,
        effectiveFrom: true,
        effectiveTo: true,
        isActive: true
      }
    });

    test.charges = charges;

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test'
    });
  }
};

// Enhanced Create Test function with TestParameter support
export const createTest = async (req, res) => {
  try {
    console.log('📥 Received test data:', JSON.stringify(req.body, null, 2));
    
    const {
      name,
      shortName,
      testCode,
      departmentId,
      sampleTypeId,
      machineName,
      group,
      reportHeader,
      preparationTime,
      preparationType,
      instructionPreparation,
      instructionPatient,
      interpretationLabel,
      interpretation,
      outsourceLab,
      attachFile,
      profileTest,
      isHeader,
      showTestName,
      isNABL,
      lineHeight,
      categories
    } = req.body;

    // Validate required fields
    if (!name || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Name and department are required'
      });
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: parseInt(departmentId) }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    console.log('📊 Processing categories:', categories?.length || 0);

    // Create test first
    const test = await prisma.test.create({
      data: {
        name,
        shortName,
        testCode,
        departmentId: parseInt(departmentId),
        sampleTypeId: sampleTypeId ? parseInt(sampleTypeId) : null,
        machineName,
        group,
        reportHeader,
        preparationTime,
        preparationType,
        instructionPreparation,
        instructionPatient,
        interpretationLabel,
        interpretation,
        outsourceLab,
        attachFile: attachFile || false,
        profileTest: profileTest || false,
        isHeader: isHeader !== undefined ? isHeader : true,
        showTestName: showTestName !== undefined ? showTestName : true,
        isNABL: isNABL || false,
        lineHeight: lineHeight ? parseFloat(lineHeight) : null,
        linkedTestIds: req.body.linkedTestIds ? JSON.stringify(req.body.linkedTestIds) : null
      }
    });

    console.log('✅ Test created with ID:', test.id);

    // Now create TestParameters and TestCategories
    if (categories && categories.length > 0) {
      for (const category of categories) {
        if (category.parameters && category.parameters.length > 0) {
          for (const param of category.parameters) {
            console.log(`📋 Creating parameter: ${param.parameterName} for category: ${category.name}`);
            
            // Create TestParameter
            const testParameter = await prisma.testParameter.create({
              data: {
                testId: test.id, // ✅ Link parameter to test
                parameterName: param.parameterName || 'Unnamed',
                machineCode: param.machineCode || null,
                multiplyBy: param.multiplyBy || null,
                decimal: param.decimal ? parseInt(param.decimal) : null,
                parameterSortOrder: param.sortOrder ? parseInt(param.sortOrder) : null,
                isDescriptive: param.isDescriptive || false,
                lowPanic: param.lowPanic ? parseFloat(param.lowPanic) : null,
                highPanic: param.highPanic ? parseFloat(param.highPanic) : null,
                isNABL: param.isNABL || false,
                parameterCode: param.parameterCode || null,
                hasFormula: param.hasFormula || false,
                formula: param.formula || null,
                type: param.type || 'Numeric',
                isMandatory: param.isMandatory || false,
                rangeType: param.rangeType || 'BySex',
                unitId: param.unitId ? parseInt(param.unitId) : null,
                displayRangeText: param.displayRangeText || null,
                rangeText: param.rangeText || null,
                textContent: param.textContent || null,
                isMultipleOptions: param.isMultipleOptions || false,
                testMethod: param.testMethod || null,
                maleLowValue: param.normalRanges?.find(r => r.gender === 'Male')?.lowValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Male').lowValue) : null,
                maleHighValue: param.normalRanges?.find(r => r.gender === 'Male')?.highValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Male').highValue) : null,
                maleDefaultValue: param.normalRanges?.find(r => r.gender === 'Male')?.defaultValue || null,
                maleActive: param.normalRanges?.find(r => r.gender === 'Male')?.isActive || false,
                femaleLowValue: param.normalRanges?.find(r => r.gender === 'Female')?.lowValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Female').lowValue) : null,
                femaleHighValue: param.normalRanges?.find(r => r.gender === 'Female')?.highValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Female').highValue) : null,
                femaleDefaultValue: param.normalRanges?.find(r => r.gender === 'Female')?.defaultValue || null,
                femaleActive: param.normalRanges?.find(r => r.gender === 'Female')?.isActive || false,
                childLowValue: param.normalRanges?.find(r => r.gender === 'Child')?.lowValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Child').lowValue) : null,
                childHighValue: param.normalRanges?.find(r => r.gender === 'Child')?.highValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Child').highValue) : null,
                childDefaultValue: param.normalRanges?.find(r => r.gender === 'Child')?.defaultValue || null,
                childActive: param.normalRanges?.find(r => r.gender === 'Child')?.isActive || false,
                ageRanges: processAgeRangesWithGender(param.ageRanges, param.parameterName),
                rangeValues: param.rangeValues && param.rangeValues.length > 0 ? JSON.stringify(param.rangeValues) : null,
                isActive: true
              }
            });

            // Create TestCategory linking to TestParameter
            // Each parameter gets its own TestCategory record with the same categoryId
            await prisma.testCategory.create({
              data: {
                testId: test.id,
                testParameterId: testParameter.id,
                categoryId: category.categoryId, // ✅ Use unique category ID
                categoryName: category.name ?? "",
                isCategory: category.isCategory || false,
                testMethod: category.testMethod || null,
                sortOrder: category.sortOrder ? parseInt(category.sortOrder) : null
              }
            });

            console.log(`✅ Created parameter: ${param.parameterName} linked to categoryId: ${category.categoryId}`);
          }
        }
      }
    }

    // Fetch complete test with categories and parameters
    const completeTest = await prisma.test.findUnique({
      where: { id: test.id },
      include: {
        department: {
          select: { id: true, name: true }
        },
        categories: {
          include: {
            testParameter: true
          },
          orderBy: { categoryName: 'asc' }
        }
      }
    });

    console.log('✅ Test created successfully with ID:', test.id);
    console.log('📊 Categories saved:', completeTest.categories.length);

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      data: completeTest
    });
  } catch (error) {
    console.error('❌ Create test error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Test with this name already exists in the department'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create test',
      error: error.message
    });
  }
};

// Enhanced Update Test function
export const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Updating test ID:', id);
    console.log('📥 Received update data:', JSON.stringify(req.body, null, 2));
    
    const {
      name,
      shortName,
      testCode,
      departmentId,
      sampleTypeId,
      machineName,
      group,
      reportHeader,
      preparationTime,
      preparationType,
      instructionPreparation,
      instructionPatient,
      interpretationLabel,
      interpretation,
      outsourceLab,
      attachFile,
      profileTest,
      isHeader,
      showTestName,
      isNABL,
      lineHeight,
      isActive,
      isDeleted,
      categories
    } = req.body;

    // Check if test exists
    const existingTest = await prisma.test.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTest) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Update test basic fields
    const test = await prisma.test.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        shortName: shortName || undefined,
        testCode: testCode !== undefined ? (testCode || null) : undefined,
        department: departmentId ? { connect: { id: parseInt(departmentId) } } : undefined,
        sampleType: sampleType !== undefined ? (sampleType || null) : undefined,
        testMethod: testMethod !== undefined ? (testMethod || null) : undefined,
        machineName: machineName !== undefined ? (machineName || null) : undefined,
        speciality: speciality || undefined,
        group: group !== undefined ? (group || null) : undefined,
        sortOrder: sortOrder !== undefined ? (sortOrder ? parseInt(sortOrder) : null) : undefined,
        reportHeader: reportHeader !== undefined ? (reportHeader || null) : undefined,
        costForLab: costForLab !== undefined ? (costForLab ? parseFloat(costForLab) : null) : undefined,
        preparationTime: preparationTime !== undefined ? (preparationTime || null) : undefined,
        preparationType: preparationType !== undefined ? (preparationType || null) : undefined,
        instructionPreparation: instructionPreparation !== undefined ? (instructionPreparation || null) : undefined,
        instructionPatient: instructionPatient !== undefined ? (instructionPatient || null) : undefined,
        interpretationLabel: interpretationLabel !== undefined ? (interpretationLabel || null) : undefined,
        interpretation: interpretation !== undefined ? (interpretation || null) : undefined,
        outsourceLab: outsourceLab !== undefined ? (outsourceLab || null) : undefined,
        attachFile: attachFile || undefined,
        profileTest: profileTest || undefined,
        isHeader: isHeader !== undefined ? isHeader : undefined,
        showTestName: showTestName !== undefined ? showTestName : undefined,
        isNABL: isNABL !== undefined ? isNABL : undefined,
        lineHeight: lineHeight !== undefined ? (lineHeight ? parseFloat(lineHeight) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        linkedTestIds: req.body.linkedTestIds ? JSON.stringify(req.body.linkedTestIds) : undefined
      }
    });

    // Handle categories update if provided
    if (categories && categories.length > 0) {
      console.log('🗑️ Deleting existing categories for test ID:', id);
      
      // Delete existing categories and their parameters
      await prisma.testCategory.deleteMany({
        where: { testId: parseInt(id) }
      });
      
      console.log('📊 Processing new categories:', categories.length);

      // Create new TestParameters and TestCategories
      for (const category of categories) {
        if (category.parameters && category.parameters.length > 0) {
          for (const param of category.parameters) {
            console.log(`📋 Creating parameter:`, param.parameterName);
            console.log(`🔍 Parameter testMethod value:`, param.testMethod);
            
            // Create TestParameter
            const testParameter = await prisma.testParameter.create({
              data: {
                testId: parseInt(id), // ✅ Link parameter to test (using id from updateTest)
                parameterName: param.parameterName || 'Unnamed',
                machineCode: param.machineCode || null,
                multiplyBy: param.multiplyBy || null,
                decimal: param.decimal ? parseInt(param.decimal) : null,
                parameterSortOrder: param.sortOrder ? parseInt(param.sortOrder) : null,
                isDescriptive: param.isDescriptive || false,
                lowPanic: param.lowPanic ? parseFloat(param.lowPanic) : null,
                highPanic: param.highPanic ? parseFloat(param.highPanic) : null,
                isNABL: param.isNABL || false,
                parameterCode: param.parameterCode || null,
                hasFormula: param.hasFormula || false,
                formula: param.formula || null,
                type: param.type || 'Numeric',
                isMandatory: param.isMandatory || false,
                rangeType: param.rangeType || 'BySex',
                unitId: param.unitId ? parseInt(param.unitId) : null,
                displayRangeText: param.displayRangeText || null,
                rangeText: param.rangeText || null,
                textContent: param.textContent || null,
                isMultipleOptions: param.isMultipleOptions || false,
                testMethod: param.testMethod || null,
                maleLowValue: param.normalRanges?.find(r => r.gender === 'Male')?.lowValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Male').lowValue) : null,
                maleHighValue: param.normalRanges?.find(r => r.gender === 'Male')?.highValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Male').highValue) : null,
                maleDefaultValue: param.normalRanges?.find(r => r.gender === 'Male')?.defaultValue || null,
                maleActive: param.normalRanges?.find(r => r.gender === 'Male')?.isActive || false,
                femaleLowValue: param.normalRanges?.find(r => r.gender === 'Female')?.lowValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Female').lowValue) : null,
                femaleHighValue: param.normalRanges?.find(r => r.gender === 'Female')?.highValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Female').highValue) : null,
                femaleDefaultValue: param.normalRanges?.find(r => r.gender === 'Female')?.defaultValue || null,
                femaleActive: param.normalRanges?.find(r => r.gender === 'Female')?.isActive || false,
                childLowValue: param.normalRanges?.find(r => r.gender === 'Child')?.lowValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Child').lowValue) : null,
                childHighValue: param.normalRanges?.find(r => r.gender === 'Child')?.highValue ? 
                  parseFloat(param.normalRanges.find(r => r.gender === 'Child').highValue) : null,
                childDefaultValue: param.normalRanges?.find(r => r.gender === 'Child')?.defaultValue || null,
                childActive: param.normalRanges?.find(r => r.gender === 'Child')?.isActive || false,
                ageRanges: processAgeRangesWithGender(param.ageRanges, param.parameterName),
                rangeValues: param.rangeValues && param.rangeValues.length > 0 ? JSON.stringify(param.rangeValues) : null,
                isActive: true
              }
            });

            // Create TestCategory linking to TestParameter
            await prisma.testCategory.create({
              data: {
                testId: parseInt(id),
                testParameterId: testParameter.id,
                categoryId: category.categoryId, // ✅ Use unique category ID
                categoryName: category.name ?? "",
                isCategory: category.isCategory || false,
                testMethod: category.testMethod || null,
                sortOrder: category.sortOrder ? parseInt(category.sortOrder) : null
              }
            });

            console.log(`✅ Created parameter and category link`);
          }
        }
      }
    }

    // Fetch updated test with categories and parameters
    const updatedTest = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          select: { id: true, name: true }
        },
        categories: {
          include: {
            testParameter: true
          },
          orderBy: { categoryName: 'asc' }
        }
      }
    });

    console.log('✅ Test updated successfully with ID:', updatedTest.id);
    console.log('📊 Categories updated:', updatedTest.categories.length);

    res.json({
      success: true,
      message: 'Test updated successfully',
      data: updatedTest
    });
  } catch (error) {
    console.error('❌ Update test error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Test with this name already exists in the department'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update test',
      error: error.message
    });
  }
};

// Get all tests
export const getTests = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await prisma.test.count({
      where: { isDeleted: false }
    });

    const tests = await prisma.test.findMany({
      where: { isDeleted: false },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            group: true
          }
        },
        categories: {
          include: {
            testParameter: {
              select: {
                id: true,
                parameterName: true,
                type: true,
                isMandatory: true
              }
            }
          },
          orderBy: { categoryName: 'asc' }
        },
        charges: {
          where: { organizationId: null }, // Only get DEFAULT charges
          select: {
            id: true,
            b2cCharge: true,
            b2bCharge: true,
            discountPercent: true,
            specialPrice: true,
            effectiveFrom: true,
            effectiveTo: true,
            isActive: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(tests, total, page, limit));
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests'
    });
  }
};

// Delete test (soft delete)
export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if test exists
    const existingTest = await prisma.test.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTest) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Soft delete - mark as deleted
    await prisma.test.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true }
    });

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test'
    });
  }
};

/* ===============================================
 * MASTER DATA OPERATIONS
 * =============================================== */

// Get all doctors
export const getDoctors = async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors'
    });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(id) }
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Get doctor by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor'
    });
  }
};

// Create doctor
export const createDoctor = async (req, res) => {
  try {
    const { name, type, degree, mobile, email, address, sendReportsViaWhatsApp, sendReportsViaMail } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const doctor = await prisma.doctor.create({
      data: {
        name: name.trim(),
        type: type || 'Doctor',
        degree: degree || null,
        mobile: mobile || null,
        email: email || null,
        address: address || null,
        sendReportsViaWhatsApp: sendReportsViaWhatsApp || false,
        sendReportsViaMail: sendReportsViaMail || false,
        isActive: true,
      }
    });
    res.status(201).json({ success: true, message: 'Doctor created successfully', data: doctor });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ success: false, message: 'Failed to create doctor' });
  }
};

// Update doctor
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, degree, mobile, email, address, sendReportsViaWhatsApp, sendReportsViaMail } = req.body;
    const existing = await prisma.doctor.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const doctor = await prisma.doctor.update({
      where: { id: parseInt(id) },
      data: {
        name: name?.trim() || existing.name,
        type: type || existing.type,
        degree: degree !== undefined ? degree : existing.degree,
        mobile: mobile !== undefined ? mobile : existing.mobile,
        email: email !== undefined ? email : existing.email,
        address: address !== undefined ? address : existing.address,
        sendReportsViaWhatsApp: sendReportsViaWhatsApp !== undefined ? sendReportsViaWhatsApp : existing.sendReportsViaWhatsApp,
        sendReportsViaMail: sendReportsViaMail !== undefined ? sendReportsViaMail : existing.sendReportsViaMail,
      }
    });

    // If name changed, update all patient_tests that reference the old name
    const newName = name?.trim();
    if (newName && newName !== existing.name) {
      await prisma.patientTest.updateMany({
        where: { referralDoctor: existing.name },
        data: { referralDoctor: newName },
      });
    }

    res.json({ success: true, message: 'Doctor updated successfully', data: doctor });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update doctor' });
  }
};

// Delete doctor (soft delete)
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.doctor.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Doctor not found' });
    await prisma.doctor.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete doctor' });
  }
};

// Find duplicate doctors (same or similar names)
export const findDuplicateDoctors = async (req, res) => {
  try {
    const { threshold = 0.6 } = req.query;

    // Get all active doctors
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    if (doctors.length < 2) {
      return res.json({
        success: true,
        message: 'Not enough doctors to find duplicates',
        data: []
      });
    }

    // Simple Levenshtein distance calculator
    const levenshteinDistance = (str1, str2) => {
      const len1 = str1.length;
      const len2 = str2.length;
      const d = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

      for (let i = 0; i <= len1; i++) d[0][i] = i;
      for (let j = 0; j <= len2; j++) d[j][0] = j;

      for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
          const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
          d[j][i] = Math.min(
            d[j][i - 1] + 1,
            d[j - 1][i] + 1,
            d[j - 1][i - 1] + cost
          );
        }
      }
      return d[len2][len1];
    };

    // Calculate similarity between two names (0-1 scale)
    const calculateSimilarity = (name1, name2) => {
      const normName1 = name1.toLowerCase();
      const normName2 = name2.toLowerCase();
      const maxLen = Math.max(normName1.length, normName2.length);
      if (maxLen === 0) return 1;
      const distance = levenshteinDistance(normName1, normName2);
      return 1 - (distance / maxLen);
    };

    // Find potential duplicates
    const duplicates = [];
    const parsedThreshold = parseFloat(threshold);

    for (let i = 0; i < doctors.length; i++) {
      for (let j = i + 1; j < doctors.length; j++) {
        const similarity = calculateSimilarity(doctors[i].name, doctors[j].name);
        if (similarity >= parsedThreshold) {
          duplicates.push({
            doctor1: doctors[i],
            doctor2: doctors[j],
            similarity: (similarity * 100).toFixed(1) + '%'
          });
        }
      }
    }

    res.json({
      success: true,
      data: duplicates,
      count: duplicates.length
    });
  } catch (error) {
    console.error('Find duplicate doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find duplicate doctors'
    });
  }
};

// Get merge history for a doctor
export const getDoctorMergeHistory = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(doctorId) }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Get merge history where this doctor was source (merged FROM)
    const mergesFrom = await prisma.doctorMerge.findMany({
      where: { sourceDoctorId: parseInt(doctorId) },
      orderBy: { mergedAt: 'desc' }
    });

    // Get merge history where this doctor was target (merged TO)
    const mergesTo = await prisma.doctorMerge.findMany({
      where: { targetDoctorId: parseInt(doctorId) },
      orderBy: { mergedAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        doctor: {
          id: doctor.id,
          name: doctor.name
        },
        mergedFrom: mergesFrom,
        mergedTo: mergesTo,
        totalMerges: mergesFrom.length + mergesTo.length
      }
    });
  } catch (error) {
    console.error('Get doctor merge history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merge history'
    });
  }
};

// Merge one doctor into another
export const mergeDoctors = async (req, res) => {
  try {
    const { sourceDoctorId, targetDoctorId } = req.body;

    // Validate inputs
    if (!sourceDoctorId || !targetDoctorId) {
      return res.status(400).json({
        success: false,
        message: 'Source and target doctor IDs are required'
      });
    }

    if (sourceDoctorId === targetDoctorId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot merge a doctor with themselves'
      });
    }

    // Get source doctor
    const sourceDoctor = await prisma.doctor.findUnique({
      where: { id: parseInt(sourceDoctorId) }
    });

    if (!sourceDoctor) {
      return res.status(404).json({
        success: false,
        message: 'Source doctor not found'
      });
    }

    // Get target doctor
    const targetDoctor = await prisma.doctor.findUnique({
      where: { id: parseInt(targetDoctorId) }
    });

    if (!targetDoctor) {
      return res.status(404).json({
        success: false,
        message: 'Target doctor not found'
      });
    }

    let recordsUpdated = 0;
    let chargesUpdated = 0;

    try {
      // Step 1: Handle DoctorTestCharge records
      // IMPORTANT: We want to KEEP source doctor's charges and apply them to target doctor
      // Strategy: Delete target's charges first, then update source's to target
      
      const sourceCharges = await prisma.doctorTestCharge.findMany({
        where: { doctorId: parseInt(sourceDoctorId) },
        select: { testId: true, id: true }
      });

      console.log(`Found ${sourceCharges.length} source doctor charges`);

      // Delete conflicting target charges (same testId)
      for (const charge of sourceCharges) {
        await prisma.doctorTestCharge.deleteMany({
          where: {
            testId: charge.testId,
            doctorId: parseInt(targetDoctorId)
          }
        });
      }

      // Update source charges to target doctor (preserving them)
      const chargeUpdateResult = await prisma.doctorTestCharge.updateMany({
        where: { doctorId: parseInt(sourceDoctorId) },
        data: { doctorId: parseInt(targetDoctorId) }
      });
      chargesUpdated = chargeUpdateResult.count;
      console.log(`Transferred ${chargesUpdated} charges to target doctor`);

      // Step 2: Update PatientTest records (by referral doctor name - handle "Dr." prefix)
      // Get all variants of source doctor name (with/without "Dr." prefix)
      const variants = [
        `Dr. ${sourceDoctor.name}`,
        sourceDoctor.name
      ];

      let patientTestsUpdated = 0;
      for (const variant of variants) {
        const patientTestUpdateResult = await prisma.patientTest.updateMany({
          where: { referralDoctor: variant },
          data: { referralDoctor: `Dr. ${targetDoctor.name}` }
        });
        patientTestsUpdated += patientTestUpdateResult.count;
      }
      recordsUpdated = patientTestsUpdated;
      console.log(`Updated ${recordsUpdated} patient test records`);

      // Step 3: Create merge history record
      const mergeHistory = await prisma.doctorMerge.create({
        data: {
          sourceDoctorId: parseInt(sourceDoctorId),
          targetDoctorId: parseInt(targetDoctorId),
          sourceDoctorName: sourceDoctor.name,
          targetDoctorName: targetDoctor.name,
          recordsUpdated: recordsUpdated,
          chargesUpdated: chargesUpdated,
          mergedBy: req.user?.id?.toString() || 'system'
        }
      });

      // Step 4: Deactivate source doctor
      await prisma.doctor.update({
        where: { id: parseInt(sourceDoctorId) },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: `Successfully merged Dr. ${sourceDoctor.name} into Dr. ${targetDoctor.name}. Transferred ${chargesUpdated} charges and updated ${recordsUpdated} patient records.`,
        data: {
          merge: mergeHistory,
          summary: {
            sourceDoctorId,
            targetDoctorId,
            recordsUpdated,
            chargesUpdated,
            mergedAt: mergeHistory.mergedAt
          }
        }
      });
    } catch (error) {
      console.error('Error during merge transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete merge operation: ' + error.message,
        error: error.message
      });
    }
  } catch (error) {
    console.error('Merge doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge doctors'
    });
  }
};

/* ===============================================
 * ORGANIZATION OPERATIONS
 * =============================================== */

// Helper: generate next ORG-XXX id
async function generateOrganizationId() {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const last = await prisma.organization.findFirst({
      where: { id: { startsWith: 'ORG-' } },
      orderBy: { id: 'desc' },
    });
    
    let nextId = 'ORG-AAA';
    if (last) {
      const suffix = last.id.replace('ORG-', '');
      if (suffix.length === 3 && /^[A-Z]{3}$/.test(suffix)) {
        const chars = suffix.split('');
        let i = 2;
        while (i >= 0) {
          if (chars[i] < 'Z') { 
            chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); 
            break; 
          }
          chars[i] = 'A'; 
          i--;
        }
        nextId = 'ORG-' + chars.join('');
      }
    }
    
    // Check if this ID already exists
    const exists = await prisma.organization.findUnique({ where: { id: nextId } });
    if (!exists) {
      return nextId;
    }
    
    attempts++;
  }
  
  // Fallback: generate random ID if we can't find a unique one
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORG-${randomSuffix}`;
}

// Get all organizations
export const getOrganizations = async (req, res) => {
  try {
    const organizations = await prisma.organization.findMany({ 
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
        address: true,
        mobile: true,
        email: true,
        date: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        sendReportsViaWhatsApp: true,
        sendReportsViaMail: true,
        moduleAllocations: {
          select: { id: true, modules: true }
        }
      },
      orderBy: { name: 'asc' } 
    });
    res.json({ success: true, data: organizations });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
  }
};

// Get organization by ID
export const getOrganizationById = async (req, res) => {
  try {
    const organization = await prisma.organization.findUnique({ 
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
        address: true,
        mobile: true,
        email: true,
        date: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        sendReportsViaWhatsApp: true,
        sendReportsViaMail: true,
        moduleAllocations: {
          select: { modules: true }
        }
      }
    });
    if (!organization) return res.status(404).json({ success: false, message: 'Organization not found' });
    
    // Transform response to match frontend expectations
    // moduleAllocations is an array, but organization has only one allocation record (organizationId is unique)
    const response = {
      ...organization,
      moduleAllocation: organization.moduleAllocations?.[0]?.modules || null,
      moduleAllocations: undefined  // Remove the array version
    };
    
    console.log('📦 getOrganizationById FULL response:', {
      orgId: organization.id,
      orgName: organization.name,
      hasModuleAllocations: !!organization.moduleAllocations,
      moduleAllocationsCount: organization.moduleAllocations?.length,
      modulesValue: organization.moduleAllocations?.[0]?.modules ? 'EXISTS' : 'NULL',
      finalModuleAllocation: response.moduleAllocation ? 'EXISTS (length: ' + response.moduleAllocation.length + ')' : 'NULL',
      responseKeys: Object.keys(response),
      sendingToFrontend: {
        success: true,
        data: {
          id: response.id,
          name: response.name,
          moduleAllocation: response.moduleAllocation ? '...JSON STRING...' : null
        }
      }
    });
    
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch organization' });
  }
};

// Create organization
export const createOrganization = async (req, res) => {
  try {
    const { name, code, location, address, mobile, email, date, isActive, adminName, testCharges, moduleAllocation, sendReportsViaWhatsApp, sendReportsViaMail } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const newId = await generateOrganizationId();
    const suffix = newId.replace('ORG-', '');
    const username = newId;           // ORG-AAA
    const plainPassword = `${suffix}@123`;  // AAA@123

    console.log('Creating organization:', { newId, name, email, adminName });

    // Check if organization already exists
    const existingOrg = await prisma.organization.findUnique({ where: { id: newId } });
    if (existingOrg) {
      return res.status(400).json({ success: false, message: 'Organization ID already exists' });
    }

    const organization = await prisma.organization.create({
      data: {
        id: newId,
        name: name.trim(), 
        code: code || null, 
        location: location || null,
        address: address || null, 
        mobile: mobile || null,
        email: email || null, 
        date: date ? new Date(date) : null,
        isActive: isActive !== false,
        sendReportsViaWhatsApp: sendReportsViaWhatsApp || false,
        sendReportsViaMail: sendReportsViaMail || false,
      },
    });

    console.log('Organization created:', organization);

    // Create module allocation for organization if provided
    if (moduleAllocation) {
      const modulesData = typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation);
      await prisma.moduleAllocation.create({
        data: {
          organizationId: newId,
          modules: modulesData
        }
      });
    }

    // Create admin account for this organization
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(plainPassword, 10);
    
    try {
      const admin = await prisma.admin.create({
        data: {
          username,
          email: email || null,
          password: hashed,
          adminName: adminName || name.trim(),
          organizationId: newId,
          role: 'ADMIN',
          isActive: true
        }
      });
      
      console.log('Admin created for organization:', { adminId: admin.id, adminName: admin.adminName, username: admin.username });
    } catch (adminError) {
      console.error('Admin creation error:', adminError);
      // Delete the organization if admin creation fails
      await prisma.organization.delete({ where: { id: newId } });
      throw adminError;
    }

    // Create test charges if provided, otherwise copy DEFAULT charges
    let chargesCreated = 0;
    
    if (Array.isArray(testCharges) && testCharges.length > 0) {
      // Use provided charges
      for (const charge of testCharges) {
        try {
          await prisma.testCharge.create({
            data: {
              testId: parseInt(charge.testId),
              organizationId: newId,
              b2cCharge: parseFloat(charge.b2cCharge) || 0,
              b2bCharge: parseFloat(charge.b2bCharge) || 0,
              discountPercent: charge.discountPercent ? parseFloat(charge.discountPercent) : 0,
              specialPrice: charge.specialPrice ? parseFloat(charge.specialPrice) : null,
              isActive: true
            }
          });
          chargesCreated++;
        } catch (chargeError) {
          console.warn(`Failed to create charge for test ${charge.testId}:`, chargeError.message);
        }
      }
    } else {
      // Copy DEFAULT charges (organizationId = null) to this new organization
      try {
        const defaultCharges = await prisma.testCharge.findMany({
          where: { organizationId: null }
        });
        
        for (const defaultCharge of defaultCharges) {
          try {
            await prisma.testCharge.create({
              data: {
                testId: defaultCharge.testId,
                organizationId: newId,
                b2cCharge: defaultCharge.b2cCharge,
                b2bCharge: defaultCharge.b2bCharge,
                discountPercent: defaultCharge.discountPercent || 0,
                specialPrice: defaultCharge.specialPrice || null,
                isActive: true
              }
            });
            chargesCreated++;
          } catch (chargeError) {
            console.warn(`Failed to copy default charge for test ${defaultCharge.testId}:`, chargeError.message);
          }
        }
        
        if (chargesCreated > 0) {
          console.log(`Copied ${chargesCreated} default charges to organization ${newId}`);
        }
      } catch (error) {
        console.warn('Failed to copy default charges:', error.message);
      }
    }

    // Send credentials email if provided
    if (email) {
      sendOrganizationCredentialsEmail(email, name.trim(), username, plainPassword, false).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: `Organization created successfully${chargesCreated > 0 ? ` with ${chargesCreated} test charges` : ''}`,
      data: organization,
      credentials: { username, password: plainPassword },
      chargesCreated
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({ success: false, message: `Organization ${field} already exists` });
    }
    console.error('Create organization error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create organization' });
  }
};

// Update organization
export const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, location, address, mobile, email, date, isActive, moduleAllocation, sendReportsViaWhatsApp, sendReportsViaMail } = req.body;
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Organization not found' });

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        code: code || null,
        location: location || null,
        address: address || null,
        mobile: mobile || null,
        email: email || null,
        date: date ? new Date(date) : null,
        isActive: isActive !== undefined ? isActive : undefined,
        sendReportsViaWhatsApp: sendReportsViaWhatsApp !== undefined ? sendReportsViaWhatsApp : undefined,
        sendReportsViaMail: sendReportsViaMail !== undefined ? sendReportsViaMail : undefined,
      },
    });

    // Update module allocation for organization if provided
    if (moduleAllocation !== undefined) {
      if (moduleAllocation) {
        await prisma.moduleAllocation.upsert({
          where: { organizationId: id },
          update: { modules: typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation) },
          create: { organizationId: id, modules: typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation) }
        });
      } else {
        await prisma.moduleAllocation.deleteMany({ where: { organizationId: id } });
      }
    }

    // Also update the associated user account
    try {
      const user = await prisma.user.findUnique({ where: { username: id } });
      if (user) {
        await prisma.user.update({
          where: { username: id },
          data: {
            name: name ? name.trim() : undefined,
            center: name ? name.trim() : undefined,
            email: email || null,
            mobile: mobile || null
          },
        });

        // Update user's module allocation if organization's module allocation changed
        if (moduleAllocation !== undefined) {
          if (moduleAllocation) {
            await prisma.moduleAllocation.upsert({
              where: { userId: user.id },
              update: { modules: typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation) },
              create: { userId: user.id, modules: typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation) }
            });
          } else {
            await prisma.moduleAllocation.deleteMany({ where: { userId: user.id } });
          }
        }
      }
    } catch (userError) {
      console.warn('Failed to update user for organization:', userError.message);
    }

    // Send update notification email (non-blocking)
    const emailTo = email || existing.email;
    if (emailTo) {
      sendOrganizationCredentialsEmail(emailTo, name || existing.name, id, null, true)
        .catch(e => console.error('Failed to send organization update email:', e.message));
    }

    res.json({ success: true, message: 'Organization updated successfully', data: organization });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Organization name already exists' });
    console.error('Update organization error:', error);
    res.status(500).json({ success: false, message: 'Failed to update organization' });
  }
};

// Delete organization
export const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Organization not found' });
    await prisma.organization.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete organization' });
  }
};

// Get seed data summary
export const getSeedDataSummary = async (req, res) => {
  try {
    const [
      departmentCount,
      testCount,
      doctorCount,
      organizationCount,
      adminCount,
      sampleDepartments,
      sampleTests,
      sampleDoctors
    ] = await Promise.all([
      prisma.department.count(),
      prisma.test.count({ where: { isDeleted: false } }),
      prisma.doctor.count(),
      prisma.organization.count(),
      prisma.admin.count(),
      prisma.department.findMany({ take: 3, include: { tests: { take: 2 } } }),
      prisma.test.findMany({ take: 5, include: { department: true } }),
      prisma.doctor.findMany({ take: 3 })
    ]);

    const seedStatus = {
      summary: {
        departments: departmentCount,
        tests: testCount,
        doctors: doctorCount,
        organizations: organizationCount,
        admins: adminCount,
        totalRecords: departmentCount + testCount + doctorCount + organizationCount + adminCount
      },
      sampleData: {
        departments: sampleDepartments,
        tests: sampleTests,
        doctors: sampleDoctors
      },
      seedFileLocation: 'backend/scripts/seed.js',
      lastChecked: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Seed data summary retrieved successfully',
      data: seedStatus
    });
  } catch (error) {
    console.error('Get seed data summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seed data summary'
    });
  }
};

/* ===============================================
 * TEST CHARGES OPERATIONS
 * =============================================== */

// Get test charges
// Get test charges - with optional filters by testId or organizationId
export const getTestCharges = async (req, res) => {
  try {
    const { testId, organizationId } = req.params;
    const { orgId } = req.query; // Alternative query param for organization filter
    
    const where = {};
    
    if (testId) {
      where.testId = parseInt(testId);
    }
    
    if (organizationId) {
      where.organizationId = organizationId;
    } else if (orgId) {
      where.organizationId = orgId;
    }
    
    const charges = await prisma.testCharge.findMany({
      where,
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true,
            departmentId: true,
            department: {
              select: {
                name: true
              }
            }
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
      orderBy: [
        { organizationId: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: charges
    });
  } catch (error) {
    console.error('Get test charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test charges'
    });
  }
};

// Get all test charges with test details
export const getAllTestCharges = async (req, res) => {
  try {
    const { organizationId } = req.query;
    
    const where = { isDeleted: false };
    
    const tests = await prisma.test.findMany({
      where,
      include: {
        department: {
          select: {
            name: true
          }
        },
        charges: {
          where: organizationId ? { organizationId } : {},
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                location: true
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: tests
    });
  } catch (error) {
    console.error('Get all test charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test charges'
    });
  }
};

// Get doctor test charges with comparison to defaults
export const getDoctorTestCharges = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: parseInt(doctorId) }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Get all tests with their default and doctor-specific charges
    const tests = await prisma.test.findMany({
      where: { isDeleted: false },
      include: {
        department: {
          select: {
            name: true
          }
        },
        // Get default charges (organizationId = null)
        charges: {
          where: { organizationId: null },
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // Get doctor-specific charges
        doctorCharges: {
          where: { doctorId: parseInt(doctorId) }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    // Format response with discount data
    const formattedTests = tests.map(test => ({
      id: test.id,
      name: test.name,
      shortName: test.testCode,
      group: test.department?.name || '',
      // Default charges from test_charges table
      defaultB2C: test.charges[0]?.b2cCharge || 0,
      defaultB2B: test.charges[0]?.b2bCharge || 0,
      // Doctor charges - discountR (default time) and discountS (customized)
      discountR: test.doctorCharges[0]?.discountR || 0,
      discountS: test.doctorCharges[0]?.discountS || 0,
      // Doctor B2C (for backward compatibility) = Default B2C - discountS
      doctorB2C: Math.max(0, (test.charges[0]?.b2cCharge || 0) - (test.doctorCharges[0]?.discountS || 0)),
      // Is customized - use the isCustomized flag if available, fallback to old logic for backward compatibility
      isCustomized: test.doctorCharges.length > 0 ? (test.doctorCharges[0]?.isCustomized === true) : false
    }));

    res.json({
      success: true,
      data: formattedTests,
      doctor: {
        id: doctor.id,
        name: doctor.name
      }
    });
  } catch (error) {
    console.error('Get doctor test charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor test charges'
    });
  }
};

// Create test charge for organization
export const createTestCharge = async (req, res) => {
  try {
    const {
      testId,
      organizationId,
      b2cCharge,
      b2bCharge,
      discountPercent,
      specialPrice,
      effectiveFrom,
      effectiveTo
    } = req.body;

    // Validate required fields
    if (!testId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and Organization ID are required'
      });
    }

    if (!b2cCharge && !b2bCharge) {
      return res.status(400).json({
        success: false,
        message: 'At least one charge (B2C or B2B) is required'
      });
    }

    // Check if test exists
    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const finalB2C = parseFloat(b2cCharge) || 0;
    const finalB2B = parseFloat(b2bCharge) || 0;
    
    if (finalB2B > finalB2C && finalB2C > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'B2B charge cannot be greater than B2C charge' 
      });
    }

    const charge = await prisma.testCharge.create({
      data: {
        testId: parseInt(testId),
        organizationId,
        b2cCharge: finalB2C,
        b2bCharge: finalB2B,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: true
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Test charge created successfully',
      data: charge
    });
  } catch (error) {
    console.error('Create test charge error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Charge already exists for this test and organization combination'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create test charge'
    });
  }
};

// Update test charge
export const updateTestCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      b2cCharge,
      b2bCharge,
      discountPercent,
      specialPrice,
      effectiveFrom,
      effectiveTo,
      isActive
    } = req.body;

    // Check if charge exists
    const existingCharge = await prisma.testCharge.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCharge) {
      return res.status(404).json({
        success: false,
        message: 'Test charge not found'
      });
    }

    const finalB2C = b2cCharge ? parseFloat(b2cCharge) : existingCharge.b2cCharge;
    const finalB2B = b2bCharge ? parseFloat(b2bCharge) : existingCharge.b2bCharge;
    
    if (finalB2B > finalB2C && finalB2C > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'B2B charge cannot be greater than B2C charge' 
      });
    }

    const charge = await prisma.testCharge.update({
      where: { id: parseInt(id) },
      data: {
        b2cCharge: b2cCharge ? parseFloat(b2cCharge) : undefined,
        b2bCharge: b2bCharge ? parseFloat(b2bCharge) : undefined,
        discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: isActive !== undefined ? isActive : undefined
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Test charge updated successfully',
      data: charge
    });
  } catch (error) {
    console.error('Update test charge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test charge'
    });
  }
};

// Delete test charge
export const deleteTestCharge = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCharge = await prisma.testCharge.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCharge) {
      return res.status(404).json({
        success: false,
        message: 'Test charge not found'
      });
    }

    await prisma.testCharge.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Test charge deleted successfully'
    });
  } catch (error) {
    console.error('Delete test charge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test charge'
    });
  }
};

// Bulk create/update test charges for an organization
export const bulkCreateTestCharges = async (req, res) => {
  try {
    const { organizationId, doctorId, charges } = req.body;

    // organizationId/doctorId is optional - if not provided, these are DEFAULT charges
    if (!Array.isArray(charges) || charges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Charges array is required'
      });
    }

    // If organizationId is provided, verify it exists
    if (organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }
    }

    // If doctorId is provided, verify it exists
    if (doctorId) {
      const doctor = await prisma.doctor.findUnique({
        where: { id: parseInt(doctorId) }
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }
    }

    const results = [];
    const errors = [];
    let created = 0;
    let updated = 0;

    for (const charge of charges) {
      try {
        const { testId, b2cCharge, b2bCharge, discountR, discountS, discountPercent, specialPrice } = charge;

        if (!testId || (!(b2cCharge || b2bCharge) && !(discountR || discountS))) {
          errors.push({ testId, error: 'Test ID and at least one charge required' });
          continue;
        }

        // Check if test exists
        const test = await prisma.test.findUnique({
          where: { id: parseInt(testId) }
        });

        if (!test) {
          errors.push({ testId, error: 'Test not found' });
          continue;
        }

        // Handle doctor charges
        if (doctorId) {
          const existingCharge = await prisma.doctorTestCharge.findFirst({
            where: {
              testId: parseInt(testId),
              doctorId: parseInt(doctorId)
            }
          });

          // Determine if this is customized: if discountS (custom price) differs from discountR (default price)
          const discountRVal = charge.discountR !== undefined ? parseFloat(charge.discountR) : 0;
          const discountSVal = charge.discountS !== undefined ? parseFloat(charge.discountS) : 0;
          const isCustomizedFlag = Math.abs(discountSVal - discountRVal) > 0.01; // Allow small floating point difference

          let result;
          if (existingCharge) {
            // Update existing doctor charge
            result = await prisma.doctorTestCharge.update({
              where: { id: existingCharge.id },
              data: {
                discountR: discountRVal,
                discountS: discountSVal,
                discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
                isCustomized: isCustomizedFlag
              }
            });
            updated++;
          } else {
            // Create new doctor charge
            result = await prisma.doctorTestCharge.create({
              data: {
                testId: parseInt(testId),
                doctorId: parseInt(doctorId),
                discountR: discountRVal,
                discountS: discountSVal,
                discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
                isCustomized: isCustomizedFlag,
                isActive: true
              }
            });
            created++;
          }
          results.push(result);
        } else {
          // Handle organization/default charges
          // For default charges (no organizationId), use null
          const chargeOrgId = organizationId || null;

          // Check if charge already exists
          const existingCharge = await prisma.testCharge.findFirst({
            where: {
              testId: parseInt(testId),
              organizationId: chargeOrgId
            }
          });

          let result;
          if (existingCharge) {
            // Update existing charge
            result = await prisma.testCharge.update({
              where: { id: existingCharge.id },
              data: {
                b2cCharge: parseFloat(b2cCharge) || 0,
                b2bCharge: parseFloat(b2bCharge) || 0,
                discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
                specialPrice: specialPrice ? parseFloat(specialPrice) : null
              }
            });
            updated++;
          } else {
            // Create new charge
            result = await prisma.testCharge.create({
              data: {
                testId: parseInt(testId),
                organizationId: chargeOrgId,
                b2cCharge: parseFloat(b2cCharge) || 0,
                b2bCharge: parseFloat(b2bCharge) || 0,
                discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
                specialPrice: specialPrice ? parseFloat(specialPrice) : null,
                isActive: true
              }
            });
            created++;
          }
          results.push(result);
        }
      } catch (error) {
        errors.push({ testId: charge.testId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} charges successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        created,
        updated,
        total: results.length,
        errors: errors.length > 0 ? errors : null,
        charges: results
      }
    });
  } catch (error) {
    console.error('Bulk create test charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create test charges'
    });
  }
};

/* ===============================================
 * PACKAGE OPERATIONS
 * =============================================== */

// Get all packages
export const getPackages = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await prisma.package.count({
      where: { isActive: true }
    });

    const packages = await prisma.package.findMany({
      where: { isActive: true },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            group: true
          }
        },
        packageTests: {
          include: {
            test: {
              select: {
                id: true,
                name: true,
                testCode: true,
                sampleTypeId: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    // Format packages with test information
    const packagesWithTests = packages.map(pkg => {
      return {
        ...pkg,
        testCount: pkg.packageTests.length,
        tests: pkg.packageTests.map(packageTest => ({
          id: packageTest.test.id,
          name: packageTest.test.name,
          testCode: packageTest.test.testCode,
          sampleTypeId: packageTest.test.sampleTypeId
        }))
      };
    });

    res.json(buildPaginatedResponse(packagesWithTests, total, page, limit));
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages'
    });
  }
};

// Get all packages (including inactive ones for admin)
export const getAllPackages = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await prisma.package.count();

    const packages = await prisma.package.findMany({
      include: {
        department: {
          select: {
            id: true,
            name: true,
            group: true
          }
        },
        packageTests: {
          include: {
            test: {
              select: {
                id: true,
                name: true,
                testCode: true,
                sampleTypeId: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    // Format packages with test information
    const packagesWithTests = packages.map(pkg => {
      return {
        ...pkg,
        testCount: pkg.packageTests.length,
        tests: pkg.packageTests.map(packageTest => ({
          id: packageTest.test.id,
          name: packageTest.test.name,
          testCode: packageTest.test.testCode,
          sampleTypeId: packageTest.test.sampleTypeId
        }))
      };
    });

    res.json(buildPaginatedResponse(packagesWithTests, total, page, limit));
  } catch (error) {
    console.error('Get all packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages'
    });
  }
};

// Get package by ID
export const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const packageData = await prisma.package.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        packageTests: {
          include: {
            test: {
              select: {
                id: true,
                name: true,
                testCode: true,
                sampleTypeId: true
              }
            }
          }
        }
      }
    });

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Format package with test information
    const formattedPackage = {
      ...packageData,
      testCount: packageData.packageTests.length,
      tests: packageData.packageTests.map(packageTest => ({
        id: packageTest.test.id,
        name: packageTest.test.name,
        testCode: packageTest.test.testCode,
        sampleTypeId: packageTest.test.sampleTypeId
      }))
    };

    res.json({
      success: true,
      data: formattedPackage
    });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch package'
    });
  }
};

// Create package
export const createPackage = async (req, res) => {
  try {
    const {
      name,
      code,
      departmentId,
      center,
      b2cCharge,
      b2bCharge,
      isActive,
      testIds
    } = req.body;

    // Validate required fields
    if (!name || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Name and department are required'
      });
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: parseInt(departmentId) }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Create package
    const packageData = await prisma.package.create({
      data: {
        name,
        code,
        departmentId: parseInt(departmentId),
        b2cCharge: b2cCharge ? parseFloat(b2cCharge) : 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    // Add tests to package if testIds provided
    if (testIds && testIds.length > 0) {
      const packageTestsData = testIds.map(testId => ({
        packageId: packageData.id,
        testId: parseInt(testId)
      }));

      await prisma.packageTest.createMany({
        data: packageTestsData,
        skipDuplicates: true
      });
    }

    // Fetch complete package with tests
    const completePackage = await prisma.package.findUnique({
      where: { id: packageData.id },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        packageTests: {
          include: {
            test: {
              select: {
                id: true,
                name: true,
                testCode: true,
                sampleTypeId: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: completePackage
    });
  } catch (error) {
    console.error('Create package error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Package with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create package',
      error: error.message
    });
  }
};

// Update package
export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      departmentId,
      center,
      b2cCharge,
      b2bCharge,
      isActive,
      testIds
    } = req.body;

    // Check if package exists
    const existingPackage = await prisma.package.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Update package basic information
    const packageData = await prisma.package.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        code: code || undefined,
        departmentId: departmentId ? parseInt(departmentId) : undefined,
        b2cCharge: b2cCharge !== undefined ? parseFloat(b2cCharge) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    // If testIds are provided, update package tests
    if (testIds !== undefined) {
      // Delete existing package tests
      await prisma.packageTest.deleteMany({
        where: { packageId: parseInt(id) }
      });

      // Add new tests if provided
      if (testIds.length > 0) {
        const packageTestsData = testIds.map(testId => ({
          packageId: parseInt(id),
          testId: parseInt(testId)
        }));

        await prisma.packageTest.createMany({
          data: packageTestsData,
          skipDuplicates: true
        });
      }
    }

    // Fetch complete updated package with tests
    const completePackage = await prisma.package.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        },
        packageTests: {
          include: {
            test: {
              select: {
                id: true,
                name: true,
                testCode: true,
                sampleTypeId: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Package updated successfully',
      data: completePackage
    });
  } catch (error) {
    console.error('Update package error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Package with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update package'
    });
  }
};

// Delete package (soft delete)
export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package exists
    const existingPackage = await prisma.package.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Soft delete - mark as inactive
    await prisma.package.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete package'
    });
  }
};

// Get package tests
export const getPackageTests = async (req, res) => {
  try {
    const { packageId } = req.params;
    
    const packageTests = await prisma.packageTest.findMany({
      where: { packageId: parseInt(packageId) },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            testCode: true,
            sampleTypeId: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: packageTests
    });
  } catch (error) {
    console.error('Get package tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch package tests'
    });
  }
};

// Add test to package
export const addTestToPackage = async (req, res) => {
  try {
    const { packageId, testId } = req.body;

    // Validate required fields
    if (!packageId || !testId) {
      return res.status(400).json({
        success: false,
        message: 'Package ID and Test ID are required'
      });
    }

    // Check if package exists
    const packageData = await prisma.package.findUnique({
      where: { id: parseInt(packageId) }
    });

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Check if test exists
    const testData = await prisma.test.findUnique({
      where: { id: parseInt(testId) }
    });

    if (!testData) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if test is already in package
    const existingPackageTest = await prisma.packageTest.findUnique({
      where: {
        packageId_testId: {
          packageId: parseInt(packageId),
          testId: parseInt(testId)
        }
      }
    });

    if (existingPackageTest) {
      return res.status(400).json({
        success: false,
        message: 'Test is already added to this package'
      });
    }

    const packageTest = await prisma.packageTest.create({
      data: {
        packageId: parseInt(packageId),
        testId: parseInt(testId)
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            testCode: true,
            sampleTypeId: true
          }
        },
        package: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Test added to package successfully',
      data: packageTest
    });
  } catch (error) {
    console.error('Add test to package error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Test is already added to this package'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add test to package'
    });
  }
};

// Remove test from package
export const removeTestFromPackage = async (req, res) => {
  try {
    const { packageId, testId } = req.params;

    // Check if package test exists
    const existingPackageTest = await prisma.packageTest.findUnique({
      where: {
        packageId_testId: {
          packageId: parseInt(packageId),
          testId: parseInt(testId)
        }
      }
    });

    if (!existingPackageTest) {
      return res.status(404).json({
        success: false,
        message: 'Test not found in this package'
      });
    }

    await prisma.packageTest.delete({
      where: {
        packageId_testId: {
          packageId: parseInt(packageId),
          testId: parseInt(testId)
        }
      }
    });

    res.json({
      success: true,
      message: 'Test removed from package successfully'
    });
  } catch (error) {
    console.error('Remove test from package error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove test from package'
    });
  }
};

/* ===============================================
 * END OF MASTER CONTROLLER
 * =============================================== */
/* ===============================================
 * PARAMETER MASTER OPERATIONS
 * =============================================== */

// Get all parameter masters
export const getParameterMasters = async (req, res) => {
  try {
    const parameters = await prisma.parameterMaster.findMany({
      where: { isActive: true },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { parameterName: 'asc' }
    });

    res.json({
      success: true,
      data: parameters
    });
  } catch (error) {
    console.error('Get parameter masters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parameter masters'
    });
  }
};

// Get parameter master by ID
export const getParameterMasterById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const parameter = await prisma.parameterMaster.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: 'Parameter master not found'
      });
    }

    // Parse JSON fields
    const parameterData = {
      ...parameter,
      ageRanges: parameter.ageRanges ? JSON.parse(parameter.ageRanges) : [],
      rangeValues: parameter.rangeValues ? JSON.parse(parameter.rangeValues) : []
    };

    res.json({
      success: true,
      data: parameterData
    });
  } catch (error) {
    console.error('Get parameter master error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parameter master'
    });
  }
};

// Create parameter master
export const createParameterMaster = async (req, res) => {
  try {
    const {
      parameterName,
      parameterCode,
      machineCode,
      multiplyBy,
      decimal,
      isDescriptive,
      lowPanic,
      highPanic,
      isNABL,
      type,
      isMandatory,
      rangeType,
      units,
      displayRangeText,
      rangeText,
      textContent,
      isMultipleOptions,
      maleLowValue,
      maleHighValue,
      maleDefaultValue,
      maleActive,
      femaleLowValue,
      femaleHighValue,
      femaleDefaultValue,
      femaleActive,
      childLowValue,
      childHighValue,
      childDefaultValue,
      childActive,
      ageRanges,
      rangeValues,
      departmentId,
      categoryType
    } = req.body;

    // Validate required fields
    if (!parameterName) {
      return res.status(400).json({
        success: false,
        message: 'Parameter name is required'
      });
    }

    const parameter = await prisma.parameterMaster.create({
      data: {
        parameterName,
        parameterCode,
        machineCode,
        multiplyBy,
        decimal: decimal || 2,
        isDescriptive: isDescriptive || false,
        lowPanic: lowPanic ? parseFloat(lowPanic) : null,
        highPanic: highPanic ? parseFloat(highPanic) : null,
        isNABL: isNABL || false,
        type: type || 'Numeric',
        isMandatory: isMandatory || false,
        rangeType: rangeType || 'BySex',
        units,
        displayRangeText,
        rangeText,
        textContent,
        isMultipleOptions: isMultipleOptions || false,
        maleLowValue: maleLowValue ? parseFloat(maleLowValue) : null,
        maleHighValue: maleHighValue ? parseFloat(maleHighValue) : null,
        maleDefaultValue,
        maleActive: maleActive !== undefined ? maleActive : true,
        femaleLowValue: femaleLowValue ? parseFloat(femaleLowValue) : null,
        femaleHighValue: femaleHighValue ? parseFloat(femaleHighValue) : null,
        femaleDefaultValue,
        femaleActive: femaleActive || false,
        childLowValue: childLowValue ? parseFloat(childLowValue) : null,
        childHighValue: childHighValue ? parseFloat(childHighValue) : null,
        childDefaultValue,
        childActive: childActive || false,
        ageRanges: processAgeRangesWithGender(ageRanges, parameterName || "Parameter"),
        rangeValues: rangeValues && rangeValues.length > 0 ? JSON.stringify(rangeValues) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        categoryType
      },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Parameter master created successfully',
      data: parameter
    });
  } catch (error) {
    console.error('Create parameter master error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Parameter with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create parameter master'
    });
  }
};

// Update parameter master
export const updateParameterMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if parameter exists
    const existingParameter = await prisma.parameterMaster.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingParameter) {
      return res.status(404).json({
        success: false,
        message: 'Parameter master not found'
      });
    }

    // Process the update data
    const processedData = {
      ...updateData,
      decimal: updateData.decimal ? parseInt(updateData.decimal) : undefined,
      lowPanic: updateData.lowPanic ? parseFloat(updateData.lowPanic) : null,
      highPanic: updateData.highPanic ? parseFloat(updateData.highPanic) : null,
      maleLowValue: updateData.maleLowValue ? parseFloat(updateData.maleLowValue) : null,
      maleHighValue: updateData.maleHighValue ? parseFloat(updateData.maleHighValue) : null,
      femaleLowValue: updateData.femaleLowValue ? parseFloat(updateData.femaleLowValue) : null,
      femaleHighValue: updateData.femaleHighValue ? parseFloat(updateData.femaleHighValue) : null,
      childLowValue: updateData.childLowValue ? parseFloat(updateData.childLowValue) : null,
      childHighValue: updateData.childHighValue ? parseFloat(updateData.childHighValue) : null,
      departmentId: updateData.departmentId ? parseInt(updateData.departmentId) : null,
      ageRanges: updateData.ageRanges && updateData.ageRanges.length > 0 ? JSON.stringify(updateData.ageRanges) : null,
      rangeValues: updateData.rangeValues && updateData.rangeValues.length > 0 ? JSON.stringify(updateData.rangeValues) : null
    };

    const parameter = await prisma.parameterMaster.update({
      where: { id: parseInt(id) },
      data: processedData,
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Parameter master updated successfully',
      data: parameter
    });
  } catch (error) {
    console.error('Update parameter master error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Parameter with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update parameter master'
    });
  }
};

// Delete parameter master (soft delete)
export const deleteParameterMaster = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if parameter exists
    const existingParameter = await prisma.parameterMaster.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingParameter) {
      return res.status(404).json({
        success: false,
        message: 'Parameter master not found'
      });
    }

    // Soft delete - mark as inactive
    await prisma.parameterMaster.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Parameter master deleted successfully'
    });
  } catch (error) {
    console.error('Delete parameter master error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete parameter master'
    });
  }
};

// Search parameters by name from test categories
export const searchParameters = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.json({ success: true, data: [] });
    }

    const parameters = await prisma.testParameter.findMany({
      where: {
        parameterName: { contains: query },
        isActive: true
      },
      orderBy: { parameterName: 'asc' },
      take: 15,
      distinct: ['parameterName']
    });

    const transformedParameters = parameters.map(param => ({
      id: param.id,
      parameterName: param.parameterName,
      machineCode: param.machineCode,
      multiplyBy: param.multiplyBy,
      decimal: param.decimal,
      type: param.type,
      rangeType: param.rangeType,
      units: param.units,
      displayRangeText: param.displayRangeText,
      rangeText: param.rangeText,
      textContent: param.textContent,
      isMultipleOptions: param.isMultipleOptions,
      isDescriptive: param.isDescriptive,
      lowPanic: param.lowPanic,
      highPanic: param.highPanic,
      isNABL: param.isNABL,
      isMandatory: param.isMandatory,
      hasFormula: param.hasFormula,
      formula: param.formula,
      parameterCode: param.parameterCode,
      normalRanges: [
        { gender: 'Male',   ll: param.maleLowValue?.toString() || '',   ul: param.maleHighValue?.toString() || '',   default: param.maleDefaultValue || '',   isActive: param.maleActive ?? true },
        { gender: 'Female', ll: param.femaleLowValue?.toString() || '', ul: param.femaleHighValue?.toString() || '', default: param.femaleDefaultValue || '', isActive: param.femaleActive ?? false },
        { gender: 'Child',  ll: param.childLowValue?.toString() || '',  ul: param.childHighValue?.toString() || '',  default: param.childDefaultValue || '',  isActive: param.childActive ?? false }
      ],
      ageRanges: (() => { try { return param.ageRanges ? JSON.parse(param.ageRanges) : []; } catch { return []; } })(),
      rangeValues: (() => { try { return param.rangeValues ? JSON.parse(param.rangeValues) : []; } catch { return []; } })()
    }));

    res.json({ success: true, data: transformedParameters });
  } catch (error) {
    console.error('Search parameters error:', error);
    res.status(500).json({ success: false, message: 'Failed to search parameters' });
  }
};

/* =
==============================================
 * UNIT OPERATIONS
 * =============================================== */

// Get all units
export const getUnits = async (req, res) => {
  try {
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get total count
    const total = await prisma.unit.count({
      where: { isActive: true }
    });

    // Get paginated units
    const units = await prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(units, total, page, limit));
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units'
    });
  }
};

// Get unit by ID
export const getUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const unit = await prisma.unit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    res.json({
      success: true,
      data: unit
    });
  } catch (error) {
    console.error('Get unit by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unit'
    });
  }
};

// Create new unit
export const createUnit = async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol || !symbol.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Unit symbol is required'
      });
    }

    // Check if unit already exists
    const existingUnit = await prisma.unit.findUnique({
      where: { symbol: symbol.trim() }
    });

    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: 'Unit with this symbol already exists'
      });
    }

    const unit = await prisma.unit.create({
      data: {
        symbol: symbol.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit
    });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create unit'
    });
  }
};

// Update unit
export const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol } = req.body;

    if (!symbol || !symbol.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Unit symbol is required'
      });
    }

    // Check if unit exists
    const existingUnit = await prisma.unit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUnit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Check if another unit with same symbol exists
    const duplicateUnit = await prisma.unit.findFirst({
      where: {
        symbol: symbol.trim(),
        id: { not: parseInt(id) }
      }
    });

    if (duplicateUnit) {
      return res.status(400).json({
        success: false,
        message: 'Another unit with this symbol already exists'
      });
    }

    const unit = await prisma.unit.update({
      where: { id: parseInt(id) },
      data: {
        symbol: symbol.trim()
      }
    });

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: unit
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update unit'
    });
  }
};

// Delete unit (soft delete)
export const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    await prisma.unit.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete unit'
    });
  }
};

// ==================== TEST PARAMETERS ====================

// Create new test parameter
export const createTestParameter = async (req, res) => {
  try {
    const {
      testId,
      parameterName,
      machineCode,
      multiplyBy,
      decimal,
      parameterSortOrder,
      isDescriptive,
      lowPanic,
      highPanic,
      isNABL,
      parameterCode,
      hasFormula,
      formula,
      type,
      isMandatory,
      rangeType,
      unitId,
      displayRangeText,
      rangeText,
      textContent,
      isMultipleOptions,
      normalRanges,
      ageRanges,
      rangeValues
    } = req.body;

    console.log('📥 Creating test parameter:', { parameterName, testId });

    // Validate required fields
    if (!parameterName || !parameterName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Parameter name is required and cannot be empty'
      });
    }

    // Check if test exists (if testId provided)
    if (testId) {
      const test = await prisma.test.findUnique({
        where: { id: parseInt(testId) }
      });

      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }
    }

    const parameter = await prisma.testParameter.create({
      data: {
        testId: testId ? parseInt(testId) : null,
        parameterName,
        machineCode: machineCode || null,
        multiplyBy: multiplyBy || null,
        decimal: decimal || 2,
        parameterSortOrder: parameterSortOrder ? parseInt(parameterSortOrder) : null,
        isDescriptive: isDescriptive || false,
        lowPanic: lowPanic ? parseFloat(lowPanic) : null,
        highPanic: highPanic ? parseFloat(highPanic) : null,
        isNABL: isNABL || false,
        parameterCode: parameterCode || null,
        hasFormula: hasFormula || false,
        formula: formula || null,
        type: type || 'Numeric',
        isMandatory: isMandatory || false,
        rangeType: rangeType || 'BySex',
        unitId: unitId ? parseInt(unitId) : null,
        displayRangeText: displayRangeText || null,
        rangeText: rangeText || null,
        textContent: textContent || null,
        isMultipleOptions: isMultipleOptions || false,
        maleLowValue: normalRanges?.find(r => r.gender === 'Male')?.lowValue ? parseFloat(normalRanges.find(r => r.gender === 'Male').lowValue) : null,
        maleHighValue: normalRanges?.find(r => r.gender === 'Male')?.highValue ? parseFloat(normalRanges.find(r => r.gender === 'Male').highValue) : null,
        maleDefaultValue: normalRanges?.find(r => r.gender === 'Male')?.defaultValue || null,
        maleActive: normalRanges?.find(r => r.gender === 'Male')?.isActive || false,
        femaleLowValue: normalRanges?.find(r => r.gender === 'Female')?.lowValue ? parseFloat(normalRanges.find(r => r.gender === 'Female').lowValue) : null,
        femaleHighValue: normalRanges?.find(r => r.gender === 'Female')?.highValue ? parseFloat(normalRanges.find(r => r.gender === 'Female').highValue) : null,
        femaleDefaultValue: normalRanges?.find(r => r.gender === 'Female')?.defaultValue || null,
        femaleActive: normalRanges?.find(r => r.gender === 'Female')?.isActive || false,
        childLowValue: normalRanges?.find(r => r.gender === 'Child')?.lowValue ? parseFloat(normalRanges.find(r => r.gender === 'Child').lowValue) : null,
        childHighValue: normalRanges?.find(r => r.gender === 'Child')?.highValue ? parseFloat(normalRanges.find(r => r.gender === 'Child').highValue) : null,
        childDefaultValue: normalRanges?.find(r => r.gender === 'Child')?.defaultValue || null,
        childActive: normalRanges?.find(r => r.gender === 'Child')?.isActive || false,
        ageRanges: processAgeRangesWithGender(ageRanges, parameterName || "Parameter"),
        rangeValues: rangeValues && rangeValues.length > 0 ? JSON.stringify(rangeValues) : null,
        isActive: true
      }
    });

    console.log('✅ Test parameter created with ID:', parameter.id);

    res.status(201).json({
      success: true,
      message: 'Test parameter created successfully',
      data: parameter
    });
  } catch (error) {
    console.error('❌ Error creating test parameter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test parameter',
      error: error.message
    });
  }
};

// ==================== TEST CATEGORIES ====================

// Create new test category with parameter
export const createTestCategoryWithParameter = async (req, res) => {
  try {
    const {
      testId,
      categoryName,
      isCategory,
      testMethod,
      sortOrder,
      // Parameter fields
      parameterName,
      machineCode,
      multiplyBy,
      decimal,
      parameterSortOrder,
      isDescriptive,
      lowPanic,
      highPanic,
      isNABL,
      parameterCode,
      hasFormula,
      formula,
      type,
      isMandatory,
      rangeType,
      unitId,
      displayRangeText,
      rangeText,
      textContent,
      isMultipleOptions,
      normalRanges,
      ageRanges,
      rangeValues
    } = req.body;

    console.log('📥 Creating category with parameter:', { categoryName, parameterName, testId });

    // Validate required fields
    if (!testId || !parameterName) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and Parameter Name are required'
      });
    }

    // If isCategory is checked, categoryName is required
    if (isCategory && !categoryName) {
      return res.status(400).json({
        success: false,
        message: 'Category Name is required when "Is Category" is checked'
      });
    }

    // If categoryName is provided but isCategory is not checked, still require it
    if (categoryName && !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category Name cannot be empty'
      });
    }

    // Check if test exists
    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Step 1: Create the parameter
    const parameter = await prisma.testParameter.create({
      data: {
        testId: parseInt(testId),
        parameterName,
        machineCode: machineCode || null,
        multiplyBy: multiplyBy || null,
        decimal: decimal || 2,
        parameterSortOrder: parameterSortOrder ? parseInt(parameterSortOrder) : null,
        isDescriptive: isDescriptive || false,
        lowPanic: lowPanic ? parseFloat(lowPanic) : null,
        highPanic: highPanic ? parseFloat(highPanic) : null,
        isNABL: isNABL || false,
        parameterCode: parameterCode || null,
        hasFormula: hasFormula || false,
        formula: formula || null,
        type: type || 'Numeric',
        isMandatory: isMandatory || false,
        rangeType: rangeType || 'BySex',
        unitId: unitId ? parseInt(unitId) : null,
        displayRangeText: displayRangeText || null,
        rangeText: rangeText || null,
        textContent: textContent || null,
        isMultipleOptions: isMultipleOptions || false,
        maleLowValue: normalRanges?.find(r => r.gender === 'Male')?.lowValue ? parseFloat(normalRanges.find(r => r.gender === 'Male').lowValue) : null,
        maleHighValue: normalRanges?.find(r => r.gender === 'Male')?.highValue ? parseFloat(normalRanges.find(r => r.gender === 'Male').highValue) : null,
        maleDefaultValue: normalRanges?.find(r => r.gender === 'Male')?.defaultValue || null,
        maleActive: normalRanges?.find(r => r.gender === 'Male')?.isActive || false,
        femaleLowValue: normalRanges?.find(r => r.gender === 'Female')?.lowValue ? parseFloat(normalRanges.find(r => r.gender === 'Female').lowValue) : null,
        femaleHighValue: normalRanges?.find(r => r.gender === 'Female')?.highValue ? parseFloat(normalRanges.find(r => r.gender === 'Female').highValue) : null,
        femaleDefaultValue: normalRanges?.find(r => r.gender === 'Female')?.defaultValue || null,
        femaleActive: normalRanges?.find(r => r.gender === 'Female')?.isActive || false,
        childLowValue: normalRanges?.find(r => r.gender === 'Child')?.lowValue ? parseFloat(normalRanges.find(r => r.gender === 'Child').lowValue) : null,
        childHighValue: normalRanges?.find(r => r.gender === 'Child')?.highValue ? parseFloat(normalRanges.find(r => r.gender === 'Child').highValue) : null,
        childDefaultValue: normalRanges?.find(r => r.gender === 'Child')?.defaultValue || null,
        childActive: normalRanges?.find(r => r.gender === 'Child')?.isActive || false,
        ageRanges: processAgeRangesWithGender(ageRanges, parameterName || "Parameter"),
        rangeValues: rangeValues && rangeValues.length > 0 ? JSON.stringify(rangeValues) : null,
        isActive: true
      }
    });

    console.log('✅ Parameter created with ID:', parameter.id);

    // Step 2: Create the category linking to the parameter
    const category = await prisma.testCategory.create({
      data: {
        testId: parseInt(testId),
        testParameterId: parameter.id,
        categoryName: categoryName || 'Default',
        isCategory: isCategory || false,
        testMethod: testMethod || null,
        sortOrder: sortOrder ? parseInt(sortOrder) : null
      },
      include: {
        test: {
          select: { id: true, name: true }
        },
        testParameter: true
      }
    });

    console.log('✅ Category created with ID:', category.id);

    res.status(201).json({
      success: true,
      message: 'Category with parameter created successfully',
      data: {
        category,
        parameter
      }
    });
  } catch (error) {
    console.error('❌ Error creating category with parameter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category with parameter',
      error: error.message
    });
  }
};

// Create new test category
export const createTestCategory = async (req, res) => {
  try {
    const {
      testId,
      testParameterId,
      categoryName,
      isCategory,
      testMethod,
      sortOrder
    } = req.body;

    console.log('📥 Creating test category:', { categoryName, testId, testParameterId });

    // Validate required fields
    if (!testId || !testParameterId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and Parameter ID are required'
      });
    }

    // If isCategory is checked, categoryName is required
    if (isCategory && !categoryName) {
      return res.status(400).json({
        success: false,
        message: 'Category Name is required when "Is Category" is checked'
      });
    }

    // If categoryName is provided but empty, reject it
    if (categoryName && !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category Name cannot be empty'
      });
    }

    // Check if test exists
    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if parameter exists
    const parameter = await prisma.testParameter.findUnique({
      where: { id: parseInt(testParameterId) }
    });

    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: 'Test parameter not found'
      });
    }

    const category = await prisma.testCategory.create({
      data: {
        testId: parseInt(testId),
        testParameterId: parseInt(testParameterId),
        categoryName: categoryName || 'Default',
        isCategory: isCategory || false,
        testMethod: testMethod || null,
        sortOrder: sortOrder ? parseInt(sortOrder) : null
      },
      include: {
        test: {
          select: { id: true, name: true }
        },
        testParameter: {
          select: { id: true, parameterName: true }
        }
      }
    });

    console.log('✅ Test category created with ID:', category.id);

    res.status(201).json({
      success: true,
      message: 'Test category created successfully',
      data: category
    });
  } catch (error) {
    console.error('❌ Error creating test category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test category',
      error: error.message
    });
  }
};

// ==================== TEST TEMPLATES ====================

// Get all templates
export const getTemplates = async (req, res) => {
  try {
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get total count
    const total = await prisma.testTemplate.count();

    // Get paginated templates
    const templates = await prisma.testTemplate.findMany({
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        testCategory: {
          select: {
            id: true,
            categoryName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Parse JSON parameters for each template
    const parsedTemplates = templates.map(template => ({
      ...template,
      parameters: template.parameters ? JSON.parse(template.parameters) : []
    }));

    res.json(buildPaginatedResponse(parsedTemplates, total, page, limit));
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

// Get templates by test ID
export const getTemplatesByTestId = async (req, res) => {
  try {
    const { testId } = req.params;

    // Verify test exists
    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Get all templates for this test
    const templates = await prisma.testTemplate.findMany({
      where: { 
        testId: parseInt(testId),
        isActive: true
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        testCategory: {
          select: {
            id: true,
            categoryName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parse JSON parameters for each template
    const parsedTemplates = templates.map(template => ({
      ...template,
      parameters: template.parameters ? JSON.parse(template.parameters) : []
    }));

    res.json({
      success: true,
      data: parsedTemplates,
      count: parsedTemplates.length
    });
  } catch (error) {
    console.error('Error fetching templates by test ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

// Get template by ID
export const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.testTemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        testCategory: {
          select: {
            id: true,
            categoryName: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...template,
        parameters: template.parameters ? JSON.parse(template.parameters) : []
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
};

// Create new template
export const createTemplate = async (req, res) => {
  try {
    const { testId, templateName, parameters, testCategoryId } = req.body;

    console.log('📥 Creating template:', { testId, templateName, testCategoryId, parametersCount: parameters?.length });

    // Validate required fields
    if (!testId || !templateName) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Test ID and Template Name are required'
      });
    }

    // Check if test exists
    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) }
    });

    if (!test) {
      console.error('❌ Test not found with ID:', testId);
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if testCategoryId is valid (if provided)
    if (testCategoryId) {
      const category = await prisma.testCategory.findUnique({
        where: { id: parseInt(testCategoryId) }
      });

      if (!category) {
        console.error('❌ Test Category not found with ID:', testCategoryId);
        return res.status(404).json({
          success: false,
          message: 'Test Category not found'
        });
      }
    }

    const template = await prisma.testTemplate.create({
      data: {
        testId: parseInt(testId),
        templateName,
        testCategoryId: testCategoryId ? parseInt(testCategoryId) : null,
        parameters: parameters ? JSON.stringify(parameters) : null
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        testCategory: {
          select: {
            id: true,
            categoryName: true
          }
        }
      }
    });

    console.log('✅ Template created successfully with ID:', template.id);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: {
        ...template,
        parameters: template.parameters ? JSON.parse(template.parameters) : []
      }
    });
  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
};

// Update template
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { testId, templateName, parameters, testCategoryId } = req.body;

    console.log('📝 Updating template ID:', id);
    console.log('📥 Update data:', { testId, templateName, testCategoryId, parametersCount: parameters?.length });

    // Check if template exists
    const existingTemplate = await prisma.testTemplate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTemplate) {
      console.error('❌ Template not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // If testId is being updated, check if test exists
    if (testId) {
      const test = await prisma.test.findUnique({
        where: { id: parseInt(testId) }
      });

      if (!test) {
        console.error('❌ Test not found with ID:', testId);
        return res.status(404).json({
          success: false,
          message: 'Test not found'
        });
      }
    }

    // If testCategoryId is being updated, check if category exists
    if (testCategoryId) {
      const category = await prisma.testCategory.findUnique({
        where: { id: parseInt(testCategoryId) }
      });

      if (!category) {
        console.error('❌ Test Category not found with ID:', testCategoryId);
        return res.status(404).json({
          success: false,
          message: 'Test Category not found'
        });
      }
    }

    const updateData = {};
    if (testId !== undefined && testId !== null) updateData.testId = parseInt(testId);
    if (templateName !== undefined && templateName !== null) updateData.templateName = templateName;
    if (testCategoryId !== undefined) updateData.testCategoryId = testCategoryId ? parseInt(testCategoryId) : null;
    if (parameters !== undefined) {
      // Handle parameters - convert array to JSON string
      updateData.parameters = Array.isArray(parameters) ? JSON.stringify(parameters) : parameters;
    }

    console.log('🔄 Updating with data:', updateData);

    const template = await prisma.testTemplate.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        testCategory: {
          select: {
            id: true,
            categoryName: true
          }
        }
      }
    });

    console.log('✅ Template updated successfully');

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: {
        ...template,
        parameters: template.parameters ? JSON.parse(template.parameters) : []
      }
    });
  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
};

// Delete template
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const template = await prisma.testTemplate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    await prisma.testTemplate.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
};

/* ===============================================
 * SPECIMEN TYPE OPERATIONS
 * =============================================== */

// Get all specimen types
export const getSpecimenTypes = async (req, res) => {
  try {
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get total count
    const total = await prisma.sample_type.count();

    // Get paginated specimen types
    const specimenTypes = await prisma.sample_type.findMany({
      orderBy: { Sample_Type: 'asc' },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(specimenTypes, total, page, limit));
  } catch (error) {
    console.error('Get specimen types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specimen types'
    });
  }
};

// Get specimen type by ID
export const getSpecimenTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const specimenType = await prisma.sample_type.findUnique({
      where: { id: parseInt(id) }
    });

    if (!specimenType) {
      return res.status(404).json({
        success: false,
        message: 'Specimen type not found'
      });
    }

    res.json({
      success: true,
      data: specimenType
    });
  } catch (error) {
    console.error('Get specimen type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specimen type'
    });
  }
};

// Create new specimen type
export const createSpecimenType = async (req, res) => {
  try {
    const { Sample_Type, Sample_Color } = req.body;

    // Validate required fields
    if (!Sample_Type || !Sample_Color) {
      return res.status(400).json({
        success: false,
        message: 'Sample Type and Sample Color are required'
      });
    }

    // Check if specimen type already exists
    const existingSpecimenType = await prisma.sample_type.findUnique({
      where: { Sample_Type: Sample_Type.trim() }
    });

    if (existingSpecimenType) {
      return res.status(400).json({
        success: false,
        message: 'Specimen type already exists'
      });
    }

    const specimenType = await prisma.sample_type.create({
      data: {
        Sample_Type: Sample_Type.trim(),
        Sample_Color: Sample_Color.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Specimen type created successfully',
      data: specimenType
    });
  } catch (error) {
    console.error('Create specimen type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create specimen type'
    });
  }
};

// Update specimen type
export const updateSpecimenType = async (req, res) => {
  try {
    const { id } = req.params;
    const { Sample_Type, Sample_Color } = req.body;

    // Validate required fields
    if (!Sample_Type || !Sample_Color) {
      return res.status(400).json({
        success: false,
        message: 'Sample Type and Sample Color are required'
      });
    }

    // Check if specimen type exists
    const existingSpecimenType = await prisma.sample_type.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSpecimenType) {
      return res.status(404).json({
        success: false,
        message: 'Specimen type not found'
      });
    }

    // Check if new name conflicts with existing (excluding current record)
    const conflictingSpecimenType = await prisma.sample_type.findFirst({
      where: {
        Sample_Type: Sample_Type.trim(),
        id: { not: parseInt(id) }
      }
    });

    if (conflictingSpecimenType) {
      return res.status(400).json({
        success: false,
        message: 'Specimen type name already exists'
      });
    }

    const specimenType = await prisma.sample_type.update({
      where: { id: parseInt(id) },
      data: {
        Sample_Type: Sample_Type.trim(),
        Sample_Color: Sample_Color.trim()
      }
    });

    res.json({
      success: true,
      message: 'Specimen type updated successfully',
      data: specimenType
    });
  } catch (error) {
    console.error('Update specimen type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update specimen type'
    });
  }
};

// Delete specimen type
export const deleteSpecimenType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if specimen type exists
    const specimenType = await prisma.sample_type.findUnique({
      where: { id: parseInt(id) }
    });

    if (!specimenType) {
      return res.status(404).json({
        success: false,
        message: 'Specimen type not found'
      });
    }

    await prisma.sample_type.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Specimen type deleted successfully'
    });
  } catch (error) {
    console.error('Delete specimen type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete specimen type'
    });
  }
};

/* ===============================================
 * ROLE OPERATIONS
 * =============================================== */

export const getRoles = async (req, res) => {
  try {
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get total count
    const total = await prisma.role.count({
      where: { isActive: true }
    });

    // Get paginated roles
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(roles, total, page, limit));
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch role' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    // Auto-generate codeName from name (uppercase with underscores)
    const codeName = name.trim().toUpperCase().replace(/\s+/g, '_');

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        codeName: codeName,
        isActive: true
      },
    });
    res.status(201).json({ success: true, message: 'Role created successfully', data: role });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Role name already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create role' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    
    const existing = await prisma.role.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Role not found' });

    const updateData = {};
    if (name) {
      updateData.name = name.trim();
      updateData.codeName = name.trim().toUpperCase().replace(/\s+/g, '_');
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    if (Object.keys(updateData).length === 0) {
      updateData.isDeleted = false; // Ensure we're not deleting
    }

    const role = await prisma.role.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    res.json({ success: true, message: 'Role updated successfully', data: role });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Role name already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.role.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Role not found' });
    await prisma.role.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete role' });
  }
};

/* ===============================================
 * USER OPERATIONS
 * =============================================== */

export const getUsers = async (req, res) => {
  try {
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get total count
    const total = await prisma.user.count({
      where: { isActive: true, NOT: { role: { in: ['Collection Center', 'Franchise', 'Organization'] } } }
    });

    // Get paginated users with module allocation and organization
    const users = await prisma.user.findMany({
      where: { isActive: true, NOT: { role: { in: ['Collection Center', 'Franchise', 'Organization'] } } },
      select: { 
        id: true, 
        organizationId: true,
        name: true, 
        username: true, 
        role: true, 
        mobile: true, 
        gender: true, 
        email: true, 
        address: true, 
        createdAt: true,
        organization: {
          select: { id: true, name: true }
        },
        moduleAllocation: {
          select: { id: true, modules: true }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(users, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { 
        id: true, 
        organizationId: true,
        name: true, 
        username: true, 
        role: true, 
        mobile: true, 
        gender: true, 
        email: true, 
        address: true,
        organization: {
          select: { id: true, name: true }
        },
        moduleAllocation: {
          select: { id: true, modules: true }
        }
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { organizationId, name, role, mobile, gender, email, address, moduleAllocation } = req.body;
    
    console.log('📥 Creating user with data:', { organizationId, name, role, gender, email });
    
    // Auto-generate username from first name
    const username = extractFirstName(name);
    
    // Auto-generate password
    const password = generateRandomPassword(10);
    
    if (!name || !role) {
      return res.status(400).json({ success: false, message: 'Name and Role are required' });
    }

    // Verify organization exists if provided
    if (organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }
    }

    // Verify role exists
    const roleExists = await prisma.role.findUnique({
      where: { name: role }
    });
    if (!roleExists) {
      return res.status(404).json({ success: false, message: `Role "${role}" not found in database` });
    }

    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        organizationId: organizationId || null,
        name, 
        username: username.trim(), 
        role, 
        mobile: mobile || null, 
        gender: gender || null, 
        email: email || null, 
        address: address || null, 
        password: hashed
      },
      select: { id: true, organizationId: true, name: true, username: true, role: true, mobile: true, gender: true, email: true, address: true },
    });

    // Create module allocation if provided
    if (moduleAllocation) {
      await prisma.moduleAllocation.create({
        data: {
          userId: user.id,
          modules: typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation)
        }
      });
    }

    // Send credentials email if email is provided (non-blocking — don't fail user creation if email fails)
    if (email) {
      console.log(`📧 Sending auto-generated credentials to ${email} - Username: ${username}, Password: ${password}`);
      sendUserCredentialsEmail(email, name, username.trim(), password, role).catch(e =>
        console.error('Failed to send staff credentials email:', e.message)
      );
    }

    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    console.error('❌ Create user error:', error);
    console.error('Error details:', { code: error.code, message: error.message, meta: error.meta });
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Username already exists' });
    res.status(500).json({ success: false, message: 'Failed to create user', detail: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, name, role, mobile, gender, email, address, moduleAllocation } = req.body;
    const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    // Verify organization exists if organizationId is provided
    if (organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }
    }

    // Verify role exists if role is provided
    if (role) {
      const roleExists = await prisma.role.findUnique({
        where: { name: role }
      });
      if (!roleExists) {
        return res.status(404).json({ success: false, message: `Role "${role}" not found in database` });
      }
    }

    // Auto-generate new username from updated name
    const newUsername = name ? extractFirstName(name) : existing.username;

    const updateData = { 
      organizationId: organizationId || undefined,
      name: name || undefined,
      username: newUsername?.trim() || undefined,
      role: role || undefined,
      mobile: mobile || null, 
      gender: gender || null, 
      email: email || null, 
      address: address || null
    };

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, organizationId: true, name: true, username: true, role: true, mobile: true, gender: true, email: true, address: true },
    });

    // Update module allocation if provided
    if (moduleAllocation !== undefined) {
      if (moduleAllocation) {
        await prisma.moduleAllocation.upsert({
          where: { userId: parseInt(id) },
          update: { modules: typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation) },
          create: { userId: parseInt(id), modules: typeof moduleAllocation === 'string' ? moduleAllocation : JSON.stringify(moduleAllocation) }
        });
      } else {
        await prisma.moduleAllocation.deleteMany({ where: { userId: parseInt(id) } });
      }
    }

    // Send email notification to user about account update
    if (email) {
      try {
        await sendAccountUpdateEmail(email, name || existing.name, newUsername, role || existing.role);
        console.log(`✅ Account update notification sent to ${email}`);
      } catch (emailError) {
        console.error('⚠️ Failed to send update notification email:', emailError);
        // Don't fail the update if email fails, just log it
      }
    }

    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Username already exists' });
    res.status(500).json({ success: false, message: 'Failed to update user', detail: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};
