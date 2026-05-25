"use client";

import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, FileSpreadsheet, ChevronDown, FlaskConical, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getTestReport } from "@/src/api/admin";
import { getTests } from "@/src/api/master";
import { getCollectionCenters } from "@/src/api/patient";

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

export default function TestReport() {
  const now = new Date();

  /* ── date picker state ── */
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

  /* ── other filter state ── */
  const [filters, setFilters] = useState({
    patientUid: "",
    patientName: "",
    location: "",
    corporates: "",
    referralDoctor: "",
  });

  const [conditionalSearch, setConditionalSearch] = useState({
    parameter: "",
    operator: "",
    value: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [testFilter, setTestFilter] = useState("");
  const dropdownRef = useRef(null);

  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [selectedTests,  setSelectedTests]  = useState<any[]>([]);
  const [centers,        setCenters]        = useState<any[]>([]);
  const [data,           setData]           = useState<any[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  /* ── initial data load ── */
  useEffect(() => {
    Promise.all([getTests(), getCollectionCenters()])
      .then(([testsData, centersData]) => {
        setAvailableTests(testsData.map(t => ({ id: t.id, label: t.name })));
        setCenters(centersData);
      })
      .catch(() => {});
  }, []);

  /* ── close dropdowns on outside click ── */
  useEffect(() => {
    const h = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowTestDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── date picker handlers ── */
  const openPicker  = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => {
    if (!p.fn) { setCustom(true); setPreset("Custom Range"); setTFrom(""); setTTo(""); setPicking(false); return; }
    const [a,b] = p.fn(); setTFrom(a); setTTo(b); setPreset(p.label); setCustom(false);
  };
  const clickDay = (day: any) => {
    if (!picking) { setTFrom(day); setTTo(""); setPicking(true); setHover(""); }
    else { if (day < tFrom) { setTTo(tFrom); setTFrom(day); } else setTTo(day); setPicking(false); }
  };
  const applyDate   = () => { setDateFrom(tFrom); setDateTo(tTo); setDpOpen(false); setPicking(false); };
  const cancelDate  = () => { setDpOpen(false); setCustom(false); setPicking(false); setTFrom(dateFrom); setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleConditionalChange = (e: any) => {
    const { name, value } = e.target;
    setConditionalSearch(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (page: number = 1) => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setLoading(true);
    setErrors({});
    try {
      const response = await getTestReport({
        fromDate: dateFrom,
        toDate: dateTo || dateFrom,
        patientUid: filters.patientUid,
        patientName: filters.patientName,
        location: filters.location,
        corporate: filters.corporates,
        referralDoctor: filters.referralDoctor,
        testIds: selectedTests,
        parameter: conditionalSearch.parameter,
        operator: conditionalSearch.operator,
        value: conditionalSearch.value,
      }, page, ITEMS_PER_PAGE);
      
      if (response.success) {
        setData(response.data || []);
        setPagination(response.pagination || null);
      } else {
        setData(response.data || []);
        setPagination(null);
      }
    } catch (error) {
      setErrors({ api: error.message || 'Failed to fetch data' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDateFrom(fmtISO(today0())); setDateTo(fmtISO(today0())); setPreset("Today");
    setCustom(false);
    setFilters({ patientUid: "", patientName: "", location: "", corporates: "", referralDoctor: "" });
    setConditionalSearch({ parameter: "", operator: "", value: "" });
    setErrors({});
    setData([]);
    setSelectedTests([]);
  };

  const toggleTest = (id: any) => setSelectedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleCheckAllTests = ()   => setSelectedTests(availableTests.map(t => t.id));
  const handleUncheckAll    = ()   => setSelectedTests([]);

  const filteredTests = availableTests.filter(t =>
    t.label.toLowerCase().includes(testFilter.toLowerCase())
  );

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-white min-h-screen">

        <PageHeader title="Patient Test Report" icon={FlaskConical} path="Reports" />

        <div className="bg-white p-2 sm:p-3 rounded shadow-md mb-2 sm:mb-3">

          {/* Row 1: Date picker, Patient UID, Patient Name, Location */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 mb-1.5">

            {/* Date range picker */}
            <div className="relative col-span-2 sm:col-span-1" ref={dpRef}>
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

            <input name="patientUid" placeholder="Patient UID" value={filters.patientUid} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            <input name="patientName" placeholder="Patient Name" value={filters.patientName} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 col-span-2" />
            <select name="location" value={filters.location} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 col-span-2">
              <option value="">Select Location</option>
              {centers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Row 2: Corporates, Referral Doctor, Test Selector, Conditional Search */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 mb-1.5">
            <select name="corporates" value={filters.corporates} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Corporates</option>
              <option>Walkin</option>
              <option>Corporate A</option>
              <option>Corporate B</option>
            </select>
            <input name="referralDoctor" placeholder="Referral Doctor" value={filters.referralDoctor} onChange={handleChange}
              className="border border-gray-300 p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500" />

            {/* Test multi-select */}
            <div className="relative" ref={dropdownRef}>
              <button type="button" onClick={() => setShowTestDropdown(!showTestDropdown)}
                className="border border-gray-300 p-1.5 rounded w-full text-xs bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700 truncate">Tests ({selectedTests.length})</span>
                <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${showTestDropdown ? "rotate-180" : ""}`} />
              </button>
              {showTestDropdown && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="p-2 border-b">
                    <input type="text" placeholder="Filter tests..." value={testFilter}
                      onChange={(e) => setTestFilter(e.target.value)}
                      className="w-full p-1.5 text-xs border border-gray-300 rounded focus:outline-none" />
                  </div>
                  <div className="p-2 border-b flex justify-between bg-gray-50">
                    <button type="button" onClick={handleCheckAllTests} className="text-xs text-blue-600 hover:underline">✓ All</button>
                    <button type="button" onClick={handleUncheckAll} className="text-xs text-red-600 hover:underline">✕ Clear</button>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredTests.map((test) => (
                      <label key={test.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" checked={selectedTests.includes(test.id)} onChange={() => toggleTest(test.id)}
                          className="w-3.5 h-3.5 accent-blue-600" />
                        <span className="text-xs text-gray-700">{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <select name="parameter" value={conditionalSearch.parameter} onChange={handleConditionalChange}
              className="border border-gray-300 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 col-span-2">
              <option value="">Select Parameter</option>
              <option>Age</option>
              <option>Gender</option>
              <option>Mobile</option>
              <option>Corporate</option>
              <option>LR Number</option>
            </select>
            <select name="operator" value={conditionalSearch.operator} onChange={handleConditionalChange}
              className="border border-gray-300 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">Op</option>
              <option>=</option>
              <option>!=</option>
              <option>&gt;</option>
              <option>&lt;</option>
              <option>&gt;=</option>
              <option>&lt;=</option>
              <option>LIKE</option>
            </select>
            <input name="value" placeholder="Value" value={conditionalSearch.value} onChange={handleConditionalChange}
              className="border border-gray-300 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500" />
          </div>

          {/* Row 3: Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => handleSearch(1)} disabled={loading}
              className="flex gap-1 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs">
              <Search size={13}/> {loading ? 'Searching...' : 'Search'}
            </button>
            <button onClick={handleReset}
              className="flex gap-1 items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs">
              <RotateCcw size={13}/> Reset
            </button>
            <button className="flex gap-1 items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs">
              <FileSpreadsheet size={13}/> Excel
            </button>
          </div>

          {errors.api && <p className="text-red-600 text-xs mt-2">{errors.api}</p>}

        </div>

        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-900 text-white shadow-xl">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Sr.No.</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Date</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient UID</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Referral</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Gender</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Age</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">LR Number</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Mobile</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Corporate</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Address</th>
                  {selectedTests.map((testId) => {
                    const test = availableTests.find(t => t.id === testId);
                    return (
                      <th key={testId} className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                        {test?.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr><td colSpan={11 + selectedTests.length} className="text-center p-4 text-gray-500 text-xs border border-gray-300">Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={11 + selectedTests.length} className="text-center p-4 text-gray-500 text-xs border border-gray-300">No Records Found</td></tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.visitId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.srNo}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.date}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.patientName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.patientUid}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.referral}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.gender}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.age}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.lrNumber}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.mobile}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.corporate}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">{row.address}</td>
                      {selectedTests.map((testId) => (
                        <td key={testId} className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300">
                          {row.testResults?.[testId] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
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
    </>
  );
}

