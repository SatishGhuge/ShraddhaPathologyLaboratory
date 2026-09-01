import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * Save single visit settlement with referral doctor discount, TDS, and other discounts
 */
export const saveSettlement = async (req, res) => {
  try {
    const {
      visitId,
      referralDoctorId,
      referralDoctorName,
      doctorDiscount,
      tdsChecked,
      tdsPercent,
      otherDiscountPercent,
      otherDiscountAmount,
      amountPaid,
      remark
    } = req.body;

    // Validate inputs
    if (!visitId || !referralDoctorId || !referralDoctorName) {
      return res.status(400).json({
        success: false,
        message: 'visitId, referralDoctorId, and referralDoctorName are required'
      });
    }

    console.log('🔍 Referral Doctor Settlement Save Request:', {
      visitId,
      referralDoctorId,
      referralDoctorName,
      doctorDiscount,
      tdsChecked,
      tdsPercent,
      otherDiscountPercent,
      otherDiscountAmount,
      amountPaid,
      remark
    });

    // Get existing VisitBill
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId },
      include: { billingSession: true }
    });

    if (!visitBill) {
      return res.status(404).json({
        success: false,
        message: 'Visit bill not found'
      });
    }

    // ✅ Calculate Settlement Amounts (EXACTLY like organization settlement)
    const grandTotal = visitBill.grossAmount.toNumber();
    const finalDoctorDiscount = applyDoctorDiscount ? doctorDiscount : 0;
    
    // TDS Calculation (on GROSS amount, NOT on amount after doctor discount)
    const tdsAmount = tdsChecked ? (grandTotal * (tdsPercent || 10)) / 100 : 0;

    // Other Discount Calculation (on gross amount)
    const finalOtherDiscount = otherDiscountPercent
      ? (grandTotal * (otherDiscountPercent || 0)) / 100
      : (otherDiscountAmount || 0);

    // Final amount after all discounts
    const totalDeductions = finalDoctorDiscount + tdsAmount + finalOtherDiscount;
    const finalAmount = grandTotal - totalDeductions;

    // Calculate balance
    const paymentAmount = parseFloat(amountPaid) || 0;
    const balance = Math.max(0, finalAmount - paymentAmount);
    
    // Determine if fully settled (with tolerance for floating point)
    const isFullySettled = paymentAmount >= finalAmount - 0.01;

    // Determine status
    let billStatus = 'PENDING';
    if (isFullySettled) {
      billStatus = 'PAID';
    } else if (paymentAmount > 0) {
      billStatus = 'PARTIAL';
    }

    console.log('💰 Settlement Calculation:', {
      grandTotal,
      finalDoctorDiscount,
      tdsAmount: Math.round(tdsAmount * 100) / 100,
      finalOtherDiscount: Math.round(finalOtherDiscount * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
      paymentAmount,
      balance: Math.round(balance * 100) / 100,
      isFullySettled,
      billStatus,
      debug: `paymentAmount (${paymentAmount}) >= finalAmount-0.01 (${finalAmount - 0.01}) ? ${isFullySettled}`
    });

    // ✅ WRAP IN TRANSACTION - All or nothing
    let updatedBill;

    await prisma.$transaction(async (tx) => {
      // Step 1: Create BillingSession for this visit's SETTLEMENT
      const lastSession = await tx.billingSession.findFirst({
        where: { visitId },
        orderBy: { sequence: 'desc' }
      });
      const nextSequence = (lastSession?.sequence || 0) + 1;

      const settlementSession = await tx.billingSession.create({
        data: {
          visitId,
          sequence: nextSequence,
          sessionType: 'SETTLEMENT',
          remarks: remark
        }
      });

      // Step 2: Create BillDiscount record for doctor discount
      if (finalDoctorDiscount > 0) {
        await tx.billDiscount.create({
          data: {
            visitId,
            billingSessionId: settlementSession.id,
            discountType: 'FLAT',
            discountValue: finalDoctorDiscount,
            discountAmount: finalDoctorDiscount,
            appliedOnAmount: grandTotal,
            remarks: `Referral Doctor Discount`
          }
        });
      }

      // Step 3: Create BillDiscount record for TDS
      if (tdsAmount > 0) {
        await tx.billDiscount.create({
          data: {
            visitId,
            billingSessionId: settlementSession.id,
            discountType: 'PERCENTAGE',
            discountValue: tdsPercent || 10,
            discountAmount: tdsAmount,
            appliedOnAmount: grandTotal,
            remarks: `TDS (${tdsPercent || 10}%)`
          }
        });
      }

      // Step 4: Create BillDiscount record for Other Discount
      if (finalOtherDiscount > 0) {
        const isPercentage = !!otherDiscountPercent;
        await tx.billDiscount.create({
          data: {
            visitId,
            billingSessionId: settlementSession.id,
            discountType: isPercentage ? 'PERCENTAGE' : 'FLAT',
            discountValue: isPercentage ? otherDiscountPercent : otherDiscountAmount,
            discountAmount: finalOtherDiscount,
            appliedOnAmount: grandTotal,
            remarks: `Other Discount`
          }
        });
      }

      // Step 5: Create Payment record if amount is paid
      if (paymentAmount > 0) {
        await tx.payment.create({
          data: {
            visitId,
            billingSessionId: settlementSession.id,
            amount: paymentAmount,
            paymentMode: 'CASH',
            transactionStatus: 'SUCCESS',
            remarks: remark,
            paymentDate: new Date()
          }
        });
      }

      // Step 6: Update VisitBill with new totals
      let updateData = {
        status: billStatus,
        balanceAmount: new Decimal(balance.toFixed(2))
      };
      
      // Set totalPaid: 0 when fully settled, otherwise increment
      if (isFullySettled) {
        updateData.totalPaid = new Decimal(0);
        updateData.balanceAmount = new Decimal(0);  // Force to 0 when settled
      } else {
        updateData.totalPaid = { increment: new Decimal(paymentAmount.toFixed(2)) };
        updateData.totalDiscount = { increment: new Decimal(totalDeductions.toFixed(2)) };
      }
      
      updatedBill = await tx.visitBill.update({
        where: { visitId },
        data: updateData
      });

      console.log('✅ Settlement Processed:', {
        visitId,
        settlementId: settlementSession.id,
        billStatus,
        newBalance: balance,
        isFullySettled
      });
    });

    res.json({
      success: true,
      message: 'Settlement saved successfully',
      data: {
        visitId,
        settlement: {
          grandTotal,
          doctorDiscount: finalDoctorDiscount,
          tdsAmount: Math.round(tdsAmount * 100) / 100,
          otherDiscount: Math.round(finalOtherDiscount * 100) / 100,
          finalAmount: Math.round(finalAmount * 100) / 100,
          paymentAmount,
          balance: Math.round(balance * 100) / 100,
          status: billStatus,
          isFullySettled
        }
      }
    });
  } catch (error) {
    console.error('❌ Settlement save error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save settlement',
      error: error.message
    });
  }
};

