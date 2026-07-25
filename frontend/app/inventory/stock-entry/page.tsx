"use client";

import { useState, useEffect } from "react";
import { Package, RotateCcw, ChevronLeft, ChevronRight, Edit2, Trash2, Plus } from "lucide-react";
import StockEntryModal from "@/src/components/StockEntryModal";
import PageHeader from "@/src/components/BreadCrumb";
import inventoryAPI from "@/lib/api/inventory.api";

interface Supplier {
  id: number;
  supplierName: string;
}

interface Item {
  id: number;
  itemId: string;
  itemName: string;
  itemCode: string;
  hsnCode: string;
  gst: number;
  unit: string;
}

interface StockEntry {
  id: number;
  entryId: string;
  supplierId: number;
  invoiceNo: string;
  invoiceDate: string;
  items: Array<{
    itemId: number;
    itemName?: string; // For backward compatibility
    item?: {
      id: number;
      itemName: string;
      itemCode: string;
    };
    batchNo: string;
    expiryDate: string;
    quantity: number;
    pricePerUnit: number;
    basicAmount: number;
    cgst: number;
    sgst: number;
    totalAmount: number;
  }>;
  totalBasicAmount: number;
  totalCGST: number;
  totalSGST: number;
  grandTotal: number;
  status: "Active" | "Inactive";
}

const SAMPLE_SUPPLIERS: Supplier[] = [
  { id: 1, supplierName: "MedSupply Co." },
  { id: 2, supplierName: "LabKit India" },
  { id: 3, supplierName: "BioLab Pvt Ltd" },
];

const SAMPLE_ITEMS: Item[] = [
  {
    id: 1,
    itemId: "IT-001",
    itemName: "CBC Reagent Kit",
    itemCode: "REG-001",
    hsnCode: "30024090",
    gst: 12,
    unit: "Kit",
  },
  {
    id: 2,
    itemId: "IT-002",
    itemName: "Urine Test Strips",
    itemCode: "CON-012",
    hsnCode: "30061100",
    gst: 18,
    unit: "Box",
  },
  {
    id: 3,
    itemId: "IT-003",
    itemName: "Blood Collection Tubes",
    itemCode: "TUBE-005",
    hsnCode: "39241000",
    gst: 5,
    unit: "Pack",
  },
];

