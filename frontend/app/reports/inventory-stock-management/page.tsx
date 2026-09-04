"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  RotateCcw, 
  Printer,
  AlertCircle,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import Header from "@/src/components/Header";

// Utility functions
const toGB = (iso: any) => { 
  if(!iso) return "-"; 
  const d=new Date(iso); 
  return d.toLocaleDateString("en-GB"); 
};

const fmtISO = (d: any) => 
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const today0 = () => { 
  const d = new Date(); 
  d.setHours(0,0,0,0); 
  return d; 
};

const addDays = (d: any, n: any) => { 
  const r=new Date(d); 
  r.setDate(r.getDate()+n); 
  return r; 
};

const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);

const dispRange = (f: any, t: any) => { 
  if(!f) return "Select Date Range"; 
  const a=toGB(f),b=t?toGB(t):a; 
  return a===b?a:`${a} - ${b}`; 
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

// Calendar component
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

// Status badge component
function StatusBadge({ status }: any) {
  const colors: any = {
    'Normal': 'bg-green-100 text-green-800',
    'Low': 'bg-yellow-100 text-yellow-800',
    'Critical': 'bg-red-100 text-red-800',
    'Out of Stock': 'bg-red-200 text-red-900'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

// Summary card component
function SummaryCard({ icon: Icon, label, value, color, bgColor }: any) {
  return (
    <div className={`p-2.5 rounded-lg border border-gray-200 ${bgColor} flex items-center justify-between`}>
      <div className="flex flex-col">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
      <Icon size={24} className={`${color} flex-shrink-0`} />
    </div>
  );
}

const Page = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
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
  const [organizationId, setOrganizationId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("itemName");
  const [sortOrder, setSortOrder] = useState("asc");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const dpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: any) => {
      if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Fetch organizations and suppliers on mount
  useEffect(() => {
    const fetchOrgAndSuppliers = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('📦 Fetching organizations from:', `${apiUrl}/master/organizations`);
        
        // Fetch organizations
        const orgResponse = await fetch(`${apiUrl}/master/organizations`, { headers });
        console.log('📦 Organizations response status:', orgResponse.status);
        const orgData = await orgResponse.json();
        console.log('📦 Organizations data:', orgData);
        
        if (orgData.success && orgData.data && Array.isArray(orgData.data)) {
          setOrganizations(orgData.data);
          console.log('✅ Organizations loaded:', orgData.data.length);
        } else {
          console.warn('⚠️ No organizations data:', orgData);
          setOrganizations([]);
        }

        console.log('📦 Fetching suppliers from:', `${apiUrl}/inventory/suppliers?limit=100`);
        
        // Fetch suppliers with higher limit
        const supplierResponse = await fetch(`${apiUrl}/inventory/suppliers?limit=100`, { headers });
        console.log('📦 Suppliers response status:', supplierResponse.status);
        const supplierData = await supplierResponse.json();
        console.log('📦 Suppliers data:', supplierData);
        
        // Handle paginated response from suppliers
        let suppliersArray = [];
        if (supplierData.success && supplierData.data) {
          if (Array.isArray(supplierData.data)) {
            suppliersArray = supplierData.data;
          }
          setSuppliers(suppliersArray);
          console.log('✅ Suppliers loaded:', suppliersArray.length);
        } else {
          console.warn('⚠️ No suppliers data:', supplierData);
          setSuppliers([]);
        }
      } catch (error) {
        console.error('❌ Error fetching organizations/suppliers:', error);
        setOrganizations([]);
        setSuppliers([]);
      }
    };

    fetchOrgAndSuppliers();
  }, []);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, organizationId, supplierId, statusFilter, searchTerm, sortBy, sortOrder]);

  // Date picker handlers
  const openPicker = () => { setTFrom(dateFrom); setTTo(dateTo); setCustom(false); setPicking(false); setHover(""); setDpOpen(true); };
  
  const pickPreset = (p: any) => { 
    if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} 
    const[a,b]=p.fn(); 
    setTFrom(a);
    setTTo(b);
    setPreset(p.label);
    setCustom(false); 
  };

  const clickDay = (day: any) => { 
    if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}
    else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} 
  };

  const applyDate = () => { setDateFrom(tFrom);setDateTo(tTo);setDpOpen(false);setPicking(false); };
  const cancelDate = () => { setDpOpen(false);setCustom(false);setPicking(false);setTFrom(dateFrom);setTTo(dateTo); };
  const prevM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  const fetchData = async () => {
    setLoading(true);
    setErrors({});
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams();

      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (organizationId) {
        console.log('🏥 Sending organizationId:', organizationId);
        params.append('organizationId', organizationId);
      }
      if (supplierId) {
        console.log('📦 Sending supplierId:', supplierId);
        params.append('supplierId', supplierId);
      }
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('searchTerm', searchTerm);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', '1');
      params.append('limit', '50');
      
      const url = `${apiUrl}/inventory-stock-management-report/report?${params}`;
      console.log('📡 Fetching from:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();

      console.log('📡 Response data:', result);

      if (result.success && result.data) {
        setData(result.data);
        setSummary(result.summary || {});
        console.log('✅ Data loaded, count:', result.data.length);
      } else {
        setData([]);
        setSummary(null);
        setErrors({ api: result.message || 'Failed to fetch data' });
        console.warn('⚠️ API error:', result.message);
      }
    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      setErrors({ api: error.message || 'Failed to fetch data' });
      setData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) return;
    
    let headers, rows;

    if (organizationId) {
      // Organization mode export
      headers = ['Item Name', 'Item Code', 'Batch No', 'Qty Transferred', 'Qty Used', 'Qty Remaining', 'Lab Usage', 'Expiry Date', 'Organization'];
      rows = data.map(row => [
        row.itemName,
        row.itemCode,
        row.batchNo,
        row.quantityTransferred,
        row.quantityUsed,
        row.currentOrgStock,
        row.currentLabStock,
        toGB(row.expiryDate),
        row.organizationName
      ]);
    } else if (supplierId) {
      // Supplier mode export
      headers = ['Item Name', 'Item Code', 'Batch No', 'Qty Taken', 'Price/Unit', 'Total Amount', 'Invoice No', 'Invoice Date', 'Expiry Date'];
      rows = data.map(row => [
        row.itemName,
        row.itemCode,
        row.batchNo,
        row.quantityTaken,
        row.pricePerUnit,
        row.totalAmount,
        row.invoiceNo,
        toGB(row.invoiceDate),
        toGB(row.expiryDate)
      ]);
    } else {
      return; // No mode selected
    }

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-stock-management-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setOrganizationId("");
    setSupplierId("");
    setStatusFilter("");
    setSearchTerm("");
    setSortBy("itemName");
    setSortOrder("asc");
    setPreset("All Dates");
    setCustom(false);
    setTFrom("");
    setTTo("");
    setErrors({});
    setData([]);
    setSummary(null);
    setCurrentPage(1);
  };

  // Pagination helpers
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <>
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          * { margin: 0; padding: 0; }
          body { margin: 0; padding: 0; background: white; width: 100%; height: 100%; }
          html { margin: 0; padding: 0; }
          header, nav, .header, .Header, aside, .sidebar, .menu, .no-print {
            display: none !important; width: 0 !important; height: 0 !important;
            margin: 0 !important; padding: 0 !important;
          }
          .print-only { display: block !important; width: 100% !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; }
        }
        @media screen {
          .print-only { display: none !important; }
          .no-print { display: block !important; }
        }
      `}</style>

      {/* PRINT CONTENT */}
      <div className="print-only">
        <div style={{textAlign: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #000'}}>
          <h2 style={{margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold'}}>SHRADDHA PATHOLOGY LABORATORY</h2>
          <p style={{margin: '0 0 5px 0', fontSize: '14px'}}>Inventory Stock Management Report</p>
          <p style={{margin: '0', fontSize: '12px', color: '#666'}}>Generated: {new Date().toLocaleDateString('en-GB')}</p>
        </div>

        {summary && (
          <div style={{marginBottom: '15px', fontSize: '13px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', paddingBottom: '10px', borderBottom: '1px solid #999'}}>
            <div><strong>Total Items:</strong> {summary.totalItems}</div>
            <div><strong>Total Quantity:</strong> {summary.totalQuantity}</div>
            <div><strong>Critical Items:</strong> {summary.criticalCount}</div>
          </div>
        )}

        {data.length > 0 && (
          <table style={{width: '100%', borderCollapse: 'collapse', margin: '15px 0', fontSize: '11px'}}>
            <thead>
              <tr style={{backgroundColor: '#f0f0f0'}}>
                <th style={{textAlign: 'left', fontWeight: 'bold', border: '1px solid #000', padding: '5px'}}>Item Name</th>
                <th style={{textAlign: 'left', fontWeight: 'bold', border: '1px solid #000', padding: '5px'}}>Item Code</th>
                <th style={{textAlign: 'center', fontWeight: 'bold', border: '1px solid #000', padding: '5px'}}>Qty</th>
                <th style={{textAlign: 'left', fontWeight: 'bold', border: '1px solid #000', padding: '5px'}}>Status</th>
                <th style={{textAlign: 'left', fontWeight: 'bold', border: '1px solid #000', padding: '5px'}}>Location</th>
                <th style={{textAlign: 'left', fontWeight: 'bold', border: '1px solid #000', padding: '5px'}}>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td style={{textAlign: 'left', border: '1px solid #999', padding: '5px'}}>{row.itemName}</td>
                  <td style={{textAlign: 'left', border: '1px solid #999', padding: '5px'}}>{row.itemCode}</td>
                  <td style={{textAlign: 'center', border: '1px solid #999', padding: '5px'}}>{row.quantityAvailable}</td>
                  <td style={{textAlign: 'left', border: '1px solid #999', padding: '5px'}}>{row.status}</td>
                  <td style={{textAlign: 'left', border: '1px solid #999', padding: '5px'}}>{row.stockLocation}</td>
                  <td style={{textAlign: 'left', border: '1px solid #999', padding: '5px'}}>{toGB(row.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #999', fontSize: '11px', color: '#666', textAlign: 'center'}}>
          <p style={{margin: '0'}}>Shraddha Pathology Laboratory</p>
        </div>
      </div>

      {/* SCREEN VIEW */}
      <Header />
      <div className="no-print">
      <div className="min-h-screen bg-white">
        
        {/* SUMMARY CARDS */}
        {summary && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-2 p-2 sm:p-3">
            {!organizationId && !supplierId ? (
              // Lab mode summary
              <>
                <SummaryCard icon={TrendingUp} label="Items" value={summary.totalItems} color="text-blue-500" bgColor="bg-blue-50" />
                <SummaryCard icon={AlertCircle} label="Total Qty" value={summary.totalQuantity} color="text-green-500" bgColor="bg-green-50" />
                <SummaryCard icon={AlertCircle} label="Critical" value={summary.criticalCount} color="text-red-500" bgColor="bg-red-50" />
                <SummaryCard icon={AlertCircle} label="Low" value={summary.lowCount} color="text-yellow-500" bgColor="bg-yellow-50" />
                <SummaryCard icon={TrendingDown} label="Expired" value={summary.expiredCount} color="text-orange-500" bgColor="bg-orange-50" />
              </>
            ) : organizationId ? (
              // Organization mode summary
              <>
                <SummaryCard icon={TrendingUp} label="Items" value={summary.totalItems} color="text-blue-500" bgColor="bg-blue-50" />
                <SummaryCard icon={AlertCircle} label="Sent" value={summary.totalQuantityTransferred} color="text-green-500" bgColor="bg-green-50" />
                <SummaryCard icon={AlertCircle} label="Used" value={summary.totalQuantityUsed} color="text-orange-500" bgColor="bg-orange-50" />
                <SummaryCard icon={TrendingDown} label="Remaining" value={summary.totalQuantityRemaining} color="text-purple-500" bgColor="bg-purple-50" />
              </>
            ) : supplierId ? (
              // Supplier mode summary
              <>
                <SummaryCard icon={TrendingUp} label="Items" value={summary.totalItems} color="text-blue-500" bgColor="bg-blue-50" />
                <SummaryCard icon={AlertCircle} label="Qty" value={summary.totalQuantityTaken} color="text-green-500" bgColor="bg-green-50" />
                <SummaryCard icon={AlertCircle} label="Value" value={`₹${summary.totalInvoiceValue?.toFixed(0) || 0}`} color="text-yellow-500" bgColor="bg-yellow-50" />
              </>
            ) : null}
          </div>
        )}

        {/* FILTERS */}
        <div className="bg-white p-1.5 rounded shadow-md mb-2 mx-2 sm:mx-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1 mb-1">
            {/* DATE RANGE */}
            <div className="relative" ref={dpRef}>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.date?"border-red-500":"border-gray-300"}`}>
                <span className={dateFrom?"text-gray-800":"text-gray-400"}>{dispRange(dateFrom,dateTo)}</span>
                <Calendar size={14} className="text-gray-400 ml-1 flex-shrink-0"/>
              </button>

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

            {/* ORGANIZATION FILTER - Show only in Organization Mode */}
            {!supplierId && (
              <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 col-span-1 md:col-span-2">
                <option value="">Select Organization...</option>
                {organizations && organizations.length > 0 ? (
                  organizations.map((org: any) => (
                    <option key={org.id} value={org.id}>{org.name || org.organizationName || 'N/A'}</option>
                  ))
                ) : (
                  <option disabled>No organizations available</option>
                )}
              </select>
            )}

            {/* SUPPLIER FILTER - Show only in Supplier Mode */}
            {!organizationId && (
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 col-span-1 md:col-span-2">
                <option value="">Select Supplier...</option>
                {suppliers && suppliers.length > 0 ? (
                  suppliers.map((supplier: any) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.supplierName || supplier.name || 'N/A'}</option>
                  ))
                ) : (
                  <option disabled>No suppliers available</option>
                )}
              </select>
            )}

            {/* STATUS FILTER */}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500">
              <option value="">All Status</option>
              <option value="normal">Normal</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
              <option value="expired">Expired</option>
              <option value="expiring-soon">Expiring Soon</option>
            </select>

            {/* SEARCH */}
            <input type="text" placeholder="Search item name/code..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"/>

            {/* MODE BUTTONS */}
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => { setOrganizationId(""); setSupplierId(""); }}
                className={`px-2 py-1.5 rounded text-xs font-semibold transition-colors flex-1 ${
                  !organizationId && !supplierId
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Lab Stock Mode"
              >
                Lab
              </button>
              <button
                type="button"
                onClick={() => setSupplierId("")}
                className={`px-2 py-1.5 rounded text-xs font-semibold transition-colors flex-1 ${
                  organizationId && !supplierId
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Organization Mode"
              >
                Org
              </button>
              <button
                type="button"
                onClick={() => setOrganizationId("")}
                className={`px-2 py-1.5 rounded text-xs font-semibold transition-colors flex-1 ${
                  supplierId && !organizationId
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title="Supplier Mode"
              >
                Supplier
              </button>
            </div>
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
        <div className="bg-white rounded shadow-md overflow-hidden mx-2 sm:mx-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-left">Item</th>
                  <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-left">Code</th>
                  <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Batch</th>
                  
                  {!organizationId && !supplierId ? (
                    // Lab columns
                    <>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Qty</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Status</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-left">Expiry</th>
                    </>
                  ) : organizationId ? (
                    // Organization columns
                    <>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Sent</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Used</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Remaining</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Lab Usage</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Status</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-left">Expiry</th>
                    </>
                  ) : (
                    // Supplier columns
                    <>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Qty</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-right">Price</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-right">Amount</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-center">Status</th>
                      <th className="px-2 py-1 text-xs font-semibold border border-gray-300 text-left">Invoice</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center p-2 text-gray-500">⏳ Loading...</td></tr>
                ) : errors.api ? (
                  <tr><td colSpan={9} className="text-center p-2 text-red-600 font-semibold">❌ {errors.api}</td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-2 text-gray-500">📭 No data</td></tr>
                ) : (
                  paginatedData.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-2 py-1 border border-gray-200 font-semibold">{row.itemName}</td>
                      <td className="px-2 py-1 border border-gray-200 text-gray-600">{row.itemCode}</td>
                      <td className="px-2 py-1 border border-gray-200 text-center text-xs">{row.batchNo}</td>
                      
                      {!organizationId && !supplierId ? (
                        // Lab row data
                        <>
                          <td className="px-2 py-1 border border-gray-200 text-center font-bold">{row.quantityAvailable}</td>
                          <td className="px-2 py-1 border border-gray-200 text-center text-xs bg-gray-100">
                            <span className={`px-1 py-0.5 rounded text-xs font-semibold ${
                              row.status === 'Out of Stock' ? 'bg-red-200 text-red-800' :
                              row.status === 'Critical' ? 'bg-red-100 text-red-700' :
                              row.status === 'Low' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-2 py-1 border border-gray-200 text-xs">{row.expiryDate?.split('T')[0]}</td>
                        </>
                      ) : organizationId ? (
                        // Organization row data
                        <>
                          <td className="px-2 py-1 border border-gray-200 text-center font-bold text-blue-600">{row.quantityTransferred}</td>
                          <td className="px-2 py-1 border border-gray-200 text-center font-bold text-orange-600">{row.quantityUsed}</td>
                          <td className="px-2 py-1 border border-gray-200 text-center font-bold text-green-600">{row.currentOrgStock}</td>
                          <td className="px-2 py-1 border border-gray-200 text-center font-bold text-purple-600">{row.currentLabStock}</td>
                          <td className="px-2 py-1 border border-gray-200 text-center text-xs bg-gray-100">
                            <span className={`px-1 py-0.5 rounded text-xs font-semibold ${
                              row.status === 'Expired' ? 'bg-red-100 text-red-700' :
                              row.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-2 py-1 border border-gray-200 text-xs">{row.expiryDate?.split('T')[0]}</td>
                        </>
                      ) : (
                        // Supplier row data
                        <>
                          <td className="px-2 py-1 border border-gray-200 text-center font-bold">{row.quantityTaken}</td>
                          <td className="px-2 py-1 border border-gray-200 text-right">₹{row.pricePerUnit?.toFixed(0)}</td>
                          <td className="px-2 py-1 border border-gray-200 text-right font-semibold">₹{row.totalAmount?.toFixed(0)}</td>
                          <td className="px-2 py-1 border border-gray-200 text-center text-xs bg-gray-100">
                            <span className={`px-1 py-0.5 rounded text-xs font-semibold ${
                              row.status === 'Expired' ? 'bg-red-100 text-red-700' :
                              row.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-2 py-1 border border-gray-200 text-xs">{row.invoiceNo}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-2 bg-gray-50 border-t border-gray-200">
              <span className="text-xs text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} items
              </span>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs px-2 py-1">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default Page;
