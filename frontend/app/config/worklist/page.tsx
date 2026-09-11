"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Printer,
  RotateCcw,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import PaginationControls from "@/app/components/PaginationControls";
import AddEditWorklistModal from "@/app/components/AddEditWorklistModal";
import { getWorklists, toggleWorklistStatus } from "@/src/api/worklist";

const WorklistPage = () => {
  const router = useRouter();

  const [worklists, setWorklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [itemsPerPage] = useState(25);
  const [showInactive, setShowInactive] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [worklistToEdit, setWorklistToEdit] = useState<any>(null);

  useEffect(() => {
    fetchWorklists(1);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchWorklists(1);
  }, [search]);

  const fetchWorklists = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWorklists(page, itemsPerPage, search);

      if (response.success) {
        setWorklists(response.data || []);
        setPagination(response.pagination || {});
      } else {
        setError("Failed to fetch worklists");
      }
    } catch (err) {
      console.error("Error fetching worklists:", err);
      setError(err instanceof Error ? err.message : "Failed to load worklists");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      setToggling(id);
      const response = await toggleWorklistStatus(id);

      if (response.success) {
        fetchWorklists(currentPage);
      } else {
        setError("Failed to update worklist status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setToggling(null);
    }
  };

  const handlePrint = (id: number) => {
    router.push(`/config/worklist/${id}/print`);
  };

  const handleEdit = (worklist: any) => {
    setWorklistToEdit(worklist);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setWorklistToEdit(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setWorklistToEdit(null);
  };

  const handleModalSuccess = () => {
    fetchWorklists(currentPage);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Search Bar, Toggle Buttons, and Add Button */}
        <div className="mb-4">
          <div className="flex gap-2 bg-white p-3 rounded-lg shadow-md border border-orange-100">
            {/* Active/Inactive Toggle */}
            <button
              onClick={() => {
                setShowInactive(false);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-1 rounded-lg font-medium transition-colors text-sm flex-shrink-0 ${
                !showInactive
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <Eye size={16} />
              <span>Active</span>
            </button>
            <button
              onClick={() => {
                setShowInactive(true);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-1 rounded-lg font-medium transition-colors text-sm flex-shrink-0 ${
                showInactive
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <EyeOff size={16} />
              <span>Inactive</span>
            </button>

            {/* Divider */}
            <div className="w-px bg-gray-300"></div>

            {/* Search Bar */}
            <Search size={18} className="text-orange-500 flex-shrink-0 mt-1" />
            <input
              type="text"
              placeholder="Search worklist by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none text-gray-700 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <RotateCcw size={18} />
              </button>
            )}

            {/* Add Button */}
            {!showInactive && (
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex-shrink-0 text-sm"
              >
                <Plus size={18} />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={40} className="text-orange-500 animate-spin" />
          </div>
        ) : worklists.filter(w => w.isActive === !showInactive).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Eye size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 text-lg">No {showInactive ? "inactive" : "active"} worklists found</p>
            <p className="text-gray-500">
              {showInactive ? "All worklists are currently active" : "Create your first worklist to get started"}
            </p>
          </div>
        ) : (
          <>
            {/* Worklist Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-orange-100">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 w-10">S.No</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Worklist Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Test</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Parameters</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {worklists
                    .filter(w => w.isActive === !showInactive)
                    .map((worklist, index) => (
                      <tr key={worklist.id} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-700">{index + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-gray-800">{worklist.name}</p>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{worklist.test?.name || "-"}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs font-medium">
                            {worklist.parameters?.length || 0} parameters
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            {!showInactive && (
                              <>
                                <button
                                  onClick={() => handleEdit(worklist)}
                                  className="p-1.5 hover:bg-blue-100 rounded transition-colors text-blue-600"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handlePrint(worklist.id)}
                                  className="p-1.5 hover:bg-green-100 rounded transition-colors text-green-600"
                                  title="Print Report"
                                >
                                  <Printer size={16} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleToggleStatus(worklist.id)}
                              disabled={toggling === worklist.id}
                              className={`p-1.5 rounded transition-colors ${
                                showInactive
                                  ? "hover:bg-green-100 text-green-600"
                                  : "hover:bg-red-100 text-red-600"
                              } disabled:opacity-50`}
                              title={showInactive ? "Reactivate" : "Deactivate"}
                            >
                              {toggling === worklist.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : showInactive ? (
                                <Eye size={16} />
                              ) : (
                                <EyeOff size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {worklists.filter(w => w.isActive === !showInactive).length > 0 && (
              <PaginationControls
                pagination={pagination}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  fetchWorklists(page);
                }}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setCurrentPage(1);
                  const response = getWorklists(1, newItemsPerPage, search);
                  response.then((res) => {
                    if (res.success) {
                      setWorklists(res.data || []);
                      setPagination(res.pagination || {});
                    }
                  });
                }}
                isLoading={loading}
              />
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddEditWorklistModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        worklistToEdit={worklistToEdit}
      />
    </div>
  );
};

export default WorklistPage;
