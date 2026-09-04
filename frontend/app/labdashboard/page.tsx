"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useContext } from "react";
import { createAdmin } from "@/src/api/admin";
import { getTestStatistics } from "@/src/api/result";
import { getPatientStatistics, getOrganizationTypeStatistics, getWeeklyOrganizationTypeStatistics } from "@/src/api/patient";
import { colorTheme } from "@/config/colorTheme";
import { SidebarContext } from "@/app/layout-wrapper";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import {
  Rocket, FileText, Package, UserPlus,
  Search, TestTube, DollarSign, Users, FlaskConical,
  CheckCircle, Truck, ChevronLeft, ChevronRight, TrendingUp,
} from "lucide-react";

/* ─── Colors & Config ───────────────────────────────────────── */
const COLORS_PIE  = ["#fb9344ff","#fd6e3aff","#FF8C42","#FFA500","#FFB84D"];
const COLORS_DEPT = [colorTheme.departments.pathology, colorTheme.departments.radiology, colorTheme.departments.microbiology];
const FALLBACK_DEPT = [{ name:"Pathology",value:55 },{ name:"Radiology",value:25 },{ name:"Microbiology",value:20 }];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const MONTHLY_REVIEW_FALLBACK = [
  { month:"Jan", patients:120 },{ month:"Feb", patients:145 },{ month:"Mar", patients:160 },
  { month:"Apr", patients:132 },{ month:"May", patients:175 },{ month:"Jun", patients:190 },
  { month:"Jul", patients:155 },{ month:"Aug", patients:168 },{ month:"Sep", patients:180 },
  { month:"Oct", patients:210 },{ month:"Nov", patients:195 },{ month:"Dec", patients:220 },
];

const QUICK_LINKS = [
  { label:"Patient Registration", path:"/patient/registration",            icon:UserPlus,  color:"#10B981" },
  { label:"Search Booking",       path:"/patient/search-booking",          icon:Search,    color:"#F59E0B" },
  { label:"Result Entry",         path:"/result",                          icon:TestTube,  color:"#EC4899" },
  { label:"Daily Collection",     path:"/reports/daily-collection",        icon:DollarSign,color:"#14B8A6" },
  { label:"Location Report",      path:"/reports/patient-location-report", icon:FileText,  color:"#6366F1" },
];

const LINE_DATA = [
  { y:"2010", R:30, Rc:20, E:15, V:10, A:8,  D:18, Rf:5  },
  { y:"2011", R:45, Rc:35, E:25, V:18, A:12, D:28, Rf:8  },
  { y:"2012", R:60, Rc:50, E:40, V:25, A:18, D:38, Rf:10 },
  { y:"2013", R:55, Rc:65, E:55, V:30, A:22, D:45, Rf:12 },
  { y:"2014", R:80, Rc:75, E:65, V:38, A:28, D:55, Rf:15 },
  { y:"2015", R:70, Rc:60, E:50, V:32, A:24, D:48, Rf:11 },
  { y:"2016", R:65, Rc:55, E:45, V:28, A:20, D:42, Rf:9  },
  { y:"2017", R:75, Rc:65, E:58, V:35, A:26, D:52, Rf:13 },
];
const LINE_SERIES = [
  { key:"R",  label:"Registered", color:"#4F81E1" },
  { key:"Rc", label:"Received",   color:"#C8651A" },
  { key:"E",  label:"Entered",    color:"#A78BFA" },
  { key:"V",  label:"Validation", color:"#FBBF24" },
  { key:"A",  label:"Authorized", color:"#60A5FA" },
  { key:"D",  label:"Delivered",  color:"#34D399" },
  { key:"Rf", label:"Rectified",  color:"#F472B6" },
];

