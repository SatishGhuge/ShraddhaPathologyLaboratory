"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit, Trash2, Plus, Layers, RotateCcw } from "lucide-react";
import PaginationControls from "@/app/components/PaginationControls";

const DepartmentTable = () => {
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const router = useRouter();

  // Fetch departments on component mount and when page changes
  useEffect(() => {
    fetchDepartments(currentPage);
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchDepartments(1);
  }, [itemsPerPage]);

  const fetchDepartments = async (page: number = 1) => {
    try {
      setLoading(true);
      setError("");
      
      // Use /all endpoint to get both active and inactive departments
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/departments/all?page=${page}&limit=${itemsPerPage}`);
      const result = await response.json();
      
      if (result.success) {
        setDepartments(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError('Failed to load departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: any) => {
    setSearch(e.target.value);
  };

  const filteredDepartments = departments.filter((dept) => {
    // Exclude deleted items from all views
    if (dept.isDeleted) return false;
    
    // When "Show Inactive" is checked, show ONLY inactive departments
    if (showInactive && dept.isActive) return false;
    
    // When "Show Inactive" is unchecked, show ONLY active departments
    if (!showInactive && !dept.isActive) return false;
    
    // Filter by search
    return (
      dept.name.toLowerCase().includes(search.toLowerCase()) ||
      dept.code?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"?\n\nThis will remove it from all lists but keep it in the database.`)) {
      try {
        setLoading(true);
        
        const currentDept = departments.find((d) => d.id === id);
        const updateData = {
          ...currentDept,
          isDeleted: true
        };
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) delete updateData[key];
        });
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/departments/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('Department deleted permanently!');
          fetchDepartments(); // Refresh the list
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error deleting department:', error);
        alert('Failed to delete department');
      } finally {
        setLoading(false);
      }
    }
  };

  // Toggle Active / Inactive with dynamic message (like TestList)
  const handleToggleActive = async (id) => {
    const currentDept = departments.find((d) => d.id === id);

    const message = currentDept.isActive
      ? `Do you want to Inactivate "${currentDept.name}"?\n\nThe department will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentDept.name}"?\n\nThe department will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      setLoading(true);
      
      // Preserve all existing data, only toggle isActive
      const updateData = {
        ...currentDept,
        isActive: !currentDept.isActive
      };
      // Remove undefined/null fields that might cause issues
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(currentDept.isActive ? "Department inactivated successfully!" : "Department activated successfully!");
        fetchDepartments(); // Refresh the list
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  // Reset search
  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
    fetchDepartments(1);
  };

  return ( 
    <div className="p-4 sm:p-6 bg-white min-h-screen">

      {/* Top Bar - Search, Reset, Show Inactive, Add in Single Row */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 mb-4 bg-white p-4 rounded shadow-md">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search By Keywords"
            className="border border-gray-300 bg-white rounded px-3 py-2 w-full sm:w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-sm cursor-pointer hover:bg-orange-100 transition-colors w-full sm:w-auto">
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
          onClick={() => router.push("/master/departmentlist/add")}
          disabled={loading}
          className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors w-full sm:w-auto disabled:opacity-50"
        >
          + Add Department
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
          <p className="mt-2 text-gray-600">Loading departments...</p>
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
        <div className="min-w-[700px]">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Id</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Name</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Code</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Active</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500 border border-gray-300">
                  No departments found.
                </td>
              </tr>
            ) : (
              filteredDepartments.map((dept, index) => (
                <tr 
                  key={dept.id} 
                  className={`hover:bg-gray-50 border-b border-gray-200 ${
                    !dept.isActive ? 'bg-gray-100 opacity-60' : ''
                  }`}
                >
                  <td className="border border-gray-300 px-3 py-1">
                    {((pagination?.page || 1) - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="border border-gray-300 px-3 py-1">{dept.name}</td>
                  <td className="border border-gray-300 px-3 py-1">{dept.code || '-'}</td>
                  
                  {/* Active column - just display text */}
                  <td className="border border-gray-300 px-3 py-1 text-center font-semibold text-sm">
                    {dept.isActive ? "Yes" : "No"}
                  </td>

                  {/* Action column */}
                  <td className="border border-gray-300 px-3 py-1">
                    <div className="flex gap-1 justify-center flex-wrap">
                      <button 
                        onClick={() => router.push(`/master/departmentlist/view/${dept.id}`)}
                        disabled={loading}
                        className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button 
                        onClick={() => router.push(`/master/departmentlist/edit/${dept.id}`)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit size={14} /> Edit
                      </button>

                      {/* Active/Inactive Toggle Button (like TestList) */}
                      <button
                        onClick={() => handleToggleActive(dept.id)}
                        disabled={loading}
                        className={`px-2 py-1 rounded text-xs text-white transition-colors disabled:opacity-50 ${
                          dept.isActive
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-900 hover:bg-gray-900"
                        }`}
                        title={dept.isActive ? "Click to inactivate department" : "Click to activate department"}
                      >
                        {dept.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination Controls */}
        {pagination && filteredDepartments.length > 0 && (
          <PaginationControls
            pagination={pagination}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => {
              setCurrentPage(page);
              fetchDepartments(page);
            }}
            onItemsPerPageChange={(newLimit) => {
              setItemsPerPage(newLimit);
              setCurrentPage(1);
              fetchDepartments(1);
            }}
            isLoading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default DepartmentTable;

