"use client";

import React from "react";

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
          padding: 140px 53px 135px 53px;
          min-height: 1123px;
          background: none;
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
          gap: 20px;
          margin: 15px 0;
        }
        .patient-info-row {
          font-size: 14px;
          margin: 5px 0;
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
          font-size: 17px;
          font-weight: bold;
          text-align: center;
          margin: 15px 0;
          text-decoration: underline;
          border-top: none;
          border-bottom: none;
          padding: 8px 0;
        }
        .category-header {
          font-size: 14px;
          font-weight: normal;
          text-transform: uppercase;
          text-decoration: underline;
          margin: 15px 0 10px 0;
          padding-bottom: 5px;
          border-bottom: none;
        }
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          border: none;
        }
        .table-header {
          background-color: transparent;
          border: none;
          border-bottom: 1px solid #000;
        }
        .table-header th {
          font-size: 13px;
          font-weight: bold;
          padding: 8px 0;
          text-align: left;
          border: none;
        }
        .table-row td {
          font-size: 13px;
          padding: 8px 0;
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
          margin-top: 30px;
          text-align: center;
          border-top: none;
          padding-top: 15px;
        }
        .footer-text {
          font-size: 12px;
          font-weight: bold;
          margin: 5px 0;
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

      {/* REPORT CONTENT */}
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
              {signature.doctorName && (
                <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "3px" }}>
                  {signature.doctorName}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
