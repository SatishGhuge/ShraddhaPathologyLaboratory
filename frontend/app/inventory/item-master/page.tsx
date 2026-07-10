"use client";

import { useState } from "react";
import {
  Search, Plus, Download, Package,
  MoreVertical, ChevronLeft, ChevronRight, X,
  TrendingUp, Edit2, Trash2,
} from "lucide-react";
import PageHeader from "@/src/components/BreadCrumb";

/* ─── Types ─────────────────────────────────────────────── */
type ItemCategory = "Reagent" | "Consumable" | "Equipment" | "Other";
type ItemStatus   = "Active" | "Inactive";
type ExpiryStatus = "OK" | "Expired" | "Expiring Soon";

interface InventoryItem {
  id: number;
  name: string;
  code: string;
  category: ItemCategory;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  buyPrice: number;
  sellPrice: number;
  supplier: string;
  expiryDate: string;
  expiryStatus: ExpiryStatus;
  status: ItemStatus;
}

/* ─── Helpers ─────────────────────────────────────────────── */
function computeExpiryStatus(dateStr: string): ExpiryStatus {
  if (!dateStr) return "OK";
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return "Expired";
  if (diff <= 30) return "Expiring Soon";
  return "OK";
}

function exportCSV(rows: InventoryItem[]) {
  const headers = ["Item Name","Code","Category","Unit","Current Stock","Reorder Level","Buy Price","Sell Price","Supplier","Expiry Date","Expiry Status","Status"];
  const csv = [headers, ...rows.map(i => [
    i.name, i.code, i.category, i.unit,
    i.currentStock, i.reorderLevel, i.buyPrice, i.sellPrice,
    i.supplier, i.expiryDate, i.expiryStatus, i.status,
  ])].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `inventory-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
}

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  Reagent:   "text-blue-700",
  Consumable:"text-purple-700",
  Equipment: "text-yellow-700",
  Other:     "text-gray-600",
};
const EXPIRY_COLORS: Record<ExpiryStatus, string> = {
  OK:             "text-green-700",
  "Expiring Soon":"text-yellow-700",
  Expired:        "text-red-700",
};

const INITIAL: InventoryItem[] = [
  { id:1, name:"CBC Reagent Kit",       code:"REG-001", category:"Reagent",    unit:"Kit",    currentStock:14, reorderLevel:10, buyPrice:1200, sellPrice:1500, supplier:"MedSupply Co.",  expiryDate:"2026-03-01", expiryStatus:"Expired", status:"Active"   },
  { id:2, name:"Urine Test Strips",     code:"CON-012", category:"Consumable", unit:"Box",    currentStock:6,  reorderLevel:15, buyPrice:450,  sellPrice:600,  supplier:"LabKit India",   expiryDate:"2026-03-15", expiryStatus:"Expired", status:"Active"   },
  { id:3, name:"Serum Separator Tubes", code:"CON-007", category:"Consumable", unit:"Box",    currentStock:32, reorderLevel:20, buyPrice:320,  sellPrice:400,  supplier:"MedSupply Co.",  expiryDate:"2026-04-10", expiryStatus:"Expired", status:"Active"   },
  { id:4, name:"HbA1c Reagent",         code:"REG-008", category:"Reagent",    unit:"Bottle", currentStock:4,  reorderLevel:8,  buyPrice:2100, sellPrice:2700, supplier:"BioLab Pvt Ltd", expiryDate:"2026-02-20", expiryStatus:"Expired", status:"Active"   },
  { id:5, name:"Lancets (28G)",         code:"CON-003", category:"Consumable", unit:"Box",    currentStock:55, reorderLevel:30, buyPrice:180,  sellPrice:240,  supplier:"QuickDiag",      expiryDate:"2027-06-30", expiryStatus:"OK",      status:"Active"   },
  { id:6, name:"Glucose Oxidase Rgt",   code:"REG-015", category:"Reagent",    unit:"Bottle", currentStock:0,  reorderLevel:5,  buyPrice:980,  sellPrice:1300, supplier:"LabKit India",   expiryDate:"2026-01-10", expiryStatus:"Expired", status:"Inactive" },
];

/* ─── Shared input styles ─────────────────────────────────── */
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

function StockBar({ current, reorder }: { current: number; reorder: number }) {
  const max   = Math.max(reorder * 2, current + 5, 10);
  const pct   = Math.min((current / max) * 100, 100);
  const color = current === 0 ? "bg-red-500" : current <= reorder ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <span className="text-xs font-semibold w-8 text-right">{current}/{reorder}</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD / EDIT ITEM SLIDE-OVER
══════════════════════════════════════════════════════════════ */
function ItemFormPanel({
  initial, onSave, onClose,
}: {
  initial?: Partial<InventoryItem>;
  onSave: (data: Omit<InventoryItem, "id" | "expiryStatus">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    category: (initial?.category ?? "Reagent") as ItemCategory,
    unit: initial?.unit ?? "",
    currentStock: initial?.currentStock ?? 0,
    reorderLevel: initial?.reorderLevel ?? 0,
    buyPrice:  initial?.buyPrice  ?? 0,
    sellPrice: initial?.sellPrice ?? 0,
    supplier:  initial?.supplier  ?? "",
    expiryDate: initial?.expiryDate ?? "",
    status: (initial?.status ?? "Active") as ItemStatus,
  });
  const [errors, setErrors] = useState<Record<string,string>>({});

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string,string> = {};
    if (!form.name.trim())     err.name     = "Required";
    if (!form.code.trim())     err.code     = "Required";
    if (!form.unit.trim())     err.unit     = "Required";
    if (!form.supplier.trim()) err.supplier = "Required";
    if (form.buyPrice  <= 0)   err.buyPrice = "Must be > 0";
    if (form.sellPrice <= 0)   err.sellPrice= "Must be > 0";
    if (Object.keys(err).length) { setErrors(err); return; }
    onSave(form);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1D3F5F]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{initial?.id ? "Edit Item" : "Add New Item"}</h2>
              <p className="text-xs text-blue-200">Fill in all item details</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item Name" required error={errors.name}>
              <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="CBC Reagent Kit" className={INPUT} />
            </Field>
            <Field label="Item Code" required error={errors.code}>
              <input value={form.code} onChange={e=>set("code",e.target.value)} placeholder="REG-001" className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={e=>set("category",e.target.value)} className={SELECT}>
                {["Reagent","Consumable","Equipment","Other"].map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Unit" required error={errors.unit}>
              <input value={form.unit} onChange={e=>set("unit",e.target.value)} placeholder="Kit / Box / Bottle" className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Stock">
              <input type="number" min={0} value={form.currentStock} onChange={e=>set("currentStock",+e.target.value)} className={INPUT} />
            </Field>
            <Field label="Reorder Level">
              <input type="number" min={0} value={form.reorderLevel} onChange={e=>set("reorderLevel",+e.target.value)} className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Buy Price (₹)" required error={errors.buyPrice}>
              <input type="number" min={0} value={form.buyPrice} onChange={e=>set("buyPrice",+e.target.value)} className={INPUT} />
            </Field>
            <Field label="Sell Price (₹)" required error={errors.sellPrice}>
              <input type="number" min={0} value={form.sellPrice} onChange={e=>set("sellPrice",+e.target.value)} className={INPUT} />
            </Field>
          </div>

          <Field label="Supplier" required error={errors.supplier}>
            <input value={form.supplier} onChange={e=>set("supplier",e.target.value)} placeholder="Supplier name" className={INPUT} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry Date">
              <input type="date" value={form.expiryDate} onChange={e=>set("expiryDate",e.target.value)} className={INPUT} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e=>set("status",e.target.value as ItemStatus)} className={SELECT}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
          </div>
        </form>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-[#1D3F5F] hover:bg-[#152e46] text-white text-sm font-bold transition-colors">
            {initial?.id ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   STOCK ENTRY MODAL
══════════════════════════════════════════════════════════════ */
function StockEntryModal({
  items, preselectedId, onSave, onClose,
}: {
  items: InventoryItem[];
  preselectedId?: number;
  onSave: (itemId: number, qty: number, batch: string, expiry: string, supplier: string, remarks: string) => void;
  onClose: () => void;
}) {
  const activeItems = items.filter(i => i.status === "Active");
  const [itemId,   setItemId]   = useState(preselectedId ?? activeItems[0]?.id ?? 0);
  const [qty,      setQty]      = useState(1);
  const [batch,    setBatch]    = useState("");
  const [expiry,   setExpiry]   = useState("");
  const [supplier, setSupplier] = useState(() => activeItems.find(i => i.id === (preselectedId ?? activeItems[0]?.id))?.supplier ?? "");
  const [remarks,  setRemarks]  = useState("");
  const [errors,   setErrors]   = useState<Record<string,string>>({});

  const selected = items.find(i => i.id === itemId);

  const changeItem = (id: number) => {
    setItemId(id);
    const it = items.find(i => i.id === id);
    if (it) setSupplier(it.supplier);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string,string> = {};
    if (!itemId)       err.item  = "Select an item";
    if (qty <= 0)      err.qty   = "Must be > 0";
    if (!batch.trim()) err.batch = "Required";
    if (!expiry)       err.expiry= "Required";
    if (Object.keys(err).length) { setErrors(err); return; }
    onSave(itemId, qty, batch, expiry, supplier, remarks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#EB925A] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Stock Entry</h2>
              <p className="text-xs text-orange-100">Record incoming stock</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <Field label="Select Item" required error={errors.item}>
            <select value={itemId} onChange={e=>changeItem(+e.target.value)} className={SELECT}>
              {activeItems.map(i=><option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
            </select>
          </Field>

          {selected && (
            <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Current stock</span>
              <span className="font-bold text-[#1D3F5F] text-sm">{selected.currentStock} {selected.unit}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Qty Received" required error={errors.qty}>
              <input type="number" min={1} value={qty} onChange={e=>setQty(+e.target.value)} className={INPUT} />
            </Field>
            <Field label="Batch Number" required error={errors.batch}>
              <input value={batch} onChange={e=>setBatch(e.target.value)} placeholder="BCH-20260614" className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry Date" required error={errors.expiry}>
              <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Supplier">
              <input value={supplier} onChange={e=>setSupplier(e.target.value)} className={INPUT} />
            </Field>
          </div>

          <Field label="Remarks">
            <input value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Monthly restock..." className={INPUT} />
          </Field>

          {selected && qty > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-green-700 font-medium">Stock after entry</span>
              <span className="font-bold text-green-700 text-sm">{selected.currentStock + qty} {selected.unit}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#EB925A] hover:bg-[#d4783f] text-white text-sm font-bold transition-colors">
              Add Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function ItemMasterPage() {
  const [items,    setItems]    = useState<InventoryItem[]>(INITIAL);
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All categories");
  const [status,   setStatus]   = useState("All status");
  const [page,     setPage]     = useState(1);

  const [showAddItem,       setShowAddItem]       = useState(false);
  const [editItem,          setEditItem]          = useState<InventoryItem | null>(null);
  const [showStockEntry,    setShowStockEntry]    = useState(false);
  const [stockEntryItemId,  setStockEntryItemId]  = useState<number | undefined>(undefined);
  const [actionMenuId,      setActionMenuId]      = useState<number | null>(null);

  const PER_PAGE = 10;
  const nextId   = () => Math.max(0, ...items.map(i => i.id)) + 1;

  /* filters */
  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q))
      && (category === "All categories" || i.category === category)
      && (status   === "All status"     || i.status   === status);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  /* summary */
  const totalValue = items.reduce((s,i) => s + i.buyPrice * i.currentStock, 0);
  const lowStock   = items.filter(i => i.currentStock <= i.reorderLevel).length;
  const expiring30 = items.filter(i => i.expiryStatus === "Expiring Soon").length;
  const expired    = items.filter(i => i.expiryStatus === "Expired").length;

  /* handlers */
  const handleAddItem = (data: Omit<InventoryItem,"id"|"expiryStatus">) => {
    setItems(prev => [{ ...data, id: nextId(), expiryStatus: computeExpiryStatus(data.expiryDate) }, ...prev]);
    setShowAddItem(false);
  };

  const handleEditSave = (data: Omit<InventoryItem,"id"|"expiryStatus">) => {
    setItems(prev => prev.map(i =>
      i.id === editItem!.id ? { ...i, ...data, expiryStatus: computeExpiryStatus(data.expiryDate) } : i
    ));
    setEditItem(null);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    setActionMenuId(null);
  };

  const handleStockEntry = (itemId: number, qty: number, _batch: string, expiryDate: string, _supplier: string, _remarks: string) => {
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, currentStock: i.currentStock + qty, expiryDate, expiryStatus: computeExpiryStatus(expiryDate) }
        : i
    ));
    setShowStockEntry(false);
  };

  const openStockEntryFor = (id: number) => {
    setStockEntryItemId(id);
    setShowStockEntry(true);
    setActionMenuId(null);
  };

  return (
    <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen" onClick={() => setActionMenuId(null)}>
      <PageHeader title="Item Master" icon={Package} path="Inventory" />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total inventory value" value={`₹${(totalValue/1000).toFixed(0)}K`} sub={`${items.filter(i=>i.status==="Active").length} active items`} color="text-[#1D3F5F]" />
        <SummaryCard label="Low stock items"        value={lowStock}    sub="Below reorder level"  color="text-[#EB925A]" />
        <SummaryCard label="Expiring in 30 days"    value={expiring30}  sub="Needs attention"      color="text-green-600" />
        <SummaryCard label="Expired items"          value={expired}     sub="Remove from use"      color="text-red-500"   />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search name, code, supplier..." className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20" />
          </div>
          <select value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            {["All categories","Reagent","Consumable","Equipment","Other"].map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            {["All status","Active","Inactive"].map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={()=>{setSearch("");setCategory("All categories");setStatus("All status");setPage(1);}} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg bg-white transition-colors">Clear</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>exportCSV(filtered)} className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={()=>{setStockEntryItemId(undefined);setShowStockEntry(true);}} className="flex items-center gap-2 text-sm font-semibold bg-[#EB925A] hover:bg-[#d4783f] text-white px-4 py-2 rounded-lg transition-colors">
            <TrendingUp size={14} /> Stock Entry
          </button>
          <button onClick={()=>setShowAddItem(true)} className="flex items-center gap-2 text-sm font-semibold bg-[#1D3F5F] hover:bg-[#152e46] text-white px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                {["Item Name","Code","Category","Unit","Stock","Buy ₹","Sell ₹","Supplier","Expiry","Status","Actions"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    No items found
                  </td>
                </tr>
              ) : paged.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1D3F5F]">{item.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{item.code}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>{item.category}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3">
                    <StockBar current={item.currentStock} reorder={item.reorderLevel} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">₹{item.buyPrice.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-700">₹{item.sellPrice.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.supplier}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${EXPIRY_COLORS[item.expiryStatus]}`}>{item.expiryStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.status==="Active"?"text-green-700":"text-gray-500"}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3 relative" onClick={e=>e.stopPropagation()}>
                    <button
                      onClick={()=>setActionMenuId(actionMenuId===item.id?null:item.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={15} className="text-gray-400" />
                    </button>
                    {actionMenuId === item.id && (
                      <div className="absolute right-4 top-10 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-44 py-1 text-sm">
                        <button onClick={()=>{setEditItem(item);setActionMenuId(null);}} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors">
                          <Edit2 size={13} className="text-[#1D3F5F]" /> Edit Item
                        </button>
                        <button onClick={()=>openStockEntryFor(item.id)} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors">
                          <TrendingUp size={13} className="text-[#EB925A]" /> Stock Entry
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={()=>handleDelete(item.id)} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50">
          <span className="text-xs text-gray-500">Showing {filtered.length} of {items.length} items</span>
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

      {/* Modals / Panels */}
      {showAddItem && <ItemFormPanel onSave={handleAddItem} onClose={()=>setShowAddItem(false)} />}
      {editItem    && <ItemFormPanel initial={editItem} onSave={handleEditSave} onClose={()=>setEditItem(null)} />}
      {showStockEntry && (
        <StockEntryModal
          items={items}
          preselectedId={stockEntryItemId}
          onSave={handleStockEntry}
          onClose={()=>setShowStockEntry(false)}
        />
      )}
    </div>
  );
}
