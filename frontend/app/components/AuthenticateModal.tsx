import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import API_BASE_URL from '@/src/api/config';

interface Parameter {
  id: number;
  parameterName: string;
  units: string;
  type: string;
  isDescriptive: boolean;
  isMandatory: boolean;
  categoryName: string;
  categoryId: number;
  sortOrder: number;
  showCategoryHeader: boolean;
  rangeType: string;
  displayRangeText: string;
  rangeText: string;
  normalRange: string;
  ageRanges?: any;
  maleLowValue?: number;
  maleHighValue?: number;
  maleActive?: boolean;
  femaleLowValue?: number;
  femaleHighValue?: number;
  femaleActive?: boolean;
  childLowValue?: number;
  childHighValue?: number;
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

  // Initialize results from existing data (read-only for authentication)
  useEffect(() => {
    if (parameters && parameters.length > 0) {
      const initialResults = {};
      parameters.forEach(param => {
        if (param.existingResult) {
          initialResults[param.id] = {
            numericValue: param.existingResult.numericValue,
            textValue: param.existingResult.textValue,
            selectedOption: param.existingResult.selectedOption,
            isAbnormal: param.existingResult.isAbnormal,
            referenceRange: param.existingResult.referenceRange
          };
        } else {
          initialResults[param.id] = {
            numericValue: null,
            textValue: '',
            selectedOption: '',
            isAbnormal: false,
            referenceRange: param.normalRange
          };
        }
      });
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

  // Handle authenticate and transition to Authenticated phase
  const handleAuthenticate = async () => {
    if (!patientData) return;

    try {
      setAuthenticating(true);
      setError(null);

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
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Authenticate Readings</h2>
            <p className="text-sm text-gray-600 mt-1">
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
        <div className="bg-blue-50 border-b p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
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

        {/* Readings Table (Read-only) */}
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-700">
            📋 <span className="font-semibold">Review Mode:</span> You are reviewing verified readings before final authentication.
          </div>
          
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gradient-to-r from-blue-300 to-blue-200 text-blue-900">
                <tr>
                  <th className="border p-2 text-left font-semibold">Parameter Name</th>
                  <th className="border p-2 text-center w-24 font-semibold">Value</th>
                  <th className="border p-2 text-center w-16 font-semibold">Units</th>
                  <th className="border p-2 text-center w-28 font-semibold">Biological Range</th>
                  <th className="border p-2 text-center w-16 font-semibold">Abnormal</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedParameters || {}).map(([categoryName, categoryParams]: [string, any]) => (
                  <React.Fragment key={categoryName}>
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
                        ? 'border-2 border-red-500 bg-red-50 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500'
                        : 'border border-gray-300 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';

                      return (
                        <tr key={param.id} className={outOfRange ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}>
                          <td className="border p-2">
                            <span className="font-medium text-gray-900">{param.parameterName}</span>
                            {param.isMandatory && <span className="text-red-500 ml-1">*</span>}
                          </td>
                          <td className="border p-2 text-center">
                            {param.type === 'Numeric' ? (
                              <input
                                type="number"
                                step="0.01"
                                value={results[param.id]?.numericValue ?? ''}
                                onChange={(e) => {
                                  const newResults = { ...results };
                                  if (!newResults[param.id]) newResults[param.id] = {};
                                  newResults[param.id].numericValue = e.target.value === '' ? null : parseFloat(e.target.value);
                                  setResults(newResults);
                                }}
                                className={`w-full text-center ${inputClass}`}
                              />
                            ) : param.isDescriptive ? (
                              <textarea
                                value={results[param.id]?.textValue || ''}
                                onChange={(e) => {
                                  const newResults = { ...results };
                                  if (!newResults[param.id]) newResults[param.id] = {};
                                  newResults[param.id].textValue = e.target.value;
                                  setResults(newResults);
                                }}
                                className={`w-full p-2 rounded border ${
                                  results[param.id]?.isAbnormal
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-300'
                                }`}
                                rows={2}
                              />
                            ) : (
                              <input
                                type="text"
                                value={results[param.id]?.selectedOption || ''}
                                onChange={(e) => {
                                  const newResults = { ...results };
                                  if (!newResults[param.id]) newResults[param.id] = {};
                                  newResults[param.id].selectedOption = e.target.value;
                                  setResults(newResults);
                                }}
                                className={`w-full text-center ${inputClass}`}
                              />
                            )}
                          </td>
                          <td className="border p-2 text-center text-gray-600 text-xs">
                            {param.units || '-'}
                          </td>
                          <td className="border p-2 text-center text-gray-600 text-xs">
                            {rangeStr}
                          </td>
                          <td className="border p-2 text-center">
                            <input
                              type="checkbox"
                              checked={results[param.id]?.isAbnormal || false}
                              onChange={() => {
                                const newResults = { ...results };
                                if (!newResults[param.id]) newResults[param.id] = {};
                                newResults[param.id].isAbnormal = !newResults[param.id].isAbnormal;
                                setResults(newResults);
                              }}
                              className="w-4 h-4 cursor-pointer accent-red-600"
                              title="Mark as abnormal"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 sticky bottom-0">
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
