"use client";

/**
 * ProfessionalReport - Full-Page Letterhead Design
 * ──────────────────────────────────────────────────
 * Uses ONE full-page letterhead image as background with content overlaid on top.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐  ← A4 Page (210mm × 297mm)
 *   │                                      │
 *   │  LETTERHEAD IMAGE (background)       │  ← z-index 0, covers entire page
 *   │                                      │
 *   │  ┌────────────────────────────────┐ │
 *   │  │ Patient Info                   │ │  ← z-index 1 (overlaid)
 *   │  │ Test Name                      │ │  ← positioned below header space
 *   │  │ Results Table (paginated)      │ │
 *   │  │ Interpretation (last page)     │ │
 *   │  │ Signature (bottom-left, last pg)│ │
 *   │  └────────────────────────────────┘ │
 *   │                                      │
 *   └──────────────────────────────────────┘
 *
 * Content flows naturally across pages. Results overflow to next page if needed.
 */

import React, { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PatientInfo {
  title?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  dob?: string;
}

interface LetterheadDB {
  id?: number;
  letterheadName?: string;
  headerImage?: string;   // base64 data-URI (legacy)
  footerImage?: string;   // base64 data-URI (legacy)
  fullPageImage?: string; // full-page letterhead image (NEW)
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
  letterHeadBase64?: string;   // fallback single image
  printOption?: 'pagebreak' | 'nobreak';
  results?: Record<string, { numericValue?: any; textValue?: string; isAbnormal?: any }>;
  referralDoctor?: string;
}

interface RowItem {
  type: 'category' | 'param';
  catName?: string;
  param?: any;
}

interface ReportPage {
  testData: any;
  rows: RowItem[];
  isFirst: boolean;
  isLast: boolean;
  pageNo: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants - tuned for full-page letterhead layout
// ─────────────────────────────────────────────────────────────────────────────

const HEADER_SPACE_MM = 50;   // Space at top reserved for letterhead header (mm)
const FOOTER_SPACE_MM = 30;   // Space at bottom reserved for letterhead footer (mm)
const PAD_LEFT_MM = 12;       // Left padding for content
const PAD_RIGHT_MM = 12;      // Right padding for content
const PAD_TOP_MM = 5;         // Gap from header to content start
const PAD_BOT_MM = 5;         // Gap from content to footer

// Available vertical space for text content
const CONTENT_MM = 297 - HEADER_SPACE_MM - FOOTER_SPACE_MM - PAD_TOP_MM - PAD_BOT_MM; // ≈ 205 mm

// Approximate row heights (mm)
const ROW_PARAM_MM = 5.5;
const ROW_CAT_MM = 6;
const PATIENT_MM = 22;
const TITLE_MM = 9;
const THEAD_MM = 7;
const INTERP_MM = 22;
const SIG_MM = 20;

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
      printOption = 'pagebreak',
      results = {},
      referralDoctor = '',
    } = props;

    // ── letterhead state ────────────────────────────────────────────────────
    const [lh, setLh] = useState<LetterheadDB | null>(null);
    const [ready, setReady] = useState(false);

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
          
          // Try to fetch from API if not provided
          try {
            const r = await fetch('/api/letterhead/active', { signal: AbortSignal.timeout(3000) });
            const d = await r.json();
            if (!dead && d.success && d.data?.length > 0) {
              setLh(d.data[0]);
            }
          } catch (fetchErr) {
            console.warn('[ProfessionalReport] API letterhead fetch failed', fetchErr);
            // Continue - we'll use letterHeadBase64 as fallback
          }
        } catch (e) {
          console.warn('[ProfessionalReport] letterhead load error', e);
        } finally {
          if (!dead) setReady(true);
        }
      })();
      return () => { dead = true; };
    }, [letterhead]);

    // ── helpers ─────────────────────────────────────────────────────────────
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

    // Check if any param has units or reference range
    const showUnits = useMemo(() =>
      Object.values(groupedParameters).some((cp: any) =>
        cp.some((p: any) => p.units?.trim() && p.units !== '-')
      ), [groupedParameters]);

    const showRange = useMemo(() =>
      Object.values(groupedParameters).some((cp: any) =>
        cp.some((p: any) => {
          if (p.type === 'Text' || p.isDescriptive) return false;
          const r = p.normalRange || p.rangeText;
          return r?.trim() && r !== '-';
        })
      ), [groupedParameters]);

    // ── pagination ──────────────────────────────────────────────────────────

    const [pages, setPages] = useState<ReportPage[]>([]);

    useMemo(() => {
      const testsToRender =
        printOption === 'nobreak' && combinedTests.length > 0
          ? combinedTests
          : [{ name: test?.name, interpretation: test?.interpretation,
               signature: test?.signature, groupedParameters }];

      const allPages: ReportPage[] = [];

      testsToRender.forEach(testItem => {
        // Flatten grouped parameters into an ordered list
        const allRows: RowItem[] = [];
        Object.entries(testItem.groupedParameters || {}).forEach(
          ([catName, catParams]: [string, any]) => {
            const visible = (catParams as any[]).filter(p => {
              const nv = results[p.id]?.numericValue;
              const tv = results[p.id]?.textValue;
              return (nv != null && nv !== '') || tv?.trim();
            });
            if (!visible.length) return;
            if (catName !== 'NO_CATEGORY_HEADER' && catParams[0]?.showCategoryHeader)
              allRows.push({ type: 'category', catName });
            visible.forEach(p => allRows.push({ type: 'param', param: p }));
          }
        );

        if (!allRows.length) {
          allPages.push({
            testData: testItem, rows: [],
            isFirst: true, isLast: true,
            pageNo: allPages.length, total: 0,
          });
          return;
        }

        // Paginate rows
        let remaining = [...allRows];
        let localIdx = 0;

        while (remaining.length > 0) {
          const isFirst = localIdx === 0;

          // Calculate available space
          let budget = CONTENT_MM;
          if (isFirst) budget -= PATIENT_MM + TITLE_MM + THEAD_MM;
          else budget -= THEAD_MM;

          const chunk: RowItem[] = [];
          let used = 0;

          for (const row of remaining) {
            const need = row.type === 'category' ? ROW_CAT_MM : ROW_PARAM_MM;
            if (used + need > budget) break;
            chunk.push(row);
            used += need;
          }

          if (chunk.length === 0) chunk.push(remaining[0]);

          remaining = remaining.slice(chunk.length);
          const isLast = remaining.length === 0;

          allPages.push({
            testData: testItem,
            rows: chunk,
            isFirst,
            isLast,
            pageNo: allPages.length,
            total: 0,
          });
          localIdx++;
        }
      });

      allPages.forEach(p => (p.total = allPages.length));
      setPages(allPages);
    }, [test, groupedParameters, combinedTests, results, printOption]);

    // ── render one A4 page ──────────────────────────────────────────────────

    const renderPage = (pg: ReportPage) => {
      const { testData, rows, isFirst, isLast, pageNo } = pg;

      // Get letterhead image source - prioritize fullPageImage, fallback to headerImage or letterHeadBase64
      const letterheadSrc = lh?.fullPageImage || lh?.headerImage || letterHeadBase64 || null;
      const sig = testData.signature || signature;

      const colCount = 2 + (showUnits ? 1 : 0) + (showRange ? 1 : 0);

      return (
        <div
          key={pageNo}
          className="report-page"
          style={{
            position: 'relative',
            width: '210mm',
            height: '297mm',
            backgroundColor: '#fff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            margin: '16px auto',
            boxShadow: '0 2px 16px rgba(0,0,0,0.14)',
            overflow: 'hidden',
            pageBreakAfter: 'always',
            pageBreakInside: 'avoid',
            breakAfter: 'page',
            breakInside: 'avoid',
          }}
        >
          {/* ══ FULL-PAGE LETTERHEAD BACKGROUND ════════════════════════ */}
          {letterheadSrc && (
            <img
              src={letterheadSrc}
              alt="letterhead"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                zIndex: 0,
              }}
            />
          )}

          {/* ══ CONTENT LAYER (overlaid on letterhead) ═════════════════ */}
          <div
            style={{
              position: 'absolute',
              top: `${HEADER_SPACE_MM + PAD_TOP_MM}mm`,
              left: `${PAD_LEFT_MM}mm`,
              right: `${PAD_RIGHT_MM}mm`,
              bottom: `${FOOTER_SPACE_MM + PAD_BOT_MM}mm`,
              zIndex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              fontSize: '10px',
              fontFamily: 'Arial, sans-serif',
            }}
          >

            {/* ── Patient Info (first page only) ─────────────────────── */}
            {isFirst && (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '9px',
                  marginBottom: '3mm',
                  flexShrink: 0,
                  backgroundColor: 'transparent',
                }}
              >
                <tbody>
                  <tr>
                    <td style={PATIENT_TD}>
                      <b>Patient Name:</b>{' '}
                      {[patient.title, patient.firstName, patient.lastName].filter(Boolean).join(' ')}
                    </td>
                    <td style={PATIENT_TD}>
                      <b>Age:</b> {patient.age ?? '-'} Yrs ({patient.gender ?? '-'})
                    </td>
                  </tr>
                  <tr>
                    <td style={PATIENT_TD}>
                      <b>Referral Doctor:</b> {referralDoctor || '-'}
                    </td>
                    <td style={PATIENT_TD}>
                      <b>Organization:</b> Shraddha Pathology Laboratory
                    </td>
                  </tr>
                  <tr>
                    <td style={PATIENT_TD}>
                      <b>Sample Date:</b>{' '}
                      {visitDate
                        ? new Date(visitDate).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td style={PATIENT_TD}>
                      <b>Registration ID:</b> {visitId || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* ── Test Name Heading (first page only) ────────────────── */}
            {isFirst && (
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  paddingBottom: '2mm',
                  marginBottom: '3mm',
                  borderBottom: '2px solid #222',
                  flexShrink: 0,
                }}
              >
                {strip(testData.name ?? '').toUpperCase()}
              </div>
            )}

            {/* ── Results Table ───────────────────────────────────────── */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '9px',
                flexShrink: 0,
                backgroundColor: 'transparent',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #222' }}>
                  <th style={{ ...TH, width: '40%', textAlign: 'left' }}>Test Description</th>
                  <th
                    style={{
                      ...TH,
                      width: showUnits || showRange ? '18%' : '30%',
                      textAlign: 'right',
                    }}
                  >
                    Value(s)
                  </th>
                  {showUnits && (
                    <th style={{ ...TH, width: '12%', textAlign: 'center' }}>Unit</th>
                  )}
                  {showRange && (
                    <th style={{ ...TH, width: '30%', textAlign: 'left' }}>
                      Reference Range
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  /* category row */
                  if (row.type === 'category')
                    return (
                      <tr key={`c${i}`}>
                        <td
                          colSpan={colCount}
                          style={{
                            padding: '3px 4px 1px 2mm',
                            fontWeight: 'bold',
                            fontSize: '9px',
                            borderBottom: '1px solid #bbb',
                            backgroundColor: 'rgba(240, 240, 240, 0.8)',
                          }}
                        >
                          {strip(row.catName ?? '').toUpperCase()}
                        </td>
                      </tr>
                    );

                  /* parameter row */
                  const p = row.param!;
                  const nv = results[p.id]?.numericValue;
                  const tv = results[p.id]?.textValue;
                  const isabn =
                    results[p.id]?.isAbnormal === true ||
                    results[p.id]?.isAbnormal === 1 ||
                    abnormal(p, nv);

                  let val = '-';
                  if (p.type === 'Numeric') val = nv != null ? String(nv) : '-';
                  else if (tv) val = tv.split(',')[0].trim() || '-';

                  return (
                    <tr key={`p${i}`} style={{ borderBottom: '1px solid #eee' }}>
                      {/* Parameter name + method */}
                      <td
                        style={{
                          padding: '2px 4px 2px 2mm',
                          fontWeight: isabn ? 'bold' : 'normal',
                          fontSize: p.isDescriptive ? '8.5px' : '9px',
                        }}
                      >
                        {strip(p.parameterName ?? '')}
                        {p.testMethod && (
                          <div
                            style={{
                              fontSize: '7.5px',
                              color: '#666',
                              fontWeight: 'normal',
                            }}
                          >
                            METHOD: {p.testMethod}
                          </div>
                        )}
                      </td>

                      {/* Value */}
                      <td
                        style={{
                          padding: '2px 4px',
                          textAlign: 'right',
                          fontWeight: isabn ? 'bold' : 'normal',
                          color: isabn ? '#c0392b' : 'inherit',
                          fontSize: '9px',
                        }}
                      >
                        {p.isDescriptive && val !== '-' && hasHtml(val) ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: safe(val) }}
                            style={{ whiteSpace: 'normal', textAlign: 'left' }}
                          />
                        ) : (
                          <>
                            {val}
                            {isabn && val !== '-' ? ' *' : ''}
                          </>
                        )}
                      </td>

                      {/* Unit */}
                      {showUnits && (
                        <td
                          style={{
                            padding: '2px 4px',
                            textAlign: 'center',
                            fontSize: '8.5px',
                            color: '#555',
                          }}
                        >
                          {strip(p.units ?? '') || '-'}
                        </td>
                      )}

                      {/* Reference Range */}
                      {showRange && (
                        <td style={{ padding: '2px 4px', fontSize: '8.5px', color: '#555' }}>
                          {strip(p.normalRange || p.rangeText || '') || '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Interpretation (last page only) ────────────────────── */}
            {isLast && testData.interpretation && (
              <div
                style={{
                  marginTop: '3mm',
                  fontSize: '9px',
                  lineHeight: '1.6',
                  borderTop: '1px solid #aaa',
                  paddingTop: '2mm',
                  flexShrink: 0,
                }}
              >
                <b style={{ display: 'block', marginBottom: '1mm' }}>Interpretation:</b>
                <div
                  dangerouslySetInnerHTML={{ __html: safe(testData.interpretation) }}
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>
            )}

            {/* ── Signature (last page, bottom-left) ───────────────────── */}
            {isLast && sig && (
              <div
                style={{
                  marginTop: '4mm',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  flexShrink: 0,
                }}
              >
                <div style={{ textAlign: 'center', minWidth: '45mm' }}>
                  {sig.signatureImage && (
                    <img
                      src={sig.signatureImage}
                      alt="signature"
                      style={{
                        display: 'block',
                        maxHeight: '16mm',
                        maxWidth: '45mm',
                        objectFit: 'contain',
                        margin: '0 auto 2px',
                      }}
                    />
                  )}
                  <div style={{ fontSize: '8.5px', fontWeight: 'bold', lineHeight: '1.3' }}>
                    {sig.doctorName || sig.signatureText || 'Dr. (Name)'}
                  </div>
                  <div style={{ fontSize: '7.5px', color: '#555', lineHeight: '1.2' }}>
                    {sig.speciality || 'M.D. (Pathology)'}
                  </div>
                  <div style={{ fontSize: '7.5px', color: '#555' }}>
                    Consulting Pathologist
                  </div>
                </div>
              </div>
            )}

          </div>{/* /content */}
        </div>
      );
    };

    // ── loading guard ────────────────────────────────────────────────────────
    if (!ready) {
      return (
        <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
          Loading report…
        </div>
      );
    }

    // ── final render ─────────────────────────────────────────────────────────
    return (
      <div ref={ref} className="professional-report">
        <style>{`
          @media print {
            html, body { background: white !important; margin: 0 !important; padding: 0 !important; }

            body * { visibility: hidden !important; }

            .professional-report { visibility: visible !important; }
            .report-page { visibility: visible !important; }
            .report-page * { visibility: visible !important; }

            .professional-report {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 210mm !important;
            }

            .report-page {
              position: relative !important;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              overflow: hidden !important;
              background: white !important;
              border-radius: 0 !important;
              break-after: page;
              page-break-after: always;
            }
            .report-page:last-child {
              break-after: avoid;
              page-break-after: avoid;
            }

            .no-print { display: none !important; }

            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
        `}</style>

        {pages.map(pg => renderPage(pg))}
      </div>
    );
  }
);

ProfessionalReport.displayName = 'ProfessionalReport';

// ── Static cell styles
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
