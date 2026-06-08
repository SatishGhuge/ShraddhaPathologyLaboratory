import prisma from '../config/database.js';

/**
 * Generates Patient ID in format: S + YY + MM + 00001
 * Example: S260600001 (1st patient in June 2026)
 */
export const generatePatientId = async () => {
  try {
    const today = new Date();
    const year = String(today.getFullYear()).slice(-2); // 26 for 2026
    const month = String(today.getMonth() + 1).padStart(2, '0'); // 06 for June
    
    const prefix = `S${year}${month}`; // S2606
    
    // Find the last patient created in this month
    const lastPatient = await prisma.patient.findFirst({
      where: {
        patientId: {
          startsWith: prefix
        }
      },
      orderBy: { patientId: 'desc' }
    });
    
    // Generate sequential number
    let sequenceNumber = 1;
    if (lastPatient) {
      // Extract last 5 digits and increment
      const lastSequence = parseInt(lastPatient.patientId.slice(-5));
      sequenceNumber = lastSequence + 1;
    }
    
    const patientId = `${prefix}${String(sequenceNumber).padStart(5, '0')}`;
    console.log(`✅ Generated Patient ID: ${patientId}`);
    return patientId;
  } catch (error) {
    console.error('Error generating patient ID:', error);
    throw error;
  }
};

/**
 * Generates Visit ID in format: YYYYMMDD + 0001
 * Example: 2606080001 (1st visit on June 8, 2026)
 * 
 * For same patient, same date: counter increments (0002, 0003, etc.)
 * For same patient, different date: counter resets or continues based on daily logic
 */
export const generateVisitId = async (visitDate = null) => {
  try {
    const today = visitDate ? new Date(visitDate) : new Date();
    const year = String(today.getFullYear()); // 2026
    const month = String(today.getMonth() + 1).padStart(2, '0'); // 06
    const day = String(today.getDate()).padStart(2, '0'); // 08
    
    const datePrefix = `${year}${month}${day}`; // 20260608
    
    // Find the last visit created on this date
    const lastVisit = await prisma.patientTest.findFirst({
      where: {
        visitId: {
          startsWith: datePrefix
        }
      },
      orderBy: { visitId: 'desc' }
    });
    
    // Generate sequential number
    let sequenceNumber = 1;
    if (lastVisit) {
      // Extract last 4 digits and increment
      const lastSequence = parseInt(lastVisit.visitId.slice(-4));
      sequenceNumber = lastSequence + 1;
    }
    
    const visitId = `${datePrefix}${String(sequenceNumber).padStart(4, '0')}`;
    console.log(`✅ Generated Visit ID: ${visitId}`);
    return visitId;
  } catch (error) {
    console.error('Error generating visit ID:', error);
    throw error;
  }
};

/**
 * Get next sequence number for a specific date prefix
 * Useful for batch operations
 */
export const getNextSequenceForDate = async (datePrefix) => {
  try {
    const lastVisit = await prisma.patientTest.findFirst({
      where: {
        visitId: {
          startsWith: datePrefix
        }
      },
      orderBy: { visitId: 'desc' }
    });
    
    if (!lastVisit) return 1;
    
    const lastSequence = parseInt(lastVisit.visitId.slice(-4));
    return lastSequence + 1;
  } catch (error) {
    console.error('Error getting next sequence:', error);
    return 1;
  }
};
