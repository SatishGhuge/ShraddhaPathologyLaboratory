"use client";

/**
 * ProfessionalReport - Full-Page Letterhead Design
 * Multi-test reports flow onto the minimum number of A4 pages.
 * Tests share one patient header; new pages only when content overflows.
 */

import React, { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import API_BASE_URL from "@/src/api/config";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PatientInfo {
  title?: string;
  firstName?: string;
  lastName?: string;
  age?: number | string;  // Can be number or formatted string like "1 month 3 days"
  gender?: string;
  dob?: string;  // Birthday date for babies
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
  showBarcode: boolean;
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
  comments?: string;  // ✅ Comments field
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

const HEADER_SPACE_MM = 25;
const FOOTER_SPACE_MM = 10;
const PAD_LEFT_MM = 12;
const PAD_RIGHT_MM = 12;
const PAD_TOP_MM = 5;
const PAD_BOT_MM = 5;

const CONTENT_MM = 297 - HEADER_SPACE_MM - FOOTER_SPACE_MM - PAD_TOP_MM - PAD_BOT_MM;

const ROW_PARAM_MM = 5.5;
const ROW_CAT_MM = 6;
const PATIENT_MM = 22;
const TITLE_MM = 9;
const THEAD_MM = 7;
const INTERP_MM = 22;
const SIG_MM = 20;
const TEST_GAP_MM = 9;  // Increased from 4 to match new margin (3+4+2=9)

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
  comments?: string  // ✅ Add comments parameter
): ContentBlock[] {
  const blocks: ContentBlock[] = [{ kind: 'patient' }];
  
  // ✅ Debug: Log comments at start of build
  console.log('📦 buildContentBlocks - Comments input:', { comments, hasComments: !!comments });

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

    Object.entries(testItem.groupedParameters || {}).forEach(
      ([catName, catParams]: [string, any]) => {
        const visible = (catParams as any[]).filter(p => {
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
      }
    );

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
  console.log('📦 buildContentBlocks - Total blocks:', blocks.length, 'including comments block:', blocks.some(b => b.kind === 'comments'));
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
      comments = '',  // ✅ Extract comments from props
      onReady,
    } = props;

    const [lh, setLh] = useState<LetterheadDB | null>(null);
    const [ready, setReady] = useState(false);
    const [pages, setPages] = useState<ReportPage[]>([]);
    const [fieldConfigs, setFieldConfigs] = useState<Map<string, FieldConfig> | null>(null);
    const [formatConfig, setFormatConfig] = useState<FormattingConfig | null>(null);
    const reportRef = React.useRef<HTMLDivElement>(null);
    const onReadyCalled = React.useRef(false);

    // ✅ Load report settings from API
    useEffect(() => {
      const loadReportSettings = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/report-settings`);
          if (response.ok) {
            const data = await response.json();
            if (data.data) {
              // Convert fields array to Map for faster lookup
              const fieldsMap = new Map<string, FieldConfig>(
                (data.data.fields || []).map((f: FieldConfig) => [f.fieldKey, f])
              );
              setFieldConfigs(fieldsMap);
              setFormatConfig(data.data.formatting);
              console.log('✅ Report settings loaded:', {
                fieldsCount: fieldsMap.size,
                fontFamily: data.data.formatting?.fontFamily,
                fontSize: data.data.formatting?.fontSizeBody
              });
            }
          }
        } catch (error) {
          console.warn('[ProfessionalReport] Failed to load report settings:', error);
          // Continue with defaults if API fails
        }
      };

      loadReportSettings();

      // Refresh settings every 2 seconds to detect changes from settings page
      const interval = setInterval(loadReportSettings, 2000);

      // Also refresh when window/tab comes into focus
      const handleFocus = () => {
        console.log('📱 Window focused, refreshing report settings');
        loadReportSettings();
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    }, []);

    // ✅ Debug logging for data flow
    useEffect(() => {
      console.log('🔍 ProfessionalReport received:', {
        commentsLength: comments?.length,
        commentsExists: !!comments,
        commentsValue: comments,
        resultsKeys: Object.keys(results || {}).length,
        firstResult: Object.entries(results || {}).slice(0, 1),
        fieldConfigsLoaded: !!fieldConfigs,
        formatConfigLoaded: !!formatConfig
      });
    }, [results, comments, fieldConfigs, formatConfig]);

    useEffect(() => {
      let dead = false;
      (async () => {
        try {
          // Use letterhead passed as prop first
          if (letterhead?.fullPageImage || letterhead?.headerImage) {
            if (!dead) {
              setLh(letterhead);
              setReady(true);
            }
            return;
          }
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
    const isFieldVisible = (fieldKey: string): boolean => {
      if (!fieldConfigs) return true; // Default: show all if settings not loaded
      const config = fieldConfigs.get(fieldKey);
      return config ? config.isVisible : true;
    };

    // ✅ Helper function to get field styling
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
        fontFamily: formatConfig.fontFamily,
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

    const showRange = useMemo(() =>
      allGroupedParams.some((cp: any) =>
        (cp as any[]).some((p: any) => {
          if (p.type === 'Text' || p.isDescriptive) return false;
          const r = p.normalRange || p.rangeText;
          return r?.trim() && r !== '-';
        })
      ), [allGroupedParams]);

    useEffect(() => {
      const testsToRender = combinedTests.length > 0
        ? combinedTests
        : [{ 
            name: test?.name, 
            interpretation: test?.interpretation,
            signature: test?.signature, 
            groupedParameters,
            usedMachine: null  // ✅ Add usedMachine for consistency
          }];

      console.log('🔍 ProfessionalReport useEffect - testsToRender:', {
        count: testsToRender.length,
        tests: testsToRender.map((t: any) => ({
          name: t.name,
          hasMachine: !!t.usedMachine,
          machine: t.usedMachine
        }))
      });

      const blocks = buildContentBlocks(testsToRender, results, printOption, comments);
      setPages(paginateBlocks(blocks));
    }, [test, groupedParameters, combinedTests, results, printOption, comments]);

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

      // ✅ Get styling from field configuration
      const paramStyle = getFieldStyle('parameter_name');
      const bodyStyle = getFormattingStyle('body');

      return (
        <tr key={key} style={{ borderBottom: 'none' }}>
          <td style={{ 
            padding: '2px 4px 2px 2mm',
            ...bodyStyle,
            fontWeight: (isabn || isHighlighted) ? 'bold' : (paramStyle.fontWeight || 'normal'),
            fontStyle: paramStyle.fontStyle || 'normal',
            textDecoration: isHighlighted ? 'underline' : (paramStyle.textDecoration || 'none'),
          }}>
            {strip(p.parameterName ?? '').toUpperCase()}
            {p.parameterTestMethod && (
              <div style={{ fontSize: '7.5px', color: '#000', fontWeight: 'normal', marginTop: '1px' }}>
                METHOD: {p.parameterTestMethod}
              </div>
            )}
          </td>
          <td style={{ 
            padding: '2px 4px',
            textAlign: 'left',
            ...bodyStyle,
            fontWeight: isabn || isHighlighted ? 'bold' : 'normal',
            color: isHighlighted ? '#c0392b' : (isabn ? '#c0392b' : 'inherit'),
          }}>
            {p.isDescriptive && val !== '-' && hasHtml(val) ? (
              <div dangerouslySetInnerHTML={{ __html: safe(val) }} style={{ whiteSpace: 'normal', textAlign: 'left', fontWeight: 'normal' }} />
            ) : (
              <>{val}{(isabn || isHighlighted) && val !== '-' ? ' *' : ''}</>
            )}
          </td>
          {showUnits && (
            <td style={{ padding: '2px 4px', textAlign: 'center', ...bodyStyle, color: '#000' }}>
              {strip(p.units ?? '') || '-'}
            </td>
          )}
          {showRange && (
            <td style={{ padding: '2px 4px', ...bodyStyle, color: '#000' }}>
              {strip(p.normalRange || p.rangeText || '') || '-'}
            </td>
          )}
        </tr>
      );
    };

    const renderTableHead = () => {
      const headerStyle = getFormattingStyle('header');
      return (
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ ...TH, ...headerStyle, width: '40%', textAlign: 'left', borderBottom: 'none' }}>
              {getFieldLabel('parameter_name', 'Test Description')}
            </th>
            <th style={{ ...TH, ...headerStyle, width: showUnits || showRange ? '18%' : '30%', textAlign: 'left', borderBottom: 'none' }}>
              {getFieldLabel('result_value', 'Value(s)')}
            </th>
            {showUnits && (
              <th style={{ ...TH, ...headerStyle, width: '12%', textAlign: 'center', borderBottom: 'none' }}>
                {getFieldLabel('unit', 'Unit')}
              </th>
            )}
            {showRange && (
              <th style={{ ...TH, ...headerStyle, width: '30%', textAlign: 'left', borderBottom: 'none' }}>
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
          <table key={`tbl-${tableKey++}`} style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${formatConfig?.fontSizeBody || 11}px`, flexShrink: 0, backgroundColor: 'transparent', ...getFormattingStyle('body') }}>
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
              // ✅ FIX: Apply style to name value directly, not using <b> tag which overrides CSS
              const nameValue = [patient.title, patient.firstName, patient.lastName].filter(Boolean).join(' ').toUpperCase();
              row1.push(
                <td key="pn" style={nameStyle}>
                  {getFieldLabel('patient_name', 'Patient Name')} : <span style={{ fontWeight: nameStyle.fontWeight, fontStyle: nameStyle.fontStyle, textDecoration: nameStyle.textDecoration }}>{nameValue}</span>
                </td>
              );
            }
            if (isFieldVisible('patient_age') || isFieldVisible('gender')) {
              const ageStyle = { ...PATIENT_TD, ...getFieldStyle('patient_age'), ...bodyStyle };
              row1.push(
                <td key="age" style={ageStyle}>
                  {getFieldLabel('patient_age', 'Age')} : {patient.age ?? '-'} {patient.age ? 'years' : ''} ({patient.gender ?? '-'})
                </td>
              );
            }
            if (row1.length > 0) patientRows.push(<tr key="r1">{row1}</tr>);

            // Row 2: Referral Doctor & Organization
            const row2: React.ReactNode[] = [];
            if (isFieldVisible('referred_doctor')) {
              const refStyle = { ...PATIENT_TD, ...getFieldStyle('referred_doctor'), ...bodyStyle };
              row2.push(
                <td key="ref" style={refStyle}>
                  {getFieldLabel('referred_doctor', 'Referral')} : {referralDoctor || '-'}
                </td>
              );
            }
            if (isFieldVisible('organization_name')) {
              const orgStyle = { ...PATIENT_TD, ...getFieldStyle('organization_name'), ...bodyStyle };
              row2.push(
                <td key="org" style={orgStyle}>
                  {getFieldLabel('organization_name', 'Org Name')} : {patient.title ? '1500' : 'Shraddha Pathology Laboratory'}
                </td>
              );
            }
            if (row2.length > 0) patientRows.push(<tr key="r2">{row2}</tr>);

            // Row 3: Sample Date & Registration ID
            const row3: React.ReactNode[] = [];
            if (isFieldVisible('sample_date')) {
              const sampleDateStyle = { ...PATIENT_TD, ...getFieldStyle('sample_date'), ...bodyStyle };
              row3.push(
                <td key="sd" style={sampleDateStyle}>
                  {getFieldLabel('sample_date', 'Sample Date')} :{' '}
                  {visitDate ? new Date(visitDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('am', 'a.m.').replace('pm', 'p.m.') : '-'}
                </td>
              );
            }
            if (isFieldVisible('registration_no')) {
              const regStyle = { ...PATIENT_TD, ...getFieldStyle('registration_no'), ...bodyStyle };
              row3.push(
                <td key="reg" style={regStyle}>
                  {getFieldLabel('registration_no', 'Reg. ID')} : {visitId || '-'}
                </td>
              );
            }
            if (row3.length > 0) patientRows.push(<tr key="r3">{row3}</tr>);

            // Row 4: Report Date & Sample ID
            const row4: React.ReactNode[] = [];
            if (isFieldVisible('report_date')) {
              const reportDateStyle = { ...PATIENT_TD, ...getFieldStyle('report_date'), ...bodyStyle };
              row4.push(
                <td key="rd" style={reportDateStyle}>
                  {getFieldLabel('report_date', 'Report Date')} :{' '}
                  {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('am', 'a.m.').replace('pm', 'p.m.')}
                </td>
              );
            }
            if (isFieldVisible('sample_id')) {
              const sampleIdStyle = { ...PATIENT_TD, ...getFieldStyle('sample_id'), ...bodyStyle };
              row4.push(
                <td key="si" style={sampleIdStyle}>
                  {getFieldLabel('sample_id', 'Sample ID')} : {visitId || '-'}
                </td>
              );
            }
            if (row4.length > 0) patientRows.push(<tr key="r4">{row4}</tr>);

            // Row 5: Mobile & Email (System Fields - Optional)
            const row5: React.ReactNode[] = [];
            if (isFieldVisible('mobile')) {
              const mobileStyle = { ...PATIENT_TD, ...getFieldStyle('mobile'), ...bodyStyle };
              row5.push(
                <td key="mob" style={mobileStyle}>
                  {getFieldLabel('mobile', 'Mobile')} : {patient.mobile ?? '-'}
                </td>
              );
            }
            if (isFieldVisible('email')) {
              const emailStyle = { ...PATIENT_TD, ...getFieldStyle('email'), ...bodyStyle };
              row5.push(
                <td key="email" style={emailStyle}>
                  {getFieldLabel('email', 'Email')} : {patient.email ?? '-'}
                </td>
              );
            }
            if (row5.length > 0) patientRows.push(<tr key="r5">{row5}</tr>);

            // Row 6: Address (System Fields - Optional)
            const row6: React.ReactNode[] = [];
            if (isFieldVisible('address')) {
              const addressStyle = { ...PATIENT_TD, ...getFieldStyle('address'), ...bodyStyle };
              row6.push(
                <td key="addr" style={addressStyle} colSpan={2}>
                  {getFieldLabel('address', 'Address')} : {patient.address ?? '-'}
                </td>
              );
            }
            if (row6.length > 0) patientRows.push(<tr key="r6">{row6}</tr>);

            segments.push(
              <table key={`pat-${bi}`} style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${formatConfig?.fontSizeBody || 11}px`, marginBottom: '3mm', flexShrink: 0, backgroundColor: 'transparent', ...getFormattingStyle('header') }}>
                <tbody>{patientRows}</tbody>
              </table>
            );
            break;

          case 'test-title':
            flushTable();
            const titleStyle = getFormattingStyle('body');
            segments.push(
              <div key={`title-${bi}`} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', textDecoration: 'underline', paddingBottom: '1mm', marginBottom: '2mm', flexShrink: 0, ...titleStyle }}>
                {strip(block.testData.name ?? '').toUpperCase()}
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
            // ✅ Don't render category as a separate row - it's just visual grouping
            // Parameters will be rendered directly after this
            break;

          case 'param':
            tableRows.push(renderParamRow(block.param, `p-${bi}`));
            break;

          case 'comments':
            // ✅ Render comments as a table row within the results table
            tableRows.push(
              <tr key={`comments-${bi}`} style={{ borderTop: '1px solid #000', borderBottom: 'none' }}>
                <td style={{ padding: '2px 4px 2px 2mm', fontWeight: 'bold', fontSize: `${(formatConfig?.fontSizeBody || 11) * 0.9}px`, color: '#000', ...getFormattingStyle('body') }}>
                  COMMENTS
                </td>
                <td colSpan={showUnits || showRange ? 2 : 1} style={{ padding: '2px 4px', fontSize: `${(formatConfig?.fontSizeBody || 11) * 0.9}px`, color: '#000', whiteSpace: 'pre-wrap', fontWeight: '900', ...getFormattingStyle('body') }}>
                  {strip(block.text)}
                </td>
              </tr>
            );
            break;

          case 'instrument':
            // ✅ Render instrument/machine as a table row within the results table
            tableRows.push(
              <tr key={`instrument-${bi}`} style={{ borderTop: '1px solid #000', borderBottom: 'none' }}>
                <td style={{ padding: '2px 4px 2px 2mm', fontWeight: 'bold', fontSize: `${(formatConfig?.fontSizeBody || 11) * 0.9}px`, color: '#333', ...getFormattingStyle('body') }}>
                  INSTRUMENT
                </td>
                <td colSpan={showUnits || showRange ? 2 : 1} style={{ padding: '2px 4px', fontSize: `${(formatConfig?.fontSizeBody || 11) * 0.85}px`, color: '#555', whiteSpace: 'pre-wrap', fontWeight: 'bold', ...getFormattingStyle('body') }}>
                  {block.machine?.name || '-'}{block.machine?.description ? ` (${block.machine.description})` : ''}
                </td>
              </tr>
            );
            break;

          case 'interpretation':
            flushTable();
            segments.push(
              <div key={`interp-${bi}`} style={{ marginTop: '3mm', fontSize: '9px', lineHeight: '1.6', borderTop: '1px solid #aaa', paddingTop: '2mm', flexShrink: 0 }}>
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
            fontFamily: formatConfig?.fontFamily || 'Bookman Old Text',
            fontSize: '10px',
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
              fontSize: '10px',
              fontFamily: formatConfig?.fontFamily || 'Bookman Old Text',
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
      }} className="professional-report" style={{ fontFamily: formatConfig?.fontFamily || 'Bookman Old Text' }}>
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
              font-family: ${formatConfig?.fontFamily || 'Bookman Old Text'} !important;
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
  padding: '2px 4px',
  verticalAlign: 'top',
  width: '50%',
  backgroundColor: 'transparent',
  border: 'none',
};

const TH: React.CSSProperties = {
  padding: '3px 4px',
  fontWeight: 'bold',
  fontSize: '9px',
  textAlign: 'left',
  backgroundColor: 'transparent',
};

export default ProfessionalReport;
