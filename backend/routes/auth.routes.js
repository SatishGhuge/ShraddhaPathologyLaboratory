import express from 'express';
import { body } from 'express-validator';
import {
  login,
  forgotPassword,
  verifyCode,
  resetPassword
} from '../controllers/auth.controller.js';

const router = express.Router();

// Login
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').trim().notEmpty().withMessage('Password is required')
  ],
  login
);

// Forgot password - send code
router.post('/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  forgotPassword
);

// Verify code
router.post('/verify-code',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
  ],
  verifyCode
);

// Reset password
router.post('/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  resetPassword
);

export default router;
