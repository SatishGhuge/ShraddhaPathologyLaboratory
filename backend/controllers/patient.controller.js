import prisma from '../config/database.js';
import { Decimal } from '@prisma/client/runtime/library.js';
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

// ✅ Helper: Create VisitBill record
async function createVisitBill(visitId, patientId, grossAmount, totalDiscount, totalPaid, balanceAmount) {
  try {
    const visitBill = await prisma.visitBill.create({
      data: {
        visitId,
        patientId,
        grossAmount: new Decimal(grossAmount.toString()),
        totalDiscount: new Decimal(totalDiscount.toString()),
        totalPaid: new Decimal(totalPaid.toString()),
        totalRefund: new Decimal('0'),
        balanceAmount: new Decimal(balanceAmount.toString()),
        status: totalPaid >= grossAmount - totalDiscount ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING'
      }
    });
    
    console.log(`✅ VisitBill created: visitId=${visitId}, grossAmount=${grossAmount}, balance=${balanceAmount}`);
    return visitBill;
  } catch (error) {
    console.error('Error creating VisitBill:', error);
    throw error;
  }
}

// ✅ Helper: Create BillingSession record
async function createBillingSession(visitId, sessionType, sequence, remarks = null, createdBy = null) {
  try {
    const billingSession = await prisma.billingSession.create({
      data: {
        visitId,
        sessionType,
        sequence,
        remarks,
        createdBy
      }
    });
    
    console.log(`✅ BillingSession created: sessionType=${sessionType}, sequence=${sequence}`);
    return billingSession;
  } catch (error) {
    console.error('Error creating BillingSession:', error);
    throw error;
  }
}

// ✅ Helper: Create BillDiscount record
async function createBillDiscount(visitId, billingSessionId, discountType, discountValue, discountAmount, appliedOnAmount, remarks = null, createdBy = null) {
  try {
    const billDiscount = await prisma.billDiscount.create({
      data: {
        visitId,
        billingSessionId,
        discountType,
        discountValue: new Decimal(discountValue.toString()),
        discountAmount: new Decimal(discountAmount.toString()),
        appliedOnAmount: new Decimal(appliedOnAmount.toString()),
        remarks,
        createdBy
      }
    });
    
    console.log(`✅ BillDiscount created: type=${discountType}, amount=${discountAmount}`);
    return billDiscount;
  } catch (error) {
    console.error('Error creating BillDiscount:', error);
    throw error;
  }
}

// ✅ Helper: Create Payment record
async function createPaymentRecord(visitId, billingSessionId, amount, paymentMode, remarks = null, receivedBy = null) {
  try {
    const payment = await prisma.payment.create({
      data: {
        visitId,
        billingSessionId,
        amount: new Decimal(amount.toString()),
        paymentMode,
        remarks,
        receivedBy
      }
    });
    
    console.log(`✅ Payment created: amount=${amount}, mode=${paymentMode}`);
    return payment;
  } catch (error) {
    console.error('Error creating Payment:', error);
    throw error;
  }
}

// ✅ Helper: Create BillTransaction (audit trail)
async function createBillTransaction(visitId, billingSessionId, transactionType, amount, balanceAfter, remarks = null, createdBy = null) {
  try {
    const transaction = await prisma.billTransaction.create({
      data: {
        visitId,
        billingSessionId,
        transactionType,
        amount: new Decimal(amount.toString()),
        balanceAfter: new Decimal(balanceAfter.toString()),
        remarks,
        createdBy
      }
    });
    
    console.log(`✅ BillTransaction created: type=${transactionType}, amount=${amount}`);
    return transaction;
  } catch (error) {
    console.error('Error creating BillTransaction:', error);
    throw error;
  }
}

