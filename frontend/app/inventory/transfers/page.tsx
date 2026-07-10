"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Download, ChevronLeft, ChevronRight,
  Send, Building2, X, Eye, CheckCircle,
} from "lucide-react";
import PageHeader from "@/src/components/BreadCrumb";

/* ─── Types ─────────────────────────────────────────────── */
type TxnStatus = "Pending" | "Dispatched" | "Received" | "Rejected";

interface Transfer {
  id: string;
  refNo: string;
  date: string;
  organization: string;
  itemCount: number;
  totalValue: number;
  status: TxnStatus;
  dispatchedBy: string;
}

/* ─── Mock data ──────────────────────────────────────────── */
const TRANSFERS: Transfer[] = [
  { id:"1", refNo:"TRF-001", date:"2026-06-10", organization:"City Diagnostics",  itemCount:3, totalValue:4500, status:"Dispatched", dispatchedBy:"Admin"     },
  { id:"2", refNo:"TRF-002", date:"2026-06-11", organization:"HealthPlus Lab",     itemCount:2, totalValue:2200, status:"Received",   dispatchedBy:"Admin"     },
  { id:"3", refNo:"TRF-003", date:"2026-06-12", organization:"MediCare Center",    itemCount:5, totalValue:8900, status:"Pending",    dispatchedBy:"Lab Tech"  },
  { id:"4", refNo:"TRF-004", date:"2026-06-13", organization:"City Diagnostics",   itemCount:1, totalValue:980,  status:"Rejected",   dispatchedBy:"Admin"     },
  { id:"5", refNo:"TRF-005", date:"2026-06-14", organization:"HealthPlus Lab",     itemCount:4, totalValue:6300, status:"Dispatched", dispatchedBy:"Admin"     },
];

const ORG_REPORT: Record<string, {
  transfers: { refNo: string; date: string; items: number; value: number; status: TxnStatus }[];
  breakdown:  { name: string; qty: number; unit: string; value: number }[];
}> = {
  "City Diagnostics": {
    transfers: [
      { refNo:"TRF-001", date:"2026-06-10", items:3, value:4500, status:"Dispatched" },
      { refNo:"TRF-004", date:"2026-06-13", items:1, value:980,  status:"Rejected"   },
    ],
    breakdown: [
      { name:"CBC Reagent Kit",     qty:14, unit:"Kit", value:3500 },
      { name:"Lancets (28G)",       qty:20, unit:"Box", value:1980 },
    ],
  },
  "HealthPlus Lab": {
    transfers: [
      { refNo:"TRF-002", date:"2026-06-11", items:2, value:2200, status:"Received"   },
      { refNo:"TRF-005", date:"2026-06-14", items:4, value:6300, status:"Dispatched" },
    ],
    breakdown: [
      { name:"Urine Test Strips",   qty:10, unit:"Box",    value:900  },
      { name:"HbA1c Reagent",       qty:8,  unit:"Bottle", value:7600 },
    ],
  },
  "MediCare Center": {
    transfers: [
      { refNo:"TRF-003", date:"2026-06-12", items:5, value:8900, status:"Pending" },
    ],
    breakdown: [
      { name:"Serum Separator Tubes", qty:32, unit:"Box",    value:5120 },
      { name:"Glucose Oxidase Rgt",   qty:5,  unit:"Bottle", value:3780 },
    ],
  },
};

const ORGS = Object.keys(ORG_REPORT);

