import React from 'react';

/*
 * ============================================================================
 * BILL RECEIPT - NORMALIZED BILLING TABLE DISPLAY MAPPING
 * ============================================================================
 * 
 * Displays data from VisitBill normalized structure:
 * 
 * billing object maps from:
 * ├─ VisitBill fields:
 * │  ├─ grossAmount → displayed as "Gross Amount"
 * │  ├─ totalDiscount → displayed as "Total Discount"
 * │  ├─ balanceAmount → displayed as "Balance Due"
 * │  └─ status → displayed as BillStatus
 * │
 * ├─ BillDiscount fields (latest record):
 * │  ├─ discountType → displayed as "PERCENTAGE" or "FLAT"
 * │  ├─ discountValue → displayed as "% value" or "Amount"
 * │  ├─ discountAmount → displayed as discount amount
 * │  └─ discountRemark → displayed in Remarks section
 * │
 * ├─ Payment fields (sum of all):
 * │  ├─ amount → displayed as "Total Paid"
 * │  └─ paymentMode → displayed as mode
 * │
 * └─ BillTransaction (audit trail):
 *    └─ Used for complete transaction history (not shown in receipt)
 * 
 * ============================================================================
 */

interface BillReceiptProps {
  booking: any;
  billing: any;
  businessType: string;
  numberToWords: (n: number) => string;
}

