import prisma from '../config/database.js';
import { sendResultNotificationEmail } from '../utils/email.js';
import { sendWhatsAppMessage, buildResultMessage } from '../utils/whatsapp.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { formatAgeFromComponents } from '../utils/ageCalculator.js';
import { 
  transitionToReceivedOnBarcodePrint, 
  transitionToEnteredOnResultSave,
  getStatusHistory,
  getStatusSummary,
  normalizeStatus,
  WORKFLOW_STAGES,
  STAGE_METADATA
} from '../utils/statusWorkflow.js';

/**
 * Calculate and update age fields (ageYears, ageMonths, ageDays) for a patient based on DOB
 * This simplifies age-based normal range matching
 */
const calculateAndUpdateAgeFields = async (patientId, dob) => {
  if (!dob) return null;
  
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Update the patient record with calculated age fields (Int fields only)
    await prisma.patient.update({
      where: { patientId },
      data: {
        ageYears: years,
        ageMonths: months,
        ageDays: days
      }
    });
    
    return { years, months, days };
  } catch (error) {
    return null;
  }
};

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

    // 🔴 DEBUG: Log all incoming filters

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

    // Filter by department - use case-insensitive comparison
    if (department && department !== '') {
      // Use contains for case-insensitive matching (MySQL default is case-insensitive)
      andConditions.push({ 
        department: { 
          name: department  // Direct equality - MySQL is case-insensitive by default
        } 
      });
    }

    // Filter by organization - can be single string or array of organization codes
    if (organization && organization !== '') {
      // Convert to array if it's a string
      const orgCodes = Array.isArray(organization) ? organization : [organization];
      
      // Filter out empty values
      const validOrgCodes = orgCodes.filter(code => code && code !== '');
      
      if (validOrgCodes.length > 0) {
        andConditions.push({ 
          organization: {
            code: {
              in: validOrgCodes  // Use 'in' to match any of the codes
            }
          }
        });
      }
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

    // Exclude cancelled tests from all queries - case-insensitive matching
    andConditions.push({
      status: {
        notIn: ['Cancelled', 'CANCELLED', 'cancelled']
      }
    });

    const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};

    // Get total count for pagination
    const total = await prisma.patientTest.count({
      where: whereCondition
    });

    // Get paginated data
    const patientTests = await prisma.patientTest.findMany({
      where: whereCondition,
      include: {
        patient: true,
        test: {
          include: {
            sample_type: true,
            categories: {
              include: {
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
                    maleDisplayText: true,
                    femaleDisplayText: true,
                    defaultDisplayText: true,
                    rangeText: true,
                    rangeType: true,
                    ageRanges: true,
                    rangeValues: true,
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
                    decimal: true,
                    lowPanic: true,
                    highPanic: true,
                    multiplyBy: true,
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
        },
        testResults: true,
        department: true,
        organization: true
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
        // Format age from components (years, months, days)
        const ageYears = patientTest.patient.ageYears || 0;
        const ageMonths = patientTest.patient.ageMonths || 0;
        const ageDays = patientTest.patient.ageDays || 0;
        
        // Use the formatAgeFromComponents helper function
        const formattedAge = formatAgeFromComponents(ageYears, ageMonths, ageDays);

        groupedResults[key] = {
          // Patient basic info
          patient_name: `${patientTest.patient.title || ''} ${patientTest.patient.firstName || ''} ${patientTest.patient.lastName || ''}`.trim(),
          patient_uid: patientTest.patient.patientId,
          
          // Age fields (multiple formats)
          age: formattedAge,
          ageYears: ageYears,
          ageMonths: ageMonths,
          ageDays: ageDays,
          dob: patientTest.patient.dob,
          
          // Demographics
          gender: patientTest.patient.gender || '',
          mobile: patientTest.patient.mobile || '',
          address: patientTest.patient.address || '',
          location: patientTest.patient.location || '',
          
          // Registration & visit details
          registration_date: patientTest.createdAt,
          visit_id: patientTest.visitId,
          lab_no: patientTest.visitId, // Keep for backward compatibility
          corporate: patientTest.businessType || 'Walk-in',
          
          // Financial info
          balance_amount: patientTest.balanceAmount || 0,
          paid_amount: patientTest.paidAmount || 0,
          total_amount: patientTest.totalAmount || 0,
          
          // Organization details
          organizationCode: patientTest.organization?.code || patientTest.organizationId || '',
          organization_name: patientTest.organization?.name || '',
          organization_location: patientTest.organization?.location || '',
          
          // Test report settings
          report_mode: patientTest.reportMode || 'By hand',
          referral_doctor: patientTest.referralDoctor || 'SELF',
          
          // Patient notes
          patient_history: patientTest.patient_history || '',
          
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
        sampleTypeId: patientTest.test.sampleTypeId || 1,  // ✅ ADD SAMPLE TYPE ID FOR BARCODE
        ref_by: patientTest.referralDoctor || 'SELF',
        result_status: normalizeStatus(patientTest.status),
        status: patientTest.status,
        barcode_status: patientTest.barcode_status || 'Unprinted',
        isOutsourced: patientTest.test?.isOutsourced || false,
        outsourcedTo: patientTest.outsourcedTo || null,
        isEmergency: patientTest.isEmergency || false,  // ✅ NEW: Include emergency flag
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
        // ✅ GET UNIT from the parameter object (which now includes unit data)
        unit: patientTest.test.categories?.length === 1 && patientTest.test.categories?.[0]?.testParameter 
          ? (patientTest.test.categories[0].testParameter.unit?.symbol || '') 
          : '',
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

    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(id) },
      include: {
        patient: true,
        test: {
          include: {
            sample_type: true
          }
        },
        testResults: {
          include: {
            testParameter: true
          }
        },
        organization: true,  // ✅ ADD organization include to get org name and code
        usedMachine: true  // ✅ Changed from select to include true to ensure machine is fetched
      }
    });

    if (!patientTest) {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    // ✅ Calculate and update age fields if DOB is available
    if (patientTest.patient.dob) {
      await calculateAndUpdateAgeFields(patientTest.patient.patientId, patientTest.patient.dob);
      // Refresh patient data to get updated age fields
      patientTest.patient = await prisma.patient.findUnique({
        where: { patientId: patientTest.patient.patientId }
      });
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
            descriptiveText: true,  // ✅ ADDED: Fetch descriptive text for display below parameter
            isMultipleOptions: true,
            isMandatory: true,
            parameterSortOrder: true,
            textContent: true,
            displayRangeText: true,
            maleDisplayText: true,
            femaleDisplayText: true,
            defaultDisplayText: true,
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
            decimal: true,
            lowPanic: true,
            highPanic: true,
            multiplyBy: true,
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
          totalExistingResults++;
        }
        
        const foundResult = patientTest.testResults.find(r => 
          // Match by category ID if available
          r.testCategoryId === category.id || 
          // Match by exact parameter ID
          r.testParameterId === category.testParameter.id ||
          // Fallback: match by parameter name (in case parameter was updated)
          (r.testParameter && r.testParameter.parameterName === category.testParameter.parameterName)
        );

        const parameter = {
          id: category.testParameter.id,
          parameterName: category.testParameter.parameterName,
          units: category.testParameter.unit?.symbol || '',
          type: category.testParameter.type,
          isDescriptive: category.testParameter.isDescriptive,
          descriptiveText: category.testParameter.descriptiveText,  // ✅ ADDED: Descriptive text to display below parameter
          isMultipleOptions: category.testParameter.isMultipleOptions,
          isMandatory: category.testParameter.isMandatory,
          categoryName: categoryName,
          categoryId: category.id,
          categoryUniqueId: hasManualCategoryName ? categoryName : `__NO_NAME_${category.id}__`,
          sortOrder: category.testParameter.parameterSortOrder || 999,
          categorySortOrder: category.sortOrder || 999,
          showCategoryHeader: hasManualCategoryName,
          
          // 🔴 SEPARATE both methods
          categoryTestMethod: category.testMethod || null,
          parameterTestMethod: category.testParameter.testMethod || null,
          testMethod: category.testMethod || category.testParameter.testMethod || '',
          
          // Range type and display text from database
          rangeType: category.testParameter.rangeType,
          displayRangeText: category.testParameter.displayRangeText,
          maleDisplayText: category.testParameter.maleDisplayText,
          femaleDisplayText: category.testParameter.femaleDisplayText,
          defaultDisplayText: category.testParameter.defaultDisplayText,
          rangeText: category.testParameter.rangeText,
          
          // ✅ PANIC RANGES - CRITICAL FOR TEXT TYPE HIGHLIGHTING
          lowPanic: category.testParameter.lowPanic,
          highPanic: category.testParameter.highPanic,
          
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
          
          // 🔴 DEBUG: Log textContent
          _debug_textContent: {
            raw: category.testParameter.textContent,
            type: typeof category.testParameter.textContent,
            length: category.testParameter.textContent?.length || 0,
            isEmpty: !category.testParameter.textContent?.trim(),
            paramName: category.testParameter.parameterName
          },
          
          // Formula fields - INCLUDE BOTH
          hasFormula: category.testParameter.hasFormula,
          formula: category.testParameter.formula,
          decimal: category.testParameter.decimal || 2,
          
          // ✅ NEW: Multiply factor for parameter values
          multiplyBy: category.testParameter.multiplyBy,
          
          // Get appropriate range based on patient demographics from database
          normalRange: getNormalRange(category.testParameter, patientTest.patient),
          
          // Existing result if any
          existingResult: foundResult
        };

        allParameters.push(parameter);

        // Group by UNIQUE category identifier (not just category name)
        // This ensures categories without names still get their own group
        const groupKey = parameter.categoryUniqueId || parameter.categoryName || 'NO_CATEGORY_HEADER';
        if (!groupedParameters[groupKey]) {
          groupedParameters[groupKey] = [];
        }
        groupedParameters[groupKey].push(parameter);
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
          descriptiveText: true,  // ✅ ADDED: Fetch descriptive text for display below parameter
          isMultipleOptions: true,
          isMandatory: true,
          parameterSortOrder: true,
          textContent: true,
          displayRangeText: true,
          maleDisplayText: true,
          femaleDisplayText: true,
          defaultDisplayText: true,
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
          decimal: true,
          // ✅ PANIC RANGES - CRITICAL FOR TEXT TYPE HIGHLIGHTING
          lowPanic: true,
          highPanic: true,
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
          totalExistingResults++;
        } else {
        }
        
        const parameter = {
          id: param.id,
          parameterName: param.parameterName,
          units: param.unit?.symbol || '',
          type: param.type,
          isDescriptive: param.isDescriptive,
          descriptiveText: param.descriptiveText,  // ✅ ADDED: Descriptive text to display below parameter
          isMultipleOptions: param.isMultipleOptions,
          isMandatory: param.isMandatory,
          categoryName: 'NO_CATEGORY_HEADER',
          categoryId: null,
          sortOrder: param.parameterSortOrder || 999,
          categorySortOrder: 999,
          showCategoryHeader: false,
          
          // 🔴 For direct parameters: no category method, only parameter method
          categoryTestMethod: null,
          parameterTestMethod: param.testMethod || null,
          testMethod: param.testMethod || '',
          
          // Range type and display text from database
          rangeType: param.rangeType,
          displayRangeText: param.displayRangeText,
          maleDisplayText: param.maleDisplayText,
          femaleDisplayText: param.femaleDisplayText,
          defaultDisplayText: param.defaultDisplayText,
          rangeText: param.rangeText,
          
          // ✅ PANIC RANGES - CRITICAL FOR TEXT TYPE HIGHLIGHTING
          lowPanic: param.lowPanic,
          highPanic: param.highPanic,
          
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
          
          // Formula fields - INCLUDE BOTH
          hasFormula: param.hasFormula,
          formula: param.formula,
          decimal: param.decimal || 2,
          
          // ✅ NEW: Multiply factor for parameter values
          multiplyBy: param.multiplyBy,
          
          // Get appropriate range based on patient demographics from database
          normalRange: getNormalRange(param, patientTest.patient),
          
          // Existing result if any
          existingResult: existingResult
        };

        allParameters.push(parameter);

        // Group by UNIQUE category identifier
        // For direct parameters, use the unique ID to avoid collapsing them together
        const groupKey = parameter.categoryUniqueId || parameter.categoryName || 'NO_CATEGORY_HEADER';
        if (!groupedParameters[groupKey]) {
          groupedParameters[groupKey] = [];
        }
        groupedParameters[groupKey].push(parameter);
      });
    }

    // 🔧 Fetch outsourcing report data if this is an outsourced test
    let outsourcingReport = null;
    if (patientTest.test?.isOutsourced) {
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
    }

    // ✅ Ensure usedMachine is included in response
    const responseData = {
      patientTest: {
        ...patientTest,
        usedMachine: patientTest.usedMachine || null  // Explicitly ensure it's in the response
      },
      parameters: allParameters,
      groupedParameters,
      outsourcingReport,
      comments: patientTest.comments,
      debug: { 
        totalExistingResults, 
        totalParameters: allParameters.length,
        usedMachineId: patientTest.usedMachineId,
        usedMachineIncluded: !!patientTest.usedMachine,
        usedMachineName: patientTest.usedMachine?.name,
        usedMachineDescription: patientTest.usedMachine?.description
      }
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
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
  
  // ✅ Use new Int age fields if available (more efficient than DOB calculation)
  let exactAgeInDays = patient.ageDays ?? 0;
  let exactAgeInMonths = patient.ageMonths ?? 0;
  let exactAgeInYears = patient.ageYears ?? 0;
  
  // Fallback to DOB calculation if Int fields are not available (backward compatibility)
  if (exactAgeInYears === 0 && exactAgeInMonths === 0 && exactAgeInDays === 0 && patient.dob) {
    const birthDate = new Date(patient.dob);
    const currentDate = new Date();
    const ageInMs = currentDate - birthDate;
    exactAgeInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    exactAgeInMonths = Math.floor(exactAgeInDays / 30.44);
    exactAgeInYears = Math.floor(exactAgeInDays / 365.25);
  }

  // 🔴 DEBUG: Log parameter and patient info
  debugAgeRanges(parameter, patient);

  // Handle complex age ranges from database (for numeric parameters)
  if (parameter.ageRanges) {
    try {
      let ageRanges = JSON.parse(parameter.ageRanges);

      
      // ✅ PRIORITY SORT: Check matching gender first, then both/other
      // This ensures exact gender match takes priority over "Both"
      ageRanges = ageRanges.sort((a, b) => {
        const aGender = a.gender?.toLowerCase() || 'both';
        const bGender = b.gender?.toLowerCase() || 'both';
        
        // Priority: exact match > both > no match
        const aMatchesGender = aGender === patientGender ? 0 : (aGender === 'both' ? 1 : 2);
        const bMatchesGender = bGender === patientGender ? 0 : (bGender === 'both' ? 1 : 2);
        
        return aMatchesGender - bMatchesGender;
      });
      
      // Find matching range based on patient gender and age
      for (const range of ageRanges) {

        
        if (!range.enabled) {

          continue;
        }
        
        // Check gender match - if range has gender specified, it must match patient gender or be 'both'
        const rangeGender = range.gender?.toLowerCase();

        
        if (rangeGender && rangeGender !== 'both' && rangeGender !== patientGender) {

          continue;
        }

        
        let ageMatches = false;
        
        // Handle different range types with time units
        if (range.label?.includes('Less Than') && range.value !== null && range.value !== undefined) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          // -1 indicates patient is too old for this unit (e.g., months for an 8-year-old)
          if (ageToCheck === -1) {

            continue;
          }
          ageMatches = ageToCheck < range.value;

        } else if (range.label?.includes('More Than') && range.value !== null && range.value !== undefined) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          // -1 indicates patient is too old for this unit
          if (ageToCheck === -1) {

            continue;
          }
          ageMatches = ageToCheck > range.value;

        } else if (range.label?.includes('Between') && range.from !== null && range.to !== null) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          // -1 indicates patient is too old for this unit
          if (ageToCheck === -1) {

            continue;
          }
          ageMatches = ageToCheck >= range.from && ageToCheck <= range.to;

        } else if (range.label?.includes('Equal To') && range.value !== null && range.value !== undefined) {
          const ageToCheck = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
          // -1 indicates patient is too old for this unit
          if (ageToCheck === -1) {

            continue;
          }
          ageMatches = ageToCheck === range.value;

        }
        
        // Check if range has valid LL and UL
        const hasValidRange = range.ll !== null && range.ul !== null;

        
        // Return range if age and gender conditions match
        if (ageMatches && hasValidRange) {

          return `${range.ll} - ${range.ul}`;
        }
        
        if (ageMatches && !hasValidRange) {

        }
      }

    } catch (error) {

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
      
      // If gender doesn't match male/female, try both with priority to male
      if (!['male', 'female'].includes(patientGender)) {

        if (parameter.maleActive && parameter.maleLowValue !== null && parameter.maleHighValue !== null) {

          return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
        }
        if (parameter.femaleActive && parameter.femaleLowValue !== null && parameter.femaleHighValue !== null) {

          return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
        }
      }
    }
  }

  // Final fallback: try any available range regardless of rangeType or active status

  
  // Try gender-specific ranges first regardless of rangeType
  if (patientGender === 'female' && parameter.femaleLowValue !== null && parameter.femaleHighValue !== null) {
    return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
  }
  if (patientGender === 'male' && parameter.maleLowValue !== null && parameter.maleHighValue !== null) {
    return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
  }
  
  // If no gender-specific range, try child range
  if (parameter.childLowValue !== null && parameter.childHighValue !== null) {
    return `${parameter.childLowValue} - ${parameter.childHighValue}`;
  }
  
  // Last resort - return display text or empty
  return parameter.displayRangeText || parameter.rangeText || '';
}

