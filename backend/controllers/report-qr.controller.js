import prisma from '../config/database.js';
import {
  generateSecureToken,
  hashToken,
  storeToken,
  validateTokenFull,
  disableToken,
  regenerateToken,
  getTokenByHash
} from '../services/report-qr.service.js';

/**
 * GET /api/report-qr/token/:patientTestId
 * Get QR token for a specific test (for embedding in frontend QR)
 * Returns a secure URL without exposing the token
 */
export const getQRTokenForTest = async (req, res) => {
  try {
    const { patientTestId } = req.params;

    if (!patientTestId) {
      return res.status(400).json({
        success: false,
        message: 'patientTestId is required'
      });
    }

    // Check if token exists
    const tokenRecord = await prisma.reportQRToken.findUnique({
      where: { patientTestId: parseInt(patientTestId) }
    });

    if (!tokenRecord || tokenRecord.isDisabled) {
      return res.status(404).json({
        success: false,
        message: 'No active QR token found for this report'
      });
    }

    res.json({
      success: true,
      data: {
        patientTestId: tokenRecord.patientTestId,
        tokenExists: true,
        createdAt: tokenRecord.createdAt,
        expiresAt: tokenRecord.expiresAt
      }
    });
  } catch (error) {
    console.error('Error getting QR token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get QR token',
      error: error.message
    });
  }
};

/**
 * POST /api/report-qr/generate
 * Generate secure QR token for finalized report
 * Can be called manually or automatically when report is finalized
 */
export const generateQRToken = async (req, res) => {
  try {
    const { patientTestId } = req.body;

    if (!patientTestId) {
      return res.status(400).json({
        success: false,
        message: 'patientTestId is required'
      });
    }

    // Verify patient test exists and is finalized
    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) },
      include: { patient: true }
    });

    if (!patientTest) {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    // Check if report is finalized - Accept finalized statuses
    const finalizedStatuses = ['Completed', 'Report Generated', 'Authorized', 'Delivered'];
    if (!finalizedStatuses.includes(patientTest.status)) {
      return res.status(400).json({
        success: false,
        message: `Report must be finalized before generating QR code. Current status: ${patientTest.status}`
      });
    }

    // Check if token already exists and is active
    const existingToken = await prisma.reportQRToken.findUnique({
      where: { patientTestId: parseInt(patientTestId) }
    });

    if (existingToken && !existingToken.isDisabled) {
      // Token already exists and is active - return it
      return res.json({
        success: true,
        message: 'QR token already exists for this report',
        token: null, // We don't return the hash, but confirm it exists
        patientTestId,
        tokenExists: true,
        createdAt: existingToken.createdAt
      });
    }

    // Generate secure token
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);

    // Store token in database
    const storedToken = await storeToken(parseInt(patientTestId), tokenHash);

    // Return token ONLY ONCE - not returned in subsequent calls
    res.status(201).json({
      success: true,
      message: 'QR token generated successfully. Save this token - it will not be shown again.',
      token: plainToken, // Return plain token only this once
      patientTestId,
      createdAt: storedToken.createdAt,
      tokenExists: false
    });
  } catch (error) {
    console.error('Error generating QR token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR token',
      error: error.message
    });
  }
};

/**
 * GET /api/report-qr/validate/:token
 * Validate token and return report data
 * PUBLIC ENDPOINT - No authentication required
 */
export const validateQRToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    console.log('🔍 Validating QR token:', token.substring(0, 8) + '...');

    // Validate token
    const validation = await validateTokenFull(token);

    if (!validation.valid) {
      console.error('❌ Token validation failed:', validation.error);
      return res.status(401).json({
        success: false,
        message: validation.error
      });
    }

    const tokenRecord = validation.data;
    const patientTest = tokenRecord.patientTest;

    console.log('✅ Token validated for patientTestId:', patientTest.id);

    // Return report data (same as qr-scan endpoint but with token validation)
    res.json({
      success: true,
      data: {
        report: {
          patientTestId: patientTest.id,
          patientId: patientTest.patientId,
          visitId: patientTest.visitId,
          testName: patientTest.test?.name,
          testId: patientTest.testId,
          status: patientTest.status,
          visitDate: patientTest.visitDate,
          sampleBarcodeNo: patientTest.sampleBarcodeNo,
          referralDoctor: patientTest.referralDoctor,
          department: patientTest.department?.name,
          sampleType: patientTest.sample,
          patientHistory: patientTest.patient_history,
          comments: patientTest.comments
        },
        patient: {
          patientId: patientTest.patient?.patientId,
          firstName: patientTest.patient?.firstName,
          lastName: patientTest.patient?.lastName,
          dob: patientTest.patient?.dob,
          age: patientTest.patient?.ageYears,
          ageMonths: patientTest.patient?.ageMonths,
          ageDays: patientTest.patient?.ageDays,
          gender: patientTest.patient?.gender,
          mobile: patientTest.patient?.mobile,
          email: patientTest.patient?.email,
          address: patientTest.patient?.address
        },
        results: patientTest.testResults?.map(result => ({
          resultId: result.id,
          parameterId: result.testParameterId,
          parameterName: result.testParameter?.parameterName,
          categoryName: result.testCategory?.categoryName,
          numericValue: result.numericValue,
          textValue: result.textValue,
          selectedOption: result.selectedOption,
          isHighlighted: result.isHighlighted,
          enteredAt: result.enteredAt,
          verifiedAt: result.verifiedAt,
          unit: result.testParameter?.unit
        })) || [],
        tokenInfo: {
          accessCount: tokenRecord.accessCount,
          lastAccessedAt: tokenRecord.lastAccessedAt,
          createdAt: tokenRecord.createdAt,
          expiresAt: tokenRecord.expiresAt
        },
        verified: true,
        verificationBadge: '✓ Verified Report'
      }
    });
  } catch (error) {
    console.error('Error validating QR token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate QR token',
      error: error.message
    });
  }
};

