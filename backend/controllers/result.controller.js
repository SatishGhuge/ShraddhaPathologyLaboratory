import prisma from '../config/database.js';
import { sendResultNotificationEmail } from '../utils/email.js';
import { sendWhatsAppMessage, buildResultMessage } from '../utils/whatsapp.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { 
  transitionToReceivedOnBarcodePrint, 
  transitionToEnteredOnResultSave,
  getStatusHistory,
  getStatusSummary,
  normalizeStatus,
  WORKFLOW_STAGES,
  STAGE_METADATA
} from '../utils/statusWorkflow.js';

/* ===============================================
 * SHRADDHA PATHOLOGY LABORATORY - RESULT CONTROLLER
 * ===============================================
 * 
 * This controller handles all result operations:
 * - Get patient test results
 * - Update test status
 * - Update test results
 * - Filter and search results
 * 
 * Author: Shraddha Development Team
 * Last Updated: March 2026
 * =============================================== */

// Get all patient tests for results page with pagination
export const getPatientTests = async (req, res) => {
  try {
    const { 
      status, 
      fromDate, 
      toDate, 
      searchQuery,
      department, 
      organization,
      testName 
    } = req.query;

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Build where condition for filtering
    const andConditions = [];

    // Filter by status
    if (status && status !== 'All') {
      andConditions.push({ status });
    }

    // Filter by date range
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) { const f = new Date(fromDate); f.setHours(0,0,0,0); dateFilter.gte = f; }
      if (toDate)   { const t = new Date(toDate);   t.setHours(23,59,59,999); dateFilter.lte = t; }
      andConditions.push({ visitDate: dateFilter });
    }

    // Filter by searchQuery (Patient Name, ID, or Visit ID combined)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      andConditions.push({
        OR: [
          {
            patient: {
              OR: [
                { firstName: { contains: searchQuery } },
                { lastName: { contains: searchQuery } },
                { patientId: { contains: searchQuery } }
              ]
            }
          },
          { visitId: { contains: searchQuery } }
        ]
      });
    }

    // Filter by department
    if (department && department !== '') {
      andConditions.push({ 
        department: { 
          name: { 
            contains: department.toLowerCase()
          } 
        } 
      });
    }

    // Filter by organization - match organization code from the dropdown
    if (organization && organization !== '') {
      andConditions.push({ 
        organization: {
          code: organization
        }
      });
    }

    // Filter by test name
    if (testName && testName !== '') {
      andConditions.push({ 
        test: { 
          name: { 
            contains: testName.toLowerCase()
          } 
        } 
      });
    }

    const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};

    // Get total count for pagination
    const total = await prisma.patientTest.count({
      where: whereCondition
    });

    // Get paginated data
    const patientTests = await prisma.patientTest.findMany({
      where: whereCondition,
      include: {
        patient: {
          select: {
            patientId: true,
            title: true,
            firstName: true,
            lastName: true,
            age: true,
            gender: true,
            mobile: true,
            email: true
          }
        },
        test: {
          include: {
            sample_type: {
              select: {
                id: true,
                Sample_Type: true,
                Sample_Color: true
              }
            },
            categories: {
              include: {
                testParameter: {
                  select: {
                    id: true,
                    parameterName: true,
                    testMethod: true,
                    displayRangeText: true,
                    rangeText: true,
                    type: true,
                    isDescriptive: true,
                    ageRanges: true,
                    rangeType: true,
                    maleLowValue: true,
                    maleHighValue: true,
                    femaleHighValue: true,
                    femaleLowValue: true,
                    maleActive: true,
                    femaleActive: true,
                    childLowValue: true,
                    childHighValue: true,
                    childActive: true
                  }
                }
              }
            }
          }
        },
        testResults: {
          select: {
            id: true,
            testParameterId: true,
            numericValue: true,
            textValue: true,
            selectedOption: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: [
        { visitDate: 'desc' },
        { visitTime: 'desc' }
      ]
    });

    // Group tests by patient and visitId for display
    const groupedResults = {};
    
    patientTests.forEach(patientTest => {
      const key = `${patientTest.patientId}_${patientTest.visitId}`;
      
      if (!groupedResults[key]) {
        groupedResults[key] = {
          patient_name: `${patientTest.patient.title || ''} ${patientTest.patient.firstName || ''} ${patientTest.patient.lastName || ''}`.trim(),
          age: patientTest.patient.age?.toString() || '',
          gender: patientTest.patient.gender || '',
          corporate: patientTest.businessType || 'Walk-in',
          patient_uid: patientTest.patient.patientId,
          visit_id: patientTest.visitId,
          lab_no: patientTest.visitId, // Keep for backward compatibility
          mobile: patientTest.patient.mobile,
          email: patientTest.patient.email,
          balance_amount: patientTest.balanceAmount || 0,
          organizationCode: patientTest.organization?.code || patientTest.organizationId || '', // ✅ Get organization code from relationship
          organization_name: patientTest.organization?.name || '', // ✅ Get organization name from relationship
          patient_history: patientTest.patient_history || '', // ✅ Get patient history from first test in the group
          tests: []
        };
      }
      
      groupedResults[key].tests.push({
        test_id: patientTest.id,
        test_name: patientTest.test.name,
        test_short_name: patientTest.test.shortName || patientTest.test.name,
        test_code: patientTest.test.testCode,
        attach_file: patientTest.test.attachFile,
        image_size: patientTest.test.imageSize,
        attachment_path: patientTest.attachmentPath || null,
        specimen_type: patientTest.test.sample_type?.Sample_Type || patientTest.sample || "N/A",
        ref_by: patientTest.referralDoctor || 'SELF',
        result_status: normalizeStatus(patientTest.status),
        status: patientTest.status,
        barcode_status: patientTest.barcode_status || 'Unprinted',
        isOutsourced: patientTest.isOutsourced || false,
        outsourcedTo: patientTest.outsourcedTo || null,
        approved_date: patientTest.visitDate ? (() => {
          const d = patientTest.visitDate;
          const datePart = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
          const timePart = patientTest.visitTime || d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
          return `${datePart} ${timePart}`;
        })() : '',
        order_date: (() => {
          if (!patientTest.visitDate) return null;
          const d = patientTest.visitDate;
          const datePart = d.toISOString().slice(0, 10); // YYYY-MM-DD
          const timePart = patientTest.visitTime || '00:00';
          return `${datePart}T${timePart}`;
        })(),
        order_time: patientTest.visitTime || null,
        sample_taken: patientTest.sampleTaken ? patientTest.sampleTaken.toISOString() : null,
        sample_received: patientTest.sampleReceived ? patientTest.sampleReceived.toISOString() : null,
        result_date: patientTest.resultDate ? patientTest.resultDate.toISOString() : null,
        remark: patientTest.patient_history || '',
        charge: patientTest.charge,
        department: patientTest.department.name,
        sample_barcode: patientTest.sampleBarcodeNo,
        report_mode: patientTest.reportMode,
        // Count total parameters for this test
        parameter_count: patientTest.test.categories?.length || 0,
        // Add parameter_id for inline editing (only for single parameter tests)
        parameter_id: patientTest.test.categories?.length === 1 ? (patientTest.test.categories?.[0]?.testParameter?.id || null) : null,
        // Add method name for reports (only for single parameter tests)
        method_name: patientTest.test.categories?.length === 1 ? (patientTest.test.categories?.[0]?.testParameter?.testMethod || '') : '',
        // For ref_interval, include full parameter data so frontend can calculate based on patient demographics
        ref_interval_data: patientTest.test.categories?.length === 1 ? (patientTest.test.categories?.[0]?.testParameter || null) : null,
        // For result, get the numeric or text value from the first test result if single parameter
        result: patientTest.test.categories?.length === 1 && patientTest.testResults?.length > 0 
          ? (patientTest.testResults[0]?.numericValue ?? patientTest.testResults[0]?.textValue ?? '-')
          : '-',
        // DEBUG: Log to verify parameter_id is being set
        _debug_parameterInfo: patientTest.test.categories?.length === 1 ? {
          parameterName: patientTest.test.categories?.[0]?.testParameter?.parameterName,
          parameterId: patientTest.test.categories?.[0]?.testParameter?.id,
          categoryCount: patientTest.test.categories?.length
        } : null
      });
    });

    // Convert to array format expected by frontend
    const results = Object.values(groupedResults);

    res.json({
      success: true,
      data: results,
      total: results.length,
      totalTests: patientTests.length
    });

  } catch (error) {
    console.error('Get patient tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient tests'
    });
  }
};

