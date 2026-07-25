import express from 'express';
import {
  queryWorklist,
  submitResults,
  healthCheck
} from '../controllers/machine.controller.js';

const router = express.Router();

/**
 * Machine Integration API Routes
 * Base path: /api/machine/v1
 * 
 * These endpoints are called by local agents (Sysmex, Roche, etc.)
 * to query test orders and submit results
 */

/**
 * Health check endpoint
 * GET /api/machine/v1/health
 */
router.get('/health', healthCheck);

/**
 * Query worklist endpoint
 * GET /api/machine/v1/query?visitId=V-123&sampleId=sample-001&analyzer=Sysmex^XN-350
 * 
 * Returns test orders ONLY for the specific machine
 * Machine name from ASTM header is used to filter tests
 * If machine not found or no tests assigned, returns empty array
 */
router.get('/query', queryWorklist);

/**
 * Submit results endpoint
 * POST /api/machine/v1/results
 * 
 * Request body:
 * {
 *   "visitId": "V-123",
 *   "sampleId": "sample-001",
 *   "results": [
 *     {
 *       "testCode": "CBC",
 *       "parameters": {
 *         "WBC": "7.5",
 *         "RBC": "4.8"
 *       }
 *     }
 *   ]
 * }
 * 
 * Returns: Results stored and patient test status updated to "Entered"
 */
router.post('/results', submitResults);

export default router;
