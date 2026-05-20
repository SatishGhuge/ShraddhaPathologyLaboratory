"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import { Save, ArrowLeft, Building2, MapPin, Hash, Phone, CalendarDays, Eye, Mail, CheckCircle, XCircle, X } from "lucide-react";
import Header from "@/src/components/Header";
import { getCollectionCenterById, createCollectionCenter, updateCollectionCenter } from "@/src/api/master.js";

const Toast = ({ type, message, credentials, onClose }: { type: string; message: string; credentials?: any; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className={`bg-white rounded-xl shadow-2xl border-2 ${type === "success" ? "border-green-400" : "border-red-400"} p-6 max-w-sm w-full mx-4`}>
      <div className="flex items-start gap-3">
        {type === "success"
          ? <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={22} />
          : <XCircle className="text-red-500 mt-0.5 flex-shrink-0" size={22} />}
        <div className="flex-1">
          <p className={`font-semibold text-sm ${type === "success" ? "text-green-700" : "text-red-700"}`}>{message}</p>
          {credentials && (
            <div className="mt-3 bg-cyan-50 border border-cyan-200 rounded p-3 text-xs space-y-1">
              <p className="font-semibold text-gray-700">Login Credentials (sent to email):</p>
              <p>Username: <span className="font-bold text-cyan-700">{credentials.username}</span></p>
              <p>Password: <span className="font-bold text-cyan-700">{credentials.password}</span></p>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2"><X size={16} /></button>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onClose}
          className={`px-4 py-1.5 rounded text-sm text-white ${type === "success" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
          OK
        </button>
      </div>
    </div>
  </div>
);

const AddCenter = () => {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();

  const isViewMode = pathname.includes("/view/");
  const isEditMode = pathname.includes("/edit/");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "", code: "", location: "",
    address: "", mobile: "", email: "", date: "", isActive: true,
  });

  useEffect(() => {
    if (id && (isViewMode || isEditMode)) {
      setLoading(true);
      const centerId = Array.isArray(id) ? id[0] : id;
      getCollectionCenterById(centerId)
        .then((center) => {
          if (center) {
            setFormData({
              name: center.name || "",
              code: center.code || "",
              location: center.location || "",
              address: center.address || "",
              mobile: center.mobile || "",
              email: center.email || "",
              date: center.date ? new Date(center.date).toISOString().split("T")[0] : "",
              isActive: center.isActive,
            });
          }
        })
        .catch((err) => setToast({ type: "error", message: err.message || "Failed to load center" }))
        .finally(() => setLoading(false));
    }
  }, [id, isViewMode, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (isViewMode) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === "isActive" ? value === "Yes" : value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!formData.name.trim()) return setToast({ type: "error", message: "Name is required" });
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) return setToast({ type: "error", message: "Mobile must be 10 digits" });
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setToast({ type: "error", message: "Invalid email address" });

    setSaving(true);
    try {
      if (isEditMode) {
        const centerId = Array.isArray(id) ? id[0] : id;
        await updateCollectionCenter(centerId, formData);
        setToast({ type: "success", message: "Center updated successfully! Update notification sent to email." });
      } else {
        const res = await createCollectionCenter(formData);
        setToast({ type: "success", message: "Center added successfully!", credentials: res.data?.credentials || null });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save center";
      setToast({ type: "error", message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const closeToast = () => {
    const wasSuccess = toast?.type === "success";
    setToast(null);
    if (wasSuccess) router.push("/master/centerlist");
  };

  const getTitle = () => isViewMode ? "VIEW CENTER" : isEditMode ? "EDIT CENTER" : "ADD CENTER";

  if (loading) return (
    <>
      <Header />
      <div className="p-6 bg-cyan-50 min-h-screen flex justify-center items-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    </>
  );

  return (
    <>
      <Header />
      {toast && <Toast {...toast} onClose={closeToast} />}
      <div className="p-6 bg-cyan-50 min-h-screen flex justify-center">
        <div className="bg-white rounded-lg shadow py-3 px-4 w-full max-w-2xl h-fit">

          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-cyan-700 flex items-center gap-2">
              {isViewMode && <Eye size={20} />} {getTitle()}
            </h2>
            <button type="button" onClick={() => router.push("/master/centerlist")} className="p-1.5 rounded-full bg-cyan-100 hover:bg-cyan-200">
              <ArrowLeft size={18} className="text-cyan-700" />
            </button>
          </div>

          

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">

            {/* Name */}
            <div>
              <label className="font-medium text-cyan-800 text-sm">Name *</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Building2 size={14} className="text-cyan-600" />
                <input type="text" name="name" value={formData.name} onChange={handleChange} disabled={isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            {/* Code */}
            <div>
              <label className="font-medium text-cyan-800 text-sm">Code</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Hash size={14} className="text-cyan-600" />
                <input type="text" name="code" value={formData.code} onChange={handleChange} disabled={isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="font-medium text-cyan-800 text-sm">Location</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <MapPin size={14} className="text-cyan-600" />
                <input type="text" name="location" value={formData.location} onChange={handleChange} disabled={isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label className="font-medium text-cyan-800 text-sm">Mobile No.</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Phone size={14} className="text-cyan-600" />
                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} disabled={isViewMode}
                  maxLength={10} placeholder="10 digit mobile"
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="font-medium text-cyan-800 text-sm">Date of Establishment</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <CalendarDays size={14} className="text-cyan-600" />
                <input type="date" name="date" value={formData.date} onChange={handleChange} disabled={isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            {/* Active Status */}
            <div>
              <label className="font-medium text-cyan-800 text-sm">Active Status</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <select name="isActive" value={formData.isActive ? "Yes" : "No"} onChange={handleChange} disabled={isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="font-medium text-cyan-800 text-sm">Email Address</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Mail size={14} className="text-cyan-600" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={isViewMode}
                  placeholder="example@domain.com"
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="font-medium text-cyan-800 text-sm">Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} disabled={isViewMode} rows={2}
                className="w-full border border-cyan-600 rounded px-2 py-1.5 text-sm disabled:bg-gray-50 bg-cyan-50" />
            </div>

            {!isViewMode && (
              <div className="md:col-span-2 flex gap-3 mt-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white px-4 py-1.5 rounded text-sm">
                  <Save size={14} /> {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
                </button>
                <button type="button" onClick={() => router.push("/master/centerlist")}
                  className="px-4 py-1.5 rounded bg-gray-500 hover:bg-gray-600 text-white text-sm">
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default AddCenter;
