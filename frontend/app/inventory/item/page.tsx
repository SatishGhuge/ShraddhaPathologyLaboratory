"use client";

import { useState } from "react";
import { Package, RotateCcw, ChevronLeft, ChevronRight, Edit2, Trash2, Plus } from "lucide-react";
import ItemMasterModal from "@/src/components/ItemMasterModal";
import PageHeader from "@/src/components/BreadCrumb";

interface Supplier {
  id: number;
  supplierName: string;
}

interface Item {
  id: number;
  itemId: string;
  itemName: string;
  itemCode: string;
  hsnCode: string;
  gst: number;
  unit: string;
  description: string;
  supplierId?: number;
  status?: "Active" | "Inactive";
}

const SAMPLE_SUPPLIERS: Supplier[] = [
  { id: 1, supplierName: "MedSupply Co." },
  { id: 2, supplierName: "LabKit India" },
  { id: 3, supplierName: "BioLab Pvt Ltd" },
];

export default function ItemPage() {
  const [items, setItems] = useState<Item[]>([
    {
      id: 1,
      itemId: "IT-001",
      itemName: "CBC Reagent Kit",
      itemCode: "REG-001",
      hsnCode: "30024090",
      gst: 12,
      unit: "Kit",
      description: "Complete blood count reagent kit",
      supplierId: 1,
      status: "Active",
    },
    {
      id: 2,
      itemId: "IT-002",
      itemName: "Urine Test Strips",
      itemCode: "CON-012",
      hsnCode: "30061100",
      gst: 18,
      unit: "Box",
      description: "100 strips per box",
      supplierId: 2,
      status: "Inactive",
    },
  ]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Get supplier name by ID
  const getSupplierName = (supplierId?: number) => {
    if (!supplierId) return "-";
    const supplier = SAMPLE_SUPPLIERS.find((s) => s.id === supplierId);
    return supplier?.supplierName || "-";
  };

  // Filter items based on search and inactive filter
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      item.hsnCode.toLowerCase().includes(search.toLowerCase());
    
    // If showInactive is checked, show ONLY inactive items
    // If showInactive is unchecked, show ONLY active items
    const matchesInactiveFilter = showInactive ? item.status === "Inactive" : (item.status === "Active" || !item.status);
    
    return matchesSearch && matchesInactiveFilter;
  });

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setItems(items.filter((item) => item.id !== id));
      setSuccessMsg("Item deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 2000);
    }
  };

  const handleToggleActive = (id: number) => {
    const currentItem = items.find((i) => i.id === id);
    if (!currentItem) return;

    const message = currentItem.status === "Active" || !currentItem.status
      ? `Do you want to Inactivate "${currentItem.itemName}"?\n\nThe item will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentItem.itemName}"?\n\nThe item will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    setItems(
      items.map((i) =>
        i.id === id
          ? {
              ...i,
              status: i.status === "Active" || !i.status ? "Inactive" : "Active",
            }
          : i
      )
    );
    const isCurrentlyActive = currentItem.status === "Active" || !currentItem.status;
    setSuccessMsg(
      isCurrentlyActive
        ? "Item inactivated successfully!"
        : "Item activated successfully!"
    );
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleItemSaved = (itemData: any) => {
    if (editingItem) {
      // Update existing item
      setItems(
        items.map((item) =>
          item.id === editingItem.id ? { ...item, ...itemData } : item
        )
      );
    } else {
      // Add new item
      const newItem: Item = {
        id: Math.max(0, ...items.map((i) => i.id)) + 1,
        itemId: `IT-${String(Math.max(0, ...items.map((i) => i.id)) + 1).padStart(3, "0")}`,
        ...itemData,
      };
      setItems([newItem, ...items]);
    }
    setShowModal(false);
    setEditingItem(null);
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
        {/* Page Header */}
        <PageHeader title="Item" icon={Package} path="Inventory" />

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap items-center">
            <input
              type="text"
              placeholder="Search By Item Name, Code, HSN"
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
              setEditingItem(null);
              setShowModal(true);
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Item ID
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Item Name
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Item Code
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  HSN Code
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  GST %
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Unit
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Supplier
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500 border border-gray-300">
                    Loading items...
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs">
                      {item.itemId}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                      {item.itemName}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                      {item.itemCode}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">
                      {item.hsnCode}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        {item.gst}%
                      </span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">
                      {item.unit}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-sm">
                      {getSupplierName(item.supplierId)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => handleToggleActive(item.id)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            item.status === "Active" || !item.status
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-gray-400 hover:bg-gray-500 text-white"
                          }`}
                        >
                          {item.status === "Active" || !item.status ? "Active" : "Inactive"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowModal(true);
                          }}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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
                    No items found
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
      <ItemMasterModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onItemSaved={handleItemSaved}
        editingItem={editingItem}
        suppliers={SAMPLE_SUPPLIERS}
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
