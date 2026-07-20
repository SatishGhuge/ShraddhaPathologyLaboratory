"use client";

import { useState } from "react";
import { Users, RotateCcw, ChevronLeft, ChevronRight, Edit2, Trash2, Plus } from "lucide-react";
import SupplierMasterModal from "@/src/components/SupplierMasterModal";
import PageHeader from "@/src/components/BreadCrumb";

interface Supplier {
  id: number;
  supplierName: string;
  gstNumber: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: "Active" | "Inactive";
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 1,
      supplierName: "MedSupply Co.",
      gstNumber: "27AABCT1234H1Z0",
      email: "contact@medsupply.com",
      phoneNumber: "9876543210",
      address: "123 Medical Street, Industrial Area",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      status: "Active",
    },
    {
      id: 2,
      supplierName: "LabKit India",
      gstNumber: "29AABCT5678H1Z0",
      email: "sales@labkit.com",
      phoneNumber: "9988776655",
      address: "456 Lab Park, Tech Zone",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560034",
      status: "Active",
    },
    {
      id: 3,
      supplierName: "BioLab Pvt Ltd",
      gstNumber: "33AABCT9012H1Z0",
      email: "support@biolab.in",
      phoneNumber: "9876543219",
      address: "789 Science Avenue",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600001",
      status: "Inactive",
    },
  ]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Filter suppliers based on search and status
  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      supplier.gstNumber.toLowerCase().includes(search.toLowerCase()) ||
      supplier.city.toLowerCase().includes(search.toLowerCase()) ||
      supplier.phoneNumber.includes(search);
    const matchesStatus = filterStatus === "All" || supplier.status === filterStatus;
    
    // If showInactive is checked, show ONLY inactive suppliers
    // If showInactive is unchecked, show ONLY active suppliers
    const matchesInactiveFilter = showInactive ? supplier.status === "Inactive" : supplier.status === "Active";
    
    return matchesSearch && matchesStatus && matchesInactiveFilter;
  });

  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      setSuppliers(suppliers.filter((supplier) => supplier.id !== id));
      setSuccessMsg("Supplier deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 2000);
    }
  };

  const handleToggleActive = (id: number) => {
    const currentSupplier = suppliers.find((s) => s.id === id);
    if (!currentSupplier) return;

    const message = currentSupplier.status === "Active"
      ? `Do you want to Inactivate "${currentSupplier.supplierName}"?\n\nThe supplier will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentSupplier.supplierName}"?\n\nThe supplier will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    setSuppliers(
      suppliers.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" }
          : s
      )
    );
    setSuccessMsg(
      currentSupplier.status === "Active"
        ? "Supplier inactivated successfully!"
        : "Supplier activated successfully!"
    );
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleSupplierSaved = (supplierData: any) => {
    if (editingSupplier) {
      // Update existing supplier
      setSuppliers(
        suppliers.map((supplier) =>
          supplier.id === editingSupplier.id ? { ...supplier, ...supplierData } : supplier
        )
      );
    } else {
      // Add new supplier
      const newSupplier: Supplier = {
        id: Math.max(0, ...suppliers.map((s) => s.id)) + 1,
        ...supplierData,
      };
      setSuppliers([newSupplier, ...suppliers]);
    }
    setShowModal(false);
    setEditingSupplier(null);
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
        {/* Page Header */}
        <PageHeader title="Supplier" icon={Users} path="Inventory" />

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
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("All");
                setCurrentPage(1);
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
              {paginatedSuppliers.length > 0 ? (
                paginatedSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                      {supplier.supplierName}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                      {supplier.gstNumber}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs">
                      {supplier.email || "-"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-600 text-sm">
                      {supplier.phoneNumber}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">
                      {supplier.city}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => handleToggleActive(supplier.id)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            supplier.status === "Active"
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-gray-400 hover:bg-gray-500 text-white"
                          }`}
                        >
                          {supplier.status === "Active" ? "Active" : "Inactive"}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 mt-4 p-3 bg-white rounded shadow-md">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    currentPage === page
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
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
