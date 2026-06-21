import express from 'express';
import { body } from 'express-validator';
import {
  createPatient,
  getAllPatients,
  getPatientById,
  searchPatient,
  updatePatient,
  updatePatientTestDetails,
  updatePayment,
  getPatientStatistics,
  getPatientLocationStatistics,
  addTestToVisit
} from '../controllers/patient.controller.js';

const router = express.Router();

// Search patient by mobile or email — must be before /:id
router.get('/search', searchPatient);

// Get patient statistics for dashboard
router.get('/statistics', getPatientStatistics);

// Get patient location-wise statistics
router.get('/statistics/location', getPatientLocationStatistics);

// Get all patients
router.get('/', getAllPatients);

// Create patient
router.post('/',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('mobile').optional().trim(),  // ✅ Mobile is now optional
    body('tests').isArray().withMessage('Tests must be an array')  // Allow empty array
  ],
  createPatient
);

// Get patient by ID
router.get('/:id', getPatientById);

// Update patient demographics
router.put('/:patientId', updatePatient);

// Update patient test visit details (patient_history, etc.)
router.patch('/:patientId/visit-details', updatePatientTestDetails);

// Update payment for a visit
router.patch('/:patientId/payment', updatePayment);

// Add test to existing visit
router.post('/:patientId/visits/:visitId/tests', addTestToVisit);

export default router;