/**
 * Save referral doctor settlement - multiple visits for one referral doctor
 */
export const saveReferralDoctorSettlement = async (req, res) => {
  try {
    const {
      visitIds = [],
      applyDoctorDiscount = true,
      doctorDiscountPercent = null,
      tdsPercent,
      otherDiscountPercent,
      otherDiscountAmount,
      amountPaid,
      remark
    } = req.body;

    if (!visitIds || visitIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'visitIds are required'
      });
    }

    console.log('👨‍⚕️ Referral Doctor Settlement Request:', { 
      visitIds, 
      applyDoctorDiscount,
      tdsPercent, 
      otherDiscountPercent, 
      otherDiscountAmount, 
      amountPaid 
    });

    // Get all VisitBill records
    const visitBills = await prisma.visitBill.findMany({
      where: { visitId: { in: visitIds } }
    });

    if (visitBills.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No visit bills found' 
      });
    }

    // Get PatientTest records to map visits to referral doctors
    const patientTests = await prisma.patientTest.findMany({
      where: { visitId: { in: visitIds } },
      select: {
        visitId: true,
        referralDoctor: true
      }
    });

    // Create map of visit -> referral doctor
    const visitDoctorMap = new Map();
    for (const test of patientTests) {
      if (!visitDoctorMap.has(test.visitId)) {
        visitDoctorMap.set(test.visitId, test.referralDoctor ? {
          name: test.referralDoctor,
          id: null  // Will be fetched from Doctor table later
        } : null);
      }
    }

    // Group visits by referral doctor
    const visitsByDoctor = new Map();
    for (const bill of visitBills) {
      const doctorData = visitDoctorMap.get(bill.visitId);
      const doctorName = doctorData?.name || 'Unknown';
      
      if (!visitsByDoctor.has(doctorName)) {
        visitsByDoctor.set(doctorName, {
          doctorName,
          bills: [],
          doctorId: null  // Will be fetched from database
        });
      }
      visitsByDoctor.get(doctorName).bills.push(bill);
    }

    // Fetch actual doctor IDs from Doctor table for all unique doctors
    const doctorNamesList = Array.from(visitsByDoctor.keys());
    const doctorMap = new Map();
    
    for (const docName of doctorNamesList) {
      try {
        const doctor = await prisma.doctor.findFirst({
          where: {
            name: {
              contains: docName
            }
          },
          select: { id: true }
        });
        if (doctor) {
          doctorMap.set(docName, doctor.id);
        }
      } catch (e) {
        // Fallback: fetch all and filter
        const allDoctors = await prisma.doctor.findMany({
          select: { id: true, name: true }
        });
        const matchedDoc = allDoctors.find(d => d.name.toLowerCase() === docName.toLowerCase());
        if (matchedDoc) {
          doctorMap.set(docName, matchedDoc.id);
        }
      }
    }

    // Fetch actual doctor discounts from Doctor table for all unique doctors
    // OR use provided discount from frontend if available (only for single doctor bulk settlements)
    const doctorDiscountMap = new Map();
    
    console.log(`📝 Frontend provided doctorDiscountPercent: ${doctorDiscountPercent}`);
    console.log(`📝 Number of unique doctors in selection: ${doctorNamesList.length}`);
    
    // Only use frontend-provided discount if there's exactly ONE doctor
    const useFrontendDiscount = doctorNamesList.length === 1 && 
                               doctorDiscountPercent !== null && 
                               doctorDiscountPercent !== undefined &&
                               doctorDiscountPercent !== 0;
    
    for (const docName of doctorNamesList) {
      // If frontend provided a discount AND this is a single-doctor settlement, use it
      if (useFrontendDiscount) {
        const discount = Number(doctorDiscountPercent);
        console.log(`✅ Using frontend discount: ${discount}% for ${docName} (single doctor settlement)`);
        doctorDiscountMap.set(docName, discount);
        continue;
      }
      
      // Otherwise, always fetch from database (safe approach for multi-doctor settlements)
      try {
        const doctor = await prisma.doctor.findFirst({
          where: {
            name: {
              contains: docName
            }
          },
          select: { discount: true }
        });
        if (doctor) {
          console.log(`✅ Fetched from DB: ${docName} has ${doctor.discount || 0}% discount`);
          doctorDiscountMap.set(docName, doctor.discount || 0);
        }
      } catch (e) {
        // Fallback: fetch all and filter
        const allDoctors = await prisma.doctor.findMany({
          select: { name: true, discount: true }
        });
        const matchedDoc = allDoctors.find(d => d.name.toLowerCase() === docName.toLowerCase());
        if (matchedDoc) {
          console.log(`✅ Fetched via fallback: ${docName} has ${matchedDoc.discount || 0}% discount`);
          doctorDiscountMap.set(docName, matchedDoc.discount || 0);
        } else {
          console.log(`⚠️ Doctor not found: ${docName}, using 0% discount`);
          doctorDiscountMap.set(docName, 0);
        }
      }
    }

    const updatedBills = [];
    const settlementSummary = [];

    // Process each doctor's settlements in a transaction
    await prisma.$transaction(async (tx) => {
      for (const [doctorName, doctorData] of visitsByDoctor) {
        let { bills } = doctorData;
        const doctorId = doctorMap.get(doctorName) || 0;  // Get actual doctor ID from map
        
        // Filter out already-paid visits (balance = 0)
        bills = bills.filter(bill => {
          const balance = bill.balanceAmount?.toNumber?.() || parseFloat(bill.balanceAmount) || 0;
          return balance > 0.01;  // Only include visits with outstanding balance
        });
        
        if (bills.length === 0) {
          console.log(`⚠️ Skipping ${doctorName} - all selected visits are already paid`);
          continue;  // Skip this doctor if no pending visits
        }
        
        console.log(`\n👨‍⚕️ Processing Referral Doctor: ${doctorName}`);
        console.log(`   Processing ${bills.length} pending visit(s)`);
        
        // Step 1: Calculate total GROSS AMOUNT from PENDING visit gross amounts only
        const totalGrossAmount = bills.reduce((sum, vb) => sum + (vb.grossAmount?.toNumber?.() || parseFloat(vb.grossAmount) || 0), 0);
        
        // Step 2: Apply doctor discount on gross amount ONLY if checkbox is true
        // Use actual doctor discount from database
        const doctorDiscountPercent = doctorDiscountMap.get(doctorName) || 0;
        const doctorDiscountAmount = applyDoctorDiscount ? (totalGrossAmount * doctorDiscountPercent) / 100 : 0;
        const afterDoctorDiscount = totalGrossAmount - doctorDiscountAmount;
        
        console.log(`   Apply Doctor Discount: ${applyDoctorDiscount}`);
        console.log(`   Doctor Discount (${doctorDiscountPercent}%): -₹${doctorDiscountAmount.toFixed(2)}`);
        console.log(`   After Doctor Discount: ₹${afterDoctorDiscount.toFixed(2)}`);
        
        // Step 3: TDS calculation on gross amount ONLY if tdsPercent is provided
        const tdsAmount = tdsPercent && parseFloat(tdsPercent) > 0 ? (totalGrossAmount * parseFloat(tdsPercent)) / 100 : 0;
        
        console.log(`   TDS (${tdsPercent}%): -₹${tdsAmount.toFixed(2)}`);
        
        // Step 4: Other discount calculation on gross amount
        const finalOtherDiscount = otherDiscountPercent && parseFloat(otherDiscountPercent) > 0
          ? (totalGrossAmount * parseFloat(otherDiscountPercent)) / 100
          : parseFloat(otherDiscountAmount || 0);
        
        console.log(`   Other Discount: -₹${finalOtherDiscount.toFixed(2)}`);
        
        // Step 5: Total deductions
        const totalDeductions = doctorDiscountAmount + tdsAmount + finalOtherDiscount;
        
        // Step 6: Final amount after all deductions
        const finalAmountAfterDeductions = totalGrossAmount - totalDeductions;
        
        console.log(`   Total Deductions: ₹${totalDeductions.toFixed(2)}`);
        console.log(`   Final Amount (after deductions): ₹${finalAmountAfterDeductions.toFixed(2)}`);
        
        // Step 7: Get actual amount paid
        const paymentAmount = parseFloat(amountPaid || 0);
        const paymentAmountForDoctor = paymentAmount;
        
        console.log(`   Payment Received: ₹${paymentAmountForDoctor.toFixed(2)}`);
        
        // Step 8: Determine if fully settled
        const amountWeAskedFor = totalDeductions > 0 ? finalAmountAfterDeductions : totalGrossAmount;
        const isFullySettled = Math.abs(paymentAmountForDoctor - amountWeAskedFor) < 0.01;
        
        const doctorSettlementData = {
          referralDoctorId: doctorId || 0,
          referralDoctorName: doctorName,
          visitIds: JSON.stringify(bills.map(b => b.visitId)),
          applyDoctorDiscount,
          doctorDiscountPercent: doctorDiscountPercent,
          doctorDiscountAmount: new Decimal(doctorDiscountAmount.toString()),
          tdsPercent: parseFloat(tdsPercent || 0),
          tdsAmount: new Decimal(tdsAmount.toString()),
          otherDiscountPercent: parseFloat(otherDiscountPercent || 0),
          otherDiscountAmount: new Decimal(parseFloat(otherDiscountAmount || 0).toString()),
          totalDiscount: new Decimal(totalDeductions.toString()),
          amountPaid: new Decimal(paymentAmountForDoctor.toString()),
          remainingBalance: new Decimal(Math.max(0, totalGrossAmount - paymentAmountForDoctor).toString()),
          status: isFullySettled ? 'SETTLED' : (paymentAmountForDoctor > 0 ? 'PARTIAL' : 'PENDING'),
          remarks: remark
        };

        await tx.referralDoctorSettlement.create({
          data: doctorSettlementData
        });

        console.log(`✅ ReferralDoctorSettlement created for ${doctorName}`);

        // Step 10: Process each visit - update balance based on proportional payment allocation
        let remainingPayment = paymentAmountForDoctor;

        for (let i = 0; i < bills.length; i++) {
          const visitBill = bills[i];
          const visitId = visitBill.visitId;
          const isLastVisit = i === bills.length - 1;
          
          const currentVisitGross = visitBill.grossAmount?.toNumber?.() || parseFloat(visitBill.grossAmount) || 0;
          
          let visitPaymentAmount;
          let newVisitBalance;

          if (isFullySettled) {
            visitPaymentAmount = currentVisitGross;
            newVisitBalance = 0;
          } else if (isLastVisit) {
            visitPaymentAmount = remainingPayment;
            newVisitBalance = Math.max(0, currentVisitGross - visitPaymentAmount);
          } else {
            const visitProportion = totalGrossAmount > 0 ? currentVisitGross / totalGrossAmount : 0;
            visitPaymentAmount = paymentAmountForDoctor * visitProportion;
            newVisitBalance = Math.max(0, currentVisitGross - visitPaymentAmount);
            remainingPayment -= visitPaymentAmount;
          }
          
          const visitBillStatus = newVisitBalance <= 0.01 ? 'PAID' : (visitPaymentAmount > 0 ? 'PARTIAL' : 'PENDING');

          console.log(`   Visit ${visitId}: gross=${currentVisitGross.toFixed(2)}, payment=${visitPaymentAmount.toFixed(2)}, newBalance=${newVisitBalance.toFixed(2)}, isFullySettled=${isFullySettled}, status=${visitBillStatus}`);

          let updateData = {
            status: visitBillStatus
          };
          
          // Always set balanceAmount based on calculation
          updateData.balanceAmount = new Decimal(newVisitBalance.toFixed(2));
          
          // Update totalPaid
          if (isFullySettled) {
            // When fully settled, totalPaid should be the gross amount (all paid)
            updateData.totalPaid = new Decimal(currentVisitGross.toFixed(2));
            updateData.balanceAmount = new Decimal(0);  // Force to 0 when settled
          } else {
            // Otherwise, increment totalPaid
            updateData.totalPaid = { increment: new Decimal(visitPaymentAmount.toFixed(2)) };
          }
          
          const updated = await tx.visitBill.update({
            where: { visitId },
            data: updateData
          });
          
          console.log(`   ✅ VisitBill updated: visitId=${visitId}, balanceAmount=${updated.balanceAmount}, totalPaid=${updated.totalPaid}, status=${updated.status}`);
          
          updatedBills.push(updated);
        }

        // Add to summary
        settlementSummary.push({
          doctorId, 
          doctorName, 
          billCount: bills.length,
          totalGrossAmount: totalGrossAmount.toFixed(2),
          doctorDiscountAmount: doctorDiscountAmount.toFixed(2),
          tdsAmount: tdsAmount.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          finalAmountAfterDeductions: finalAmountAfterDeductions.toFixed(2),
          paymentAmount: paymentAmountForDoctor.toFixed(2),
          remainingBalance: Math.max(0, totalGrossAmount - paymentAmountForDoctor).toFixed(2),
          isFullySettled
        });
      }
    });

    console.log('\n✅ Referral Doctor Settlement Processed for', updatedBills.length, 'visits across', visitsByDoctor.size, 'doctors');

    res.json({
      success: true,
      message: 'Settlement saved successfully',
      data: { 
        visitCount: updatedBills.length, 
        doctorCount: visitsByDoctor.size, 
        summary: settlementSummary 
      }
    });
  } catch (error) {
    console.error('❌ Settlement error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save settlement', 
      error: error.message 
    });
  }
};