// Get patient test by ID with parameters for result entry (WITH PROPER CATEGORIES)
export const getPatientTestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching patient test with ID:', id);
    
    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(id) },
      include: {
        patient: {
          select: {
            patientId: true,
            title: true,
            firstName: true,
            lastName: true,
            age: true,
            gender: true,
            dob: true,
            email: true,
            mobile: true
          }
        },
        test: {
          select: {
            id: true,
            name: true,
            shortName: true,
            interpretation: true,
            attachFile: true,
            imageSize: true,
            sampleTypeId: true,
            sample_type: {
              select: {
                id: true,
                Sample_Type: true,
                Sample_Color: true
              }
            }
          }
        },
        testResults: {
          include: {
            testParameter: {
              select: {
                id: true,
                parameterName: true
              }
            }
          }
        }
      }
    });

    if (!patientTest) {
      console.log('Patient test not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    console.log('Found patient test:', patientTest.id, 'for patient:', patientTest.patient.firstName);
    console.log('Total testResults in database:', patientTest.testResults?.length || 0);
    console.log('Test Results Details:', JSON.stringify(patientTest.testResults, null, 2));
    
    // Log which parameters exist in testResults
    if (patientTest.testResults && patientTest.testResults.length > 0) {
      console.log('✅ Found test results with values:');
      patientTest.testResults.forEach(tr => {
        console.log(`  - parameterId: ${tr.testParameterId}, numericValue: ${tr.numericValue}, textValue: ${tr.textValue}`);
      });
    } else {
      console.log('⚠️  No test results found - array is empty or null');
    }

    // Get test categories with their parameters - fetch all range-related fields
    const testCategories = await prisma.testCategory.findMany({
      where: { 
        testId: patientTest.test.id 
      },
      select: {
        id: true,
        testId: true,
        testParameterId: true,
        categoryName: true,
        isCategory: true,
        testMethod: true,  // 🔴 IMPORTANT: Fetch testMethod from category
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        categoryId: true,
        testParameter: {
          select: {
            id: true,
            parameterName: true,
            testMethod: true,
            type: true,
            isDescriptive: true,
            isMultipleOptions: true,
            isMandatory: true,
            parameterSortOrder: true,
            textContent: true,
            displayRangeText: true,
            rangeText: true,
            rangeType: true,
            // Age-specific ranges from database
            ageRanges: true,
            rangeValues: true,
            // Gender and age-specific range fields from database
            maleLowValue: true,
            maleHighValue: true,
            maleDefaultValue: true,
            maleActive: true,
            femaleLowValue: true,
            femaleHighValue: true,
            femaleDefaultValue: true,
            femaleActive: true,
            childLowValue: true,
            childHighValue: true,
            childDefaultValue: true,
            childActive: true,
            hasFormula: true,
            formula: true,
            unit: {
              select: {
                symbol: true
              }
            }
          }
        }
      },
      orderBy: {
        categoryName: 'asc'
      }
    });

    console.log(`\nℹ️  Test Categories found: ${testCategories.length}`);
    testCategories.forEach(cat => {
      console.log(`  - CategoryID ${cat.id}: ${cat.categoryName || '(no name)'}`);
      console.log(`    testMethod: "${cat.testMethod}" (from category)`);
      console.log(`    parameter: ${cat.testParameter?.parameterName}`);
      console.log(`    parameter.testMethod: "${cat.testParameter?.testMethod}" (from parameter)`);
      console.log(`    FINAL testMethod: "${cat.testMethod || cat.testParameter?.testMethod || '(none)'}"`);
    });

    // Process parameters from categories
    const allParameters = [];
    const groupedParameters = {};
    let totalExistingResults = 0;

    testCategories.forEach(category => {
      if (category.testParameter) {
        // Check if category has a manually set name (not empty/null)
        const hasManualCategoryName = category.categoryName && 
                                    category.categoryName.trim() !== '';
        
        // Use manual category name if exists, otherwise use a default that won't be displayed
        const categoryName = hasManualCategoryName ? 
                           category.categoryName : 
                           'NO_CATEGORY_HEADER'; // Special flag for no header
        
        // Find existing result for this parameter
        const existingResult = patientTest.testResults.find(r => r.testParameterId === category.testParameter.id);
        if (existingResult) {
          console.log(`  ✅ Found saved result for parameter ${category.testParameter.parameterName}:`, {
            paramId: category.testParameter.id,
            numericValue: existingResult.numericValue,
            textValue: existingResult.textValue,
            selectedOption: existingResult.selectedOption
          });
          totalExistingResults++;
        } else {
          console.log(`  ⭕ NO result found for parameter ${category.testParameter.parameterName} (ID: ${category.testParameter.id})`);
        }
        
        const foundResult = patientTest.testResults.find(r => 
          // Match by category ID if available
          r.testCategoryId === category.id || 
          // Match by exact parameter ID
          r.testParameterId === category.testParameter.id ||
          // Fallback: match by parameter name (in case parameter was updated)
          (r.testParameter && r.testParameter.parameterName === category.testParameter.parameterName)
        );
        
        console.log(`  📌 Parameter: ${category.testParameter.parameterName} (ID: ${category.testParameter.id}, CategoryID: ${category.id})`);
        console.log(`    Looking for result matching: categoryId=${category.id} OR paramId=${category.testParameter.id} OR paramName=${category.testParameter.parameterName}`);
        if (patientTest.testResults.length > 0) {
          console.log(`    Available results:`, patientTest.testResults.map(tr => ({
            paramId: tr.testParameterId,
            categoryId: tr.testCategoryId,
            paramName: tr.testParameter?.parameterName,
            value: tr.numericValue || tr.textValue
          })));
        }
        console.log(`    Result found: ${!!foundResult}`);
        if (foundResult) {
          console.log(`    ✅ MATCHED! Result data:`, {
            testResultId: foundResult.id,
            parameterName: foundResult.testParameter?.parameterName,
            numericValue: foundResult.numericValue,
            textValue: foundResult.textValue
          });
        }

        const parameter = {
          id: category.testParameter.id,
          parameterName: category.testParameter.parameterName,
          units: category.testParameter.unit?.symbol || '',
          type: category.testParameter.type,
          isDescriptive: category.testParameter.isDescriptive,
          isMultipleOptions: category.testParameter.isMultipleOptions,
          isMandatory: category.testParameter.isMandatory,
          categoryName: categoryName,
          categoryId: category.id,
          // Use unique category identifier: if no name, create a unique key from categoryId so categories without names don't collapse together
          categoryUniqueId: hasManualCategoryName ? categoryName : `__NO_NAME_${category.id}__`,
          sortOrder: category.testParameter.parameterSortOrder || 999,
          categorySortOrder: category.sortOrder || 999,
          showCategoryHeader: hasManualCategoryName,
          
          // 🔴 SEPARATE both methods
          categoryTestMethod: category.testMethod || null,  // Method from category
          parameterTestMethod: category.testParameter.testMethod || null,  // Method from parameter
          testMethod: category.testMethod || category.testParameter.testMethod || '', // Fallback (for backward compatibility)
          
          // Log for debugging
          _debug_testMethod: {
            categoryTestMethod: category.testMethod,
            parameterTestMethod: category.testParameter.testMethod,
            finalValue: category.testMethod || category.testParameter.testMethod || ''
          },
          
          // Range type and display text from database
          rangeType: category.testParameter.rangeType,
          displayRangeText: category.testParameter.displayRangeText,
          rangeText: category.testParameter.rangeText,
          
          // Complex age ranges from database
          ageRanges: category.testParameter.ageRanges,
          rangeValues: category.testParameter.rangeValues,
          
          // Gender and age-specific ranges from database
          maleLowValue: category.testParameter.maleLowValue,
          maleHighValue: category.testParameter.maleHighValue,
          maleDefaultValue: category.testParameter.maleDefaultValue,
          maleActive: category.testParameter.maleActive,
          femaleLowValue: category.testParameter.femaleLowValue,
          femaleHighValue: category.testParameter.femaleHighValue,
          femaleDefaultValue: category.testParameter.femaleDefaultValue,
          femaleActive: category.testParameter.femaleActive,
          childLowValue: category.testParameter.childLowValue,
          childHighValue: category.testParameter.childHighValue,
          childDefaultValue: category.testParameter.childDefaultValue,
          childActive: category.testParameter.childActive,
          
          // Text content for text-type parameters
          textContent: category.testParameter.textContent,
          
          // Formula fields
          hasFormula: category.testParameter.hasFormula,
          formula: category.testParameter.formula,
          
          // Get appropriate range based on patient demographics from database
          normalRange: getNormalRange(category.testParameter, patientTest.patient),
          
          // Existing result if any
          existingResult: foundResult
        };

        allParameters.push(parameter);

        // Group by category name
        if (!groupedParameters[categoryName]) {
          groupedParameters[categoryName] = [];
        }
        groupedParameters[categoryName].push(parameter);
      }
    });

    // If no categories found, get direct parameters with all range fields
    if (allParameters.length === 0) {
      const directParameters = await prisma.testParameter.findMany({
        where: { 
          testId: patientTest.test.id 
        },
        select: {
          id: true,
          parameterName: true,
          testMethod: true,
          type: true,
          isDescriptive: true,
          isMultipleOptions: true,
          isMandatory: true,
          parameterSortOrder: true,
          textContent: true,
          displayRangeText: true,
          rangeText: true,
          rangeType: true,
          // Age-specific ranges from database
          ageRanges: true,
          rangeValues: true,
          // Gender and age-specific range fields from database
          maleLowValue: true,
          maleHighValue: true,
          maleDefaultValue: true,
          maleActive: true,
          femaleLowValue: true,
          femaleHighValue: true,
          femaleDefaultValue: true,
          femaleActive: true,
          childLowValue: true,
          childHighValue: true,
          childDefaultValue: true,
          childActive: true,
          hasFormula: true,
          formula: true,
          unit: {
            select: {
              symbol: true
            }
          }
        },
        orderBy: {
          parameterSortOrder: 'asc'
        }
      });

      directParameters.forEach(param => {
        // Find existing result for this parameter
        const existingResult = patientTest.testResults.find(r => r.testParameterId === param.id);
        if (existingResult) {
          console.log(`  ✅ Found saved result for DIRECT parameter ${param.parameterName}:`, {
            paramId: param.id,
            numericValue: existingResult.numericValue,
            textValue: existingResult.textValue,
            selectedOption: existingResult.selectedOption
          });
          totalExistingResults++;
        } else {
          console.log(`  ⭕ NO result found for DIRECT parameter ${param.parameterName} (ID: ${param.id})`);
        }
        
        const parameter = {
          id: param.id,
          parameterName: param.parameterName,
          units: param.unit?.symbol || '',
          type: param.type,
          isDescriptive: param.isDescriptive,
          isMultipleOptions: param.isMultipleOptions,
          isMandatory: param.isMandatory,
          categoryName: 'NO_CATEGORY_HEADER', // No header for direct parameters
          categoryId: null,
          sortOrder: param.parameterSortOrder || 999,
          categorySortOrder: 999, // High value for direct parameters (no category sort)
          showCategoryHeader: false, // Don't show header for direct parameters
          
          // 🔴 For direct parameters: no category method, only parameter method
          categoryTestMethod: null,  // No category for direct parameters
          parameterTestMethod: param.testMethod || null,  // Method from parameter
          testMethod: param.testMethod || '',  // Fallback (for backward compatibility)
          
          // Range type and display text from database
          rangeType: param.rangeType,
          displayRangeText: param.displayRangeText,
          rangeText: param.rangeText,
          
          // Complex age ranges from database
          ageRanges: param.ageRanges,
          rangeValues: param.rangeValues,
          
          // Gender and age-specific ranges from database
          maleLowValue: param.maleLowValue,
          maleHighValue: param.maleHighValue,
          maleDefaultValue: param.maleDefaultValue,
          maleActive: param.maleActive,
          femaleLowValue: param.femaleLowValue,
          femaleHighValue: param.femaleHighValue,
          femaleDefaultValue: param.femaleDefaultValue,
          femaleActive: param.femaleActive,
          childLowValue: param.childLowValue,
          childHighValue: param.childHighValue,
          childDefaultValue: param.childDefaultValue,
          childActive: param.childActive,
          
          // Text content for text-type parameters
          textContent: param.textContent,
          
          // Formula fields
          hasFormula: param.hasFormula,
          formula: param.formula,
          
          // Get appropriate range based on patient demographics from database
          normalRange: getNormalRange(param, patientTest.patient),
          
          // Existing result if any
          existingResult: existingResult
        };

        allParameters.push(parameter);

        // Group by test name
        const categoryName = 'NO_CATEGORY_HEADER';
        if (!groupedParameters[categoryName]) {
          groupedParameters[categoryName] = [];
        }
        groupedParameters[categoryName].push(parameter);
      });
    }

    console.log(`Processed ${allParameters.length} parameters in ${Object.keys(groupedParameters).length} categories`);
    console.log(`📤 RETURNING: ${totalExistingResults} parameters have existing saved results`);

    // 🔧 Fetch outsourcing report data if this is an outsourced test
    let outsourcingReport = null;
    if (patientTest.isOutsourced) {
      outsourcingReport = await prisma.outsourcingReport.findUnique({
        where: { patientTestId: patientTest.id },
        include: {
          outsourcingLab: {
            select: {
              id: true,
              labName: true,
              code: true
            }
          }
        }
      });
      console.log('✅ Fetched outsourcing report:', outsourcingReport ? 'Found' : 'Not found');
      if (outsourcingReport?.extractedData) {
        console.log('📋 Extracted data stored:', outsourcingReport.extractedData);
      }
    }

    res.json({
      success: true,
      data: {
        patientTest,
        parameters: allParameters,
        groupedParameters,
        outsourcingReport,  // Include outsourcing data
        debug: { totalExistingResults, totalParameters: allParameters.length }
      }
    });

  } catch (error) {
    console.error('Get patient test error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient test: ' + error.message
    });
  }
};

