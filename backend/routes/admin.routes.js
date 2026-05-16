import express from 'express';
import { body } from 'express-validator';
import { getProfile, createAdmin, getDiscountReport, getServiceCountReport, getGroupSummaryReport, getTestReport, getReportDashboard, getMonthlyCollectionSummary, getTurnAroundTimeReport } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get admin profile (protected route)
router.get('/profile', authMiddleware, getProfile);

// Create new admin (protected route - only admins can create admins)
router.post('/create', 
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('username').trim().isLength({ min: 4 }).withMessage('Username must be at least 4 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits')
  ],
  createAdmin
);

// Discount report
router.get('/discount-report', authMiddleware, getDiscountReport);

// Service count report
router.get('/service-count-report', authMiddleware, getServiceCountReport);

// Group summary report
router.get('/group-summary-report', authMiddleware, getGroupSummaryReport);

// Test report
router.get('/test-report', authMiddleware, getTestReport);

// Report dashboard
router.get('/report-dashboard', authMiddleware, getReportDashboard);

// Monthly collection summary
router.get('/monthly-collection-summary', authMiddleware, getMonthlyCollectionSummary);

// Turn around time report
router.get('/turn-around-time-report', authMiddleware, getTurnAroundTimeReport);

export default router;
