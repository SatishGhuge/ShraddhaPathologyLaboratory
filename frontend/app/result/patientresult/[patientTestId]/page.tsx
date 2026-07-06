"use client";

// Fixed API URL integration for backend communication
import { useRouter, useParams, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";

import Header from "@/src/components/Header";
import { getPatientTestById } from "@/src/api/result.js";
import { updateTestStatus } from "@/src/api/result.js";
import API_BASE_URL from "@/src/api/config";
const LetterHead = "/LetterHead.jpeg";

// Autocomplete text input with suggestion dropdown and multi-select tags
const SuggestionInput = ({ value, onChange, options, isAbnormal }) => {
  const [show, setShow] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const ref = useRef(null);

  // Parse current value into tags array
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handler = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = inputVal
    ? options.filter(o => o.toLowerCase().includes(inputVal.toLowerCase()) && !tags.includes(o))
    : options.filter(o => !tags.includes(o));

  const addTag = (opt: any) => {
    const newTags = [...tags, opt];
    onChange(newTags.join(', '));
    setInputVal('');
    setShow(false);
  };

  const removeTag = (tag: any) => {
    const newTags = tags.filter(t => t !== tag);
    onChange(newTags.join(', '));
  };

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex flex-wrap gap-1 items-center border rounded px-2 py-1 min-w-[200px] max-w-xs cursor-text ${isAbnormal ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"}`}
        onClick={() => { setShow(true); }}
      >
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onMouseDown={(e) => { e.stopPropagation(); removeTag(tag); }} className="text-primary-600 hover:text-red-500 font-bold leading-none">×</button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
          className="outline-none text-sm flex-1 min-w-[60px] bg-transparent"
          placeholder={tags.length === 0 ? "Type or select..." : ""}
        />
      </div>
      {show && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 top-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto w-64 text-sm">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={() => addTag(opt)}
              className="px-3 py-1.5 cursor-pointer hover:bg-primary-50 hover:text-primary-800"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PatientResult = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientTestId = Array.isArray(params.patientTestId) ? params.patientTestId[0] : params.patientTestId;
  const testIdsParam = searchParams.get('testIds'); // For multiple tests
  
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [multipleTestIds, setMultipleTestIds] = useState<string[]>([]); // For multiple tests
  const [allTestsData, setAllTestsData] = useState<any[]>([]); // For multiple tests
  const [patientData, setPatientData] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [groupedParameters, setGroupedParameters] = useState<any>({});
  const [results, setResults] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportWithHeader, setReportWithHeader] = useState(true);
  const [attachedFile, setAttachedFile] = useState<any>(null);
  const [attachedFileUrl, setAttachedFileUrl] = useState<any>(null);
  const [showComment, setShowComment] = useState(false);
  const [defaultSignature, setDefaultSignature] = useState<any>(null);

  const calculateAge = (dob: any) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getAgeInUnit = (years, months, days, timeUnit) => {
    switch (timeUnit) {
      case 'Day(s)': return days;
      case 'Month(s)': return months;
      case 'Year(s)': return years;
      default: return years;
    }
  };

  const getAgeAppropriateRange = (parameter, patientAge, patientGender, patientDob) => {
    if (!parameter) return '';
    if (parameter.type === 'Text' || parameter.isDescriptive)
      return parameter.textContent || parameter.normalRange || '';
    const age = patientDob ? calculateAge(patientDob) : patientAge;
    const gender = patientGender?.toLowerCase();
    let exactAgeInDays = 0, exactAgeInMonths = 0, exactAgeInYears = age || 0;
    if (patientDob) {
      const birthDate = new Date(patientDob);
      const currentDate = new Date();
      const ageInMs = currentDate.getTime() - birthDate.getTime();
      exactAgeInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
      exactAgeInMonths = Math.floor(exactAgeInDays / 30.44);
      exactAgeInYears = Math.floor(exactAgeInDays / 365.25);
    }
    if (parameter.ageRanges) {
      try {
        const ageRanges = JSON.parse(parameter.ageRanges);
        for (const range of ageRanges) {
          if (!range.enabled) continue;
          const rangeGender = range.gender?.toLowerCase();
          if (rangeGender && rangeGender !== gender) continue;
          let ageMatches = false;
          if (range.label?.includes('Less Than') && range.value != null)
            ageMatches = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit) < range.value;
          else if (range.label?.includes('More Than') && range.value != null)
            ageMatches = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit) > range.value;
          else if (range.label?.includes('Between') && range.from != null && range.to != null) {
            const v = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit);
            ageMatches = v >= range.from && v <= range.to;
          } else if (range.label?.includes('Equal To') && range.value != null)
            ageMatches = getAgeInUnit(exactAgeInYears, exactAgeInMonths, exactAgeInDays, range.timeUnit) === range.value;
          if (ageMatches && range.ll != null && range.ul != null) return `${range.ll} - ${range.ul}`;
        }
      } catch (e) { console.warn('Error parsing age ranges:', e); }
    }
    if (parameter.rangeType === 'BySex' || parameter.rangeType === 'ByGenderAndAge') {
      if (exactAgeInYears < 18 && parameter.childActive && parameter.childLowValue != null && parameter.childHighValue != null)
        return `${parameter.childLowValue} - ${parameter.childHighValue}`;
      if (exactAgeInYears >= 18) {
        if (gender === 'female' && parameter.femaleActive && parameter.femaleLowValue != null && parameter.femaleHighValue != null)
          return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
        if (gender === 'male' && parameter.maleActive && parameter.maleLowValue != null && parameter.maleHighValue != null)
          return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
      }
    }
    if (parameter.maleLowValue != null && parameter.maleHighValue != null)
      return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
    return parameter.displayRangeText || parameter.rangeText || parameter.normalRange || '';
  };

  const parseRange = (rangeStr: any) => {
    if (!rangeStr) return null;
    const match = rangeStr.toString().match(/^([\d.]+)\s*-\s*([\d.]+)$/);
    if (!match) return null;
    return { low: parseFloat(match[1]), high: parseFloat(match[2]) };
  };

  const isValueOutOfRange = (param: any, numericValue: any) => {
    if (param.type !== 'Numeric' || numericValue === null || numericValue === undefined || numericValue === '') return false;
    const rangeStr = getAgeAppropriateRange(param, patientData?.patient?.age, patientData?.patient?.gender, patientData?.patient?.dob);
    const range = parseRange(rangeStr);
    if (!range) return false;
    return parseFloat(numericValue) < range.low || parseFloat(numericValue) > range.high;
  };

  const evaluateFormula = useCallback((formula, allParams, currentResults) => {
    if (!formula) return null;
    try {
      let expr = formula;
      allParams.forEach(p => {
        const val = currentResults[p.id]?.numericValue;
        if (val !== null && val !== undefined && val !== '') {
          const escaped = p.parameterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          expr = expr.replace(new RegExp(`\\{${escaped}\\}`, 'g'), val);
        }
      });
      if (/\{[^}]+\}/.test(expr)) return null;
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result === 'number' && isFinite(result)) return parseFloat(result.toFixed(4));
      return null;
    } catch { return null; }
  }, []);

  // Detect if multiple tests or single test
  useEffect(() => {
    if (testIdsParam) {
      const ids = testIdsParam.split(',').filter(id => id.trim());
      setMultipleTestIds(ids);
    } else {
      setMultipleTestIds([]);
    }
  }, [testIdsParam]);

  // Load data based on single or multiple tests
  useEffect(() => {
    if (multipleTestIds.length > 0) {
      fetchMultipleTestsData();
    } else if (patientTestId) {
      fetchPatientTestData();
    }
  }, [patientTestId, multipleTestIds]);

  // Fetch single test data (existing logic)
  const fetchPatientTestData = async () => {
    try {
      setLoading(true);
      const data = await getPatientTestById(patientTestId);
      if (data) {
        setPatientData(data.patientTest);
        setParameters(data.parameters);
        setGroupedParameters(data.groupedParameters);
        const initialResults = {};
        data.parameters.forEach(param => {
          if (param.existingResult) {
            initialResults[param.id] = {
              numericValue: param.existingResult.numericValue,
              textValue: param.existingResult.textValue,
              selectedOption: param.existingResult.selectedOption,
              isAbnormal: param.existingResult.isAbnormal,
              referenceRange: param.existingResult.referenceRange
            };
          } else {
            initialResults[param.id] = { numericValue: null, textValue: param.textContent || '', selectedOption: '', isAbnormal: false, referenceRange: param.normalRange };
          }
        });
        setResults(initialResults);

        // Auto set to PROVISIONAL when page is opened (if still REGISTERED)
        if (data.patientTest.status === 'REGISTERED') {
          await updateTestStatus(data.patientTest.id, { status: 'PROVISIONAL' });
        }
      }
    } catch (error) {
      console.error('Error fetching patient test data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch multiple tests data
  const fetchMultipleTestsData = async () => {
    try {
      setLoading(true);
      const testDataArray = await Promise.all(
        multipleTestIds.map(id => getPatientTestById(id))
      );

      const validTests = testDataArray.filter(td => td?.patientTest).map(td => td);
      setAllTestsData(validTests);

      // Use first test's patient data
      if (validTests.length > 0) {
        setPatientData(validTests[0].patientTest);
      }

      // Initialize results for all tests with all their parameters
      const initialResults: any = {};
      validTests.forEach((testData, idx) => {
        const testId = multipleTestIds[testDataArray.indexOf(testData)];
        if (testData.parameters) {
          testData.parameters.forEach(param => {
            const paramKey = `${testId}_${param.id}`;
            if (param.existingResult) {
              initialResults[paramKey] = {
                numericValue: param.existingResult.numericValue,
                textValue: param.existingResult.textValue,
                selectedOption: param.existingResult.selectedOption,
                isAbnormal: param.existingResult.isAbnormal,
                referenceRange: param.existingResult.referenceRange
              };
            } else {
              initialResults[paramKey] = { numericValue: null, textValue: param.textContent || '', selectedOption: '', isAbnormal: false, referenceRange: param.normalRange };
            }
          });
        }
      });
      setResults(initialResults);

      // Auto-transition all tests to PROVISIONAL
      await Promise.all(
        validTests.map(testData => {
          if (testData.patientTest.status === 'REGISTERED') {
            return updateTestStatus(testData.patientTest.id, { status: 'PROVISIONAL' });
          }
        })
      );
    } catch (error) {
      console.error('Error fetching multiple tests data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (parameterId, field, value, allParams) => {
    setResults(prev => {
      const updated = { ...prev, [parameterId]: { ...prev[parameterId], [field]: value } };
      (allParams || parameters).forEach(param => {
        if (param.hasFormula && param.formula) {
          const calculated = evaluateFormula(param.formula, allParams || parameters, updated);
          if (calculated !== null) updated[param.id] = { ...updated[param.id], numericValue: calculated };
        }
      });
      return updated;
    });
  };

  const handleAbnormalChange = (parameterId: any) => {
    setResults(prev => ({ ...prev, [parameterId]: { ...prev[parameterId], isAbnormal: !prev[parameterId]?.isAbnormal } }));
  };

  // Save all tests at once (for multiple tests)
  const handleSaveAllTests = async () => {
    try {
      setSaving(true);
      
      // Save results for each test
      await Promise.all(
        allTestsData.map(async (testData) => {
          const testId = multipleTestIds[allTestsData.indexOf(testData)];
          const resultsData = testData.parameters.map(param => {
            const paramKey = `${testId}_${param.id}`;
            return {
              testParameterId: param.id,
              testCategoryId: param.categoryId,
              numericValue: results[paramKey]?.numericValue || null,
              textValue: results[paramKey]?.textValue || null,
              selectedOption: results[paramKey]?.selectedOption || null,
              isAbnormal: results[paramKey]?.isAbnormal || false,
              referenceRange: results[paramKey]?.referenceRange || param.normalRange
            };
          }).filter(r => {
            const hasNumeric = r.numericValue !== null && r.numericValue !== undefined && r.numericValue !== '';
            const hasText = r.textValue && typeof r.textValue === 'string' && r.textValue.trim() !== '';
            const hasOption = r.selectedOption && typeof r.selectedOption === 'string' && r.selectedOption.trim() !== '';
            return hasNumeric || hasText || hasOption;
          });

          const response = await fetch(`${API_BASE_URL}/results/${testData.patientTest.id}/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: resultsData, enteredBy: 'current_user' })
          });
          
          const data = await response.json();
          if (data.success) {
            // Auto-transition to Entered status
            try {
              await fetch(`${API_BASE_URL}/results/${testData.patientTest.id}/auto-transition/result-saved`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changedBy: 'result_entry' })
              });
            } catch (error) {
              console.error('⚠️ Auto-transition failed:', error);
            }
          }
        })
      );

      alert('All results saved successfully!');
      router.push('/result');
    } catch (error) {
      console.error('Error saving results:', error);
      alert('Error saving results');
    } finally {
      setSaving(false);
    }
  };

  // Check if all non-formula parameters have values
  const allResultsFilled = () => {
    return parameters
      .filter(p => !(p.hasFormula && p.formula))
      .every(p => {
        const r = results[p.id];
        if (p.type === 'Numeric') return r?.numericValue !== null && r?.numericValue !== undefined && r?.numericValue !== '';
        return r?.textValue && r.textValue.trim() !== '';
      });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const resultsData = parameters.map(param => ({
        testParameterId: param.id,
        testCategoryId: param.categoryId,
        numericValue: results[param.id]?.numericValue || null,
        textValue: results[param.id]?.textValue || null,
        selectedOption: results[param.id]?.selectedOption || null,
        isAbnormal: results[param.id]?.isAbnormal || false,
        referenceRange: results[param.id]?.referenceRange || param.normalRange
      })).filter(r => {
        const hasNumeric = r.numericValue !== null && r.numericValue !== undefined && r.numericValue !== '';
        const hasText = r.textValue && typeof r.textValue === 'string' && r.textValue.trim() !== '';
        const hasOption = r.selectedOption && typeof r.selectedOption === 'string' && r.selectedOption.trim() !== '';
        return hasNumeric || hasText || hasOption;
      });

      const response = await fetch(`${API_BASE_URL}/results/${patientData.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsData, enteredBy: 'current_user' })
      });
      const data = await response.json();
      if (data.success) {
        // Auto-transition to Entered status when first result is saved
        try {
          const transitionResponse = await fetch(`${API_BASE_URL}/results/${patientData.id}/auto-transition/result-saved`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changedBy: 'result_entry' })
          });
          
          const transitionData = await transitionResponse.json();
          if (transitionData.success) {
            console.log('✅ Test auto-transitioned to Entered status');
          }
        } catch (error) {
          console.error('⚠️ Auto-transition failed:', error);
          // Don't block save if transition fails
        }
        
        // Upload attachment if a new file was selected
        if (attachedFile) {
          const formData = new FormData();
          formData.append('file', attachedFile);
          await fetch(`${API_BASE_URL}/results/${patientData.id}/attachment`, { method: 'POST', body: formData });
        }
        alert('Results saved successfully!');
        fetchPatientTestData();
      } else {
        alert('Error saving results: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving results:', error);
      alert('Error saving results');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPrint = async (withHeader) => {
    try {
      setSaving(true);
      const resultsData = parameters.map(param => ({
        testParameterId: param.id,
        testCategoryId: param.categoryId,
        numericValue: results[param.id]?.numericValue || null,
        textValue: results[param.id]?.textValue || null,
        selectedOption: results[param.id]?.selectedOption || null,
        isAbnormal: results[param.id]?.isAbnormal || false,
        referenceRange: results[param.id]?.referenceRange || param.normalRange
      })).filter(r => {
        const hasNumeric = r.numericValue !== null && r.numericValue !== undefined && r.numericValue !== '';
        const hasText = r.textValue && typeof r.textValue === 'string' && r.textValue.trim() !== '';
        const hasOption = r.selectedOption && typeof r.selectedOption === 'string' && r.selectedOption.trim() !== '';
        return hasNumeric || hasText || hasOption;
      });

      const response = await fetch(`${API_BASE_URL}/results/${patientData.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsData, enteredBy: 'current_user' })
      });
      const data = await response.json();
      if (data.success) {
        // Upload attachment if selected
        if (attachedFile) {
          const formData = new FormData();
          formData.append('file', attachedFile);
          await fetch(`${API_BASE_URL}/results/${patientData.id}/attachment`, { method: 'POST', body: formData });
        }
        setReportWithHeader(withHeader);
        setShowReportModal(true);
      } else {
        alert('Error saving results: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving results:', error);
      alert('Error saving results');
    } finally {
      setSaving(false);
    }
  };

  // Deliver — set status to DELIVERED
  const handleDeliver = async () => {
    try {
      await updateTestStatus(patientData.id, { status: 'DELIVERED' });
      alert('Report delivered successfully!');
      router.back();
    } catch (error) {
      console.error('Error delivering:', error);
      alert('Error delivering report');
    }
  };

  // Print by opening a new window with just the report HTML
  const handlePrint = (withHeader: any) => {
    const reportDiv = document.getElementById('pr-report-page');
    if (!reportDiv) return;
    const allPages = document.querySelectorAll('#pr-report-page, .pr-attachment-page');
    const pagesHtml = Array.from(allPages).map((p, i, arr) => {
      const clone = p.cloneNode(true) as HTMLElement;
      // Remove page-break-after on last page to prevent blank page
      if (i === arr.length - 1) clone.style.pageBreakAfter = 'avoid';
      return clone.outerHTML;
    }).join('');
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Report</title><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; font-size:11px; }
        @page { size:A4; margin:0; }
        #pr-report-page, .pr-attachment-page {
          width:210mm; min-height:297mm; position:relative;
          overflow:hidden; page-break-after:always; background:#fff;
        }
        #pr-report-page:last-child, .pr-attachment-page:last-child { page-break-after:avoid; }
      </style></head><body>${pagesHtml}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  if (loading) return (<><Header /><div className="p-4 bg-gray-100 min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>Loading...</div></div></>);
  if (error) return (<><Header /><div className="p-4 bg-gray-100 min-h-screen"><div className="text-center text-red-500">{error}<br /><button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retry</button></div></div></>);
  if (!patientData) return (<><Header /><div className="p-4 bg-gray-100 min-h-screen"><div className="text-center text-red-500">Patient test not found</div></div></>);

  return (
    <>
      <Header />
      <div className="p-4 bg-gray-100 min-h-screen mt-16">

        {/* Patient Header */}
        <div className="bg-yellow-100 border p-2 text-sm flex justify-between flex-wrap">
          <span><b>NAME:</b> {patientData.patient.title} {patientData.patient.firstName} {patientData.patient.lastName}</span>
          <span><b>P_ID:</b> {patientData.patient.patientId}</span>
          <span><b>V_ID:</b> {patientData.visitId}</span>
          <span><b>AGE/GENDER:</b> {patientData.patient.age} Yrs / {patientData.patient.gender}</span>
          <span><b>REFERRAL DR:</b> {patientData.referralDoctor || 'SELF'}</span>
          <span><b>REG. DATE & TIME:</b> {new Date(patientData.visitDate).toLocaleDateString('en-GB')} {patientData.visitTime}</span>
          <span><b>STATUS:</b> <span className="font-semibold text-blue-700">{patientData.status}</span></span>
        </div>

        {/* For Multiple Tests */}
        {allTestsData.length > 0 ? (
          <div className="space-y-8">
            {allTestsData.map((testData, testIdx) => (
              <div key={testIdx}>
                {/* Test Name */}
                <div className="mt-2 bg-primary-600 text-white p-2 font-semibold">
                  {testIdx + 1}. {testData.patientTest.test.name}
                </div>

                {/* Results Table */}
                <div className="mt-3 bg-white border">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-secondary-700 text-white">
                      <tr>
                        <th className="border p-2 text-left">INVESTIGATION</th>
                        <th className="border p-2 text-left">OBSERVED VALUE</th>
                        <th className="border p-2 text-left">UNITS</th>
                        <th className="border p-2 text-left">NORMAL RANGE</th>
                        <th className="border p-2 text-center">FORMULA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(testData.groupedParameters || {}).map(([categoryName, categoryParams]: [string, any]) => (
                        <React.Fragment key={categoryName}>
                          {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                            <tr className="bg-gray-200 font-semibold"><td colSpan={5} className="p-2">{categoryName.toUpperCase()}</td></tr>
                          )}
                          {(categoryParams as any[]).map((param) => {
                            const paramKey = `${multipleTestIds[testIdx]}_${param.id}`;
                            const outOfRange = isValueOutOfRange(param, results[paramKey]?.numericValue);
                            const isFormula = param.hasFormula && param.formula;
                            const inputClass = outOfRange ? "border-2 border-red-500 bg-red-50 px-2 py-1 w-24 rounded" : "border border-gray-300 px-2 py-1 w-24 rounded";
                            const rawRange = param.rangeText || param.displayRangeText || '';
                            const options = rawRange
                              ? rawRange.split(/[,|]/).map(o => o.trim()).filter(Boolean)
                              : [];
                            return (
                              <tr key={param.id} className="bg-purple-100">
                                <td className="border p-2">{param.parameterName}</td>
                                <td className="border p-2">
                                  {param.type === 'Numeric' ? (
                                    <input
                                      type="number"
                                      value={results[paramKey]?.numericValue || ''}
                                      onChange={(e) => handleResultChange(paramKey, 'numericValue', e.target.value, testData.parameters)}
                                      disabled={isFormula}
                                      className={inputClass}
                                    />
                                  ) : param.type === 'Text' ? (
                                    options.length > 0 ? (
                                      <SuggestionInput
                                        value={results[paramKey]?.textValue || ''}
                                        onChange={(val) => handleResultChange(paramKey, 'textValue', val, testData.parameters)}
                                        options={options}
                                        isAbnormal={results[paramKey]?.isAbnormal || false}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={results[paramKey]?.textValue || ''}
                                        onChange={(e) => handleResultChange(paramKey, 'textValue', e.target.value, testData.parameters)}
                                        className={`border px-2 py-1 w-32 rounded ${results[paramKey]?.isAbnormal ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                                      />
                                    )
                                  ) : (
                                    <div className="text-xs italic text-gray-600">{param.type} Parameter</div>
                                  )}
                                </td>
                                <td className="border p-2 text-xs">{param.units || '-'}</td>
                                <td className="border p-2 text-xs">{getAgeAppropriateRange(param, patientData.patient?.age, patientData.patient?.gender, patientData.patient?.dob)}</td>
                                <td className="border p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={results[paramKey]?.isAbnormal || false}
                                    onChange={() => handleAbnormalChange(paramKey)}
                                    className="cursor-pointer"
                                    disabled={isFormula}
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
            ))}
          </div>
        ) : (
          <>
            {/* Test Name - Single Test */}
            <div className="mt-2 bg-primary-600 text-white p-2 font-semibold">{patientData.test.name}</div>

            {/* Results Table - Single Test */}
            <div className="mt-3 bg-white border">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-secondary-700 text-white">
                  <tr>
                    <th className="border p-2 text-left">INVESTIGATION</th>
                    <th className="border p-2 text-left">OBSERVED VALUE</th>
                    <th className="border p-2 text-left">UNITS</th>
                    <th className="border p-2 text-left">NORMAL RANGE</th>
                    <th className="border p-2 text-center">FORMULA</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedParameters).map(([categoryName, categoryParams]: [string, any]) => (
                    <React.Fragment key={categoryName}>
                      {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                        <tr className="bg-gray-200 font-semibold"><td colSpan={5} className="p-2">{categoryName.toUpperCase()}</td></tr>
                      )}
                      {(categoryParams as any[]).map((param) => {
                        const outOfRange = isValueOutOfRange(param, results[param.id]?.numericValue);
                        const isFormula = param.hasFormula && param.formula;
                        const inputClass = outOfRange ? "border-2 border-red-500 bg-red-50 px-2 py-1 w-24 rounded" : "border border-gray-300 px-2 py-1 w-24 rounded";
                        return (
                          <tr key={param.id} className="bg-purple-100">
                            <td className="border p-2">{param.parameterName}{param.isMandatory && <span className="text-red-500">*</span>}</td>
                            <td className="border p-2">
                              <div className="flex items-center gap-2">
                                {!isFormula && <input type="checkbox" checked={results[param.id]?.isAbnormal || false} onChange={() => handleAbnormalChange(param.id)} title="Mark as abnormal" />}
                                {isFormula ? (
                                  <div className="flex items-center gap-1">
                                    <input type="checkbox" checked={results[param.id]?.isAbnormal || false} onChange={() => handleAbnormalChange(param.id)} title="Mark as abnormal" />
                                    <input type="text" readOnly value={results[param.id]?.numericValue ?? ''} className={`${inputClass} bg-green-50 border-green-400 cursor-not-allowed`} title={`Auto-calculated: ${param.formula}`} />
                                    <span className="text-xs text-green-700 italic">auto</span>
                                  </div>
                                ) : param.type === 'Numeric' ? (
                                  <input type="number" step="0.01" value={results[param.id]?.numericValue ?? ''} onChange={(e) => handleResultChange(param.id, 'numericValue', e.target.value === '' ? null : parseFloat(e.target.value), parameters)} className={inputClass} />
                                ) : param.isDescriptive ? (
                                  <textarea value={results[param.id]?.textValue || ''} onChange={(e) => handleResultChange(param.id, 'textValue', e.target.value, parameters)} className={`border px-2 py-1 w-48 h-16 rounded ${results[param.id]?.isAbnormal ? "border-red-500 bg-red-50" : "border-gray-300"}`} />
                                ) : (
                                  (() => {
                                    const rawRange = param.rangeText || param.displayRangeText || '';
                                    const options = rawRange
                                      ? rawRange.split(/[,|]/).map(o => o.trim()).filter(Boolean)
                                      : [];
                                    return options.length > 0 ? (
                                      <SuggestionInput
                                        value={results[param.id]?.textValue ?? (param.textContent || '')}
                                        onChange={(val) => handleResultChange(param.id, 'textValue', val, parameters)}
                                        options={options}
                                        isAbnormal={results[param.id]?.isAbnormal}
                                      />
                                    ) : (
                                      <input type="text" value={results[param.id]?.textValue || ''} onChange={(e) => handleResultChange(param.id, 'textValue', e.target.value, parameters)} className={`border px-2 py-1 w-32 rounded ${results[param.id]?.isAbnormal ? "border-red-500 bg-red-50" : "border-gray-300"}`} />
                                    );
                                  })()
                                )}
                                {outOfRange && <span className="text-red-600 font-bold text-xs" title="Out of range">↑↓</span>}
                              </div>
                            </td>
                            <td className="border p-2">{param.units || ''}</td>
                            <td className="border p-2">{param.type === 'Text' || param.isDescriptive ? (param.normalRange || '') : getAgeAppropriateRange(param, patientData.patient.age, patientData.patient.gender, patientData.patient.dob)}</td>
                            <td className="border p-2 text-center text-xs">
                              {param.hasFormula && param.formula ? (
                                <div className="bg-green-50 border border-green-300 rounded p-1">
                                  <div className="font-semibold text-green-700 text-xs mb-0.5">Formula:</div>
                                  <div className="text-green-900 font-mono text-xs break-words">{param.formula}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Attach File Section — shown when test has attachFile = Yes (only for single test) */}
        {allTestsData.length === 0 && patientData.test.attachFile === 'Yes' && (
            <div className="border-t bg-purple-50 px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="show-comment"
                  checked={showComment}
                  onChange={(e) => setShowComment(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="show-comment" className="text-sm text-gray-700 cursor-pointer">Comment</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files[0] || null;
                    setAttachedFile(file);
                    if (file) setAttachedFileUrl(URL.createObjectURL(file));
                    else setAttachedFileUrl(null);
                  }}
                  className="text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:text-xs file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                />
                {attachedFile && <span className="text-xs text-green-700">{attachedFile.name}</span>}
                {!attachedFile && patientData.attachmentPath && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    ✅ Attachment saved
                    <button
                      onClick={async () => {
                        await fetch(`${API_BASE_URL}/results/${patientData.id}/attachment`, { method: 'DELETE' });
                        fetchPatientTestData();
                      }}
                      className="text-red-500 hover:text-red-700 text-xs ml-1"
                    >✕ Remove</button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 p-3">
            {allTestsData.length > 0 ? (
              <>
                <button onClick={handleSaveAllTests} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : `Save All Results (${allTestsData.length} tests)`}
                </button>
                <button onClick={() => router.back()} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Back</button>
              </>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => router.back()} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Back</button>
                <button onClick={() => handleSaveAndPrint(true)} disabled={saving} className="bg-primary-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
                  Save & Print
                </button>
              </>
            )}
          </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b no-print flex-shrink-0">
                <h2 className="text-base font-semibold text-gray-900">{patientData.test.name} — Report</h2>
                <div className="flex gap-2">
                  <button onClick={() => setReportWithHeader(false)} className={`px-3 py-1.5 rounded text-sm ${!reportWithHeader ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Without Header</button>
                  <button onClick={() => setReportWithHeader(true)} className={`px-3 py-1.5 rounded text-sm ${reportWithHeader ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}>With Header</button>
                  <button onClick={() => handlePrint(reportWithHeader)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">Print</button>
                  <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none px-1">×</button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    #pr-report-page, #pr-report-page * { visibility: visible !important; }
                    #pr-report-page {
                      position: absolute !important;
                      top: 0 !important; left: 0 !important;
                      width: 210mm !important;
                      margin: 0 !important; padding: 0 !important;
                      box-shadow: none !important;
                    }
                    .no-print { display: none !important; }
                    @page { size: A4; margin: 0; }
                  }
                `}</style>

                <div id="pr-report-page" style={{ width: '210mm', height: '297mm', margin: '16px auto', position: 'relative', backgroundColor: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', fontFamily: 'Arial, sans-serif', fontSize: '11px', overflow: 'hidden' }}>
                  {reportWithHeader && (
                    <img src={LetterHead} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0, pointerEvents: 'none' }} />
                  )}
                  <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', paddingTop: reportWithHeader ? '38mm' : '12mm', paddingBottom: reportWithHeader ? '36mm' : '12mm', paddingLeft: '14mm', paddingRight: '14mm', boxSizing: 'border-box' }}>

                    {/* Report Title */}
                    <div style={{ textAlign: 'center', marginBottom: '6mm', borderBottom: '1.5px solid #333', paddingBottom: '3mm' }}>
                      <strong style={{ fontSize: '13px', letterSpacing: '1px' }}>{patientData.test.name.toUpperCase()} REPORT</strong>
                    </div>

                    {/* Patient Info */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '11px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 4px', width: '50%' }}><strong>Patient:</strong> {patientData.patient.title} {patientData.patient.firstName} {patientData.patient.lastName}</td>
                          <td style={{ padding: '2px 4px', width: '50%' }}><strong>Age / Gender:</strong> {patientData.patient.age} Yrs / {patientData.patient.gender}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px' }}><strong>Lab No:</strong> {patientData.visitId}</td>
                          <td style={{ padding: '2px 4px' }}><strong>Date:</strong> {new Date(patientData.visitDate).toLocaleDateString('en-GB')}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Results — no borders, no row lines */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '38%' }}>Test Description</th>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px 4px 20px', textAlign: 'left', width: '22%' }}>Result</th>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '12%' }}>Unit</th>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '28%' }}>Biological Reference Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={4} style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>{patientData.test.name}</td>
                        </tr>
                        {Object.entries(groupedParameters).map(([categoryName, categoryParams]: [string, any]) => (
                          <React.Fragment key={categoryName}>
                            {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                              <tr><td colSpan={4} style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>{categoryName.toUpperCase()}</td></tr>
                            )}
                            {(categoryParams as any[]).map((param) => {
                              const numVal = results[param.id]?.numericValue;
                              const isAbn = results[param.id]?.isAbnormal === true || results[param.id]?.isAbnormal === 1 || isValueOutOfRange(param, numVal);
                              const displayValue = param.type === 'Numeric' ? (numVal !== null && numVal !== undefined ? numVal : '-') : (results[param.id]?.textValue || '-');
                              return (
                                <tr key={param.id}>
                                  <td style={{ padding: '3px 6px', width: '38%', fontWeight: isAbn ? 'bold' : 'normal' }}>{param.parameterName}</td>
                                  <td style={{ padding: '3px 6px 3px 20px', width: '22%', fontWeight: isAbn ? '900' : 'normal', color: isAbn ? '#b91c1c' : 'inherit', fontSize: '11px' }}>
                                    {displayValue}{isAbn && ' *'}
                                  </td>
                                  <td style={{ padding: '3px 6px', width: '12%' }}>{param.units || ''}</td>
                                  <td style={{ padding: '3px 6px', width: '28%' }}>{param.type === 'Text' || param.isDescriptive ? (param.normalRange || '-') : getAgeAppropriateRange(param, patientData.patient.age, patientData.patient.gender, patientData.patient.dob)}</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>

                    {/* Interpretation */}
                    {patientData.test.interpretation && (
                      <div style={{ marginTop: '4mm', borderTop: '1px solid #ccc', paddingTop: '3mm', fontSize: '11px', color: '#444' }}
                        dangerouslySetInnerHTML={{ __html: patientData.test.interpretation }}
                      />
                    )}

                    {/* Signature block */}
                    {(patientData.test.signature || defaultSignature) && (() => {
                      const sig = patientData.test.signature || defaultSignature;
                      return (
                        <div style={{ marginTop: 'auto', paddingTop: '6mm', display: 'flex', justifyContent: 'flex-end' }}>
                          <div style={{ textAlign: 'center' }}>
                            {sig.signatureImage && (
                              <img
                                src={sig.signatureImage}
                                alt="Signature"
                                style={{
                                  width: sig.width || 150,
                                  height: sig.height || 80,
                                  objectFit: 'contain',
                                  display: 'block',
                                  margin: '0 auto',
                                }}
                              />
                            )}
                            {sig.signatureText && (
                              <div style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'pre-line', marginTop: '2px' }}>
                                {sig.signatureText}
                              </div>
                            )}
                            {sig.doctorName && (
                              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                {sig.doctorName}
                              </div>
                            )}
                            {sig.specialty && (
                              <div style={{ fontSize: '10px', color: '#444' }}>
                                {sig.specialty}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {!reportWithHeader && (
                      <div style={{ marginTop: (patientData.test.signature || defaultSignature) ? '4mm' : 'auto', borderTop: '1px solid #ccc', paddingTop: '3mm', fontSize: '10px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Report generated on: {new Date().toLocaleString('en-GB')}</span>
                        <span>Shraddha Pathology Laboratory — Pathology Laboratory</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachment page — local preview OR server-stored file */}
                {(attachedFileUrl || patientData.attachmentPath) && (() => {
                  const src = attachedFileUrl || `${process.env.NEXT_PUBLIC_API_URL.replace('/api','')}${patientData.attachmentPath}`;
                  const isPdf = attachedFile?.type === 'application/pdf' || patientData.attachmentPath?.endsWith('.pdf');
                  return (
                    <div className="pr-attachment-page" style={{ width: '210mm', height: '297mm', margin: '16px auto', position: 'relative', backgroundColor: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {isPdf ? (
                        <iframe src={src} style={{ width: '100%', height: '100%', border: 'none' }} title="Attached document" />
                      ) : (
                        <img src={src} alt="Attached document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PatientResult;
