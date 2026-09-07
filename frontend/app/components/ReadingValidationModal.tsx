import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import API_BASE_URL from '@/src/api/config';
import { deleteCommentFromHistory } from '@/src/api/result';
import { parseHtmlText, HtmlPart } from '@/src/utils/htmlParser';

// Helper function to extract ALL available options from a parameter (from ALL database fields)
const getAllOptionsFromParameter = (param: Parameter): string[] => {
  const allOptions: string[] = [];  // Use array to maintain order
  const seenOptions = new Set<string>();
  
  console.log(`🔍 DEBUG: Processing parameter "${param.parameterName}" (ID: ${param.id}, Type: ${param.type}, isMultipleOptions: ${param.isMultipleOptions})`);
  console.log(`  📊 Available data fields:`, {
    textContent: param.textContent ? `"${param.textContent.substring(0, 50)}${param.textContent.length > 50 ? '...' : ''}"` : 'EMPTY',
    displayRangeText: param.displayRangeText || 'EMPTY',
    rangeText: param.rangeText || 'EMPTY',
    rangeValues: param.rangeValues ? `"${param.rangeValues.substring(0, 50)}${param.rangeValues.length > 50 ? '...' : ''}"` : 'EMPTY',
    maleDefaultValue: param.maleDefaultValue || 'EMPTY',
    femaleDefaultValue: param.femaleDefaultValue || 'EMPTY',
    childDefaultValue: param.childDefaultValue || 'EMPTY'
  });
  
  // 1. Add all options from textContent (primary source - textarea with newline or pipe-separated values)
  // IMPORTANT: Keep order as entered (first line = first option)
  if (param.textContent?.trim()) {
    try {
      let options: any[] = [];
      try {
        options = JSON.parse(param.textContent);
        console.log(`  ✅ textContent parsed as JSON:`, options);
      } catch {
        // Split by newlines first to get lines in order
        const byNewline = param.textContent.split('\n').map((o: string) => o.trim()).filter(Boolean);
        console.log(`  📋 Raw textContent:`, param.textContent.substring(0, 100));
        console.log(`  📋 Split by newline:`, byNewline);
        if (byNewline.length > 1) {
          options = byNewline;
        } else {
          // If only one line, split by pipes ONLY (not commas - commas are part of the continuous value)
          options = param.textContent.split('|').map((o: string) => o.trim()).filter(Boolean);
          console.log(`  📋 Split by pipe (single line):`, options);
        }
      }
      
      console.log(`  🔍 Options before processing:`, options);
      
      options.forEach((option: any) => {
        const optionValue = typeof option === 'object' ? option.value || option.name : option;
        const trimmed = optionValue?.toString().trim();
        // Include even if it's just a dash "-" or empty (they are valid values)
        if (trimmed !== null && trimmed !== undefined && !seenOptions.has(trimmed)) {
          allOptions.push(trimmed);
          seenOptions.add(trimmed);
          console.log(`    ✅ Added from textContent: "${trimmed}"`);
        }
      });
    } catch (e) {
      console.warn(`⚠️ Error parsing textContent for parameter ${param.id}:`, e);
    }
  } else {
    console.log(`  ⚠️ textContent is empty or null - checking other fields`);
  }
  
  console.log(`  📊 After textContent processing - allOptions:`, allOptions);
  
  // 2. Add gender-specific default values (same as patient result page)
  if (param.maleDefaultValue?.trim() && !seenOptions.has(param.maleDefaultValue.trim())) {
    allOptions.push(param.maleDefaultValue.trim());
    seenOptions.add(param.maleDefaultValue.trim());
    console.log(`    ✅ Added maleDefaultValue: "${param.maleDefaultValue.trim()}"`);
  }
  if (param.femaleDefaultValue?.trim() && !seenOptions.has(param.femaleDefaultValue.trim())) {
    allOptions.push(param.femaleDefaultValue.trim());
    seenOptions.add(param.femaleDefaultValue.trim());
    console.log(`    ✅ Added femaleDefaultValue: "${param.femaleDefaultValue.trim()}"`);
  }
  if (param.childDefaultValue?.trim() && !seenOptions.has(param.childDefaultValue.trim())) {
    allOptions.push(param.childDefaultValue.trim());
    seenOptions.add(param.childDefaultValue.trim());
    console.log(`    ✅ Added childDefaultValue: "${param.childDefaultValue.trim()}"`);
  }
  
  // 3. Add from displayRangeText (split by pipe only)
  if (param.displayRangeText?.trim()) {
    console.log(`  📊 Processing displayRangeText: "${param.displayRangeText}"`);
    param.displayRangeText.split('|').forEach((opt: string) => {
      const trimmed = opt.trim();
      if (trimmed !== null && trimmed !== undefined && !seenOptions.has(trimmed)) {
        allOptions.push(trimmed);
        seenOptions.add(trimmed);
        console.log(`    ✅ Added from displayRangeText: "${trimmed}"`);
      }
    });
  }
  
  // 4. Add from rangeText (split by pipe only)
  if (param.rangeText?.trim()) {
    console.log(`  📊 Processing rangeText: "${param.rangeText}"`);
    param.rangeText.split('|').forEach((opt: string) => {
      const trimmed = opt.trim();
      if (trimmed !== null && trimmed !== undefined && !seenOptions.has(trimmed)) {
        allOptions.push(trimmed);
        seenOptions.add(trimmed);
        console.log(`    ✅ Added from rangeText: "${trimmed}"`);
      }
    });
  }
  
  // 5. Add from rangeValues (JSON or pipe-separated)
  if (param.rangeValues?.trim()) {
    console.log(`  📊 Processing rangeValues: "${param.rangeValues}"`);
    try {
      let rangeValues: any[] = [];
      try {
        rangeValues = JSON.parse(param.rangeValues);
        console.log(`    ✅ rangeValues parsed as JSON:`, rangeValues);
      } catch {
        // Split by pipes ONLY
        rangeValues = param.rangeValues.split('|').map((o: string) => o.trim());
        console.log(`    ✅ rangeValues split by pipe:`, rangeValues);
      }
      
      rangeValues.forEach((val: any) => {
        const value = typeof val === 'object' ? val.value || val.name : val;
        const trimmed = value?.toString().trim();
        if (trimmed !== null && trimmed !== undefined && !seenOptions.has(trimmed)) {
          allOptions.push(trimmed);
          seenOptions.add(trimmed);
          console.log(`    ✅ Added from rangeValues: "${trimmed}"`);
        }
      });
    } catch (e) {
      console.warn(`⚠️ Error parsing rangeValues for parameter ${param.id}:`, e);
    }
  }
  
  // Return in order (first option from textContent will be first in array)
  const finalOptions = allOptions.filter(opt => opt !== null && opt !== undefined);
  console.log(`✅ FINAL OPTIONS for "${param.parameterName}": ${finalOptions.length} options:`, finalOptions);
  return finalOptions;
};

