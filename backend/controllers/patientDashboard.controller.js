import { prisma } from '../config/database.js';
import { emailService, smsService } from '../services/notification.service.js';

// GET PATIENT DASHBOARD DATA
export const getDashboardData = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Get patient info
    const patient = await prisma.patient.findUnique({
      where: { patientId },
      select: {
        patientId: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        dob: true,
        age: true,
        gender: true,
        address: true,
        location: true,
        registrationType: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get patient's tests with status breakdown
    const allTests = await prisma.patientTest.findMany({
      where: { patientId },
      include: {
        test: { select: { id: true, name: true, shortName: true } },
        department: { select: { id: true, name: true } },
        homeVisitTracking: true,
        testResults: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const stats = {
      totalTests: allTests.length,
      registered: allTests.filter(t => t.status === 'Registered').length,
      sampleReceived: allTests.filter(t => t.status === 'SampleReceived').length,
      underReview: allTests.filter(t => t.status === 'UnderReview').length,
      reportReady: allTests.filter(t => t.status === 'ReportReady').length,
      homeVisits: allTests.filter(t => t.homeVisitTracking).length
    };

    // Get recent tests (last 5)
    const recentTests = allTests.slice(0, 5).map(test => ({
      patientTestId: test.id,
      visitId: test.visitId,
      testName: test.test.name,
      departmentName: test.department.name,
      status: test.status,
      visitDate: test.visitDate,
      hasHomeVisit: !!test.homeVisitTracking,
      homeVisitStatus: test.homeVisitTracking?.status,
      createdAt: test.createdAt
    }));

    // Get upcoming home visits
    const upcomingHomeVisits = await prisma.homeVisitTracking.findMany({
      where: {
        patientId,
        status: { in: ['Scheduled', 'RunnerArrived'] }
      },
      include: {
        runner: { select: { id: true, name: true, phone: true } },
        patientTest: { select: { test: { select: { name: true } } } }
      },
      orderBy: { visitDate: 'asc' }
    });

    res.json({
      success: true,
      data: {
        patient,
        stats,
        recentTests,
        upcomingHomeVisits: upcomingHomeVisits.map(visit => ({
          homeVisitId: visit.id,
          testName: visit.patientTest.test.name,
          visitDate: visit.visitDate,
          visitTime: visit.visitTime,
          status: visit.status,
          runner: visit.runner,
          address: visit.patientAddress
        }))
      }
    });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

// GET ALL PATIENT TESTS
export const getPatientTests = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const whereCondition = { patientId };
    if (status) {
      whereCondition.status = status;
    }

    const tests = await prisma.patientTest.findMany({
      where: whereCondition,
      include: {
        test: { select: { id: true, name: true, shortName: true } },
        department: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
        homeVisitTracking: {
          include: { runner: { select: { name: true, phone: true } } }
        },
        testResults: { select: { id: true } },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { [sortBy]: sortOrder.toLowerCase() }
    });

    res.json({
      success: true,
      data: tests.map(test => ({
        patientTestId: test.id,
        visitId: test.visitId,
        testName: test.test.name,
        testId: test.test.id,
        departmentName: test.department.name,
        packageName: test.package?.name,
        status: test.status,
        visitDate: test.visitDate,
        visitTime: test.visitTime,
        charge: test.charge,
        paidAmount: test.paidAmount,
        balanceAmount: test.balanceAmount,
        hasHomeVisit: !!test.homeVisitTracking,
        homeVisitStatus: test.homeVisitTracking?.status,
        runner: test.homeVisitTracking?.runner,
        resultDate: test.resultDate,
        lastStatusUpdate: test.statusHistory[0]?.changedAt,
        createdAt: test.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Get tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message
    });
  }
};

// GET AVAILABLE TESTS & PACKAGES FOR BOOKING
export const getAvailableTestsAndPackages = async (req, res) => {
  try {
    // Get active tests with charges
    const tests = await prisma.test.findMany({
      where: { isActive: true, isDeleted: false },
      include: {
        department: { select: { id: true, name: true } },
        charges: { select: { b2cCharge: true } }
      },
      orderBy: { name: 'asc' }
    });

    // Get active packages
    const packages = await prisma.package.findMany({
      where: { isActive: true, isDeleted: false },
      include: {
        department: { select: { id: true, name: true } },
        packageTests: {
          include: {
            test: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: {
        tests: tests.map(test => ({
          id: test.id,
          name: test.name,
          shortName: test.shortName,
          departmentId: test.department.id,
          departmentName: test.department.name,
          charge: test.charges[0]?.b2cCharge || 0,
          preparationTime: test.preparationTime,
          instructions: test.instructionPatient
        })),
        packages: packages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          charge: pkg.b2cCharge,
          departmentId: pkg.department.id,
          departmentName: pkg.department.name,
          testCount: pkg.packageTests.length,
          tests: pkg.packageTests.map(pt => ({
            testId: pt.test.id,
            testName: pt.test.name
          }))
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get available tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available tests',
      error: error.message
    });
  }
};

// CREATE NEW TEST VISIT (Patient self-registers test)
export const createTestVisit = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      testIds = [],
      packageId,
      visitDate,
      visitTime,
      paymentMode = 'pending',
      paidAmount = 0,
      notes
    } = req.body;

    console.log('📝 Creating test visit for patient:', patientId);

    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Generate visit ID
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const lastVisit = await prisma.patientTest.findFirst({
      where: { patientId },
      orderBy: { visitId: 'desc' }
    });

    let sequence = 1;
    if (lastVisit && lastVisit.visitId.startsWith(`${yy}${mm}${dd}`)) {
      const lastSequence = parseInt(lastVisit.visitId.slice(6));
      sequence = lastSequence + 1;
    }

    const visitId = `${yy}${mm}${dd}${String(sequence).padStart(4, '0')}`;

    let testsToAdd = [];
    let totalCharge = 0;

    // If package is selected
    if (packageId) {
      const pkg = await prisma.package.findUnique({
        where: { id: parseInt(packageId) },
        include: { packageTests: true }
      });

      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: 'Package not found'
        });
      }

      totalCharge = pkg.b2cCharge;
      testsToAdd = pkg.packageTests.map(pt => ({
        testId: pt.testId,
        packageId: pkg.id
      }));
    } else if (testIds.length > 0) {
      // If individual tests are selected
      const tests = await prisma.test.findMany({
        where: { id: { in: testIds.map(id => parseInt(id)) } },
        include: { charges: true }
      });

      if (tests.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No valid tests found'
        });
      }

      totalCharge = tests.reduce((sum, test) => sum + (test.charges[0]?.b2cCharge || 0), 0);
      testsToAdd = tests.map(test => ({ testId: test.id }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either tests or package must be selected'
      });
    }

    // Create patient tests
    const patientTests = await prisma.patientTest.createMany({
      data: testsToAdd.map(test => ({
        patientId,
        visitId,
        testId: test.testId,
        packageId: test.packageId || null,
        departmentId: 1, // Get from test
        sample: 'Blood', // Get from test
        charge: totalCharge / testsToAdd.length,
        status: 'Registered',
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        visitTime: visitTime || '10:00',
        totalAmount: totalCharge / testsToAdd.length,
        paidAmount: (paidAmount / testsToAdd.length) || 0,
        balanceAmount: (totalCharge - paidAmount) / testsToAdd.length || 0,
        paymentMode: paymentMode !== 'pending' ? paymentMode : null,
        businessType: 'patient'
      }))
    });

    console.log('✅ Test visit created:', visitId, 'with', patientTests.count, 'tests');

    res.status(201).json({
      success: true,
      message: 'Test visit created successfully',
      data: {
        visitId,
        patientId,
        testCount: testsToAdd.length,
        totalCharge,
        paidAmount,
        balanceAmount: totalCharge - paidAmount,
        visitDate: new Date(visitDate || Date.now()),
        visitTime: visitTime || '10:00'
      }
    });
  } catch (error) {
    console.error('❌ Create test visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test visit',
      error: error.message
    });
  }
};

// GET TEST DETAILS
export const getTestDetails = async (req, res) => {
  try {
    const { patientTestId } = req.params;

    const test = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) },
      include: {
        test: {
          include: {
            department: true,
            charges: true,
            sample_type: true
          }
        },
        package: true,
        testResults: true,
        homeVisitTracking: {
          include: {
            runner: { select: { name: true, phone: true, email: true } },
            locations: { orderBy: { timestamp: 'desc' } }
          }
        },
        statusHistory: { orderBy: { changedAt: 'desc' } }
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('❌ Get test details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test details',
      error: error.message
    });
  }
};

// GET AVAILABLE RUNNERS & TIME SLOTS FOR HOME VISIT
export const getAvailableRunnersAndSlots = async (req, res) => {
  try {
    const { location, date } = req.query;

    if (!location || !date) {
      return res.status(400).json({
        success: false,
        message: 'Location and date are required'
      });
    }

    // Get runners available in the location
    const runners = await prisma.runner.findMany({
      where: {
        assignedLocation: location
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true
      }
    });

    if (runners.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No runners available in this location'
      });
    }

    // Generate time slots (assuming 30-min slots from 9 AM to 6 PM)
    const slots = [];
    const startHour = 9;
    const endHour = 18;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        slots.push({
          time,
          isAvailable: true
        });
      }
    }

    res.json({
      success: true,
      data: {
        runners,
        availableSlots: slots
      }
    });
  } catch (error) {
    console.error('❌ Get runners and slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runners and slots',
      error: error.message
    });
  }
};