/**
 * POST /api/report-qr/invalidate/:patientTestId
 * Disable QR access for a specific report
 */
export const invalidateQRToken = async (req, res) => {
  try {
    const { patientTestId } = req.params;

    if (!patientTestId) {
      return res.status(400).json({
        success: false,
        message: 'patientTestId is required'
      });
    }

    // Verify patient test exists
    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) }
    });

    if (!patientTest) {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    // Check if token exists
    const tokenRecord = await prisma.reportQRToken.findUnique({
      where: { patientTestId: parseInt(patientTestId) }
    });

    if (!tokenRecord) {
      return res.status(404).json({
        success: false,
        message: 'No QR token found for this report'
      });
    }

    // Disable the token
    await disableToken(parseInt(patientTestId));

    res.json({
      success: true,
      message: 'QR code access has been disabled for this report'
    });
  } catch (error) {
    console.error('Error invalidating QR token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate QR token',
      error: error.message
    });
  }
};

/**
 * PUT /api/report-qr/regenerate/:patientTestId
 * Create new token for same report
 */
export const regenerateQRToken = async (req, res) => {
  try {
    const { patientTestId } = req.params;

    if (!patientTestId) {
      return res.status(400).json({
        success: false,
        message: 'patientTestId is required'
      });
    }

    // Verify patient test exists
    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) }
    });

    if (!patientTest) {
      return res.status(404).json({
        success: false,
        message: 'Patient test not found'
      });
    }

    // Check if token exists
    const existingToken = await prisma.reportQRToken.findUnique({
      where: { patientTestId: parseInt(patientTestId) }
    });

    if (!existingToken) {
      return res.status(404).json({
        success: false,
        message: 'No QR token found for this report'
      });
    }

    // Generate new token
    const newPlainToken = generateSecureToken();
    const newTokenHash = hashToken(newPlainToken);

    // Regenerate token in database
    const updatedToken = await regenerateToken(
      parseInt(patientTestId),
      newTokenHash
    );

    res.json({
      success: true,
      message: 'QR token regenerated successfully. Save this new token - it will not be shown again.',
      token: newPlainToken,
      patientTestId,
      regeneratedAt: updatedToken.createdAt
    });
  } catch (error) {
    console.error('Error regenerating QR token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate QR token',
      error: error.message
    });
  }
};

/**
 * GET /api/report-qr/info/:patientTestId
 * Get QR token information (admin/staff only)
 */
export const getQRTokenInfo = async (req, res) => {
  try {
    const { patientTestId } = req.params;

    if (!patientTestId) {
      return res.status(400).json({
        success: false,
        message: 'patientTestId is required'
      });
    }

    const tokenRecord = await prisma.reportQRToken.findUnique({
      where: { patientTestId: parseInt(patientTestId) }
    });

    if (!tokenRecord) {
      return res.status(404).json({
        success: false,
        message: 'No QR token found for this report'
      });
    }

    res.json({
      success: true,
      data: {
        patientTestId: tokenRecord.patientTestId,
        isDisabled: tokenRecord.isDisabled,
        accessCount: tokenRecord.accessCount,
        lastAccessedAt: tokenRecord.lastAccessedAt,
        createdAt: tokenRecord.createdAt,
        expiresAt: tokenRecord.expiresAt
      }
    });
  } catch (error) {
    console.error('Error getting QR token info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get QR token info',
      error: error.message
    });
  }
};
