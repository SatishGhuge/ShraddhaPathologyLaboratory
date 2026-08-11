import QRCode from 'qrcode';

/**
 * Generate QR code for report verification
 * @param token - The secure QR token
 * @param baseUrl - The base URL of the application
 * @returns Data URL of the QR code
 */
export const generateReportQRCode = async (
  token: string,
  baseUrl: string = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
): Promise<string> => {
  try {
    const reportUrl = `${baseUrl}/report/${token}`;
    
    const qrCode = await QRCode.toDataURL(reportUrl, {
      errorCorrectionLevel: 'H', // High error correction
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCode;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as canvas element
 * @param token - The secure QR token
 * @param baseUrl - The base URL of the application
 * @returns Canvas element containing QR code
 */
export const generateReportQRCodeCanvas = async (
  token: string,
  baseUrl: string = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
): Promise<HTMLCanvasElement> => {
  try {
    const reportUrl = `${baseUrl}/report/${token}`;
    
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, reportUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return canvas;
  } catch (error) {
    console.error('Error generating QR code canvas:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as blob
 * @param token - The secure QR token
 * @param baseUrl - The base URL of the application
 * @returns Blob of the QR code image
 */
export const generateReportQRCodeBlob = async (
  token: string,
  baseUrl: string = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
): Promise<Blob> => {
  try {
    const reportUrl = `${baseUrl}/report/${token}`;
    
    const blob = await QRCode.toBlob(reportUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    if (!blob) {
      throw new Error('Failed to generate QR code blob');
    }

    return blob;
  } catch (error) {
    console.error('Error generating QR code blob:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Extract token from QR code URL
 * @param url - The URL from QR code
 * @returns The extracted token or null
 */
export const extractTokenFromURL = (url: string): string | null => {
  try {
    const match = url.match(/\/report\/([a-f0-9]+)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting token from URL:', error);
    return null;
  }
};

/**
 * Validate token format (32 bytes = 64 hex characters)
 * @param token - The token to validate
 * @returns True if token format is valid
 */
export const isValidTokenFormat = (token: string): boolean => {
  // Should be 64 hex characters (32 bytes)
  return /^[a-f0-9]{64}$/.test(token);
};
