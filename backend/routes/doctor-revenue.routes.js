import express from 'express';
import { getDoctorReferralRevenue, debugDoctorRevenue } from '../controllers/doctor-revenue.controller.js';

const router = express.Router();

// DEBUG: Check database content
router.get('/debug/doctor-revenue-check', debugDoctorRevenue);

// Get doctor referral revenue
router.get('/doctor-revenue', getDoctorReferralRevenue);

export default router;
