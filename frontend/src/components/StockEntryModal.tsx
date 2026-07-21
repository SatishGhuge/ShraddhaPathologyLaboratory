"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Edit2, Check } from "lucide-react";

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
}

interface StockEntryItem {
  itemId: number;
  itemName: string;
  unit: string;
  itemCode: string;
  hsnNumber: string;
  gst: number;
  cgst: number;
  sgst: number;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  pricePerUnit: number;
  basicAmount: number;
  totalAmount: number;
}

interface StockEntryForm {
  supplierId?: number;
  invoiceNo: string;
  invoiceDate: string;
}

interface ItemForm {
  itemId?: number;
  hsnNumber: string;
  unit: string;
  itemCode: string;
  gst: number | "";
  batchNo: string;
  expiryDate: string;
  quantity: number | "";
  pricePerUnit: number | "";
}

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockEntrySaved: (data: any) => void;
  suppliers: Supplier[];
  items: Item[];
}

export default function StockEntryModal({
  isOpen,
  onClose,
  onStockEntrySaved,
  suppliers,
  items,
}: StockEntryModalProps) {
  // Header form (Supplier, Invoice No, Invoice Date)
  const [headerForm, setHeaderForm] = useState<StockEntryForm>({
    supplierId: suppliers.length > 0 ? suppliers[0].id : undefined,
    invoiceNo: "INV-2024-001",
    invoiceDate: new Date().toISOString().split("T")[0],
  });

  // Item form for adding new items
  const [itemForm, setItemForm] = useState<ItemForm>({
    itemId: items.length > 0 ? items[0].id : undefined,
    hsnNumber: items.length > 0 ? items[0].hsnCode : "",
    unit: items.length > 0 ? items[0].unit : "",
    itemCode: items.length > 0 ? items[0].itemCode : "",
    gst: items.length > 0 ? items[0].gst : "",
    batchNo: "BATCH-001",
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0],
    quantity: 10,
    pricePerUnit: 150,
  });

  // Selected items list - only add sample if items exist
  const [selectedItems, setSelectedItems] = useState<StockEntryItem[]>(
    items.length > 0
      ? [
          {
            itemId: items[0].id,
            itemName: items[0].itemName,
            unit: items[0].unit,
            itemCode: items[0].itemCode,
            hsnNumber: items[0].hsnCode,
            gst: items[0].gst,
            cgst: 135,
            sgst: 135,
            batchNo: "BATCH-2024-001",
            expiryDate: new Date(new Date().setDate(new Date().getDate() + 30))
              .toISOString()
              .split("T")[0],
            quantity: 10,
            pricePerUnit: 150,
            basicAmount: 1500,
            totalAmount: 1770,
          },
        ]
      : []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHeaderForm({
        supplierId: undefined,
        invoiceNo: "",
        invoiceDate: new Date().toISOString().split("T")[0],
      });
      setItemForm({
        itemId: undefined,
        hsnNumber: "",
        unit: "",
        itemCode: "",
        gst: "",
        batchNo: "",
        expiryDate: "",
        quantity: "",
        pricePerUnit: "",
      });
      setSelectedItems([]);
      setErrors({});
    }
  }, [isOpen]);

  const selectedItemData = items.find((item) => item.id === itemForm.itemId);

  // Auto-fetch item details
  useEffect(() => {
    if (selectedItemData) {
      setItemForm((prev) => ({
        ...prev,
        hsnNumber: selectedItemData.hsnCode,
        unit: selectedItemData.unit,
        itemCode: selectedItemData.itemCode,
        gst: selectedItemData.gst,
      }));
    }
  }, [selectedItemData]);

  const handleAddItem = () => {
    const newErrors: Record<string, string> = {};

    if (!itemForm.itemId) newErrors.itemId = "Item is required";
    if (!itemForm.batchNo.trim()) newErrors.batchNo = "Batch No is required";
    if (!itemForm.expiryDate) newErrors.expiryDate = "Expiry Date is required";
    if (!itemForm.quantity || itemForm.quantity <= 0) newErrors.quantity = "Valid Quantity is required";
    if (!itemForm.pricePerUnit || itemForm.pricePerUnit <= 0) newErrors.pricePerUnit = "Valid Price is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    // Get the selected item details from items array
    const selectedItem = items.find((item) => item.id === itemForm.itemId);
    
    if (!selectedItem) {
      setErrors({ itemId: "Selected item not found" });
      return;
    }

    const quantity = Number(itemForm.quantity);
    const pricePerUnit = Number(itemForm.pricePerUnit);
    const basicAmount = quantity * pricePerUnit;
    const gstPercent = Number(itemForm.gst) || 0;
    const cgst = basicAmount * (gstPercent / 100) / 2;
    const sgst = basicAmount * (gstPercent / 100) / 2;
    const totalAmount = basicAmount + cgst + sgst;

    const newItem: StockEntryItem = {
      itemId: itemForm.itemId,
      itemName: selectedItem.itemName,
      unit: itemForm.unit,
      itemCode: itemForm.itemCode,
      hsnNumber: itemForm.hsnNumber,
      gst: Number(itemForm.gst),
      cgst,
      sgst,
      batchNo: itemForm.batchNo,
      expiryDate: itemForm.expiryDate,
      quantity,
      pricePerUnit,
      basicAmount,
      totalAmount,
    };

    setSelectedItems([...selectedItems, newItem]);

    // Reset item form
    setItemForm({
      itemId: undefined,
      hsnNumber: "",
      unit: "",
      itemCode: "",
      gst: "",
      batchNo: "",
      expiryDate: "",
      quantity: "",
      pricePerUnit: "",
    });
    setErrors({});
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    const item = selectedItems[index];
    setEditingIndex(index);
    setItemForm({
      itemId: item.itemId,
      hsnNumber: item.hsnNumber,
      unit: item.unit,
      itemCode: item.itemCode,
      gst: item.gst,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
    });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const newErrors: Record<string, string> = {};

    if (!itemForm.itemId) newErrors.itemId = "Item is required";
    if (!itemForm.batchNo.trim()) newErrors.batchNo = "Batch No is required";
    if (!itemForm.expiryDate) newErrors.expiryDate = "Expiry Date is required";
    if (!itemForm.quantity || itemForm.quantity <= 0) newErrors.quantity = "Valid Quantity is required";
    if (!itemForm.pricePerUnit || itemForm.pricePerUnit <= 0) newErrors.pricePerUnit = "Valid Price is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    // Get the selected item details
    const selectedItem = items.find((item) => item.id === itemForm.itemId);
    
    if (!selectedItem) {
      setErrors({ itemId: "Selected item not found" });
      return;
    }

    const quantity = Number(itemForm.quantity);
    const pricePerUnit = Number(itemForm.pricePerUnit);
    const basicAmount = quantity * pricePerUnit;
    const gstPercent = Number(itemForm.gst) || 0;
    const cgst = basicAmount * (gstPercent / 100) / 2;
    const sgst = basicAmount * (gstPercent / 100) / 2;
    const totalAmount = basicAmount + cgst + sgst;

    const updatedItems = [...selectedItems];
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      itemName: selectedItem.itemName,
      hsnNumber: itemForm.hsnNumber,
      batchNo: itemForm.batchNo,
      expiryDate: itemForm.expiryDate,
      quantity,
      pricePerUnit,
      basicAmount,
      cgst,
      sgst,
      totalAmount,
    };

    setSelectedItems(updatedItems);
    setEditingIndex(null);
    setItemForm({
      itemId: undefined,
      hsnNumber: "",
      unit: "",
      itemCode: "",
      gst: "",
      batchNo: "",
      expiryDate: "",
      quantity: "",
      pricePerUnit: "",
    });
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!headerForm.supplierId) newErrors.supplierId = "Supplier is required";
    if (!headerForm.invoiceNo.trim()) newErrors.invoiceNo = "Invoice No is required";
    if (!headerForm.invoiceDate) newErrors.invoiceDate = "Invoice Date is required";
    if (selectedItems.length === 0) newErrors.items = "Please add at least one item";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    const totalBasicAmount = selectedItems.reduce((sum, item) => sum + item.basicAmount, 0);
    const totalCGST = selectedItems.reduce((sum, item) => sum + item.cgst, 0);
    const totalSGST = selectedItems.reduce((sum, item) => sum + item.sgst, 0);
    const grandTotal = selectedItems.reduce((sum, item) => sum + item.totalAmount, 0);

    onStockEntrySaved({
      ...headerForm,
      supplierId: Number(headerForm.supplierId),
      items: selectedItems,
      totalBasicAmount,
      totalCGST,
      totalSGST,
      grandTotal,
    });

    // Reset form
    setHeaderForm({
      supplierId: undefined,
      invoiceNo: "",
      invoiceDate: new Date().toISOString().split("T")[0],
    });
    setSelectedItems([]);
    setErrors({});
  };

  const handleHeaderChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setHeaderForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setItemForm((prev) => ({
      ...prev,
      [name]:
        name === "quantity" || name === "pricePerUnit"
          ? value === ""
            ? ""
            : Number(value)
          : name === "gst"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  if (!isOpen) return null;

  // Helper function to format prices - show decimals only if they exist
  const formatPrice = (price: number): string => {
    const rounded = Number(price.toFixed(2));
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
  };

  const totalBasicAmount = selectedItems.reduce((sum, item) => sum + item.basicAmount, 0);
  const totalCGST = selectedItems.reduce((sum, item) => sum + item.cgst, 0);
  const totalSGST = selectedItems.reduce((sum, item) => sum + item.sgst, 0);
  const grandTotal = selectedItems.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b bg-white">
          <h2 className="text-lg font-bold text-gray-800">Stock Entry</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Header Section - Supplier, Invoice No, Invoice Date */}
          <div className="border-b pb-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-700">Purchase Information</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  name="supplierId"
                  value={headerForm.supplierId || ""}
                  onChange={handleHeaderChange}
                  className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                    errors.supplierId
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplierName}
                    </option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.supplierId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">
                  Invoice No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="invoiceNo"
                  value={headerForm.invoiceNo}
                  onChange={handleHeaderChange}
                  className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                    errors.invoiceNo
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="Invoice No"
                />
                {errors.invoiceNo && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.invoiceNo}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="invoiceDate"
                  value={headerForm.invoiceDate}
                  onChange={handleHeaderChange}
                  className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                    errors.invoiceDate
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                />
                {errors.invoiceDate && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.invoiceDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Add Item Section */}
          <div className="border-b pb-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-700">Add Item</h3>
            
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Item</label>
                <select
                  name="itemId"
                  value={itemForm.itemId || ""}
                  onChange={handleItemChange}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.itemId ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-orange-500"
                  }`}
                >
                  <option value="">Select</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Unit</label>
                <input
                  type="text"
                  name="unit"
                  value={itemForm.unit}
                  readOnly
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Item Code</label>
                <input
                  type="text"
                  name="itemCode"
                  value={itemForm.itemCode}
                  readOnly
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">HSN No</label>
                <input
                  type="text"
                  name="hsnNumber"
                  value={itemForm.hsnNumber}
                  onChange={handleItemChange}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.hsnNumber ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="HSN"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">GST %</label>
                <input
                  type="number"
                  name="gst"
                  value={itemForm.gst}
                  readOnly
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Batch No</label>
                <input
                  type="text"
                  name="batchNo"
                  value={itemForm.batchNo}
                  onChange={handleItemChange}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.batchNo ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="Batch"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Expiry</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={itemForm.expiryDate}
                  onChange={handleItemChange}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.expiryDate ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-orange-500"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Qty</label>
                <input
                  type="number"
                  name="quantity"
                  value={itemForm.quantity}
                  onChange={handleItemChange}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.quantity ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Price</label>
                <input
                  type="number"
                  name="pricePerUnit"
                  value={itemForm.pricePerUnit}
                  onChange={handleItemChange}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                    errors.pricePerUnit ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">CGST %</label>
                <input
                  type="text"
                  disabled
                  value={itemForm.gst ? (Number(itemForm.gst) / 2).toFixed(2) : "0.00"}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-50 text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">SGST %</label>
                <input
                  type="text"
                  disabled
                  value={itemForm.gst ? (Number(itemForm.gst) / 2).toFixed(2) : "0.00"}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-gray-50 text-center"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded text-xs flex items-center gap-1 transition-colors font-semibold"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded">
                {Object.entries(errors).map(([key, message]) => (
                  key !== "items" && <p key={key} className="text-red-500 text-xs">{message}</p>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items Table */}
          {selectedItems.length > 0 && (
            <div className="border-b pb-3 space-y-1">
              <h3 className="text-xs font-semibold text-gray-700">Items</h3>
              <div className="overflow-x-auto rounded border border-gray-300">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1 text-left min-w-32">Item</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-left min-w-20">Batch</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-12">Exp</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-12">Qty</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-16">Price</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-16">MRP</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-14">CGST</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-14">SGST</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-16">Tax</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-center min-w-16">Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => {
                      const expDate = new Date(item.expiryDate);
                      const expDateStr = `${String(expDate.getDate()).padStart(2, "0")}/${String(expDate.getMonth() + 1).padStart(2, "0")}`;
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-2 py-0.5 text-left">{item.itemName}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 font-mono text-xs">{item.batchNo}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center text-xs">{expDateStr}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center font-semibold">{item.quantity}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center">₹{formatPrice(item.pricePerUnit)}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center">₹{formatPrice(item.basicAmount)}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center">₹{formatPrice(item.cgst)}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center">₹{formatPrice(item.sgst)}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center font-semibold text-blue-600">₹{formatPrice(item.totalAmount)}</td>
                          <td className="border border-gray-300 px-1.5 py-0.5 text-center">
                            <div className="flex justify-center gap-0.5">
                              {editingIndex === index ? (
                                <button
                                  type="button"
                                  onClick={handleSaveEdit}
                                  className="text-green-600 hover:text-green-800 transition"
                                  title="Save"
                                >
                                  <Check size={12} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEditItem(index)}
                                  className="text-blue-500 hover:text-blue-700 transition"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                disabled={editingIndex === index}
                                className="text-red-500 hover:text-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Amount Summary */}
          <div className="border-b pb-3 bg-orange-50 p-3 rounded">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900 text-sm">Total Taxable</span>
              <span className="font-bold text-orange-600 text-lg">
                ₹{formatPrice(grandTotal)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded text-xs transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedItems.length === 0}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-1.5 rounded text-xs transition-colors font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
