import { prisma } from '../config/database.js';
import { emailService, smsService } from '../services/notification.service.js';

// ============================================================================
// RUNNER MANAGEMENT
// ============================================================================

// Get all active runners
export const getAllRunners = async (req, res) => {
  try {
    const runners = await prisma.runner.findMany({
      include: {
        _count: {
          select: { homeVisits: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: runners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runners',
      error: error.message
    });
  }
};

// Get runners by location
export const getRunnersByLocation = async (req, res) => {
  try {
    const { location } = req.params;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location is required'
      });
    }

    const runners = await prisma.runner.findMany({
      where: {
        assignedLocation: location
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        assignedLocation: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: runners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runners',
      error: error.message
    });
  }
};

// Get runner workload (assigned visits)
export const getRunnerWorkload = async (req, res) => {
  try {
    const { runnerId, date } = req.params;

    const visits = await prisma.homeVisitTracking.findMany({
      where: {
        runnerId,
        visitDate: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`)
        }
      },
      include: {
        patientTest: {
          include: {
            test: true,
            patient: true
          }
        }
      },
      orderBy: { visitTime: 'asc' }
    });

    const workload = visits.length;
    const maxCapacity = 8; // Max visits per runner per day

    res.json({
      success: true,
      data: {
        runnerId,
        date,
        workload,
        maxCapacity,
        availableSlots: maxCapacity - workload,
        visits: visits.map(v => ({
          homeVisitId: v.id,
          visitTime: v.visitTime,
          patientName: `${v.patientTest.patient.firstName} ${v.patientTest.patient.lastName}`,
          testName: v.patientTest.test.name,
          status: v.status,
          address: v.patientAddress
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runner workload',
      error: error.message
    });
  }
};

// ============================================================================
// HOME VISIT MANAGEMENT
// ============================================================================

// Get all home visits with filters
export const getAllHomeVisits = async (req, res) => {
  try {
    const { status, runnerId, patientId, location, dateFrom, dateTo } = req.query;

    const whereCondition = {};

    if (status) whereCondition.status = status;
    if (runnerId) whereCondition.runnerId = runnerId;
    if (patientId) whereCondition.patientId = patientId;
    if (location) whereCondition.runner = { assignedLocation: location };
    
    if (dateFrom || dateTo) {
      whereCondition.visitDate = {};
      if (dateFrom) whereCondition.visitDate.gte = new Date(dateFrom);
      if (dateTo) whereCondition.visitDate.lte = new Date(dateTo);
    }

    const visits = await prisma.homeVisitTracking.findMany({
      where: whereCondition,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            mobile: true,
            email: true,
            address: true
          }
        },
        runner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        patientTest: {
          include: { test: true }
        },
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      orderBy: { visitDate: 'desc' }
    });

    res.json({
      success: true,
      data: visits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home visits',
      error: error.message
    });
  }
};

// Get home visit details
export const getHomeVisitDetails = async (req, res) => {
  try {
    const { homeVisitId } = req.params;

    const visit = await prisma.homeVisitTracking.findUnique({
      where: { id: homeVisitId },
      include: {
        patient: true,
        runner: true,
        patientTest: {
          include: {
            test: true,
            patient: true
          }
        },
        locations: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Home visit not found'
      });
    }

    res.json({
      success: true,
      data: visit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home visit details',
      error: error.message
    });
  }
};

// Auto-assign runner based on location and workload
export const autoAssignRunner = async (req, res) => {
  try {
    const { patientTestId, location, visitDate } = req.body;

    if (!location || !visitDate) {
      return res.status(400).json({
        success: false,
        message: 'Location and visit date are required'
      });
    }

    // Get available runners in location
    const runners = await prisma.runner.findMany({
      where: { assignedLocation: location }
    });

    if (runners.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No runners available in this location'
      });
    }

    // Check workload for each runner on the date
    const runnerWorkloads = await Promise.all(
      runners.map(async (runner) => {
        const count = await prisma.homeVisitTracking.count({
          where: {
            runnerId: runner.id,
            visitDate: {
              gte: new Date(`${visitDate}T00:00:00`),
              lte: new Date(`${visitDate}T23:59:59`)
            },
            status: { in: ['Scheduled', 'RunnerArrived'] }
          }
        });

        return {
          runner,
          workload: count
        };
      })
    );

    // Find runner with least workload
    const assignedRunner = runnerWorkloads.reduce((prev, current) =>
      prev.workload < current.workload ? prev : current
    );

    res.json({
      success: true,
      data: {
        runnerId: assignedRunner.runner.id,
        runnerName: assignedRunner.runner.name,
        currentWorkload: assignedRunner.workload,
        message: `Runner ${assignedRunner.runner.name} assigned with ${assignedRunner.workload} visits already scheduled`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign runner',
      error: error.message
    });
  }
};

// ============================================================================
// HOME VISIT STATUS MANAGEMENT
// ============================================================================

// Update home visit status
export const updateHomeVisitStatus = async (req, res) => {
  try {
    const { homeVisitId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['Scheduled', 'RunnerArrived', 'SampleReceived', 'Completed', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        validStatuses
      });
    }

    const homeVisit = await prisma.homeVisitTracking.findUnique({
      where: { id: homeVisitId },
      include: {
        patientTest: { include: { patient: true, test: true } },
        runner: true
      }
    });

    if (!homeVisit) {
      return res.status(404).json({
        success: false,
        message: 'Home visit not found'
      });
    }

    // Update home visit
    const updatedVisit = await prisma.homeVisitTracking.update({
      where: { id: homeVisitId },
      data: { status }
    });

    // If sample received, update patient test status
    if (status === 'SampleReceived') {
      await prisma.patientTest.update({
        where: { id: homeVisit.patientTest.id },
        data: {
          status: 'SampleReceived',
          sampleReceived: new Date()
        }
      });

      // Send notification to patient
      try {
        await smsService.sendWhatsAppMessage(
          homeVisit.patientTest.patient.mobile,
          `Hello ${homeVisit.patientTest.patient.firstName}!\n\n✓ Your sample has been received by ${homeVisit.runner.name}.\n\nYour test report will be ready soon.\n\nThank you!`
        );
      } catch (err) {
      }
    }

    // If completed, mark as completed
    if (status === 'Completed') {
      await prisma.patientTest.update({
        where: { id: homeVisit.patientTest.id },
        data: { status: 'Completed' }
      });
    }

    res.json({
      success: true,
      message: `Home visit status updated to ${status}`,
      data: updatedVisit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update home visit status',
      error: error.message
    });
  }
};

// ============================================================================
// RUNNER LOCATION TRACKING
// ============================================================================

// Update runner location
export const updateRunnerLocation = async (req, res) => {
  try {
    const { homeVisitId } = req.params;
    const { runnerId, latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Verify home visit exists
    const homeVisit = await prisma.homeVisitTracking.findUnique({
      where: { id: homeVisitId }
    });

    if (!homeVisit) {
      return res.status(404).json({
        success: false,
        message: 'Home visit not found'
      });
    }

    // Save location
    const location = await prisma.runnerLocation.create({
      data: {
        homeVisitTrackingId: homeVisitId,
        runnerId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Location updated',
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

// Get runner location history
export const getRunnerLocationHistory = async (req, res) => {
  try {
    const { homeVisitId } = req.params;

    const locations = await prisma.runnerLocation.findMany({
      where: { homeVisitTrackingId: homeVisitId },
      orderBy: { timestamp: 'desc' }
    });

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location history',
      error: error.message
    });
  }
};

// Get current runner location
export const getCurrentRunnerLocation = async (req, res) => {
  try {
    const { homeVisitId } = req.params;

    const location = await prisma.runnerLocation.findFirst({
      where: { homeVisitTrackingId: homeVisitId },
      orderBy: { timestamp: 'desc' },
      take: 1
    });

    if (!location) {
      return res.json({
        success: true,
        data: null,
        message: 'No location data available'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current location',
      error: error.message
    });
  }
};

// ============================================================================
// HOME VISIT STATISTICS
// ============================================================================

export const getHomeVisitStats = async (req, res) => {
  try {
    const { dateFrom, dateTo, runnerId, location } = req.query;

    const whereCondition = {};

    if (runnerId) whereCondition.runnerId = runnerId;
    if (location) whereCondition.runner = { assignedLocation: location };
    
    if (dateFrom || dateTo) {
      whereCondition.visitDate = {};
      if (dateFrom) whereCondition.visitDate.gte = new Date(dateFrom);
      if (dateTo) whereCondition.visitDate.lte = new Date(dateTo);
    }

    const allVisits = await prisma.homeVisitTracking.findMany({
      where: whereCondition
    });

    const stats = {
      total: allVisits.length,
      scheduled: allVisits.filter(v => v.status === 'Scheduled').length,
      arrived: allVisits.filter(v => v.status === 'RunnerArrived').length,
      sampleReceived: allVisits.filter(v => v.status === 'SampleReceived').length,
      completed: allVisits.filter(v => v.status === 'Completed').length,
      cancelled: allVisits.filter(v => v.status === 'Cancelled').length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};


