/**
 * Reference Range Matcher by Age and Gender
 * Matches patient age with appropriate reference ranges
 * 
 * Range Types:
 * 1. BySex: Gender-based ranges (Male/Female/Child)
 * 2. ByAge: Age-based ranges for different age groups
 * 3. ByRange: Numeric range interpretation
 */

import { getAgeForRangeMatching, parseFormattedAge, getAgeInDays } from './ageCalculator.js';

/**
 * Find matching range from normalRanges array by gender
 * normalRanges: [{ gender: "Male", ll: "4.5", ul: "5.5", default: "5.0", isActive: true }, ...]
 */
export const getGenderBasedRange = (normalRanges, gender) => {
  if (!normalRanges || !Array.isArray(normalRanges)) return null;
  
  try {
    // Normalize gender input
    const genderNormalized = gender?.trim().toLowerCase() || '';
    
    // Find exact match
    let range = normalRanges.find(r => 
      r.isActive && r.gender?.trim().toLowerCase() === genderNormalized
    );
    
    if (range) return range;
    
    // If no exact match and gender is "both" or not found, try "Both" (covers all)
    range = normalRanges.find(r => 
      r.isActive && r.gender?.trim().toLowerCase() === 'both'
    );
    
    if (range) return range;
    
    // Fallback: return first active range
    range = normalRanges.find(r => r.isActive);
    return range || null;
  } catch (error) {
    console.error('Error getting gender-based range:', error);
    return null;
  }
};

/**
 * Find matching age range from ageRanges array
 * ageRanges: [
 *   { label: "Less Than For Male", value: "180", ll: "3", ul: "5.5", isActive: true, gender: "Male" },
 *   { label: "Between Male", from: "180", to: "1095", ll: "4", ul: "6", isActive: true, gender: "Male" },
 *   ...
 * ]
 */
export const getAgeBasedRange = (ageRanges, patientAgeDays, gender) => {
  if (!ageRanges || !Array.isArray(ageRanges) || patientAgeDays === null) return null;
  
  try {
    const genderNormalized = gender?.trim().toLowerCase() || '';
    
    // Filter ranges for this gender
    const relevantRanges = ageRanges.filter(r => {
      if (!r.isActive) return false;
      
      const rangeGender = r.gender?.trim().toLowerCase() || '';
      
      // Match by gender or "both"
      if (rangeGender === genderNormalized || rangeGender === 'both') {
        return true;
      }
      
      // If no gender specified in range, include it
      if (!rangeGender) return true;
      
      return false;
    });
    
    if (relevantRanges.length === 0) return null;
    
    // Find matching range based on age
    for (const range of relevantRanges) {
      // Type 1: "Less Than" ranges - single value comparison
      if (range.value !== undefined && range.value !== null) {
        const limitDays = parseInt(range.value);
        if (patientAgeDays < limitDays) {
          return range;
        }
      }
      
      // Type 2: "Between" ranges - range comparison
      if (range.from !== undefined && range.to !== undefined) {
        const fromDays = parseInt(range.from);
        const toDays = parseInt(range.to);
        
        if (patientAgeDays >= fromDays && patientAgeDays <= toDays) {
          return range;
        }
      }
      
      // Type 3: "More Than" ranges - lower limit only
      if (range.from !== undefined && !range.to) {
        const fromDays = parseInt(range.from);
        if (patientAgeDays >= fromDays) {
          return range;
        }
      }
    }
    
    // If no range found, return the last/default one
    return relevantRanges[relevantRanges.length - 1] || null;
  } catch (error) {
    console.error('Error getting age-based range:', error);
    return null;
  }
};

/**
 * Get reference range for a parameter based on patient age and gender
 * Supports both BySex and ByAge range types
 */
