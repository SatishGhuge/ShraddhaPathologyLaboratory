"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Search,
  RotateCcw,
  Pencil,
  IndianRupee,
  Trash2,
  Package,
  Eye,
  Edit
} from "lucide-react";

const PackagesTable = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  // Fetch packages on component mount and when page changes
  useEffect(() => {
    fetchPackages(currentPage);
  }, [currentPage]);

  const fetchPackages = async (page: number = 1) => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/packages?page=${page}&limit=${ITEMS_PER_PAGE}`);
      const result = await response.json();
      
      if (result.success) {
        setPackages(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError('Failed to load packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = packages.filter((pkg) => {
    // When "Show Inactive" is checked, show ONLY inactive packages
    if (showInactive && pkg.isActive) return false;
    
    // When "Show Inactive" is unchecked, show ONLY active packages
    if (!showInactive && !pkg.isActive) return false;
    
    // Filter by search
    return (
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      pkg.code?.toLowerCase().includes(search.toLowerCase()) ||
      pkg.center?.toLowerCase().includes(search.toLowerCase())
    );
  });
  
  // Reset search
  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
    fetchPackages(1);
  };

  // Toggle Active / Inactive with dynamic message (like TestList)
  const handleToggleActive = async (id) => {
    const currentPkg = packages.find((p) => p.id === id);

    const message = currentPkg.isActive
      ? `Do you want to Inactivate "${currentPkg.name}"?\n\nThe package will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentPkg.name}"?\n\nThe package will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/packages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentPkg.isActive
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(currentPkg.isActive ? "Package inactivated successfully!" : "Package activated successfully!");
        fetchPackages(); // Refresh the list
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Failed to update package');
    } finally {
      setLoading(false);
    }
  };

  // Delete package
  const handleDelete = async (id, name) => {
    const confirm = window.confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirm) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/packages/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Package deleted successfully!');
        fetchPackages(); // Refresh the list
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-white min-h-screen">
      {/* Top Bar - Search, Reset, Show Inactive, Add in Single Row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search By Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 bg-white rounded px-3 py-2 w-full sm:w-64 text-xs sm:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          <button 
            onClick={handleReset}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs sm:text-sm cursor-pointer hover:bg-orange-100 transition-colors w-full sm:w-auto">
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
          onClick={() => router.push("/master/packagelist/add")}
          disabled={loading}
          className="bg-orange-500 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-orange-600 transition-colors w-full sm:w-auto disabled:opacity-50"
        >
          + Add New Package
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mb-4 p-4 bg-white rounded shadow-md text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300"></div>
          <p className="mt-2 text-gray-600">Loading packages...</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow-md">
        <div className="flex justify-between items-center p-3 border-b bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">
            Page {pagination?.page || 1} of {pagination?.totalPages || 1} 
            {pagination?.total && ` (Total: ${pagination.total})`}
          </span>
        </div>
        <table className="w-full text-xs sm:text-sm border-collapse min-w-[700px]">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Sr.No</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Name</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Code</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Department</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Center</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Tests</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Active</th>
              <th className="border border-gray-300 px-3 py-1 text-center font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {packages.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500 border border-gray-300">
                  No packages found.
                </td>
              </tr>
            ) : (
              packages.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-50 border-b border-gray-200 ${
                    !item.isActive ? 'bg-gray-100 opacity-60' : ''
                  }`}
                >
                  <td className="border border-gray-300 px-3 py-1">
                    {((pagination?.page || 1) - 1) * ITEMS_PER_PAGE + index + 1}
                  </td>
                  <td className="border border-gray-300 px-3 py-1 font-medium">{item.name}</td>
                  <td className="border border-gray-300 px-3 py-1">{item.code || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1">{item.department?.name || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1">{item.center || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1">
                    <span className="bg-orange-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {item.packageTests?.length || 0} tests
                    </span>
                  </td>
                  
                  {/* Active column - just display text */}
                  <td className="border border-gray-300 px-3 py-1 text-center font-semibold text-sm">
                    {item.isActive ? "Yes" : "No"}
                  </td>

                  <td className="border border-gray-300 px-3 py-1">
                    <div className="flex justify-center gap-1 flex-wrap">
                      <button 
                        onClick={() => router.push(`/master/packagelist/view/${item.id}`)}
                        disabled={loading}
                        className="bg-orange-500 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-orange-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Eye size={12} /> View
                      </button>

                      <button 
                        onClick={() => router.push(`/master/packagelist/edit/${item.id}`)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit size={12} /> Edit
                      </button>

                      <button 
                        onClick={() => router.push(`/master/packagelist/charges/${item.id}`)}
                        disabled={loading}
                        className="bg-yellow-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-yellow-700 transition-colors disabled:opacity-50"
                      >
                        Charges
                      </button>

                      {/* Active/Inactive Toggle Button (like TestList) */}
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        disabled={loading}
                        className={`px-2 py-1 rounded text-[10px] sm:text-xs text-white transition-colors disabled:opacity-50 ${
                          item.isActive
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-900 hover:bg-gray-900"
                        }`}
                        title={item.isActive ? "Click to inactivate package" : "Click to activate package"}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </button>

                      <button 
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={loading}
                        className="bg-red-500 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Permanently delete package"
                      >
                        <Trash2 size={12} /> Delete
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
    </div>
  );
};

export default PackagesTable;

