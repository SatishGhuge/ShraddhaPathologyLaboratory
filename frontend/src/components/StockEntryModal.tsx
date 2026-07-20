"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

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

interface StockEntryForm {
  supplierId?: number;
  invoiceNo: string;
  invoiceDate: string;
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
  editingEntry?: any;
}

export default function StockEntryModal({
  isOpen,
  onClose,
  onStockEntrySaved,
  suppliers,
  items,
  editingEntry,
}: StockEntryModalProps) {
  const [form, setForm] = useState<StockEntryForm>({
    supplierId: undefined,
    invoiceNo: "",
    invoiceDate: new Date().toISOString().split("T")[0],
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingEntry) {
      setForm(editingEntry);
    } else {
      setForm({
        supplierId: undefined,
        invoiceNo: "",
        invoiceDate: new Date().toISOString().split("T")[0],
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
    }
    setErrors({});
  }, [editingEntry, isOpen]);

  const selectedItem = items.find((item) => item.id === form.itemId);

  // Auto-fetch item details when item is selected
  useEffect(() => {
    if (selectedItem) {
      setForm((prev) => ({
        ...prev,
        hsnNumber: selectedItem.hsnCode,
        unit: selectedItem.unit,
        itemCode: selectedItem.itemCode,
        gst: selectedItem.gst,
      }));
    }
  }, [selectedItem]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.supplierId) newErrors.supplierId = "Supplier is required";
    if (!form.invoiceNo.trim()) newErrors.invoiceNo = "Invoice No is required";
    if (!form.invoiceDate) newErrors.invoiceDate = "Invoice Date is required";
    if (!form.itemId) newErrors.itemId = "Item is required";
    if (!form.hsnNumber.trim()) newErrors.hsnNumber = "HSN Number is required";
    if (!form.unit.trim()) newErrors.unit = "Unit is required";
    if (!form.itemCode.trim()) newErrors.itemCode = "Item Code is required";
    if (form.gst === "" || form.gst === 0) newErrors.gst = "GST % is required";
    if (!form.batchNo.trim()) newErrors.batchNo = "Batch No is required";
    if (!form.expiryDate) newErrors.expiryDate = "Expiry Date is required";
    if (!form.quantity || form.quantity <= 0) newErrors.quantity = "Valid Quantity is required";
    if (!form.pricePerUnit || form.pricePerUnit <= 0) newErrors.pricePerUnit = "Valid Price is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const quantity = Number(form.quantity);
    const pricePerUnit = Number(form.pricePerUnit);
    const basicAmount = quantity * pricePerUnit;
    const gstPercent = Number(form.gst) || 0;
    const cgst = basicAmount * (gstPercent / 100) / 2;
    const sgst = basicAmount * (gstPercent / 100) / 2;
    const grandTotal = basicAmount + cgst + sgst;

    onStockEntrySaved({
      ...form,
      quantity,
      pricePerUnit,
      gst: Number(form.gst),
      basicAmount,
      cgst,
      sgst,
      grandTotal,
    });

    setForm({
      supplierId: undefined,
      invoiceNo: "",
      invoiceDate: new Date().toISOString().split("T")[0],
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "quantity" || name === "pricePerUnit"
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

  const handleReset = () => {
    setForm({
      supplierId: undefined,
      invoiceNo: "",
      invoiceDate: new Date().toISOString().split("T")[0],
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

  if (!isOpen) return null;

  const quantity = Number(form.quantity) || 0;
  const pricePerUnit = Number(form.pricePerUnit) || 0;
  const basicAmount = quantity * pricePerUnit;
  const gstPercent = Number(form.gst) || 0;
  const cgst = basicAmount * (gstPercent / 100) / 2;
  const sgst = basicAmount * (gstPercent / 100) / 2;
  const grandTotal = basicAmount + cgst + sgst;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
          {/* Supplier & Invoice Section */}
          <div className="border-b pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  name="supplierId"
                  value={form.supplierId || ""}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
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
                  <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Invoice No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="invoiceNo"
                  value={form.invoiceNo}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.invoiceNo
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="Enter invoice number"
                />
                {errors.invoiceNo && (
                  <p className="text-red-500 text-xs mt-1">{errors.invoiceNo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="invoiceDate"
                  value={form.invoiceDate}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.invoiceDate
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                />
                {errors.invoiceDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.invoiceDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Item Section */}
          <div className="border-b pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <select
                  name="itemId"
                  value={form.itemId || ""}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.itemId
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                >
                  <option value="">Select Item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
                {errors.itemId && (
                  <p className="text-red-500 text-xs mt-1">{errors.itemId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="unit"
                  value={form.unit}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.unit
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="Enter unit"
                />
                {errors.unit && (
                  <p className="text-red-500 text-xs mt-1">{errors.unit}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Item Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="itemCode"
                value={form.itemCode}
                readOnly
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Auto-fetched"
              />
              {errors.itemCode && (
                <p className="text-red-500 text-xs mt-1">{errors.itemCode}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  HSN Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="hsnNumber"
                  value={form.hsnNumber}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.hsnNumber
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="Enter HSN number"
                />
                {errors.hsnNumber && (
                  <p className="text-red-500 text-xs mt-1">{errors.hsnNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  GST % <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="gst"
                  value={form.gst}
                  readOnly
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="Auto-fetched"
                />
                {errors.gst && (
                  <p className="text-red-500 text-xs mt-1">{errors.gst}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Batch No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="batchNo"
                  value={form.batchNo}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.batchNo
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="Enter batch number"
                />
                {errors.batchNo && (
                  <p className="text-red-500 text-xs mt-1">{errors.batchNo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.expiryDate
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                />
                {errors.expiryDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleInputChange}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.quantity
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-orange-500"
                  }`}
                  placeholder="0"
                  min="0"
                  step="1"
                />
                {errors.quantity && (
                  <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Price / Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="pricePerUnit"
                value={form.pricePerUnit}
                onChange={handleInputChange}
                className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.pricePerUnit
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-orange-500"
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.pricePerUnit && (
                <p className="text-red-500 text-xs mt-1">{errors.pricePerUnit}</p>
              )}
            </div>
          </div>

          {/* Amount Section */}
          <div className="border-b pb-4 bg-gray-50 p-4 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Basic Amount</span>
              <span className="font-semibold text-gray-900">
                ₹ {basicAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">CGST</span>
              <span className="font-semibold text-gray-900">
                ₹ {cgst.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">SGST</span>
              <span className="font-semibold text-gray-900">
                ₹ {sgst.toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold text-gray-900">Grand Total</span>
              <span className="font-bold text-lg text-orange-600">
                ₹ {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="reset"
              onClick={handleReset}
              className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded text-sm transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded text-sm transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
