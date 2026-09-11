import express from 'express';
import {
  getWorklists,
  getWorklistById,
  createWorklist,
  updateWorklist,
  deleteWorklist,
  getPatientsByWorklist,
  toggleWorklistStatus,
  getTestParameters
} from '../controllers/worklist.controller.js';

const router = express.Router();

// ===== WORKLIST LIST & CREATE =====
router.get('/', getWorklists);                           // Get all worklists with pagination
router.post('/', createWorklist);                        // Create new worklist

// ===== WORKLIST DATA ROUTES (Define before :id to avoid conflicts) =====
router.get('/test/:testId/parameters', getTestParameters);   // Get parameters for a test

// ===== WORKLIST CRUD ROUTES =====
router.get('/:id', getWorklistById);                     // Get single worklist
router.put('/:id', updateWorklist);                      // Update worklist
router.delete('/:id', deleteWorklist);                   // Delete worklist (soft delete)
router.patch('/:id/toggle-status', toggleWorklistStatus); // Toggle active/inactive
router.get('/:worklistId/patients', getPatientsByWorklist); // Get patients for print report

export default router;