// Helper function to get age in specific time unit
// ✅ IMPORTANT: This function returns the age component appropriate for the timeUnit
// 
// Logic:
// - Year(s): Always return years (completed years, ignoring months/days)
// - Month(s): Return months ONLY if years=0 (patient must be <1 year old for month ranges)
// - Day(s): Return days ONLY if years=0 AND months=0 (patient must be <1 month old for day ranges)
// 
// This ensures:
// - 23Y 0M 0D matches "Year(s)" ranges (e.g., "Between 18-65 Years")
// - 0Y 6M 0D matches "Month(s)" ranges (e.g., "Between 1-3 Months")
// - 8Y 3M 5D does NOT match "Month(s)" ranges (years > 0)
function getAgeInUnit(years, months, days, timeUnit) {
  switch (timeUnit) {
    case 'Day(s)':
      // Only return days if patient is <1 month old (prevents 65Y 2D from matching "1-3 Days")
      if (years === 0 && months === 0) {
        return days;
      }
      // Return -1 to indicate this patient is too old for day-based ranges
      return -1;
      
    case 'Month(s)':
      // Only return months if patient is <1 year old (prevents 65Y 2M from matching "1-3 Months")
      if (years === 0) {
        return months;
      }
      // Return -1 to indicate this patient is too old for month-based ranges
      return -1;
      
    case 'Year(s)':
      // Always return completed years (ignore months/days for year-based ranges)
      return years;
      
    default:
      return years;
  }
}

