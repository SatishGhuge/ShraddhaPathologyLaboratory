import prisma from '../config/database.js';
import { sendUserCredentialsEmail, sendFranchiseCredentialsEmail, sendCenterCredentialsEmail, sendStaffCredentialsEmail } from '../utils/email.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

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
 * SILVERLEAF DIAGNOSTICS - MASTER CONTROLLER
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
 * Author: SilverLeaf Development Team
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
      include: {
        tests: {
          where: { isActive: true }
        },
        packages: {
          where: { isActive: true }
        }
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
      include: {
        tests: {
          where: { isActive: true }
        },
        packages: {
          where: { isActive: true }
        }
      },
      orderBy: { sortOrder: 'asc' },
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
    const { name, code, sortOrder } = req.body;

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
        sortOrder: sortOrder ? parseInt(sortOrder) : null,
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
    const { name, code, sortOrder, isActive } = req.body;

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
        sortOrder: sortOrder ? parseInt(sortOrder) : undefined,
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
            name: true
          }
        },
        categories: {
          include: {
            testParameter: true
          },
          orderBy: { sortOrder: 'asc' }
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
      sampleType,
      testMethod,
      machineName,
      speciality,
      group,
      sortOrder,
      reportHeader,
      costForLab,
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
        sampleType,
        testMethod,
        machineName,
        speciality: speciality || 'Regular',
        group,
        sortOrder: sortOrder ? parseInt(sortOrder) : null,
        reportHeader,
        costForLab: costForLab ? parseFloat(costForLab) : null,
        preparationTime,
        preparationType,
        instructionPreparation,
        instructionPatient,
        interpretationLabel,
        interpretation,
        outsourceLab,
        attachFile: attachFile || 'Yes',
        profileTest: profileTest || 'No',
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
                units: param.units || null,
                displayRangeText: param.displayRangeText || null,
                rangeText: param.rangeText || null,
                textContent: param.textContent || null,
                isMultipleOptions: param.isMultipleOptions || false,
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
          orderBy: { sortOrder: 'asc' }
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
      sampleType,
      testMethod,
      machineName,
      speciality,
      group,
      sortOrder,
      reportHeader,
      costForLab,
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
        departmentId: departmentId ? parseInt(departmentId) : undefined,
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
        linkedTestIds: req.body.linkedTestIds !== undefined ? JSON.stringify(req.body.linkedTestIds) : undefined
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
                units: param.units || null,
                displayRangeText: param.displayRangeText || null,
                rangeText: param.rangeText || null,
                textContent: param.textContent || null,
                isMultipleOptions: param.isMultipleOptions || false,
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
          orderBy: { sortOrder: 'asc' }
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
            name: true
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
          orderBy: { sortOrder: 'asc' }
        },
        charges: {
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
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
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

// Create doctor
export const createDoctor = async (req, res) => {
  try {
    const { name, type, degree, compliment, mobile, email, address, allowBalance } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const doctor = await prisma.doctor.create({
      data: {
        name: name.trim(),
        type: type || 'Doctor',
        degree: degree || null,
        compliment: compliment !== '' && compliment != null ? parseFloat(compliment) : null,
        mobile: mobile || null,
        email: email || null,
        address: address || null,
        allowBalance: allowBalance || false,
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
    const { name, type, degree, compliment, mobile, email, address, allowBalance } = req.body;
    const existing = await prisma.doctor.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const doctor = await prisma.doctor.update({
      where: { id: parseInt(id) },
      data: {
        name: name?.trim() || existing.name,
        type: type || existing.type,
        degree: degree !== undefined ? degree : existing.degree,
        compliment: compliment !== '' && compliment != null ? parseFloat(compliment) : null,
        mobile: mobile !== undefined ? mobile : existing.mobile,
        email: email !== undefined ? email : existing.email,
        address: address !== undefined ? address : existing.address,
        allowBalance: allowBalance !== undefined ? allowBalance : existing.allowBalance,
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

// Get all franchises
export const getFranchises = async (req, res) => {
  try {
    const franchises = await prisma.franchise.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: franchises });
  } catch (error) {
    console.error('Get franchises error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch franchises' });
  }
};

// Get franchise by ID
export const getFranchiseById = async (req, res) => {
  try {
    const franchise = await prisma.franchise.findUnique({ where: { id: req.params.id } });
    if (!franchise) return res.status(404).json({ success: false, message: 'Franchise not found' });
    res.json({ success: true, data: franchise });
  } catch (error) {
    console.error('Get franchise by id error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch franchise' });
  }
};

// Helper: generate next FR-XXX id
async function generateFranchiseId() {
  const last = await prisma.franchise.findFirst({
    where: { id: { startsWith: 'FR-' } },
    orderBy: { id: 'desc' },
  });
  let nextId = 'FR-AAA';
  if (last) {
    const suffix = last.id.replace('FR-', '');
    if (suffix.length === 3 && /^[A-Z]{3}$/.test(suffix)) {
      const chars = suffix.split('');
      let i = 2;
      while (i >= 0) {
        if (chars[i] < 'Z') { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
        chars[i] = 'A'; i--;
      }
      nextId = 'FR-' + chars.join('');
    }
  }
  return nextId;
}

// Create franchise
export const createFranchise = async (req, res) => {
  try {
    const { name, code, location, address, mobile, email, date, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const newId = await generateFranchiseId();
    const suffix = newId.replace('FR-', '');
    const username = newId;           // FR-AAA
    const plainPassword = `${suffix}@123`;  // AAA@123

    const franchise = await prisma.franchise.create({
      data: {
        id: newId,
        name: name.trim(), code: code || null, location: location || null,
        address: address || null, mobile: mobile || null,
        email: email || null, date: date ? new Date(date) : null,
        isActive: isActive !== false,
      },
    });

    // Create user account for this franchise
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(plainPassword, 10);
    await prisma.user.upsert({
      where: { username },
      update: { password: hashed, email: email || null, name: name.trim(), center: name.trim(), role: 'Franchise' },
      create: { username, name: name.trim(), center: name.trim(), role: 'Franchise', password: hashed, email: email || null, mobile: mobile || null, gender: null, address: address || null },
    });

    // Send credentials email if provided
    if (email) {
      sendFranchiseCredentialsEmail(email, name.trim(), username, plainPassword, false).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: 'Franchise created successfully',
      data: franchise,
      credentials: { username, password: plainPassword },
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Franchise name already exists' });
    console.error('Create franchise error:', error);
    res.status(500).json({ success: false, message: 'Failed to create franchise' });
  }
};

// Update franchise
export const updateFranchise = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, location, address, mobile, email, date, isActive } = req.body;
    const existing = await prisma.franchise.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Franchise not found' });

    const franchise = await prisma.franchise.update({
      where: { id },
      data: {
        name: name?.trim(), code: code || null, location: location || null,
        address: address || null, mobile: mobile || null,
        email: email || null, date: date ? new Date(date) : null,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    // Send update notification email
    const emailTo = email || existing.email;
    if (emailTo) {
      const franchiseUser = await prisma.user.findFirst({ where: { username: id } });
      const username = franchiseUser?.username || id;
      sendFranchiseCredentialsEmail(emailTo, name?.trim() || existing.name, username, null, true).catch(console.error);
    }

    res.json({ success: true, message: 'Franchise updated successfully', data: franchise });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Franchise name already exists' });
    console.error('Update franchise error:', error);
    res.status(500).json({ success: false, message: 'Failed to update franchise' });
  }
};

// Delete franchise
export const deleteFranchise = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.franchise.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Franchise not found' });
    await prisma.franchise.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'Franchise deleted successfully' });
  } catch (error) {
    console.error('Delete franchise error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete franchise' });
  }
};

// Get all collection centers
export const getCollectionCenters = async (req, res) => {
  try {
    const centers = await prisma.collectionCenter.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: centers });
  } catch (error) {
    console.error('Get collection centers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch collection centers' });
  }
};