/* ─── Helpers ────────────────────────────────────────────── */
const STATUS_STYLE: Record<TxnStatus, string> = {
  Pending:    "text-yellow-700",
  Dispatched: "text-blue-700",
  Received:   "text-green-700",
  Rejected:   "text-red-700",
};

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function exportOrgCSV(org: string) {
  const data = org === "All Organizations"
    ? ORGS.flatMap(o => ORG_REPORT[o].transfers.map(t => ({ org: o, ...t })))
    : ORG_REPORT[org]?.transfers.map(t => ({ org, ...t })) ?? [];
  const headers = ["Org","Ref No","Date","Items","Value","Status"];
  const csv = [headers, ...data.map(r => [
    (r as any).org ?? org, r.refNo, r.date, r.items, r.value, r.status,
  ])].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type:"text/csv" })),
    download: `org-stock-${org.replace(/ /g,"-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
}

/* ─── Org Report Panel ───────────────────────────────────── */
function OrgStockReport({ onClose }: { onClose: () => void }) {
  const [activeOrg, setActiveOrg] = useState("All Organizations");

  const tabs    = ["All Organizations", ...ORGS];
  const isAll   = activeOrg === "All Organizations";
  const orgData = isAll ? null : ORG_REPORT[activeOrg];

  const allTransfers = isAll
    ? ORGS.flatMap(o => ORG_REPORT[o].transfers.map(t => ({ ...t, org: o })))
    : orgData!.transfers.map(t => ({ ...t, org: activeOrg }));

  const totalValue    = allTransfers.reduce((s,t) => s + t.value, 0);
  const totalItems    = allTransfers.reduce((s,t) => s + t.items, 0);
  const lastDate      = allTransfers.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]?.date ?? "-";

  return (
    <motion.div
      initial={{ opacity:0, y:20 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:20 }}
      transition={{ duration:0.25 }}
      className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#1D3F5F]">
        <div className="flex items-center gap-3">
          <Building2 size={18} className="text-white" />
          <h2 className="text-sm font-bold text-white">Organization Stock Report</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportOrgCSV(activeOrg)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
          <button onClick={onClose} className="w-7 h-7 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors">
            <X size={14} className="text-white" />
          </button>
        </div>
      </div>

      {/* Org tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-0 overflow-x-auto border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveOrg(tab)}
            className={`whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeOrg === tab
                ? "border-[#1D3F5F] text-[#1D3F5F] bg-[#1D3F5F]/5"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Mini summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label:"Transfers",    value: allTransfers.length, color:"text-[#1D3F5F]" },
            { label:"Total Items",  value: totalItems,          color:"text-[#EB925A]" },
            { label:"Total Value",  value:`₹${totalValue.toLocaleString("en-IN")}`, color:"text-purple-600" },
            { label:"Last Transfer",value: lastDate,            color:"text-green-600" },
          ].map(s => (
            <div key={s.label} className="bg-[#F8FAFC] rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] text-gray-400 mb-1">{s.label}</p>
              <p className={`font-extrabold text-lg ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Transfer history table */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transfer History</p>
        <div className="overflow-x-auto rounded-xl border border-gray-100 mb-6">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                {(!isAll ? [] : ["Organization"]).concat(["Ref No","Date","Items","Total Value","Status"]).map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allTransfers.map((t,i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {isAll && <td className="px-4 py-2.5 text-xs font-medium text-[#1D3F5F]">{(t as any).org}</td>}
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{t.refNo}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{t.date}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{t.items} items</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">₹{t.value.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Items breakdown — only when a specific org is selected */}
        {!isAll && orgData && (
          <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items Breakdown</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {["Item Name","Total Qty","Unit","Total Value"].map(h=>(
                      <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orgData.breakdown.map((b,i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-[#1D3F5F] text-sm">{b.name}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-700">{b.qty}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{b.unit}</td>
                      <td className="px-4 py-2.5 font-semibold text-purple-700">₹{b.value.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={3} className="px-4 py-2.5 text-xs text-gray-600 text-right">Total</td>
                    <td className="px-4 py-2.5 text-purple-700">₹{orgData.breakdown.reduce((s,b)=>s+b.value,0).toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function TransfersPage() {
  const router = useRouter();
  const [search,     setSearch]     = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [statusFilter, setStatus]   = useState("All status");
  const [page,       setPage]       = useState(1);
  const [showReport, setShowReport] = useState(false);
  const PER_PAGE = 10;

  const filtered = TRANSFERS.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.organization.toLowerCase().includes(q) || t.refNo.toLowerCase().includes(q))
      && (!dateFrom || t.date >= dateFrom)
      && (!dateTo   || t.date <= dateTo)
      && (statusFilter === "All status" || t.status === statusFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const totalValue   = TRANSFERS.reduce((s,t) => s + t.totalValue, 0);
  const dispatched   = TRANSFERS.filter(t => t.status === "Dispatched").length;
  const received     = TRANSFERS.filter(t => t.status === "Received").length;

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen">
      <PageHeader title="Stock Transfers" icon={Send} path="Inventory" />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Transfers"  value={TRANSFERS.length} sub="All time"                  color="text-[#1D3F5F]"  />
        <SummaryCard label="Dispatched"        value={dispatched}       sub="Awaiting confirmation"     color="text-[#EB925A]"  />
        <SummaryCard label="Received"          value={received}         sub="Confirmed by org"          color="text-green-600"  />
        <SummaryCard label="Total Value"       value={`₹${(totalValue/1000).toFixed(1)}K`} sub="Inventory dispatched" color="text-purple-600" />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="Search org, reference..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20"
            />
          </div>
          <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1);}}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none" />
          <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1);}}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none" />
          <select value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1);}}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            {["All status","Pending","Dispatched","Received","Rejected"].map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={()=>{setSearch("");setDateFrom("");setDateTo("");setStatus("All status");setPage(1);}}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg bg-white transition-colors">
            Clear
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReport(v => !v)}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-colors ${
              showReport
                ? "bg-[#1D3F5F] text-white border-[#1D3F5F]"
                : "bg-white text-[#1D3F5F] border-[#1D3F5F] hover:bg-[#1D3F5F]/5"
            }`}
          >
            <Building2 size={14} /> Organization Stock
          </button>
          <button
            onClick={() => router.push("/inventory/transfers/new")}
            className="flex items-center gap-2 text-sm font-semibold bg-[#1D3F5F] hover:bg-[#152e46] text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> New Transfer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                {["Ref No","Date","Organization","Items","Total Value","Status","Dispatched By","Actions"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No transfers found</td></tr>
              ) : paged.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1D3F5F]">{t.refNo}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{t.organization}</td>
                  <td className="px-4 py-3 text-gray-600">{t.itemCount} {t.itemCount === 1 ? "item" : "items"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">₹{t.totalValue.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.dispatchedBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => router.push(`/inventory/transfers/${t.id}`)}
                        className="flex items-center gap-1 text-xs font-semibold bg-[#1D3F5F] hover:bg-[#152e46] text-white px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye size={11} /> View
                      </button>
                      {t.status === "Dispatched" && (
                        <button className="flex items-center gap-1 text-xs font-semibold text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-gray-50">
                          <CheckCircle size={11} /> Ack
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
          <span className="text-xs text-gray-500">Showing {filtered.length} of {TRANSFERS.length} transfers</span>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} />
            </button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={`w-7 h-7 text-xs rounded border transition-colors ${p===page?"bg-[#1D3F5F] text-white border-[#1D3F5F]":"border-gray-200 hover:bg-white"}`}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Org Stock Report — slides in below table */}
      <AnimatePresence>
        {showReport && <OrgStockReport onClose={() => setShowReport(false)} />}
      </AnimatePresence>
    </div>
  );
}