// Enhanced helper function to get normal range based on patient demographics from database
function getNormalRange(parameter, patient) {
  if (!parameter || !patient) {
    return parameter?.displayRangeText || parameter?.rangeText || '';
  }

  // For text-type parameters, return textContent only if it has a real value
  if (parameter.type === 'Text' || parameter.isDescriptive) {
    return parameter.textContent || '';
  }

  const patientGender = patient.gender?.toLowerCase();
  const patientAge = patient.age || 0;
  
  // Calculate exact age from DOB if available
  let exactAgeInDays = 0;
  let exactAgeInMonths = 0;
  let exactAgeInYears = patientAge;
  
  if (patient.dob) {
    const birthDate = new Date(patient.dob);
    const currentDate = new Date();
    const ageInMs = currentDate - birthDate;
    exactAgeInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    exactAgeInMonths = Math.floor(exactAgeInDays / 30.44);
    exactAgeInYears = Math.floor(exactAgeInDays / 365.25);
  }

  // Handle complex age ranges from database (for numeric parameters)
  if (parameter.ageRanges) {
    try {
      const ageRanges = JSON.parse(parameter.ageRanges);
      
      // Find matching range based on patient gender and age
      for (const range of ageRanges) {
        if (!range.enabled) continue;
        
        // Check gender match - if range has gender specified, it must match patient gender
        const rangeGender = range.gender?.toLowerCase();
        if (rangeGender && rangeGender !== patientGender) continue;
        
        let ageMatches = false;
        
        // Handle different range types with time units
        if (range.label?.includes('Less Than') && range.value !== null && range.value !== undefined) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          ageMatches = ageToCheck < range.value;
        } else if (range.label?.includes('More Than') && range.value !== null && range.value !== undefined) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          ageMatches = ageToCheck > range.value;
        } else if (range.label?.includes('Between') && range.from !== null && range.to !== null) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          ageMatches = ageToCheck >= range.from && ageToCheck <= range.to;
        } else if (range.label?.includes('Equal To') && range.value !== null && range.value !== undefined) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          ageMatches = ageToCheck === range.value;
        }
        
        // Return range if age and gender conditions match
        if (ageMatches && range.ll !== null && range.ul !== null) {
          return `${range.ll} - ${range.ul}`;
        }
      }
    } catch (error) {
      console.error('Error parsing age ranges:', error);
    }
  }

  // Fallback to simple gender and age-specific ranges from database fields
  if (parameter.rangeType === 'BySex' || parameter.rangeType === 'ByGenderAndAge') {
    // Child ranges (typically < 18 years) - check if child range is active and available
    if (exactAgeInYears < 18 && parameter.childActive && 
        parameter.childLowValue !== null && parameter.childHighValue !== null) {
      return `${parameter.childLowValue} - ${parameter.childHighValue}`;
    }
    
    // Adult ranges based on gender - check if gender-specific range is active and available
    if (exactAgeInYears >= 18) {
      if (patientGender === 'female' && parameter.femaleActive && 
          parameter.femaleLowValue !== null && parameter.femaleHighValue !== null) {
        return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
      }
      
      if (patientGender === 'male' && parameter.maleActive && 
          parameter.maleLowValue !== null && parameter.maleHighValue !== null) {
        return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
      }
    }
  }

  // Final fallback - use male range as default if available
  if (parameter.maleLowValue !== null && parameter.maleHighValue !== null) {
    return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
  }
  
  // Last resort - return display text or empty
  return parameter.displayRangeText || parameter.rangeText || '';
}

