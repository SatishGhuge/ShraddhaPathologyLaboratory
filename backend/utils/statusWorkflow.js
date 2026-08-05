import prisma from '../config/database.js';

/**
 * Normalize status value to proper format
 * @param {string} status - Status value to normalize
 * @returns {string} - Normalized status value
 */
export const normalizeStatus = (status) => {
  if (!status) return status;
  
  const statusMap = {
    'REGISTERED': 'Registered',
    'RECEIVED': 'Received',
    'PROVISIONAL': 'Entered',
    'ENTERED': 'Entered',
    'AUTHENTICATED': 'Authorized',
    'AUTHORIZED': 'Authorized',
    'VALIDATION': 'Validated',
    'VALIDATED': 'Validated',
    'DELIVERED': 'Delivered',
    'RETEST': 'Rectified',
    'RECTIFIED': 'Rectified',
    'REVERT': 'Rectified',
    'HOLD': 'Validated',
    'REJECTED': 'Validated'
  };
  
  return statusMap[status.toUpperCase()] || status;
};

/**
 * SAMPLE STATUS WORKFLOW DEFINITION
 * 
 * Stages:
 * 1. Registered    - Patient registered, no sample yet
 * 2. Received      - Sample collected and received (AUTO-triggered when barcode printed)
 * 3. Entered       - Test values entered (AUTO-triggered when first result saved)
 * 4. Validation    - Checked by Lab Technician (MANUAL)
 * 5. Authorized    - Reviewed by Senior Technician (MANUAL, can edit results)
 * 6. Delivered     - Report sent/printed (MANUAL, can edit results)
 * 7. Rectified     - Changes after delivery (MANUAL, can edit results, then moves to next stage)
 */

// Valid stages in order
export const WORKFLOW_STAGES = [
  'Registered',
  'Received',
  'Entered',
  'Validated',
  'Authorized',
  'Delivered',
  'Rectified'
];

// Stage metadata with color codes for UI
export const STAGE_METADATA = {
  'Registered': {
    order: 0,
    color: '#9CA3AF',      // Gray
    bgColor: '#F3F4F6',    // Light Gray
    icon: 'FileText',
    description: 'Patient registered, awaiting sample collection',
    canEdit: false,
    requiresApproval: false
  },
  'Received': {
    order: 1,
    color: '#3B82F6',      // Blue
    bgColor: '#EFF6FF',    // Light Blue
    icon: 'Package',
    description: 'Sample received at lab',
    canEdit: false,
    requiresApproval: false
  },
  'Entered': {
    order: 2,
    color: '#F59E0B',      // Amber/Yellow
    bgColor: '#FFFBEB',    // Light Yellow
    icon: 'Edit',
    description: 'Test values entered in system',
    canEdit: true,         // Allow editing at this stage
    requiresApproval: false
  },
  'Validated': {
    order: 3,
    color: '#8B5CF6',      // Purple
    bgColor: '#F5F3FF',    // Light Purple
    icon: 'CheckCircle',
    description: 'Checked by Lab Technician',
    canEdit: true,         // Allow editing at this stage
    requiresApproval: true
  },
  'Authorized': {
    order: 4,
    color: '#10B981',      // Green
    bgColor: '#ECFDF5',    // Light Green
    icon: 'Shield',
    description: 'Reviewed by Senior Technician',
    canEdit: true,         // Allow editing at this stage
    requiresApproval: true
  },
  'Delivered': {
    order: 5,
    color: '#06B6D4',      // Cyan
    bgColor: '#ECFDFD',    // Light Cyan
    icon: 'Send',
    description: 'Report delivered to patient',
    canEdit: true,         // Allow editing at this stage
    requiresApproval: false
  },
  'Rectified': {
    order: 6,
    color: '#EF4444',      // Red
    bgColor: '#FEF2F2',    // Light Red
    icon: 'AlertCircle',
    description: 'Changes made after delivery',
    canEdit: true,         // Allow editing at this stage
    requiresApproval: false
  }
};

/**
 * Update test status and log the change
 * 
 * @param {number} patientTestId - ID of the test
 * @param {string} newStatus - New status to set
 * @param {string} triggerType - "AUTO", "MANUAL", or "SYSTEM"
 * @param {string} changedBy - Username/ID of who made the change
 * @param {string} remarks - Optional remarks about the change
 * @returns {Promise<object>} - Updated test record
 */
