import express from 'express';
import {
  generateQRToken,
  getQRTokenForTest,
  validateQRToken,
  invalidateQRToken,
  regenerateQRToken,
  getQRTokenInfo
} from '../controllers/report-qr.controller.js';

const router = express.Router();

/**
 * POST /api/report-qr/generate
 * Generate secure token for finalized report
 */
router.post('/generate', generateQRToken);

/**
 * GET /api/report-qr/token/:patientTestId
 * Get QR token status for a specific test (for embedding in frontend QR)
 */
router.get('/token/:patientTestId', getQRTokenForTest);

/**
 * GET /api/report-qr/validate/:token
 * Validate token and return report data
 */
router.get('/validate/:token', validateQRToken);

/**
 * POST /api/report-qr/invalidate/:patientTestId
 * Disable QR access for a report
 */
router.post('/invalidate/:patientTestId', invalidateQRToken);

/**
 * PUT /api/report-qr/regenerate/:patientTestId
 * Create new token for same report
 */
router.put('/regenerate/:patientTestId', regenerateQRToken);

/**
 * GET /api/report-qr/info/:patientTestId
 * Get QR token information (admin use)
 */
router.get('/info/:patientTestId', getQRTokenInfo);

export default router;
