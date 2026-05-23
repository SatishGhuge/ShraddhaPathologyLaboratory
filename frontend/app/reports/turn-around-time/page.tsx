"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  RotateCcw,
  Printer,
  FileText,
  FileSpreadsheet,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getTurnAroundTimeReport } from "@/src/api/admin.js";
import { getCollectionCenters, getCorporates } from "@/src/api/patient.js";

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

export default function TurnAroundTime() {
  // Date range picker state (matching DailyCollection.jsx pattern)
  const [dateFrom, setDateFrom] = useState(fmtISO(today0()));
  const [dateTo, setDateTo] = useState(fmtISO(today0()));
  const [dpOpen, setDpOpen] = useState(false);
  const [preset, setPreset] = useState("Today");
  const [custom, setCustom] = useState(false);
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState("");
  const [tFrom, setTFrom] = useState(fmtISO(today0()));
  const [tTo, setTTo] = useState(fmtISO(today0()));
  const now = new Date();
  const [cm, setCm] = useState(now.getMonth()===0?11:now.getMonth()-1);
  const [cy, setCy] = useState(now.getMonth()===0?now.getFullYear()-1:now.getFullYear());
  const rm = cm===11?0:cm+1, ry = cm===11?cy+1:cy;
  const dpRef = useRef(null);

  // Other filter states
  const [filters, setFilters] = useState({
    center: "",
    corporate: "",
    referralDoctor: "",
    outOfTAT: "",
    labTest: "",
    excludeOutsource: false,
  });

  const [errors, setErrors] = useState<any>({});
  const [searched, setSearched] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);

  // Fetch collection centers and corporates for dropdowns
  useEffect(() => {
    Promise.all([
      getCollectionCenters(),
      getCorporates()
    ]).then(([centersResponse, corporatesResponse]) => {
      setCenters(centersResponse || []);
      setCorporates(corporatesResponse || []);
    }).catch(error => {
      console.error('Failed to fetch dropdown data:', error);
    });

    // Load today's data by default
    const today = fmtISO(today0());
    handleSearchWithDates(today, today);

    // Close dropdowns on outside click
    const handleClickOutside = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Date picker handlers (matching DailyCollection.jsx)
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => { if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) => { if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = (target as HTMLInputElement).checked;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value,
    });
    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validate = () => {
    let err: any = {};
    if (!dateFrom) err.date = "Date Required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearchWithDates = async (fromDate, toDate) => {
    setLoading(true);
    setErrors({});
    
    try {
      // Convert to the format expected by backend
      const searchParams = {
        dateFrom: fromDate,
        dateTo: toDate,
        ...filters
      };
      
      const response = await getTurnAroundTimeReport(searchParams);
      setData(response.data || []);
      setSearched(true);
    } catch (error) {
      console.error('Failed to fetch turn around time report:', error);
      setErrors({ api: error.message || 'Failed to fetch report data' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!validate()) return;
    await handleSearchWithDates(dateFrom, dateTo);
  };

  const handleReset = () => {
    const today = fmtISO(today0());
    setDateFrom(today);
    setDateTo(today);
    setPreset("Today");
    setCustom(false);
    setFilters({
      center: "",
      corporate: "",
      referralDoctor: "",
      outOfTAT: "",
      labTest: "",
      excludeOutsource: false,
    });
    setErrors({});
    setSearched(false);
    setData([]);
    handleSearchWithDates(today, today);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-primary-50 min-h-screen">
        {/* PAGE HEADING */}
        <PageHeader 
          title="Turn Around Time" 
          icon={Clock}
          path="Reports / Other Reports"
        />

        {/* FILTER CARD */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">
          {/* FILTER GRID - Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-2 sm:mb-3">
            {/* DATE RANGE PICKER */}
            <div className="relative" ref={dpRef}>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 ${errors.date?"border-red-500":"border-gray-300"}`}>
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

            <div>
              <select
                name="center"
                value={filters.center}
                onChange={handleChange}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Center</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.name}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              name="corporate"
              value={filters.corporate}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Corporate</option>
              {corporates.map((corporate) => (
                <option key={corporate.id} value={corporate.name}>
                  {corporate.name}
                </option>
              ))}
            </select>

            <input
              name="referralDoctor"
              placeholder="Referral Doctor"
              value={filters.referralDoctor}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* FILTER GRID - Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-2 sm:mb-3">
            <select
              name="outOfTAT"
              value={filters.outOfTAT}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select Out of TAT</option>
              <option>Yes</option>
              <option>No</option>
            </select>

            <input
              name="labTest"
              placeholder="Search Laboratory Test"
              value={filters.labTest}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="excludeOutsource"
                name="excludeOutsource"
                checked={filters.excludeOutsource}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="excludeOutsource" className="text-xs sm:text-sm text-gray-700">
                Exclude Outsource
              </label>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex gap-1 sm:gap-1.5 items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
            >
              <Search size={14} className="sm:w-4 sm:h-4"/> 
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>

            <button
              onClick={handleReset}
              className="flex gap-1 sm:gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4"/> 
              <span>Reset</span>
            </button>

            {searched && (
              <>
                <button 
                  onClick={handlePrint}
                  className="flex gap-1 sm:gap-1.5 items-center bg-primary-600 hover:bg-primary-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
                  <Printer size={14} className="sm:w-4 sm:h-4"/> 
                  <span>Print</span>
                </button>

                <button className="flex gap-1 sm:gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
                  <FileText size={14} className="sm:w-4 sm:h-4"/> 
                  <span>PDF</span>
                </button>

                <button className="flex gap-1 sm:gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
                  <FileSpreadsheet size={14} className="sm:w-4 sm:h-4"/> 
                  <span>Excel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {errors.api && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{errors.api}</p>
          </div>
        )}

        {/* REPORT DATA SECTION */}
        {searched && (
          <div className="bg-white rounded shadow-md overflow-hidden">
            {/* TABLE HEADER */}
            <div className="bg-white text-black px-3 py-1.5 border-b border-gray-300">
              <h2 className="text-sm font-bold">
                Turn Around Time Report 
                {data.length > 0 && <span className="text-gray-500 ml-2">({data.length} records)</span>}
              </h2>
            </div>

            {/* TABLE */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : data.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">No data found for the selected criteria</div>
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-gradient-to-r from-slate-800 via-primary-700 to-primary-600 shadow-xl text-white sticky top-0">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Sr</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">UID</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Test</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Dr</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">TAT</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Taken</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Received</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Created</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Diff</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">TAT</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {data.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.srNo}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.patientName}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.patientUID}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.testName}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.referralDr || "-"}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.tat}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.sampleTaken}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.sampleReceived}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.resultCreated}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">{row.timeDifference}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap border border-gray-300">
                          <span
                            className={`px-2 py-0.5 rounded text-xs inline-block ${
                              row.outOfTAT === "Yes"
                                ? "bg-red-100 text-red-700"
                                : row.outOfTAT === "No"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.outOfTAT}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER NOTE */}
            <div className="bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-red-600 font-medium">
                * Time Difference = Sample Received - Result Created Date
              </p>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!searched && (
          <div className="bg-white p-3 sm:p-4 rounded shadow-md text-center text-gray-500 text-xs sm:text-sm">
            Please select filters and click search to view the report.
          </div>
        )}
      </div>

      {/* PRINT ONLY SECTION */}
      <div className="print-only">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-only, .print-only * {
              visibility: visible;
            }
            .print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
          }
          @media screen {
            .print-only {
              display: none;
            }
          }
        `}</style>

        {/* Invoice Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SILVERLEAF DIAGNOSTICS</h1>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@silverleafdiagnostics.com</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Ph. 8779295302</p>
          <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>Turn Around Time Report</h2>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>()</p>
          <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
        </div>

        {/* Invoice Details */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center', textDecoration: 'underline', margin: '20px 0' }}>INVOICE</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice To</strong></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice No:</strong> /1-202602 202602</p>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice Duration:</strong> {dispRange(dateFrom, dateTo)}</p>
            </div>
          </div>
        </div>

        {/* Description Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #000' }}>Description</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Amount(Rs.)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <td style={{ padding: '8px', borderRight: '1px solid #000' }}>
                Towards Lab Service charges ({dispRange(dateFrom, dateTo)})
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <tbody>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <td style={{ padding: '8px', width: '50%', borderRight: '1px solid #000' }}>
                <strong>(In Words)</strong><br />
                Rupees - Only
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                <strong>Payment At</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'right', marginTop: '40px', marginBottom: '20px' }}>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Thanking you</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Your Truly,</p>
        </div>

        {/* Page Break */}
        <div style={{ pageBreakAfter: 'always' }}></div>

        {/* Second Page - Data Table */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SILVERLEAF DIAGNOSTICS</h1>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@silverleafdiagnostics.com</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Ph. 8779295302</p>
            <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>Turn Around Time Report</h2>
            <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Sr</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Patient</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>UID</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Test</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Dr</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>TAT</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Taken</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Received</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Created</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Diff</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>TAT</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px dashed #ccc' }}>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.srNo}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.patientName}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.patientUID}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.testName}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.referralDr || "-"}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.tat}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.sampleTaken}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.sampleReceived}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.resultCreated}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.timeDifference}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.outOfTAT}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


