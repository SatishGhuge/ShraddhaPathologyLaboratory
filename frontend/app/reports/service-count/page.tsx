"use client";

import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, ChevronDown, Activity, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import * as XLSX from "xlsx";
import { getServiceCountReport } from "@/src/api/admin";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

/* ── date helpers ── */
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

export default function ServiceCount() {
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

  const [filters, setFilters] = useState({
    center: "",
    corporate: "",
    referralDoctor: "",
    inhouse: "",
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [centers, setCenters] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  const token = localStorage.getItem("token");
  const authHeader = { Authorization: `Bearer ${token}` };

  // Load dropdowns
  useEffect(() => {
    fetch(`${API}/master/departments/all`, { headers: authHeader })
      .then(r => r.json()).then(d => setDepartments(d.data || [])).catch(() => {});
    fetch(`${API}/master/collection-centers`, { headers: authHeader })
      .then(r => r.json()).then(d => setCenters(d.data || [])).catch(() => {});
    fetch(`${API}/master/corporates`, { headers: authHeader })
      .then(r => r.json()).then(d => setCorporates(d.data || [])).catch(() => {});
    fetch(`${API}/master/doctors`, { headers: authHeader })
      .then(r => r.json()).then(d => setDoctors(d.data || [])).catch(() => {});

    const handleClickOutside = (e: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDeptDropdown(false);
      if (dpRef.current && !dpRef.current.contains(e.target))
        setDpOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── date picker handlers ── */
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => { if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) => { if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const applyDate  = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const handleChange = (e: any) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const fetchData = async (page = 1) => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setLoading(true);
    setErrors({});
    try {
      const res = await getServiceCountReport({
        fromDate: dateFrom,
        toDate: dateTo || dateFrom,
        ...(filters.center && { center: filters.center }),
        ...(filters.corporate && { corporate: filters.corporate }),
        ...(filters.referralDoctor && { referralDoctor: filters.referralDoctor }),
        ...(filters.inhouse && { inhouse: filters.inhouse }),
        ...(selectedDepts.length > 0 && { departments: selectedDepts.join(",") }),
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
    setDateFrom(fmtISO(today0()));
    setDateTo(fmtISO(today0()));
    setPreset("Today");
    setCustom(false);
    setFilters({ center: "", corporate: "", referralDoctor: "", inhouse: "" });
    setSelectedDepts([]);
    setErrors({});
    setData([]);
    setSearched(false);
    setCurrentPage(1);
    setPagination(null);
  };

  const toggleDept = (name: any) =>
    setSelectedDepts(prev => prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]);

  const calcTotal = (key: any) => data.reduce((s, r) => s + (r[key] || 0), 0);

  const handleExcel = () => {
    const rows = data.map(r => ({
      "Sr.No": r.srNo, Department: r.department, "Test Name": r.testName,
      "Total Count": r.totalCount, "Unit Price": r.unitPrice.toFixed(2),
      "Total Amount": r.totalAmount.toFixed(2),
    }));
    rows.push({ "Sr.No": "", Department: "", "Test Name": "Total",
      "Total Count": calcTotal("totalCount"), "Unit Price": "",
      "Total Amount": calcTotal("totalAmount").toFixed(2) });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ServiceCount");
    XLSX.writeFile(wb, `ServiceCount_${dateFrom}.xlsx`);
  };

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(deptFilter.toLowerCase())
  );

  return (
    <>
      <Header />
      <div className="p-2 sm:p-4 bg-white min-h-screen">
        <PageHeader title="Service Count and Revenue" icon={Activity} path="Reports" />

        {/* FILTERS */}
        <div className="bg-white p-3 rounded shadow-md mb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-2">

            {/* DATE RANGE PICKER */}
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
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${preset === p.label ? "bg-blue-600 text-white font-semibold" : "text-gray-700 hover:bg-blue-50"}`}>
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
                        <div><p className="text-xs text-gray-400 mb-1">Selected range</p><p className="text-sm font-semibold text-gray-800">{dispRange(tFrom, tTo)}</p></div>
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

            <select name="corporate" value={filters.corporate} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All Corporates</option>
              {corporates.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <select name="referralDoctor" value={filters.referralDoctor} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All Doctors</option>
              {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>

            {/* Department multi-select */}
            <div className="relative" ref={dropdownRef}>
              <button type="button" onClick={() => setShowDeptDropdown(o => !o)}
                className="border border-gray-300 p-1.5 rounded w-full text-xs bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700 truncate">
                  {selectedDepts.length === 0 ? "All Departments" : `${selectedDepts.length} selected`}
                </span>
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${showDeptDropdown ? "rotate-180" : ""}`} />
              </button>
              {showDeptDropdown && (
                <div className="absolute z-50 mt-1 w-56 bg-white border border-gray-300 rounded shadow-lg max-h-72 overflow-hidden">
                  <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold">Departments</div>
                  <div className="p-2 border-b">
                    <input type="text" placeholder="Filter..." value={deptFilter}
                      onChange={e => setDeptFilter(e.target.value)}
                      className="w-full p-1 text-xs border border-gray-300 rounded focus:outline-none" />
                  </div>
                  <div className="p-2 border-b flex justify-between text-xs bg-gray-50">
                    <button onClick={() => setSelectedDepts(departments.map(d => d.name))} className="text-blue-600 hover:underline">✓ All</button>
                    <button onClick={() => setSelectedDepts([])} className="text-red-600 hover:underline">✕ Clear</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredDepts.map(d => (
                      <label key={d.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-xs text-gray-700">
                        <input type="checkbox" checked={selectedDepts.includes(d.name)}
                          onChange={() => toggleDept(d.name)} className="w-3.5 h-3.5 accent-blue-600" />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <select name="inhouse" value={filters.inhouse} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All (Inhouse + Outsource)</option>
              <option value="Inhouse">Inhouse</option>
              <option value="Outsource">Outsource</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => fetchData(1)} disabled={loading}
              className="flex gap-1.5 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-xs">
              <Search size={13} /> {loading ? "Searching..." : "Search"}
            </button>
            <button onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs">
              <RotateCcw size={13} /> Reset
            </button>
            <button onClick={() => window.print()}
              className="flex gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs">
              <Printer size={13} /> Print
            </button>
            <button onClick={handleExcel} disabled={data.length === 0}
              className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-xs">
              <FileSpreadsheet size={13} /> Excel
            </button>
          </div>

          {errors.api && <p className="text-red-600 text-xs mt-2">{errors.api}</p>}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  {["Sr.No", "Department", "Test Name", "Total Count", "Unit Price", "Total Amount"].map(h => (
                    <th key={h} className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border border-gray-300 ${["Total Count","Unit Price","Total Amount"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
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
                    <tr key={row.testId} className={i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                      <td className="px-3 py-1.5 border border-gray-200">{row.srNo}</td>
                      <td className="px-3 py-1.5 border border-gray-200">{row.department}</td>
                      <td className="px-3 py-1.5 border border-gray-200">{row.testName}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.totalCount}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-right">{row.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 text-right text-xs border border-gray-300">Total</td>
                    <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{calcTotal("totalCount")}</td>
                    <td className="px-3 py-1.5 border border-gray-300" />
                    <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{calcTotal("totalAmount").toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
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

      {/* PRINT */}
      <div className="print-only">
        <style>{`
          @media print { body * { visibility: hidden; } .print-only, .print-only * { visibility: visible; } .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; } @page { size: A4; margin: 10mm; } }
          @media screen { .print-only { display: none; } }
        `}</style>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p style={{ margin: "4px 0", fontSize: 11 }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206 | Ph. 8779295302</p>
          <hr style={{ margin: "8px 0" }} />
          <h2 style={{ fontSize: 14, fontWeight: "bold", color: "#0066cc", margin: "8px 0" }}>Service Count and Revenue Report</h2>
          <p style={{ fontSize: 11 }}>{dateFrom} {dateTo && dateTo !== dateFrom ? `to ${dateTo}` : ""}</p>
          <hr style={{ margin: "8px 0", borderStyle: "dashed" }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: "#f0f0f0", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
              {["Sr.No","Department","Test Name","Total Count","Unit Price","Total Amount"].map(h => (
                <th key={h} style={{ padding: "5px 8px", textAlign: ["Total Count","Unit Price","Total Amount"].includes(h) ? "right" : "left", border: "1px solid #000" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.testId} style={{ borderBottom: "1px dashed #ccc" }}>
                <td style={{ padding: "5px 8px", border: "1px solid #000" }}>{row.srNo}</td>
                <td style={{ padding: "5px 8px", border: "1px solid #000" }}>{row.department}</td>
                <td style={{ padding: "5px 8px", border: "1px solid #000" }}>{row.testName}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #000" }}>{row.totalCount}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #000" }}>{row.unitPrice.toFixed(2)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #000" }}>{row.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: "bold", borderTop: "2px solid #000", background: "#f0f0f0" }}>
              <td colSpan={3} style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #000" }}>Total</td>
              <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #000" }}>{calcTotal("totalCount")}</td>
              <td style={{ padding: "5px 8px", border: "1px solid #000" }} />
              <td style={{ padding: "5px 8px", textAlign: "right", border: "1px solid #000" }}>{calcTotal("totalAmount").toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
