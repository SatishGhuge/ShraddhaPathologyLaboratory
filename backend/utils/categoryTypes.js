// Predefined category types for better organization
export const CATEGORY_TYPES = {
  HEADER: 'HEADER',           // Main section headers (e.g., "HEMATOLOGY")
  PARAMETER: 'PARAMETER',     // Parameter groups (e.g., "Complete Blood Count")
  SUBHEADER: 'SUBHEADER'      // Sub-sections (e.g., "Red Blood Cell Indices")
};

// Predefined category configurations for different test types
export const PREDEFINED_CATEGORIES = {
  HEMATOLOGY: {
    name: "HEMATOLOGY",
    categoryType: CATEGORY_TYPES.HEADER,
    color: "#dc2626", // Red
    icon: "blood-drop",
    description: "Blood-related parameters and counts",
    subcategories: [
      {
        name: "Complete Blood Count",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#ef4444",
        parameters: ["Hemoglobin", "Total WBC Count", "RBC Count", "Platelet Count"]
      },
      {
        name: "RBC Indices",
        categoryType: CATEGORY_TYPES.SUBHEADER,
        color: "#f87171",
        parameters: ["MCV", "MCH", "MCHC", "RDW"]
      },
      {
        name: "WBC Differential",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#fca5a5",
        parameters: ["Neutrophils", "Lymphocytes", "Monocytes", "Eosinophils", "Basophils"]
      }
    ]
  },
  
  BIOCHEMISTRY: {
    name: "BIOCHEMISTRY",
    categoryType: CATEGORY_TYPES.HEADER,
    color: "#2563eb", // Blue
    icon: "flask",
    description: "Chemical analysis of blood and body fluids",
    subcategories: [
      {
        name: "Liver Function Tests",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#3b82f6",
        parameters: ["SGOT/AST", "SGPT/ALT", "ALP", "Total Bilirubin", "Direct Bilirubin"]
      },
      {
        name: "Kidney Function Tests",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#60a5fa",
        parameters: ["Urea", "Creatinine", "Uric Acid", "BUN"]
      },
      {
        name: "Lipid Profile",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#93c5fd",
        parameters: ["Total Cholesterol", "HDL", "LDL", "Triglycerides"]
      }
    ]
  },
  
  ENDOCRINOLOGY: {
    name: "ENDOCRINOLOGY",
    categoryType: CATEGORY_TYPES.HEADER,
    color: "#059669", // Green
    icon: "hormone",
    description: "Hormone and endocrine system tests",
    subcategories: [
      {
        name: "Thyroid Function",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#10b981",
        parameters: ["TSH", "T3", "T4", "Free T3", "Free T4"]
      },
      {
        name: "Diabetes Panel",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#34d399",
        parameters: ["Glucose (Fasting)", "Glucose (PP)", "HbA1c"]
      }
    ]
  },
  
  IMMUNOLOGY: {
    name: "IMMUNOLOGY",
    categoryType: CATEGORY_TYPES.HEADER,
    color: "#7c3aed", // Purple
    icon: "shield",
    description: "Immune system and antibody tests",
    subcategories: [
      {
        name: "Infection Markers",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#8b5cf6",
        parameters: ["CRP", "ESR", "Procalcitonin"]
      }
    ]
  },
  
  MICROBIOLOGY: {
    name: "MICROBIOLOGY",
    categoryType: CATEGORY_TYPES.HEADER,
    color: "#ea580c", // Orange
    icon: "bacteria",
    description: "Bacterial, viral, and fungal analysis",
    subcategories: [
      {
        name: "Culture & Sensitivity",
        categoryType: CATEGORY_TYPES.PARAMETER,
        color: "#fb923c",
        parameters: ["Organism Identification", "Antibiotic Sensitivity"]
      }
    ]
  }
};

// Helper function to get category by type
export const getCategoriesByType = (type) => {
  return Object.values(PREDEFINED_CATEGORIES).filter(cat => 
    cat.categoryType === type || 
    cat.subcategories?.some(sub => sub.categoryType === type)
  );
};

// Helper function to get all available categories
export const getAllCategories = () => {
  const categories = [];
  
  Object.values(PREDEFINED_CATEGORIES).forEach(mainCat => {
    categories.push(mainCat);
    if (mainCat.subcategories) {
      categories.push(...mainCat.subcategories);
    }
  });
  
  return categories;
};