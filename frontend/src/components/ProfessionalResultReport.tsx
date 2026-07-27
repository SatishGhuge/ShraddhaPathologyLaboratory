"use client";

import React from "react";
import { parseHtmlText, stripHtmlTags, HtmlPart } from "@/src/utils/htmlParser";

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

interface ProfessionalResultReportProps {
  patient: any;
  visitDate: any;
  visitId: any;
  test: any;
  groupedParameters: any;
  parameters: any;
  signature: any;
  withHeader: boolean;
  letterHeadBase64?: string;
  printOption?: 'pagebreak' | 'nobreak';
  combinedTests?: any[];
}

export default function ProfessionalResultReport({
  patient,
  visitDate,
  visitId,
  test,
  groupedParameters,
  parameters,
  signature,
  withHeader,
  letterHeadBase64,
  printOption = 'pagebreak',
  combinedTests = [],
}: ProfessionalResultReportProps) {
  const patientName = `${patient.title || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  const visitDateStr = visitDate ? new Date(visitDate).toLocaleDateString("en-GB") : "-";

  const hasAnyUnits = parameters && parameters.some((param: any) => {
    if (!param.units) return false;
    const unitText = stripHtmlTags(param.units);
    return unitText && unitText !== "-" && unitText !== "";
  });
  
  const hasAnyReferenceRange = parameters && parameters.some((param: any) => {
    const er = param.existingResult;
    if (!er) return false;
    let rangeText = "-";
    if (param.type === "Numeric") {
      rangeText = stripHtmlTags(er?.referenceRange || param.normalRange || param.rangeText || "-");
    } else if (param.type === "Text" || param.isDescriptive) {
      if (er?.textValue) {
        rangeText = stripHtmlTags(String(er.textValue));
      } else {
        rangeText = stripHtmlTags(param.textContent || "-");
      }
    } else {
      rangeText = stripHtmlTags(er?.referenceRange || param.rangeText || "-");
    }
    return rangeText && rangeText !== "-" && rangeText !== "";
  });

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <style>{`
        @media print {
          * { margin: 0; padding: 0; }
          html, body { margin: 0; padding: 0; }
          @page { size: A4; margin: 0; }
          .page-break { page-break-after: always; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
        .report-wrapper { font-family: Arial, sans-serif; font-size: 12px; }
        .page-wrapper { position: relative; width: 210mm; margin: 0 auto 0; background: white; page-break-after: always; min-height: 297mm; }
        .letterhead-img { width: 100%; height: 297mm; position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none; }
        .page-content { position: relative; z-index: 2; padding: 35mm 12mm 30mm 12mm; font-size: 12px; line-height: 1.3; min-height: 232mm; }
        .patient-info { margin-bottom: 8px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .patient-row { margin: 1px 0; }
        .test-name { font-size: 15px; font-weight: bold; text-align: center; margin: 6px 0; text-decoration: underline; }
        .category-header { font-size: 12px; font-weight: bold; margin: 4px 0 2px 0; text-decoration: underline; }
        .results-table { width: 100%; border-collapse: collapse; margin: 2px 0; font-size: 11px; }
        .results-table th { font-weight: bold; padding: 2px 2px; text-align: left; border-bottom: 1px solid #000; background: #f5f5f5; }
        .results-table td { padding: 2px; }
        .param-name { width: 45%; }
        .param-value { width: 18%; text-align: center; font-weight: 600; }
        .param-unit { width: 12%; text-align: center; }
        .param-range { width: 25%; }
        .interpretation { margin-top: 6px; padding-top: 6px; border-top: 1px solid #000; }
        .interpretation-title { font-weight: bold; text-decoration: underline; margin-bottom: 4px; font-size: 12px; }
        .interpretation-text { font-size: 11px; line-height: 1.4; }
        .footer { margin-top: 4px; text-align: center; font-size: 10px; }
        @media print {
          .page-wrapper { margin: 0; page-break-after: always; page-break-inside: avoid; }
          .page-wrapper:last-child { page-break-after: auto; }
          .page-content { position: static; top: auto; left: auto; right: auto; bottom: auto; }
        }
      `}</style>

      <div className="report-wrapper">
        {/* Single test page break mode */}
        {printOption === 'pagebreak' && (
          <div className="page-wrapper">
            {withHeader && letterHeadBase64 && (
              <img src={letterHeadBase64} alt="Letterhead" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
            )}
            <div className="page-content">
              {/* Patient Info */}
              <div className="patient-info">
                <div>
                  <div className="patient-row"><b>Patient Name:</b> {patientName}</div>
                  <div className="patient-row"><b>Patient ID:</b> {patient.patientId || "-"}</div>
                  <div className="patient-row"><b>Mobile:</b> {patient.mobile || "-"}</div>
                </div>
                <div>
                  <div className="patient-row"><b>Age / Gender:</b> {patient.age || "-"} / {patient.gender || "-"}</div>
                  <div className="patient-row"><b>Report Date:</b> {visitDateStr}</div>
                  <div className="patient-row"><b>Lab No:</b> {visitId || "-"}</div>
                </div>
              </div>

              {/* Test Name */}
              <div className="test-name">{test?.name || "TEST RESULTS"}</div>

              {/* Results Table */}
              {parameters && parameters.length > 0 && (
                <table className="results-table">
                  <thead>
                    <tr>
                      <th style={{ width: "45%" }}>Test Description</th>
                      <th style={{ width: "18%", textAlign: "center" }}>Result</th>
                      {hasAnyUnits && <th style={{ width: "12%", textAlign: "center" }}>Unit</th>}
                      {hasAnyReferenceRange && <th style={{ width: "25%" }}>Reference Range</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const grouped: any = {};
                      const categorySortOrder: any = {};
                      
                      parameters.forEach((param: any) => {
                        const catKey = param.categoryUniqueId || param.categoryName || 'NO_CATEGORY_HEADER';
                        if (!grouped[catKey]) {
                          grouped[catKey] = [];
                          categorySortOrder[catKey] = param.categorySortOrder !== undefined ? param.categorySortOrder : 999;
                        }
                        grouped[catKey].push(param);
                      });
                      
                      return Object.entries(grouped)
                        .sort((a: any, b: any) => {
                          const sortA = categorySortOrder[a[0]] ?? 999;
                          const sortB = categorySortOrder[b[0]] ?? 999;
                          return sortA - sortB;
                        })
                        .flatMap(([catName, catParams]: [string, any], catIdx: number) => {
                          const rows: any[] = [];
                          
                          if (catName !== 'NO_CATEGORY_HEADER' && !catName.startsWith('__NO_NAME_') && catParams[0]?.showCategoryHeader) {
                            const categoryMethod = catParams[0]?.categoryTestMethod || null;
                            rows.push(
                              <tr key={`cat-${catIdx}`}>
                                <td colSpan={hasAnyUnits && hasAnyReferenceRange ? 4 : hasAnyUnits || hasAnyReferenceRange ? 3 : 2} style={{ paddingBottom: '2px' }}>
                                  <div className="category-header">{renderStyledText(catName || "", true)}</div>
                                  {categoryMethod && <div style={{ fontSize: '9px', color: '#666', marginTop: '1px' }}>Method: {renderStyledText(categoryMethod || "", false)}</div>}
                                </td>
                              </tr>
                            );
                          }
                          
                          catParams
                            .sort((a: any, b: any) => (a.sortOrder || 999) - (b.sortOrder || 999))
                            .forEach((param: any, paramIdx: number) => {
                              const er = param.existingResult;
                              let val = "-";
                              
                              if (er) {
                                if (er.numericValue !== null && er.numericValue !== undefined) {
                                  val = er.numericValue;
                                } else if (er.textValue) {
                                  val = String(er.textValue).split(',')[0].trim() || "-";
                                }
                              }
                              
                              const isAbnormal = er?.isAbnormal || (param.type === "Numeric" && er?.isOutOfRange);
                              const resultText = stripHtmlTags(String(val));
                              const unitText = stripHtmlTags(param.units || "-");
                              
                              let rangeText = "-";
                              if (param.type === "Numeric") {
                                rangeText = stripHtmlTags(er?.referenceRange || param.normalRange || param.rangeText || "-");
                              } else if (param.type === "Text" || param.isDescriptive) {
                                rangeText = stripHtmlTags(er?.textValue ? String(er.textValue) : param.textContent || "-");
                              } else {
                                rangeText = stripHtmlTags(er?.referenceRange || param.rangeText || "-");
                              }
                              
                              const parameterMethod = param.parameterTestMethod || null;

                              rows.push(
                                <tr key={`param-${catIdx}-${paramIdx}`} style={{ backgroundColor: isAbnormal ? '#fffacd' : 'white' }}>
                                  <td className="param-name">
                                    <div>{renderStyledText(param.parameterName || "", false)}</div>
                                    {parameterMethod && <div style={{ fontSize: '9px', color: '#666', marginTop: '1px' }}>Method: {renderStyledText(parameterMethod || "", false)}</div>}
                                  </td>
                                  <td className="param-value">{resultText}{isAbnormal ? ' *' : ''}</td>
                                  {hasAnyUnits && <td className="param-unit">{unitText}</td>}
                                  {hasAnyReferenceRange && <td className="param-range">{rangeText}</td>}
                                </tr>
                              );
                            });
                          
                          return rows;
                        });
                    })()}
                  </tbody>
                </table>
              )}

              {/* Interpretation */}
              {test?.interpretation && (
                <div className="interpretation">
                  <div className="interpretation-title">INTERPRETATION:</div>
                  <div className="interpretation-text" dangerouslySetInnerHTML={{ __html: test.interpretation }} />
                </div>
              )}

              {/* Footer */}
              <div className="footer" style={{ marginTop: '6px' }}>
                <p>END OF REPORT</p>
              </div>
            </div>
          </div>
        )}

        {/* Multiple tests no page break mode */}
        {printOption === 'nobreak' && combinedTests && combinedTests.length > 0 && (
          combinedTests.map((testData: any, idx: number) => (
            <div key={idx} className="page-wrapper">
              {withHeader && letterHeadBase64 && (
                <img src={letterHeadBase64} alt="Letterhead" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
              )}
              <div className="page-content">
                {idx > 0 && <hr style={{ margin: '8px 0', borderTop: '2px solid #000' }} />}
                
                {/* Compact patient info */}
                <div style={{ fontSize: '10px', marginBottom: '4px' }}>
                  <b>Patient:</b> {patientName} | <b>ID:</b> {patient.patientId || "-"} | <b>Date:</b> {visitDateStr}
                </div>

                {/* Test name */}
                <div className="test-name" style={{ fontSize: '13px' }}>{testData.test?.name || "TEST RESULTS"}</div>

                {/* Table */}
                {testData.parameters && testData.parameters.length > 0 && (
                  <table className="results-table" style={{ fontSize: '10px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: "45%" }}>Test Description</th>
                        <th style={{ width: "18%", textAlign: "center" }}>Result</th>
                        {testData.hasAnyUnits && <th style={{ width: "12%", textAlign: "center" }}>Unit</th>}
                        {testData.hasAnyReferenceRange && <th style={{ width: "25%" }}>Reference Range</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Similar rendering logic */}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
