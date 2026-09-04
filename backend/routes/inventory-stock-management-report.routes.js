import express from 'express';
import { 
  getInventoryStockManagementReport,
  getLowStockAlerts,
  getExpiringItems
} from '../controllers/inventory-stock-management-report.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get inventory stock management report
router.get('/report', authMiddleware, getInventoryStockManagementReport);

// Get low stock alerts
router.get('/alerts/low-stock', authMiddleware, getLowStockAlerts);

// Get expiring items
router.get('/alerts/expiring-items', authMiddleware, getExpiringItems);

export default router;
