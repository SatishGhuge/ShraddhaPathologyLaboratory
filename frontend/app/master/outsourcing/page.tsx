"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const OutsourcingList = () => {
  const router = useRouter();

  const [searchName, setSearchName] = useState("");
  const [filteredLabs, setFilteredLabs] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  // Fetch labs on mount
  useEffect(() => {
    fetchLabs();
  }, [currentPage]);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/master/outsourcing`);
      const result = await response.json();
      
      if (result.success) {
        setLabs(result.data);
        setFilteredLabs(result.data);
      } else {
        setError(result.message || 'Failed to fetch labs');
      }
    } catch (err) {
      console.error('Error fetching labs:', err);
      setError('Failed to fetch outsourcing labs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setHasSearched(true);
    setCurrentPage(1);

    const filtered = labs.filter((lab) => {
      const matchName = lab.labName
        .toLowerCase()
        .includes(searchName.toLowerCase());
      return matchName;
    });

    setFilteredLabs(filtered);
  };

  const handleReset = () => {
    setSearchName("");
    setFilteredLabs(labs);
    setHasSearched(false);
    setCurrentPage(1);
  };

  const handleDelete = async (lab: any) => {
    if (window.confirm(`Are you sure you want to delete "${lab.labName}"?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/master/outsourcing/${lab.id}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
          const updatedLabs = labs.filter((l) => l.id !== lab.id);
          setLabs(updatedLabs);
          setFilteredLabs(updatedLabs);
          alert(`Lab "${lab.labName}" deleted successfully!`);
        } else {
          alert(result.message || 'Failed to delete lab');
        }
      } catch (err) {
        console.error('Error deleting lab:', err);
        alert('Failed to delete lab');
      }
    }
  };

  const handleToggleActive = (id: any) => {
    const currentLab = labs.find((l) => l.id === id);

    const message =
      currentLab.isActive === true
        ? "Do you want to Inactivate Lab?"
        : "Do you want to Activate Lab?";

    const confirm = window.confirm(message);
    if (!confirm) return;

    // For now, show success (backend would handle this)
    alert("Lab status updated successfully!");
  };

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen flex items-center justify-center">
        <Loader size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 bg-white min-h-screen">

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Top Bar - Search, Reset, Add in Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap">
            <input
              type="text"
              placeholder="Search By Lab Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-48 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <button
              onClick={handleReset}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          <button
            onClick={() => router.push("/master/outsourcing/add")}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
          >
            + Add New
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Id</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Lab Name</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Code</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Mobile</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Tests</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {(() => {
                const totalPages = Math.ceil(filteredLabs.length / ITEMS_PER_PAGE);
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const paginatedData = filteredLabs.slice(startIndex, endIndex);

                // Update pagination state
                setPagination({
                  total: filteredLabs.length,
                  totalPages: totalPages,
                  currentPage: currentPage
                });

                return paginatedData.length > 0 ? (
                  paginatedData.map((lab) => (
                  <tr key={lab.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{lab.id}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{lab.labName}</td>
                    <td className="border border-gray-300 px-3 py-1">{lab.code}</td>
                    <td className="border border-gray-300 px-3 py-1">{lab.mobile || "-"}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center">{lab.tests?.length || 0}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1 flex-wrap">
                        {/* VIEW */}
                        <button
                          onClick={() => router.push(`/master/outsourcing/view/${lab.id}`)}
                          className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 transition-colors"
                        >
                          View
                        </button>

                        {/* EDIT */}
                        <button
                          onClick={() => router.push(`/master/outsourcing/edit/${lab.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => handleDelete(lab)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-300">
                    No outsourcing labs found
                  </td>
                </tr>
              );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between bg-white p-3 rounded shadow-md">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, pagination.total)} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total} records
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700 font-semibold">
                Page {currentPage} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OutsourcingList;

