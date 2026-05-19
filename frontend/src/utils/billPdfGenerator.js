import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";

// Path to letterhead image in public folder
const LETTERHEAD_PATH = "/LetterHead.jpeg";

// Helper function to convert number to words
function numberToWords(n) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

  if (n === 0) return "Zero";
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numberToWords(n % 100) : "");
  if (n < 100000) return numberToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numberToWords(n % 1000) : "");
  if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numberToWords(n % 100000) : "");
  return numberToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numberToWords(n % 10000000) : "");
}

// Generate bill HTML
const generateBillHTML = (selectedBooking, billing, businessType, withHeader, letterHeadBase64 = '') => {
  // Calculate amounts
  const billTotal = selectedBooking.tests.reduce(
    (s,t) => s+(businessType==="B2C"?(t.b2cCharge||t.charge||0):(t.b2bCharge||t.charge||0)), 0
  );
  const currentDiscountPercent = parseFloat(billing.discountPercent) || 0;
  const currentDiscountAmount = parseFloat(billing.discount) || 0;
  const billDiscountAmount = currentDiscountPercent > 0 
    ? Math.round(billTotal * currentDiscountPercent / 100)
    : Math.round(currentDiscountAmount);
  const billNetAmount = Math.max(0, billTotal - billDiscountAmount);
  const billPaidAmount = selectedBooking.paidAmount || 0;
  const billBalanceAmount = selectedBooking.balanceAmount || Math.max(0, billNetAmount - billPaidAmount);
  const isFullyPaid = billBalanceAmount <= 0;

  return `
    <div style="width:100%;position:relative;background:#fff;font-family:Arial,sans-serif;font-size:11px;page-break-after:avoid;">
      ${withHeader && letterHeadBase64 ? `<img src="${letterHeadBase64}" style="position:absolute;top:0;left:0;width:100%;height:auto;max-height:297mm;object-fit:contain;z-index:0;" />` : ''}
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;padding-top:${withHeader ? '144px' : '40px'};padding-bottom:${withHeader ? '80px' : '40px'};padding-left:53px;padding-right:53px;box-sizing:border-box;min-height:${withHeader ? '1050px' : 'auto'};">
        
        ${!withHeader ? `
          <!-- Company Header for non-letterhead version -->
          <div style="text-align:center;margin-bottom:20px;">
            <h1 style="font-size:24px;font-weight:bold;margin:0 0 8px 0;letter-spacing:1px;">SILVERLEAF DIAGNOSTICS</h1>
            <p style="font-size:12px;color:#666;margin:4px 0;">Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
            <p style="font-size:12px;color:#666;margin:4px 0;">+91 8779295302, 022-2745 1122</p>
            <p style="font-size:12px;color:#666;margin:4px 0;">info@silverleafdiagnostics.com | www.silverleafdiagnostics.com</p>
          </div>
        ` : ''}

        <!-- Header -->
        <div style="text-align:center;margin-bottom:16px;">
          <h2 style="font-size:14px;font-weight:bold;letter-spacing:1px;margin:0 0 8px 0;${!withHeader ? 'text-decoration:underline;' : ''}">
            ${isFullyPaid ? 'INVOICE-CUM-RECEIPT' : 'INVOICE'}
          </h2>
          ${!isFullyPaid && billBalanceAmount > 0 ? `
            <div style="display:inline-block;background:#fee2e2;color:#991b1b;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:bold;">
              BALANCE DUE: Rs.${Math.round(billBalanceAmount).toLocaleString()}
            </div>
          ` : ''}
        </div>

        <!-- Patient Info -->
        <div style="width:100%;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:8px 0;margin-bottom:12px;font-size:11px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:3px 0;width:40%;"><strong>Name:</strong> ${selectedBooking.name}</td>
              <td style="padding:3px 0;width:20%;"></td>
              <td style="padding:3px 0;width:40%;"><strong>Patient ID:</strong> ${selectedBooking.patientId}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;"><strong>Age/Sex:</strong> ${selectedBooking.patientData?.age} Yrs/${selectedBooking.patientData?.gender}</td>
              <td style="padding:3px 0;"></td>
              <td style="padding:3px 0;"><strong>Date:</strong> ${selectedBooking.date}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;"><strong>Ref Dr.:</strong> ${selectedBooking.patientData?.referralDoctor || "—"}</td>
              <td style="padding:3px 0;"></td>
              <td style="padding:3px 0;"><strong>Mobile No:</strong> ${selectedBooking.patientData?.mobile}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;"><strong>Center:</strong> SILVERLEAF DIAGNOSTICS</td>
              <td style="padding:3px 0;"></td>
              <td style="padding:3px 0;"><strong>Invoice No:</strong> ${selectedBooking.visitId || selectedBooking.bookingId}</td>
            </tr>
          </table>
        </div>

        <!-- Tests Table -->
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
          <thead>
            <tr style="border-bottom:2px solid #333;">
              <th style="text-align:left;padding:6px 4px;width:10%;">Sr.No</th>
              <th style="text-align:left;padding:6px 4px;">Investigation(s)</th>
              <th style="text-align:left;padding:6px 4px;width:20%;">Date</th>
              <th style="text-align:right;padding:6px 4px;width:15%;">Charges</th>
            </tr>
          </thead>
          <tbody>
            ${selectedBooking.tests.map((t, i) => {
              const charge = businessType==="B2C" ? (t.b2cCharge||t.charge||0) : (t.b2bCharge||t.charge||0);
              return `
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:6px 4px;vertical-align:top;">${i+1}</td>
                  <td style="padding:6px 4px;vertical-align:top;font-weight:500;">${t.name}</td>
                  <td style="padding:6px 4px;vertical-align:top;">${selectedBooking.date}</td>
                  <td style="padding:6px 4px;vertical-align:top;text-align:right;">Rs.${Math.round(charge).toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
            <tr style="border-top:2px solid #333;">
              <td colspan="3" style="padding:8px 4px;font-weight:bold;text-align:right;">TOTAL:</td>
              <td style="padding:8px 4px;font-weight:bold;text-align:right;">Rs.${Math.round(billTotal).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <!-- Amount Summary -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:11px;margin-top:12px;">
          <div style="max-width:320px;">
            <p style="font-weight:bold;margin:0;">
              ${isFullyPaid ? 'Total Paid' : 'Net Amount'}: ${numberToWords(isFullyPaid ? billPaidAmount : billNetAmount)} Rupees Only
            </p>
          </div>
          <div style="text-align:right;min-width:200px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:600;">Total Bill:</span>
              <span style="font-weight:600;margin-left:32px;">Rs.${Math.round(billTotal).toLocaleString()}</span>
            </div>
            ${billDiscountAmount > 0 ? `
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span>Discount ${currentDiscountPercent > 0 ? `(${currentDiscountPercent}%)` : ''}:</span>
                <span style="font-weight:600;color:#059669;margin-left:32px;">- Rs.${Math.round(billDiscountAmount).toLocaleString()}</span>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;border-top:1px solid #d1d5db;padding-top:4px;">
              <span style="font-weight:bold;">Net Amount:</span>
              <span style="font-weight:bold;margin-left:32px;">Rs.${Math.round(billNetAmount).toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Amount Paid:</span>
              <span style="font-weight:600;color:#2563eb;margin-left:32px;">Rs.${Math.round(billPaidAmount).toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Balance Amount:</span>
              <span style="font-weight:600;color:${billBalanceAmount > 0 ? '#dc2626' : '#059669'};margin-left:32px;">Rs.${Math.round(billBalanceAmount).toLocaleString()}</span>
            </div>
            <div style="border-top:1px solid #9ca3af;margin:4px 0;"></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:600;">Payment Status:</span>
              <span style="font-weight:bold;color:${isFullyPaid ? '#059669' : '#dc2626'};margin-left:32px;">${isFullyPaid ? 'FULLY PAID' : 'PENDING'}</span>
            </div>
            ${billPaidAmount > 0 ? `
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span>Payment Mode:</span>
                <span style="font-weight:600;margin-left:32px;">${billing.paymentMode || "CASH"}</span>
              </div>
            ` : ''}
            ${billDiscountAmount > 0 && billing.remarks ? `
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span>Discount Remark:</span>
                <span style="font-weight:600;color:#6b7280;margin-left:32px;">${billing.remarks}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #ccc;font-size:11px;color:#6b7280;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;">
            <div>
              <p style="margin:0 0 8px 0;">Thank you for choosing SILVERLEAF DIAGNOSTICS</p>
              <p style="margin:0;">For any queries, please contact us at +91 8779295302</p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0 0 8px 0;">Authorised Signatory</p>
              <p style="margin:0;">SILVERLEAF DIAGNOSTICS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Print bill function - generates PDF and triggers browser print dialog
export const printBill = async (selectedBooking, billing, businessType, withHeader = true) => {
  try {
    // Convert LetterHead image to base64 if needed
    let letterHeadBase64 = '';
    if (withHeader) {
      try {
        const imgRes = await fetch(LETTERHEAD_PATH);
        const blob = await imgRes.blob();
        letterHeadBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) { console.warn('Could not load letterhead', e); }
    }

    // Generate bill HTML with base64 letterhead
    const billHtml = generateBillHTML(selectedBooking, billing, businessType, withHeader, letterHeadBase64);

    // Generate PDF blob using html2pdf
    const pdfBlob = await html2pdf().set({
      margin: 0,
      filename: `Bill_${selectedBooking.name.replace(/\s+/g, '_')}.pdf`,
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 794,
        windowHeight: 1123,
      },
      pagebreak: { mode: 'avoid-all' }
    }).from(billHtml).output('blob');

    // Create blob URL
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    iframe.src = blobUrl;

    // Wait for PDF to load in iframe, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Cleanup after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }, 500);
    };

    return { success: true };
  } catch (error) {
    console.error('Print error:', error);
    return { success: false, error: error.message };
  }
};

// Download PDF function
export const generateBillPDF = async (selectedBooking, billing, businessType, withHeader = true) => {
  try {
    // Convert LetterHead image to base64 if needed
    let letterHeadBase64 = '';
    if (withHeader) {
      try {
        const imgRes = await fetch(LETTERHEAD_PATH);
        const blob = await imgRes.blob();
        letterHeadBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) { console.warn('Could not load letterhead', e); }
    }

    // Generate bill HTML with base64 letterhead
    const billHtml = generateBillHTML(selectedBooking, billing, businessType, withHeader, letterHeadBase64);

    // Generate PDF using html2pdf
    const imgDataUrl = await html2pdf().set({
      margin: 0,
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 794,
        windowHeight: 1123,
      },
      pagebreak: { mode: 'avoid-all' }
    }).from(billHtml).outputImg('datauristring');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    pdf.addImage(imgDataUrl, 'JPEG', 0, 0, 210, 297);
    pdf.save(`Bill_${selectedBooking.name.replace(/\s+/g, '_')}_${selectedBooking.visitId || selectedBooking.bookingId}.pdf`);
    
    return { success: true };
  } catch (error) {
    console.error('PDF generation error:', error);
    return { success: false, error: error.message };
  }
};
