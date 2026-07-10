"use client";

import { useRouter } from "next/navigation";
import {
  Send, Printer, Download, ChevronLeft,
  CheckCircle, XCircle, Clock, FileText,
  Building2, Truck, User, Calendar,
} from "lucide-react";
import PageHeader from "@/src/components/BreadCrumb";

/* ─── Mock detail data ───────────────────────────────────── */
const MOCK = {
  refNo:        "TRF-001",
  date:         "2026-06-10",
  organization: "City Diagnostics",
  mode:         "Hand Delivery",
  dispatchedBy: "Admin",
  status:       "Dispatched" as const,
  remarks:      "Monthly reagent dispatch for June 2026.",
  items: [
    { no:1, name:"CBC Reagent Kit",     code:"REG-001", category:"Reagent",    qty:4,  unit:"Kit",    pricePerUnit:450, total:1800 },
    { no:2, name:"Lancets (28G)",       code:"CON-003", category:"Consumable", qty:10, unit:"Box",    pricePerUnit:180, total:1800 },
    { no:3, name:"Urine Test Strips",   code:"CON-012", category:"Consumable", qty:5,  unit:"Box",    pricePerUnit:180, total:900  },
  ],
  timeline: [
    { label:"Created",                  time:"2026-06-10 09:00", desc:"Transfer created by Admin",                    done:true  },
    { label:"Dispatched",               time:"2026-06-10 11:30", desc:"Stock dispatched to City Diagnostics",         done:true  },
    { label:"Pending Acknowledgement",  time:"—",                desc:"Awaiting confirmation from City Diagnostics",  done:false },
  ],
};

const STATUS_STYLE: Record<string, string> = {
  Pending:    "bg-yellow-100 text-yellow-700",
  Dispatched: "bg-blue-100 text-blue-700",
  Received:   "bg-green-100 text-green-700",
  Rejected:   "bg-red-100 text-red-700",
};

const CATEGORY_COLORS: Record<string, string> = {
  Reagent:   "bg-blue-100 text-blue-700",
  Consumable:"bg-purple-100 text-purple-700",
  Equipment: "bg-yellow-100 text-yellow-700",
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-[#F8FAFC] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-[#1D3F5F]">{value}</p>
      </div>
    </div>
  );
}

export default function TransferDetailPage() {
  const router  = useRouter();
  const d       = MOCK;
  const grandTotal = d.items.reduce((s,i) => s + i.total, 0);

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen">
      <PageHeader title="Transfer Detail" icon={FileText} path="Inventory / Stock Transfers" />

      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-[#1D3F5F]">{d.refNo}</span>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[d.status]}`}>{d.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer size={14} /> Print
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      <div className="space-y-5">

        {/* ── Transfer Information ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <FileText size={14} className="text-[#1D3F5F]" />
            <h3 className="text-sm font-bold text-[#1D3F5F]">Transfer Information</h3>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            <InfoRow icon={<FileText size={14} className="text-[#1D3F5F]" />}   label="Ref No"       value={d.refNo}        />
            <InfoRow icon={<Building2 size={14} className="text-[#1D3F5F]" />}  label="Organization" value={d.organization} />
            <InfoRow icon={<Calendar size={14} className="text-[#1D3F5F]" />}   label="Date"         value={d.date}         />
            <InfoRow icon={<Truck size={14} className="text-[#EB925A]" />}       label="Mode"         value={d.mode}         />
            <InfoRow icon={<User size={14} className="text-[#1D3F5F]" />}       label="Dispatched By" value={d.dispatchedBy} />
            <InfoRow icon={<Send size={14} className="text-blue-600" />}         label="Status"       value={d.status}       />
          </div>
          {d.remarks && (
            <div className="px-5 pb-4">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-sm text-gray-600 bg-[#F8FAFC] border border-gray-100 rounded-lg px-4 py-2.5">{d.remarks}</p>
            </div>
          )}
        </div>

        {/* ── Items Dispatched ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Send size={14} className="text-[#1D3F5F]" />
            <h3 className="text-sm font-bold text-[#1D3F5F]">Items Dispatched</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  {["#","Item Name","Code","Category","Qty","Unit","Price/Unit","Total Value"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {d.items.map(i => (
                  <tr key={i.no} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i.no}</td>
                    <td className="px-4 py-3 font-medium text-[#1D3F5F]">{i.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{i.code}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[i.category] ?? "bg-gray-100 text-gray-600"}`}>{i.category}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{i.qty}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{i.unit}</td>
                    <td className="px-4 py-3 text-gray-700">₹{i.pricePerUnit.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 font-semibold text-purple-700">₹{i.total.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-gray-50 font-bold border-t border-gray-200">
                  <td colSpan={7} className="px-4 py-3 text-sm text-gray-600 text-right">Grand Total</td>
                  <td className="px-4 py-3 text-base font-extrabold text-purple-700">₹{grandTotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Clock size={14} className="text-[#1D3F5F]" />
            <h3 className="text-sm font-bold text-[#1D3F5F]">Transfer Timeline</h3>
          </div>
          <div className="px-5 py-5">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {d.timeline.map((ev, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Dot */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                      ev.done
                        ? "bg-[#1D3F5F] border-[#1D3F5F]"
                        : "bg-white border-gray-300"
                    }`}>
                      {ev.done
                        ? <CheckCircle size={14} className="text-white" />
                        : <Clock size={14} className="text-gray-400" />
                      }
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-bold ${ev.done ? "text-[#1D3F5F]" : "text-gray-400"}`}>{ev.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{ev.time}</p>
                      <p className={`text-xs mt-1 ${ev.done ? "text-gray-600" : "text-gray-400"}`}>{ev.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom action bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            onClick={() => router.push("/inventory/transfers")}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#1D3F5F] transition-colors"
          >
            <ChevronLeft size={16} /> Back to Transfers
          </button>

          {d.status === "Dispatched" && (
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 text-sm font-bold bg-white hover:bg-red-50 text-red-600 border-2 border-red-200 px-5 py-2.5 rounded-xl transition-colors">
                <XCircle size={15} /> Mark as Rejected
              </button>
              <button className="flex items-center gap-2 text-sm font-bold bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl transition-colors">
                <CheckCircle size={15} /> Mark as Received
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
