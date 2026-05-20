import prisma from '../config/database.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

// Create new patient with tests OR add tests to existing patient
export const createPatient = async (req, res) => {
  try {
    const { 
      // Existing patient ID (if this is an existing patient)
      existingPatientId,
      // Patient Identity
      title, firstName, lastName, dob, age, gender, mobile, email,
      createdBy, createdAtLocation, address,
      // Registration Details (will be saved with each test)
      visitType, reportMode, referralDoctor, visitDate, visitTime,
      sampleTaken, sampleReceived, sampleBarcodeNo, remarks,
      // Billing Details (will be saved with each test)
      totalAmount, discountPercent, discountAmount, discountRemark,
      paidAmount, balanceAmount, paymentMode, businessType,
      // Tests
      tests 
    } = req.body;

    let patient;
    let isExistingPatient = false;

    // Check if patient already exists based on name + mobile combination
    // This is the key logic: same name + same mobile = same patient
    if (!existingPatientId && mobile && firstName) {
      const fullName = `${firstName} ${lastName || ''}`.trim().toLowerCase();
      
      // Search for existing patient with same mobile and name
      const existingPatients = await prisma.patient.findMany({
        where: { mobile: mobile }
      });
      
      // Check if any patient has the same name
      const matchingPatient = existingPatients.find(p => {
        const existingName = `${p.firstName} ${p.lastName || ''}`.trim().toLowerCase();
        return existingName === fullName;
      });
      
      if (matchingPatient) {
        // Found existing patient with same name + mobile
        isExistingPatient = true;
        patient = matchingPatient;
        console.log(`✅ Found existing patient: ${patient.patientId} (${patient.firstName} ${patient.lastName})`);
      }
    }

    // Check if this is an explicitly selected existing patient
    if (existingPatientId) {
      // Get the existing patient
      const existingPatient = await prisma.patient.findUnique({
        where: { patientId: existingPatientId }
      });
      
      if (!existingPatient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
      
      isExistingPatient = true;
      patient = existingPatient;
    }

    if (isExistingPatient && patient) {
      // Add tests to existing patient with NEW Visit ID
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2);
      const visitDatePrefix = `V${month}${day}${year}`;
      
      // Find the last visit created today
      const lastVisitToday = await prisma.patientTest.findFirst({
        where: {
          visitId: {
            startsWith: visitDatePrefix
          }
        },
        orderBy: { visitId: 'desc' }
      });
      
      let visitSequenceNumber = 1;
      if (lastVisitToday) {
        const lastVisitSequence = parseInt(lastVisitToday.visitId.slice(-5));
        visitSequenceNumber = lastVisitSequence + 1;
      }
      
      // Generate new Visit ID for this visit
      const visitId = `${visitDatePrefix}${String(visitSequenceNumber).padStart(5, '0')}`;
      
      const testCount = tests?.length || 1;
      const perTestPaid = parseFloat(paidAmount) || 0;
      const perTestBalance = parseFloat(balanceAmount) || 0;
      await prisma.patientTest.createMany({
        data: tests?.map(test => ({
          patientId: patient.patientId,
          visitId,
          testId: test.id,
          departmentId: test.departmentId,
          sample: test.sample,
          charge: parseFloat(test.charge),
          visitType,
          reportMode,
          referralDoctor,
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          visitTime,
          sampleTaken: sampleTaken ? new Date(sampleTaken) : null,
          sampleReceived: sampleReceived ? new Date(sampleReceived) : null,
          sampleBarcodeNo,
          remarks,
          totalAmount: parseFloat(test.charge),
          discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
          discountAmount: discountAmount ? parseFloat(discountAmount) / testCount : 0,
          discountRemark,
          paidAmount: perTestPaid,
          balanceAmount: perTestBalance,
          paymentMode,
          businessType,
          packageName: test.packageName || null
        })) || []
      });

      // Get updated patient with all tests
      patient = await prisma.patient.findUnique({
        where: { patientId: patient.patientId },
        include: { 
          tests: {
            include: {
              test: true,
              department: true
            }
          }
        }
      });

    } else {
      // Create new patient with date-based ID: P + MM + DD + YY + 00001
      // Example: P031226000001 (March 12, 2026, patient #1)
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0'); // 03
      const day = String(today.getDate()).padStart(2, '0'); // 12
      const year = String(today.getFullYear()).slice(-2); // 26 (from 2026)
      const datePrefix = `P${month}${day}${year}`; // e.g., P031226 for March 12, 2026
      
      // Find the last patient created today with this date prefix
      const lastPatientToday = await prisma.patient.findFirst({
        where: {
          patientId: {
            startsWith: datePrefix
          }
        },
        orderBy: { patientId: 'desc' }
      });
      
      // Generate sequential number for today
      let sequenceNumber = 1;
      if (lastPatientToday) {
        // Extract the last 5 digits and increment
        const lastSequence = parseInt(lastPatientToday.patientId.slice(-5));
        sequenceNumber = lastSequence + 1;
      }
      
      // Format: P + MM + DD + YY + 00001
      // Example: P03122600001 (March 12, 2026, patient #1)
      const patientId = `${datePrefix}${String(sequenceNumber).padStart(5, '0')}`;

      // Generate Visit ID with same format but V prefix
      // Visit ID is unique for each registration/visit
      const visitDatePrefix = `V${month}${day}${year}`;
      
      // Find the last visit created today
      const lastVisitToday = await prisma.patientTest.findFirst({
        where: {
          visitId: {
            startsWith: visitDatePrefix
          }
        },
        orderBy: { visitId: 'desc' }
      });
      
      let visitSequenceNumber = 1;
      if (lastVisitToday) {
        const lastVisitSequence = parseInt(lastVisitToday.visitId.slice(-5));
        visitSequenceNumber = lastVisitSequence + 1;
      }
      
      // Format: V + MM + DD + YY + 00001
      // Example: V03122600001 (March 12, 2026, visit #1)
      const visitId = `${visitDatePrefix}${String(visitSequenceNumber).padStart(5, '0')}`;

      const testCount = tests?.length || 1;
      const perTestPaid = parseFloat(paidAmount) || 0;
      const perTestBalance = parseFloat(balanceAmount) || 0;

      patient = await prisma.patient.create({
        data: {
          patientId, // String primary key (P format)
          // Patient Identity ONLY
          title,
          firstName,
          lastName,
          dob: dob ? new Date(dob) : null,
          age: age ? parseInt(age) : null,
          gender,
          mobile,
          email,
          createdBy,
          createdAtLocation,
          address,
          // Tests with registration & billing details
          tests: {
            create: tests?.map(test => ({
              visitId,
              testId: test.id,
              departmentId: test.departmentId,
              sample: test.sample,
              charge: parseFloat(test.charge),
              visitType,
              reportMode,
              referralDoctor,
              visitDate: visitDate ? new Date(visitDate) : new Date(),
              visitTime,
              sampleTaken: sampleTaken ? new Date(sampleTaken) : null,
              sampleReceived: sampleReceived ? new Date(sampleReceived) : null,
              sampleBarcodeNo,
              remarks,
              totalAmount: parseFloat(test.charge),
              discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
              discountAmount: discountAmount ? parseFloat(discountAmount) / testCount : 0,
              discountRemark,
              paidAmount: perTestPaid,
              balanceAmount: perTestBalance,
              paymentMode,
              businessType,
              packageName: test.packageName || null
            })) || []
          }
        },
        include: {
          tests: {
            include: {
              test: true,
              department: true
            }
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: isExistingPatient 
        ? `Tests added to existing patient (${patient.patientId})` 
        : 'New patient registered successfully',
      data: patient,
      isExistingPatient: isExistingPatient
    });

  } catch (error) {
    console.error('Create patient error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to register patient',
      error: error.message,
      details: error.meta || error.code || 'Unknown error'
    });
  }
};

// Get all patients
export const getAllPatients = async (req, res) => {
  try {
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get total count
    const total = await prisma.patient.count();

    // Get paginated patients
    const patients = await prisma.patient.findMany({
      include: {
        tests: {
          include: {
            test: true,
            department: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(patients, total, page, limit));

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients'
    });
  }
};

// Get patient by ID
export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { patientId: id }, // Use patientId (String) as primary key
      include: {
        tests: {
          include: {
            test: true,
            department: true
          }
        }
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
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient'
    });
  }
};

// Search ALL patients by mobile or email
export const searchPatient = async (req, res) => {
  try {
    const { mobile, email } = req.query;
    
    console.log('🔍 Search patient request:', { mobile, email });

    if (!mobile && !email) {
      return res.status(400).json({
        success: false,
        message: 'Mobile or email is required'
      });
    }

    // Build search condition
    const where = {};
    if (mobile) where.mobile = { startsWith: mobile };
    if (email) where.email = email;
    
    console.log('🔍 Search where condition:', where);

    // Find ALL patients with this mobile/email
    const patients = await prisma.patient.findMany({
      where,
      include: {
        tests: {
          include: {
            test: true,
            department: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Get last 5 tests per patient
        }
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      }
    });
    
    console.log(`✅ Found ${patients.length} patient(s)`);

    if (!patients || patients.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No existing patients found'
      });
    }

    res.json({
      success: true,
      data: patients, // Return array of all matching patients
      count: patients.length,
      message: `Found ${patients.length} patient(s)`
    });

  } catch (error) {
    console.error('Search patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search patient',
      error: error.message
    });
  }
};

