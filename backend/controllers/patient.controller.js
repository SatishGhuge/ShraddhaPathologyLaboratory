import prisma from '../config/database.js';
import { validationResult } from 'express-validator';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { generatePatientId, generateVisitId } from '../utils/idGenerator.js';
import { formatAge, calculateExactAge, getAgeForRangeMatching, formatAgeFromComponents } from '../utils/ageCalculator.js';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { emailService } from '../services/notification.service.js';

// ✅ Helper: Calculate and save age fields from DOB
async function calculateAndSaveAgeFields(patientId, dob) {
  if (!dob) return;
  
  try {
    const ageData = calculateExactAge(dob);
    if (!ageData) return;
    
    await prisma.patient.update({
      where: { patientId },
      data: {
        ageYears: ageData.years,
        ageMonths: ageData.months,
        ageDays: ageData.days
      }
    });
    
    console.log(`✅ Updated age fields for ${patientId}: ${ageData.years}Y ${ageData.months}M ${ageData.days}D`);
  } catch (error) {
    console.error(`Error calculating age fields for ${patientId}:`, error);
  }
}

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

    let { 
      // Existing patient ID (if this is an existing patient)
      existingPatientId,
      // Patient Identity
      title, firstName, lastName, dob, age, gender, mobile, email,
      createdBy, createdAtLocation, address, location,
      // Registration Details (will be saved with each test)
      reportMode, referralDoctor, visitDate, visitTime,
      sampleTaken, sampleReceived, sampleBarcodeNo, patient_history,
      // NEW BILLING FIELDS (Single discount for all tests)
      discountPercent = 0,
      discountAmount = 0,
      advanceAmount = 0,
      discountRemark,
      paymentMode = 'Cash',
      businessType = 'B2C',
      // Tests
      tests 
    } = req.body;

    // ✅ NEW BILLING VALIDATION
    if (!tests || tests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least 1 test must be selected'
      });
    }

    // Validate tests exist and are active
    const testIds = tests.map(t => parseInt(t.testId || t.id));
    const validTests = await prisma.test.findMany({
      where: {
        id: { in: testIds },
        isActive: true,
        isDeleted: false
      }
    });

    if (validTests.length !== tests.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more tests are invalid or inactive'
      });
    }

    // Normalize referralDoctor: remove all "Dr." prefixes and add exactly one
    if (referralDoctor && referralDoctor.trim()) {
      referralDoctor = referralDoctor
        .replace(/\bDr\.?\s*/gi, '') // Remove all "Dr" or "Dr." variations
        .trim();
      
      // Add exactly one "Dr." prefix if it has content
      if (referralDoctor) {
        referralDoctor = `Dr. ${referralDoctor}`;
      } else {
        referralDoctor = null;
      }
    }

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
      
      // ✅ NEW BILLING LOGIC: Single discount for all tests
      // Step 1: Calculate total test charges
      const totalTestCharges = tests.reduce((sum, t) => sum + (parseFloat(t.charge) || 0), 0);
      
      // Step 2: Calculate discount amount
      let finalDiscountAmount = 0;
      let finalDiscountPercent = 0;
      
      if (parseFloat(discountPercent) > 0) {
        finalDiscountAmount = totalTestCharges * (parseFloat(discountPercent) / 100);
        finalDiscountPercent = parseFloat(discountPercent);
      } else if (parseFloat(discountAmount) > 0) {
        finalDiscountAmount = parseFloat(discountAmount);
        finalDiscountPercent = (finalDiscountAmount / totalTestCharges) * 100;
      }
      
      // Ensure discount doesn't exceed total
      finalDiscountAmount = Math.min(finalDiscountAmount, totalTestCharges);
      
      // Step 3: Calculate test amount (after discount)
      const testAmount = totalTestCharges - finalDiscountAmount;
      
      // Step 4: Calculate advance and balance
      const finalAdvanceAmount = Math.min(parseFloat(advanceAmount) || 0, testAmount);
      const balanceAmount = testAmount - finalAdvanceAmount;
      
      console.log('💰 Billing Calculation:', {
        totalTestCharges,
        finalDiscountAmount,
        testAmount,
        advanceAmount: finalAdvanceAmount,
        balanceAmount
      });
      
      // Step 5: Distribute amounts proportionally among tests
      const patientTestsData = tests.map(test => {
        const testCharge = parseFloat(test.charge);
        const proportion = testCharge / totalTestCharges;
        
        return {
          patientId: patient.patientId,
          visitId,
          testId: parseInt(test.testId || test.id),
          departmentId: test.departmentId || 1,
          organizationId: req.body.organizationId || null,
          sample: test.sample || 'Blood',
          charge: testCharge,
          reportMode: reportMode || 'Email',
          referralDoctor,
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          visitTime: visitTime || '10:00',
          sampleTaken: sampleTaken ? new Date(sampleTaken) : null,
          sampleReceived: sampleReceived ? new Date(sampleReceived) : null,
          sampleBarcodeNo,
          patient_history,
          paymentMode: paymentMode || 'Cash',
          businessType: businessType || 'B2C',
          
          // ✅ NEW BILLING FIELDS
          testCharges: testCharge,
          discountPercent: finalDiscountPercent,
          discountAmount: finalDiscountAmount * proportion,
          testAmount: testAmount * proportion,
          advanceAmount: finalAdvanceAmount * proportion,
          balanceAmount: balanceAmount * proportion,
          
          // Legacy fields (for compatibility)
          totalAmount: testAmount * proportion,
          paidAmount: finalAdvanceAmount * proportion,
          discountRemark: discountRemark || null
        };
      });
      
      await prisma.patientTest.createMany({
        data: patientTestsData
      });

      // Create payment transaction if payment was made during registration
      if(paymentMode && finalAdvanceAmount > 0){
        await prisma.paymentTransaction.create({
          data: {
            visitId,
            patientId: patient.patientId,
            paymentMode,
            paymentAmount: finalAdvanceAmount,
            remarks: `Advance payment at registration`
          }
        });
        console.log(`✅ Payment transaction created: ${paymentMode} - ₹${finalAdvanceAmount}`);
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
      const patientId = await generatePatientId();
      const visitId = await generateVisitId(visitDate);

      // ✅ NEW BILLING LOGIC: Single discount for all tests
      // Step 1: Calculate total test charges
      const totalTestCharges = tests.reduce((sum, t) => sum + (parseFloat(t.charge) || 0), 0);
      
      // Step 2: Calculate discount amount
      let finalDiscountAmount = 0;
      let finalDiscountPercent = 0;
      
      if (parseFloat(discountPercent) > 0) {
        finalDiscountAmount = totalTestCharges * (parseFloat(discountPercent) / 100);
        finalDiscountPercent = parseFloat(discountPercent);
      } else if (parseFloat(discountAmount) > 0) {
        finalDiscountAmount = parseFloat(discountAmount);
        finalDiscountPercent = (finalDiscountAmount / totalTestCharges) * 100;
      }
      
      // Ensure discount doesn't exceed total
      finalDiscountAmount = Math.min(finalDiscountAmount, totalTestCharges);
      
      // Step 3: Calculate test amount (after discount)
      const testAmount = totalTestCharges - finalDiscountAmount;
      
      // Step 4: Calculate advance and balance
      const finalAdvanceAmount = Math.min(parseFloat(advanceAmount) || 0, testAmount);
      const balanceAmount = testAmount - finalAdvanceAmount;
      
      console.log('💰 Billing Calculation for NEW patient:', {
        totalTestCharges,
        finalDiscountAmount,
        testAmount,
        advanceAmount: finalAdvanceAmount,
        balanceAmount
      });
      
      // Step 5: Distribute amounts proportionally among tests
      const testsWithBilling = tests.map(test => {
        const testCharge = parseFloat(test.charge);
        const proportion = testCharge / totalTestCharges;
        
        return {
          visitId,
          testId: parseInt(test.testId || test.id),
          departmentId: test.departmentId || 1,
          organizationId: req.body.organizationId || null,
          sample: test.sample || 'Blood',
          charge: testCharge,
          reportMode: reportMode || 'Email',
          referralDoctor: referralDoctor || null,
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          visitTime: visitTime || '10:00',
          sampleTaken: sampleTaken ? new Date(sampleTaken) : null,
          sampleReceived: sampleReceived ? new Date(sampleReceived) : null,
          sampleBarcodeNo,
          patient_history,
          paymentMode: paymentMode || 'Cash',
          businessType: businessType || 'B2C',
          
          // ✅ NEW BILLING FIELDS
          testCharges: testCharge,
          discountPercent: finalDiscountPercent,
          discountAmount: finalDiscountAmount * proportion,
          testAmount: testAmount * proportion,
          advanceAmount: finalAdvanceAmount * proportion,
          balanceAmount: balanceAmount * proportion,
          
          // Legacy fields (for compatibility)
          totalAmount: testAmount * proportion,
          paidAmount: finalAdvanceAmount * proportion,
          discountRemark: discountRemark || null
        };
      });

      patient = await prisma.patient.create({
        data: {
          patientId,
          title,
          firstName,
          lastName,
          dob: dob ? new Date(dob) : null,
          ageYears: (age && !dob) ? parseInt(age) : null,
          ageMonths: (age && !dob) ? 0 : null,
          ageDays: (age && !dob) ? 0 : null,
          gender,
          mobile,
          email,
          createdBy,
          createdAtLocation,
          address,
          location,
          tests: {
            create: testsWithBilling
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

      // ✅ Calculate and save age fields from DOB (takes priority over manual age)
      if (dob) {
        await calculateAndSaveAgeFields(patient.patientId, dob);
      } else if (age) {
        console.log(`✅ Manually entered age: ${age} years → ageYears=${age}, ageMonths=0, ageDays=0`);
      }

      // Create payment transaction if payment was made during registration
      if(paymentMode && finalAdvanceAmount > 0){
        try {
          await prisma.paymentTransaction.create({
            data: {
              visitId,
              patientId: patient.patientId,
              paymentMode,
              paymentAmount: finalAdvanceAmount,
              remarks: `Advance payment at registration`
            }
          });
          console.log(`✅ Payment transaction created: ${paymentMode} - ₹${finalAdvanceAmount}`);
        } catch(paymentErr){
          console.warn('⚠️ Failed to create payment transaction:', paymentErr.message);
        }
      }
    }

    // Send email with credentials if patient has an email
    if (email && patient.patientId) {
      try {
        // Generate random password for patients
        const randomPassword = crypto.randomBytes(8).toString('hex').slice(0, 8);
        const hashedPassword = await bcryptjs.hash(randomPassword, 10);

        // Update patient with hashed password
        await prisma.patient.update({
          where: { patientId: patient.patientId },
          data: { password: hashedPassword }
        });

        // Send email with credentials
        await emailService.sendRegistrationCredentials(
          email,
          `${firstName} ${lastName || ''}`,
          patient.patientId,
          randomPassword,
          'direct'
        );
        console.log(`✅ Credentials email sent to ${email} for patient ${patient.patientId}`);
      } catch (emailError) {
        console.warn('⚠️ Failed to send credentials email:', emailError.message);
        // Don't fail the registration if email fails
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

// ============================================================================
// ADMIN PATIENT REGISTRATION WITH EMAIL NOTIFICATION
// ============================================================================
// When admin registers a patient with patient's own email (not referral doctor),
// send patient ID + random password to their email
export const registerPatientWithEmail = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      mobile,
      dob,
      gender,
      address,
      location,
      title,
      tests = [],
      totalAmount = 0,
      discountPercent = 0,
      discountAmount = 0,
      paidAmount = 0,
      paymentMode = 'Cash',
      businessType = 'B2C',
      referralDoctor = null,
      visitDate,
      organizationId = null
    } = req.body;

    console.log('📝 Admin registering patient with email:', { firstName, email, mobile });

    // Validate email is provided (for patient, not referral doctor)
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Patient email is required for registration'
      });
    }

    // Check if patient already exists
    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: [{ email }, { mobile }]
      }
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient already registered with this email or phone'
      });
    }

    // Generate patient ID
    const patientId = await generatePatientId();

    // Generate random password (8 characters)
    const randomPassword = crypto.randomBytes(8).toString('hex').slice(0, 8);
    const hashedPassword = await bcryptjs.hash(randomPassword, 10);

    // Generate visit ID
    const visitId = await generateVisitId(visitDate);

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        patientId,
        title: title || 'Mr',
        firstName,
        lastName,
        email,
        mobile,
        password: hashedPassword,
        dob: dob ? new Date(dob) : null,
        gender: gender || 'Male',
        address,
        location,
        registrationType: 'direct',
        isActive: true,
        createdAtLocation: location
      }
    });

    // Create patient tests if provided
    if (tests && tests.length > 0) {
      const perTestAmount = totalAmount / tests.length;
      const perTestDiscount = discountAmount / tests.length;
      const perTestPaid = paidAmount / tests.length;
      const balanceAmount = (totalAmount - discountAmount) - paidAmount;
      const perTestBalance = balanceAmount / tests.length;

      await prisma.patientTest.createMany({
        data: tests.map(test => ({
          patientId,
          visitId,
          testId: test.id,
          departmentId: test.departmentId,
          organizationId: organizationId || null,
          sample: test.sample || 'Blood',
          charge: perTestAmount,
          reportMode: 'Email',
          referralDoctor: referralDoctor,
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          visitTime: '10:00',
          totalAmount: perTestAmount,
          discountPercent,
          discountAmount: perTestDiscount,
          paidAmount: perTestPaid,
          balanceAmount: perTestBalance,
          paymentMode,
          businessType,
          status: 'Registered',
          isOutsourced: test.isOutsourced || false,
          outsourcedTo: test.outsourcedTo || null
        }))
      });

      // Create payment transaction if payment was made
      if (paymentMode && paidAmount > 0) {
        await prisma.paymentTransaction.create({
          data: {
            visitId,
            patientId,
            paymentMode,
            paymentAmount: paidAmount,
            remarks: `Admin registration - ${firstName}`
          }
        });
      }
    }

    console.log('✅ Patient created:', patientId);

    // Send email with credentials
    try {
      await emailService.sendRegistrationCredentials(
        email,
        `${firstName} ${lastName || ''}`,
        patientId,
        randomPassword,
        'direct'
      );
      console.log(`✅ Credentials email sent to ${email}`);
    } catch (emailError) {
      console.warn('⚠️ Failed to send email:', emailError.message);
      // Don't fail the registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully. Credentials sent to email.',
      data: {
        patientId: patient.patientId,
        firstName: patient.firstName,
        email: patient.email,
        mobile: patient.mobile,
        message: `Patient ID: ${patientId}, Password sent to email`
      }
    });
  } catch (error) {
    console.error('❌ Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register patient',
      error: error.message
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
            test: {
              select: {
                id: true,
                name: true,
                shortName: true,
                sampleTypeId: true,
                sample_type: {
                  select: {
                    id: true,
                    Sample_Type: true,
                    Sample_Color: true
                  }
                }
              }
            },
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

    // 🔴 DEBUG: Format age for each patient
    const patientsWithFormattedAge = patients.map(patient => ({
      ...patient,
      age: formatAgeFromComponents(patient.ageYears, patient.ageMonths, patient.ageDays)
    }));

    console.log('✅ getAllPatients - Sample patient with formatted age:', {
      patientId: patientsWithFormattedAge[0]?.patientId,
      ageYears: patientsWithFormattedAge[0]?.ageYears,
      ageMonths: patientsWithFormattedAge[0]?.ageMonths,
      ageDays: patientsWithFormattedAge[0]?.ageDays,
      age: patientsWithFormattedAge[0]?.age
    });

    res.json(buildPaginatedResponse(patientsWithFormattedAge, total, page, limit));

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
            test: {
              select: {
                id: true,
                name: true,
                shortName: true,
                sampleTypeId: true,
                sample_type: {
                  select: {
                    id: true,
                    Sample_Type: true,
                    Sample_Color: true
                  }
                }
              }
            },
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
            test: {
              select: {
                id: true,
                name: true,
                shortName: true,
                sampleTypeId: true,
                sample_type: {
                  select: {
                    id: true,
                    Sample_Type: true,
                    Sample_Color: true
                  }
                }
              }
            },
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

    // 🔴 DEBUG: Format age for each patient
    const patientsWithFormattedAge = patients.map(patient => ({
      ...patient,
      age: formatAgeFromComponents(patient.ageYears, patient.ageMonths, patient.ageDays)
    }));

    console.log('✅ searchPatient - Sample patient with formatted age:', {
      patientId: patientsWithFormattedAge[0]?.patientId,
      ageYears: patientsWithFormattedAge[0]?.ageYears,
      ageMonths: patientsWithFormattedAge[0]?.ageMonths,
      ageDays: patientsWithFormattedAge[0]?.ageDays,
      age: patientsWithFormattedAge[0]?.age
    });

    res.json(buildPaginatedResponse(patientsWithFormattedAge, total, page, limit));

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

    // Prepare update data
    const updateData = {
      title:     title     || undefined,
      firstName: firstName || undefined,
      lastName:  lastName  !== undefined ? lastName  : undefined,
      dob:       dob       ? new Date(dob) : null,
      gender:    gender    || undefined,
      mobile:    mobile    !== undefined ? mobile  : undefined,
      email:     email     !== undefined ? email   : undefined,
      address:   address   !== undefined ? address : undefined,
    };

    // ✅ If age is manually provided (as a single number), save it
    if (age !== undefined && age !== null && age !== '') {
      const ageNum = parseInt(age);
      if (!isNaN(ageNum)) {
        updateData.ageYears = ageNum;
        updateData.ageMonths = 0;
        updateData.ageDays = 0;
        console.log(`✅ Manually entered age: ${ageNum} years → ageYears=${ageNum}, ageMonths=0, ageDays=0`);
      }
    }

    const updated = await prisma.patient.update({
      where: { patientId },
      data: updateData
    });

    // ✅ Calculate and save age fields if DOB was updated (takes precedence over manual age)
    if (dob) {
      await calculateAndSaveAgeFields(patientId, dob);
    }

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

// ============================================================================
// ADD TESTS TO EXISTING VISIT (BookingDetailsModal Save)
// ============================================================================
// When user adds new tests from BookingDetailsModal to an existing visit:
// - Save new tests with NEW discount (applies only to new tests)
// - Update existing PatientTest records with new overall discount
// - Return barcode data for new tests (grouped by sample type)
export const addTestsToExistingVisit = async (req, res) => {
  try {
    const { patientId, visitId, tests, discountPercent, discountAmount, discountRemark, businessType } = req.body;

    if (!patientId || !visitId || !tests || tests.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'patientId, visitId, and tests array are required' 
      });
    }

    console.log('📝 Adding tests to existing visit:', {
      patientId,
      visitId,
      newTestsCount: tests.length,
      discountPercent,
      discountAmount,
      businessType
    });

    // Get existing tests for this visit to understand current state
    const existingTests = await prisma.patientTest.findMany({
      where: { patientId, visitId },
      include: { test: true }
    });

    if (!existingTests.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visit not found for this patient' 
      });
    }

    const firstExistingTest = existingTests[0];
    
    // Calculate totals
    const existingTestsTotal = existingTests.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const newTestsTotal = tests.reduce((sum, t) => sum + (parseFloat(t.charge) || 0), 0);
    const totalAmount = existingTestsTotal + newTestsTotal;
    
    // Discount logic:
    // - NEW discount applies ONLY to newly added tests
    // - Existing discount remains unchanged
    const newDiscountAmount = discountPercent > 0 
      ? Math.round((newTestsTotal * discountPercent) / 100) 
      : (parseFloat(discountAmount) || 0);
    
    // Calculate net amount after new discount
    const netAmountWithNewDiscount = Math.max(0, totalAmount - newDiscountAmount);
    
    // Get current paid and balance amounts
    const currentPaidAmount = firstExistingTest.paidAmount || 0;
    const newBalanceAmount = Math.max(0, netAmountWithNewDiscount - currentPaidAmount);

    console.log('💰 Billing calculation:', {
      existingTestsTotal,
      newTestsTotal,
      totalAmount,
      newDiscountAmount,
      netAmountWithNewDiscount,
      currentPaidAmount,
      newBalanceAmount
    });

    // Create new PatientTest records for new tests
    const newPatientTests = await prisma.patientTest.createMany({
      data: tests.map(test => ({
        patientId,
        visitId,
        testId: test.id,
        departmentId: test.departmentId,
        organizationId: firstExistingTest.organizationId,
        sample: test.sample,
        charge: parseFloat(test.charge) || 0,
        reportMode: firstExistingTest.reportMode,
        referralDoctor: firstExistingTest.referralDoctor,
        visitDate: firstExistingTest.visitDate,
        visitTime: firstExistingTest.visitTime,
        sampleTaken: firstExistingTest.sampleTaken,
        sampleReceived: firstExistingTest.sampleReceived,
        sampleBarcodeNo: firstExistingTest.sampleBarcodeNo,
        patient_history: firstExistingTest.patient_history,
        totalAmount: parseFloat(test.charge) || 0,
        
        // Original discount not applicable for new tests
        originalDiscountPercent: 0,
        originalDiscountAmount: 0,
        
        // ✅ Use ADDITIONAL discount fields (new tests from rebook)
        additionalDiscountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        additionalDiscountAmount: newDiscountAmount / tests.length,
        additionalDiscountRemark: discountRemark || '',
        additionalDiscountDate: new Date(),
        
        // Keep for backward compatibility
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        discountAmount: newDiscountAmount / tests.length,
        discountRemark: discountRemark || '',
        
        paidAmount: currentPaidAmount,
        balanceAmount: newBalanceAmount,
        paymentMode: firstExistingTest.paymentMode,
        businessType: businessType || firstExistingTest.businessType,
        status: 'Registered',
        outsourcedTo: test.outsourcedTo || null
      }))
    });

    console.log(`✅ Created ${newPatientTests.count} new PatientTest records`);

    // Update all existing PatientTest records for this visit with new totals and balance
    // DO NOT CHANGE their original discount - only update totals
    await prisma.patientTest.updateMany({
      where: { patientId, visitId },
      data: {
        totalAmount: totalAmount, // Update total (now includes new tests)
        balanceAmount: newBalanceAmount
        // ⚠️ DO NOT update originalDiscountPercent, originalDiscountAmount
        // They remain unchanged for existing tests
      }
    });

    console.log('✅ Updated all PatientTest records with new balance and discount');

    // Fetch all tests for this visit (both existing and new) to return barcode data
    const allTestsForVisit = await prisma.patientTest.findMany({
      where: { patientId, visitId },
      include: {
        test: {
          include: { sample_type: true }
        }
      }
    });

    // Group new tests by sample type for barcode generation
    const newTestsByBarcode = {};
    tests.forEach(test => {
      const sampleKey = test.sample || 'Unknown';
      if (!newTestsByBarcode[sampleKey]) {
        newTestsByBarcode[sampleKey] = [];
      }
      newTestsByBarcode[sampleKey].push(test);
    });

    // Check if any new tests have different sample types from existing tests
    const existingSampleTypes = new Set(existingTests.map(t => t.sample));
    const newSampleTypes = new Set(Object.keys(newTestsByBarcode));
    const hasDifferentSampleTypes = [...newSampleTypes].some(sample => !existingSampleTypes.has(sample));

    console.log('🔍 Barcode generation info:', {
      existingSampleTypes: Array.from(existingSampleTypes),
      newSampleTypes: Array.from(newSampleTypes),
      hasDifferentSampleTypes,
      newTestsByBarcode: Object.keys(newTestsByBarcode)
    });

    res.json({
      success: true,
      message: 'Tests added to existing visit successfully',
      data: {
        patientId,
        visitId,
        totalTests: allTestsForVisit.length,
        newTestsCount: tests.length,
        totalAmount,
        discountAmount: newDiscountAmount,
        balanceAmount: newBalanceAmount,
        currentPaidAmount,
        needsNewBarcode: hasDifferentSampleTypes,
        newTestsByBarcode: newTestsByBarcode,
        allTests: allTestsForVisit
      }
    });

  } catch (error) {
    console.error('❌ Add tests to existing visit error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add tests to existing visit', 
      error: error.message 
    });
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
        isOutsourced: existingTest.isOutsourced || false,
        outsourcedTo: existingTest.outsourcedTo || null
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

