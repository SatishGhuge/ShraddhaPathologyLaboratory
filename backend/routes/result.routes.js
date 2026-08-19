import express from 'express';
import prisma from '../config/database.js';
import {
  getPatientTests,
  getPatientTestById,
  updateTestStatus,
  updateTestResult,
  saveTestResults,
  bulkUpdateTestStatus,
  getTestStatistics,
  updateTestDates,
  sendReport,
  uploadAttachment,
  deleteAttachment,
  getPreviousTestResult,
  getAllTestResults,
  updatePatientComments,
  getCommentHistory,
  deleteCommentFromHistory
} from '../controllers/result.controller.js';
import {
  getOutsourcingReport
} from '../controllers/outsourcing.controller.js';
import { upload } from '../utils/upload.js';
import { 
  getStatusHistory,
  getStatusSummary,
  transitionToReceivedOnBarcodePrint,
  transitionToEnteredOnResultSave,
  WORKFLOW_STAGES,
  STAGE_METADATA
} from '../utils/statusWorkflow.js';
import {
  parseBarcodeData,
  findPartialBarcodeMatch,
  isValidBarcodeFormat
} from '../utils/barcodeUtils.js';

const router = express.Router();

// ===== BARCODE SCANNING & PARSING =====

// Parse barcode and extract visitId + sampleId (FAST - <0.1 sec response)
// Input: { barcode: "20250801000-1" }
// Output: { visitId: "20250801000", sampleId: "1" }
router.post('/parse-barcode', async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Barcode is required',
        visitId: null,
        sampleId: null
      });
    }

    // Parse barcode instantly (string parsing, no DB query)
    let data = parseBarcodeData(barcode);

    // If incomplete, try to find matching barcode (with DB query)
    if (!data) {
      const fullBarcode = await findPartialBarcodeMatch(barcode, prisma);
      if (fullBarcode) {
        data = parseBarcodeData(fullBarcode);
      }
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Invalid barcode format. Expected format: "20250801000-1"',
        visitId: null,
        sampleId: null,
        barcode: barcode
      });
    }

    // Return extracted visitId + sampleId
    res.status(200).json({
      success: true,
      message: 'Barcode parsed successfully',
      visitId: data.visitId,          // e.g., "20250801000"
      sampleId: data.sampleId,        // e.g., "1"
      barcode: data.barcode,
      timestamp: new Date().toISOString(),
      responseTime: '<0.1s'
    });

  } catch (error) {
    console.error('Barcode parsing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse barcode',
      error: error.message,
      visitId: null,
      sampleId: null
    });
  }
});

