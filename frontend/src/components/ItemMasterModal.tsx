"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface SupplierOption {
  id: number;
  supplierName: string;
}

interface ItemMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemSaved?: (item: any) => void;
  editingItem?: any | null;
  suppliers?: SupplierOption[];
}

export default function ItemMasterModal({
  isOpen,
  onClose,
  onItemSaved,
  editingItem = null,
  suppliers = [],
}: ItemMasterModalProps) {
  const [form, setForm] = useState({
    itemId: "",
    itemName: "",
    itemCode: "",
    hsnCode: "",
    gst: "",
    unit: "Box",
    description: "",
    supplierId: "",
  });

  const [editingItemId, setEditingItemId] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Common units for dropdown
  const UNITS = ["Box", "Bottle", "Kit", "Piece", "Set", "Roll", "Strip", "Vial"];

  // HSN codes - sample data
  const HSN_CODES = [
    { code: "30061100", desc: "Sterile surgical catgut, similar materials and sterilized surgical ligatures" },
    { code: "30061900", desc: "Other sterilized surgical ligatures and similar materials" },
    { code: "30020000", desc: "Human blood, animal blood prepared for therapeutic or diagnostic uses" },
    { code: "30040000", desc: "Medicaments consisting of mixed unsorted ingredients" },
    { code: "30024090", desc: "Other medicaments containing antibiotics" },
  ];

  // Initialize form when modal opens or editing item changes
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setEditingItemId(editingItem.id);
        setForm({
          itemId: editingItem.itemId || "",
          itemName: editingItem.itemName || "",
          itemCode: editingItem.itemCode || "",
          hsnCode: editingItem.hsnCode || "",
          gst: editingItem.gst || "",
          unit: editingItem.unit || "Box",
          description: editingItem.description || "",
          supplierId: editingItem.supplierId || "",
        });
      } else {
        setEditingItemId(null);
        setForm({
          itemId: "",
          itemName: "",
          itemCode: "",
          hsnCode: "",
          gst: "",
          unit: "Box",
          description: "",
          supplierId: "",
        });
      }
      setErrors({});
      setSuccessMsg("");
    }
  }, [isOpen, editingItem]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.itemName.trim()) newErrors.itemName = "Item Name is required";
    if (!form.itemCode.trim()) newErrors.itemCode = "Item Code is required";
    if (!form.hsnCode.trim()) newErrors.hsnCode = "HSN Code is required";
    if (!form.gst || form.gst.toString().trim() === "") newErrors.gst = "GST % is required";
    if (!form.unit.trim()) newErrors.unit = "Unit is required";

    // Validate GST is a valid number
    if (form.gst && isNaN(parseFloat(form.gst.toString()))) {
      newErrors.gst = "GST must be a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      // For now, we'll just simulate the save since no backend is needed for frontend-only design
      // In production, this would call the API
      const itemData = {
        ...form,
        id: editingItemId || Date.now(),
        gst: parseFloat(form.gst),
      };

      setSuccessMsg(editingItemId ? "Item Updated Successfully!" : "Item Added Successfully!");
      onItemSaved?.(itemData);

      setTimeout(closeModal, 1500);
    } catch (error: any) {
      console.error('Error saving item:', error);
      setErrors({ submit: error.message || 'Failed to save item' });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setForm({
      itemId: "",
      itemName: "",
      itemCode: "",
      hsnCode: "",
      gst: "",
      unit: "Box",
      description: "",
      supplierId: "",
    });
    setEditingItemId(null);
    setErrors({});
    setSuccessMsg("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingItemId ? "Edit Item" : "Item Master"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {editingItemId ? "Update item details" : "Add a new inventory item"}
            </p>
          </div>
          <button
            onClick={closeModal}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Item ID - Auto */}
          <div className="grid grid-cols-2 gap-4">

            {/* Item Name - Required */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="itemName"
                value={form.itemName}
                onChange={handleInputChange}
                placeholder="Enter item name"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  errors.itemName ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              />
              {errors.itemName && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.itemName}
                </p>
              )}
            </div>
          </div>

          {/* Item Code - Required */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Item Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="itemCode"
                value={form.itemCode}
                onChange={handleInputChange}
                placeholder="e.g., REG-001"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  errors.itemCode ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              />
              {errors.itemCode && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.itemCode}
                </p>
              )}
            </div>

            {/* HSN Code - Required */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                HSN Code <span className="text-red-500">*</span>
              </label>
              <select
                name="hsnCode"
                value={form.hsnCode}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition bg-white cursor-pointer ${
                  errors.hsnCode ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              >
                <option value="">▼ Select HSN Code</option>
                {HSN_CODES.map((hsn) => (
                  <option key={hsn.code} value={hsn.code}>
                    {hsn.code} - {hsn.desc.substring(0, 40)}...
                  </option>
                ))}
              </select>
              {errors.hsnCode && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.hsnCode}
                </p>
              )}
            </div>
          </div>

          {/* GST % - Required & Auto Fetch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                GST % <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="gst"
                value={form.gst}
                onChange={handleInputChange}
                placeholder="Auto Fetch"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  errors.gst ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              />
              {errors.gst && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.gst}
                </p>
              )}
              <p className="text-gray-400 text-[10px] mt-1">Based on HSN code selection</p>
            </div>

            {/* Unit - Required */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition bg-white cursor-pointer ${
                  errors.unit ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {errors.unit && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.unit}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Enter item description (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
            />
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {errors.submit}
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
              ✓ {successMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-semibold rounded text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : editingItemId ? "Update Item" : "Save Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
