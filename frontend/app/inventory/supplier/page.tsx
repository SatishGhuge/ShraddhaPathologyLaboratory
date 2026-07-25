"use client";

import { useState, useEffect } from "react";
import { Users, RotateCcw, ChevronLeft, ChevronRight, Edit2, Trash2, Plus } from "lucide-react";
import SupplierMasterModal from "@/src/components/SupplierMasterModal";
import PageHeader from "@/src/components/BreadCrumb";
import inventoryAPI from "@/lib/api/inventory.api";

interface Supplier {
  id: number;
  supplierName: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Fetch suppliers from API
  useEffect(() => {
    fetchSuppliers();
  }, [currentPage]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await inventoryAPI.suppliers.getAll(currentPage, ITEMS_PER_PAGE);
      setSuppliers(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch suppliers");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
      try {
        await inventoryAPI.suppliers.delete(id);
        setSuppliers(suppliers.filter((supplier) => supplier.id !== id));
        setSuccessMsg("Supplier deleted successfully!");
        setTimeout(() => setSuccessMsg(""), 2000);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to delete supplier");
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  const handleToggleActive = (id: number) => {
    const currentSupplier = suppliers.find((s) => s.id === id);
    if (!currentSupplier) return;

    const message = currentSupplier.isActive
      ? `Do you want to Inactivate "${currentSupplier.supplierName}"?`
      : `Do you want to Activate "${currentSupplier.supplierName}"?`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    setSuppliers(
      suppliers.map((s) =>
        s.id === id
          ? { ...s, isActive: !s.isActive }
          : s
      )
    );
    setSuccessMsg(
      currentSupplier.isActive
        ? "Supplier inactivated successfully!"
        : "Supplier activated successfully!"
    );
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleSupplierSaved = (supplierData: any) => {
    setShowModal(false);
    setEditingSupplier(null);
    fetchSuppliers();
    setSuccessMsg(editingSupplier ? "Supplier updated successfully!" : "Supplier created successfully!");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
        {/* Page Header */}
        <PageHeader title="Supplier" icon={Users} path="Inventory" />

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap items-center">
            <input
              type="text"
              placeholder="Search by name, GST, city, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-80 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("All");
                setCurrentPage(1);
                fetchSuppliers();
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={16} />
              Reset
            </button>
             <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-xs sm:text-sm cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 cursor-pointer"
              />
              <span>Show Inactive</span>
            </label>
          </div>
          <button
            onClick={() => {
              setEditingSupplier(null);
              setShowModal(true);
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Supplier Name
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  GST Number
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Email
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Phone
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  City
                </th>
                
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500 border border-gray-300">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length > 0 ? (
                suppliers
                  .filter((supplier) => {
                    const matchesSearch =
                      supplier.supplierName.toLowerCase().includes(search.toLowerCase()) ||
                      supplier.gstNumber?.toLowerCase().includes(search.toLowerCase()) ||
                      supplier.city?.toLowerCase().includes(search.toLowerCase()) ||
                      supplier.phone?.includes(search) ||
                      supplier.email?.toLowerCase().includes(search.toLowerCase());
                    
                    const matchesInactiveFilter = showInactive 
                      ? supplier.isActive === false 
                      : supplier.isActive === true;
                    
                    return matchesSearch && matchesInactiveFilter;
                  })
                  .map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                      {supplier.supplierName}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                      {supplier.gstNumber || "-"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs">
                      {supplier.email || "-"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-600 text-sm">
                      {supplier.phone || "-"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">
                      {supplier.city || "-"}
                    </td>
                    {/* <td className="border border-gray-300 px-3 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          supplier.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {supplier.isActive ? "Active" : "Inactive"}
                      </span>
                    </td> */}
                    <td className="border border-gray-300 px-3 py-2">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => handleToggleActive(supplier.id)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            supplier.isActive
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-gray-400 hover:bg-gray-500 text-white"
                          }`}
                        >
                          {supplier.isActive ? "Active" : "Inactive"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setShowModal(true);
                          }}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500 border border-gray-300">
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <SupplierMasterModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSupplier(null);
        }}
        onSupplierSaved={handleSupplierSaved}
        editingSupplier={editingSupplier}
      />

      {/* Success Message */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg text-sm">
          {successMsg}
        </div>
      )}
    </>
  );
}
