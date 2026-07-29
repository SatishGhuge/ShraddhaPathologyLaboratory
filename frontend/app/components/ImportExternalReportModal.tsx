"use client";

import React, { useState } from "react";
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react";

interface ImportedResult {
  parameterName: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  method?: string;
  categoryName?: string;
}

interface ExternalReportData {
  patientName?: string;
  testName?: string;
  collectionDate?: string;
  reportDate?: string;
  results: ImportedResult[];
  labName?: string;
}

interface ImportExternalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ExternalReportData) => void;
  isLoading?: boolean;
}

export default function ImportExternalReportModal({
  isOpen,
  onClose,
  onImport,
  isLoading = false,
}: ImportExternalReportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ExternalReportData | null>(null);
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<"upload" | "preview" | "confirm">("upload");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setError("");
      
      // Create FormData and upload file
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/parse-report", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to parse report");
      }

      const data: ExternalReportData = await response.json();
      setImportedData(data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse report file");
    }
  };

  const handleConfirmImport = () => {
    if (importedData) {
      onImport(importedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportedData(null);
    setError("");
    setStep("upload");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-cyan-600 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload size={20} /> Import External Lab Report
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4 flex gap-3">
                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Supported Formats:</p>
                  <p>PDF, PNG, JPG, or text files from other pathology labs</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload size={32} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {file ? "File selected" : "PDF, PNG, JPG or TXT"}
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || isLoading}
                  className="px-4 py-2 text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded font-medium transition"
                >
                  {isLoading ? "Parsing..." : "Parse Report"}
                </button>
              </div>
            </div>
          )}

          {step === "preview" && importedData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4 flex gap-3">
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold">Report parsed successfully!</p>
                  <p className="text-xs mt-1">
                    Found {importedData.results.length} result(s)
                  </p>
                </div>
              </div>

              {/* Report Info */}
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                {importedData.labName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lab:</span>
                    <span className="font-medium">{importedData.labName}</span>
                  </div>
                )}
                {importedData.testName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Test:</span>
                    <span className="font-medium">{importedData.testName}</span>
                  </div>
                )}
                {importedData.collectionDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Collection Date:</span>
                    <span className="font-medium">{importedData.collectionDate}</span>
                  </div>
                )}
              </div>

              {/* Results Preview */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Results Preview:</h3>
                <div className="border rounded overflow-hidden text-sm max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Parameter</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Result</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedData.results.slice(0, 10).map((result, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2">{result.parameterName}</td>
                          <td className="px-3 py-2 font-medium">{result.result}</td>
                          <td className="px-3 py-2">{result.unit || "-"}</td>
                          <td className="px-3 py-2 text-xs">{result.referenceRange || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importedData.results.length > 10 && (
                  <p className="text-xs text-gray-500 mt-2">
                    +{importedData.results.length - 10} more results
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium transition"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded font-medium transition"
                >
                  Import Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
