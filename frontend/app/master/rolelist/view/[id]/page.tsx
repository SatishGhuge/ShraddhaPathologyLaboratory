"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

import { ArrowLeft, Save, UserPlus, Code, Compass, Calendar, Percent, Building2, Edit, Eye } from "lucide-react";
import Header from "@/src/components/Header";
import { getRoleById, createRole, updateRole } from "@/src/api/master.js";

const AddRole = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const isEditMode = typeof window !== 'undefined' && window.location.pathname.includes("/edit/");
  const isViewMode = typeof window !== 'undefined' && window.location.pathname.includes("/view/");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    codeName: "",
    roleLanding: "",
    viewFinancialDays: 30,
    discountPermissible: false,
    showB2B: false,
  });

  useEffect(() => {
    if (id && (isEditMode || isViewMode)) {
      setLoading(true);
      getRoleById((Array.isArray(id) ? id[0] : id) as string)
        .then((role) => {
          if (role) {
            setFormData({
              name: role.name,
              codeName: role.codeName,
              roleLanding: role.roleLanding,
              viewFinancialDays: role.viewFinancialDays,
              discountPermissible: role.discountPermissible,
              showB2B: role.showB2B,
            });
          }
        })
        .catch((err) => setError(err.message || "Failed to load role"))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, isViewMode]);

  const handleChange = (e: any) => {
    if (isViewMode) return;
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!formData.name.trim()) return setError("Role Name is required");
    if (!formData.codeName.trim()) return setError("Code Name is required");
    if (!formData.roleLanding) return setError("Role Landing is required");

    setSaving(true);
    setError(null);
    try {
      if (isEditMode) {
        await updateRole((Array.isArray(id) ? id[0] : id) as string, formData);
      } else {
        await createRole(formData);
      }
      setSuccess(true);
      setTimeout(() => router.push("/master/rolelist"), 1500);
    } catch (err) {
      setError(err.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => isViewMode ? "VIEW ROLE" : isEditMode ? "EDIT ROLE" : "ADD ROLE";
  const getIcon = () => isViewMode ? <Eye size={20} /> : isEditMode ? <Edit size={20} /> : <UserPlus size={20} />;

  if (loading) {
    return (
      <>
        <Header />
        <div className="p-6 min-h-screen bg-cyan-50 flex justify-center items-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 min-h-screen bg-cyan-50 flex justify-center items-start">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-xl w-full">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* HEADER */}
            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
              <h2 className="flex items-center gap-2 font-semibold text-cyan-700">
                {getIcon()} {getTitle()}
              </h2>
              <button type="button" onClick={() => router.push("/master/rolelist")} className="hover:bg-cyan-100 p-1 rounded">
                <ArrowLeft size={20} />
              </button>
            </div>

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 p-2 rounded text-sm">
                ✓ Role {isEditMode ? "updated" : "saved"} successfully!
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 p-2 rounded text-sm">{error}</div>
            )}

            {/* ROLE NAME */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800 mb-1">
                <UserPlus size={16} /> Role Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isViewMode}
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 disabled:bg-gray-100 text-sm"
              />
            </div>

            {/* CODE NAME */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800 mb-1">
                <Code size={16} /> Code Name *
              </label>
              <input
                type="text"
                name="codeName"
                value={formData.codeName}
                onChange={handleChange}
                disabled={isViewMode}
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 disabled:bg-gray-100 text-sm"
              />
            </div>

            {/* ROLE LANDING */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800 mb-1">
                <Compass size={16} /> Role Landing *
              </label>
              <select
                name="roleLanding"
                value={formData.roleLanding}
                onChange={handleChange}
                disabled={isViewMode}
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 disabled:bg-gray-100 text-sm"
              >
                <option value="">Select</option>
                <option value="dashboard">Dashboard</option>
                <option value="patient">Patient</option>
                <option value="billing">Billing</option>
              </select>
            </div>

            {/* FINANCIAL DAYS */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800 mb-1">
                <Calendar size={16} /> View Financial Days
              </label>
              <input
                type="number"
                name="viewFinancialDays"
                value={formData.viewFinancialDays}
                onChange={handleChange}
                disabled={isViewMode}
                className="w-32 border border-cyan-600 rounded px-2 py-1 bg-cyan-50 disabled:bg-gray-100 text-sm"
              />
            </div>

            {/* CHECKBOXES */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="discountPermissible"
                  checked={formData.discountPermissible}
                  onChange={handleChange}
                  disabled={isViewMode}
                />
                <Percent size={16} /> Discount Permissible
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="showB2B"
                  checked={formData.showB2B}
                  onChange={handleChange}
                  disabled={isViewMode}
                />
                <Building2 size={16} /> Show B2B
              </label>
            </div>

            {!isViewMode && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"
                >
                  <Save size={16} /> {saving ? "Saving..." : isEditMode ? "Update Role" : "Save Role"}
                </button>
              </div>
            )}

          </form>
        </div>
      </div>
    </>
  );
};

export default AddRole;
