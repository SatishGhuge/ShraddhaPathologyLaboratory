"use client";

import { useState, useEffect } from "react";
import { Package, RotateCcw, ChevronLeft, ChevronRight, Eye, Trash2, Plus, Download } from "lucide-react";
import OrganizationTransferModal from "@/src/components/OrganizationTransferModal";
import TransferDetailsModal from "@/src/components/TransferDetailsModal";
import PageHeader from "@/src/components/BreadCrumb";
import * as XLSX from "xlsx";
import inventoryAPI from "@/lib/api/inventory.api";

interface TransferItem {
  itemName: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
}

interface OrganizationTransfer {
  id: number;
  transferNumber: string;
  transferDate: string;
  fromOrganization: string;
  toOrganization: string;
  items: TransferItem[];
  remarks: string;
  createdBy: string;
  status: "Completed" | "Pending";
}

export default function OrganizationTransferPage() {
  const [transfers, setTransfers] = useState<OrganizationTransfer[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<OrganizationTransfer | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchTransfers();
  }, [currentPage]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [transfersRes, itemsRes, labStocksRes] = await Promise.all([
        inventoryAPI.transfers.getAll(currentPage, ITEMS_PER_PAGE),
        inventoryAPI.items.getDropdownItems(),
        inventoryAPI.labStocks.getAll(1, 100)
      ]);
      
      // Map the transfers data to ensure itemName is populated
      const mappedTransfers = (transfersRes.data.data || []).map((transfer: any) => ({
        ...transfer,
        items: (transfer.items || []).map((transferItem: any) => ({
          itemName: transferItem.item?.itemName || transferItem.itemName || "-",
          itemCode: transferItem.item?.itemCode || transferItem.itemCode || "-",
          batchNo: transferItem.batchNo,
          expiryDate: transferItem.expiryDate,
          quantity: transferItem.quantity
        }))
      }));
      
      setTransfers(mappedTransfers);
      setItems(itemsRes.data.data || []);
      setStockItems(labStocksRes.data.data || []);
      
      // Fetch organizations separately
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/master/organizations`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const orgsData = await response.json();
        console.log('Organizations fetched:', orgsData);
        setOrganizations(orgsData.data || []);
      } catch (orgErr) {
        console.error('Failed to fetch organizations:', orgErr);
        setOrganizations([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch transfers data:", err);
      setError("Failed to fetch transfer data");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced search - searches across multiple fields
  const filteredTransfers = transfers.filter((transfer) => {
    const searchLower = search.toLowerCase();
    return (
      (transfer.transferNumber?.toLowerCase().includes(searchLower)) ||
      (transfer.toOrganization?.toLowerCase().includes(searchLower)) ||
      (transfer.fromOrganization?.toLowerCase().includes(searchLower)) ||
      (transfer.toOrganization?.toLowerCase().includes(searchLower)) ||
      (transfer.items?.some(
        (item) =>
          item.itemName?.toLowerCase().includes(searchLower) ||
          item.batchNo?.toLowerCase().includes(searchLower)
      )) ||
      (transfer.transferDate?.includes(search))
    );
  });

  const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE);
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTransferComplete = (transferData: any) => {
    fetchTransfers();
    setSuccessMsg("Transfer recorded successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleViewDetails = (transfer: OrganizationTransfer) => {
    setSelectedTransfer(transfer);
    setShowDetailsModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this transfer record?")) {
      setTransfers(transfers.filter((transfer) => transfer.id !== id));
      setSuccessMsg("Transfer record deleted!");
      setTimeout(() => setSuccessMsg(""), 2000);
    }
  };

  const handleExportExcel = () => {
    const exportData: any[] = [];

    transfers.forEach((transfer) => {
      transfer.items.forEach((item) => {
        exportData.push({
          "Transfer No": transfer.transferNumber || "-",
          "Date": transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString("en-GB") : "-",
          "From": transfer.fromOrganization || "-",
          "To": transfer.toOrganization || (transfer as any).organization?.name || "-",
          "Item": item.itemName || "-",
          "Batch": item.batchNo || "-",
          "Expiry": item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-GB") : "-",
          "Qty": item.quantity || 0,
          "Remarks": transfer.remarks || "-",
          "Created By": transfer.createdBy || "-",
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transfers");

    // Set column widths
    const colWidths = [18, 12, 15, 18, 20, 12, 12, 8, 30, 15];
    worksheet["!cols"] = colWidths.map((width) => ({ wch: width }));

    XLSX.writeFile(workbook, `Organization_Transfers_${new Date().toISOString().split("T")[0]}.xlsx`);
    setSuccessMsg("Excel file exported successfully!");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
        {/* Page Header */}
        <PageHeader title="Organization Transfer" icon={Package} path="Inventory" />

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
              placeholder="Search by Transfer No, Organization, Item, Batch, or Date..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-96 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download size={16} /> Export Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> New Transfer
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="w-32 border border-gray-300 px-3 py-2  text-left font-semibold">
                  Transfer No
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Date
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  Organization
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  Items
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
                    Loading transfers...
                  </td>
                </tr>
              ) : paginatedTransfers.length > 0 ? (
                paginatedTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                      {transfer.transferNumber || transfer.id}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-sm">
                      {new Date(transfer.transferDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                      {transfer.toOrganization || (transfer as any).organization?.name || "-"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        {transfer.items?.length || 0}
                      </span>
                    </td>
                   
                    <td className="border border-gray-300 px-3 py-2">
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewDetails(transfer)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          onClick={() => handleDelete(transfer.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-300">
                    No transfers found
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
      <OrganizationTransferModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onTransferComplete={handleTransferComplete}
        organizations={organizations}
        items={items}
        stockItems={stockItems}
      />

      {/* Transfer Details Modal */}
      <TransferDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        transfer={selectedTransfer}
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
