import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, Printer, FileText, FileSpreadsheet, BarChart3, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "../../../components/Header.jsx";
import PageHeader from "../../../components/BreadCrumb.jsx";
import { getAllPatients, getCollectionCenters } from "../../../api/patient.js";
import { getTests } from "../../../api/master.js";

const fmtISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const toGB = (iso) => { if(!iso) return "-"; const d=new Date(iso); return d.toLocaleDateString("en-GB"); };
const toYMD = (iso) => { if(!iso) return null; const d=new Date(iso); return fmtISO(d); };
const dispRange = (f,t) => { if(!f) return "From Date - To Date"; const a=toGB(f),b=t?toGB(t):a; return a===b?a:`${a} - ${b}`; };

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

// All optional columns matching the image
const OPTIONAL_COLS = [
  { id:"center",     label:"Center" },
  { id:"corporate",  label:"Corporate" },
  { id:"refDoctor",  label:"Ref.Dr" },
  { id:"paid",       label:"Paid" },
  { id:"refund",     label:"Refund" },
  { id:"net",        label:"Net" },
  { id:"cash",       label:"Cash" },
  { id:"card",       label:"Card" },
  { id:"upi",        label:"UPI" },
  { id:"cheque",     label:"Cheque" },
  { id:"netBanking", label:"Net Banking" },
  { id:"disc",       label:"Disc" },
  { id:"balance",    label:"Balance" },
  { id:"remark",     label:"Remark" },
];