// Helper function to get age in specific time unit
function getAgeInUnit(years, months, days, timeUnit) {
  switch (timeUnit) {
    case 'Day(s)':
      return days;
    case 'Month(s)':
      return months;
    case 'Year(s)':
      return years;
    default:
      return years;
  }
}

// Update test status
export const updateTestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    // Map old uppercase statuses to new format for backward compatibility
    const statusMapping = {
      'REGISTERED': 'Registered',
      'RECEIVED': 'Received',
      'PROVISIONAL': 'Entered',
      'AUTHENTICATED': 'Authorized',
      'VALIDATED': 'Validation',
      'VALIDATION': 'Validation',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validation',
      'REJECTED': 'Validation'
    };

    // Convert status to proper format
    let properStatus = status;
    if (status) {
      const upperStatus = status.toUpperCase();
      properStatus = statusMapping[upperStatus] || status;
    }

    // Validate status against allowed stages
    const validStatuses = ['Registered', 'Received', 'Entered', 'Validation', 'Authorized', 'Delivered', 'Rectified'];
    if (properStatus && !validStatuses.includes(properStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const updatedTest = await prisma.patientTest.update({
      where: { id: parseInt(id) },
      data: {
        status: properStatus,
        // Don't update patient_history - keep existing history
        updatedAt: new Date()
      },
      include: {
        patient: true,
        test: true,
        department: true
      }
    });

    res.json({
      success: true,
      message: 'Test status updated successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Update test status error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update test status'
    });
  }
};

