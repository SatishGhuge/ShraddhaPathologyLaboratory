"use client";

import { X, Download } from "lucide-react";
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

interface TransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: OrganizationTransfer | null;
}

export default function TransferDetailsModal({
  isOpen,
  onClose,
  transfer,
}: TransferDetailsModalProps) {
  if (!isOpen || !transfer) return null;

  const handleExportExcel = () => {
    // Create export data with ONLY the items (NO manual header row)
    const exportData: any[] = [];

    // Add all items DIRECTLY (without manual header row)
    transfer.items.forEach((item) => {
      exportData.push({
        "Item Name": item.itemName,
        "Batch": item.batchNo,
        "Expiry": new Date(item.expiryDate).toLocaleDateString("en-GB"),
        "Qty": item.quantity,
      });
    });

    // Create worksheet and workbook with proper headers
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 25 },  // Item Name
      { wch: 15 },  // Batch
      { wch: 15 },  // Expiry
      { wch: 10 },  // Qty
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transferred Items");

    // Generate file
    XLSX.writeFile(
      workbook,
      `Transfer_${transfer.transferNumber}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b bg-white">
          <h2 className="text-lg font-bold text-gray-800">Transfer Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Header Information */}
          <div className="border-b pb-4 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Transfer No</label>
                <p className="text-sm font-mono text-gray-900">{transfer.transferNumber}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Transfer Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(transfer.transferDate).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">From</label>
                <p className="text-sm text-gray-900">{transfer.fromOrganization}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">To</label>
                <p className="text-sm text-gray-900">{transfer.toOrganization}</p>
              </div>
            </div>
          </div>

          {/* Transferred Items */}
          <div className="border-b pb-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Transferred Items</h3>
            <div className="overflow-x-auto bg-gray-50 rounded border">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left">Item Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Batch</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Expiry</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-100">
                      <td className="border border-gray-300 px-3 py-2 text-gray-900">
                        {item.itemName}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 font-mono text-gray-900">
                        {item.batchNo}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-gray-900">
                        {new Date(item.expiryDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-blue-600">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div className="border-b pb-4 space-y-1">
            <label className="text-xs font-semibold text-gray-600">Remarks</label>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
              {transfer.remarks || "-"}
            </p>
          </div>

          {/* Footer Information */}
          <div className="border-b pb-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs font-semibold text-gray-600">Created By</label>
              <p className="text-gray-900">{transfer.createdBy}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Status</label>
              <p className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                {transfer.status}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded text-sm transition-colors font-semibold flex items-center gap-2"
            >
              <Download size={16} /> Export Excel
            </button>
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm transition-colors font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