// 🟢 QR CODE ENDPOINT: MUST BE FIRST - Get complete report data by visitId for mobile viewing
// This MUST be registered BEFORE the generic /:id route
router.get('/qr-scan/:visitId', async (req, res) => {
  try {
    const { visitId } = req.params;

    console.log('🟢🟢🟢 QR-SCAN ENDPOINT HIT! visitId:', visitId);

    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'visitId is required'
      });
    }

    console.log('📱 QR Scan - Fetching all tests for visitId:', visitId);

    // Get all patient tests for this visit
    const patientTests = await prisma.patientTest.findMany({
      where: { visitId: visitId },
      include: {
        patient: true,  // Patient doesn't have organization relation, removed
        test: {
          include: {
            sample_type: true
          }
        },
        testResults: {
          include: {
            testParameter: {
              include: {
                unit: true
              }
            },
            testCategory: true
          }
        },
        department: true,
        organization: true,
        usedMachine: true
      }
    });

    if (patientTests.length === 0) {
      console.warn('⚠️ No tests found for visitId:', visitId);
      return res.status(404).json({
        success: false,
        message: `No tests found for this visit ID: ${visitId}`
      });
    }

    console.log(`📱 Found ${patientTests.length} test(s) for visitId: ${visitId}`);

    // Get the first test to extract patient info
    const firstTest = patientTests[0];
    const patient = firstTest.patient;

    // Build combined response with all tests
    const combinedTests = patientTests.map(pt => ({
      id: pt.id,
      name: pt.test.name,
      testCode: pt.test.testCode,
      testId: pt.test.id,
      interpretation: pt.test.interpretation,
      groupedParameters: {}, // Will be filled below
      usedMachine: pt.usedMachine,
      comments: pt.comments
    }));

    // Build results map and grouped parameters for each test
    const results = {};
    const testParametersMap = {};

    patientTests.forEach(pt => {
      if (pt.testResults && pt.testResults.length > 0) {
        pt.testResults.forEach(tr => {
          results[tr.testParameterId] = {
            numericValue: tr.numericValue,
            textValue: tr.textValue,
            isAbnormal: tr.isAbnormal || false,
            isHighlighted: tr.isHighlighted || false
          };
          
          // Store parameter details for grouped display
          if (tr.testParameter) {
            testParametersMap[tr.testParameterId] = tr.testParameter;
          }
        });
      }
    });

    // Fetch test categories for proper grouping
    const testIds = patientTests.map(pt => pt.test.id);
    const testCategories = await prisma.testCategory.findMany({
      where: {
        testId: { in: testIds }
      },
      include: {
        testParameter: {
          include: {
            unit: true
          }
        }
      }
    });

    // Group parameters by test and category
    patientTests.forEach((pt, testIndex) => {
      const testCategories_ = testCategories.filter(tc => tc.testId === pt.test.id);
      const groupedParams = {};

      testCategories_.forEach(tc => {
        if (tc.testParameter) {
          const catName = tc.categoryName || 'NO_CATEGORY_HEADER';
          if (!groupedParams[catName]) {
            groupedParams[catName] = [];
          }
          
          // ✅ Include all parameter details with results
          const paramId = tc.testParameter.id;
          const paramResult = results[paramId] || {};
          
          groupedParams[catName].push({
            id: tc.testParameter.id,
            parameterName: tc.testParameter.parameterName,
            units: tc.testParameter.unit?.symbol || '',
            type: tc.testParameter.type,
            isDescriptive: tc.testParameter.isDescriptive,
            testMethod: tc.testParameter.testMethod,
            normalRange: tc.testParameter.rangeText,
            rangeText: tc.testParameter.rangeText,
            textContent: tc.testParameter.textContent,
            maleDisplayText: tc.testParameter.maleDisplayText,
            femaleDisplayText: tc.testParameter.femaleDisplayText,
            defaultDisplayText: tc.testParameter.defaultDisplayText,
            maleLowValue: tc.testParameter.maleLowValue,
            maleHighValue: tc.testParameter.maleHighValue,
            femaleLowValue: tc.testParameter.femaleLowValue,
            femaleHighValue: tc.testParameter.femaleHighValue,
            childLowValue: tc.testParameter.childLowValue,
            childHighValue: tc.testParameter.childHighValue,
            showCategoryHeader: tc.categoryName ? true : false,
            // ✅ Add results to each parameter
            numericValue: paramResult.numericValue,
            textValue: paramResult.textValue,
            isAbnormal: paramResult.isAbnormal || false,
            isHighlighted: paramResult.isHighlighted || false
          });
        }
      });

      if (combinedTests[testIndex]) {
        combinedTests[testIndex].groupedParameters = groupedParams;
      }
    });

    // Calculate age from patient data
    const ageYears = patient.ageYears || 0;
    const ageMonths = patient.ageMonths || 0;
    const ageDays = patient.ageDays || 0;

    // Get organization name from patient's organization if available
    const organizationName = patient.organization?.name || 'Shraddha Pathology Laboratory';

    const patientInfo = {
      title: patient.title,
      firstName: patient.firstName,
      lastName: patient.lastName,
      ageYears,
      ageMonths,
      ageDays,
      gender: patient.gender,
      organizationName  // ✅ Use patient's actual organization name
    };

    res.json({
      success: true,
      data: {
        visitId,
        patientInfo,
        patientName: [patient.title, patient.firstName, patient.lastName]
          .filter(Boolean)
          .join(' '),
        visitDate: firstTest.visitDate,
        combinedTests,
        results,
        signature: firstTest.test.signature || null,
        letterhead: null // Will be fetched by frontend
      }
    });

  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report data',
      error: error.message
    });
  }
});