export const getCollectionCenterById = async (req, res) => {
  try {
    const center = await prisma.collectionCenter.findUnique({ where: { id: req.params.id } });
    if (!center) return res.status(404).json({ success: false, message: 'Center not found' });
    res.json({ success: true, data: center });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch center' });
  }
};

export const createCollectionCenter = async (req, res) => {
  try {
    const { name, code, location, address, mobile, email, date } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    // Generate next CT-XXX id — only look at existing CT- prefixed IDs
    const last = await prisma.collectionCenter.findFirst({
      where: { id: { startsWith: 'CT-' } },
      orderBy: { id: 'desc' },
    });
    let nextId = 'CT-AAA';
    if (last) {
      const suffix = last.id.replace('CT-', ''); // e.g. "AAA"
      if (suffix.length === 3 && /^[A-Z]{3}$/.test(suffix)) {
        const chars = suffix.split('');
        let i = 2;
        while (i >= 0) {
          if (chars[i] < 'Z') { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
          chars[i] = 'A'; i--;
        }
        nextId = 'CT-' + chars.join('');
      }
    }

    const center = await prisma.collectionCenter.create({
      data: {
        id: nextId,
        name: name.trim(),
        code: code || null,
        location: location || null,
        address: address || null,
        mobile: mobile || null,
        email: email || null,
        date: date ? new Date(date) : null,
        isActive: true,
      },
    });

    // Auto-generate user credentials: username = CT-AAA, password = AAA@123
    const suffix = nextId.replace('CT-', '');
    const username = nextId;
    const plainPassword = `${suffix}@123`;

    // Create user account for this center
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(plainPassword, 10);
    await prisma.user.upsert({
      where: { username },
      update: { password: hashed, email: email || null, name: name.trim(), center: name.trim(), role: 'Collection Center' },
      create: { username, name: name.trim(), center: name.trim(), role: 'Collection Center', password: hashed, email: email || null, mobile: mobile || null, gender: null, address: address || null },
    });

    // Send credentials email if email provided
    if (email) {
      sendCenterCredentialsEmail(email, name.trim(), username, plainPassword, false).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      data: center,
      credentials: { username, password: plainPassword },
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Center name already exists' });
    console.error('Create center error:', error);
    res.status(500).json({ success: false, message: 'Failed to create center' });
  }
};

export const updateCollectionCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, location, address, mobile, email, date, isActive } = req.body;
    const existing = await prisma.collectionCenter.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Center not found' });
    const center = await prisma.collectionCenter.update({
      where: { id },
      data: {
        name: name?.trim(),
        code: code || null,
        location: location || null,
        address: address || null,
        mobile: mobile || null,
        email: email || null,
        date: date ? new Date(date) : null,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    // Send update notification email if email exists
    const emailTo = email || existing.email;
    const centerName = name?.trim() || existing.name;
    if (emailTo) {
      const centerUser = await prisma.user.findFirst({ where: { center: existing.name, role: 'Collection Center' } });
      const username = centerUser?.username || id;
      sendCenterCredentialsEmail(emailTo, centerName, username, null, true).catch(console.error);
    }

    res.json({ success: true, message: 'Center updated successfully', data: center });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Center name already exists' });
    res.status(500).json({ success: false, message: 'Failed to update center' });
  }
};

export const deleteCollectionCenter = async (req, res) => {
  try {
    const existing = await prisma.collectionCenter.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Center not found' });
    await prisma.collectionCenter.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Center deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete center' });
  }
};

// Get all corporates
export const getCorporates = async (req, res) => {
  try {
    const corporates = await prisma.corporate.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: corporates });
  } catch (error) {
    console.error('Get corporates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch corporates' });
  }
};

