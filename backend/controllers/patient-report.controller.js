import prisma from '../config/database.js';

// Get patient visit report with detailed discount breakdown
export const getPatientVisitReport = async (req, res) => {
  try {
    const { patientId, visitId } = req.query;

    if (!patientId || !visitId) {
      return res.status(400).json({
        success: false,
        message: 'patientId and visitId are required'
      });
    }

    // Get all tests for this visit
    const tests = await prisma.patientTest.findMany({
      where: { patientId, visitId },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        }
      }
    });

    if (!tests.length) {
      return res.status(404).json({
        success: false,
        message: 'No tests found for this visit'
      });
    }

    // Calculate all totals
    const totalCharge = tests.reduce((sum, t) => sum + (t.charge || 0), 0);
    const originalDiscount = tests.reduce((sum, t) => sum + (t.originalDiscountAmount || 0), 0);
    const additionalDiscount = tests.reduce((sum, t) => sum + (t.additionalDiscountAmount || 0), 0);
    const totalDiscount = originalDiscount + additionalDiscount;
    
    // Calculate percentages
    const originalDiscountPercent = tests.length > 0
      ? (tests.reduce((sum, t) => sum + (t.originalDiscountPercent || 0), 0) / tests.length).toFixed(2)
      : 0;
    
    const additionalDiscountPercent = tests.length > 0
      ? (tests.reduce((sum, t) => sum + (t.additionalDiscountPercent || 0), 0) / tests.length).toFixed(2)
      : 0;
    
    const totalDiscountPercent = totalCharge > 0
      ? ((totalDiscount / totalCharge) * 100).toFixed(2)
      : 0;

    const netAmount = totalCharge - totalDiscount;
    const totalPaid = tests.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const totalBalance = tests.reduce((sum, t) => sum + (t.balanceAmount || 0), 0);

    // Get patient details
    const patient = await prisma.patient.findUnique({
      where: { patientId }
    });

    // Group discount details
    const originalDiscountDetails = tests
      .filter(t => t.originalDiscountAmount > 0)
      .map(t => ({
        testId: t.testId,
        testName: t.test?.name || 'Unknown',
        amount: t.originalDiscountAmount,
        percent: t.originalDiscountPercent,
        reason: t.originalDiscountRemark,
        date: t.originalDiscountDate
      }));

    const additionalDiscountDetails = tests
      .filter(t => t.additionalDiscountAmount > 0)
      .map(t => ({
        testId: t.testId,
        testName: t.test?.name || 'Unknown',
        amount: t.additionalDiscountAmount,
        percent: t.additionalDiscountPercent,
        reason: t.additionalDiscountRemark,
        date: t.additionalDiscountDate
      }));

    res.json({
      success: true,
      data: {
        patient: {
          patientId: patient?.patientId,
          name: patient ? `${patient.firstName} ${patient.lastName || ''}`.trim() : 'Unknown',
          mobile: patient?.mobile
        },
        visit: {
          visitId,
          visitDate: tests[0]?.visitDate
        },
        billing: {
          totalCharge,
          originalDiscount: {
            amount: originalDiscount,
            percent: originalDiscountPercent,
            details: originalDiscountDetails
          },
          additionalDiscount: {
            amount: additionalDiscount,
            percent: additionalDiscountPercent,
            details: additionalDiscountDetails
          },
          totalDiscount: {
            amount: totalDiscount,
            percent: totalDiscountPercent
          },
          netAmount,
          totalPaid,
          totalBalance
        },
        tests: tests.map(t => ({
          testId: t.testId,
          testName: t.test?.name,
          charge: t.charge,
          originalDiscountAmount: t.originalDiscountAmount || 0,
          additionalDiscountAmount: t.additionalDiscountAmount || 0,
          totalTestDiscount: (t.originalDiscountAmount || 0) + (t.additionalDiscountAmount || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Error generating patient visit report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate patient visit report',
      error: error.message
    });
  }
};

// Get patient billing summary (all visits)
export const getPatientBillingSummary = async (req, res) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId is required'
      });
    }

    // Get all tests for this patient
    const tests = await prisma.patientTest.findMany({
      where: { patientId },
      include: {
        test: {
          select: { name: true }
        }
      }
    });

    if (!tests.length) {
      return res.status(404).json({
        success: false,
        message: 'No test records found for this patient'
      });
    }

    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { patientId }
    });

    // Group by visit
    const visits = {};
    tests.forEach(test => {
      if (!visits[test.visitId]) {
        visits[test.visitId] = {
          visitId: test.visitId,
          visitDate: test.visitDate,
          tests: [],
          totalCharge: 0,
          originalDiscount: 0,
          additionalDiscount: 0,
          totalDiscount: 0,
          netAmount: 0,
          paidAmount: 0,
          balanceAmount: 0
        };
      }

      const visit = visits[test.visitId];
      visit.tests.push(test.test?.name);
      visit.totalCharge += test.charge || 0;
      visit.originalDiscount += test.originalDiscountAmount || 0;
      visit.additionalDiscount += test.additionalDiscountAmount || 0;
      visit.paidAmount = test.paidAmount; // Same for all tests in visit
      visit.balanceAmount = test.balanceAmount; // Same for all tests in visit
    });

    // Calculate summary for each visit
    const visitSummary = Object.values(visits).map(visit => {
      visit.totalDiscount = visit.originalDiscount + visit.additionalDiscount;
      visit.netAmount = visit.totalCharge - visit.totalDiscount;
      visit.originalDiscountPercent = visit.totalCharge > 0
        ? ((visit.originalDiscount / visit.totalCharge) * 100).toFixed(2)
        : 0;
      visit.additionalDiscountPercent = visit.totalCharge > 0
        ? ((visit.additionalDiscount / visit.totalCharge) * 100).toFixed(2)
        : 0;
      visit.totalDiscountPercent = visit.totalCharge > 0
        ? ((visit.totalDiscount / visit.totalCharge) * 100).toFixed(2)
        : 0;
      return visit;
    });

    // Calculate overall summary
    const totalCharge = visitSummary.reduce((sum, v) => sum + v.totalCharge, 0);
    const totalOriginalDiscount = visitSummary.reduce((sum, v) => sum + v.originalDiscount, 0);
    const totalAdditionalDiscount = visitSummary.reduce((sum, v) => sum + v.additionalDiscount, 0);
    const totalDiscount = totalOriginalDiscount + totalAdditionalDiscount;
    const totalNetAmount = visitSummary.reduce((sum, v) => sum + v.netAmount, 0);
    const totalPaid = visitSummary.reduce((sum, v) => sum + v.paidAmount, 0);
    const totalBalance = visitSummary.reduce((sum, v) => sum + v.balanceAmount, 0);

    res.json({
      success: true,
      data: {
        patient: {
          patientId: patient?.patientId,
          name: patient ? `${patient.firstName} ${patient.lastName || ''}`.trim() : 'Unknown',
          mobile: patient?.mobile,
          email: patient?.email,
          totalVisits: visitSummary.length
        },
        summary: {
          totalCharge,
          originalDiscount: totalOriginalDiscount,
          additionalDiscount: totalAdditionalDiscount,
          totalDiscount,
          totalDiscountPercent: totalCharge > 0 ? ((totalDiscount / totalCharge) * 100).toFixed(2) : 0,
          totalNetAmount,
          totalPaid,
          totalBalance
        },
        visits: visitSummary
      }
    });
  } catch (error) {
    console.error('Error generating billing summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate billing summary',
      error: error.message
    });
  }
};