// ✅ Helper: Get next BillingSession sequence for a visit
async function getNextSequence(visitId) {
  try {
    const lastSession = await prisma.billingSession.findFirst({
      where: { visitId },
      orderBy: { sequence: 'desc' }
    });
    
    return (lastSession?.sequence || 0) + 1;
  } catch (error) {
    console.error('Error getting next sequence:', error);
    return 1;
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
      title, firstName, lastName, dob, age, gender, guardianType, mobile, email,
      // ✅ NEW: Track if email was manually filled (for sending credentials)
      emailWasManuallyFilled,
      createdBy, createdAtLocation, address, location,
      // Registration Details (will be saved with each test)
      reportMode, referralDoctor, visitDate, visitTime,
      sampleTaken, sampleReceived, sampleBarcodeNo, patient_history,
      paymentMode = 'Cash',
      businessType = 'B2C',
      // Billing object (contains discount and payment info)
      billing = {},
      // Tests
      tests 
    } = req.body;

    // ✅ EXTRACT BILLING FIELDS FROM billing OBJECT
    let discountPercent = billing.discountPercent || 0;
    let discountAmount = billing.discountAmount || 0;
    let advanceAmount = billing.paidAmount || 0; // Frontend sends paidAmount, not advanceAmount
    let discountRemark = billing.discountRemark || null;

    // 🔧 FIX: Declare visitId at top level so it's accessible in response
    let visitId = null;

    console.log('💳 BILLING FIELDS RECEIVED:', {
      'billing.discountPercent': billing.discountPercent,
      'billing.discountAmount': billing.discountAmount,
      'billing.paidAmount': billing.paidAmount,
      'billing.discountRemark': billing.discountRemark,
      'extracted discountPercent': discountPercent,
      'extracted discountAmount': discountAmount,
      'extracted advanceAmount': advanceAmount,
      'extracted discountRemark': discountRemark
    });

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
      visitId = await generateVisitId(visitDate);
      
      // ✅ NEW BILLING LOGIC: Single discount for all tests
      // Step 1: Calculate total test charges
      const totalTestCharges = tests.reduce((sum, t) => sum + (parseFloat(t.charge) || 0), 0);
      
      // Step 2: Calculate discount amount
      let finalDiscountAmount = 0;
      let finalDiscountPercent = 0;
      
      // ✅ FIX: Always round discount to nearest rupee to avoid floating-point issues
      if (parseFloat(discountPercent) > 0) {
        finalDiscountAmount = Math.round(totalTestCharges * (parseFloat(discountPercent) / 100));
        finalDiscountPercent = parseFloat(discountPercent);
      } else if (parseFloat(discountAmount) > 0) {
        finalDiscountAmount = Math.round(parseFloat(discountAmount));
        finalDiscountPercent = totalTestCharges > 0 ? (finalDiscountAmount / totalTestCharges) * 100 : 0;
      }
      
      // Ensure discount doesn't exceed total
      finalDiscountAmount = Math.min(finalDiscountAmount, totalTestCharges);
      
      // Step 3: Calculate test amount (after discount)
      const testAmount = totalTestCharges - finalDiscountAmount;
      
      // Step 4: Calculate advance and balance - ✅ Always round to rupees
      const finalAdvanceAmount = Math.min(parseFloat(advanceAmount) || 0, testAmount);
      const balanceAmount = Math.max(0, Math.round(testAmount - finalAdvanceAmount));
      
      console.log('💰 Billing Calculation (Existing Patient):', {
        totalTestCharges,
        finalDiscountAmount,
        testAmount,
        advanceAmount: finalAdvanceAmount,
        balanceAmount
      });
      
      // ✅ WRAP IN TRANSACTION - All or nothing
      // ⚠️ CRITICAL: Create VisitBill FIRST (foreign key constraint)
      // BillingSession, BillDiscount, Payment all reference VisitBill.visitId
      await prisma.$transaction(async (tx) => {
        // Step 1: Create VisitBill FIRST (master record with FK reference)
        await tx.visitBill.create({
          data: {
            visitId,
            patientId: patient.patientId,
            grossAmount: new Decimal(totalTestCharges),
            totalDiscount: new Decimal(finalDiscountAmount),
            totalDiscountPercent: finalDiscountPercent,
            totalPaid: new Decimal(finalAdvanceAmount),
            totalRefund: new Decimal('0'),
            balanceAmount: new Decimal(balanceAmount),
            status: finalAdvanceAmount >= testAmount ? 'PAID' : finalAdvanceAmount > 0 ? 'PARTIAL' : 'PENDING'
          }
        });
        
        console.log(`✅ [TX] VisitBill created: ₹${totalTestCharges} (balance: ₹${balanceAmount})`);
        
        // Step 2: Create BillingSession (references VisitBill.visitId)
        const billingSession = await tx.billingSession.create({
          data: {
            visitId,
            sessionType: 'REGISTRATION',
            sequence: 1,
            remarks: `Patient registration with ${tests.length} tests`
          }
        });
        
        console.log(`✅ [TX] BillingSession created: sessionType=REGISTRATION, sequence=1`);
        
        // Step 3: Create BillDiscount if discount > 0
        if (finalDiscountAmount > 0) {
          await tx.billDiscount.create({
            data: {
              visitId,
              billingSessionId: billingSession.id,
              discountType: discountPercent > 0 ? 'PERCENTAGE' : 'FLAT',
              discountValue: new Decimal(discountPercent > 0 ? finalDiscountPercent : finalDiscountAmount),
              discountAmount: new Decimal(finalDiscountAmount),
              appliedOnAmount: new Decimal(totalTestCharges),
              remarks: discountRemark || null
            }
          });
          console.log(`✅ [TX] BillDiscount created: ₹${finalDiscountAmount}`);
        }
        
        // Step 4: Create Payment if advance > 0
        if (finalAdvanceAmount > 0) {
          const mode = paymentMode || "";
          const payMode = mode === 'Cash' ? 'CASH' : 
                         mode === 'Debit Card' || mode === 'Debit' ? 'DEBIT_CARD' : 
                         mode === 'Credit Card' || mode === 'Credit' ? 'CREDIT_CARD' :
                         mode === 'Card' ? 'CARD' : 
                         mode === 'UPI' ? 'UPI' :
                         mode === 'Cheque' ? 'CHEQUE' :
                         mode === 'Bank Transfer' ? 'BANK_TRANSFER' : 'OTHER';
          
          await tx.payment.create({
            data: {
              visitId,
              billingSessionId: billingSession.id,
              amount: new Decimal(finalAdvanceAmount),
              paymentMode: payMode,
              transactionStatus: 'SUCCESS',
              remarks: `Advance payment at registration`,
              paymentDate: new Date()
            }
          });
          console.log(`✅ [TX] Payment created: ₹${finalAdvanceAmount}`);
        }
        
        // Step 5: Create PatientTest records (source of truth for test data)
        const patientTestsData = tests.map(test => {
          const testCharge = parseFloat(test.charge);
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
            billingSessionId: billingSession.id,
            // ===== EMERGENCY FIELDS =====
            isEmergency: test.isEmergency || false,
            emergencySetAt: test.isEmergency ? new Date() : null,
            emergencySetBy: createdBy || 'SYSTEM'
          };
        });
        
        await tx.patientTest.createMany({
          data: patientTestsData
        });
        
        console.log(`✅ [TX] PatientTest records created: ${tests.length} tests`);
      });
      
      console.log(`✅ Transaction completed successfully for existing patient`);

      // Get updated patient with ONLY the tests from the current visit
      patient = await prisma.patient.findUnique({
        where: { patientId: patient.patientId },
        include: { 
          tests: {
            where: { visitId: visitId },
            include: {
              test: true,
              department: true,
              organization: true
            }
          }
        }
      });
      
      console.log(`✅ Fetched patient with current visit tests: visitId=${visitId}, testsCount=${patient.tests.length}`);

    } else {
      // Create new patient with new ID format: S + YY + MM + 00001
      const patientId = await generatePatientId();
      visitId = await generateVisitId(visitDate);

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
        finalDiscountAmount = Math.round(parseFloat(discountAmount));
        finalDiscountPercent = totalTestCharges > 0 ? (finalDiscountAmount / totalTestCharges) * 100 : 0;
      }
      
      // Ensure discount doesn't exceed total
      finalDiscountAmount = Math.min(finalDiscountAmount, totalTestCharges);
      
      // Step 3: Calculate test amount (after discount)
      const testAmount = totalTestCharges - finalDiscountAmount;
      
      // Step 4: Calculate advance and balance - ✅ Always round to rupees
      const finalAdvanceAmount = Math.min(parseFloat(advanceAmount) || 0, testAmount);
      const balanceAmount = Math.max(0, Math.round(testAmount - finalAdvanceAmount));
      
      console.log('💰 Billing Calculation for NEW patient:', {
        totalTestCharges,
        finalDiscountAmount,
        testAmount,
        advanceAmount: finalAdvanceAmount,
        balanceAmount
      });
      
      // ✅ WRAP IN TRANSACTION - All or nothing
      // ⚠️ CRITICAL: Create VisitBill FIRST (foreign key constraint)
      // BillingSession, BillDiscount, Payment all reference VisitBill.visitId
      await prisma.$transaction(async (tx) => {
        // Step 1: Create Patient (must exist before tests)
        patient = await tx.patient.create({
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
            guardianType: guardianType || "self",
            mobile,
            email,
            createdBy,
            createdAtLocation,
            address,
            location
          }
        });
        
        console.log(`✅ [TX] Patient created: ${patient.patientId}`);
        
        // Step 2: Create VisitBill SECOND (master record with FK reference for BillingSession)
        await tx.visitBill.create({
          data: {
            visitId,
            patientId,
            grossAmount: new Decimal(totalTestCharges),
            totalDiscount: new Decimal(finalDiscountAmount),
            totalDiscountPercent: finalDiscountPercent,
            totalPaid: new Decimal(finalAdvanceAmount),
            totalRefund: new Decimal('0'),
            balanceAmount: new Decimal(balanceAmount),
            status: finalAdvanceAmount >= testAmount ? 'PAID' : finalAdvanceAmount > 0 ? 'PARTIAL' : 'PENDING'
          }
        });
        
        console.log(`✅ [TX] VisitBill created: ₹${totalTestCharges} (balance: ₹${balanceAmount})`);
        
        // Step 3: Create BillingSession (references VisitBill.visitId)
        const billingSession = await tx.billingSession.create({
          data: {
            visitId,
            sessionType: 'REGISTRATION',
            sequence: 1,
            remarks: `Patient registration with ${tests.length} tests`
          }
        });
        
        console.log(`✅ [TX] BillingSession created: sessionType=REGISTRATION, sequence=1`);
        
        // Step 4: Create BillDiscount if discount > 0
        if (finalDiscountAmount > 0) {
          await tx.billDiscount.create({
            data: {
              visitId,
              billingSessionId: billingSession.id,
              discountType: discountPercent > 0 ? 'PERCENTAGE' : 'FLAT',
              discountValue: new Decimal(discountPercent > 0 ? finalDiscountPercent : finalDiscountAmount),
              discountAmount: new Decimal(finalDiscountAmount),
              appliedOnAmount: new Decimal(totalTestCharges),
              remarks: discountRemark || null
            }
          });
          console.log(`✅ [TX] BillDiscount created: ₹${finalDiscountAmount}`);
        }
        
        // Step 5: Create Payment if advance > 0
        if (finalAdvanceAmount > 0) {
          const mode = paymentMode || "";
          const payMode = mode === 'Cash' ? 'CASH' : 
                         mode === 'Debit Card' || mode === 'Debit' ? 'DEBIT_CARD' : 
                         mode === 'Credit Card' || mode === 'Credit' ? 'CREDIT_CARD' :
                         mode === 'Card' ? 'CARD' : 
                         mode === 'UPI' ? 'UPI' :
                         mode === 'Cheque' ? 'CHEQUE' :
                         mode === 'Bank Transfer' ? 'BANK_TRANSFER' : 'OTHER';
          
          await tx.payment.create({
            data: {
              visitId,
              billingSessionId: billingSession.id,
              amount: new Decimal(finalAdvanceAmount),
              paymentMode: payMode,
              transactionStatus: 'SUCCESS',
              remarks: `Advance payment at registration`,
              paymentDate: new Date()
            }
          });
          console.log(`✅ [TX] Payment created: ₹${finalAdvanceAmount}`);
        }
        
        // Step 6: Create PatientTest records (source of truth)
        const patientTestsData = tests.map(test => {
          const testCharge = parseFloat(test.charge);
          return {
            patientId,
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
            billingSessionId: billingSession.id,
            // ===== EMERGENCY FIELDS =====
            isEmergency: test.isEmergency || false,
            emergencySetAt: test.isEmergency ? new Date() : null,
            emergencySetBy: createdBy || 'SYSTEM'
          };
        });
        
        await tx.patientTest.createMany({
          data: patientTestsData
        });
        
        console.log(`✅ [TX] PatientTest records created: ${tests.length} tests`);
      });
      
      console.log(`✅ Transaction completed successfully for new patient`);

      // Fetch patient with tests
      patient = await prisma.patient.findUnique({
        where: { patientId },
        include: {
          tests: {
            where: { visitId },
            include: {
              test: true,
              department: true
            }
          }
        }
      });

      console.log(`✅ Patient created and fetched: ${patient.patientId}`);
      
      // ✅ Calculate and save age fields from DOB (takes priority over manual age)
      if (dob) {
        await calculateAndSaveAgeFields(patient.patientId, dob);
      } else if (age) {
        console.log(`✅ Manually entered age: ${age} years → ageYears=${age}, ageMonths=0, ageDays=0`);
      }
    }

    // Send email with credentials if patient has an email AND email was manually filled (not auto-filled from doctor)
    if (email && patient.patientId && emailWasManuallyFilled !== false) {
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
        console.log(`✅ Credentials email sent to ${email} for patient ${patient.patientId} (emailWasManuallyFilled: ${emailWasManuallyFilled})`);
      } catch (emailError) {
        console.warn('⚠️ Failed to send credentials email:', emailError.message);
        // Don't fail the registration if email fails
      }
    } else if (email && emailWasManuallyFilled === false) {
      console.log(`⏭️ SKIPPED: Email credentials NOT sent (email was auto-filled from referral doctor). Email: ${email}, Patient: ${patient.patientId}`);
    }

    // 🔍 DEBUG: Log what we're returning to frontend
    console.log('🔍 RESPONSE DEBUG - Returning patient to frontend:', {
      patientId: patient?.patientId,
      allTestsCount: patient?.tests?.length,
      currentVisitId: isExistingPatient ? visitId : (patient?.tests?.[0]?.visitId || 'UNKNOWN'),
      allTestVisitIds: patient?.tests?.map(t => t.visitId),
      firstTestVisitId: patient?.tests?.[0]?.visitId,
      firstTestData: {
        id: patient?.tests?.[0]?.id,
        visitId: patient?.tests?.[0]?.visitId,
        testId: patient?.tests?.[0]?.testId,
        charge: patient?.tests?.[0]?.charge
      }
    });

    res.status(201).json({
      success: true,
      message: isExistingPatient 
        ? `Tests added to existing patient (${patient.patientId})` 
        : 'New patient registered successfully',
      data: patient,
      isExistingPatient: isExistingPatient,
      // 🔧 FIX: Also return the visitId explicitly so frontend doesn't have to guess
      visitId: isExistingPatient ? visitId : (patient?.tests?.[0]?.visitId || null)
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
      guardianType = "self",
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
        guardianType: guardianType || 'self',
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

    // 🔧 FIX: Fetch balance amounts from VisitBill for each visit
    // ✅ ALSO fetch individual Payment records by mode
    const patientsWithBalance = await Promise.all(patientsWithFormattedAge.map(async (patient) => {
      // Group tests by visitId to get unique visits
      const visitIds = new Set(patient.tests.map(t => t.visitId).filter(Boolean));
      const visitIdArray = Array.from(visitIds);
      
      // Fetch VisitBill for each unique visit
      const visitBills = await prisma.visitBill.findMany({
        where: {
          visitId: { in: visitIdArray }
        },
        select: {
          visitId: true,
          balanceAmount: true,
          totalPaid: true,
          totalDiscount: true,
          grossAmount: true,
          status: true
        }
      });

      // ✅ NEW: Fetch individual Payment records by mode for each visit (ORDERED by creation time)
      const payments = await prisma.payment.findMany({
        where: {
          visitId: { in: visitIdArray }
        },
        select: {
          visitId: true,
          amount: true,
          paymentMode: true,
          createdAt: true,
          remarks: true
        },
        orderBy: {
          createdAt: 'asc'  // ✅ CHRONOLOGICAL ORDER (first payment first)
        }
      });

      console.log('💳 Raw Payment Records from DB:', payments.map(p => ({
        visitId: p.visitId,
        amount: p.amount,
        paymentMode: p.paymentMode,
        remarks: p.remarks
      })));

      // Create a map of visitId -> payment breakdown by mode
      const paymentMap = {};
      payments.forEach(payment => {
        if (!paymentMap[payment.visitId]) {
          paymentMap[payment.visitId] = {
            cash: 0, debitCard: 0, creditCard: 0, upi: 0, cheque: 0, netBanking: 0, other: 0,
            paymentSequence: []  // ✅ Track payment order
          };
        }
        const amount = payment.amount?.toNumber?.() || Number(payment.amount) || 0;
        const mode = (payment.paymentMode || "").toUpperCase();
        
        console.log(`💳 Processing payment: amount=${amount}, rawMode="${payment.paymentMode}", processedMode="${mode}"`);
        
        // ✅ Track payment chronologically
        paymentMap[payment.visitId].paymentSequence.push({
          amount: amount,
          mode: mode,
          timestamp: payment.createdAt,
          remarks: payment.remarks
        });
        
        // ✅ HANDLE ALL VARIATIONS: Cash, Debit Card, Credit Card, UPI, Cheque, etc.
        if (mode === "CASH") paymentMap[payment.visitId].cash += amount;
        else if (mode === "DEBIT_CARD" || mode === "DEBIT") {
          paymentMap[payment.visitId].debitCard += amount;
        }
        else if (mode === "CREDIT_CARD" || mode === "CREDIT") {
          paymentMap[payment.visitId].creditCard += amount;
        }
        else if (mode === "CARD") {
          // If just "CARD" without debit/credit designation, put in credit card
          paymentMap[payment.visitId].creditCard += amount;
        }
        else if (mode === "UPI") paymentMap[payment.visitId].upi += amount;
        else if (mode === "CHEQUE" || mode === "CHECK") paymentMap[payment.visitId].cheque += amount;
        else if (mode === "BANK_TRANSFER" || mode === "NET BANKING" || mode === "NEFT" || mode === "RTGS") paymentMap[payment.visitId].netBanking += amount;
        else {
          console.warn(`⚠️ Unknown payment mode: "${mode}", defaulting to other`);
          paymentMap[payment.visitId].other += amount;
        }
      });

      console.log('💰 Final Payment Map:', paymentMap);

      // Create a map of visitId -> balance data
      const balanceMap = {};
      visitBills.forEach(bill => {
        balanceMap[bill.visitId] = {
          balanceAmount: Math.round(bill.balanceAmount?.toNumber?.() || Number(bill.balanceAmount) || 0),
          paidAmount: Math.round(bill.totalPaid?.toNumber?.() || Number(bill.totalPaid) || 0),
          discountAmount: Math.round(bill.totalDiscount?.toNumber?.() || Number(bill.totalDiscount) || 0),
          grossAmount: Math.round(bill.grossAmount?.toNumber?.() || Number(bill.grossAmount) || 0),
          status: bill.status || 'PENDING'
        };
      });

      // Add balance amounts, payment breakdown, and status to tests
      return {
        ...patient,
        tests: patient.tests
          .filter(test => test.status !== 'Cancelled' && test.status !== 'CANCELLED')  // ✅ Filter out cancelled tests
          .map(test => ({
            ...test,
            balanceAmount: balanceMap[test.visitId]?.balanceAmount || 0,
            paidAmount: balanceMap[test.visitId]?.paidAmount || 0,
            discountAmount: balanceMap[test.visitId]?.discountAmount || 0,
            totalAmount: balanceMap[test.visitId]?.grossAmount || 0,
            billStatus: balanceMap[test.visitId]?.status || 'PENDING',
            // ✅ NEW: Add payment breakdown by mode (split debit/credit card)
            paymentsByMode: paymentMap[test.visitId] || {
              cash: 0, debitCard: 0, creditCard: 0, upi: 0, cheque: 0, netBanking: 0, other: 0,
              paymentSequence: []
            },
            // ✅ NEW: Track chronological payment order (shows which was paid first)
            paymentSequence: paymentMap[test.visitId]?.paymentSequence || []
          }))
      };
    }));

    console.log('✅ getAllPatients - Sample patient with balance:', {
      patientId: patientsWithBalance[0]?.patientId,
      firstTestBalance: patientsWithBalance[0]?.tests[0]?.balanceAmount,
      age: patientsWithBalance[0]?.age
    });

    res.json(buildPaginatedResponse(patientsWithBalance, total, page, limit));

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

    // ✅ Filter out cancelled tests
    const patientWithActiveTests = {
      ...patient,
      tests: patient.tests.filter(test => test.status !== 'Cancelled' && test.status !== 'CANCELLED')
    };

    res.json({
      success: true,
      data: patientWithActiveTests
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

    // ✅ Filter out cancelled tests from all patients
    const patientsWithActiveTests = patientsWithFormattedAge.map(patient => ({
      ...patient,
      tests: patient.tests.filter(test => test.status !== 'Cancelled' && test.status !== 'CANCELLED')
    }));

    console.log('✅ searchPatient - Sample patient with formatted age:', {
      patientId: patientsWithActiveTests[0]?.patientId,
      ageYears: patientsWithActiveTests[0]?.ageYears,
      ageMonths: patientsWithActiveTests[0]?.ageMonths,
      ageDays: patientsWithActiveTests[0]?.ageDays,
      age: patientsWithActiveTests[0]?.age
    });

    res.json(buildPaginatedResponse(patientsWithActiveTests, total, page, limit));

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
    const newBalanceAmount = Math.max(0, Math.round(totalAmount - discount - newPaidAmount));

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

    // Get location statistics
    const patients = await prisma.patient.findMany({
      where: dateFilter,
      select: {
        location: true
      }
    });

    // Group by location
    const locationStats = {};
    patients.forEach(patient => {
      const location = patient.location || 'Not Specified';
      locationStats[location] = (locationStats[location] || 0) + 1;
    });

    // Convert to array and sort by count
    const locationStatsArray = Object.entries(locationStats)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 locations

    res.json({
      success: true,
      data: {
        total,
        locationStats: locationStatsArray
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

// Get organization type statistics for dashboard
export const getOrganizationTypeStatistics = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    console.log('📊 getOrganizationTypeStatistics called with:', { fromDate, toDate });

    // Build date filter for patient tests
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

    console.log('📅 Date filter:', dateFilter);

    // Get all patient tests with their organization data
    const patientTests = await prisma.patientTest.findMany({
      where: {
        ...dateFilter,
        organizationId: { not: null }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isHomeCollection: true,
            isOPD: true,
            isIPD: true
          }
        }
      }
    });

    console.log('🧪 Total patient tests found:', patientTests.length);

    // Use Sets to count unique patients per organization type
    const homeCollectionPatients = new Set();
    const opdPatients = new Set();
    const ipdPatients = new Set();

    patientTests.forEach(test => {
      if (test.organization) {
        if (test.organization.isHomeCollection) {
          homeCollectionPatients.add(test.patientId);
        }
        if (test.organization.isOPD) {
          opdPatients.add(test.patientId);
        }
        if (test.organization.isIPD) {
          ipdPatients.add(test.patientId);
        }
      }
    });

    const stats = {
      homeCollection: homeCollectionPatients.size,
      opd: opdPatients.size,
      ipd: ipdPatients.size
    };

    console.log('✅ Final stats (unique patients):', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get organization type statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization type statistics'
    });
  }
};

// Get weekly organization type statistics for dashboard
export const getWeeklyOrganizationTypeStatistics = async (req, res) => {
  try {
    console.log('📊 getWeeklyOrganizationTypeStatistics called');

    // Get last 7 days data
    const weeklyData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Get patient tests for this day
      const patientTests = await prisma.patientTest.findMany({
        where: {
          createdAt: { gte: date, lte: endDate },
          organizationId: { not: null }
        },
        include: {
          organization: {
            select: {
              isHomeCollection: true,
              isOPD: true,
              isIPD: true
            }
          }
        }
      });

      // Count unique patients per type
      const homeCollectionPatients = new Set();
      const opdPatients = new Set();
      const ipdPatients = new Set();

      patientTests.forEach(test => {
        if (test.organization) {
          if (test.organization.isHomeCollection) homeCollectionPatients.add(test.patientId);
          if (test.organization.isOPD) opdPatients.add(test.patientId);
          if (test.organization.isIPD) ipdPatients.add(test.patientId);
        }
      });

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      weeklyData.push({
        day: dayName,
        date: date.toISOString().split('T')[0],
        homeCollection: homeCollectionPatients.size,
        opd: opdPatients.size,
        ipd: ipdPatients.size
      });
    }

    console.log('✅ Weekly stats:', weeklyData);

    res.json({
      success: true,
      data: weeklyData
    });

  } catch (error) {
    console.error('❌ Get weekly organization type statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly organization type statistics'
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
    const newBalanceAmount = Math.max(0, Math.round(totalAmount - discountAmount - paidAmount));

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

    const transactions = await prisma.payment.findMany({
      where: { visitId },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`✅ Found ${transactions.length} payment transactions for visit ${visitId}`);

    res.json({ 
      success: true, 
      data: transactions.map(t => ({
        visitId: t.visitId,
        paymentAmount: t.amount,
        paymentMode: t.paymentMode,
        remarks: t.remarks,
        createdAt: t.createdAt
      }))
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

    // ✅ NEW: Fetch VisitBill (master bill record)
    let visitBill = await prisma.visitBill.findUnique({
      where: { visitId },
      include: {
        billingSessions: {
          include: {
            discounts: true,
            payments: true,
            refunds: true
          }
        }
      }
    });

    // If VisitBill doesn't exist, create one from existing PatientTest data
    if (!visitBill) {
      console.log(`⚠️ VisitBill not found for visitId: ${visitId}, will calculate from PatientTest data`);
    }

    // Find all ACTIVE (non-cancelled) tests for this visit
    // ✅ IMPORTANT: Exclude cancelled tests from display
    const tests = await prisma.patientTest.findMany({
      where: { 
        visitId,
        status: { not: 'Cancelled' }  // ✅ Filter out cancelled tests
      },
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
        },
        patient: {
          select: {
            patientId: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`✅ Found ${tests.length} test(s) for visitId: ${visitId} (cancelled tests already filtered)`);

    // ✅ VERIFICATION: Ensure no cancelled tests in response
    const cancelledCount = tests.filter(t => t.status === 'Cancelled' || t.status === 'CANCELLED').length;
    if (cancelledCount > 0) {
      console.warn(`⚠️ WARNING: Found ${cancelledCount} cancelled tests that weren't filtered!`);
    }
    console.log(`🔍 Cancelled test verification: ${cancelledCount} cancelled tests found (should be 0)`);

    // If VisitBill doesn't exist, calculate totals from PatientTest records
    if (!visitBill && tests.length > 0) {
      console.log('📊 Calculating billing totals from PatientTest records...');
      
      // Sum up all test charges
      grossAmount = tests.reduce((sum, t) => sum + (parseFloat(t.charge) || 0), 0);
      
      // Sum up all discounts from PatientTest records
      totalDiscount = tests.reduce((sum, t) => sum + (parseFloat(t.discountAmount) || parseFloat(t.New_discountAmount) || 0), 0);
      
      // Sum up all payments
      totalPaid = tests.reduce((sum, t) => sum + (parseFloat(t.advanceAmount) || 0), 0);
      
      // Calculate balance
      balanceAmount = Math.max(0, grossAmount - totalDiscount - totalPaid);
      
      // Determine status
      if (balanceAmount <= 0) {
        billStatus = 'PAID';
      } else if (totalPaid > 0) {
        billStatus = 'PARTIAL';
      } else {
        billStatus = 'PENDING';
      }
      
      console.log('✅ Calculated from PatientTest:', { grossAmount, totalDiscount, totalPaid, balanceAmount, billStatus });
    }

    if (!tests || tests.length === 0) {
      return res.json({
        success: true,
        message: 'No tests found for this visit',
        data: {
          tests: [],
          billingSummary: {
            grossAmount: visitBill?.grossAmount || 0,
            totalDiscount: visitBill?.totalDiscount || 0,
            totalPaid: visitBill?.totalPaid || 0,
            balanceAmount: visitBill?.balanceAmount || 0,
            status: visitBill?.status || 'PENDING',
            billingSessions: visitBill?.billingSessions || []
          }
        }
      });
    }

    // ✅ Calculate billing summary FROM VisitBill (master record)
    let initialTestCharges = 0;
    let initialDiscountPercent = 0;
    let initialDiscountAmount = 0;
    let initialTestAmount = 0;
    let initialAdvanceAmount = 0;
    let initialBalanceAmount = 0;
    
    let newTestCharges = 0;
    let newDiscountPercent = 0;
    // ✅ GET BILLING DATA FROM VisitBill (master record) - NEW NORMALIZED STRUCTURE
    let grossAmount, totalDiscount, totalPaid, balanceAmount, billStatus;
    
    if (visitBill) {
      // Data from VisitBill table
      grossAmount = visitBill?.grossAmount ? parseFloat(visitBill.grossAmount) : 0;
      totalDiscount = visitBill?.totalDiscount ? parseFloat(visitBill.totalDiscount) : 0;
      totalPaid = visitBill?.totalPaid ? parseFloat(visitBill.totalPaid) : 0;
      balanceAmount = visitBill?.balanceAmount ? parseFloat(visitBill.balanceAmount) : 0;
      billStatus = visitBill?.status || 'PENDING';
      
      console.log('✅ Using VisitBill data:', { grossAmount, totalDiscount, totalPaid, balanceAmount });
    } else {
      // Fallback: Calculate from PatientTest records
      console.log('⚠️ VisitBill not found, calculating from PatientTest records...');
      // Will calculate after fetching tests
      grossAmount = 0;
      totalDiscount = 0;
      totalPaid = 0;
      balanceAmount = 0;
      billStatus = 'PENDING';
    }
    
    // Get latest discount details from BillDiscount records
    const latestDiscount = visitBill?.billingSessions
      ?.flatMap((session) => session.discounts || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    const discountType = latestDiscount?.discountType || 'FLAT';
    const discountValue = latestDiscount?.discountValue ? parseFloat(latestDiscount.discountValue) : 0;
    const discountRemark = latestDiscount?.remarks || '';
    
    // Get latest payment mode from Payment records
    const latestPayment = visitBill?.billingSessions
      ?.flatMap((session) => session.payments || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    const paymentMode = latestPayment?.paymentMode || 'CASH';
    
    // Use stored discount percent from VisitBill, or calculate if not available
    const totalDiscountPercent = visitBill?.totalDiscountPercent || (grossAmount > 0 ? Math.round((totalDiscount * 100) / grossAmount) : 0);
    
    console.log('💰 VisitBill Data:', {
      grossAmount,
      totalDiscount,
      totalPaid,
      balanceAmount,
      discountType,
      discountValue,
      paymentMode,
      status: billStatus
    });

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
      
      // Initial billing (from registration)
      testCharges: pt.testCharges || 0,
      discountPercent: pt.discountPercent || 0,
      discountAmount: pt.discountAmount || 0,
      testAmount: pt.testAmount || 0,
      advanceAmount: pt.advanceAmount || 0,
      balanceAmount: pt.balanceAmount || 0,
      
      // New billing (from search-booking additions)
      New_testCharges: pt.New_testCharges || 0,
      New_discountPercent: pt.New_discountPercent || 0,
      New_discountAmount: pt.New_discountAmount || 0,
      New_testAmount: pt.New_testAmount || 0,
      
      // Overall totals
      Total_testCharges: pt.Total_testCharges || 0,
      Total_discountPercent: pt.Total_discountPercent || 0,
      Total_discountAmount: pt.Total_discountAmount || 0,
      Total_testAmount: pt.Total_testAmount || 0,
      Net_Amount: pt.Net_Amount || 0,
      
      // Visit & status info
      visitId: pt.visitId,
      status: pt.status || 'Registered',
      barcode_status: pt.barcode_status || 'Unprinted',
      reportMode: pt.reportMode,
      referralDoctor: pt.referralDoctor,
      visitDate: pt.visitDate,
      visitTime: pt.visitTime,
      
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

    // ✅ Billing summary FROM VisitBill (normalized structure)
    const billingSummary = {
      // From VisitBill master record
      grossAmount: Math.round(grossAmount),
      totalDiscount: Math.round(totalDiscount),
      totalDiscountPercent,
      totalPaid: Math.round(totalPaid),
      balanceAmount: Math.round(balanceAmount),
      status: billStatus,
      
      // From BillDiscount records
      discountType,
      discountValue: Math.round(discountValue),
      discountRemark,
      
      // From Payment records
      paymentMode,
      
      // ✅ NET AMOUNT = BALANCE AMOUNT (what's actually owed after any settlement)
      netAmount: Math.round(balanceAmount),
      
      // Include billing sessions for detailed view
      billingSessions: visitBill?.billingSessions || []
    };

    console.log('💰 Billing Summary from VisitBill:', billingSummary);

    res.json({
      success: true,
      message: `Retrieved ${tests.length} test(s) for this visit`,
      data: {
        tests: transformedTests,
        billingSummary,
        visitBill: billingSummary,
        patientInfo: tests.length > 0 ? {
          patientId: tests[0].patientId,
          patientName: `${tests[0].patient?.firstName || ''} ${tests[0].patient?.lastName || ''}`.trim()
        } : null
      }
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


// ============================================
// BILLING OPERATIONS - NEW ENDPOINTS
// ============================================

// Apply discount to existing bill
export const applyDiscount = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { discountType, discountValue, remarks, createdBy } = req.body;

    // Validate inputs
    if (!visitId || !discountType || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'visitId, discountType, and discountValue are required'
      });
    }

    // Get the VisitBill
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId }
    });

    if (!visitBill) {
      return res.status(404).json({
        success: false,
        message: 'Visit bill not found'
      });
    }

    // Get the latest BillingSession
    const lastSession = await prisma.billingSession.findFirst({
      where: { visitId },
      orderBy: { sequence: 'desc' }
    });

    // Calculate discount amount
    const appliedOnAmount = visitBill.grossAmount.toNumber() - visitBill.totalDiscount.toNumber();
    let discountAmount = 0;

    if (discountType === 'PERCENTAGE') {
      discountAmount = (appliedOnAmount * parseFloat(discountValue)) / 100;
    } else if (discountType === 'FLAT') {
      discountAmount = parseFloat(discountValue);
    }

    // Create new BillingSession for DISCOUNT
    const sequence = await getNextSequence(visitId);
    const discountSession = await createBillingSession(
      visitId,
      'DISCOUNT',
      sequence,
      remarks || null,
      null  // ✅ createdBy must be Int or Null, not string
    );

    // Create BillDiscount record
    await createBillDiscount(
      visitId,
      discountSession.id,
      discountType,
      discountValue,
      discountAmount,
      appliedOnAmount,
      remarks || null,
      null  // ✅ createdBy must be Int or Null, not string
    );

    // Update VisitBill with new discount total
    const newTotalDiscount = visitBill.totalDiscount.toNumber() + discountAmount;
    const newBalance = Math.round(visitBill.grossAmount.toNumber() - newTotalDiscount - visitBill.totalPaid.toNumber());

    const updatedBill = await prisma.visitBill.update({
      where: { visitId },
      data: {
        totalDiscount: new Decimal(newTotalDiscount),
        balanceAmount: new Decimal(newBalance),
        status: newBalance <= 0 ? 'PAID' : visitBill.totalPaid.toNumber() > 0 ? 'PARTIAL' : 'PENDING'
      }
    });

    // Create BillTransaction for audit trail
    await createBillTransaction(
      visitId,
      discountSession.id,
      'DISCOUNT',
      discountAmount,
      newBalance,
      `${discountType} discount of ${discountValue}`,
      createdBy
    );

    res.json({
      success: true,
      message: 'Discount applied successfully',
      data: updatedBill
    });
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply discount',
      error: error.message
    });
  }
};

// Record payment for a visit
export const recordPayment = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { amount, paymentMode, remarks, receivedBy } = req.body;

    // Validate inputs
    if (!visitId || !amount || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: 'visitId, amount, and paymentMode are required'
      });
    }

    // Get the VisitBill
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId }
    });

    if (!visitBill) {
      return res.status(404).json({
        success: false,
        message: 'Visit bill not found'
      });
    }

    // Convert PaymentMode
    const mode = paymentMode || "";
    const payMode = mode === 'Cash' ? 'CASH' : 
                   mode === 'Debit Card' || mode === 'Debit' ? 'DEBIT_CARD' : 
                   mode === 'Credit Card' || mode === 'Credit' ? 'CREDIT_CARD' :
                   mode === 'Card' ? 'CARD' : 
                   mode === 'UPI' ? 'UPI' :
                   mode === 'Cheque' ? 'CHEQUE' :
                   paymentMode === 'Bank Transfer' ? 'BANK_TRANSFER' : 'OTHER';

    // Create new BillingSession for PAYMENT
    const sequence = await getNextSequence(visitId);
    const paymentSession = await createBillingSession(
      visitId,
      'PAYMENT',
      sequence,
      remarks || null,
      null  // ✅ createdBy must be Int or Null, not string
    );

    // Create Payment record
    await createPaymentRecord(
      visitId,
      paymentSession.id,
      amount,
      payMode,
      remarks || null,
      null  // ✅ receivedBy must be Int or Null, not string
    );

    // Update VisitBill with new payment total
    const newTotalPaid = visitBill.totalPaid.toNumber() + parseFloat(amount);
    const netAmount = visitBill.grossAmount.toNumber() - visitBill.totalDiscount.toNumber();
    const newBalance = Math.max(0, Math.round(netAmount - newTotalPaid));

    const updatedBill = await prisma.visitBill.update({
      where: { visitId },
      data: {
        totalPaid: new Decimal(newTotalPaid),
        balanceAmount: new Decimal(newBalance),
        status: newBalance <= 0 ? 'PAID' : newTotalPaid > 0 ? 'PARTIAL' : 'PENDING'
      }
    });

    // Create BillTransaction for audit trail
    await createBillTransaction(
      visitId,
      paymentSession.id,
      'PAYMENT',
      amount,
      newBalance,
      `Payment received via ${paymentMode}`,
      receivedBy
    );

    // Also create legacy PaymentTransaction for compatibility
    await prisma.paymentTransaction.create({
      data: {
        visitId,
        patientId: visitBill.patientId,
        paymentMode: paymentMode,
        paymentAmount: parseFloat(amount),
        remarks: remarks || `Payment received via ${paymentMode}`
      }
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: updatedBill
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

// Cancel a test and update billing
export const cancelTest = async (req, res) => {
  try {
    const { visitId, patientTestId } = req.params;
    const { remarks, cancelledBy } = req.body;

    console.log('🟡 [cancelTest] START - Received request:', {
      visitId,
      patientTestId,
      remarks,
      url: req.originalUrl,
      method: req.method
    });

    // Validate inputs
    if (!visitId || !patientTestId) {
      console.error('❌ [cancelTest] Missing required params:', { visitId, patientTestId });
      return res.status(400).json({
        success: false,
        message: 'visitId and patientTestId are required'
      });
    }

    // Get the PatientTest
    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) }
    });

    console.log('🔍 [cancelTest] PatientTest lookup:', {
      patientTestId,
      found: !!patientTest,
      testId: patientTest?.testId,
      status: patientTest?.status,
      charge: patientTest?.charge
    });

    if (!patientTest) {
      console.error('❌ [cancelTest] Test not found:', { patientTestId });
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    if (patientTest.status === 'Cancelled') {
      console.warn('⚠️ [cancelTest] Test already cancelled:', { patientTestId });
      return res.status(400).json({
        success: false,
        message: 'Test is already cancelled'
      });
    }

    // Get the VisitBill
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId }
    });

    console.log('💰 [cancelTest] VisitBill lookup:', {
      visitId,
      found: !!visitBill,
      grossAmount: visitBill?.grossAmount?.toString?.(),
      totalPaid: visitBill?.totalPaid?.toString?.(),
      balanceAmount: visitBill?.balanceAmount?.toString?.()
    });

    if (!visitBill) {
      console.error('❌ [cancelTest] VisitBill not found:', { visitId });
      return res.status(404).json({
        success: false,
        message: 'Visit bill not found'
      });
    }

    const testCharge = parseFloat(patientTest.charge || 0);
    
    console.log('📝 [cancelTest] Cancelling test:', {
      patientTestId,
      visitId,
      testName: patientTest.testId,
      testCharge,
      remarks
    });

    // ✅ WRAP IN TRANSACTION
    let updatedTest;
    let updatedBill;
    let refundRecord = null;
    
    await prisma.$transaction(async (tx) => {
      // Step 1: Mark PatientTest as Cancelled
      // ✅ Note: cancelledAt and cancelledReason fields don't exist in schema
      // Use updatedAt and comments fields instead
      updatedTest = await tx.patientTest.update({
        where: { id: parseInt(patientTestId) },
        data: { 
          status: 'Cancelled',
          updatedAt: new Date(),
          comments: remarks || 'User cancelled'
        }
      });
      
      console.log(`✅ [TX] PatientTest marked as Cancelled`);

      // Step 2: Get all ACTIVE tests for this visit to recalculate
      const activeTests = await tx.patientTest.findMany({
        where: { 
          visitId,
          status: { not: 'Cancelled' }  // Only non-cancelled tests
        }
      });
      
      // Calculate new gross amount from active tests only
      const newGrossAmount = activeTests.reduce((sum, t) => sum + parseFloat(t.charge || 0), 0);
      
      console.log(`✅ [TX] Active tests remaining: ${activeTests.length}, new gross: ₹${newGrossAmount}`);

      // Step 3: Recalculate discount proportionally (if applicable)
      const oldGross = visitBill.grossAmount.toNumber();
      const oldDiscount = visitBill.totalDiscount.toNumber();
      const discountPercent = oldGross > 0 ? (oldDiscount / oldGross) * 100 : 0;
      
      // New discount based on proportion
      const newDiscount = newGrossAmount > 0 
        ? Math.round((newGrossAmount * discountPercent) / 100)
        : 0;
      
      const discountReduction = oldDiscount - newDiscount;
      
      console.log(`✅ [TX] Discount recalculated: old=₹${oldDiscount}, new=₹${newDiscount}, reduction=₹${discountReduction}`);

      // Step 4: Create CANCEL_TEST BillingSession
      const lastSession = await tx.billingSession.findFirst({
        where: { visitId },
        orderBy: { sequence: 'desc' }
      });
      const nextSequence = (lastSession?.sequence || 0) + 1;
      
      const cancelSession = await tx.billingSession.create({
        data: {
          visitId,
          sessionType: 'CANCEL_TEST',
          sequence: nextSequence,
          remarks: remarks || `Cancelled test: ${patientTest.testId}`
        }
      });
      
      console.log(`✅ [TX] BillingSession created: CANCEL_TEST, sequence=${nextSequence}`);

      // Step 5: Calculate new balance and check for overpayment
      const oldBalance = visitBill.balanceAmount.toNumber();
      const oldPaid = visitBill.totalPaid.toNumber();
      
      // New amount due (after test cancellation and discount recalculation)
      const newAmountDue = newGrossAmount - newDiscount;
      
      // New balance (how much patient still owes)
      const newBalance = Math.max(0, Math.round(newAmountDue - oldPaid));
      
      // Check if patient overpaid
      const overpaymentAmount = Math.max(0, oldPaid - newAmountDue);
      
      console.log(`✅ [TX] Balance calculation:`, {
        oldGross,
        newGross: newGrossAmount,
        oldDiscount,
        newDiscount,
        oldPaid,
        newAmountDue,
        oldBalance,
        newBalance,
        overpaymentAmount
      });

      // Step 6: Create Refund record if overpaid
      if (overpaymentAmount > 0) {
        refundRecord = await tx.refund.create({
          data: {
            visitId,
            billingSessionId: cancelSession.id,
            amount: new Decimal(overpaymentAmount),
            reason: `Overpayment from cancelled test: ${patientTest.testId}`
          }
        });
        
        console.log(`✅ [TX] Refund created: ₹${overpaymentAmount}`);
      }

      // Step 7: Update VisitBill with recalculated values
      const totalDiscountPercent = newGrossAmount > 0 
        ? Math.round((newDiscount / newGrossAmount) * 100)
        : 0;
      
      updatedBill = await tx.visitBill.update({
        where: { visitId },
        data: {
          grossAmount: new Decimal(newGrossAmount),
          totalDiscount: new Decimal(newDiscount),
          totalDiscountPercent: totalDiscountPercent,
          balanceAmount: new Decimal(newBalance),
          status: newBalance <= 0 ? 'PAID' : oldPaid > 0 ? 'PARTIAL' : 'PENDING'
        }
      });
      
      console.log(`✅ [TX] VisitBill updated: grossAmount=₹${newGrossAmount}, balance=₹${newBalance}`);
    });
    
    console.log(`✅ Transaction completed successfully for CANCEL_TEST`);

    const responseData = {
      success: true,
      message: 'Test cancelled successfully',
      data: {
        updatedTest: {
          id: updatedTest.id,
          status: updatedTest.status,
          testId: updatedTest.testId
        },
        updatedBill: {
          ...updatedBill,
          grossAmount: updatedBill.grossAmount.toNumber(),
          totalDiscount: updatedBill.totalDiscount.toNumber(),
          totalPaid: updatedBill.totalPaid.toNumber(),
          totalRefund: updatedBill.totalRefund?.toNumber ? updatedBill.totalRefund.toNumber() : 0,
          balanceAmount: updatedBill.balanceAmount.toNumber()
        },
        refund: refundRecord ? {
          ...refundRecord,
          amount: refundRecord.amount.toNumber()
        } : null
      }
    };
    
    console.log('✅ [cancelTest] SUCCESS - Sending response:', {
      visitId,
      patientTestId,
      grossAmount: responseData.data.updatedBill.grossAmount,
      balanceAmount: responseData.data.updatedBill.balanceAmount
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ [cancelTest] EXCEPTION:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Failed to cancel test',
      error: error.message
    });
  }
};

