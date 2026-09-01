"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, User, Hospital, Mail, Phone, MapPin, GraduationCap, AlertCircle, DollarSign } from "lucide-react";

interface ReferralDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoctorAdded?: (doctor: any) => void;
  editingDoctor?: any | null;
}

export default function ReferralDoctorModal({
  isOpen,
  onClose,
  onDoctorAdded,
  editingDoctor = null,
}: ReferralDoctorModalProps) {
  const [type, setType] = useState("Doctor");
  const [formData, setFormData] = useState({
    name: "",
    degree: "",
    mobile: "",
    email: "",
    address: "",
    discount: "",
    sendReportsViaWhatsApp: false,
    sendReportsViaMail: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Initialize form when modal opens or editing doctor changes
  useEffect(() => {
    if (isOpen) {
      if (editingDoctor) {
        setType(editingDoctor.type || "Doctor");
        setFormData({
          name: editingDoctor.name || "",
          degree: editingDoctor.degree || "",
          mobile: editingDoctor.mobile || "",
          email: editingDoctor.email || "",
          address: editingDoctor.address || "",
          discount: editingDoctor.discount !== undefined && editingDoctor.discount !== null ? String(editingDoctor.discount) : "",
          sendReportsViaWhatsApp: editingDoctor.sendReportsViaWhatsApp || false,
          sendReportsViaMail: editingDoctor.sendReportsViaMail || false,
        });
      } else {
        setType("Doctor");
        setFormData({
          name: "",
          degree: "",
          mobile: "",
          email: "",
          address: "",
          discount: "",
          sendReportsViaWhatsApp: false,
          sendReportsViaMail: false,
        });
      }
      setErrors({});
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, editingDoctor]);

  const handleChange = (e: any) => {
    const { name, value, type: inputType, checked } = e.target;

    // Name: only letters and spaces
    if (name === "name" && !/^[a-zA-Z\s]*$/.test(value)) return;

    // Mobile: only digits, max 10
    if (name === "mobile" && !/^\d*$/.test(value)) return;

    // Discount: only numbers with optional decimal
    if (name === "discount" && value && !/^\d*\.?\d*$/.test(value)) return;

    setFormData({ ...formData, [name]: inputType === "checkbox" ? checked : value });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    } else if (/\bdr\.?\b/i.test(formData.name)) {
      newErrors.name = "Do not add Dr. or DR in name.";
    }
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile number must be exactly 10 digits.";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        type,
        degree: formData.degree || null,
        mobile: formData.mobile || null,
        email: formData.email || null,
        address: formData.address || null,
        discount: parseFloat(formData.discount) || 0,
        sendReportsViaWhatsApp: formData.sendReportsViaWhatsApp,
        sendReportsViaMail: formData.sendReportsViaMail,
      };

      if (editingDoctor?.id) {
        // Update existing doctor
        const response = await fetch(`${API_BASE_URL}/master/doctors/${editingDoctor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to update doctor");

        const updated = await response.json();
        setSuccessMsg("Referral Doctor Updated Successfully!");
        onDoctorAdded?.(updated.data || updated);
      } else {
        // Create new doctor
        const response = await fetch(`${API_BASE_URL}/master/doctors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to create doctor");

        const newDoctor = await response.json();
        setSuccessMsg("Referral Doctor Added Successfully!");
        onDoctorAdded?.(newDoctor.data || newDoctor);
      }

      setErrorMsg("");
      setTimeout(closeModal, 1500);
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      setErrorMsg(error.message || 'Failed to save doctor');
      setSuccessMsg("");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setType("Doctor");
    setFormData({
      name: "",
      degree: "",
      mobile: "",
      email: "",
      address: "",
      discount: "",
      sendReportsViaWhatsApp: false,
      sendReportsViaMail: false,
    });
    setErrors({});
    setErrorMsg("");
    setSuccessMsg("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[500px] p-6 rounded-lg shadow-lg relative max-h-[90vh] overflow-y-auto">
        
        {/* Back Button */}
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 flex items-center gap-1 text-cyan-600 hover:underline text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {editingDoctor?.id ? "Edit Referral Doctor" : "Add Referral Doctor"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Referral Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Referral Type *</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value="Doctor" checked={type === "Doctor"} onChange={() => setType("Doctor")} className="accent-orange-500" />
                <User size={16} className="text-cyan-600" /> Doctor
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value="Hospital" checked={type === "Hospital"} onChange={() => setType("Hospital")} className="accent-orange-500" />
                <Hospital size={16} className="text-cyan-600" /> Hospital
              </label>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Please Enter Name"
              className={`w-full border px-3 py-2 rounded bg-white focus:ring-2 outline-none ${errors.name ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-orange-500"}`}
              disabled={loading}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.name}</p>}
            {!errors.name && <p className="text-xs text-gray-500 mt-1">Do not add Dr. or DR in name</p>}
          </div>

          {/* Degree */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Degree</label>
            <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
              <GraduationCap size={16} className="text-cyan-600 mr-2 flex-shrink-0" />
              <input type="text" name="degree" value={formData.degree} onChange={handleChange} placeholder="Degree" className="w-full py-2 outline-none bg-transparent" disabled={loading} />
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile</label>
            <div className={`flex items-center border rounded px-2 bg-white ${errors.mobile ? "border-red-500" : "border-gray-300"}`}>
              <Phone size={16} className="text-cyan-600 mr-2 flex-shrink-0" />
              <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} maxLength={10} placeholder="10-digit number" className="w-full py-2 outline-none bg-transparent" disabled={loading} />
            </div>
            {errors.mobile && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.mobile}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <div className={`flex items-center border rounded px-2 bg-white ${errors.email ? "border-red-500" : "border-gray-300"}`}>
              <Mail size={16} className="text-cyan-600 mr-2 flex-shrink-0" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" className="w-full py-2 outline-none bg-transparent" disabled={loading} />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.email}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
            <div className="flex items-start border border-gray-300 rounded px-2 bg-white">
              <MapPin size={16} className="text-cyan-600 mt-2 mr-2 flex-shrink-0" />
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} placeholder="Address" className="w-full py-2 outline-none resize-none bg-transparent" disabled={loading} />
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Discount (%)</label>
            <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
              <span className="text-cyan-600 mr-2 text-sm font-semibold">%</span>
              <input 
                type="text" 
                name="discount" 
                value={formData.discount} 
                onChange={handleChange} 
                placeholder="0" 
                className="w-full py-2 outline-none bg-transparent" 
                disabled={loading} 
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Default discount percentage for this referral doctor</p>
          </div>

          {/* Report Delivery Preferences */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">📧 Report Delivery Preferences</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="sendReportsViaWhatsApp" checked={formData.sendReportsViaWhatsApp} onChange={handleChange} className="w-4 h-4 accent-green-600" disabled={loading} />
                <span className="text-sm text-gray-700">WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="sendReportsViaMail" checked={formData.sendReportsViaMail} onChange={handleChange} className="w-4 h-4 accent-orange-500" disabled={loading} />
                <span className="text-sm text-gray-700">Email</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!formData.name.trim() || loading}
            className={`w-full py-2 rounded text-white transition-colors
              ${
                !formData.name.trim() || loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }
            `}
          >
            {loading ? "Saving..." : (editingDoctor?.id ? "Update" : "Submit")}
          </button>

          {errorMsg && <p className="text-red-600 text-center text-sm">{errorMsg}</p>}
          {successMsg && <p className="text-green-600 text-center text-sm">{successMsg}</p>}
        </form>
      </div>
    </div>
  );
}