interface Parameter {
  id: number;
  parameterName: string;
  units: string;
  type: string;
  isDescriptive: boolean;
  isMultipleOptions: boolean;
  isMandatory: boolean;
  categoryName: string;
  categoryId: number;
  sortOrder: number;
  categorySortOrder?: number;
  showCategoryHeader: boolean;
  rangeType: string;
  displayRangeText: string;
  rangeText: string;
  normalRange: string;
  textContent?: string;
  rangeValues?: string;
  ageRanges?: any;
  maleLowValue?: number;
  maleHighValue?: number;
  maleDefaultValue?: string;
  maleActive?: boolean;
  femaleLowValue?: number;
  femaleHighValue?: number;
  femaleDefaultValue?: string;
  femaleActive?: boolean;
  childLowValue?: number;
  childHighValue?: number;
  childDefaultValue?: string;
  childActive?: boolean;
  hasFormula?: boolean;
  formula?: string;
  existingResult?: {
    numericValue?: number | null;
    textValue?: string;
    selectedOption?: string;
    isAbnormal?: boolean;
    isHighlighted?: boolean;
    referenceRange?: string;
  };
}

interface PatientData {
  id: number;
  visitId: string;
  status: string;
  patient: {
    age: number;
    ageYears?: number;
    ageMonths?: number;
    ageDays?: number;
    gender: string;
    dob?: string;
    title?: string;
    firstName?: string;
    lastName?: string;
  };
  test: {
    name: string;
  };
}

interface ReadingValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: PatientData | null;
  parameters: Parameter[];
  groupedParameters: any;
}