// Update test result
export const updateTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { result, status, parameterResults } = req.body;

    console.log('🔵 updateTestResult called');
    console.log('  📋 patientTestId:', id);
    console.log('  📊 result:', result);
    console.log('  📦 parameterResults:', JSON.stringify(parameterResults, null, 2));

    // Map old uppercase statuses to new format for backward compatibility
    const statusMapping = {
      'REGISTERED': 'Registered',
      'RECEIVED': 'Received',
      'PROVISIONAL': 'Entered',
      'AUTHENTICATED': 'Authorized',
      'VALIDATED': 'Validation',
      'VALIDATION': 'Validation',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validation',
      'REJECTED': 'Validation'
    };

    const updateData = {
      result: result || undefined,
      updatedAt: new Date()
    };

    // Convert status to proper format if provided
    if (status) {
      const upperStatus = status.toUpperCase();
      updateData.status = statusMapping[upperStatus] || status;
    }

    // Automatically set resultDate when result is entered
    if (result && result.trim() !== '') {
      updateData.resultDate = new Date();
    }

    // Update PatientTest record
    const updatedTest = await prisma.patientTest.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        patient: true,
        test: true,
        department: true,
        testResults: true
      }
    });

    console.log('  ✅ PatientTest updated');

    // Handle parameterResults if provided (for inline editing of individual test parameter values)
    if (parameterResults && Array.isArray(parameterResults) && parameterResults.length > 0) {
      console.log('  🔄 Processing parameterResults...');
      for (const paramResult of parameterResults) {
        const { parameterId, numericValue, textValue } = paramResult;
        
        console.log(`  📝 Upserting TestResult:
          patientTestId: ${id}
          parameterId: ${parameterId}
          numericValue: ${numericValue}
          textValue: ${textValue}`);
        
        if (!parameterId) {
          console.error(`  ❌ SKIPPED: parameterId is null or undefined!`);
          continue;
        }
        
        try {
          // Upsert TestResult record - create if not exists, update if exists
          const testResult = await prisma.testResult.upsert({
            where: {
              patientTestId_testParameterId: {
                patientTestId: parseInt(id),
                testParameterId: parseInt(parameterId)
              }
            },
            update: {
              numericValue: numericValue || undefined,
              textValue: textValue || undefined,
              verifiedAt: new Date()
            },
            create: {
              patientTestId: parseInt(id),
              testParameterId: parseInt(parameterId),
              numericValue: numericValue || undefined,
              textValue: textValue || undefined,
              enteredAt: new Date(),
              verifiedAt: new Date()
            }
          });

          console.log(`  ✅ TestResult upserted for parameterId=${parameterId}:`, {
            id: testResult.id,
            numericValue: testResult.numericValue,
            textValue: testResult.textValue
          });
        } catch (upsertError) {
          console.error(`  ❌ Upsert error for parameterId=${parameterId}:`, upsertError.message);
          throw upsertError;
        }
      }
    } else {
      console.log('  ⚠️  No parameterResults provided or empty array');
    }

    res.json({
      success: true,
      message: 'Test result updated successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('❌ Update test result error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update test result: ' + error.message
    });
  }
};

