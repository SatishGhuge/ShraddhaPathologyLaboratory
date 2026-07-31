import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import API_BASE_URL from '@/src/api/config';
import { parseHtmlText, HtmlPart } from '@/src/utils/htmlParser';

// Helper function to extract ALL available options from a parameter (from ALL database fields)
const getAllOptionsFromParameter = (param: Parameter): string[] => {
  const allOptions = new Set<string>();
  
  // 1. Add all options from textContent (primary source)
  if (param.textContent) {
    try {
      let options: any[] = [];
      try {
        options = JSON.parse(param.textContent);
      } catch {
        options = param.textContent.split(',').map((o: string) => o.trim());
      }
      
      options.forEach((option: any) => {
        const optionValue = typeof option === 'object' ? option.value || option.name : option;
        if (optionValue && optionValue.toString().trim()) {
          allOptions.add(optionValue.toString().trim());
        }
      });
    } catch (e) {
      console.warn(`Error parsing textContent for parameter ${param.id}:`, e);
    }
  }
  
  // 2. Add gender-specific default values
  if (param.maleDefaultValue?.trim()) allOptions.add(param.maleDefaultValue.trim());
  if (param.femaleDefaultValue?.trim()) allOptions.add(param.femaleDefaultValue.trim());
  if (param.childDefaultValue?.trim()) allOptions.add(param.childDefaultValue.trim());
  
  // 3. Add from displayRangeText
  if (param.displayRangeText?.trim()) {
    param.displayRangeText.split(',').forEach(opt => {
      const trimmed = opt.trim();
      if (trimmed) allOptions.add(trimmed);
    });
  }
  
  // 4. Add from rangeText
  if (param.rangeText?.trim()) {
    param.rangeText.split(',').forEach(opt => {
      const trimmed = opt.trim();
      if (trimmed) allOptions.add(trimmed);
    });
  }
  
  // 5. Add from rangeValues (JSON or comma-separated)
  if (param.rangeValues?.trim()) {
    try {
      let rangeValues: any[] = [];
      try {
        rangeValues = JSON.parse(param.rangeValues);
      } catch {
        rangeValues = param.rangeValues.split(',').map((o: string) => o.trim());
      }
      
      rangeValues.forEach((val: any) => {
        const value = typeof val === 'object' ? val.value || val.name : val;
        if (value && value.toString().trim()) {
          allOptions.add(value.toString().trim());
        }
      });
    } catch (e) {
      console.warn(`Error parsing rangeValues for parameter ${param.id}:`, e);
    }
  }
  
  // 6. Return sorted array (remove empty strings)
  return Array.from(allOptions)
    .filter(opt => opt && opt.trim().length > 0)
    .sort();
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
    referenceRange?: string;
  };
}