// Update patient demographics
export const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { title, firstName, lastName, dob, age, gender, mobile, email, address } = req.body;

    const existing = await prisma.patient.findUnique({ where: { patientId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Patient not found' });

    const updated = await prisma.patient.update({
      where: { patientId },
      data: {
        title:     title     || undefined,
        firstName: firstName || undefined,
        lastName:  lastName  !== undefined ? lastName  : undefined,
        dob:       dob       ? new Date(dob) : null,
        age:       age       ? parseInt(age) : undefined,
        gender:    gender    || undefined,
        mobile:    mobile    !== undefined ? mobile  : undefined,
        email:     email     !== undefined ? email   : undefined,
        address:   address   !== undefined ? address : undefined,
      }
    });

    res.json({ success: true, message: 'Patient updated successfully', data: updated });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ success: false, message: 'Failed to update patient' });
  }
};

// Update payment for a patient visit (all tests sharing the same visitId)
export const updatePayment = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { visitId, paymentAmount, paymentMode, discountAmount, discountPercent, discountRemark } = req.body;

    if (!visitId || paymentAmount === undefined) {
      return res.status(400).json({ success: false, message: 'visitId and paymentAmount are required' });
    }

    // Get all PatientTest rows for this patient + visitId to recalculate
    const rows = await prisma.patientTest.findMany({
      where: { patientId, visitId }
    });

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No records found for this visit' });
    }

    const firstRow = rows[0];
    
    // Calculate total amount by summing all test charges for this visit
    const totalAmount = rows.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
    
    const existingPaid  = firstRow.paidAmount     || 0;
    const discount      = parseFloat(discountAmount) || 0;
    const payment       = parseFloat(paymentAmount)  || 0;

    const newPaidAmount    = existingPaid + payment;
    const newBalanceAmount = Math.max(0, totalAmount - discount - newPaidAmount);

    // Update all rows for this visit
    await prisma.patientTest.updateMany({
      where: { patientId, visitId },
      data: {
        paidAmount:      newPaidAmount,
        balanceAmount:   newBalanceAmount,
        discountAmount:  discount,
        discountPercent: parseFloat(discountPercent) || firstRow.discountPercent || 0,
        discountRemark:  discountRemark || firstRow.discountRemark || '',
        paymentMode:     paymentMode || firstRow.paymentMode || 'Cash',
      }
    });

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        totalAmount:   totalAmount,
        paidAmount:    newPaidAmount,
        balanceAmount: newBalanceAmount,
        fullyPaid:     newBalanceAmount === 0
      }
    });

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment', error: error.message });
  }
};

// Get patient statistics for dashboard
export const getPatientStatistics = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.createdAt = { gte: start, lte: end };
    } else if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      dateFilter.createdAt = { gte: start };
    } else if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.createdAt = { lte: end };
    }

    // Get total registered patients count
    const totalPatients = await prisma.patient.count({
      where: dateFilter
    });

    res.json({
      success: true,
      data: {
        total: totalPatients,
        registered: totalPatients
      }
    });

  } catch (error) {
    console.error('Get patient statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient statistics'
    });
  }
};