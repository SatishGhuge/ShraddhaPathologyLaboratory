"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface SupplierMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierSaved?: (supplier: any) => void;
  editingSupplier?: any | null;
}

export default function SupplierMasterModal({
  isOpen,
  onClose,
  onSupplierSaved,
  editingSupplier = null,
}: SupplierMasterModalProps) {
  const [form, setForm] = useState({
    supplierName: "",
    gstNumber: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    status: "Active",
  });

  const [editingId, setEditingId] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  const STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ];

  // Initialize form when modal opens or editing supplier changes
  useEffect(() => {
    if (isOpen) {
      if (editingSupplier) {
        setEditingId(editingSupplier.id);
        setForm({
          supplierName: editingSupplier.supplierName || "",
          gstNumber: editingSupplier.gstNumber || "",
          email: editingSupplier.email || "",
          phoneNumber: editingSupplier.phoneNumber || "",
          address: editingSupplier.address || "",
          city: editingSupplier.city || "",
          state: editingSupplier.state || "",
          pincode: editingSupplier.pincode || "",
          status: editingSupplier.status || "Active",
        });
      } else {
        setEditingId(null);
        setForm({
          supplierName: "",
          gstNumber: "",
          email: "",
          phoneNumber: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          status: "Active",
        });
      }
      setErrors({});
      setSuccessMsg("");
    }
  }, [isOpen, editingSupplier]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.supplierName.trim()) newErrors.supplierName = "Supplier Name is required";
    if (!form.gstNumber.trim()) newErrors.gstNumber = "GST Number is required";
    if (!form.phoneNumber.trim()) newErrors.phoneNumber = "Phone Number is required";

    // Validate phone number (10 digits)
    if (form.phoneNumber && !/^\d{10}$/.test(form.phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Phone number must be 10 digits";
    }

    // Validate email if provided
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Validate GST number format
    if (form.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[0-9A-Z]{1}$/.test(form.gstNumber)) {
      newErrors.gstNumber = "GST Number format invalid (e.g., 27AABCT1234H1Z0)";
    }

    // Validate pincode (6 digits)
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle status radio buttons
  const handleStatusChange = (status: string) => {
    setForm((prev) => ({ ...prev, status }));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const supplierData = {
        ...form,
        id: editingId || Date.now(),
      };

      setSuccessMsg(editingId ? "Supplier Updated Successfully!" : "Supplier Added Successfully!");
      onSupplierSaved?.(supplierData);

      setTimeout(closeModal, 1500);
    } catch (error: any) {
      console.error("Error saving supplier:", error);
      setErrors({ submit: error.message || "Failed to save supplier" });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setForm({
      supplierName: "",
      gstNumber: "",
      email: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      status: "Active",
    });
    setEditingId(null);
    setErrors({});
    setSuccessMsg("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white sticky top-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? "Edit Supplier" : "Supplier Master"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {editingId ? "Update supplier details" : "Add a new supplier"}
            </p>
          </div>
          <button
            onClick={closeModal}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Supplier Name - Required */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="supplierName"
              value={form.supplierName}
              onChange={handleInputChange}
              placeholder="Enter supplier name"
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                errors.supplierName ? "border-red-500 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.supplierName && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.supplierName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* GST Number - Required */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                GST Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="gstNumber"
                value={form.gstNumber}
                onChange={handleInputChange}
                placeholder="27AABCT1234H1Z0"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  errors.gstNumber ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              />
              {errors.gstNumber && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.gstNumber}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="supplier@company.com"
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  errors.email ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Phone Number - Required */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleInputChange}
              placeholder="10-digit phone number"
              maxLength={10}
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                errors.phoneNumber ? "border-red-500 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.phoneNumber}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleInputChange}
              placeholder="Street address"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleInputChange}
                placeholder="City name"
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                State
              </label>
              <select
                name="state"
                value={form.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition bg-white cursor-pointer"
              >
                <option value="">Select State</option>
                {STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Pincode
            </label>
            <input
              type="text"
              name="pincode"
              value={form.pincode}
              onChange={handleInputChange}
              placeholder="6-digit pincode"
              maxLength={6}
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                errors.pincode ? "border-red-500 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.pincode && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.pincode}
              </p>
            )}
          </div>

          {/* Status - Radio Buttons */}
         

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {errors.submit}
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
              ✓ {successMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setForm({
                  supplierName: "",
                  gstNumber: "",
                  email: "",
                  phoneNumber: "",
                  address: "",
                  city: "",
                  state: "",
                  pincode: "",
                  status: "Active",
                });
                setErrors({});
              }}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-semibold rounded text-sm hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-semibold rounded text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
