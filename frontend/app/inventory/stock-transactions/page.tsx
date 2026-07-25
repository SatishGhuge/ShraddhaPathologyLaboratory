"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle, AlertTriangle, Package, ChevronLeft, ChevronRight,
  Search, X, Check
} from "lucide-react";
import inventoryAPI from "@/lib/api/inventory.api";

/* ─── Types ─────────────────────────────────────────────── */
interface StockTransaction {
  id: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  unit: string;
  availableQuantity: number;
  minimumStockLevel: number;
  expiryDate: string;
  batchNo: string;
  supplier: string;
  remarks?: string;
}

type AlertType = "none" | "minimum" | "expiring" | "expired";

/* ─── Helper Functions ─────────────────────────────────────── */
function getAlertType(stock: number, minimum: number, expiryDate: string): AlertType {
  if (expiryDate) {
    const diff = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (diff < 0) return "expired";
    if (diff <= 30) return "expiring";
  }
  if (stock <= minimum) return "minimum";
  return "none";
}

function getAlertColor(alertType: AlertType): string {
  switch (alertType) {
    case "expired":
      return "text-red-700 bg-red-50";
    case "expiring":
      return "text-yellow-700 bg-yellow-50";
    case "minimum":
      return "text-orange-700 bg-orange-50";
    default:
      return "text-green-700 bg-green-50";
  }
}

function getAlertMessage(alertType: AlertType, stock: number, minimum: number, expiryDate: string): string {
  if (alertType === "expired") return "Expired";
  if (alertType === "expiring") {
    const diff = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    return `Expires in ${diff} days`;
  }
  if (alertType === "minimum") return `Low Stock (${stock}/${minimum})`;
  return "In Stock";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-GB");
}


/* ═══════════════════════════════════════════════════════════
   QUANTITY UPDATE MODAL
══════════════════════════════════════════════════════════════ */
interface QuantityUpdateModalProps {
  item: StockTransaction;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (quantity: number, remark: string) => void;
}

