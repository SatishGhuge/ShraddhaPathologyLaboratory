import crypto from 'crypto';
import prisma from '../config/database.js';

/**
 * Generate a secure random token (32 bytes)
 * @returns {string} - Hex-encoded random token
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a token using SHA-256
 * @param {string} token - Plain text token
 * @returns {string} - SHA-256 hash of token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Validate token by comparing plain token with stored hash
 * @param {string} plainToken - Plain text token
 * @param {string} hashedToken - Stored hash
 * @returns {boolean} - True if tokens match
 */
export const validateToken = (plainToken, hashedToken) => {
  const tokenHash = hashToken(plainToken);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash),
    Buffer.from(hashedToken)
  );
};

/**
 * Store QR token in database
 * @param {number} patientTestId - Patient test ID
 * @param {string} tokenHash - SHA-256 hash of token
 * @param {Date} expiresAt - Expiration date (optional, null for no expiry)
 * @returns {Promise<Object>} - Stored token record
 */
export const storeToken = async (patientTestId, tokenHash, expiresAt = null) => {
  try {
    // Check if token already exists for this test
    const existingToken = await prisma.reportQRToken.findUnique({
      where: { patientTestId }
    });

    if (existingToken) {
      throw new Error('QR token already exists for this report. Use regenerate endpoint to create a new one.');
    }

    const token = await prisma.reportQRToken.create({
      data: {
        reportQRTokenHash: tokenHash,
        patientTestId,
        expiresAt,
        isDisabled: false,
        accessCount: 0
      }
    });

    return token;
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
};

/**
 * Retrieve token record by hash
 * @param {string} tokenHash - SHA-256 hash of token
 * @returns {Promise<Object>} - Token record with related data
 */
export const getTokenByHash = async (tokenHash) => {
  try {
    const token = await prisma.reportQRToken.findUnique({
      where: { reportQRTokenHash: tokenHash },
      include: {
        patientTest: {
          include: {
            patient: true,
            test: true,
            testResults: {
              include: {
                testParameter: true,
                testCategory: true
              }
            },
            department: true
          }
        }
      }
    });

    return token;
  } catch (error) {
    console.error('Error retrieving token by hash:', error);
    throw error;
  }
};

/**
 * Increment access count and update last accessed timestamp
 * @param {string} tokenHash - SHA-256 hash of token
 * @returns {Promise<Object>} - Updated token record
 */
export const incrementAccessCount = async (tokenHash) => {
  try {
    const token = await prisma.reportQRToken.update({
      where: { reportQRTokenHash: tokenHash },
      data: {
        accessCount: {
          increment: 1
        },
        lastAccessedAt: new Date()
      }
    });

    return token;
  } catch (error) {
    console.error('Error incrementing access count:', error);
    throw error;
  }
};

/**
 * Disable QR token for a patient test
 * @param {number} patientTestId - Patient test ID
 * @returns {Promise<Object>} - Updated token record
 */
export const disableToken = async (patientTestId) => {
  try {
    const token = await prisma.reportQRToken.update({
      where: { patientTestId },
      data: { isDisabled: true }
    });

    return token;
  } catch (error) {
    console.error('Error disabling token:', error);
    throw error;
  }
};

/**
 * Regenerate QR token for a patient test
 * @param {number} patientTestId - Patient test ID
 * @param {string} newTokenHash - New SHA-256 hash
 * @param {Date} expiresAt - New expiration date (optional)
 * @returns {Promise<Object>} - Updated token record
 */
export const regenerateToken = async (patientTestId, newTokenHash, expiresAt = null) => {
  try {
    const token = await prisma.reportQRToken.update({
      where: { patientTestId },
      data: {
        reportQRTokenHash: newTokenHash,
        expiresAt,
        accessCount: 0,
        lastAccessedAt: null,
        isDisabled: false
      }
    });

    return token;
  } catch (error) {
    console.error('Error regenerating token:', error);
    throw error;
  }
};

/**
 * Validate token and check all conditions
 * @param {string} plainToken - Plain text token
 * @returns {Promise<Object>} - Token validation result with status and data
 */
export const validateTokenFull = async (plainToken) => {
  try {
    const tokenHash = hashToken(plainToken);
    const tokenRecord = await getTokenByHash(tokenHash);

    if (!tokenRecord) {
      return {
        valid: false,
        error: 'Invalid or expired token'
      };
    }

    if (tokenRecord.isDisabled) {
      return {
        valid: false,
        error: 'This QR code has been disabled'
      };
    }

    if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
      return {
        valid: false,
        error: 'This QR code has expired'
      };
    }

    // Increment access count
    await incrementAccessCount(tokenHash);

    return {
      valid: true,
      data: tokenRecord
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return {
      valid: false,
      error: 'Token validation failed'
    };
  }
};

/**
 * Clean up expired tokens (for periodic maintenance)
 * @returns {Promise<Object>} - Number of deleted records
 */
export const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.reportQRToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    throw error;
  }
};
