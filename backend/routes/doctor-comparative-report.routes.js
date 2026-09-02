import express from 'express';
import {
  getUniqueDoctors,
  getDoctorComparativeReport
} from '../controllers/doctor-comparative-report.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all unique referral doctors
router.get('/doctors', authMiddleware, getUniqueDoctors);

// Get doctor comparative report
router.get('/report', authMiddleware, getDoctorComparativeReport);

export default router;
