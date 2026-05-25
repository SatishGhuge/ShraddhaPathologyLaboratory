"use client";

import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getMonthlyCollectionSummary } from "@/src/api/admin.js";
import { getCollectionCenters } from "@/src/api/patient.js";

/* ── date helpers ── */
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

const AVAILABLE_COLS = [
  { id: "center",     label: "Center" },
  { id: "card",       label: "Card" },
  { id: "upi",        label: "UPI" },
  { id: "cheque",     label: "Cheque" },
  { id: "netBanking", label: "Net Banking" },
  { id: "discount",   label: "Discount" },
  { id: "refund",     label: "Refund" },
];

export default function MonthlyCollectionSummary() {
  const now = new Date();

  /* ── date picker ── */
  const [dateFrom, setDateFrom] = useState(fmtISO(som(today0())));
  const [dateTo,   setDateTo]   = useState(fmtISO(eom(today0())));
  const [dpOpen,   setDpOpen]   = useState(false);
  const [preset,   setPreset]   = useState("This Month");
  const [custom,   setCustom]   = useState(false);
  const [picking,  setPicking]  = useState(false);
  const [hover,    setHover]    = useState("");
  const [tFrom,    setTFrom]    = useState(fmtISO(som(today0())));
  const [tTo,      setTTo]      = useState(fmtISO(eom(today0())));
  const [cm, setCm] = useState(now.getMonth()===0 ? 11 : now.getMonth()-1);
  const [cy, setCy] = useState(now.getMonth()===0 ? now.getFullYear()-1 : now.getFullYear());
  const rm = cm===11 ? 0 : cm+1;
  const ry = cm===11 ? cy+1 : cy;
  const dpRef  = useRef(null);
  const colRef = useRef(null);

  /* ── filters & data ── */
  const [center,          setCenter]          = useState("");
  const [centers,         setCenters]         = useState<any[]>([]);
  const [data,            setData]            = useState<any[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [errors,          setErrors]          = useState<any>({});
  const [colOpen,         setColOpen]         = useState(false);
  const [colFilter,       setColFilter]       = useState("");
  const [selectedColumns, setSelectedColumns] = useState(["center","card","upi","cheque","netBanking","discount"]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    getCollectionCenters().then((res: any) => setCenters(Array.isArray(res) ? res : res?.data || [])).catch(() => {});
    const h = (e: any) => {
      if (dpRef.current  && !dpRef.current.contains(e.target))  setDpOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── date picker handlers ── */
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

  const handleSearch = async (page: number = 1) => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setLoading(true); setErrors({});
    try {
      const res = await getMonthlyCollectionSummary({ fromDate: dateFrom, toDate: dateTo || dateFrom, center }, page, ITEMS_PER_PAGE);
      if (res.success) {
        setData(res.data || []);
        setPagination(res.pagination || null);
      } else {
        setData(res.data || []);
        setPagination(null);
      }
    } catch (err) {
      setErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDateFrom(fmtISO(som(today0()))); setDateTo(fmtISO(eom(today0()))); setPreset("This Month"); setCustom(false);
    setCenter(""); setErrors({}); setData([]); setCurrentPage(1); setPagination(null);
    setSelectedColumns(["center","card","upi","cheque","netBanking","discount"]);
  };

  const toggleCol = (id: any) => setSelectedColumns(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const checkAll   = () => setSelectedColumns(AVAILABLE_COLS.map(c=>c.id));
  const uncheckAll = () => setSelectedColumns([]);
  const visCols    = AVAILABLE_COLS.filter(c => c.label.toLowerCase().includes(colFilter.toLowerCase()));
  const has = (id: any) => selectedColumns.includes(id);
  const total = (key: any) => data.reduce((s,r) => s + (r[key]||0), 0);
  const fmt = (n: any) => (n||0).toFixed(2);

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-white min-h-screen">
        <PageHeader title="Monthly Collection Summary" icon={Calendar} path="Reports / Other Reports" />

        {/* FILTERS */}
        <div className="bg-white p-2 sm:p-3 rounded shadow-md mb-2 sm:mb-3">
          <div className="flex flex-col sm:flex-row gap-2 mb-2">

            {/* Date range picker */}
            <div className="relative flex-1" ref={dpRef}>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 rounded w-full text-xs bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.date ? "border-red-500" : "border-gray-300"}`}>
                <span className={dateFrom ? "text-gray-800" : "text-gray-400"}>{dispRange(dateFrom, dateTo)}</span>
                <Calendar size={13} className="text-gray-400 ml-1 flex-shrink-0"/>
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

            {/* Center */}
            <div className="flex-1">
              <select value={center} onChange={e => setCenter(e.target.value)}
                className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <option value="">All Centers</option>
                {centers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Required Columns */}
            <div className="flex-1 relative" ref={colRef}>
              <button type="button" onClick={() => setColOpen(o => !o)}
                className="border border-gray-300 p-1.5 rounded w-full text-xs bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700">Required Columns ({selectedColumns.length})</span>
                <ChevronDown size={14} className={`transition-transform ${colOpen ? "rotate-180" : ""}`}/>
              </button>
              {colOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="p-2 border-b">
                    <input type="text" placeholder="Filter columns..." value={colFilter} onChange={e => setColFilter(e.target.value)}
                      className="w-full p-1.5 text-xs border border-gray-300 rounded focus:outline-none"/>
                  </div>
                  <div className="p-2 border-b flex justify-between bg-gray-50">
                    <button type="button" onClick={checkAll}   className="text-xs text-blue-600 hover:underline">✓ Check all</button>
                    <button type="button" onClick={uncheckAll} className="text-xs text-red-600 hover:underline">✕ Uncheck all</button>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {visCols.map(col => (
                      <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" checked={has(col.id)} onChange={() => toggleCol(col.id)} className="w-3.5 h-3.5 accent-blue-600"/>
                        <span className="text-xs text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={handleSearch} disabled={loading}
              className="flex gap-1 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs">
              <Search size={13}/> {loading ? "Searching..." : "Search"}
            </button>
            <button onClick={handleReset}
              className="flex gap-1 items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs">
              <RotateCcw size={13}/> Reset
            </button>
            <button onClick={() => window.print()}
              className="flex gap-1 items-center bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs">
              <Printer size={13}/> Print
            </button>
            <button className="flex gap-1 items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs">
              <FileSpreadsheet size={13}/> Excel
            </button>
          </div>
          {errors.api && <p className="text-red-600 text-xs mt-2">{errors.api}</p>}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 text-left font-semibold whitespace-nowrap border border-gray-300">Payment Date</th>
                  {has("center")     && <th className="px-2 sm:px-3 py-1.5 text-left font-semibold whitespace-nowrap border border-gray-300">Center</th>}
                  <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">Cash</th>
                  {has("card")       && <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">Card</th>}
                  {has("upi")        && <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">UPI</th>}
                  {has("cheque")     && <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">Cheque</th>}
                  {has("netBanking") && <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">Net Banking</th>}
                  {has("discount")   && <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">Discount</th>}
                  {has("refund")     && <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">Refund</th>}
                  <th className="px-2 sm:px-3 py-1.5 text-right font-semibold whitespace-nowrap border border-gray-300">Net Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr><td colSpan={20} className="text-center p-4 text-gray-500 text-xs border border-gray-300">Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={20} className="text-center p-4 text-gray-500 text-xs border border-gray-300">No Records Found</td></tr>
                ) : data.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 sm:px-3 py-1.5 text-left whitespace-nowrap border border-gray-300">{row.paymentDate}</td>
                    {has("center")     && <td className="px-2 sm:px-3 py-1.5 text-left whitespace-nowrap border border-gray-300">{row.center}</td>}
                    <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.cash)}</td>
                    {has("card")       && <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.card)}</td>}
                    {has("upi")        && <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.upi)}</td>}
                    {has("cheque")     && <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.cheque)}</td>}
                    {has("netBanking") && <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.netBanking)}</td>}
                    {has("discount")   && <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.discount)}</td>}
                    {has("refund")     && <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.refund)}</td>}
                    <td className="px-2 sm:px-3 py-1.5 text-right whitespace-nowrap border border-gray-300">{fmt(row.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <td className="px-2 sm:px-3 py-1.5 text-left text-xs border border-gray-300">Total</td>
                    {has("center")     && <td className="px-2 sm:px-3 py-1.5 border border-gray-300"/>}
                    <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("cash"))}</td>
                    {has("card")       && <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("card"))}</td>}
                    {has("upi")        && <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("upi"))}</td>}
                    {has("cheque")     && <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("cheque"))}</td>}
                    {has("netBanking") && <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("netBanking"))}</td>}
                    {has("discount")   && <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("discount"))}</td>}
                    {has("refund")     && <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("refund"))}</td>}
                    <td className="px-2 sm:px-3 py-1.5 text-right text-xs whitespace-nowrap border border-gray-300">{fmt(total("netAmount"))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {data.length > 0 && pagination && (
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
                    handleSearch(newPage);
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
                    handleSearch(newPage);
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

      {/* PRINT */}
      <div className="print-only">
        <style>{`@media print{body *{visibility:hidden}.print-only,.print-only *{visibility:visible}.print-only{position:absolute;left:0;top:0;width:100%;padding:20px}@page{size:A4;margin:10mm}}@media screen{.print-only{display:none}}`}</style>
        <div style={{textAlign:"center",marginBottom:"16px"}}>
          <h1 style={{fontSize:"20px",fontWeight:"bold",margin:0}}>SILVERLEAF DIAGNOSTICS</h1>
          <p style={{margin:"4px 0",fontSize:"11px"}}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <hr style={{margin:"8px 0",border:"1px solid #000"}}/>
          <h2 style={{fontSize:"14px",fontWeight:"bold",color:"#0066cc",margin:"8px 0"}}>Monthly Collection Summary</h2>
          <p style={{margin:"4px 0",fontSize:"11px"}}>Period: {dispRange(dateFrom, dateTo)}</p>
          <hr style={{margin:"8px 0",border:"1px dashed #000"}}/>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"9px"}}>
          <thead><tr style={{backgroundColor:"#f0f0f0"}}>
            <th style={{padding:"5px",border:"1px solid #000",textAlign:"left"}}>Payment Date</th>
            {has("center")     && <th style={{padding:"5px",border:"1px solid #000",textAlign:"left"}}>Center</th>}
            <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Cash</th>
            {has("card")       && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Card</th>}
            {has("upi")        && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>UPI</th>}
            {has("cheque")     && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Cheque</th>}
            {has("netBanking") && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Net Banking</th>}
            {has("discount")   && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Discount</th>}
            {has("refund")     && <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Refund</th>}
            <th style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>Net Amount</th>
          </tr></thead>
          <tbody>{data.map((row,i) => (
            <tr key={i}>
              <td style={{padding:"5px",border:"1px solid #000"}}>{row.paymentDate}</td>
              {has("center")     && <td style={{padding:"5px",border:"1px solid #000"}}>{row.center}</td>}
              <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.cash)}</td>
              {has("card")       && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.card)}</td>}
              {has("upi")        && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.upi)}</td>}
              {has("cheque")     && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.cheque)}</td>}
              {has("netBanking") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.netBanking)}</td>}
              {has("discount")   && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.discount)}</td>}
              {has("refund")     && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.refund)}</td>}
              <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(row.netAmount)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{fontWeight:"bold",backgroundColor:"#f0f0f0"}}>
            <td style={{padding:"5px",border:"1px solid #000"}}>Total</td>
            {has("center")     && <td style={{padding:"5px",border:"1px solid #000"}}/>}
            <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("cash"))}</td>
            {has("card")       && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("card"))}</td>}
            {has("upi")        && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("upi"))}</td>}
            {has("cheque")     && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("cheque"))}</td>}
            {has("netBanking") && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("netBanking"))}</td>}
            {has("discount")   && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("discount"))}</td>}
            {has("refund")     && <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("refund"))}</td>}
            <td style={{padding:"5px",border:"1px solid #000",textAlign:"right"}}>{fmt(total("netAmount"))}</td>
          </tr></tfoot>
        </table>
      </div>
    </>
  );
}
