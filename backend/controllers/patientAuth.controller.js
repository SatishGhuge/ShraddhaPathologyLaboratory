import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database.js';
import { emailService, smsService } from '../services/notification.service.js';

// Generate Patient ID: S + YY + MM + XXXXX (S260600001)
const generatePatientId = async () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  const lastPatient = await prisma.patient.findFirst({
    where: { patientId: { startsWith: `S${yy}${mm}` } },
    orderBy: { patientId: 'desc' }
  });

  let sequence = 1;
  if (lastPatient) {
    const lastSequence = parseInt(lastPatient.patientId.slice(5));
    sequence = lastSequence + 1;
  }

  return `S${yy}${mm}${String(sequence).padStart(5, '0')}`;
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Generate JWT token
const generateToken = (patientId, email) => {
  return jwt.sign(
    { patientId, email, role: 'patient' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// PATIENT SELF-REGISTRATION
export const patientSelfRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      dob,
      gender,
      address,
      location,
      title
    } = req.body;

    console.log('📝 Patient Self-Registration:', { firstName, email, phone });

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.patient.findUnique({
      where: { patientId: email.split('@')[0] }
    }).catch(() => null);

    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: [{ email }, { mobile: phone }]
      }
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient already registered with this email or phone number'
      });
    }

    // Generate patient ID
    const patientId = await generatePatientId();

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        patientId,
        title,
        firstName,
        lastName,
        email,
        mobile: phone,
        password: passwordHash,
        dob: dob ? new Date(dob) : null,
        gender,
        address,
        location,
        registrationType: 'self',
        isActive: true,
        isEmailVerified: false
      }
    });

    // Create patient auth record
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const auth = await prisma.patientAuth.create({
      data: {
        patientId: patient.patientId,
        email,
        passwordHash,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
        isEmailVerified: false
      }
    });

    console.log('✅ Patient registered:', patientId);

    // Send registration credentials email with patient ID and password
    await emailService.sendRegistrationCredentials(
      email,
      `${firstName} ${lastName || ''}`,
      patientId,
      password,
      'self'
    );

    // Generate JWT token
    const token = generateToken(patientId, email);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully. Please check your email to verify.',
      data: {
        patientId: patient.patientId,
        firstName: patient.firstName,
        email: patient.email,
        registrationType: patient.registrationType
      },
      token,
      requiresEmailVerification: true
    });
  } catch (error) {
    console.error('❌ Patient registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register patient',
      error: error.message
    });
  }
};

// ORGANIZATION REGISTRATION (Lab staff registers patient on behalf of org)
export const registerPatientViaOrganization = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      dob,
      gender,
      address,
      location,
      title,
      organizationId
    } = req.body;

    console.log('🏢 Patient Registration via Organization:', {
      firstName,
      email,
      organizationId
    });

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if patient already exists
    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: [{ email }, { mobile: phone }]
      }
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient already registered'
      });
    }

    // Generate patient ID
    const patientId = await generatePatientId();

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex').slice(0, 8);
    const passwordHash = await hashPassword(tempPassword);

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        patientId,
        title,
        firstName,
        lastName,
        email,
        mobile: phone,
        password: passwordHash,
        dob: dob ? new Date(dob) : null,
        gender,
        address,
        location,
        registrationType: 'organization',
        organizationId,
        isActive: true,
        isEmailVerified: false
      }
    });

    // Create patient auth record
    const auth = await prisma.patientAuth.create({
      data: {
        patientId: patient.patientId,
        email,
        passwordHash,
        isEmailVerified: false
      }
    });

    console.log('✅ Patient registered via organization:', patientId);

    // Send credentials email with temporary password
    await emailService.sendRegistrationCredentials(
      email,
      `${firstName} ${lastName || ''}`,
      patientId,
      tempPassword,
      'organization'
    );

    // Send WhatsApp notification
    await smsService.sendRegistrationCredentialsMessage(
      phone,
      firstName,
      patientId,
      tempPassword
    );

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully. Credentials sent to email and WhatsApp.',
      data: {
        patientId: patient.patientId,
        firstName: patient.firstName,
        email: patient.email,
        tempPassword: tempPassword, // For manual distribution
        registrationType: patient.registrationType
      }
    });
  } catch (error) {
    console.error('❌ Organization registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register patient',
      error: error.message
    });
  }
};

// DIRECT LAB REGISTRATION (Lab staff registers patient at counter)
export const registerPatientDirect = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      dob,
      gender,
      address,
      location,
      title
    } = req.body;

    console.log('🏥 Direct Patient Registration:', { firstName, email, phone });

    // Check if patient already exists
    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: [{ email }, { mobile: phone }]
      }
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient already registered'
      });
    }

    // Generate patient ID
    const patientId = await generatePatientId();

    // Generate temporary password for direct registration
    const tempPassword = crypto.randomBytes(8).toString('hex').slice(0, 8);
    const passwordHash = await hashPassword(tempPassword);

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        patientId,
        title,
        firstName,
        lastName,
        email,
        mobile: phone,
        password: passwordHash,
        dob: dob ? new Date(dob) : null,
        gender,
        address,
        location,
        registrationType: 'direct',
        isActive: true,
        isEmailVerified: false
      }
    });

    // Create patient auth record
    const auth = await prisma.patientAuth.create({
      data: {
        patientId: patient.patientId,
        email,
        passwordHash,
        isEmailVerified: false
      }
    });

    console.log('✅ Patient registered directly:', patientId);

    // Send credentials via Email and WhatsApp
    await emailService.sendRegistrationCredentials(
      email,
      `${firstName} ${lastName || ''}`,
      patientId,
      tempPassword,
      'direct'
    );

    await smsService.sendRegistrationCredentialsMessage(
      phone,
      firstName,
      patientId,
      tempPassword
    );

    res.status(201).json({
      success: true,
      message: 'Patient registered at lab counter. Credentials sent via email and WhatsApp.',
      data: {
        patientId: patient.patientId,
        firstName: patient.firstName,
        email: patient.email,
        phone: patient.mobile,
        tempPassword: tempPassword,
        registrationType: patient.registrationType
      }
    });
  } catch (error) {
    console.error('❌ Direct registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register patient',
      error: error.message
    });
  }
};

