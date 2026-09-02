"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnitAdded?: (unit: any) => void;
  editingUnit?: any | null;
}

export default function UnitModal({
  isOpen,
  onClose,
  onUnitAdded,
  editingUnit = null,
}: UnitModalProps) {
  const [unitSymbol, setUnitSymbol] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Initialize form when modal opens or editing unit changes
  useEffect(() => {
    if (isOpen) {
      if (editingUnit) {
        setEditingUnitId(editingUnit.id);
        setUnitSymbol(editingUnit.symbol);
      } else {
        setEditingUnitId(null);
        setUnitSymbol("");
      }
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, editingUnit]);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const value = unitSymbol.trim();

    if (!value) {
      setErrorMsg("Unit symbol is required.");
      setSuccessMsg("");
      return;
    }

    try {
      setLoading(true);

      if (editingUnitId) {
        // Update existing unit
        const response = await fetch(`${API_BASE_URL}/master/units/${editingUnitId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: value })
        });

        if (!response.ok) throw new Error("Failed to update unit");

        const updated = await response.json();
        setSuccessMsg("Unit Updated Successfully!");
        onUnitAdded?.(updated.data || updated);
      } else {
        // Create new unit
        const response = await fetch(`${API_BASE_URL}/master/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: value })
        });

        if (!response.ok) throw new Error("Failed to create unit");

        const newUnit = await response.json();
        console.log('✅ New unit created:', newUnit);
        setSuccessMsg("Unit Added Successfully!");
        // ✅ Pass the new unit data to the callback so it can be auto-selected
        onUnitAdded?.(newUnit.data || newUnit);
      }

      setErrorMsg("");
      setTimeout(closeModal, 1500);
    } catch (error: any) {
      console.error('Error saving unit:', error);
      setErrorMsg(error.message || 'Failed to save unit');
      setSuccessMsg("");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setUnitSymbol("");
    setEditingUnitId(null);
    setErrorMsg("");
    setSuccessMsg("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[400px] p-6 rounded-lg shadow-lg relative">
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 flex items-center gap-1 text-cyan-600 hover:underline text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {editingUnitId ? "Edit Unit" : "Add Unit"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Unit Symbol</label>
            <input
              type="text"
              value={unitSymbol}
              onChange={(e) => setUnitSymbol(e.target.value)}
              placeholder="e.g., mg/dL, %, /cumm"
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-orange-500"
              autoFocus
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={!unitSymbol.trim() || loading}
            className={`w-full py-2 rounded text-white transition-colors
              ${
                !unitSymbol.trim() || loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }
            `}
          >
            {loading ? "Saving..." : (editingUnitId ? "Update" : "Submit")}
          </button>

          {errorMsg && <p className="text-red-600 text-center text-sm">{errorMsg}</p>}
          {successMsg && <p className="text-green-600 text-center text-sm">{successMsg}</p>}
        </form>
      </div>
    </div>
  );
}
