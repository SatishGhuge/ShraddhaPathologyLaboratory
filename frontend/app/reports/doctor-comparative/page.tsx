"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Download, RotateCcw, Printer } from "lucide-react";
import Header from "@/src/components/Header";
import PaginationControls from "@/app/components/PaginationControls";

const toGB = (iso: any) => { if(!iso) return "-"; const d=new Date(iso); return d.toLocaleDateString("en-GB"); };
const fmtISO = (d: any) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const dispRange = (f: any, t: any) => { if(!f) return "Select Date Range"; const a=toGB(f),b=t?toGB(t):a; return a===b?a:`${a} - ${b}`; };
const toNumber = (val: any) => {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (val.toNumber) return val.toNumber();
  return 0;
};

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

const Page = () => {
  const [data, setData] = useState<any[]>([]);
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [colOpen, setColOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pagination, setPagination] = useState<any>(null);
  
  const [dpOpen, setDpOpen] = useState(false);
  const [preset, setPreset] = useState("All Dates");
  const [custom, setCustom] = useState(false);
  const [tFrom, setTFrom] = useState("");
  const [tTo, setTTo] = useState("");
  const [hover, setHover] = useState("");
  const [picking, setPicking] = useState(false);
  const now = new Date();
  const [cm, setCm] = useState(now.getMonth()===0?11:now.getMonth()-1);
  const [cy, setCy] = useState(now.getMonth()===0?now.getFullYear()-1:now.getFullYear());
  const rm = cm===11?0:cm+1, ry = cm===11?cy+1:cy;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const dpRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Auto-fetch data on mount and when date filters change
  useEffect(() => {
    // Only fetch if dates are set and not empty
    if (dateFrom && dateTo) {
      fetchData();
    }
  }, [dateFrom, dateTo]);

  // Update pagination when itemsPerPage changes
  useEffect(() => {
    if (pagination && data.length > 0) {
      const newTotalPages = Math.ceil(data.length / itemsPerPage);
      setPagination({
        ...pagination,
        limit: itemsPerPage,
        totalPages: newTotalPages,
        page: 1
      });
      setCurrentPage(1);
    }
  }, [itemsPerPage]);

  // Date picker handlers
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => { 
    if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} 
    const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); 
  };
  const clickDay = (day: any) => { 
    if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}
    else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} 
  };
  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  // Column helpers
  const toggleMonth = (monthNum: string) => {
    setSelectedMonths(prev => {
      // Check if this month is currently selected (by checking if any key ends with this month)
      const isSelected = prev.some(m => {
        if(m.includes('-')) {
          return m.endsWith(`-${monthNum}`);
        }
        return m === monthNum;
      });
      
      if(isSelected) {
        // Remove this month
        return prev.filter(m => {
          if(m.includes('-')) {
            return !m.endsWith(`-${monthNum}`);
          }
          return m !== monthNum;
        });
      } else {
        // Add this month - use the format from allMonths if available
        if(allMonths.length > 0 && allMonths[0].includes('-')) {
          // We have YYYY-MM format data, use it
          const year = allMonths[0].split('-')[0];
          return [...prev, `${year}-${monthNum}`];
        } else {
          // Use MM format
          return [...prev, monthNum];
        }
      }
    });
  };

  const selectAllMonths = () => {
    const allMonthNums = Array.from({length:12},(_,i)=>`${String(i+1).padStart(2,'0')}`);
    if(allMonths.length > 0 && allMonths[0].includes('-')) {
      // Use YYYY-MM format
      const year = allMonths[0].split('-')[0];
      setSelectedMonths(allMonthNums.map(m => `${year}-${m}`));
    } else {
      // Use MM format
      setSelectedMonths(allMonthNums);
    }
  };
  const deselectAllMonths = () => setSelectedMonths([]);

  const fetchData = async () => {
    setLoading(true);
    setErrors({});
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams();

      if (dateFrom) params.append('fromDate', dateFrom);
      if (dateTo) params.append('toDate', dateTo);
      
      const response = await fetch(`${apiUrl}/doctor-comparative-report/report?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const result = await response.json();

      if (result.data) {
        const fetchedData = Array.isArray(result.data) ? result.data : [];
        setData(fetchedData);
        
        // Set pagination metadata
        const total = fetchedData.length;
        const totalPages = Math.ceil(total / itemsPerPage);
        setPagination({
          page: 1,
          limit: itemsPerPage,
          total: total,
          totalPages: totalPages,
          hasMore: totalPages > 1
        });
        
        if (result.months && Array.isArray(result.months)) {
          setAllMonths(result.months);
          // Auto-select months that have data
          // Backend returns months as YYYY-MM format
          setSelectedMonths(result.months);
        } else {
          // No months with data, clear selection
          setSelectedMonths([]);
        }
      } else {
        setData([]);
        setPagination(null);
        setSelectedMonths([]);
        setErrors({ api: result.message || 'Failed to fetch data' });
      }
    } catch (error: any) {
      console.error('Error:', error);
      setErrors({ api: error.message || 'Failed to fetch data' });
      setData([]);
      setPagination(null);
      setSelectedMonths([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) return;
    
    const sortedMonths = selectedMonths.sort((a: string, b: string) => {
      const monthA = a.includes('-') ? parseInt(a.split('-')[1]) : parseInt(a);
      const monthB = b.includes('-') ? parseInt(b.split('-')[1]) : parseInt(b);
      return monthA - monthB;
    });
    
    const headers = ['Doctor Name', ...sortedMonths.map(monthKey => {
      let label = "";
      if(monthKey.includes('-')) {
        const [year, month] = monthKey.split('-');
        label = `${MOS[parseInt(month) - 1]} ${year}`;
      } else {
        label = MOS[parseInt(monthKey) - 1];
      }
      return label;
    }), 'Total Patients'];

    const rows = data.map(row => [
      row.doctorName,
      ...sortedMonths.map(monthKey => row[monthKey] || 0),
      row.totalPatients
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-comparative-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setPreset("All Dates");
    setCustom(false);
    setTFrom("");
    setTTo("");
    setErrors({});
    setSelectedMonths([]);
    setData([]);
    setCurrentPage(1);
  };

  // Pagination helpers
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  return (
    <>
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          * {
            margin: 0;
            padding: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
            width: 100%;
            height: 100%;
          }
          html {
            margin: 0;
            padding: 0;
          }
          header, nav, .header, .Header, aside, .sidebar, .menu, .no-print {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-only {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 20px !important;
            page-break-after: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
          .no-print {
            display: block !important;
          }
        }
      `}</style>

      {/* PRINT ONLY CONTENT */}
      <div className="print-only">
        {/* Generate pages for print */}
        {Array.from({ length: totalPages }, (_, pageNum) => {
          const pageStartIdx = pageNum * itemsPerPage;
          const pageEndIdx = pageStartIdx + itemsPerPage;
          const pageData = data.slice(pageStartIdx, pageEndIdx);
          
          return (
            <div key={pageNum} style={{pageBreakAfter: pageNum < totalPages - 1 ? 'always' : 'auto', marginBottom: pageNum < totalPages - 1 ? '20px' : '0'}}>
              <div style={{textAlign: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #000'}}>
                <h2 style={{margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold'}}>SHRADDHA PATHOLOGY LABORATORY</h2>
                <p style={{margin: '0 0 5px 0', fontSize: '14px'}}>Doctor Comparative Report</p>
                <p style={{margin: '0', fontSize: '12px', color: '#666'}}>Generated: {new Date().toLocaleDateString('en-GB')}</p>
              </div>

              <div style={{marginBottom: '15px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #999'}}>
                <div><strong>Period:</strong> {dateFrom && dateTo ? `${toGB(dateFrom)} to ${toGB(dateTo)}` : 'All Dates'}</div>
                <div><strong>Total Doctors:</strong> {data.length}</div>
                <div><strong>Months:</strong> {allMonths.length}</div>
              </div>

              {pageData.length > 0 ? (
                <table style={{width: '100%', borderCollapse: 'collapse', margin: '15px 0', fontSize: '12px'}}>
                  <thead>
                    <tr style={{backgroundColor: '#f0f0f0'}}>
                      <th style={{textAlign: 'left', fontWeight: 'bold', border: '1px solid #000'}}>Doctor Name</th>
                      {selectedMonths.sort((a: string, b: string) => {
                        const monthA = a.includes('-') ? parseInt(a.split('-')[1]) : parseInt(a);
                        const monthB = b.includes('-') ? parseInt(b.split('-')[1]) : parseInt(b);
                        return monthA - monthB;
                      }).map((monthKey: string) => {
                        let label = "";
                        if(monthKey.includes('-')) {
                          const [year, month] = monthKey.split('-');
                          label = `${MOS[parseInt(month) - 1]} ${year}`;
                        } else {
                          label = MOS[parseInt(monthKey) - 1];
                        }
                        return (
                          <th key={monthKey} style={{textAlign: 'center', fontWeight: 'bold', border: '1px solid #000'}}>
                            {label}
                          </th>
                        );
                      })}
                      <th style={{textAlign: 'center', fontWeight: 'bold', border: '1px solid #000'}}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((row, i) => (
                      <tr key={i}>
                        <td style={{textAlign: 'left', fontWeight: 'bold', border: '1px solid #999'}}>
                          {row.doctorName}
                        </td>
                        {selectedMonths.sort((a: string, b: string) => {
                          const monthA = a.includes('-') ? parseInt(a.split('-')[1]) : parseInt(a);
                          const monthB = b.includes('-') ? parseInt(b.split('-')[1]) : parseInt(b);
                          return monthA - monthB;
                        }).map((monthKey: string) => {
                          const count = toNumber(row[monthKey]) || 0;
                          return (
                            <td key={monthKey} style={{textAlign: 'center', border: '1px solid #999'}}>
                              {count}
                            </td>
                          );
                        })}
                        <td style={{textAlign: 'center', fontWeight: 'bold', border: '1px solid #999'}}>
                          {toNumber(row.totalPatients) || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              <div style={{marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #999', fontSize: '11px', color: '#666', textAlign: 'center'}}>
                <p style={{margin: '0 0 5px 0'}}>Shraddha Pathology Laboratory</p>
                <p style={{margin: '0'}}>Page {pageNum + 1} of {totalPages}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* SCREEN VIEW */}
      <Header />
      <div className="no-print">
      <div className="p-2 sm:p-3 bg-white min-h-screen">
        
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

            {/* REQUIRED COLUMNS - MONTHS SELECTOR */}
            <div className="relative" ref={colRef}>
              <button type="button" onClick={()=>setColOpen(o=>!o)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700">Months: {selectedMonths.length}/12</span>
                <ChevronDown size={14} className={`transition-transform ${colOpen?"rotate-180":""}`}/>
              </button>
              {colOpen && (
                <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold">Select Months</div>
                  <div className="p-2 border-b border-gray-200 flex justify-between bg-gray-50 text-xs">
                    <button onClick={()=>setSelectedMonths(Array.from({length:12},(_,i)=>`${String(i+1).padStart(2,'0')}`).map(m => {
                      // Convert to YYYY-MM format if we have months with data, otherwise keep MM format
                      if(allMonths.length > 0 && allMonths[0].includes('-')) {
                        const year = allMonths[0].split('-')[0];
                        return `${year}-${m}`;
                      }
                      return m;
                    }))} className="text-blue-600 font-semibold hover:underline">✓ Check all</button>
                    <button onClick={deselectAllMonths} className="text-blue-600 font-semibold hover:underline">✕ Uncheck all</button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {Array.from({length:12},(_,i)=>`${String(i+1).padStart(2,'0')}`).map(monthNum=>{
                      const monthName=MOS[parseInt(monthNum)-1];
                      // Check if this month has data
                      const hasData = allMonths.some(m => {
                        if(m.includes('-')) {
                          return m.endsWith(`-${monthNum}`);
                        }
                        return m === monthNum;
                      });
                      
                      // Check if this month is selected
                      const isSelected = selectedMonths.some(m => {
                        if(m.includes('-')) {
                          return m.endsWith(`-${monthNum}`);
                        }
                        return m === monthNum;
                      });
                      
                      return(
                        <label key={monthNum} className={`flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-xs text-gray-700 ${isSelected?"bg-gray-50":""}`}>
                          <input type="checkbox" checked={isSelected} onChange={()=>toggleMonth(monthNum)} className="w-4 h-4 accent-slate-900"/>
                          <span>{monthName}</span>
                          {hasData && <span className="text-xs text-gray-400">(has data)</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* EMPTY SLOTS FOR GRID ALIGNMENT */}
            <div></div>
            <div></div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <RotateCcw size={14}/> Reset
            </button>
            <button onClick={()=>window.print()}
              className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Printer size={14}/> Print
            </button>
            <button onClick={handleExport} disabled={data.length === 0}
              className="flex gap-1.5 items-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Download size={14}/> Export
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 text-left sticky left-0 bg-slate-900 z-10 min-w-40">Doctor Name</th>
                  {selectedMonths.sort((a: string, b: string) => {
                    // Extract month numbers for sorting (handles both YYYY-MM and MM formats)
                    const monthA = a.includes('-') ? parseInt(a.split('-')[1]) : parseInt(a);
                    const monthB = b.includes('-') ? parseInt(b.split('-')[1]) : parseInt(b);
                    return monthA - monthB;
                  }).map((monthKey: string) => {
                    let monthLabel = "";
                    let yearLabel = "";
                    
                    if(monthKey.includes('-')) {
                      // Backend format: YYYY-MM
                      const [year, month] = monthKey.split('-');
                      monthLabel = MOS[parseInt(month) - 1];
                      // Only show year if multiple years are present
                      if(selectedMonths.some((m: string) => m.includes('-') && m.split('-')[0] !== year)) {
                        yearLabel = ` '${year.slice(2)}`; // Show as 'YY
                      }
                    } else {
                      // Month number format: MM
                      monthLabel = MOS[parseInt(monthKey) - 1];
                    }
                    
                    return(
                      <th key={monthKey} className="px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 text-center bg-slate-900">
                        {monthLabel}{yearLabel}
                      </th>
                    );
                  })}
                  <th className="px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 text-center bg-slate-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading?(
                  <tr><td colSpan={selectedMonths.length+2} className="text-center p-4 text-gray-500">⏳ Loading data from database...</td></tr>
                ):errors.api?(
                  <tr><td colSpan={selectedMonths.length+2} className="text-center p-4 text-red-600">
                    <div className="font-semibold">❌ Error: {errors.api}</div>
                  </td></tr>
                ):paginatedData.length===0?(
                  <tr><td colSpan={selectedMonths.length+2} className="text-center p-4 text-gray-500">
                    📭 No records found - select a date range to view data
                  </td></tr>
                ):(
                  <>
                    {paginatedData.map((row,i)=>(
                      <tr key={i} className={i%2===0?"bg-white hover:bg-gray-50":"bg-gray-50 hover:bg-gray-100"}>
                        <td className="px-2 py-1.5 text-xs border border-gray-200 text-left sticky left-0 bg-inherit font-semibold min-w-40">{row.doctorName}</td>
                        {selectedMonths.sort((a: string, b: string) => {
                          // Extract month numbers for sorting
                          const monthA = a.includes('-') ? parseInt(a.split('-')[1]) : parseInt(a);
                          const monthB = b.includes('-') ? parseInt(b.split('-')[1]) : parseInt(b);
                          return monthA - monthB;
                        }).map((monthKey: string) => {
                          let count = 0;
                          // Look for the data in the row using the monthKey (YYYY-MM format from backend)
                          if (row[monthKey] !== undefined) {
                            count = toNumber(row[monthKey]) || 0;
                          }
                          return (
                            <td key={monthKey} className="px-2 py-1.5 text-xs text-center border border-gray-200 font-semibold">
                              {count}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5 text-xs text-center border border-gray-200 font-bold">
                          {toNumber(row.totalPatients)||0}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          <PaginationControls
            pagination={pagination}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
            isLoading={loading}
          />
        </div>
      </div>
      </div>
    </>
  );
};

export default Page;
