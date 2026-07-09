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
}: ProfessionalResultReportProps) {
  const patientName = `${patient.title || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  const visitDateStr = visitDate ? new Date(visitDate).toLocaleDateString("en-GB") : "-";

  // Helper function to strip HTML tags
  const stripHtmlTags = (str: string) => {
    if (!str) return "-";
    return str.replace(/<[^>]*>/g, "").trim();
  };

  // Check if ANY parameter has units or reference range
  const hasAnyUnits = parameters && parameters.some((param: any) => param.units && stripHtmlTags(param.units) !== "-");
  const hasAnyReferenceRange = parameters && parameters.some((param: any) => {
    const er = param.existingResult;
    const rangeText = stripHtmlTags(er?.referenceRange || param.rangeText || "-");
    return rangeText !== "-";
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
              <th style={{ width: "40%" }}>Test Description</th>
              <th style={{ width: "20%" }}>Result</th>
              {hasAnyUnits && <th style={{ width: "15%" }}>Unit</th>}
              {hasAnyReferenceRange && <th style={{ width: "25%" }}>Reference Range</th>}
            </tr>
          </thead>
          <tbody>
            {parameters && parameters.length > 0 ? (
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
