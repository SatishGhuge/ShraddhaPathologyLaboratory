"use client";

import { useState, useEffect } from "react";
import { Ruler, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import UnitModal from "@/src/components/UnitModal";
import { getUnits, deleteUnit } from "@/src/api/master";
import PaginationControls from "@/app/components/PaginationControls";

export default function ResultUnits() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    fetchUnits();
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchUnits();
  }, [itemsPerPage]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const response = await getUnits(currentPage, itemsPerPage);
      setData(response.data || []);
      setPagination(response.pagination || null);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this unit?")) {
      try {
        await deleteUnit(id);
        setData(data.filter((item) => item.id !== id));
        alert("Unit deleted successfully!");
      } catch (error) {
        console.error('Error deleting unit:', error);
        alert("Failed to delete unit");
      }
    }
  };

  const handleUnitAdded = () => {
    fetchUnits();
    setSuccessMsg(editingUnit ? "Unit Updated Successfully!" : "Unit Added Successfully!");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search By Units"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
          <button
            onClick={() => { setEditingUnit(null); setShowModal(true); }}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
          >
            + Add
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Unit Symbol</th>
                <th className="border border-gray-300 px-3 py-1 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-4 text-gray-500 border border-gray-300">
                    Loading units...
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{item.symbol}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => { setEditingUnit(item); setShowModal(true); }}
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
              ) : (
                <tr>
                  <td colSpan={2} className="text-center py-4 text-gray-500 border border-gray-300">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ✅ PAGINATION CONTROLS */}
          {pagination && data.length > 0 && (
            <PaginationControls
              pagination={pagination}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchUnits();
              }}
              onItemsPerPageChange={(newLimit) => {
                setItemsPerPage(newLimit);
                setCurrentPage(1);
                fetchUnits();
              }}
              isLoading={loading}
            />
          )}
        </div>
      </div>

      {/* Modal - All logic is in the component */}
      <UnitModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onUnitAdded={handleUnitAdded}
        editingUnit={editingUnit}
      />

      {successMsg && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
          {successMsg}
        </div>
      )}
    </>
  );


}