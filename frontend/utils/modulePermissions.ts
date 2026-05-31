// Module permissions utility
export const defaultModuleAllocation = {
  patient: {
    registration: false,
    tests: false,
    outsourcing: false,
  },
  masters: {
    center: false,
    centerlist: false,
    charges: false,
    corporate: false,
    corporateWiseCharges: false,
    corporatelist: false,
    departmentlist: false,
    franchise: false,
    microbiologyOrganism: false,
    outsourcing: false,
    packagelist: false,
    referralDoctor: false,
    referralDoctorList: false,
    rolelist: false,
    specimenType: false,
    testCharges: false,
    testTemplates: false,
    testlist: false,
    units: false,
    user: false,
    userlist: false,
  },
  reports: {
    dashboard: false,
    dailyCollection: false,
    monthlyCollectionSummary: false,
    patientList: false,
    centerWiseCostReport: false,
    b2bTestwiseCostReport: false,
    discountReport: false,
    testReport: false,
    testCompliment: false,
    serviceCountReport: false,
    paymentReceipt: false,
    sampleRejectionReport: false,
    detailedWorksheet: false,
    hospitalBills: false,
  },
  signature: false,
  help: false,
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
      hasAccess: allocation.patient.registration || allocation.patient.tests || allocation.patient.outsourcing,
      registration: allocation.patient.registration,
      tests: allocation.patient.tests,
      outsourcing: allocation.patient.outsourcing,
    },
    masters: {
      hasAccess: Object.values(allocation.masters).some((v: any) => v === true),
      center: allocation.masters.center,
      centerlist: allocation.masters.centerlist,
      charges: allocation.masters.charges,
      corporate: allocation.masters.corporate,
      corporateWiseCharges: allocation.masters.corporateWiseCharges,
      corporatelist: allocation.masters.corporatelist,
      departmentlist: allocation.masters.departmentlist,
      franchise: allocation.masters.franchise,
      microbiologyOrganism: allocation.masters.microbiologyOrganism,
      outsourcing: allocation.masters.outsourcing,
      packagelist: allocation.masters.packagelist,
      referralDoctor: allocation.masters.referralDoctor,
      referralDoctorList: allocation.masters.referralDoctorList,
      rolelist: allocation.masters.rolelist,
      specimenType: allocation.masters.specimenType,
      testCharges: allocation.masters.testCharges,
      testTemplates: allocation.masters.testTemplates,
      testlist: allocation.masters.testlist,
      units: allocation.masters.units,
      user: allocation.masters.user,
      userlist: allocation.masters.userlist,
    },
    reports: {
      hasAccess: Object.values(allocation.reports).some((v: any) => v === true),
      dashboard: allocation.reports.dashboard,
      dailyCollection: allocation.reports.dailyCollection,
      monthlyCollectionSummary: allocation.reports.monthlyCollectionSummary,
      patientList: allocation.reports.patientList,
      centerWiseCostReport: allocation.reports.centerWiseCostReport,
      b2bTestwiseCostReport: allocation.reports.b2bTestwiseCostReport,
      discountReport: allocation.reports.discountReport,
      testReport: allocation.reports.testReport,
      testCompliment: allocation.reports.testCompliment,
      serviceCountReport: allocation.reports.serviceCountReport,
      paymentReceipt: allocation.reports.paymentReceipt,
      sampleRejectionReport: allocation.reports.sampleRejectionReport,
      detailedWorksheet: allocation.reports.detailedWorksheet,
      hospitalBills: allocation.reports.hospitalBills,
    },
    signature: allocation.signature,
    help: allocation.help,
    result: allocation.result,
  };
};
