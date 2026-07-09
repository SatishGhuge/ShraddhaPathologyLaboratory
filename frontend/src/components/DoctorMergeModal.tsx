"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { mergeDoctors, getDoctorMergeHistory } from "@/src/api/master";

interface DoctorMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDoctor: any;
  targetDoctor: any;
  onMergeSuccess: () => void;
}

export default function DoctorMergeModal({
  isOpen,
  onClose,
  sourceDoctor,
  targetDoctor,
  onMergeSuccess
}: DoctorMergeModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleMerge = async () => {
    if (!confirmText || confirmText !== "CONFIRM") {
      setError('Please type "CONFIRM" to proceed');
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await mergeDoctors(sourceDoctor.id, targetDoctor.id);
      setSuccess(`Successfully merged Dr. ${sourceDoctor.name} into Dr. ${targetDoctor.name}`);
      setConfirmText("");

      setTimeout(() => {
        onMergeSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to merge doctors");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Merge Doctors</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Warning Section */}
          <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded text-xs">
            <div className="flex gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-semibold text-red-900">Warning: Cannot be undone</p>
                <p className="text-red-800 mt-0.5">
                  All records from <strong>Dr. {sourceDoctor.name}</strong> → <strong>Dr. {targetDoctor.name}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Merge Details - Compact */}
          <div className="bg-gray-50 p-2 rounded space-y-2 text-xs">
            <div>
              <p className="font-semibold text-gray-700">Source (Deactivated)</p>
              <p className="text-gray-900">Dr. {sourceDoctor.name}</p>
              {sourceDoctor.degree && <p className="text-gray-600">{sourceDoctor.degree}</p>}
            </div>

            <div className="border-t border-gray-200 pt-2">
              <p className="font-semibold text-gray-700">Target (Receives All)</p>
              <p className="text-gray-900">Dr. {targetDoctor.name}</p>
              {targetDoctor.degree && <p className="text-gray-600">{targetDoctor.degree}</p>}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-2 rounded text-xs">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-2 py-2 rounded text-xs flex items-center gap-1">
              <CheckCircle size={14} />
              {success}
            </div>
          )}

          {/* Confirmation Input */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Type "CONFIRM" to proceed:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError("");
              }}
              placeholder="CONFIRM"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={loading || !confirmText}
            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {loading && <Loader size={14} className="animate-spin" />}
            {loading ? "Merging..." : "Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
