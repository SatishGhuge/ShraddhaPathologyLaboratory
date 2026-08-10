import QRCode from 'qrcode';
import { generateSecureToken, hashToken, storeToken } from './report-qr.service.js';

/**
 * Service for integrating QR codes into PDF reports
 */

/**
 * Generate QR code image and token for a finalized report
 * @param {number} patientTestId - Patient test ID
 * @param {string} baseUrl - Base URL for QR code link
 * @returns {Promise<Object>} - Contains token and QR code data URL
 */
export const generateQRCodeForReport = async (patientTestId, baseUrl = 'http://localhost:3000') => {
  try {
    // Generate secure token
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);

    // Store token in database
    const storedToken = await storeToken(patientTestId, tokenHash);

    // Generate QR code
    const reportUrl = `${baseUrl}/report/${plainToken}`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(reportUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      success: true,
      token: plainToken,
      tokenHash,
      qrCodeDataUrl,
      reportUrl,
      createdAt: storedToken.createdAt
    };
  } catch (error) {
    console.error('Error generating QR code for report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get QR code image for existing token
 * @param {string} plainToken - Plain text token
 * @param {string} baseUrl - Base URL for QR code link
 * @returns {Promise<Object>} - Contains QR code data URL and report URL
 */
export const getQRCodeImage = async (plainToken, baseUrl = 'http://localhost:3000') => {
  try {
    if (!plainToken) {
      throw new Error('Token is required');
    }

    const reportUrl = `${baseUrl}/report/${plainToken}`;

    const qrCodeDataUrl = await QRCode.toDataURL(reportUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      success: true,
      qrCodeDataUrl,
      reportUrl
    };
  } catch (error) {
    console.error('Error getting QR code image:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create HTML for embedding QR code in PDF
 * @param {string} qrCodeDataUrl - Data URL of QR code image
 * @param {number} patientTestId - Patient test ID
 * @param {Object} options - Additional options
 * @returns {string} - HTML markup for QR code section
 */
export const createQRCodeHTML = (
  qrCodeDataUrl,
  patientTestId,
  options = {}
) => {
  const { 
    title = 'Verified Report',
    subtitle = 'Scan to view online',
    width = '150px',
    alignment = 'right'
  } = options;

  const alignmentClass = alignment === 'left' ? 'text-left' : alignment === 'center' ? 'text-center' : 'text-right';

  return `
    <div style="
      ${alignment === 'left' ? 'float: left; margin-right: 20px;' : alignment === 'center' ? 'margin: 0 auto; width: fit-content;' : 'float: right; margin-left: 20px;'}
      text-align: center;
      margin-bottom: 15px;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 8px;
      background-color: #f9f9f9;
    ">
      <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #333;">
        ${title}
      </div>
      <img 
        src="${qrCodeDataUrl}" 
        alt="Report QR Code" 
        style="
          width: ${width};
          height: ${width};
          border: 2px solid #007bff;
          border-radius: 4px;
          margin-bottom: 8px;
        "
      />
      <div style="font-size: 10px; color: #666; margin-top: 8px;">
        ${subtitle}
      </div>
      <div style="font-size: 9px; color: #999; margin-top: 4px;">
        ID: ${patientTestId}
      </div>
    </div>
  `;
};

/**
 * Create verification badge HTML
 * @param {Object} options - Badge options
 * @returns {string} - HTML markup for verification badge
 */
export const createVerificationBadgeHTML = (options = {}) => {
  const {
    title = 'VERIFIED REPORT',
    subtitle = 'Secured with QR Code Authentication',
    showCheckmark = true
  } = options;

  return `
    <div style="
      border-left: 4px solid #28a745;
      padding: 12px 15px;
      background-color: #f0f9f6;
      margin-bottom: 15px;
      border-radius: 4px;
    ">
      <div style="display: flex; align-items: center;">
        ${showCheckmark ? `
          <div style="
            width: 24px;
            height: 24px;
            background-color: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            flex-shrink: 0;
          ">
            <span style="color: white; font-weight: bold; font-size: 14px;">✓</span>
          </div>
        ` : ''}
        <div>
          <div style="font-weight: bold; color: #28a745; font-size: 13px;">
            ${title}
          </div>
          <div style="color: #666; font-size: 11px; margin-top: 2px;">
            ${subtitle}
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Prepare QR code metadata for PDF
 * @param {number} patientTestId - Patient test ID
 * @param {string} token - QR token
 * @returns {Object} - Metadata object
 */
export const prepareQRMetadata = (patientTestId, token) => {
  return {
    patientTestId,
    tokenHash: token, // This would be hashed in real scenario
    generatedAt: new Date().toISOString(),
    verificationUrl: `/report/${token}`,
    accessibleVia: 'QR code or direct URL'
  };
};

export default {
  generateQRCodeForReport,
  getQRCodeImage,
  createQRCodeHTML,
  createVerificationBadgeHTML,
  prepareQRMetadata
};
