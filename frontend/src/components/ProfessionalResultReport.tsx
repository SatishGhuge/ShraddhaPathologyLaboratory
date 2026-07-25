"use client";

import React from "react";
import { parseHtmlText, stripHtmlTags, HtmlPart } from "@/src/utils/htmlParser";

/**
 * Render HTML text with proper styling applied
 * Converts <b>, <i>, <u> tags to actual styled text
 */
const renderStyledText = (text: string | undefined, defaultBold: boolean = false): React.ReactNode => {
  if (!text) return "-";
  
  const cleanText = String(text).trim();
  if (!cleanText) return "-";
  
  // Parse the HTML text to get parts with styling info
  const parsed = parseHtmlText(cleanText);
  
  if (typeof parsed === 'string') {
    // No HTML tags found, just return plain text
    return <span style={{ fontWeight: defaultBold ? 'bold' : 'normal' }}>{parsed}</span>;
  }
  
  // Render each part with its own styling
  return (parsed as HtmlPart[]).map((part: HtmlPart, i: number) => (
    <span
      key={i}
      style={{
        fontWeight: part.bold || defaultBold ? 'bold' : 'normal',
        fontStyle: part.italic ? 'italic' : 'normal',
        textDecoration: part.underline ? 'underline' : 'none'
      }}
    >
      {part.text}
    </span>
  ));
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
  printOption?: 'pagebreak' | 'nobreak'; // NEW: for handling page break logic
  combinedTests?: any[]; // NEW: array of tests when printing multiple (for nobreak mode)
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
  printOption = 'pagebreak', // DEFAULT: page break mode
  combinedTests = [], // DEFAULT: empty (single test mode)
}: ProfessionalResultReportProps) {
  const patientName = `${patient.title || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  const visitDateStr = visitDate ? new Date(visitDate).toLocaleDateString("en-GB") : "-";

  // Check if ANY parameter has units or reference range
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
    <div className="print-report" style={{ fontFamily: "'Arial', 'Nimbus Sans', sans-serif", lineHeight: "1.4", position: "relative" }}>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print-report { margin: 0; padding: 0; }
          @page { size: A4; margin: 0; }
        }
        .letterhead-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          z-index: 0;
        }
        .report-content {
          position: relative;
          z-index: 1;
          padding: 140px 53px 50px 53px;
          background: none;
          display: flex;
          flex-direction: column;
        }
        .report-content.page-break {
          min-height: 1123px;
          page-break-after: always;
          break-after: page;
        }
        .test-separator {
          border-top: 2px solid #000;
          margin: 20px 0;
          padding-top: 15px;
        }
        .report-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        .header-title {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
          color: #ff8c00;
        }
        .header-subtitle {
          font-size: 16px;
          font-weight: bold;
          margin: 5px 0;
        }
        .header-address {
          font-size: 11px;
          margin: 3px 0;
          color: #333;
        }
        .patient-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 8px 0;
        }
        .patient-info-grid.compact {
          gap: 10px;
          margin: 8px 0;
        }
        .patient-info-row {
          font-size: 12px;
          margin: 3px 0;
        }
        .patient-info-row.compact {
          font-size: 11px;
          margin: 2px 0;
        }
        .patient-label {
          font-weight: bold;
          display: inline;
        }
        .patient-value {
          font-weight: normal;
          display: inline;
        }
        .test-title {
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          margin: 10px 0;
          text-decoration: underline;
          border-top: none;
          border-bottom: none;
          padding: 5px 0;
        }
        .test-title.compact {
          font-size: 14px;
          margin: 8px 0;
          padding: 4px 0;
        }
        .category-header {
          font-size: 13px;
          font-weight: bold;
          text-transform: uppercase;
          text-decoration: underline;
          margin: 8px 0 5px 0;
          padding-bottom: 3px;
          border-bottom: none;
        }
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          border: none;
        }
        .table-header {
          background-color: transparent;
          border: none;
          border-bottom: 1px solid #000;
        }
        .table-header th {
          font-size: 12px;
          font-weight: bold;
          padding: 5px 0;
          text-align: left;
          border: none;
        }
        .table-row td {
          font-size: 12px;
          padding: 4px 0;
          border: none;
        }
        .table-row:last-child td {
          border: none;
        }
        .param-name {
          font-weight: normal;
          width: 40%;
          padding-right: 10px;
        }
        .param-method {
          font-size: 9px;
          color: #999;
          margin-top: 2px;
          font-weight: normal;
        }
        .param-result {
          font-size: 13px;
          text-align: center;
          width: 20%;
          padding: 8px 0;
        }
        .param-unit {
          font-size: 13px;
          text-align: center;
          width: 15%;
        }
        .param-range {
          font-size: 13px;
          width: 25%;
        }
        .abnormal {
          color: #b91c1c;
          font-weight: bold;
        }
        .footer {
          margin-top: 10px;
          text-align: center;
          border-top: none;
          padding-top: 8px;
        }
        .footer-text {
          font-size: 11px;
          font-weight: bold;
          margin: 2px 0;
        }
        .signature-section {
          margin-top: auto;
          padding-top: 40px;
          display: flex;
          justify-content: flex-end;
          text-align: center;
        }
        .signature-image {
          max-width: 150px;
          max-height: 80px;
          object-fit: contain;
          margin: 0 auto;
        }
      `}</style>

      {/* LETTERHEAD BACKGROUND */}
      {withHeader && letterHeadBase64 && (
        <img src={letterHeadBase64} alt="Letterhead" className="letterhead-bg" />
      )}

      {/* FOR PAGEBREAK MODE - Single test per page */}
      {printOption === 'pagebreak' && (
        <div className="report-content">
        {/* PATIENT INFORMATION */}
        <div className="patient-info-grid">
          <div>
            <p className="patient-info-row">
              <span className="patient-label">Patient Name:</span> <span className="patient-value">{patientName}</span>
            </p>
            <p className="patient-info-row">
              <span className="patient-label">Patient ID:</span> <span className="patient-value">{patient.patientId || "-"}</span>
            </p>
            <p className="patient-info-row">
              <span className="patient-label">Mobile:</span> <span className="patient-value">{patient.mobile || "-"}</span>
            </p>
            <p className="patient-info-row">
              <span className="patient-label">Ref. Doctor:</span> <span className="patient-value">{"-"}</span>
            </p>
          </div>
          <div>
            <p className="patient-info-row">
              <span className="patient-label">Age / Gender:</span> <span className="patient-value">{patient.age || "-"} Yrs / {patient.gender || "-"}</span>
            </p>
            <p className="patient-info-row">
              <span className="patient-label">Report Date:</span> <span className="patient-value">{visitDateStr}</span>
            </p>
            <p className="patient-info-row">
              <span className="patient-label">Lab No:</span> <span className="patient-value">{visitId || "-"}</span>
            </p>
            <p className="patient-info-row">
              <span className="patient-label">Organization:</span> <span className="patient-value">{"-"}</span>
            </p>
          </div>
        </div>

        {/* TEST TITLE */}
        <div className="test-title">{test?.name || "TEST RESULTS"}</div>

        {/* RESULTS TABLE */}
        <table className="results-table">
          <thead className="table-header">
            <tr>
              <th style={{ width: "40%" }}>Test Description</th>
              <th style={{ width: "20%", textAlign: "center" }}>Result</th>
              {hasAnyUnits && <th style={{ width: "15%", textAlign: "center" }}>Unit</th>}
              {hasAnyReferenceRange && <th style={{ width: "25%" }}>Reference Range</th>}
            </tr>
          </thead>
          <tbody>
            {parameters && parameters.length > 0 ? (
              // Group parameters by category
              (() => {
                const grouped: any = {};
                const categorySortOrder: any = {}; // Track sortOrder for each category
                
                // Group parameters and track sort order - use categoryUniqueId for grouping
                parameters.forEach((param: any) => {
                  const catKey = param.categoryUniqueId || param.categoryName || 'NO_CATEGORY_HEADER';
                  if (!grouped[catKey]) {
                    grouped[catKey] = [];
                    // Use category's sortOrder if available, otherwise use a high number
                    categorySortOrder[catKey] = param.categorySortOrder !== undefined ? param.categorySortOrder : 999;
                  }
                  grouped[catKey].push(param);
                });
                
                // Sort categories by their sortOrder (respecting the order set in test form)
                return Object.entries(grouped)
                  .sort((a: any, b: any) => {
                    const sortA = categorySortOrder[a[0]] ?? 999;
                    const sortB = categorySortOrder[b[0]] ?? 999;
                    return sortA - sortB;
                  })
                  .flatMap(([catName, catParams]: [string, any], catIdx: number) => {
                    const rows: any[] = [];
                    
                    // Show category header only once (if applicable)
                    if (catName !== 'NO_CATEGORY_HEADER' && !catName.startsWith('__NO_NAME_') && catParams[0]?.showCategoryHeader) {
                      const categoryMethod = catParams[0]?.categoryTestMethod || null;
                      
                      rows.push(
                        <tr key={`cat-${catIdx}`} className="table-row">
                          <td className="param-name" colSpan={hasAnyUnits && hasAnyReferenceRange ? 4 : hasAnyUnits || hasAnyReferenceRange ? 3 : 2}>
                            {/* Category Name - Always bold with styling applied */}
                            <div>
                              {renderStyledText(catName, true)}
                            </div>
                            
                            {/* Category Method Below Category Name */}
                            {categoryMethod && (
                              <div className="param-method" style={{ marginBottom: '8px' }}>
                                Method: {renderStyledText(categoryMethod, false)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }
                    
                    // Now add all parameters in this category (sorted by their sortOrder)
                    catParams
                      .sort((a: any, b: any) => (a.sortOrder || 999) - (b.sortOrder || 999))
                      .filter((param: any) => {
                        const er = param.existingResult;
                        if (!er) return false;
                        const hasNumeric = er.numericValue !== null && er.numericValue !== undefined && er.numericValue !== '';
                        const hasText = er.textValue && String(er.textValue).trim() !== '';
                        return hasNumeric || hasText;
                      })
                      .forEach((param: any, paramIdx: number) => {
                        const er = param.existingResult;
                        let val = "-";
                        
                        if (er) {
                          if (er.numericValue !== null && er.numericValue !== undefined) {
                            val = er.numericValue;
                          } else if (er.textValue) {
                            const firstVal = String(er.textValue).split(',')[0].trim();
                            val = firstVal || "-";
                          }
                        }
                        
                        const isAbnormal = er?.isAbnormal || (param.type === "Numeric" && er?.isOutOfRange);
                        const resultText = stripHtmlTags(String(val));
                        const unitText = stripHtmlTags(param.units || "-");
                        
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
                        
                        const parameterMethod = param.parameterTestMethod || null;

                        rows.push(
                          <tr key={`param-${catIdx}-${paramIdx}`} className="table-row">
                            <td className="param-name">
                              {/* Show Parameter Name with styling applied */}
                              <div>
                                {renderStyledText(param.parameterName, false)}
                              </div>
                              
                              {/* Show Parameter Method if exists */}
                              {parameterMethod && (
                                <div className="param-method">
                                  Method: {renderStyledText(parameterMethod, false)}
                                </div>
                              )}
                            </td>
                            <td className={`param-result ${isAbnormal ? "abnormal" : ""}`}>
                              {resultText}
                              {isAbnormal ? " *" : ""}
                            </td>
                            {hasAnyUnits && <td className="param-unit" style={{ textAlign: "center" }}>{unitText}</td>}
                            {hasAnyReferenceRange && <td className="param-range">{rangeText}</td>}
                          </tr>
                        );
                      });
                    
                    return rows;
                  });
              })()
            ) : (
              <tr className="table-row">
                <td colSpan={hasAnyUnits && hasAnyReferenceRange ? 4 : hasAnyUnits || hasAnyReferenceRange ? 3 : 2} style={{ textAlign: "center", color: "#999" }}>
                  No parameters with values available
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* INTERPRETATION */}
        {test?.interpretation && (
          <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #000" }}>
            <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "10px", textDecoration: "underline" }}>INTERPRETATION:</p>
            <div style={{ fontSize: "12px", lineHeight: "1.6", color: "#333" }} dangerouslySetInnerHTML={{ __html: test.interpretation }} />
          </div>
        )}

        {/* FOOTER */}
        <div className="footer">
          <p className="footer-text">END OF REPORT</p>
          <p style={{ fontSize: "10px", color: "#999", marginTop: "10px" }}>Generated on: {new Date().toLocaleString()}</p>
        </div>

        {/* SIGNATURE SECTION */}
        {signature && (
          <div className="signature-section">
            <div style={{ textAlign: "center" }}>
              {signature.signatureImage && (
                <img src={signature.signatureImage} alt="Signature" className="signature-image" />
              )}
              {signature.signatureText && (
                <div style={{ fontSize: "11px", fontWeight: "bold", whiteSpace: "pre-line", marginTop: "5px" }}>
                  {signature.signatureText}
                </div>
              )}
              {signature.doctorName && (
                <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "3px" }}>
                  {signature.doctorName}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      )}

      {/* FOR NOBREAK MODE - Multiple tests continuous on same page */}
      {printOption === 'nobreak' && combinedTests && combinedTests.length > 0 && (
        <div className="report-content">
          {combinedTests.map((testData: any, testIdx: number) => (
            <div key={testIdx}>
              {/* Test separator line (not for first test) */}
              {testIdx > 0 && <div className="test-separator" />}

              {/* PATIENT INFORMATION - Compact version for each test */}
              <div className="patient-info-grid compact">
                <div>
                  <p className="patient-info-row compact">
                    <span className="patient-label">Patient:</span> <span className="patient-value">{patientName}</span>
                  </p>
                  <p className="patient-info-row compact">
                    <span className="patient-label">ID:</span> <span className="patient-value">{patient.patientId || "-"}</span>
                  </p>
                </div>
                <div>
                  <p className="patient-info-row compact">
                    <span className="patient-label">Age/Gender:</span> <span className="patient-value">{patient.age || "-"} Yrs / {patient.gender || "-"}</span>
                  </p>
                  <p className="patient-info-row compact">
                    <span className="patient-label">Lab No:</span> <span className="patient-value">{visitId || "-"}</span>
                  </p>
                </div>
              </div>

              {/* TEST TITLE - Compact for nobreak */}
              <div className="test-title compact">{testData.test?.name || "TEST RESULTS"}</div>

              {/* RESULTS TABLE - Using testData parameters */}
              <table className="results-table" style={{ fontSize: "11px" }}>
                <thead className="table-header">
                  <tr>
                    <th style={{ width: "40%", fontSize: "11px" }}>Test Description</th>
                    <th style={{ width: "20%", textAlign: "center", fontSize: "11px" }}>Result</th>
                    {testData.hasAnyUnits && <th style={{ width: "15%", textAlign: "center", fontSize: "11px" }}>Unit</th>}
                    {testData.hasAnyReferenceRange && <th style={{ width: "25%", fontSize: "11px" }}>Reference Range</th>}
                  </tr>
                </thead>
                <tbody>
                  {testData.parameters && testData.parameters.length > 0 ? (
                    (() => {
                      const grouped: any = {};
                      const categorySortOrder: any = {};
                      
                      testData.parameters.forEach((param: any) => {
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
                              <tr key={`cat-${catIdx}`} className="table-row">
                                <td className="param-name" colSpan={testData.hasAnyUnits && testData.hasAnyReferenceRange ? 4 : testData.hasAnyUnits || testData.hasAnyReferenceRange ? 3 : 2}>
                                  <div>{renderStyledText(catName, true)}</div>
                                  {categoryMethod && <div className="param-method">{renderStyledText(categoryMethod, false)}</div>}
                                </td>
                              </tr>
                            );
                          }
                          
                          catParams
                            .sort((a: any, b: any) => (a.sortOrder || 999) - (b.sortOrder || 999))
                            .filter((param: any) => {
                              const er = param.existingResult;
                              return er && (er.numericValue !== null && er.numericValue !== undefined && er.numericValue !== '' || er.textValue && String(er.textValue).trim() !== '');
                            })
                            .forEach((param: any, paramIdx: number) => {
                              const er = param.existingResult;
                              let val = "-";
                              if (er) {
                                val = er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : (er.textValue ? String(er.textValue).split(',')[0].trim() : "-");
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

                              rows.push(
                                <tr key={`param-${catIdx}-${paramIdx}`} className="table-row">
                                  <td className="param-name">{renderStyledText(param.parameterName, false)}</td>
                                  <td className={`param-result ${isAbnormal ? "abnormal" : ""}`}>{resultText}{isAbnormal ? " *" : ""}</td>
                                  {testData.hasAnyUnits && <td className="param-unit">{unitText}</td>}
                                  {testData.hasAnyReferenceRange && <td className="param-range">{rangeText}</td>}
                                </tr>
                              );
                            });
                          
                          return rows;
                        });
                    })()
                  ) : (
                    <tr><td colSpan={4}>No parameters available</td></tr>
                  )}
                </tbody>
              </table>

              {testData.test?.interpretation && (
                <div style={{ marginTop: "8px", fontSize: "10px", color: "#333" }} dangerouslySetInnerHTML={{ __html: testData.test.interpretation }} />
              )}
            </div>
          ))}

          {/* Footer - Only once */}
          <div style={{ marginTop: "15px", paddingTop: "10px", borderTop: "2px solid #000", textAlign: "center" }}>
            <p style={{ fontSize: "10px", color: "#666", margin: "3px 0" }}>END OF REPORT</p>
            <p style={{ fontSize: "9px", color: "#999" }}>Generated on: {new Date().toLocaleString()}</p>
            {signature && (
              <div style={{ marginTop: "10px" }}>
                {signature.signatureImage && <img src={signature.signatureImage} alt="Sig" style={{ maxWidth: "100px", maxHeight: "60px" }} />}
                {signature.doctorName && <div style={{ fontSize: "9px", fontWeight: "bold" }}>{signature.doctorName}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
