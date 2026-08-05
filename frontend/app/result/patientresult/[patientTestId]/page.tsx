"use client";

// Fixed API URL integration for backend communication
import { useRouter, useParams, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";

import Header from "@/src/components/Header";
import BarcodeModal, { generateBarcodeLabels, getSampleTypeId, getSampleTypeName, getTestName } from "@/app/components/BarcodeModal";
import { getPatientTestById, updateTestStatus, updatePatientComments, deleteCommentFromHistory } from "@/src/api/result.js";
import API_BASE_URL from "@/src/api/config";
import { useTestTemplates } from '@/src/hooks/useTestTemplates';
import InlineTemplateSelector from '@/app/components/InlineTemplateSelector';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { parseHtmlText, stripHtmlTags, HtmlPart } from '@/src/utils/htmlParser';
const LetterHead = "/LetterHead.jpeg";

// Plain text area with suggestion dropdown and formatting support
// Text can be edited directly, formatted with Ctrl+B for bold
// Shows [bold text] with visual formatting in report
// Ctrl+B to make selected text bold
// Resizable with drag handle - arrow on right side indicates panic direction
const SuggestionInput = ({ value, onChange, options, isAbnormal, panicInfo }) => {
  const [show, setShow] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [customSize, setCustomSize] = useState({ width: 150, height: 30 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef(null);
  const ref = useRef(null);
  const arrowRef = useRef(null);

  console.log(`🎨 SuggestionInput rendered with isAbnormal=${isAbnormal}, panicInfo=`, panicInfo);

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const rect = (containerRef.current as HTMLElement).getBoundingClientRect();
      const newWidth = Math.max(80, e.clientX - rect.left);
      const newHeight = Math.max(30, e.clientY - rect.top);
      
      setCustomSize({
        width: Math.min(newWidth, 400),
        height: Math.min(newHeight, 250)
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  useEffect(() => {
    const handler = (e: any) => { if (ref.current && !(ref.current as HTMLElement).contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter options based on search input
  const filtered = searchInput
    ? options.filter(o => o.toLowerCase().includes(searchInput.toLowerCase()) && !value?.includes(o))
    : options.filter(o => !value?.includes(o));

  // Handle selecting option from dropdown
  const addOption = (opt: any) => {
    const currentValue = value ? value.trim() : '';
    const newValue = currentValue ? `${currentValue}, ${opt}` : opt;
    onChange(newValue);
    setSearchInput('');
    setShow(false);
    textareaRef.current?.focus();
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSearchInput(newValue.split(',').pop()?.trim() || '');
    // Show suggestions if there's any input
    setShow(true);
  };

  // Handle Ctrl+B for bold formatting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      
      if (start === end) return; // No text selected

      const selectedText = value?.substring(start, end) || '';
      const beforeText = value?.substring(0, start) || '';
      const afterText = value?.substring(end) || '';
      
      // Wrap with <b> tags for actual bold in report
      const formattedText = beforeText + `<b>${selectedText}</b>` + afterText;
      onChange(formattedText);

      // Restore cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 3; // +3 for "<b>"
          textareaRef.current.selectionEnd = start + 3 + selectedText.length;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Determine panic direction indicator
  const getPanicIndicator = () => {
    if (!isAbnormal || !panicInfo) return null;
    return panicInfo.value < panicInfo.lowPanic ? '↓' : '↑';
  };

  const indicator = getPanicIndicator();
  
  // Get tooltip message based on panic direction
  const getTooltipMessage = () => {
    if (!indicator || !panicInfo) return '';
    if (indicator === '↓') {
      return `Lower Range: ${panicInfo.lowPanic}`;
    } else {
      return `Higher Range: ${panicInfo.highPanic}`;
    }
  };

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      {/* Resizable container */}
      <div 
        ref={containerRef}
        className={`border rounded relative ${isAbnormal ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"}`}
        style={{
          width: `${customSize.width}px`,
          height: `${customSize.height}px`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShow(true)}
          placeholder="Type or select..."
          className="outline-none text-xs bg-transparent text-black resize-none font-sans border-none flex-1 p-2"
          style={{
            fontSize: '12px',
            lineHeight: '1.5',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
          title="Ctrl+B to bold selected text | Drag resize handle to adjust size"
        />

        {/* Resize handle at bottom-right */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className="absolute bottom-0 right-0 w-4 h-4 bg-gradient-to-tl from-gray-400 to-transparent cursor-se-resize rounded-tl"
          style={{
            cursor: 'nwse-resize',
            zIndex: 10
          }}
          title="Drag to resize (expand/minimize)"
        />
      </div>

      {/* ✅ Panic indicator arrow at right side with tooltip */}
      {indicator && (
        <div 
          ref={arrowRef}
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-sm font-bold text-white cursor-help ${indicator === '↓' ? 'bg-blue-600' : 'bg-red-600'}`}>
            {indicator}
          </div>
          
          {/* Tooltip on hover */}
          {showTooltip && (
            <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
              {getTooltipMessage()}
              {/* Tooltip arrow pointing down */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent border-t-gray-800"></div>
            </div>
          )}
        </div>
      )}

      {/* Dropdown with option suggestions */}
      {show && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto text-sm" style={{ width: `${customSize.width}px` }}>
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={() => addOption(opt)}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-800 border-b last:border-b-0 transition-colors text-xs"
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
  const [commentHistory, setCommentHistory] = useState<string[]>([]);
  const [showCommentDropdown, setShowCommentDropdown] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  
  // ✅ Per-test comment state for multiple tests to prevent dropdown interference
  const [testComments, setTestComments] = useState<{ [testIdx: number]: string }>({});
  const [testCommentFocused, setTestCommentFocused] = useState<{ [testIdx: number]: boolean }>({});
  const [testShowComment, setTestShowComment] = useState<{ [testIdx: number]: boolean }>({});
  
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

  // ✅ State for tracking which auto-calculated fields are in edit mode
  const [editingFormulaFields, setEditingFormulaFields] = useState<Set<number>>(new Set());

  const calculateAge = (dob: any) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  // ✅ Format age from Int fields into human-readable string with different formats based on age
  const formatAgeFromFields = (ageYears?: number, ageMonths?: number, ageDays?: number): string => {
    const years = ageYears ?? 0;
    const months = ageMonths ?? 0;
    const days = ageDays ?? 0;
    
    // If all are 0 or null, return dash
    if (years === 0 && months === 0 && days === 0) return '-';
    
    // Under 1 year: show only months and days (e.g., "3M 12D")
    if (years === 0) {
      let result = '';
      if (months > 0) result += `${months}M`;
      if (days > 0) result += (result ? ' ' : '') + `${days}D`;
      return result.trim() || '-';
    }
    
    // 1 to 12 years: show years, months, and days (e.g., "4Y 3M 15D")
    if (years < 12) {
      let result = '';
      if (years > 0) result += `${years}Y`;
      if (months > 0) result += (result ? ' ' : '') + `${months}M`;
      if (days > 0) result += (result ? ' ' : '') + `${days}D`;
      return result.trim() || '-';
    }
    
    // 12 years and above: show as decimal (e.g., "12.6")
    const decimalAge = (years + months / 12).toFixed(1);
    return decimalAge;
  };

  const getAgeInUnit = (years, months, days, timeUnit) => {
    switch (timeUnit) {
      case 'Day(s)': return days;
      case 'Month(s)': return months;
      case 'Year(s)': return years;
      default: return years;
    }
  };

  // Helper function to extract numeric age from formatted age string
  // Converts "1 month 3 days" to { years: 0, months: 1, days: 3 }
  // Or just "30" to { years: 30, months: 0, days: 0 }
  const parseFormattedAge = (ageValue: any) => {
    if (!ageValue) return { years: 0, months: 0, days: 0 };
    
    // If it's a number or numeric string, return it as years
    const numericAge = parseInt(ageValue);
    if (!isNaN(numericAge)) {
      return { years: numericAge, months: 0, days: 0 };
    }
    
    // If it's a formatted string like "1 month 3 days"
    if (typeof ageValue === 'string') {
      const result = { years: 0, months: 0, days: 0 };
      
      // Extract months: "X month(s)"
      const monthMatch = ageValue.match(/(\d+)\s+months?/i);
      if (monthMatch) result.months = parseInt(monthMatch[1]);
      
      // Extract days: "X day(s)"
      const dayMatch = ageValue.match(/(\d+)\s+days?/i);
      if (dayMatch) result.days = parseInt(dayMatch[1]);
      
      return result;
    }
    
    return { years: 0, months: 0, days: 0 };
  };

  const getAgeAppropriateRange = (parameter, ageYears, ageMonths, ageDays, patientGender) => {
    if (!parameter) return '';
    if (parameter.type === 'Text' || parameter.isDescriptive)
      return parameter.textContent || parameter.normalRange || '';
    
    // Use the new Int age fields directly - they're already calculated and accurate
    const exactAgeInYears = ageYears ?? 0;
    const exactAgeInMonths = ageMonths ?? 0;
    const exactAgeInDays = ageDays ?? 0;
    
    const gender = patientGender?.toLowerCase();
    
    // 🔴 DEBUG: Log ALL parameters being checked
    console.log(`🔍 getAgeAppropriateRange DEBUG:`);
    console.log(`   Parameter: ${parameter.parameterName}`);
    console.log(`   Patient Age: ${exactAgeInYears}Y ${exactAgeInMonths}M ${exactAgeInDays}D`);
    console.log(`   Patient Gender: ${gender}`);
    console.log(`   Range Type: ${parameter.rangeType}`);
    console.log(`   Age Ranges JSON: ${parameter.ageRanges}`);
    
    // ✅ Check complex age ranges first
    if (parameter.ageRanges) {
      try {
        const ageRanges = JSON.parse(parameter.ageRanges);
        console.log(`   ✅ Parsed ageRanges:`, ageRanges);
        for (const range of ageRanges) {
          if (!range.enabled) continue;
          const rangeGender = range.gender?.toLowerCase();
          // Skip if gender doesn't match, unless it's 'both' (which applies to all)
          if (rangeGender && rangeGender !== 'both' && rangeGender !== gender) continue;
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
          
          if (ageMatches && range.ll != null && range.ul != null) {
            console.log(`✅ Matched age range: ${range.label} (${range.ll} - ${range.ul})`);
            return `${range.ll} - ${range.ul}`;
          }
        }
      } catch (e) { console.warn('Error parsing age ranges:', e); }
    }
    
    // ✅ Check gender and age-based ranges (BySex/ByGenderAndAge)
    console.log(`   Checking BySex/ByGenderAndAge...`);
    console.log(`   childActive: ${parameter.childActive}, childLowValue: ${parameter.childLowValue}, childHighValue: ${parameter.childHighValue}`);
    console.log(`   femaleActive: ${parameter.femaleActive}, femaleLowValue: ${parameter.femaleLowValue}, femaleHighValue: ${parameter.femaleHighValue}`);
    console.log(`   maleActive: ${parameter.maleActive}, maleLowValue: ${parameter.maleLowValue}, maleHighValue: ${parameter.maleHighValue}`);
    
    if (parameter.rangeType === 'BySex' || parameter.rangeType === 'ByGenderAndAge') {
      // Child range (age < 18) - highest priority for children
      if (exactAgeInYears < 18 && parameter.childActive && parameter.childLowValue != null && parameter.childHighValue != null) {
        console.log(`✅ Applied CHILD range: ${parameter.childLowValue} - ${parameter.childHighValue}`);
        return `${parameter.childLowValue} - ${parameter.childHighValue}`;
      }
      
      // Adult ranges (age >= 18) - match by gender
      if (exactAgeInYears >= 18) {
        // Check patient's actual gender
        if (gender === 'female' && parameter.femaleActive && parameter.femaleLowValue != null && parameter.femaleHighValue != null) {
          console.log(`✅ Applied FEMALE range (gender match): ${parameter.femaleLowValue} - ${parameter.femaleHighValue}`);
          return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
        }
        if (gender === 'male' && parameter.maleActive && parameter.maleLowValue != null && parameter.maleHighValue != null) {
          console.log(`✅ Applied MALE range (gender match): ${parameter.maleLowValue} - ${parameter.maleHighValue}`);
          return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
        }
        
        // If gender doesn't match male/female, try both with priority to male
        if (!['male', 'female'].includes(gender)) {
          console.log(`⚠️ Gender is "${gender}" (not male/female), checking both ranges...`);
          if (parameter.maleActive && parameter.maleLowValue != null && parameter.maleHighValue != null) {
            console.log(`✅ Applied MALE range (fallback for non-standard gender): ${parameter.maleLowValue} - ${parameter.maleHighValue}`);
            return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
          }
          if (parameter.femaleActive && parameter.femaleLowValue != null && parameter.femaleHighValue != null) {
            console.log(`✅ Applied FEMALE range (fallback for non-standard gender): ${parameter.femaleLowValue} - ${parameter.femaleHighValue}`);
            return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
          }
        }
      }
    }
    
    // Fallback to any available range (in case rangeType is not BySex/ByGenderAndAge or conditions above didn't match)
    console.log(`   Checking final fallback ranges...`);
    
    // Try gender-specific ranges first regardless of rangeType
    if (gender === 'female' && parameter.femaleLowValue != null && parameter.femaleHighValue != null) {
      console.log(`✅ Using FEMALE range (final fallback): ${parameter.femaleLowValue} - ${parameter.femaleHighValue}`);
      return `${parameter.femaleLowValue} - ${parameter.femaleHighValue}`;
    }
    if (gender === 'male' && parameter.maleLowValue != null && parameter.maleHighValue != null) {
      console.log(`✅ Using MALE range (final fallback): ${parameter.maleLowValue} - ${parameter.maleHighValue}`);
      return `${parameter.maleLowValue} - ${parameter.maleHighValue}`;
    }
    
    // If no gender-specific range, try child range
    if (parameter.childLowValue != null && parameter.childHighValue != null) {
      console.log(`✅ Using CHILD range (final fallback): ${parameter.childLowValue} - ${parameter.childHighValue}`);
      return `${parameter.childLowValue} - ${parameter.childHighValue}`;
    }
    
    console.log(`❌ No matching range found, returning empty`);
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
    const rangeStr = getAgeAppropriateRange(param, patientData?.patient?.ageYears, patientData?.patient?.ageMonths, patientData?.patient?.ageDays, patientData?.patient?.gender);
    const range = parseRange(rangeStr);
    if (!range) return false;
    return parseFloat(numericValue) < range.low || parseFloat(numericValue) > range.high;
  };

  const getRangeIndicator = (param: any, numericValue: any) => {
    if (param.type !== 'Numeric' || numericValue === null || numericValue === undefined || numericValue === '') return null;
    const rangeStr = getAgeAppropriateRange(param, patientData?.patient?.ageYears, patientData?.patient?.ageMonths, patientData?.patient?.ageDays, patientData?.patient?.gender);
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
          const rangeStr = getAgeAppropriateRange(param, patientData?.patient?.ageYears, patientData?.patient?.ageMonths, patientData?.patient?.ageDays, patientData?.patient?.gender);
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

  // ✅ NEW: Helper function to round numeric value based on decimal places
  const roundToDecimal = (value, decimalPlaces = 2) => {
    if (value === null || value === undefined || value === '') return '';
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return value;
    const multiplier = Math.pow(10, decimalPlaces);
    return (Math.round(numValue * multiplier) / multiplier).toFixed(decimalPlaces);
  };

  // ✅ Fetch comment history for a patient
  const fetchCommentHistory = async (patientId?: string) => {
    try {
      // Fetch global comment history (system-wide)
      const url = `${API_BASE_URL}/results/history/comments`;
      
      console.log('🔄 Fetching global comment history from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ API response not ok:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      
      console.log('📥 Comment history response:', data);
      
      if (data.success && Array.isArray(data.data)) {
        setCommentHistory(data.data || []);
        console.log('✅ Comment history fetched, count:', data.data.length, 'items:', data.data);
      } else {
        console.warn('⚠️ Invalid response structure:', data);
        setCommentHistory([]);
      }
    } catch (error) {
      console.error('❌ Could not fetch comment history:', error);
      setCommentHistory([]);
    }
  };

  // ✅ Handle comment change and save immediately
  const handleCommentChange = async (newComments: string) => {
    setComments(newComments);
    
    // Save to database immediately if user is typing and there's content
    if (patientData?.id && newComments.trim()) {
      try {
        await updatePatientComments(patientData.id, newComments);
        console.log('✅ Comments auto-saved:', newComments);
        
        // Fetch comment history to show the new comment options
        await fetchCommentHistory();
      } catch (error) {
        console.error('⚠️ Error auto-saving comments:', error);
      }
    }
  };

  // ✅ Handle comment checkbox toggle
  const handleCommentCheckbox = (checked: boolean) => {
    setShowComment(checked);
    
    if (!checked) {
      // If unchecking, clear comments from database and local state
      setComments('');
      if (patientData?.id) {
        updatePatientComments(patientData.id, '').catch(error => {
          console.error('⚠️ Error clearing comments:', error);
        });
      }
    }
  };

  // ✅ Load existing comments when patient data loads
  useEffect(() => {
    if (patientData?.comments) {
      setComments(patientData.comments);
      setShowComment(true);  // ✅ Auto-check the comment checkbox if comments exist
      console.log('✅ Loaded existing comments:', patientData.comments);
    } else {
      setComments('');
      setShowComment(false);  // ✅ Uncheck if no comments
    }
  }, [patientData?.id]);

  // Detect if multiple tests or single test
  useEffect(() => {
    if (testIdsParam) {
      const ids = testIdsParam.split(',').filter(id => id.trim());
      setMultipleTestIds(ids);
    } else {
      setMultipleTestIds([]);
    }
    
    // Fetch global comment history on page load
    console.log('🔄 Page load - fetching global comment history');
    fetchCommentHistory();
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
      // patientTestId can be null, so ensure it's a valid string before calling
      if (!patientTestId || typeof patientTestId !== 'string') {
        setError('Invalid test ID');
        setLoading(false);
        return;
      }
      const data = await getPatientTestById(patientTestId);
      if (data) {
        console.log(`\n🔴 FRONTEND: getPatientTestById response received`);
        console.log(`   data.patientTest exists: ${!!data.patientTest}`);
        console.log(`   data.patientTest.patient exists: ${!!data.patientTest?.patient}`);
        console.log(`   data.patientTest.patient.ageYears: ${data.patientTest?.patient?.ageYears}`);
        console.log(`   data.patientTest.patient.ageMonths: ${data.patientTest?.patient?.ageMonths}`);
        console.log(`   data.patientTest.patient.ageDays: ${data.patientTest?.patient?.ageDays}`);
        console.log(`   data.patientTest.patient.gender: ${data.patientTest?.patient?.gender}`);
        
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
          lowPanic: p.lowPanic,
          highPanic: p.highPanic,
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
            // Don't use "Parameter" placeholder as initial value - it's just metadata
            const defaultTextValue = (param.textContent && param.textContent !== 'Parameter') ? param.textContent : '';
            initialResults[param.id] = { numericValue: null, textValue: defaultTextValue, selectedOption: '', isAbnormal: false, referenceRange: param.normalRange, isHighlighted: false };
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

      // ✅ Initialize testComments with previously saved comments for each test
      const initialTestComments: { [testIdx: number]: string } = {};
      const initialTestShowComment: { [testIdx: number]: boolean } = {};
      validTests.forEach((testData, idx) => {
        const savedComment = testData.patientTest?.comments || '';
        initialTestComments[idx] = savedComment;
        initialTestShowComment[idx] = savedComment.trim().length > 0; // Auto-check if comment exists
        console.log(`✅ Loaded existing comment for test ${idx} (${testData.patientTest?.test?.name}):`, savedComment);
      });
      setTestComments(initialTestComments);
      setTestShowComment(initialTestShowComment);

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
              // Don't use "Parameter" placeholder as initial value - it's just metadata
              const defaultTextValue = (param.textContent && param.textContent !== 'Parameter') ? param.textContent : '';
              initialResults[paramKey] = { numericValue: null, textValue: defaultTextValue, selectedOption: '', isAbnormal: false, referenceRange: param.normalRange, isHighlighted: false };
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
      
      // Find the parameter to check for panic ranges
      const parameter = (allParams || parameters).find(p => p.id === parameterId);
      
      // ✅ NEW: Check if text value contains numeric and has panic ranges
      if (field === 'textValue' && parameter) {
        console.log(`📝 Checking text value for parameter: ${parameter.parameterName}`);
        console.log(`   Value: "${value}"`);
        console.log(`   Type: ${parameter.type}`);
        console.log(`   isDescriptive: ${parameter.isDescriptive}`);
        console.log(`   lowPanic: ${parameter.lowPanic}, highPanic: ${parameter.highPanic}`);
        
        // Extract first numeric value from the text
        const numericMatch = value?.match(/^[\d.]+/);
        console.log(`   Numeric match: ${numericMatch ? numericMatch[0] : 'none'}`);
        
        // ✅ Check for BOTH isDescriptive AND type === 'Text' with panic ranges
        const isTextType = parameter.type === 'Text' || parameter.isDescriptive;
        const hasPanicRanges = parameter.lowPanic !== null && parameter.highPanic !== null && parameter.lowPanic !== undefined && parameter.highPanic !== undefined;
        
        console.log(`   isTextType: ${isTextType}, hasPanicRanges: ${hasPanicRanges}`);
        
        if (numericMatch && isTextType && hasPanicRanges) {
          const numericValue = parseFloat(numericMatch[0]);
          if (!isNaN(numericValue)) {
            // Check against panic ranges
            const isAbnormal = numericValue < parameter.lowPanic || numericValue > parameter.highPanic;
            // ✅ NEW: Store panic info and set isAbnormal
            updated[parameterId] = { 
              ...updated[parameterId], 
              isAbnormal: isAbnormal,
              panicInfo: {
                value: numericValue,
                lowPanic: parameter.lowPanic,
                highPanic: parameter.highPanic
              }
            };
            console.log(`✅ PANIC RANGE CHECK: Parameter "${parameter.parameterName}" - Value: ${numericValue}, Range: ${parameter.lowPanic} - ${parameter.highPanic}, Abnormal: ${isAbnormal}`);
            console.log(`✅ panicInfo set:`, updated[parameterId].panicInfo);
          }
        } else {
          console.log(`⚠️ Conditions not met: numericMatch=${!!numericMatch}, isTextType=${isTextType}, hasPanicRanges=${hasPanicRanges}`);
          // Clear panicInfo if conditions not met
          updated[parameterId] = { ...updated[parameterId], isAbnormal: false, panicInfo: null };
        }
      }
      
      (allParams || parameters).forEach(param => {
        if (param.hasFormula && param.formula) {
          const calculated = evaluateFormula(param.formula, allParams || parameters, updated);
          // ✅ Apply decimal rounding ONLY to auto-calculated formula results
          if (calculated !== null) {
            const decimalPlaces = param.decimal || 2;
            const roundedCalculated = parseFloat(roundToDecimal(calculated, decimalPlaces));
            updated[param.id] = { ...updated[param.id], numericValue: roundedCalculated };
          }
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
        allTestsData.map(async (testData, idx) => {
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
            const hasText = r.textValue && typeof r.textValue === 'string' && r.textValue.trim() !== '' && r.textValue.trim() !== 'Parameter';
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
            // ✅ Save comments for this test if any
            const testComment = testComments[idx];
            if (testComment && testComment.trim()) {
              try {
                await fetch(`${API_BASE_URL}/results/${testData.patientTest.id}/comments`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ comments: testComment })
                });
                console.log(`✅ Saved comment for test ${idx}:`, testComment);
              } catch (commentError) {
                console.error(`⚠️ Failed to save comment for test ${idx}:`, commentError);
              }
            }
            
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
        const hasText = r.textValue && typeof r.textValue === 'string' && r.textValue.trim() !== '' && r.textValue.trim() !== 'Parameter';
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
        isHighlighted: results[param.id]?.isHighlighted || false,
        referenceRange: results[param.id]?.referenceRange || param.normalRange
      })).filter(r => {
        const hasNumeric = r.numericValue !== null && r.numericValue !== undefined && r.numericValue !== '';
        const hasText = r.textValue && typeof r.textValue === 'string' && r.textValue.trim() !== '' && r.textValue.trim() !== 'Parameter';
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
      <div className="p-4 bg-gray-100 min-h-screen mt-2">

        {/* Patient Header */}
        <div className="bg-yellow-100 border p-2 text-sm flex justify-between flex-wrap">
          <span><b>NAME:</b> {patientData.patient.title} {patientData.patient.firstName} {patientData.patient.lastName}</span>
          <span><b>P_ID:</b> {patientData.patient.patientId}</span>
          <span><b>V_ID:</b> {patientData.visitId}</span>
          <span><b>AGE/GENDER:</b> {formatAgeFromFields(patientData.patient.ageYears, patientData.patient.ageMonths, patientData.patient.ageDays)} / {patientData.patient.gender}</span>
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
                            <tr className="bg-gray-200 font-semibold">
                              <td className="p-2">{stripHtmlTags(categoryParams[0]?.categoryName || '').toUpperCase()}</td>
                              <td className="p-2 text-center">Parameter</td>
                              <td colSpan={3}></td>
                            </tr>
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
                                          panicInfo={results[paramKey]?.panicInfo}
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
                                <td className="border p-2 text-xs">
                                  {stripHtmlTags(
                                    getAgeAppropriateRange(param, patientData?.patient?.ageYears, patientData?.patient?.ageMonths, patientData?.patient?.ageDays, patientData?.patient?.gender) 
                                    || param.normalRange || param.displayRangeText || param.rangeText || '-'
                                  )}
                                </td>
                                <td className="border p-2 text-center" style={{width: '40px'}}>
                                  <input 
                                    type="checkbox" 
                                    checked={results[paramKey]?.isHighlighted || false}
                                    onChange={() => {
                                      handleHighlightChange(paramKey);
                                    }}
                                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                                    tabIndex={-1}
                                    title="Check to highlight this value bold in report"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      {/* Comment Row */}
                      <tr className="bg-gray-100 border-t-2 border-gray-400">
                        <td colSpan={5} className="border p-3">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              id={`show-comment-test-${testIdx}`}
                              checked={testShowComment[testIdx] || false}
                              onChange={(e) => setTestShowComment(prev => ({ ...prev, [testIdx]: e.target.checked }))}
                              className="w-5 h-5 accent-blue-600 cursor-pointer flex-shrink-0"
                              title="Check to add comments"
                            />
                            <label htmlFor={`show-comment-test-${testIdx}`} className="text-sm font-semibold text-gray-700 cursor-pointer flex-shrink-0">Comment:</label>
                            {testShowComment[testIdx] && (
                              <div className="flex-1 relative">
                                <textarea
                                  value={testComments[testIdx] || ''}
                                  onChange={(e) => setTestComments(prev => ({ ...prev, [testIdx]: e.target.value }))}
                                  onFocus={() => setTestCommentFocused(prev => ({ ...prev, [testIdx]: true }))}
                                  onBlur={() => setTimeout(() => setTestCommentFocused(prev => ({ ...prev, [testIdx]: false })), 200)}
                                  placeholder="Type comment here or select from history"
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-normal h-12 resize-none"
                                />
                                {commentHistory.length > 0 && testCommentFocused[testIdx] && (
                                  <div className="absolute top-12 left-0 right-0 bg-white border border-gray-300 rounded shadow-lg p-2 max-h-40 overflow-y-auto z-50">
                                    <div className="space-y-1">
                                      {commentHistory.map((hist, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-2 py-1.5 text-xs bg-gray-50 hover:bg-blue-50 rounded group">
                                          <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                              const currentComment = testComments[testIdx] || '';
                                              const newComments = currentComment.trim() ? `${currentComment}, ${hist}` : hist;
                                              setTestComments(prev => ({ ...prev, [testIdx]: newComments }));
                                            }}
                                            className="flex-1 text-left text-gray-800 hover:text-blue-600 transition-colors cursor-pointer"
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
                                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete this comment"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
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
                        <tr className="bg-gray-200 font-semibold">
                          <td className="p-2">{renderStyledText((categoryParams[0]?.categoryName || '').toUpperCase(), true)}</td>
                          <td className="p-2 text-center">Parameter</td>
                          <td colSpan={3}></td>
                        </tr>
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
                                    {editingFormulaFields.has(param.id) ? (
                                      // Edit mode - show editable input with save/cancel buttons
                                      <div className="flex items-center ">
                                        <input 
                                          type="text" 
                                          value={results[param.id]?.numericValue ?? ''} 
                                          onChange={(e) => handleResultChange(param.id, 'numericValue', e.target.value === '' ? null : e.target.value, parameters)}
                                          className={`${inputClass} px-2 py-1 w-24 rounded`}
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => setEditingFormulaFields(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(param.id);
                                            return newSet;
                                          })}
                                          className="text-xs green-600 text-green px-2 py-1 rounded hover:green-900"
                                          title="Save"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => setEditingFormulaFields(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(param.id);
                                            return newSet;
                                          })}
                                          className="text-xs text-red px-2 py-1 rounded hover:red-900"
                                          title="Cancel"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      // View mode - show read-only with edit icon
                                      <div className="flex items-center gap-1">
                                        <input 
                                          type="text" 
                                          readOnly 
                                          value={results[param.id]?.numericValue ?? ''} 
                                          className={`${inputClass} bg-green-50 border-green-400 cursor-not-allowed`} 
                                          title={`Auto-calculated: ${param.formula}`} 
                                        />
                                        <button
                                          onClick={() => setEditingFormulaFields(prev => {
                                            const newSet = new Set(prev);
                                            newSet.add(param.id);
                                            return newSet;
                                          })}
                                          className="text-s text-blue px-2 py-2 rounded hover:blue-900"
                                          title="Edit calculated value"
                                        >
                                          ✎
                                        </button>
                                      </div>
                                    )}
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
                                ) : param.type === 'Text' ? (
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
                                        panicInfo={results[param.id]?.panicInfo}
                                      />
                                    ) : (
                                      <input type="text" value={results[param.id]?.textValue || ''} onChange={(e) => handleResultChange(param.id, 'textValue', e.target.value, parameters)} className={`border px-2 py-1 w-32 rounded ${results[param.id]?.isAbnormal ? "border-red-500 bg-red-50" : "border-gray-300"}`} />
                                    );
                                  })()
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
                                        panicInfo={results[param.id]?.panicInfo}
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
                            <td className="border p-2">
                              {stripHtmlTags(
                                getAgeAppropriateRange(param, patientData?.patient?.ageYears, patientData?.patient?.ageMonths, patientData?.patient?.ageDays, patientData?.patient?.gender)
                                || param.normalRange || param.displayRangeText || param.rangeText || '-'
                              )}
                            </td>
                            <td className="border p-2 text-center" style={{width: '40px'}}>
                              <input 
                                type="checkbox" 
                                checked={results[param.id]?.isHighlighted || false}
                                onChange={() => {
                                  handleHighlightChange(param.id);
                                }}
                                className="w-5 h-5 accent-blue-600 cursor-pointer"
                                tabIndex={-1}
                                title="Check to highlight this value bold in report"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {/* Comment Row */}
                  <tr className="bg-gray-100 border-t-2 border-gray-400">
                    <td colSpan={6} className="border p-3">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="show-comment-table"
                          checked={showComment}
                          onChange={(e) => setShowComment(e.target.checked)}
                          className="w-5 h-5 accent-blue-600 cursor-pointer flex-shrink-0"
                          title="Check to add comments"
                        />
                        <label htmlFor="show-comment-table" className="text-sm font-semibold text-gray-700 cursor-pointer flex-shrink-0">Comment:</label>
                        {showComment && (
                          <div className="flex-1 relative">
                            <textarea
                              value={comments}
                              onChange={(e) => setComments(e.target.value)}
                              onFocus={() => setCommentFocused(true)}
                              onBlur={() => setTimeout(() => setCommentFocused(false), 200)}
                              placeholder="Type comment or select from history"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-normal h-12 resize-none"
                            />
                            {commentHistory.length > 0 && commentFocused && (
                              <div className="absolute top-12 left-0 right-0 bg-white border border-gray-300 rounded shadow-lg p-2 max-h-40 overflow-y-auto z-50">
                                <div className="space-y-1">
                                  {commentHistory.map((hist, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-2 py-1.5 text-xs bg-gray-50 hover:bg-blue-50 rounded group">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          const newComments = comments.trim() ? `${comments}, ${hist}` : hist;
                                          setComments(newComments);
                                        }}
                                        className="flex-1 text-left text-gray-800 hover:text-blue-600 transition-colors cursor-pointer"
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
                                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete this comment"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
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
                  onChange={(e) => handleCommentCheckbox(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="show-comment" className="text-sm text-gray-700 cursor-pointer">Add Comments/Notes</label>
              </div>
              
              {/* Comments Text Area - Show when checkbox is checked */}
              {showComment && (
                <div className="mb-3 relative">
                  <textarea
                    value={comments}
                    onChange={(e) => handleCommentChange(e.target.value)}
                    onFocus={() => setCommentFocused(true)}
                    onBlur={() => setTimeout(() => setCommentFocused(false), 200)}
                    placeholder="Type comment here or select from history below"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-normal h-20 resize-none"
                  />
                  {commentHistory.length > 0 && commentFocused && (
                    <div className="absolute top-20 left-0 right-0 bg-white border border-gray-300 rounded shadow-lg p-2 max-h-48 overflow-y-auto z-50">
                      <div className="space-y-1">
                        {commentHistory.map((hist, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const newComments = comments.trim() ? `${comments}, ${hist}` : hist;
                              handleCommentChange(newComments);
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm bg-gray-50 hover:bg-blue-500 hover:text-white text-gray-800 rounded cursor-pointer transition-colors"
                          >
                            {hist}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                      height: 296mm !important;
                      overflow: hidden !important;
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

                <div id="pr-report-page" style={{ width: '210mm', height: '296mm', margin: '16px auto', position: 'relative', backgroundColor: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', fontFamily: 'Arial, sans-serif', fontSize: '11px', overflow: 'hidden' }}>
                  {reportWithHeader && (
                    <img src={LetterHead} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0, pointerEvents: 'none' }} />
                  )}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', paddingTop: reportWithHeader ? '12mm' : '12mm', paddingBottom: reportWithHeader ? '12mm' : '12mm', paddingLeft: '14mm', paddingRight: '14mm', boxSizing: 'border-box' }}>

                    {/* Report Title */}
                    <div style={{ textAlign: 'center', marginBottom: '2mm', paddingBottom: '1mm' }}>
                      <strong style={{ fontSize: '13px', textDecoration: 'underline' }}>{patientData.test.name.toUpperCase()}</strong>
                    </div>

                    {/* Patient Info */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '11px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 4px', width: '50%' }}><strong>Patient:</strong> {patientData.patient.title} {patientData.patient.firstName} {patientData.patient.lastName}</td>
                          <td style={{ padding: '2px 4px', width: '50%' }}><strong>Age / Gender:</strong> {formatAgeFromFields(patientData.patient.ageYears, patientData.patient.ageMonths, patientData.patient.ageDays)} Yrs / {patientData.patient.gender}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px' }}>Referral : {patientData.patient.referralDoctor || '-'}</td>
                          <td style={{ padding: '2px 4px' }}>Org Name : {patientData.patient.title ? '1500' : 'Shraddha Pathology Laboratory'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px' }}>Sample Date : {patientData.visitDate ? new Date(patientData.visitDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('am', 'a.m.').replace('pm', 'p.m.') : '-'}</td>
                          <td style={{ padding: '2px 4px' }}>Reg. ID : {patientData.visitId || '-'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px' }}>Report Date : {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('am', 'a.m.').replace('pm', 'p.m.')}</td>
                          <td style={{ padding: '2px 4px' }}>Sample ID : {patientData.visitId || '-'}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Results — no borders, no row lines */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                          <th style={{ borderBottom: 'none', padding: '4px 6px', textAlign: 'left', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '30%' : '50%' }}>Test Description</th>
                          <th style={{ borderBottom: 'none', padding: '4px 6px', textAlign: 'left', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '28%' : '50%' }}>Value(s)</th>
                          {shouldShowUnitsColumn() && (
                            <th style={{ borderBottom: 'none', padding: '4px 6px', textAlign: 'center', width: '12%' }}>Unit</th>
                          )}
                          {shouldShowReferenceRangeColumn() && (
                            <th style={{ borderBottom: 'none', padding: '4px 6px', textAlign: 'left', width: '30%' }}>Reference Range</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Test name already rendered above the table */}
                        {Object.entries(groupedParameters).map(([categoryName, categoryParams]: [string, any]) => {
                          // Filter parameters: only show those with values
                          const paramsWithValues = (categoryParams as any[]).filter(param => {
                            const numVal = results[param.id]?.numericValue;
                            const textVal = results[param.id]?.textValue;
                            const hasNumeric = numVal !== null && numVal !== undefined && numVal !== '';
                            const hasText = textVal && textVal.trim() !== '' && textVal.trim() !== 'Parameter'; // Exclude placeholder text
                            return hasNumeric || hasText;
                          });

                          // If no parameters with values, skip this category
                          if (paramsWithValues.length === 0) return null;

                          return (
                            <React.Fragment key={categoryName}>
                              {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                                <tr>
                                  <td style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: 'none', textDecoration: 'underline' }}>{stripHtmlTags(categoryName || '').toUpperCase()}</td>
                                  <td style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: 'none', textDecoration: 'underline', textAlign: 'center' }}>Parameter</td>
                                  {shouldShowUnitsColumn() && <td style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: 'none' }}>-</td>}
                                  {shouldShowReferenceRangeColumn() && <td style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: 'none' }}>-</td>}
                                </tr>
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
                                  // Don't display if the value is just the placeholder text "Parameter"
                                  displayValue = (firstValue && firstValue !== 'Parameter') ? firstValue : '-';
                                }
                                
                                // Skip showing this row if there's no real value
                                if (displayValue === '-') return null;
                                
                                // Get reference range - only for numeric params
                                const rangeStr = shouldShowReferenceRangeColumn() ? getAgeAppropriateRange(param, patientData.patient.ageYears, patientData.patient.ageMonths, patientData.patient.ageDays, patientData.patient.gender) : '';
                                
                                return (
                                  <tr key={param.id}>
                                    <td style={{ padding: '3px 6px', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '30%' : '50%', fontWeight: isAbn ? 'bold' : 'normal' }}>
                                      {stripHtmlTags(param.parameterName || '').toUpperCase()}
                                      {param.parameterTestMethod && (
                                        <div style={{ fontSize: '8px', color: '#000', fontWeight: 'normal', marginTop: '1px' }}>
                                          METHOD: {param.parameterTestMethod}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '3px 6px', width: shouldShowUnitsColumn() || shouldShowReferenceRangeColumn() ? '28%' : '50%', fontWeight: 'bold', color: isAbn ? '#b91c1c' : 'inherit', fontSize: '11px', whiteSpace: 'normal', wordWrap: 'break-word', textAlign: 'left' }}>
                                      {param.isDescriptive && displayValue !== '-' && hasHtmlTags(displayValue) ? (
                                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayValue) }} style={{ margin: 0, whiteSpace: 'normal', fontWeight: 'normal' }} />
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

                    {/* Footer text removed */}
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
