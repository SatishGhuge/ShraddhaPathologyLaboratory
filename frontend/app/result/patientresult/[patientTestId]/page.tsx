"use client";

// Fixed API URL integration for backend communication
import { useRouter, useParams, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";

import Header from "@/src/components/Header";
import BarcodeModal, { generateBarcodeLabels, getSampleTypeId, getSampleTypeName, getTestName } from "@/app/components/BarcodeModal";
import { getPatientTestById, updateTestStatus, updatePatientComments } from "@/src/api/result.js";
import API_BASE_URL from "@/src/api/config";
import { useTestTemplates } from '@/src/hooks/useTestTemplates';
import InlineTemplateSelector from '@/app/components/InlineTemplateSelector';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { parseHtmlText, stripHtmlTags, HtmlPart } from '@/src/utils/htmlParser';
const LetterHead = "/LetterHead.jpeg";

// Autocomplete text input with suggestion dropdown and multi-select tags
const SuggestionInput = ({ value, onChange, options, isAbnormal }) => {
  const [show, setShow] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const ref = useRef(null);

  // Parse current value into tags array
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handler = (e: any) => { if (ref.current && !(ref.current as HTMLElement).contains(e.target as Node)) setShow(false); };
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
  const patientTestId = Array.isArray(params?.patientTestId) ? params.patientTestId[0] : (params?.patientTestId as string);
  const testIdsParam = searchParams?.get('testIds') || null; // For multiple tests
  
  const router = useRouter();

  // Helper function to render styled text with HTML tags
  const renderStyledText = (text: string | undefined, defaultBold: boolean = false): React.ReactNode => {
    if (!text) return "-";
    
    const cleanText = String(text).trim();
    if (!cleanText) return "-";
    
    const parsed = parseHtmlText(cleanText);
    
    if (typeof parsed === 'string') {
      if (defaultBold) return <b>{parsed}</b>;
      return parsed;
    }
    
    return (parsed as HtmlPart[]).map((part: HtmlPart, i: number) => {
      const isBold = part.bold || defaultBold;
      const isItalic = part.italic;
      const isUnderline = part.underline;
      
      let element: React.ReactNode = part.text;
      if (isUnderline) element = <u>{element}</u>;
      if (isItalic) element = <i>{element}</i>;
      if (isBold) element = <b>{element}</b>;
      
      return <React.Fragment key={i}>{element}</React.Fragment>;
    });
  };

  // Initialize template hook
  const { templateCache, fetchTemplatesForTests, getTemplates } = useTestTemplates();

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
  const [comments, setComments] = useState('');
  const [defaultSignature, setDefaultSignature] = useState<any>(null);

  // BarcodeModal state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeLabels, setBarcodeLabels] = useState<any[]>([]);
  const [barcodePatientInfo, setBarcodePatientInfo] = useState<any>(null);
  const [selectedBarcodes, setSelectedBarcodes] = useState<Set<number>>(new Set());

  
  // 🔧 PART 2: State for outsourced tests
  const [isOutsourced, setIsOutsourced] = useState(false);
  const [outsourcedTo, setOutsourcedTo] = useState<string | null>(null);
  const [outsourcingReport, setOutsourcingReport] = useState<any>(null);

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

  const getRangeIndicator = (param: any, numericValue: any) => {
    if (param.type !== 'Numeric' || numericValue === null || numericValue === undefined || numericValue === '') return null;
    const rangeStr = getAgeAppropriateRange(param, patientData?.patient?.age, patientData?.patient?.gender, patientData?.patient?.dob);
    const range = parseRange(rangeStr);
    if (!range) return null;
    const value = parseFloat(numericValue);
    if (value < range.low) return { icon: '↓', title: 'Below range', color: 'text-blue-600' };
    if (value > range.high) return { icon: '↑', title: 'Above range', color: 'text-red-600' };
    return null;
  };

  // Barcode handlers - SIMPLIFIED: Use centralized barcode generation from BarcodeModal
  const handlePrintBarcode = () => {
    if (!patientData) return;
    
    const testData = patientData.patientTest || patientData;
    const baseVisitId = testData.visitId || testData.id?.toString() || 'UNKNOWN';
    
    // Collect all tests to generate barcodes
    let testsForBarcode: any[] = [];
    
    if (allTestsData.length > 0) {
      // Multiple tests - use the full test data objects with sampleTypeId extracted to top level
      testsForBarcode = allTestsData.map(td => {
        const pt = td.patientTest;
        // ✅ Ensure sampleTypeId is at top level for barcode generation
        return {
          ...pt,
          sampleTypeId: pt.sampleTypeId || pt.test?.sampleTypeId,  // Ensure top-level access
          sampleTypeName: pt.sample_type?.Sample_Type || pt.test?.sample_type?.Sample_Type,
          specimen: pt.sample_type?.Sample_Type || pt.test?.sample_type?.Sample_Type
        };
      });
    } else if (patientData) {
      // Single test
      const pt = patientData;
      testsForBarcode = [{
        ...pt,
        sampleTypeId: pt.sampleTypeId || pt.test?.sampleTypeId,  // Ensure top-level access
        sampleTypeName: pt.sample_type?.Sample_Type || pt.test?.sample_type?.Sample_Type,
        specimen: pt.sample_type?.Sample_Type || pt.test?.sample_type?.Sample_Type
      }];
    }
    
    // 🔴 DEBUG: Log what we're sending to barcode generation
    console.log('🔴 Result Page - handlePrintBarcode DEBUG:');
    console.log('   allTestsData.length:', allTestsData.length);
    console.log('   testsForBarcode.length:', testsForBarcode.length);
    testsForBarcode.forEach((test, idx) => {
      console.log(`   Test ${idx}:`, {
        id: test?.id,
        visitId: test?.visitId,
        sampleTypeId: test?.sampleTypeId,
        'test.sampleTypeId': test?.test?.sampleTypeId,
        'test keys': test?.test ? Object.keys(test.test).slice(0, 10) : 'NO TEST OBJECT',
        'top level keys':Object.keys(test).slice(0, 15)
      });
    });
    
    // ✅ Use centralized generateBarcodeLabels function
    const labels = generateBarcodeLabels(testsForBarcode, baseVisitId, testData.organizationCode || '');
    
    console.log('✅ Generated barcode labels using centralized function:', labels);
    
    setBarcodeLabels(labels);
    setBarcodePatientInfo({
      patientName: patientData.patient?.firstName && patientData.patient?.lastName 
        ? `${patientData.patient?.firstName} ${patientData.patient?.lastName}` 
        : patientData.patient?.firstName || 'Unknown',
      visitId: baseVisitId,
      age: calculateAge(patientData.patient?.dob)?.toString() || '',
      gender: patientData.patient?.gender || '',
      ageGender: `${patientData.patient?.gender?.charAt(0).toUpperCase() || 'U'}/${calculateAge(patientData.patient?.dob) || 'N/A'}Y`,
      organizationCode: testData.organizationCode || ''
    });
    
    setSelectedBarcodes(new Set(labels.map((_, i) => i)));
    setShowBarcodeModal(true);
  };

  const handleBarcodeToggle = (index: number) => {
    setSelectedBarcodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const onBarcodesPrintOnly = () => {
    // Trigger print of selected barcodes
    const printArea = document.getElementById('barcode-print-area');
    if (printArea) {
      window.print();
    }
  };

  const onBarcodesPrintAndUpdate = async () => {
    try {
      // Print first
      const printArea = document.getElementById('barcode-print-area');
      if (printArea) {
        window.print();
      }
      
      // Then update barcode status to 'Printed' for selected barcodes
      const selectedIndices = Array.from(selectedBarcodes);
      if (selectedIndices.length > 0) {
        // Update backend with printed status
        if (allTestsData.length > 0) {
          // Multiple tests
          await Promise.all(selectedIndices.map(idx => {
            const test = allTestsData[idx];
            return fetch(`${API_BASE_URL}/results/${test.patientTest.id}/barcode-status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ barcode_status: 'Printed', status: 'Received' })
            });
          }));
        } else if (patientData.id) {
          // Single test
          await fetch(`${API_BASE_URL}/results/${patientData.id}/barcode-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode_status: 'Printed', status: 'Received' })
          });
        }
        
        alert('Barcodes printed and status updated!');
        setShowBarcodeModal(false);
        // Refresh data
        if (patientData) {
          fetchPatientTestData();
        }
      }
    } catch (error) {
      console.error('Error updating barcode status:', error);
      alert('Barcodes printed but failed to update status');
      setShowBarcodeModal(false);
    }
  };

  // Check if any parameter has units or reference range in report
  const shouldShowUnitsColumn = (paramGrouped = groupedParameters) => {
    try {
      if (!paramGrouped || Object.keys(paramGrouped).length === 0) return false;
      
      const hasUnits = Object.values(paramGrouped).some((categoryParams: any) =>
        (categoryParams as any[]).some(param => {
          // Check if parameter has actual non-empty unit value
          const hasUnit = param.units && param.units.trim() !== '' && param.units !== '-';
          if (hasUnit) {
            console.log(`✅ Found unit: "${param.units}" for parameter: ${param.parameterName}`);
          }
          return hasUnit;
        })
      );
      console.log('🔍 shouldShowUnitsColumn:', hasUnits, 'Categories:', Object.keys(paramGrouped));
      console.log('📊 All units in grouped params:', Object.entries(paramGrouped).flatMap(([cat, params]: any) => 
        (params as any[]).map(p => ({ param: p.parameterName, unit: p.units || '(empty)', category: cat }))
      ));
      return hasUnits;
    } catch (e) {
      console.error('Error in shouldShowUnitsColumn:', e);
      return false;
    }
  };

  const shouldShowReferenceRangeColumn = (paramGrouped = groupedParameters) => {
    try {
      if (!paramGrouped || Object.keys(paramGrouped).length === 0) return false;
      
      const hasRange = Object.values(paramGrouped).some((categoryParams: any) =>
        (categoryParams as any[]).some(param => {
          if (param.type === 'Text' || param.isDescriptive) return false; // Don't show for text/descriptive
          const rangeStr = getAgeAppropriateRange(param, patientData?.patient?.age, patientData?.patient?.gender, patientData?.patient?.dob);
          // Only return true if range has actual content
          return rangeStr && rangeStr.trim() !== '' && rangeStr !== '-' && rangeStr !== param.normalRange?.trim?.();
        })
      );
      console.log('🔍 shouldShowReferenceRangeColumn:', hasRange);
      return hasRange;
    } catch (e) {
      console.error('Error in shouldShowReferenceRangeColumn:', e);
      return false;
    }
  };

  // Helper to check if text contains HTML
  const hasHtmlTags = (text: string) => {
    if (!text) return false;
    const hasHtml = /<[^>]*>/.test(text);
    if (hasHtml) console.log('✅ HTML detected in:', text.substring(0, 50));
    return hasHtml;
  };

  // Helper to decode HTML entities
  const decodeHtmlEntities = (text: string) => {
    if (!text) return '';
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  };

  // Helper to sanitize and clean HTML display
  const sanitizeHtml = (html: string) => {
    if (!html) return '';
    // Decode entities first
    let decoded = decodeHtmlEntities(html);
    // Remove script tags for safety
    return decoded.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
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
        
        // DEBUG: Log interpretation from backend
        console.log('✅ Patient Test Data Received:');
        console.log('   Test Name:', data.patientTest.test?.name);
        console.log('   Has Interpretation:', !!data.patientTest.test?.interpretation);
        console.log('   Interpretation Length:', data.patientTest.test?.interpretation?.length || 0);
        console.log('   Interpretation Preview:', data.patientTest.test?.interpretation?.substring(0, 100) || '(empty)');
        
        
        // 🔧 PART 2: Check if test is outsourced
        if (data.patientTest?.isOutsourced) {
          console.log(`⚠️ Test is outsourced to: ${data.patientTest.outsourcedTo}`);
          setIsOutsourced(true);
          setOutsourcedTo(data.patientTest.outsourcedTo);
          
          // Fetch outsourcing report if available
          try {
            const reportResponse = await fetch(`${API_BASE_URL}/results/outsourcing/${patientTestId}`);
            if (reportResponse.ok) {
              const reportData = await reportResponse.json();
              if (reportData?.success && reportData?.data) {
                setOutsourcingReport(reportData.data);
                console.log('✅ Outsourcing report fetched:', reportData.data);
              }
            }
          } catch (reportError) {
            console.warn('⚠️ Could not fetch outsourcing report:', reportError);
          }
          
          // Return early - don't load parameters for outsourced tests
          setParameters([]);
          setGroupedParameters({});
          setResults({});
          return;
        }
        
        setIsOutsourced(false);
        setOutsourcedTo(null);
        
        setParameters(data.parameters);
        setGroupedParameters(data.groupedParameters);
        
        // DEBUG: Log units from backend
        console.log('✅ Fetched parameters from backend:');
        console.table(data.parameters.map(p => ({
          name: p.parameterName,
          units: p.units,
          type: p.type,
          category: p.categoryName
        })));
        const initialResults = {};
        data.parameters.forEach(param => {
          if (param.existingResult) {
            initialResults[param.id] = {
              numericValue: param.existingResult.numericValue,
              textValue: param.existingResult.textValue,
              selectedOption: param.existingResult.selectedOption,
              isAbnormal: param.existingResult.isAbnormal,
              referenceRange: param.existingResult.referenceRange,
              isHighlighted: param.existingResult.isHighlighted || false
            };
          } else {
            initialResults[param.id] = { numericValue: null, textValue: param.textContent || '', selectedOption: '', isAbnormal: false, referenceRange: param.normalRange, isHighlighted: false };
          }
        });
        setResults(initialResults);

        // Auto set to next status when page is opened (if still RECEIVED)
        if (data.patientTest.status === 'RECEIVED') {
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
                referenceRange: param.existingResult.referenceRange,
                isHighlighted: param.existingResult.isHighlighted || false
              };
            } else {
              initialResults[paramKey] = { numericValue: null, textValue: param.textContent || '', selectedOption: '', isAbnormal: false, referenceRange: param.normalRange, isHighlighted: false };
            }
          });
        }
      });
      setResults(initialResults);

      // Auto-transition all tests to next status
      await Promise.all(
        validTests.map(testData => {
          if (testData.patientTest.status === 'RECEIVED') {
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

  // Fetch templates for all tests when data loads
  // Also auto-transition to VALIDATED if only 1 template exists
  useEffect(() => {
    if (allTestsData && allTestsData.length > 0) {
      // Multiple tests - fetch templates for all
      const testIds = allTestsData.map(td => td.patientTest.testId);
      if (testIds.length > 0) {
        fetchTemplatesForTests(testIds);
        
        // Check each test and auto-transition if only 1 template exists
        testIds.forEach(testId => {
          setTimeout(() => {
            const templates = getTemplates(testId)?.templates || [];
            if (templates.length === 1) {
              console.log(`📋 Test ${testId} has only 1 template, auto-transitioning to VALIDATION stage (skipping ENTERED)...`);
              // Auto-transition to VALIDATION (skip ENTERED) if only 1 template
              const testData = allTestsData.find(td => td.patientTest.testId === testId);
              if (testData?.patientTest?.status === 'RECEIVED') {
                updateTestStatus(testData.patientTest.id, { status: 'VALIDATED' }).catch(err => 
                  console.error('Error auto-transitioning to VALIDATION:', err)
                );
              }
            }
          }, 500);
        });
      }
    } else if (patientData && patientData.testId) {
      // Single test - fetch template
      fetchTemplatesForTests([patientData.testId]);
      
      // Check and auto-transition if only 1 template exists
      setTimeout(() => {
        const templates = getTemplates(patientData.testId)?.templates || [];
        if (templates.length === 1) {
          console.log(`📋 Test ${patientData.testId} has only 1 template, auto-transitioning to VALIDATION stage (skipping ENTERED)...`);
          if (patientData.status === 'RECEIVED') {
            updateTestStatus(patientData.id, { status: 'VALIDATED' }).catch(err => 
              console.error('Error auto-transitioning to VALIDATION:', err)
            );
          }
        }
      }, 500);
    }
  }, [patientData, allTestsData, fetchTemplatesForTests, getTemplates]);

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

  const handleHighlightChange = (parameterId: any) => {
    setResults(prev => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        isHighlighted: !prev[parameterId]?.isHighlighted,
        isAbnormal: !prev[parameterId]?.isHighlighted // When highlight is toggled ON, set isAbnormal to true; when OFF, set to false
      }
    }));
  };

  // Handle template selection - populate editor with template values
  const handleTemplateSelect = (template: any, testId: number, isSingleTest: boolean = true) => {
    try {
      console.log('📋 Template selected:', template);
      console.log('📋 Template parameters:', template.parameters);
      
      if (!template?.parameters) {
        console.warn('⚠️ Template has no parameters');
        console.warn('Cannot populate - template has no parameters');
        return;
      }

      // Ensure parameters is an array
      let templateParams = template.parameters;
      if (typeof templateParams === 'string') {
        try {
          templateParams = JSON.parse(templateParams);
        } catch (e) {
          console.warn('⚠️ Could not parse template parameters:', e);
          console.warn('Template parameters are in invalid format');
          return;
        }
      }

      if (!Array.isArray(templateParams)) {
        console.warn('⚠️ Template parameters is not an array:', templateParams);
        console.warn('Template has no valid parameters to populate');
        return;
      }

      console.log('✅ Template parameters (parsed):', templateParams);

      // Create a mapping from parameter ID to template value
      const templateValueMap = {};
      templateParams.forEach((param: any) => {
        console.log(`Processing template param:`, param);
        
        // param object structure: { id, name, value }
        // value can be numeric, text, or HTML content
        const paramId = param.id;
        let numericValue: number | null = null;
        let textValue = '';

        // Check if value is numeric
        if (param.value) {
          const numParsed = parseFloat(param.value);
          if (!isNaN(numParsed) && param.value.toString().trim() !== '') {
            numericValue = numParsed;
            console.log(`Parameter ${paramId}: numeric value = ${numericValue}`);
          } else {
            // It's text/HTML content
            textValue = param.value;
            console.log(`Parameter ${paramId}: text value = ${textValue.substring(0, 50)}...`);
          }
        }

        templateValueMap[paramId] = {
          numericValue: numericValue,
          textValue: textValue,
          isAbnormal: false,
          referenceRange: param.unit || param.referenceRange || ''
        };
      });

      console.log('📊 Template value map:', templateValueMap);

      // If single test: update results directly
      if (isSingleTest && parameters.length > 0) {
        setResults(prev => {
          const updated = { ...prev };
          parameters.forEach(param => {
            if (templateValueMap[param.id]) {
              console.log(`Updating single test param ${param.id}:`, templateValueMap[param.id]);
              updated[param.id] = templateValueMap[param.id];
            }
          });
          return updated;
        });
        console.log('✅ Single test editor populated with template values');
      } else if (!isSingleTest && allTestsData.length > 0) {
        // For multiple tests: find the correct test and update its parameters
        const testIdx = allTestsData.findIndex(td => td.patientTest.testId === testId);
        if (testIdx === -1) {
          console.warn('⚠️ Test not found in allTestsData');
          return;
        }

        const testData = allTestsData[testIdx];
        const testIdStr = multipleTestIds[testIdx];
        
        setResults(prev => {
          const updated = { ...prev };
          testData.parameters.forEach((param: any) => {
            const paramKey = `${testIdStr}_${param.id}`;
            if (templateValueMap[param.id]) {
              console.log(`Updating multiple test param ${paramKey}:`, templateValueMap[param.id]);
              updated[paramKey] = templateValueMap[param.id];
            }
          });
          return updated;
        });
        console.log('✅ Multiple test editor populated with template values');
      }

      // No alert - silently populate the template
      console.log(`✅ Template "${template.templateName}" loaded successfully with ${templateParams.length} parameter(s)`);
    } catch (error) {
      console.error('❌ Error loading template:', error);
      // No alert on error either - just log it
      console.error('Failed to load template: ' + error.message);
    }
  };

  // Save results - same as existing handleSave but reusable
  const performSave = async (isMultipleTests: boolean = false) => {
    try {
      setSaving(true);
      
      if (isMultipleTests) {
        await handleSaveAllTests();
      } else {
        await handleSave();
      }
      
      return true;
    } catch (error) {
      console.error('Error saving:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Save results - same as existing handleSave but reusable
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
              isHighlighted: results[paramKey]?.isHighlighted || false,
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
        isHighlighted: results[param.id]?.isHighlighted || false,
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
        // Save comments if provided
        if (showComment && comments.trim()) {
          try {
            await updatePatientComments(patientData.id, comments);
            console.log('✅ Comments saved successfully');
          } catch (error) {
            console.error('⚠️ Error saving comments:', error);
            alert('Results saved, but failed to save comments');
          }
        }
        
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
        isHighlighted: results[param.id]?.isHighlighted || false,
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
    if (printWindow) {
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
    }
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

        {/* 🔧 PART 2: Handle Outsourced Tests - Show import UI instead of parameter entry */}
        {isOutsourced && (
          <div className="mt-4 bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 text-center">
            <div className="text-2xl mb-2">⚠️ OUTSOURCED TEST</div>
            <p className="text-lg font-semibold text-gray-800 mb-4">
              This test has been outsourced to: <span className="text-yellow-700 font-bold">{outsourcedTo}</span>
            </p>
            <p className="text-gray-600 mb-6">
              Instead of entering parameters manually, you need to import the report from the outsourcing lab.
            </p>
            
            {/* Show report summary if available */}
            {outsourcingReport && (
              <div className="bg-white p-4 rounded border border-gray-300 mb-6 text-left">
                <p className="font-semibold mb-2">📋 Imported Report Details:</p>
                <p className="text-sm text-gray-700 mb-1">
                  <b>Lab:</b> {outsourcingReport.outsourcingLab?.labName}
                </p>
                <p className="text-sm text-gray-700 mb-1">
                  <b>Imported At:</b> {new Date(outsourcingReport.importedAt).toLocaleString('en-GB')}
                </p>
                {outsourcingReport.reportFileUrl && (
                  <p className="text-sm text-gray-700">
                    <b>Report File:</b> <a href={outsourcingReport.reportFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                  </p>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => router.push(`/result/outsourcing-import/${patientTestId}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
              >
                📥 Import Report
              </button>
              <button
                onClick={() => router.back()}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Normal parameter entry form - only show if NOT outsourced */}
        {!isOutsourced && (
        <>
        {/* For Multiple Tests */}
        {allTestsData.length > 0 ? (
          <div className="space-y-8">
            {allTestsData.map((testData, testIdx) => (
              <div key={testIdx}>
                {/* Test Name */}
                <div className="mt-2 bg-primary-600 text-white p-2 font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{testIdx + 1}. {testData.patientTest.test.name}</span>
                    {/* Template dropdown - only show if templates exist */}
                    {(() => {
                      const tpl = getTemplates(testData.patientTest.testId);
                      return tpl?.templates && tpl.templates.length > 0 && (
                        <InlineTemplateSelector
                          testId={testData.patientTest.testId}
                          testName={testData.patientTest.test.name}
                          templates={tpl.templates}
                          isLoadingTemplates={tpl?.loading || false}
                          onTemplateSelect={(template) => {
                            handleTemplateSelect(template, testData.patientTest.testId, false);
                          }}
                        />
                      );
                    })()}
                  </div>
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
                        <th className="border p-2 text-center" style={{width: '40px'}}>HIGHLIGHT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(testData.groupedParameters || {})
                        .sort(([, paramsA]: any, [, paramsB]: any) => (paramsA[0]?.categorySortOrder ?? 999) - (paramsB[0]?.categorySortOrder ?? 999))
                        .map(([categoryKey, categoryParams]: [string, any]) => (
                        <React.Fragment key={categoryKey}>
                          {categoryKey !== 'NO_CATEGORY_HEADER' && !categoryKey.startsWith('__NO_NAME_') && categoryParams[0]?.showCategoryHeader && (
                            <tr className="bg-gray-200 font-semibold"><td colSpan={5} className="p-2">{stripHtmlTags(categoryParams[0]?.categoryName || '').toUpperCase()}</td></tr>
                          )}
                          {(categoryParams as any[]).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)).map((param) => {
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
                                <td className="border p-2">{(param.parameterName || '').toUpperCase()}</td>
                                <td className="border p-2">
                                  <div className="flex items-center gap-2">
                                    {param.type === 'Numeric' ? (
                                      <input
                                        type="text"
                                        value={results[paramKey]?.numericValue || ''}
                                        onChange={(e) => handleResultChange(paramKey, 'numericValue', e.target.value, testData.parameters)}
                                        disabled={isFormula}
                                        className={`${results[paramKey]?.isHighlighted ? 'border-2 border-red-500 bg-red-50' : inputClass} px-2 py-1 w-24 rounded`}
                                      />
                                    ) : param.isDescriptive ? (
                                      <div className="border border-gray-300 rounded min-h-[150px]">
                                        <CKEditor
                                          editor={ClassicEditor as any}
                                          data={results[paramKey]?.textValue || ''}
                                          onChange={(_, editor) => {
                                            const data = editor.getData();
                                            handleResultChange(paramKey, 'textValue', data, testData.parameters);
                                          }}
                                          config={{
                                            toolbar: [
                                              'heading', '|',
                                              'bold', 'italic', 'underline', '|',
                                              'fontSize', 'fontColor', '|',
                                              'bulletedList', 'numberedList', '|',
                                              'link', 'blockQuote', '|',
                                              'undo', 'redo'
                                            ]
                                          }}
                                        />
                                      </div>
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
                                    {(() => {
                                      const indicator = getRangeIndicator(param, results[paramKey]?.numericValue);
                                      return indicator ? <span className={`font-bold text-xs ${indicator.color}`} title={indicator.title}>{indicator.icon}</span> : null;
                                    })()}
                                  </div>
                                </td>
                                <td className="border p-2 text-xs">{param.units || '-'}</td>
                                <td className="border p-2 text-xs">{getAgeAppropriateRange(param, patientData.patient?.age, patientData.patient?.gender, patientData.patient?.dob)}</td>
                                <td className="border p-2 text-center" style={{width: '40px'}}>
                                  <input 
                                    type="checkbox" 
                                    checked={results[paramKey]?.isHighlighted || false}
                                    onChange={() => {
                                      handleHighlightChange(paramKey);
                                    }}
                                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                                    title="Check to highlight this value bold in report"
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
            <div className="mt-2 bg-primary-600 text-white p-2 font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{patientData.test.name}</span>
                {/* Template dropdown - only show if templates exist */}
                {(() => {
                  const tpl = getTemplates(patientData.testId);
                  return tpl?.templates && tpl.templates.length > 0 && (
                    <InlineTemplateSelector
                      testId={patientData.testId}
                      testName={patientData.test.name}
                      templates={tpl.templates}
                      isLoadingTemplates={tpl?.loading || false}
                      onTemplateSelect={(template) => {
                        handleTemplateSelect(template, patientData.testId, true);
                      }}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Results Table - Single Test */}
            <div className="mt-3 bg-white border">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-secondary-700 text-white">
                  <tr>
                    <th className="border p-2 text-left">INVESTIGATION</th>
                    <th className="border p-2 text-left">OBSERVED VALUE</th>
                    <th className="border p-2 text-left">UNITS</th>
                    <th className="border p-2 text-left">NORMAL RANGE</th>
                    <th className="border p-2 text-center" style={{width: '40px'}}>HIGHLIGHT</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedParameters)
                    .sort(([, paramsA]: any, [, paramsB]: any) => (paramsA[0]?.categorySortOrder ?? 999) - (paramsB[0]?.categorySortOrder ?? 999))
                    .map(([categoryKey, categoryParams]: [string, any]) => (
                    <React.Fragment key={categoryKey}>
                      {categoryKey !== 'NO_CATEGORY_HEADER' && !categoryKey.startsWith('__NO_NAME_') && categoryParams[0]?.showCategoryHeader && (
                        <tr className="bg-gray-200 font-semibold"><td colSpan={5} className="p-2">{renderStyledText((categoryParams[0]?.categoryName || '').toUpperCase(), true)}</td></tr>
                      )}
                      {(categoryParams as any[]).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)).map((param) => {
                        const outOfRange = isValueOutOfRange(param, results[param.id]?.numericValue);
                        const isFormula = param.hasFormula && param.formula;
                        const inputClass = outOfRange ? "border-2 border-red-500 bg-red-50 px-2 py-1 w-24 rounded" : "border border-gray-300 px-2 py-1 w-24 rounded";
                        return (
                          <tr key={param.id} className="bg-purple-100">
                            <td className="border p-2">{renderStyledText((param.parameterName || '').toUpperCase(), false)}{param.isMandatory && <span className="text-red-500">*</span>}</td>
                            <td className="border p-2">
                              <div className="flex items-center gap-2">
                                {isFormula ? (
                                  <div className="flex items-center gap-1">
                                    <input type="text" readOnly value={results[param.id]?.numericValue ?? ''} className={`${inputClass} bg-green-50 border-green-400 cursor-not-allowed`} title={`Auto-calculated: ${param.formula}`} />
                                    <span className="text-xs text-green-700 italic">auto</span>
                                  </div>
                                ) : param.type === 'Numeric' ? (
                                  <input type="text" value={results[param.id]?.numericValue ?? ''} onChange={(e) => handleResultChange(param.id, 'numericValue', e.target.value === '' ? null : e.target.value, parameters)} className={`${results[param.id]?.isHighlighted ? 'border-2 border-red-500 bg-red-50' : inputClass} px-2 py-1 w-24 rounded`} placeholder="e.g., 7.5, <7.5 or >140" />
                                ) : param.isDescriptive ? (
                                  <div className="border border-gray-300 rounded min-h-[150px]">
                                    <CKEditor
                                      editor={ClassicEditor as any}
                                      data={results[param.id]?.textValue || ''}
                                      onChange={(_, editor) => {
                                        const data = editor.getData();
                                        handleResultChange(param.id, 'textValue', data, parameters);
                                      }}
                                      config={{
                                        toolbar: [
                                          'heading', '|',
                                          'bold', 'italic', 'underline', '|',
                                          'fontSize', 'fontColor', '|',
                                          'bulletedList', 'numberedList', '|',
                                          'link', 'blockQuote', '|',
                                          'undo', 'redo'
                                        ]
                                      }}
                                    />
                                  </div>
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
                                {(() => {
                                  const indicator = getRangeIndicator(param, results[param.id]?.numericValue);
                                  return indicator ? <span className={`font-bold text-xs ${indicator.color}`} title={indicator.title}>{indicator.icon}</span> : null;
                                })()}
                              </div>
                            </td>
                            <td className="border p-2 text-xs">
                              {(() => {
                                const unitValue = stripHtmlTags(param.units || '') || '-';
                                console.log(`🔍 Rendering UNITS for ${param.parameterName}: "${unitValue}"`);
                                return unitValue;
                              })()}
                            </td>
                            <td className="border p-2">{param.type === 'Text' || param.isDescriptive ? stripHtmlTags(param.normalRange || '') : stripHtmlTags(getAgeAppropriateRange(param, patientData.patient.age, patientData.patient.gender, patientData.patient.dob) || '')}</td>
                            <td className="border p-2 text-center" style={{width: '40px'}}>
                              <input 
                                type="checkbox" 
                                checked={results[param.id]?.isHighlighted || false}
                                onChange={() => {
                                  handleHighlightChange(param.id);
                                }}
                                className="w-5 h-5 accent-blue-600 cursor-pointer"
                                title="Check to highlight this value bold in report"
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
                <label htmlFor="show-comment" className="text-sm text-gray-700 cursor-pointer">Add Comments/Notes</label>
              </div>
              
              {/* Comments Text Area - Show when checkbox is checked */}
              {showComment && (
                <div className="mb-3">
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter comments or notes to be printed on the report..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-normal"
                    rows={4}
                  />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
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
                  #pr-report-page b, #pr-report-page strong { font-weight: bold !important; display: inline !important; }
                  #pr-report-page i, #pr-report-page em { font-style: italic !important; display: inline !important; }
                  #pr-report-page u { text-decoration: underline !important; display: inline !important; }
                  #pr-report-page p { margin: 2px 0 !important; line-height: 1.4 !important; display: block !important; white-space: normal !important; }
                  #pr-report-page ul, #pr-report-page ol { margin: 2px 0 !important; padding-left: 20px !important; display: block !important; }
                  #pr-report-page li { margin: 2px 0 !important; display: list-item !important; }
                  #pr-report-page a { color: #0066cc !important; text-decoration: underline !important; display: inline !important; }
                  #pr-report-page td > div { white-space: normal !important; word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; }
                  #pr-report-page td > div * { white-space: normal !important; }
                  #pr-report-page h1, #pr-report-page h2, #pr-report-page h3, #pr-report-page h4, #pr-report-page h5, #pr-report-page h6 { margin: 4px 0 !important; font-weight: bold !important; display: block !important; }
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
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '30%' : '50%' }}>Test Description</th>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px 4px 20px', textAlign: 'left', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '28%' : '50%' }}>Result</th>
                          {shouldShowUnitsColumn() && (
                            <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '12%' }}>Unit</th>
                          )}
                          {shouldShowReferenceRangeColumn() && (
                            <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '30%' }}>Biological Reference Range</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? (shouldShowUnitsColumn() && shouldShowReferenceRangeColumn() ? 4 : 3) : 2} style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>{patientData.test.name}</td>
                        </tr>
                        {Object.entries(groupedParameters).map(([categoryName, categoryParams]: [string, any]) => {
                          // Filter parameters: only show those with values
                          const paramsWithValues = (categoryParams as any[]).filter(param => {
                            const numVal = results[param.id]?.numericValue;
                            const textVal = results[param.id]?.textValue;
                            const hasNumeric = numVal !== null && numVal !== undefined && numVal !== '';
                            const hasText = textVal && textVal.trim() !== '';
                            return hasNumeric || hasText;
                          });

                          // If no parameters with values, skip this category
                          if (paramsWithValues.length === 0) return null;

                          return (
                            <React.Fragment key={categoryName}>
                              {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                                <tr><td colSpan={shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? (shouldShowUnitsColumn() && shouldShowReferenceRangeColumn() ? 4 : 3) : 2} style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>{stripHtmlTags(categoryName || '').toUpperCase()}</td></tr>
                              )}
                              {paramsWithValues.map((param) => {
                                const numVal = results[param.id]?.numericValue;
                                const textVal = results[param.id]?.textValue;
                                const isAbn = results[param.id]?.isAbnormal === true || results[param.id]?.isAbnormal === 1 || isValueOutOfRange(param, numVal);
                                
                                // For text parameters: show only the selected value (first tag/item), not the full text
                                let displayValue = '-';
                                if (param.type === 'Numeric') {
                                  displayValue = numVal !== null && numVal !== undefined ? numVal : '-';
                                } else if (textVal) {
                                  // If it's a comma/comma-separated list, show only first value
                                  const firstValue = textVal.split(',')[0].trim();
                                  displayValue = firstValue || '-';
                                }
                                
                                // Get reference range - only numeric value for numeric params
                                const rangeStr = shouldShowReferenceRangeColumn() ? getAgeAppropriateRange(param, patientData.patient.age, patientData.patient.gender, patientData.patient.dob) : '';
                                
                                return (
                                  <tr key={param.id}>
                                    <td style={{ padding: '3px 6px', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '30%' : '50%', fontWeight: isAbn ? 'bold' : 'normal' }}>{stripHtmlTags(param.parameterName || '')}</td>
                                    <td style={{ padding: '3px 6px 3px 20px', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '28%' : '50%', fontWeight: isAbn ? '900' : 'normal', color: isAbn ? '#b91c1c' : 'inherit', fontSize: '11px', whiteSpace: 'normal', wordWrap: 'break-word', textAlign: 'right' }}>
                                      {param.isDescriptive && displayValue !== '-' && hasHtmlTags(displayValue) ? (
                                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayValue) }} style={{ margin: 0, whiteSpace: 'normal' }} />
                                      ) : (
                                        <>{displayValue}{isAbn && ' *'}</>
                                      )}
                                    </td>
                                    {shouldShowUnitsColumn() && (
                                      <td style={{ padding: '3px 6px', width: '12%', textAlign: 'center' }}>{stripHtmlTags(param.units || '') || '-'}</td>
                                    )}
                                    {shouldShowReferenceRangeColumn() && (
                                      <td style={{ padding: '3px 6px', width: '30%' }}>
                                        {param.type === 'Numeric' || param.type === 'Text' ? stripHtmlTags(rangeStr || '') : stripHtmlTags(rangeStr || '')}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Interpretation */}
                    {patientData.test.interpretation && (
                      <div style={{ marginTop: '6mm', borderTop: '1.5px solid #333', paddingTop: '4mm', fontSize: '11px', color: '#444', lineHeight: '1.5' }}>
                        <strong style={{ display: 'block', marginBottom: '2mm', textDecoration: 'underline' }}>INTERPRETATION:</strong>
                        <div dangerouslySetInnerHTML={{ __html: patientData.test.interpretation }} />
                      </div>
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
                  const src = attachedFileUrl || `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api','')}${patientData.attachmentPath}`;
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
        </>
        )}
      </div>

    </>
  );
};

export default PatientResult;
