"use client";

import { useState, useEffect, useRef } from "react";
import { RotateCcw, Printer, FileSpreadsheet, DollarSign, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getAllPatients, getOrganizations } from "@/src/api/patient";

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

const TH = ({children, right}: any) => (
  <th className={`px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 ${right?"text-right":"text-left"}`}>{children}</th>
);

const TD = ({children, right}: any) => (
  <td className={`px-2 py-1.5 text-xs border border-gray-200 whitespace-nowrap ${right?"text-right":"text-left"}`}>{children??"-"}</td>
);

// Determine report type based on date range
const getReportType = (from: string, to: string) => {
  if (from === to) return "daily";
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  const isSameMonth = fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear();
  const isSameYear = fromDate.getFullYear() === toDate.getFullYear();
  const isFullYear = isSameYear && fromDate.getMonth() === 0 && toDate.getMonth() === 11 && fromDate.getDate() === 1 && toDate.getDate() === 31;
  
  if (isFullYear) return "annual";
  if (isSameMonth && fromDate.getDate() === 1 && toDate.getDate() === new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0).getDate()) return "monthly";
  return "custom";
};

// Available columns for selection
const AVAILABLE_COLS = [
  { id: "srNo", label: "Sr. No" },
  { id: "date", label: "Date" },
  { id: "billNo", label: "Bill No." },
  { id: "center", label: "Center" },
  { id: "patient", label: "Patient" },
  { id: "mobile", label: "Mobile" },
  { id: "referralDr", label: "Referral Doctor" },
  { id: "corporate", label: "Corporate" },
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
  { id: "cheque", label: "Cheque" },
  { id: "netBanking", label: "Net Banking" },
  { id: "discount", label: "Discount" },
  { id: "netAmount", label: "Net Amount" },
  { id: "total", label: "Total Bill" },
  { id: "balance", label: "Balance" },
  { id: "remark", label: "Remark" },
];