// Bulk update test statuses
export const bulkUpdateTestStatus = async (req, res) => {
  try {
    const { testIds, status, remarks } = req.body;

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Test IDs array is required'
      });
    }

    // Map old uppercase statuses to new format for backward compatibility
    const statusMapping = {
      'REGISTERED': 'Registered',
      'RECEIVED': 'Received',
      'PROVISIONAL': 'Entered',
      'AUTHENTICATED': 'Authorized',
      'VALIDATED': 'Validation',
      'VALIDATION': 'Validation',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validation',
      'REJECTED': 'Validation'
    };

    // Convert status to proper format
    let properStatus = status;
    if (status) {
      const upperStatus = status.toUpperCase();
      properStatus = statusMapping[upperStatus] || status;
    }

    // Validate status against allowed stages
    const validStatuses = ['Registered', 'Received', 'Entered', 'Validation', 'Authorized', 'Delivered', 'Rectified'];
    if (properStatus && !validStatuses.includes(properStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const updatedTests = await prisma.patientTest.updateMany({
      where: {
        id: {
          in: testIds.map(id => parseInt(id))
        }
      },
      data: {
        status: properStatus,
        // Don't update patient_history - keep existing history
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `${updatedTests.count} test(s) updated successfully`,
      updatedCount: updatedTests.count
    });

  } catch (error) {
    console.error('Bulk update test status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test statuses'
    });
  }
};

// Get test statistics for dashboard
export const getTestStatistics = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    let whereCondition = {};
    
    // Filter by date range if provided
    if (fromDate || toDate) {
      whereCondition.visitDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        whereCondition.visitDate.gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        whereCondition.visitDate.lte = to;
      }
    }

    // Get counts by status (unique patients only)
    const statusCounts = await prisma.patientTest.groupBy({
      by: ['status'],
      where: whereCondition,
      _count: {
        patientId: true  // Count unique patients instead of tests
      }
    });

    // Get total unique patients
    const totalPatients = await prisma.patientTest.findMany({
      where: whereCondition,
      select: { patientId: true },
      distinct: ['patientId']
    });

    // Map old status names to new ones
    const statusMapping = {
      'REGISTERED': 'Registered',
      'RECEIVED': 'Received',
      'PROVISIONAL': 'Entered',
      'AUTHENTICATED': 'Authorized',
      'VALIDATED': 'Validation',
      'VALIDATION': 'Validation',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validation',
      'REJECTED': 'Validation',
      // Handle already mapped statuses (new format)
      'Registered': 'Registered',
      'Received': 'Received',
      'Entered': 'Entered',
      'Validation': 'Validation',
      'Authorized': 'Authorized',
      'Delivered': 'Delivered',
      'Rectified': 'Rectified'
    };

    // Format response
    const statistics = {
      total: totalPatients.length,
      byStatus: {}
    };

    statusCounts.forEach(item => {
      const newStatus = statusMapping[item.status] || item.status;
      statistics.byStatus[newStatus] = (statistics.byStatus[newStatus] || 0) + item._count.patientId;
    });

    // Ensure all new statuses are represented
    const allStatuses = ['Registered', 'Received', 'Entered', 'Validation', 'Authorized', 'Delivered', 'Rectified'];
    allStatuses.forEach(status => {
      if (!statistics.byStatus[status]) {
        statistics.byStatus[status] = 0;
      }
    });

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Get test statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test statistics'
    });
  }
};

// Save or update test results
export const saveTestResults = async (req, res) => {
  try {
    const { patientTestId } = req.params;
    const { results, enteredBy } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: 'Results array is required'
      });
    }

    // Validate patient test exists
    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) },
      include: { patient: true }
    });

    if (!patientTest) {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    const savedResults = [];

    // Process each result
    for (const result of results) {
      const {
        testParameterId,
        testCategoryId,
        numericValue,
        textValue,
        selectedOption
      } = result;

      // Validate required field
      if (!testParameterId) {
        console.warn('Skipping result - missing testParameterId');
        continue;
      }

      // Get parameter details for validation
      let parameter;
      try {
        parameter = await prisma.testParameter.findUnique({
          where: { id: parseInt(testParameterId) }
        });
      } catch (err) {
        console.warn(`Failed to fetch parameter ${testParameterId}:`, err.message);
        continue;
      }

      if (!parameter) {
        console.warn(`Parameter not found: ${testParameterId}`);
        continue; // Skip invalid parameters
      }

      // Determine if result is out of range
      let isOutOfRange = false;
      let isPanic = false;

      if (numericValue !== null && numericValue !== undefined) {
        const age = patientTest.patient.age || 0;
        const gender = patientTest.patient.gender?.toLowerCase();
        
        let lowValue, highValue;
        
        // Get appropriate range
        if (age < 18 && parameter.childActive && parameter.childLowValue !== null) {
          lowValue = parameter.childLowValue;
          highValue = parameter.childHighValue;
        } else if (gender === 'female' && parameter.femaleActive && parameter.femaleLowValue !== null) {
          lowValue = parameter.femaleLowValue;
          highValue = parameter.femaleHighValue;
        } else if (parameter.maleLowValue !== null) {
          lowValue = parameter.maleLowValue;
          highValue = parameter.maleHighValue;
        }

        // Check if out of range
        if (lowValue !== null && highValue !== null) {
          isOutOfRange = numericValue < lowValue || numericValue > highValue;
        }

        // Check panic values
        if (parameter.lowPanic !== null && numericValue <= parameter.lowPanic) {
          isPanic = true;
        }
        if (parameter.highPanic !== null && numericValue >= parameter.highPanic) {
          isPanic = true;
        }
      }

      // Upsert result
      try {
        const savedResult = await prisma.testResult.upsert({
          where: {
            patientTestId_testParameterId: {
              patientTestId: parseInt(patientTestId),
              testParameterId: parseInt(testParameterId)
            }
          },
          update: {
            numericValue: numericValue !== null ? parseFloat(numericValue) : null,
            textValue: textValue || null,
            selectedOption: selectedOption || null,
            enteredBy: enteredBy,
            enteredAt: new Date(),
            testCategoryId: testCategoryId ? parseInt(testCategoryId) : null
          },
          create: {
            patientTestId: parseInt(patientTestId),
            testParameterId: parseInt(testParameterId),
            testCategoryId: testCategoryId ? parseInt(testCategoryId) : null,
            numericValue: numericValue !== null ? parseFloat(numericValue) : null,
            textValue: textValue || null,
            selectedOption: selectedOption || null,
            enteredBy: enteredBy,
            enteredAt: new Date()
          },
          include: {
            testParameter: {
              include: {
                unit: true
              }
            }
          }
        });

        savedResults.push(savedResult);
      } catch (upsertError) {
        console.error(`Failed to upsert result for parameter ${testParameterId}:`, upsertError.message);
        throw upsertError; // Re-throw to be caught by outer catch
      }
    }

    // Update patient test result date
    await prisma.patientTest.update({
      where: { id: parseInt(patientTestId) },
      data: {
        resultDate: new Date(),
        updatedAt: new Date()
      }
    });

    // Auto-transition status from Received to Entered
    const enteredByUser = enteredBy || 'SYSTEM';
    await transitionToEnteredOnResultSave(parseInt(patientTestId), enteredByUser);

    // Fetch the updated patient test with new status
    const updatedPatientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) },
      include: {
        patient: true,
        test: true,
        department: true
      }
    });

    res.json({
      success: true,
      message: 'Test results saved successfully',
      data: {
        savedResults,
        patientTest: updatedPatientTest
      }
    });

  } catch (error) {
    console.error('Save test results error:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    res.status(500).json({
      success: false,
      message: 'Failed to save test results: ' + (error.message || 'Unknown error'),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update test dates (for calendar functionality)
export const updateTestDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      orderDate, 
      sTakenDate, 
      sReceivedDate, 
      resultDate,
      visitDate,
      visitTime 
    } = req.body;

    const updateData = {};
    
    if (visitDate) {
      updateData.visitDate = new Date(visitDate);
    }
    if (visitTime) {
      updateData.visitTime = visitTime;
    }
    if (sTakenDate) {
      updateData.sampleTaken = new Date(sTakenDate);
    }
    if (sReceivedDate) {
      updateData.sampleReceived = new Date(sReceivedDate);
    }
    if (resultDate) {
      updateData.resultDate = new Date(resultDate);
    }
    
    // Add other date fields as needed
    updateData.updatedAt = new Date();

    const updatedTest = await prisma.patientTest.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        patient: true,
        test: true,
        department: true
      }
    });

    res.json({
      success: true,
      message: 'Test dates updated successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Update test dates error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update test dates'
    });
  }
};

