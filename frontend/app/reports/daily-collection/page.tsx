"use client";

import { useState, useEffect, useRef } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, DollarSign, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getAllPatients, getCollectionCenters } from "@/src/api/patient.js";

/* ── Date helpers ── */
const fmtISO = (d: any) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const toGB = (iso: any) => { if(!iso) return "-"; const d=new Date(iso); return d.toLocaleDateString("en-GB"); };
const dispRange = (f: any, t: any) => { if(!f) return "Search by Date"; const a=toGB(f),b=t?toGB(t):a; return a===b?a:`${a} - ${b}`; };

const PRESETS = [
  { label:"Today",        fn:()=>{ const d=today0(); return [fmtISO(d),fmtISO(d)]; } },
  { label:"Yesterday",    fn:()=>{ const d=addDays(today0(),-1); return [fmtISO(d),fmtISO(d)]; } },
  { label:"Last 7 Days",  fn:()=>[fmtISO(addDays(today0(),-6)),fmtISO(today0())] },
  { label:"Last 30 Days", fn:()=>[fmtISO(addDays(today0(),-29)),fmtISO(today0())] },
  { label:"This Month",   fn:()=>[fmtISO(som(today0())),fmtISO(eom(today0()))] },
  { label:"Last Month",   fn:()=>{ const d=new Date(today0().getFullYear(),today0().getMonth()-1,1); return [fmtISO(d),fmtISO(eom(d))]; } },
  { label:"Custom Range", fn:null },
];
const MOS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Cal({ month, year, onPrev, onNext, onDay, onHover, from, to, hover, picking }: { month: number; year: number; onPrev?: () => void; onNext?: () => void; onDay?: (date: string) => void; onHover?: (date: string | null) => void; from?: string; to?: string; hover?: string | null; picking?: boolean }) {
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

const toLocalYMD = (iso: any) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const toLocalDT = (iso: any) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const TH = ({children, right}: any) => (
  <th className={`px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 ${right?"text-right":"text-left"}`}>{children}</th>
);
const TD = ({children, right}: any) => (
  <td className={`px-2 py-1.5 text-xs border border-gray-200 whitespace-nowrap ${right?"text-right":"text-left"}`}>{children??"-"}</td>
);

export default function DailyCollection() {
  // Date range picker state
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
  const dpRef = useRef(null);
  const [fromTime, setFromTime]   = useState("");
  const [toTime, setToTime]       = useState("");
  const [center, setCenter]       = useState("");
  const [refDoctor, setRefDoctor] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [corporate, setCorporate] = useState("");
  const [errors, setErrors]       = useState<any>({});
  const [data, setData]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [centers, setCenters]     = useState<any[]>([]);
  // Required columns dropdown (optional extra columns — all shown by default in table)
  const availableColumns = [
    { id: "paymentDate", label: "Payment Date" }, { id: "billNo", label: "Bill No" },
    { id: "center", label: "Center" }, { id: "corporate", label: "Corporate" },
    { id: "cashCollectedBy", label: "Cash Collected By" }, { id: "lrNumber", label: "LR Number" },
    { id: "referralDr", label: "Referral Dr." }, { id: "remark", label: "Remark" },
    { id: "cash", label: "Cash" }, { id: "card", label: "Card" }, { id: "upi", label: "UPI" },
    { id: "cheque", label: "Cheque" }, { id: "netBanking", label: "Net Banking" },
    { id: "transactionId", label: "Transaction ID" }, { id: "discount", label: "Discount" },
    { id: "refund", label: "Refund" }, { id: "refundRemark", label: "Refund Remark" },
    { id: "total", label: "Total" }, { id: "balance", label: "Balance" },
  ];
  const [colDropOpen, setColDropOpen] = useState(false);
  const [colFilter, setColFilter]     = useState("");
  const [selectedColumns, setSelectedColumns] = useState(availableColumns.map(c=>c.id));
  const colRef = useRef(null);

  useEffect(() => {
    getCollectionCenters().then((res: any) => setCenters(Array.isArray(res) ? res : res?.data || [])).catch(() => {});
    fetchData(fmtISO(today0()), fmtISO(today0()), "", "", "", "", "", "");
    const h = (e: any) => {
      if (colRef.current && !colRef.current.contains(e.target)) setColDropOpen(false);
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Date picker handlers
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => { if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) => { if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const buildRows = (patients, selFrom, selTo, fTime, tTime, selCenter, selRef, selName, selCorp) => {
    const rows = [];
    let srNo = 1;
    for (const p of patients) {
      const visitMap = new Map();
      for (const t of p.tests || []) {
        const d = toLocalYMD(t.visitDate || t.createdAt || p.createdAt);
        if (selFrom && d && (d < selFrom || d > (selTo||selFrom))) continue;
        if (selCenter && (p.createdAtLocation || "") !== selCenter) continue;
        if (selCorp && !(t.businessType || "").toLowerCase().includes(selCorp.toLowerCase())) continue;
        if (selRef && !(t.referralDoctor || "").toLowerCase().includes(selRef.toLowerCase())) continue;
        const patName = [p.title, p.firstName, p.lastName].filter(Boolean).join(" ");
        if (selName && !patName.toLowerCase().includes(selName.toLowerCase()) && !(p.mobile||"").includes(selName)) continue;

        if (!visitMap.has(t.visitId)) {
          const dt = new Date(t.visitDate || t.createdAt || p.createdAt);
          const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
          if (fTime && timeStr < fTime) continue;
          if (tTime && timeStr > tTime) continue;

          visitMap.set(t.visitId, {
            srNo: srNo++,
            regDate: toLocalDT(t.visitDate || p.createdAt),
            paymentDate: toLocalDT(t.visitDate || p.createdAt),
            billNo: t.visitId || "-",
            center: p.createdAtLocation || "-",
            corporate: t.businessType || "-",
            cashCollectedBy: t.visitType || "-",
            lrNumber: t.visitId || "-",
            patient: patName,
            remark: t.remarks || "",
            referralDr: t.referralDoctor || "",
            cash: 0, card: 0, upi: 0, cheque: 0, netBanking: 0,
            transactionId: "",
            discount: 0, refund: 0, refundRemark: "",
            netAmount: 0, total: 0, balance: 0,
            paymentMode: t.paymentMode || "",
          });
        }
        const v = visitMap.get(t.visitId);
        if (!v) continue;
        const mode = (t.paymentMode || "").toLowerCase();
        const paid = t.paidAmount || 0;
        if (mode === "cash") v.cash += paid;
        else if (mode === "card") v.card += paid;
        else if (mode === "upi") v.upi += paid;
        else if (mode === "cheque") v.cheque += paid;
        else if (mode === "net banking") v.netBanking += paid;
        else v.cash += paid;
        v.discount += t.discountAmount || 0;
        v.balance += t.balanceAmount || 0;
        v.total += t.totalAmount || 0;
        v.netAmount += paid;
      }
      for (const v of visitMap.values()) rows.push(v);
    }
    return rows;
  };

  const fetchData = async (selFrom, selTo, fTime, tTime, selCenter, selRef, selName, selCorp) => {
    setLoading(true);
    try {
      const res = await getAllPatients();
      const patients = res.data || res || [];
      const rows = buildRows(patients, selFrom, selTo, fTime, tTime, selCenter, selRef, selName, selCorp);
      setData(rows);
      setSearched(true);
    } catch (err) {
      setErrors({ api: err.message || "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setErrors({});
    fetchData(dateFrom, dateTo, fromTime, toTime, center, refDoctor, nameSearch, corporate);
  };

  const handleReset = () => {
    const t = fmtISO(today0());
    setDateFrom(t); setDateTo(t); setPreset("Today"); setCustom(false);
    setFromTime(""); setToTime(""); setCenter(""); setRefDoctor(""); setNameSearch(""); setCorporate(""); setErrors({});
    setSelectedColumns(availableColumns.map(c=>c.id));
    fetchData(t, t, "", "", "", "", "", "");
  };

  const sum = (key: any) => data.reduce((s, r) => s + (r[key] || 0), 0);

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 bg-white min-h-screen">
        <PageHeader title="Daily Collection" icon={DollarSign} path="Reports / MIS Reports" />

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
            <div className="relative">
              <input type="time" value={fromTime} onChange={e=>setFromTime(e.target.value)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              {!fromTime && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">From Time: HH:MM</span>}
            </div>
            <div className="relative">
              <input type="time" value={toTime} onChange={e=>setToTime(e.target.value)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
              {!toTime && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">To Time: HH:MM</span>}
            </div>
            <select value={center} onChange={e=>setCenter(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Select Center</option>
              {centers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input placeholder="Name/Username" value={nameSearch} onChange={e=>setNameSearch(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            <input placeholder="Referral Doctor" value={refDoctor} onChange={e=>setRefDoctor(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            {/* Required Columns Dropdown */}
            <div className="relative" ref={colRef}>
              <button type="button" onClick={()=>setColDropOpen(o=>!o)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700">Required Columns ({selectedColumns.length})</span>
                <ChevronDown size={14} className={`transition-transform ${colDropOpen?"rotate-180":""}`}/>
              </button>
              {colDropOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold rounded-t">Required Columns</div>
                  <div className="p-2 border-b border-gray-200">
                    <input type="text" placeholder="Filter: Enter keywords" value={colFilter} onChange={e=>setColFilter(e.target.value)}
                      className="w-full p-1.5 text-xs border border-gray-300 rounded focus:outline-none"/>
                  </div>
                  <div className="p-2 border-b border-gray-200 flex justify-between bg-gray-50 text-xs">
                    <button onClick={()=>setSelectedColumns(availableColumns.map(c=>c.id))} className="text-blue-600 font-semibold hover:underline">✓ Check all</button>
                    <button onClick={()=>setSelectedColumns([])} className="text-blue-600 font-semibold hover:underline">✕ Uncheck all</button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {availableColumns.filter(c=>c.label.toLowerCase().includes(colFilter.toLowerCase())).map(col=>(
                      <label key={col.id} className={`flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-xs text-gray-700 ${selectedColumns.includes(col.id)?"bg-gray-50":""}`}>
                        <input type="checkbox" checked={selectedColumns.includes(col.id)}
                          onChange={()=>setSelectedColumns(prev=>prev.includes(col.id)?prev.filter(id=>id!==col.id):[...prev,col.id])}
                          className="w-4 h-4 accent-blue-600"/>
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input placeholder="Corporate" value={corporate} onChange={e=>setCorporate(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={handleSearch} disabled={loading}
              className="flex gap-1.5 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Search size={14}/> {loading?"Searching...":"Search"}
            </button>
            <button onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <RotateCcw size={14}/> Reset
            </button>
            <button onClick={()=>window.print()}
              className="flex gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Printer size={14}/> Print
            </button>
            <button className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <FileSpreadsheet size={14}/> Excel
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <TH>Sr.No</TH>
                  <TH>Reg. Date</TH>
                  {selectedColumns.includes("paymentDate") && <TH>Payment Date</TH>}
                  {selectedColumns.includes("billNo") && <TH>Bill No.</TH>}
                  {selectedColumns.includes("center") && <TH>Center</TH>}
                  {selectedColumns.includes("corporate") && <TH>Corporate</TH>}
                  {selectedColumns.includes("cashCollectedBy") && <TH>Cash Collected By</TH>}
                  {selectedColumns.includes("lrNumber") && <TH>Visit ID</TH>}
                  <TH>Patient</TH>
                  {selectedColumns.includes("remark") && <TH>Remark</TH>}
                  {selectedColumns.includes("referralDr") && <TH>Referral Dr.</TH>}
                  {selectedColumns.includes("cash") && <TH right>Cash</TH>}
                  {selectedColumns.includes("card") && <TH right>Card</TH>}
                  {selectedColumns.includes("upi") && <TH right>UPI</TH>}
                  {selectedColumns.includes("cheque") && <TH right>Cheque</TH>}
                  {selectedColumns.includes("netBanking") && <TH right>Net Banking</TH>}
                  {selectedColumns.includes("transactionId") && <TH>Transaction ID</TH>}
                  {selectedColumns.includes("discount") && <TH right>Discount</TH>}
                  {selectedColumns.includes("refund") && <TH right>Refund</TH>}
                  {selectedColumns.includes("refundRemark") && <TH>Refund Remark</TH>}
                  <TH right>Net Amount</TH>
                  {selectedColumns.includes("total") && <TH right>Total</TH>}
                  {selectedColumns.includes("balance") && <TH right>Balance</TH>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={23} className="text-center p-4 text-gray-500">Loading...</td></tr>
                ) : errors.api ? (
                  <tr><td colSpan={23} className="text-center p-4 text-red-500">{errors.api}</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={23} className="text-center p-4 text-gray-500">{searched?"No records found.":"Select date and click Search."}</td></tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className={i%2===0?"bg-white hover:bg-gray-50":"bg-gray-50 hover:bg-gray-100"}>
                      <TD>{row.srNo}</TD>
                      <TD>{row.regDate}</TD>
                      {selectedColumns.includes("paymentDate") && <TD>{row.paymentDate}</TD>}
                      {selectedColumns.includes("billNo") && <TD>{row.billNo}</TD>}
                      {selectedColumns.includes("center") && <TD>{row.center}</TD>}
                      {selectedColumns.includes("corporate") && <TD>{row.corporate}</TD>}
                      {selectedColumns.includes("cashCollectedBy") && <TD>{row.cashCollectedBy}</TD>}
                      {selectedColumns.includes("lrNumber") && <TD>{row.lrNumber}</TD>}
                      <TD>{row.patient}</TD>
                      {selectedColumns.includes("remark") && <TD>{row.remark}</TD>}
                      {selectedColumns.includes("referralDr") && <TD>{row.referralDr}</TD>}
                      {selectedColumns.includes("cash") && <TD right>{row.cash||0}</TD>}
                      {selectedColumns.includes("card") && <TD right>{row.card||0}</TD>}
                      {selectedColumns.includes("upi") && <TD right>{row.upi||0}</TD>}
                      {selectedColumns.includes("cheque") && <TD right>{row.cheque||0}</TD>}
                      {selectedColumns.includes("netBanking") && <TD right>{row.netBanking||0}</TD>}
                      {selectedColumns.includes("transactionId") && <TD>{row.transactionId}</TD>}
                      {selectedColumns.includes("discount") && <TD right>{row.discount||0}</TD>}
                      {selectedColumns.includes("refund") && <TD right>{row.refund||0}</TD>}
                      {selectedColumns.includes("refundRemark") && <TD>{row.refundRemark}</TD>}
                      <TD right>{row.netAmount?.toFixed(2)}</TD>
                      {selectedColumns.includes("total") && <TD right>{row.total?.toFixed(2)}</TD>}
                      {selectedColumns.includes("balance") && <TD right>{row.balance?.toFixed(2)}</TD>}
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-semibold">
                  <tr>
                    {/* Fixed: Sr.No + Reg.Date + Patient = 3, plus optional non-numeric cols before cash */}
                    <td colSpan={3 + ["paymentDate","billNo","center","corporate","cashCollectedBy","lrNumber"].filter(c=>selectedColumns.includes(c)).length}
                      className="px-2 py-1.5 text-right text-xs border border-gray-300">Total</td>
                    {selectedColumns.includes("remark") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {selectedColumns.includes("referralDr") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {selectedColumns.includes("cash") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("cash")}</td>}
                    {selectedColumns.includes("card") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("card")}</td>}
                    {selectedColumns.includes("upi") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("upi")}</td>}
                    {selectedColumns.includes("cheque") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("cheque")}</td>}
                    {selectedColumns.includes("netBanking") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("netBanking")}</td>}
                    {selectedColumns.includes("transactionId") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {selectedColumns.includes("discount") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("discount")}</td>}
                    {selectedColumns.includes("refund") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("refund")}</td>}
                    {selectedColumns.includes("refundRemark") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("netAmount").toFixed(2)}</td>
                    {selectedColumns.includes("total") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("total").toFixed(2)}</td>}
                    {selectedColumns.includes("balance") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("balance").toFixed(2)}</td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {data.length > 0 && (
            <div className="px-3 py-1.5 border-t border-gray-200 text-xs text-gray-500">{data.length} record(s)</div>
          )}
        </div>
      </div>
    </>
  );
}
