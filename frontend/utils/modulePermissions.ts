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
    outsourcing: false,
  },
  reports: {
    dashboard: false,
    collectionReport: false,
    organizationSettlement: false,
    referralDoctorSettlement: false,
    patientList: false,
    referralDoctorRevenue: false,
    testReport: false,
    turnAroundTime: false,
  },
  configuration: {
    signature: false,
    machines: false,
    reportSettings: false,
  },
  help: {
    userManual: false,
    ultraviewer: false,
    anydesk: false,
  },
  inventory: {
    stockTransactions: false,
    item: false,
    supplier: false,
    stockEntry: false,
    orgTransfer: false,
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
      hasAccess: allocation.patient?.registration || allocation.patient?.tests,
      registration: allocation.patient?.registration ?? false,
      tests: allocation.patient?.tests ?? false,
    },
    masters: {
      hasAccess: Object.values(allocation.masters || {}).some((v: any) => v === true),
      testlist: allocation.masters?.testlist ?? false,
      testTemplates: allocation.masters?.testTemplates ?? false,
      departmentlist: allocation.masters?.departmentlist ?? false,
      packagelist: allocation.masters?.packagelist ?? false,
      charges: allocation.masters?.charges ?? false,
      rolelist: allocation.masters?.rolelist ?? false,
      userlist: allocation.masters?.userlist ?? false,
      referralDoctorList: allocation.masters?.referralDoctorList ?? false,
      organization: allocation.masters?.organization ?? false,
      specimenType: allocation.masters?.specimenType ?? false,
      units: allocation.masters?.units ?? false,
      outsourcing: allocation.masters?.outsourcing ?? false,
    },
    reports: {
      hasAccess: Object.values(allocation.reports || {}).some((v: any) => v === true),
      dashboard: allocation.reports?.dashboard ?? false,
      collectionReport: allocation.reports?.collectionReport ?? false,
      organizationSettlement: allocation.reports?.organizationSettlement ?? false,
      patientList: allocation.reports?.patientList ?? false,
      referralDoctorRevenue: allocation.reports?.referralDoctorRevenue ?? false,
      testReport: allocation.reports?.testReport ?? false,
      turnAroundTime: allocation.reports?.turnAroundTime ?? false,
    },
    configuration: {
      hasAccess: allocation.configuration?.signature || allocation.configuration?.machines || allocation.configuration?.reportSettings,
      signature: allocation.configuration?.signature ?? false,
      machines: allocation.configuration?.machines ?? false,
      reportSettings: allocation.configuration?.reportSettings ?? false,
    },
    help: {
      hasAccess: allocation.help?.userManual || allocation.help?.ultraviewer || allocation.help?.anydesk,
      userManual: allocation.help?.userManual ?? false,
      ultraviewer: allocation.help?.ultraviewer ?? false,
      anydesk: allocation.help?.anydesk ?? false,
    },
    inventory: {
      stockTransactions: allocation.inventory?.stockTransactions ?? false,
      item: allocation.inventory?.item ?? false,
      supplier: allocation.inventory?.supplier ?? false,
      stockEntry: allocation.inventory?.stockEntry ?? false,
      orgTransfer: allocation.inventory?.orgTransfer ?? false,
    },
    result: allocation.result ?? false,
  };
};