export default function StockEntryPage() {
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<StockEntry | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  // Listen for new item creation and refresh items
  useEffect(() => {
    const handleItemCreated = () => {
      console.log("New item created, refreshing items list...");
      // Refresh only the items, not the entire data
      const refreshItems = async () => {
        try {
          const itemsRes = await inventoryAPI.items.getAll(1, 100);
          setItems(itemsRes.data.data || []);
        } catch (err) {
          console.error("Failed to refresh items:", err);
        }
      };
      refreshItems();
    };

    window.addEventListener('itemCreated', handleItemCreated);
    return () => window.removeEventListener('itemCreated', handleItemCreated);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [entriesRes, suppliersRes, itemsRes] = await Promise.all([
        inventoryAPI.stockEntries.getAll(currentPage, ITEMS_PER_PAGE),
        inventoryAPI.suppliers.getAll(1, 100),
        inventoryAPI.items.getAll(1, 100)
      ]);
      
      setStockEntries(entriesRes.data.data || []);
      setSuppliers(suppliersRes.data.data || []);
      setItems(itemsRes.data.data || []);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError("Failed to fetch stock entries data");
    } finally {
      setLoading(false);
    }
  };

  // Get supplier name by ID
  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.supplierName || "-";
  };

  // Get item name by ID
  const getItemName = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    return item?.itemName || "-";
  };

  // Filter entries based on search and inactive filter
  const filteredEntries = stockEntries.filter((entry) => {
    const matchesSearch =
      getSupplierName(entry.supplierId).toLowerCase().includes(search.toLowerCase()) ||
      entry.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      entry.items.some((item) => {
        const itemName = item.item?.itemName || item.itemName || "";
        return itemName.toLowerCase().includes(search.toLowerCase()) ||
               item.batchNo.toLowerCase().includes(search.toLowerCase());
      });

    // If showInactive is checked, show ONLY inactive entries
    // If showInactive is unchecked, show ONLY active entries
    const matchesInactiveFilter = showInactive ? entry.status === "Inactive" : entry.status === "Active";

    return matchesSearch && matchesInactiveFilter;
  });

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this stock entry? This action cannot be undone.")) {
      try {
        await inventoryAPI.stockEntries.delete(id);
        setStockEntries(stockEntries.filter((entry) => entry.id !== id));
        setSuccessMsg("Stock entry deleted successfully!");
        setTimeout(() => setSuccessMsg(""), 2000);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to delete stock entry");
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  const handleToggleActive = (id: number) => {
    const currentEntry = stockEntries.find((e) => e.id === id);
    if (!currentEntry) return;

    const message = currentEntry.status === "Active"
      ? `Do you want to Inactivate this stock entry?\n\nInvoice No: ${currentEntry.invoiceNo}\n\nThe entry will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate this stock entry?\n\nInvoice No: ${currentEntry.invoiceNo}\n\nThe entry will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    setStockEntries(
      stockEntries.map((e) =>
        e.id === id
          ? { ...e, status: e.status === "Active" ? "Inactive" : "Active" }
          : e
      )
    );
    setSuccessMsg(
      currentEntry.status === "Active"
        ? "Stock entry inactivated successfully!"
        : "Stock entry activated successfully!"
    );
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleStockEntrySaved = (entryData: any) => {
    fetchData(); // Refresh list from server
    setShowModal(false);
    setEditingEntry(null);
    setSuccessMsg("Stock entry saved successfully!");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
        {/* Page Header */}
        <PageHeader title="Stock Entry" icon={Package} path="Inventory" />

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap items-center">
            <input
              type="text"
              placeholder="Search by Supplier, Invoice No, Item, Batch..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs sm:text-sm cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 cursor-pointer"
              />
              <span>Show Inactive</span>
            </label>
          </div>
          <button
            onClick={() => {
              setEditingEntry(null);
              setShowModal(true);
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Entry ID
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Supplier
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Invoice No
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Item Name
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Quantity
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Price/Unit
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Grand Total
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Expiry Date
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500 border border-gray-300">
                    Loading stock entries...
                  </td>
                </tr>
              ) : paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) =>
                  entry.items.map((item, itemIndex) => (
                    <tr key={`${entry.id}-${itemIndex}`} className="hover:bg-gray-50 border-b border-gray-200">
                      {itemIndex === 0 && (
                        <>
                          <td rowSpan={entry.items.length} className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                            {entry.entryId}
                          </td>
                          <td rowSpan={entry.items.length} className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                            {getSupplierName(entry.supplierId)}
                          </td>
                          <td rowSpan={entry.items.length} className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                            {entry.invoiceNo}
                          </td>
                        </>
                      )}
                      <td className="border border-gray-300 px-3 py-2 text-gray-600">
                        {item.item?.itemName || item.itemName || "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">
                        ₹ {item.pricePerUnit.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-900">
                        ₹ {entry.grandTotal.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-gray-600 text-xs">
                        {new Date(item.expiryDate).toLocaleDateString("en-GB")}
                      </td>
                      {itemIndex === 0 && (
                        <td rowSpan={entry.items.length} className="border border-gray-300 px-3 py-2">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => handleToggleActive(entry.id)}
                              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                entry.status === "Active"
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : "bg-gray-400 hover:bg-gray-500 text-white"
                              }`}
                            >
                              {entry.status === "Active" ? "Active" : "Inactive"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowModal(true);
                              }}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500 border border-gray-300">
                    No stock entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 mt-4 p-3 bg-white rounded shadow-md">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    currentPage === page
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <StockEntryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEntry(null);
        }}
        onStockEntrySaved={handleStockEntrySaved}
        suppliers={suppliers}
        items={items}
        editingEntry={editingEntry}
      />

      {/* Success Message */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg text-sm">
          {successMsg}
        </div>
      )}
    </>
  );
}