// 🔴 DEBUG: Helper function to check ageRanges data
function debugAgeRanges(parameter, patient) {




  
  if (parameter.ageRanges) {
    try {
      const ageRanges = JSON.parse(parameter.ageRanges);

      ageRanges.forEach((range, idx) => {

      });
    } catch (err) {

    }
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
      'VALIDATED': 'Validated',
      'VALIDATION': 'Validated',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validated',
      'REJECTED': 'Validated'
    };

    // Convert status to proper format
    let properStatus = status;
    if (status) {
      const upperStatus = status.toUpperCase();
      properStatus = statusMapping[upperStatus] || status;
    }

    // Validate status against allowed stages
    const validStatuses = ['Registered', 'Received', 'Entered', 'Validated', 'Authorized', 'Delivered', 'Rectified'];
    if (properStatus && !validStatuses.includes(properStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    // Prepare update data
    const updateData = {
      status: properStatus,
      updatedAt: new Date()
    };

    // If status is being set to "Delivered", unmark the emergency flag
    if (properStatus === 'Delivered') {

      updateData.isEmergency = false;
      updateData.emergencySetAt = null;
    }

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
      message: 'Test status updated successfully',
      data: updatedTest
    });

  } catch (error) {

    
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






    // Map old uppercase statuses to new format for backward compatibility
    const statusMapping = {
      'REGISTERED': 'Registered',
      'RECEIVED': 'Received',
      'PROVISIONAL': 'Entered',
      'AUTHENTICATED': 'Authorized',
      'VALIDATED': 'Validated',
      'VALIDATION': 'Validated',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validated',
      'REJECTED': 'Validated'
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



    // Handle parameterResults if provided (for inline editing of individual test parameter values)
    if (parameterResults && Array.isArray(parameterResults) && parameterResults.length > 0) {

      for (const paramResult of parameterResults) {
        const { parameterId, numericValue, textValue, isHighlighted } = paramResult;
        
        if (!parameterId) {

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
              isHighlighted: isHighlighted || false,
              verifiedAt: new Date()
            },
            create: {
              patientTestId: parseInt(id),
              testParameterId: parseInt(parameterId),
              numericValue: numericValue || undefined,
              textValue: textValue || undefined,
              isHighlighted: isHighlighted || false,
              enteredAt: new Date(),
              verifiedAt: new Date()
            }
          });
        } catch (upsertError) {

          throw upsertError;
        }
      }
    } else {

    }

    res.json({
      success: true,
      message: 'Test result updated successfully',
      data: updatedTest
    });

  } catch (error) {

    
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
      'VALIDATED': 'Validated',
      'VALIDATION': 'Validated',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validated',
      'REJECTED': 'Validated'
    };

    // Convert status to proper format
    let properStatus = status;
    if (status) {
      const upperStatus = status.toUpperCase();
      properStatus = statusMapping[upperStatus] || status;
    }

    // Validate status against allowed stages
    const validStatuses = ['Registered', 'Received', 'Entered', 'Validated', 'Authorized', 'Delivered', 'Rectified'];
    if (properStatus && !validStatuses.includes(properStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    // Prepare update data
    const updateData = {
      status: properStatus,
      updatedAt: new Date()
    };

    // If status is being set to "Delivered", unmark the emergency flag
    if (properStatus === 'Delivered') {

      updateData.isEmergency = false;
      updateData.emergencySetAt = null;
    }

    const updatedTests = await prisma.patientTest.updateMany({
      where: {
        id: {
          in: testIds.map(id => parseInt(id))
        }
      },
      data: updateData
    });

    res.json({
      success: true,
      message: `${updatedTests.count} test(s) updated successfully`,
      updatedCount: updatedTests.count
    });

  } catch (error) {

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
      'VALIDATED': 'Validated',
      'VALIDATION': 'Validated',
      'DELIVERED': 'Delivered',
      'RETEST': 'Rectified',
      'RECTIFIED': 'Rectified',
      'REVERT': 'Rectified',
      'HOLD': 'Validated',
      'REJECTED': 'Validated',
      // Handle already mapped statuses (new format)
      'Registered': 'Registered',
      'Received': 'Received',
      'Entered': 'Entered',
      'Validated': 'Validated',
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
    const allStatuses = ['Registered', 'Received', 'Entered', 'Validated', 'Authorized', 'Delivered', 'Rectified'];
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
        selectedOption,
        isHighlighted
      } = result;

      // Validate required field
      if (!testParameterId) {

        continue;
      }

      // Get parameter details for validation
      let parameter;
      try {
        parameter = await prisma.testParameter.findUnique({
          where: { id: parseInt(testParameterId) }
        });
      } catch (err) {

        continue;
      }

      if (!parameter) {

        continue; // Skip invalid parameters
      }

      // Determine if result is out of range
      let isOutOfRange = false;
      let isPanic = false;

      if (numericValue !== null && numericValue !== undefined) {
        const ageYears = patientTest.patient.ageYears || 0;
        const gender = patientTest.patient.gender?.toLowerCase();
        
        let lowValue, highValue;
        
        // Get appropriate range
        if (ageYears < 18 && parameter.childActive && parameter.childLowValue !== null) {
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
            numericValue: numericValue !== null ? String(numericValue) : null,
            textValue: textValue || null,
            selectedOption: selectedOption || null,
            isHighlighted: isHighlighted || false,
            enteredBy: enteredBy,
            enteredAt: new Date(),
            testCategoryId: testCategoryId ? parseInt(testCategoryId) : null
          },
          create: {
            patientTestId: parseInt(patientTestId),
            testParameterId: parseInt(testParameterId),
            testCategoryId: testCategoryId ? parseInt(testCategoryId) : null,
            numericValue: numericValue !== null ? String(numericValue) : null,
            textValue: textValue || null,
            selectedOption: selectedOption || null,
            isHighlighted: isHighlighted || false,
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
      where: { 
        id: { in: testIds.map(Number) },
        status: {
          notIn: ['Cancelled', 'CANCELLED', 'cancelled']
        }
      },
      include: {
        patient: true,
        test: true,
        testResults: {
          include: { 
            testParameter: {
              include: {
                unit: true
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
        testId: parseInt(testId),
        status: {
          notIn: ['Cancelled', 'CANCELLED', 'cancelled']
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



    // Handle parameterResults if provided
    if (parameterResults && Array.isArray(parameterResults) && parameterResults.length > 0) {
      for (const paramResult of parameterResults) {
        const { parameterId, numericValue, textValue } = paramResult;
        
        if (!parameterId) {

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
            isHighlighted: isHighlighted || false,
            verifiedAt: new Date()
          },
          create: {
            patientTestId: parseInt(patientTestId),
            testParameterId: parseInt(parameterId),
            numericValue: numericValue || undefined,
            textValue: textValue || undefined,
            isHighlighted: isHighlighted || false,
            enteredAt: new Date(),
            verifiedAt: new Date()
          }
        });


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




    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'PatientTest ID is required'
      });
    }

    // Normalize comments: split by comma, trim, and rejoin with consistent format (comma + space)
    let normalizedComments = comments;
    if (comments && comments.trim()) {
      const parts = comments.split(',').map(c => c.trim()).filter(c => c.length > 0);
      normalizedComments = parts.join(', ');  // Join with comma + space

    }

    // Update the PatientTest record with comments
    const updatedPatientTest = await prisma.patientTest.update({
      where: { id: parseInt(id) },
      data: {
        comments: normalizedComments || null
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



    res.json({
      success: true,
      message: 'Comments updated successfully',
      data: updatedPatientTest
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to update comments: ' + error.message
    });
  }
};

// Get comment history for a test/patient
// Returns all unique comments split by comma for dropdown suggestions
// Fetches from ALL patients for system-wide comment history
export const getCommentHistory = async (req, res) => {
  try {
    const { patientId } = req.params;



    // Fetch ALL patient tests with comments (from ALL patients in the system)
    const allPatientTests = await prisma.patientTest.findMany({
      where: {
        comments: {
          not: null
        },
        status: {
          notIn: ['Cancelled', 'CANCELLED', 'cancelled']
        }
      },
      select: {
        comments: true
      }
    });

    // Extract and split all comments by comma
    const allComments = new Set();
    
    allPatientTests.forEach(test => {
      if (test.comments && test.comments.trim()) {
        // Split by comma, trim each part, and filter empty strings
        const parts = test.comments.split(',').map(c => c.trim()).filter(c => c.length > 0);
        parts.forEach(part => allComments.add(part));
      }
    });

    const commentHistory = Array.from(allComments).sort();



    res.json({
      success: true,
      data: commentHistory
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to fetch comment history: ' + error.message
    });
  }
};

// Delete a comment from all tests
export const deleteCommentFromHistory = async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const trimmedComment = comment.trim();


    // Find all patient tests that contain this comment
    const allPatientTests = await prisma.patientTest.findMany({
      where: {
        comments: {
          not: null
        }
      },
      select: {
        id: true,
        comments: true
      }
    });

    let updatedCount = 0;

    // Remove the comment from each test's comments field
    for (const test of allPatientTests) {
      if (test.comments && test.comments.trim()) {
        // Split by comma, filter out the comment to delete, and rejoin
        const parts = test.comments
          .split(',')
          .map(c => c.trim())
          .filter(c => c.length > 0 && c !== trimmedComment);

        // Update the test with the new comments
        const newComments = parts.length > 0 ? parts.join(', ') : null;
        
        if (test.comments !== (newComments || '')) {
          await prisma.patientTest.update({
            where: { id: test.id },
            data: { comments: newComments }
          });
          updatedCount++;

        }
      }
    }



    res.json({
      success: true,
      message: `Comment deleted from ${updatedCount} test(s)`,
      data: { updatedCount }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to delete comment: ' + error.message
    });
  }
};