// Get visit bill summary with all transactions
export const getBillSummary = async (req, res) => {
  try {
    const { visitId } = req.params;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'visitId is required'
      });
    }

    // Get VisitBill with all related records
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId },
      include: {
        billingSessions: {
          include: {
            discounts: true,
            payments: true,
            refunds: true
          },
          orderBy: { sequence: 'asc' }
        },
        discounts: true,
        payments: {
          orderBy: { createdAt: 'asc' }
        },
        refunds: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!visitBill) {
      return res.status(404).json({
        success: false,
        message: 'Visit bill not found'
      });
    }

    res.json({
      success: true,
      data: visitBill
    });
  } catch (error) {
    console.error('Get bill summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill summary',
      error: error.message
    });
  }
};

// Get transaction history for a visit (from BillingSession + Payment/Refund records)
export const getTransactionHistory = async (req, res) => {
  try {
    const { visitId } = req.params;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'visitId is required'
      });
    }

    // Get all billing sessions with related records
    const sessions = await prisma.billingSession.findMany({
      where: { visitId },
      include: {
        payments: true,
        discounts: true,
        refunds: true
      },
      orderBy: { sequence: 'asc' }
    });

    // Build transaction history from sessions
    const transactions = [];
    sessions.forEach(session => {
      transactions.push({
        type: session.sessionType,
        sequence: session.sequence,
        remarks: session.remarks,
        createdAt: session.createdAt,
        payments: session.payments,
        discounts: session.discounts,
        refunds: session.refunds
      });
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history',
      error: error.message
    });
  }
};


