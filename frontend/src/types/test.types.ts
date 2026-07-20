// Test and Parameter Type Definitions

export interface AgeRange {
  label: string;
  value?: string;
  from?: string;
  to?: string;
  ll: string;
  ul: string;
  default: string;
  timeUnit: string;
  isActive: boolean;
  gender?: string;
  isNewlyAdded?: boolean;
}

export interface NormalRange {
  gender: string;
  ll: string;
  ul: string;
  default: string;
  isActive: boolean;
}

export interface RangeValue {
  label: string;
  min: string;
  max: string;
  interpretation: string;
  isActive: boolean;
  isNewlyAdded?: boolean;
}

export interface Parameter {
  parameterName: string;
  machineCode: string;
  multiplyBy: string;
  decimal: string;
  sortOrder: string;
  isDescriptive: boolean;
  lowPanic: string;
  highPanic: string;
  isNABL: boolean;
  parameterCode?: string;
  hasFormula?: boolean;
  formula?: string;
  type: string;
  isMandatory: boolean;
  rangeType: string;
  units: string;
  displayRangeText?: string;
  rangeText?: string;
  textContent?: string;
  isMultipleOptions?: boolean;
  normalRanges: NormalRange[];
  ageRanges: AgeRange[];
  rangeValues: RangeValue[];
  _editingFormula?: boolean;
}

export interface Category {
  categoryId: string;
  name: string;
  categoryType: string;
  isCategory: boolean;
  sortOrder: string;
  testMethod: string;
  color: string;
  icon: string;
  description: string;
  parentId: any;
  parameters: Parameter[];
}

export interface TestFormData {
  name: string;
  department: string;
  sortOrder: string;
  shortName: string;
  attachFile: string;
  imageSize: string;
  testMethod: string;
  preparationTime: string;
  preparationType: string;
  isNABL: boolean;
  lineHeight: string;
  profileTest: string;
  reportHeader: string;
  sampleType: string;
  machineName: string;
  isHeader: boolean;
  showTestName: boolean;
  outsourceLab: string;
  testCode: string;
  group: string;
  instructionPreparation: string;
  instructionPatient: string;
  interpretationLabel: string;
  interpretation: string;
}

export interface CKEditorConfig {
  height?: number;
  placeholder?: string;
  toolbar?: string[];
  fontFamily?: {
    options: string[];
  };
  fontSize?: {
    options: (number | string)[];
  };
  [key: string]: any;
}