function Cal({ month, year, onPrev, onNext, onDay, onHover, from, to, hover, picking }) {
  const first = new Date(year,month,1).getDay();
  const total = new Date(year,month+1,0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({length:total},(_,i)=>i+1)];
  const cls = (d) => {
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

export default function CenterWiseCostReport() {
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
  const [center, setCenter]       = useState("");
  const [corporate, setCorporate] = useState("");
  const [patient, setPatient]     = useState("");
  const [referral, setReferral]   = useState("");
  const [outstanding, setOutstanding] = useState(false);

  // Column selector
  const [selCols, setSelCols] = useState(OPTIONAL_COLS.map(c=>c.id));
  const [colOpen, setColOpen] = useState(false);
  const [colQ, setColQ]       = useState("");
  const colRef = useRef(null);

  const [errors, setErrors]   = useState({});
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [centers, setCenters] = useState([]);
  const [testChargeMap, setTestChargeMap] = useState({});

  useEffect(() => {
    getCollectionCenters().then(setCenters).catch(()=>{});
    getTests().then(tests => {
      const map = {};
      tests.forEach(t => {
        const charge = (t.charges||[]).find(c=>c.isActive) || (t.charges||[])[0];
        map[t.id] = charge?.b2bCharge || 0;
      });
      setTestChargeMap(map);
    }).catch(()=>{});
    const h = (e) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p) => { if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day) => { if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };
  const toggleCol = (id) => setSelCols(prev => prev.includes(id)?prev.filter(c=>c!==id):[...prev,id]);

  // Build one row per visit, aggregating payment mode amounts
  const buildRows = (patients, from, to) => {
    const rows = [];
    for (const p of patients) {
      const patName = [p.title, p.firstName, p.lastName].filter(Boolean).join(" ");
      // Patient name filter — case-insensitive partial match
      if (patient && !patName.toLowerCase().includes(patient.toLowerCase())) continue;
      // Center filter — case-insensitive partial match on patient location
      if (center && !(p.createdAtLocation||"").toLowerCase().includes(center.toLowerCase())) continue;

      // Group tests by visitId
      const visitMap = new Map();
      for (const t of p.tests || []) {
        const d = toYMD(t.visitDate || t.createdAt || p.createdAt);
        if (from && d && (d < from || d > (to||from))) continue;
        if (corporate && !(t.businessType||"").toLowerCase().includes(corporate.toLowerCase())) continue;
        // Referral doctor filter — case-insensitive partial match
        if (referral && !(t.referralDoctor||"").toLowerCase().includes(referral.toLowerCase())) continue;

        if (!visitMap.has(t.visitId)) {
          visitMap.set(t.visitId, {
            visitId:    t.visitId || "-",
            date:       toGB(t.visitDate || p.createdAt),
            patient:    patName,
            center:     p.createdAtLocation || "-",
            corporate:  t.businessType || "-",
            refDoctor:  t.referralDoctor || "-",
            remark:     t.discountRemark || t.remarks || "-",
            tests:      new Set(),
            total:      0,
            paid:       t.paidAmount    || 0,
            balance:    t.balanceAmount || 0,
            disc:       t.discountAmount || 0,
            refund:     0,
            // payment mode buckets
            cash:       0,
            card:       0,
            upi:        0,
            cheque:     0,
            netBanking: 0,
          });
        }
        const v = visitMap.get(t.visitId);
        v.tests.add(t.test?.shortName || t.test?.name || "-");
        v.total   += t.totalAmount || t.charge || 0;
        // keep max for visit-level fields stored per-test row
        v.paid       = Math.max(v.paid,       t.paidAmount    || 0);
        v.balance    = Math.max(v.balance,    t.balanceAmount || 0);
        v.disc       = Math.max(v.disc,       t.discountAmount || 0);
        if (t.discountRemark || t.remarks) v.remark = t.discountRemark || t.remarks || "-";

        // Accumulate payment mode amounts
        const mode = (t.paymentMode || "").toLowerCase();
        const amt  = t.paidAmount || 0;
        if (mode === "cash")        v.cash       += amt;
        else if (mode === "card")   v.card       += amt;
        else if (mode === "upi")    v.upi        += amt;
        else if (mode === "cheque") v.cheque     += amt;
        else if (mode === "net banking" || mode === "netbanking") v.netBanking += amt;
      }

      for (const v of visitMap.values()) {
        if (outstanding && v.balance <= 0) continue;
        const net = v.total - v.disc;
        rows.push({
          ...v,
          testPerformed: [...v.tests].join(", "),
          net: Math.max(0, net),
        });
      }
    }
    return rows;
  };

  const handleSearch = async () => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setErrors({}); setLoading(true);
    try {
      const res = await getAllPatients();
      const patients = res.data || res || [];
      setData(buildRows(patients, dateFrom, dateTo));
      setSearched(true);
    } catch (err) {
      setErrors({ api: err.message || "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const t = fmtISO(today0());
    setDateFrom(t); setDateTo(t); setPreset("Today"); setCustom(false);
    setCenter(""); setCorporate(""); setPatient(""); setReferral(""); setOutstanding(false);
    setSelCols(OPTIONAL_COLS.map(c=>c.id));
    setErrors({}); setData([]); setSearched(false);
  };

  // Totals
  const sum = (key) => data.reduce((s,r)=>s+(r[key]||0), 0);
  const totalTotal  = sum("total");
  const totalPaid   = sum("paid");
  const totalRefund = sum("refund");
  const totalNet    = sum("net");
  const totalCash   = sum("cash");
  const totalCard   = sum("card");
  const totalUpi    = sum("upi");
  const totalCheque = sum("cheque");
  const totalNB     = sum("netBanking");
  const totalDisc   = sum("disc");
  const totalBal    = sum("balance");

  // Fixed cols: Sr, Date, Visit ID, Patient Name, Test Performed, Total (always shown)
  const FIXED = 6;
  const optColSpan = OPTIONAL_COLS.filter(c => selCols.includes(c.id)).length;
  const totalColSpan = FIXED + optColSpan;

  const th = "px-2 sm:px-3 py-1.5 sm:py-2 font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300";
  const td = "px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm";
  const tdr = td + " text-right";

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-cyan-50 min-h-screen">
        <PageHeader title="Center Wise Cost Report" icon={BarChart3} path="Reports / Cost Related Reports"/>

        {/* FILTER CARD */}
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

          {/* Row 2 — Patient + Column Selector + Outstanding */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <input placeholder="Patient Name" value={patient} onChange={e=>setPatient(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>

            <input placeholder="Referral Doctor" value={referral} onChange={e=>setReferral(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>

            {/* COLUMN SELECTOR */}
            <div className="relative" ref={colRef}>
              <button type="button" onClick={()=>setColOpen(o=>!o)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700">Select options ({selCols.length})</span>
                <ChevronDown size={14} className={`transition-transform ${colOpen?"rotate-180":""}`}/>
              </button>
              {colOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold rounded-t">Select options</div>
                  <div className="p-2 border-b border-gray-200">
                    <div className="flex items-center gap-1 text-xs mb-1">
                      <span className="font-semibold text-gray-600">Filter:</span>
                      <input type="text" placeholder="Enter keywords" value={colQ} onChange={e=>setColQ(e.target.value)}
                        className="border border-gray-400 px-1.5 py-0.5 rounded text-xs flex-1 focus:outline-none"/>
                    </div>
                    <div className="flex gap-3 text-xs items-center">
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
          </div>

          {/* Row 3 — Outstanding + Buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              <input type="checkbox" checked={outstanding} onChange={e=>setOutstanding(e.target.checked)}/>
              Only Outstanding
            </label>
            {errors.api && <p className="text-red-600 text-xs">{errors.api}</p>}
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
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

        {/* TABLE */}
        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
                <tr>
                  <th className={th + " text-left"}>Sr.</th>
                  <th className={th + " text-left"}>Date</th>
                  <th className={th + " text-left"}>Visit ID</th>
                  <th className={th + " text-left"}>Patient Name</th>
                  <th className={th + " text-left"}>Test Performed</th>
                  <th className={th + " text-right"}>Total</th>
                  {selCols.includes("center")     && <th className={th + " text-left"}>Center</th>}
                  {selCols.includes("corporate")  && <th className={th + " text-left"}>Corporate</th>}
                  {selCols.includes("refDoctor")  && <th className={th + " text-left"}>Ref.Dr</th>}
                  {selCols.includes("paid")       && <th className={th + " text-right"}>Paid</th>}
                  {selCols.includes("refund")     && <th className={th + " text-right"}>Refund</th>}
                  {selCols.includes("net")        && <th className={th + " text-right"}>Net</th>}
                  {selCols.includes("cash")       && <th className={th + " text-right"}>Cash</th>}
                  {selCols.includes("card")       && <th className={th + " text-right"}>Card</th>}
                  {selCols.includes("upi")        && <th className={th + " text-right"}>UPI</th>}
                  {selCols.includes("cheque")     && <th className={th + " text-right"}>Cheque</th>}
                  {selCols.includes("netBanking") && <th className={th + " text-right"}>Net Banking</th>}
                  {selCols.includes("disc")       && <th className={th + " text-right"}>Disc</th>}
                  {selCols.includes("balance")    && <th className={th + " text-right"}>Balance</th>}
                  {selCols.includes("remark")     && <th className={th + " text-left"}>Remark</th>}
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr><td colSpan={totalColSpan} className="text-center p-4 text-gray-500 border border-gray-300">Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={totalColSpan} className="text-center p-4 text-gray-500 border border-gray-300">
                    {searched ? "No records found." : "Select date range and click Search."}
                  </td></tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className={td}>{i+1}</td>
                      <td className={td + " whitespace-nowrap"}>{row.date}</td>
                      <td className={td + " whitespace-nowrap"}>{row.visitId}</td>
                      <td className={td}>{row.patient}</td>
                      <td className={td}>{row.testPerformed}</td>
                      <td className={tdr}>₹{(row.total||0).toFixed(2)}</td>
                      {selCols.includes("center")     && <td className={td}>{row.center}</td>}
                      {selCols.includes("corporate")  && <td className={td}>{row.corporate}</td>}
                      {selCols.includes("refDoctor")  && <td className={td}>{row.refDoctor}</td>}
                      {selCols.includes("paid")       && <td className={tdr}>₹{(row.paid||0).toFixed(2)}</td>}
                      {selCols.includes("refund")     && <td className={tdr}>₹{(row.refund||0).toFixed(2)}</td>}
                      {selCols.includes("net")        && <td className={tdr}>₹{(row.net||0).toFixed(2)}</td>}
                      {selCols.includes("cash")       && <td className={tdr}>₹{(row.cash||0).toFixed(2)}</td>}
                      {selCols.includes("card")       && <td className={tdr}>₹{(row.card||0).toFixed(2)}</td>}
                      {selCols.includes("upi")        && <td className={tdr}>₹{(row.upi||0).toFixed(2)}</td>}
                      {selCols.includes("cheque")     && <td className={tdr}>₹{(row.cheque||0).toFixed(2)}</td>}
                      {selCols.includes("netBanking") && <td className={tdr}>₹{(row.netBanking||0).toFixed(2)}</td>}
                      {selCols.includes("disc")       && <td className={tdr}>₹{(row.disc||0).toFixed(2)}</td>}
                      {selCols.includes("balance")    && <td className={tdr}>₹{(row.balance||0).toFixed(2)}</td>}
                      {selCols.includes("remark")     && <td className={td}>{row.remark}</td>}
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white font-semibold">
                  <tr>
                    <td colSpan={5} className={td + " text-right"}>Grand Total</td>
                    <td className={tdr}>₹{totalTotal.toFixed(2)}</td>
                    {selCols.includes("center")     && <td className={td}></td>}
                    {selCols.includes("corporate")  && <td className={td}></td>}
                    {selCols.includes("refDoctor")  && <td className={td}></td>}
                    {selCols.includes("paid")       && <td className={tdr}>₹{totalPaid.toFixed(2)}</td>}
                    {selCols.includes("refund")     && <td className={tdr}>₹{totalRefund.toFixed(2)}</td>}
                    {selCols.includes("net")        && <td className={tdr}>₹{totalNet.toFixed(2)}</td>}
                    {selCols.includes("cash")       && <td className={tdr}>₹{totalCash.toFixed(2)}</td>}
                    {selCols.includes("card")       && <td className={tdr}>₹{totalCard.toFixed(2)}</td>}
                    {selCols.includes("upi")        && <td className={tdr}>₹{totalUpi.toFixed(2)}</td>}
                    {selCols.includes("cheque")     && <td className={tdr}>₹{totalCheque.toFixed(2)}</td>}
                    {selCols.includes("netBanking") && <td className={tdr}>₹{totalNB.toFixed(2)}</td>}
                    {selCols.includes("disc")       && <td className={tdr}>₹{totalDisc.toFixed(2)}</td>}
                    {selCols.includes("balance")    && <td className={tdr}>₹{totalBal.toFixed(2)}</td>}
                    {selCols.includes("remark")     && <td className={td}></td>}
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
