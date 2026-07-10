"use client";

import { useState } from "react";
import { Search, Download, Clock, AlertTriangle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/src/components/BreadCrumb";

type ExpiryStatus = "OK" | "Expiring Soon" | "Expired";

interface ExpiryItem {
  id: number;
  name: string;
  code: string;
  category: string;
  batchNo: string;
  qty: number;
  unit: string;
  expiryDate: string;
  daysLeft: number;
  status: ExpiryStatus;
  supplier: string;
}

const STATUS_CONFIG: Record<ExpiryStatus, { color: string; icon: React.ReactNode; bg: string }> = {
  "OK":             { color: "text-green-700",  icon: <Clock size={14} />,         bg: "" },
  "Expiring Soon":  { color: "text-yellow-700", icon: <AlertTriangle size={14} />, bg: "" },
  "Expired":        { color: "text-red-700",    icon: <XCircle size={14} />,       bg: "" },
};

const MOCK: ExpiryItem[] = [
  { id:1, name:"CBC Reagent Kit",       code:"REG-001", category:"Reagent",    batchNo:"BCH-2025-01", qty:14, unit:"Kit",    expiryDate:"2026-03-01", daysLeft:-105, status:"Expired",       supplier:"MedSupply Co."  },
  { id:2, name:"Urine Test Strips",     code:"CON-012", category:"Consumable", batchNo:"BCH-2025-04", qty:6,  unit:"Box",    expiryDate:"2026-03-15", daysLeft:-91,  status:"Expired",       supplier:"LabKit India"   },
  { id:3, name:"Serum Separator Tubes", code:"CON-007", category:"Consumable", batchNo:"BCH-2026-01", qty:32, unit:"Box",    expiryDate:"2026-07-10", daysLeft:26,   status:"Expiring Soon", supplier:"MedSupply Co."  },
  { id:4, name:"HbA1c Reagent",         code:"REG-008", category:"Reagent",    batchNo:"BCH-2025-08", qty:4,  unit:"Bottle", expiryDate:"2026-02-20", daysLeft:-114, status:"Expired",       supplier:"BioLab Pvt Ltd" },
  { id:5, name:"Lancets (28G)",         code:"CON-003", category:"Consumable", batchNo:"BCH-2026-06", qty:55, unit:"Box",    expiryDate:"2027-06-30", daysLeft:381,  status:"OK",            supplier:"QuickDiag"      },
  { id:6, name:"Glucose Oxidase Rgt",   code:"REG-015", category:"Reagent",    batchNo:"BCH-2025-12", qty:0,  unit:"Bottle", expiryDate:"2026-01-10", daysLeft:-155, status:"Expired",       supplier:"LabKit India"   },
];

export default function ExpiryTrackerPage() {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<ExpiryStatus | "All">("All");
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  const filtered = MOCK.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.batchNo.toLowerCase().includes(q))
      && (statusFilter === "All" || i.status === statusFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const counts = {
    all:     MOCK.length,
    ok:      MOCK.filter(i=>i.status==="OK").length,
    soon:    MOCK.filter(i=>i.status==="Expiring Soon").length,
    expired: MOCK.filter(i=>i.status==="Expired").length,
  };

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen">
      <PageHeader title="Expiry Tracker" icon={Clock} path="Inventory" />

      {/* ── Status filter tabs ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {([
          { label:"All Items",      value:"All",           count:counts.all,     color:"text-gray-700 border border-gray-200" },
          { label:"OK",             value:"OK",            count:counts.ok,      color:"text-green-700 border border-green-200" },
          { label:"Expiring Soon",  value:"Expiring Soon", count:counts.soon,    color:"text-yellow-700 border border-yellow-200" },
          { label:"Expired",        value:"Expired",       count:counts.expired, color:"text-red-700 border border-red-200" },
        ] as const).map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value as any); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${tab.color} ${statusFilter === tab.value ? "ring-2 ring-offset-1 ring-[#1D3F5F]" : ""}`}
          >
            {tab.label}
            <span className="font-bold text-base">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Search + Export ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search item, code, batch..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20"
          />
        </div>
        <button className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                {["Item Name","Code","Category","Batch No","Qty","Unit","Expiry Date","Days Left","Status","Supplier"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">No items found</td></tr>
              ) : paged.map(i => {
                const cfg = STATUS_CONFIG[i.status];
                return (
                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1D3F5F]">{i.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{i.code}</td>
                    <td className="px-4 py-3 text-gray-600">{i.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{i.batchNo}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{i.qty}</td>
                    <td className="px-4 py-3 text-gray-600">{i.unit}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{i.expiryDate}</td>
                    <td className={`px-4 py-3 font-bold text-sm ${i.daysLeft < 0 ? "text-red-600" : i.daysLeft <= 30 ? "text-yellow-600" : "text-green-600"}`}>
                      {i.daysLeft < 0 ? `${Math.abs(i.daysLeft)} days ago` : `${i.daysLeft} days`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.icon} {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{i.supplier}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
          <span className="text-xs text-gray-500">Showing {filtered.length} of {MOCK.length} items</span>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronLeft size={14}/></button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={`w-7 h-7 text-xs rounded border ${p===page?"bg-[#1D3F5F] text-white border-[#1D3F5F]":"border-gray-200 hover:bg-white"}`}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronRight size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}
