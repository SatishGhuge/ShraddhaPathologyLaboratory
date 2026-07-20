"use client";

import { useState } from "react";
import { Package, RotateCcw, ChevronLeft, ChevronRight, Eye, Trash2, Plus, Download } from "lucide-react";
import OrganizationTransferModal from "@/src/components/OrganizationTransferModal";
import TransferDetailsModal from "@/src/components/TransferDetailsModal";
import PageHeader from "@/src/components/BreadCrumb";
import * as XLSX from "xlsx";

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
  const [transfers, setTransfers] = useState<OrganizationTransfer[]>([
    {
      id: 1,
      transferNumber: "TRF-20260718-001",
      transferDate: "2026-07-18",
      fromOrganization: "Main Lab",
      toOrganization: "Nagpur Branch",
      items: [
        { itemName: "CBC Reagent Kit", batchNo: "B202602", expiryDate: "2028-06-30", quantity: 50 },
        { itemName: "Urine Test Strips", batchNo: "G202504", expiryDate: "2028-05-15", quantity: 200 },
      ],
      remarks: "Routine monthly stock transfer",
      createdBy: "Admin",
      status: "Completed",
    },
    {
      id: 2,
      transferNumber: "TRF-20260717-002",
      transferDate: "2026-07-17",
      fromOrganization: "Main Lab",
      toOrganization: "Pune Collection Center",
      items: [
        { itemName: "Blood Collection Tubes", batchNo: "T202505", expiryDate: "2028-05-20", quantity: 100 },
      ],
      remarks: "Emergency stock request",
      createdBy: "Admin",
      status: "Completed",
    },
  ]);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<OrganizationTransfer | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const ITEMS_PER_PAGE = 10;

  // Enhanced search - searches across multiple fields
  const filteredTransfers = transfers.filter((transfer) => {
    const searchLower = search.toLowerCase();
    return (
      transfer.transferNumber.toLowerCase().includes(searchLower) ||
      transfer.toOrganization.toLowerCase().includes(searchLower) ||
      transfer.fromOrganization.toLowerCase().includes(searchLower) ||
      transfer.items.some(
        (item) =>
          item.itemName.toLowerCase().includes(searchLower) ||
          item.batchNo.toLowerCase().includes(searchLower)
      ) ||
      transfer.transferDate.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE);
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTransferComplete = (transferData: any) => {
    const newTransfer: OrganizationTransfer = {
      id: Math.max(0, ...transfers.map((t) => t.id)) + 1,
      transferNumber: transferData.transferNumber,
      transferDate: transferData.transferDate,
      fromOrganization: "Main Lab",
      toOrganization: transferData.organizationName,
      items: transferData.items,
      remarks: transferData.remarks,
      createdBy: "Admin",
      status: "Completed",
    };
    setTransfers([newTransfer, ...transfers]);
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
          "Transfer No": transfer.transferNumber,
          "Date": new Date(transfer.transferDate).toLocaleDateString("en-GB"),
          "From": transfer.fromOrganization,
          "To": transfer.toOrganization,
          "Item": item.itemName,
          "Batch": item.batchNo,
          "Expiry": new Date(item.expiryDate).toLocaleDateString("en-GB"),
          "Qty": item.quantity,
          "Remarks": transfer.remarks,
          "Created By": transfer.createdBy,
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
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
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
              {paginatedTransfers.length > 0 ? (
                paginatedTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs font-mono">
                      {transfer.transferNumber}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600 text-sm">
                      {new Date(transfer.transferDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-900">
                      {transfer.toOrganization}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        {transfer.items.length}
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
        organizations={[
          { id: 1, name: "Nagpur Branch", code: "NBR-001" },
          { id: 2, name: "Pune Collection Center", code: "PCC-002" },
          { id: 3, name: "Mumbai Hub", code: "MH-003" },
        ]}
        items={[
          { id: 1, itemId: "IT-001", itemName: "CBC Reagent Kit", itemCode: "REG-001" },
          { id: 2, itemId: "IT-002", itemName: "Urine Test Strips", itemCode: "CON-012" },
          { id: 3, itemId: "IT-003", itemName: "Blood Collection Tubes", itemCode: "TUBE-005" },
        ]}
        stockItems={[
          { id: 1, itemId: 1, batchNo: "B202601", expiryDate: "2027-12-31", availableStock: 120 },
          { id: 2, itemId: 1, batchNo: "B202602", expiryDate: "2028-06-30", availableStock: 80 },
          { id: 3, itemId: 2, batchNo: "G202504", expiryDate: "2028-05-15", availableStock: 300 },
          { id: 4, itemId: 3, batchNo: "T202505", expiryDate: "2028-05-20", availableStock: 250 },
        ]}
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