// Send report to patient via Email or WhatsApp
export const sendReport = async (req, res) => {
  try {
    const { testIds, channel } = req.body; // channel: 'email' | 'whatsapp'

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ success: false, message: 'testIds required' });
    }
    if (!['email', 'whatsapp'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'channel must be email or whatsapp' });
    }

    // Fetch all selected patient tests with full data
    const patientTests = await prisma.patientTest.findMany({
      where: { id: { in: testIds.map(Number) } },
      include: {
        patient: true,
        test: {
          select: {
            id: true, name: true, interpretation: true
          }
        },
        testResults: {
          include: { 
            testParameter: { 
              select: { 
                id: true,
                parameterName: true,
                maleLowValue: true,
                maleHighValue: true,
                femaleLowValue: true,
                femaleHighValue: true,
                childLowValue: true,
                childHighValue: true,
                rangeText: true,
                displayRangeText: true,
                unit: {
                  select: {
                    symbol: true
                  }
                }
              } 
            } 
          }
        }
      }
    });

    if (patientTests.length === 0) {
      return res.status(404).json({ success: false, message: 'No tests found' });
    }

    // Group by visitId — tests in same visit = same package = one combined report
    const byVisit = {};
    patientTests.forEach(pt => {
      if (!byVisit[pt.visitId]) byVisit[pt.visitId] = [];
      byVisit[pt.visitId].push(pt);
    });

    const sentTo = { email: [], whatsapp: [] };

    for (const [visitId, tests] of Object.entries(byVisit)) {
      const patient = tests[0].patient;

      // Build combined results array across all tests in this visit
      const allResults = [];
      for (const pt of tests) {
        // Add test name as a header row
        allResults.push({ isHeader: true, testName: pt.test.name });
        pt.testResults.forEach(r => {
          allResults.push({
            parameterName: r.testParameter.parameterName,
            value: r.numericValue !== null ? r.numericValue : (r.textValue || '-'),
            units: r.testParameter.unit?.symbol || '',
            referenceRange: r.testParameter.rangeText || r.testParameter.displayRangeText || ''
          });
        });
      }

      const testNames = tests.map(t => t.test.name).join(', ');

      if (channel === 'email') {
        if (!patient.email) continue;
        await sendResultNotificationEmail(patient, testNames, visitId, allResults);
        sentTo.email.push(patient.email);
      } else {
        if (!patient.mobile) continue;
        const msg = buildResultMessage(patient, testNames, visitId, allResults.filter(r => !r.isHeader));
        await sendWhatsAppMessage(patient.mobile, msg);
        sentTo.whatsapp.push(patient.mobile);
      }
    }

    res.json({
      success: true,
      message: `Report sent via ${channel}`,
      sentTo
    });

  } catch (error) {
    console.error('Send report error:', error);
    res.status(500).json({ success: false, message: 'Failed to send report: ' + error.message });
  }
};

// Upload attachment for a patient test
export const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const filePath = `/uploads/attachments/${req.file.filename}`;

    // Delete old file if exists
    const existing = await prisma.patientTest.findUnique({ where: { id: parseInt(id) }, select: { attachmentPath: true } });
    if (existing?.attachmentPath) {
      const oldPath = `backend${existing.attachmentPath}`;
      try { (await import('fs')).default.unlinkSync(oldPath); } catch (e) {}
    }

    await prisma.patientTest.update({
      where: { id: parseInt(id) },
      data: { attachmentPath: filePath }
    });

    res.json({ success: true, attachmentPath: filePath });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload attachment' });
  }
};

// Delete attachment for a patient test
export const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.patientTest.findUnique({ where: { id: parseInt(id) }, select: { attachmentPath: true } });
    if (existing?.attachmentPath) {
      const filePath = `backend${existing.attachmentPath}`;
      try { (await import('fs')).default.unlinkSync(filePath); } catch (e) {}
    }
    await prisma.patientTest.update({ where: { id: parseInt(id) }, data: { attachmentPath: null } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete attachment' });
  }
};


