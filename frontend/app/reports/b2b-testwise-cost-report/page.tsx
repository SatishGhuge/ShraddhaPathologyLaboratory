"use client";

import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, Printer, FileText, FileSpreadsheet, BarChart3, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import { getAllPatients, getCollectionCenters } from "@/src/api/patient";
import { getTests } from "@/src/api/master";

/* ── Date helpers (same as PatientList) ── */
const fmtISO = (d: any) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const toGB = (iso: any) => { if(!iso) return "-"; const d=new Date(iso); return d.toLocaleDateString("en-GB"); };
const toYMD = (iso: any) => { if(!iso) return null; const d=new Date(iso); return fmtISO(d); };
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

const OPTIONAL_COLS = [
  { id:"date",      label:"Date" },
  { id:"invoiceNo", label:"Invoice No" },
  { id:"visitId",   label:"Visit ID" },
  { id:"center",    label:"Center" },
  { id:"corporate", label:"Corporate" },
  { id:"refDoctor", label:"Referral Doctor" },
  { id:"total",     label:"Total" },
  { id:"b2b",       label:"B2B Charges" },
  { id:"netAmount", label:"Net Amount" },
];

export default function B2BTestwiseCostReport() {
  // Date range picker
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

  // Filters
  const [center, setCenter]     = useState("");
  const [corporate, setCorporate] = useState("");
  const [patient, setPatient]   = useState("");
  const [outstanding, setOutstanding] = useState(false);

  // Required columns
  const [selCols, setSelCols] = useState(OPTIONAL_COLS.map(c=>c.id));
  const [colOpen, setColOpen] = useState(false);
  const [colQ, setColQ]       = useState("");
  const colRef = useRef(null);

  const [errors, setErrors]   = useState<any>({});
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [testChargeMap, setTestChargeMap] = useState<any>({});

  useEffect(() => {
    getCollectionCenters().then((res: any) => setCenters(Array.isArray(res) ? res : res?.data || [])).catch(()=>{});
    getTests().then((res: any) => {
      const tests = Array.isArray(res) ? res : res?.data || [];
      const map = {};
      tests.forEach(t => {
        const charge = (t.charges||[]).find(c=>c.isActive) || (t.charges||[])[0];
        map[t.id] = charge?.b2bCharge || 0;
      });
      setTestChargeMap(map);
    }).catch(()=>{});
    const h = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false);
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

  const toggleCol = (id: any) => setSelCols(prev => prev.includes(id)?prev.filter(c=>c!==id):[...prev,id]);

  const buildRows = (patients: any, from: any, to: any) => {
    const rows = [];
    for (const p of patients) {
      const patName = [p.title,p.firstName,p.lastName].filter(Boolean).join(" ");
      if (patient && !patName.toLowerCase().includes(patient.toLowerCase())) continue;
      for (const t of p.tests||[]) {
        const d = toYMD(t.visitDate||t.createdAt||p.createdAt);
        if (from && d && (d<from||d>(to||from))) continue;
        if (center && (p.createdAtLocation||"")!==center) continue;
        if (corporate && !(t.businessType||"").toLowerCase().includes(corporate.toLowerCase())) continue;
        if (outstanding && (t.balanceAmount||0)<=0) continue;
        const b2b = testChargeMap[t.testId]||0;
        rows.push({
          date: toGB(t.visitDate||p.createdAt),
          invoiceNo: t.visitId||"-",
          visitId: t.visitId||"-",
          center: p.createdAtLocation||"-",
          corporate: t.businessType||"-",
          refDoctor: t.referralDoctor||"-",
          patient: patName,
          test: t.test?.shortName||t.test?.name||"-",
          total: t.totalAmount||t.charge||0,
          b2b,
          netAmount: t.paidAmount||0,
        });
      }
    }
    return rows;
  };

  const handleSearch = async () => {
    if (!dateFrom) { setErrors({ date:"Date is required" }); return; }
    setErrors({}); setLoading(true);
    try {
      const res = await getAllPatients();
      const patients = res.data||res||[];
      setData(buildRows(patients, dateFrom, dateTo));
      setSearched(true);
    } catch(err) { setErrors({ api: err.message||"Failed to fetch" }); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    const t = fmtISO(today0());
    setDateFrom(t); setDateTo(t); setPreset("Today"); setCustom(false);
    setCenter(""); setCorporate(""); setPatient(""); setOutstanding(false);
    setSelCols(OPTIONAL_COLS.map(c=>c.id));
    setErrors({}); setData([]); setSearched(false);
  };

  const totalAmt = data.reduce((s,r)=>s+(r.total||0),0);
  const totalB2B = data.reduce((s,r)=>s+(r.b2b||0),0);
  const totalNet = data.reduce((s,r)=>s+(r.netAmount||0),0);
  const fixedCount = 2 + (selCols.includes("refDoctor")?1:0);
  const optCount = ["date","invoiceNo","visitId","center","corporate"].filter(c=>selCols.includes(c)).length;
  const numCount = ["total","b2b","netAmount"].filter(c=>selCols.includes(c)).length;
  const totalColSpan = 1 + optCount + fixedCount + numCount;

  return (
    <>
      <Header/>
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-white min-h-screen">

        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">
          {/* Row 1 — Date + Center + Corporate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
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
                        className={`px-4 py-2.5 text-sm cursor-pointer ${preset===p.label?"bg-blue-600 text-white font-semibold":"text-gray-700 hover:bg-blue-50"}`}>
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
            <select value={center} onChange={e=>setCenter(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Select Center</option>
              {centers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select value={corporate} onChange={e=>setCorporate(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Select Corporate</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>

          {/* Row 2 — Patient + Required Columns + Outstanding */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <input placeholder="Patient Name" value={patient} onChange={e=>setPatient(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            <div className="relative" ref={colRef}>
              <button type="button" onClick={()=>setColOpen(o=>!o)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700">Required Columns ({selCols.length})</span>
                <ChevronDown size={14} className={`transition-transform ${colOpen?"rotate-180":""}`}/>
              </button>
              {colOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold rounded-t">Required Columns</div>
                  <div className="p-2 border-b border-gray-200">
                    <div className="flex items-center gap-1 text-xs mb-1">
                      <span className="font-semibold text-gray-600">Filter:</span>
                      <input type="text" placeholder="Enter keywords" value={colQ} onChange={e=>setColQ(e.target.value)}
                        className="border border-gray-400 px-1.5 py-0.5 rounded text-xs flex-1 focus:outline-none"/>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <button onClick={()=>setSelCols(OPTIONAL_COLS.map(c=>c.id))} className="text-blue-600 font-semibold hover:underline">✓ Check all</button>
                      <button onClick={()=>setSelCols([])} className="text-blue-600 font-semibold hover:underline">✕ Uncheck all</button>
                      <button onClick={()=>setColQ("")} className="ml-auto text-gray-500 hover:text-gray-700 text-base leading-none">⊗</button>
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {OPTIONAL_COLS.filter(c=>c.label.toLowerCase().includes(colQ.toLowerCase())).map(col=>(
                      <label key={col.id} className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${selCols.includes(col.id)?"bg-gray-100":""}`}>
                        <input type="checkbox" checked={selCols.includes(col.id)} onChange={()=>toggleCol(col.id)} className="w-4 h-4 accent-blue-600"/>
                        <span className="font-medium text-gray-800">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              <input type="checkbox" checked={outstanding} onChange={e=>setOutstanding(e.target.checked)}/>
              Only Outstanding
            </label>
          </div>

          {errors.api && <p className="text-red-600 text-xs mb-2">{errors.api}</p>}

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button onClick={handleSearch} disabled={loading}
              className="flex gap-1 sm:gap-1.5 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Search size={14}/> {loading?"Searching...":"Search"}
            </button>
            <button onClick={handleReset}
              className="flex gap-1 sm:gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <RotateCcw size={14}/> Reset
            </button>
            <button onClick={()=>window.print()}
              className="flex gap-1 sm:gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Printer size={14}/> Print
            </button>
            <button className="flex gap-1 sm:gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <FileText size={14}/> PDF
            </button>
            <button className="flex gap-1 sm:gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <FileSpreadsheet size={14}/> Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-900 text-white shadow-xl">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Sr.</th>
                  {selCols.includes("date")      && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Date</th>}
                  {selCols.includes("invoiceNo") && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Invoice No</th>}
                  {selCols.includes("visitId")   && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Visit ID</th>}
                  {selCols.includes("center")    && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Center</th>}
                  {selCols.includes("corporate") && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Corporate</th>}
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  {selCols.includes("refDoctor") && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Referral Doctor</th>}
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Test Performed</th>
                  {selCols.includes("total")     && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Total</th>}
                  {selCols.includes("b2b")       && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">B2B Charges</th>}
                  {selCols.includes("netAmount") && <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Net Amount</th>}
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr><td colSpan={totalColSpan} className="text-center p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={totalColSpan} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">
                    {searched?"No records found.":"Select date range and click Search."}
                  </td></tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{i+1}</td>
                      {selCols.includes("date")      && <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.date}</td>}
                      {selCols.includes("invoiceNo") && <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.invoiceNo||"-"}</td>}
                      {selCols.includes("visitId")   && <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.visitId}</td>}
                      {selCols.includes("center")    && <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.center}</td>}
                      {selCols.includes("corporate") && <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.corporate}</td>}
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.patient}</td>
                      {selCols.includes("refDoctor") && <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.refDoctor}</td>}
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.test}</td>
                      {selCols.includes("total")     && <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">₹{row.total.toFixed(2)}</td>}
                      {selCols.includes("b2b")       && <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">₹{row.b2b.toFixed(2)}</td>}
                      {selCols.includes("netAmount") && <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">₹{row.netAmount.toFixed(2)}</td>}
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <td colSpan={1+optCount+fixedCount} className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">Grand Total</td>
                    {selCols.includes("total")     && <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">₹{totalAmt.toFixed(2)}</td>}
                    {selCols.includes("b2b")       && <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">₹{totalB2B.toFixed(2)}</td>}
                    {selCols.includes("netAmount") && <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">₹{totalNet.toFixed(2)}</td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {data.length > 0 && <div className="px-3 py-1.5 border-t border-gray-200 text-xs text-gray-500">{data.length} record(s)</div>}
        </div>
      </div>
    </>
  );
}

