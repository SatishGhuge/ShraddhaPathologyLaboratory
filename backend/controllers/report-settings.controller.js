import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Default field configurations
const DEFAULT_FIELDS = [
  // Patient Information
  { fieldKey: "patient_name", fieldLabel: "Patient Name", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 1, sectionName: "Patient Information" },
  { fieldKey: "patient_age", fieldLabel: "Age", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 2, sectionName: "Patient Information" },
  { fieldKey: "gender", fieldLabel: "Gender", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 3, sectionName: "Patient Information" },
  { fieldKey: "registration_no", fieldLabel: "Registration No.", isVisible: false, isBold: false, isItalic: false, isUnderline: false, displayOrder: 4, sectionName: "Patient Information" },

  // Report Details
  { fieldKey: "referred_doctor", fieldLabel: "Referred By", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 5, sectionName: "Report Details" },
  { fieldKey: "organization_name", fieldLabel: "Lab/Organization", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 6, sectionName: "Report Details" },
  { fieldKey: "organization_location", fieldLabel: "Location", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 7, sectionName: "Report Details" },
  { fieldKey: "report_date", fieldLabel: "Report Date", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 8, sectionName: "Report Details" },
  { fieldKey: "authorized_by", fieldLabel: "Authorized By", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 9, sectionName: "Report Details" },
  { fieldKey: "sample_date", fieldLabel: "Sample Date", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 10, sectionName: "Report Details" },
  { fieldKey: "sample_id", fieldLabel: "Sample ID", isVisible: true, isBold: false, isItalic: false, isUnderline: false, displayOrder: 11, sectionName: "Report Details" },

  // System Fields
  { fieldKey: "mobile", fieldLabel: "Mobile", isVisible: false, isBold: false, isItalic: false, isUnderline: false, displayOrder: 12, sectionName: "System Fields" },
  { fieldKey: "email", fieldLabel: "Email", isVisible: false, isBold: false, isItalic: false, isUnderline: false, displayOrder: 13, sectionName: "System Fields" },
  { fieldKey: "address", fieldLabel: "Address", isVisible: false, isBold: false, isItalic: false, isUnderline: false, displayOrder: 14, sectionName: "System Fields" },
];

const DEFAULT_FORMATTING = {
  fontFamily: "Bookman Old Text",
  fontSizeHeader: 14,
  fontSizeBody: 11,
  fontSizeFooter: 9,
  lineHeight: 1.4,
  paperSize: "A4",
  orientation: "Portrait",
  topMargin: 10,
  bottomMargin: 10,
  leftMargin: 10,
  rightMargin: 10,
  showHeader: true,
  showFooter: true,
  showWatermark: false,
  showQRCode: true,
  showPrimarySignature: true,
  showSecondarySignature: false,
  signaturePosition: "Bottom Right",
  footerText: "**END OF REPORT**",
  watermarkText: "",
};

// Get all field configurations
export const getFieldConfigurations = async (req, res) => {
  try {
    let fields = await prisma.reportFieldConfiguration.findMany({
      orderBy: { displayOrder: "asc" },
    });

    if (fields.length === 0) {
      // Initialize with defaults if none exist
      await prisma.reportFieldConfiguration.createMany({
        data: DEFAULT_FIELDS,
      });
      fields = DEFAULT_FIELDS;
    }

    res.json({ success: true, data: fields });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get formatting configuration
export const getFormattingConfiguration = async (req, res) => {
  try {
    let formatting = await prisma.reportFormatting.findFirst();

    if (!formatting) {
      // Create default if none exists
      formatting = await prisma.reportFormatting.create({
        data: DEFAULT_FORMATTING,
      });
    }

    res.json({ success: true, data: formatting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save field configurations
export const saveFieldConfigurations = async (req, res) => {
  try {
    const fields = req.body;

    if (!Array.isArray(fields)) {
      return res.status(400).json({ success: false, message: "Fields must be an array" });
    }

    // Delete existing configurations
    await prisma.reportFieldConfiguration.deleteMany({});

    // Create new configurations
    const saved = await prisma.reportFieldConfiguration.createMany({
      data: fields,
    });

    res.json({ success: true, data: saved, message: `Saved ${saved.count} field configurations` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save formatting configuration
export const saveFormattingConfiguration = async (req, res) => {
  try {
    const formatting = req.body;

    // Find existing or create new
    let existing = await prisma.reportFormatting.findFirst();

    if (existing) {
      const updated = await prisma.reportFormatting.update({
        where: { id: existing.id },
        data: formatting,
      });
      res.json({ success: true, data: updated, message: "Formatting configuration updated" });
    } else {
      const created = await prisma.reportFormatting.create({
        data: formatting,
      });
      res.json({ success: true, data: created, message: "Formatting configuration created" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all settings together
export const getAllSettings = async (req, res) => {
  try {
    const fields = await prisma.reportFieldConfiguration.findMany({
      orderBy: { displayOrder: "asc" },
    });
    const formatting = await prisma.reportFormatting.findFirst();

    res.json({
      success: true,
      data: {
        fields: fields.length > 0 ? fields : DEFAULT_FIELDS,
        formatting: formatting || DEFAULT_FORMATTING,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save all settings together
export const saveAllSettings = async (req, res) => {
  try {
    const { fields, formatting } = req.body;

    if (fields && Array.isArray(fields)) {
      await prisma.reportFieldConfiguration.deleteMany({});
      const created = await prisma.reportFieldConfiguration.createMany({
        data: fields,
      });
    }

    if (formatting) {
      let existing = await prisma.reportFormatting.findFirst();
      if (existing) {
        const updated = await prisma.reportFormatting.update({
          where: { id: existing.id },
          data: formatting,
        });
      } else {
        const created = await prisma.reportFormatting.create({
          data: formatting,
        });
      }
    }
    res.json({ success: true, message: "All settings saved successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reset to default settings
export const resetToDefaults = async (req, res) => {
  try {
    // Delete existing and create defaults
    await prisma.reportFieldConfiguration.deleteMany({});
    await prisma.reportFormatting.deleteMany({});

    await prisma.reportFieldConfiguration.createMany({
      data: DEFAULT_FIELDS,
    });

    await prisma.reportFormatting.create({
      data: DEFAULT_FORMATTING,
    });

    res.json({ success: true, message: "Settings reset to defaults" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a single field configuration
export const updateFieldConfiguration = async (req, res) => {
  try {
    const { fieldKey } = req.params;
    const updates = req.body;

    const updated = await prisma.reportFieldConfiguration.update({
      where: { fieldKey },
      data: updates,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