// Add tests to existing visit - Create new BillingSession for ADD_TEST
export const addTestsToExistingVisit = async (req, res) => {
  try {
    const { patientId, visitId, tests, discountPercent, discountAmount, discountRemark, businessType, payment, discount } = req.body;

    // Validate inputs
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
      discountPercent: discountPercent || discount?.discountPercent,
      discountAmount: discountAmount || discount?.discountAmount || discount?.amount,
      paymentAmount: payment?.amount,
      paymentMode: payment?.paymentMode,
      businessType
    });

    // Get existing VisitBill
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId }
    });

    if (!visitBill) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visit bill not found' 
      });
    }

    // Get existing tests for this visit
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
    
    // ✅ BILLING CALCULATION for new tests
    // Step 1: Calculate new test charges total
    const newTestChargesTotal = tests.reduce((sum, t) => sum + (parseFloat(t.charge) || 0), 0);
    
    // ✅ For Session 2+: Discount applies to BALANCE AMOUNT (not just new tests)
    // Balance amount = existing balance + new test charges
    const currentBalance = visitBill.balanceAmount.toNumber();
    const balanceAfterNewTests = currentBalance + newTestChargesTotal;
    
    // ✅ Extract discount fields from nested object OR top-level
    let finalDiscountPercent = discountPercent || (discount?.discountPercent) || 0;
    let finalDiscountAmount = discountAmount || (discount?.discountAmount) || (discount?.amount) || 0;
    const discountRemark_final = discountRemark || (discount?.discountRemark) || null;
    
    // ✅ Calculate discount on BALANCE AMOUNT (existing balance + new tests)
    let newDiscountPercent = 0;
    let newDiscountAmount = 0;
    
    if (parseFloat(finalDiscountPercent) > 0) {
      newDiscountPercent = parseFloat(finalDiscountPercent);
      newDiscountAmount = Math.round((balanceAfterNewTests * newDiscountPercent) / 100);
    } else if (parseFloat(finalDiscountAmount) > 0) {
      newDiscountAmount = parseFloat(finalDiscountAmount);
      newDiscountPercent = balanceAfterNewTests > 0 
        ? Math.round((newDiscountAmount / balanceAfterNewTests) * 100)
        : 0;
    }
    
    // Ensure new discount doesn't exceed balance
    newDiscountAmount = Math.min(newDiscountAmount, balanceAfterNewTests);
    
    // Step 3: Calculate overall totals (existing + new)
    const totalTestCharges = visitBill.grossAmount.toNumber() + newTestChargesTotal;
    const totalDiscountAmount = visitBill.totalDiscount.toNumber() + newDiscountAmount;
    const totalTestAmount = totalTestCharges - totalDiscountAmount;
    
    // Calculate new total paid (existing + new payment)
    let newTotalPaid = visitBill.totalPaid.toNumber();
    const paymentAmount = payment && parseFloat(payment.amount) > 0 ? parseFloat(payment.amount) : 0;
    newTotalPaid += paymentAmount;
    
    // ✅ Calculate final balance using formula: grossAmount - totalDiscount - totalPaid
    // ✅ ROUND to nearest rupee to avoid decimal precision issues (e.g., 1.00 instead of 0)
    const finalBalance = Math.max(0, Math.round(totalTestCharges - totalDiscountAmount - newTotalPaid));
    
    console.log('💰 Billing calculation for ADD_TEST:', {
      existingGross: visitBill.grossAmount.toNumber(),
      existingDiscount: visitBill.totalDiscount.toNumber(),
      existingBalance: currentBalance,
      newTestChargesTotal,
      balanceAfterNewTests,
      newDiscountPercent,
      newDiscountAmount,
      paymentAmount,
      finalBalance: 0, // Will calculate after
      totalTestCharges: 0, // Will calculate after
      totalDiscountAmount: 0, // Will calculate after
      totalPaid: 0 // Will calculate after
    });

    // ✅ WRAP IN TRANSACTION - All or nothing
    let allTestsForVisit;
    let updatedBill;
    
    await prisma.$transaction(async (tx) => {
      // Step 1: Create new BillingSession for ADD_TEST
      const lastSession = await tx.billingSession.findFirst({
        where: { visitId },
        orderBy: { sequence: 'desc' }
      });
      const nextSequence = (lastSession?.sequence || 0) + 1;
      
      const addTestSession = await tx.billingSession.create({
        data: {
          visitId,
          sessionType: 'ADD_TEST',
          sequence: nextSequence,
          remarks: `Added ${tests.length} new test(s)`
        }
      });
      
      console.log(`✅ [TX] BillingSession created: sessionType=ADD_TEST, sequence=${nextSequence}`);

      // Step 2: Create BillDiscount for new discount if applicable
      if (newDiscountAmount > 0) {
        const discountRecord = await tx.billDiscount.create({
          data: {
            visitId,
            billingSessionId: addTestSession.id,
            discountType: newDiscountPercent > 0 ? 'PERCENTAGE' : 'FLAT',
            discountValue: new Decimal(newDiscountPercent > 0 ? newDiscountPercent : newDiscountAmount),
            discountAmount: new Decimal(newDiscountAmount),
            appliedOnAmount: new Decimal(newTestChargesTotal),
            remarks: discountRemark_final || null
          }
        });
        console.log(`✅ [TX] BillDiscount created: id=${discountRecord.id}, ₹${newDiscountAmount}, type=${newDiscountPercent > 0 ? 'PERCENTAGE' : 'FLAT'}`);
      } else {
        console.log(`ℹ️ [TX] No discount for this session (newDiscountAmount=0)`);
      }

      // Step 3: Create Payment record if payment > 0
      if (paymentAmount > 0) {
        const mode = payment?.paymentMode || "";
        const payMode = mode === 'Cash' ? 'CASH' : 
                       mode === 'Debit Card' || mode === 'Debit' ? 'DEBIT_CARD' : 
                       mode === 'Credit Card' || mode === 'Credit' ? 'CREDIT_CARD' :
                       mode === 'Card' ? 'CARD' : 
                       mode === 'UPI' ? 'UPI' :
                       mode === 'Cheque' ? 'CHEQUE' :
                       mode === 'Bank Transfer' ? 'BANK_TRANSFER' : 'OTHER';
        
        await tx.payment.create({
          data: {
            visitId,
            billingSessionId: addTestSession.id,
            amount: new Decimal(paymentAmount),
            paymentMode: payMode,
            transactionStatus: 'SUCCESS',
            remarks: `Payment for added tests`,
            paymentDate: new Date()
          }
        });
        console.log(`✅ [TX] Payment created: ₹${paymentAmount}`);
      }

      // Step 4: Create PatientTest records for new tests (FIRST - source of truth)
      const newPatientTestsData = tests.map(test => {
        const testCharge = parseFloat(test.charge) || 0;
        
        return {
          patientId,
          visitId,
          testId: test.id || test.testId,
          departmentId: test.departmentId || 1,
          organizationId: firstExistingTest.organizationId,
          sample: test.sample || 'Blood',
          charge: testCharge,
          reportMode: firstExistingTest.reportMode,
          referralDoctor: firstExistingTest.referralDoctor,
          visitDate: firstExistingTest.visitDate,
          visitTime: firstExistingTest.visitTime,
          sampleTaken: firstExistingTest.sampleTaken,
          sampleReceived: firstExistingTest.sampleReceived,
          sampleBarcodeNo: firstExistingTest.sampleBarcodeNo,
          patient_history: firstExistingTest.patient_history,
          paymentMode: firstExistingTest.paymentMode,
          businessType: businessType || firstExistingTest.businessType,
          status: 'Registered',
          outsourcedTo: test.outsourcedTo || null,
          billingSessionId: addTestSession.id
        };
      });
      
      await tx.patientTest.createMany({
        data: newPatientTestsData
      });
      
      console.log(`✅ [TX] Created ${tests.length} new PatientTest records`);

      // Step 5: Update VisitBill LAST (summary/cache)
      const totalDiscountPercent = totalTestCharges > 0 
        ? Math.round((totalDiscountAmount / totalTestCharges) * 100)
        : 0;
      
      updatedBill = await tx.visitBill.update({
        where: { visitId },
        data: {
          grossAmount: new Decimal(totalTestCharges.toString()),
          totalDiscount: new Decimal(totalDiscountAmount.toString()),
          totalDiscountPercent: totalDiscountPercent,
          totalPaid: new Decimal(newTotalPaid.toString()),
          balanceAmount: new Decimal(finalBalance.toString()),
          status: finalBalance <= 0 ? 'PAID' : newTotalPaid > 0 ? 'PARTIAL' : 'PENDING'
        }
      });
      
      console.log(`✅ [TX] VisitBill updated: grossAmount=₹${totalTestCharges}, balance=₹${finalBalance}`);
    });
    
    console.log(`✅ Transaction completed successfully for ADD_TEST`);

    // Fetch all tests for this visit to return
    allTestsForVisit = await prisma.patientTest.findMany({
      where: { patientId, visitId },
      include: {
        test: {
          include: { sample_type: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      message: `${tests.length} test(s) added to existing visit successfully`,
      data: {
        patientId,
        visitId,
        allTests: allTestsForVisit,
        visitBill: {
          ...updatedBill,
          grossAmount: updatedBill.grossAmount.toNumber ? updatedBill.grossAmount.toNumber() : parseFloat(updatedBill.grossAmount),
          totalDiscount: updatedBill.totalDiscount.toNumber ? updatedBill.totalDiscount.toNumber() : parseFloat(updatedBill.totalDiscount),
          totalPaid: updatedBill.totalPaid.toNumber ? updatedBill.totalPaid.toNumber() : parseFloat(updatedBill.totalPaid),
          totalRefund: updatedBill.totalRefund?.toNumber ? updatedBill.totalRefund.toNumber() : 0,
          balanceAmount: updatedBill.balanceAmount.toNumber ? updatedBill.balanceAmount.toNumber() : parseFloat(updatedBill.balanceAmount)
        },
        billingSummary: {
          grossAmount: totalTestCharges,
          totalDiscount: totalDiscountAmount,
          totalDiscountPercent: Math.round((totalDiscountAmount / totalTestCharges) * 100),
          netAmount: totalTestAmount,
          totalPaid: newTotalPaid,
          balance: finalBalance
        }
      }
    });

  } catch (error) {
    console.error('Add tests to existing visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add tests to existing visit',
      error: error.message
    });
  }
};

