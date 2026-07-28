"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createMachine, updateMachine, Machine } from "../../../api/machines";

interface MachineFormProps {
  isOpen: boolean;
  onClose: () => void;
  machine?: Machine | null;
  onSuccess: () => void;
}

const MachineForm: React.FC<MachineFormProps> = ({ isOpen, onClose, machine, onSuccess }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!machine;

  useEffect(() => {
    if (machine) {
      setName(machine.name);
    } else {
      setName("");
    }
    setError(null);
  }, [machine, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Machine name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit && machine) {
        await updateMachine(machine.id, { name: name.trim() });
      } else {
        await createMachine(name.trim());
      }
      onSuccess();
    } catch (err: any) {
      console.error('Machine form error:', err);
      setError(
        err.message ||
        err.response?.data?.message ||
          (isEdit ? "Failed to update machine" : "Failed to create machine")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg relative">
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
        >
          <X size={20} className="text-slate-600" />
        </button>

        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          {isEdit ? "Edit Machine" : "Add New Machine"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Machine Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sysmex XN-350, ERBA EM-200"
              disabled={loading}
              autoFocus
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-600">
              Enter the exact machine model name (will be matched with ASTM headers)
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className={`px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2 ${
                loading || !name.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineForm;
