/**
 * Module Permissions Utility
 * Parses user moduleAllocation and returns accessible modules
 */

export interface ModulePermissions {
  patient: {
    registration: boolean;
    tests: boolean;
  };
  masters: {
    testlist: boolean;
    testTemplates: boolean;
    departmentlist: boolean;
    packagelist: boolean;
    charges: boolean;
    rolelist: boolean;
    userlist: boolean;
    referralDoctorList: boolean;
    organization: boolean;
    specimenType: boolean;
    units: boolean;
    hasAccess: boolean; // true if any master module is enabled
  };
  reports: {
    dashboard: boolean;
    collectionReport: boolean;
    patientList: boolean;
    referralDoctorRevenue: boolean;
    testReport: boolean;
    turnAroundTime?: boolean;
    centerWiseCostReport?: boolean;
    b2bTestwiseCostReport?: boolean;
    discountReport?: boolean;
    [key: string]: any;
  };
  configuration: {
    letterhead: boolean;
    signature: boolean;
  };
  help: {
    userManual: boolean;
    ultraviewer: boolean;
    anydesk: boolean;
  };
  result: boolean;
}

/**
 * Parse moduleAllocation and return accessible modules with boolean flags
 * @param moduleAllocation - JSON string or object from user login response
 * @returns ModulePermissions object with all module access flags
 */
export const getAccessibleModules = (moduleAllocation: string | object | null): ModulePermissions => {
  // Default: all modules disabled
  const defaultPermissions: ModulePermissions = {
    patient: {
      registration: false,
      tests: false,
    },
    masters: {
      testlist: false,
      testTemplates: false,
      departmentlist: false,
      packagelist: false,
      charges: false,
      rolelist: false,
      userlist: false,
      referralDoctorList: false,
      organization: false,
      specimenType: false,
      units: false,
      hasAccess: false,
    },
    reports: {
      dashboard: false,
      collectionReport: false,
      patientList: false,
      referralDoctorRevenue: false,
      testReport: false,
      turnAroundTime: false,
    },
    configuration: {
      letterhead: false,
      signature: false,
    },
    help: {
      userManual: false,
      ultraviewer: false,
      anydesk: false,
    },
    result: false,
  };

  // If no allocation, return default
  if (!moduleAllocation) {
    console.log('🔐 No moduleAllocation provided, using defaults');
    return defaultPermissions;
  }

  try {
    // Parse if string, otherwise use as-is
    let allocation = typeof moduleAllocation === 'string' 
      ? JSON.parse(moduleAllocation) 
      : moduleAllocation;

    console.log('🔐 Parsed moduleAllocation:', allocation);

    // Merge with defaults
    const permissions: ModulePermissions = {
      patient: {
        registration: allocation?.patient?.registration ?? false,
        tests: allocation?.patient?.tests ?? false,
      },
      masters: {
        testlist: allocation?.masters?.testlist ?? false,
        testTemplates: allocation?.masters?.testTemplates ?? false,
        departmentlist: allocation?.masters?.departmentlist ?? false,
        packagelist: allocation?.masters?.packagelist ?? false,
        charges: allocation?.masters?.charges ?? false,
        rolelist: allocation?.masters?.rolelist ?? false,
        userlist: allocation?.masters?.userlist ?? false,
        referralDoctorList: allocation?.masters?.referralDoctorList ?? false,
        organization: allocation?.masters?.organization ?? false,
        specimenType: allocation?.masters?.specimenType ?? false,
        units: allocation?.masters?.units ?? false,
        hasAccess: false, // will set below
      },
      reports: {
        dashboard: allocation?.reports?.dashboard ?? false,
        collectionReport: allocation?.reports?.collectionReport ?? false,
        patientList: allocation?.reports?.patientList ?? false,
        referralDoctorRevenue: allocation?.reports?.referralDoctorRevenue ?? false,
        testReport: allocation?.reports?.testReport ?? false,
        turnAroundTime: allocation?.reports?.turnAroundTime ?? false,
      },
      configuration: {
        letterhead: allocation?.configuration?.letterhead ?? false,
        signature: allocation?.configuration?.signature ?? false,
      },
      help: {
        userManual: allocation?.help?.userManual ?? false,
        ultraviewer: allocation?.help?.ultraviewer ?? false,
        anydesk: allocation?.help?.anydesk ?? false,
      },
      result: allocation?.result ?? false,
    };

    // Check if any master module is enabled
    permissions.masters.hasAccess = Object.entries(permissions.masters)
      .filter(([key]) => key !== 'hasAccess')
      .some(([, value]) => value === true);

    console.log('🔐 Final permissions:', permissions);
    return permissions;

  } catch (error) {
    console.error('🔐 Error parsing moduleAllocation:', error);
    return defaultPermissions;
  }
};

/**
 * Check if user has access to a specific module
 * @param moduleAllocation - User's moduleAllocation
 * @param modulePath - Path like "masters.testlist" or "patient.registration"
 * @returns boolean - true if user has access
 */
export const hasModuleAccess = (moduleAllocation: string | object | null, modulePath: string): boolean => {
  const permissions = getAccessibleModules(moduleAllocation);
  const parts = modulePath.split('.');
  
  let current: any = permissions;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  
  return current === true;
};
