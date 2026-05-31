"use client";

import { useState, useEffect } from "react";
import { Ruler, RotateCcw, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getUnits, createUnit, updateUnit, deleteUnit } from "@/src/api/master";

export default function ResultUnits() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  const [showModal, setShowModal] = useState(false);
  const [unitSymbol, setUnitSymbol] = useState("");
  const [editId, setEditId] = useState<any>(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Load units from database
  useEffect(() => {
    fetchUnits(1);
  }, []);

  const fetchUnits = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await getUnits(page, ITEMS_PER_PAGE);
      setData(response);
      setPagination(null);
    } catch (error) {
      console.error('Error fetching units:', error);
      setErrorMsg('Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((item) =>
    item.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = () => {
    setSearch("");
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

  const openAddModal = () => {
    setEditId(null);
    setUnitSymbol("");
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditId(item.id);
    setUnitSymbol(item.symbol);
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const value = unitSymbol.trim();

    if (!value) {
      setErrorMsg("Unit symbol is required.");
      setSuccessMsg("");
      return;
    }

    try {
      setLoading(true);
      
      if (editId) {
        // Update existing unit
        const updated = await updateUnit(editId, { symbol: value });
        setData(data.map((item) =>
          item.id === editId ? { ...item, symbol: value } : item
        ));
        setSuccessMsg("Unit Updated Successfully!");
      } else {
        // Create new unit
        const newUnit = await createUnit({ symbol: value });
        setData([...data, newUnit]);
        setSuccessMsg("Unit Added Successfully!");
      }

      setErrorMsg("");

      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg("");
        setUnitSymbol("");
        setEditId(null);
      }, 1500);
    } catch (error) {
      console.error('Error saving unit:', error);
      setErrorMsg(error.message || 'Failed to save unit');
      setSuccessMsg("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="min-h-screen bg-white p-6">

        {/* Header */}
        <PageHeader 
          title="Result Units" 
          icon={Ruler}
          path="Master"
        />

        {/* Top Bar - Search, Reset, Add in Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search By Units"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

             <button
              onClick={handleReset}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>

          <button
            onClick={openAddModal}
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
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{item.symbol}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => openEditModal(item)}
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
        </div>

        {/* PAGINATION CONTROLS */}
        {pagination && data.length > 0 && (
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
                  fetchUnits(newPage);
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
                  fetchUnits(newPage);
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">

          <div className="bg-white w-[400px] p-6 rounded-lg shadow-lg relative">

            {/* Back Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 flex items-center gap-1 text-cyan-600 hover:underline"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editId ? "Edit Unit" : "Add Unit"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm mb-1">Unit Symbol</label>
                <input
                  type="text"
                  value={unitSymbol}
                  onChange={(e) => setUnitSymbol(e.target.value)}
                  placeholder="e.g., mg/dL, %, /cumm"
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={!unitSymbol.trim() || loading}
                className={`w-full py-2 rounded text-white
                  ${
                    !unitSymbol.trim() || loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600"
                  }
                `}
              >
                {loading ? "Saving..." : (editId ? "Update" : "Submit")}
              </button>

              {errorMsg && (
                <p className="text-red-600 text-center text-sm">
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p className="text-green-600 text-center text-sm">
                  {successMsg}
                </p>
              )}

            </form>
          </div>
        </div>
      )}
    </>
  );
}


