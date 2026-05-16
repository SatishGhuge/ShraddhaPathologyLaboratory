import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Search, RotateCcw, Printer, FileSpreadsheet, Users, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "../../components/Header.jsx";
import PageHeader from "../../components/BreadCrumb.jsx";
import { getAllPatients, getCollectionCenters } from "../../api/patient.js";

/* ── helpers ── */
const toYMD = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const toGB = (iso) => { if (!iso) return "-"; const d = new Date(iso); return d.toLocaleDateString("en-GB"); };
const fmtISO = (d) => {
  // Use local date parts to avoid UTC timezone shift
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const dispRange = (f,t) => { if(!f) return "Search by Date"; const a=toGB(f),b=t?toGB(t):a; return a===b?a:`${a} - ${b}`; };

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

const COLS = [
  {key:"center",label:"Center"},{key:"visitType",label:"Visit Type"},{key:"mobile",label:"Mobile"},
  {key:"invoiceNo",label:"Invoice No"},{key:"visitId",label:"Visit ID"},{key:"refDoctor",label:"Ref.Dr"},
  {key:"totalBill",label:"Total Bill"},{key:"received",label:"Received"},{key:"paymentMode",label:"Payment Mode"},
  {key:"discount",label:"Discount"},{key:"refund",label:"Refund"},{key:"externalLab",label:"External Lab"},
  {key:"dueNetAmount",label:"Due and Net Amount"},{key:"remark",label:"Remark"},{key:"user",label:"User"},
  {key:"address",label:"Address"},{key:"sampleCollection",label:"Sample Collection"},
];

export default function PatientList() {
  const location = useLocation();
  
  // Check for date parameter from URL (from dashboard navigation)
  const urlDate = new URLSearchParams(location.search).get('date');
  
  const [f, setF] = useState({center:"",visitType:"",referralDoctor:"",nameUsername:"",patientName:"",onlyOutstandings:false,foc:false});
  const [dateFrom, setDateFrom] = useState(urlDate || fmtISO(today0()));
  const [dateTo, setDateTo]     = useState(urlDate || fmtISO(today0()));
  const [open, setOpen]         = useState(false);
  const [preset, setPreset]     = useState("");
  const [custom, setCustom]     = useState(false);
  const [picking, setPicking]   = useState(false);
  const [hover, setHover]       = useState("");
  const [tFrom, setTFrom]       = useState("");
  const [tTo, setTTo]           = useState("");
  const now = new Date();
  const [cm, setCm] = useState(now.getMonth()===0?11:now.getMonth()-1);
  const [cy, setCy] = useState(now.getMonth()===0?now.getFullYear()-1:now.getFullYear());
  const rm = cm===11?0:cm+1, ry = cm===11?cy+1:cy;
  const dpRef = useRef(null), colRef = useRef(null);

  const [selCols, setSelCols] = useState(()=>Object.fromEntries(COLS.map(c=>[c.key,true])));
  const [colQ, setColQ]       = useState("");
  const [colOpen, setColOpen] = useState(false);
  const [errors, setErrors]   = useState({});
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [centers, setCenters] = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);
  const [refDoctors, setRefDoctors] = useState([]);

  useEffect(()=>{ getCollectionCenters().then(setCenters).catch(()=>{}); },[]);

  // Auto-fetch data on mount (use URL date if provided, otherwise today)
  useEffect(()=>{
    const initialDate = urlDate || fmtISO(today0());
    fetchData(initialDate, initialDate);
  },[]);
  useEffect(()=>{
    const h=(e)=>{
      if(dpRef.current&&!dpRef.current.contains(e.target)) setOpen(false);
      if(colRef.current&&!colRef.current.contains(e.target)) setColOpen(false);
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const openPicker=()=>{ setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setOpen(true); };
  const pickPreset=(p)=>{ if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay=(day)=>{ if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const apply=()=>{ setDateFrom(tFrom);setDateTo(tTo);setOpen(false);setPicking(false); };
  const cancel=()=>{ setOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM=()=>{ if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM=()=>{ if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const buildRows=(patients,from,to)=>{
    const rows=[];
    for(const p of patients){
      const vm=new Map();
      for(const t of p.tests||[]){
        const raw=t.visitDate||t.createdAt||p.createdAt;
        const d=toYMD(raw);
        if(from&&d&&(d<from||d>to)) continue;
        if(!vm.has(t.visitId)){
          vm.set(t.visitId,{
            visitId:t.visitId, date:toGB(raw),
            patientName:[p.title,p.firstName,p.lastName].filter(Boolean).join(" "),
            ageGender:`${p.age||"-"} Yrs / ${p.gender||"-"}`,
            tests:[], totalBill:0, received:0, discount:0, dueNetAmount:0,
            paymentMode:t.paymentMode||"-", corporate:t.businessType||"-",
            center:p.createdAtLocation||"-", mobile:p.mobile||"-",
            refDoctor:t.referralDoctor||"-", remark:t.remarks||"-",
            user:p.createdBy||"-", address:p.address||"-",
            visitType:t.visitType||"-",
            sampleCollection:t.sampleTaken?toGB(t.sampleTaken):"-",
            invoiceNo:t.visitId||"-", refund:"-", externalLab:"-",
          });
        }
        const v=vm.get(t.visitId);
        v.tests.push(t.test?.name||"");
        // totalAmount is per-test charge — sum it
        v.totalBill += t.totalAmount || 0;
        // paidAmount/discountAmount/balanceAmount are stored as the full visit amount on every row — take max (first seen)
        v.received    = Math.max(v.received,    t.paidAmount     || 0);
        v.discount    = Math.max(v.discount,    t.discountAmount || 0);
        v.dueNetAmount= Math.max(v.dueNetAmount, t.balanceAmount  || 0);
      }
      for(const v of vm.values())
        rows.push({...v,testPerformed:v.tests.join(", "),totalBill:Math.round(v.totalBill),received:Math.round(v.received),discount:Math.round(v.discount),dueNetAmount:Math.round(v.dueNetAmount)});
    }
    return rows;
  };

  const applyF=(rows)=>rows.filter(r=>{
    if(f.patientName&&!r.patientName.toLowerCase().includes(f.patientName.toLowerCase())) return false;
    if(f.nameUsername&&!r.patientName.toLowerCase().includes(f.nameUsername.toLowerCase())&&!r.mobile.includes(f.nameUsername)) return false;
    if(f.referralDoctor&&!r.refDoctor.toLowerCase().includes(f.referralDoctor.toLowerCase())) return false;
    if(f.visitType&&r.visitType!==f.visitType) return false;
    if(f.center&&r.center!==f.center) return false;
    if(f.onlyOutstandings&&parseFloat(r.dueNetAmount)<=0) return false;
    return true;
  });

  const fetchData = async (from, to) => {
    setErrors({}); setLoading(true);
    try {
      const res = await getAllPatients();
      const patients = res.data || res || [];
      const toDate = to || from;
      const filtered = patients.filter(p=>(p.tests||[]).some(t=>{
        const d = toYMD(t.visitDate||t.createdAt||p.createdAt);
        return d && d >= from && d <= toDate;
      }));
      const rows = buildRows(filtered, from, toDate);
      const types = [...new Set(filtered.flatMap(p=>(p.tests||[]).map(t=>t.visitType).filter(Boolean)))].sort();
      const docs  = [...new Set(filtered.flatMap(p=>(p.tests||[]).map(t=>t.referralDoctor).filter(Boolean)))].sort();
      setVisitTypes(types);
      setRefDoctors(docs);
      setData(applyF(rows));
      setSearched(true);
    } catch(err) {
      setErrors({ api: err.message || "Failed to fetch data" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!dateFrom) { setErrors({ searchDate: "Date is required" }); return; }
    fetchData(dateFrom, dateTo);
  };

  const handleReset=()=>{
    const todayStr = fmtISO(today0());
    setF({center:"",visitType:"",referralDoctor:"",nameUsername:"",patientName:"",onlyOutstandings:false,foc:false});
    setDateFrom(todayStr); setDateTo(todayStr); setPreset("Today"); setCustom(false);
    setSelCols(Object.fromEntries(COLS.map(c=>[c.key,true])));
    setColQ(""); setErrors({});
    fetchData(todayStr, todayStr);
  };

  const vis=COLS.filter(c=>selCols[c.key]);
  const selCount=Object.values(selCols).filter(Boolean).length;

  return (
    <>
      <Header/>
      <div className="p-2 sm:p-3 md:p-4 bg-cyan-50 min-h-screen">
        <PageHeader title="Patient List" icon={Users} path="Reports"/>

        <div className="bg-white p-2 sm:p-3 rounded shadow-md mb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">

            {/* DATE PICKER */}
            <div className="relative" ref={dpRef}>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 rounded w-full text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.searchDate?"border-red-500":"border-gray-300"}`}>
                <span className={dateFrom?"text-gray-800":"text-gray-400"}>{dispRange(dateFrom,dateTo)}</span>
                <Calendar size={14} className="text-gray-400 ml-1 flex-shrink-0"/>
              </button>
              {errors.searchDate&&<p className="text-red-600 text-xs mt-0.5">{errors.searchDate}</p>}

              {open&&(
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
                            <button type="button" onClick={cancel} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                            <button type="button" onClick={apply} disabled={!tFrom} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Apply</button>
                          </div>
                        </div>
                      </div>
                    ):preset?(
                      <div className="p-5 flex flex-col justify-between min-h-[120px]">
                        <div><p className="text-xs text-gray-400 mb-1">Selected range</p><p className="text-sm font-semibold text-gray-800">{dispRange(tFrom,tTo)}</p></div>
                        <div className="flex gap-2 mt-4">
                          <button type="button" onClick={cancel} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                          <button type="button" onClick={apply} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                        </div>
                      </div>
                    ):(
                      <div className="p-4 text-sm text-gray-400 flex items-center justify-center h-full">Select a preset or Custom Range</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <select value={f.center} onChange={e=>setF(p=>({...p,center:e.target.value}))}
              className="border border-gray-300 p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Select Center</option>
              {centers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <select value={f.visitType} onChange={e=>setF(p=>({...p,visitType:e.target.value}))}
              className="border border-gray-300 p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Visit Type</option>
              {visitTypes.map(v=><option key={v} value={v}>{v}</option>)}
            </select>

            <input placeholder="Referral Doctor" value={f.referralDoctor} onChange={e=>setF(p=>({...p,referralDoctor:e.target.value}))}
              className="border border-gray-300 p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
            <input placeholder="Name / Mobile" value={f.nameUsername} onChange={e=>setF(p=>({...p,nameUsername:e.target.value}))}
              className="border border-gray-300 p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <input placeholder="Patient Name" value={f.patientName} onChange={e=>setF(p=>({...p,patientName:e.target.value}))}
              className="border border-gray-300 p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>

            <div className="relative" ref={colRef}>
              <button type="button" onClick={()=>setColOpen(o=>!o)}
                className="border border-gray-300 p-1.5 rounded w-full text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-600">Required Columns ({selCount})</span>
                <ChevronDown size={14} className={`transition-transform ${colOpen?"rotate-180":""}`}/>
              </button>
              {colOpen&&(
                <div className="absolute z-50 top-full left-0 w-64 bg-white border border-gray-300 rounded shadow-lg mt-0.5">
                  <div className="bg-blue-600 text-white px-3 py-1.5 rounded-t text-sm font-semibold">Required Columns</div>
                  <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-1 text-xs mb-1">
                      <span className="font-semibold text-gray-600">Filter:</span>
                      <input type="text" value={colQ} onChange={e=>setColQ(e.target.value)} placeholder="Keywords"
                        className="border border-gray-400 px-1.5 py-0.5 rounded text-xs flex-1 focus:outline-none"/>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <button onClick={()=>setSelCols(Object.fromEntries(COLS.map(c=>[c.key,true])))} className="text-blue-700 font-semibold hover:underline">✓ Check all</button>
                      <button onClick={()=>setSelCols(Object.fromEntries(COLS.map(c=>[c.key,false])))} className="text-blue-700 font-semibold hover:underline">✕ Uncheck all</button>
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {COLS.filter(c=>c.label.toLowerCase().includes(colQ.toLowerCase())).map(col=>(
                      <label key={col.key} className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${selCols[col.key]?"bg-gray-100":""}`}>
                        <input type="checkbox" checked={!!selCols[col.key]} onChange={()=>setSelCols(p=>({...p,[col.key]:!p[col.key]}))} className="w-4 h-4 accent-blue-600"/>
                        <span className="font-medium text-gray-800">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm border border-gray-300 p-1.5 rounded cursor-pointer">
              <input type="checkbox" checked={f.onlyOutstandings} onChange={e=>setF(p=>({...p,onlyOutstandings:e.target.checked}))} className="w-4 h-4 accent-blue-600"/>
              Only Outstandings
            </label>
            <label className="flex items-center gap-2 text-sm border border-gray-300 p-1.5 rounded cursor-pointer">
              <input type="checkbox" checked={f.foc} onChange={e=>setF(p=>({...p,foc:e.target.checked}))} className="w-4 h-4 accent-blue-600"/>
              FOC
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={handleSearch} disabled={loading}
              className="flex gap-1.5 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-sm">
              <Search size={14}/> {loading?"Searching...":"Search"}
            </button>
            <button onClick={()=>window.print()} className="flex gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm">
              <Printer size={14}/> Print
            </button>
            <button className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm">
              <FileSpreadsheet size={14}/> Excel
            </button>
            <button onClick={handleReset} className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm">
              <RotateCcw size={14}/> Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Sr.No.</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Date</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Age / Gender</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Test Performed</th>
                  {vis.map(c=><th key={c.key} className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading?(<tr><td colSpan={5+vis.length} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">Loading...</td></tr>)
                :errors.api?(<tr><td colSpan={5+vis.length} className="text-center p-3 sm:p-4 text-red-500 text-xs sm:text-sm border border-gray-300">{errors.api}</td></tr>)
                :data.length===0?(<tr><td colSpan={5+vis.length} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">{searched?"No records found.":"Select filters and click Search."}</td></tr>)
                :data.map((row,i)=>(
                  <tr key={`${row.visitId}-${i}`} className={i%2===0?"bg-white hover:bg-gray-50":"bg-gray-50 hover:bg-gray-100"}>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 text-xs sm:text-sm">{i+1}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 whitespace-nowrap text-xs sm:text-sm">{row.date}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 font-medium text-xs sm:text-sm">{row.patientName}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 whitespace-nowrap text-xs sm:text-sm">{row.ageGender}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 text-xs sm:text-sm">{row.testPerformed}</td>
                    {vis.map(c=><td key={c.key} className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 whitespace-nowrap text-xs sm:text-sm">{row[c.key]??"-"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length>0&&(
            <div className="px-3 py-1.5 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
              <span>{data.length} record(s)</span>
              <span className="text-red-600 font-semibold">Net Amount = Total Bill - External Lab - Discount</span>
            </div>
          )}
        </div>
      </div>

      <div className="print-only">
        <style>{`@media print{body *{visibility:hidden}.print-only,.print-only *{visibility:visible}.print-only{position:absolute;left:0;top:0;width:100%;padding:20px}@page{size:A4 landscape;margin:10mm}}@media screen{.print-only{display:none}}`}</style>
        <div style={{textAlign:"center",marginBottom:"16px"}}>
          <h1 style={{fontSize:"20px",fontWeight:"bold",margin:"0"}}>SILVERLEAF DIAGNOSTICS</h1>
          <p style={{margin:"4px 0",fontSize:"11px"}}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <hr style={{margin:"8px 0",border:"1px solid #000"}}/>
          <h2 style={{fontSize:"14px",fontWeight:"bold",color:"#0066cc",margin:"8px 0"}}>Patient List Report</h2>
          <p style={{margin:"4px 0",fontSize:"11px"}}>Period: {dispRange(dateFrom,dateTo)}</p>
          <hr style={{margin:"8px 0",border:"1px dashed #000"}}/>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"9px"}}>
          <thead><tr style={{backgroundColor:"#f0f0f0"}}>
            <th style={{padding:"5px",border:"1px solid #000"}}>Sr.No.</th>
            <th style={{padding:"5px",border:"1px solid #000"}}>Date</th>
            <th style={{padding:"5px",border:"1px solid #000"}}>Patient Name</th>
            <th style={{padding:"5px",border:"1px solid #000"}}>Age/Gender</th>
            <th style={{padding:"5px",border:"1px solid #000"}}>Test Performed</th>
            {vis.map(c=><th key={c.key} style={{padding:"5px",border:"1px solid #000"}}>{c.label}</th>)}
          </tr></thead>
          <tbody>{data.map((row,i)=>(
            <tr key={i}>
              <td style={{padding:"5px",border:"1px solid #000"}}>{i+1}</td>
              <td style={{padding:"5px",border:"1px solid #000"}}>{row.date}</td>
              <td style={{padding:"5px",border:"1px solid #000"}}>{row.patientName}</td>
              <td style={{padding:"5px",border:"1px solid #000"}}>{row.ageGender}</td>
              <td style={{padding:"5px",border:"1px solid #000"}}>{row.testPerformed}</td>
              {vis.map(c=><td key={c.key} style={{padding:"5px",border:"1px solid #000"}}>{row[c.key]??"-"}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