const STAT_CONFIG = [
  { title:"Total",         sub:"Registered Patients", icon:Users,        color:"#C8651A", bg:"#FFF4EE", link:"/reports/patient-list"         },
  { title:"Registered",    sub:"More info",            icon:UserPlus,     color:"#3B82F6", bg:"#EFF6FF", link:"/result?status=Registered"     },
  { title:"Collected",     sub:"More info",            icon:FlaskConical, color:"#8B5CF6", bg:"#F5F3FF", link:"/result?status=Received"       },
  { title:"Authenticated", sub:"More info",            icon:CheckCircle,  color:"#10B981", bg:"#ECFDF5", link:"/result?status=Authorized"    },
  { title:"Delivered",     sub:"More info",            icon:Truck,        color:"#F59E0B", bg:"#FFFBEB", link:"/result?status=Delivered"      },
];

/* ─── Date Range Picker Component ───────────────────────────────── */
function DateRangePicker({ onDateRangeChange }: { onDateRangeChange: (from: string, to: string) => void }) {
  const today = new Date();
  const [fromDate, setFromDate] = useState<string>(today.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState<string>(today.toISOString().split("T")[0]);
  
  const handleApply = () => {
    const from = fromDate < toDate ? fromDate : toDate;
    const to = fromDate < toDate ? toDate : fromDate;
    onDateRangeChange(from, to);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold text-gray-700">📅 Select Date Range</p>
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-gray-600">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-gray-600">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <button
        onClick={handleApply}
        className="w-full bg-[#C8651A] hover:bg-[#a8530f] text-white text-[10px] font-bold py-1.5 rounded transition-colors"
      >
        Apply Filter
      </button>
    </div>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2">
      <p className="text-[10px] font-bold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[10px]" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const router = useRouter();
  const { sidebarOpen } = useContext(SidebarContext);

  const [todayTotal,         setTodayTotal]         = useState(0);
  const [todayRegistered,    setTodayRegistered]    = useState(0);
  const [todayCollected,     setTodayCollected]     = useState(0);
  const [todayAuthenticated, setTodayAuthenticated] = useState(0);
  const [todayDelivered,     setTodayDelivered]     = useState(0);
  const [locationData,       setLocationData]       = useState<any[]>([]);
  const [departmentData,     setDepartmentData]     = useState<any[]>([]);
  const [monthlyData,        setMonthlyData]        = useState(MONTHLY_REVIEW_FALLBACK);
  const [yesterdayTotal,         setYesterdayTotal]         = useState(0);
  const [yesterdayRegistered,    setYesterdayRegistered]    = useState(0);
  const [yesterdayCollected,     setYesterdayCollected]     = useState(0);
  const [yesterdayAuthenticated, setYesterdayAuthenticated] = useState(0);
  const [yesterdayDelivered,     setYesterdayDelivered]     = useState(0);
  const [organizationTypeData,   setOrganizationTypeData]   = useState<any[]>([
    { name: "Home Collection", value: 0 },
    { name: "OPD", value: 0 },
    { name: "IPD", value: 0 },
  ]);
  const [weeklyOrgTypeData,      setWeeklyOrgTypeData]      = useState<any[]>([]);
  
  // Date range state for dynamic filtering
  const [selectedFromDate, setSelectedFromDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedToDate,   setSelectedToDate]   = useState<string>(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        Promise.all([
          getTestStatistics({ fromDate: selectedFromDate, toDate: selectedToDate }),
          getPatientStatistics({ fromDate: selectedFromDate, toDate: selectedToDate }),
          getOrganizationTypeStatistics({ fromDate: selectedFromDate, toDate: selectedToDate }),
          getWeeklyOrganizationTypeStatistics(),
        ]).then(([todayTest, todayPat, orgTypeStats, weeklyOrgStats]) => {
          // SELECTED DATE RANGE DATA
          setTodayAuthenticated(todayTest.byStatus?.Authorized || 0);
          setTodayDelivered(todayTest.byStatus?.Delivered         || 0);
          setTodayRegistered(todayTest.byStatus?.Registered       || 0);
          setTodayCollected(todayTest.byStatus?.Received          || 0);
          setTodayTotal(todayTest.total || 0);
          
          if (todayPat.locationStats)
            setLocationData(todayPat.locationStats.slice(0,5).map((l: any) => ({ name: l.location || "Not Specified", value: l.count })));
          if (todayTest.byDepartment)
            setDepartmentData(Object.entries(todayTest.byDepartment).map(([name, value]) => ({ name, value })));
      
          // Set organization type data for bar graph
          console.log('📊 Organization Type Stats Response:', orgTypeStats);
          if (orgTypeStats.success && orgTypeStats.data) {
            console.log('✅ Setting organization type data:', orgTypeStats.data);
            const chartData = [
              { name: "Home Collection", value: orgTypeStats.data.homeCollection || 0 },
              { name: "OPD", value: orgTypeStats.data.opd || 0 },
              { name: "IPD", value: orgTypeStats.data.ipd || 0 },
            ];
            console.log('📈 Chart data:', chartData);
            setOrganizationTypeData(chartData);
          } else {
            console.warn('⚠️ No organization type data received or failed:', orgTypeStats);
            setOrganizationTypeData([
              { name: "Home Collection", value: 0 },
              { name: "OPD", value: 0 },
              { name: "IPD", value: 0 },
            ]);
          }

          // Set weekly organization type data
          console.log('📊 Weekly Organization Type Stats:', weeklyOrgStats);
          if (weeklyOrgStats.success && weeklyOrgStats.data) {
            setWeeklyOrgTypeData(weeklyOrgStats.data);
          }
        }).catch(err => {
          console.error('❌ Dashboard data fetch error:', err);
        });
      } catch (error) {
        console.error('❌ Error in fetchDashboardData:', error);
      }
    };
    fetchDashboardData();
  }, [selectedFromDate, selectedToDate]);

  const statValues = { Total:todayTotal, Registered:todayRegistered, Collected:todayCollected, Authenticated:todayAuthenticated, Delivered:todayDelivered };
  const locData  = locationData.length  > 0 ? locationData  : [{ name:"No Data", value:1 }];
  const deptData = departmentData.length > 0 ? departmentData : FALLBACK_DEPT;

  const sidebarW = sidebarOpen ? "192px" : "0px";

  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("admin") || "{}") : {};

  return (
    <div
      className="fixed top-14 bottom-0 right-0 bg-gray-50 overflow-y-auto flex flex-col gap-3 transition-all duration-300"
      style={{ left: sidebarW, padding:"16px" }}
    >
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-5 gap-3 flex-shrink-0">
        {STAT_CONFIG.map(cfg => (
          <div key={cfg.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer"
            onClick={() => cfg.link && router.push(cfg.link)}>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                <cfg.icon size={18} style={{ color: cfg.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-gray-900 leading-none">{String(statValues[cfg.title as keyof typeof statValues]) ?? "0"}</p>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">{cfg.title}</p>
                <p className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Main content - 3 columns */}
      <div className="grid grid-cols-[1.2fr_2fr_1.3fr] gap-3 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Weekly Organization Type + Date Range Picker */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Weekly Organization Type Grouped Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0">
            <div className="p-3 h-52 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={16} className="text-blue-600"/>
                {weeklyOrgTypeData.length > 0 && (
                  <div className="flex gap-2 text-[11px]">
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"/>
                      <span className="font-medium text-gray-600">HC:</span>
                      <span className="font-bold text-[#3B82F6]">
                        {weeklyOrgTypeData.reduce((sum, day) => sum + day.homeCollection, 0)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"/>
                      <span className="font-medium text-gray-600">OPD:</span>
                      <span className="font-bold text-[#8B5CF6]">
                        {weeklyOrgTypeData.reduce((sum, day) => sum + day.opd, 0)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-orange-50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"/>
                      <span className="font-medium text-gray-600">IPD:</span>
                      <span className="font-bold text-[#F59E0B]">
                        {weeklyOrgTypeData.reduce((sum, day) => sum + day.ipd, 0)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0 w-full">
                {weeklyOrgTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyOrgTypeData} margin={{top:5,right:10,bottom:5,left:-20}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                      <XAxis dataKey="day" tick={{fontSize:10}} tickLine={false} axisLine={false}/>
                      <YAxis tick={{fontSize:10}} tickLine={false} axisLine={false}/>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Bar dataKey="homeCollection" fill="#3B82F6" radius={[4,4,0,0]} name="Home Collection"/>
                      <Bar dataKey="opd" fill="#8B5CF6" radius={[4,4,0,0]} name="OPD"/>
                      <Bar dataKey="ipd" fill="#F59E0B" radius={[4,4,0,0]} name="IPD"/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs">Loading weekly data...</div>
                )}
              </div>
              <div className="flex gap-3 mt-1 flex-shrink-0 justify-center">
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"/><span className="text-gray-600">Home Collection</span></span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]"/><span className="text-gray-600">OPD</span></span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"/><span className="text-gray-600">IPD</span></span>
              </div>
            </div>
          </div>

          {/* Monthly Review */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0">
            <div className="p-3 flex flex-col h-full">
              <p className="text-[12px] font-bold text-gray-700 mb-2 flex-shrink-0">Monthly Review</p>
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{top:3,right:4,bottom:0,left:-28}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="month" tick={{fontSize:9}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fontSize:9}} tickLine={false} axisLine={false}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Bar dataKey="patients" radius={[2,2,0,0]}>
                      {monthlyData.map((_:any,i:number)=>(<Cell key={i} fill={i%2===0?"#eb7d28":"#113c64"}/>))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Pie charts + Line chart */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Top row - 2 pie charts */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            {/* Locations Pie */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 h-52 flex flex-col">
                <p className="text-[12px] font-bold text-gray-700 mb-2 flex-shrink-0">Top 5 Patient Capture Locations</p>
                <div className="flex-1 min-h-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top:0,right:0,bottom:0,left:0 }}>
                      <Pie data={locData} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2}>
                        {locData.map((_:any,i:number)=><Cell key={i} fill={COLORS_PIE[i%COLORS_PIE.length]}/>)}
                      </Pie>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Legend wrapperStyle={{fontSize:"10px"}} iconType="circle" iconSize={6}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Dept Pie */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 h-52 flex flex-col">
                <p className="text-[12px] font-bold text-gray-700 mb-2 flex-shrink-0">Department wise Tests</p>
                <div className="flex-1 min-h-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top:0,right:0,bottom:0,left:0 }}>
                      <Pie data={deptData} dataKey="value" nameKey="name" innerRadius="28%" outerRadius="52%" paddingAngle={2}>
                        {deptData.map((_:any,i:number)=><Cell key={i} fill={COLORS_DEPT[i%COLORS_DEPT.length]}/>)}
                      </Pie>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Legend wrapperStyle={{fontSize:"10px"}} iconType="circle" iconSize={6}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0">
            <div className="p-3 h-full flex flex-col">
              <p className="text-[12px] font-bold text-gray-700 mb-2 flex-shrink-0">Department-wise Tests</p>
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={LINE_DATA} margin={{top:3,right:4,bottom:0,left:-28}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                    <XAxis dataKey="y" tick={{fontSize:9}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fontSize:9}} tickLine={false} axisLine={false}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    {LINE_SERIES.map(s=>(<Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.2} dot={false} activeDot={{r:3}}/>))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 flex-shrink-0">
                {LINE_SERIES.map(s=>(<span key={s.key} className="flex items-center gap-0.5 text-[9px] text-gray-400"><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:s.color}}/>{s.label}</span>))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Navigation + Date Range Picker */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Quick Navigation */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-shrink-0">
            <div className="p-3 flex flex-col">
              <p className="text-[14px] font-extrabold text-gray-800 mb-3 flex items-center gap-1.5">
                <Rocket size={13} className="text-[#C8651A]"/> Quick Navigation
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
                {QUICK_LINKS.map(({label,path,icon:Icon,color})=>(
                  <button key={label} onClick={()=>router.push(path)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold bg-gray-50 transition-all hover:bg-white hover:shadow-sm hover:scale-105 border border-transparent hover:border-gray-200"
                    style={{color}}>
                    <Icon size={13} style={{color}}/><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Range Picker Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0">
            <div className="p-4 flex flex-col h-full">
              <div className="flex-1 min-h-0">
                <DateRangePicker 
                  onDateRangeChange={(from, to) => {
                    setSelectedFromDate(from);
                    setSelectedToDate(to);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


