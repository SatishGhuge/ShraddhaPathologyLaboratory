import React from 'react';

interface BillReceiptProps {
  booking: any;
  billing: any;
  businessType: string;
  numberToWords: (n: number) => string;
}

const BillReceipt: React.FC<BillReceiptProps> = ({ booking, billing, businessType, numberToWords }) => {
  // Calculate totals
  const billTotal = booking.tests.reduce(
    (sum: number, t: any) => sum + (businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0)),
    0
  );
  
  const currentDiscountPercent = parseFloat(billing.discountPercent) || 0;
  const currentDiscountAmount = parseFloat(billing.discount) || 0;
  const billDiscountAmount = currentDiscountPercent > 0
    ? Math.round(billTotal * currentDiscountPercent / 100)
    : Math.round(currentDiscountAmount);
  
  const billNetAmount = Math.max(0, billTotal - billDiscountAmount);
  
  const patientName = booking.patientData?.firstName && booking.patientData?.lastName
    ? `${booking.patientData?.title || ''} ${booking.patientData?.firstName} ${booking.patientData?.lastName}`.trim()
    : booking.name;

  // Format date as DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // If already formatted as DD/MM/YYYY
    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return dateStr;
    }
    
    // If YYYY-MM-DD format
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
    } catch {
      return dateStr || 'N/A';
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          #bill-print-area { margin: 0; padding: 10mm; page-break-after: avoid; }
          * { box-sizing: border-box; }
          table { width: 100%; border-collapse: collapse; }
          tr { page-break-inside: avoid; }
          .no-print { display: none; }
        }
      `}</style>
      
      <div className="overflow-y-auto flex-1 bg-white print:p-0" id="bill-print-area" style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', padding: '2rem' }}>
        {/* HEADER - Centered */}
        <div className="text-center mb-4 pb-3" style={{ borderBottom: '2px solid #000' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' }}>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p style={{ fontSize: '12px', margin: '2px 0', fontWeight: '500' }}>DR. VIKAS K. MANDLECHA M.D.(Path)</p>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>Regd. No. 67625</p>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>B.G.Corner, Ground Floor, Besides Sarswat Bank, Nigdi, Pune-44</p>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>Ph. No.:8551800234 / 8793383381</p>
        </div>

        {/* RECEIPT Title */}
        <div className="text-center my-3" style={{ borderBottom: '2px solid #000', paddingBottom: '4px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>RECEIPT</h2>
        </div>

        {/* Patient Details - Two Row Layout */}
        <div style={{ marginBottom: '3px', borderBottom: '2px solid #000', paddingBottom: '4px' }}>
          {/* First Row: Visit ID, Name, Sex/Age */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '3px', fontSize: '13px' }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Visit ID :</span>
              <span style={{ marginLeft: '8px', color: '#0066cc', fontWeight: 'bold' }}>{booking.visitId || 'N/A'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Name :</span>
              <span style={{ marginLeft: '8px' }}>{patientName} (ID: {booking.patientData?.id || 'N/A'})</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Sex / Age :</span>
              <span style={{ marginLeft: '8px' }}>{booking.patientData?.gender?.charAt(0) || 'M'} / {booking.patientData?.age || '—'} years</span>
            </div>
          </div>

          {/* Second Row: Payment Mode, Referral, Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', fontSize: '13px' }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Payment Mode :</span>
              <span style={{ marginLeft: '8px' }}>{billing.paymentMode || 'CASH'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Referral :</span>
              <span style={{ marginLeft: '8px' }}>{booking.patientData?.referralDoctor || 'N/A'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Date:</span>
              <span style={{ marginLeft: '8px' }}>{formatDate(booking.date)}</span>
            </div>
          </div>
        </div>

        {/* Tests Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '8px 4px', width: '8%', fontWeight: 'bold' }}>Sr.</th>
              <th style={{ textAlign: 'left', padding: '8px 4px', width: '70%', fontWeight: 'bold' }}>Test Name</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', width: '22%', fontWeight: 'bold' }}>Test Price</th>
            </tr>
          </thead>
          <tbody>
            {booking.tests.map((t: any, i: number) => {
              const charge = businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ textAlign: 'left', padding: '6px 4px' }}>{i + 1}</td>
                  <td style={{ textAlign: 'left', padding: '6px 4px' }}>{t.name}</td>
                  <td style={{ textAlign: 'right', padding: '6px 4px' }}>{Math.round(charge).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary Section */}
        <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', paddingTop: '6px', paddingBottom: '6px', marginBottom: '8px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Gross Amount :</span>
            <span style={{ fontWeight: 'bold' }}>{Math.round(billTotal).toFixed(2)}</span>
          </div>
          
          {/* Discount Breakdown */}
          {(currentDiscountPercent > 0 || currentDiscountAmount > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Discount {currentDiscountPercent > 0 ? `(${currentDiscountPercent}%)` : '(Fixed)'} :</span>
              <span style={{ fontWeight: 'bold', color: '#cc0000' }}>-{billDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold' }}>Net Amount :</span>
            <span style={{ fontWeight: 'bold', color: '#00aa00' }}>{Math.round(billNetAmount).toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payable Amount (in words) :</span>
            <span style={{ fontWeight: 'bold' }}>{numberToWords(Math.round(billNetAmount))} Only</span>
          </div>
        </div>

        {/* Remarks Section */}
        {billing.remarks && (
          <div style={{ backgroundColor: '#fffacd', border: '1px solid #ffeb99', padding: '8px', marginBottom: '8px', borderRadius: '4px', fontSize: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>Remarks / Notes :</div>
            <div style={{ color: '#333' }}>{billing.remarks}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center" style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
          <p>Thank you for choosing SHRADDHA PATHOLOGY LABORATORY</p>
        </div>
      </div>
    </>
  );
};

export default BillReceipt;
