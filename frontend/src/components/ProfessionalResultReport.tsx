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
}: ProfessionalResultReportProps) {
  const patientName = `${patient.title || ""} ${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  const visitDateStr = visitDate ? new Date(visitDate).toLocaleDateString("en-GB") : "-";

  return (
    <div className="print-report" style={{ fontFamily: "'Arial', 'Nimbus Sans', sans-serif", lineHeight: "1.4" }}>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print-report { margin: 0; padding: 20px; }
          @page { size: A4; margin: 10mm; }
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
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 8px 0;
        }
        .category-header {
          font-size: 14px;
          font-weight: normal;
          text-transform: uppercase;
          text-decoration: underline;
          margin: 15px 0 10px 0;
          padding-bottom: 5px;
          border-bottom: 1px solid #000;
        }
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .table-header {
          background-color: #f5f5f5;
          border: 1px solid #000;
        }
        .table-header th {
          font-size: 13px;
          font-weight: bold;
          padding: 8px;
          text-align: left;
          border: 1px solid #000;
        }
        .table-row td {
          font-size: 13px;
          padding: 8px;
          border: 1px solid #ccc;
        }
        .param-name {
          font-weight: normal;
          width: 35%;
        }
        .param-method {
          font-size: 9px;
          color: #666;
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
          width: 30%;
        }
        .abnormal {
          color: #b91c1c;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          border-top: 1px solid #000;
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

      {/* HEADER */}
      {withHeader && (
        <div className="report-header">
          <p className="header-title">SHRADDHA</p>
          <p className="header-subtitle">Pathology Laboratory</p>
          <p className="header-address">Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <p className="header-address">Ph: +91-XXXX-XXXXX | Email: info@shraddha.com</p>
        </div>
      )}

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

      <hr style={{ margin: "15px 0", border: "none", borderTop: "1px solid #000" }} />

      {/* TEST TITLE */}
      <div className="test-title">{test?.name || "TEST RESULTS"}</div>

      {/* RESULTS TABLE */}
      <table className="results-table">
        <thead className="table-header">
          <tr>
            <th style={{ width: "35%" }}>Test Description</th>
            <th style={{ width: "20%" }}>Result</th>
            <th style={{ width: "15%" }}>Unit</th>
            <th style={{ width: "30%" }}>Reference Range</th>
          </tr>
        </thead>
        <tbody>
          {parameters && parameters.length > 0 ? (
            parameters.map((param: any, idx: number) => {
              const er = param.existingResult;
              const val = er ? (er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : er.textValue || "-") : "-";
              const isAbnormal = er?.isAbnormal || (param.parameterType === "Numeric" && er?.isOutOfRange);

              return (
                <tr key={idx} className="table-row">
                  <td className="param-name">
                    <div>{param.parameterName}</div>
                    <div className="param-method">METHOD: {param.machineCode || "N/A"}</div>
                  </td>
                  <td className={`param-result ${isAbnormal ? "abnormal" : ""}`}>
                    {val}
                    {isAbnormal ? " *" : ""}
                  </td>
                  <td className="param-unit">{param.units || "-"}</td>
                  <td className="param-range">{er?.referenceRange || param.rangeText || "-"}</td>
                </tr>
              );
            })
          ) : (
            <tr className="table-row">
              <td colSpan={4} style={{ textAlign: "center", color: "#999" }}>
                No parameters available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <hr style={{ margin: "15px 0", border: "none", borderTop: "1px solid #000" }} />

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
  );
}
