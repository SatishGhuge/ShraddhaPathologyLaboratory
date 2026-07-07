"use client";

import { useState, useEffect, useRef } from "react";
import { RotateCcw, Printer, FileSpreadsheet, Search, ChevronDown, Calendar, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getPatientTests } from "@/src/api/result";
import { getOrganizations } from "@/src/api/patient";
import * as XLSX from "xlsx";

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

const toLocalDT = (iso: any) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`;
};

const TH = ({children, right}: any) => (
  <th className={`px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 ${right?"text-right":"text-left"}`}>{children}</th>
);

const TD = ({children, right}: any) => (
  <td className={`px-2 py-1.5 text-xs border border-gray-200 whitespace-nowrap ${right?"text-right":"text-left"}`}>{children??"-"}</td>
);

// Available columns for selection
const AVAILABLE_COLS = [
  { id: "visitId", label: "Visit ID" },
  { id: "date", label: "Date" },
  { id: "orgId", label: "Org ID" },
  { id: "patientName", label: "Patient Name" },
  { id: "age", label: "Age" },
  { id: "gender", label: "Gender" },
  { id: "serviceName", label: "Services (Test Name)" },
  { id: "result", label: "Result" },
  { id: "unit", label: "Unit" },
  { id: "refInterval", label: "Ref. Interval" },
  { id: "referralDoctor", label: "Referral Doctor" },
];

export default function TestReport() {
  // Date range state
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
  const colRef = useRef(null);

  // Filter state
  const [patientSearch, setPatientSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  
  // Data & UI state
  const [errors, setErrors]       = useState<any>({});
  const [data, setData]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [colOpen, setColOpen]     = useState(false);
  const [colFilter, setColFilter] = useState("");
  const [selectedColumns, setSelectedColumns] = useState(AVAILABLE_COLS.map(c => c.id));
  const [exporting, setExporting] = useState(false);

  // Inactive tracking (client-side only) - persisted in localStorage
  const [inactiveTests, setInactiveTests] = useState<Set<string>>(new Set());
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Parameter dropdown state
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Pagination state
  const ITEMS_PER_PAGE = 40;
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    const initializeReport = async () => {
      try {
        console.log('🚀 Initializing Test Report...');
        // Clear corrupted localStorage on first load (migration from Date.now() to stable IDs)
        localStorage.removeItem('testReportInactiveTests');
        console.log('🧹 Cleared corrupted inactive tests from localStorage');
        setIsHydrated(true);

        const orgs = await getOrganizations();
        if (Array.isArray(orgs)) {
          setOrganizations(orgs);
        }
        console.log('✅ Organizations loaded');
        
        // Auto-fetch today's data on page load
        const today = fmtISO(today0());
        console.log('📅 Auto-fetching today\'s data:', today);
        await fetchData(today, today, "", "", "", false);
      } catch (err) {
        console.error('Error initializing report:', err);
      }
    };
    
    initializeReport();
    
    const h = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Save inactiveTests to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      console.log('💾 Saving inactive tests to localStorage:', Array.from(inactiveTests));
      localStorage.setItem('testReportInactiveTests', JSON.stringify(Array.from(inactiveTests)));
    }
  }, [inactiveTests, isHydrated]);

  // Auto-fetch when filters change
  useEffect(() => {
    if (searched) {
      console.log('🔄 Filters changed, auto-fetching...');
      fetchData(dateFrom, dateTo, patientSearch, serviceSearch, doctorSearch, showInactive);
    }
  }, [dateFrom, dateTo, patientSearch, serviceSearch, doctorSearch, showInactive]);

  // Column helpers
  const toggleCol = (id: any) => setSelectedColumns(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const checkAll = () => setSelectedColumns(AVAILABLE_COLS.map(c=>c.id));
  const uncheckAll = () => setSelectedColumns([]);

  // Mark test as inactive/active (toggle) - each test is independent
  const handleDeleteRow = (testId: string) => {
    const updated = new Set(inactiveTests);
    if (updated.has(testId)) {
      updated.delete(testId);
      // If this was the last inactive test, close the modal automatically
      if (updated.size === 0) {
        setShowInactiveModal(false);
      }
    } else {
      updated.add(testId);
    }
    setInactiveTests(updated);
  };

  const visCols = AVAILABLE_COLS.filter(c => c.label.toLowerCase().includes(colFilter.toLowerCase()));
  const has = (id: any) => selectedColumns.includes(id);

  // Filter out inactive tests from data
  const filteredData = data.filter(row => !inactiveTests.has(row.testId));

  // Pagination helpers
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    const maxPage = pagination?.totalPages || 1;
    if (page >= 1 && page <= maxPage) {
      setCurrentPage(page);
    }
  };

  // Build test result rows from API response (matching result page structure)
  const buildRows = (apiData: any[], patName: any, svcName: any, dctName: any, inactive: any) => {
    const rows = [];
    let srNo = 1;
    
    console.log('📊 Building rows from API data:', apiData.length);
    console.log('📊 First item structure:', apiData[0]);
    
    if (!Array.isArray(apiData)) return rows;

    // Result page returns array of grouped patient records with nested tests
    for (const patientGroup of apiData) {
      try {
        // Extract patient info from grouped structure
        const pName = patientGroup.patient_name || "-";
        const visitId = patientGroup.visit_id || patientGroup.lab_no || "-";
        const age = patientGroup.age || "-";
        const gender = patientGroup.gender || "-";
        const orgCode = patientGroup.organizationCode || "-";
        
        // Filter by patient name
        if (patName && !pName.toLowerCase().includes(patName.toLowerCase())) continue;
        
        // Process each test in the patient group
        const tests = patientGroup.tests || [];
        
        // Get the visit date from the FIRST test (all tests in same visit should have same visit date)
        let visitDateForGroup = new Date().toISOString();
        if (tests.length > 0) {
          const firstTest = tests[0];
          console.log('🔍 First test in group for date:', {
            visit_id: visitId,
            order_date: firstTest.order_date,
            approved_date: firstTest.approved_date
          });
          
          if (firstTest.order_date) {
            try {
              const parsed = new Date(firstTest.order_date);
              if (!isNaN(parsed.getTime())) {
                visitDateForGroup = parsed.toISOString();
                console.log('✅ Using order_date for group:', visitDateForGroup);
              }
            } catch (e) {
              console.error('Error parsing order_date:', e);
            }
          } 
          
          if (visitDateForGroup === new Date().toISOString() && firstTest.approved_date) {
            try {
              const dateParts = firstTest.approved_date.trim().split(' ');
              const [day, month, year] = dateParts[0].split('/');
              const timePart = dateParts[1] || '00:00';
              const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${timePart}:00`;
              const parsed = new Date(isoString);
              if (!isNaN(parsed.getTime())) {
                visitDateForGroup = parsed.toISOString();
                console.log('✅ Using approved_date for group:', visitDateForGroup);
              }
            } catch (e) {
              console.error('Error parsing approved_date:', e);
            }
          }
        }
        
        for (let testIndex = 0; testIndex < tests.length; testIndex++) {
          const test = tests[testIndex];
          try {
            // Get test info
            const sName = test.test_name || test.test_short_name || "-";
            const dName = test.ref_by || "SELF";
            
            // Filter by service/test name
            if (svcName && !sName.toLowerCase().includes(svcName.toLowerCase())) continue;
            
            // Filter by referral doctor
            if (dctName && !dName.toLowerCase().includes(dctName.toLowerCase())) continue;
            
            // Get test result value
            const resultValue = test.result || "-";
            
            // Check if there are multiple parameters for this test
            const testResults = test.testResults || [];
            const parameterCount = testResults.length || 1;
            
            // Get unit from API response
            const unit = test.unit || "-";
            
            // Get reference range/interval from multiple possible sources (same logic as result page)
            let refInterval = "-";
            
            // Helper function to calculate age-appropriate reference range based on patient demographics
            const getAgeAppropriateRange = (parameterData) => {
              if (!parameterData) return "-";
              
              const patientAge = parseInt(age) || 0;
              const patientGender = gender?.toLowerCase();
              
              // Handle complex age ranges (ageRanges JSON array)
              if (parameterData.ageRanges) {
                try {
                  const ageRanges = JSON.parse(parameterData.ageRanges);
                  for (const range of ageRanges) {
                    if (!range.enabled) continue;
                    const rangeGender = range.gender?.toLowerCase();
                    if (rangeGender && rangeGender !== patientGender) continue;
                    
                    let ageMatches = false;
                    if (range.label?.includes('Between') && range.from != null && range.to != null) {
                      ageMatches = patientAge >= range.from && patientAge <= range.to;
                    }
                    
                    if (ageMatches && range.ll != null && range.ul != null) {
                      return `${range.ll} - ${range.ul}`;
                    }
                  }
                } catch (e) {
                  console.warn('Error parsing age ranges:', e);
                }
              }
              
              // Fallback to gender and age-based ranges
              if (parameterData.rangeType === 'BySex' || parameterData.rangeType === 'ByGenderAndAge') {
                if (patientAge < 18 && parameterData.childActive && parameterData.childLowValue != null && parameterData.childHighValue != null) {
                  return `${parameterData.childLowValue} - ${parameterData.childHighValue}`;
                }
                if (patientAge >= 18) {
                  if (patientGender === 'female' && parameterData.femaleActive && parameterData.femaleLowValue != null && parameterData.femaleHighValue != null) {
                    return `${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`;
                  }
                  if (patientGender === 'male' && parameterData.maleActive && parameterData.maleLowValue != null && parameterData.maleHighValue != null) {
                    return `${parameterData.maleLowValue} - ${parameterData.maleHighValue}`;
                  }
                }
              }
              
              // Final fallback to display range text
              return parameterData.displayRangeText || parameterData.rangeText || "-";
            };
            
            // Try ref_interval_data first (complete parameter object from backend)
            if (test.ref_interval_data) {
              console.log('🔍 Reference Interval Data found for:', {
                test_name: sName,
                displayRangeText: test.ref_interval_data.displayRangeText,
                rangeText: test.ref_interval_data.rangeText,
                rangeType: test.ref_interval_data.rangeType,
                maleLowValue: test.ref_interval_data.maleLowValue,
                maleHighValue: test.ref_interval_data.maleHighValue,
                femaleLowValue: test.ref_interval_data.femaleLowValue,
                femaleHighValue: test.ref_interval_data.femaleHighValue
              });
              
              // Use age-appropriate range (handles gender/age-based logic)
              refInterval = getAgeAppropriateRange(test.ref_interval_data);
              console.log('✅ Using age-appropriate range:', refInterval);
            }
            
            // Fallback to referenceRange if ref_interval_data not available
            if (refInterval === "-" && test.referenceRange) {
              refInterval = test.referenceRange;
              console.log('✅ Using referenceRange from testResults:', refInterval);
            }
            
            console.log('📋 Final Reference Interval:', { test_name: sName, age, gender, refInterval });
            
            // Create unique test ID using backend test_id (stable, doesn't change on re-render)
            // Format: test_id_visitId_testIndex for uniqueness even if same test appears in different visits
            const uniqueTestId = `${test.test_id}_${visitId}_${testIndex}`;
            
            rows.push({
              srNo: srNo++,
              testId: uniqueTestId,
              visitId: visitId,
              date: visitDateForGroup,  // Use same date for all tests in the visit
              orgId: orgCode,
              patientName: pName,
              age: age,
              gender: gender,
              serviceName: sName,
              result: resultValue,
              unit: unit,
              refInterval: refInterval,
              referralDoctor: dName,
              parameterCount: parameterCount,
              testResults: testResults,
              _raw: test // Store raw data for reference
            });
          } catch (err) {
            console.error('Error processing individual test:', err);
          }
        }
      } catch (err) {
        console.error('Error processing patient group:', err, patientGroup);
      }
    }
    
    console.log('✅ Built rows:', rows.length);
    return rows;
  };

  const fetchData = async (selFrom: any, selTo: any, patName: any, svcName: any, dctName: any, inactive: any) => {
    setLoading(true);
    setErrors({});
    setCurrentPage(1);
    try {
      console.log('🔄 Fetching test data with filters...');
      
      // Use same filter format as result page
      const apiFilters = {
        fromDate: selFrom,
        toDate: selTo,
        searchQuery: patName || '',
        testName: svcName || '',
        referralDoctor: dctName || '',
        // Add status filter for inactive if needed
        ...(inactive && { status: 'Inactive' })
      };
      
      console.log('📋 API Filters:', apiFilters);
      console.log('🌐 API Endpoint: /results');
      console.log('📝 API Call: GET /results?fromDate=' + selFrom + '&toDate=' + selTo + '&searchQuery=' + patName + '&testName=' + svcName + '&referralDoctor=' + dctName);
      
      const res = await getPatientTests(apiFilters, 1, 1000);
      
      if (!res) {
        throw new Error('No response from API');
      }
      
      const data = Array.isArray(res) ? res : res.data || [];
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format from API');
      }
      
      console.log('📦 Received data from API:', data.length, 'patient groups');
      console.log('📊 Sample API response structure (first patient group):');
      if (data.length > 0) {
        console.log('   patient_name:', data[0].patient_name);
        console.log('   visit_id:', data[0].visit_id);
        console.log('   tests count:', data[0].tests?.length);
        if (data[0].tests && data[0].tests[0]) {
          console.log('   First test structure:');
          console.log('     - test_name:', data[0].tests[0].test_name);
          console.log('     - order_date:', data[0].tests[0].order_date);
          console.log('     - approved_date:', data[0].tests[0].approved_date);
          console.log('   ✅ DATE SOURCES: order_date and approved_date are present from API');
        }
      }
      
      const rows = buildRows(data, patName, svcName, dctName, inactive);
      setData(rows);
      setSearched(true);
      
      // Set pagination metadata
      const total = rows.length;
      const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
      setPagination({
        page: 1,
        limit: ITEMS_PER_PAGE,
        total: total,
        totalPages: totalPages,
        hasMore: totalPages > 1
      });
      
      if (rows.length === 0) {
        console.warn('⚠️ No rows found after filtering');
      }
    } catch (err: any) {
      console.error('❌ Error fetching data:', err);
      setErrors({ api: err.message || "Failed to fetch data from API" });
      setData([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!dateFrom) { setErrors({ date: "Date is required" }); return; }
    setErrors({});
    fetchData(dateFrom, dateTo, patientSearch, serviceSearch, doctorSearch, showInactive);
  };

  const handleReset = () => {
    const t = fmtISO(today0());
    setDateFrom(t); setDateTo(t); setPreset("Today"); setCustom(false);
    setPatientSearch(""); setServiceSearch(""); setDoctorSearch(""); setShowInactive(false);
    setErrors({});
    setSelectedColumns(AVAILABLE_COLS.map(c => c.id));
    setCurrentPage(1);
    fetchData(t, t, "", "", "", false);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      setErrors({ export: "No data to export" });
      return;
    }
    
    setExporting(true);
    try {
      // Prepare export data from filtered data
      const exportData = filteredData.map(row => {
        const obj: any = {};
        selectedColumns.forEach(col => {
          const colDef = AVAILABLE_COLS.find(c => c.id === col);
          obj[colDef?.label || col] = row[col];
        });
        return obj;
      });
      
      // Add totals row if numeric columns exist
      const totalsRow: any = {};
      selectedColumns.forEach(col => {
        const colDef = AVAILABLE_COLS.find(c => c.id === col);
        if (col === "visitId" || col === "patientName") {
          totalsRow[colDef?.label || col] = "TOTAL";
        } else {
          totalsRow[colDef?.label || col] = "";
        }
      });
      exportData.push(totalsRow);
      
      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Test Report");
      
      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({r: 0, c: col});
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E293B" } },
          alignment: { horizontal: "center" }
        };
      }
      
      // Set column widths
      ws['!cols'] = selectedColumns.map(() => ({ wch: 15 }));
      
      // Download
      const fileName = `Test-Report-${dateFrom}-${dateTo}.xlsx`;
      XLSX.writeFile(wb, fileName);
      console.log('✅ Excel export successful');
    } catch (err: any) {
      console.error('❌ Export error:', err);
      setErrors({ export: err.message || "Failed to export to Excel" });
    } finally {
      setExporting(false);
    }
  };

  // Date picker handlers
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  const pickPreset = (p: any) => { if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const[a,b]=p.fn(); setTFrom(a);setTTo(b);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) => { if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 bg-white min-h-screen">
        <PageHeader title="Test Report" icon={Search} path="Reports / Test Reports" />

        {/* FILTERS */}
        <div className="bg-white p-2 sm:p-3 rounded shadow-md mb-3">
          {/* Row 1: Date Range, Search Fields */}
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

            {/* PATIENT NAME SEARCH */}
            <input placeholder="Search Patient Name" value={patientSearch} onChange={e=>setPatientSearch(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>

            {/* SERVICE/TEST NAME SEARCH */}
            <input placeholder="Search Test Name" value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>

            {/* REFERRAL DOCTOR SEARCH */}
            <input placeholder="Search Referral Doctor" value={doctorSearch} onChange={e=>setDoctorSearch(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>
          </div>

          {/* Row 2: Column Selector, Action Buttons */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* Column Selector */}
            <div className="relative" ref={colRef}>
              <button type="button" onClick={()=>setColOpen(o=>!o)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500">
                <span className="text-gray-700">Columns: {selectedColumns.length}/{AVAILABLE_COLS.length}</span>
                <ChevronDown size={14} className={`transition-transform ml-1 ${colOpen?"rotate-180":""}`}/>
              </button>
              {colOpen && (
                <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold">Select Columns</div>
                  <div className="p-2 border-b border-gray-200">
                    <input type="text" placeholder="Filter: Enter keywords" value={colFilter} onChange={e=>setColFilter(e.target.value)}
                      className="w-full p-1.5 text-xs border border-gray-300 rounded focus:outline-none"/>
                  </div>
                  <div className="p-2 border-b border-gray-200 flex justify-between bg-gray-50 text-xs">
                    <button onClick={checkAll} className="text-blue-600 font-semibold hover:underline">✓ Check all</button>
                    <button onClick={uncheckAll} className="text-blue-600 font-semibold hover:underline">✕ Uncheck all</button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {visCols.map(col=>(
                      <label key={col.id} className={`flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-xs text-gray-700 ${has(col.id)?"bg-gray-50":""}`}>
                        <input type="checkbox" checked={has(col.id)} onChange={()=>toggleCol(col.id)} className="w-4 h-4 accent-blue-600"/>
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <button onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <RotateCcw size={14}/> Reset
            </button>
            <button
              onClick={() => setShowInactiveModal(true)}
              className={`flex gap-1.5 items-center px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-semibold ${
                inactiveTests.size > 0 
                  ? "bg-orange-600 hover:bg-orange-700 text-white" 
                  : "bg-gray-300 hover:bg-gray-400 text-gray-600"
              }`}
              disabled={inactiveTests.size === 0}
            >
              Inactive ({inactiveTests.size})
            </button>
            <button onClick={()=>window.print()}
              className="flex gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm">
              <Printer size={14}/> Print
            </button>
            <button onClick={handleExportExcel} disabled={exporting}
              className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm disabled:opacity-50">
              <FileSpreadsheet size={14}/> {exporting?"Exporting...":"Excel"}
            </button>
          </div>

          {/* Error Messages */}
          {errors.api && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
              <div>
                <strong>Error:</strong> {errors.api}
              </div>
            </div>
          )}
          {errors.export && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
              <div>
                <strong>Export Error:</strong> {errors.export}
              </div>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-2 py-1.5 text-xs font-semibold whitespace-nowrap border border-gray-300 text-center w-12">
                    {/* Checkbox column header - no select all */}
                  </th>
                  {has("visitId") && <TH>Visit ID</TH>}
                  {has("date") && <TH>Date</TH>}
                  {has("orgId") && <TH>Org ID</TH>}
                  {has("patientName") && <TH>Patient Name</TH>}
                  {has("age") && <TH right>Age</TH>}
                  {has("gender") && <TH>Gender</TH>}
                  {has("serviceName") && <TH>Services</TH>}
                  {has("result") && <TH>Result</TH>}
                  {has("unit") && <TH>Unit</TH>}
                  {has("refInterval") && <TH>Ref. Interval</TH>}
                  {has("referralDoctor") && <TH>Referral Doctor</TH>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={selectedColumns.length + 1} className="text-center p-4 text-gray-500">⏳ Loading data...</td></tr>
                ) : errors.api ? (
                  <tr><td colSpan={selectedColumns.length + 1} className="text-center p-4 text-red-600">
                    <div className="font-semibold">❌ Error loading data</div>
                  </td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={selectedColumns.length + 1} className="text-center p-4 text-gray-500">
                    {searched ? "📭 No records found for the selected filters" : "👆 Select date range and click Search to load data"}
                  </td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={selectedColumns.length + 1} className="text-center p-4 text-gray-500">
                    ℹ️ All records have been marked as inactive. Check the Inactive button to view them.
                  </td></tr>
                ) : (
                  getPaginatedData().map((row, i) => (
                    <tr key={i} className={i%2===0?"bg-white hover:bg-gray-50":"bg-gray-50 hover:bg-gray-100"}>
                      <td className="px-2 py-1.5 text-xs border border-gray-200 text-center w-12">
                        <input
                          type="checkbox"
                          checked={inactiveTests.has(row.testId)}
                          onChange={() => handleDeleteRow(row.testId)}
                          className="w-4 h-4 accent-red-600 cursor-pointer"
                          title="Check to move to Inactive"
                        />
                      </td>
                      {has("visitId") && <TD>{row.visitId}</TD>}
                      {has("date") && <TD>{row.date && !isNaN(new Date(row.date).getTime()) ? new Date(row.date).toLocaleDateString("en-GB") : "No Date"}</TD>}
                      {has("orgId") && <TD>{row.orgId}</TD>}
                      {has("patientName") && <TD>{row.patientName}</TD>}
                      {has("age") && <TD right>{row.age}</TD>}
                      {has("gender") && <TD>{row.gender}</TD>}
                      {has("serviceName") && <TD>{row.serviceName}</TD>}
                      {has("result") && (
                        <TD className="relative">
                          {row.parameterCount > 1 ? (
                            <div className="relative inline-block">
                              <button
                                onClick={() => setExpandedTestId(expandedTestId === row.testId ? null : row.testId)}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold cursor-pointer text-left"
                                title="Click to see all parameters"
                              >
                                Parameter ▼
                              </button>
                              {expandedTestId === row.testId && row.testResults && row.testResults.length > 0 && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-64">
                                  {row.testResults.map((param: any, idx: number) => (
                                    <div key={idx} className="p-2 border-b border-gray-200 last:border-b-0 text-xs hover:bg-gray-50">
                                      <p className="font-semibold text-gray-800">{param.parameterName}</p>
                                      <p className="text-gray-600">
                                        Value: <span className="font-medium">{param.numericValue !== null && param.numericValue !== undefined ? param.numericValue : (param.textValue || '-')}</span>
                                      </p>
                                      {param.referenceRange && (
                                        <p className="text-gray-500 text-[10px]">Ref: {param.referenceRange}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>{row.result}</span>
                          )}
                        </TD>
                      )}
                      {has("unit") && <TD>{row.unit}</TD>}
                      {has("refInterval") && <TD>{row.refInterval}</TD>}
                      {has("referralDoctor") && <TD>{row.referralDoctor}</TD>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        {pagination && Math.ceil(filteredData.length / ITEMS_PER_PAGE) > 1 && (
          <div className="mt-3 p-2 bg-white border border-gray-300 rounded flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredData.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length} records | Page {currentPage} of {Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                First
              </button>
              <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                ← Prev
              </button>
              
              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(filteredData.length / ITEMS_PER_PAGE)) }, (_, i) => {
                  let pageNum;
                  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return pageNum >= 1 && pageNum <= totalPages ? (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                      className={`px-2 py-1 text-xs border rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}>
                      {pageNum}
                    </button>
                  ) : null;
                })}
              </div>
              
              <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Next →
              </button>
              <button onClick={() => { const maxPage = Math.ceil(filteredData.length / ITEMS_PER_PAGE); setCurrentPage(maxPage); }} disabled={currentPage === Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                Last
              </button>
            </div>
          </div>
        )}

        {/* Report Info */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <strong>Report Type:</strong> Test Report | <strong>Active Records:</strong> {filteredData.length} | <strong>Inactive Records:</strong> {inactiveTests.size} | <strong>Date Range:</strong> {dispRange(dateFrom, dateTo)}
        </div>
      </div>

      {/* PRINT ONLY SECTION */}
      <div className="print-only">
        <style>{`@media print{body *{visibility:hidden}.print-only,.print-only *{visibility:visible}.print-only{position:absolute;left:0;top:0;width:100%;padding:20px}@page{size:A4 landscape;margin:10mm}}@media screen{.print-only{display:none}}`}</style>
        <div style={{textAlign:"center",marginBottom:"20px"}}>
          <h1 style={{fontSize:"18px",fontWeight:"bold",margin:"0"}}>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p style={{margin:"4px 0",fontSize:"10px"}}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <hr style={{margin:"8px 0",border:"1px solid #000"}}/>
          <h2 style={{fontSize:"13px",fontWeight:"bold",color:"#0066cc",margin:"8px 0"}}>Test Result Report</h2>
          <p style={{margin:"4px 0",fontSize:"10px"}}>Period: {dispRange(dateFrom,dateTo)} | Total Records: {filteredData.length}</p>
          <hr style={{margin:"8px 0",border:"1px dashed #000"}}/>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"8px"}}>
          <thead><tr style={{backgroundColor:"#1e293b",color:"white"}}>
            {has("visitId") && <th style={{padding:"4px",border:"1px solid #000"}}>Visit ID</th>}
            {has("date") && <th style={{padding:"4px",border:"1px solid #000"}}>Date</th>}
            {has("orgId") && <th style={{padding:"4px",border:"1px solid #000"}}>Org ID</th>}
            {has("patientName") && <th style={{padding:"4px",border:"1px solid #000"}}>Patient</th>}
            {has("age") && <th style={{padding:"4px",border:"1px solid #000"}}>Age</th>}
            {has("gender") && <th style={{padding:"4px",border:"1px solid #000"}}>Gender</th>}
            {has("serviceName") && <th style={{padding:"4px",border:"1px solid #000"}}>Test</th>}
            {has("result") && <th style={{padding:"4px",border:"1px solid #000"}}>Result</th>}
            {has("unit") && <th style={{padding:"4px",border:"1px solid #000"}}>Unit</th>}
            {has("refInterval") && <th style={{padding:"4px",border:"1px solid #000"}}>Ref. Range</th>}
            {has("referralDoctor") && <th style={{padding:"4px",border:"1px solid #000"}}>Doctor</th>}
          </tr></thead>
          <tbody>{filteredData.map((row,i)=>(
            <tr key={i}>
              {has("visitId") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.visitId}</td>}
              {has("date") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.date && !isNaN(new Date(row.date).getTime()) ? new Date(row.date).toLocaleDateString("en-GB") : "No Date"}</td>}
              {has("orgId") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.orgId}</td>}
              {has("patientName") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.patientName}</td>}
              {has("age") && <td style={{padding:"4px",border:"1px solid #000",textAlign:"center"}}>{row.age}</td>}
              {has("gender") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.gender}</td>}
              {has("serviceName") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.serviceName}</td>}
              {has("result") && <td style={{padding:"4px",border:"1px solid #000"}}>
                {row.parameterCount > 1 ? (
                  row.testResults?.map((p: any) => `${p.parameterName}: ${p.numericValue !== null && p.numericValue !== undefined ? p.numericValue : (p.textValue || '-')}`).join(', ')
                ) : (
                  row.result
                )}
              </td>}
              {has("unit") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.unit}</td>}
              {has("refInterval") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.refInterval}</td>}
              {has("referralDoctor") && <td style={{padding:"4px",border:"1px solid #000"}}>{row.referralDoctor}</td>}
            </tr>
          ))}</tbody>
        </table>
        <div style={{marginTop:"20px",fontSize:"9px",textAlign:"center",borderTop:"1px solid #000",paddingTop:"10px"}}>
          <p>This is a system-generated report. Printed on: {new Date().toLocaleString("en-GB")}</p>
        </div>
      </div>

      {/* Inactive Tests Modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-96 overflow-auto">
            <div className="bg-orange-50 px-4 py-3 border-b border-gray-300 flex items-center justify-between sticky top-0">
              <h3 className="text-base font-bold text-orange-800">Inactive Tests ({inactiveTests.size})</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInactiveModal(false)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold"
                  title="Back to report"
                >
                  Back
                </button>
                <button
                  onClick={() => setShowInactiveModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-orange-100 sticky top-12">
                <tr>
                  <th className="px-3 py-2 text-center font-semibold whitespace-nowrap border border-gray-300">Action</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Date</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Visit ID</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Test Name</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border border-gray-300">Referral Doctor</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(inactiveTests).map((testId) => {
                  const testData = data.find(t => t.testId === testId);
                  
                  if (!testData) return null;
                  
                  return (
                    <tr key={testId} className="bg-white hover:bg-orange-50 border-b border-gray-200">
                      <td className="px-3 py-2 border border-gray-300 text-center">
                        <button
                          onClick={() => {
                            handleDeleteRow(testId);
                            console.log('✅ Activated test:', testId, '- Modal stays open');
                          }}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold"
                          title="Click to activate this test (modal will stay open)"
                        >
                          Activate
                        </button>
                      </td>
                      <td className="px-3 py-2 border border-gray-300">{testData.date && !isNaN(new Date(testData.date).getTime()) ? new Date(testData.date).toLocaleDateString("en-GB") : "No Date"}</td>
                      <td className="px-3 py-2 border border-gray-300 font-medium text-blue-700">{testData.visitId}</td>
                      <td className="px-3 py-2 border border-gray-300">{testData.patientName}</td>
                      <td className="px-3 py-2 border border-gray-300">{testData.serviceName}</td>
                      <td className="px-3 py-2 border border-gray-300">{testData.referralDoctor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