// Get all patient tests for results page
router.get('/', getPatientTests);

// 🔴 DEBUG ENDPOINT: Get department statistics
router.get('/debug/departments', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        patientTests: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const stats = departments.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      testCount: d.patientTests.length
    }));

    res.json({
      success: true,
      message: 'Department statistics',
      data: stats
    });
  } catch (error) {
    console.error('Debug departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department statistics',
      error: error.message
    });
  }
});

// Get test statistics for dashboard — must be before /:id
router.get('/statistics', getTestStatistics);

// Get outsourcing report for a patient test
router.get('/outsourcing/:patientTestId', getOutsourcingReport);

// Bulk update test statuses — must be before /:id/status
router.put('/bulk/status', bulkUpdateTestStatus);

// Send report via email or whatsapp
router.post('/send-report', sendReport);

// Get patient test by ID
router.get('/:id', getPatientTestById);

// Update test status
router.put('/:id/status', updateTestStatus);

// Update barcode status (when barcode is printed)
router.patch('/:id/barcode-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { barcode_status, status } = req.body;
    
    const patientTestId = parseInt(id);
    if (isNaN(patientTestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient test ID'
      });
    }
    
    // Update the barcode status and optionally the test status
    const updateData = {};
    if (barcode_status) {
      updateData.barcode_status = barcode_status;
    }
    if (status) {
      updateData.status = status;
    }
    
    const updatedTest = await prisma.patientTest.update({
      where: { id: patientTestId },
      data: updateData
    });
    
    res.json({
      success: true,
      message: 'Barcode status updated successfully',
      data: updatedTest
    });
  } catch (error) {
    console.error('Error updating barcode status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update barcode status',
      error: error.message
    });
  }
});

// Update test result
router.put('/:id/result', updateTestResult);

// Save test results (new endpoint for detailed results)
router.post('/:patientTestId/results', saveTestResults);

// Update test dates (calendar functionality)
router.put('/:id/dates', updateTestDates);

// Update patient comments/notes
router.put('/:id/comments', updatePatientComments);

// Get comment history for a test/patient
// Returns all unique comments split by comma for dropdown suggestions
// Fetches from ALL patients for system-wide comment history
router.get('/history/comments', getCommentHistory);
router.get('/history/comments/:patientId', getCommentHistory);

// Delete a comment from history (removes from all tests)
router.delete('/history/comments', deleteCommentFromHistory);

// Upload attachment (image/PDF) for a patient test
router.post('/:id/attachment', upload.single('file'), uploadAttachment);

// Delete attachment
router.delete('/:id/attachment', deleteAttachment);

// ===== PREVIOUS AND ALL TEST RESULTS ENDPOINTS =====

// Get previous test result for a patient and specific test
router.get('/patient/:patientId/test/:testId/previous', getPreviousTestResult);

// Get all test results history for a patient and specific test
router.get('/patient/:patientId/test/:testId/history', getAllTestResults);

// ===== NEW STATUS WORKFLOW ENDPOINTS =====

// Get status history for a test
router.get('/:id/status-history', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await getStatusHistory(parseInt(id));
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status history',
      error: error.message
    });
  }
});

// Get status summary (dashboard stats)
router.get('/status/summary', async (req, res) => {
  try {
    const summary = await getStatusSummary();
    res.json({
      success: true,
      data: summary,
      metadata: { stages: WORKFLOW_STAGES, stageInfo: STAGE_METADATA }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status summary',
      error: error.message
    });
  }
});