// ✅ NEW: Add Payment Only to Existing Visit (no new tests)
export const addPaymentToVisit = async (req, res) => {
  try {
    const { patientId, visitId, payment, discount } = req.body;

    // Validate inputs
    if (!patientId || !visitId) {
      return res.status(400).json({ 
        success: false, 
        message: 'patientId and visitId are required' 
      });
    }

    const paymentAmount = payment && parseFloat(payment.amount) > 0 ? parseFloat(payment.amount) : 0;
    const discountPercent = discount?.discountPercent || 0;
    const discountAmount = discount?.discountAmount || 0;
    const discountRemark = discount?.discountRemark || null;

    // Check if there's anything to save
    if (paymentAmount === 0 && discountPercent === 0 && discountAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No payment or discount to process'
      });
    }

    // Get existing VisitBill
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId }
    });

    if (!visitBill) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visit bill not found' 
      });
    }

    console.log('📝 Adding payment/discount to existing visit:', {
      patientId,
      visitId,
      paymentAmount,
      discountPercent,
      discountAmount
    });

    // Calculate new discount if applicable
    let newDiscountAmount = 0;
    let newDiscountPercent = 0;

    if (parseFloat(discountPercent) > 0) {
      // Apply discount to current balance
      const currentBalance = visitBill.balanceAmount.toNumber();
      newDiscountPercent = parseFloat(discountPercent);
      newDiscountAmount = Math.round((currentBalance * newDiscountPercent) / 100);
    } else if (parseFloat(discountAmount) > 0) {
      newDiscountAmount = parseFloat(discountAmount);
      const currentBalance = visitBill.balanceAmount.toNumber();
      newDiscountPercent = currentBalance > 0 ? Math.round((newDiscountAmount / currentBalance) * 100) : 0;
    }

    // Ensure discount doesn't exceed balance
    const currentBalance = visitBill.balanceAmount.toNumber();
    newDiscountAmount = Math.min(newDiscountAmount, currentBalance);

    // Calculate new totals
    const totalTestCharges = visitBill.grossAmount.toNumber();
    const totalDiscountAmount = visitBill.totalDiscount.toNumber() + newDiscountAmount;
    let newTotalPaid = visitBill.totalPaid.toNumber() + paymentAmount;
    
    // ✅ Calculate final balance using formula: grossAmount - totalDiscount - totalPaid
    // ✅ ROUND to nearest rupee to avoid decimal precision issues (e.g., 1.00 instead of 0)
    const finalBalance = Math.max(0, Math.round(totalTestCharges - totalDiscountAmount - newTotalPaid));

    console.log('💰 Payment/Discount calculation:', {
      existingGross: visitBill.grossAmount.toNumber(),
      existingDiscount: visitBill.totalDiscount.toNumber(),
      existingBalance: visitBill.balanceAmount.toNumber(),
      newDiscountAmount,
      newDiscountPercent,
      paymentAmount,
      newTotalPaid,
      finalBalance,
      totalDiscountAmount
    });

    // ✅ WRAP IN TRANSACTION - All or nothing
    let updatedBill;
    
    await prisma.$transaction(async (tx) => {
      // Step 1: Create new BillingSession for PAYMENT
      const lastSession = await tx.billingSession.findFirst({
        where: { visitId },
        orderBy: { sequence: 'desc' }
      });
      const nextSequence = (lastSession?.sequence || 0) + 1;
      
      const paymentSession = await tx.billingSession.create({
        data: {
          visitId,
          sessionType: 'PAYMENT',
          sequence: nextSequence,
          remarks: `Payment received: ₹${paymentAmount}`
        }
      });
      
      console.log(`✅ [TX] BillingSession created: PAYMENT, sequence=${nextSequence}`);

      // Step 2: Create BillDiscount if discount > 0
      if (newDiscountAmount > 0) {
        await tx.billDiscount.create({
          data: {
            visitId,
            billingSessionId: paymentSession.id,
            discountType: newDiscountPercent > 0 ? 'PERCENTAGE' : 'FLAT',
            discountValue: new Decimal(newDiscountPercent > 0 ? newDiscountPercent : newDiscountAmount),
            discountAmount: new Decimal(newDiscountAmount),
            appliedOnAmount: new Decimal(currentBalance),
            remarks: discountRemark || null
          }
        });
        console.log(`✅ [TX] BillDiscount created: ₹${newDiscountAmount}`);
      }

      // Step 3: Create Payment record if payment > 0
      if (paymentAmount > 0) {
        const mode = payment?.paymentMode || "";
        const payMode = mode === 'Cash' ? 'CASH' : 
                       mode === 'Debit Card' || mode === 'Debit' ? 'DEBIT_CARD' : 
                       mode === 'Credit Card' || mode === 'Credit' ? 'CREDIT_CARD' :
                       mode === 'Card' ? 'CARD' : 
                       mode === 'UPI' ? 'UPI' :
                       mode === 'Cheque' ? 'CHEQUE' :
                       mode === 'Bank Transfer' ? 'BANK_TRANSFER' : 'OTHER';
        
        await tx.payment.create({
          data: {
            visitId,
            billingSessionId: paymentSession.id,
            amount: new Decimal(paymentAmount),
            paymentMode: payMode,
            transactionStatus: 'SUCCESS',
            remarks: `Payment`,
            paymentDate: new Date()
          }
        });
        console.log(`✅ [TX] Payment created: ₹${paymentAmount}`);
      }

      // Step 4: Update VisitBill (summary/cache)
      const totalDiscountPercent = totalTestCharges > 0 
        ? Math.round((totalDiscountAmount / totalTestCharges) * 100)
        : 0;
      
      updatedBill = await tx.visitBill.update({
        where: { visitId },
        data: {
          grossAmount: new Decimal(totalTestCharges.toString()),
          totalDiscount: new Decimal(totalDiscountAmount.toString()),
          totalDiscountPercent: totalDiscountPercent,
          totalPaid: new Decimal(newTotalPaid.toString()),
          balanceAmount: new Decimal(finalBalance.toString()),
          status: finalBalance <= 0 ? 'PAID' : newTotalPaid > 0 ? 'PARTIAL' : 'PENDING'
        }
      });
      
      console.log(`✅ [TX] VisitBill updated: balance=₹${finalBalance}, status=${finalBalance <= 0 ? 'PAID' : 'PARTIAL'}`);
    });
    
    console.log(`✅ Transaction completed successfully for PAYMENT`);

    res.json({
      success: true,
      message: `Payment processed successfully`,
      data: {
        patientId,
        visitId,
        visitBill: {
          ...updatedBill,
          grossAmount: updatedBill.grossAmount.toNumber ? updatedBill.grossAmount.toNumber() : parseFloat(updatedBill.grossAmount),
          totalDiscount: updatedBill.totalDiscount.toNumber ? updatedBill.totalDiscount.toNumber() : parseFloat(updatedBill.totalDiscount),
          totalPaid: updatedBill.totalPaid.toNumber ? updatedBill.totalPaid.toNumber() : parseFloat(updatedBill.totalPaid),
          totalRefund: updatedBill.totalRefund?.toNumber ? updatedBill.totalRefund.toNumber() : 0,
          balanceAmount: updatedBill.balanceAmount.toNumber ? updatedBill.balanceAmount.toNumber() : parseFloat(updatedBill.balanceAmount)
        }
      }
    });

  } catch (error) {
    console.error('Add payment to visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment to visit',
      error: error.message
    });
  }
};

