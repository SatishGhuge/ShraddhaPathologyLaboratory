import express from 'express';
import {
  saveSettlement,
  savePatientSettlement,
  saveOrgSettlement,
  getOrganizationSettlementReport
} from '../controllers/organization-settlement.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Settlement Endpoints - All settlement operations moved from patient routes
 */

// Single visit settlement
router.post('/settle-visit', authMiddleware, saveSettlement);

// Bulk patient settlements (multiple visits for one patient)
router.post('/settle-patient-visits', authMiddleware, savePatientSettlement);

// Organization-wide settlement (multiple visits across organization)
router.post('/settle-org-visits', authMiddleware, saveOrgSettlement);

// Get organization settlement report
router.get('/report', authMiddleware, getOrganizationSettlementReport);

export default router;
