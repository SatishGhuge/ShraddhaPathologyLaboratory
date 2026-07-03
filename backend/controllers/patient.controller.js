import prisma from '../config/database.js';
import { validationResult } from 'express-validator';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { generatePatientId, generateVisitId } from '../utils/idGenerator.js';

// Create new patient with tests OR add tests to existing patient
export const createPatient = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    console.log('📝 Creating patient with data:', {
      firstName: req.body.firstName,
      mobile: req.body.mobile,
      testsCount: req.body.tests?.length || 0,
      businessType: req.body.businessType
    });

    const { 
      // Existing patient ID (if this is an existing patient)
      existingPatientId,
      // Patient Identity
      title, firstName, lastName, dob, age, gender, mobile, email,
      createdBy, createdAtLocation, address, location,
      // Registration Details (will be saved with each test)
      visitType, reportMode, referralDoctor, visitDate, visitTime,
      sampleTaken, sampleReceived, sampleBarcodeNo, patient_history,
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
        console.log(`✅ Found EXISTING patient: ${patient.patientId} (${patient.firstName} ${patient.lastName})`);
        console.log(`📋 Adding new visit to existing patient. New Visit ID will be generated.`);
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
      const visitId = await generateVisitId(visitDate);
      
      const testCount = tests?.length || 1;
      const perTestPaid = parseFloat(paidAmount) || 0;
      const perTestBalance = parseFloat(balanceAmount) || 0;
      await prisma.patientTest.createMany({
        data: tests?.map(test => ({
          patientId: patient.patientId,
          visitId,
          testId: test.id,
          departmentId: test.departmentId,
          organizationId: req.body.organizationId || null,
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
          patient_history,
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

      // Create payment transaction if payment was made during registration
      if(paymentMode && perTestPaid > 0){
        await prisma.paymentTransaction.create({
          data: {
            visitId,
            patientId: patient.patientId,
            paymentMode,
            paymentAmount: perTestPaid,
            remarks: discountRemark || null
          }
        });
        console.log(`✅ Payment transaction created: ${paymentMode} - ₹${perTestPaid}`);
      }

      // Get updated patient with all tests
      patient = await prisma.patient.findUnique({
        where: { patientId: patient.patientId },
        include: { 
          tests: {
            include: {
              test: true,
              department: true,
              organization: true
            }
          }
        }
      });

    } else {
      // Create new patient with new ID format: S + YY + MM + 00001
      // Example: S260600001 (1st patient in June 2026)
      const patientId = await generatePatientId();
      
      // Generate Visit ID: YYYYMMDD + 0001
      // Example: 2606080001 (1st visit on June 8, 2026)
      const visitId = await generateVisitId(visitDate);

      const testCount = tests?.length || 1;
      const perTestPaid = parseFloat(paidAmount) || 0;
      const perTestBalance = parseFloat(balanceAmount) || 0;

      patient = await prisma.patient.create({
        data: {
          patientId,
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
          location,  // Add location field
          // Tests with registration & billing details
          tests: {
            create: tests?.map(test => ({
              visitId,
              testId: test.id,
              departmentId: test.departmentId,
              organizationId: req.body.organizationId || null,
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
              patient_history,
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

      // Create payment transaction if payment was made during registration
      if(paymentMode && perTestPaid > 0){
        await prisma.paymentTransaction.create({
          data: {
            visitId,
            patientId: patient.patientId,
            paymentMode,
            paymentAmount: perTestPaid,
            remarks: discountRemark || null
          }
        });
        console.log(`✅ Payment transaction created: ${paymentMode} - ₹${perTestPaid}`);
      }
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
            department: true,
            organization: true
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
            department: true,
            organization: true
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

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Build search condition
    const where = {};
    if (mobile) where.mobile = { startsWith: mobile };
    if (email) where.email = email;
    
    console.log('🔍 Search where condition:', where);

    // Get total count
    const total = await prisma.patient.count({ where });

    // Find patients with this mobile/email with pagination
    const patients = await prisma.patient.findMany({
      where,
      include: {
        tests: {
          include: {
            test: true,
            department: true,
            organization: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Get last 5 tests per patient
        }
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      },
      skip,
      take: limit
    });
    
    console.log(`✅ Found ${total} patient(s), returning page ${page}`);

    if (!patients || patients.length === 0) {
      return res.json(buildPaginatedResponse([], total, page, limit));
    }

    res.json(buildPaginatedResponse(patients, total, page, limit));

  } catch (error) {
    console.error('Search patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search patient',
      error: error.message
    });
  }
};

// Update patient test visit details (patient_history, etc.)
export const updatePatientTestDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { visitId, patient_history } = req.body;

    if (!visitId) {
      return res.status(400).json({ success: false, message: 'visitId is required' });
    }

    // Update all PatientTest records for this patient + visitId
    const updated = await prisma.patientTest.updateMany({
      where: {
        patientId: patientId,
        visitId: visitId
      },
      data: {
        patient_history: patient_history || undefined
      }
    });

    res.json({ 
      success: true, 
      message: 'Patient test details updated successfully',
      updatedCount: updated.count
    });
  } catch (error) {
    console.error('Update patient test details error:', error);
    res.status(500).json({ success: false, message: 'Failed to update patient test details' });
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

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

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
    const total = await prisma.patient.count({
      where: dateFilter
    });

    // Get paginated patients
    const patients = await prisma.patient.findMany({
      where: dateFilter,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    res.json(buildPaginatedResponse(patients, total, page, limit));

  } catch (error) {
    console.error('Get patient statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient statistics'
    });
  }
};

// Get patient location-wise statistics
export const getPatientLocationStatistics = async (req, res) => {
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

    // Get all patients with location
    const patients = await prisma.patient.findMany({
      where: dateFilter,
      select: {
        location: true,
        patientId: true,
        firstName: true,
        lastName: true
      }
    });

    // Group by location and count
    const locationStats = {};
    patients.forEach(patient => {
      const location = patient.location || 'Not Specified';
      if (!locationStats[location]) {
        locationStats[location] = 0;
      }
      locationStats[location]++;
    });

    // Convert to array and sort by count (descending)
    const locationArray = Object.entries(locationStats)
      .map(([location, count]) => ({
        location,
        count,
        percentage: ((count / patients.length) * 100).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        totalPatients: patients.length,
        locationStats: locationArray,
        topLocation: locationArray[0] || null
      }
    });

  } catch (error) {
    console.error('Get patient location statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient location statistics',
      error: error.message
    });
  }
};

// Add test to existing patient visit
export const addTestToVisit = async (req, res) => {
  try {
    const { patientId, visitId } = req.params;
    const { testId, testName, charge, sampleType, businessType } = req.body;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find existing tests for this visit to get visit details
    const existingTests = await prisma.patientTest.findMany({
      where: {
        patientId,
        visitId
      }
    });

    if (!existingTests.length) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found for this patient'
      });
    }

    const existingTest = existingTests[0];

    // Create new test entry for this visit
    const newTest = await prisma.patientTest.create({
      data: {
        patientId,
        visitId,
        testId: parseInt(testId),
        departmentId: existingTest.departmentId,
        organizationId: existingTest.organizationId || null,
        sample: sampleType || existingTest.sample,
        charge: parseFloat(charge) || 0,
        status: 'Registered',
        visitType: existingTest.visitType,
        reportMode: existingTest.reportMode,
        referralDoctor: existingTest.referralDoctor,
        visitDate: existingTest.visitDate,
        visitTime: existingTest.visitTime,
        paymentMode: existingTest.paymentMode,
        businessType: businessType || existingTest.businessType,
        totalAmount: parseFloat(charge) || 0,
        paidAmount: existingTest.paidAmount || 0,
        balanceAmount: existingTest.balanceAmount || 0,
        discountAmount: existingTest.discountAmount || 0,
        discountPercent: existingTest.discountPercent || 0,
        discountRemark: existingTest.discountRemark || '',
      }
    });

    // Recalculate balance for all tests in this visit
    const allTests = await prisma.patientTest.findMany({
      where: { patientId, visitId }
    });

    const totalAmount = allTests.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const paidAmount = existingTest.paidAmount || 0;
    const discountAmount = existingTest.discountAmount || 0;
    const newBalanceAmount = Math.max(0, totalAmount - discountAmount - paidAmount);

    // Update all tests with the new balance
    await prisma.patientTest.updateMany({
      where: { patientId, visitId },
      data: {
        balanceAmount: newBalanceAmount
      }
    });

    res.status(201).json({
      success: true,
      message: 'Test added to visit successfully',
      data: newTest
    });

  } catch (error) {
    console.error('Add test to visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add test to visit',
      error: error.message
    });
  }
};

// Create payment transaction
export const createPaymentTransaction = async (req, res) => {
  try {
    const { visitId, patientId, paymentMode, paymentAmount, remarks } = req.body;
    
    console.log('📨 createPaymentTransaction request received:');
    console.log('  visitId:', visitId);
    console.log('  patientId:', patientId);
    console.log('  paymentMode:', paymentMode);
    console.log('  paymentAmount:', paymentAmount);
    console.log('  remarks:', remarks);
    
    // Validate required fields
    if (!visitId || !patientId || !paymentMode || !paymentAmount) {
      console.error('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: visitId, patientId, paymentMode, paymentAmount'
      });
    }

    const transaction = await prisma.paymentTransaction.create({
      data: {
        visitId,
        patientId,
        paymentMode,
        paymentAmount: parseFloat(paymentAmount),
        remarks: remarks || null
      }
    });
    
    console.log('✅ Payment transaction created:', transaction.id);

    res.status(201).json({ 
      success: true, 
      message: 'Payment transaction created successfully',
      data: transaction 
    });
  } catch (error) {
    console.error('❌ Create payment transaction error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment transaction',
      error: error.message 
    });
  }
};

// Get payment transactions for a visit
export const getPaymentTransactions = async (req, res) => {
  try {
    const { visitId } = req.params;
    
    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'visitId is required'
      });
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where: { visitId },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`✅ Found ${transactions.length} payment transactions for visit ${visitId}`);

    res.json({ 
      success: true, 
      data: transactions 
    });
  } catch (error) {
    console.error('Get payment transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payment transactions',
      error: error.message 
    });
  }
};

// Get all payment transactions for a patient
export const getPatientPaymentTransactions = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId is required'
      });
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ Found ${transactions.length} payment transactions for patient ${patientId}`);

    res.json({ 
      success: true, 
      data: transactions 
    });
  } catch (error) {
    console.error('Get patient payment transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payment transactions',
      error: error.message 
    });
  }
};

// Get all patient tests with referral doctor details - optimized for referral doctor revenue report
export const getPatientTests = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get total count of patient tests
    const total = await prisma.patientTest.count();

    // Fetch patient tests with patient, test, and department details
    const patientTests = await prisma.patientTest.findMany({
      include: {
        patient: true,
        test: true,
        department: true,
        organization: true
      },
      orderBy: {
        visitDate: 'desc'
      },
      skip,
      take: limit
    });

    res.json(buildPaginatedResponse(patientTests, total, page, limit));

  } catch (error) {
    console.error('Get patient tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient tests'
    });
  }
};