export default function CollectionReport() {
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
  const dpRef = useRef(null);
  const colRef = useRef(null);

  // Filter state
  const [organization, setOrganization] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  
  // Data & UI state
  const [errors, setErrors]       = useState<any>({});
  const [data, setData]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [colOpen, setColOpen]     = useState(false);
  const [colFilter, setColFilter] = useState("");
  const [selectedColumns, setSelectedColumns] = useState(["date", "billNo", "patient", "mobile", "cash", "card", "upi", "discount", "netAmount", "total", "balance"]);

  // Pagination state
  const ITEMS_PER_PAGE = 40;
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const reportType = getReportType(dateFrom, dateTo);
  const reportTitle = reportType === "daily" ? "Daily Collection" : reportType === "monthly" ? "Monthly Collection" : reportType === "annual" ? "Annual Collection" : "Collection Report";

  useEffect(() => {
    const initializeReport = async () => {
      try {
        console.log('🚀 Initializing Collection Report...');
        const orgs = await getOrganizations();
        if (Array.isArray(orgs)) {
          setOrganizations(orgs);
        }
        console.log('✅ Organizations loaded');
        
        // Fetch initial data
        await fetchData(fmtISO(today0()), fmtISO(today0()), "", "");
      } catch (err) {
        console.error('Error initializing report:', err);
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

  // Auto-fetch when filters change
  useEffect(() => {
    if (searched) {
      fetchData(dateFrom, dateTo, organization, nameSearch);
    }
  }, [dateFrom, dateTo, organization, nameSearch]);
  // Date picker handlers
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => { if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) => { if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  // Column helpers
  const toggleCol = (id: any) => setSelectedColumns(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const checkAll = () => setSelectedColumns(AVAILABLE_COLS.map(c=>c.id));
  const uncheckAll = () => setSelectedColumns([]);
  const visCols = AVAILABLE_COLS.filter(c => c.label.toLowerCase().includes(colFilter.toLowerCase()));
  const has = (id: any) => selectedColumns.includes(id);
  const sum = (key: any) => data.reduce((s, r) => s + (r[key] || 0), 0);

  // Pagination helpers
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    const maxPage = pagination?.totalPages || 1;
    if (page >= 1 && page <= maxPage) {
      setCurrentPage(page);
    }
  };

  const buildRows = (patients: any, selFrom: any, selTo: any, selOrg: any, selName: any) => {
    const rows = [];
    let srNo = 1;
    
    console.log('📊 Building rows from patients:', patients.length);
    console.log('Filters - From:', selFrom, 'To:', selTo, 'Org:', selOrg, 'Name:', selName);
    
    for (const p of patients) {
      if (!p || !p.tests) continue;
      
      const visitMap = new Map();
      for (const t of p.tests || []) {
        try {
          const d = toLocalYMD(t.visitDate || t.createdAt || p.createdAt);
          if (selFrom && d && (d < selFrom || d > (selTo||selFrom))) continue;
          if (selOrg && t.organization?.id !== selOrg) continue;
          
          const patName = [p.title, p.firstName, p.lastName].filter(Boolean).join(" ");
          if (selName && !patName.toLowerCase().includes(selName.toLowerCase()) && !(p.mobile||"").includes(selName)) continue;

          if (!visitMap.has(t.visitId)) {
            visitMap.set(t.visitId, {
              srNo: srNo++,
              date: toLocalDT(t.visitDate || t.createdAt || p.createdAt),
              billNo: t.visitId || "-",
              center: p.createdAtLocation || "-",
              corporate: t.businessType || "-",
              patient: patName,
              mobile: p.mobile || "-",
              remark: t.remarks || "",
              referralDr: t.referralDoctor || "-",
              cash: 0, card: 0, upi: 0, cheque: 0, netBanking: 0,
              discount: 0, refund: 0,
              netAmount: 0, total: 0, balance: 0,
              paymentMode: t.paymentMode || "",
            });
          }
          
          const v = visitMap.get(t.visitId);
          if (!v) continue;
          
          const mode = (t.paymentMode || "").toLowerCase();
          const paid = parseFloat(t.paidAmount) || 0;
          
          if (mode === "cash") v.cash += paid;
          else if (mode === "debit card" || mode === "card") v.card += paid;
          else if (mode === "credit card") v.card += paid;
          else if (mode === "upi") v.upi += paid;
          else if (mode === "cheque") v.cheque += paid;
          else if (mode === "net banking") v.netBanking += paid;
          else v.cash += paid;
          
          v.discount += parseFloat(t.discountAmount) || 0;
          v.balance += parseFloat(t.balanceAmount) || 0;
          v.total += parseFloat(t.totalAmount) || 0;
          v.netAmount += paid;
        } catch (err) {
          console.error('Error processing test:', err);
        }
      }
      
      for (const v of visitMap.values()) {
        rows.push(v);
      }
    }
    
    console.log('✅ Built rows:', rows.length);
    return rows;
  };

  const fetchData = async (selFrom: any, selTo: any, selOrg: any, selName: any) => {
    setLoading(true);
    setErrors({});
    setCurrentPage(1);
    try {
      console.log('🔄 Fetching patient data...');
      const res = await getAllPatients();
      
      if (!res) {
        throw new Error('No response from API');
      }
      
      const patients = res.data || res || [];
      
      if (!Array.isArray(patients)) {
        throw new Error('Invalid patients data format');
      }
      
      console.log('📦 Received patients:', patients.length);
      
      const rows = buildRows(patients, selFrom, selTo, selOrg, selName);
      setData(rows);
      setSearched(true);
      
      // Set pagination metadata
      const total = rows.length;
      const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
      setPagination({
        page: 1,
        limit: ITEMS_PER_PAGE,
        total: total,
        totalPages: totalPages,
        hasMore: totalPages > 1
      });
      
      if (rows.length === 0) {
        console.warn('⚠️ No rows found after filtering');
      }
    } catch (err: any) {
      console.error('❌ Error fetching data:', err);
      setErrors({ api: err.message || "Failed to fetch data from database" });
      setData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setErrors({});
    fetchData(dateFrom, dateTo, organization, nameSearch);
  };

  const handleReset = () => {
    const t = fmtISO(today0());
    setDateFrom(t); setDateTo(t); setPreset("Today"); setCustom(false);
    setOrganization(""); setNameSearch(""); setErrors({});
    setSelectedColumns(["date", "billNo", "patient", "mobile", "cash", "card", "upi", "discount", "netAmount", "total", "balance"]);
    fetchData(t, t, "", "");
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 bg-white min-h-screen">
        <PageHeader title={reportTitle} icon={DollarSign} path="Reports / Collection Reports" />

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
            <select value={organization} onChange={e=>setOrganization(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Select Organization</option>
              {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input placeholder="Patient Name / Mobile" value={nameSearch} onChange={e=>setNameSearch(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
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
                  {has("billNo") && <TH>Bill No.</TH>}
                  {has("center") && <TH>Center</TH>}
                  {has("patient") && <TH>Patient</TH>}
                  {has("mobile") && <TH>Mobile</TH>}
                  {has("referralDr") && <TH>Referral Dr.</TH>}
                  {has("corporate") && <TH>Corporate</TH>}
                  {has("cash") && <TH right>Cash</TH>}
                  {has("card") && <TH right>Card</TH>}
                  {has("upi") && <TH right>UPI</TH>}
                  {has("cheque") && <TH right>Cheque</TH>}
                  {has("netBanking") && <TH right>Net Banking</TH>}
                  {has("discount") && <TH right>Discount</TH>}
                  {has("netAmount") && <TH right>Net Amount</TH>}
                  {has("total") && <TH right>Total Bill</TH>}
                  {has("balance") && <TH right>Balance</TH>}
                  {has("remark") && <TH>Remark</TH>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={selectedColumns.length} className="text-center p-4 text-gray-500">⏳ Loading data from database...</td></tr>
                ) : errors.api ? (
                  <tr><td colSpan={selectedColumns.length} className="text-center p-4 text-red-600">
                    <div className="font-semibold">❌ Error: {errors.api}</div>
                    <div className="text-xs mt-1">Please check the browser console for more details</div>
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={selectedColumns.length} className="text-center p-4 text-gray-500">
                    {searched ? "📭 No records found for the selected date range" : "👆 Select date and click Search to load data"}
                  </td></tr>
                ) : (
                  getPaginatedData().map((row, i) => (
                    <tr key={i} className={i%2===0?"bg-white hover:bg-gray-50":"bg-gray-50 hover:bg-gray-100"}>
                      {has("srNo") && <TD>{row.srNo}</TD>}
                      {has("date") && <TD>{row.date}</TD>}
                      {has("billNo") && <TD>{row.billNo}</TD>}
                      {has("center") && <TD>{row.center}</TD>}
                      {has("patient") && <TD>{row.patient}</TD>}
                      {has("mobile") && <TD>{row.mobile}</TD>}
                      {has("referralDr") && <TD>{row.referralDr}</TD>}
                      {has("corporate") && <TD>{row.corporate}</TD>}
                      {has("cash") && <TD right>{row.cash||0}</TD>}
                      {has("card") && <TD right>{row.card||0}</TD>}
                      {has("upi") && <TD right>{row.upi||0}</TD>}
                      {has("cheque") && <TD right>{row.cheque||0}</TD>}
                      {has("netBanking") && <TD right>{row.netBanking||0}</TD>}
                      {has("discount") && <TD right>{row.discount||0}</TD>}
                      {has("netAmount") && <TD right>{row.netAmount?.toFixed(2)}</TD>}
                      {has("total") && <TD right>{row.total?.toFixed(2)}</TD>}
                      {has("balance") && <TD right>{row.balance?.toFixed(2)}</TD>}
                      {has("remark") && <TD>{row.remark}</TD>}
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-semibold">
                  <tr>
                    {has("srNo") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("date") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("billNo") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("center") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("patient") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300 font-semibold">TOTAL</td>}
                    {has("mobile") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("referralDr") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("corporate") && <td className="px-2 py-1.5 border border-gray-300"/>}
                    {has("cash") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("cash").toFixed(2)}</td>}
                    {has("card") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("card").toFixed(2)}</td>}
                    {has("upi") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("upi").toFixed(2)}</td>}
                    {has("cheque") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("cheque").toFixed(2)}</td>}
                    {has("netBanking") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("netBanking").toFixed(2)}</td>}
                    {has("discount") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("discount").toFixed(2)}</td>}
                    {has("netAmount") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("netAmount").toFixed(2)}</td>}
                    {has("total") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("total").toFixed(2)}</td>}
                    {has("balance") && <td className="px-2 py-1.5 text-right text-xs border border-gray-300">{sum("balance").toFixed(2)}</td>}
                    {has("remark") && <td className="px-2 py-1.5 border border-gray-300"/>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-3 p-2 bg-white border border-gray-300 rounded flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, pagination.total)}-{Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total} records | Page {currentPage} of {pagination.totalPages}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => goToPage(1)} disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                First
              </button>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                ← Prev
              </button>
              
              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return pageNum >= 1 && pageNum <= pagination.totalPages ? (
                    <button key={pageNum} onClick={() => goToPage(pageNum)}
                      className={`px-2 py-1 text-xs border rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}>
                      {pageNum}
                    </button>
                  ) : null;
                })}
              </div>
              
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pagination.totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Next →
              </button>
              <button onClick={() => goToPage(pagination.totalPages)} disabled={currentPage === pagination.totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Last
              </button>
            </div>
          </div>
        )}

        {/* Report Type Info */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <strong>Report Type:</strong> {reportTitle} | <strong>Records:</strong> {data.length} | <strong>Date Range:</strong> {dispRange(dateFrom, dateTo)}
        </div>
      </div>

      {/* PRINT ONLY SECTION */}
      <div className="print-only">
        <style>{`@media print{body *{visibility:hidden}.print-only,.print-only *{visibility:visible}.print-only{position:absolute;left:0;top:0;width:100%;padding:20px}@page{size:A4 landscape;margin:10mm}}@media screen{.print-only{display:none}}`}</style>
        <div style={{textAlign:"center",marginBottom:"16px"}}>
          <h1 style={{fontSize:"20px",fontWeight:"bold",margin:"0"}}>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p style={{margin:"4px 0",fontSize:"11px"}}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <hr style={{margin:"8px 0",border:"1px solid #000"}}/>
          <h2 style={{fontSize:"14px",fontWeight:"bold",color:"#0066cc",margin:"8px 0"}}>{reportTitle}</h2>
          <p style={{margin:"4px 0",fontSize:"11px"}}>Period: {dispRange(dateFrom,dateTo)}</p>
          <hr style={{margin:"8px 0",border:"1px dashed #000"}}/>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"9px"}}>
          <thead><tr style={{backgroundColor:"#f0f0f0"}}>
            {has("srNo") && <th style={{padding:"5px",border:"1px solid #000"}}>Sr.No</th>}
            {has("date") && <th style={{padding:"5px",border:"1px solid #000"}}>Date</th>}
            {has("billNo") && <th style={{padding:"5px",border:"1px solid #000"}}>Bill No.</th>}
            {has("center") && <th style={{padding:"5px",border:"1px solid #000"}}>Center</th>}
            {has("patient") && <th style={{padding:"5px",border:"1px solid #000"}}>Patient</th>}
            {has("mobile") && <th style={{padding:"5px",border:"1px solid #000"}}>Mobile</th>}
            {has("referralDr") && <th style={{padding:"5px",border:"1px solid #000"}}>Referral Dr.</th>}
            {has("corporate") && <th style={{padding:"5px",border:"1px solid #000"}}>Corporate</th>}
            {has("cash") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Cash</th>}
            {has("card") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Card</th>}
            {has("upi") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>UPI</th>}
            {has("cheque") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Cheque</th>}
            {has("netBanking") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Net Banking</th>}
            {has("discount") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Discount</th>}
            {has("netAmount") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Net Amount</th>}
            {has("total") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Total Bill</th>}
            {has("balance") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Balance</th>}
            {has("remark") && <th style={{padding:"5px",border:"1px solid #000"}}>Remark</th>}
          </tr></thead>
          <tbody>{data.map((row,i)=>(
            <tr key={i}>
              {has("srNo") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.srNo}</td>}
              {has("date") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.date}</td>}
              {has("billNo") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.billNo}</td>}
              {has("center") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.center}</td>}
              {has("patient") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.patient}</td>}
              {has("mobile") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.mobile}</td>}
              {has("referralDr") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.referralDr}</td>}
              {has("corporate") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.corporate}</td>}
              {has("cash") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.cash||0}</td>}
              {has("card") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.card||0}</td>}
              {has("upi") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.upi||0}</td>}
              {has("cheque") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.cheque||0}</td>}
              {has("netBanking") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.netBanking||0}</td>}
              {has("discount") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.discount||0}</td>}
              {has("netAmount") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.netAmount?.toFixed(2)}</td>}
              {has("total") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.total?.toFixed(2)}</td>}
              {has("balance") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{row.balance?.toFixed(2)}</td>}
              {has("remark") && <td style={{padding:"5px",border:"1px solid #000"}}>{row.remark}</td>}
            </tr>
          ))}</tbody>
          {data.length > 0 && (
            <tfoot><tr style={{backgroundColor:"#f0f0f0",fontWeight:"bold"}}>
              {has("srNo") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
              {has("date") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
              {has("billNo") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
              {has("center") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
              {has("patient") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>TOTAL</td>}
              {has("mobile") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
              {has("referralDr") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
              {has("corporate") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
              {has("cash") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("cash").toFixed(2)}</td>}
              {has("card") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("card").toFixed(2)}</td>}
              {has("upi") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("upi").toFixed(2)}</td>}
              {has("cheque") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("cheque").toFixed(2)}</td>}
              {has("netBanking") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("netBanking").toFixed(2)}</td>}
              {has("discount") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("discount").toFixed(2)}</td>}
              {has("netAmount") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("netAmount").toFixed(2)}</td>}
              {has("total") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("total").toFixed(2)}</td>}
              {has("balance") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{sum("balance").toFixed(2)}</td>}
              {has("remark") && <td style={{padding:"5px",border:"1px solid #000"}}></td>}
            </tr></tfoot>
          )}
        </table>
      </div>
    </>
  );
}
