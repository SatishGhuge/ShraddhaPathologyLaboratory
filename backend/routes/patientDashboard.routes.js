import express from 'express';
import { body, query } from 'express-validator';
import * as patientDashboardController from '../controllers/patientDashboard.controller.js';

const router = express.Router();

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

// Get patient dashboard data
router.get('/dashboard/:patientId', patientDashboardController.getDashboardData);

// Get all patient tests with filtering
router.get('/tests/:patientId', patientDashboardController.getPatientTests);

// Get test details
router.get('/test/:patientTestId', patientDashboardController.getTestDetails);

// ============================================================================
// TEST BOOKING ENDPOINTS
// ============================================================================

// Get available tests and packages
router.get('/available/tests-packages', patientDashboardController.getAvailableTestsAndPackages);

// Create new test visit
router.post(
  '/visit/:patientId',
  [
    body('testIds').optional().isArray().withMessage('TestIds must be an array'),
    body('packageId').optional(),
    body('visitDate').optional().isISO8601().withMessage('Valid date is required'),
    body('visitTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Valid time is required'),
    body('paymentMode').optional().isIn(['cash', 'online', 'pending']).withMessage('Invalid payment mode')
  ],
  patientDashboardController.createTestVisit
);

// ============================================================================
// HOME VISIT ENDPOINTS
// ============================================================================

// Get available runners and time slots
router.get(
  '/home-visit/available-slots',
  [
    query('location').notEmpty().withMessage('Location is required'),
    query('date').isISO8601().withMessage('Valid date is required')
  ],
  patientDashboardController.getAvailableRunnersAndSlots
);

// Check slot availability
router.post(
  '/home-visit/check-slot',
  [
    body('runnerId').notEmpty().withMessage('Runner ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('time').matches(/^\d{2}:\d{2}$/).withMessage('Valid time is required')
  ],
  patientDashboardController.checkSlotAvailability
);

// Book home visit
router.post(
  '/home-visit/book/:patientId',
  [
    body('patientTestId').isInt().withMessage('Valid test ID is required'),
    body('runnerId').notEmpty().withMessage('Runner ID is required'),
    body('visitDate').isISO8601().withMessage('Valid date is required'),
    body('visitTime').matches(/^\d{2}:\d{2}$/).withMessage('Valid time is required'),
    body('address').optional().trim()
  ],
  patientDashboardController.bookHomeVisit
);

// Cancel home visit
router.delete(
  '/home-visit/cancel/:homeVisitId',
  patientDashboardController.cancelHomeVisit
);

export default router;
