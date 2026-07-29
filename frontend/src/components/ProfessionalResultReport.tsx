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
  // 🔧 PART 3: Add support for outsourced test data
  isOutsourced?: boolean;
  outsourcedTo?: string;
  outsourcingReport?: any;
  selectedOutsourcedTests?: any[];  // New: filtered tests to display
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
  // 🔧 PART 3: Destructure outsourcing props
  isOutsourced = false,
  outsourcedTo = null,
  outsourcingReport = null,
  selectedOutsourcedTests = [],
}: ProfessionalResultReportProps) {
  const patientName = `${patient.title || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  const visitDateStr = visitDate ? new Date(visitDate).toLocaleDateString("en-GB") : "-";

  // 🔧 PART 3: Parse extracted data from outsourcing report if available
  let extractedParameters: any[] = [];
  if (isOutsourced) {
    console.log('🔍 Component received isOutsourced=true');
    console.log('📋 outsourcingReport:', outsourcingReport);
    console.log('📋 selectedOutsourcedTests:', selectedOutsourcedTests);
    
    // If selectedOutsourcedTests is provided, use those (filtered tests)
    if (selectedOutsourcedTests && selectedOutsourcedTests.length > 0) {
      extractedParameters = selectedOutsourcedTests;
      console.log('✅ Using selected outsourced tests:', extractedParameters);
    } else if (outsourcingReport?.extractedData) {
      // Parse extracted data from report
      try {
        let parsed = outsourcingReport.extractedData;
        
        // If it's a string, parse as JSON
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        
        extractedParameters = Array.isArray(parsed) ? parsed : [];
        console.log('✅ Extracted outsourced parameters:', extractedParameters);
      } catch (e) {
        console.warn('⚠️ Could not parse outsourcing extracted data:', e);
        extractedParameters = [];
      }
    }
    
    // Log first parameter details for debugging
    if (extractedParameters.length > 0) {
      console.log('🔍 First parameter details:', {
        name: extractedParameters[0].name,
        parameterName: extractedParameters[0].parameterName,
        value: extractedParameters[0].value,
        result: extractedParameters[0].result,
        unit: extractedParameters[0].unit,
        units: extractedParameters[0].units,
        referenceRange: extractedParameters[0].referenceRange,
        range: extractedParameters[0].range,
        interpretation: extractedParameters[0].interpretation,
        hasInterpretation: !!extractedParameters[0]?.interpretation
      });
    }
  }

  // Helper function to strip HTML tags
  const stripHtmlTags = (str: string) => {
    if (!str) return "-";
    return str.replace(/<[^>]*>/g, "").trim();
  };

  // Check if ANY parameter has units or reference range
  // For outsourced reports, always show these columns
  const hasAnyUnits = isOutsourced ? true : (parameters && parameters.some((param: any) => param.units && stripHtmlTags(param.units) !== "-"));
  const hasAnyReferenceRange = isOutsourced ? true : (parameters && parameters.some((param: any) => {
    const er = param.existingResult;
    const rangeText = stripHtmlTags(er?.referenceRange || param.rangeText || "-");
    return rangeText !== "-";
  }));

  const handlePrintOutsourcing = () => {
    if (!isOutsourced) {
      alert('This test is not outsourced');
      return;
    }

    console.log('🖨️ Printing outsourced report on Shraddha letterhead...');
    console.log('🔍 Selected parameters:', extractedParameters);
    console.log('🔍 Selected parameters count:', extractedParameters.length);

    if (extractedParameters.length === 0) {
      alert('No tests selected to print');
      return;
    }

    // Create a new window with letterhead + extracted data in table format
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }

    // Build letterhead - use actual image or create styled one
    const letterheadHtml = letterHeadBase64
      ? `<img src="${letterHeadBase64}" style="width: 100%; height: auto; display: block; margin-bottom: 10px;" />`
      : `<div style="text-align: center; margin-bottom: 20px; padding: 20px 0; border-bottom: 3px solid #ff8c00;">
           <h1 style="margin: 0; color: #ff8c00; font-size: 28px; font-weight: bold;">SHRADDHA PATHOLOGY LABORATORY</h1>
           <p style="margin: 5px 0; color: #666; font-size: 12px;">Accredited Laboratory</p>
         </div>`;

    // Build one page per test with interpretation
    let pagesHtml = '';
    extractedParameters.forEach((param, idx) => {
      console.log(`📄 Page ${idx + 1}: ${param.name || param.parameterName}`);
      console.log(`   Interpretation: ${param.interpretation ? param.interpretation.substring(0, 100) + '...' : '(none)'}`);
      
      pagesHtml += `
        <div style="page-break-before: ${idx > 0 ? 'always' : 'auto'}; padding: 20px; min-height: 980px; box-sizing: border-box; display: flex; flex-direction: column;">
          <div>
            ${letterheadHtml}

            <div style="text-align: center; color: #ff8c00; font-weight: bold; margin: 15px 0; font-size: 14px;">
              📋 Outsourced Laboratory Report
            </div>
            <div style="text-align: center; font-size: 11px; color: #666; margin: 10px 0 20px 0;">
              Source: ${outsourcedTo} | Date: ${new Date().toLocaleString('en-GB')}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; font-size: 12px;">Test Name</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold; font-size: 12px;">Result</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold; font-size: 12px;">Unit</th>
                  <th style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; font-size: 12px;">Reference Range</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px; text-align: left; border: 1px solid #ddd; font-size: 12px;">${param.name || param.parameterName || '-'}</td>
                  <td style="padding: 12px; text-align: center; border: 1px solid #ddd; font-size: 12px; font-weight: bold;">${param.value || param.result || '-'}</td>
                  <td style="padding: 12px; text-align: center; border: 1px solid #ddd; font-size: 12px;">${param.unit || param.units || '-'}</td>
                  <td style="padding: 12px; text-align: left; border: 1px solid #ddd; font-size: 12px;">${param.referenceRange || param.range || '-'}</td>
                </tr>
              </tbody>
            </table>

            ${param.interpretation ? `
            <div style="margin: 20px 0; padding: 15px; background-color: #fafafa; border-left: 4px solid #ff8c00; border: 1px solid #f0f0f0;">
              <div style="font-weight: bold; font-size: 13px; color: #333; margin-bottom: 10px;">Interpretation:</div>
              <div style="font-size: 12px; line-height: 1.6; color: #555; white-space: pre-wrap; text-align: left;">
                ${param.interpretation}
              </div>
            </div>
            ` : '<div style="margin: 20px 0; padding: 15px; background-color: #fafafa; color: #999; font-size: 12px;">No interpretation available</div>'}
          </div>

          <div style="margin-top: auto; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 20px;">
            <p style="margin: 5px 0;">Printed from Shraddha Pathology Laboratory Management System</p>
            <p style="margin: 5px 0;">Outsourced Lab: ${outsourcedTo}</p>
            <p style="margin: 5px 0; color: #aaa;">Page ${idx + 1} of ${extractedParameters.length}</p>
          </div>
        </div>
      `;
    });

    // Build HTML with proper CSS for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Outsourced Laboratory Report</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box;
          }
          html, body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: #fff;
            width: 100%;
            height: 100%;
          }
          @page {
            size: A4;
            margin: 0;
            padding: 0;
          }
          @media print {
            * {
              margin: 0;
              padding: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: white;
            }
            div[style*="page-break-before"] {
              page-break-before: always;
              margin: 0;
              padding: 20px;
              min-height: 280mm;
            }
            div {
              page-break-inside: avoid;
            }
            table {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

    console.log('📄 Total HTML length:', htmlContent.length);
    console.log('📄 Total pages to print:', extractedParameters.length);

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to render before printing
    setTimeout(() => {
      console.log('🖨️ Opening print dialog...');
      printWindow.print();
    }, 2000);
  };

  return (
    <div className="print-report" style={{ fontFamily: "'Arial', 'Nimbus Sans', sans-serif", lineHeight: "1.4", position: "relative" }}>
      {/* Print button for outsourced reports */}
      {isOutsourced && (
        <div style={{ textAlign: 'right', marginBottom: '10px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
          <button
            onClick={handlePrintOutsourcing}
            disabled={extractedParameters.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: extractedParameters.length > 0 ? '#ff8c00' : '#cccccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: extractedParameters.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              fontSize: '14px',
              opacity: extractedParameters.length > 0 ? 1 : 0.6
            }}
            title={extractedParameters.length > 0 ? 'Print on Shraddha letterhead' : 'No extracted data available'}
          >
            🖨️ Print on Shraddha Letterhead ✓
          </button>
          <p style={{ fontSize: '11px', color: '#ff8c00', marginTop: '5px' }}>
            📋 Outsourced from: {outsourcedTo} | {extractedParameters.length} parameters extracted
          </p>
        </div>
      )}
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

        {/* RESULTS TABLE */}
        <table className="results-table">
          <thead className="table-header">
            <tr>
              <th style={{ width: "40%", textAlign: 'left', paddingRight: '10px' }}>
                {isOutsourced ? "Test Name" : "Test Description"}
              </th>
              <th style={{ width: "20%", textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>Result</th>
              {hasAnyUnits && <th style={{ width: "15%", textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>Unit</th>}
              {hasAnyReferenceRange && <th style={{ width: "25%", textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>{isOutsourced ? "Biological Ref. Interval" : "Reference Range"}</th>}
            </tr>
          </thead>
          <tbody>
            {/* 🔧 PART 3: Display outsourced test data if available */}
            {isOutsourced ? (
              extractedParameters && extractedParameters.length > 0 ? (
                <>
                  {/* Display all extracted parameters */}
                  {extractedParameters.map((param, paramIdx) => (
                    <React.Fragment key={paramIdx}>
                      <tr className="table-row">
                        <td className="param-name" style={{ textAlign: 'left', paddingRight: '10px' }}>
                          <div>{param.name || param.parameterName || "Parameter"}</div>
                          <div className="param-method" style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            {param.method || 'Immunoturbidimetry'}
                          </div>
                        </td>
                        <td className="param-result" style={{ textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
                          {param.value || param.result || "-"}
                        </td>
                        {hasAnyUnits && <td className="param-unit" style={{ textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>{param.unit || param.units || "-"}</td>}
                        {hasAnyReferenceRange && <td className="param-range" style={{ textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>{param.referenceRange || param.range || "-"}</td>}
                      </tr>
                      {/* Show interpretation if available */}
                      {param.interpretation && (
                        <tr className="table-row" style={{ borderTop: '1px solid #000' }}>
                          <td colSpan={hasAnyUnits && hasAnyReferenceRange ? 4 : hasAnyUnits || hasAnyReferenceRange ? 3 : 2} style={{ paddingTop: '20px', paddingBottom: '10px', borderBottom: 'none' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Interpretation:</div>
                            <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#333', whiteSpace: 'pre-line', textAlign: 'left' }}>
                              {param.interpretation}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <tr className="table-row">
                  <td colSpan={hasAnyUnits && hasAnyReferenceRange ? 4 : hasAnyUnits || hasAnyReferenceRange ? 3 : 2} style={{ textAlign: "center", color: "#999" }}>
                    No extracted data available - upload PDF report to import
                  </td>
                </tr>
              )
            ) : parameters && parameters.length > 0 ? (
              /* Display normal in-house test data */
              parameters.map((param: any, idx: number) => {
                const er = param.existingResult;
                const val = er ? (er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : er.textValue || "-") : "-";
                const isAbnormal = er?.isAbnormal || (param.parameterType === "Numeric" && er?.isOutOfRange);
                
                // Get category method and parameter method separately
                const categoryMethod = param.categoryTestMethod || null;
                const parameterMethod = param.parameterTestMethod || null;

                // Strip HTML tags from all values
                const resultText = stripHtmlTags(String(val));
                const unitText = stripHtmlTags(param.units);
                const rangeText = stripHtmlTags(er?.referenceRange || param.rangeText || "-");

                return (
                  <tr key={idx} className="table-row">
                    <td className="param-name">
                      {/* Show Category Method if exists */}
                      {categoryMethod && (
                        <div className="param-method">Method: {categoryMethod}</div>
                      )}
                      
                      {/* Show Parameter Name */}
                      <div>{param.parameterName}</div>
                      
                      {/* Show Parameter Method if exists */}
                      {parameterMethod && (
                        <div className="param-method">Method: {parameterMethod}</div>
                      )}
                    </td>
                    <td className={`param-result ${isAbnormal ? "abnormal" : ""}`}>
                      {resultText}
                      {isAbnormal ? " *" : ""}
                    </td>
                    {hasAnyUnits && <td className="param-unit">{unitText}</td>}
                    {hasAnyReferenceRange && <td className="param-range">{rangeText}</td>}
                  </tr>
                );
              })
            ) : (
              <tr className="table-row">
                <td colSpan={hasAnyUnits && hasAnyReferenceRange ? 4 : hasAnyUnits || hasAnyReferenceRange ? 3 : 2} style={{ textAlign: "center", color: "#999" }}>
                  No parameters available
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FOOTER */}
        <div className="footer">
          {/* 🔧 PART 3: Show source information for outsourced tests */}
          {isOutsourced && outsourcedTo && (
            <p style={{ fontSize: "11px", color: "#ff8c00", fontWeight: "bold", marginBottom: "10px" }}>
              📋 Source: {outsourcedTo} (Outsourced Laboratory)
            </p>
          )}
          <p className="footer-text">END OF REPORT</p>
          <p style={{ fontSize: "11px", color: "#666" }}>This is a computer-generated report and does not require a signature</p>
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
