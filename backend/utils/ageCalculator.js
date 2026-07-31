/**
 * Age Calculator Utility
 * Formats ages based on DOB or manual input
 * 
 * Age Format Rules:
 * - < 1 year: "12D" or "3M12D" (Days/Months combination)
 * - 1-12 years: "11Y3M12D" (Years/Months/Days)
 * - > 12 years: "12.1" (Decimal format with 1 decimal place)
 */

/**
 * Calculate exact age from Date of Birth
 * Returns: { years, months, days, totalDays }
 */
export const calculateExactAge = (dobString) => {
  if (!dobString) return null;
  
  try {
    const dob = new Date(dobString);
    const today = new Date();
    
    if (dob > today) {
      console.warn('⚠️ DOB is in the future:', dobString);
      return null;
    }
    
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();
    
    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Calculate total days since birth
    const totalDays = Math.floor((today - dob) / (1000 * 60 * 60 * 24));
    
    return {
      years,
      months,
      days,
      totalDays,
      dob: dob
    };
  } catch (error) {
    console.error('Error calculating age from DOB:', error);
    return null;
  }
};

/**
 * Format age based on age value and DOB
 * Returns age in the required format string
 */
export const formatAge = (ageInput, dobString = null) => {
  try {
    // If DOB is provided, calculate from DOB
    if (dobString) {
      const ageData = calculateExactAge(dobString);
      if (!ageData) return null;
      
      const { years, months, days } = ageData;
      
      // < 1 year: "12D" or "3M12D"
      if (years === 0) {
        if (months === 0) {
          return `${days}D`;
        } else {
          return `${months}M${days}D`;
        }
      }
      
      // 1-12 years: "11Y 4M 6D" (with spaces between units)
      if (years < 12) {
        return `${years}Y ${months}M ${days}D`;
      }
      
      // > 12 years: decimal format "12.1"
      const decimalAge = years + (months / 12);
      return decimalAge.toFixed(1);
    }
    
    // If only age input is provided (manual entry)
    if (ageInput !== null && ageInput !== undefined) {
      const ageStr = ageInput.toString().trim();
      
      // Already in correct format - validate and return
      if (isValidAgeFormat(ageStr)) {
        return ageStr;
      }
      
      // If it's just a number, treat it as years (> 12 years format)
      if (!isNaN(ageStr)) {
        const numAge = parseFloat(ageStr);
        if (numAge >= 12) {
          return numAge.toFixed(1);
        } else {
          // Return as is for now, should ideally ask for full date of birth
          return ageStr;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error formatting age:', error);
    return null;
  }
};

/**
 * Validate if age string is in correct format
 */
export const isValidAgeFormat = (ageStr) => {
  if (!ageStr || typeof ageStr !== 'string') return false;
  
  const ageStr_trim = ageStr.trim();
  
  // Pattern: "12D" or "3M12D" or "11Y 4M 6D" or "12.1"
  const patterns = [
    /^\d+D$/, // Days only: "12D"
    /^\d+M\d+D$/, // Months and Days: "3M12D"
    /^\d+Y\s\d+M\s\d+D$/, // Years, Months, Days with spaces: "11Y 4M 6D"
    /^\d+Y\d+M\d+D$/, // Years, Months, Days without spaces (old format compatibility): "11Y4M6D"
    /^\d+\.\d{1}$/ // Decimal: "12.1"
  ];
  
  return patterns.some(pattern => pattern.test(ageStr_trim));
};

/**
 * Parse formatted age string and return components
 * Returns: { years, months, days, type }
 */
export const parseFormattedAge = (ageStr) => {
  if (!ageStr || !isValidAgeFormat(ageStr)) {
    return null;
  }
  
  const str = ageStr.trim();
  
  // Check for decimal format (> 12 years): "12.1"
  if (str.includes('.')) {
    const decimalAge = parseFloat(str);
    const years = Math.floor(decimalAge);
    const decimalPart = decimalAge - years;
    const months = Math.round(decimalPart * 12);
    return {
      years,
      months,
      days: 0,
      type: 'decimal',
      decimalAge
    };
  }
  
  // Check for Years, Months, Days: "11Y 4M 6D" or "11Y4M6D"
  if (str.includes('Y')) {
    // Handle both with spaces and without spaces
    const partsWithSpaces = str.match(/(\d+)Y\s(\d+)M\s(\d+)D/);
    const partsWithoutSpaces = str.match(/(\d+)Y(\d+)M(\d+)D/);
    const parts = partsWithSpaces || partsWithoutSpaces;
    
    if (parts) {
      return {
        years: parseInt(parts[1]),
        months: parseInt(parts[2]),
        days: parseInt(parts[3]),
        type: 'ymd'
      };
    }
  }
  
  // Check for Months and Days: "3M12D"
  if (str.includes('M')) {
    const parts = str.match(/(\d+)M(\d+)D/);
    if (parts) {
      return {
        years: 0,
        months: parseInt(parts[1]),
        days: parseInt(parts[2]),
        type: 'md'
      };
    }
  }
  
  // Check for Days only: "12D"
  if (str.includes('D')) {
    const parts = str.match(/(\d+)D/);
    if (parts) {
      return {
        years: 0,
        months: 0,
        days: parseInt(parts[1]),
        type: 'd'
      };
    }
  }
  
  return null;
};

/**
 * Convert parsed age to total days
 * Useful for range comparisons
 */
export const getAgeInDays = (ageStr) => {
  const parsed = parseFormattedAge(ageStr);
  if (!parsed) return null;
  
  const totalDays = (parsed.years * 365) + (parsed.months * 30) + parsed.days;
  return totalDays;
};

/**
 * Get age category for a formatted age string
 * Returns: 'baby' | 'child' | 'adult'
 */
export const getAgeCategory = (ageStr) => {
  const parsed = parseFormattedAge(ageStr);
  if (!parsed) return null;
  
  const years = parsed.years;
  
  if (years < 1) return 'baby'; // < 1 year
  if (years < 12) return 'child'; // 1-12 years
  return 'adult'; // > 12 years
};

/**
 * Convert age in days to formatted string
 * Useful for converting age ranges
 */
export const daysToFormattedAge = (totalDays) => {
  if (!totalDays || totalDays < 0) return null;
  
  const years = Math.floor(totalDays / 365);
  const remainingDaysAfterYears = totalDays % 365;
  const months = Math.floor(remainingDaysAfterYears / 30);
  const days = remainingDaysAfterYears % 30;
  
  if (years === 0) {
    if (months === 0) {
      return `${days}D`;
    } else {
      return `${months}M${days}D`;
    }
  }
  
  if (years < 12) {
    return `${years}Y ${months}M ${days}D`;
  }
  
  // > 12 years: decimal
  const decimalAge = years + (months / 12);
  return decimalAge.toFixed(1);
};

/**
 * Get age range for reference range lookup
 * Based on DOB or manual age input and gender
 */
export const getAgeForRangeMatching = (ageStr, dobString = null) => {
  // If DOB is provided, calculate exact age
  if (dobString) {
    const ageData = calculateExactAge(dobString);
    if (!ageData) return null;
    
    return {
      years: ageData.years,
      months: ageData.months,
      days: ageData.days,
      totalDays: ageData.totalDays,
      type: getAgeCategory(ageStr)
    };
  }
  
  // Parse the age string
  const parsed = parseFormattedAge(ageStr);
  if (!parsed) return null;
  
  const totalDays = (parsed.years * 365) + (parsed.months * 30) + parsed.days;
  
  return {
    years: parsed.years,
    months: parsed.months,
    days: parsed.days,
    totalDays: totalDays,
    type: getAgeCategory(ageStr)
  };
};

/**
 * Format age for display in UI/Reports
 * Shows formatted age with tooltip info
 */
export const formatAgeForDisplay = (ageStr, dobString = null) => {
  if (!ageStr) return '-';
  
  try {
    // For babies (< 1 year), show formatted age with DOB
    if (ageStr.includes('D') && !ageStr.includes('Y')) {
      if (dobString) {
        const dob = new Date(dobString);
        const dobFormatted = dob.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        return {
          display: ageStr,
          tooltip: `Born: ${dobFormatted}`,
          category: 'baby'
        };
      }
      return {
        display: ageStr,
        tooltip: null,
        category: 'baby'
      };
    }
    
    // For children (1-12 years)
    if (ageStr.includes('Y')) {
      return {
        display: ageStr,
        tooltip: null,
        category: 'child'
      };
    }
    
    // For adults (> 12 years)
    if (ageStr.includes('.')) {
      return {
        display: ageStr + ' years',
        tooltip: null,
        category: 'adult'
      };
    }
    
    return {
      display: ageStr,
      tooltip: null,
      category: 'unknown'
    };
  } catch (error) {
    console.error('Error formatting age for display:', error);
    return '-';
  }
};

export default {
  calculateExactAge,
  formatAge,
  isValidAgeFormat,
  parseFormattedAge,
  getAgeInDays,
  getAgeCategory,
  daysToFormattedAge,
  getAgeForRangeMatching,
  formatAgeForDisplay
};
