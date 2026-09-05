import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

// Get admin profile
export const getProfile = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.adminId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      admin
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Create new admin
export const createAdmin = async (req, res) => {
  try {
    const { name, email, username, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, username, and password are required'
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.admin.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: newAdmin
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create admin'
    });
  }
};

// Get service count report — test-wise count and revenue grouped by department
export const getServiceCountReport = async (req, res) => {
  try {
    const { fromDate, toDate, center, corporate, referralDoctor, departments, inhouse } = req.query;

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    const where = {};

    if (fromDate) {
      const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
      const end = toDate ? new Date(toDate) : new Date(fromDate);
      end.setHours(23, 59, 59, 999);
      where.visitDate = { gte: start, lte: end };
    }

    if (center) {
      where.patient = { ...where.patient, createdAtLocation: center };
    }

    if (corporate) {
      where.businessType = { contains: corporate };
    }

    if (referralDoctor) {
      where.referralDoctor = { contains: referralDoctor };
    }

    if (inhouse === 'Inhouse') {
      where.test = { outsourceLab: null };
    } else if (inhouse === 'Outsource') {
      where.test = { outsourceLab: { not: null } };
    }

    const rows = await prisma.patientTest.findMany({
      where,
      select: {
        testId: true,
        charge: true,
        isExcluded: true,
        test: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Filter excluded tests and optionally filter by departments
    const deptFilter = departments ? departments.split(',').map(d => d.toLowerCase()) : null;

    const testMap = new Map();
    for (const row of rows) {
      if (row.isExcluded) continue;
      const deptName = row.department?.name || 'Unknown';
      if (deptFilter && !deptFilter.includes(deptName.toLowerCase())) continue;

      const key = row.testId;
      if (!testMap.has(key)) {
        testMap.set(key, {
          testId: row.testId,
          testName: row.test?.name || 'Unknown',
          department: deptName,
          totalCount: 0,
          unitPrice: row.charge || 0,
          totalAmount: 0,
        });
      }
      const entry = testMap.get(key);
      entry.totalCount += 1;
      entry.totalAmount += row.charge || 0;
    }

    // Sort by department then test name
    const allData = Array.from(testMap.values())
      .sort((a, b) => a.department.localeCompare(b.department) || a.testName.localeCompare(b.testName));

    const total = allData.length;
    const paginatedData = allData.slice(skip, skip + limit)
      .map((row, i) => ({ srNo: skip + i + 1, ...row }));

    res.json(buildPaginatedResponse(paginatedData, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch service count report' });
  }
};
// Group summary report — aggregated by department
export const getGroupSummaryReport = async (req, res) => {
  try {
    const { fromDate, toDate, center, referralDoctor, businessType } = req.query;

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    const where = {};

    if (fromDate) {
      const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
      const end = toDate ? new Date(toDate) : new Date(fromDate);
      end.setHours(23, 59, 59, 999);
      where.visitDate = { gte: start, lte: end };
    }

    if (center) where.patient = { createdAtLocation: center };
    if (referralDoctor) where.referralDoctor = { contains: referralDoctor };
    if (businessType) where.businessType = { contains: businessType };

    const rows = await prisma.patientTest.findMany({
      where,
      select: {
        departmentId: true,
        totalAmount: true,
        discountAmount: true,
        paidAmount: true,
        balanceAmount: true,
        isExcluded: true,
        department: { select: { name: true } },
      },
    });

    // Group by department
    const deptMap = new Map();
    for (const row of rows) {
      if (row.isExcluded) continue;
      const name = row.department?.name || 'Unknown';
      if (!deptMap.has(name)) {
        deptMap.set(name, { department: name, count: 0, totalAmount: 0, discount: 0, paidAmount: 0, balanceAmount: 0 });
      }
      const d = deptMap.get(name);
      d.count += 1;
      d.totalAmount += row.totalAmount || 0;
      d.discount += row.discountAmount || 0;
      d.paidAmount += row.paidAmount || 0;
      d.balanceAmount += row.balanceAmount || 0;
    }

    const allData = Array.from(deptMap.values())
      .sort((a, b) => a.department.localeCompare(b.department));

    const total = allData.length;
    const paginatedData = allData.slice(skip, skip + limit)
      .map((r, i) => ({
        id: skip + i + 1,
        department: r.department,
        count: r.count,
        totalAmount: parseFloat(r.totalAmount.toFixed(2)),
        discount: parseFloat(r.discount.toFixed(2)),
        paidAmount: parseFloat(r.paidAmount.toFixed(2)),
        balanceAmount: parseFloat(r.balanceAmount.toFixed(2)),
      }));

    res.json(buildPaginatedResponse(paginatedData, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch group summary report' });
  }
};

// Monthly Collection Summary — grouped by date, payment mode breakdown
export const getMonthlyCollectionSummary = async (req, res) => {
  try {
    const { fromDate, toDate, center } = req.query;

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    const where = {};

    if (fromDate) {
      const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
      const end = toDate ? new Date(toDate) : new Date(fromDate);
      end.setHours(23, 59, 59, 999);
      where.visitDate = { gte: start, lte: end };
    }

    if (center) {
      where.patient = { createdAtLocation: center };
    }

    const rows = await prisma.patientTest.findMany({
      where,
      select: {
        visitId: true,
        visitDate: true,
        paymentMode: true,
        paidAmount: true,
        discountAmount: true,
        totalAmount: true,
        isExcluded: true,
        patient: { select: { createdAtLocation: true } },
      },
      orderBy: { visitDate: 'asc' },
    });

    // De-duplicate by visitId — financial fields are visit-level
    const visitMap = new Map();
    for (const r of rows) {
      if (r.isExcluded) continue;
      if (!visitMap.has(r.visitId)) {
        visitMap.set(r.visitId, {
          visitDate:      r.visitDate,
          paymentMode:    (r.paymentMode || 'cash').toLowerCase().trim(),
          paidAmount:     r.paidAmount     || 0,
          discountAmount: r.discountAmount || 0,
          totalAmount:    0,
          center:         r.patient?.createdAtLocation || '-',
        });
      }
      visitMap.get(r.visitId).totalAmount += r.totalAmount || 0;
    }

    // Group by date
    const dateMap = new Map();
    for (const v of visitMap.values()) {
      if (!v.visitDate) continue;
      const dateKey = new Date(v.visitDate).toLocaleDateString('en-GB');
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          paymentDate: dateKey,
          center:      v.center,
          cash: 0, card: 0, upi: 0, cheque: 0, netBanking: 0,
          discount: 0, refund: 0, netAmount: 0,
          _raw: v.visitDate,
        });
      }
      const d = dateMap.get(dateKey);
      const m = v.paymentMode;
      if      (m === 'cash')                              d.cash       += v.paidAmount;
      else if (m === 'card')                              d.card       += v.paidAmount;
      else if (m === 'upi')                               d.upi        += v.paidAmount;
      else if (m === 'cheque')                            d.cheque     += v.paidAmount;
      else if (m === 'net banking' || m === 'netbanking') d.netBanking += v.paidAmount;
      else                                                d.cash       += v.paidAmount;

      d.discount  += v.discountAmount;
      d.netAmount += v.paidAmount;
    }

    const allData = Array.from(dateMap.values())
      .sort((a, b) => new Date(a._raw) - new Date(b._raw));

    const total = allData.length;
    const paginatedData = allData.slice(skip, skip + limit)
      .map(({ _raw, ...rest }, i) => ({
        id: skip + i + 1,
        ...rest,
        cash:       parseFloat(rest.cash.toFixed(2)),
        card:       parseFloat(rest.card.toFixed(2)),
        upi:        parseFloat(rest.upi.toFixed(2)),
        cheque:     parseFloat(rest.cheque.toFixed(2)),
        netBanking: parseFloat(rest.netBanking.toFixed(2)),
        discount:   parseFloat(rest.discount.toFixed(2)),
        refund:     0,
        netAmount:  parseFloat(rest.netAmount.toFixed(2)),
      }));

    res.json(buildPaginatedResponse(paginatedData, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch monthly collection summary' });
  }
};

// Report Dashboard — summary cards + trend + corporate + doctor charts
export const getReportDashboard = async (req, res) => {
  try {
    const { fromDate, toDate, corporate, referralDoctor } = req.query;

    const buildWhere = () => {
      const w = {};
      if (fromDate) {
        const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
        const end = toDate ? new Date(toDate) : new Date(fromDate);
        end.setHours(23, 59, 59, 999);
        w.visitDate = { gte: start, lte: end };
      }
      if (corporate) w.businessType = { contains: corporate };
      if (referralDoctor) w.referralDoctor = { contains: referralDoctor };
      return w;
    };

    const rows = await prisma.patientTest.findMany({
      where: buildWhere(),
      select: {
        visitId: true,
        visitDate: true,
        totalAmount: true,
        discountAmount: true,
        paidAmount: true,
        balanceAmount: true,
        businessType: true,
        referralDoctor: true,
        isExcluded: true,
      },
    });

    // Today's data for "today" sub-values on cards
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(todayStr); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(todayStr); todayEnd.setHours(23, 59, 59, 999);
    const todayRows = await prisma.patientTest.findMany({
      where: { visitDate: { gte: todayStart, lte: todayEnd } },
      select: { totalAmount: true, discountAmount: true, paidAmount: true, balanceAmount: true, isExcluded: true },
    });

    // ── Summary cards ──
    const sum = (arr, key) => arr.filter(r => !r.isExcluded).reduce((s, r) => s + (r[key] || 0), 0);

    // De-duplicate by visitId for financial totals (paidAmount/balanceAmount stored per-test but represent visit total)
    const visitMap = new Map();
    for (const r of rows) {
      if (r.isExcluded) continue;
      if (!visitMap.has(r.visitId)) {
        visitMap.set(r.visitId, { totalAmount: 0, discountAmount: 0, paidAmount: r.paidAmount || 0, balanceAmount: r.balanceAmount || 0, visitDate: r.visitDate, businessType: r.businessType, referralDoctor: r.referralDoctor });
      }
      const v = visitMap.get(r.visitId);
      v.totalAmount    += r.totalAmount    || 0;
      v.discountAmount += r.discountAmount || 0;
    }
    const visits = Array.from(visitMap.values());

    const todayVisitMap = new Map();
    for (const r of todayRows) {
      if (r.isExcluded) continue;
      todayVisitMap.set(Math.random(), { totalAmount: r.totalAmount || 0, discountAmount: r.discountAmount || 0, paidAmount: r.paidAmount || 0, balanceAmount: r.balanceAmount || 0 });
    }
    const todayVisits = Array.from(todayVisitMap.values());

    const summary = {
      revenue:  visits.reduce((s, v) => s + v.totalAmount, 0),
      paid:     visits.reduce((s, v) => s + v.paidAmount, 0),
      discount: visits.reduce((s, v) => s + v.discountAmount, 0),
      pending:  visits.reduce((s, v) => s + v.balanceAmount, 0),
      todayRevenue:  todayVisits.reduce((s, v) => s + v.totalAmount, 0),
      todayPaid:     todayVisits.reduce((s, v) => s + v.paidAmount, 0),
      todayDiscount: todayVisits.reduce((s, v) => s + v.discountAmount, 0),
      todayPending:  todayVisits.reduce((s, v) => s + v.balanceAmount, 0),
    };

    // ── Patient registration trend (unique visits per day) ──
    const trendMap = new Map();
    for (const v of visits) {
      if (!v.visitDate) continue;
      const day = new Date(v.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      trendMap.set(day, (trendMap.get(day) || 0) + 1);
    }
    const trendData = Array.from(trendMap.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, patients]) => ({ date, patients }));

    // ── Corporate distribution ──
    const corpMap = new Map();
    for (const v of visits) {
      const name = v.businessType || 'Walk-in';
      corpMap.set(name, (corpMap.get(name) || 0) + 1);
    }
    const total = visits.length || 1;
    const corporateData = Array.from(corpMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value, percentage: `${Math.round((value / total) * 100)}%` }));

    // ── Referral doctor distribution ──
    const docMap = new Map();
    for (const v of visits) {
      const name = v.referralDoctor || 'SELF';
      docMap.set(name, (docMap.get(name) || 0) + 1);
    }
    const doctorData = Array.from(docMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value, percentage: `${Math.round((value / total) * 100)}%` }));

    res.json({ success: true, data: { summary, trendData, corporateData, doctorData } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};

// Test Report — patient rows with dynamic test result columns
export const getTestReport = async (req, res) => {
  try {
    const { fromDate, toDate, patientUid, patientName, location, corporate, referralDoctor, testIds, parameter, operator, value } = req.query;

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    const where = {};

    // Date range
    if (fromDate) {
      const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
      const end = toDate ? new Date(toDate) : new Date(fromDate);
      end.setHours(23, 59, 59, 999);
      where.visitDate = { gte: start, lte: end };
    }

    // Location filter
    if (location) {
      where.patient = { ...where.patient, createdAtLocation: location };
    }

    // Corporate / business type
    if (corporate) {
      where.businessType = { contains: corporate };
    }

    // Referral doctor
    if (referralDoctor) {
      where.referralDoctor = { contains: referralDoctor };
    }

    // Patient UID
    if (patientUid) {
      where.patient = { ...where.patient, patientId: { contains: patientUid } };
    }

    // Patient name
    if (patientName) {
      where.patient = {
        ...where.patient,
        OR: [
          { firstName: { contains: patientName } },
          { lastName:  { contains: patientName } },
        ],
      };
    }

    // Conditional search on patient fields
    if (parameter && operator && value !== undefined && value !== '') {
      const buildCondition = (field, op, val) => {
        const num = parseFloat(val);
        switch (op) {
          case '=':    return { [field]: isNaN(num) ? val : num };
          case '!=':   return { [field]: { not: isNaN(num) ? val : num } };
          case '>':    return { [field]: { gt: num } };
          case '<':    return { [field]: { lt: num } };
          case '>=':   return { [field]: { gte: num } };
          case '<=':   return { [field]: { lte: num } };
          case 'LIKE': return { [field]: { contains: val } };
          default:     return {};
        }
      };

      const patientFields = ['age', 'gender', 'mobile'];
      const testFields    = ['businessType', 'visitId'];
      const paramMap = { Age: 'age', Gender: 'gender', Mobile: 'mobile', Corporate: 'businessType', 'LR Number': 'visitId' };
      const dbField = paramMap[parameter];

      if (dbField) {
        if (patientFields.includes(dbField)) {
          where.patient = { ...where.patient, ...buildCondition(dbField, operator, value) };
        } else {
          Object.assign(where, buildCondition(dbField, operator, value));
        }
      }
    }

    // Fetch all matching patient tests
    const patientTests = await prisma.patientTest.findMany({
      where,
      include: {
        patient: {
          select: {
            patientId: true, title: true, firstName: true, lastName: true,
            age: true, gender: true, mobile: true, address: true,
          },
        },
        test: { select: { id: true, name: true } },
        testResults: {
          include: {
            testParameter: { select: { id: true, parameterName: true, units: true } },
          },
        },
      },
      orderBy: [{ visitDate: 'desc' }, { visitId: 'asc' }],
    });

    // Parse requested test IDs
    const requestedTestIds = testIds
      ? testIds.split(',').map(id => parseInt(id)).filter(Boolean)
      : [];

    // Group by visitId — one row per visit
    const visitMap = new Map();

    for (const pt of patientTests) {
      const key = pt.visitId;

      if (!visitMap.has(key)) {
        const p = pt.patient;
        visitMap.set(key, {
          visitId:     pt.visitId,
          date:        pt.visitDate ? new Date(pt.visitDate).toLocaleDateString('en-GB') : '-',
          patientName: [p.title, p.firstName, p.lastName].filter(Boolean).join(' ').toUpperCase(),
          patientUid:  p.patientId,
          referral:    pt.referralDoctor || 'SELF',
          gender:      p.gender || '-',
          age:         p.age ? `${p.age} Yrs` : '-',
          lrNumber:    pt.visitId,
          mobile:      p.mobile || '-',
          corporate:   pt.businessType || 'Walk-in',
          address:     p.address || '-',
          testResults: {}, // keyed by testId
        });
      }

      const row = visitMap.get(key);

      // Only include results for requested tests (or all if none specified)
      const include = requestedTestIds.length === 0 || requestedTestIds.includes(pt.testId);
      if (!include) continue;

      // Build result string from TestResult parameters
      let resultText = '-';
      if (pt.testResults && pt.testResults.length > 0) {
        const parts = pt.testResults.map(tr => {
          const val = tr.numericValue !== null && tr.numericValue !== undefined
            ? tr.numericValue
            : (tr.textValue || tr.selectedOption || '');
          const unit = tr.testParameter?.units ? ` ${tr.testParameter.units}` : '';
          return `${tr.testParameter?.parameterName || ''}: ${val}${unit}`;
        });
        resultText = parts.join(', ');
      } else if (pt.result) {
        resultText = pt.result;
      } else if (pt.status) {
        resultText = pt.status;
      }

      row.testResults[pt.testId] = resultText;
    }

    const allData = Array.from(visitMap.values());
    const total = allData.length;
    const paginatedData = allData.slice(skip, skip + limit)
      .map((row, i) => ({ srNo: skip + i + 1, ...row }));

    res.json(buildPaginatedResponse(paginatedData, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch test report' });
  }
};

export const getDiscountReport = async (req, res) => {
  try {
    const { fromDate, toDate, corporate, nameUsername } = req.query;

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    const where = {
      discountAmount: { gt: 0 }, // only visits with actual discount
    };

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.visitDate = { gte: start, lte: end };
    } else if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      where.visitDate = { gte: start };
    } else if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.visitDate = { lte: end };
    }

    if (corporate) {
      where.businessType = { contains: corporate };
    }

    if (nameUsername) {
      where.patient = {
        OR: [
          { firstName: { contains: nameUsername } },
          { lastName: { contains: nameUsername } },
          { mobile: { contains: nameUsername } },
        ],
      };
    }

    // Fetch all matching rows from patient_tests joined with patients
    const rows = await prisma.patientTest.findMany({
      where,
      select: {
        visitId: true,
        visitType: true,
        businessType: true,
        totalAmount: true,
        discountAmount: true,
        discountPercent: true,
        discountRemark: true,
        visitDate: true,
        createdAt: true,
        patient: {
          select: {
            patientId: true,
            title: true,
            firstName: true,
            lastName: true,
            mobile: true,
            createdBy: true,
            createdAtLocation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by visitId — sum totalAmount & discountAmount across all tests in a visit
    const visitMap = new Map();
    for (const row of rows) {
      if (!visitMap.has(row.visitId)) {
        visitMap.set(row.visitId, {
          visitId: row.visitId,
          visitType: row.visitType || '',
          businessType: row.businessType || '',
          totalAmount: 0,
          discountAmount: 0,
          discountPercent: row.discountPercent || 0,
          discountRemark: row.discountRemark || '',
          visitDate: row.visitDate || row.createdAt,
          patient: row.patient,
        });
      }
      const entry = visitMap.get(row.visitId);
      entry.totalAmount += row.totalAmount || 0;
      entry.discountAmount += row.discountAmount || 0;
    }

    const allData = Array.from(visitMap.values()).map((v) => {
      const p = v.patient;
      const fullName = [p.title, p.firstName, p.lastName].filter(Boolean).join(' ').toUpperCase();
      const discountPercent = v.discountPercent ? v.discountPercent.toFixed(2) : '0.00';

      return {
        visitId: v.visitId,
        date: v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-GB') : '',
        patientName: fullName,
        mobile: p.mobile || '',
        createdBy: p.createdBy || '',
        createdAtLocation: p.createdAtLocation || '',
        visitType: v.visitType,
        businessType: v.businessType,
        totalAmount: parseFloat(v.totalAmount.toFixed(2)),
        discountAmount: parseFloat(v.discountAmount.toFixed(2)),
        discountPercent,
        discountRemark: v.discountRemark,
      };
    });

    const total = allData.length;
    const paginatedData = allData.slice(skip, skip + limit);

    res.json(buildPaginatedResponse(paginatedData, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch discount report' });
  }
};

// Get turn around time report
export const getTurnAroundTimeReport = async (req, res) => {
  try {
    const { 
      dateFrom,
      dateTo, 
      center, 
      corporate, 
      referralDoctor, 
      outOfTAT, 
      labTest,
      excludeOutsource 
    } = req.query;

    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Build date filter based on dateFrom and dateTo
    let dateFilter = {};
    if (dateFrom) {
      const startDate = new Date(dateFrom);
      const endDate = dateTo ? new Date(dateTo) : new Date(dateFrom);
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      dateFilter = {
        visitDate: {
          gte: startDate,
          lte: endDate
        }
      };
    }

    // Build additional filters
    const filters = {
      ...dateFilter,
      ...(center && center !== '' && { patient: { createdAtLocation: center } }),
      ...(corporate && corporate !== '' && { businessType: corporate }),
      ...(referralDoctor && referralDoctor !== '' && { 
        referralDoctor: { contains: referralDoctor, mode: 'insensitive' } 
      }),
      ...(labTest && labTest !== '' && { 
        test: { name: { contains: labTest, mode: 'insensitive' } } 
      }),
      ...(excludeOutsource === 'true' && { 
        test: { outsourceLab: { not: { not: null } } } 
      })
    };

    // Fetch patient tests with related data
    const patientTests = await prisma.patientTest.findMany({
      where: filters,
      include: {
        patient: {
          select: {
            patientId: true,
            title: true,
            firstName: true,
            lastName: true,
            createdAtLocation: true
          }
        },
        test: {
          select: {
            name: true,
            preparationTime: true,
            outsourceLab: true
          }
        }
      },
      orderBy: [
        { visitDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Process data to calculate turn around times
    const allReportData = patientTests
      .map((pt, index) => {
        const patientName = `${pt.patient.title || ''} ${pt.patient.firstName || ''} ${pt.patient.lastName || ''}`.trim().toUpperCase();
        
        // Calculate time differences
        const sampleTaken = pt.sampleTaken;
        const sampleReceived = pt.sampleReceived;
        const resultCreated = pt.resultDate;
        
        let timeDifference = '';
        let isOutOfTAT = 'Not Define';
        
        if (sampleReceived && resultCreated) {
          const diffMs = new Date(resultCreated) - new Date(sampleReceived);
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          timeDifference = `${diffHours} hours ${diffMinutes} minutes`;
          
          // Check if out of TAT
          const preparationTime = pt.test.preparationTime;
          if (preparationTime) {
            const tatHours = parseInt(preparationTime) || 24;
            const actualHours = diffHours + (diffMinutes / 60);
            isOutOfTAT = actualHours > tatHours ? 'Yes' : 'No';
          }
        }

        // Apply outOfTAT filter if specified
        if (outOfTAT && outOfTAT !== '' && isOutOfTAT !== outOfTAT) {
          return null;
        }

        return {
          id: pt.id,
          patientName,
          patientUID: pt.visitId || pt.patientId,
          testName: pt.test.name,
          referralDr: pt.referralDoctor || '',
          tat: pt.visitDate ? new Date(pt.visitDate).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : '',
          sampleTaken: sampleTaken ? new Date(sampleTaken).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric', 
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : '',
          sampleReceived: sampleReceived ? new Date(sampleReceived).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          }) : '',
          resultCreated: resultCreated ? new Date(resultCreated).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : '',
          timeDifference,
          isOutOfTAT
        };
      })
      .filter(item => item !== null);

    const total = allReportData.length;
    const paginatedData = allReportData.slice(skip, skip + limit)
      .map((item, i) => ({ srNo: skip + i + 1, ...item }));

    res.json(buildPaginatedResponse(paginatedData, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch turn around time report' });
  }
};

