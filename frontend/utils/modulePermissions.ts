// Module permissions utility
export const defaultModuleAllocation = {
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
  },
  reports: {
    dashboard: false,
    collectionReport: false,
    patientList: false,
    referralDoctorRevenue: false,
    centerWiseCostReport: false,
    b2bTestwiseCostReport: false,
    discountReport: false,
    testReport: false,
  },
  configuration: {
    signature: false,
    machines: false,
  },
  help: {
    userManual: false,
    ultraviewer: false,
    anydesk: false,
  },
  result: false,
};

export const parseModuleAllocation = (allocation: any) => {
  if (!allocation) return defaultModuleAllocation;
  
  try {
    if (typeof allocation === 'string') {
      return JSON.parse(allocation);
    }
    return allocation;
  } catch (e) {
    return defaultModuleAllocation;
  }
};

export const hasModuleAccess = (moduleAllocation: any, modulePath: string): boolean => {
  const allocation = parseModuleAllocation(moduleAllocation);
  const keys = modulePath.split('.');
  
  let current = allocation;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  
  return Boolean(current);
};

export const getAccessibleModules = (moduleAllocation: any) => {
  const allocation = parseModuleAllocation(moduleAllocation);
  
  return {
    patient: {
      hasAccess: allocation.patient.registration || allocation.patient.tests,
      registration: allocation.patient.registration,
      tests: allocation.patient.tests,
    },
    masters: {
      hasAccess: Object.values(allocation.masters).some((v: any) => v === true),
      testlist: allocation.masters.testlist,
      testTemplates: allocation.masters.testTemplates,
      departmentlist: allocation.masters.departmentlist,
      packagelist: allocation.masters.packagelist,
      charges: allocation.masters.charges,
      rolelist: allocation.masters.rolelist,
      userlist: allocation.masters.userlist,
      referralDoctorList: allocation.masters.referralDoctorList,
      organization: allocation.masters.organization,
      specimenType: allocation.masters.specimenType,
      units: allocation.masters.units,
    },
    reports: {
      hasAccess: Object.values(allocation.reports).some((v: any) => v === true),
      dashboard: allocation.reports.dashboard,
      collectionReport: allocation.reports.collectionReport,
      patientList: allocation.reports.patientList,
      referralDoctorRevenue: allocation.reports.referralDoctorRevenue,
      centerWiseCostReport: allocation.reports.centerWiseCostReport,
      b2bTestwiseCostReport: allocation.reports.b2bTestwiseCostReport,
      discountReport: allocation.reports.discountReport,
      testReport: allocation.reports.testReport,
    },
    configuration: {
      hasAccess: allocation.configuration.signature,
      signature: allocation.configuration.signature,
      machines: allocation.configuration.machines,
    },
    help: {
      hasAccess: allocation.help.userManual || allocation.help.ultraviewer || allocation.help.anydesk,
      userManual: allocation.help.userManual,
      ultraviewer: allocation.help.ultraviewer,
      anydesk: allocation.help.anydesk,
    },
    result: allocation.result,
  };
};