// Get corporate by ID
export const getCorporateById = async (req, res) => {
  try {
    const { id } = req.params;
    const corporate = await prisma.corporate.findUnique({ where: { id: parseInt(id) } });
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate not found' });
    res.json({ success: true, data: corporate });
  } catch (error) {
    console.error('Get corporate error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch corporate' });
  }
};

// Create corporate
export const createCorporate = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Corporate name is required' });

    const existing = await prisma.corporate.findUnique({ where: { name: name.trim() } });
    if (existing) return res.status(400).json({ success: false, message: 'Corporate name already exists' });

    const corporate = await prisma.corporate.create({ data: { name: name.trim(), isActive: true } });
    res.status(201).json({ success: true, message: 'Corporate created successfully', data: corporate });
  } catch (error) {
    console.error('Create corporate error:', error);
    res.status(500).json({ success: false, message: 'Failed to create corporate' });
  }
};

// Update corporate
export const updateCorporate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const existing = await prisma.corporate.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Corporate not found' });

    if (name && name.trim() !== existing.name) {
      const dup = await prisma.corporate.findUnique({ where: { name: name.trim() } });
      if (dup) return res.status(400).json({ success: false, message: 'Corporate name already exists' });
    }

    const corporate = await prisma.corporate.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(isActive !== undefined && { isActive }),
      }
    });
    res.json({ success: true, message: 'Corporate updated successfully', data: corporate });
  } catch (error) {
    console.error('Update corporate error:', error);
    res.status(500).json({ success: false, message: 'Failed to update corporate' });
  }
};

// Delete corporate
export const deleteCorporate = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.corporate.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Corporate deleted successfully' });
  } catch (error) {
    console.error('Delete corporate error:', error);
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Corporate not found' });
    res.status(500).json({ success: false, message: 'Failed to delete corporate' });
  }
};

