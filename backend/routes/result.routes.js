import express from 'express';
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

export default router;
