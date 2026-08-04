/**
 * Barcode utilities for parsing and extracting visitId + sampleId
 * Barcode format: "20260729001-1"
 * visitId: "20260729001" (11 digits - date + sequential number)
 * sampleId: "1" (1-2 digits - sample type ID)
 * 
 * SENSITIVE SCANNING: Can handle partial barcodes
 * - "20260729001" → visitId only (incomplete)
 * - "20260729001-1" → complete (visitId-sampleId)
 */

/**
 * Parse barcode and extract visitId + sampleId (handles complete and partial scans)
 * @param {string} barcode - Barcode value (e.g., "20260729001-1" or partial "20260729")
 * @returns {Object|null} - { visitId, sampleId } or null if invalid
 */
export const parseBarcodeData = (barcode) => {
  try {
    if (!barcode || typeof barcode !== 'string') {
      return null;
    }

    // Remove whitespace
    barcode = barcode.trim();

    // CASE 1: Complete barcode with dash (e.g., "20260729001-1")
    if (barcode.includes('-')) {
      const parts = barcode.split('-');
      
      if (parts.length >= 2) {
        const visitId = parts[0].trim();
        const sampleId = parts[1].trim();

        // Validate both parts exist and are not empty
        if (visitId && sampleId) {
          return {
            visitId: visitId,      // e.g., "20260729001"
            sampleId: sampleId,    // e.g., "1"
            barcode: barcode,
            extractedAt: new Date(),
            isComplete: true
          };
        }
      }
    }

    // CASE 2: Partial barcode (only digits, no dash)
    // Expected format: 11-12 digits for visitId, then 1-2 digits for sampleId
    // Total: 12-14 digits expected
    // If we have at least 11 digits, try to extract visitId + sampleId
    if (/^\d+$/.test(barcode) && barcode.length >= 11) {
      // Take first 11 digits as visitId, rest as sampleId
      const visitId = barcode.substring(0, 11);
      const sampleId = barcode.substring(11) || '1'; // Default to '1' if no sample ID
      
      // Only return if we have valid parts
      if (visitId) {
        return {
          visitId: visitId,      // e.g., "20260729001"
          sampleId: sampleId,    // e.g., "1" or from remaining digits
          barcode: barcode,
          extractedAt: new Date(),
          isComplete: barcode.length >= 12 // Mark as complete if we have sample ID
        };
      }
    }

    // CASE 3: Partial scan (less than expected, but still numeric)
    // Return null for very short sequences
    if (/^\d+$/.test(barcode) && barcode.length < 11) {
      console.warn('⚠️ Partial barcode detected (too short):', barcode);
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error parsing barcode:', error);
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