// Get seed data summary
export const getSeedDataSummary = async (req, res) => {
  try {
    const [
      departmentCount,
      testCount,
      doctorCount,
      franchiseCount,
      collectionCenterCount,
      corporateCount,
      adminCount,
      sampleDepartments,
      sampleTests,
      sampleDoctors
    ] = await Promise.all([
      prisma.department.count(),
      prisma.test.count({ where: { isDeleted: false } }),
      prisma.doctor.count(),
      prisma.franchise.count(),
      prisma.collectionCenter.count(),
      prisma.corporate.count(),
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
        franchises: franchiseCount,
        collectionCenters: collectionCenterCount,
        corporates: corporateCount,
        admins: adminCount,
        totalRecords: departmentCount + testCount + doctorCount + franchiseCount + collectionCenterCount + corporateCount + adminCount
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
};/* ==
=============================================
 * TEST CHARGES OPERATIONS
 * =============================================== */

// Get test charges
export const getTestCharges = async (req, res) => {
  try {
    const { testId } = req.params;
    
    const charges = await prisma.testCharge.findMany({
      where: { testId: parseInt(testId) },
      include: {
        test: {
          select: {
            id: true,
            name: true
          }
        },
        franchise: {
          select: {
            id: true,
            name: true
          }
        },
        corporate: {
          select: {
            id: true,
            name: true
          }
        },
        collectionCenter: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
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

// Create test charge
export const createTestCharge = async (req, res) => {
  try {
    const {
      testId,
      b2cCharge,
      b2bCharge,
      franchiseId,
      corporateId,
      collectionCenterId,
      discountPercent,
      specialPrice,
      effectiveFrom,
      effectiveTo
    } = req.body;

    // Validate required fields
    if (!testId || (!b2cCharge && !b2bCharge)) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and at least one charge (B2C or B2B) are required'
      });
    }

    if (b2cCharge && b2bCharge && parseFloat(b2bCharge) > parseFloat(b2cCharge)) {
      return res.status(400).json({ success: false, message: 'B2B charge cannot be greater than B2C charge' });
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

    const charge = await prisma.testCharge.create({
      data: {
        testId: parseInt(testId),
        b2cCharge: parseFloat(b2cCharge) || 0,
        b2bCharge: parseFloat(b2bCharge) || 0,
        franchiseId: franchiseId || null,
        corporateId: corporateId ? parseInt(corporateId) : null,
        collectionCenterId: collectionCenterId || null,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null
      },
      include: {
        test: {
          select: {
            id: true,
            name: true
          }
        },
        franchise: {
          select: {
            id: true,
            name: true
          }
        },
        corporate: {
          select: {
            id: true,
            name: true
          }
        },
        collectionCenter: {
          select: {
            id: true,
            name: true
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
        message: 'Charge configuration already exists for this combination'
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
      franchiseId,
      corporateId,
      collectionCenterId,
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
    if (finalB2B > finalB2C) {
      return res.status(400).json({ success: false, message: 'B2B charge cannot be greater than B2C charge' });
    }

    const charge = await prisma.testCharge.update({
      where: { id: parseInt(id) },
      data: {
        b2cCharge: b2cCharge ? parseFloat(b2cCharge) : undefined,
        b2bCharge: b2bCharge ? parseFloat(b2bCharge) : undefined,
        franchiseId: franchiseId || null,
        corporateId: corporateId ? parseInt(corporateId) : null,
        collectionCenterId: collectionCenterId || null,
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
            name: true
          }
        },
        franchise: {
          select: {
            id: true,
            name: true
          }
        },
        corporate: {
          select: {
            id: true,
            name: true
          }
        },
        collectionCenter: {
          select: {
            id: true,
            name: true
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

// Get all test charges with test details
export const getAllTestCharges = async (req, res) => {
  try {
    // Get all tests with their charges
    const tests = await prisma.test.findMany({
      where: { isDeleted: false },
      include: {
        department: {
          select: {
            name: true
          }
        },
        charges: {
          include: {
            franchise: {
              select: {
                id: true,
                name: true
              }
            },
            corporate: {
              select: {
                id: true,
                name: true
              }
            },
            collectionCenter: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
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

// Bulk update test charges
export const bulkUpdateTestCharges = async (req, res) => {
  try {
    const { charges } = req.body; // Array of charge objects

    if (!charges || !Array.isArray(charges)) {
      return res.status(400).json({
        success: false,
        message: 'Charges array is required'
      });
    }

    let updatedCount = 0;
    let createdCount = 0;

    // Process each charge in a transaction
    await prisma.$transaction(async (prisma) => {
      for (const charge of charges) {
        const { testId, b2cCharge, b2bCharge, franchiseId, corporateId, collectionCenterId, chargeId } = charge;

        if (parseFloat(b2bCharge) > parseFloat(b2cCharge)) {
          throw new Error(`B2B charge cannot be greater than B2C charge for testId: ${testId}`);
        }

        if (chargeId) {
          // Update existing charge
          await prisma.testCharge.update({
            where: { id: parseInt(chargeId) },
            data: {
              b2cCharge: parseFloat(b2cCharge) || 0,
              b2bCharge: parseFloat(b2bCharge) || 0
            }
          });
          updatedCount++;
        } else {
          // Create new charge
          await prisma.testCharge.create({
            data: {
              testId: parseInt(testId),
              b2cCharge: parseFloat(b2cCharge) || 0,
              b2bCharge: parseFloat(b2bCharge) || 0,
              franchiseId: franchiseId || null,
              corporateId: corporateId ? parseInt(corporateId) : null,
              collectionCenterId: collectionCenterId || null
            }
          });
          createdCount++;
        }
      }
    });

    res.json({
      success: true,
      message: `Bulk update completed: ${updatedCount} updated, ${createdCount} created`,
      data: {
        updated: updatedCount,
        created: createdCount
      }
    });
  } catch (error) {
    console.error('Bulk update test charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update test charges'
    });
  }
};/* 
===============================================
 * CORPORATE CHARGES OPERATIONS
 * =============================================== */

// Corporate charges functions
export const getCorporateCharges = async (req, res) => {
  try {
    const { corporateId } = req.params;
    
    const charges = await prisma.corporateCharge.findMany({
      where: { corporateId: parseInt(corporateId) },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            testCode: true,
            department: {
              select: {
                name: true
              }
            }
          }
        },
        corporate: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: charges
    });
  } catch (error) {
    console.error('Get corporate charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch corporate charges'
    });
  }
};

// Get all corporate charges with test details
export const getAllCorporateCharges = async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      where: { isDeleted: false },
      include: {
        department: {
          select: {
            name: true
          }
        },
        corporateCharges: {
          include: {
            corporate: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: tests
    });
  } catch (error) {
    console.error('Get all corporate charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch corporate charges'
    });
  }
};

// Create corporate charge
export const createCorporateCharge = async (req, res) => {
  try {
    const {
      testId,
      corporateId,
      charges,
      b2bCharges,
      discountPercent,
      specialPrice,
      effectiveFrom,
      effectiveTo
    } = req.body;

    if (!testId || !corporateId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and Corporate ID are required'
      });
    }

    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    const corporate = await prisma.corporate.findUnique({
      where: { id: parseInt(corporateId) }
    });

    if (!corporate) {
      return res.status(404).json({
        success: false,
        message: 'Corporate not found'
      });
    }

    const charge = await prisma.corporateCharge.create({
      data: {
        testId: parseInt(testId),
        corporateId: parseInt(corporateId),
        charges: parseFloat(charges) || 0,
        b2bCharges: parseFloat(b2bCharges) || 0,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null
      },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            testCode: true
          }
        },
        corporate: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Corporate charge created successfully',
      data: charge
    });
  } catch (error) {
    console.error('Create corporate charge error:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Corporate charge already exists for this test'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create corporate charge'
    });
  }
};

// Update corporate charge
export const updateCorporateCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      charges,
      b2bCharges,
      discountPercent,
      specialPrice,
      effectiveFrom,
      effectiveTo,
      isActive
    } = req.body;

    const existingCharge = await prisma.corporateCharge.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCharge) {
      return res.status(404).json({
        success: false,
        message: 'Corporate charge not found'
      });
    }

    const charge = await prisma.corporateCharge.update({
      where: { id: parseInt(id) },
      data: {
        charges: charges ? parseFloat(charges) : undefined,
        b2bCharges: b2bCharges ? parseFloat(b2bCharges) : undefined,
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
            testCode: true
          }
        },
        corporate: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Corporate charge updated successfully',
      data: charge
    });
  } catch (error) {
    console.error('Update corporate charge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update corporate charge'
    });
  }
};

// Delete corporate charge
export const deleteCorporateCharge = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCharge = await prisma.corporateCharge.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCharge) {
      return res.status(404).json({
        success: false,
        message: 'Corporate charge not found'
      });
    }

    await prisma.corporateCharge.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Corporate charge deleted successfully'
    });
  } catch (error) {
    console.error('Delete corporate charge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete corporate charge'
    });
  }
};/* =
==============================================
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
                sampleType: true
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
          sampleType: packageTest.test.sampleType
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
                sampleType: true
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
          sampleType: packageTest.test.sampleType
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
                sampleType: true
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
        sampleType: packageTest.test.sampleType
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
        center: center || "All Centers",
        b2cCharge: b2cCharge ? parseFloat(b2cCharge) : 0,
        b2bCharge: b2bCharge ? parseFloat(b2bCharge) : 0,
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
                sampleType: true
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
        center: center || undefined,
        b2cCharge: b2cCharge !== undefined ? parseFloat(b2cCharge) : undefined,
        b2bCharge: b2bCharge !== undefined ? parseFloat(b2bCharge) : undefined,
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
                sampleType: true
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
            sampleType: true,
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
            sampleType: true
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
      units,
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
        units: units || null,
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
      units,
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
        units: units || null,
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
    const { name, codeName, roleLanding, viewFinancialDays, discountPermissible, showB2B } = req.body;
    if (!name || !codeName || !roleLanding) {
      return res.status(400).json({ success: false, message: 'Name, Code Name and Role Landing are required' });
    }
    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        codeName: codeName.trim(),
        roleLanding,
        viewFinancialDays: viewFinancialDays ? parseInt(viewFinancialDays) : 30,
        discountPermissible: discountPermissible || false,
        showB2B: showB2B || false,
      },
    });
    res.status(201).json({ success: true, message: 'Role created successfully', data: role });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Role name or code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create role' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, codeName, roleLanding, viewFinancialDays, discountPermissible, showB2B } = req.body;
    const existing = await prisma.role.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Role not found' });

    const role = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        name: name?.trim(),
        codeName: codeName?.trim(),
        roleLanding,
        viewFinancialDays: viewFinancialDays ? parseInt(viewFinancialDays) : undefined,
        discountPermissible,
        showB2B,
      },
    });
    res.json({ success: true, message: 'Role updated successfully', data: role });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Role name or code already exists' });
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
      where: { isActive: true, NOT: { role: { in: ['Collection Center', 'Franchise'] } } }
    });

    // Get paginated users
    const users = await prisma.user.findMany({
      where: { isActive: true, NOT: { role: { in: ['Collection Center', 'Franchise'] } } },
      select: { id: true, center: true, name: true, username: true, role: true, mobile: true, gender: true, email: true, address: true, createdAt: true },
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
      select: { id: true, center: true, name: true, username: true, role: true, mobile: true, gender: true, email: true, address: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { center, name, username, role, mobile, gender, email, address, password } = req.body;
    if (!center || !name || !username || !role || !password) {
      return res.status(400).json({ success: false, message: 'Center, Name, Username, Role and Password are required' });
    }
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(password, 10);
    const user = await prisma.user.create({
      data: { center, name, username: username.trim(), role, mobile: mobile || null, gender: gender || null, email: email || null, address: address || null, password: hashed },
      select: { id: true, center: true, name: true, username: true, role: true, mobile: true, gender: true, email: true, address: true },
    });

    // Send credentials email if email is provided (non-blocking — don't fail user creation if email fails)
    if (email) {
      sendStaffCredentialsEmail(email, name, username.trim(), password, role).catch(e =>
        console.error('Failed to send staff credentials email:', e.message)
      );
    }

    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Username already exists' });
    res.status(500).json({ success: false, message: 'Failed to create user', detail: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { center, name, username, role, mobile, gender, email, address, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    const updateData = { center, name, username: username?.trim(), role, mobile: mobile || null, gender: gender || null, email: email || null, address: address || null };
    if (password) {
      const bcrypt = await import('bcryptjs');
      updateData.password = await bcrypt.default.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, center: true, name: true, username: true, role: true, mobile: true, gender: true, email: true, address: true },
    });

    // Send updated credentials email (non-blocking)
    const emailTo = email || existing.email;
    if (emailTo && password) {
      sendStaffCredentialsEmail(emailTo, name || existing.name, username?.trim() || existing.username, password, role || existing.role)
        .catch(e => console.error('Failed to send update email:', e.message));
    } else if (emailTo) {
      sendStaffCredentialsEmail(emailTo, name || existing.name, username?.trim() || existing.username, '(unchanged)', role || existing.role)
        .catch(e => console.error('Failed to send update email:', e.message));
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