// ============================================================================
// GET TESTS BY VISIT ID - For Booking Details Modal
// ============================================================================
export const getTestsByVisitId = async (req, res) => {
  try {
    const { visitId } = req.query;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'visitId query parameter is required'
      });
    }

    console.log(`📋 Fetching tests for visitId: ${visitId}`);

    // Find all tests for this visit
    const tests = await prisma.patientTest.findMany({
      where: { visitId },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true,
            testCode: true,
            departmentId: true,
            sampleTypeId: true,
            sample_type: {
              select: {
                id: true,
                Sample_Type: true,
                Sample_Color: true
              }
            }
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        package: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`✅ Found ${tests.length} test(s) for visitId: ${visitId}`);

    if (!tests || tests.length === 0) {
      return res.json({
        success: true,
        message: 'No tests found for this visit',
        data: []
      });
    }

    // Transform tests to match frontend expectations
    const transformedTests = tests.map(pt => ({
      id: pt.id,
      patientTestId: pt.id,
      name: pt.test?.name || pt.test?.shortName || 'Unknown Test',
      shortName: pt.test?.shortName,
      testCode: pt.test?.testCode,
      sample: pt.test?.sample_type?.Sample_Type || 'N/A',
      sampleColor: pt.test?.sample_type?.Sample_Color,
      testId: pt.testId,
      sampleTypeId: pt.test?.sampleTypeId,
      departmentId: pt.departmentId,
      departmentName: pt.department?.name,
      organizationId: pt.organizationId,
      organizationName: pt.organization?.name,
      packageId: pt.packageId,
      packageName: pt.package?.name,
      
      // Charge details
      charge: pt.charge || 0,
      b2cCharge: pt.charge || 0,
      b2bCharge: pt.charge || 0,
      
      // Visit & status info
      visitId: pt.visitId,
      status: pt.status || 'Registered',
      barcode_status: pt.barcode_status || 'Unprinted',
      reportMode: pt.reportMode,
      referralDoctor: pt.referralDoctor,
      visitDate: pt.visitDate,
      visitTime: pt.visitTime,
      
      // Payment & billing info
      totalAmount: pt.totalAmount || pt.charge || 0,
      paidAmount: pt.paidAmount || 0,
      balanceAmount: pt.balanceAmount || 0,
      discountAmount: pt.discountAmount || 0,
      discountPercent: pt.discountPercent || 0,
      discountRemark: pt.discountRemark,
      paymentMode: pt.paymentMode,
      businessType: pt.businessType,
      
      // Sample info
      sampleBarcodeNo: pt.sampleBarcodeNo,
      sampleReceived: pt.sampleReceived,
      sampleTaken: pt.sampleTaken,
      
      // History & comments
      patient_history: pt.patient_history,
      comments: pt.comments,
      
      // Outsourcing info
      isOutsourced: pt.isExcluded || false,
      outsourcedTo: pt.outsourcedTo,
      
      // Marking as existing test from database
      isExisting: true
    }));

    res.json({
      success: true,
      message: `Retrieved ${tests.length} test(s) for this visit`,
      data: transformedTests
    });

  } catch (error) {
    console.error('❌ Get tests by visitId error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests for this visit',
      error: error.message
    });
  }
};