function QuantityUpdateModal({ item, isOpen, onClose, onUpdate }: QuantityUpdateModalProps) {
  const [quantity, setQuantity] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleUpdate = () => {
    setError("");

    if (!quantity.trim()) {
      setError("Quantity is required");
      return;
    }

    const qty = parseInt(quantity);

    if (isNaN(qty)) {
      setError("Quantity must be a number");
      return;
    }

    if (qty <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    if (qty > item.availableQuantity) {
      setError(`Cannot exceed available stock (${item.availableQuantity})`);
      return;
    }

    onUpdate(qty, remark);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-lg max-w-md w-full p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{item.itemName}</h2>
            <p className="text-xs text-gray-500">{item.itemCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Item Info */}
        <div className="space-y-1 p-2 bg-gray-50 rounded text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Available:</span>
            <span className="font-semibold text-gray-900">{item.availableQuantity} {item.unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Batch:</span>
            <span className="font-semibold text-gray-900">{item.batchNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Expiry:</span>
            <span className="font-semibold text-gray-900">{formatDate(item.expiryDate)}</span>
          </div>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Quantity to Remove <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter qty"
              min="0"
              max={item.availableQuantity}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-600 font-medium text-sm">{item.unit}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Max: {item.availableQuantity}</p>
        </div>

        {/* Remark Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Remark (Optional)
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Add remark..."
            rows={2}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1"
          >
            <Check size={16} />
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function StockTransactionsPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [filterAlert, setFilterAlert] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<StockTransaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const ITEMS_PER_PAGE = 15;

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await inventoryAPI.labStocks.getAll(1, 100);
      const stocks = res.data?.data || [];
      const mapped = stocks.map((s: any) => ({
        id: s.id,
        itemId: s.itemId,
        itemName: s.item?.itemName || "-",
        itemCode: s.item?.itemCode || "-",
        unit: s.item?.unit || "Box",
        availableQuantity: s.quantityAvailable || s.availableQuantity || 0,
        minimumStockLevel: s.minimumStockLevel || 0,
        expiryDate: s.expiryDate,
        batchNo: s.batchNo,
        supplier: "Internal",
        remarks: ""
      }));
      setTransactions(mapped);
    } catch (err) {
      console.error("Failed to fetch lab stocks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.itemName.toLowerCase().includes(search.toLowerCase()) ||
      tx.itemCode.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const alertType = getAlertType(tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate);

    if (filterAlert === "all") return true;
    if (filterAlert === "critical") return alertType === "expired" || (alertType === "minimum" && tx.availableQuantity === 0);
    if (filterAlert === "expiring") return alertType === "expiring" || alertType === "expired";
    if (filterAlert === "lowstock") return alertType === "minimum";

    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleItemClick = (item: StockTransaction) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleQuantityUpdate = async (quantity: number, remark: string) => {
    if (!selectedItem) return;

    try {
      await inventoryAPI.transactions.create({
        itemId: selectedItem.itemId,
        batchNo: selectedItem.batchNo,
        quantity: quantity,
        transactionType: "OUT",
        reason: remark || "Manual adjustment"
      });
      
      const newQuantity = selectedItem.availableQuantity - quantity;
      
      // Update the transactions state immediately for UI responsiveness
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === selectedItem.id
            ? { ...tx, availableQuantity: newQuantity, remarks: remark || tx.remarks }
            : tx
        )
      );

      setSuccessMsg(`Updated ${selectedItem.itemName}. New qty: ${newQuantity} ${selectedItem.unit}`);
      
      // Re-fetch data after a short delay to ensure database is updated
      setTimeout(() => {
        fetchData();
      }, 500);
      
      setTimeout(() => setSuccessMsg(""), 3000);
      setShowModal(false);
      setSelectedItem(null);
    } catch (err) {
      console.error("Failed to update stock", err);
      alert("Failed to update stock.");
    }
  };

  const criticalItems = transactions.filter(
    (tx) => getAlertType(tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate) === "expired" ||
      (getAlertType(tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate) === "minimum" && tx.availableQuantity === 0)
  ).length;

  const expiringItems = transactions.filter(
    (tx) => getAlertType(tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate) === "expiring" ||
      getAlertType(tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate) === "expired"
  ).length;

  const lowStockItems = transactions.filter(
    (tx) => getAlertType(tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate) === "minimum"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Success Message */}
      {successMsg && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2 items-center">
          <Check size={18} className="text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800 font-medium">{successMsg}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded border border-gray-300 p-3 mb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search item name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {["all", "critical", "expiring", "lowstock"].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setFilterAlert(filter);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                filterAlert === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter === "all" && "All"}
              {filter === "critical" && "Critical"}
              {filter === "expiring" && "Expiring"}
              {filter === "lowstock" && "Low Stock"}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr className="border-b border-gray-300">
                <th className="px-3 py-2 text-left text-xs font-semibold">Item Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Code</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Batch No</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Qty</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Expiry</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Alert</th>
                <th className="px-3 py-2 text-center text-xs font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => {
                  const alertType = getAlertType(tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate);
                  const alertMessage = getAlertMessage(alertType, tx.availableQuantity, tx.minimumStockLevel, tx.expiryDate);

                  // Tooltip content
                  const getTooltip = () => {
                    if (alertType === "expired") return "Expired";
                    if (alertType === "expiring") {
                      const diff = Math.floor((new Date(tx.expiryDate).getTime() - Date.now()) / 86400000);
                      return `Expires in ${diff} days`;
                    }
                    if (alertType === "minimum") return `Low Stock: ${tx.availableQuantity}/${tx.minimumStockLevel}`;
                    return "In Stock";
                  };

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition h-10">
                      <td className="px-3 py-1.5">
                        <p className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 text-sm" onClick={() => handleItemClick(tx)}>
                          {tx.itemName}
                        </p>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-700">{tx.itemCode}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-700">{tx.batchNo}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="text-xs font-semibold text-gray-900">{tx.availableQuantity}</span>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-700">{formatDate(tx.expiryDate)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="relative group inline-flex">
                          {alertType === "expired" && (
                            <AlertTriangle size={18} className="text-red-600 cursor-help" />
                          )}
                          {alertType === "expiring" && (
                            <AlertTriangle size={18} className="text-yellow-600 cursor-help" />
                          )}
                          {alertType === "minimum" && (
                            <div className="text-orange-600 cursor-help font-bold text-lg">↓</div>
                          )}
                          {alertType === "none" && (
                            <div className="text-green-600 text-xs font-semibold">OK</div>
                          )}
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {getTooltip()}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => handleItemClick(tx)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition font-medium"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    <p className="text-sm">No stock transactions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded border border-gray-300 p-3 mt-4">
          <p className="text-xs text-gray-600">
            Page {currentPage} of {totalPages} • {filteredTransactions.length} items
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Quantity Update Modal */}
      {selectedItem && (
        <QuantityUpdateModal
          item={selectedItem}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
          }}
          onUpdate={handleQuantityUpdate}
        />
      )}
    </div>
  );
}