export const getReferencRange = (parameter, patientAgeDays, patientAge, gender) => {
  if (!parameter) return null;
  
  try {
    const rangeType = parameter.rangeType || 'BySex';
    
    // BySex: Use gender-based ranges
    if (rangeType === 'BySex') {
      const range = getGenderBasedRange(parameter.normalRanges, gender);
      if (range) {
        return {
          ll: range.ll,
          ul: range.ul,
          default: range.default,
          rangeText: `${range.ll} - ${range.ul}`,
          type: 'BySex',
          gender: range.gender
        };
      }
    }
    
    // ByAge: Use age-based ranges
    if (rangeType === 'ByAge') {
      const range = getAgeBasedRange(parameter.ageRanges, patientAgeDays, gender);
      if (range) {
        return {
          ll: range.ll,
          ul: range.ul,
          default: range.default,
          rangeText: `${range.ll} - ${range.ul}`,
          type: 'ByAge',
          ageLabel: range.label,
          gender: range.gender
        };
      }
    }
    
    // ByRange: Use range value interpretation (for text parameters)
    if (rangeType === 'ByRange') {
      // This is typically used for text/descriptive parameters
      return {
        type: 'ByRange',
        rangeText: parameter.rangeText,
        rangeValues: parameter.rangeValues
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting reference range:', error);
    return null;
  }
};

/**
 * Match parameter result against reference range
 * Returns: { isAbnormal: boolean, message: string }
 */
export const checkIfAbnormal = (resultValue, parameter, referenceRange) => {
  if (!parameter || !referenceRange || resultValue === null || resultValue === undefined) {
    return {
      isAbnormal: false,
      message: 'Unable to determine - missing data'
    };
  }
  
  try {
    // For Numeric parameters
    if (parameter.type === 'Numeric' && referenceRange.ll !== undefined && referenceRange.ul !== undefined) {
      const numValue = parseFloat(resultValue);
      const ll = parseFloat(referenceRange.ll);
      const ul = parseFloat(referenceRange.ul);
      
      if (isNaN(numValue) || isNaN(ll) || isNaN(ul)) {
        return {
          isAbnormal: false,
          message: 'Cannot parse numeric values'
        };
      }
      
      if (numValue < ll || numValue > ul) {
        return {
          isAbnormal: true,
          message: `Outside range (${ll} - ${ul})`
        };
      }
      
      return {
        isAbnormal: false,
        message: 'Within normal range'
      };
    }
    
    // For Text parameters with interpretations
    if (parameter.type === 'Text' && referenceRange.rangeValues) {
      // Text interpretation logic - typically uses predefined values
      return {
        isAbnormal: false,
        message: 'Text value recorded'
      };
    }
    
    return {
      isAbnormal: false,
      message: 'Unable to determine'
    };
  } catch (error) {
    console.error('Error checking if abnormal:', error);
    return {
      isAbnormal: false,
      message: 'Error checking range'
    };
  }
};

/**
 * Get all reference ranges for a parameter based on patient data
 * Useful for displaying available ranges
 */
export const getAllReferencRanges = (parameter, gender) => {
  if (!parameter) return [];
  
  const ranges = [];
  
  try {
    const rangeType = parameter.rangeType || 'BySex';
    
    if (rangeType === 'BySex' && parameter.normalRanges) {
      ranges.push({
        type: 'BySex',
        ranges: parameter.normalRanges.filter(r => r.isActive)
      });
    }
    
    if (rangeType === 'ByAge' && parameter.ageRanges) {
      ranges.push({
        type: 'ByAge',
        ranges: parameter.ageRanges.filter(r => r.isActive)
      });
    }
    
    if (rangeType === 'ByRange' && parameter.rangeValues) {
      ranges.push({
        type: 'ByRange',
        ranges: parameter.rangeValues.filter(r => r.isActive)
      });
    }
  } catch (error) {
    console.error('Error getting all reference ranges:', error);
  }
  
  return ranges;
};

/**
 * Match parameter result against correct range and return abnormal flag
 * This is the main function to use in result processing
 */
export const getParameterAbnormalStatus = (resultValue, parameter, patientAgeDays, patientAge, gender) => {
  if (!parameter) {
    return {
      isAbnormal: false,
      referenceRange: null,
      message: 'No parameter data'
    };
  }
  
  // Get the appropriate reference range
  const refRange = getReferencRange(parameter, patientAgeDays, patientAge, gender);
  
  if (!refRange) {
    return {
      isAbnormal: false,
      referenceRange: null,
      message: 'No reference range found'
    };
  }
  
  // Check if value is abnormal
  const abnormalCheck = checkIfAbnormal(resultValue, parameter, refRange);
  
  return {
    isAbnormal: abnormalCheck.isAbnormal,
    referenceRange: refRange,
    message: abnormalCheck.message,
    rangeText: refRange.rangeText || `${refRange.ll} - ${refRange.ul}`
  };
};

export default {
  getGenderBasedRange,
  getAgeBasedRange,
  getReferencRange,
  checkIfAbnormal,
  getAllReferencRanges,
  getParameterAbnormalStatus
};