// PATIENT LOGIN
export const patientLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('🔐 Patient Login Attempt:', email);

    // Find patient by email
    const patient = await prisma.patient.findFirst({
      where: { email }
    });

    if (!patient) {
      console.log('❌ Patient not found with email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Patient found:', patient.patientId);

    // Check if patient has password set
    if (!patient.password) {
      console.log('❌ Patient has no password set:', patient.patientId);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare password directly from patient table
    const isPasswordValid = await bcrypt.compare(password, patient.password);

    if (!isPasswordValid) {
      console.log('❌ Password mismatch for patient:', patient.patientId);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Password verified for patient:', patient.patientId);

    // Generate JWT token
    const token = generateToken(patient.patientId, patient.email);

    console.log('✅ Patient logged in successfully:', patient.patientId);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.mobile,
        registrationType: patient.registrationType
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { patientId, token } = req.body;

    console.log('📧 Email Verification Attempt:', patientId);

    // Find patient
    const patient = await prisma.patient.findUnique({
      where: { patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find auth record
    const auth = await prisma.patientAuth.findUnique({
      where: { patientId }
    });

    if (!auth) {
      return res.status(404).json({
        success: false,
        message: 'Auth record not found'
      });
    }

    // Check if already verified
    if (auth.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Verify token and expiry
    if (auth.emailVerificationToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    if (new Date() > auth.emailVerificationExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Verification token expired'
      });
    }

    // Update verification status
    await prisma.patientAuth.update({
      where: { patientId },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null
      }
    });

    await prisma.patient.update({
      where: { patientId },
      data: { isEmailVerified: true }
    });

    console.log('✅ Email verified successfully:', patientId);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

// RESEND VERIFICATION EMAIL
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔄 Resend Verification Email:', email);

    // Find patient
    const patient = await prisma.patient.findFirst({
      where: { email }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find auth record
    const auth = await prisma.patientAuth.findUnique({
      where: { patientId: patient.patientId }
    });

    if (!auth) {
      return res.status(404).json({
        success: false,
        message: 'Auth record not found'
      });
    }

    if (auth.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.patientAuth.update({
      where: { patientId: patient.patientId },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry
      }
    });

    console.log('✅ Verification email resent:', email);

    // Send verification email
    await emailService.sendEmailVerificationLink(
      email,
      `${patient.firstName} ${patient.lastName || ''}`,
      patient.patientId,
      verificationToken
    );

    res.json({
      success: true,
      message: 'Verification email resent. Please check your inbox.'
    });
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: error.message
    });
  }
};

// FORGOT PASSWORD - REQUEST RESET
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔑 Forgot Password Request:', email);

    // Find patient
    const patient = await prisma.patient.findFirst({
      where: { email }
    });

    if (!patient) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If email exists, password reset link will be sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.patientAuth.update({
      where: { patientId: patient.patientId },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry
      }
    });

    console.log('✅ Password reset token generated:', patient.patientId);

    // Send password reset email
    await emailService.sendPasswordResetLink(
      email,
      `${patient.firstName} ${patient.lastName || ''}`,
      patient.patientId,
      resetToken
    );

    res.json({
      success: true,
      message: 'If email exists, password reset link will be sent to your email.'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process forgot password request',
      error: error.message
    });
  }
};

// RESET PASSWORD - VERIFY TOKEN AND SET NEW PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { patientId, token, password, confirmPassword } = req.body;

    console.log('🔄 Reset Password:', patientId);

    // Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Find auth record
    const auth = await prisma.patientAuth.findUnique({
      where: { patientId }
    });

    if (!auth) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify token
    if (auth.passwordResetToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check expiry
    if (new Date() > auth.passwordResetExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Reset token expired'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    await prisma.patientAuth.update({
      where: { patientId },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        loginAttempts: 0,
        isLocked: false
      }
    });

    // Also update patient password field
    await prisma.patient.update({
      where: { patientId },
      data: { password: passwordHash }
    });

    console.log('✅ Password reset successfully:', patientId);

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

// GET PATIENT PROFILE
export const getPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { patientId },
      select: {
        patientId: true,
        title: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        dob: true,
        age: true,
        gender: true,
        address: true,
        location: true,
        registrationType: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// UPDATE PATIENT PROFILE
export const updatePatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { firstName, lastName, phone, address, location, dob, gender } = req.body;

    const patient = await prisma.patient.update({
      where: { patientId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        mobile: phone || undefined,
        address: address || undefined,
        location: location || undefined,
        dob: dob ? new Date(dob) : undefined,
        gender: gender || undefined
      },
      select: {
        patientId: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        dob: true,
        gender: true,
        address: true,
        location: true
      }
    });

    console.log('✅ Patient profile updated:', patientId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: patient
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

