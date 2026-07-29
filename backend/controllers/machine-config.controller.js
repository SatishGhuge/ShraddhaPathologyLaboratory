import prisma from '../config/database.js';

export const getMachines = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const { isActive, search } = req.query;
    let whereClause = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (search) {
      whereClause.name = { contains: search.trim() };
    }

    const machines = await prisma.machine.findMany({
      where: whereClause,
      include: { _count: { select: { tests: true } } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });

    return res.status(200).json({
      success: true,
      data: machines.map(m => ({
        id: m.id,
        name: m.name,
        isActive: m.isActive,
        testCount: m._count.tests,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }))
    });
  } catch (err) {
    console.error('getMachines error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve machines'
    });
  }
};

export const getMachinesDropdown = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const machines = await prisma.machine.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: machines
    });
  } catch (err) {
    console.error('getMachinesDropdown error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve machines'
    });
  }
};

export const getMachineById = async (req, res) => {
  try {
    const { id } = req.params;

    const machine = await prisma.machine.findUnique({
      where: { id: parseInt(id) },
      include: {
        tests: {
          select: {
            id: true,
            name: true,
            testCode: true,
            department: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: machine
    });
  } catch (err) {
    console.error('getMachineById error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve machine'
    });
  }
};

export const createMachine = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Machine name is required'
      });
    }

    const normalizedName = name.trim();

    const existing = await prisma.machine.findFirst({
      where: { name: normalizedName }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Machine "${normalizedName}" already exists`
      });
    }

    const machine = await prisma.machine.create({
      data: { name: normalizedName, isActive: true }
    });

    return res.status(201).json({
      success: true,
      data: machine,
      message: 'Machine created successfully'
    });
  } catch (err) {
    console.error('createMachine error:', err.message);

    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Machine with this name already exists'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create machine'
    });
  }
};

export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const machineId = parseInt(id);

    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    const updateData = {};

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Machine name cannot be empty'
        });
      }

      const normalizedName = name.trim();

      if (normalizedName !== machine.name) {
        const existing = await prisma.machine.findFirst({
          where: { AND: [{ name: normalizedName }, { id: { not: machineId } }] }
        });

        if (existing) {
          return res.status(409).json({
            success: false,
            message: `Machine "${normalizedName}" already exists`
          });
        }
      }

      updateData.name = normalizedName;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.machine.update({
      where: { id: machineId },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Machine updated successfully'
    });
  } catch (err) {
    console.error('updateMachine error:', err.message);

    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Machine with this name already exists'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update machine'
    });
  }
};

export const toggleMachine = async (req, res) => {
  try {
    const { id } = req.params;

    const machine = await prisma.machine.findUnique({
      where: { id: parseInt(id) }
    });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    const updated = await prisma.machine.update({
      where: { id: parseInt(id) },
      data: { isActive: !machine.isActive }
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: `Machine ${updated.isActive ? 'enabled' : 'disabled'} successfully`
    });
  } catch (err) {
    console.error('toggleMachine error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle machine status'
    });
  }
};

export const getMachineUsage = async (req, res) => {
  try {
    const { id } = req.params;

    const machine = await prisma.machine.findUnique({
      where: { id: parseInt(id) },
      include: {
        tests: {
          select: {
            id: true,
            name: true,
            testCode: true,
            isActive: true,
            isDeleted: true,
            department: { select: { id: true, name: true } }
          },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    const activeTests = machine.tests.filter(t => t.isActive && !t.isDeleted).length;
    const totalTests = machine.tests.length;

    return res.status(200).json({
      success: true,
      data: {
        machine: {
          id: machine.id,
          name: machine.name,
          isActive: machine.isActive
        },
        usage: {
          totalTests,
          activeTests,
          inactiveTests: totalTests - activeTests
        },
        tests: machine.tests
      }
    });
  } catch (err) {
    console.error('getMachineUsage error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve machine usage'
    });
  }
};
