import express from 'express';
import { body } from 'express-validator';
import {
  // HSN Code
  createHSNCode,
  getAllHSNCodes,
  getHSNCodeById,
  updateHSNCode,
  // Inventory Item
  createInventoryItem,
  getAllInventoryItems,
  getAllItemsForDropdown,
  getBatchesByItem,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  // Supplier
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  // Stock Entry
  createStockEntry,
  getAllStockEntries,
  getStockEntryById,
  deleteStockEntry,
  // Lab Stock
  getLabStocks,
  getLabStockByItem,
  // Stock Transaction
  createStockTransaction,
  getAllStockTransactions,
  // Lab to Org Transfer
  createLabToOrgTransfer,
  getAllLabToOrgTransfers,
  updateTransferStatus,
  // Organization Stock
  getOrganizationStocks,
  // Summary
  getInventorySummary,
  // Process stock entries
  processStockEntriesToLabStock
} from '../controllers/inventory.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// ========== HSN CODE ROUTES ==========
router.post('/hsn-codes', authMiddleware, [
  body('hsnCode').trim().notEmpty().withMessage('HSN Code is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('gstRate').isFloat({ min: 0 }).withMessage('GST rate must be a valid number')
], createHSNCode);

router.get('/hsn-codes', authMiddleware, getAllHSNCodes);
router.get('/hsn-codes/:id', authMiddleware, getHSNCodeById);
router.put('/hsn-codes/:id', authMiddleware, updateHSNCode);

// ========== INVENTORY ITEM ROUTES ==========
router.post('/items', authMiddleware, [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('itemCode').trim().notEmpty().withMessage('Item code is required'),
  body('hsnCodeId').isInt().withMessage('Valid HSN Code ID is required'),
  body('unit').trim().notEmpty().withMessage('Unit is required')
], createInventoryItem);

router.get('/items', authMiddleware, getAllInventoryItems);
router.get('/items-dropdown', authMiddleware, getAllItemsForDropdown);
router.get('/batches/item/:itemId', authMiddleware, getBatchesByItem);
router.get('/items/:id', authMiddleware, getInventoryItemById);
router.put('/items/:id', authMiddleware, updateInventoryItem);
router.delete('/items/:id', authMiddleware, deleteInventoryItem);

// ========== SUPPLIER ROUTES ==========
router.post('/suppliers', authMiddleware, [
  body('supplierName').trim().notEmpty().withMessage('Supplier name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits')
], createSupplier);

router.get('/suppliers', authMiddleware, getAllSuppliers);
router.get('/suppliers/:id', authMiddleware, getSupplierById);
router.put('/suppliers/:id', authMiddleware, updateSupplier);
router.delete('/suppliers/:id', authMiddleware, deleteSupplier);

// ========== STOCK ENTRY ROUTES ==========
router.post('/stock-entries', authMiddleware, [
  body('supplierId').isInt().withMessage('Valid supplier ID is required'),
  body('invoiceNo').trim().notEmpty().withMessage('Invoice number is required'),
  body('invoiceDate').isISO8601().withMessage('Valid invoice date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], createStockEntry);

router.get('/stock-entries', authMiddleware, getAllStockEntries);
router.get('/stock-entries/:id', authMiddleware, getStockEntryById);
router.delete('/stock-entries/:id', authMiddleware, deleteStockEntry);

// ========== LAB STOCK ROUTES ==========
router.get('/lab-stocks', authMiddleware, getLabStocks);
router.get('/lab-stocks/item/:itemId', authMiddleware, getLabStockByItem);

// ========== STOCK TRANSACTION ROUTES ==========
router.post('/stock-transactions', authMiddleware, [
  body('itemId').isInt().withMessage('Valid item ID is required'),
  body('batchNo').trim().notEmpty().withMessage('Batch number is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('transactionType').isIn(['IN', 'OUT', 'RETURN', 'DAMAGED', 'EXPIRY', 'LOSS']).withMessage('Invalid transaction type')
], createStockTransaction);

router.get('/stock-transactions', authMiddleware, getAllStockTransactions);

// ========== LAB TO ORGANIZATION TRANSFER ROUTES ==========
router.post('/transfers', authMiddleware, [
  body('organizationId').trim().notEmpty().withMessage('Organization ID is required'),
  body('transferDate').isISO8601().withMessage('Valid transfer date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], createLabToOrgTransfer);

router.get('/transfers', authMiddleware, getAllLabToOrgTransfers);
router.put('/transfers/:id/status', authMiddleware, [
  body('status').isIn(['Pending', 'Received', 'Cancelled']).withMessage('Invalid status')
], updateTransferStatus);

// ========== ORGANIZATION STOCK ROUTES ==========
router.get('/organization-stocks', authMiddleware, getOrganizationStocks);

// ========== INVENTORY SUMMARY ROUTE ==========
router.get('/summary', authMiddleware, getInventorySummary);

// ========== PROCESS EXISTING STOCK ENTRIES ==========
router.post('/process-stock-entries', authMiddleware, processStockEntriesToLabStock);

export default router;
