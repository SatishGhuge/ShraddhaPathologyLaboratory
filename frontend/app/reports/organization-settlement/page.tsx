"use client";

import { useState, useEffect, useRef } from "react";
import { DollarSign, RotateCcw, Printer, Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PaginationControls from "@/app/components/PaginationControls";
import { getOrganizations } from "@/src/api/patient";

// Hide number input spinners (up/down arrows)
const numberInputStyle = `
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
  /* Additional Firefox support */
  input[type="number"]:hover,
  input[type="number"]:focus {
    -moz-appearance: textfield;
  }
`;

const toGB = (iso: any) => { if(!iso) return "-"; const d=new Date(iso); return d.toLocaleDateString("en-GB"); };
const fmtISO = (d: any) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const dispRange = (f: any, t: any) => { if(!f) return "Search by Date"; const a=toGB(f),b=t?toGB(t):a; return a===b?a:`${a} - ${b}`; };
const toNumber = (val: any) => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (val.toNumber) return val.toNumber(); // Decimal type
  return 0;
};

const PRESETS = [
  { label:"Today",        fn:()=>{ const d=today0(); return [fmtISO(d),fmtISO(d)]; } },
  { label:"Yesterday",    fn:()=>{ const d=addDays(today0(),-1); return [fmtISO(d),fmtISO(d)]; } },
  { label:"Last 7 Days",  fn:()=>[fmtISO(addDays(today0(),-6)),fmtISO(today0())] },
  { label:"Last 30 Days", fn:()=>[fmtISO(addDays(today0(),-29)),fmtISO(today0())] },
  { label:"This Month",   fn:()=>[fmtISO(som(today0())),fmtISO(eom(today0()))] },
  { label:"Last Month",   fn:()=>{ const d=new Date(today0().getFullYear(),today0().getMonth()-1,1); return [fmtISO(d),fmtISO(eom(d))]; } },
  { label:"This Year",    fn:()=>[fmtISO(new Date(today0().getFullYear(),0,1)),fmtISO(new Date(today0().getFullYear(),11,31))] },
  { label:"Last Year",    fn:()=>{ const y=today0().getFullYear()-1; return [fmtISO(new Date(y,0,1)),fmtISO(new Date(y,11,31))]; } },
  { label:"Custom Range", fn:null },
];
const MOS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Cal({ month, year, onPrev, onNext, onDay, onHover, from, to, hover, picking }: any) {
  const first = new Date(year,month,1).getDay();
  const total = new Date(year,month+1,0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({length:total},(_,i)=>i+1)];
  const cls = (d: any) => {
    if (!d) return "";
    const c = fmtISO(new Date(year,month,d));
    if (c===from||c===to) return "bg-blue-600 text-white font-bold rounded";
    const end = picking?(hover||to):to;
    const lo=from&&end?(from<end?from:end):null, hi=from&&end?(from<end?end:from):null;
    if (lo&&hi&&c>lo&&c<hi) return "bg-blue-100 text-blue-800 rounded";
    return "hover:bg-gray-100 text-gray-700 rounded";
  };
  return (
    <div className="w-52">
      <div className="flex items-center justify-between mb-2 px-1">
        {onPrev?<button type="button" onClick={onPrev} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={14}/></button>:<span className="w-6"/>}
        <span className="text-sm font-semibold">{MOS[month]} {year}</span>
        {onNext?<button type="button" onClick={onNext} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={14}/></button>:<span className="w-6"/>}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-0.5">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} className="text-xs text-gray-400 py-1 font-medium">{d}</div>)}
        {cells.map((d,i)=>(
          <div key={i} onClick={()=>d&&onDay(fmtISO(new Date(year,month,d)))}
            onMouseEnter={()=>d&&picking&&onHover(fmtISO(new Date(year,month,d)))}
            className={`text-xs py-1 cursor-pointer transition-colors text-center ${cls(d)}`}>{d||""}</div>
        ))}
      </div>
    </div>
  );
}

