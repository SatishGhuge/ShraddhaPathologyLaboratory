"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import Header from "@/src/components/Header";
import { User, Hospital, Mail, Phone, MapPin, Percent, GraduationCap, Save, X, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { createDoctor, updateDoctor, getDoctorById } from "@/src/api/master.js";

export default function AddReferralForm() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const isEditMode = pathname.includes('/edit/');

  const [type, setType] = useState("Doctor");
  const [formData, setFormData] = useState({
    name: "",
    degree: "",
    compliment: "",
    mobile: "",
    email: "",
    address: "",
    allowBalance: false,
    sendReportsViaWhatsApp: false,
    sendReportsViaMail: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: "", message: "" });

  // Load data when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setLoading(true);
      getDoctorById(id)
        .then((doc) => {
          if (doc) {
            setFormData({
              name: doc.name || "",
              degree: doc.degree || "",
              compliment: doc.compliment != null ? String(doc.compliment) : "",
              mobile: doc.mobile || "",
              email: doc.email || "",
              address: doc.address || "",
              allowBalance: doc.allowBalance || false,
              sendReportsViaWhatsApp: doc.sendReportsViaWhatsApp || false,
              sendReportsViaMail: doc.sendReportsViaMail || false,
            });
            setType(doc.type || "Doctor");
          }
        })
        .catch((err) => {
          console.error("Failed to load doctor:", err);
          showNotification("error", "Failed to load doctor details");
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  const handleChange = (e: any) => {
    const { name, value, type: inputType, checked } = e.target;

    // Name: only letters and spaces
    if (name === "name" && !/^[a-zA-Z\s]*$/.test(value)) return;

    // Mobile: only digits, max 10
    if (name === "mobile" && !/^\d*$/.test(value)) return;

    setFormData({ ...formData, [name]: inputType === "checkbox" ? checked : value });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const showNotification = (type: any, message: any) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: "", message: "" }), 3000);
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
    if (formData.compliment !== "") {
      const val = Number(formData.compliment);
      if (isNaN(val) || val < 0 || val > 100) {
        newErrors.compliment = "Compliment % must be between 0 and 100.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type,
        degree: formData.degree || null,
        compliment: formData.compliment !== "" ? parseFloat(formData.compliment) : null,
        mobile: formData.mobile || null,
        email: formData.email || null,
        address: formData.address || null,
        allowBalance: formData.allowBalance,
        sendReportsViaWhatsApp: formData.sendReportsViaWhatsApp,
        sendReportsViaMail: formData.sendReportsViaMail,
      };

      if (isEditMode) {
        await updateDoctor((Array.isArray(id) ? id[0] : id) as string, payload);
        showNotification("success", "Referral Doctor updated successfully!");
      } else {
        await createDoctor(payload);
        showNotification("success", "Referral Doctor saved successfully!");
      }

      setTimeout(() => router.push("/master/referral-doctor-list"), 1500);
    } catch (err) {
      showNotification("error", err.message || "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Header />
    <div className="min-h-screen bg-cyan-50 flex justify-center items-start p-6">
      <div className="bg-white w-full max-w-xl rounded shadow border border-gray-200 relative">

        {/* Notification */}
        {notification.show && (
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[300px] ${
            notification.type === "success"
              ? "bg-green-100 border border-green-400 text-green-800"
              : "bg-red-100 border border-red-400 text-red-800"
          }`}>
            {notification.type === "success"
              ? <CheckCircle size={20} className="text-green-600" />
              : <AlertCircle size={20} className="text-red-600" />}
            <span className="text-sm font-semibold">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-gray-300 px-4 py-2 flex justify-between items-center">
          <h2 className="text-cyan-700 font-semibold text-lg">
            {isEditMode ? "Edit Referral Details" : "Add Referral Details"}
          </h2>
          <button
            onClick={() => router.push("/master/referral-doctor-list")}
            className="flex items-center gap-1 text-cyan-700 hover:text-cyan-900 text-sm font-semibold"
          >
            <ArrowLeft size={18} /> Back to List
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 text-sm">

          {/* Referral Type */}
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="font-semibold text-gray-700">Referral Type *</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value="Doctor" checked={type === "Doctor"} onChange={() => setType("Doctor")} className="accent-cyan-600" />
                <User size={16} className="text-cyan-600" /> Doctor
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" value="Hospital" checked={type === "Hospital"} onChange={() => setType("Hospital")} className="accent-cyan-600" />
                <Hospital size={16} className="text-cyan-600" /> Hospital
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-[160px_1fr] items-start gap-3">
            <label className="font-semibold text-gray-700 mt-1.5">Name *</label>
            <div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Please Enter Name"
                className={`w-full border px-3 py-1.5 rounded bg-cyan-50 focus:ring-2 outline-none ${errors.name ? "border-red-500 focus:ring-red-400" : "border-cyan-600 focus:ring-cyan-600"}`}
              />
              {errors.name
                ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.name}</p>
                : <p className="text-xs text-red-400 mt-1">Do not add Dr. or DR in name</p>}
            </div>
          </div>

          {/* Degree */}
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="font-semibold text-gray-700">Degree</label>
            <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
              <GraduationCap size={16} className="text-cyan-600 mr-2 flex-shrink-0" />
              <input type="text" name="degree" value={formData.degree} onChange={handleChange} className="w-full py-1.5 outline-none bg-transparent" />
            </div>
          </div>

          {/* Compliment */}
          <div className="grid grid-cols-[160px_1fr] items-start gap-3">
            <label className="font-semibold text-gray-700 mt-1.5">Compliment %</label>
            <div>
              <div className={`flex items-center border rounded px-2 bg-cyan-50 ${errors.compliment ? "border-red-500" : "border-cyan-600"}`}>
                <Percent size={16} className="text-cyan-600 mr-2 flex-shrink-0" />
                <input type="number" name="compliment" value={formData.compliment} onChange={handleChange} min="0" max="100" className="w-full py-1.5 outline-none bg-transparent" />
              </div>
              {errors.compliment && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.compliment}</p>}
            </div>
          </div>

          {/* Mobile */}
          <div className="grid grid-cols-[160px_1fr] items-start gap-3">
            <label className="font-semibold text-gray-700 mt-1.5">Mobile</label>
            <div>
              <div className={`flex items-center border rounded px-2 bg-cyan-50 ${errors.mobile ? "border-red-500" : "border-cyan-600"}`}>
                <Phone size={16} className="text-cyan-600 mr-2 flex-shrink-0" />
                <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} maxLength={10} className="w-full py-1.5 outline-none bg-transparent" />
              </div>
              {errors.mobile && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.mobile}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="grid grid-cols-[160px_1fr] items-start gap-3">
            <label className="font-semibold text-gray-700 mt-1.5">Email</label>
            <div>
              <div className={`flex items-center border rounded px-2 bg-cyan-50 ${errors.email ? "border-red-500" : "border-cyan-600"}`}>
                <Mail size={16} className="text-cyan-600 mr-2 flex-shrink-0" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full py-1.5 outline-none bg-transparent" />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.email}</p>}
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-[160px_1fr] items-start gap-3">
            <label className="font-semibold text-gray-700 mt-1.5">Address</label>
            <div className="flex items-start border border-cyan-600 rounded px-2 bg-cyan-50">
              <MapPin size={16} className="text-cyan-600 mt-2 mr-2 flex-shrink-0" />
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Address" className="w-full py-1.5 outline-none resize-none bg-transparent" />
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2 pl-1">
            <input type="checkbox" name="allowBalance" checked={formData.allowBalance} onChange={handleChange} className="w-4 h-4 accent-cyan-600" />
            <span className="text-gray-700">Allow To Send Report on balance amount</span>
          </div>

          {/* Report Delivery Preferences */}
          <div className="border-t border-cyan-300 pt-3 mt-3">
            <p className="font-semibold text-gray-700 mb-2.5">📧 Report Delivery Preferences</p>
            <div className="grid grid-cols-2 gap-3 pl-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="sendReportsViaWhatsApp" checked={formData.sendReportsViaWhatsApp} onChange={handleChange} className="w-4 h-4 accent-green-600" />
                <span className="text-gray-700">Send via WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="sendReportsViaMail" checked={formData.sendReportsViaMail} onChange={handleChange} className="w-4 h-4 accent-cyan-600" />
                <span className="text-gray-700">Send via Email</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-1">Select channels for report delivery</p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleSave} disabled={loading}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white px-5 py-1.5 rounded text-sm">
              <Save size={16}/> {loading ? "Saving..." : isEditMode ? "Update" : "Save"}
            </button>
            <button onClick={() => router.push("/master/referral-doctor-list")}
              className="flex items-center gap-1.5 bg-gray-400 hover:bg-gray-500 text-white px-5 py-1.5 rounded text-sm">
              <X size={16}/> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