const ReadingValidationModal = ({
  isOpen,
  onClose,
  patientData,
  parameters,
  groupedParameters,
}: ReadingValidationModalProps) => {
  const [results, setResults] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const inputRefs = useRef<any>({});
  const [focusedInputId, setFocusedInputId] = useState<number | null>(null);
  const [flattenedParams, setFlattenedParams] = useState<Parameter[]>([]);
  const [comments, setComments] = useState<string>('');
  const [showComments, setShowComments] = useState(false);
  const [commentHistory, setCommentHistory] = useState<string[]>([]);
  const [showCommentDropdown, setShowCommentDropdown] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: number]: boolean }>({});
  const dropdownRefs = useRef<any>({});
  const dropdownTimeoutRef = useRef<any>({});

  // Fetch existing comments and comment history for the test
  useEffect(() => {
    if (isOpen && patientData?.id) {
      // Check if comments already exist in patientData
      // The patientTest object from API should include comments field
      try {
        // Try to get comments from patientData first (if available from API response)
        if ((patientData as any)?.comments) {
          setComments((patientData as any).comments);
          setShowComments(true);
        } else {
          // Fallback: fetch comments if not in patientData
          const fetchComments = async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/results/${patientData.id}`);
              const data = await response.json();
              if (data.success && data.data?.comments) {
                setComments(data.data.comments);
                setShowComments(true);
              }
            } catch (error) {
              console.warn('Error fetching comments:', error);
            }
          };
          fetchComments();
        }

        // Fetch comment history for dropdown suggestions
        const fetchCommentHistory = async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/results/history/comments`);
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
              setCommentHistory(data.data);
            }
          } catch (error) {
            console.warn('Error fetching comment history:', error);
          }
        };
        fetchCommentHistory();
      } catch (error) {
        console.warn('Error loading comments:', error);
      }
    }
  }, [isOpen, patientData?.id]);

  // Initialize results from existing data
  useEffect(() => {
    if (parameters && parameters.length > 0) {
      const initialResults: any = {};
      let savedValuesCount = 0;
      
      parameters.forEach(param => {
        const hasExistingResult = !!param.existingResult;
        
        if (hasExistingResult && param.existingResult) {
          console.log(`✅ FOUND SAVED VALUE - Param: ${param.parameterName} (ID: ${param.id})`, {
            type: param.type,
            existingResult: param.existingResult,
            numericValue: param.existingResult?.numericValue,
            textValue: param.existingResult?.textValue,
            selectedOption: param.existingResult?.selectedOption
          });
          savedValuesCount++;
        } else {
          console.log(`⭕ NO SAVED VALUE - Param: ${param.parameterName} (ID: ${param.id})`);
        }
        
        if (param.existingResult) {
          const numericVal = param.existingResult.numericValue;
          const textVal = param.existingResult.textValue;
          const optionVal = param.existingResult.selectedOption;
          
          initialResults[param.id] = {
            numericValue: (numericVal !== null && numericVal !== undefined) ? numericVal : null,
            textValue: (textVal && typeof textVal === 'string' && textVal.trim() !== '') ? textVal.replace(/\|/g, ', ') : '',
            selectedOption: (optionVal && typeof optionVal === 'string' && optionVal.trim() !== '') ? optionVal : '',
            isAbnormal: param.existingResult.isAbnormal || false,
            referenceRange: param.existingResult.referenceRange || param.normalRange,
            isHighlighted: (param.existingResult as any)?.isHighlighted || false
          };
          
          console.log(`  → Init for param ${param.id}:`, {
            numericValue: (initialResults[param.id] as any).numericValue,
            textValue: (initialResults[param.id] as any).textValue,
            selectedOption: (initialResults[param.id] as any).selectedOption,
            isHighlighted: (initialResults[param.id] as any).isHighlighted
          });
        } else {
          // ✅ NEW: For text fields with no saved value, show EMPTY textbox (no default value)
          let defaultTextValue = '';
          
          initialResults[param.id] = {
            numericValue: null,
            textValue: defaultTextValue,
            selectedOption: '',
            isAbnormal: false,
            referenceRange: param.normalRange,
            isHighlighted: false
          };
        }
      });
      console.log(`📊 SUMMARY: Found ${savedValuesCount} saved values out of ${parameters.length} parameters`);
      console.log('🔄 Final initialized results state:', JSON.stringify(initialResults, null, 2));
      console.log('📝 About to setResults with:', initialResults);
      setResults(initialResults);
      console.log('✅ setResults called - state should update');
    }
  }, [parameters]);

  // Monitor when results state actually changes
  useEffect(() => {
    console.log('🎯 RESULTS STATE UPDATED:', JSON.stringify(results, null, 2));
  }, [results]);

  // Build flattened parameters list for keyboard navigation
  useEffect(() => {
    if (groupedParameters) {
      const flattened: Parameter[] = [];
      Object.entries(groupedParameters).forEach(([_, categoryParams]: [string, any]) => {
        (categoryParams as Parameter[]).forEach(param => {
          flattened.push(param);
        });
      });
      setFlattenedParams(flattened);
    }
  }, [groupedParameters]);

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen && flattenedParams.length > 0) {
      setTimeout(() => {
        const firstParamId = flattenedParams[0].id;
        if (inputRefs.current[firstParamId]) {
          inputRefs.current[firstParamId].focus();
          setFocusedInputId(firstParamId);
          console.log('🎯 Auto-focused first input for parameter:', firstParamId);
        }
      }, 100);
    }
  }, [isOpen, flattenedParams]);

  // Calculate age in specific time unit
  const getAgeInUnit = (years: number, months: number, days: number, timeUnit: string) => {
    switch (timeUnit) {
      case 'Day(s)':
        return days;
      case 'Month(s)':
        return months;
      case 'Year(s)':
        return years;
      default:
        return years;
    }
  };

  // Get age-appropriate range based on patient age, gender, and DOB
  const getAgeAppropriateRange = (parameter: Parameter): string => {
    if (!parameter || parameter.type === 'Text' || parameter.isDescriptive) {
      // ✅ FIX: If textContent (RIGHT textarea) has a value, show ONLY that
      if (parameter?.textContent) {
        return parameter.textContent;
      }
      // Otherwise show empty
      return '';
    }

    if (!patientData) return parameter.normalRange || '';

    // ✅ Use Int age fields directly
    const exactAgeInYears = patientData.patient.ageYears ?? 0;
    const exactAgeInMonths = patientData.patient.ageMonths ?? 0;
    const exactAgeInDays = patientData.patient.ageDays ?? 0;
    const gender = patientData.patient.gender?.toLowerCase();

    // Check age ranges first
    if (parameter.ageRanges) {
      try {
        const ageRanges = JSON.parse(parameter.ageRanges);
        for (const range of ageRanges) {
          if (!range.enabled) continue;
          const rangeGender = range.gender?.toLowerCase();
          if (rangeGender && rangeGender !== gender) continue;

          let ageMatches = false;
          if (range.label?.includes('Less Than') && range.value != null)
            ageMatches =
              getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit) <
              range.value;
          else if (range.label?.includes('More Than') && range.value != null)
            ageMatches =
              getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit) >
              range.value;
          else if (range.label?.includes('Between') && range.from != null && range.to != null) {
            const v = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
            ageMatches = v >= range.from && v <= range.to;
          } else if (range.label?.includes('Equal To') && range.value != null)
            ageMatches =
              getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit) ===
              range.value;

          if (ageMatches && range.ll != null && range.ul != null) return `${range.ll} - ${range.ul}`;
        }
      } catch (e) {
        console.warn('Error parsing age ranges:', e);
      }
    }

    // Check gender/age-based ranges
    if (parameter.rangeType === 'BySex' || parameter.rangeType === 'ByGenderAndAge') {
      if (exactAgeInYears < 18 && parameter.childLowValue != null && parameter.childHighValue != null)
        return `${parameter.childLowValue} - ${parameter.childHighValue}`;

      if (exactAgeInYears >= 18) {
        if (
          gender === 'female' &&
          parameter.femaleActive &&
          parameter.femaleLowValue != null &&
          parameter.femaleHighValue != null
        )
          return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;

        if (
          gender === 'male' &&
          parameter.maleActive &&
          parameter.maleLowValue != null &&
          parameter.maleHighValue != null
        )
          return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
      }
    }

    if (parameter.maleLowValue != null && parameter.maleHighValue != null)
      return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;

    return parameter.displayRangeText || parameter.rangeText || parameter.normalRange || '';
  };

  // Parse range string and check if value is out of range
  const isValueOutOfRange = (param: Parameter, numericValue: any): boolean => {
    if (param.type !== 'Numeric' || numericValue === null || numericValue === undefined || numericValue === '')
      return false;

    const rangeStr = getAgeAppropriateRange(param);
    const match = rangeStr.toString().match(/^([\d.]+)\s*-\s*([\d.]+)$/);
    if (!match) return false;

    const low = parseFloat(match[1]);
    const high = parseFloat(match[2]);
    return parseFloat(numericValue) < low || parseFloat(numericValue) > high;
  };

  // Handle result change with real-time database update
  const handleResultChange = (parameterId: number, field: string, value: any) => {
    setResults((prev: any) => {
      const updated = {
        ...prev,
        [parameterId]: {
          ...prev[parameterId],
          [field]: value
        }
      };

      // If a numeric value is entered and parameter has formula, apply it
      if (field === 'numericValue' && value !== null && value !== undefined && value !== '') {
        const param = parameters.find(p => p.id === parameterId);
        if (param && param.hasFormula && param.formula) {
          console.log(`📐 Formula found for ${param.parameterName}: ${param.formula}`);
          // Store the formula for display - it will be shown in the formula column
          updated[parameterId].formulaApplied = param.formula;
        }
      }

      return updated;
    });

    // Save to database immediately
    saveResultToDatabase(parameterId, field, value);
  };

  // Save individual result to database in real-time
  const saveResultToDatabase = useCallback(async (parameterId: number, field: string, value: any) => {
    if (!patientData) return;

    try {
      const param = parameters.find(p => p.id === parameterId);
      if (!param) return;

      // Build the result object based on field type
      const resultData = {
        testParameterId: parameterId,
        testCategoryId: param.categoryId,
        numericValue: field === 'numericValue' ? (value || null) : (results[parameterId]?.numericValue || null),
        // ✅ Allow empty text values to be saved (convert empty string to actual empty string, not null)
        textValue: field === 'textValue' ? (value !== null && value !== undefined ? value : '') : (results[parameterId]?.textValue || ''),
        selectedOption: field === 'selectedOption' ? (value || null) : (results[parameterId]?.selectedOption || null),
        isAbnormal: results[parameterId]?.isAbnormal || false,
        referenceRange: results[parameterId]?.referenceRange || param.normalRange
      };

      console.log(`💾 Saving result for parameter ${param.parameterName}:`, resultData);

      const response = await fetch(`${API_BASE_URL}/results/${patientData.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: [resultData], enteredBy: 'current_user' })
      });

      const data = await response.json();
      if (!data.success) {
        console.warn(`Failed to save result: ${data.message}`);
      } else {
        console.log(`✅ Result saved for parameter ${parameterId}`);
      }
    } catch (err: any) {
      console.error(`Error saving result for parameter ${parameterId}:`, err);
    }
  }, [patientData, parameters, results]);

  // Handle comment change and save immediately
  const handleCommentChange = async (newComments: string) => {
    setComments(newComments);

    if (patientData?.id && newComments.trim()) {
      try {
        await fetch(`${API_BASE_URL}/results/${patientData.id}/comments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments: newComments })
        });
        console.log('✅ Comments auto-saved in Validation Modal:', newComments);
      } catch (error) {
        console.error('⚠️ Error auto-saving comments in Validation Modal:', error);
      }
    }
  };

  const handleCommentCheckbox = (checked: boolean) => {
    setShowComments(checked);

    if (!checked) {
      // Clear comments from database and local state
      setComments('');
      if (patientData?.id) {
        fetch(`${API_BASE_URL}/results/${patientData.id}/comments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments: '' })
        }).catch(error => {
          console.error('⚠️ Error clearing comments:', error);
        });
      }
    }
  };

  // Handle validate and transition to Validation phase
  const handleValidate = async () => {
    if (!patientData) return;

    try {
      setValidating(true);
      setError(null);

      // Update results first
      const resultsData = parameters
        .map((param) => {
          // For descriptive params, only use textValue (not __input__)
          const textVal = results[param.id]?.textValue || null;
          
          return {
            testParameterId: param.id,
            testCategoryId: param.categoryId,
            numericValue: results[param.id]?.numericValue || null,
            textValue: textVal,
            selectedOption: results[param.id]?.selectedOption || null,
            isAbnormal: results[param.id]?.isAbnormal || false,
            isHighlighted: results[param.id]?.isHighlighted || false,
            referenceRange: results[param.id]?.referenceRange || param.normalRange
          };
        })
        .filter((r) => {
          const hasNumeric = r.numericValue !== null && r.numericValue !== undefined && r.numericValue !== '';
          // ✅ Allow empty text values to be saved (empty string should not filter it out)
          const hasText = r.textValue !== null && r.textValue !== undefined; // Just check it exists, not if it's non-empty
          const hasOption =
            r.selectedOption && typeof r.selectedOption === 'string' && r.selectedOption.trim() !== '';
          return hasNumeric || hasText || hasOption;
        });

      console.log('📤 Saving results:', JSON.stringify(resultsData, null, 2));

      const response = await fetch(`${API_BASE_URL}/results/${patientData.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsData, enteredBy: 'current_user' })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save readings');
      }

      console.log('✅ Readings saved successfully');

      // Now transition to Validation phase
      const statusResponse = await fetch(`${API_BASE_URL}/results/${patientData.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Validation' })
      });

      const statusData = await statusResponse.json();
      if (!statusData.success) {
        throw new Error(statusData.message || 'Failed to update test status');
      }

      alert('✅ Test readings verified and transitioned to Validation phase successfully!');
      onClose();
    } catch (err: any) {
      console.error('Error validating readings:', err);
      setError(err.message || 'Error validating readings');
      alert('Error: ' + (err.message || 'Failed to validate readings'));
    } finally {
      setValidating(false);
    }
  };

  // Handle keyboard navigation and shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    // Ctrl+S or Enter to save and validate
    if ((e.ctrlKey && e.key === 's') || e.key === 'Enter') {
      e.preventDefault();
      handleValidate();
      return;
    }

    // Escape to close modal
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    // Tab, Shift+Tab, ArrowDown, ArrowUp for navigation
    if (['Tab', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      const currentIndex = flattenedParams.findIndex(p => p.id === focusedInputId);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      if (e.key === 'Tab' || e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % flattenedParams.length;
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        nextIndex = currentIndex - 1 < 0 ? flattenedParams.length - 1 : currentIndex - 1;
      }

      if (nextIndex !== currentIndex) {
        e.preventDefault();
        const nextParamId = flattenedParams[nextIndex].id;
        if (inputRefs.current[nextParamId]) {
          inputRefs.current[nextParamId].focus();
          setFocusedInputId(nextParamId);
          console.log('⌨️ Navigated to parameter:', nextParamId);
        }
      }
    }
  }, [isOpen, flattenedParams, focusedInputId, handleValidate, onClose]);

  // Add keyboard listener
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !patientData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-2 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-gray-900">Reading Validation</h2>
            <p className="text-xs text-gray-600">
              Test: <span className="font-semibold text-cyan-700">{patientData.test.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Patient Info */}
        <div className="bg-yellow-50 border-b p-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
            <div>
              <span className="font-semibold text-gray-700">Patient:</span>
              <span className="ml-2 text-gray-900">
                {patientData.patient.title || ''} {patientData.patient.firstName || ''}{' '}
                {patientData.patient.lastName || ''}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Age/Gender:</span>
              <span className="ml-2 text-gray-900">
                {(() => {
                  const formatted = `${patientData.patient.ageYears ?? 0}Y ${patientData.patient.ageMonths ?? 0}M ${patientData.patient.ageDays ?? 0}D`.replace(/0[YMD]\s*/g, '').trim();
                  return formatted || '-';
                })()} Yrs / {patientData.patient.gender}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Visit ID:</span>
              <span className="ml-2 text-gray-900">{patientData.visitId}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Status:</span>
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                {patientData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 m-4 flex gap-2">
            <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Readings Table */}
        <div className="p-2">
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gradient-to-r from-purple-700 to-purple-600 text-white">
                <tr>
                  <th className="border p-1.5 text-left">Parameter Name</th>
                  <th className="border p-1.5 text-center w-96">Value</th>
                  <th className="border p-1.5 text-center w-12">Units</th>
                  <th className="border p-1.5 text-center w-32">Biological Range</th>
                  <th className="border p-1.5 text-center w-12">Highlight</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // ✅ Sort categories by categorySortOrder (from first param in category)
                  const sortedCategories = Object.entries(groupedParameters || {})
                    .map(([categoryName, categoryParams]: [string, any]) => ({
                      categoryName,
                      categoryParams,
                      sortOrder: (categoryParams as Parameter[])[0]?.categorySortOrder ?? (categoryParams as Parameter[])[0]?.sortOrder ?? 999
                    }))
                    .sort((a, b) => a.sortOrder - b.sortOrder);

                  return sortedCategories.map(({ categoryName, categoryParams }) => (
                    <Fragment key={categoryName}>
                      {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                        <tr className="bg-gray-200 font-semibold">
                          <td colSpan={5} className="p-1">
                            {categoryName.toUpperCase()}
                          </td>
                        </tr>
                      )}
                      {(() => {
                        // ✅ Sort parameters within category by sortOrder
                        const sortedParams = [...(categoryParams as Parameter[])].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
                        return sortedParams.map((param) => {
                          const outOfRange = isValueOutOfRange(param, results[param.id]?.numericValue);
                          const rangeStr = getAgeAppropriateRange(param);
                          // ✅ Truncate long biological range text - keep only first 30 chars + default note
                          const truncatedRange = rangeStr && rangeStr.length > 35 
                            ? rangeStr.substring(0, 35) + '...' 
                            : rangeStr;
                          const inputClass = outOfRange
                            ? 'border-2 border-red-500 bg-red-50 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-xs'
                            : 'border border-gray-300 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs';

                          return (
                            <tr key={param.id} className={(outOfRange || results[param.id]?.isHighlighted) ? 'bg-red-50' : 'bg-white hover:bg-gray-50'} style={{height: '28px'}}>
                              <td className="border p-1.5">
                                <span className="font-medium text-gray-900 text-xs">
                                  {(() => {
                                    const paramNameParts = parseHtmlText(param.parameterName);
                                    if (typeof paramNameParts === 'string') {
                                      return paramNameParts;
                                    }
                                return (paramNameParts as HtmlPart[]).map((part: HtmlPart, i: number) => (
                                  <span key={i} style={{ fontWeight: part.bold ? 'bold' : 'normal', fontStyle: part.italic ? 'italic' : 'normal' }}>
                                    {part.text}
                                  </span>
                                ));
                              })()}
                            </span>
                            {param.isMandatory && <span className="text-red-500 ml-1">*</span>}
                          </td>
                          <td className="border p-1.5 text-center" colSpan={(param.type === 'Text' || param.isMultipleOptions) && param.rangeText?.trim() ? 3 : 1}>
                            {param.type === 'Numeric' ? (
                              <div className="relative">
                                <input
                                  ref={(el) => { if (el) inputRefs.current[param.id] = el; }}
                                  type="text"
                                  value={results[param.id]?.numericValue ?? ''}
                                  onChange={(e) =>
                                    handleResultChange(
                                      param.id,
                                      'numericValue',
                                      e.target.value === '' ? null : e.target.value
                                    )
                                  }
                                  onFocus={() => setFocusedInputId(param.id)}
                                  className="w-full text-center bg-transparent text-xs border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                                  placeholder="0"
                                />
                              </div>
                            ) : param.isDescriptive ? (
                              // DESCRIPTIVE/TEXT - Textarea with dropdown suggestions
                              <div className="w-full relative">
                                <textarea
                                  ref={(el) => { if (el) inputRefs.current[param.id] = el; }}
                                  value={(results[param.id]?.textValue || '').replace(/\|/g, ', ')}
                                  onChange={(e) => {
                                    handleResultChange(param.id, 'textValue', e.target.value.replace(/,\s*/g, '|'));
                                  }}
                                  onFocus={() => setOpenDropdowns({ ...openDropdowns, [param.id]: true })}
                                  placeholder=""
                                  className="w-full border border-gray-300 px-2 py-1 rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-gray-700"
                                  style={{ minHeight: '2.5rem', resize: 'both', overflow: 'auto' }}
                                />
                                {/* Dropdown suggestions */}
                                {openDropdowns[param.id] && getAllOptionsFromParameter(param).length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto z-50" onMouseDown={(e) => e.preventDefault()}>
                                    {getAllOptionsFromParameter(param).map((option: string) => (
                                      <div
                                        key={option}
                                        onMouseDown={() => {
                                          handleResultChange(param.id, 'textValue', (results[param.id]?.textValue || '') ? `${results[param.id].textValue}|${option}` : option);
                                          setOpenDropdowns({ ...openDropdowns, [param.id]: false });
                                          inputRefs.current[param.id]?.focus();
                                        }}
                                        className="px-2 py-1.5 text-xs bg-white hover:bg-blue-50 text-gray-700 cursor-pointer border-b last:border-b-0 transition-colors"
                                      >
                                        {option}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : param.type === 'Text' || param.isMultipleOptions ? (
                              // TEXT/DROPDOWN - Textarea with dropdown suggestions
                              <div className="w-full relative">
                                <textarea
                                  ref={(el) => { if (el) inputRefs.current[param.id] = el; }}
                                  value={(results[param.id]?.textValue || '').replace(/\|/g, ', ')}
                                  onChange={(e) => {
                                    handleResultChange(param.id, 'textValue', e.target.value.replace(/,\s*/g, '|'));
                                  }}
                                  onFocus={() => setOpenDropdowns({ ...openDropdowns, [param.id]: true })}
                                  onBlur={() => setTimeout(() => setOpenDropdowns({ ...openDropdowns, [param.id]: false }), 100)}
                                  placeholder=""
                                  className="w-full border border-gray-300 px-2 py-1 rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-gray-700"
                                  style={{ minHeight: '2.5rem', resize: 'both', overflow: 'auto' }}
                                />
                                {/* Dropdown suggestions */}
                                {openDropdowns[param.id] && getAllOptionsFromParameter(param).length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto z-50" onMouseDown={(e) => e.preventDefault()}>
                                    {getAllOptionsFromParameter(param).map((option: string) => (
                                      <div
                                        key={option}
                                        onMouseDown={() => {
                                          handleResultChange(param.id, 'textValue', (results[param.id]?.textValue || '') ? `${results[param.id].textValue}|${option}` : option);
                                          setOpenDropdowns({ ...openDropdowns, [param.id]: false });
                                          inputRefs.current[param.id]?.focus();
                                        }}
                                        className="px-2 py-1.5 text-xs bg-white hover:bg-blue-50 text-gray-700 cursor-pointer border-b last:border-b-0 transition-colors"
                                      >
                                        {option}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  ref={(el) => { if (el) inputRefs.current[param.id] = el; }}
                                  type="text"
                                  value={results[param.id]?.selectedOption || ''}
                                  onChange={(e) =>
                                    handleResultChange(param.id, 'selectedOption', e.target.value)
                                  }
                                  onFocus={() => setFocusedInputId(param.id)}
                                  className="w-full text-center bg-transparent text-xs border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                                  placeholder="Enter"
                                />
                              </div>
                            )}
                          </td>
                          {/* Show Units and Biological Range for Numeric OR Text without rangeText */}
                          {(param.type === 'Numeric' || ((param.type === 'Text' || param.isMultipleOptions) && !param.rangeText?.trim())) && (
                            <>
                              <td className="border p-1.5 text-center text-gray-600 text-xs">
                                {param.units || '-'}
                              </td>
                              <td className="border p-1.5 text-left text-gray-600 text-xs whitespace-pre-wrap break-words" title={param.type === 'Text' || param.isMultipleOptions ? param.textContent : rangeStr}>
                                {param.type === 'Text' || param.isMultipleOptions ? (param.textContent || '-') : truncatedRange}
                              </td>
                            </>
                          )}
                          <td className="border p-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={results[param.id]?.isHighlighted || false}
                              onChange={(e) => {
                                const newResults = { ...results };
                                if (!newResults[param.id]) newResults[param.id] = {};
                                newResults[param.id].isHighlighted = e.target.checked;
                                setResults(newResults);
                              }}
                              className="w-4 h-4 cursor-pointer"
                              title="Highlight this value"
                            />
                          </td>
                        </tr>
                      );
                        });
                      })()}
                    </Fragment>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comments Section */}
        <div className="border-t p-3 bg-blue-50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="show-comments-validation"
              checked={showComments}
              onChange={(e) => handleCommentCheckbox(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
              title="Check to add comments"
            />
            <label htmlFor="show-comments-validation" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Add Comments
            </label>

            {showComments && (
              <div className="flex-1 relative">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={comments}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  onFocus={() => setCommentFocused(true)}
                  onBlur={() => setTimeout(() => setCommentFocused(false), 200)}
                  placeholder="Type comment or select from dropdown..."
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Dropdown with comment history suggestions */}
                {commentHistory.length > 0 && commentFocused && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto z-50">
                    {commentHistory.map((hist, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs bg-white hover:bg-blue-50 text-gray-800 border-b last:border-b-0 transition-colors group"
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            const newComments = comments.trim() ? `${comments}, ${hist}` : hist;
                            handleCommentChange(newComments);
                            commentInputRef.current?.focus();
                          }}
                          className="flex-1 text-left hover:text-blue-600 transition-colors"
                        >
                          {hist}
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await deleteCommentFromHistory(hist);
                              setCommentHistory(prev => prev.filter(c => c !== hist));
                            } catch (error) {
                              console.error('Error deleting comment:', error);
                              alert('Failed to delete comment');
                            }
                          }}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Delete this comment"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 p-2 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={validating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center gap-2"
          >
            {validating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Validating...
              </>
            ) : (
              '✓ Validate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingValidationModal;
