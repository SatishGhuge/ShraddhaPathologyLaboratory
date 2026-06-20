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

  return (
    <div className="overflow-y-auto flex-1 p-8 bg-white" id="bill-print-area" style={{ fontFamily: 'Arial, sans-serif' }}>
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
      <div className="flex justify-between items-start text-xs mb-4">
        <div>
          <div className="flex mb-1">
            <span className="w-32 font-semibold">Accession No. :</span>
            <span>{booking.visitId || booking.bookingId}</span>
          </div>
          <div className="flex mb-1">
            <span className="w-32 font-semibold">Payment Mode :</span>
            <span>{billing.paymentMode || 'CASH'}</span>
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
      <table className="w-full text-xs mb-4" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
            <th className="text-left py-2 px-1" style={{ width: '5%' }}>Sr.</th>
            <th className="text-left py-2 px-1" style={{ width: '55%' }}>Test Name</th>
            <th className="text-left py-2 px-1" style={{ width: '20%' }}>Test Price</th>
          </tr>
        </thead>
        <tbody>
          {booking.tests.map((t: any, i: number) => {
            const charge = businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
                <td className="text-left py-1.5 px-1">{i + 1}</td>
                <td className="text-left py-1.5 px-1">{t.name}</td>
                <td className="text-left py-1.5 px-1">{Math.round(charge).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="border-t-2 border-b-2 border-gray-800 py-2 mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span>Payable Amount (in words) :</span>
          <span className="font-semibold">{numberToWords(Math.round(billNetAmount))} Only</span>
        </div>
        <div className="flex justify-between text-xs">
          <span></span>
          <span className="font-bold">Total : {Math.round(billTotal).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span></span>
          <span className="font-bold">Payable Amount : {Math.round(billNetAmount).toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 mt-6">
        <p>Thank you for choosing SHRADDHA PATHOLOGY LABORATORY</p>
      </div>
    </div>
  );
};

export default BillReceipt;