// Get previous test result for a patient and specific test
export const getPreviousTestResult = async (req, res) => {
  try {
    const { patientId, testId } = req.params;

    // Find the most recent previous test result (before today or before current visit)
    const previousResult = await prisma.patientTest.findFirst({
      where: {
        patientId: String(patientId), // patientId is a String, not Int
        testId: parseInt(testId),
        visitDate: {
          lt: new Date() // Get tests from before today
        }
      },
      include: {
        testResults: {
          include: {
            testParameter: {
              select: {
                id: true,
                parameterName: true,
                unit: {
                  select: {
                    symbol: true
                  }
                }
              }
            }
          }
        },
        test: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        visitDate: 'desc'
      },
      take: 1
    });

    if (!previousResult) {
      return res.json({
        success: true,
        data: null,
        message: 'No previous test result found'
      });
    }

    res.json({
      success: true,
      data: {
        testId: previousResult.id,
        testName: previousResult.test.name,
        visitDate: previousResult.visitDate,
        testResults: previousResult.testResults.map(tr => ({
          parameterId: tr.testParameter.id,
          parameterName: tr.testParameter.parameterName,
          value: tr.numericValue || tr.textValue || tr.selectedOption,
          units: tr.testParameter.unit?.symbol || '',
          isAbnormal: tr.isAbnormal,
          isOutOfRange: tr.isOutOfRange
        }))
      }
    });

  } catch (error) {
    console.error('Get previous test result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch previous test result'
    });
  }
};

// Get all test results history for a patient and specific test
export const getAllTestResults = async (req, res) => {
  try {
    const { patientId, testId } = req.params;
    const { limit = 10 } = req.query;

    // Get all test results for this patient and test, ordered by date (most recent first)
    const allResults = await prisma.patientTest.findMany({
      where: {
        patientId: String(patientId), // patientId is a String, not Int
        testId: parseInt(testId)
      },
      include: {
        testResults: {
          include: {
            testParameter: {
              select: {
                id: true,
                parameterName: true,
                unit: {
                  select: {
                    symbol: true
                  }
                }
              }
            }
          }
        },
        test: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        visitDate: 'desc'
      },
      take: parseInt(limit)
    });

    if (allResults.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No test results found'
      });
    }

    // Format results for display
    const formattedResults = allResults.map(result => ({
      testId: result.id,
      visitDate: result.visitDate,
      status: result.status,
      results: result.testResults.map(tr => ({
        parameterId: tr.testParameter.id,
        parameterName: tr.testParameter.parameterName,
        value: tr.numericValue || tr.textValue || tr.selectedOption,
        units: tr.testParameter.unit?.symbol || '',
        // Reference range fetched from TestParameter
        lowValue: tr.testParameter.maleLowValue,
        highValue: tr.testParameter.maleHighValue,
        rangeText: tr.testParameter.rangeText
      }))
    }));

    res.json({
      success: true,
      data: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error('Get all test results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test result history'
    });
  }
};


// Referral doctor revenue code moved to doctor-revenue.controller.js


// Save test result with template decision logic
// Handles 3 scenarios:
// 1. Using template with NO changes → just save result
// 2. Using template WITH changes → ask user via frontend
// 3. No template / blank → just save result
export const saveTestResultWithTemplate = async (req, res) => {
  try {
    const { patientTestId, result, parameterResults, templateDecision } = req.body;

    console.log('📋 saveTestResultWithTemplate called:', {
      patientTestId,
      templateDecision,
      parametersCount: parameterResults?.length
    });

    // First, save the result using existing updateTestResult logic
    const updateData = {
      result: result || undefined,
      updatedAt: new Date()
    };

    if (result && result.trim() !== '') {
      updateData.resultDate = new Date();
    }

    // Update PatientTest record with result
    const updatedTest = await prisma.patientTest.update({
      where: { id: parseInt(patientTestId) },
      data: updateData,
      include: {
        patient: true,
        test: true,
        testResults: true
      }
    });

    console.log('✅ PatientTest result updated');

    // Handle parameterResults if provided
    if (parameterResults && Array.isArray(parameterResults) && parameterResults.length > 0) {
      for (const paramResult of parameterResults) {
        const { parameterId, numericValue, textValue } = paramResult;
        
        if (!parameterId) {
          console.warn('⚠️ Skipping - no parameterId provided');
          continue;
        }

        // Upsert TestResult record
        await prisma.testResult.upsert({
          where: {
            patientTestId_testParameterId: {
              patientTestId: parseInt(patientTestId),
              testParameterId: parseInt(parameterId)
            }
          },
          update: {
            numericValue: numericValue || undefined,
            textValue: textValue || undefined,
            verifiedAt: new Date()
          },
          create: {
            patientTestId: parseInt(patientTestId),
            testParameterId: parseInt(parameterId),
            numericValue: numericValue || undefined,
            textValue: textValue || undefined,
            enteredAt: new Date(),
            verifiedAt: new Date()
          }
        });

        console.log(`✅ TestResult upserted for parameterId=${parameterId}`);
      }
    }

    // Handle template decision
    if (templateDecision) {
      const { action, templateName, testId } = templateDecision;

      if (action === 'save_as_new_template') {
        // Create new template with the current result values
        const newTemplate = await prisma.testTemplate.create({
          data: {
            testId: parseInt(testId),
            templateName: templateName,
            parameters: JSON.stringify(parameterResults || []),
            isActive: true
          },
          include: {
            test: true
          }
        });

        console.log('✅ New template created:', newTemplate.id, newTemplate.templateName);

        return res.json({
          success: true,
          message: 'Result saved and new template created successfully',
          data: {
            patientTest: updatedTest,
            newTemplate: newTemplate
          }
        });
      }
    }

    // Default: just return saved result
    res.json({
      success: true,
      message: 'Test result saved successfully',
      data: {
        patientTest: updatedTest
      }
    });

  } catch (error) {
    console.error('❌ Error in saveTestResultWithTemplate:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Template with this name already exists for this test'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to save result: ' + error.message
    });
  }
};


// Update patient comments/notes for a test
export const updatePatientComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    console.log(`📝 Updating comments for PatientTest ID: ${id}`);
    console.log(`Comments: ${comments}`);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'PatientTest ID is required'
      });
    }

    // Update the PatientTest record with comments
    const updatedPatientTest = await prisma.patientTest.update({
      where: { id: parseInt(id) },
      data: {
        comments: comments || null
      },
      include: {
        patient: {
          select: {
            patientId: true,
            firstName: true,
            lastName: true
          }
        },
        test: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`✅ Comments updated successfully for test: ${updatedPatientTest.test.name}`);

    res.json({
      success: true,
      message: 'Comments updated successfully',
      data: updatedPatientTest
    });

  } catch (error) {
    console.error('Update comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comments: ' + error.message
    });
  }
};