// Auto-transition to Received when barcode is printed
// Accepts numeric patientTestId OR visitId (will auto-detect and handle both)
router.post('/:id/auto-transition/barcode-printed', async (req, res) => {
  try {
    let { id } = req.params;
    const { changedBy } = req.body;
    
    console.log(`📥 Barcode Print - ID received: ${id} (type: ${typeof id}, length: ${id.length})`);
    
    const numId = parseInt(id);
    let patientTest = null;
    
    // First, try to find by PatientTest ID (numeric)
    if (!isNaN(numId) && numId > 0 && numId < 1000000) {
      // Looks like a small sequential ID (PatientTest PK)
      patientTest = await prisma.patientTest.findUnique({
        where: { id: numId }
      });
      console.log(`  🔎 Searched by PatientTest ID ${numId}: ${patientTest ? 'Found' : 'Not found'}`);
    }
    
    // If not found and id looks like a visitId (10+ digits), search by visitId
    if (!patientTest && id.length > 8) {
      patientTest = await prisma.patientTest.findFirst({
        where: { visitId: id }
      });
      console.log(`  🔎 Searched by visitId ${id}: ${patientTest ? 'Found' : 'Not found'}`);
    }
    
    // Still not found? Return error
    if (!patientTest) {
      return res.status(404).json({
        success: false,
        message: `Test not found for ID/visitId: ${id}`
      });
    }
    
    console.log(`✅ Found PatientTest: ID=${patientTest.id}, visitId=${patientTest.visitId}`);
    
    // Now update the status
    const updatedTest = await transitionToReceivedOnBarcodePrint(
      patientTest.id,
      changedBy || 'SYSTEM'
    );
    
    res.json({
      success: true,
      message: 'Test transitioned to Received status',
      data: updatedTest
    });
  } catch (error) {
    console.error('❌ Error in barcode-printed endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transition test status',
      error: error.message
    });
  }
});

// Auto-transition to Entered when first result is saved
router.post('/:id/auto-transition/result-saved', async (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;
    
    const updatedTest = await transitionToEnteredOnResultSave(
      parseInt(id),
      changedBy || 'SYSTEM'
    );
    
    res.json({
      success: true,
      message: 'Test transitioned to Entered status',
      data: updatedTest,
      trigger: 'AUTO'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to transition test status',
      error: error.message
    });
  }
});

// ===== BATCH BARCODE PRINTING WITH STATUS TRACKING =====

// Batch print barcodes and update status to Received for selected tests
router.post('/batch/barcode-print', async (req, res) => {
  try {
    const { testIds, changedBy = 'SYSTEM' } = req.body;

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'testIds array is required and must not be empty'
      });
    }

    console.log(`📦 Processing batch barcode print for ${testIds.length} test(s)`);

    const results = [];
    const errors = [];

    for (const testId of testIds) {
      try {
        const numTestId = parseInt(testId);
        
        // Get current test
        const currentTest = await prisma.patientTest.findUnique({
          where: { id: numTestId }
        });

        if (!currentTest) {
          errors.push({ testId, error: 'Test not found' });
          continue;
        }

        // Transition from Registered to Received
        if (currentTest.status === 'Registered') {
          const updated = await transitionToReceivedOnBarcodePrint(
            numTestId,
            changedBy
          );
          results.push({
            testId: numTestId,
            success: true,
            previousStatus: currentTest.status,
            newStatus: updated.status,
            message: 'Status transitioned to Received'
          });
        } else {
          results.push({
            testId: numTestId,
            success: true,
            previousStatus: currentTest.status,
            newStatus: currentTest.status,
            message: `Already in ${currentTest.status} status`
          });
        }
      } catch (error) {
        console.error(`Error processing test ${testId}:`, error);
        errors.push({ testId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Barcode print processed for ${results.length} test(s)`,
      data: {
        processed: results.length,
        errors: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('❌ Batch barcode print error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch barcode print',
      error: error.message
    });
  }
});

// Get barcode print status for tests (which barcodes have been printed)
router.get('/batch/print-status', async (req, res) => {
  try {
    const { visitId } = req.query;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'visitId is required'
      });
    }

    // Get all tests for this visit
    const tests = await prisma.patientTest.findMany({
      where: { visitId: visitId },
      select: {
        id: true,
        visitId: true,
        status: true,
        sample: true
      }
    });

    res.json({
      success: true,
      data: {
        visitId,
        tests: tests.map(t => ({
          testId: t.id,
          status: t.status,
          isPrinted: t.status !== 'Registered' // Barcode considered "printed" if status moved from Registered
        }))
      }
    });
  } catch (error) {
    console.error('Barcode print status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch barcode print status',
      error: error.message
    });
  }
});

export default router;
