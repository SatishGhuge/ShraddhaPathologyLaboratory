import API_BASE_URL from "./config";

export interface FieldConfig {
  fieldKey: string;
  fieldLabel: string;
  isVisible: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  displayOrder: number;
  sectionName: string;
  customLabel?: string;
}

export interface FormattingConfig {
  fontFamily: string;
  fontSizeHeader: number;
  fontSizeBody: number;
  fontSizeFooter: number;
  paperSize: string;
  orientation: string;
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
  lineHeight: number;
  showHeader: boolean;
  showFooter: boolean;
  showWatermark: boolean;
  showQRCode: boolean;
  showBarcode: boolean;
  showPrimarySignature: boolean;
  showSecondarySignature: boolean;
  signaturePosition: string;
  footerText?: string;
  watermarkText?: string;
}

// Get all field configurations
export const getFieldConfigurations = async (): Promise<FieldConfig[]> => {
  const response = await fetch(`${API_BASE_URL}/report-settings/fields`);
  if (!response.ok) throw new Error("Failed to fetch field configurations");
  return response.json();
};

// Get formatting configuration
export const getFormattingConfiguration = async (): Promise<FormattingConfig> => {
  const response = await fetch(`${API_BASE_URL}/report-settings/formatting`);
  if (!response.ok) throw new Error("Failed to fetch formatting configuration");
  return response.json();
};

// Save field configurations
export const saveFieldConfigurations = async (fields: FieldConfig[]): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/report-settings/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!response.ok) throw new Error("Failed to save field configurations");
  return response.json();
};

// Save formatting configuration
export const saveFormattingConfiguration = async (
  formatting: FormattingConfig
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/report-settings/formatting`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formatting),
  });
  if (!response.ok) throw new Error("Failed to save formatting configuration");
  return response.json();
};

// Reset to defaults
export const resetReportSettings = async (): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/report-settings/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to reset settings");
  return response.json();
};

// Get all settings (fields + formatting together)
export const getAllReportSettings = async () => {
  const [fields, formatting] = await Promise.all([
    getFieldConfigurations(),
    getFormattingConfiguration(),
  ]);
  return { fields, formatting };
};
