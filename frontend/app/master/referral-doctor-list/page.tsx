"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, RotateCcw, GitMerge, Download, Upload, FileSpreadsheet } from "lucide-react";
import { getDoctors, deleteDoctor } from "@/src/api/master";
import DoctorMergeModal from "@/src/components/DoctorMergeModal";
import API_BASE_URL from "@/src/api/config";

export default function ReferralListing() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedSourceDoctor, setSelectedSourceDoctor] = useState<any>(null);
  const [selectedTargetDoctor, setSelectedTargetDoctor] = useState<any>(null);
  
  // Import/Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  
  const ITEMS_PER_PAGE = 20;
  const router = useRouter();

  const fetchDoctors = (page: number = 1) => {
    setLoading(true);
    getDoctors(page, ITEMS_PER_PAGE)
      .then((res: any) => {
        setData(res);
        setPagination(null);
      })
      .catch((err) => console.error("Failed to fetch doctors:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDoctors(currentPage);
  }, [currentPage]);

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = () => setSearch("");

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoctor(id);
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to delete: " + (err.message || "Unknown error"));
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDoctors(1);
  };

  const openMergeModal = (sourceDoctor: any) => {
    setSelectedSourceDoctor(sourceDoctor);
    setSelectedTargetDoctor(null);
    setShowMergeModal(true);
  };

  const selectMergeTarget = (targetDoctor: any) => {
    setSelectedTargetDoctor(targetDoctor);
  };

  const handleMergeSuccess = () => {
    fetchDoctors(currentPage);
    setSelectedSourceDoctor(null);
    setSelectedTargetDoctor(null);
  };

  // 🔹 EXPORT DOCTORS
  const handleExport = async () => {
    try {
      setIsExporting(true);
      console.log('📥 Starting export...');

      const response = await fetch(`${API_BASE_URL}/master/doctors/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export doctors');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `referral_doctors_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Export successful');
      alert('✅ Referral doctors exported successfully!');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('❌ Failed to export doctors: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // 🔹 HANDLE FILE SELECTION FOR IMPORT
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        alert('⚠️ Please select an Excel file (.xlsx)');
        return;
      }
      setImportFile(selectedFile);
      setImportErrors([]);
      setImportWarnings([]);
      setImportResult(null);
    }
  };

  // 🔹 HANDLE IMPORT
  const handleImport = async () => {
    if (!importFile) {
      alert('⚠️ Please select a file first');
      return;
    }

    try {
      setIsImporting(true);
      console.log('📤 Starting import...');

      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch(`${API_BASE_URL}/master/doctors/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        setImportErrors(responseData.data?.errors || [responseData.message]);
        setImportWarnings(responseData.data?.warnings || []);
        console.error('❌ Import validation failed:', responseData);
        return;
      }

      console.log('✅ Import successful:', responseData);
      setImportResult(responseData.data);
      setImportErrors([]);
      setImportWarnings(responseData.data?.warnings || []);

      // Refresh doctor list
      fetchDoctors(1);

      // Close modal after 3 seconds
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
      }, 3000);

    } catch (error) {
      console.error('❌ Import error:', error);
      setImportErrors([(error as Error).message]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-white p-6">

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="Search By Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 bg-white rounded px-3 py-2 w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleReset}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/master/referral-doctor/add")}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
          >
            + Add New
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            title="Export all doctors to Excel"
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition-colors flex items-center gap-1"
            title="Import doctors from Excel"
          >
            <Upload size={16} />
            Import
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow-md">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Name</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Degree</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Mobile</th>
              <th className="border border-gray-300 px-3 py-1 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500 border border-gray-300">Loading...</td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500 border border-gray-300">No records found</td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="border border-gray-300 px-3 py-2">Dr. {item.name}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.degree || "-"}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.mobile || "-"}</td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="flex justify-center gap-1 flex-wrap">
                      <button
                        onClick={() => router.push(`/master/referral-doctor/charges/${item.id}`)}
                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      >
                        Charges
                      </button>
                      <button
                        onClick={() => openMergeModal(item)}
                        className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors flex items-center gap-1"
                        title="Merge this doctor with another"
                      >
                        <GitMerge size={14} /> Merge
                      </button>
                      <button
                        onClick={() => router.push(`/master/referral-doctor/edit/${item.id}`)}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && filteredData.length > 0 && (
        <div className="mt-3 bg-white rounded shadow-md p-3 flex items-center justify-between text-xs">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-700 font-medium">
            Page {currentPage} of {pagination.totalPages} | Showing {filteredData.length} of {pagination.total} records
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Merge Target Selection Modal */}
      {showMergeModal && selectedSourceDoctor && !selectedTargetDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Select Target Doctor</h2>
              <button
                onClick={() => setShowMergeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3 max-h-72 overflow-y-auto">
              <p className="text-xs text-gray-600 mb-3">
                Select to merge <strong>Dr. {selectedSourceDoctor.name}</strong> into:
              </p>

              <div className="space-y-1">
                {data
                  .filter(d => d.id !== selectedSourceDoctor.id && d.isActive)
                  .map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => selectMergeTarget(doctor)}
                      className="w-full text-left p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors text-xs"
                    >
                      <p className="font-medium text-gray-900">Dr. {doctor.name}</p>
                      {doctor.degree && <p className="text-gray-600">{doctor.degree}</p>}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Confirmation Modal */}
      {showMergeModal && selectedSourceDoctor && selectedTargetDoctor && (
        <DoctorMergeModal
          isOpen={true}
          onClose={() => {
            setShowMergeModal(false);
            setSelectedSourceDoctor(null);
            setSelectedTargetDoctor(null);
          }}
          sourceDoctor={selectedSourceDoctor}
          targetDoctor={selectedTargetDoctor}
          onMergeSuccess={handleMergeSuccess}
        />
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="text-purple-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Import Referral Doctors</h2>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Upload an Excel file to import referral doctors. You can create new doctors or update existing ones.
            </p>

            {/* File Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Excel File (.xlsx)
              </label>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleImportFileSelect}
                className="block w-full text-sm text-gray-600 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100"
              />
              {importFile && (
                <p className="text-sm text-green-600 mt-2 font-semibold">
                  ✓ Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-red-900 mb-2">Errors:</p>
                <ul className="text-xs text-red-800 space-y-1">
                  {importErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      {err}
                    </li>
                  ))}
                </ul>
                {importErrors.length > 5 && (
                  <p className="text-xs text-red-700 mt-2 font-semibold">
                    ... and {importErrors.length - 5} more errors
                  </p>
                )}
              </div>
            )}

            {/* Warnings */}
            {importWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-yellow-900 mb-2">Warnings:</p>
                <ul className="text-xs text-yellow-800 space-y-1">
                  {importWarnings.slice(0, 3).map((warn, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold">⚠</span>
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success */}
            {importResult && importErrors.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-900">✅ Import Successful!</p>
                <p className="text-xs text-green-800 mt-1">{importResult.summary}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={isImporting || !importFile || importErrors.length > 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportErrors([]);
                  setImportWarnings([]);
                  setImportResult(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}


