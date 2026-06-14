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
  deleteAttachment
} from '../controllers/result.controller.js';
import { upload } from '../utils/upload.js';
import { 
  getStatusHistory,
  getStatusSummary,
  transitionToReceivedOnBarcodePrint,
  transitionToEnteredOnResultSave,
  WORKFLOW_STAGES,
  STAGE_METADATA
} from '../utils/statusWorkflow.js';

const router = express.Router();

// Get all patient tests for results page
router.get('/', getPatientTests);

// Get test statistics for dashboard — must be before /:id
router.get('/statistics', getTestStatistics);

// Bulk update test statuses — must be before /:id/status
router.put('/bulk/status', bulkUpdateTestStatus);

// Send report via email or whatsapp
router.post('/send-report', sendReport);

// Get patient test by ID
router.get('/:id', getPatientTestById);

// Update test status
router.put('/:id/status', updateTestStatus);

// Update test result
router.put('/:id/result', updateTestResult);

// Save test results (new endpoint for detailed results)
router.post('/:patientTestId/results', saveTestResults);

// Update test dates (calendar functionality)
router.put('/:id/dates', updateTestDates);

// Upload attachment (image/PDF) for a patient test
router.post('/:id/attachment', upload.single('file'), uploadAttachment);

// Delete attachment
router.delete('/:id/attachment', deleteAttachment);

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

export default router;