const AVAILABLE_COLS = [
  { id: "srNo", label: "Sr. No" },
  { id: "date", label: "Date" },
  { id: "visitId", label: "Visit ID" },
  { id: "patient", label: "Patient" },
  { id: "mobile", label: "Mobile" },
  { id: "organization", label: "Organization" },
  { id: "orgCode", label: "Org Code" },
  { id: "department", label: "Department" },
  { id: "test", label: "Test" },
  { id: "referralDr", label: "Referral Doctor" },
  { id: "grossAmount", label: "Gross Amount" },
  { id: "discount", label: "Discount" },
  { id: "netAmount", label: "Net Amount" },
  { id: "balance", label: "Balance" },
  { id: "status", label: "Status" },
];

const TH = ({children, right}: any) => (
  <th className={`px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 ${right?"text-right":"text-left"}`}>{children}</th>
);

const TD = ({children, right}: any) => (
  <td className={`px-2 py-1.5 text-xs border border-gray-200 whitespace-nowrap ${right?"text-right":"text-left"}`}>{children??"-"}</td>
);

// Settlement Modal Component
function SettlementModal({ show, record, onClose, onSave }: any) {
  const [applyOrgDiscount, setApplyOrgDiscount] = useState(true);
  const [orgDiscount, setOrgDiscount] = useState(0);
  const [tdsChecked, setTdsChecked] = useState(true);
  const [tdsPercent, setTdsPercent] = useState("10");
  const [otherDiscountPercent, setOtherDiscountPercent] = useState(0);
  const [otherDiscountAmount, setOtherDiscountAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(record?.finalAmount || 0);
  const [remark, setRemark] = useState("");

  // Update organization discount when record changes
  useEffect(() => {
    if (show && record?.organizationDiscount !== undefined && record?.organizationDiscount !== null) {
      setOrgDiscount(record.organizationDiscount);
    }
  }, [show, record?.organizationDiscount]);

  if (!show) return null;

  const grandTotal = record?.grossAmount || 0;
  const finalOrgDiscount = applyOrgDiscount ? orgDiscount : 0;
  const afterOrgDiscount = grandTotal - finalOrgDiscount;
  const tdsPercentValue = tdsChecked && tdsPercent ? parseFloat(tdsPercent) : 0;
  const tdsAmount = tdsChecked && tdsPercent ? (afterOrgDiscount * tdsPercentValue) / 100 : 0;
  const otherDiscount = otherDiscountPercent 
    ? (afterOrgDiscount * otherDiscountPercent) / 100 
    : otherDiscountAmount;
  const finalAmount = afterOrgDiscount - tdsAmount - otherDiscount;
  const balance = Math.max(0, finalAmount - amountPaid);

  const handleSave = () => {
    onSave({
      visitId: record.visitId,
      orgId: record.orgId,
      orgDiscount: applyOrgDiscount ? orgDiscount : 0,
      tdsChecked,
      tdsPercent: tdsPercentValue,
      otherDiscountPercent,
      otherDiscountAmount,
      amountPaid,
      remark
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <DollarSign size={20} /> Settlement - {record?.visitId}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <p><strong>Patient:</strong> {record?.patientName}</p>
            <p><strong>Gross Amount:</strong> ₹{grandTotal.toFixed(2)}</p>
            <p><strong>Current Balance:</strong> ₹{record?.balance.toFixed(2)}</p>
          </div>

          {/* Organization Discount with Checkbox */}
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={applyOrgDiscount} 
              onChange={e=>setApplyOrgDiscount(e.target.checked)} 
              className="w-4 h-4 rounded"
            />
            <label className="font-semibold text-gray-700 flex-1">Apply Organization Discount</label>
            <input 
              type="text" 
              inputMode="decimal"
              value={orgDiscount !== 0 ? orgDiscount : ""} 
              onChange={e=>{const val = e.target.value; setOrgDiscount(val === '' ? 0 : parseFloat(val) || 0);}} 
              disabled={!applyOrgDiscount}
              className="w-24 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 text-right"
              placeholder="0"
            />
            <span className="text-gray-600">₹</span>
          </div>
          {applyOrgDiscount && <p className="text-xs text-gray-500 ml-7">After Org Discount: ₹{afterOrgDiscount.toFixed(2)}</p>}

          {/* TDS Section */}
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={tdsChecked} 
              onChange={e=>setTdsChecked(e.target.checked)} 
              className="w-4 h-4 rounded"
            />
            <label className="font-semibold text-gray-700 flex-1">Apply TDS</label>
            <input 
              type="text" 
              inputMode="decimal"
              value={tdsPercent} 
              onChange={e=>{const val = e.target.value; setTdsPercent(val === '' ? '10' : val);}} 
              disabled={!tdsChecked}
              className="w-20 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 text-right"
              placeholder="10"
            />
            <span className="text-gray-600">%</span>
          </div>
          {tdsChecked && tdsPercent && <p className="text-xs text-gray-500 ml-7">TDS Amount: ₹{tdsAmount.toFixed(2)}</p>}

          {/* Other Discount */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Other Discount</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={otherDiscountPercent !== 0 ? otherDiscountPercent : ""} 
                  onChange={e=>{const val = e.target.value; setOtherDiscountPercent(val === '' ? 0 : parseFloat(val) || 0);}} 
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" 
                  placeholder="% (optional)"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">Percentage</p>
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={otherDiscountAmount !== 0 ? otherDiscountAmount : ""} 
                  onChange={e=>{const val = e.target.value; setOtherDiscountAmount(val === '' ? 0 : parseFloat(val) || 0);}} 
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" 
                  placeholder="₹ (optional)"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">Flat Amount</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Other Discount: ₹{otherDiscount.toFixed(2)}</p>
          </div>

          {/* Final Amount */}
          <div className="bg-blue-50 p-3 rounded">
            <p className="font-semibold text-blue-900">Final Amount: ₹{finalAmount.toFixed(2)}</p>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Amount Paid</label>
            <input 
              type="text" 
              inputMode="decimal"
              value={amountPaid !== 0 ? amountPaid : ""} 
              onChange={e=>{
                const val = e.target.value;
                // Allow decimal point and numbers only
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setAmountPaid(val === '' ? 0 : parseFloat(val) || 0);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 650.67"
            />
          </div>

          {/* Balance */}
          <div className="bg-green-50 p-3 rounded">
            <p className="font-semibold text-green-900">Balance: ₹{balance.toFixed(2)}</p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Remarks</label>
            <textarea 
              value={remark} 
              onChange={e=>setRemark(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" 
              rows={2}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            >
              Save Settlement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bulk Settlement Modal Component
function BulkSettlementModal({ show, recordCount, records, onClose, onSave }: any) {
  const [applyOrgDiscount, setApplyOrgDiscount] = useState(true);
  const [applyTds, setApplyTds] = useState(true);
  const [tdsPercent, setTdsPercent] = useState("10");
  const [otherDiscountPercent, setOtherDiscountPercent] = useState(0);
  const [otherDiscountAmount, setOtherDiscountAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [remark, setRemark] = useState("");

  // Filter out already-paid visits (balance = 0)
  const pendingRecords = records && records.length > 0 
    ? records.filter((r: any) => toNumber(r.balance) > 0.01)
    : [];
  
  const paidRecordCount = records ? records.length - pendingRecords.length : 0;

  // Calculate totals for display (only from pending records)
  const totalGrossAmount = pendingRecords.length > 0 ? pendingRecords.reduce((sum, r) => sum + toNumber(r.grossAmount), 0) : 0;
  
  // Get organization discounts from pending records only
  const orgDiscounts = new Map();
  if (pendingRecords.length > 0) {
    pendingRecords.forEach(r => {
      if (!orgDiscounts.has(r.organizationName)) {
        orgDiscounts.set(r.organizationName, {
          name: r.organizationName,
          discount: r.organizationDiscount || 0,
          code: r.orgCode
        });
      }
    });
  }

  // Calculate org discount on gross amount ONLY if checkbox is checked
  let totalOrgDiscount = 0;
  if (applyOrgDiscount) {
    orgDiscounts.forEach(org => {
      const orgGrossAmount = pendingRecords
        .filter(r => r.organizationName === org.name)
        .reduce((sum, r) => sum + toNumber(r.grossAmount), 0);
      totalOrgDiscount += (orgGrossAmount * org.discount) / 100;
    });
  }

  // Calculate TDS on GROSS amount ONLY if tdsPercent > 0
  const tdsPercentValue = applyTds ? parseFloat(tdsPercent || "10") : 0;
  const tdsAmount = tdsPercentValue > 0 ? (totalGrossAmount * tdsPercentValue) / 100 : 0;
  
  // Calculate other discount on GROSS amount
  const otherDiscount = otherDiscountPercent 
    ? (totalGrossAmount * otherDiscountPercent) / 100 
    : otherDiscountAmount;
  
  // Total deductions (all applied on gross amount)
  const totalDeductions = totalOrgDiscount + tdsAmount + otherDiscount;
  
  // Final amount after all deductions (what organization receives)
  const finalAmountDue = totalGrossAmount - totalDeductions;
  
  // Amount to pay: if deductions exist, pay finalAmountDue; otherwise pay totalGrossAmount
  const amountToPay = totalDeductions > 0 ? finalAmountDue : totalGrossAmount;
  
  // Calculate remaining balance based on amount to pay
  const remainingBalance = Math.max(0, amountToPay - amountPaid);

  if (!show) return null;

  const handleSave = () => {
    onSave({
      applyOrgDiscount,
      tdsPercent: applyTds ? parseFloat(tdsPercent || "10") : 0,
      otherDiscountPercent: parseFloat(String(otherDiscountPercent) || "0"),
      otherDiscountAmount: parseFloat(String(otherDiscountAmount) || "0"),
      amountPaid,
      remark
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <DollarSign size={20} /> Bulk Settlement
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Settling Info */}
          <div className="bg-blue-50 p-3 rounded">
            <p className="font-semibold text-blue-900">Settlement Summary</p>
            <p className="text-xs text-gray-600 mt-1">Total Selected: {recordCount} visits</p>
            {paidRecordCount > 0 && (
              <p className="text-xs text-orange-600 font-semibold mt-1">⚠️ {paidRecordCount} visit(s) already paid - will be skipped</p>
            )}
            {pendingRecords.length > 0 && (
              <p className="text-xs text-green-600 font-semibold mt-1">✓ {pendingRecords.length} pending visit(s) will be settled</p>
            )}
            {pendingRecords.length === 0 && (
              <p className="text-xs text-red-600 font-semibold mt-1">❌ No pending visits to settle!</p>
            )}
          </div>

          {/* Organization Discounts Section */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input 
                type="checkbox" 
                checked={applyOrgDiscount}
                onChange={e => setApplyOrgDiscount(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className="font-semibold text-gray-700 flex-1">Apply Organization Discounts</label>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-1 text-xs">
              {orgDiscounts.size > 0 ? (
                Array.from(orgDiscounts.values()).map(org => (
                  <div key={org.name} className="flex justify-between">
                    <span className="text-gray-700"><strong>{org.name}</strong> ({org.code})</span>
                    <span className={`font-semibold ${applyOrgDiscount ? 'text-blue-600' : 'text-gray-500'}`}>
                      {org.discount}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No organizations</p>
              )}
            </div>
            {applyOrgDiscount && totalOrgDiscount > 0 && (
              <p className="text-xs text-gray-600 mt-1">Total Org Discount: ₹{totalOrgDiscount.toFixed(2)}</p>
            )}
          </div>

          {/* TDS Section */}
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={applyTds}
              onChange={e => setApplyTds(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className="font-semibold text-gray-700 flex-1">Apply TDS</label>
            <input 
              type="text" 
              inputMode="decimal"
              value={applyTds ? tdsPercent : ""} 
              onChange={e=>{const val = e.target.value; setTdsPercent(val === '' ? '10' : val);}} 
              disabled={!applyTds}
              className="w-20 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 text-right"
              placeholder="10"
            />
            <span className="text-gray-600">%</span>
          </div>
          {applyTds && tdsAmount > 0 && (
            <p className="text-xs text-gray-600 ml-7">TDS Amount: ₹{tdsAmount.toFixed(2)}</p>
          )}

          {/* Total Gross Amount */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-xs text-gray-600">Total Gross Amount (All Visits): ₹{totalGrossAmount.toFixed(2)}</p>
            {applyOrgDiscount && totalOrgDiscount > 0 && (
              <p className="text-xs text-gray-600">Org Discount (-): ₹{totalOrgDiscount.toFixed(2)}</p>
            )}
            {tdsPercentValue > 0 && (
              <p className="text-xs text-gray-600">TDS (-): ₹{tdsAmount.toFixed(2)}</p>
            )}
            {otherDiscount > 0 && (
              <p className="text-xs text-gray-600">Other Discount (-): ₹{otherDiscount.toFixed(2)}</p>
            )}
            {totalDeductions > 0 && (
              <p className="text-xs text-gray-600">Total Deductions: ₹{totalDeductions.toFixed(2)}</p>
            )}
            <p className="font-semibold text-blue-900 mt-1">Amount Due (After Deductions): ₹{finalAmountDue.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1"><strong>Pay: ₹{amountToPay.toFixed(2)}</strong> {totalDeductions > 0 ? "(after deductions)" : "(gross amount)"} to clear all visits</p>
          </div>

          {/* Other Discount */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Other Discount</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={otherDiscountPercent !== 0 ? otherDiscountPercent : ""} 
                  onChange={e=>{const val = e.target.value; setOtherDiscountPercent(val === '' ? 0 : parseFloat(val) || 0);}} 
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" 
                  placeholder="% (optional)"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">Percentage</p>
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={otherDiscountAmount !== 0 ? otherDiscountAmount : ""} 
                  onChange={e=>{const val = e.target.value; setOtherDiscountAmount(val === '' ? 0 : parseFloat(val) || 0);}} 
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" 
                  placeholder="₹ (optional)"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">Flat Amount</p>
              </div>
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Total Amount Paid (₹)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                inputMode="decimal"
                value={amountPaid !== 0 ? amountPaid : ""} 
                onChange={e=>{
                  const val = e.target.value;
                  // Allow decimal point and numbers only
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmountPaid(val === '' ? 0 : parseFloat(val) || 0);
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter total payment received (e.g., 650.67)"
              />
              <button 
                type="button"
                onClick={()=>setAmountPaid(amountToPay)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold text-sm whitespace-nowrap"
              >
                Fill Amount
              </button>
            </div>
          </div>

          {/* Remaining Balance */}
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <p className="font-semibold text-green-900">Remaining Balance: ₹{remainingBalance.toFixed(2)}</p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Remarks</label>
            <textarea 
              value={remark} 
              onChange={e=>setRemark(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" 
              rows={2}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              Settle All Visits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrganizationSettlementReport() {
  // Date range state
  const [dateFrom, setDateFrom] = useState(fmtISO(today0()));
  const [dateTo, setDateTo]     = useState(fmtISO(today0()));
  const [dpOpen, setDpOpen]     = useState(false);
  const [preset, setPreset]     = useState("Today");
  const [custom, setCustom]     = useState(false);
  const [picking, setPicking]   = useState(false);
  const [hover, setHover]       = useState("");
  const [tFrom, setTFrom]       = useState(fmtISO(today0()));
  const [tTo, setTTo]           = useState(fmtISO(today0()));
  const now = new Date();
  const [cm, setCm] = useState(now.getMonth()===0?11:now.getMonth()-1);
  const [cy, setCy] = useState(now.getMonth()===0?now.getFullYear()-1:now.getFullYear());
  const rm = cm===11?0:cm+1, ry = cm===11?cy+1:cy;
  const dpRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [colOpen, setColOpen] = useState(false);
  const [colFilter, setColFilter] = useState("");
  const [selectedColumns, setSelectedColumns] = useState(["date", "visitId", "patient", "mobile", "organization", "orgCode", "department", "test", "grossAmount", "discount", "netAmount", "balance", "status"]);
  const [showSettlement, setShowSettlement] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showBulkSettlement, setShowBulkSettlement] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    const initializeReport = async () => {
      try {
        const orgs = await getOrganizations();
        if (Array.isArray(orgs)) {
          setOrganizations(orgs);
          if (orgs.length > 0) {
            setSelectedOrg(orgs[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading organizations:', error);
        setErrors({ api: 'Failed to load organizations' });
      }
    };
    
    initializeReport();
    
    const h = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (selectedOrg && dateFrom && dateTo) {
      fetchData();
    }
  }, [selectedOrg, dateFrom, dateTo, status, currentPage]);

  // Update pagination when itemsPerPage changes
  useEffect(() => {
    if (pagination && data.length > 0) {
      const newTotalPages = Math.ceil(data.length / itemsPerPage);
      setPagination({
        ...pagination,
        limit: itemsPerPage,
        totalPages: newTotalPages,
        page: 1
      });
      setCurrentPage(1);
    }
  }, [itemsPerPage]);

  // Date picker handlers
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => { if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) => { if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false);setCurrentPage(1); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  // Column helpers
  const toggleCol = (id: any) => setSelectedColumns(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const checkAll = () => setSelectedColumns(AVAILABLE_COLS.map(c=>c.id));
  const uncheckAll = () => setSelectedColumns([]);
  const visCols = AVAILABLE_COLS.filter(c => c.label.toLowerCase().includes(colFilter.toLowerCase()));
  const has = (id: any) => selectedColumns.includes(id);
  const sum = (key: any) => data.reduce((s, r) => s + toNumber(r[key]), 0);

  const fetchData = async () => {
    setLoading(true);
    setErrors({});
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams({
        orgId: selectedOrg,
        fromDate: dateFrom,
        toDate: dateTo,
        ...(status && { status }),
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });
      
      const response = await fetch(
        `${apiUrl}/organization-settlement/report?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const result = await response.json();
      
      if (result.data) {
        setData(Array.isArray(result.data) ? result.data : []);
        const paginationData = result.pagination || { pages: 1, page: currentPage };
        setPagination({
          page: paginationData.page || currentPage,
          limit: itemsPerPage,
          total: paginationData.total || 0,
          totalPages: paginationData.pages || 1,
          hasMore: paginationData.pages > 1
        });
      } else {
        setData([]);
        setErrors({ api: result.message || 'Failed to fetch data' });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setErrors({ api: error.message || 'Failed to fetch data from database' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSettlementClick = (record: any) => {
    // Ensure orgId is included in the record
    const recordWithOrgId = {
      ...record,
      orgId: selectedOrg
    };
    setSelectedRecord(recordWithOrgId);
    setShowSettlement(true);
  };

  const handleBulkSettlement = () => {
    if (data.length === 0) {
      alert('No records to settle');
      return;
    }
    setShowBulkSettlement(true);
  };

  const handleBulkSettlementSave = async (formData: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const visitIds = data.map((row: any) => row.visitId);
      
      const response = await fetch(`${apiUrl}/organization-settlement/settle-org-visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orgId: selectedOrg,
          visitIds,
          ...formData
        })
      });
      const result = await response.json();
      
      if (result.success) {
        setShowBulkSettlement(false);
        alert(`Settlement saved for ${result.data.visitCount} visits`);
        fetchData();
      } else {
        alert(result.message || 'Failed to save bulk settlement');
      }
    } catch (error) {
      console.error('Error saving bulk settlement:', error);
      alert('Failed to save bulk settlement');
    }
  };

  const handleSettlementSave = async (formData: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/organization-settlement/settle-visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      
      if (result.success) {
        setShowSettlement(false);
        fetchData();
      } else {
        alert(result.message || 'Failed to save settlement');
      }
    } catch (error) {
      console.error('Error saving settlement:', error);
      alert('Failed to save settlement');
    }
  };

  const handleReset = () => {
    const t = fmtISO(today0());
    setDateFrom(t);
    setDateTo(t);
    setPreset("Today");
    setCustom(false);
    setSelectedOrg(organizations.length > 0 ? organizations[0].id : "");
    setStatus("");
    setErrors({});
    setSelectedColumns(["date", "visitId", "patient", "mobile", "organization", "orgCode", "department", "test", "grossAmount", "discount", "netAmount", "balance", "status"]);
    setCurrentPage(1);
  };

  return (
    <>
      <Header />
      <style>{numberInputStyle}</style>
      <div className="p-2 sm:p-3 bg-white min-h-screen">
        
        {/* FILTERS */}
        <div className="bg-white p-2 sm:p-3 rounded shadow-md mb-3">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            {/* DATE RANGE PICKER */}
            <div className="relative" ref={dpRef}>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.date?"border-red-500":"border-gray-300"}`}>
                <span className={dateFrom?"text-gray-800":"text-gray-400"}>{dispRange(dateFrom,dateTo)}</span>
                <Calendar size={14} className="text-gray-400 ml-1 flex-shrink-0"/>
              </button>
              {errors.date && <p className="text-red-600 text-xs mt-0.5">{errors.date}</p>}

              {dpOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl flex" style={{minWidth:custom?"580px":"320px"}}>
                  <div className="w-36 border-r border-gray-100 py-1 flex-shrink-0">
                    {PRESETS.map(p=>(
                      <div key={p.label} onClick={()=>pickPreset(p)}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${preset===p.label?"bg-blue-600 text-white font-semibold":"text-gray-700 hover:bg-blue-50"}`}>
                        {p.label}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col flex-1">
                    {custom?(
                      <div className="p-4">
                        <div className="flex gap-8">
                          <Cal month={cm} year={cy} onPrev={prevM} onNext={null} onDay={clickDay} onHover={setHover} from={tFrom} to={tTo} hover={hover} picking={picking}/>
                          <Cal month={rm} year={ry} onPrev={null} onNext={nextM} onDay={clickDay} onHover={setHover} from={tFrom} to={tTo} hover={hover} picking={picking}/>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">{tFrom?`${toGB(tFrom)} - ${tTo?toGB(tTo):"..."}`:"Click start date"}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={cancelDate} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                            <button type="button" onClick={applyDate} disabled={!tFrom} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Apply</button>
                          </div>
                        </div>
                      </div>
                    ):preset?(
                      <div className="p-5 flex flex-col justify-between min-h-[120px]">
                        <div><p className="text-xs text-gray-400 mb-1">Selected range</p><p className="text-sm font-semibold text-gray-800">{dispRange(tFrom,tTo)}</p></div>
                        <div className="flex gap-2 mt-4">
                          <button type="button" onClick={cancelDate} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                          <button type="button" onClick={applyDate} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                        </div>
                      </div>
                    ):(
                      <div className="p-4 text-sm text-gray-400 flex items-center justify-center h-full">Select a preset or Custom Range</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <select value={selectedOrg} onChange={e=>{setSelectedOrg(e.target.value);setCurrentPage(1);}}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Select Organization</option>
              {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>

            <select value={status} onChange={e=>{setStatus(e.target.value);setCurrentPage(1);}}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PENDING">Pending</option>
            </select>

            <div className="relative" ref={colRef}>
              <button type="button" onClick={()=>setColOpen(o=>!o)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700">Columns: {selectedColumns.length}/{AVAILABLE_COLS.length}</span>
                <ChevronDown size={14} className={`transition-transform ${colOpen?"rotate-180":""}`}/>
              </button>
              {colOpen && (
                <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold">Required Columns</div>
                  <div className="p-2 border-b border-gray-200">
                    <input type="text" placeholder="Filter: Enter keywords" value={colFilter} onChange={e=>setColFilter(e.target.value)}
                      className="w-full p-1.5 text-xs border border-gray-300 rounded focus:outline-none"/>
                  </div>
                  <div className="p-2 border-b border-gray-200 flex justify-between bg-gray-50 text-xs">
                    <button onClick={checkAll} className="text-blue-600 font-semibold hover:underline">✓ Check all</button>
                    <button onClick={uncheckAll} className="text-blue-600 font-semibold hover:underline">✕ Uncheck all</button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {visCols.map(col=>(
                      <label key={col.id} className={`flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-xs text-gray-700 ${has(col.id)?"bg-gray-50":""}`}>
                        <input type="checkbox" checked={has(col.id)} onChange={()=>toggleCol(col.id)} className="w-4 h-4 accent-blue-600"/>
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <RotateCcw size={14}/> Reset
            </button>
            <button onClick={()=>window.print()}
              className="flex gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Printer size={14}/> Print
            </button>
            <button onClick={handleBulkSettlement} disabled={data.length === 0}
              className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <DollarSign size={14}/> Settle All
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  {has("srNo") && <TH>Sr.No</TH>}
                  {has("date") && <TH>Date</TH>}
                  {has("visitId") && <TH>Visit ID</TH>}
                  {has("patient") && <TH>Patient</TH>}
                  {has("mobile") && <TH>Mobile</TH>}
                  {has("organization") && <TH>Organization</TH>}
                  {has("orgCode") && <TH>Org Code</TH>}
                  {has("department") && <TH>Department</TH>}
                  {has("test") && <TH>Test</TH>}
                  {has("referralDr") && <TH>Referral Dr.</TH>}
                  {has("grossAmount") && <TH right>Gross Amount</TH>}
                  {has("discount") && <TH right>Discount</TH>}
                  {has("netAmount") && <TH right>Net Amount</TH>}
                  {has("balance") && <TH right>Balance</TH>}
                  {has("status") && <TH>Status</TH>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} className="text-center p-4 text-gray-500">⏳ Loading data from database...</td></tr>
                ) : errors.api ? (
                  <tr><td colSpan={15} className="text-center p-4 text-red-600">
                    <div className="font-semibold">❌ Error: {errors.api}</div>
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={15} className="text-center p-4 text-gray-500">
                    {selectedOrg ? "📭 No records found for the selected filters" : "👆 Select an organization to load data"}
                  </td></tr>
                ) : (
                  <>
                    {data.map((row, i) => (
                      <tr key={i} className={i%2===0?"bg-white hover:bg-gray-50":"bg-gray-50 hover:bg-gray-100"} onClick={() => handleSettlementClick(row)}>
                        {has("srNo") && <TD>{i+1}</TD>}
                        {has("date") && <TD>{row.visitDate ? new Date(row.visitDate).toLocaleDateString('en-GB') : '-'}</TD>}
                        {has("visitId") && <TD>{row.visitId}</TD>}
                        {has("patient") && <TD>{row.patientName}</TD>}
                        {has("mobile") && <TD>{row.patientMobile}</TD>}
                        {has("organization") && <TD>{row.organizationName || '-'}</TD>}
                        {has("orgCode") && <TD>{row.orgCode || '-'}</TD>}
                        {has("department") && <TD>{row.department || '-'}</TD>}
                        {has("test") && <TD>{row.test || '-'}</TD>}
                        {has("referralDr") && <TD>{row.referralDoctor || '-'}</TD>}
                        {has("grossAmount") && <TD right>₹{toNumber(row.grossAmount).toFixed(2)}</TD>}
                        {has("discount") && <TD right>{toNumber(row.discount) > 0 ? `₹${toNumber(row.discount).toFixed(2)}` : '-'}</TD>}
                        {has("netAmount") && <TD right>₹{toNumber(row.netAmount).toFixed(2)}</TD>}
                        {has("balance") && <TD right>₹{toNumber(row.balance).toFixed(2)}</TD>}
                        {has("status") && <TD>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            row.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                            row.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {row.status || 'PENDING'}
                          </span>
                        </TD>}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-semibold">
                  <tr>
                    {has("srNo") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("date") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("visitId") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("patient") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300 font-semibold">TOTAL</td>}
                    {has("mobile") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("organization") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("orgCode") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("department") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("test") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("referralDr") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("grossAmount") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">₹{sum("grossAmount").toFixed(2)}</td>}
                    {has("discount") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">₹{sum("discount").toFixed(2)}</td>}
                    {has("netAmount") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">₹{sum("netAmount").toFixed(2)}</td>}
                    {has("balance") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">₹{sum("balance").toFixed(2)}</td>}
                    {has("status") && <td className="px-2 py-1.5 border border-gray-300"/>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        {pagination && pagination.totalPages > 1 && (
          <PaginationControls
            pagination={pagination}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
            isLoading={loading}
          />
        )}
      </div>

      <SettlementModal 
        show={showSettlement}
        record={selectedRecord}
        onClose={() => setShowSettlement(false)}
        onSave={handleSettlementSave}
      />

      <BulkSettlementModal 
        show={showBulkSettlement}
        recordCount={data.length}
        records={data}
        onClose={() => setShowBulkSettlement(false)}
        onSave={handleBulkSettlementSave}
      />
    </>
  );
}
