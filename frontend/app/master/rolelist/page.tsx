"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getRoles, deleteRole } from "@/src/api/master";

const RoleList = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;
  const [showModal, setShowModal] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<any>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchRoles = async (page: number = 1, includeInactive: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/master/roles`, window.location.origin);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', ITEMS_PER_PAGE.toString());
      if (includeInactive) {
        url.searchParams.append('includeInactive', 'true');
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success) {
        setRoles(data.data || []);
        setPagination(data.pagination || null);
      } else {
        setError(data.message || "Failed to fetch roles");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchRoles(1, showInactive); 
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, showInactive]);

  // Refetch when showInactive changes
  useEffect(() => {
    if (!loading) {
      fetchRoles(1, showInactive);
    }
  }, [showInactive]);

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete "${role.name}"?`)) return;
    try {
      await deleteRole(role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
      setCurrentPage(1);
      fetchRoles(1);
    } catch (err) {
      alert(err.message || "Failed to delete role");
    }
  };

  const handleAddNew = () => {
    setRoleName("");
    setEditingRoleId(null);
    setShowModal(true);
  };

  const handleEdit = (role) => {
    setRoleName(role.name);
    setEditingRoleId(role.id);
    setShowModal(true);
  };

  const handleToggleActive = async (role) => {
    const message = role.isActive
      ? `Do you want to Inactivate "${role.name}"?`
      : `Do you want to Activate "${role.name}"?`;

    if (!window.confirm(message)) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/master/roles/${role.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !role.isActive })
        }
      );

      const result = await response.json();
      if (result.success) {
        alert(role.isActive ? "Role inactivated successfully!" : "Role activated successfully!");
        fetchRoles(1);
      } else {
        alert(result.message || "Failed to update role");
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert("Failed to update role");
    }
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      alert("Please enter role name");
      return;
    }

    try {
      setSaveLoading(true);
      
      const url = editingRoleId 
        ? `${process.env.NEXT_PUBLIC_API_URL}/master/roles/${editingRoleId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/master/roles`;
      
      const response = await fetch(url, {
        method: editingRoleId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roleName
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(editingRoleId ? "Role updated successfully!" : "Role added successfully!");
        setShowModal(false);
        setRoleName("");
        setEditingRoleId(null);
        fetchRoles(1);
      } else {
        alert(result.message || "Failed to save role");
      }
    } catch (err) {
      console.error('Error saving role:', err);
      alert("Failed to save role");
    } finally {
      setSaveLoading(false);
    }
  };

  const filtered = roles.filter(r => {
    // When "Show Inactive" is checked, show ONLY inactive roles
    if (showInactive && r.isActive) return false;
    
    // When "Show Inactive" is unchecked, show ONLY active roles
    if (!showInactive && !r.isActive) return false;
    
    // Filter by search
    return r.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <div className="p-6 min-h-screen bg-white">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => setSearch("")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm flex items-center gap-1"
            >
              <RotateCcw size={16} /> Reset
            </button>
            
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-sm cursor-pointer hover:bg-gray-50 transition-colors">
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
            onClick={handleAddNew}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600"
          >
            + New Role
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>
        )}

        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left">ID</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Name</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Active</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-gray-500">No roles found</td></tr>
              ) : (
                filtered.map((role, index) => (
                  <tr 
                    key={role.id} 
                    className={`hover:bg-gray-50 border-b border-gray-200 ${
                      !role.isActive ? 'bg-gray-100 opacity-60' : ''
                    }`}
                  >
                    <td className="border border-gray-300 px-3 py-2">{role.id}</td>
                    <td className="border border-gray-300 px-3 py-2 font-medium">{role.name}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {role.isActive ? "Yes" : "No"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(role)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >Edit</button>
                        <button
                          onClick={() => handleToggleActive(role)}
                          className={`px-2 py-1 rounded text-xs text-white font-medium ${
                            role.isActive
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gray-900 hover:bg-gray-900"
                          }`}
                          title={role.isActive ? "Click to inactivate role" : "Click to activate role"}
                        >
                          {role.isActive ? "Active" : "Inactive"}
                        </button>
                        <button
                          onClick={() => handleDelete(role)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {pagination && roles.length > 0 && (
          <div className="mt-3 bg-white rounded shadow-md p-3 flex items-center justify-between text-xs">
            <div className="text-gray-600">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of{' '}
              {pagination.total} records
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={() => {
                  const newPage = Math.max(1, currentPage - 1);
                  setCurrentPage(newPage);
                  fetchRoles(newPage);
                }}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="px-3 py-1">
                Page {currentPage} of {pagination.totalPages}
              </span>

              <button
                onClick={() => {
                  const newPage = Math.min(pagination.totalPages, currentPage + 1);
                  setCurrentPage(newPage);
                  fetchRoles(newPage);
                }}
                disabled={currentPage === pagination.totalPages}
                className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

            <div className="text-gray-600">
              Total: {pagination.total} records
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingRoleId ? "Edit Role" : "Add Role"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role Name *
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Enter role name"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={saveLoading}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm disabled:opacity-50"
              >
                {saveLoading ? "Saving..." : (editingRoleId ? "Update" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleList;


