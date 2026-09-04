"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search, RotateCcw, IndianRupee, Wallet, BadgePercent, AlertTriangle,
  Calendar, Building2, UserRound, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import Header from "@/src/components/Header";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { getReportDashboard } from "@/src/api/admin";
import { getDoctors } from "@/src/api/master";

/* ── date helpers ── */
const fmtISO = (d: any) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const toGB = (iso: any) => { if(!iso) return "-"; return new Date(iso).toLocaleDateString("en-GB"); };
const dispRange = (f: any, t: any) => { if(!f) return "Search by Date"; const a=toGB(f),b=t?toGB(t):a; return a===b?a:`${a} - ${b}`; };
const fmt = (n: any) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

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
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];

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

const Card = ({ title, value, todayValue, icon: Icon, bgColor }) => (
  <div className={`${bgColor} p-3 rounded-xl text-white shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="bg-white bg-opacity-20 p-1.5 rounded-full">
            <Icon size={16} className="text-white" />
          </div>
          <p className="text-xs font-medium opacity-90">{title}</p>
        </div>
        <h2 className="text-xl font-bold mb-0.5">{value}</h2>
        <p className="text-[10px] opacity-75">Today: {todayValue}</p>
      </div>
    </div>
  </div>
);

export default function AnalyticsDashboard() {
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

  /* ── filter state ── */
  const [corporate,     setCorporate]     = useState("");
  const [referralDoctor, setReferralDoctor] = useState("");
  const [doctors,       setDoctors]       = useState<any[]>([]);

  /* ── data state ── */
  const [summary,       setSummary]       = useState<any>(null);
  const [trendData,     setTrendData]     = useState<any[]>([]);
  const [corporateData, setCorporateData] = useState<any[]>([]);
  const [doctorData,    setDoctorData]    = useState<any[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<any>({});

  /* ── load doctors ── */
  useEffect(() => {
    getDoctors().then((res: any) => setDoctors(Array.isArray(res) ? res : res?.data || [])).catch(() => {});

    const h = (e: any) => { if (dpRef.current && !dpRef.current.contains(e.target)) setDpOpen(false); };
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

  const fetchData = async (from, to, corp, doc) => {
    if (!from) { setErrors({ date: "Date is required" }); return; }
    setLoading(true); setErrors({});
    try {
      const res = await getReportDashboard({ fromDate: from, toDate: to || from, corporate: corp, referralDoctor: doc });
      const d = res.data;
      setSummary(d.summary);
      setTrendData(d.trendData);
      setCorporateData(d.corporateData);
      setDoctorData(d.doctorData);
    } catch (err) {
      setErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchData(dateFrom, dateTo, corporate, referralDoctor);

  const handleReset = () => {
    const t = fmtISO(today0());
    setDateFrom(t); setDateTo(t); setPreset("Today"); setCustom(false);
    setCorporate(""); setReferralDoctor("");
    setErrors({});
    fetchData(t, t, "", "");
  };

  return (
    <>
      <Header />
      <div className="p-3 sm:p-4 md:p-6 bg-white min-h-screen space-y-3 sm:space-y-4">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card title="Total Revenue"   value={fmt(summary?.revenue)}  todayValue={fmt(summary?.todayRevenue)}  icon={IndianRupee}   bgColor="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-xl" />
          <Card title="Paid Amount"     value={fmt(summary?.paid)}     todayValue={fmt(summary?.todayPaid)}     icon={Wallet}        bgColor="bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 shadow-xl" />
          <Card title="Discount"        value={fmt(summary?.discount)} todayValue={fmt(summary?.todayDiscount)} icon={BadgePercent}  bgColor="bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 shadow-xl" />
          <Card title="Pending Balance" value={fmt(summary?.pending)}  todayValue={fmt(summary?.todayPending)}  icon={AlertTriangle} bgColor="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 shadow-xl" />
        </div>

        {/* Filters */}
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">

            {/* Date range picker */}
            <div className="relative" ref={dpRef}>
              <div className="flex items-center gap-1 mb-1 text-xs text-gray-600"><Calendar size={13}/> Date Range</div>
              <button type="button" onClick={openPicker}
                className={`border p-1.5 rounded w-full text-xs bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.date ? "border-red-500" : "border-gray-300"}`}>
                <span className={dateFrom ? "text-gray-800" : "text-gray-400"}>{dispRange(dateFrom, dateTo)}</span>
                <Calendar size={13} className="text-gray-400 ml-1 flex-shrink-0"/>
              </button>
              {errors.date && <p className="text-red-500 text-xs mt-0.5">{errors.date}</p>}

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

            <div>
              <div className="flex items-center gap-1 mb-1 text-xs text-gray-600"><Building2 size={13}/> Corporate</div>
              <input value={corporate} onChange={e => setCorporate(e.target.value)} placeholder="All corporates"
                className="border border-gray-300 w-full p-1.5 rounded text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"/>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1 text-xs text-gray-600"><UserRound size={13}/> Referral Doctor</div>
              <select value={referralDoctor} onChange={e => setReferralDoctor(e.target.value)}
                className="border border-gray-300 w-full p-1.5 rounded text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none">
                <option value="">All Doctors</option>
                {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button onClick={handleSearch} disabled={loading}
                className="flex gap-1 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs">
                <Search size={13}/> {loading ? "Loading..." : "Search"}
              </button>
              <button onClick={handleReset}
                className="flex gap-1 items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs">
                <RotateCcw size={13}/> Reset
              </button>
            </div>
          </div>

          {errors.api && (
            <div className="flex items-center gap-2 text-red-500 text-xs">
              <AlertCircle size={13}/> {errors.api}
            </div>
          )}
        </div>

        {/* Charts */}
        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

            {/* Patient Registration Trend */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-xl transition-shadow">
              <h3 className="font-semibold mb-3 text-gray-700 text-sm">Patient Registration Trend</h3>
              {trendData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af"/>
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af"/>
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }}/>
                    <Area type="monotone" dataKey="patients" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPatients)"/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Corporate Distribution */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-xl transition-shadow">
              <h3 className="font-semibold mb-3 text-gray-700 text-sm">Corporate Distribution</h3>
              {corporateData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={corporateData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2}
                        label={(props: any) => props.percentage}>
                        {corporateData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "11px" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {corporateData.map((e, i) => (
                      <div key={e.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}/>
                        <span className="text-[10px] text-gray-600">{e.name} ({e.percentage})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Referral Doctor Distribution */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1">
              <h3 className="font-semibold mb-3 text-gray-700 text-sm">Referral Doctor Distribution</h3>
              {doctorData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={doctorData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2}
                        label={(props: any) => props.percentage}>
                        {doctorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "11px" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {doctorData.map((e, i) => (
                      <div key={e.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}/>
                        <span className="text-[10px] text-gray-600">{e.name} ({e.percentage})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}

      </div>
    </>
  );
}

