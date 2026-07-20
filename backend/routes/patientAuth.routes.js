import express from 'express';
import { body, validationResult } from 'express-validator';
import * as patientAuthController from '../controllers/patientAuth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// ============================================================================
// REGISTRATION ENDPOINTS
// ============================================================================

// Patient Self-Registration
router.post(
  '/register/self',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('address').optional().trim()
  ],
  patientAuthController.patientSelfRegister
);

// Organization Registration (Lab staff registers patient)
router.post(
  '/register/organization',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('organizationId').notEmpty().withMessage('Organization ID is required')
  ],
  patientAuthController.registerPatientViaOrganization
);

// Direct Lab Registration (Counter registration)
router.post(
  '/register/direct',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required')
  ],
  patientAuthController.registerPatientDirect
);

// ============================================================================
// LOGIN ENDPOINTS
// ============================================================================

// Patient Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  patientAuthController.patientLogin
);

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

// Verify Email
router.post(
  '/verify-email',
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('token').notEmpty().withMessage('Verification token is required')
  ],
  patientAuthController.verifyEmail
);

// Resend Verification Email
router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('Valid email is required')],
  patientAuthController.resendVerificationEmail
);

// ============================================================================
// PASSWORD RECOVERY
// ============================================================================

// Forgot Password - Request Reset Token
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  patientAuthController.forgotPassword
);

// Reset Password - Verify Token and Set New Password
router.post(
  '/reset-password',
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  patientAuthController.resetPassword
);

// ============================================================================
// PATIENT PROFILE ENDPOINTS
// ============================================================================

// Get Patient Profile
router.get('/profile/:patientId', patientAuthController.getPatientProfile);

// Update Patient Profile
router.put(
  '/profile/:patientId',
  [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('phone').optional().isMobilePhone(),
    body('address').optional().trim(),
    body('location').optional().trim()
  ],
  patientAuthController.updatePatientProfile
);

export default router;
