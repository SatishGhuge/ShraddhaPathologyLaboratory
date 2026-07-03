"use client";

import { useState, useEffect, useRef } from "react";
import { DollarSign, Download, Search, RotateCcw, ChevronDown, Printer, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import * as XLSX from 'xlsx';

/* ── date helpers ── */
const toYMD = (iso: any) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const toGB = (iso: any) => { if (!iso) return "-"; const d = new Date(iso); return d.toLocaleDateString("en-GB"); };
const fmtISO = (d: any) => {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
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

const COLS = [
  { key: "date", label: "Date" },
  { key: "visitId", label: "Visit ID" },
  { key: "organization", label: "Organization" },
  { key: "billAmount", label: "Bill Amount" },
  { key: "discountRuntime", label: "Discount (R)" },
  { key: "discountSpecial", label: "Discount (S)" },
  { key: "netAmount", label: "Net Amount" },
  { key: "paymentMode", label: "Payment Mode" },
];

export default function ReferralDoctorRevenueReport() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  
  // Date picker state
  const [dateFrom, setDateFrom] = useState(fmtISO(today0()));
  const [dateTo, setDateTo] = useState(fmtISO(today0()));
  const [open, setOpen] = useState(false);
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
  
  // Doctor search state
  const [doctorSearch, setDoctorSearch] = useState<string>("");
  const [doctorOpen, setDoctorOpen] = useState(false);
  const doctorRef = useRef(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  
  // Filtered doctors based on search
  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(doctorSearch.toLowerCase())
  );
  
  // Filters
  const [searchPatient, setSearchPatient] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("");
  
  // Column selector
  const [selCols, setSelCols] = useState<Record<string, boolean>>(
    Object.fromEntries(COLS.map(c => [c.key, true]))
  );
  const [colOpen, setColOpen] = useState(false);
  const [colQ, setColQ] = useState("");
  const colRef = useRef(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 40;
  
  // Delete tracking (client-side only)
  const [deletedRows, setDeletedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDoctors();
    // Don't call fetchTransactions here yet - wait for state to be ready
  }, []);

  // Fetch transactions after component mounts with initial dates
  useEffect(() => {
    console.log('📅 Initial load: Fetching transactions with dateFrom:', dateFrom, 'dateTo:', dateTo);
    fetchTransactions();
  }, []);

  // Auto-filter when date range or filters change (AFTER allTransactions is populated)
  useEffect(() => {
    // Trigger search if we have transactions loaded
    if (allTransactions.length > 0) {
      console.log('🔄 Transactions loaded, applying filters');
      handleSearch();
    }
    // Removed dependencies from this hook to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTransactions]);

  // Handle filter changes
  useEffect(() => {
    if (allTransactions.length > 0) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, selectedDoctor, searchPatient, paymentModeFilter, deletedRows]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false);
      if (doctorRef.current && !doctorRef.current.contains(e.target)) setDoctorOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/doctors`);
      const result = await response.json();
      if (result.success) {
        setDoctors(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Use new backend endpoint that handles all joining and filtering
      const url = `${process.env.NEXT_PUBLIC_API_URL}/results/doctor-revenue?fromDate=${dateFrom}&toDate=${dateTo}`;
      console.log('🚀 Calling endpoint:', url);
      console.log('   dateFrom:', dateFrom);
      console.log('   dateTo:', dateTo);
      
      const response = await fetch(url);
      const result = await response.json();
      
      console.log('📥 Backend response status:', response.status);
      console.log('📥 Backend response:', {
        success: result.success,
        count: result.data?.length,
        data: result.data
      });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log(`✅ API returned ${result.data.length} records`);
        
        // Backend already provides formatted data with doctor charges linked
        const transactions = result.data.map((item: any) => ({
          id: `${item.id}-${item.patientId}`,
          patientName: item.patientName,
          testName: item.testName,
          organization: item.organization,
          visitId: item.visitId,
          doctorName: item.doctorName,
          billAmount: item.billAmount,
          discountRuntime: item.discountR,  // Regular price from doctor charges
          discountSpecial: item.discountS,  // Special price from doctor charges
          netAmount: item.netAmount,  // What doctor gets
          paymentMode: item.paymentMode,
          paymentStatus: item.paymentStatus,
          date: item.visitDate,
        }));
        
        console.log(`✅ Mapped ${transactions.length} transactions`);
        console.log('   First transaction:', transactions[0]);
        setAllTransactions(transactions);
        setFilteredData(transactions); // Also set filtered data immediately
      } else {
        console.warn('⚠️ No data returned or error in response:', result);
        setAllTransactions([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch transactions:", error);
      setAllTransactions([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const openPicker=()=>{ setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setOpen(true); };
  const pickPreset = (p: any) =>{ if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) =>{ if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const apply=()=>{ setDateFrom(tFrom);setDateTo(tTo);setOpen(false);setPicking(false); };
  const cancel=()=>{ setOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM=()=>{ if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM=()=>{ if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const handleSelectDoctor = (doctorName: string) => {
    setDoctorSearch(doctorName);
    setSelectedDoctor(doctorName);
    setDoctorOpen(false);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setSearched(true);
    
    let filtered = allTransactions;
    
    // If no transactions, return empty
    if (!filtered || filtered.length === 0) {
      setFilteredData([]);
      return;
    }

    // Filter by date range (REQUIRED - always applied)
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= fromDate;
      });
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const tDate = new Date(t.date);
        return tDate <= toDate;
      });
    }

    // Filter by doctor (OPTIONAL - only if selected)
    if (selectedDoctor && selectedDoctor.trim() !== "") {
      // Normalize both names for comparison
      const normalizeDoctor = (name: string) => {
        return name
          .toLowerCase()
          .trim()
          .replace(/^dr\.\s+/, '')  // Remove "Dr. " prefix
          .replace(/\s+/g, ' ');     // Normalize spaces
      };
      
      const selectedDoctorNorm = normalizeDoctor(selectedDoctor);
      filtered = filtered.filter((t) => {
        const dataDoctorNorm = normalizeDoctor(t.doctorName || '');
        return dataDoctorNorm === selectedDoctorNorm;
      });
      
      console.log('🔍 Doctor filter applied:', selectedDoctor, '-> showing', filtered.length, 'records');
    }

    // Filter by patient name (OPTIONAL - only if typed)
    if (searchPatient && searchPatient.trim() !== "") {
      filtered = filtered.filter((t) =>
        t.patientName.toLowerCase().includes(searchPatient.toLowerCase())
      );
    }

    // Filter by payment mode (OPTIONAL - only if selected)
    if (paymentModeFilter && paymentModeFilter.trim() !== "") {
      filtered = filtered.filter((t) => {
        const mode = (t.paymentMode || '').trim();
        return mode === paymentModeFilter;
      });
    }

    // Filter out deleted rows
    filtered = filtered.filter((t) => !deletedRows.has(t.id));

    setFilteredData(filtered);
  };

  const handleReset = () => {
    setDoctorSearch("");
    setSelectedDoctor("");
    setPaymentModeFilter("");
    setDateFrom(fmtISO(today0()));
    setDateTo(fmtISO(today0()));
    setSearchPatient("");
    setCurrentPage(1);
    setSearched(false);
    setDeletedRows(new Set());
    setFilteredData([]);
    setPreset("Today");
  };

  const handleDeleteRow = (rowId: string) => {
    const updated = new Set(deletedRows);
    if (updated.has(rowId)) {
      updated.delete(rowId);
    } else {
      updated.add(rowId);
    }
    setDeletedRows(updated);
    
    // Re-filter to reflect deletion
    const newFiltered = filteredData.filter((t) => !updated.has(t.id));
    setFilteredData(newFiltered);
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map((item, index) => {
      const row: any = { "Sr.No": index + 1 };
      vis.forEach((col) => {
        if (col.key === "date") {
          row[col.label] = new Date(item.date).toLocaleDateString("en-GB");
        } else if (col.key === "billAmount" || col.key === "receivedAmount" || col.key === "discountRuntime" || col.key === "discountSpecial" || col.key === "netAmount") {
          row[col.label] = Number(item[col.key]).toFixed(2);
        } else {
          row[col.label] = item[col.key] ?? "-";
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Revenue");
    
    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Referral_Doctor_Revenue_${date}.xlsx`);
  };

  // Calculate visible columns
  const vis = COLS.filter(c => selCols[c.key]);
  const selCount = Object.values(selCols).filter(Boolean).length;

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Group transactions by visitId to show doctor name only once per visit
  const groupedTransactions = () => {
    const groups: { [key: string]: any[] } = {};
    paginatedData.forEach(row => {
      if (!groups[row.visitId]) {
        groups[row.visitId] = [];
      }
      groups[row.visitId].push(row);
    });
    return groups;
  };

  const grouped = groupedTransactions();

  // Calculate totals - only show if doctor is selected
  const totals = selectedDoctor ? {
    billAmount: filteredData.reduce((sum, t) => sum + t.billAmount, 0),
    discountRuntime: filteredData.reduce((sum, t) => sum + t.discountRuntime, 0),
    discountSpecial: filteredData.reduce((sum, t) => sum + t.discountSpecial, 0),
    netAmount: filteredData.reduce((sum, t) => sum + t.netAmount, 0),
    paymentStatus: filteredData.some(t => t.paymentStatus === "Unpaid") ? "Unpaid" : "Paid",
  } : null;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-2 sm:p-3 md:p-4">
        <PageHeader title="Referral Doctor Revenue Report" icon={DollarSign} path="Reports" />

        <div className="bg-white rounded shadow-md p-3 sm:p-4 border border-gray-200">
          {/* Filters Row 1 - Date, Doctor, Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
            {/* DATE PICKER */}
            <div className="relative" ref={dpRef}>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 rounded w-full text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 border-gray-300`}>
                <span className={dateFrom?"text-gray-800":"text-gray-400"}>{dispRange(dateFrom,dateTo)}</span>
                <Calendar size={14} className="text-gray-400 ml-1 flex-shrink-0"/>
              </button>

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

            <div className="relative" ref={doctorRef}>
              <input
                type="text"
                placeholder="Search Doctor"
                value={doctorSearch}
                onChange={(e) => {
                  setDoctorSearch(e.target.value);
                  setDoctorOpen(true);
                }}
                onFocus={() => setDoctorOpen(true)}
                className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {doctorOpen && doctorSearch && (
                <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          console.log('👆 Doctor dropdown clicked:', doc.name);
                          handleSelectDoctor(doc.name);
                        }}
                        className="px-3 py-2 text-xs sm:text-sm cursor-pointer hover:bg-blue-100 border-b border-gray-100 last:border-b-0"
                      >
                        Dr. {doc.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500">No doctors found</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <input
                type="text"
                placeholder="Patient Name"
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters Row 2 - Payment Mode and Column Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="border border-gray-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
              <option value="UPI">UPI</option>
              <option value="Other">Other</option>
            </select>

            <div></div> {/* Empty spacer */}

            {/* Column Selector */}
            <div className="relative" ref={colRef}>
              <button
                type="button"
                onClick={() => setColOpen(!colOpen)}
                className="border border-gray-300 p-1.5 rounded w-full text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <span className="text-gray-600 text-xs sm:text-sm">Columns ({selCount})</span>
                <ChevronDown size={14} className={`transition-transform ${colOpen ? "rotate-180" : ""}`} />
              </button>
              {colOpen && (
                <div className="absolute z-50 top-full left-0 w-56 bg-white border border-gray-300 rounded shadow-lg mt-1">
                  <div className="bg-blue-600 text-white px-3 py-1.5 rounded-t text-xs sm:text-sm font-semibold">Required Columns</div>
                  <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-1 text-xs mb-1">
                      <span className="font-semibold text-gray-600">Filter:</span>
                      <input
                        type="text"
                        value={colQ}
                        onChange={(e) => setColQ(e.target.value)}
                        placeholder="Keywords"
                        className="border border-gray-400 px-1.5 py-0.5 rounded text-xs flex-1 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={() => setSelCols(Object.fromEntries(COLS.map(c => [c.key, true])))}
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        ✓ Check all
                      </button>
                      <button
                        onClick={() => setSelCols(Object.fromEntries(COLS.map(c => [c.key, false])))}
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        ✕ Uncheck all
                      </button>
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {COLS.filter(c => c.label.toLowerCase().includes(colQ.toLowerCase())).map(col => (
                      <label key={col.key} className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 ${selCols[col.key] ? "bg-gray-100" : ""}`}>
                        <input
                          type="checkbox"
                          checked={!!selCols[col.key]}
                          onChange={() => setSelCols(p => ({ ...p, [col.key]: !p[col.key] }))}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="font-medium text-gray-800">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => window.print()}
              className="flex gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs sm:text-sm"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={handleExportExcel}
              className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs sm:text-sm"
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs sm:text-sm"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded shadow-md border border-gray-200 overflow-x-auto mt-3">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-center font-semibold whitespace-nowrap border border-gray-300 w-12">
                  <input
                    type="checkbox"
                    checked={deletedRows.size > 0 && deletedRows.size === filteredData.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newDeleted = new Set(filteredData.map(t => t.id));
                        setDeletedRows(newDeleted);
                        setFilteredData([]);
                      } else {
                        setDeletedRows(new Set());
                        handleSearch();
                      }
                    }}
                    className="w-4 h-4 accent-white cursor-pointer"
                    title="Check all to remove all visible records"
                  />
                </th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Sr.No.</th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Patient Name</th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Test Performed</th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Ref Doctor</th>
                {vis.map(c => (
                  <th key={c.key} className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap border border-gray-300">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6 + vis.length} className="text-center p-4 text-gray-500 border border-gray-300">
                    Loading...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6 + vis.length} className="text-center p-4 text-gray-500 border border-gray-300">
                    No records found
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedData.map((row, i) => {
                    // Check if this is the first test in a visit
                    const isFirstInVisit = paginatedData.findIndex(r => r.visitId === row.visitId) === i;
                    
                    // Check if this is the last test in a visit (for showing subtotal)
                    // Use alternative method for browsers that don't support findLastIndex
                    let isLastInVisit = false;
                    for (let j = paginatedData.length - 1; j >= 0; j--) {
                      if (paginatedData[j].visitId === row.visitId) {
                        isLastInVisit = j === i;
                        break;
                      }
                    }
                    
                    // Calculate subtotal for this visit
                    const visitTests = paginatedData.filter(r => r.visitId === row.visitId);
                    
                    const visitSubtotal = {
                      billAmount: visitTests.reduce((sum, t) => sum + t.billAmount, 0),
                      discountRuntime: visitTests.reduce((sum, t) => sum + (t.discountRuntime || 0), 0),  // SUM all discountR
                      discountSpecial: visitTests.reduce((sum, t) => sum + (t.discountSpecial || 0), 0),  // SUM all discountS
                      netAmount: visitTests.reduce((sum, t) => sum + (t.netAmount || 0), 0),  // SUM all netAmount
                      paymentStatus: visitTests.some(t => t.paymentStatus === "Unpaid") ? "Unpaid" : "Paid",
                    };
                    
                    return (
                      <>
                        <tr key={row.id} className={i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 text-center w-12">
                            <input
                              type="checkbox"
                              checked={deletedRows.has(row.id)}
                              onChange={() => handleDeleteRow(row.id)}
                              className="w-4 h-4 cursor-pointer accent-red-600"
                              title="Check to remove from report"
                            />
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 whitespace-nowrap">{startIndex + i + 1}</td>
                          {/* Show patient name only for first test in each visit */}
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 font-medium">
                            {isFirstInVisit ? row.patientName : "-"}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200">{row.testName}</td>
                          {/* Show doctor name only for first test in each visit */}
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 whitespace-nowrap">
                            {isFirstInVisit ? `Dr. ${row.doctorName}` : "-"}
                          </td>
                          {vis.map(c => (
                            <td key={c.key} className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 whitespace-nowrap text-right">
                              {c.key === "date" ? new Date(row.date).toLocaleDateString("en-GB") : 
                               c.key === "billAmount" || c.key === "discountRuntime" || c.key === "discountSpecial" || c.key === "netAmount" 
                               ? `₹${Number(row[c.key]).toFixed(2)}`
                               : row[c.key] ?? "-"}
                            </td>
                          ))}
                        </tr>
                        {/* Visit Subtotal Row - Show after last test in each visit */}
                        {isLastInVisit && (
                          <tr className="bg-blue-50 border-t border-gray-300">
                            <td colSpan={1} className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300"></td>
                            <td colSpan={4} className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300 font-semibold text-xs">
                              Visit {row.visitId} Subtotal:
                            </td>
                            {vis.map(c => (
                              <td key={c.key} className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 whitespace-nowrap text-right font-semibold bg-blue-100">
                                {c.key === "billAmount" ? `₹${visitSubtotal.billAmount.toFixed(2)}` :
                                 c.key === "discountRuntime" ? `₹${visitSubtotal.discountRuntime.toFixed(2)}` :
                                 c.key === "discountSpecial" ? `₹${visitSubtotal.discountSpecial.toFixed(2)}` :
                                 c.key === "netAmount" ? `₹${visitSubtotal.netAmount.toFixed(2)}` :
                                 c.key === "paymentMode" ? <span className={`px-2 py-1 rounded text-xs font-bold ${visitSubtotal.paymentStatus === "Paid" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>{visitSubtotal.paymentStatus}</span>
                                 : "-"}
                              </td>
                            ))}
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {/* Total Row - Show only when doctor is selected */}
                  {selectedDoctor && totals && vis.some(c => ["billAmount", "discountRuntime", "discountSpecial", "netAmount"].includes(c.key)) && (
                    <tr className="bg-slate-100 border-t-2 border-gray-400 font-bold">
                      <td colSpan={1} className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-center w-12"></td>
                      <td colSpan={4} className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">
                        TOTAL
                      </td>
                      {vis.map(c => (
                        <td key={c.key} className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 whitespace-nowrap text-right bg-slate-200">
                          {c.key === "billAmount" ? `₹${totals.billAmount.toFixed(2)}` :
                           c.key === "discountRuntime" ? `₹${totals.discountRuntime.toFixed(2)}` :
                           c.key === "discountSpecial" ? `₹${totals.discountSpecial.toFixed(2)}` :
                           c.key === "netAmount" ? `₹${totals.netAmount.toFixed(2)}` :
                           c.key === "paymentMode" ? <span className={`px-2 py-1 rounded text-xs font-bold ${totals.paymentStatus === "Paid" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>{totals.paymentStatus}</span>
                           : "-"}
                        </td>
                      ))}
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredData.length > 0 && (
          <div className="mt-3 bg-white rounded shadow-md p-3 flex flex-wrap items-center justify-between text-xs border border-gray-200 gap-2">
            <div className="text-gray-600">
              Showing {filteredData.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${currentPage === 1 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                Previous
              </button>

              <span className="px-2 sm:px-3 py-1">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${currentPage === totalPages ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                Next
              </button>
            </div>

            <div className="text-gray-600">
              Total: {filteredData.length} records
            </div>
          </div>
        )}

        {filteredData.length > 0 && (
          <div className="px-3 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-500 flex justify-between mt-1 rounded-b">
            <span>{filteredData.length} record(s)</span>
            <span className="text-red-600 font-semibold">Net Amount = Bill Amount - Discount</span>
          </div>
        )}
      </div>
    </>
  );
}
