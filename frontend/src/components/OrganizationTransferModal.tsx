

"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Check, AlertCircle } from "lucide-react";
import inventoryAPI from "@/lib/api/inventory.api";

interface Organization {
  id: string;
  name: string;
  code: string;
}

interface Item {
  id: number;
  itemId: string;
  itemName: string;
  itemCode: string;
}

interface StockItem {
  id: number;
  itemId?: number;
  batchNo: string;
  expiryDate: string;
  availableQuantity: number;
  availableStock?: number;
  invoiceNo?: string;
  invoiceDate?: string;
}

interface SelectedItem {
  itemId: number;
  itemName: string;
  batchNo: string;
  expiryDate: string;
  availableStock: number;
  transferQuantity: number;
}

interface OrganizationTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferComplete: (data: any) => void;
  organizations: Organization[];
  items: Item[];
  stockItems: StockItem[];
}

// Generate human-readable transfer number: TYYMMDD-XXX
const generateTransferNumber = (transferCount: number): string => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const sequence = String(transferCount + 1).padStart(3, "0");
  return `T${year}${month}${day}${sequence}`;
};

export default function OrganizationTransferModal({
  isOpen,
  onClose,
  onTransferComplete,
  organizations,
  items,
  stockItems,
}: OrganizationTransferModalProps) {
  const [transferNumber, setTransferNumber] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedOrganization, setSelectedOrganization] = useState<string>();
  const [selectedItem, setSelectedItem] = useState<number>();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [transferResult, setTransferResult] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQty, setEditedQty] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [batches, setBatches] = useState<StockItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTransferNumber(generateTransferNumber(0));
      setTransferDate(new Date().toISOString().split("T")[0]);
      setSubmitError("");
      setSelectedItem(undefined);
      setSelectedBatch("");
      setBatches([]); // Clear batches to force fresh fetch
    }
  }, [isOpen]);

  // Fetch batches when item is selected - ALWAYS fetch fresh data from lab stock
  useEffect(() => {
    const fetchBatches = async () => {
      if (!selectedItem) {
        setBatches([]);
        return;
      }
      try {
        console.log("Fetching FRESH batches for itemId:", selectedItem);
        // Fetch from lab stock grouped endpoint to get real-time available quantities
        const res = await inventoryAPI.labStocks.getByItem(selectedItem);
        console.log("Fresh batches response:", res.data);
        const batchData = (res.data?.data || []).map((stock: any) => ({
          id: stock.id,
          batchNo: stock.batchNo,
          expiryDate: stock.expiryDate,
          availableQuantity: stock.quantityAvailable, // Real-time quantity from database
          lastStockUpdate: stock.lastStockUpdate
        }));
        console.log("Fresh batch data set:", batchData);
        setBatches(batchData);
      } catch (err) {
        console.error("Failed to fetch batches:", err);
        setBatches([]);
      }
    };
    fetchBatches();
  }, [selectedItem]);

  // Handle Ctrl+S for saving edited row
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editingIndex !== null) {
          handleSaveEdit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingIndex, editedQty]);

  const selectedOrg = organizations.find((o) => o.id === selectedOrganization);
  const selectedItemData = items.find((i) => i.id === selectedItem);
  // batches are already filtered by itemId from the API, so no need to filter again
  const availableBatches = batches;
  const selectedBatchData = availableBatches.find((b) => b.batchNo === selectedBatch);
  
  // Calculate remaining available quantity after accounting for already-selected transfers
  const calculateRemainingQuantity = (batchNo: string, itemId: number): number => {
    if (!selectedBatchData) return 0;
    const alreadyTransferred = selectedItems
      .filter(item => item.itemId === itemId && item.batchNo === batchNo)
      .reduce((sum, item) => sum + item.transferQuantity, 0);
    return Math.max(0, selectedBatchData.availableQuantity - alreadyTransferred);
  };
  
  const remainingQuantity = selectedBatchData && selectedItem ? calculateRemainingQuantity(selectedBatch, selectedItem) : 0;

  const handleAddItem = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedItem) newErrors.selectedItem = "Item is required";
    if (!selectedBatch) newErrors.selectedBatch = "Batch No is required";
    if (!transferQuantity || Number(transferQuantity) <= 0) {
      newErrors.transferQuantity = "Valid Transfer Quantity is required";
    }
    if (
      selectedBatchData &&
      Number(transferQuantity) > remainingQuantity
    ) {
      newErrors.transferQuantity = `Transfer quantity exceeds remaining stock (${remainingQuantity})`;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    if (selectedItemData && selectedBatchData) {
      const newItem: SelectedItem = {
        itemId: selectedItem,
        itemName: selectedItemData.itemName,
        batchNo: selectedBatch,
        expiryDate: selectedBatchData.expiryDate,
        availableStock: selectedBatchData.availableQuantity,
        transferQuantity: Number(transferQuantity),
      };

      // Check if item with same batch already exists
      const existingIndex = selectedItems.findIndex(
        (item) => item.itemId === selectedItem && item.batchNo === selectedBatch
      );

      if (existingIndex >= 0) {
        // Update quantity
        const updatedItems = [...selectedItems];
        updatedItems[existingIndex].transferQuantity += Number(transferQuantity);
        setSelectedItems(updatedItems);
      } else {
        setSelectedItems([...selectedItems, newItem]);
      }

      // Reset fields and refresh batch data with fresh quantities from database
      setSelectedItem(undefined);
      setSelectedBatch("");
      setTransferQuantity("");
      setErrors({});
      setBatches([]); // Force refresh of batch data
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setEditedQty(String(selectedItems[index].transferQuantity));
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const qty = Number(editedQty);
    if (!editedQty || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    const remainingStock = selectedItems[editingIndex].availableStock - 
      selectedItems
        .filter((item, idx) => idx !== editingIndex && 
                item.itemId === selectedItems[editingIndex].itemId && 
                item.batchNo === selectedItems[editingIndex].batchNo)
        .reduce((sum, item) => sum + item.transferQuantity, 0);

    if (qty > remainingStock) {
      alert(`Transfer quantity cannot exceed remaining stock (${remainingStock})`);
      return;
    }

    const updatedItems = [...selectedItems];
    updatedItems[editingIndex].transferQuantity = qty;
    setSelectedItems(updatedItems);
    setEditingIndex(null);
    setEditedQty("");
  };

  const handleTransfer = async () => {
    const newErrors: Record<string, string> = {};

    if (!selectedOrganization) {
      newErrors.selectedOrganization = "Transfer To Organization is required";
    }
    if (selectedItems.length === 0) {
      newErrors.selectedItems = "Please add at least one item";
    }

    setErrors(newErrors);
    setValidationErrors([]);

    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      setSubmitError("");

      const payload = {
        organizationId: String(selectedOrganization),
        transferDate,
        remarks,
        items: selectedItems.map(item => ({
          itemId: item.itemId,
          batchNo: item.batchNo,
          quantity: item.transferQuantity,
          expiryDate: item.expiryDate
        }))
      };

      const response = await inventoryAPI.transfers.create(payload);
      
      const result = {
        transferNumber: response.data.data.transferNumber || transferNumber,
        transferDate,
        organizationName: selectedOrg?.name,
        itemsCount: selectedItems.length,
        items: selectedItems,
        remarks,
      };

      setTransferResult(result);
      setShowSuccessPopup(true);

      setTimeout(() => {
        onTransferComplete(result);
        setTransferNumber(generateTransferNumber(0));
        setTransferDate(new Date().toISOString().split("T")[0]);
        setSelectedOrganization(undefined);
        setSelectedItems([]);
        setRemarks("");
        setShowSuccessPopup(false);
        onClose();
      }, 2500);

    } catch (err: any) {
      console.error("Failed to create transfer:", err);
      
      // Handle validation errors from backend
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setValidationErrors(err.response.data.errors);
        setSubmitError("Stock validation failed. Please check the items below:");
      } else {
        setSubmitError(err.response?.data?.message || "Failed to create transfer");
        setValidationErrors([]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b bg-white">
          <h2 className="text-lg font-bold text-gray-800">Organization Transfer</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-3">
          {/* Transfer Header Info - Compact Row */}
          <div className="border-b pb-3 space-y-0">
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-0.5">
                  Transfer Number
                </label>
                <p className="font-mono text-gray-900 text-sm">{transferNumber}</p>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-0.5">
                  Transfer Date
                </label>
                <p className="text-gray-900 text-sm">{new Date(transferDate).toLocaleDateString("en-GB")}</p>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-0.5">
                  Transfer To Organization <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedOrganization || ""}
                  onChange={(e) => setSelectedOrganization(e.target.value)}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.selectedOrganization
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                >
                  <option value="">Select Org</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-0.5">
                  Organization Code
                </label>
                <p className="text-gray-900 text-sm bg-gray-50 px-2 py-1 rounded">
                  {selectedOrg?.code || "-"}
                </p>
              </div>
            </div>
            {errors.selectedOrganization && (
              <p className="text-red-500 text-xs mt-1">{errors.selectedOrganization}</p>
            )}
          </div>

          {/* Item Selection */}
          <div className="border-b pb-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Add Items</h3>
            <div className="grid grid-cols-6 gap-1.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                  Item <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedItem || ""}
                  onChange={(e) => {
                    setSelectedItem(Number(e.target.value));
                    setSelectedBatch("");
                  }}
                  className={`w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.selectedItem
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                >
                  <option value="">Select</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>

                   <div>
                <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                  Batch <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className={`w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.selectedBatch
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                >
                  <option value="">Select</option>
                  {availableBatches.map((batch) => (
                    <option key={batch.id} value={batch.batchNo}>
                      {batch.batchNo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                  Available
                </label>
                <div className="bg-gray-50 rounded px-1.5 py-1 text-xs text-gray-700 font-semibold border border-gray-200">
                  {remainingQuantity || "-"}
                </div>
              </div>

         

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                  Expiry
                </label>
                <div className="bg-gray-50 rounded px-1.5 py-1 text-xs text-gray-700 font-semibold border border-gray-200">
                  {selectedBatchData ? new Date(selectedBatchData.expiryDate).toLocaleDateString("en-GB") : "-"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                  Transfer Qty <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className={`w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.transferQuantity
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddItem}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-0.5 transition-colors font-semibold"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {errors.selectedBatch && (
              <p className="text-red-500 text-xs mt-1">{errors.selectedBatch}</p>
            )}
            {errors.transferQuantity && (
              <p className="text-red-500 text-xs mt-1">{errors.transferQuantity}</p>
            )}
          </div>

          {/* Selected Items Table */}
          {selectedItems.length > 0 && (
            <div className="border-b pb-3 space-y-1">
              <h3 className="text-xs font-semibold text-gray-700">Selected Items</h3>
              <div className="overflow-x-auto bg-white rounded border border-gray-300">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1 text-left">Item</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Batch</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Expiry</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Avail</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Qty</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => (
                      <tr key={index} className={editingIndex === index ? "bg-yellow-50" : "hover:bg-gray-50"}>
                        <td className="border border-gray-300 px-2 py-1">{item.itemName}</td>
                        <td className="border border-gray-300 px-2 py-1 font-mono">{item.batchNo}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                          {new Date(item.expiryDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                          {item.availableStock}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {editingIndex === index ? (
                            <input
                              type="number"
                              value={editedQty}
                              onChange={(e) => setEditedQty(e.target.value)}
                              className="w-full border border-blue-500 rounded px-1 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                              min="0"
                            />
                          ) : (
                            <span className="font-semibold text-blue-600">{item.transferQuantity}</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          <div className="flex justify-center gap-1">
                            {editingIndex === index ? (
                              <button
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-800 transition"
                                title="Save (Ctrl+S)"
                              >
                                <Check size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEditItem(index)}
                                className="text-blue-500 hover:text-blue-700 transition"
                                title="Edit Quantity"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveItem(index)}
                              disabled={editingIndex === index}
                              className="text-red-500 hover:text-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editingIndex !== null && (
                <p className="text-xs text-blue-600 font-semibold">💡 Editing row {editingIndex + 1} • Press Ctrl+S to save or click ✓ button</p>
              )}
            </div>
          )}

          {/* Remarks */}
          <div className="border-b pb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks (Optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Enter remarks..."
              rows={1}
            />
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-start gap-2 mb-3">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> 
              <div>
                <p className="font-semibold mb-1">{submitError}</p>
                {validationErrors.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationErrors.map((err, idx) => (
                      <li key={idx} className="text-red-600">{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded text-xs transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={selectedItems.length === 0 || loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-1.5 rounded text-xs transition-colors font-semibold"
            >
              {loading ? "Processing..." : "Transfer Stock"}
            </button>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && transferResult && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800">SUCCESS</h2>
            <p className="text-gray-600">Stock transferred successfully.</p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-gray-700 font-semibold">Transfer No</span>
                <span className="text-gray-900 font-mono">{transferResult.transferNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-semibold">Destination</span>
                <span className="text-gray-900">{transferResult.organizationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-semibold">Items</span>
                <span className="text-gray-900">{transferResult.itemsCount}</span>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded text-sm transition-colors font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
