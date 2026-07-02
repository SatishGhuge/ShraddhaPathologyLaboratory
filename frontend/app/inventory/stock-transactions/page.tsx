"use client";

import { useState } from "react";
import {
  Search, Plus, Download, ChevronLeft, ChevronRight,
  RefreshCcw, X, ArrowDownToLine, ArrowUpFromLine,
  SlidersHorizontal, RotateCcw,
} from "lucide-react";
import PageHeader from "@/src/components/BreadCrumb";

/* ─── Types ─────────────────────────────────────────────── */
type TxnType = "Stock In" | "Stock Out" | "Adjustment" | "Return";

interface Transaction {
  id: number;
  date: string;
  itemName: string;
  itemCode: string;
  type: TxnType;
  qty: number;
  unit: string;
  price: number;
  supplier: string;
  batchNo: string;
  remarks: string;
  performedBy: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const TYPE_COLORS: Record<TxnType, string> = {
  "Stock In":   "text-green-700",
  "Stock Out":  "text-red-700",
  "Adjustment": "text-yellow-700",
  "Return":     "text-blue-700",
};

const TYPE_META: Record<TxnType, { icon: React.ReactNode; desc: string }> = {
  "Stock In":   { icon: <ArrowDownToLine size={14} />, desc: "Record goods received from supplier" },
  "Stock Out":  { icon: <ArrowUpFromLine size={14} />, desc: "Items consumed / used in lab" },
  "Adjustment": { icon: <SlidersHorizontal size={14} />, desc: "Correct stock count (damaged, lost, etc.)" },
  "Return":     { icon: <RotateCcw size={14} />, desc: "Return expired / defective stock to supplier" },
};

const ITEMS = [
  { id:1, name:"CBC Reagent Kit",       code:"REG-001", unit:"Kit",    supplier:"MedSupply Co."  },
  { id:2, name:"Urine Test Strips",     code:"CON-012", unit:"Box",    supplier:"LabKit India"   },
  { id:3, name:"Serum Separator Tubes", code:"CON-007", unit:"Box",    supplier:"MedSupply Co."  },
  { id:4, name:"HbA1c Reagent",         code:"REG-008", unit:"Bottle", supplier:"BioLab Pvt Ltd" },
  { id:5, name:"Lancets (28G)",         code:"CON-003", unit:"Box",    supplier:"QuickDiag"      },
  { id:6, name:"Glucose Oxidase Rgt",   code:"REG-015", unit:"Bottle", supplier:"LabKit India"   },
];

const INITIAL_TXN: Transaction[] = [
  { id:1, date:"2026-06-10", itemName:"CBC Reagent Kit",       itemCode:"REG-001", type:"Stock In",   qty:20,  unit:"Kit",    price:1200, supplier:"MedSupply Co.",  batchNo:"BCH-20260610", remarks:"Monthly restock",   performedBy:"Admin"      },
  { id:2, date:"2026-06-11", itemName:"Urine Test Strips",     itemCode:"CON-012", type:"Stock Out",  qty:5,   unit:"Box",    price:450,  supplier:"-",              batchNo:"-",           remarks:"Lab use",           performedBy:"Lab Tech 1"  },
  { id:3, date:"2026-06-11", itemName:"Lancets (28G)",         itemCode:"CON-003", type:"Stock In",   qty:30,  unit:"Box",    price:180,  supplier:"QuickDiag",      batchNo:"BCH-20260611", remarks:"Emergency stock",   performedBy:"Admin"      },
  { id:4, date:"2026-06-12", itemName:"HbA1c Reagent",         itemCode:"REG-008", type:"Adjustment", qty:-2,  unit:"Bottle", price:2100, supplier:"-",              batchNo:"-",           remarks:"Damaged units",     performedBy:"Lab Tech 2"  },
  { id:5, date:"2026-06-13", itemName:"Serum Separator Tubes", itemCode:"CON-007", type:"Return",     qty:5,   unit:"Box",    price:320,  supplier:"MedSupply Co.",  batchNo:"BCH-20260520", remarks:"Expiry return",     performedBy:"Admin"      },
];

/* ─── CSV export ─────────────────────────────────────────── */
function exportCSV(rows: Transaction[]) {
  const headers = ["Date","Item Name","Code","Type","Qty","Unit","Price","Supplier","Batch No","Remarks","Performed By"];
  const csv = [headers, ...rows.map(t => [
    t.date, t.itemName, t.itemCode, t.type,
    t.qty, t.unit, t.price, t.supplier,
    t.batchNo, t.remarks, t.performedBy,
  ])].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `transactions-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
}

/* ─── Shared styles ──────────────────────────────────────── */
const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20 focus:border-[#1D3F5F] transition";
const SELECT = INPUT + " bg-white cursor-pointer";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD TRANSACTION MODAL
══════════════════════════════════════════════════════════════ */
function AddTransactionModal({
  onSave, onClose,
}: {
  onSave: (txn: Omit<Transaction, "id">) => void;
  onClose: () => void;
}) {
  const [type,      setType]      = useState<TxnType>("Stock In");
  const [itemId,    setItemId]    = useState(ITEMS[0].id);
  const [qty,       setQty]       = useState(1);
  const [price,     setPrice]     = useState(0);
  const [supplier,  setSupplier]  = useState(ITEMS[0].supplier);
  const [batchNo,   setBatchNo]   = useState("");
  const [remarks,   setRemarks]   = useState("");
  const [date,      setDate]      = useState(new Date().toISOString().slice(0,10));
  const [errors,    setErrors]    = useState<Record<string,string>>({});

  const selectedItem = ITEMS.find(i => i.id === itemId)!;

  const changeItem = (id: number) => {
    setItemId(id);
    const it = ITEMS.find(i => i.id === id);
    if (it) setSupplier(it.supplier);
  };

  /* For Stock Out / Adjustment negative qty is valid */
  const isNegativeAllowed = type === "Stock Out" || type === "Adjustment";

  const validate = () => {
    const err: Record<string,string> = {};
    if (qty === 0) err.qty = "Quantity cannot be zero";
    if (price < 0) err.price = "Cannot be negative";
    if ((type === "Stock In" || type === "Return") && !batchNo.trim()) err.batchNo = "Batch number required for Stock In / Return";
    return err;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (Object.keys(err).length) { setErrors(err); return; }

    const finalQty = isNegativeAllowed && qty > 0 ? -qty : Math.abs(qty);

    onSave({
      date,
      itemName: selectedItem.name,
      itemCode: selectedItem.code,
      type,
      qty: type === "Stock In" || type === "Return" ? Math.abs(qty) : finalQty,
      unit: selectedItem.unit,
      price,
      supplier: supplier || "-",
      batchNo:  batchNo  || "-",
      remarks:  remarks  || "-",
      performedBy: "Admin",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-[#1D3F5F] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <RefreshCcw size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Add Transaction</h2>
              <p className="text-xs text-blue-200">Record a stock movement</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Transaction type selector */}
        <div className="px-6 pt-5 pb-2 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 mb-2">Transaction Type <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-2 gap-2">
            {(["Stock In","Stock Out","Adjustment","Return"] as TxnType[]).map(t => {
              const meta = TYPE_META[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    active
                      ? "border-[#1D3F5F] bg-[#1D3F5F]/5"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className={`mt-0.5 flex-shrink-0 ${active ? "text-[#1D3F5F]" : "text-gray-400"}`}>
                    {meta.icon}
                  </span>
                  <div>
                    <p className={`text-xs font-bold ${active ? "text-[#1D3F5F]" : "text-gray-700"}`}>{t}</p>
                    <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{meta.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 pb-2 pt-3 space-y-3">

          {/* Item + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item" required>
              <select value={itemId} onChange={e=>changeItem(+e.target.value)} className={SELECT}>
                {ITEMS.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
            <Field label="Date" required>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={INPUT} />
            </Field>
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Quantity ${isNegativeAllowed ? "(will be deducted)" : ""}`} required error={errors.qty}>
              <input
                type="number"
                min={1}
                value={Math.abs(qty)}
                onChange={e=>setQty(+e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Price per unit (₹)" error={errors.price}>
              <input type="number" min={0} value={price} onChange={e=>setPrice(+e.target.value)} className={INPUT} />
            </Field>
          </div>

          {/* Supplier + Batch */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier">
              <input value={supplier} onChange={e=>setSupplier(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Batch Number" error={errors.batchNo}>
              <input value={batchNo} onChange={e=>setBatchNo(e.target.value)} placeholder="BCH-20260614" className={INPUT} />
            </Field>
          </div>

          {/* Remarks */}
          <Field label="Remarks">
            <input value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Reason / notes..." className={INPUT} />
          </Field>

          {/* Summary pill */}
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${TYPE_COLORS[type].includes("green") ? "bg-green-50 border-green-200" : TYPE_COLORS[type].includes("red") ? "bg-red-50 border-red-200" : TYPE_COLORS[type].includes("yellow") ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"}`}>
            <span className="text-xs font-medium text-gray-600">Effect on stock</span>
            <span className={`font-bold text-sm ${type==="Stock In"||type==="Return"?"text-green-700":"text-red-600"}`}>
              {type==="Stock In"||type==="Return" ? "+" : "-"}{Math.abs(qty) || 0} {selectedItem.unit}
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50 flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-[#EB925A] hover:bg-[#d4783f] text-white text-sm font-bold transition-colors">
            Save Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function StockTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TXN);
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("All types");
  const [page,        setPage]        = useState(1);
  const [showModal,   setShowModal]   = useState(false);
  const PER_PAGE = 10;
  const nextId   = () => Math.max(0, ...transactions.map(t=>t.id)) + 1;

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.itemName.toLowerCase().includes(q) || t.itemCode.toLowerCase().includes(q) || t.batchNo.toLowerCase().includes(q))
      && (typeFilter === "All types" || t.type === typeFilter);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const handleAdd = (txn: Omit<Transaction,"id">) => {
    setTransactions(prev => [{ ...txn, id: nextId() }, ...prev]);
    setShowModal(false);
  };

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen">
      <PageHeader title="Stock Transactions" icon={RefreshCcw} path="Inventory" />

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search item, code, batch..." className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20" />
          </div>
          <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            {["All types","Stock In","Stock Out","Adjustment","Return"].map(t=><option key={t}>{t}</option>)}
          </select>
          <button onClick={()=>{setSearch("");setTypeFilter("All types");setPage(1);}} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg bg-white transition-colors">Clear</button>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>exportCSV(filtered)} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 text-sm font-semibold bg-[#EB925A] hover:bg-[#d4783f] text-white px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                {["Date","Item Name","Code","Type","Qty","Unit","Price","Supplier","Batch No","Remarks","By"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">No transactions found</td></tr>
              ) : paged.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 font-medium text-[#1D3F5F]">{t.itemName}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{t.itemCode}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[t.type]}`}>{t.type}</span>
                  </td>
                  <td className={`px-4 py-3 font-bold ${t.qty > 0 ? "text-green-600":"text-red-600"}`}>
                    {t.qty > 0 ? `+${t.qty}` : t.qty}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.unit}</td>
                  <td className="px-4 py-3 text-gray-700">₹{t.price.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.supplier}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{t.batchNo}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.remarks}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
          <span className="text-xs text-gray-500">Showing {filtered.length} of {transactions.length} transactions</span>
          <div className="flex items-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={`w-7 h-7 text-xs rounded border ${p===page?"bg-[#1D3F5F] text-white border-[#1D3F5F]":"border-gray-200 hover:bg-white"}`}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded border border-gray-200 hover:bg-white disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {showModal && <AddTransactionModal onSave={handleAdd} onClose={()=>setShowModal(false)} />}
    </div>
  );
}
