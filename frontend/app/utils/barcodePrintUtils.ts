/**
 * Shared barcode print utilities for consistent print preview across all components
 */

export interface BarcodeLabelForPrint {
  barcodeValue: string;
  specimen: string;
  shortNamesStr: string;
  dateStr: string;
  timeStr: string;
  organizationCode?: string;
}

export interface PatientInfoForPrint {
  patientName: string;
  gender: string;
  age: string;
  visitId: string;
}

/**
 * Generate consistent print HTML for barcode labels (30mm x 20mm thermal labels)
 * Used by both "Print Only" and "Print & Update" functions
 * Minimal padding and spacing for compact thermal label printing
 */
export const generateCompactBarcodePrintHtml = (
  barcodeLabels: BarcodeLabelForPrint[],
  patientInfo: PatientInfoForPrint,
  barcodeSvgGenerator: (value: string) => string
): string => {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Barcode Labels</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    html, body { 
      margin: 0; 
      padding: 0; 
      background: white; 
      color: black; 
      font-family: Arial, sans-serif;
    }
    
    @page {
      size: 30mm 20mm;
      margin: 0;
      padding: 0;
    }
    
    @media print {
      html, body {
        margin: 0;
        padding: 0;
      }
      
      .barcode-label {
        margin: 0 !important;
        padding: 0.2mm !important;
        width: 30mm !important;
        height: 20mm !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
      }
    }
    
    .barcode-label {
      width: 30mm;
      height: 20mm;
      padding: 0.2mm;
      page-break-after: always;
      break-inside: avoid;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      margin: 0;
    }
    
    .barcode-label:last-child {
      page-break-after: avoid;
    }
    
    .org-code { 
      text-align: right; 
      font-size: 5pt; 
      font-weight: bold; 
      line-height: 1;
      margin: 0;
      padding: 0;
    }
    
    .barcode-container { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      width: 100%; 
      height: 4mm; 
      background: white;
      margin: 0;
      padding: 0;
    }
    
    svg { 
      max-width: 100%; 
      height: 4mm;
      display: block;
      margin: 0;
      padding: 0;
    }
    
    .barcode-value { 
      font-size: 5pt; 
      font-weight: bold; 
      text-align: center; 
      line-height: 1;
      margin: 0;
      padding: 0;
    }
    
    .footer-row-1 { 
      display: flex; 
      justify-content: space-between; 
      font-size: 4pt; 
      line-height: 1;
      margin: 0;
      padding: 0;
    }
    
    .footer-row-2 { 
      display: flex; 
      justify-content: space-between; 
      font-size: 4pt; 
      line-height: 1;
      margin: 0;
      padding: 0;
    }
    
    .footer-row-3 { 
      font-size: 4pt; 
      line-height: 1;
      text-align: left; 
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0;
      padding: 0;
    }
    
    .patient-name { 
      font-weight: bold; 
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .gender-age { 
      font-weight: bold; 
      flex-shrink: 0;
      margin-left: 0.2mm;
    }
  </style>
</head>
<body>`;

  barcodeLabels.forEach((label) => {
    const barcodeSvg = barcodeSvgGenerator(label.barcodeValue);
    const truncName = patientInfo.patientName.substring(0, 18);
    const truncTests = label.shortNamesStr.substring(0, 22);
    
    html += `<div class="barcode-label">${label.organizationCode ? `<div class="org-code">${label.organizationCode}</div>` : ''}<div class="barcode-container"><svg xmlns="http://www.w3.org/2000/svg" width="100%" height="4mm" viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet">${barcodeSvg}</svg></div><div class="barcode-value">${label.barcodeValue}</div><div class="footer-row-1"><span style="flex:0.9;">${label.dateStr}</span><span style="flex:1;text-align:center;font-weight:bold;">${label.timeStr}</span><span style="flex:1.1;text-align:right;font-weight:bold;">${label.specimen}</span></div><div class="footer-row-2"><span class="patient-name">${truncName}</span><span class="gender-age">${patientInfo.gender?.charAt(0).toUpperCase()}/${patientInfo.age}Y</span></div><div class="footer-row-3">${truncTests}</div></div>`;
  });

  html += `</body></html>`;
  return html;
};
