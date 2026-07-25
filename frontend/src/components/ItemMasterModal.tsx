"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import inventoryAPI from "@/lib/api/inventory.api";

interface HSNCodeOption {
  id: number;
  hsnCode: string;
  category: string;
  gstRate: number;
}

interface ItemMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemSaved?: (item: any) => void;
  editingItem?: any | null;
}

export default function ItemMasterModal({
  isOpen,
  onClose,
  onItemSaved,
  editingItem = null,
}: ItemMasterModalProps) {
  const [form, setForm] = useState({
    itemName: "",
    itemCode: "",
    hsnCodeId: "",
    gst: "",
    unit: "Box",
  });

  const [hsnCodes, setHsnCodes] = useState<HSNCodeOption[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHsn, setLoadingHsn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  const UNITS = ["Box", "Bottle", "Kit", "Piece", "Set", "Roll", "Strip", "Vial"];

  useEffect(() => {
    if (!isOpen) return;

    const fetchHsnCodes = async () => {
      try {
        setLoadingHsn(true);
        const response = await inventoryAPI.hsn.getAll(1, 100);
        setHsnCodes(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch HSN codes:", err);
        setErrors((prev) => ({
          ...prev,
          submit: "Failed to load HSN codes. Please try again.",
        }));
      } finally {
        setLoadingHsn(false);
      }
    };

    fetchHsnCodes();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setEditingItemId(editingItem.id);
      setForm({
        itemName: editingItem.itemName || "",
        itemCode: editingItem.itemCode || "",
        hsnCodeId: String(editingItem.hsnCodeId || editingItem.hsnCode?.id || ""),
        gst: String(editingItem.hsnCode?.gstRate ?? ""),
        unit: editingItem.unit || "Box",
      });
    } else {
      setEditingItemId(null);
      setForm({
        itemName: "",
        itemCode: "",
        hsnCodeId: "",
        gst: "",
        unit: "Box",
      });
    }
    setErrors({});
    setSuccessMsg("");
  }, [isOpen, editingItem]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.itemName.trim()) newErrors.itemName = "Item Name is required";
    if (!form.itemCode.trim()) newErrors.itemCode = "Item Code is required";
    if (!form.hsnCodeId) newErrors.hsnCodeId = "HSN Code is required";
    if (!form.unit.trim()) newErrors.unit = "Unit is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "hsnCodeId") {
      const selected = hsnCodes.find((h) => String(h.id) === value);
      setForm((prev) => ({
        ...prev,
        hsnCodeId: value,
        gst: selected ? String(selected.gstRate) : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrors({});

      const payload = {
        itemName: form.itemName.trim(),
        itemCode: form.itemCode.trim(),
        hsnCodeId: parseInt(form.hsnCodeId, 10),
        unit: form.unit,
      };

      let response;
      if (editingItemId) {
        response = await inventoryAPI.items.update(editingItemId, {
          itemName: payload.itemName,
          hsnCodeId: payload.hsnCodeId,
          unit: payload.unit,
        });
      } else {
        response = await inventoryAPI.items.create(payload);
      }

      const itemData = response.data.data;
      setSuccessMsg(editingItemId ? "Item Updated Successfully!" : "Item Added Successfully!");
      onItemSaved?.(itemData);
      setTimeout(closeModal, 1500);
    } catch (error: any) {
      console.error("Error saving item:", error);
      setErrors({
        submit: error.response?.data?.message || error.message || "Failed to save item",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setForm({
      itemName: "",
      itemCode: "",
      hsnCodeId: "",
      gst: "",
      unit: "Box",
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
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
                disabled={!!editingItemId}
                placeholder="e.g., REG-001"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  errors.itemCode ? "border-red-500 bg-red-50" : "border-gray-200"
                } ${editingItemId ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
              {errors.itemCode && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.itemCode}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                HSN Code <span className="text-red-500">*</span>
              </label>
              <select
                name="hsnCodeId"
                value={form.hsnCodeId}
                onChange={handleInputChange}
                disabled={loadingHsn}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition bg-white cursor-pointer ${
                  errors.hsnCodeId ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              >
                <option value="">
                  {loadingHsn ? "Loading HSN codes..." : "Select HSN Code"}
                </option>
                {hsnCodes.map((hsn) => (
                  <option key={hsn.id} value={hsn.id}>
                    {hsn.hsnCode} - {hsn.category}
                  </option>
                ))}
              </select>
              {errors.hsnCodeId && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.hsnCodeId}
                </p>
              )}
              {!loadingHsn && hsnCodes.length === 0 && (
                <p className="text-amber-600 text-xs mt-1">
                  No HSN codes found. Add HSN codes in the backend first.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                GST %
              </label>
              <input
                type="text"
                name="gst"
                value={form.gst}
                readOnly
                placeholder="Auto from HSN"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50"
              />
              <p className="text-gray-400 text-[10px] mt-1">Based on HSN code selection</p>
            </div>

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

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {errors.submit}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
              ✓ {successMsg}
            </div>
          )}

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
              disabled={loading || loadingHsn}
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
