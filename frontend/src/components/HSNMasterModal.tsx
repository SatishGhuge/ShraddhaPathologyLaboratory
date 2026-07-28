"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import inventoryAPI from "@/lib/api/inventory.api";

interface HSNMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHSNSaved?: (hsn: any) => void;
  editingHsn?: any | null;
}

export default function HSNMasterModal({
  isOpen,
  onClose,
  onHSNSaved,
  editingHsn = null,
}: HSNMasterModalProps) {
  const [form, setForm] = useState({
    hsnCode: "",
    category: "",
    gstRate: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (editingHsn) {
      setEditingId(editingHsn.id);
      setForm({
        hsnCode: editingHsn.hsnCode || "",
        category: editingHsn.category || "",
        gstRate: String(editingHsn.gstRate ?? ""),
      });
    } else {
      setEditingId(null);
      setForm({
        hsnCode: "",
        category: "",
        gstRate: "",
      });
    }
    setErrors({});
    setSuccessMsg("");
  }, [isOpen, editingHsn]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.hsnCode.trim()) newErrors.hsnCode = "HSN Code is required";
    if (!form.gstRate.trim()) newErrors.gstRate = "GST Rate is required";
    else if (isNaN(Number(form.gstRate)) || Number(form.gstRate) < 0) {
      newErrors.gstRate = "Invalid GST Rate";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

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
        hsnCode: form.hsnCode.trim(),
        category: form.category.trim() || "General",
        gstRate: Number(form.gstRate),
      };

      let response;
      if (editingId) {
        response = await inventoryAPI.hsn.update(editingId, payload);
      } else {
        response = await inventoryAPI.hsn.create(payload);
      }

      const hsnData = response.data?.data || response.data;
      setSuccessMsg(editingId ? "HSN Updated Successfully!" : "HSN Added Successfully!");
      onHSNSaved?.(hsnData);
      setTimeout(closeModal, 1500);
    } catch (error: any) {
      console.error("Error saving HSN:", error);
      setErrors({
        submit: error.response?.data?.message || error.message || "Failed to save HSN",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setForm({
      hsnCode: "",
      category: "",
      gstRate: "",
    });
    setEditingId(null);
    setErrors({});
    setSuccessMsg("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? "Edit HSN" : "Add HSN Code"}
            </h2>
          </div>
          <button
            onClick={closeModal}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              HSN Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="hsnCode"
              value={form.hsnCode}
              onChange={handleInputChange}
              placeholder="Enter HSN Code"
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                errors.hsnCode ? "border-red-500 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.hsnCode && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.hsnCode}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleInputChange}
              placeholder="e.g. General"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              GST Rate (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="gstRate"
              value={form.gstRate}
              onChange={handleInputChange}
              placeholder="e.g. 18"
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                errors.gstRate ? "border-red-500 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.gstRate && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.gstRate}
              </p>
            )}
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
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
