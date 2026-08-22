"use client";

/**
 * ProfessionalReport - Full-Page Letterhead Design
 * Multi-test reports flow onto the minimum number of A4 pages.
 * Tests share one patient header; new pages only when content overflows.
 */

import React, { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import API_BASE_URL from "@/src/api/config";

// QRCode will be loaded dynamically
let QRCode: any = null;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PatientInfo {
  title?: string;
  firstName?: string;
  lastName?: string;
  age?: number | string;  // Can be number or formatted string like "1 month 3 days"
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  gender?: string;
  dob?: string;  // Birthday date for babies
  organizationName?: string;  // Organization name from patient registration
  mobile?: string;
  email?: string;
  address?: string;
}

interface LetterheadDB {
  id?: number;
  letterheadName?: string;
  headerImage?: string;
  footerImage?: string;
  fullPageImage?: string;
}

interface FieldConfig {
  fieldKey: string;
  fieldLabel: string;
  isVisible: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  displayOrder: number;
  sectionName: string;
  customLabel?: string;
}

interface FormattingConfig {
  fontFamily: string;
  fontSizeHeader: number;
  fontSizeBody: number;
  fontSizeFooter: number;
  paperSize: string;
  orientation: string;
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
  lineHeight: number;
  showHeader: boolean;
  showFooter: boolean;
  showWatermark: boolean;
  showQRCode: boolean;
  showPrimarySignature: boolean;
  showSecondarySignature: boolean;
  signaturePosition: string;
  footerText?: string;
  watermarkText?: string;
}

export interface ProfessionalReportProps {
  patient: PatientInfo;
  visitId: string;
  visitDate: string;
  test: any;
  parameters?: any[];
  groupedParameters?: any;
  combinedTests?: any[];
  signature?: any;
  letterhead?: LetterheadDB;
  letterHeadBase64?: string;
  printOption?: 'pagebreak' | 'nobreak';
  results?: Record<string, { numericValue?: any; textValue?: string; isAbnormal?: any; isHighlighted?: boolean }>;
  referralDoctor?: string;
  comments?: string;
  forceShowReferenceRange?: boolean;  // ✅ NEW: Force show reference ranges
  onReady?: () => void;
}

type ContentBlock =
  | { kind: 'patient' }
  | { kind: 'test-title'; testData: any }
  | { kind: 'thead' }
  | { kind: 'category'; catName: string }
  | { kind: 'param'; param: any }
  | { kind: 'comments'; text: string }  // ✅ NEW: Comments as table row
  | { kind: 'instrument'; machine: any }  // ✅ NEW: Instrument/Machine as table row
  | { kind: 'test-gap' }
  | { kind: 'interpretation'; testData: any }
  | { kind: 'signature' }
  | { kind: 'force-break' };

interface ReportPage {
  blocks: ContentBlock[];
  pageNo: number;
  total: number;
  isLastPage: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const HEADER_SPACE_MM = 30;
const FOOTER_SPACE_MM = 12;
const PAD_LEFT_MM = 10;
const PAD_RIGHT_MM = 10;
const PAD_TOP_MM = 3;
const PAD_BOT_MM = 3;

const CONTENT_MM = 297 - HEADER_SPACE_MM - FOOTER_SPACE_MM - PAD_TOP_MM - PAD_BOT_MM;

const ROW_PARAM_MM = 5.5;  // Increased for better readability (was 5mm)
const ROW_CAT_MM = 4.5;
const PATIENT_MM = 14;
const TITLE_MM = 6.5;
const THEAD_MM = 3.5;  // Reduced (was 4mm) to give more space to parameters
const INTERP_MM = 15;
const SIG_MM = 15;
const TEST_GAP_MM = 2;  // Increased from 4 to match new margin (3+4+2=9)

function blockHeight(block: ContentBlock): number {
  switch (block.kind) {
    case 'patient': return PATIENT_MM;
    case 'test-title': return TITLE_MM;
    case 'thead': return THEAD_MM;
    case 'category': return ROW_CAT_MM;
    case 'param': return ROW_PARAM_MM;
    case 'comments': return ROW_PARAM_MM;  // ✅ Same height as param row
    case 'instrument': return ROW_PARAM_MM;  // ✅ Same height as param row
    case 'interpretation': return INTERP_MM;
    case 'signature': return SIG_MM;
    case 'test-gap': return TEST_GAP_MM;
    default: return 0;
  }
}

function buildContentBlocks(
  testsToRender: any[],
  results: Record<string, any>,
  printOption: 'pagebreak' | 'nobreak',
  comments?: string,  // Keep for backward compatibility
  commentsMap?: Record<string, string>  // ✅ NEW: Per-test comments
): ContentBlock[] {
  const blocks: ContentBlock[] = [{ kind: 'patient' }];
  
  // ✅ Debug: Log comments at start of build
  console.log('📦 buildContentBlocks - Comments input:', { 
    comments, 
    commentsMap,
    hasComments: !!comments,
    hasCommentsMap: !!commentsMap && Object.keys(commentsMap || {}).length > 0
  });

  testsToRender.forEach((testItem, idx) => {
    if (printOption === 'pagebreak' && idx > 0) {
      blocks.push({ kind: 'signature' });
      blocks.push({ kind: 'force-break' });
      blocks.push({ kind: 'patient' });
    } else if (idx > 0 && printOption === 'nobreak') {
      blocks.push({ kind: 'test-gap' });
    }

    blocks.push({ kind: 'test-title', testData: testItem });
    blocks.push({ kind: 'thead' });

    // ✅ Sort categories by their order and sort parameters within each category
    const sortedEntries = Object.entries(testItem.groupedParameters || {})
      .map(([catName, catParams]: [string, any]) => ({
        catName,
        catParams,
        sortOrder: catParams[0]?.categoryDisplayOrder ?? catParams[0]?.sortOrder ?? 999
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    sortedEntries.forEach(({ catName, catParams }) => {
      // ✅ Sort parameters within category by sortOrder
      const sortedParams = [...(catParams as any[])].sort((a, b) => 
        (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
      );
      
      const visible = sortedParams.filter(p => {
        const nv = results[p.id]?.numericValue;
        const tv = results[p.id]?.textValue;
        // Exclude parameters that only have placeholder text "Parameter"
        const hasValidText = tv?.trim() && tv.trim() !== 'Parameter';
        return (nv != null && nv !== '') || hasValidText;
      });
      if (!visible.length) return;
      if (catName !== 'NO_CATEGORY_HEADER' && catParams[0]?.showCategoryHeader)
        blocks.push({ kind: 'category', catName });
      visible.forEach(p => blocks.push({ kind: 'param', param: p }));
    });

    // ✅ Add comments as table row right after parameters - use per-test comments from testItem
    const testComments = (testItem as any).comments || '';
    if (testComments && testComments.trim()) {
      console.log(`✅ Adding comments block for test "${testItem.name}":`, testComments);
      blocks.push({ kind: 'comments', text: testComments });
    } else {
      console.log(`⚠️ No comments for test "${testItem.name}"`);
    }

    // ✅ Add instrument/machine as table row - use per-test machine from testItem
    const testMachine = (testItem as any).usedMachine;
    console.log(`🔍🔍🔍 DETAILED INSTRUMENT CHECK for test "${testItem.name}":`, {
      testItemKeys: Object.keys(testItem).filter(k => k.includes('machine') || k.includes('Machine')),
      testMachine,
      machineType: typeof testMachine,
      machineKeys: testMachine ? Object.keys(testMachine) : 'N/A',
      hasName: !!testMachine?.name,
      nameValue: testMachine?.name,
      hasDesc: !!testMachine?.description,
      descValue: testMachine?.description,
      shouldAdd: testMachine && (testMachine.name || testMachine.description)
    });
    if (testMachine && (testMachine.name || testMachine.description)) {
      console.log(`✅✅✅ Adding instrument block for test "${testItem.name}":`, testMachine);
      blocks.push({ kind: 'instrument', machine: testMachine });
    } else {
      console.log(`⚠️⚠️⚠️ No instrument/machine for test "${testItem.name}"`, { testMachine, hasName: testMachine?.name, hasDesc: testMachine?.description });
    }

    if (testItem.interpretation) {
      blocks.push({ kind: 'interpretation', testData: testItem });
    }
  });

  blocks.push({ kind: 'signature' });
  console.log('📦 buildContentBlocks - Total blocks:', blocks.length, 'with comments:', blocks.filter(b => b.kind === 'comments').length);
  return blocks;
}

function paginateBlocks(blocks: ContentBlock[]): ReportPage[] {
  const pages: ReportPage[] = [];
  let cur: ContentBlock[] = [];
  let used = 0;

  const flush = () => {
    if (cur.length === 0) return;
    pages.push({
      blocks: [...cur],
      pageNo: pages.length,
      total: 0,
      isLastPage: false,
    });
    cur = [];
    used = 0;
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.kind === 'force-break') {
      flush();
      continue;
    }

    const h = blockHeight(block);

    // Reserve trailing signature space on every page except when placing signature itself
    let reserve = 0;
    if (block.kind !== 'signature') {
      const sigLater = blocks.slice(i + 1).some(b => b.kind === 'signature');
      if (sigLater) reserve += SIG_MM;
    }

    // Reserve interpretation when still packing params for a test that has one
    if (block.kind === 'category' || block.kind === 'param') {
      let j = i + 1;
      while (j < blocks.length) {
        const next = blocks[j];
        if (next.kind === 'interpretation') { reserve += INTERP_MM; break; }
        if (next.kind === 'test-title' || next.kind === 'force-break' || next.kind === 'signature') break;
        j++;
      }
    }   

    if (cur.length > 0 && used + h + reserve > CONTENT_MM) {
      flush();
      if (block.kind === 'category' || block.kind === 'param') {
        cur.push({ kind: 'thead' });
        used += THEAD_MM;
      }
    }

    cur.push(block);
    used += h;
  }

  flush();

  if (pages.length === 0) {
    pages.push({ blocks: [{ kind: 'patient' }], pageNo: 0, total: 1, isLastPage: true });
  }

  pages.forEach((p, idx) => {
    p.total = pages.length;
    p.isLastPage = idx === pages.length - 1;
  });

  return pages;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ProfessionalReport = React.forwardRef<HTMLDivElement, ProfessionalReportProps>(
  (props, ref) => {
    const {
      patient,
      visitId,
      visitDate,
      test,
      groupedParameters = {},
      combinedTests = [],
      signature,
      letterhead,
      letterHeadBase64,
      printOption = 'nobreak',
      results = {},
      referralDoctor = '',
      comments = '',  // ✅ Keep for backward compatibility
      forceShowReferenceRange = false,  // ✅ NEW: Force show reference ranges
      onReady,
    } = props;

    const [lh, setLh] = useState<LetterheadDB | null>(null);
    const [ready, setReady] = useState(false);
    const [pages, setPages] = useState<ReportPage[]>([]);
    const [fieldConfigs, setFieldConfigs] = useState<Map<string, FieldConfig> | null>(null);
    const [formatConfig, setFormatConfig] = useState<FormattingConfig | null>(null);
    const [qrCodes, setQrCodes] = useState<Record<string, string>>({}); // ✅ Store QR code data URLs
    const reportRef = React.useRef<HTMLDivElement>(null);
    const onReadyCalled = React.useRef(false);

    // ✅ Load report settings from API - with proper error handling and state stability
    useEffect(() => {
      let mounted = true;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      const loadReportSettings = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/report-settings`, {
            method: 'GET',
            cache: 'no-cache', // Prevent browser caching
          });
          
          if (!mounted) return;

          if (response.ok) {
            const data = await response.json();
            if (data.data && mounted) {
              // Convert fields array to Map for faster lookup
              const fieldsMap = new Map<string, FieldConfig>(
                (data.data.fields || []).map((f: FieldConfig) => [f.fieldKey, f])
              );
              
              // Ensure formatting has ALL defaults - never leave properties undefined
              const formatting = data.data.formatting || {};
              const completeFormatting: FormattingConfig = {
                fontFamily: formatting.fontFamily && formatting.fontFamily.trim() ? formatting.fontFamily : 'Bookman Old Text',
                fontSizeHeader: formatting.fontSizeHeader || 14,
                fontSizeBody: formatting.fontSizeBody || 11,
                fontSizeFooter: formatting.fontSizeFooter || 9,
                lineHeight: formatting.lineHeight || 1.4,
                paperSize: formatting.paperSize || 'A4',
                orientation: formatting.orientation || 'Portrait',
                topMargin: formatting.topMargin || 10,
                bottomMargin: formatting.bottomMargin || 10,
                leftMargin: formatting.leftMargin || 10,
                rightMargin: formatting.rightMargin || 10,
                showHeader: formatting.showHeader !== false,
                showFooter: formatting.showFooter !== false,
                showWatermark: formatting.showWatermark || false,
                showQRCode: formatting.showQRCode !== false,
                showPrimarySignature: formatting.showPrimarySignature !== false,
                showSecondarySignature: formatting.showSecondarySignature || false,
                signaturePosition: formatting.signaturePosition || 'Bottom Right',
                footerText: formatting.footerText || '**END OF REPORT**',
                watermarkText: formatting.watermarkText || '',
              };
              
              setFieldConfigs(fieldsMap);
              setFormatConfig(completeFormatting);
              retryCount = 0; // Reset retry on success
            }
          } else if (retryCount < MAX_RETRIES) {
            // Retry if failed
            retryCount++;
            setTimeout(() => loadReportSettings(), 500);
          }
        } catch (error) {
          console.warn('[ProfessionalReport] Failed to load report settings:', error);
          
          // Set default formatting on error - ensure it's complete
          if (mounted) {
            setFormatConfig({
              fontFamily: 'Bookman Old Text',
              fontSizeHeader: 14,
              fontSizeBody: 11,
              fontSizeFooter: 9,
              lineHeight: 1.4,
              paperSize: 'A4',
              orientation: 'Portrait',
              topMargin: 10,
              bottomMargin: 10,
              leftMargin: 10,
              rightMargin: 10,
              showHeader: true,
              showFooter: true,
              showWatermark: false,
              showQRCode: true,
              showPrimarySignature: true,
              showSecondarySignature: false,
              signaturePosition: 'Bottom Right',
              footerText: '**END OF REPORT**',
              watermarkText: '',
            });
          }
        }
      };

      // Load settings once on mount
      loadReportSettings();

      return () => { 
        mounted = false; 
      };
    }, []);

    // Removed debug logging - this was causing unnecessary re-renders

    // ✅ Generate single QR code for entire visit (all tests combined)
    useEffect(() => {
      const generateQRCode = async () => {
        try {
          // Dynamically load QRCode if not already loaded
          if (!QRCode) {
            // @ts-ignore - qrcode package is installed
            const module = await import('qrcode');
            QRCode = module.default;
          }

          // Create a single QR code for the entire visit with all tests
          // ✅ Get the correct base URL for mobile scanning
          let baseUrl = '';
          
          if (typeof window !== 'undefined') {
            // Client-side: Use window.location.origin for reliable domain
            baseUrl = window.location.origin;
          } else {
            // Server-side fallback
            baseUrl = API_BASE_URL.replace('/api', '').replace('http:', 'https:');
          }
          
          // ✅ SIMPLIFIED: Only send visitId - that's all we need
          const qrContent = `${baseUrl}/report-view?visitId=${encodeURIComponent(visitId || '')}`;
          
          console.log('✅ QR Code URL:', qrContent);
          console.log('✅ Base URL used:', baseUrl);
          
          const qrDataUrl = await QRCode.toDataURL(qrContent, {
            errorCorrectionLevel: 'H', // High error correction for better scanning
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            width: 120,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          // Store with key 'visitId' for single QR code per visit
          setQrCodes({ [visitId || 'default']: qrDataUrl });
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      };

      generateQRCode();
    }, [visitId, visitDate, patient]);

    useEffect(() => {
      let dead = false;
      (async () => {
        try {
          // ✅ If letterhead is explicitly undefined/null, don't load any letterhead
          if (letterhead === undefined || letterhead === null) {
            if (!dead) {
              setLh(null);
              setReady(true);
            }
            return;
          }
          
          // Use letterhead passed as prop first
          if (letterhead?.fullPageImage || letterhead?.headerImage) {
            if (!dead) {
              setLh(letterhead);
              setReady(true);
            }
            return;
          }
          
          // Only fetch if letterhead was not explicitly set to undefined
          const r = await fetch(`${API_BASE_URL}/letterhead/active`);
          const d = await r.json();
          if (!dead && d.success && d.data?.length > 0) setLh(d.data[0]);
        } catch (e) {
          console.warn('[ProfessionalReport] letterhead load error', e);
        } finally {
          if (!dead) setReady(true);
        }
      })();
      return () => { dead = true; };
    }, [letterhead]);

    // ✅ Helper function to check if field should be visible
    // Optional System Fields that should hide until settings are loaded and enabled
    const optionalSystemFields = new Set(['mobile', 'email', 'address']);
    
    const isFieldVisible = (fieldKey: string): boolean => {
      // First check if field is in the field config from database
      if (fieldConfigs) {
        const config = fieldConfigs.get(fieldKey);
        if (config) {
          // Use the configured isVisible value from settings
          return config.isVisible;
        }
      }
      
      // If field is not found in config, use these rules:
      // - Optional system fields (mobile, email, address) should NOT be shown by default
      // - All other fields should be shown by default
      if (optionalSystemFields.has(fieldKey)) {
        return false; // Hide optional fields by default
      }
      
      return true; // Show all other fields by default
    };

    // ✅ Helper function to get proper font family with fallbacks
    const getFontFamily = (font: string): string => {
      const fontStacks: { [key: string]: string } = {
        'Arial': 'Arial, Helvetica, sans-serif',
        'Times New Roman': '"Times New Roman", Times, serif',
        'Georgia': 'Georgia, serif',
        'Courier New': '"Courier New", Courier, monospace',
        'Bookman Old Text': '"Bookman Old Text", "Book Antiqua", serif',
      };
      return fontStacks[font] || font;
    };
    const getFieldStyle = (fieldKey: string) => {
      if (!fieldConfigs) return {};
      const config = fieldConfigs.get(fieldKey);
      if (!config) return {};
      
      return {
        fontWeight: config.isBold ? 'bold' : 'normal',
        fontStyle: config.isItalic ? 'italic' : 'normal',
        textDecoration: config.isUnderline ? 'underline' : 'none'
      };
    };

    // ✅ Helper function to get custom label or default
    const getFieldLabel = (fieldKey: string, defaultLabel: string): string => {
      if (!fieldConfigs) return defaultLabel;
      const config = fieldConfigs.get(fieldKey);
      return config?.customLabel || config?.fieldLabel || defaultLabel;
    };

    // ✅ Helper function to get formatting styles for specific section
    const getFormattingStyle = (section: 'header' | 'body' | 'footer'): React.CSSProperties => {
      if (!formatConfig) return {};
      
      const baseStyle: React.CSSProperties = {
        fontFamily: getFontFamily(formatConfig.fontFamily),
      };

      switch (section) {
        case 'header':
          return { ...baseStyle, fontSize: `${formatConfig.fontSizeHeader}pt` };
        case 'body':
          return { ...baseStyle, fontSize: `${formatConfig.fontSizeBody}pt`, lineHeight: formatConfig.lineHeight };
        case 'footer':
          return { ...baseStyle, fontSize: `${formatConfig.fontSizeFooter}pt` };
        default:
          return baseStyle;
      }
    };

    const strip = (s: string) => s?.replace(/<[^>]*>/g, '').trim() ?? '';
    const hasHtml = (s: string) => /<[^>]*>/.test(s ?? '');
    const safe = (html: string) => DOMPurify.sanitize(html ?? '');

    const abnormal = (param: any, v: any): boolean => {
      if (param.type !== 'Numeric' || v == null || v === '') return false;
      const s = param.normalRange || param.rangeText;
      if (!s) return false;
      const m = s.toString().match(/^([\d.]+)\s*-\s*([\d.]+)$/);
      if (!m) return false;
      const n = parseFloat(v);
      return n < parseFloat(m[1]) || n > parseFloat(m[2]);
    };

    // ✅ NEW: Get display range text - prioritize textContent, then gender-specific, then numeric ranges
    const getDisplayRangeText = (param: any, patientGender?: string, ageYears?: number, ageMonths?: number, ageDays?: number): string => {
      // For TEXT/Descriptive types, ONLY show textContent - NEVER show fallback ranges
      if (param.type === 'Text' || param.isDescriptive) {
        if (param.textContent?.trim() && param.textContent !== '-') {
          return param.textContent;
        }
        // For TEXT types without textContent, return empty (no fallback to normalRange)
        return '';
      }
      
      // For NUMERIC types with AGE RANGES - check age-specific default values first
      if (param.rangeType === 'ByAge' && param.ageRanges && (ageYears !== undefined || ageMonths !== undefined || ageDays !== undefined)) {
        try {
          const age = { years: ageYears ?? 0, months: ageMonths ?? 0, days: ageDays ?? 0 };
          let ageRanges = JSON.parse(param.ageRanges);
          const gender = patientGender?.toLowerCase();
          
          // Sort by gender priority
          ageRanges = ageRanges.sort((a, b) => {
            const aGender = a.gender?.toLowerCase() || 'both';
            const bGender = b.gender?.toLowerCase() || 'both';
            const aMatchesGender = aGender === gender ? 0 : (aGender === 'both' ? 1 : 2);
            const bMatchesGender = bGender === gender ? 0 : (bGender === 'both' ? 1 : 2);
            return aMatchesGender - bMatchesGender;
          });
          
          for (const range of ageRanges) {
            if (!range.enabled) continue;
            const rangeGender = range.gender?.toLowerCase();
            if (rangeGender && rangeGender !== 'both' && rangeGender !== gender) continue;
            
            let ageMatches = false;
            const ageInUnit = (years, months, days, unit) => {
              if (unit?.includes('Year')) return years;
              if (unit?.includes('Month')) return years * 12 + months;
              return years * 365 + months * 30 + days;
            };
            
            if (range.label?.includes('Less Than') && range.value != null)
              ageMatches = ageInUnit(age.years, age.months, age.days, range.timeUnit) < range.value;
            else if (range.label?.includes('More Than') && range.value != null)
              ageMatches = ageInUnit(age.years, age.months, age.days, range.timeUnit) > range.value;
            else if (range.label?.includes('Between') && range.from != null && range.to != null) {
              const v = ageInUnit(age.years, age.months, age.days, range.timeUnit);
              ageMatches = v >= range.from && v <= range.to;
            }
            
            // If age matches and there's a default text in textarea, show ONLY that
            if (ageMatches && range.default?.trim()) {
              return range.default;
            }
            
            // Otherwise return numeric range if available
            if (ageMatches && range.ll != null && range.ul != null) {
              return `${range.ll} - ${range.ul}`;
            }
          }
        } catch (e) {
          console.warn('Error parsing age ranges in report:', e);
        }
      }
      
      // For NUMERIC types, use full priority chain
      // PRIORITY 1: textContent (RIGHT textarea)
      if (param.textContent?.trim() && param.textContent !== '-') {
        return param.textContent;
      }
      
      // PRIORITY 2: Gender-specific display text
      const gender = patientGender?.toLowerCase();
      if (gender === 'female' && param.femaleDisplayText?.trim() && param.femaleDisplayText !== '-') {
        return param.femaleDisplayText;
      }
      if (gender === 'male' && param.maleDisplayText?.trim() && param.maleDisplayText !== '-') {
        return param.maleDisplayText;
      }
      
      // PRIORITY 3: Default/child display text
      if (param.defaultDisplayText?.trim() && param.defaultDisplayText !== '-') {
        return param.defaultDisplayText;
      }
      
      // PRIORITY 4: Gender-specific numeric ranges
      if (gender === 'female' && param.femaleLowValue != null && param.femaleHighValue != null) {
        return `${param.femaleLowValue} - ${param.femaleHighValue}`;
      }
      if (gender === 'male' && param.maleLowValue != null && param.maleHighValue != null) {
        return `${param.maleLowValue} - ${param.maleHighValue}`;
      }
      
      // PRIORITY 5: Child numeric range
      if (param.childLowValue != null && param.childHighValue != null) {
        return `${param.childLowValue} - ${param.childHighValue}`;
      }
      
      // PRIORITY 6: Fallback to normalRange or rangeText (only for Numeric types)
      if (param.normalRange?.trim() && param.normalRange !== '-') {
        return param.normalRange;
      }
      if (param.rangeText?.trim() && param.rangeText !== '-') {
        return param.rangeText;
      }
      
      // FINAL: Empty if nothing available
      return '';
    };

    const allGroupedParams = useMemo(() => {
      const tests = combinedTests.length > 0
        ? combinedTests
        : [{ groupedParameters }];
      return tests.flatMap(t => Object.values(t.groupedParameters || {}));
    }, [combinedTests, groupedParameters]);

    const showUnits = useMemo(() =>
      allGroupedParams.some((cp: any) =>
        (cp as any[]).some((p: any) => p.units?.trim() && p.units !== '-')
      ), [allGroupedParams]);

    const showRange = useMemo(() => {
      // If forceShowReferenceRange is true, always show ranges
      if (forceShowReferenceRange) return true;
      
      // Show range column if ANY parameter has:
      // - For Numeric: display text or numeric ranges
      // - For Text/Descriptive: display text (RIGHT textarea content)
      return allGroupedParams.some((cp: any) =>
        (cp as any[]).some((p: any) => {
          // For Text/Descriptive types, check for textContent only
          if (p.type === 'Text' || p.isDescriptive) {
            return (p.textContent?.trim() && p.textContent !== '-');
          }
          
          // For Numeric types, check display text and numeric ranges
          const hasDisplayText = (p.textContent?.trim() && p.textContent !== '-') ||
                                (p.maleDisplayText?.trim() && p.maleDisplayText !== '-') ||
                                (p.femaleDisplayText?.trim() && p.femaleDisplayText !== '-') ||
                                (p.defaultDisplayText?.trim() && p.defaultDisplayText !== '-');
          
          const hasNumericRanges = (p.maleLowValue != null && p.maleHighValue != null) ||
                                   (p.femaleLowValue != null && p.femaleHighValue != null) ||
                                   (p.childLowValue != null && p.childHighValue != null);
          
          const hasRangeText = (p.normalRange?.trim() && p.normalRange !== '-') ||
                              (p.rangeText?.trim() && p.rangeText !== '-');
          
          return hasDisplayText || hasNumericRanges || hasRangeText;
        })
      );
    }, [allGroupedParams, forceShowReferenceRange]);

    // ✅ Memoize formatting object to prevent unnecessary updates
    const memoizedFormatting = useMemo(() => ({
      fontFamily: formatConfig?.fontFamily || 'Bookman Old Text',
      fontSizeBody: formatConfig?.fontSizeBody || 11,
      fontSizeHeader: formatConfig?.fontSizeHeader || 14,
      fontSizeFooter: formatConfig?.fontSizeFooter || 9,
      lineHeight: formatConfig?.lineHeight || 1.4,
    }), [formatConfig?.fontFamily, formatConfig?.fontSizeBody, formatConfig?.fontSizeHeader, formatConfig?.fontSizeFooter, formatConfig?.lineHeight]);

    useEffect(() => {
      // Add small delay to ensure formatConfig is fully loaded before rendering pages
      const timer = setTimeout(() => {
        const testsToRender = combinedTests.length > 0
          ? combinedTests
          : [{ 
              name: test?.name, 
              interpretation: test?.interpretation,
              signature: test?.signature, 
              groupedParameters,
              usedMachine: null
            }];

        const blocks = buildContentBlocks(testsToRender, results, printOption, comments);
        setPages(paginateBlocks(blocks));
      }, 100); // Small delay to ensure state is stable

      return () => clearTimeout(timer);
    }, [test, groupedParameters, combinedTests, results, printOption, comments, fieldConfigs, formatConfig]);

    useEffect(() => {
      if (!ready || pages.length === 0 || !onReady || onReadyCalled.current) return;

      const notify = () => {
        if (onReadyCalled.current) return;
        onReadyCalled.current = true;
        onReady();
      };

      requestAnimationFrame(() => {
        const imgs = reportRef.current?.querySelectorAll('img') ?? [];
        if (imgs.length === 0) { notify(); return; }
        let loaded = 0;
        const check = () => { loaded++; if (loaded >= imgs.length) notify(); };
        imgs.forEach((img: HTMLImageElement) => {
          if (img.complete) check();
          else {
            img.addEventListener('load', check, { once: true });
            img.addEventListener('error', check, { once: true });
          }
        });
      });
    }, [ready, pages, onReady]);

    const colCount = 2 + (showUnits ? 1 : 0) + (showRange ? 1 : 0);

    const renderParamRow = (p: any, key: string) => {
      const nv = results[p.id]?.numericValue;
      const tv = results[p.id]?.textValue;
      const isHighlighted = results[p.id]?.isHighlighted === true;
      const isabn =
        results[p.id]?.isAbnormal === true ||
        results[p.id]?.isAbnormal === 1 ||
        abnormal(p, nv);

      // ✅ Prioritize textValue from TestResult table if present
      let val = '-';
      if (tv && tv.trim() && tv.trim() !== 'Parameter') {
        // TextValue is available - use it
        val = tv;
      } else if (p.type === 'Numeric' && nv != null) {
        // No textValue, use numericValue for numeric types
        val = String(nv);
      }

      // ✅ FILTER: Hide parameters with no meaningful value (empty string or only "-")
      if (val === '-' || (typeof val === 'string' && val.trim() === '')) {
        console.log(`🚫 Hiding parameter ${p.parameterName} with value: "${val}"`);
        return null; // Return null to skip rendering
      }

      // ✅ Get styling from field configuration
      const paramStyle = getFieldStyle('parameter_name');
      const bodyStyle = getFormattingStyle('body');

      return (
        <tr key={key} style={{ borderBottom: 'none', minHeight: '14px', lineHeight: '1.25' }}>
          <td style={{ 
            padding: '1px 3px',
            ...bodyStyle,
            fontWeight: (isabn || isHighlighted) ? 'bold' : (paramStyle.fontWeight || 'normal'),
            fontStyle: paramStyle.fontStyle || 'normal',
            textDecoration: isHighlighted ? 'underline' : (paramStyle.textDecoration || 'none'),
            minHeight: '14px',
            fontSize: '11px',
          }}>
            {strip(p.parameterName ?? '').toUpperCase()}
            {p.parameterTestMethod && (
              <div style={{ fontSize: '9px', color: '#000', fontWeight: 'normal', marginTop: '0px', marginBottom: '1px' }}>
                <small>METHOD: {p.parameterTestMethod}</small>
              </div>
            )}
          </td>
          <td style={{ 
            padding: '1px 3px',
            textAlign: 'left',
            ...bodyStyle,
            fontWeight: isabn || isHighlighted ? 'bold' : 'normal',
            color: isHighlighted ? '#c0392b' : (isabn ? '#c0392b' : 'inherit'),
            minHeight: '14px',
            fontSize: '11px',
          }}>
            {(p.isDescriptive || hasHtml(val)) && val !== '-' ? (
              // ✅ For any text with HTML or descriptive fields: Convert <b> tags to bold CSS styling
              <div 
                dangerouslySetInnerHTML={{ __html: safe(val).replace(/<b>/g, '<span style="font-weight:bold;">').replace(/<\/b>/g, '</span>') }} 
                style={{ whiteSpace: 'normal', textAlign: 'left', fontWeight: 'normal' }} 
              />
            ) : (
              <>{val}{(isabn || isHighlighted) && val !== '-' ? ' *' : ''}</>
            )}
          </td>
          {showUnits && (
            <td style={{ padding: '1px 3px', textAlign: 'center', ...bodyStyle, color: '#000', minHeight: '14px', fontSize: '11px' }}>
              {strip(p.units ?? '') || '-'}
            </td>
          )}
          {showRange && (
            <td style={{ padding: '1px 3px', ...bodyStyle, color: '#000', minHeight: '14px', fontSize: '11px' }}>
              {strip(getDisplayRangeText(p, patient?.gender, patient?.ageYears, patient?.ageMonths, patient?.ageDays) || '') || ''}
            </td>
          )}
        </tr>
      );
    };

    const renderTableHead = () => {
      const headerStyle = getFormattingStyle('header');
      // Match PDF format: bold headers with proper text size
      const tableHeaderStyle = { ...headerStyle, fontSize: '11px', fontWeight: 'bold' };
      
      return (
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ ...TH, ...tableHeaderStyle, width: '40%', textAlign: 'left', borderBottom: 'none', fontWeight: 'bold' }}>
              {getFieldLabel('parameter_name', 'Test Description')}
            </th>
            <th style={{ ...TH, ...tableHeaderStyle, width: showUnits || showRange ? '18%' : '30%', textAlign: 'left', borderBottom: 'none', fontWeight: 'bold' }}>
              {getFieldLabel('result_value', 'Value(s)')}
            </th>
            {showUnits && (
              <th style={{ ...TH, ...tableHeaderStyle, width: '12%', textAlign: 'center', borderBottom: 'none', fontWeight: 'bold' }}>
                {getFieldLabel('unit', 'Unit')}
              </th>
            )}
            {showRange && (
              <th style={{ ...TH, ...tableHeaderStyle, width: '30%', textAlign: 'left', borderBottom: 'none', fontWeight: 'bold' }}>
                {getFieldLabel('reference_range', 'Reference Range')}
              </th>
            )}
          </tr>
        </thead>
      );
    };

    const renderPage = (pg: ReportPage) => {
      const letterheadSrc = lh?.fullPageImage || lh?.headerImage || letterHeadBase64 || null;

      const segments: React.ReactNode[] = [];
      let tableRows: React.ReactNode[] = [];
      let tableKey = 0;
      let needsTableHeader = false;

      const flushTable = () => {
        if (tableRows.length === 0 && !needsTableHeader) return;
        segments.push(
          <table key={`tbl-${tableKey++}`} style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: `${formatConfig?.fontSizeBody || 11}px`, 
            flexShrink: 0, 
            backgroundColor: 'transparent',
            fontFamily: getFontFamily(formatConfig?.fontFamily || 'Bookman Old Text'),
            lineHeight: formatConfig?.lineHeight || 1.4,
          }}>
            {renderTableHead()}
            <tbody>{tableRows}</tbody>
          </table>
        );
        tableRows = [];
        needsTableHeader = false;
      };

      pg.blocks.forEach((block, bi) => {
        switch (block.kind) {
          case 'patient':
            // ✅ Build patient info rows based on field visibility settings
            const patientRows: React.ReactNode[] = [];
            const bodyStyle = getFormattingStyle('body');

            // Row 1: Patient Name & Age
            const row1: React.ReactNode[] = [];
            if (isFieldVisible('patient_name')) {
              const nameStyle = { ...PATIENT_TD, ...getFieldStyle('patient_name'), ...bodyStyle };
              const nameValue = [patient.title, patient.firstName, patient.lastName].filter(Boolean).join(' ').toUpperCase();
              row1.push(
                <td key="pn" style={{...nameStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  {getFieldLabel('patient_name', 'Patient Name')} : <b>{nameValue}</b>
                </td>
              );
            }
            if (isFieldVisible('patient_age') || isFieldVisible('gender')) {
              const ageStyle = { ...PATIENT_TD, ...getFieldStyle('patient_age'), ...bodyStyle };
              
              // Format age properly from age components
              let ageDisplay = '-';
              if (patient.ageYears !== undefined || patient.ageMonths !== undefined || patient.ageDays !== undefined) {
                const years = patient.ageYears || 0;
                const months = patient.ageMonths || 0;
                const days = patient.ageDays || 0;
                
                if (years === 0) {
                  ageDisplay = `${months}M ${days}D`;
                } else if (years < 12) {
                  ageDisplay = `${years}Y ${months}M ${days}D`;
                } else {
                  const decimalAge = (years + months / 12).toFixed(1);
                  ageDisplay = `${decimalAge} years`;
                }
              } else if (patient.age) {
                ageDisplay = `${patient.age} years`;
              }
              
              row1.push(
                <td key="age" style={{...ageStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Age : {ageDisplay} ({patient.gender ?? '-'})
                </td>
              );
            }
            if (row1.length > 0) patientRows.push(<tr key="r1" style={{height: 'auto'}}>{row1}</tr>);

            // Row 2: Referral Doctor & Organization
            const row2: React.ReactNode[] = [];
            if (isFieldVisible('referred_doctor')) {
              const refStyle = { ...PATIENT_TD, ...getFieldStyle('referred_doctor'), ...bodyStyle };
              row2.push(
                <td key="ref" style={{...refStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Referral : {referralDoctor || '-'}
                </td>
              );
            }
            if (isFieldVisible('organization_name')) {
              const orgStyle = { ...PATIENT_TD, ...getFieldStyle('organization_name'), ...bodyStyle };
              row2.push(
                <td key="org" style={{...orgStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Org Name : {patient.organizationName || 'Shraddha Pathology Laboratory'}
                </td>
              );
            }
            if (row2.length > 0) patientRows.push(<tr key="r2" style={{height: 'auto'}}>{row2}</tr>);

            // Row 3: Sample Date & Registration ID
            const row3: React.ReactNode[] = [];
            if (isFieldVisible('sample_date')) {
              const sampleDateStyle = { ...PATIENT_TD, ...getFieldStyle('sample_date'), ...bodyStyle };
              row3.push(
                <td key="sd" style={{...sampleDateStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Sample Date : {visitDate ? new Date(visitDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('am', 'a.m.').replace('pm', 'p.m.') : '-'}
                </td>
              );
            }
            if (isFieldVisible('registration_no')) {
              const regStyle = { ...PATIENT_TD, ...getFieldStyle('registration_no'), ...bodyStyle };
              row3.push(
                <td key="reg" style={{...regStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Reg. ID : {visitId || '-'}
                </td>
              );
            }
            if (row3.length > 0) patientRows.push(<tr key="r3" style={{height: 'auto'}}>{row3}</tr>);

            // Row 4: Report Date & Sample ID
            const row4: React.ReactNode[] = [];
            if (isFieldVisible('report_date')) {
              const reportDateStyle = { ...PATIENT_TD, ...getFieldStyle('report_date'), ...bodyStyle };
              row4.push(
                <td key="rd" style={{...reportDateStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Report Date : {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('am', 'a.m.').replace('pm', 'p.m.')}
                </td>
              );
            }
            if (isFieldVisible('sample_id')) {
              const sampleIdStyle = { ...PATIENT_TD, ...getFieldStyle('sample_id'), ...bodyStyle };
              row4.push(
                <td key="si" style={{...sampleIdStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Sample ID : {visitId || '-'}
                </td>
              );
            }
            if (row4.length > 0) patientRows.push(<tr key="r4" style={{height: 'auto'}}>{row4}</tr>);

            // Row 5: Mobile & Email (System Fields - Optional)
            const row5: React.ReactNode[] = [];
            if (isFieldVisible('mobile')) {
              const mobileStyle = { ...PATIENT_TD, ...getFieldStyle('mobile'), ...bodyStyle };
              row5.push(
                <td key="mob" style={{...mobileStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Mobile : {patient.mobile ?? '-'}
                </td>
              );
            }
            if (isFieldVisible('email')) {
              const emailStyle = { ...PATIENT_TD, ...getFieldStyle('email'), ...bodyStyle };
              row5.push(
                <td key="email" style={{...emailStyle, lineHeight: '1.2', fontSize: '11px' }}>
                  Email : {patient.email ?? '-'}
                </td>
              );
            }
            if (row5.length > 0) patientRows.push(<tr key="r5" style={{height: 'auto'}}>{row5}</tr>);

            // Row 6: Address (System Fields - Optional)
            const row6: React.ReactNode[] = [];
            if (isFieldVisible('address')) {
              const addressStyle = { ...PATIENT_TD, ...getFieldStyle('address'), ...bodyStyle };
              row6.push(
                <td key="addr" style={{...addressStyle, lineHeight: '1.2', fontSize: '11px' }} colSpan={2}>
                  Address : {patient.address ?? '-'}
                </td>
              );
            }
            if (row6.length > 0) patientRows.push(<tr key="r6" style={{height: 'auto'}}>{row6}</tr>);

            // ✅ MERGED: Combine report settings + QR code functionality
            const showQRInReport = formatConfig?.showQRCode !== false;
            
            segments.push(
              <div key={`pat-${bi}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3mm', gap: '2mm', flexShrink: 0 }}>
                {/* Left side: Patient info using field visibility settings */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: `${formatConfig?.fontSizeBody || 11}px`, backgroundColor: 'transparent', flexShrink: 0, fontFamily: getFontFamily(formatConfig?.fontFamily || 'Bookman Old Text') }}>
                  <tbody>{patientRows}</tbody>
                </table>

                {/* Right side: Single QR code for entire visit (if enabled) */}
                {showQRInReport && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0, minWidth: 'fit-content' }}>
                    {(() => {
                      const qrCode = qrCodes[visitId || 'default'];
                      return qrCode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5mm', flexShrink: 0 }}>
                          <img 
                            src={qrCode} 
                            alt="QR Code for Visit"
                            style={{ width: '15mm', height: '15mm', flexShrink: 0 }}
                          />
                          <div style={{ fontSize: '6px', textAlign: 'center', maxWidth: '25mm', wordBreak: 'break-word', fontWeight: 'bold' }}>
                            Visit ID:<br/>{visitId}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            );
            break;

          case 'test-title':
            flushTable();
            const titleStyle = getFormattingStyle('body');
            segments.push(
              <div key={`title-${bi}`} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline', paddingBottom: '2mm', marginBottom: '2mm', flexShrink: 0, ...titleStyle }}>
                <u><b>{strip(block.testData.name ?? '').toUpperCase()}</b></u>
              </div>
            );
            break;

          case 'test-gap':
            flushTable();
            segments.push(
              <div key={`gap-${bi}`} style={{ borderTop: '1px dashed #999', margin: '3mm 0 4mm', flexShrink: 0, minHeight: '2mm' }} />
            );
            break;

          case 'thead':
            flushTable();
            needsTableHeader = true;
            break;

          case 'category':
            // ✅ Render category as a bold row header
            tableRows.push(
              <tr key={`cat-${bi}`} style={{ borderBottom: 'none', minHeight: '12px' }}>
                <td colSpan={2 + (showUnits ? 1 : 0) + (showRange ? 1 : 0)} style={{ 
                  padding: '1px 3px',
                  fontWeight: 'bold',
                  fontSize: `${formatConfig?.fontSizeBody || 11}px`,
                  color: '#000',
                  minHeight: '12px',
                  lineHeight: '1.25',
                  ...getFormattingStyle('body')
                }}>
                  <u>{strip(block.catName ?? '').toUpperCase()}</u>
                </td>
              </tr>
            );
            break;

          case 'param':
            const paramRow = renderParamRow(block.param, `p-${bi}`);
            if (paramRow !== null) {
              tableRows.push(paramRow);
            }
            break;

          case 'comments':
            // ✅ Render comments as a table row within the results table
            // Strip line breaks to make it continuous flowing text
            const commentsText = strip(block.text).replace(/\n/g, ' ').replace(/\s+/g, ' ');
            tableRows.push(
              <tr key={`comments-${bi}`} style={{ borderTop: '1px solid #000', borderBottom: 'none' }}>
                <td style={{ padding: '2px 4px 2px 2mm', fontWeight: 'bold', fontSize: '12px', color: '#000' }}>
                  COMMENTS
                </td>
                <td colSpan={showUnits || showRange ? 3 : 2} style={{ padding: '2px 4px', fontSize: '12px', color: '#000', whiteSpace: 'normal', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word', fontWeight: 'normal' }}>
                  {commentsText}
                </td>
              </tr>
            );
            break;

          case 'instrument':
            // ✅ Render instrument/machine as a table row within the results table
            tableRows.push(
              <tr key={`instrument-${bi}`} style={{ borderTop: '1px solid #000', borderBottom: 'none' }}>
                <td style={{ padding: '2px 4px 2px 2mm', fontWeight: 'bold', fontSize: '12px', color: '#000', verticalAlign: 'middle' }}>
                  INSTRUMENT
                </td>
                <td colSpan={showUnits || showRange ? 3 : 2} style={{ padding: '2px 4px', fontSize: '12px', color: '#000', whiteSpace: 'normal', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word', fontWeight: 'normal', verticalAlign: 'middle' }}>
                  {block.machine?.name || '-'}{block.machine?.description ? ` (${block.machine.description})` : ''}
                </td>
              </tr>
            );
            break;

          case 'interpretation':
            flushTable();
            segments.push(
              <div key={`interp-${bi}`} style={{ marginTop: '3mm', fontSize: '12px', lineHeight: '1.6', borderTop: '1px solid #aaa', paddingTop: '2mm', flexShrink: 0 }}>
                <b style={{ display: 'block', marginBottom: '1mm' }}>Interpretation:</b>
                <div dangerouslySetInnerHTML={{ __html: safe(block.testData.interpretation) }} style={{ whiteSpace: 'pre-wrap' }} />
              </div>
            );
            break;

          case 'signature': {
            flushTable();
            const sig = signature;
            // Always render signature block - even if no image, show doctor info
            segments.push(
              <div key={`sig-${bi}`} style={{ marginTop: '4mm', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <div style={{ textAlign: 'center', minWidth: '45mm', marginRight: '0' }}>
                  {sig?.signatureImage && (
                    <img src={sig.signatureImage} alt="signature" style={{ display: 'block', maxHeight: '16mm', maxWidth: '45mm', objectFit: 'contain', margin: '0 auto 2px' }} />
                  )}
                  <div style={{ fontSize: '8.5px', fontWeight: 'bold', lineHeight: '1.3' }}>
                    {sig?.doctorName || sig?.signatureText || 'Dr. (Name)'}
                  </div>
                  <div style={{ fontSize: '7.5px', color: '#555', lineHeight: '1.2' }}>
                    {sig?.speciality || 'M.D. (Pathology)'}
                  </div>
                  <div style={{ fontSize: '7.5px', color: '#555' }}>Consulting Pathologist</div>
                </div>
              </div>
            );
            break;
          }

          default:
            break;
        }
      });

      flushTable();

      return (
        <div
          key={pg.pageNo}
          className={`report-page${pg.pageNo > 0 ? ' report-page--continued' : ''}`}
          style={{
            position: 'relative',
            width: '210mm',
            height: '296mm',
            backgroundColor: '#fff',
            fontFamily: getFontFamily(formatConfig?.fontFamily || 'Bookman Old Text'),
            fontSize: `${formatConfig?.fontSizeBody || 11}px`,
            lineHeight: formatConfig?.lineHeight || 1.4,
            margin: '0 auto',
            overflow: 'hidden',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {letterheadSrc && (
            <img
              src={letterheadSrc}
              alt="letterhead"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              top: `${HEADER_SPACE_MM + PAD_TOP_MM}mm`,
              left: `${PAD_LEFT_MM}mm`,
              right: `${PAD_RIGHT_MM}mm`,
              bottom: `${FOOTER_SPACE_MM + PAD_BOT_MM}mm`,
              zIndex: 1,
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              fontSize: `${formatConfig?.fontSizeBody || 11}px`,
              fontFamily: getFontFamily(formatConfig?.fontFamily || 'Bookman Old Text'),
              lineHeight: formatConfig?.lineHeight || 1.4,
            }}
          >
            {segments}
          </div>

          {/* Footer text removed */}
        </div>
      );
    };

    if (!ready) {
      return <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>Loading report…</div>;
    }

    return (
      <div ref={(node) => {
        reportRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }} className="professional-report" style={{ fontFamily: getFontFamily(formatConfig?.fontFamily || 'Bookman Old Text') }}>
        <style>{`
          @page {
            size: A4 portrait;
            margin: 0;
          }

          @media print {
            html, body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: 100% !important;
            }

            body * {
              visibility: hidden !important;
            }

            .professional-report,
            .professional-report * {
              visibility: visible !important;
            }

            .professional-report {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .report-page {
              position: relative !important;
              width: 210mm !important;
              height: 296mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              overflow: hidden !important;
              background: white !important;
              page-break-after: auto !important;
              break-after: auto !important;
            }

            .report-page--continued {
              page-break-before: always !important;
              break-before: page !important;
            }

            .no-print {
              display: none !important;
            }
          }

          @media screen {
            .report-page {
              margin: 16px auto;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
          }
        `}</style>
        {pages.map(pg => renderPage(pg))}
      </div>
    );
  }
);

ProfessionalReport.displayName = 'ProfessionalReport';

const PATIENT_TD: React.CSSProperties = {
  padding: '1px 3px',
  verticalAlign: 'top',
  width: '50%',
  backgroundColor: 'transparent',
  border: 'none',
  minHeight: '14px',
  lineHeight: '1.25',
  fontSize: '11px',
};

const TH: React.CSSProperties = {
  padding: '2px 4px',
  fontWeight: 'bold',  // Bold headers to match PDF
  fontSize: '11px',  // Standard body font size
  textAlign: 'left',
  backgroundColor: 'transparent',
  minHeight: '14px',
  lineHeight: '1.25',
};

export default ProfessionalReport;
