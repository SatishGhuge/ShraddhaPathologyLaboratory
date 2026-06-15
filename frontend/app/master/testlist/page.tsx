"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { FlaskConical, RotateCwIcon } from "lucide-react";
import { getTests, deleteTest, updateTest } from "@/src/api/master";

const TestList = () => {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  // Fetch tests from backend on component mount and when page changes
  useEffect(() => {
    fetchTests(currentPage);
  }, [currentPage]);

  const fetchTests = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTests(page, ITEMS_PER_PAGE);
      
      // Handle API response - getTests now returns an array directly
      setTests(response);
      setPagination(null);
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Copy Test - Creates a duplicate
  const handleCopyTest = async (id) => {
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
        fetchTests(); // Refresh the list
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error copying test:', err);
      alert(`Failed to copy test: ${err.message}`);
    }
  };

  // 🔹 Delete Test
  const handleDeleteTest = async (id) => {
    const testToDelete = tests.find((t) => t.id === id);
    if (!testToDelete) return;

    const confirm = window.confirm(`Are you sure you want to delete "${testToDelete.name}"?\n\nThis action cannot be undone.`);
    if (!confirm) return;

    try {
      await deleteTest(id);
      alert("Test deleted successfully!");
      fetchTests(); // Refresh the list
    } catch (err) {
      console.error('Error deleting test:', err);
      alert(`Failed to delete test: ${err.message}`);
    }
  };

  // 🔹 Toggle Active / Inactive with dynamic message
  const handleToggleActive = async (id) => {
    const currentTest = tests.find((t) => t.id === id);

    const message = currentTest.isActive
      ? `Do you want to Inactivate "${currentTest.name}"?\n\nThe test will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentTest.name}"?\n\nThe test will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      await updateTest((Array.isArray(id) ? id[0] : id) as string, { isActive: !currentTest.isActive });
      alert(currentTest.isActive ? "Test inactivated successfully!" : "Test activated successfully!");
      fetchTests(); // Refresh the list
    } catch (err) {
      console.error('Error toggling test status:', err);
      alert(`Failed to update test: ${err.message}`);
    }
  };

  // 🔹 Reset search
  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
    fetchTests(1);
  };

  return (
    <>
      <Header />

      <div className="p-3 sm:p-4 md:p-6 bg-white min-h-screen">
        {/* Page Header */}
        <PageHeader 
          title="Test List" 
          icon={FlaskConical}
          path="Master"
        />

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

          <button
            onClick={() => router.push("/master/testlist/add")}
            className="bg-orange-500 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-orange-600 transition-colors w-full sm:w-auto"
          >
            + Add Test
          </button>
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
                    "Category",
                    "Short Name",
                    "Department",
                    "Sort Order",
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
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No tests found.
                    </td>
                  </tr>
                ) : (
                  tests.map((test, index) => (
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
                          {test.name}
                        </td>

                        <td className="border border-gray-300 px-3 py-1 text-center">
                          <span className="bg-orange-500 text-white px-2 rounded font-bold cursor-pointer">
                            +
                          </span>
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          {test.shortName || '-'}
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          {test.department?.name || '-'}
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          <input
                            type="text"
                            value={test.sortOrder || ''}
                            readOnly
                            className="border border-gray-300 w-12 sm:w-16 px-2 py-1 text-xs sm:text-sm rounded"
                          />
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
                    const pages = [];
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
      
    </>
  );
};

export default TestList;