export const updateTestStatus = async (
  patientTestId,
  newStatus,
  triggerType = 'MANUAL',
  changedBy = null,
  remarks = null
) => {
  try {
    // Validate new status
    if (!WORKFLOW_STAGES.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Valid stages: ${WORKFLOW_STAGES.join(', ')}`);
    }

    // Get current test
    const currentTest = await prisma.patientTest.findUnique({
      where: { id: patientTestId }
    });

    if (!currentTest) {
      throw new Error(`Test not found: ${patientTestId}`);
    }

    // Don't update if already in same status
    if (currentTest.status === newStatus) {
      console.log(`⚠️ Test ${patientTestId} already in status: ${newStatus}`);
      return currentTest;
    }

    // Update the test status
    const updatedTest = await prisma.patientTest.update({
      where: { id: patientTestId },
      data: {
        status: newStatus,
        lastUpdatedBy: changedBy,
        lastStatusUpdateAt: new Date()
      }
    });

    // Log the status change in history
    await prisma.testStatusHistory.create({
      data: {
        patientTestId: patientTestId,
        previousStatus: currentTest.status,
        newStatus: newStatus,
        changedBy: changedBy,
        changedAt: new Date(),
        triggerType: triggerType,
        remarks: remarks
      }
    });

    const trigger = triggerType === 'AUTO' ? '🔄' : '👤';
    console.log(`${trigger} Test Status Updated: ${currentTest.status} → ${newStatus} (${triggerType})`);

    return updatedTest;
  } catch (error) {
    console.error('Error updating test status:', error);
    throw error;
  }
};

/**
 * Automatically transition test from Registered to Received when barcode is printed
 * This is called from barcode print handlers
 * Also sets barcode_status to 'Printed'
 */
export const transitionToReceivedOnBarcodePrint = async (patientTestId, changedBy = 'SYSTEM') => {
  try {
    const test = await prisma.patientTest.findUnique({
      where: { id: patientTestId }
    });

    if (!test) {
      throw new Error(`Test not found: ${patientTestId}`);
    }

    // Update barcode_status to 'Printed' and transition status to Received if needed
    let updatedTest = test;
    
    // First, update barcode_status to 'Printed'
    updatedTest = await prisma.patientTest.update({
      where: { id: patientTestId },
      data: {
        barcode_status: 'Printed',
        lastStatusUpdateAt: new Date(),
        lastUpdatedBy: changedBy
      }
    });

    console.log(`✅ Barcode status updated to 'Printed' for test ${patientTestId}`);

    // Then, transition status from Registered to Received if needed
    if (test.status === 'Registered') {
      updatedTest = await updateTestStatus(
        patientTestId,
        'Received',
        'AUTO',
        changedBy,
        'Auto-transitioned when barcode printed'
      );
    }

    return updatedTest;
  } catch (error) {
    console.error('Error transitioning to Received:', error);
    throw error;
  }
};

/**
 * Automatically transition test from Received to Entered when first result is saved
 * This is called from result save handlers
 */
export const transitionToEnteredOnResultSave = async (patientTestId, changedBy = 'SYSTEM') => {
  try {
    const test = await prisma.patientTest.findUnique({
      where: { id: patientTestId }
    });

    if (!test) {
      throw new Error(`Test not found: ${patientTestId}`);
    }

    // Only transition if currently in Received status
    if (test.status === 'Received') {
      return await updateTestStatus(
        patientTestId,
        'Entered',
        'AUTO',
        changedBy,
        'Auto-transitioned when first result value entered'
      );
    }

    return test;
  } catch (error) {
    console.error('Error transitioning to Entered:', error);
    throw error;
  }
};

/**
 * Get the next allowed status based on current status
 * 
 * @param {string} currentStatus - Current status
 * @returns {array} - Array of allowed next statuses
 */
export const getNextAllowedStatuses = (currentStatus) => {
  const statusMap = {
    'Registered': ['Received'],
    'Received': ['Entered'],
    'Entered': ['Validated'],
    'Validated': ['Authorized'],
    'Authorized': ['Delivered'],
    'Delivered': ['Rectified'],
    'Rectified': ['Authorized', 'Delivered']  // Can loop back after rectification
  };

  return statusMap[currentStatus] || [];
};

/**
 * Check if a user role can edit results at a given stage
 * 
 * @param {string} stage - Current stage
 * @param {string} userRole - User role (LAB_TECH, SENIOR_TECH, ADMIN, etc.)
 * @returns {boolean} - True if user can edit
 */
export const canEditResultsAtStage = (stage, userRole) => {
  // Stages where editing is allowed
  const editableStages = ['Entered', 'Validated', 'Authorized', 'Delivered', 'Rectified'];

  if (!editableStages.includes(stage)) {
    return false;
  }

  // Role-based restrictions (add as needed)
  const restrictedRoles = {
    'Entered': [],           // Anyone can edit at entry stage
    'Validation': [],        // Lab techs and above
    'Authorized': [],        // Senior techs and above
    'Delivered': [],         // Senior techs and above
    'Rectified': []          // Senior techs and above
  };

  return true; // Simplified for now, can add role validation later
};

/**
 * Get status history for a test
 * 
 * @param {number} patientTestId - Test ID
 * @returns {Promise<array>} - Array of status history records
 */
export const getStatusHistory = async (patientTestId) => {
  try {
    const history = await prisma.testStatusHistory.findMany({
      where: { patientTestId },
      orderBy: { changedAt: 'desc' }
    });

    return history;
  } catch (error) {
    console.error('Error fetching status history:', error);
    throw error;
  }
};

/**
 * Get summary of all tests grouped by status
 * 
 * @returns {Promise<object>} - Object with status counts
 */
export const getStatusSummary = async () => {
  try {
    const summary = {};

    for (const stage of WORKFLOW_STAGES) {
      const count = await prisma.patientTest.count({
        where: { status: stage }
      });
      summary[stage] = count;
    }

    return summary;
  } catch (error) {
    console.error('Error getting status summary:', error);
    throw error;
  }
};
