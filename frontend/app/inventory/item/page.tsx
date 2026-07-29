"use client";

import { useState, useEffect } from "react";
import { Package, RotateCcw, ChevronLeft, ChevronRight, Edit2, Trash2, Plus } from "lucide-react";
import ItemMasterModal from "@/src/components/ItemMasterModal";
import inventoryAPI from "@/lib/api/inventory.api";

interface Item {
  id: number;
  itemName: string;
  itemCode: string;
  hsnCodeId: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hsnCode?: { id: number; hsnCode: string; category: string; gstRate: number };
}

export default function ItemPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Fetch items from API
  useEffect(() => {
    fetchItems();
  }, [currentPage]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await inventoryAPI.items.getAll(currentPage, ITEMS_PER_PAGE);
      setItems(response.data.data || []);
      setPagination(response.data.pagination || null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch items");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      try {
        await inventoryAPI.items.delete(id);
        setItems(items.filter((item) => item.id !== id));
        setSuccessMsg("Item deleted successfully!");
        setTimeout(() => setSuccessMsg(""), 2000);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to delete item");
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  const handleToggleActive = (id: number) => {
    const currentItem = items.find((i) => i.id === id);
    if (!currentItem) return;

    const message = currentItem.isActive
      ? `Do you want to Inactivate "${currentItem.itemName}"?`
      : `Do you want to Activate "${currentItem.itemName}"?`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    setItems(
      items.map((i) =>
        i.id === id
          ? { ...i, isActive: !i.isActive }
          : i
      )
    );
    setSuccessMsg(
      currentItem.isActive
        ? "Item inactivated successfully!"
        : "Item activated successfully!"
    );
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleItemSaved = (itemData: any) => {
    setShowModal(false);
    setEditingItem(null);
    fetchItems();
    setSuccessMsg(editingItem ? "Item updated successfully!" : "Item created successfully!");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
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
              placeholder="Search By Item Name, Code"
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
                fetchItems();
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

        {/* Table with Pagination */}
        <div className="bg-white rounded shadow-md overflow-hidden flex flex-col">
          {/* Pagination Header */}
          {pagination && (
            <div className="border-b p-3 bg-gray-50 flex justify-between items-center text-xs sm:text-sm">
              <span className="text-sm font-semibold text-gray-700">
                Page {pagination?.page || 1} of {pagination?.totalPages || 1} 
                {pagination?.total && ` (Total: ${pagination.total})`}
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                    Id
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
                    Unit
                  </th>
                  
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-300">
                      Loading items...
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items
                    .filter((item) => {
                      const matchesSearch =
                        item.itemName.toLowerCase().includes(search.toLowerCase()) ||
                        item.itemCode.toLowerCase().includes(search.toLowerCase());
                      
                      const matchesInactiveFilter = showInactive 
                        ? item.isActive === false 
                        : item.isActive === true;
                      
                      return matchesSearch && matchesInactiveFilter;
                    })
                    .map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                      <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                        {((pagination?.page || 1) - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                        {item.itemName}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                        {item.itemCode}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-600">
                        {item.hsnCode?.hsnCode || "-"} ({item.hsnCode?.gstRate || 0}%)
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">
                        {item.unit}
                      </td>
                    
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="flex justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => handleToggleActive(item.id)}
                            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                              item.isActive
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-gray-400 hover:bg-gray-500 text-white"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
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
                    <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-300">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="border-t p-3 bg-gray-50 flex items-center justify-between text-xs sm:text-sm">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const totalPages = pagination.totalPages;
                  
                  if (totalPages <= 5) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    if (currentPage <= 3) {
                      pages.push(1, 2, 3, 4, '...', totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                    }
                  }

                  return pages.map((page, idx) => (
                    page === '...' ? (
                      <span key={idx} className="px-2">...</span>
                    ) : (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-7 h-7 rounded ${currentPage === page ? 'bg-orange-500 text-white font-bold' : 'bg-white border hover:bg-gray-100'}`}
                      >
                        {page}
                      </button>
                    )
                  ));
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className={`px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
              >
                Next →
              </button>
            </div>
          )}
        </div>
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
