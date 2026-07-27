import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";


// Path to letterhead image
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

// Format date function
const getFormattedDate = (dateStr) => {
  if (!dateStr) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    return dateStr;
  }
  
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return 'Invalid Date';
  }
};

// Generate bill HTML
const generateBillHTML = (selectedBooking, billing, businessType, withHeader, letterHeadBase64 = '') => {
  const billTotal = selectedBooking.tests.reduce(
    (s, t) => s + (businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0)), 0
  );
  const currentDiscountPercent = parseFloat(billing.discountPercent) || 0;
  const currentDiscountAmount = parseFloat(billing.discount) || 0;
  const billDiscountAmount = currentDiscountPercent > 0 
    ? Math.round(billTotal * currentDiscountPercent / 100)
    : Math.round(currentDiscountAmount);
  const billNetAmount = Math.max(0, billTotal - billDiscountAmount);

  const patientName = selectedBooking.patientData?.firstName && selectedBooking.patientData?.lastName 
    ? `${selectedBooking.patientData?.title || ''} ${selectedBooking.patientData?.firstName} ${selectedBooking.patientData?.lastName}`.trim()
    : selectedBooking.name;

  const formattedDate = getFormattedDate(selectedBooking.date);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill Receipt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; }
    .container { width: 100%; padding: 40px 60px; }
    
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
    .header h1 { font-size: 22px; font-weight: bold; margin-bottom: 6px; }
    .header p { font-size: 12px; margin: 2px 0; }
    
    .receipt-title { text-align: center; font-size: 18px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; margin: 12px 0; }
    
    .patient-info { border-bottom: 2px solid #000; padding: 10px 0; margin-bottom: 12px; }
    .info-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-bottom: 6px; font-size: 13px; }
    .info-item { display: flex; align-items: center; }
    .info-label { font-weight: bold; margin-right: 6px; }
    .visit-id { color: #0066cc; font-weight: bold; }
    
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    table thead { border-top: 1px solid #000; border-bottom: 1px solid #000; }
    table th { text-align: left; padding: 8px 4px; font-weight: bold; }
    table td { padding: 6px 4px; border-bottom: 1px solid #ddd; }
    .col-sr { width: 8%; text-align: center; }
    .col-name { width: 70%; }
    .col-price { width: 22%; text-align: right; }
    
    .totals { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; margin: 12px 0; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; padding: 0; }
    .total-label { font-weight: bold; }
    .total-amount { font-weight: bold; min-width: 100px; text-align: right; }
    .discount .total-amount { color: #cc0000; }
    .net .total-amount { color: #00aa00; }
    
    .footer { text-align: center; margin-top: 16px; font-size: 12px; color: #666; }
    
    @media print { body { margin: 0; padding: 0; } .container { padding: 20mm 30mm; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SHRADDHA PATHOLOGY LABORATORY</h1>
      <p>DR. VIKAS K. MANDLECHA M.D.(Path)</p>
      <p>Regd. No. 67625</p>
      <p>B.G.Corner, Ground Floor, Besides Sarswat Bank, Nigdi, Pune-44</p>
      <p>Ph. No.:8551800234 / 8793383381</p>
    </div>
    
    <div class="receipt-title">RECEIPT</div>
    
    <div class="patient-info">
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">Visit ID :</span>
          <span class="visit-id">${selectedBooking.visitId || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Name :</span>
          <span>${patientName} (ID: ${selectedBooking.patientData?.id || 'N/A'})</span>
        </div>
        <div class="info-item">
          <span class="info-label">Sex / Age :</span>
          <span>${selectedBooking.patientData?.gender?.charAt(0) || 'M'} / ${selectedBooking.patientData?.age || '—'} years</span>
        </div>
      </div>
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">Payment Mode :</span>
          <span>${billing.paymentMode || 'CASH'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Referral :</span>
          <span>${selectedBooking.patientData?.referralDoctor || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Date & Time :</span>
          <span>${formattedDate}${selectedBooking.time ? ' ' + selectedBooking.time : ''}</span>
        </div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th class="col-sr">Sr.</th>
          <th class="col-name">Test Name</th>
          <th class="col-price">Test Price</th>
        </tr>
      </thead>
      <tbody>
        ${selectedBooking.tests.map((t, i) => {
          const charge = businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0);
          return `<tr><td class="col-sr">${i + 1}</td><td class="col-name">${t.name}</td><td class="col-price">${Math.round(charge).toFixed(2)}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="total-row">
        <div class="total-label">Gross Amount :</div>
        <div class="total-amount">${Math.round(billTotal).toFixed(2)}</div>
      </div>
      ${billDiscountAmount > 0 ? `<div class="total-row discount"><div class="total-label">Discount ${currentDiscountPercent > 0 ? `(${currentDiscountPercent}%)` : '(Fixed)'} :</div><div class="total-amount">-${Math.round(billDiscountAmount).toFixed(2)}</div></div>` : ''}
      <div class="total-row net">
        <div class="total-label">Net Amount :</div>
        <div class="total-amount">${Math.round(billNetAmount).toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div class="total-label">Payable Amount (in words) :</div>
        <div class="total-amount">${numberToWords(Math.round(billNetAmount))} Only</div>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for choosing SHRADDHA PATHOLOGY LABORATORY</p>
    </div>
  </div>
</body>
</html>`;
};

// Print function - opens in same window
export const printBill = async (selectedBooking, billing, businessType, withHeader = true) => {
  try {
    const billHtml = generateBillHTML(selectedBooking, billing, businessType, withHeader);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(billHtml);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 500);

    return { success: true };
  } catch (error) {
    console.error('Print error:', error);
    return { success: false, error: error.message };
  }
};

// PDF download function
export const generateBillPDF = async (selectedBooking, billing, businessType, withHeader = true) => {
  try {
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

    const billHtml = generateBillHTML(selectedBooking, billing, businessType, withHeader, letterHeadBase64);

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
