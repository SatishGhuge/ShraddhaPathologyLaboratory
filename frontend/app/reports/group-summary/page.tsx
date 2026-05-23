"use client";

import { useState, useEffect, useRef } from "react";
import { Search, RotateCcw, FileSpreadsheet, Layers, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import * as XLSX from "xlsx";
import { getGroupSummaryReport } from "@/src/api/admin.js";

const fmtISO = (d: any) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const toGB = (iso: any) => { if(!iso) return "-"; return new Date(iso).toLocaleDateString("en-GB"); };
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
    const lo = from&&end?(from<end?from:end):null;
    const hi = from&&end?(from<end?end:from):null;
    if (lo&&hi&&c>lo&&c<hi) return "bg-blue-100 text-blue-800 rounded";
    return "hover:bg-gray-100 text-gray-700 rounded";
  };
  return (
    <div className="w-52">
      <div className="flex items-center justify-between mb-2 px-1">
        {onPrev ? <button type="button" onClick={onPrev} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={14}/></button> : <span className="w-6"/>}
        <span className="text-sm font-semibold">{MOS[month]} {year}</span>
        {onNext ? <button type="button" onClick={onNext} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={14}/></button> : <span className="w-6"/>}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-0.5">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="text-xs text-gray-400 py-1 font-medium">{d}</div>)}
        {cells.map((d,i) => (
          <div key={i}
            onClick={() => d && onDay(fmtISO(new Date(year,month,d)))}
            onMouseEnter={() => d && picking && onHover(fmtISO(new Date(year,month,d)))}
            className={`text-xs py-1 cursor-pointer transition-colors text-center ${cls(d)}`}>
            {d||""}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GroupSummary() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(fmtISO(today0()));
  const [dateTo,   setDateTo]   = useState(fmtISO(today0()));
  const [dpOpen,   setDpOpen]   = useState(false);
  const [preset,   setPreset]   = useState("Today");
  const [custom,   setCustom]   = useState(false);
  const [picking,  setPicking]  = useState(false);
  const [hover,    setHover]    = useState("");
  const [tFrom,    setTFrom]    = useState(fmtISO(today0()));
  const [tTo,      setTTo]      = useState(fmtISO(today0()));
  const [cm, setCm] = useState(now.getMonth()===0 ? 11 : now.getMonth()-1);
  const [cy, setCy] = useState(now.getMonth()===0 ? now.getFullYear()-1 : now.getFullYear());
  const rm = cm===11 ? 0 : cm+1;
  const ry = cm===11 ? cy+1 : cy;
  const dpRef = useRef(null);

  const [filters,  setFilters]  = useState({ center: "", referralDoctor: "", businessType: "" });
  const [centers,  setCenters]  = useState<any[]>([]);
  const [doctors,  setDoctors]  = useState<any[]>([]);
  const [data,     setData]     = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [errors,   setErrors]   = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  const token = localStorage.getItem("token");
  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/master/collection-centers`, { headers: authHeader })
      .then(r => r.json()).then(d => setCenters(d.data||[])).catch(()=>{});
    fetch(`${API}/master/doctors`, { headers: authHeader })
      .then(r => r.json()).then(d => setDoctors(d.data||[])).catch(()=>{});
    const handleOutside = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => {
    if (!p.fn) { setCustom(true); setPreset("Custom Range"); setTFrom(""); setTTo(""); setPicking(false); return; }
    const [a,b] = p.fn(); setTFrom(a); setTTo(b); setPreset(p.label); setCustom(false);
  };
  const clickDay = (day: any) => {
    if (!picking) { setTFrom(day); setTTo(""); setPicking(true); setHover(""); }
    else { if (day < tFrom) { setTTo(tFrom); setTFrom(day); } else setTTo(day); setPicking(false); }
  };
  const applyDate  = () => { setDateFrom(tFrom); setDateTo(tTo); setDpOpen(false); setPicking(false); };
  const cancelDate = () => { setDpOpen(false); setCustom(false); setPicking(false); setTFrom(dateFrom); setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const handleChange = (e: any) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const fetchData = async (page: number = 1) => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setLoading(true); setErrors({});
    try {
      const res = await getGroupSummaryReport({
        fromDate: dateFrom,
        toDate: dateTo || dateFrom,
        ...(filters.center && { center: filters.center }),
        ...(filters.referralDoctor && { referralDoctor: filters.referralDoctor }),
        ...(filters.businessType && { businessType: filters.businessType }),
      }, page, ITEMS_PER_PAGE);
      
      if (res.success) {
        setData(res.data || []);
        setPagination(res.pagination || null);
        setSearched(true);
      } else {
        setErrors({ api: res.message || "Failed to fetch" });
      }
    } catch (err) {
      setErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDateFrom(fmtISO(today0())); setDateTo(fmtISO(today0())); setPreset("Today");
    setCustom(false); setFilters({ center: "", referralDoctor: "", businessType: "" });
    setErrors({}); setData([]); setSearched(false); setCurrentPage(1); setPagination(null);
  };

  const calcTotal = (key: any) => data.reduce((s,r) => s + (r[key]||0), 0);

  const handleExcel = () => {
    const rows = data.map(r => ({
      Department: r.department, Count: r.count,
      "Total Amount": r.totalAmount.toFixed(2), Discount: r.discount.toFixed(2),
      "Paid Amount": r.paidAmount.toFixed(2), "Balance Amount": r.balanceAmount.toFixed(2),
    }));
    rows.push({
      Department: "Total", Count: calcTotal("count"),
      "Total Amount": calcTotal("totalAmount").toFixed(2), Discount: calcTotal("discount").toFixed(2),
      "Paid Amount": calcTotal("paidAmount").toFixed(2), "Balance Amount": calcTotal("balanceAmount").toFixed(2),
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GroupSummary");
    XLSX.writeFile(wb, `GroupSummary_${dateFrom}.xlsx`);
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-4 bg-cyan-50 min-h-screen">
        <PageHeader title="Group Summary Report" icon={Layers} path="Reports" />

        <div className="bg-white p-3 rounded shadow-md mb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">

            <div className="relative col-span-2 sm:col-span-1" ref={dpRef}>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 rounded w-full text-xs bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.date ? "border-red-500" : "border-gray-300"}`}>
                <span className={dateFrom ? "text-gray-800" : "text-gray-400"}>{dispRange(dateFrom, dateTo)}</span>
                <Calendar size={14} className="text-gray-400 ml-1 flex-shrink-0"/>
              </button>
              {errors.date && <p className="text-red-600 text-xs mt-0.5">{errors.date}</p>}
              {dpOpen && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl flex" style={{minWidth: custom ? "580px" : "320px"}}>
                  <div className="w-36 border-r border-gray-100 py-1 flex-shrink-0">
                    {PRESETS.map(p => (
                      <div key={p.label} onClick={() => pickPreset(p)}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${preset===p.label ? "bg-blue-600 text-white font-semibold" : "text-gray-700 hover:bg-blue-50"}`}>
                        {p.label}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col flex-1">
                    {custom ? (
                      <div className="p-4">
                        <div className="flex gap-8">
                          <Cal month={cm} year={cy} onPrev={prevM} onNext={null} onDay={clickDay} onHover={setHover} from={tFrom} to={tTo} hover={hover} picking={picking}/>
                          <Cal month={rm} year={ry} onPrev={null} onNext={nextM} onDay={clickDay} onHover={setHover} from={tFrom} to={tTo} hover={hover} picking={picking}/>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">{tFrom ? `${toGB(tFrom)} - ${tTo ? toGB(tTo) : "..."}` : "Click start date"}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={cancelDate} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                            <button type="button" onClick={applyDate} disabled={!tFrom} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Apply</button>
                          </div>
                        </div>
                      </div>
                    ) : preset ? (
                      <div className="p-5 flex flex-col justify-between min-h-[120px]">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Selected range</p>
                          <p className="text-sm font-semibold text-gray-800">{dispRange(tFrom, tTo)}</p>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button type="button" onClick={cancelDate} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                          <button type="button" onClick={applyDate} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-sm text-gray-400 flex items-center justify-center h-full">Select a preset or Custom Range</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <select name="center" value={filters.center} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All Centers</option>
              {centers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <select name="referralDoctor" value={filters.referralDoctor} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All Doctors</option>
              {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>

            <select name="businessType" value={filters.businessType} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All Business Types</option>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={fetchData} disabled={loading}
              className="flex gap-1.5 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-xs">
              <Search size={13}/> {loading ? "Searching..." : "Search"}
            </button>
            <button onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs">
              <RotateCcw size={13}/> Reset
            </button>
            <button onClick={handleExcel} disabled={data.length === 0}
              className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-xs">
              <FileSpreadsheet size={13}/> Excel
            </button>
          </div>

          {errors.api && <p className="text-red-600 text-xs mt-2">{errors.api}</p>}
        </div>

        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
                <tr>
                  {["Department","Count","Total Amount","Discount","Paid Amount","Balance Amount"].map(h => (
                    <th key={h} className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border border-gray-300 ${h==="Department" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-6 text-gray-500">Loading...</td></tr>
                ) : errors.api ? (
                  <tr><td colSpan={6} className="text-center p-6 text-red-500">{errors.api}</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-6 text-gray-400">{searched ? "No records found." : "Select filters and click Search."}</td></tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.id} className={i%2===0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                      <td className="px-3 py-1.5 border border-gray-200">{row.department}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.count}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.discount.toFixed(2)}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.paidAmount.toFixed(2)}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.balanceAmount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white font-semibold">
                  <tr>
                    <td className="px-3 py-1.5 text-left text-xs border border-gray-300">Total</td>
                    <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{calcTotal("count")}</td>
                    <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{calcTotal("totalAmount").toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{calcTotal("discount").toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{calcTotal("paidAmount").toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{calcTotal("balanceAmount").toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {searched && !loading && data.length > 0 && pagination && (
            <div className="mt-3 bg-white rounded shadow-md p-3 flex items-center justify-between text-xs">
              <div className="text-gray-600">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of{' '}
                {pagination.total} records
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    fetchData(newPage);
                  }}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <span className="px-3 py-1">
                  Page {currentPage} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => {
                    const newPage = Math.min(pagination.totalPages, currentPage + 1);
                    setCurrentPage(newPage);
                    fetchData(newPage);
                  }}
                  disabled={currentPage === pagination.totalPages}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>

              <div className="text-gray-600">
                Total: {pagination.total} records
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