const BillReceipt: React.FC<BillReceiptProps> = ({ booking, billing, businessType, numberToWords }) => {
  // Map from new VisitBill normalized structure
  // billing object contains: grossAmount, totalDiscount, totalPaid, balanceAmount, status
  
  // Gross Amount from VisitBill
  const billTotal = billing?.grossAmount ? parseFloat(billing.grossAmount) : booking.tests.reduce(
    (sum: number, t: any) => sum + (businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0)),
    0
  );
  
  // Total Discount from VisitBill (totalDiscount field)
  const billDiscountAmount = billing?.totalDiscount ? parseFloat(billing.totalDiscount) : 0;
  
  // Total Paid from VisitBill (totalPaid field)
  const totalPaid = billing?.totalPaid ? parseFloat(billing.totalPaid) : 0;
  
  // Balance Amount from VisitBill
  const balanceAmount = billing?.balanceAmount ? parseFloat(billing.balanceAmount) : 0;
  
  // Net Amount = Gross - Discount
  const billNetAmount = Math.max(0, billTotal - billDiscountAmount);
  
  // Get discount details from latest BillDiscount in billingSessions
  const latestBillDiscount = billing?.billingSessions?.length > 0
    ? billing.billingSessions
        .flatMap((session: any) => session.discounts || [])
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;
  
  const discountType = latestBillDiscount?.discountType || 'FLAT';
  const discountValue = latestBillDiscount?.discountValue || 0;
  const discountRemark = latestBillDiscount?.remarks || billing?.remarks || '';
  
  // Get payment mode from latest Payment in billingSessions
  const latestPayment = billing?.billingSessions?.length > 0
    ? billing.billingSessions
        .flatMap((session: any) => session.payments || [])
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;
  
  const paymentMode = latestPayment?.paymentMode || billing?.paymentMode || 'CASH';
  
  const patientName = booking.patientData?.firstName && booking.patientData?.lastName
    ? `${booking.patientData?.title || ''} ${booking.patientData?.firstName} ${booking.patientData?.lastName}`.trim()
    : booking.name;

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
      
      <div className="overflow-y-auto flex-1 bg-white print:p-0" id="bill-print-area" style={{ fontFamily: 'Arial, sans-serif', padding: '2rem' }}>
        {/* HEADER - Centered */}
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold mb-1">SHRADDHA PATHOLOGY LABORATORY</h1>
          <p className="text-sm font-semibold mb-0.5">DR. VIKAS K. MANDLECHA M.D.(Path)</p>
          <p className="text-sm mb-0.5">Regd. No. 67625</p>
          <p className="text-sm mb-1">B.G.Corner, Ground Floor, Besides Sarswat Bank, Nigdi, Pune-44</p>
          <p className="text-sm">Ph. No.:8551800234 / 8793383381</p>
        </div>

        {/* RECEIPT Title */}
        <div className="text-center text-lg font-bold mb-4 pb-2 border-b border-gray-800">
          RECEIPT
        </div>

        {/* Patient Details - Single Row Header */}
        <div className="flex justify-between items-start text-xs mb-4" style={{ pageBreakInside: 'avoid' }}>
          <div>
            <div className="flex mb-1">
              <span className="w-32 font-semibold">Visit ID :</span>
              <span className="font-bold text-blue-600">{booking.visitId || 'N/A'}</span>
            </div>
            <div className="flex mb-1">
              <span className="w-32 font-semibold">Payment Mode :</span>
              <span>{paymentMode || 'CASH'}</span>
            </div>
          </div>
          <div>
            <div className="flex mb-1">
              <span className="w-32 font-semibold">Name :</span>
              <span>{patientName} (ID: {booking.patientData?.id || 'N/A'})</span>
            </div>
            <div className="flex mb-1">
              <span className="w-32 font-semibold">Referral :</span>
              <span>{booking.patientData?.referralDoctor || 'N/A'}</span>
            </div>
          </div>
          <div>
            <div className="flex mb-1">
              <span className="w-24 font-semibold">Sex / Age :</span>
              <span>{booking.patientData?.gender?.charAt(0) || 'M'} / {booking.patientData?.age || '—'} years</span>
            </div>
            <div className="flex mb-1">
              <span className="w-24 font-semibold">Date & Time :</span>
              <span>{booking.date}</span>
            </div>
          </div>
        </div>

        {/* Tests Table with horizontal lines */}
        <table className="w-full text-xs mb-4" style={{ borderCollapse: 'collapse', pageBreakInside: 'avoid' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th className="text-left py-2 px-1" style={{ width: '5%', pageBreakInside: 'avoid' }}>Sr.</th>
              <th className="text-left py-2 px-1" style={{ width: '55%', pageBreakInside: 'avoid' }}>Test Name</th>
              <th className="text-left py-2 px-1" style={{ width: '20%', pageBreakInside: 'avoid' }}>Test Price</th>
            </tr>
          </thead>
          <tbody>
            {booking.tests.map((t: any, i: number) => {
              const charge = businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #ccc', pageBreakInside: 'avoid' }}>
                  <td className="text-left py-1.5 px-1">{i + 1}</td>
                  <td className="text-left py-1.5 px-1">{t.name}</td>
                  <td className="text-left py-1.5 px-1">{Math.round(charge).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="border-t-2 border-b-2 border-gray-800 py-2 mb-2" style={{ pageBreakInside: 'avoid' }}>
          <div className="flex justify-between text-xs mb-1">
            <span>Gross Amount :</span>
            <span className="font-bold">{Math.round(billTotal).toFixed(2)}</span>
          </div>
          
          {/* Discount Breakdown - Map from new BillDiscount structure */}
          {billDiscountAmount > 0 && (
            <>
              <div className="flex justify-between text-xs mb-1">
                <span>
                  Discount {
                    discountType === 'PERCENTAGE' 
                      ? `(${discountValue}%)`
                      : '(Fixed)'
                  } :
                </span>
                <span className="font-bold text-red-600">-{billDiscountAmount.toFixed(2)}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between text-xs mb-2 pt-1 border-t border-gray-400">
            <span className="font-bold">Net Amount :</span>
            <span className="font-bold text-green-600">{Math.round(billNetAmount).toFixed(2)}</span>
          </div>
          
          {/* Payment Info - from VisitBill totalPaid */}
          {totalPaid > 0 && (
            <div className="flex justify-between text-xs mb-1">
              <span>Amount Paid :</span>
              <span className="font-bold text-green-600">{totalPaid.toFixed(2)}</span>
            </div>
          )}
          
          {/* Balance Info - from VisitBill balanceAmount */}
          {balanceAmount > 0 && (
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold">Balance Due :</span>
              <span className="font-bold text-orange-600">{balanceAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-xs mb-1">
            <span>Payable Amount (in words) :</span>
            <span className="font-semibold">{numberToWords(Math.round(billNetAmount))} Only</span>
          </div>
        </div>

        {/* Remarks Section - from BillDiscount record */}
        {discountRemark && (
          <div className="bg-yellow-50 border border-yellow-200 p-2 mb-2 rounded text-xs" style={{ pageBreakInside: 'avoid' }}>
            <div className="font-semibold text-gray-700 mb-1">Remarks / Notes :</div>
            <div className="text-gray-800">{discountRemark}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 mt-6" style={{ pageBreakInside: 'avoid' }}>
          <p>Thank you for choosing SHRADDHA PATHOLOGY LABORATORY</p>
        </div>
      </div>
    </>
  );
};

export default BillReceipt;