// CHECK SLOT AVAILABILITY
export const checkSlotAvailability = async (req, res) => {
  try {
    const { runnerId, date, time } = req.body;

    if (!runnerId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Runner ID, date, and time are required'
      });
    }

    // Check if runner has already booked this slot
    const existingBooking = await prisma.homeVisitTracking.findFirst({
      where: {
        runnerId,
        visitDate: new Date(date),
        visitTime: time,
        status: { in: ['Scheduled', 'RunnerArrived'] }
      }
    });

    if (existingBooking) {
      return res.json({
        success: true,
        available: false,
        message: 'This slot is already booked'
      });
    }

    res.json({
      success: true,
      available: true,
      message: 'Slot is available'
    });
  } catch (error) {
    console.error('❌ Check slot availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check slot availability',
      error: error.message
    });
  }
};

// BOOK HOME VISIT
export const bookHomeVisit = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { patientTestId, runnerId, visitDate, visitTime, address, notes } = req.body;

    console.log('🏠 Booking home visit for patient:', patientId);

    // Validate inputs
    if (!patientTestId || !runnerId || !visitDate || !visitTime) {
      return res.status(400).json({
        success: false,
        message: 'PatientTestId, runnerId, visitDate, and visitTime are required'
      });
    }

    // Verify patient test exists
    const patientTest = await prisma.patientTest.findUnique({
      where: { id: parseInt(patientTestId) },
      include: {
        test: true,
        patient: true
      }
    });

    if (!patientTest) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    if (patientTest.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Verify runner exists
    const runner = await prisma.runner.findUnique({
      where: { id: runnerId }
    });

    if (!runner) {
      return res.status(404).json({
        success: false,
        message: 'Runner not found'
      });
    }

    // Check if slot is available
    const existingBooking = await prisma.homeVisitTracking.findFirst({
      where: {
        runnerId,
        visitDate: new Date(visitDate),
        visitTime,
        status: { in: ['Scheduled', 'RunnerArrived'] }
      }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Create home visit tracking
    const homeVisit = await prisma.homeVisitTracking.create({
      data: {
        patientTestId: parseInt(patientTestId),
        patientId,
        runnerId,
        visitDate: new Date(visitDate),
        visitTime,
        patientAddress: address || patientTest.patient.address,
        status: 'Scheduled'
      },
      include: {
        runner: true,
        patientTest: { include: { test: true } }
      }
    });

    console.log('✅ Home visit booked:', homeVisit.id);

    // Update patient test status
    await prisma.patientTest.update({
      where: { id: parseInt(patientTestId) },
      data: { status: 'SampleScheduled' }
    });

    // Send notifications
    try {
      // Email notification to patient
      await emailService.sendRegistrationCredentials(
        patientTest.patient.email,
        patientTest.patient.firstName,
        homeVisit.id,
        `Visit on ${new Date(visitDate).toLocaleDateString()}`,
        'homevisit-scheduled'
      );

      // WhatsApp notification
      await smsService.sendHomeVisitScheduledMessage(
        patientTest.patient.mobile,
        patientTest.patient.firstName,
        new Date(visitDate).toLocaleDateString(),
        runner.name
      );
    } catch (notifError) {
      console.warn('⚠️ Notification failed:', notifError.message);
      // Don't fail the booking if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Home visit booked successfully',
      data: {
        homeVisitId: homeVisit.id,
        patientTestId,
        runner: {
          name: runner.name,
          phone: runner.phone,
          email: runner.email
        },
        visitDate: new Date(visitDate),
        visitTime,
        status: 'Scheduled',
        address: homeVisit.patientAddress
      }
    });
  } catch (error) {
    console.error('❌ Book home visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book home visit',
      error: error.message
    });
  }
};

// CANCEL HOME VISIT
export const cancelHomeVisit = async (req, res) => {
  try {
    const { homeVisitId } = req.params;
    const { reason } = req.body;

    const homeVisit = await prisma.homeVisitTracking.findUnique({
      where: { id: homeVisitId },
      include: { patientTest: { include: { patient: true } } }
    });

    if (!homeVisit) {
      return res.status(404).json({
        success: false,
        message: 'Home visit not found'
      });
    }

    if (homeVisit.status === 'Completed' || homeVisit.status === 'SampleReceived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed or received visit'
      });
    }

    // Update status
    await prisma.homeVisitTracking.update({
      where: { id: homeVisitId },
      data: { status: 'Cancelled' }
    });

    console.log('✅ Home visit cancelled:', homeVisitId);

    res.json({
      success: true,
      message: 'Home visit cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Cancel home visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel home visit',
      error: error.message
    });
  }
};

