import express from 'express';
import { body } from 'express-validator';
import {
  createPatient,
  getAllPatients,
  getPatientById,
  searchPatient,
  updatePatient,
  updatePayment,
  getPatientStatistics
} from '../controllers/patient.controller.js';

const router = express.Router();

// Search patient by mobile or email — must be before /:id
router.get('/search', searchPatient);

// Get patient statistics for dashboard
router.get('/statistics', getPatientStatistics);

// Get all patients
router.get('/', getAllPatients);

// Create patient
router.post('/',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('mobile').trim().notEmpty().withMessage('Mobile is required'),
    body('tests').isArray({ min: 1 }).withMessage('At least one test is required')
  ],
  createPatient
);

// Get patient by ID
router.get('/:id', getPatientById);

// Update patient demographics
router.put('/:patientId', updatePatient);

// Update payment for a visit
router.patch('/:patientId/payment', updatePayment);

export default router;
