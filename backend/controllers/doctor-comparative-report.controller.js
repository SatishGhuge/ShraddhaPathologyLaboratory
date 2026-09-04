import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper function to get pagination parameters
 */
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Helper function for paginated response
 */
const buildPaginatedResponse = (data, totalCount, page, limit) => {
  const pages = Math.ceil(totalCount / limit);
  return {
    success: true,
    data,
    pagination: { page, limit, pages, total: totalCount }
  };
};

/**
 * Get all unique referral doctors
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
      distinct: ['referralDoctor'],
      orderBy: {
        referralDoctor: 'asc'
      }
    });

    const uniqueDoctors = doctors
      .map(d => d.referralDoctor)
      .filter(name => name && name.trim() !== '')
      .sort();

    return res.json({
      success: true,
      data: uniqueDoctors
    });
  } catch (error) {
    console.error('❌ Error fetching doctors:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors',
      error: error.message
    });
  }
};

/**
 * Doctor Comparative Report - Monthly UNIQUE PATIENT count per referral doctor
 * Returns ALL doctors with ALL available months (can be filtered by date range)
 * Counts unique patients (distinct visitIds) per doctor per month
 */
export const getDoctorComparativeReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    console.log('🔍 Doctor Comparative Report Request:', { fromDate, toDate });

    // Build date filter if provided
    let dateFilter = {};
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }

    // Build where clause for PatientTest
    let whereClause = {
      referralDoctor: {
        not: null
      }
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    // Fetch all relevant patient tests with unique patients per doctor per month
    const allTests = await prisma.patientTest.findMany({
      where: whereClause,
      select: {
        visitId: true,
        referralDoctor: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Found ${allTests.length} test records for doctors`);

    if (allTests.length === 0) {
      return res.json({
        success: true,
        data: [],
        months: [],
        pagination: { page: 1, limit: 1000, pages: 1, total: 0 }
      });
    }

    // Group by referral doctor and month, counting UNIQUE patients (visitId)
    const doctorMonthlyData = new Map();
    const allMonths = new Set();

    allTests.forEach(test => {
      if (!test.referralDoctor) return;

      const doctor = test.referralDoctor;
      const date = new Date(test.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      allMonths.add(monthKey);

      if (!doctorMonthlyData.has(doctor)) {
        doctorMonthlyData.set(doctor, {
          doctorName: doctor,
          months: new Map(),
          uniquePatients: new Set() // Track unique visitIds
        });
      }

      const doctorData = doctorMonthlyData.get(doctor);
      
      if (!doctorData.months.has(monthKey)) {
        doctorData.months.set(monthKey, new Set()); // Set for unique patients in this month
      }

      // Add visitId to both month set and total unique patients
      doctorData.months.get(monthKey).add(test.visitId);
      doctorData.uniquePatients.add(test.visitId);
    });

    // Sort months in ascending order
    const sortedMonths = Array.from(allMonths).sort();

    // Convert to array format with calculated totals
    let reportData = Array.from(doctorMonthlyData.entries()).map(([doctor, data]) => {
      const monthlyBreakdown = {};
      sortedMonths.forEach(monthKey => {
        // Count unique patients for this month
        monthlyBreakdown[monthKey] = data.months.get(monthKey)?.size || 0;
      });

      return {
        doctorName: data.doctorName,
        ...monthlyBreakdown,
        totalPatients: data.uniquePatients.size // Count of unique patients across all months
      };
    });

    // Sort by doctor name
    reportData = reportData.sort((a, b) => a.doctorName.localeCompare(b.doctorName));

    console.log(`📊 Report generated for ${reportData.length} doctors with ${sortedMonths.length} months`);
    console.log(`📊 Months: ${sortedMonths.join(', ')}`);

    // Return ALL data without pagination (no limit)
    return res.json({
      success: true,
      data: reportData,
      months: sortedMonths,
      pagination: { page: 1, limit: reportData.length, pages: 1, total: reportData.length }
    });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};
