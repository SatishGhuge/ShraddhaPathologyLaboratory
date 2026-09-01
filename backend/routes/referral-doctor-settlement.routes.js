import express from 'express';
import {
  saveSettlement,
  saveReferralDoctorSettlement,
  getReferralDoctorSettlementReport,
  getUniqueDoctors
} from '../controllers/referral-doctor-settlement.controller.js';

const router = express.Router();

// Get unique referral doctors
router.get('/doctors', getUniqueDoctors);

// Save single visit settlement
router.post('/save-settlement', saveSettlement);

// Save bulk referral doctor settlement
router.post('/save-bulk-settlement', saveReferralDoctorSettlement);

// Get referral doctor settlement report
router.get('/report', getReferralDoctorSettlementReport);

export default router;
