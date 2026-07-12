import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../config/database.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../utils/email.js';

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate 6-digit OTP
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// In-memory OTP store for users (no PasswordReset table for users)
const userOtpStore = new Map();

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { username, password } = req.body;

    // Check admins table first
    const admin = await prisma.admin.findFirst({
      where: { OR: [{ username }, { email: username }], isActive: true }
    });

    if (admin) {
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const token = generateToken(admin.id);
      
      // Fetch module allocation and organization details ONLY if admin has organizationId
      // Superadmins (without organizationId) see all fields - no module restrictions
      let moduleAllocation = null;
      let organizationDetails = null;
      if (admin.organizationId) {
        const orgModuleAllocation = await prisma.moduleAllocation.findUnique({
          where: { organizationId: admin.organizationId },
          select: { modules: true }
        });
        
        // If organization has module allocation, use it; otherwise use empty (all false)
        if (orgModuleAllocation?.modules) {
          moduleAllocation = orgModuleAllocation.modules;
        } else {
          // Organization admin with no allocation - get default (all modules disabled)
          moduleAllocation = JSON.stringify({
            patient: { registration: false, tests: false },
            masters: { testlist: false, testTemplates: false, departmentlist: false, packagelist: false, charges: false, rolelist: false, userlist: false, referralDoctorList: false, organization: false, specimenType: false, units: false },
            reports: { dashboard: false, collectionReport: false, patientList: false, referralDoctorRevenue: false, centerWiseCostReport: false, b2bTestwiseCostReport: false, discountReport: false, testReport: false },
            configuration: { signature: false },
            help: { userManual: false, ultraviewer: false, anydesk: false },
            result: false
          });
        }
        
        // Fetch organization name
        const organization = await prisma.organization.findUnique({
          where: { id: admin.organizationId },
          select: { id: true, name: true }
        });
        organizationDetails = organization || null;
      }
      
      const { password: _, ...adminData } = admin;
      return res.json({ 
        success: true, 
        message: 'Login successful', 
        token, 
        admin: { 
          ...adminData, 
          userType: admin.organizationId ? 'org_admin' : 'superadmin',
          moduleAllocation: moduleAllocation,
          organization: organizationDetails
        } 
      });
    }

    // Check users table
    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }], isActive: true }
    });
    if (user) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, userType: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
      
      // Fetch module allocation from module_allocations table
      const moduleAllocation = await prisma.moduleAllocation.findUnique({
        where: { userId: user.id },
        select: { modules: true }
      });
      
      console.log(`🔐 Staff user login: ${user.username}`);
      console.log(`🔐 Module allocation found:`, !!moduleAllocation);
      console.log(`🔐 Modules data:`, moduleAllocation?.modules?.substring(0, 100));
      
      const { password: _, ...userData } = user;
      return res.json({ 
        success: true, 
        message: 'Login successful', 
        token, 
        admin: { 
          ...userData, 
          userType: 'user', 
          moduleAllocation: moduleAllocation?.modules || null 
        } 
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email } = req.body;

    // Check admin table first, then user table
    const admin = await prisma.admin.findUnique({ where: { email, isActive: true } });
    const user  = !admin ? await prisma.user.findFirst({ where: { email, isActive: true } }) : null;

    if (!admin && !user) {
      return res.status(403).json({
        success: false,
        message: 'You are not authenticated. This email is not registered in our system.'
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute

    if (admin) {
      // Use PasswordReset DB table for admins
      await prisma.passwordReset.updateMany({
        where: { adminId: admin.id, used: false },
        data: { used: true }
      });
      await prisma.passwordReset.create({
        data: { adminId: admin.id, code, expiresAt }
      });
    } else {
      // Use in-memory store for users
      userOtpStore.set(email, { code, expiresAt });
    }

    try {
      await sendPasswordResetEmail(email, code);
      console.log(`🔐 OTP sent to: ${email} (${admin ? 'admin' : 'user'})`);
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    res.json({ success: true, message: 'OTP sent to your email. It is valid for 1 minute.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process password reset request' });
  }
};

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────
export const verifyCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, code } = req.body;

    // Try admin
    const admin = await prisma.admin.findUnique({ where: { email, isActive: true } });
    if (admin) {
      const resetRecord = await prisma.passwordReset.findFirst({
        where: { adminId: admin.id, code, used: false, expiresAt: { gt: new Date() } }
      });
      if (!resetRecord) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      return res.json({ success: true, message: 'OTP verified successfully' });
    }

    // Try user
    const user = await prisma.user.findFirst({ where: { email, isActive: true } });
    if (user) {
      const entry = userOtpStore.get(email);
      if (!entry || entry.code !== code || new Date() > entry.expiresAt) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      return res.json({ success: true, message: 'OTP verified successfully' });
    }

    return res.status(400).json({ success: false, message: 'Invalid OTP' });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, code, newPassword } = req.body;

    // Try admin
    const admin = await prisma.admin.findUnique({ where: { email, isActive: true } });
    if (admin) {
      const resetRecord = await prisma.passwordReset.findFirst({
        where: { adminId: admin.id, code, used: false, expiresAt: { gt: new Date() } }
      });
      if (!resetRecord) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      const isSame = await bcrypt.compare(newPassword, admin.password);
      if (isSame) {
        return res.status(400).json({ success: false, message: 'New password must be different from current password' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.$transaction([
        prisma.admin.update({ where: { id: admin.id }, data: { password: hashed } }),
        prisma.passwordReset.update({ where: { id: resetRecord.id }, data: { used: true } }),
        prisma.passwordReset.updateMany({
          where: { adminId: admin.id, used: false, id: { not: resetRecord.id } },
          data: { used: true }
        })
      ]);

      try { await sendPasswordChangedEmail(email, admin.username, newPassword); } catch (e) {}
      return res.json({ success: true, message: 'Password reset successful. A confirmation email has been sent.' });
    }

    // Try user
    const user = await prisma.user.findFirst({ where: { email, isActive: true } });
    if (user) {
      const entry = userOtpStore.get(email);
      if (!entry || entry.code !== code || new Date() > entry.expiresAt) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame) {
        return res.status(400).json({ success: false, message: 'New password must be different from current password' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      userOtpStore.delete(email);

      try { await sendPasswordChangedEmail(email, user.username, newPassword); } catch (e) {}
      return res.json({ success: true, message: 'Password reset successful. A confirmation email has been sent.' });
    }

    return res.status(400).json({ success: false, message: 'Invalid request' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};
