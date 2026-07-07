"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, X, Package, CheckCircle, ChevronLeft,
} from "lucide-react";
import PageHeader from "@/src/components/BreadCrumb";

/* ─── Types ─────────────────────────────────────────────── */
interface LineItem {
  itemId:   number;
  name:     string;
  code:     string;
  unit:     string;
  price:    number;
  qty:      number;
}

/* ─── Data ───────────────────────────────────────────────── */
const ORGS    = ["City Diagnostics","HealthPlus Lab","MediCare Center","Sunrise Pathology"];
const ITEMS   = [
  { id:1, name:"CBC Reagent Kit",        code:"REG-001", unit:"Kit",    price:450  },
  { id:2, name:"Urine Test Strips",      code:"CON-012", unit:"Box",    price:90   },
  { id:3, name:"Serum Separator Tubes",  code:"CON-007", unit:"Box",    price:160  },
  { id:4, name:"HbA1c Reagent",          code:"REG-008", unit:"Bottle", price:950  },
  { id:5, name:"Lancets (28G)",          code:"CON-003", unit:"Box",    price:99   },
  { id:6, name:"Glucose Oxidase Rgt",    code:"REG-015", unit:"Bottle", price:756  },
];

/* ─── Shared styles ──────────────────────────────────────── */
const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20 focus:border-[#1D3F5F] transition bg-white";
const SELECT = INPUT + " cursor-pointer";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-[#1D3F5F]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function NewTransferPage() {
  const router = useRouter();

  /* form state */
  const [org,      setOrg]      = useState("");
  const [date,     setDate]     = useState(new Date().toISOString().slice(0,10));
  const [note,     setNote]     = useState("");
  const [mode,     setMode]     = useState("Hand Delivery");
  const [remarks,  setRemarks]  = useState("");
  const [lines,    setLines]    = useState<LineItem[]>([]);
  const [selItem,  setSelItem]  = useState(ITEMS[0].id);
  const [selQty,   setSelQty]   = useState(1);
  const [errors,   setErrors]   = useState<Record<string,string>>({});
  const [success,  setSuccess]  = useState(false);

  const totalValue = lines.reduce((s,l) => s + l.price * l.qty, 0);

  /* add line item */
  const addItem = () => {
    const item = ITEMS.find(i => i.id === selItem)!;
    const existing = lines.find(l => l.itemId === selItem);
    if (existing) {
      setLines(prev => prev.map(l => l.itemId === selItem ? { ...l, qty: l.qty + selQty } : l));
    } else {
      setLines(prev => [...prev, { itemId: item.id, name: item.name, code: item.code, unit: item.unit, price: item.price, qty: selQty }]);
    }
    setSelQty(1);
  };

  const removeItem = (id: number) => setLines(prev => prev.filter(l => l.itemId !== id));

  /* submit */
  const handleDispatch = () => {
    const err: Record<string,string> = {};
    if (!org)           err.org   = "Select an organization";
    if (lines.length === 0) err.items = "Add at least one item";
    if (Object.keys(err).length) { setErrors(err); return; }
    setSuccess(true);
    setTimeout(() => router.push("/inventory/transfers"), 2000);
  };

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen">
      <PageHeader title="New Stock Transfer" icon={Send} path="Inventory / Stock Transfers" />

      {/* Success banner */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity:0, y:-16 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-16 }}
            className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-3"
          >
            <CheckCircle size={18} />
            <span className="text-sm font-semibold">Transfer TRF-006 dispatched successfully! Redirecting…</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── LEFT: Form ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Transfer Details */}
          <SectionCard title="Transfer Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Organization <span className="text-red-500">*</span></label>
                <select value={org} onChange={e=>{setOrg(e.target.value);setErrors(v=>({...v,org:""}));}} className={SELECT}>
                  <option value="">Select Organization</option>
                  {ORGS.map(o=><option key={o}>{o}</option>)}
                </select>
                {errors.org && <p className="text-red-500 text-xs mt-1">{errors.org}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Transfer Date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Dispatch Mode</label>
                <select value={mode} onChange={e=>setMode(e.target.value)} className={SELECT}>
                  {["Hand Delivery","Courier","Pickup"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reference Note</label>
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional reference" className={INPUT} />
              </div>
            </div>
          </SectionCard>

          {/* Add Items */}
          <SectionCard title="Add Items">
            {/* Item picker row */}
            <div className="flex gap-2 mb-4">
              <select
                value={selItem}
                onChange={e=>setSelItem(+e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20"
              >
                {ITEMS.map(i=><option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
              </select>
              <input
                type="number" min={1} value={selQty}
                onChange={e=>setSelQty(+e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20"
              />
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 bg-[#EB925A] hover:bg-[#d4783f] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {errors.items && <p className="text-red-500 text-xs mb-3">{errors.items}</p>}

            {/* Line items list */}
            {lines.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <Package size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No items added yet. Select an item above and click Add.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      {["Item","Code","Qty","Unit","Price/Unit","Subtotal",""].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lines.map(l => (
                      <tr key={l.itemId} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-medium text-[#1D3F5F]">{l.name}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-400">{l.code}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-700">{l.qty}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{l.unit}</td>
                        <td className="px-3 py-2.5 text-gray-600">₹{l.price}</td>
                        <td className="px-3 py-2.5 font-semibold text-purple-700">₹{(l.price*l.qty).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={()=>removeItem(l.itemId)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Remarks */}
          <SectionCard title="Remarks">
            <textarea
              value={remarks}
              onChange={e=>setRemarks(e.target.value)}
              rows={3}
              placeholder="Any special instructions or notes for this transfer..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20 focus:border-[#1D3F5F] resize-none transition"
            />
          </SectionCard>
        </div>

        {/* ── RIGHT: Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-[#1D3F5F]">
              <h3 className="text-sm font-bold text-white">Transfer Summary</h3>
              <span className="inline-block mt-1 text-[11px] font-semibold bg-yellow-400/20 text-yellow-200 px-2 py-0.5 rounded-full">Draft</span>
            </div>

            <div className="p-5 space-y-3">
              {/* Info rows */}
              {[
                { label:"To",   value: org  || "—" },
                { label:"Date", value: date || "—" },
                { label:"Mode", value: mode         },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 text-xs">{r.label}</span>
                  <span className="font-semibold text-[#1D3F5F] text-xs text-right max-w-[160px] truncate">{r.value}</span>
                </div>
              ))}

              <div className="border-t border-gray-100 pt-3 space-y-2">
                {lines.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No items yet</p>
                ) : lines.map(l => (
                  <div key={l.itemId} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate max-w-[140px]">{l.name}</span>
                    <span className="font-semibold text-gray-700 ml-2">×{l.qty}</span>
                  </div>
                ))}
              </div>

              {lines.length > 0 && (
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Est. Total Value</span>
                  <span className="font-extrabold text-purple-700">₹{totalValue.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={handleDispatch}
                className="w-full py-3 rounded-xl bg-[#1D3F5F] hover:bg-[#152e46] text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Send size={14} /> Dispatch Transfer
              </button>
              <button
                onClick={() => router.push("/inventory/transfers")}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
