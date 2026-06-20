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

// Generate bill HTML with proper receipt format
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

  const patientName = selectedBooking.patientData?.firstName && selectedBooking.patientData?.lastName 
    ? `${selectedBooking.patientData?.title || ''} ${selectedBooking.patientData?.firstName} ${selectedBooking.patientData?.lastName}`.trim()
    : selectedBooking.name;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', 'Arial', monospace; 
          font-size: 11px;
          line-height: 1.3;
          width: 100%;
        }
        .receipt-wrapper {
          max-width: 600px;
          margin: 0 auto;
          padding: 15px;
          background: white;
        }
        
        .center { text-align: center; }
        .left { text-align: left; }
        .right { text-align: right; }
        
        .header {
          text-align: center;
          border-bottom: 1px solid #000;
          margin-bottom: 8px;
          padding-bottom: 6px;
        }
        .header h1 { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
        .header p { font-size: 9px; margin: 1px 0; }
        
        .receipt-title {
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          margin: 6px 0;
          letter-spacing: 2px;
        }
        
        .divider { border-top: 1px solid #000; margin: 4px 0; }
        
        .info-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4px;
          margin: 4px 0;
          font-size: 10px;
          padding: 2px 0;
          border-bottom: 1px solid #000;
        }
        .info-row div {
          text-align: center;
          word-break: break-word;
        }
        .info-row strong { display: block; font-weight: bold; font-size: 9px; }
        .info-row span { display: block; }
        
        .tests-table {
          width: 100%;
          margin: 6px 0;
          border-collapse: collapse;
          font-size: 10px;
          border: 1px solid #000;
        }
        .tests-table thead {
          background: #f9f9f9;
          border-bottom: 1px solid #000;
        }
        .tests-table th {
          text-align: center;
          padding: 4px 2px;
          font-weight: bold;
          border: 1px solid #000;
          font-size: 10px;
        }
        .tests-table td {
          padding: 3px 2px;
          border: 1px solid #ddd;
          text-align: center;
        }
        .sr-col { width: 10%; }
        .name-col { width: 65%; text-align: center; }
        .price-col { width: 25%; text-align: right; padding-right: 4px; }
        
        .totals-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 8px;
          padding: 3px 0;
          font-size: 10px;
          border-bottom: 1px solid #000;
        }
        .totals-row .label { text-align: right; font-weight: bold; }
        .totals-row .amount { text-align: center; font-weight: bold; }
        
        .payable-final {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 8px;
          padding: 4px 0;
          font-weight: bold;
          font-size: 11px;
          border-top: 2px solid #000;
          margin-top: 4px;
        }
        .payable-final .label { text-align: right; }
        .payable-final .amount { text-align: center; }
        
        @media print {
          body { margin: 0; padding: 0; }
          .receipt-wrapper { padding: 5px 10px; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-wrapper">
        <div class="header">
          <h1>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p>Dr. Vikas K. Mandlecha M.D.(Path) | Regd. No. 67625</p>
          <p>B.G. Corner, Ground Floor, Besides Sarswat Bank, Nigdi, Pune-44</p>
          <p>Ph: 8551800234 / 8793383381</p>
        </div>
        
        <div class="receipt-title">RECEIPT</div>
        <div class="divider"></div>
        
        <div class="info-row">
          <div>
            <strong>Accession No:</strong>
            <span>${selectedBooking.visitId || selectedBooking.bookingId}</span>
          </div>
          <div>
            <strong>Name:</strong>
            <span>${patientName}</span>
          </div>
          <div>
            <strong>Sex/Age:</strong>
            <span>${selectedBooking.patientData?.gender?.charAt(0) || 'M'}/${selectedBooking.patientData?.age || '—'}</span>
          </div>
        </div>
        
        <div class="info-row">
          <div>
            <strong>History:</strong>
            <span>${selectedBooking.patientData?.remark || '—'}</span>
          </div>
          <div>
            <strong>Report Mode:</strong>
            <span>By Hand</span>
          </div>
          <div>
            <strong>Referral:</strong>
            <span>${selectedBooking.patientData?.referralDoctor || '—'}</span>
          </div>
        </div>
        
        <table class="tests-table">
          <thead>
            <tr>
              <th class="sr-col">Sr.</th>
              <th class="name-col">Test Name</th>
              <th class="price-col">Test Price</th>
            </tr>
          </thead>
          <tbody>
            ${selectedBooking.tests.map((t, i) => {
              const charge = businessType==="B2C" ? (t.b2cCharge||t.charge||0) : (t.b2bCharge||t.charge||0);
              return `
                <tr>
                  <td class="sr-col">${i+1}</td>
                  <td class="name-col">${t.name}</td>
                  <td class="price-col">₹${Math.round(charge).toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="totals-row">
          <div class="label">Total Amount:</div>
          <div class="amount">₹${Math.round(billTotal).toFixed(2)}</div>
        </div>
        
        ${billDiscountAmount > 0 ? `
        <div class="totals-row">
          <div class="label">Discount:</div>
          <div class="amount">₹${Math.round(billDiscountAmount).toFixed(2)}</div>
        </div>
        ` : ''}
        
        <div class="totals-row">
          <div class="label">Payable (in words):</div>
          <div class="amount">${numberToWords(Math.round(billNetAmount))}</div>
        </div>
        
        <div class="payable-final">
          <div class="label">PAYABLE AMOUNT:</div>
          <div class="amount">₹${Math.round(billNetAmount).toFixed(2)}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Print bill function - generates HTML and triggers browser print dialog
export const printBill = async (selectedBooking, billing, businessType, withHeader = true) => {
  try {
    const billHtml = generateBillHTML(selectedBooking, billing, businessType, withHeader);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(billHtml);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
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
