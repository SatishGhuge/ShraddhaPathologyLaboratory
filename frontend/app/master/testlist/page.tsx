"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { RotateCwIcon, Upload, FileSpreadsheet } from "lucide-react";
import { getTests, updateTest } from "@/src/api/master";
import API_BASE_URL from "@/src/api/config";

const TestList = () => {
  const router = useRouter();

  const [search, setSearch] = useState<string>("");
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<any>(null);
  const [outsourcedTestIds, setOutsourcedTestIds] = useState<Set<number>>(new Set());
  const ITEMS_PER_PAGE = 20;

  // Import modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Fetch tests from backend on component mount and when page changes
  useEffect(() => {
    fetchTests(currentPage);
    fetchOutsourcedTests();
  }, [currentPage]);

  // Fetch outsourced tests to get list of test IDs linked to outsourcing labs
  const fetchOutsourcedTests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/master/outsourcing`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const testIds = new Set<number>();
        result.data.forEach((lab: any) => {
          if (lab.tests && Array.isArray(lab.tests)) {
            lab.tests.forEach((test: any) => {
              testIds.add(test.testId);
            });
          }
        });
        setOutsourcedTestIds(testIds);
      }
    } catch (err) {
      console.error('Error fetching outsourced tests:', err);
    }
  };

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, showInactive]);

  const fetchTests = async (page: number = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTests(page, ITEMS_PER_PAGE);
      
      // Handle API response - getTests returns { data: [], pagination: {} }
      const testsArray = response.data || [];
      
      // Sort tests alphabetically by name
      const sortedTests = testsArray.sort((a: any, b: any) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setTests(sortedTests);
      setPagination(response.pagination || null);
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Copy Test - Creates a duplicate
  const handleCopyTest = async (id: number) => {
    const testToCopy = tests.find((t) => t.id === id);
    if (!testToCopy) return;

    const confirm = window.confirm(`Do you want to create a copy of "${testToCopy.name}"?`);
    if (!confirm) return;

    try {
      // Create a copy with modified name
      const newTestData = {
        ...testToCopy,
        name: `${testToCopy.name} (Copy)`,
        shortName: testToCopy.shortName ? `${testToCopy.shortName}_COPY` : null,
        testCode: testToCopy.testCode ? `${testToCopy.testCode}_COPY` : null,
      };

      // Remove fields that shouldn't be copied
      delete newTestData.id;
      delete newTestData.createdAt;
      delete newTestData.updatedAt;
      delete newTestData.department; // Remove department object, keep departmentId

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTestData),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Test copied successfully!`);
        setCurrentPage(1); // Reset to page 1
        fetchTests(1); // Fetch first page
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error copying test:', err);
      alert(`Failed to copy test: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // 🔹 Delete Test
  const handleDeleteTest = async (id: number) => {
    const testToDelete = tests.find((t) => t.id === id);
    if (!testToDelete) return;

    const confirm = window.confirm(`Are you sure you want to permanently delete "${testToDelete.name}"?\n\nThis will remove it from all lists but keep it in the database.`);
    if (!confirm) return;

    try {
      const updateData = {
        ...testToDelete,
        isDeleted: true
      };
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });
      
      await updateTest(String(id), updateData);
      alert("Test deleted permanently!");
      setCurrentPage(1); // Reset to page 1
      fetchTests(1); // Fetch first page
    } catch (err) {
      console.error('Error deleting test:', err);
      alert(`Failed to delete test: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // 🔹 Toggle Active / Inactive with dynamic message
  const handleToggleActive = async (id: number) => {
    const currentTest = tests.find((t) => t.id === id);

    const message = currentTest.isActive
      ? `Do you want to Inactivate "${currentTest.name}"?\n\nThe test will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentTest.name}"?\n\nThe test will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      // Preserve all existing data, only toggle isActive
      const updateData = {
        ...currentTest,
        isActive: !currentTest.isActive
      };
      // Remove undefined/null fields that might cause issues
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });
      
      await updateTest(String(id), updateData);
      alert(currentTest.isActive ? "Test inactivated successfully!" : "Test activated successfully!");
      setCurrentPage(1); // Reset to page 1
      fetchTests(1); // Fetch first page
    } catch (err) {
      console.error('Error toggling test status:', err);
      alert(`Failed to update test: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // 🔹 Reset search
  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
    fetchTests(1);
  };

  // 🔹 Handle file selection for import
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        alert('⚠️ Please select an Excel file (.xlsx)');
        return;
      }
      setImportFile(selectedFile);
      setImportErrors([]);
      setImportResult(null);
    }
  };

  // 🔹 Handle quick import from test list
  const handleQuickImport = async () => {
    if (!importFile) {
      alert('⚠️ Please select a file first');
      return;
    }

    try {
      setIsImporting(true);
      console.log('📤 Starting quick import...');

      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch(`${API_BASE_URL}/master/tests/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setImportErrors(data.data?.errors || [data.message]);
        console.error('❌ Import validation failed:', data);
        return;
      }

      console.log('✅ Import successful:', data);
      setImportResult(data.data);
      setImportErrors([]);
      alert('✅ ' + data.data.summary);

      // Refresh test list
      setCurrentPage(1);
      fetchTests(1);

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
      }, 2000);

    } catch (error) {
      console.error('❌ Import error:', error);
      setImportErrors([(error as Error).message]);
    } finally {
      setIsImporting(false);
    }
  };

  // 🔹 Filter tests - exclude deleted, then by active/inactive and search
  const filteredTests = (Array.isArray(tests) ? tests : []).filter(test => {
    // Exclude deleted items from all views
    if (test.isDeleted) return false;
    
    // When "Show Inactive" is checked, show ONLY inactive tests
    if (showInactive && test.isActive) return false;
    
    // When "Show Inactive" is unchecked, show ONLY active tests
    if (!showInactive && !test.isActive) return false;
    
    // Filter by search
    return (
      test.name.toLowerCase().includes(search.toLowerCase()) ||
      test.shortName?.toLowerCase().includes(search.toLowerCase()) ||
      test.department?.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <>

      <div className="p-3 sm:p-4 md:p-6 bg-white min-h-screen">
        {/* 🔹 Top Bar - Title, Search, Reset, Add in Single Row */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by keyword"            
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-full sm:w-64 text-xs sm:text-sm
           placeholder:text-gray-500
           focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <button
              onClick={handleReset}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto"
            >
              <RotateCwIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
              Reset
            </button>

            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs sm:text-sm cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-gray-700">Show Inactive</span>
            </label>
          </div>

          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={() => router.push("/master/testlist/add")}
              className="bg-orange-500 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-orange-600 transition-colors flex-1 sm:flex-none"
            >
              + Add Test
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-purple-700 transition-colors flex-1 sm:flex-none flex items-center justify-center gap-1"
              title="Quick import from Excel"
            >
              <Upload size={16} />
              Quick Import
            </button>

            <button
              onClick={() => router.push("/master/test-excel-manager")}
              className="bg-green-600 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-green-700 transition-colors flex-1 sm:flex-none"
              title="Export/Import tests with Excel"
            >
              📊 Excel Manager
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tests...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded shadow-md p-8 text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-2">Error Loading Tests</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => fetchTests(1)} 
              className="bg-cyan-700 text-white px-6 py-2 rounded hover:bg-cyan-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* 🔹 Table */}
        {!loading && !error && (
          <div className="overflow-x-auto bg-white rounded shadow-md">
            <div className="flex justify-between items-center p-3 border-b bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">
                Page {pagination?.page || 1} of {pagination?.totalPages || 1} 
                {pagination?.total && ` (Total: ${pagination.total})`}
              </span>
            </div>
            <table className="w-full text-xs sm:text-sm border-collapse min-w-[800px]">
              <thead className="bg-slate-900 text-white">
                <tr>
                  {[
                    "Id",
                    "Name",
                    "Short Name",
                    "Department",
                    "Active",
                    "Action",
                  ].map((head) => (
                    <th
                      key={head}
                      className="border border-gray-300 px-3 py-1 text-left font-semibold"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No tests found.
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((test, index) => (
                      <tr 
                        key={test.id} 
                        className={`hover:bg-gray-50 border-b border-gray-200 ${
                          !test.isActive ? 'bg-gray-100 opacity-60' : ''
                        }`}
                      >
                        <td className="border border-gray-300 px-3 py-1">
                          {((pagination?.page || 1) - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          <div className="flex items-center gap-2">
                            {test.name}
                            {outsourcedTestIds.has(test.id) && (
                              <span title="This test is available in outsourcing labs" className="text-orange-500 font-bold text-lg leading-none">
                                ▲
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          {test.shortName || '-'}
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          {test.department?.name || '-'}
                        </td>

                        {/* Active column */}
                        <td className="border border-gray-300 px-3 py-1 text-center font-semibold text-xs sm:text-sm">
                          {test.isActive ? "Yes" : "No"}
                        </td>

                        {/* Action column */}
                        <td className="border border-gray-300 px-3 py-1">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button
                                onClick={() => router.push(`/master/testlist/edit/${test.id}`)}
                                className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>

                            <button 
                              onClick={() => handleCopyTest(test.id)}
                              className="bg-yellow-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-yellow-700 transition-colors"
                            >
                              Copy
                            </button>

                            <button
                              onClick={() => handleToggleActive(test.id)}
                              className={`px-2 py-1 rounded text-[10px] sm:text-xs text-white transition-colors ${
                                test.isActive
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-gray-900 hover:bg-gray-900"
                              }`}
                              title={test.isActive ? "Click to inactivate test" : "Click to activate test"}
                            >
                              {test.isActive ? "Active" : "Inactive"}
                            </button>

                            <button 
                              onClick={() => handleDeleteTest(test.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-red-600 transition-colors"
                              title="Permanently delete test"
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

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t p-3 bg-gray-50 flex items-center justify-between text-xs sm:text-sm">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1">
                  {(() => {
                    const pages: (number | string)[] = [];
                    const totalPages = pagination.totalPages;
                    
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      if (currentPage <= 3) {
                        pages.push(1, 2, 3, 4, '...', totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                      } else {
                        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                      }
                    }

                    return pages.map((page, idx) => (
                      page === '...' ? (
                        <span key={idx} className="px-2">...</span>
                      ) : (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(page as number)}
                          className={`w-7 h-7 rounded ${currentPage === page ? 'bg-orange-500 text-white font-bold' : 'bg-white border hover:bg-gray-100'}`}
                        >
                          {page}
                        </button>
                      )
                    ));
                  })()}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className={`px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="text-purple-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Quick Import Tests</h2>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Upload an Excel file to quickly import tests with parameters and categories.
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
                onClick={handleQuickImport}
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
      
    </>
  );
};

export default TestList;


