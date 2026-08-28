import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import API_BASE_URL from '@/src/api/config';
import { deleteCommentFromHistory } from '@/src/api/result';

// Helper function to extract ALL available options from a parameter (from ALL database fields)
const getAllOptionsFromParameter = (param: Parameter): string[] => {
  const allOptions = new Set<string>();
  
  // 1. Add all options from textContent (primary source - textarea with newline or pipe-separated values)
  if (param.textContent) {
    try {
      let options: any[] = [];
      try {
        options = JSON.parse(param.textContent);
      } catch {
        // Split by newlines first
        const byNewline = param.textContent.split('\n').map((o: string) => o.trim()).filter(Boolean);
        if (byNewline.length > 1) {
          options = byNewline;
        } else {
          // Split by pipes ONLY (not commas - commas are part of the continuous value)
          options = param.textContent.split('|').map((o: string) => o.trim()).filter(Boolean);
        }
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
  
  // 3. Add from displayRangeText (split by pipe only)
  if (param.displayRangeText?.trim()) {
    param.displayRangeText.split('|').forEach(opt => {
      const trimmed = opt.trim();
      if (trimmed) allOptions.add(trimmed);
    });
  }
  
  // 4. Add from rangeText (split by pipe only)
  if (param.rangeText?.trim()) {
    param.rangeText.split('|').forEach(opt => {
      const trimmed = opt.trim();
      if (trimmed) allOptions.add(trimmed);
    });
  }
  
  // 5. Add from rangeValues (JSON or pipe-separated)
  if (param.rangeValues?.trim()) {
    try {
      let rangeValues: any[] = [];
      try {
        rangeValues = JSON.parse(param.rangeValues);
      } catch {
        // Split by pipes ONLY
        rangeValues = param.rangeValues.split('|').map((o: string) => o.trim());
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

interface AuthenticateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: PatientData | null;
  parameters: Parameter[];
  groupedParameters: any;
}

const AuthenticateModal = ({
  isOpen,
  onClose,
  patientData,
  parameters,
  groupedParameters,
}: AuthenticateModalProps) => {
  const [results, setResults] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [comments, setComments] = useState<string>('');
  const [showComments, setShowComments] = useState(false);
  const [commentHistory, setCommentHistory] = useState<string[]>([]);
  const [showCommentDropdown, setShowCommentDropdown] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize results from existing data (read-only for authentication)
  useEffect(() => {
    if (parameters && parameters.length > 0) {
      const initialResults = {};
      let savedValuesCount = 0;
      
      parameters.forEach(param => {
        if (param.existingResult) {
          console.log(`✅ AUTH MODAL - FOUND SAVED VALUE - Param: ${param.parameterName} (ID: ${param.id})`, {
            type: param.type,
            existingResult: param.existingResult,
            numericValue: param.existingResult.numericValue,
            textValue: param.existingResult.textValue,
            selectedOption: param.existingResult.selectedOption
          });
          savedValuesCount++;
          
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
        } else {
          console.log(`⭕ AUTH MODAL - NO SAVED VALUE - Param: ${param.parameterName} (ID: ${param.id})`);
          
          // ✅ NEW: For text fields with no saved value, show first available option as default
          let defaultTextValue = '';
          if ((param.type === 'Text' || param.isMultipleOptions) && !param.isDescriptive) {
            const availableOptions = getAllOptionsFromParameter(param);
            if (availableOptions.length > 0) {
              defaultTextValue = availableOptions[0]; // Show first option as default
              console.log(`📌 AUTH MODAL DEFAULT: Param ${param.id} (${param.parameterName}) set to first option: "${defaultTextValue}"`);
            }
          }
          
          initialResults[param.id] = {
            numericValue: null,
            textValue: defaultTextValue,
            selectedOption: '',
            isAbnormal: false,
            isHighlighted: false,
            referenceRange: param.normalRange
          };
        }
      });
      console.log(`📊 AUTH MODAL SUMMARY: Found ${savedValuesCount} saved values out of ${parameters.length} parameters`);
      setResults(initialResults);
    }
  }, [parameters]);

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
        console.log('✅ Comments auto-saved:', newComments);
      } catch (error) {
        console.error('⚠️ Error auto-saving comments:', error);
      }
    }
  };

  // Handle comment checkbox change
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

  // Handle authenticate and transition to Authenticated phase
  const handleAuthenticate = async () => {
    if (!patientData) return;

    try {
      setAuthenticating(true);
      setError(null);

      // First, save any updated isHighlighted values
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

      // Save updated results
      const saveResponse = await fetch(`${API_BASE_URL}/results/${patientData.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsData, verifiedBy: 'current_user' })
      });

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error(saveData.message || 'Failed to save readings');
      }

      // Transition to Authenticated phase
      const statusResponse = await fetch(`${API_BASE_URL}/results/${patientData.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Authenticated' })
      });

      const statusData = await statusResponse.json();
      if (!statusData.success) {
        throw new Error(statusData.message || 'Failed to authenticate test');
      }

      alert('✅ Test has been successfully authenticated and transitioned to Authenticated phase!');
      onClose();
    } catch (err: any) {
      console.error('Error authenticating readings:', err);
      setError(err.message || 'Error authenticating readings');
      alert('Error: ' + (err.message || 'Failed to authenticate readings'));
    } finally {
      setAuthenticating(false);
    }
  };

  if (!isOpen || !patientData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        {/* Modal Header */}
        <div className="flex items-center justify-between p-2 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-gray-900">Authenticate Readings</h2>
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
        <div className="bg-blue-50 border-b p-2">
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
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
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
                        <td colSpan={5} className="p-2">
                          {categoryName.toUpperCase()}
                        </td>
                      </tr>
                    )}
                    {(categoryParams as Parameter[]).map((param) => {
                      const outOfRange = isValueOutOfRange(param, results[param.id]?.numericValue);
                      const rangeStr = getAgeAppropriateRange(param);
                      const inputClass = outOfRange
                        ? 'border-2 border-red-500 bg-red-50 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-xs'
                        : 'border border-gray-300 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs';

                      return (
                        <tr key={param.id} className={(outOfRange || results[param.id]?.isHighlighted) ? 'bg-red-50' : 'bg-white hover:bg-gray-50'} style={{height: '28px'}}>
                          <td className="border p-1.5">
                            <span className="font-medium text-gray-900 text-xs">{param.parameterName}</span>
                            {param.isMandatory && <span className="text-red-500 ml-1">*</span>}
                          </td>
                          <td className="border p-1.5 text-center">
                            {param.type === 'Numeric' ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={results[param.id]?.numericValue ?? ''}
                                  onChange={(e) => {
                                    const newResults = { ...results };
                                    if (!newResults[param.id]) newResults[param.id] = {};
                                    newResults[param.id].numericValue = e.target.value === '' ? null : e.target.value;
                                    setResults(newResults);
                                  }}
                                  className="w-full text-center bg-transparent text-xs border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                                  placeholder="0"
                                />
                              </div>
                            ) : param.isDescriptive ? (
                              <div className="w-full">
                                {/* Display saved readings as plain black text with minimal size - read-only */}
                                <div className="flex flex-wrap gap-1.5 text-xs">
                                  {(results[param.id]?.textValue || '').split('|').map((tag: string, idx: number) => {
                                    const trimmedTag = tag.trim();
                                    return trimmedTag ? (
                                      <span
                                        key={idx}
                                        className="inline-block text-gray-900 font-medium px-1.5 py-0.5"
                                      >
                                        {trimmedTag}{idx < (results[param.id]?.textValue || '').split(',').filter((t: string) => t.trim()).length - 1 ? ',' : ''}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                                {!results[param.id]?.textValue || results[param.id]?.textValue.trim() === '' ? (
                                  <span className="text-gray-400 text-xs">No readings saved</span>
                                ) : null}
                              </div>
                            ) : param.type === 'Text' || param.isMultipleOptions ? (
                              // TEXT/DROPDOWN - EDITABLE with all options from database
                              <div className="w-full space-y-1">
                                {/* ✅ Only pipe (|) separator splits into separate items. Commas (,) show as continuous text */}
                                {(() => {
                                  const textValue = results[param.id]?.textValue || '';
                                  const hasPipe = textValue.includes('|');
                                  
                                  if (hasPipe) {
                                    // PIPE separator: Split and show as separate items
                                    const items = textValue.split('|').map((o: string) => o.trim()).filter(Boolean);
                                    return (
                                      <>
                                        <div className="flex flex-col gap-1 text-xs">
                                          {items.map((option: string, idx: number) => (
                                            <div
                                              key={idx}
                                              className="inline-flex items-center text-xs font-medium text-gray-900 bg-blue-50 px-2 py-1 rounded"
                                            >
                                              <span className="text-xs flex-1">{option}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newItems = items.filter((_: string, i: number) => i !== idx);
                                                  const newResults = { ...results };
                                                  newResults[param.id] = { ...newResults[param.id], textValue: newItems.join('|') };
                                                  setResults(newResults);
                                                }}
                                                className="text-gray-500 hover:text-gray-700 font-bold cursor-pointer ml-1"
                                                title="Remove this selection"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                        {/* Dropdown to add more items */}
                                        <select
                                          value=""
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              const existing = results[param.id]?.textValue || '';
                                              const options = existing ? existing.split('|').map((o: string) => o.trim()).filter(Boolean) : [];
                                              if (!options.includes(e.target.value)) {
                                                options.push(e.target.value);
                                                const newResults = { ...results };
                                                newResults[param.id] = { ...newResults[param.id], textValue: options.join('|') };
                                                setResults(newResults);
                                              }
                                              e.target.value = '';
                                            }
                                          }}
                                          className="w-full border border-gray-300 px-1.5 py-0.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-700 cursor-pointer"
                                        >
                                          <option value="">➕ Add...</option>
                                          {getAllOptionsFromParameter(param).map((optionValue: string) => (
                                            <option key={optionValue} value={optionValue}>
                                              {optionValue}
                                            </option>
                                          ))}
                                        </select>
                                      </>
                                    );
                                  } else {
                                    // NO PIPE: Show as single continuous text value (including comma-separated values)
                                    return (
                                      <>
                                        {textValue && (
                                          <div className="text-xs font-medium text-gray-900 px-2 py-1 border border-gray-200 rounded bg-gray-50">
                                            {textValue}
                                          </div>
                                        )}
                                        {/* Dropdown - use pipe separator for new additions */}
                                        <select
                                          value=""
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              const existing = results[param.id]?.textValue || '';
                                              // For new additions to non-pipe values, append with pipe to indicate new format
                                              const newResults = { ...results };
                                              newResults[param.id] = { ...newResults[param.id], textValue: existing ? `${existing}|${e.target.value}` : e.target.value };
                                              setResults(newResults);
                                              e.target.value = '';
                                            }
                                          }}
                                          className="w-full border border-gray-300 px-1.5 py-0.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-700 cursor-pointer"
                                        >
                                          <option value="">➕ Add...</option>
                                          {getAllOptionsFromParameter(param).map((optionValue: string) => (
                                            <option key={optionValue} value={optionValue}>
                                              {optionValue}
                                            </option>
                                          ))}
                                        </select>
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={results[param.id]?.selectedOption || ''}
                                  onChange={(e) => {
                                    const newResults = { ...results };
                                    if (!newResults[param.id]) newResults[param.id] = {};
                                    newResults[param.id].selectedOption = e.target.value;
                                    setResults(newResults);
                                  }}
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
                            {rangeStr && rangeStr.length > 35 ? rangeStr.substring(0, 35) + '...' : rangeStr}
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

        {/* Comments Section */}
        <div className="border-t p-3 bg-blue-50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="show-comments-authenticate"
              checked={showComments}
              onChange={(e) => handleCommentCheckbox(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
              title="Check to add comments"
            />
            <label htmlFor="show-comments-authenticate" className="text-sm font-semibold text-gray-700 cursor-pointer">
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
            disabled={authenticating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAuthenticate}
            disabled={authenticating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            {authenticating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Authenticating...
              </>
            ) : (
              '✓ Authenticate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthenticateModal;
