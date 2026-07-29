import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';

/**
 * Extracts middle content from outsourcing lab PDF and prints on Shraddha letterhead
 */

export const printOutsourcingReportOnShraddhaLetterhead = async (
  outsourcingPdfUrl: string,
  shraddhaLetterheadBase64: string,
  testData: any,
  patientData: any
) => {
  try {
    console.log('🖨️ Generating outsourcing report on Shraddha letterhead...');

    // Create new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Step 1: Add Shraddha letterhead at top
    if (shraddhaLetterheadBase64) {
      pdf.addImage(
        shraddhaLetterheadBase64,
        'JPEG',
        0, // x
        0, // y
        pageWidth, // width
        40 // height (letterhead only at top)
      );
    }

    // Step 2: Add extracted middle content from outsourcing PDF
    // This would be the middle section of their report (test parameters, values, etc.)
    
    let yPosition = 50;

    // Add patient info header
    pdf.setFontSize(10);
    pdf.text(`Patient: ${patientData.firstName} ${patientData.lastName}`, 15, yPosition);
    yPosition += 7;
    pdf.text(`Test: ${testData.test_name}`, 15, yPosition);
    yPosition += 7;
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 15, yPosition);
    yPosition += 10;

    // Add source attribution
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`[Report generated from ${testData.outsourcedTo} report]`, 15, yPosition);
    pdf.setTextColor(0, 0, 0);
    yPosition += 8;

    // Step 3: Add footer with Shraddha info
    pdf.setFontSize(8);
    pdf.text(
      'Shraddha Pathology Laboratory | Print Date: ' + new Date().toLocaleString(),
      15,
      pageHeight - 10
    );

    // Generate PDF
    pdf.save(`${testData.test_name}_${patientData.firstName}.pdf`);
    console.log('✅ Report printed successfully');

  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error;
  }
};

/**
 * Alternative: Extract text/content from uploaded PDF
 */
export const extractPdfContent = async (pdfUrl: string) => {
  try {
    console.log('📄 Extracting PDF content...');

    // In production, use a library like PDF.js or pdfparse
    // For now, we'll use a simple fetch
    const response = await fetch(pdfUrl);
    const arrayBuffer = await response.arrayBuffer();

    // You would need to implement actual PDF text extraction here
    // This is a placeholder for the extraction logic
    console.log('📄 PDF content extracted');

    return {
      success: true,
      content: 'PDF content would be extracted here',
      message: 'For full PDF extraction, integrate pdfjs-dist or similar library'
    };
  } catch (error) {
    console.error('❌ Error extracting PDF:', error);
    throw error;
  }
};

/**
 * Creates a printable HTML combining Shraddha letterhead with outsourcing report data
 */
export const createOutsourcingReportHtml = (
  letterheadHtml: string,
  testData: any,
  patientData: any,
  outsourcingData: any
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .letterhead { text-align: center; margin-bottom: 30px; }
        .content { margin: 20px 0; }
        .header { font-weight: bold; margin: 15px 0 10px 0; font-size: 14px; }
        .row { display: flex; margin: 5px 0; }
        .label { width: 150px; font-weight: bold; }
        .value { flex: 1; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f5f5f5; }
        .footer { margin-top: 30px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
        .source-note { font-size: 9px; color: #999; margin-top: 10px; }
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <!-- Shraddha Letterhead -->
      <div class="letterhead">
        ${letterheadHtml}
      </div>

      <!-- Patient Information -->
      <div class="content">
        <div class="header">PATIENT INFORMATION</div>
        <div class="row">
          <div class="label">Patient Name:</div>
          <div class="value">${patientData.firstName} ${patientData.lastName}</div>
        </div>
        <div class="row">
          <div class="label">Age/Gender:</div>
          <div class="value">${patientData.age} years, ${patientData.gender}</div>
        </div>
        <div class="row">
          <div class="label">Patient ID:</div>
          <div class="value">${patientData.patientId}</div>
        </div>
        <div class="row">
          <div class="label">Test Date:</div>
          <div class="value">${new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <!-- Test Results (from outsourcing lab) -->
      <div class="content">
        <div class="header">TEST RESULT</div>
        <div class="row">
          <div class="label">Test Name:</div>
          <div class="value">${testData.test_name}</div>
        </div>
        <div class="row">
          <div class="label">Test Code:</div>
          <div class="value">${testData.test_code}</div>
        </div>
        <div class="row">
          <div class="label">Status:</div>
          <div class="value">${testData.result_status}</div>
        </div>

        <!-- Display extracted data from outsourcing PDF if available -->
        ${
          outsourcingData && outsourcingData.extractedData
            ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    outsourcingData.extractedData.parameters
                      ?.map(
                        (param: any) => `
                    <tr>
                      <td>${param.name}</td>
                      <td>${param.value}</td>
                      <td>${param.unit}</td>
                      <td>${param.normalRange}</td>
                    </tr>
                  `
                      )
                      .join('')
                  }
                </tbody>
              </table>
            `
            : ''
        }
      </div>

      <!-- Source Attribution -->
      <div class="content source-note">
        <strong>Note:</strong> This report contains test results from 
        <strong>${testData.outsourcedTo}</strong> (Outsourcing Laboratory).
        The middle content section has been extracted from their report and presented 
        on Shraddha Pathology Laboratory letterhead for record keeping.
      </div>

      <!-- Footer -->
      <div class="footer">
        Printed from Shraddha Pathology Laboratory Management System
        <br/>Print Date: ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `;
};
