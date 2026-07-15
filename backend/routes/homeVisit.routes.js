import express from 'express';
import { body, query, param } from 'express-validator';
import * as homeVisitController from '../controllers/homeVisit.controller.js';

const router = express.Router();

// ============================================================================
// RUNNER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all runners
router.get('/runners', homeVisitController.getAllRunners);

// Get runners by location
router.get('/runners/location/:location', homeVisitController.getRunnersByLocation);

// Get runner workload for a specific date
router.get(
  '/runners/:runnerId/workload/:date',
  homeVisitController.getRunnerWorkload
);

// ============================================================================
// HOME VISIT ENDPOINTS
// ============================================================================

// Get all home visits with filters
router.get('/visits', homeVisitController.getAllHomeVisits);

// Get home visit details
router.get('/visits/:homeVisitId', homeVisitController.getHomeVisitDetails);

// Auto-assign runner
router.post(
  '/auto-assign-runner',
  [
    body('patientTestId').isInt().withMessage('Valid test ID is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('visitDate').isISO8601().withMessage('Valid date is required')
  ],
  homeVisitController.autoAssignRunner
);

// Update home visit status
router.put(
  '/visits/:homeVisitId/status',
  [
    param('homeVisitId').notEmpty().withMessage('Home visit ID is required'),
    body('status')
      .isIn(['Scheduled', 'RunnerArrived', 'SampleReceived', 'Completed', 'Cancelled'])
      .withMessage('Invalid status'),
    body('notes').optional().trim()
  ],
  homeVisitController.updateHomeVisitStatus
);

// ============================================================================
// LOCATION TRACKING ENDPOINTS
// ============================================================================

// Update runner location
router.post(
  '/visits/:homeVisitId/location',
  [
    param('homeVisitId').notEmpty().withMessage('Home visit ID is required'),
    body('runnerId').notEmpty().withMessage('Runner ID is required'),
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required'),
    body('accuracy').optional().isFloat().withMessage('Accuracy must be a number')
  ],
  homeVisitController.updateRunnerLocation
);

// Get runner location history
router.get(
  '/visits/:homeVisitId/location/history',
  homeVisitController.getRunnerLocationHistory
);

// Get current runner location
router.get(
  '/visits/:homeVisitId/location/current',
  homeVisitController.getCurrentRunnerLocation
);

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

// Get home visit statistics
router.get(
  '/stats',
  homeVisitController.getHomeVisitStats
);

export default router;