/**
 * Get referral doctor settlement report - list all settlements for a referral doctor
 */
export const getReferralDoctorSettlementReport = async (req, res) => {
  try {
    const { referralDoctorName, fromDate, toDate, status } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);

    if (!referralDoctorName) {
      return res.status(400).json({
        success: false,
        message: 'referralDoctorName is required'
      });
    }

    console.log('🔍 Settlement Report Request:', { referralDoctorName, fromDate, toDate, status, page, limit });

    // Build date filter for billing sessions
    let dateFilter = {};
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }

    // First, get all PatientTest records for this referral doctor (case-insensitive)
    // Use contains for case-sensitive search, then fallback to JavaScript filtering
    let patientTestsForDoctor = [];
    
    try {
      patientTestsForDoctor = await prisma.patientTest.findMany({
        where: {
          referralDoctor: {
            contains: referralDoctorName
          }
        },
        select: {
          visitId: true
        },
        distinct: ['visitId']
      });
    } catch (e) {
      console.log('Contains query failed, using fallback');
    }

    // Fallback: if contains didn't work, fetch all and filter in JavaScript for case-insensitive match
    if (patientTestsForDoctor.length === 0) {
      const allTests = await prisma.patientTest.findMany({
        where: {
          referralDoctor: {
            not: null
          }
        },
        select: {
          visitId: true,
          referralDoctor: true
        },
        distinct: ['visitId']
      });

      patientTestsForDoctor = allTests.filter(t =>
        t.referralDoctor &&
        t.referralDoctor.toLowerCase().includes(referralDoctorName.toLowerCase())
      );
    }

    console.log(`📊 Found ${patientTestsForDoctor.length} unique visits for referral doctor ${referralDoctorName}`);

    if (patientTestsForDoctor.length === 0) {
      return res.json(buildPaginatedResponse([], 0, page, limit));
    }

    // Get unique visit IDs from raw query result
    const visitIds = patientTestsForDoctor.map(pt => pt.visitId);
    console.log(`📋 Unique visits: ${visitIds.length}`);

    // Build where clause for VisitBill
    let visitBillWhere = {
      visitId: { in: visitIds }
    };

    if (status) {
      visitBillWhere.status = status;
    }

    // If date filter is provided, filter by visit creation date
    if (Object.keys(dateFilter).length > 0) {
      visitBillWhere.createdAt = dateFilter;
    }

    // Fetch total count for pagination
    const totalCount = await prisma.visitBill.count({
      where: visitBillWhere
    });

    console.log(`📊 Total count of bills matching criteria: ${totalCount}`);

    // Fetch paginated settlement sessions with related data
    const visitBills = await prisma.visitBill.findMany({
      where: visitBillWhere,
      include: {
        patient: {
          select: {
            patientId: true,
            firstName: true,
            lastName: true,
            mobile: true,
            email: true
          }
        },
        billingSessions: {
          where: { sessionType: 'SETTLEMENT' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        payments: true,
        discounts: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    console.log(`📈 Fetched ${visitBills.length} visit bills with settlements`);

    // Get PatientTest details for each visit (case-insensitive) and fetch doctor discount
    const visitTestsMap = new Map();
    let doctorDiscount = 0;
    let doctorId = 0;
    
    if (visitBills.length > 0) {
      // Use Prisma findMany with contains for case-sensitive search
      let tests = [];
      
      try {
        tests = await prisma.patientTest.findMany({
          where: {
            visitId: { in: visitBills.map(b => b.visitId) },
            referralDoctor: {
              contains: referralDoctorName
            }
          },
          include: {
            department: {
              select: { name: true }
            },
            test: {
              select: { name: true, shortName: true }
            },
            organization: {
              select: { name: true, code: true }
            }
          }
        });
      } catch (e) {
        console.log('Contains query failed, using fallback');
      }

      // Fallback: if contains didn't work, fetch all and filter in JavaScript for case-insensitive match
      let filteredTests = tests;
      if (tests.length === 0) {
        const allTests = await prisma.patientTest.findMany({
          where: {
            visitId: { in: visitBills.map(b => b.visitId) }
          },
          include: {
            department: {
              select: { name: true }
            },
            test: {
              select: { name: true, shortName: true }
            },
            organization: {
              select: { name: true, code: true }
            }
          }
        });

        filteredTests = allTests.filter(t =>
          t.referralDoctor &&
          t.referralDoctor.toLowerCase().includes(referralDoctorName.toLowerCase())
        );
      }

      for (const test of filteredTests) {
        if (!visitTestsMap.has(test.visitId)) {
          visitTestsMap.set(test.visitId, []);
        }
        visitTestsMap.get(test.visitId).push(test);
      }
      
      // Fetch doctor discount and ID from Doctor table by matching name (case-insensitive)
      let doctor = null;
      
      try {
        doctor = await prisma.doctor.findFirst({
          where: {
            name: {
              contains: referralDoctorName
            }
          },
          select: {
            id: true,
            discount: true
          }
        });
        if (doctor) {
          doctorId = doctor.id;
        }
      } catch (e) {
        console.log('Contains query failed for doctor, using fallback');
      }
      
      // Fallback: filter by name case-insensitively if contains doesn't work
      if (!doctor) {
        const allDoctors = await prisma.doctor.findMany({
          select: {
            id: true,
            name: true,
            discount: true
          }
        });
        
        const matchedDoctor = allDoctors.find(d =>
          d.name && d.name.toLowerCase() === referralDoctorName.toLowerCase()
        );
        
        if (matchedDoctor) {
          doctorDiscount = matchedDoctor.discount || 0;
          doctorId = matchedDoctor.id;
        }
      } else {
        doctorDiscount = doctor.discount || 0;
      }
      
      console.log(`💰 Doctor found: ID=${doctorId}, Discount=${doctorDiscount}% for ${referralDoctorName}`);
    }

    // Map to response format
    const data = visitBills.map(bill => {
      // Get the most recent settlement session
      const settlementSession = bill.billingSessions?.length > 0 
        ? bill.billingSessions[0] 
        : null;
      
      // Get all payments and discounts
      const allDiscounts = bill.discounts || [];
      const allPayments = bill.payments || [];
      
      // Calculate financial totals
      const totalDiscount = bill.totalDiscount?.toNumber?.() || parseFloat(bill.totalDiscount) || 0;
      const totalPayment = bill.totalPaid?.toNumber?.() || parseFloat(bill.totalPaid) || 0;
      const grossAmount = bill.grossAmount?.toNumber?.() || parseFloat(bill.grossAmount) || 0;
      const balance = bill.balanceAmount?.toNumber?.() || parseFloat(bill.balanceAmount) || 0;
      
      // Get only PATIENT REGISTRATION discounts (not settlement discounts)
      let patientDiscount = 0;
      for (const discount of allDiscounts) {
        const remarks = (discount.remarks || '').toLowerCase();
        if (!remarks.includes('doctor') && !remarks.includes('referral') && !remarks.includes('tds') && !remarks.includes('other')) {
          patientDiscount += discount.discountAmount?.toNumber?.() || parseFloat(discount.discountAmount) || 0;
        }
      }

      // Get test details for this visit
      const visitTests = visitTestsMap.get(bill.visitId) || [];
      const department = visitTests.length > 0 ? (visitTests[0].department?.name || '-') : '-';
      const testShortNames = visitTests.map(t => t.test?.shortName || t.test?.name || '-').filter(Boolean);
      const test = testShortNames.length > 0 ? testShortNames.join(', ') : '-';
      const businessType = visitTests.length > 0 ? (visitTests[0].businessType || '-') : '-';
      const organizationName = visitTests.length > 0 ? (visitTests[0].organization?.name || '-') : '-';
      const orgCode = visitTests.length > 0 ? (visitTests[0].organization?.code || '-') : '-';

      // Break down payments by mode
      const paymentsByMode = {
        cash: 0,
        card: 0,
        upi: 0,
        cheque: 0,
        netBanking: 0
      };

      for (const payment of allPayments) {
        const mode = (payment.paymentMode || 'CASH').toLowerCase();
        const amount = payment.amount?.toNumber?.() || parseFloat(payment.amount) || 0;
        if (mode === 'cash') paymentsByMode.cash += amount;
        else if (mode === 'card' || mode === 'debit card' || mode === 'credit card') paymentsByMode.card += amount;
        else if (mode === 'upi') paymentsByMode.upi += amount;
        else if (mode === 'cheque') paymentsByMode.cheque += amount;
        else if (mode === 'bank_transfer' || mode === 'net banking') paymentsByMode.netBanking += amount;
        else paymentsByMode.cash += amount;
      }

      // Calculate status
      let calculatedStatus = 'PENDING';
      if (balance <= 0.01) {
        calculatedStatus = 'PAID';
      } else if (totalPayment > 0) {
        calculatedStatus = 'PARTIAL';
      }

      return {
        id: bill.id,
        visitId: bill.visitId,
        visitDate: bill.createdAt,
        patientName: `${bill.patient?.firstName || ''} ${bill.patient?.lastName || ''}`.trim(),
        patientMobile: bill.patient?.mobile || '-',
        patientEmail: bill.patient?.email || '-',
        organizationName,
        orgCode,
        department,
        test,
        referralDoctor: referralDoctorName,
        doctorId: doctorId || 0,
        doctorDiscount: doctorDiscount,
        businessType,
        grossAmount,
        cash: paymentsByMode.cash,
        card: paymentsByMode.card,
        upi: paymentsByMode.upi,
        cheque: paymentsByMode.cheque,
        netBanking: paymentsByMode.netBanking,
        totalPayment,
        discount: patientDiscount,
        netAmount: balance,
        balance: balance,
        status: calculatedStatus,
        settledOn: settlementSession?.createdAt || bill.updatedAt
      };
    });

    console.log(`✅ Settlement Report Ready: ${data.length} records`);

    res.json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error) {
    console.error('❌ Get referral doctor settlement report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral doctor settlement report',
      error: error.message
    });
  }
};

/**
 * Helper function for pagination
 */
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page || 1));
  const limit = Math.min(100, parseInt(query.limit || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Helper function to build paginated response
 */
const buildPaginatedResponse = (data, total, page, limit) => {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get all unique referral doctors with tests
 */
export const getUniqueDoctors = async (req, res) => {
  try {
    const doctors = await prisma.patientTest.findMany({
      where: {
        referralDoctor: {
          not: null
        }
      },
      select: {
        referralDoctor: true
      },
      distinct: ['referralDoctor']
    });

    const uniqueDoctors = doctors
      .map(d => d.referralDoctor)
      .filter(d => d && d.trim() !== '')
      .sort();

    res.json({
      success: true,
      data: uniqueDoctors
    });
  } catch (error) {
    console.error('Error fetching unique doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors',
      error: error.message
    });
  }
};
