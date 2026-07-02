"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Search, RotateCcw, ShieldCheck, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { getRoles, deleteRole } from "@/src/api/master";

const RoleList = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  const fetchRoles = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoles(page, ITEMS_PER_PAGE);
      setRoles(data);
      setPagination(null);
    } catch (err) {
      setError(err.message || "Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(1); }, []);

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

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.codeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="p-6 min-h-screen bg-white">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search by name or code"
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
          </div>
          <button
            onClick={() => router.push("/master/rolelist/add")}
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
                <th className="border border-gray-300 px-3 py-2 text-left">Code</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Landing</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Fin. Days</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Discount</th>
                <th className="border border-gray-300 px-3 py-2 text-left">B2B</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-500">No roles found</td></tr>
              ) : (
                filtered.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{role.id}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{role.name}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.codeName}</td>
                    <td className="border border-gray-300 px-3 py-1 capitalize">{role.roleLanding}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.viewFinancialDays}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.discountPermissible ? "Yes" : "No"}</td>
                    <td className="border border-gray-300 px-3 py-1">{role.showB2B ? "Yes" : "No"}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => router.push(`/master/rolelist/view/${role.id}`)}
                          className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
                        >View</button>
                        <button
                          onClick={() => router.push(`/master/rolelist/edit/${role.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >Edit</button>
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
    </>
  );
};

export default RoleList;


