"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, Search, RotateCcw, X, Check } from "lucide-react";
import PaginationControls from "@/app/components/PaginationControls";
import inventoryAPI from "@/lib/api/inventory.api";

interface BatchDetail {
  id: number;
  batchNo: string;
  quantityAvailable: number;
  expiryDate: string;
  lastStockUpdate: string;
}

interface GroupedLabStock {
  itemId: number;
  itemName: string;
  itemCode: string;
  unit: string;
  hsnCode: any;
  totalQuantity: number;
  totalBatches: number;
  nearestExpiryDate: string;
  batches: BatchDetail[];
  alertStatus: "OK" | "LOW_STOCK" | "EXPIRING" | "EXPIRED";
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface QuantityUpdateModalProps {
  item: BatchDetail & { itemName: string; itemCode: string; unit: string; itemId: number };
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

    if (qty > item.quantityAvailable) {
      setError(`Cannot exceed available stock (${item.quantityAvailable})`);
      return;
    }

    onUpdate(qty, remark);
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN");
  };

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
            <span className="font-semibold text-gray-900">{item.quantityAvailable} {item.unit}</span>
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
              max={item.quantityAvailable}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-600 font-medium text-sm">{item.unit}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Max: {item.quantityAvailable}</p>
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

export default function StockTransactionsPage() {
  const [stocks, setStocks] = useState<GroupedLabStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterAlert, setFilterAlert] = useState("all"); // all, expiring, lowstock
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedBatch, setSelectedBatch] = useState<(BatchDetail & { itemName: string; itemCode: string; unit: string; itemId: number }) | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Fetch grouped lab stocks
  const fetchLabStocks = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const response = await inventoryAPI.labStocks.getAllGrouped(page, itemsPerPage, search);
      
      if (response.data.success) {
        setStocks(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      console.error("Error fetching lab stocks:", err);
      setError(err.response?.data?.message || "Failed to fetch lab stocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabStocks(currentPage);
  }, [search, currentPage, itemsPerPage]);

  const toggleExpand = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleBatchUpdate = (batch: BatchDetail, item: GroupedLabStock) => {
    setSelectedBatch({
      ...batch,
      itemName: item.itemName,
      itemCode: item.itemCode,
      unit: item.unit,
      itemId: item.itemId,
    });
    setShowUpdateModal(true);
  };

  const handleQuantityUpdate = async (quantity: number, remark: string) => {
    if (!selectedBatch) return;

    try {
      await inventoryAPI.transactions.create({
        itemId: selectedBatch.itemId,
        batchNo: selectedBatch.batchNo,
        quantity: quantity,
        transactionType: "OUT",
        reason: remark || "Manual stock removal"
      });

      setSuccessMsg(`Removed ${quantity} ${selectedBatch.unit} from ${selectedBatch.batchNo}`);
      setTimeout(() => setSuccessMsg(""), 3000);
      
      setShowUpdateModal(false);
      setSelectedBatch(null);
      
      // Refresh data
      fetchLabStocks(pagination.page);
    } catch (err: any) {
      console.error("Failed to update stock:", err);
      setError(err.response?.data?.message || "Failed to update stock");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getAlertIcon = (status: string) => {
    switch (status) {
      case "EXPIRED":
        return <div title="Expired"><AlertCircle size={18} className="text-red-600" /></div>;
      case "EXPIRING":
        return <div title="Expiring Soon"><AlertTriangle size={18} className="text-orange-600" /></div>;
      case "LOW_STOCK":
        return <div title="Low Stock"><AlertTriangle size={18} className="text-yellow-600" /></div>;
      default:
        return <div title="OK"><CheckCircle size={18} className="text-green-600" /></div>;
    }
  };

  const getAlertColor = (status: string) => {
    switch (status) {
      case "EXPIRED":
        return "bg-red-50 border-red-200";
      case "EXPIRING":
        return "bg-orange-50 border-orange-200";
      case "LOW_STOCK":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-green-50 border-green-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  };

  const daysUntilExpiry = (expiryDate: string) => {
    const days = Math.floor((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Filter stocks based on alert status
  const filteredStocks = stocks.filter((item) => {
    if (filterAlert === "all") return true;
    if (filterAlert === "expiring") return item.alertStatus === "EXPIRING" || item.alertStatus === "EXPIRED";
    if (filterAlert === "lowstock") return item.alertStatus === "LOW_STOCK";
    return true;
  });

  return (
    <div className="min-h-screen ">
      {/* Success Message */}
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}


      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex-1 relative min-w-64">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search item name or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={() => {
              setSearch("");
              setFilterAlert("all");
              fetchLabStocks(1);
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all", label: "All" },
            { value: "expiring", label: "Expiring" },
            { value: "lowstock", label: "Low Stock" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterAlert(filter.value)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition ${
                filterAlert === filter.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Pagination Info */}
        <div className="border-b bg-gray-50 px-6 py-3 flex justify-between items-center text-sm">
          <span className="text-gray-600">
            Page {pagination.page} of {pagination.totalPages} (Total: {pagination.total} items)
          </span>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold w-8"></th>
                <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold">Item Code</th>
                <th className="px-4 py-3 text-center font-semibold">Total Quantity</th>
                <th className="px-4 py-3 text-center font-semibold">Total Batches</th>
                <th className="px-4 py-3 text-center font-semibold">Nearest Expiry</th>
                <th className="px-4 py-3 text-center font-semibold">Alert</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading lab stock data...
                  </td>
                </tr>
              </tbody>
            ) : filteredStocks.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {stocks.length === 0 ? "No items found in lab stock" : "No items match the selected filter"}
                  </td>
                </tr>
              </tbody>
            ) : (
              filteredStocks.map((item) => (
                <tbody key={item.itemId}>
                  {/* Main Row */}
                  <tr
                    className={`border-b hover:bg-gray-50 transition cursor-pointer ${
                      expandedItems.has(item.itemId) ? getAlertColor(item.alertStatus) : ""
                    }`}
                    onClick={() => toggleExpand(item.itemId)}
                  >
                    <td className="px-4 py-3 text-center">
                      {expandedItems.has(item.itemId) ? (
                        <ChevronDown size={18} className="text-orange-600" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.itemName}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.itemCode}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded font-semibold">
                        {item.totalQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-semibold">{item.totalBatches}</td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {formatDate(item.nearestExpiryDate)}
                      <div className="text-xs text-gray-500">
                        {daysUntilExpiry(item.nearestExpiryDate) >= 0
                          ? `${daysUntilExpiry(item.nearestExpiryDate)} days`
                          : "Expired"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{getAlertIcon(item.alertStatus)}</td>
                  </tr>

                  {/* Nested Batches Table */}
                  {expandedItems.has(item.itemId) && (
                    <tr>
                      <td colSpan={7} className="px-0 py-0 bg-gray-50">
                        <div className="p-4 bg-gray-50">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Batch Details - {item.itemName}
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse bg-white rounded border border-gray-200">
                              <thead className="bg-gray-200">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Batch Number</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Qty Available</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Expiry Date</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Days to Expiry</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Last Updated</th>
                                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.batches.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-3 py-3 text-center text-gray-500">
                                      No batches available
                                    </td>
                                  </tr>
                                ) : (
                                  item.batches.map((batch, idx) => {
                                    const daysLeft = daysUntilExpiry(batch.expiryDate);
                                    return (
                                      <tr key={idx} className="border-b hover:bg-orange-50">
                                        <td className="px-3 py-2 font-mono text-gray-700">{batch.batchNo}</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                                            {batch.quantityAvailable}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-center text-gray-700">
                                          {formatDate(batch.expiryDate)}
                                        </td>
                                        <td className={`px-3 py-2 text-center font-semibold ${
                                          daysLeft < 0
                                            ? "text-red-600"
                                            : daysLeft < 30
                                            ? "text-orange-600"
                                            : "text-green-600"
                                        }`}>
                                          {daysLeft >= 0 ? `${daysLeft} days` : "Expired"}
                                        </td>
                                        <td className="px-3 py-2 text-center text-gray-600 text-xs">
                                          {new Date(batch.lastStockUpdate).toLocaleDateString("en-IN")}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleBatchUpdate(batch, item);
                                            }}
                                            className="text-orange-600 hover:text-orange-800 font-semibold text-xs bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded transition"
                                          >
                                            Update
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              ))
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          pagination={pagination}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newItemsPerPage) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1);
          }}
          isLoading={loading}
        />
      </div>

      {/* Quantity Update Modal */}
      {selectedBatch && (
        <QuantityUpdateModal
          item={selectedBatch}
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedBatch(null);
          }}
          onUpdate={handleQuantityUpdate}
        />
      )}
    </div>
  );
}
