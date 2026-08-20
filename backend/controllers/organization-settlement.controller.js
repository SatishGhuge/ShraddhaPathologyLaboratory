import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * Save single visit settlement with organization discount, TDS, and other discounts
 */
export const saveSettlement = async (req, res) => {
  try {
    const {
      visitId,
      orgId,
      orgDiscount,
      tdsChecked,
      tdsPercent,
      otherDiscountPercent,
      otherDiscountAmount,
      amountPaid,
      remark
    } = req.body;

    // Validate inputs
    if (!visitId || !orgId) {
      return res.status(400).json({
        success: false,
        message: 'visitId and orgId are required'
      });
    }

    console.log('🔍 Settlement Save Request:', {
      visitId,
      orgId,
      orgDiscount,
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

    // Get organization to verify discount
    const organization = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // ✅ Calculate Settlement Amounts
    const grandTotal = visitBill.grossAmount.toNumber();
    const finalOrgDiscount = Math.min(orgDiscount || 0, grandTotal);
    const afterOrgDiscount = grandTotal - finalOrgDiscount;

    // TDS Calculation (on amount after org discount)
    const tdsAmount = tdsChecked ? (afterOrgDiscount * (tdsPercent || 10)) / 100 : 0;

    // Other Discount Calculation
    const finalOtherDiscount = otherDiscountPercent
      ? (afterOrgDiscount * (otherDiscountPercent || 0)) / 100
      : (otherDiscountAmount || 0);

    // Final amount after all discounts
    const finalAmount = afterOrgDiscount - tdsAmount - finalOtherDiscount;

    // Calculate balance
    const paymentAmount = parseFloat(amountPaid) || 0;
    const balance = Math.max(0, finalAmount - paymentAmount);

    // Determine status
    let billStatus = 'PENDING';
    if (paymentAmount >= finalAmount) {
      billStatus = 'PAID';
    } else if (paymentAmount > 0) {
      billStatus = 'PARTIAL';
    }

    console.log('💰 Settlement Calculation:', {
      grandTotal,
      finalOrgDiscount,
      afterOrgDiscount,
      tdsAmount: Math.round(tdsAmount * 100) / 100,
      finalOtherDiscount: Math.round(finalOtherDiscount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
      paymentAmount,
      balance: Math.round(balance * 100) / 100,
      billStatus
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

      // Step 2: Create BillDiscount record for org discount
      if (finalOrgDiscount > 0) {
        await tx.billDiscount.create({
          data: {
            visitId,
            billingSessionId: settlementSession.id,
            discountType: 'FLAT',
            discountValue: finalOrgDiscount,
            discountAmount: finalOrgDiscount,
            appliedOnAmount: grandTotal,
            remarks: `Organization Discount`
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
            appliedOnAmount: afterOrgDiscount,
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
            appliedOnAmount: afterOrgDiscount,
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
      updatedBill = await tx.visitBill.update({
        where: { visitId },
        data: {
          totalDiscount: {
            increment: finalOrgDiscount + tdsAmount + finalOtherDiscount
          },
          totalPaid: {
            increment: paymentAmount
          },
          balanceAmount: balance,
          status: billStatus
        }
      });

      console.log('✅ Settlement Processed:', {
        visitId,
        settlementId: settlementSession.id,
        billStatus,
        newBalance: balance
      });
    });

    res.json({
      success: true,
      message: 'Settlement saved successfully',
      data: {
        visitId,
        settlement: {
          grandTotal,
          orgDiscount: finalOrgDiscount,
          tdsAmount: Math.round(tdsAmount * 100) / 100,
          otherDiscount: Math.round(finalOtherDiscount * 100) / 100,
          finalAmount: Math.round(finalAmount * 100) / 100,
          paymentAmount,
          balance: Math.round(balance * 100) / 100,
          status: billStatus
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
 * Save bulk patient settlement - multiple visits for one patient
 */
export const savePatientSettlement = async (req, res) => {
  try {
    const {
      patientId,
      orgId,
      visitIds = [],
      orgDiscount,
      tdsChecked,
      tdsPercent,
      otherDiscountPercent,
      otherDiscountAmount,
      amountPaid,
      remark
    } = req.body;

    // Validate inputs
    if (!patientId || !orgId || visitIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'patientId, orgId, and visitIds are required'
      });
    }

    console.log('🔍 Bulk Patient Settlement Request:', {
      patientId,
      orgId,
      visitIds,
      visitCount: visitIds.length,
      orgDiscount,
      tdsChecked,
      tdsPercent,
      otherDiscountPercent,
      otherDiscountAmount,
      amountPaid,
      remark
    });

    // Get organization to verify discount
    const organization = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get all VisitBill records for these visits
    const visitBills = await prisma.visitBill.findMany({
      where: {
        visitId: { in: visitIds }
      }
    });

    if (visitBills.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No visit bills found'
      });
    }

    console.log('📋 Found visit bills:', visitBills.length);

    // ✅ Calculate Combined Settlement Amounts
    // Sum all gross amounts from all visits
    const totalGrossAmount = visitBills.reduce((sum, vb) => sum + vb.grossAmount.toNumber(), 0);
    const finalOrgDiscount = Math.min(orgDiscount || 0, totalGrossAmount);
    const afterOrgDiscount = totalGrossAmount - finalOrgDiscount;

    // TDS Calculation (on combined amount after org discount)
    const tdsAmount = tdsChecked ? (afterOrgDiscount * (tdsPercent || 10)) / 100 : 0;

    // Other Discount Calculation
    const finalOtherDiscount = otherDiscountPercent
      ? (afterOrgDiscount * (otherDiscountPercent || 0)) / 100
      : (otherDiscountAmount || 0);

    // Final amount after all discounts
    const finalAmount = afterOrgDiscount - tdsAmount - finalOtherDiscount;

    // Calculate balance
    const paymentAmount = parseFloat(amountPaid) || 0;
    const balance = Math.max(0, finalAmount - paymentAmount);

    // Determine status
    let billStatus = 'PENDING';
    if (paymentAmount >= finalAmount) {
      billStatus = 'PAID';
    } else if (paymentAmount > 0) {
      billStatus = 'PARTIAL';
    }

    console.log('💰 Bulk Settlement Calculation:', {
      totalGrossAmount,
      finalOrgDiscount,
      afterOrgDiscount,
      tdsAmount: Math.round(tdsAmount * 100) / 100,
      finalOtherDiscount: Math.round(finalOtherDiscount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
      paymentAmount,
      balance: Math.round(balance * 100) / 100,
      billStatus
    });

    // ✅ WRAP IN TRANSACTION - All or nothing
    const updatedBills = [];

    await prisma.$transaction(async (tx) => {
      // Process each visit bill
      for (const visitBill of visitBills) {
        const visitId = visitBill.visitId;

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

        // Calculate proportional allocation of discounts for this visit
        const visitProportion = visitBill.grossAmount.toNumber() / totalGrossAmount;
        const visitOrgDiscount = finalOrgDiscount * visitProportion;
        const visitTdsAmount = tdsAmount * visitProportion;
        const visitOtherDiscount = finalOtherDiscount * visitProportion;
        const visitFinalAmount = (afterOrgDiscount * visitProportion) - visitTdsAmount - visitOtherDiscount;

        // Step 2: Create discount records
        if (visitOrgDiscount > 0) {
          await tx.billDiscount.create({
            data: {
              visitId,
              billingSessionId: settlementSession.id,
              discountType: 'FLAT',
              discountValue: visitOrgDiscount,
              discountAmount: visitOrgDiscount,
              appliedOnAmount: visitBill.grossAmount.toNumber(),
              remarks: `Organization Discount (Bulk Settlement)`
            }
          });
        }

        if (visitTdsAmount > 0) {
          await tx.billDiscount.create({
            data: {
              visitId,
              billingSessionId: settlementSession.id,
              discountType: 'PERCENTAGE',
              discountValue: tdsPercent || 10,
              discountAmount: visitTdsAmount,
              appliedOnAmount: visitBill.grossAmount.toNumber() - visitOrgDiscount,
              remarks: `TDS (${tdsPercent || 10}%) - Bulk Settlement`
            }
          });
        }

        if (visitOtherDiscount > 0) {
          const isPercentage = !!otherDiscountPercent;
          await tx.billDiscount.create({
            data: {
              visitId,
              billingSessionId: settlementSession.id,
              discountType: isPercentage ? 'PERCENTAGE' : 'FLAT',
              discountValue: isPercentage ? otherDiscountPercent : otherDiscountAmount,
              discountAmount: visitOtherDiscount,
              appliedOnAmount: visitBill.grossAmount.toNumber() - visitOrgDiscount,
              remarks: `Other Discount - Bulk Settlement`
            }
          });
        }

        // Step 3: Create Payment record (proportionally allocated)
        const visitPaymentAmount = paymentAmount * visitProportion;
        if (visitPaymentAmount > 0) {
          await tx.payment.create({
            data: {
              visitId,
              billingSessionId: settlementSession.id,
              amount: visitPaymentAmount,
              paymentMode: 'CASH',
              transactionStatus: 'SUCCESS',
              remarks: remark,
              paymentDate: new Date()
            }
          });
        }

        // Step 4: Update VisitBill
        const visitBalance = Math.max(0, visitFinalAmount - visitPaymentAmount);
        const visitBillStatus = visitPaymentAmount >= visitFinalAmount ? 'PAID' : (visitPaymentAmount > 0 ? 'PARTIAL' : 'PENDING');

        const updated = await tx.visitBill.update({
          where: { visitId },
          data: {
            totalDiscount: {
              increment: visitOrgDiscount + visitTdsAmount + visitOtherDiscount
            },
            totalPaid: {
              increment: visitPaymentAmount
            },
            balanceAmount: visitBalance,
            status: visitBillStatus
          }
        });

        updatedBills.push(updated);
      }

      console.log('✅ Bulk Settlement Processed for', updatedBills.length, 'visits');
    });

    res.json({
      success: true,
      message: 'Bulk settlement saved successfully',
      data: {
        patientId,
        visitCount: updatedBills.length,
        settlement: {
          totalGrossAmount,
          orgDiscount: finalOrgDiscount,
          tdsAmount: Math.round(tdsAmount * 100) / 100,
          otherDiscount: Math.round(finalOtherDiscount * 100) / 100,
          finalAmount: Math.round(finalAmount * 100) / 100,
          paymentAmount,
          balance: Math.round(balance * 100) / 100,
          status: billStatus
        }
      }
    });
  } catch (error) {
    console.error('❌ Bulk settlement save error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save bulk settlement',
      error: error.message
    });
  }
};

/**
 * Save organization-wide settlement - multiple visits across entire organization
 */
export const saveOrgSettlement = async (req, res) => {
  try {
    const {
      visitIds = [],
      applyOrgDiscount = true,
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

    console.log('🏢 Organization Settlement Request:', { 
      visitIds, 
      applyOrgDiscount,
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

    // Get PatientTest records to map visits to organizations
    const patientTests = await prisma.patientTest.findMany({
      where: { visitId: { in: visitIds } },
      include: { 
        organization: { 
          select: { id: true, name: true, discount: true } 
        } 
      }
    });

    // Create map of visit -> organization
    const visitOrgMap = new Map();
    for (const test of patientTests) {
      if (!visitOrgMap.has(test.visitId)) {
        visitOrgMap.set(test.visitId, test.organization);
      }
    }

    // Group visits by organization
    const visitsByOrg = new Map();
    for (const bill of visitBills) {
      const orgData = visitOrgMap.get(bill.visitId);
      const orgId = orgData?.id || 'unknown';
      if (!visitsByOrg.has(orgId)) {
        visitsByOrg.set(orgId, {
          orgId,
          orgName: orgData?.name,
          orgDiscount: orgData?.discount || 0,
          bills: []
        });
      }
      visitsByOrg.get(orgId).bills.push(bill);
    }

    const updatedBills = [];
    const settlementSummary = [];

    // Process each organization's settlements in a transaction
    await prisma.$transaction(async (tx) => {
      for (const [orgId, orgData] of visitsByOrg) {
        let { bills, orgName, orgDiscount } = orgData;
        
        // Filter out already-paid visits (balance = 0)
        bills = bills.filter(bill => {
          const balance = bill.balanceAmount?.toNumber?.() || parseFloat(bill.balanceAmount) || 0;
          return balance > 0.01;  // Only include visits with outstanding balance
        });
        
        if (bills.length === 0) {
          console.log(`⚠️ Skipping ${orgName} - all selected visits are already paid`);
          continue;  // Skip this organization if no pending visits
        }
        
        console.log(`\n📊 Processing Organization: ${orgName}`);
        console.log(`   Selected ${orgData.bills.length} visits, but ${orgData.bills.length - bills.length} are already paid`);
        console.log(`   Processing ${bills.length} pending visit(s)`);
        
        // Step 1: Calculate total GROSS AMOUNT from PENDING visit gross amounts only
        const totalGrossAmount = bills.reduce((sum, vb) => sum + (vb.grossAmount?.toNumber?.() || parseFloat(vb.grossAmount) || 0), 0);
        
        // Step 2: Apply organization discount on gross amount ONLY if checkbox is true
        const orgDiscountAmount = applyOrgDiscount ? (totalGrossAmount * orgDiscount) / 100 : 0;
        const afterOrgDiscount = totalGrossAmount - orgDiscountAmount;
        
        console.log(`   Apply Org Discount: ${applyOrgDiscount}`);
        console.log(`   Org Discount (${orgDiscount}%): -₹${orgDiscountAmount.toFixed(2)}`);
        console.log(`   After Org Discount: ₹${afterOrgDiscount.toFixed(2)}`);
        
        // Step 3: TDS calculation on gross amount ONLY if tdsPercent is provided
        const tdsAmount = tdsPercent && parseFloat(tdsPercent) > 0 ? (totalGrossAmount * parseFloat(tdsPercent)) / 100 : 0;
        
        console.log(`   TDS (${tdsPercent}%): -₹${tdsAmount.toFixed(2)}`);
        
        // Step 4: Other discount calculation on gross amount
        const finalOtherDiscount = otherDiscountPercent && parseFloat(otherDiscountPercent) > 0
          ? (totalGrossAmount * parseFloat(otherDiscountPercent)) / 100
          : parseFloat(otherDiscountAmount || 0);
        
        console.log(`   Other Discount: -₹${finalOtherDiscount.toFixed(2)}`);
        
        // Step 5: Total deductions
        const totalDeductions = orgDiscountAmount + tdsAmount + finalOtherDiscount;
        
        // Step 6: Final amount after all deductions (what organization receives after deductions)
        const finalAmountAfterDeductions = totalGrossAmount - totalDeductions;
        
        console.log(`   Total Deductions: ₹${totalDeductions.toFixed(2)}`);
        console.log(`   Final Amount (after deductions): ₹${finalAmountAfterDeductions.toFixed(2)}`);
        
        // Step 7: Get actual amount paid
        // We don't cap it here - we'll validate it's reasonable later
        const paymentAmount = parseFloat(amountPaid || 0);
        const paymentAmountForOrg = paymentAmount;
        
        console.log(`   Payment Received: ₹${paymentAmountForOrg.toFixed(2)}`);
        console.log(`   Total Gross Amount: ₹${totalGrossAmount.toFixed(2)}`);
        console.log(`   Amount After Deductions: ₹${finalAmountAfterDeductions.toFixed(2)}`);
        
        // Step 8: Determine if fully settled based on what we asked to be paid
        // If NO deductions: payment should equal gross amount
        // If deductions exist: payment should equal amount after deductions
        const amountWeAskedFor = totalDeductions > 0 ? finalAmountAfterDeductions : totalGrossAmount;
        const isFullySettled = Math.abs(paymentAmountForOrg - amountWeAskedFor) < 0.01;
        
        console.log(`   Amount Asked For: ₹${amountWeAskedFor.toFixed(2)}`);
        console.log(`   Is Fully Settled: ${isFullySettled}`);
        const orgSettlementData = {
          organizationId: orgId,
          visitIds: JSON.stringify(bills.map(b => b.visitId)),
          applyOrgDiscount,
          orgDiscountPercent: orgDiscount,
          orgDiscountAmount: new Decimal(orgDiscountAmount.toString()),
          tdsPercent: parseFloat(tdsPercent || 0),
          tdsAmount: new Decimal(tdsAmount.toString()),
          otherDiscountPercent: parseFloat(otherDiscountPercent || 0),
          otherDiscountAmount: new Decimal(parseFloat(otherDiscountAmount || 0).toString()),
          totalDiscount: new Decimal(totalDeductions.toString()),
          amountPaid: new Decimal(paymentAmountForOrg.toString()),
          remainingBalance: new Decimal(Math.max(0, totalGrossAmount - paymentAmountForOrg).toString()),
          status: isFullySettled ? 'SETTLED' : (paymentAmountForOrg > 0 ? 'PARTIAL' : 'PENDING'),
          remarks: remark
        };

        await tx.organizationSettlement.create({
          data: orgSettlementData
        });

        console.log(`✅ OrganizationSettlement created for ${orgName}`);

        // Step 10: Process each visit - update balance based on proportional payment allocation
        // When fully settled, ALL visits balance becomes 0 regardless of calculation
        let remainingPayment = paymentAmountForOrg;

        for (let i = 0; i < bills.length; i++) {
          const visitBill = bills[i];
          const visitId = visitBill.visitId;
          const isLastVisit = i === bills.length - 1;
          
          // Get current visit gross amount 
          const currentVisitGross = visitBill.grossAmount?.toNumber?.() || parseFloat(visitBill.grossAmount) || 0;
          
          let visitPaymentAmount;
          let newVisitBalance;

          if (isFullySettled) {
            // When fully settled, ALL visits get their full balance cleared
            visitPaymentAmount = currentVisitGross;
            newVisitBalance = 0;  // Fully settled - all balance becomes 0
          } else if (isLastVisit) {
            // Last visit gets all remaining payment (handles rounding)
            visitPaymentAmount = remainingPayment;
            newVisitBalance = Math.max(0, currentVisitGross - visitPaymentAmount);
          } else {
            // Other visits get proportional payment based on their gross amount
            const visitProportion = totalGrossAmount > 0 ? currentVisitGross / totalGrossAmount : 0;
            visitPaymentAmount = paymentAmountForOrg * visitProportion;
            newVisitBalance = Math.max(0, currentVisitGross - visitPaymentAmount);
            remainingPayment -= visitPaymentAmount; // Reduce remaining payment
          }
          
          // Determine status
          const visitBillStatus = newVisitBalance <= 0.01 ? 'PAID' : (visitPaymentAmount > 0 ? 'PARTIAL' : 'PENDING');

          console.log(`   Visit ${visitId}: gross=${currentVisitGross.toFixed(2)}, payment=${visitPaymentAmount.toFixed(2)}, newBalance=${newVisitBalance.toFixed(2)}, isFullySettled=${isFullySettled}, status=${visitBillStatus}`);

          // Update VisitBill - directly set the values
          let updateData = {
            status: visitBillStatus
          };
          
          // Always set balanceAmount based on calculation
          updateData.balanceAmount = new Decimal(newVisitBalance.toFixed(2));
          
          // Set totalPaid: 0 when fully settled, otherwise increment
          if (isFullySettled) {
            updateData.totalPaid = new Decimal(0);
            updateData.balanceAmount = new Decimal(0);  // Force to 0 when settled
          } else {
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
          orgId, 
          orgName, 
          billCount: bills.length,
          totalGrossAmount: totalGrossAmount.toFixed(2),
          orgDiscountAmount: orgDiscountAmount.toFixed(2),
          tdsAmount: tdsAmount.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          finalAmountAfterDeductions: finalAmountAfterDeductions.toFixed(2),
          paymentAmount: paymentAmountForOrg.toFixed(2),
          remainingBalance: Math.max(0, totalGrossAmount - paymentAmountForOrg).toFixed(2),
          isFullySettled
        });
      }
    });

    console.log('\n✅ Organization Settlement Processed for', updatedBills.length, 'visits across', visitsByOrg.size, 'organizations');

    res.json({
      success: true,
      message: 'Settlement saved successfully',
      data: { 
        visitCount: updatedBills.length, 
        organizationCount: visitsByOrg.size, 
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
 * Get organization settlement report - list all settlements for an organization
 */
export const getOrganizationSettlementReport = async (req, res) => {
  try {
    const { orgId, fromDate, toDate, status } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'orgId is required'
      });
    }

    console.log('🔍 Settlement Report Request:', { orgId, fromDate, toDate, status, page, limit });

    // Build date filter for billing sessions
    let dateFilter = {};
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }

    // First, get all PatientTest records for this organization
    const patientTestsForOrg = await prisma.patientTest.findMany({
      where: {
        organizationId: orgId
      },
      select: {
        visitId: true
      },
      distinct: ['visitId']
    });

    console.log(`📊 Found ${patientTestsForOrg.length} unique visits for organization ${orgId}`);

    if (patientTestsForOrg.length === 0) {
      return res.json(buildPaginatedResponse([], 0, page, limit));
    }

    // Get unique visit IDs
    const visitIds = patientTestsForOrg.map(pt => pt.visitId);
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

    // Get PatientTest details for each visit
    const visitTestsMap = new Map();
    if (visitBills.length > 0) {
      const tests = await prisma.patientTest.findMany({
        where: {
          visitId: { in: visitBills.map(b => b.visitId) },
          organizationId: orgId
        },
        include: {
          department: true,
          test: true,
          organization: {
            select: {
              name: true,
              code: true,
              discount: true
            }
          }
        }
      });

      for (const test of tests) {
        if (!visitTestsMap.has(test.visitId)) {
          visitTestsMap.set(test.visitId, []);
        }
        visitTestsMap.get(test.visitId).push(test);
      }
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
      
      // Get only PATIENT REGISTRATION discounts (not settlement discounts like org discount, TDS, etc)
      // Patient discounts come from REGISTRATION billing session
      let patientDiscount = 0;
      // We can't filter by billing session here, so we'll estimate:
      // Patient discount is the difference between gross and what's actually being settled
      // Actually, let's get it from the discounts array but only count remarks that don't contain "Organization" or "TDS"
      for (const discount of allDiscounts) {
        const remarks = (discount.remarks || '').toLowerCase();
        // Show discount only if it's NOT organization/TDS/other settlement discount
        if (!remarks.includes('organization') && !remarks.includes('tds') && !remarks.includes('other')) {
          patientDiscount += discount.discountAmount?.toNumber?.() || parseFloat(discount.discountAmount) || 0;
        }
      }

      // Get test details for this visit
      const visitTests = visitTestsMap.get(bill.visitId) || [];
      const department = visitTests.length > 0 ? (visitTests[0].department?.name || '-') : '-';
      const testShortNames = visitTests.map(t => t.test?.shortName || t.test?.name || '-').filter(Boolean);
      const test = testShortNames.length > 0 ? testShortNames.join(', ') : '-';
      const referralDoctor = visitTests.length > 0 ? (visitTests[0].referralDoctor || '-') : '-';
      const businessType = visitTests.length > 0 ? (visitTests[0].businessType || '-') : '-';
      const organizationName = visitTests.length > 0 ? (visitTests[0].organization?.name || '-') : '-';
      const orgCode = visitTests.length > 0 ? (visitTests[0].organization?.code || '-') : '-';
      const organizationDiscount = visitTests.length > 0 ? (visitTests[0].organization?.discount || 0) : 0;

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
        organizationDiscount,
        department,
        test,
        referralDoctor,
        businessType,
        grossAmount,
        cash: paymentsByMode.cash,
        card: paymentsByMode.card,
        upi: paymentsByMode.upi,
        cheque: paymentsByMode.cheque,
        netBanking: paymentsByMode.netBanking,
        totalPayment,
        discount: patientDiscount,  // ✅ Only patient registration discount
        netAmount: balance,  // ✅ Net amount = Current balance amount (shows ₹0 after full payment)
        balance: balance,  // ✅ Balance = Current balance amount (shows ₹0 after full payment)
        status: calculatedStatus,
        settledOn: settlementSession?.createdAt || bill.updatedAt,
        orgId: orgId
      };
    });

    console.log(`✅ Settlement Report Ready: ${data.length} records`);

    res.json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error) {
    console.error('❌ Get organization settlement report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization settlement report',
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