interface PatientData {
  id: number;
  visitId: string;
  status: string;
  patient: {
    age: number;
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

  // Initialize results from existing data
  useEffect(() => {
    if (parameters && parameters.length > 0) {
      const initialResults = {};
      let savedValuesCount = 0;
      
      parameters.forEach(param => {
        const hasExistingResult = !!param.existingResult;
        
        if (hasExistingResult) {
          console.log(`✅ FOUND SAVED VALUE - Param: ${param.parameterName} (ID: ${param.id})`, {
            type: param.type,
            existingResult: param.existingResult,
            numericValue: param.existingResult.numericValue,
            textValue: param.existingResult.textValue,
            selectedOption: param.existingResult.selectedOption
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
            textValue: (textVal && typeof textVal === 'string' && textVal.trim() !== '') ? textVal : '',
            selectedOption: (optionVal && typeof optionVal === 'string' && optionVal.trim() !== '') ? optionVal : '',
            isAbnormal: param.existingResult.isAbnormal || false,
            isHighlighted: param.existingResult.isHighlighted || false,
            referenceRange: param.existingResult.referenceRange || param.normalRange
          };
          
          console.log(`  → Init for param ${param.id}:`, {
            numericValue: initialResults[param.id].numericValue,
            textValue: initialResults[param.id].textValue,
            selectedOption: initialResults[param.id].selectedOption,
            isHighlighted: initialResults[param.id].isHighlighted
          });
        } else {
          initialResults[param.id] = {
            numericValue: null,
            textValue: '',
            selectedOption: '',
            isAbnormal: false,
            isHighlighted: false,
            referenceRange: param.normalRange
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
      return parameter.displayRangeText || parameter.rangeText || parameter.normalRange || '';
    }

    if (!patientData) return parameter.normalRange || '';

    const age = patientData.patient.age;
    const gender = patientData.patient.gender?.toLowerCase();
    let exactAgeInDays = 0,
      exactAgeInMonths = 0,
      exactAgeInYears = age || 0;

    if (patientData.patient.dob) {
      const birthDate = new Date(patientData.patient.dob);
      const currentDate = new Date();
      const ageInMs = currentDate.getTime() - birthDate.getTime();
      exactAgeInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
      exactAgeInMonths = Math.floor(exactAgeInDays / 30.44);
      exactAgeInYears = Math.floor(exactAgeInDays / 365.25);
    }

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
        textValue: field === 'textValue' ? (value || null) : (results[parameterId]?.textValue || null),
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
          const hasText = r.textValue && typeof r.textValue === 'string' && r.textValue.trim() !== '';
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
                {patientData.patient.age} Yrs / {patientData.patient.gender}
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
                  <th className="border p-1.5 text-center w-60">Value</th>
                  <th className="border p-1.5 text-center w-12">Units</th>
                  <th className="border p-1.5 text-center w-32">Biological Range</th>
                  <th className="border p-1.5 text-center w-12">Highlight</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedParameters || {}).map(([categoryName, categoryParams]: [string, any]) => (
                  <Fragment key={categoryName}>
                    {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                      <tr className="bg-gray-200 font-semibold">
                        <td colSpan={5} className="p-1">
                          {categoryName.toUpperCase()}
                        </td>
                      </tr>
                    )}
                    {(categoryParams as Parameter[]).map((param) => {
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
                          <td className="border p-1.5 text-center">
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
                              <div className="w-full space-y-1">
                                {/* Saved readings/tags from database - editable */}
                                <div className="flex flex-wrap gap-2">
                                  {(results[param.id]?.textValue || '').split(',').map((tag: string, idx: number) => {
                                    const trimmedTag = tag.trim();
                                    return trimmedTag ? (
                                      <div
                                        key={idx}
                                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium border border-blue-300"
                                      >
                                        <span>{trimmedTag}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const tags = (results[param.id]?.textValue || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                                            const newTags = tags.filter((_: string, i: number) => i !== idx);
                                            handleResultChange(param.id, 'textValue', newTags.join(', '));
                                          }}
                                          className="hover:text-blue-900 font-bold cursor-pointer hover:bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center"
                                          title="Remove this reading"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ) : null;
                                  })}
                                </div>

                                {/* Input for adding new readings - only show if needed */}
                                {results[param.id]?.textValue && results[param.id]?.textValue.trim() !== '' ? (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {(results[param.id].textValue.split(',').filter((t: string) => t.trim())).length} reading(s) saved
                                  </div>
                                ) : (
                                  <div className="text-xs text-red-500 mt-1">
                                    ⚠ No readings saved yet
                                  </div>
                                )}
                              </div>
                            ) : param.type === 'Text' || param.isMultipleOptions ? (
                              // TEXT/DROPDOWN with predefined options - SIMPLIFIED
                              <div className="w-full space-y-1">
                                {/* Show previously selected values from database */}
                                <div className="flex flex-wrap items-center gap-0 text-xs">
                                  {(results[param.id]?.textValue || '').split(',').map((option: string, idx: number) => {
                                    const trimmedOption = option.trim();
                                    return trimmedOption ? (
                                      <div
                                        key={idx}
                                        className="inline-flex items-center text-xs font-medium text-gray-900"
                                      >
                                        <span className="text-xs">{trimmedOption}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const options = (results[param.id]?.textValue || '').split(',').map((o: string) => o.trim()).filter(Boolean);
                                            const newOptions = options.filter((_: string, i: number) => i !== idx);
                                            handleResultChange(param.id, 'textValue', newOptions.join(', '));
                                          }}
                                          className="text-gray-500 hover:text-gray-700 font-bold cursor-pointer ml-0.5"
                                          title="Remove this selection"
                                        >
                                          ×
                                        </button>
                                        {idx < (results[param.id]?.textValue || '').split(',').filter((o: string) => o.trim()).length - 1 && (
                                          <span className="mx-1 text-gray-400">,</span>
                                        )}
                                      </div>
                                    ) : null;
                                  })}
                                </div>

                                {/* Dropdown with all options - simplified */}
                                <select
                                  ref={(el) => { if (el) inputRefs.current[param.id] = el; }}
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const existing = results[param.id]?.textValue || '';
                                      const options = existing ? existing.split(',').map((o: string) => o.trim()).filter(Boolean) : [];
                                      
                                      // Avoid duplicates
                                      if (!options.includes(e.target.value)) {
                                        options.push(e.target.value);
                                        handleResultChange(param.id, 'textValue', options.join(', '));
                                      }
                                      // Reset dropdown
                                      e.target.value = '';
                                    }
                                  }}
                                  onFocus={() => setFocusedInputId(param.id)}
                                  className="w-full border border-gray-300 px-1.5 py-0.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-700 cursor-pointer"
                                >
                                  <option value="">➕ Add...</option>
                                  {getAllOptionsFromParameter(param).map((optionValue: string) => (
                                    <option key={optionValue} value={optionValue}>
                                      {optionValue}
                                    </option>
                                  ))}
                                </select>
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
                          <td className="border p-1.5 text-center text-gray-600 text-xs">
                            {param.units || '-'}
                          </td>
                          <td className="border p-1.5 text-center text-gray-600 text-xs max-w-xs truncate" title={rangeStr}>
                            {truncatedRange}
                          </td>
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
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
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
