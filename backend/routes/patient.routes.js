import express from 'express';
import { body } from 'express-validator';
import {
  createPatient,
  registerPatientWithEmail,
  getAllPatients,
  getPatientById,
  searchPatient,
  updatePatient,
  updatePatientTestDetails,
  updatePayment,
  getPatientStatistics,
  getPatientLocationStatistics,
  getOrganizationTypeStatistics,
  getWeeklyOrganizationTypeStatistics,
  addTestToVisit,
  createPaymentTransaction,
  getPaymentTransactions,
  getPatientPaymentTransactions,
  getPatientTests,
  getTestsByVisitId,
  addTestsToExistingVisit,
  addPaymentToVisit,
  applyDiscount,
  recordPayment,
  cancelTest,
  getBillSummary,
  getTransactionHistory,
  getVisitBill,
  toggleTestEmergency
} from '../controllers/patient.controller.js';
import {
  getPatientVisitReport,
  getPatientBillingSummary
} from '../controllers/patient-report.controller.js';

const router = express.Router();

// Search patient by mobile or email — must be FIRST before /:id
router.get('/search', searchPatient);

// Get patient statistics for dashboard
router.get('/statistics', getPatientStatistics);

// Get patient location-wise statistics
router.get('/statistics/location', getPatientLocationStatistics);

// Get organization type statistics (today's count)
router.get('/statistics/organization-type', getOrganizationTypeStatistics);

// Get weekly organization type statistics (last 7 days)
router.get('/statistics/organization-type/weekly', getWeeklyOrganizationTypeStatistics);

// Payment transaction routes — MUST be before /:id routes
router.post('/payment-transaction', createPaymentTransaction);
router.get('/payment-transactions/:visitId', getPaymentTransactions);

// Get tests by visitId for booking details modal
router.get('/tests-by-visit', getTestsByVisitId);

// Get fresh VisitBill data for a specific visit (used to refresh balance after settlement)
router.get('/visit-bill/:visitId', getVisitBill);

// ✅ NEW BILLING OPERATIONS - MUST be before /:id routes
router.post('/:visitId/discount', applyDiscount);
router.post('/:visitId/payment-record', recordPayment);
router.post('/:visitId/cancel-test/:patientTestId', cancelTest);
router.get('/:visitId/bill-summary', getBillSummary);
router.get('/:visitId/transaction-history', getTransactionHistory);

// Report endpoints
router.get('/report/visit-details', getPatientVisitReport);
router.get('/report/billing-summary', getPatientBillingSummary);

// ===== EMERGENCY TEST MANAGEMENT =====
router.patch('/test/:patientTestId/toggle-emergency', toggleTestEmergency);

// Add tests to existing visit (from BookingDetailsModal)
router.post('/add-tests-to-visit', addTestsToExistingVisit);

// Add payment to existing visit (payment-only, no new tests)
router.post('/add-payment-to-visit', addPaymentToVisit);

// Get all patients
router.get('/', getAllPatients);

// Create patient
router.post('/',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('mobile').optional().trim(),  // ✅ Mobile is now optional
    body('tests').isArray().withMessage('Tests must be an array')  // Allow empty array
  ],
  createPatient
);

// Admin register patient with email notification
router.post('/admin/register-with-email',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('mobile').optional().trim(),
    body('tests').optional().isArray()
  ],
  registerPatientWithEmail
);

// Get patient by ID
router.get('/:id', getPatientById);

// Update patient demographics
router.put('/:patientId', updatePatient);

// Update patient test visit details (patient_history, etc.)
router.patch('/:patientId/visit-details', updatePatientTestDetails);

// Update payment for a visit
router.patch('/:patientId/payment', updatePayment);

// Add test to existing visit
router.post('/:patientId/visits/:visitId/tests', addTestToVisit);

// Get all payment transactions for a patient
router.get('/:patientId/payment-transactions', getPatientPaymentTransactions);

export default router;