// ✅ NEW: Get fresh VisitBill data for a specific visit (used to refresh balance after settlement)
export const getVisitBill = async (req, res) => {
  try {
    const { visitId } = req.params;

    console.log('📍 getVisitBill called with visitId:', visitId);

    if (!visitId) {
      console.warn('⚠️ visitId is missing');
      return res.status(400).json({
        success: false,
        message: 'visitId is required'
      });
    }

    // Fetch VisitBill data
    console.log('🔍 Querying database for visitId:', visitId);
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId }
    });

    if (!visitBill) {
      console.warn('⚠️ VisitBill not found for visitId:', visitId);
      return res.status(404).json({
        success: false,
        message: 'VisitBill not found'
      });
    }

    console.log('✅ VisitBill found:', {
      visitId: visitBill.visitId,
      balanceAmount: visitBill.balanceAmount?.toString?.() || visitBill.balanceAmount,
      status: visitBill.status
    });

    // Convert Decimal to Number for JSON response
    const response = {
      visitId: visitBill.visitId,
      balanceAmount: visitBill.balanceAmount?.toNumber?.() || Number(visitBill.balanceAmount) || 0,
      totalPaid: visitBill.totalPaid?.toNumber?.() || Number(visitBill.totalPaid) || 0,
      grossAmount: visitBill.grossAmount?.toNumber?.() || Number(visitBill.grossAmount) || 0,
      totalDiscount: visitBill.totalDiscount?.toNumber?.() || Number(visitBill.totalDiscount) || 0,
      status: visitBill.status || 'PENDING'
    };

    console.log('📤 Returning response:', response);

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ Get visit bill error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visit bill',
      error: error.message
    });
  }
};

