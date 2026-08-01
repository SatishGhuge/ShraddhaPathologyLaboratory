/**
 * Barcode utilities for parsing and extracting visitId + sampleId
 * Barcode format: "20250801000-1"
 * visitId: "20250801000" (date + sequential number)
 * sampleId: "1" (sample type ID)
 */

/**
 * Parse barcode and extract visitId + sampleId
 * @param {string} barcode - Full barcode value (e.g., "20250801000-1")
 * @returns {Object|null} - { visitId, sampleId } or null if invalid
 */
export const parseBarcodeData = (barcode) => {
  try {
    if (!barcode || typeof barcode !== 'string') {
      return null;
    }

    // Remove whitespace
    barcode = barcode.trim();

    // Split by "-" delimiter
    const parts = barcode.split('-');

    if (parts.length < 2) {
      return null;
    }

    const visitId = parts[0].trim();
    const sampleId = parts[1].trim();

    // Validate both parts exist and are not empty
    if (!visitId || !sampleId) {
      return null;
    }

    return {
      visitId: visitId,      // e.g., "20250801000"
      sampleId: sampleId,    // e.g., "1"
      barcode: barcode,
      extractedAt: new Date()
    };
  } catch (error) {
    console.error('Error parsing barcode:', error);
    return null;
  }
};

/**
 * Handle partial/incomplete barcode scans (sensitivity feature)
 * If barcode is incomplete, try to find matching complete barcode
 * @param {string} partialBarcode - Partial barcode value
 * @param {Object} prisma - Prisma client
 * @returns {string|null} - Full barcode if found
 */
export const findPartialBarcodeMatch = async (partialBarcode, prisma) => {
  try {
    if (!partialBarcode || partialBarcode.length < 5) {
      return null;
    }

    // Search for barcodes starting with partial input
    const test = await prisma.patientTest.findFirst({
      where: {
        sampleBarcodeNo: {
          startsWith: partialBarcode
        }
      },
      select: {
        sampleBarcodeNo: true
      }
    });

    return test ? test.sampleBarcodeNo : null;
  } catch (error) {
    console.error('Error finding partial barcode match:', error);
    return null;
  }
};

/**
 * Validate barcode format
 * @param {string} barcode - Barcode to validate
 * @returns {boolean} - True if valid format
 */
export const isValidBarcodeFormat = (barcode) => {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  // Check for dash delimiter
  if (!barcode.includes('-')) {
    return false;
  }

  const parts = barcode.split('-');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
};
