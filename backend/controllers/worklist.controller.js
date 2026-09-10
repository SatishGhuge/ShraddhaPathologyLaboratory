import prisma from '../config/database.js';

// ===== GET ALL WORKLISTS =====
export const getWorklists = async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '', isActive } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = {
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const [worklists, total] = await Promise.all([
      prisma.worklist.findMany({
        where: whereClause,
        include: {
          test: true,
          parameters: {
            include: { testParameter: true }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.worklist.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: worklists,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        perPage: parseInt(limit),
        total: total
      }
    });
  } catch (error) {
    console.error('Error fetching worklists:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== GET SINGLE WORKLIST =====
export const getWorklistById = async (req, res) => {
  try {
    const { id } = req.params;

    const worklist = await prisma.worklist.findUnique({
      where: { id: parseInt(id) },
      include: {
        test: true,
        parameters: {
          include: { testParameter: { include: { unit: true } } },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!worklist) {
      return res.status(404).json({ success: false, error: 'Worklist not found' });
    }

    res.json({ success: true, data: worklist });
  } catch (error) {
    console.error('Error fetching worklist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== CREATE WORKLIST =====
export const createWorklist = async (req, res) => {
  try {
    const { testId, name, description, parameters } = req.body;

    // Validate required fields
    if (!testId || !name || !Array.isArray(parameters) || parameters.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'testId, name, and parameters array are required'
      });
    }

    // Check if test exists
    const test = await prisma.test.findUnique({ where: { id: parseInt(testId) } });
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }

    // Create worklist with parameters
    const worklist = await prisma.worklist.create({
      data: {
        testId: parseInt(testId),
        name,
        description: description || null,
        parameters: {
          createMany: {
            data: parameters.map((param, index) => ({
              testParameterId: parseInt(param.testParameterId),
              columnName: param.columnName,
              isIncluded: param.isIncluded !== false,
              sortOrder: index + 1
            }))
          }
        }
      },
      include: {
        test: true,
        parameters: { include: { testParameter: true } }
      }
    });

    res.status(201).json({ success: true, data: worklist });
  } catch (error) {
    console.error('Error creating worklist:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Worklist name already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== UPDATE WORKLIST =====
export const updateWorklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parameters, isActive } = req.body;

    // Check if worklist exists
    const existingWorklist = await prisma.worklist.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingWorklist) {
      return res.status(404).json({ success: false, error: 'Worklist not found' });
    }

    // Update worklist
    const worklist = await prisma.worklist.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        test: true,
        parameters: { include: { testParameter: true } }
      }
    });

    // Update parameters if provided
    if (Array.isArray(parameters)) {
      // Delete old parameters
      await prisma.worklistParameter.deleteMany({
        where: { worklistId: parseInt(id) }
      });

      // Create new parameters
      await prisma.worklistParameter.createMany({
        data: parameters.map((param, index) => ({
          worklistId: parseInt(id),
          testParameterId: parseInt(param.testParameterId),
          columnName: param.columnName,
          isIncluded: param.isIncluded !== false,
          sortOrder: index + 1
        }))
      });

      // Fetch updated worklist with new parameters
      const updatedWorklist = await prisma.worklist.findUnique({
        where: { id: parseInt(id) },
        include: {
          test: true,
          parameters: { include: { testParameter: true } }
        }
      });

      return res.json({ success: true, data: updatedWorklist });
    }

    res.json({ success: true, data: worklist });
  } catch (error) {
    console.error('Error updating worklist:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Worklist name already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== DELETE WORKLIST (Soft Delete) =====
export const deleteWorklist = async (req, res) => {
  try {
    const { id } = req.params;

    const worklist = await prisma.worklist.findUnique({
      where: { id: parseInt(id) }
    });

    if (!worklist) {
      return res.status(404).json({ success: false, error: 'Worklist not found' });
    }

    const updated = await prisma.worklist.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true }
    });

    res.json({ success: true, message: 'Worklist deleted successfully', data: updated });
  } catch (error) {
    console.error('Error deleting worklist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== GET PATIENTS WITH TEST (Received Stage) =====
export const getPatientsByWorklist = async (req, res) => {
  try {
    const { worklistId } = req.params;
    const { fromDate, toDate } = req.query;

    // Get worklist with test info
    const worklist = await prisma.worklist.findUnique({
      where: { id: parseInt(worklistId) },
      include: {
        test: true,
        parameters: {
          include: { testParameter: { include: { unit: true } } },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!worklist) {
      return res.status(404).json({ success: false, error: 'Worklist not found' });
    }

    // Build where clause with optional date filtering
    const whereClause = {
      testId: worklist.testId,
      status: 'Received'
    };

    if (fromDate || toDate) {
      whereClause.visitDate = {};
      
      if (fromDate) {
        // Start of the day
        whereClause.visitDate.gte = new Date(fromDate);
      }
      
      if (toDate) {
        // End of the day
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        whereClause.visitDate.lte = endOfDay;
      }
    }

    // Get patients with this test in Received stage
    const patientTests = await prisma.patientTest.findMany({
      where: whereClause,
      include: {
        patient: true,
        test: true,
        testResults: {
          include: { testParameter: true }
        }
      }
    });

    // Format data for printing
    const patients = patientTests.map(pt => {
      const patientData = {
        patientName: `${pt.patient.firstName || ''} ${pt.patient.lastName || ''}`.trim(),
        age: pt.patient.ageYears || 0,
        gender: pt.patient.gender || '',
        visitDate: pt.visitDate?.toLocaleDateString() || ''
      };

      // Add custom column data from worklist parameters
      worklist.parameters.forEach(param => {
        const result = pt.testResults.find(r => r.testParameterId === param.testParameterId);
        patientData[param.columnName] = result?.numericValue || result?.textValue || '';
      });

      return patientData;
    });

    res.json({
      success: true,
      data: {
        worklist: {
          name: worklist.name,
          testName: worklist.test.name,
          parameters: worklist.parameters
        },
        patients
      }
    });
  } catch (error) {
    console.error('Error fetching patients for worklist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== TOGGLE WORKLIST ACTIVE STATUS =====
export const toggleWorklistStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const worklist = await prisma.worklist.findUnique({
      where: { id: parseInt(id) }
    });

    if (!worklist) {
      return res.status(404).json({ success: false, error: 'Worklist not found' });
    }

    const updated = await prisma.worklist.update({
      where: { id: parseInt(id) },
      data: { isActive: !worklist.isActive }
    });

    res.json({
      success: true,
      message: `Worklist ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated
    });
  } catch (error) {
    console.error('Error toggling worklist status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===== GET TEST PARAMETERS FOR WORKLIST CREATION =====
export const getTestParameters = async (req, res) => {
  try {
    const { testId } = req.params;

    const parameters = await prisma.testParameter.findMany({
      where: { testId: parseInt(testId) },
      include: { unit: true },
      orderBy: { parameterSortOrder: 'asc' }
    });

    if (parameters.length === 0) {
      return res.status(404).json({ success: false, error: 'No parameters found for this test' });
    }

    res.json({ success: true, data: parameters });
  } catch (error) {
    console.error('Error fetching test parameters:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