// ===== EMERGENCY TEST MANAGEMENT =====

// Toggle emergency status for a patient test
export const toggleTestEmergency = async (req, res) => {
  try {
    const { patientTestId } = req.params;
    const { isEmergency } = req.body;

    if (!patientTestId) {
      return res.status(400).json({
        success: false,
        message: 'patientTestId is required'
      });
    }

    if (isEmergency === undefined || isEmergency === null) {
      return res.status(400).json({
        success: false,
        message: 'isEmergency flag is required'
      });
    }

    // Update the patient test with emergency flag
    const updatedTest = await prisma.patientTest.update({
      where: { id: parseInt(patientTestId) },
      data: {
        isEmergency: Boolean(isEmergency),
        emergencySetAt: isEmergency ? new Date() : null,
        emergencySetBy: req.user?.name || req.user?.username || 'SYSTEM',
        updatedAt: new Date()
      },
      include: {
        patient: true,
        test: true,
        department: true
      }
    });

    console.log(`✅ Test ${patientTestId} emergency status updated to: ${isEmergency}`);

    res.json({
      success: true,
      message: `Test marked as ${isEmergency ? 'emergency' : 'normal'}`,
      data: {
        id: updatedTest.id,
        patientId: updatedTest.patientId,
        testId: updatedTest.testId,
        testName: updatedTest.test?.name,
        isEmergency: updatedTest.isEmergency,
        emergencySetAt: updatedTest.emergencySetAt,
        emergencySetBy: updatedTest.emergencySetBy
      }
    });

  } catch (error) {
    console.error('❌ Toggle emergency error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency status',
      error: error.message
    });
  }
};
