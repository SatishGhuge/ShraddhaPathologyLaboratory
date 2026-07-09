import express from 'express';
import { getDoctorReferralRevenue, debugDoctorRevenue } from '../controllers/doctor-revenue.controller.js';

const router = express.Router();

// DEBUG: Check database content
router.get('/debug/doctor-revenue-check', debugDoctorRevenue);

// Get doctor referral revenue (with flexible date handling for empty results)
router.get('/doctor-revenue', getDoctorReferralRevenue);

// Fallback: Return all patient tests if referral doctor revenue is empty
router.get('/doctor-revenue/fallback', async (req, res) => {
  try {
    const prisma = (await import('../config/database.js')).default;
    
    const { fromDate, toDate } = req.query;
    
    // Get all patient tests for the date range (no referral doctor filter)
    const whereCondition = {};
    
    if (fromDate && toDate) {
      const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
      const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
      
      const startDate = new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0);
      const endDate = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999);

      whereCondition.visitDate = {
        gte: startDate,
        lte: endDate
      };
    }
    
    const allTests = await prisma.patientTest.findMany({
      where: whereCondition,
      include: {
        patient: true,
        test: true,
        organization: true
      },
      orderBy: { visitDate: 'desc' },
      take: 100
    });
    
    res.json({
      success: true,
      message: 'All patient tests (no referral doctor filter)',
      data: allTests.map(t => ({
        visitDate: t.visitDate,
        referralDoctor: t.referralDoctor || '(empty)',
        patientName: `${t.patient.firstName} ${t.patient.lastName}`,
        testName: t.test.name,
        charge: t.charge
      }))
    });
  } catch (error) {
    console.error('Fallback endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
