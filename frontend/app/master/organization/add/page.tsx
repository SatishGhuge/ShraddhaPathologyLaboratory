"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import {
  Save, ArrowLeft, Building2, MapPin, Hash, Phone,
  CalendarDays, Eye, Mail, CheckCircle, XCircle, X,
} from "lucide-react";
import Header from "@/src/components/Header";
import { updateOrganization, getOrganizationById, createOrganizationWithCredentials } from "@/src/api/master";

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
            <div className="mt-3 bg-white border border-cyan-200 rounded p-3 text-xs space-y-1">
              <p className="font-semibold text-gray-700">Login Credentials (sent to email):</p>
              <p>Username: <span className="font-bold text-slate-900">{credentials.username}</span></p>
              <p>Password: <span className="font-bold text-slate-900">{credentials.password}</span></p>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
          <X size={16} />
        </button>
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

const AddOrganization = () => {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();

  const isViewMode = pathname.includes("/view/");
  const isEditMode = pathname.includes("/edit/");

  const [formData, setFormData] = useState({
    name: "", address: "", code: "",
    location: "", mobile: "", email: "", date: "", active: "Yes",
  });

  const [testCharges, setTestCharges] = useState<any[]>([]);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [toast, setToast] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && (isViewMode || isEditMode)) {
      getOrganizationById((Array.isArray(id) ? id[0] : id) as string).then(organization => {
        if (organization) {
          setFormData({
            name: organization.name || "",
            address: organization.address || "",
            code: organization.code || "",
            location: organization.location || "",
            mobile: organization.mobile || "",
            email: organization.email || "",
            date: organization.date ? new Date(organization.date).toISOString().split("T")[0] : "",
            active: organization.isActive ? "Yes" : "No",
          });
        }
      }).catch(console.error);
    }
  }, [id, isViewMode, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (isViewMode) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const closeToast = () => {
    const wasSuccess = toast?.type === "success";
    setToast(null);
    if (wasSuccess) router.back();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!/^\d{10}$/.test(formData.mobile)) {
      setToast({ type: "error", message: "Mobile number must be exactly 10 digits!" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setToast({ type: "error", message: "Please enter a valid email address!" });
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        code: formData.code,
        location: formData.location,
        address: formData.address,
        mobile: formData.mobile,
        email: formData.email,
        date: formData.date || null,
        isActive: formData.active === "Yes",
      };

      if (isEditMode) {
        await updateOrganization((Array.isArray(id) ? id[0] : id) as string, payload);
        setToast({ type: "success", message: "Organization updated successfully! Update notification sent to email." });
      } else {
        const res = await createOrganizationWithCredentials(payload);
        setToast({
          type: "success",
          message: `Organization added successfully!`,
          credentials: (res as any)?.credentials || (res as any)?.data?.credentials || null,
        });
      }
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to save organization" });
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => isViewMode ? "VIEW ORGANIZATION" : isEditMode ? "EDIT ORGANIZATION" : "ADD ORGANIZATION";

  return (
    <>
      <Header />
      {toast && <Toast {...toast} onClose={closeToast} />}

      <div className="p-6 bg-white min-h-screen flex justify-center">
        <div className="bg-white rounded-lg shadow py-3 px-4 w-full max-w-2xl h-fit">

          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              {isViewMode && <Eye size={20} className="inline" />} {getTitle()}
            </h2>
            <button type="button" onClick={() => router.back()}
              className="p-1.5 rounded-full bg-orange-100 hover:bg-cyan-200 transition" title="Back">
              <ArrowLeft size={18} className="text-slate-900" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">

            {/* Organization Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <div>
                <label className="font-medium text-gray-700 text-sm">Name</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Building2 size={14} className="text-cyan-600" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Code</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Hash size={14} className="text-cyan-600" />
                  <input type="text" name="code" value={formData.code} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Location</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <MapPin size={14} className="text-cyan-600" />
                  <input type="text" name="location" value={formData.location} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Mobile No.</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Phone size={14} className="text-cyan-600" />
                  <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange}
                    disabled={isViewMode} maxLength={10} placeholder="10 digit mobile number"
                    required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Date of Establishment</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <CalendarDays size={14} className="text-cyan-600" />
                  <input type="date" name="date" value={formData.date} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Active Status</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <select name="active" value={formData.active} onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent">
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="font-medium text-gray-700 text-sm">Email Address</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Mail size={14} className="text-cyan-600" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    disabled={isViewMode} placeholder="example@domain.com" required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="font-medium text-gray-700 text-sm">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange}
                  disabled={isViewMode} rows={2} required={!isViewMode}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50 bg-white" />
              </div>
            </div>

            {!isViewMode && (
              <div className="md:col-span-2 flex gap-3 mt-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-1.5 rounded text-sm transition-colors">
                  <Save size={14} /> {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
                </button>
                <button type="button" onClick={() => router.back()}
                  className="px-4 py-1.5 rounded bg-gray-500 hover:bg-gray-600 text-white text-sm transition-colors">
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

export default AddOrganization;
